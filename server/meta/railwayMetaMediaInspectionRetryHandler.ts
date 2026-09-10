import { META_MEDIA_INSPECTION_RETRY_OPERATION, parseMetaMediaInspectionRetryInput, type MetaMediaInspectionRetryStatus } from "../../shared/domain/metaMediaInspectionRetry.ts";
import { metaMediaInspectionRetryKey } from "./metaMediaInspectionRetry.ts";
import { RAILWAY_API_CONTRACT_VERSION } from "../platform/railwayApiContract.ts";
import type { RailwayMetaConnectionReadHandlerDependencies } from "./railwayMetaConnectionReadHandler.ts";
export function createRailwayMetaMediaInspectionRetryHandler(dependencies: Readonly<RailwayMetaConnectionReadHandlerDependencies>) {
  return Object.freeze({ async request(rawInput: unknown): Promise<MetaMediaInspectionRetryStatus> {
    const input = parseMetaMediaInspectionRetryInput(rawInput);
    if (!input) return "invalid-request";
    try {
      if (!dependencies.applicationConfigured()) return "configuration-required";
      const configuration = dependencies.inspectConfiguration();
      if (configuration.status !== "configured") return "configuration-required";
      const identity = await dependencies.resolveIdentity();
      if (identity.status !== "authenticated") return "permission-denied";
      const client = dependencies.createClient({ ...configuration.configuration, oidcToken: identity.oidcToken, userSessionToken: identity.userSessionToken });
      const result = await client.call({ contractVersion: RAILWAY_API_CONTRACT_VERSION, operation: META_MEDIA_INSPECTION_RETRY_OPERATION,
        requestKind: "mutation", idempotencyKey: await metaMediaInspectionRetryKey(input), payload: { ...input } });
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
