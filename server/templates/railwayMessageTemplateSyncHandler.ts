import { RAILWAY_API_CONTRACT_VERSION } from "../platform/railwayApiContract.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "../platform/railwayApiMutationExecutor.ts";
import { RAILWAY_MESSAGE_TEMPLATE_SYNC_OPERATION, isTemplateSyncTimestamp } from "../platform/railwayMessageTemplateSyncMutationExecutor.ts";
import type { RailwayMessageTemplateSubmissionHandlerDependencies } from "./railwayMessageTemplateSubmissionHandler.ts";
import { parseRailwayMessageTemplateSyncState } from "./railwayMessageTemplateSyncResult.ts";
import type { SyncMessageTemplatesActionResult } from "./messageTemplateActionResult.ts";

export function createRailwayMessageTemplateSyncHandler(
  dependencies: Readonly<RailwayMessageTemplateSubmissionHandlerDependencies>,
) {
  if (!dependencies || Object.keys(dependencies).sort().join(",") !==
    "applicationConfigured,createClient,inspectConfiguration,resolveIdentity" ||
    Object.values(dependencies).some((value) => typeof value !== "function")) throw new Error("Invalid template sync handler dependencies");
  return Object.freeze({
    async sync(requestedAt: unknown): Promise<SyncMessageTemplatesActionResult> {
      if (!isTemplateSyncTimestamp(requestedAt)) return { status: "sync-failed" };
      try {
        if (!dependencies.applicationConfigured()) return { status: "configuration-required" };
        const configuration = dependencies.inspectConfiguration();
        if (configuration.status !== "configured") return { status: "configuration-required" };
        const identity = await dependencies.resolveIdentity();
        if (identity.status === "unauthenticated") return { status: "unauthenticated" };
        if (identity.status !== "authenticated") return { status: "server-error" };
        const client = dependencies.createClient({ ...configuration.configuration,
          oidcToken: identity.oidcToken, userSessionToken: identity.userSessionToken });
        const payload = Object.freeze({ requestedAt });
        const response = await client.call({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_MESSAGE_TEMPLATE_SYNC_OPERATION,
          requestKind: "mutation",
          idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(RAILWAY_MESSAGE_TEMPLATE_SYNC_OPERATION, payload),
          payload,
        });
        if (response.outcome !== "ok") {
          switch (response.code) {
            case "USER_AUTHENTICATION_REQUIRED": return { status: "unauthenticated" };
            case "TENANT_MEMBERSHIP_REQUIRED": return { status: "onboarding-required" };
            case "TENANT_SELECTION_REQUIRED": return { status: "tenant-selection-required" };
            case "AUTHORIZATION_DENIED":
            case "PERMISSION_DENIED":
            case "STALE_SESSION": return { status: "permission-denied" };
            case "CONFIGURATION_REQUIRED": return { status: "meta-configuration-required" };
            default: return { status: "sync-failed" };
          }
        }
        const data = response.data;
        if (!data || typeof data !== "object" || Array.isArray(data) ||
          Object.keys(data).sort().join(",") !== "replayed,summary,templates") return { status: "server-error" };
        const record = data as Record<string, unknown>;
        if (typeof record.replayed !== "boolean") return { status: "server-error" };
        const state = parseRailwayMessageTemplateSyncState({ templates: record.templates, summary: record.summary });
        return state === null ? { status: "server-error" } : { status: "synced", ...state };
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
