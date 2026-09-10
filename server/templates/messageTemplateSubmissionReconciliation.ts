import type {
  MessageTemplateSubmissionOutboxRepository,
} from "../../db/messageTemplateSubmissionOutboxRepository.ts";
import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  MetaCredentialVault,
} from "../meta/metaPorts.ts";
import type {
  MetaMessageTemplateLister,
  MetaMessageTemplateSnapshot,
} from "./metaMessageTemplateListAdapter.ts";
import {
  createMessageTemplateSubmissionQueueMessage,
} from "./messageTemplateSubmissionQueueMessage.ts";

const DEFAULT_NOT_FOUND_GRACE_SECONDS = 15 * 60;
const MAXIMUM_NOT_FOUND_GRACE_SECONDS = 24 * 60 * 60;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type MessageTemplateSubmissionReconciliationOutcome =
  | "resolved-submitted"
  | "resolved-rejected"
  | "deferred"
  | "duplicate"
  | "not-found";

export interface MessageTemplateSubmissionReconciliationResult {
  readonly outcome: MessageTemplateSubmissionReconciliationOutcome;
}

export class MessageTemplateSubmissionReconciliationError extends Error {
  constructor() {
    super("Message template submission reconciliation could not complete");
    this.name = "MessageTemplateSubmissionReconciliationError";
  }
}

export interface MessageTemplateSubmissionReconciliationDependencies {
  readonly outbox: MessageTemplateSubmissionOutboxRepository;
  readonly templates: Pick<MessageTemplateRepository, "findByKey">;
  readonly credentialVault: Pick<MetaCredentialVault, "withAccessToken">;
  readonly lister: MetaMessageTemplateLister;
  readonly clock?: () => string;
  readonly notFoundGraceSeconds?: number;
}

function requireTimestamp(value: unknown): string {
  if (
    typeof value !== "string" || !timestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value
  ) {
    throw new MessageTemplateSubmissionReconciliationError();
  }

  return value;
}

function exactIdentityMatches(
  snapshot: Readonly<MetaMessageTemplateSnapshot>,
  template: Readonly<{
    name: string;
    language: string;
    category: string;
  }>,
): boolean {
  return snapshot.name === template.name &&
    snapshot.language === template.language &&
    snapshot.category === template.category;
}

export function createMessageTemplateSubmissionReconciliation(
  dependencies: Readonly<MessageTemplateSubmissionReconciliationDependencies>,
) {
  if (
    !dependencies || typeof dependencies !== "object" ||
    typeof dependencies.outbox?.find !== "function" ||
    typeof dependencies.outbox?.reconcileSubmitted !== "function" ||
    typeof dependencies.outbox?.reconcileRejected !== "function" ||
    typeof dependencies.templates?.findByKey !== "function" ||
    typeof dependencies.credentialVault?.withAccessToken !== "function" ||
    typeof dependencies.lister?.list !== "function" ||
    (dependencies.clock !== undefined && typeof dependencies.clock !== "function")
  ) {
    throw new MessageTemplateSubmissionReconciliationError();
  }

  const graceSeconds = dependencies.notFoundGraceSeconds ??
    DEFAULT_NOT_FOUND_GRACE_SECONDS;
  if (
    !Number.isSafeInteger(graceSeconds) || graceSeconds < 60 ||
    graceSeconds > MAXIMUM_NOT_FOUND_GRACE_SECONDS
  ) {
    throw new MessageTemplateSubmissionReconciliationError();
  }
  const clock = dependencies.clock ?? (() => new Date().toISOString());

  return Object.freeze({
    async process(
      tenantIdInput: unknown,
      submissionKeyInput: unknown,
    ): Promise<MessageTemplateSubmissionReconciliationResult> {
      let message;
      try {
        message = createMessageTemplateSubmissionQueueMessage(
          tenantIdInput,
          submissionKeyInput,
        );
      } catch {
        throw new MessageTemplateSubmissionReconciliationError();
      }

      let outbox;
      let template;
      try {
        outbox = await dependencies.outbox.find(
          message.tenantId,
          message.submissionKey,
        );
        if (outbox === null) {
          return Object.freeze({ outcome: "not-found" as const });
        }
        if (outbox.status !== "ambiguous") {
          return Object.freeze({ outcome: "duplicate" as const });
        }
        template = await dependencies.templates.findByKey(
          message.tenantId,
          outbox.templateKey,
        );
      } catch {
        throw new MessageTemplateSubmissionReconciliationError();
      }

      if (
        template === null || template.status !== "submitting" ||
        template.submissionKey !== message.submissionKey
      ) {
        return Object.freeze({ outcome: "deferred" as const });
      }

      let snapshots: readonly MetaMessageTemplateSnapshot[];
      try {
        snapshots = await dependencies.credentialVault.withAccessToken(
          message.tenantId,
          (accessToken) => dependencies.lister.list({
            wabaId: outbox.wabaId,
            accessToken,
          }),
        );
      } catch {
        return Object.freeze({ outcome: "deferred" as const });
      }

      if (!Array.isArray(snapshots)) {
        return Object.freeze({ outcome: "deferred" as const });
      }

      const matches = snapshots.filter((snapshot) =>
        exactIdentityMatches(snapshot, template)
      );
      const observedAt = requireTimestamp(clock());

      if (matches.length === 1) {
        try {
          await dependencies.outbox.reconcileSubmitted(
            message.tenantId,
            message.submissionKey,
            matches[0].metaTemplateId,
            observedAt,
          );
        } catch {
          throw new MessageTemplateSubmissionReconciliationError();
        }

        return Object.freeze({ outcome: "resolved-submitted" as const });
      }

      if (matches.length > 1) {
        return Object.freeze({ outcome: "deferred" as const });
      }

      const referenceAt = outbox.claimedAt ?? outbox.createdAt;
      const elapsedMilliseconds = Date.parse(observedAt) - Date.parse(referenceAt);

      if (elapsedMilliseconds < graceSeconds * 1_000) {
        return Object.freeze({ outcome: "deferred" as const });
      }

      try {
        await dependencies.outbox.reconcileRejected(
          message.tenantId,
          message.submissionKey,
          "PROVIDER_CONFIRMED_NOT_SUBMITTED",
          observedAt,
        );
      } catch {
        throw new MessageTemplateSubmissionReconciliationError();
      }

      return Object.freeze({ outcome: "resolved-rejected" as const });
    },
  });
}
