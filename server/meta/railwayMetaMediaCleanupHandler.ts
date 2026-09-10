import { META_MEDIA_CLEANUP_OPERATION, parseMetaMediaCleanupInput, type MetaMediaCleanupRequestStatus } from "../../shared/domain/metaMediaCleanup.ts";
import { metaMediaCleanupKey } from "./metaMediaCleanup.ts";
import { RAILWAY_API_CONTRACT_VERSION } from "../platform/railwayApiContract.ts";
import type { RailwayMetaConnectionReadHandlerDependencies } from "./railwayMetaConnectionReadHandler.ts";
export function createRailwayMetaMediaCleanupHandler(dependencies: Readonly<RailwayMetaConnectionReadHandlerDependencies>) {
  return Object.freeze({ async request(rawInput: unknown): Promise<MetaMediaCleanupRequestStatus> {
    const input = parseMetaMediaCleanupInput(rawInput);
    if (!input) return "invalid-request";
    try {
      if (!dependencies.applicationConfigured()) return "configuration-required";
      const configuration = dependencies.inspectConfiguration();
      if (configuration.status !== "configured") return "configuration-required";
      const identity = await dependencies.resolveIdentity();
      if (identity.status !== "authenticated") return "permission-denied";
      const client = dependencies.createClient({ ...configuration.configuration, oidcToken: identity.oidcToken, userSessionToken: identity.userSessionToken });
      const result = await client.call({ contractVersion: RAILWAY_API_CONTRACT_VERSION, operation: META_MEDIA_CLEANUP_OPERATION,
        requestKind: "mutation", idempotencyKey: await metaMediaCleanupKey(input), payload: { ...input } });
      if (result.outcome !== "ok") {
        if (["PERMISSION_DENIED", "AUTHORIZATION_DENIED", "TENANT_MEMBERSHIP_REQUIRED", "TENANT_SELECTION_REQUIRED", "USER_AUTHENTICATION_REQUIRED"].includes(result.code)) return "permission-denied";
        return result.code === "CONFLICT" ? "conflict" : result.code === "INVALID_REQUEST" ? "invalid-request" : "server-error";
      }
      const data = result.data;
      if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).join(",") !== "status" || !("status" in data) ||
        (data.status !== "queued" && data.status !== "already-requested")) return "server-error";
      return data.status;
    } catch { return "server-error"; }
  } });
}
