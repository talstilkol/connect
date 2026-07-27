import {
  MessageTemplateIdentityConflictError,
  type MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import {
  persistedTemplateCategories,
  persistedTemplateLanguages,
  type PersistedMessageTemplate,
} from "../../shared/domain/messageTemplate.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  MetaCredentialVaultError,
} from "../meta/metaCredentialVault.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import type {
  MetaCredentialVault,
} from "../meta/metaPorts.ts";
import type {
  MetaMessageTemplateLister,
  MetaMessageTemplateSnapshot,
} from "./metaMessageTemplateListAdapter.ts";
import {
  toMessageTemplateStatus,
} from "./metaMessageTemplateStatus.ts";

export type MessageTemplateSyncErrorCode =
  | "META_NOT_CONNECTED"
  | "CREDENTIAL_UNAVAILABLE"
  | "IDENTITY_CONFLICT"
  | "SYNC_FAILED";

export class MessageTemplateSyncError extends Error {
  readonly code: MessageTemplateSyncErrorCode;

  constructor(code: MessageTemplateSyncErrorCode) {
    super("Message template synchronization failed");
    this.name = "MessageTemplateSyncError";
    this.code = code;
  }
}

export interface MessageTemplateSyncSummary {
  received: number;
  eligible: number;
  updated: number;
  unchanged: number;
  stale: number;
  unmatched: number;
  unsupported: number;
  observedAt: string;
}

export interface MessageTemplateSyncResult {
  summary: MessageTemplateSyncSummary;
  templates: readonly PersistedMessageTemplate[];
}

export interface MessageTemplateSyncService {
  sync(
    session: TenantSession,
  ): Promise<MessageTemplateSyncResult>;
}

export interface MessageTemplateSyncServiceDependencies {
  templates: MessageTemplateRepository;
  metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  credentialVault: MetaCredentialVault;
  lister: MetaMessageTemplateLister;
  clock?: () => Date;
}

interface EligibleMetaMessageTemplateSnapshot
  extends MetaMessageTemplateSnapshot {
  language: PersistedMessageTemplate["language"];
  category: PersistedMessageTemplate["category"];
}

function isEligibleSnapshot(
  snapshot: MetaMessageTemplateSnapshot,
): snapshot is EligibleMetaMessageTemplateSnapshot {
  return (
    persistedTemplateLanguages.some(
      (language) => language === snapshot.language,
    ) &&
    persistedTemplateCategories.some(
      (category) => category === snapshot.category,
    )
  );
}

function requireObservedAt(clock: () => Date): string {
  try {
    const value = clock().toISOString();

    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        value,
      )
    ) {
      throw new Error("Invalid clock");
    }

    return value;
  } catch {
    throw new MessageTemplateSyncError("SYNC_FAILED");
  }
}

async function deriveSnapshotKey(
  tenantId: number,
  wabaId: string,
  snapshot: EligibleMetaMessageTemplateSnapshot,
): Promise<string> {
  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace: "meta_template_sync_v1",
        tenantId,
        wabaId,
        metaTemplateId: snapshot.metaTemplateId,
        name: snapshot.name,
        language: snapshot.language,
        category: snapshot.category,
        providerStatus: snapshot.providerStatus,
      }),
    ),
  );
}

function syncError(
  code: MessageTemplateSyncErrorCode,
): MessageTemplateSyncError {
  return new MessageTemplateSyncError(code);
}

export function createMessageTemplateSyncService(
  dependencies: MessageTemplateSyncServiceDependencies,
): MessageTemplateSyncService {
  const clock = dependencies.clock ?? (() => new Date());

  return {
    async sync(session) {
      requireTenantPermission(session, "templates.write");

      let connection;

      try {
        connection =
          await dependencies.metaConnections
            .findConnectionByTenantId(session.tenantId);
      } catch {
        throw syncError("SYNC_FAILED");
      }

      if (
        !connection ||
        connection.status !== "connected" ||
        !/^[1-9][0-9]{0,63}$/.test(connection.wabaId)
      ) {
        throw syncError("META_NOT_CONNECTED");
      }

      try {
        return await dependencies.credentialVault
          .withAccessToken(
            session.tenantId,
            async (accessToken) => {
              const snapshots =
                await dependencies.lister.list({
                  wabaId: connection.wabaId,
                  accessToken,
                });
              const observedAt = requireObservedAt(clock);
              const eligibleSnapshots =
                snapshots.filter(isEligibleSnapshot);
              const summary: MessageTemplateSyncSummary = {
                received: snapshots.length,
                eligible: eligibleSnapshots.length,
                updated: 0,
                unchanged: 0,
                stale: 0,
                unmatched: 0,
                unsupported:
                  snapshots.length -
                  eligibleSnapshots.length,
                observedAt,
              };

              for (const snapshot of eligibleSnapshots) {
                let result;

                try {
                  result =
                    await dependencies.templates
                      .applyStatusEvent({
                        tenantId: session.tenantId,
                        metaTemplateId:
                          snapshot.metaTemplateId,
                        name: snapshot.name,
                        language: snapshot.language,
                        category: snapshot.category,
                        status: toMessageTemplateStatus(
                          snapshot.providerStatus,
                        ),
                        statusEventKey:
                          await deriveSnapshotKey(
                            session.tenantId,
                            connection.wabaId,
                            snapshot,
                          ),
                        statusEventAt: observedAt,
                      });
                } catch (error) {
                  if (
                    error instanceof
                    MessageTemplateIdentityConflictError
                  ) {
                    throw syncError(
                      "IDENTITY_CONFLICT",
                    );
                  }

                  throw syncError("SYNC_FAILED");
                }

                if (result.outcome === "applied") {
                  summary.updated += 1;
                } else if (
                  result.outcome === "duplicate"
                ) {
                  summary.unchanged += 1;
                } else if (result.outcome === "stale") {
                  summary.stale += 1;
                } else {
                  summary.unmatched += 1;
                }
              }

              let templates: readonly PersistedMessageTemplate[];

              try {
                templates =
                  await dependencies.templates.listByTenant(
                    session.tenantId,
                    100,
                  );
              } catch {
                throw syncError("SYNC_FAILED");
              }

              return { summary, templates };
            },
          );
      } catch (error) {
        if (error instanceof MessageTemplateSyncError) {
          throw error;
        }

        if (error instanceof MetaCredentialVaultError) {
          throw syncError("CREDENTIAL_UNAVAILABLE");
        }

        throw syncError("SYNC_FAILED");
      }
    },
  };
}
