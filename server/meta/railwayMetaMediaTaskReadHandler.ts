import { META_MEDIA_TASKS_READ_OPERATION, decodeMetaMediaTaskCursor, parseMetaMediaTaskPage, type MetaMediaTaskReadResult } from "../../shared/domain/metaMediaTaskView.ts";
import { RAILWAY_API_CONTRACT_VERSION } from "../platform/railwayApiContract.ts";
import type { RailwayMetaConnectionReadHandlerDependencies } from "./railwayMetaConnectionReadHandler.ts";
export function createRailwayMetaMediaTaskReadHandler(dependencies: Readonly<RailwayMetaConnectionReadHandlerDependencies>) {
  return Object.freeze({ async read(rawAfter?: unknown): Promise<MetaMediaTaskReadResult> {
    const after = rawAfter === undefined ? null : decodeMetaMediaTaskCursor(rawAfter);
    if (rawAfter !== undefined && after === null) return { status: "invalid-request", page: null };
    try {
      if (!dependencies.applicationConfigured()) return { status: "configuration-required", page: null };
      const config = dependencies.inspectConfiguration();
      if (config.status !== "configured") return { status: "configuration-required", page: null };
      const identity = await dependencies.resolveIdentity();
      if (identity.status !== "authenticated") return { status: "server-error", page: null };
      const client = dependencies.createClient({ ...config.configuration, oidcToken: identity.oidcToken, userSessionToken: identity.userSessionToken });
      const response = await client.call({ contractVersion: RAILWAY_API_CONTRACT_VERSION, operation: META_MEDIA_TASKS_READ_OPERATION,
        requestKind: "query", idempotencyKey: null, payload: after === null ? {} : { after } });
      if (response.outcome !== "ok") {
        const code = response.code;
        const status = code === "CONFIGURATION_REQUIRED" ? "configuration-required" : code === "TENANT_MEMBERSHIP_REQUIRED" ? "onboarding-required" :
          code === "TENANT_SELECTION_REQUIRED" ? "tenant-selection-required" : code === "PERMISSION_DENIED" || code === "AUTHORIZATION_DENIED" ? "permission-denied" : code === "INVALID_REQUEST" ? "invalid-request" : "server-error";
        return { status, page: null };
      }
      const data = response.data;
      if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).join(",") !== "page" || !("page" in data)) return { status: "server-error", page: null };
      const page = parseMetaMediaTaskPage(data.page);
      if (!page) return { status: "server-error", page: null };
      return { status: "ready", page };
    } catch { return { status: "server-error", page: null }; }
  } });
}
