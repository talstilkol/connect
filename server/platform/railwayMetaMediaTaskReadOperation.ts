import { requireTenantPermission, TenantSessionError } from "../auth/tenantSession.ts";
import { META_MEDIA_TASKS_READ_OPERATION, parseMetaMediaTaskCursor, parseMetaMediaTaskPage } from "../../shared/domain/metaMediaTaskView.ts";
import { MetaMediaTaskReadError, type MetaMediaTaskReader } from "./postgresMetaMediaTaskReader.ts";
import { RailwayApiDispatchError, type RailwayApiOperation } from "./railwayApiHttpHandler.ts";
import type { RailwayTenantSessionResolver } from "./railwayTenantSessionResolver.ts";
export function createRailwayMetaMediaTaskReadOperation(dependencies: Readonly<{
  tenantSessions: Pick<RailwayTenantSessionResolver, "resolve">; mediaTasks: MetaMediaTaskReader;
}>): Readonly<RailwayApiOperation> {
  return Object.freeze({ id: META_MEDIA_TASKS_READ_OPERATION, requestKind: "query",
    async execute(context, payload, request) {
      try {
        const keys = Object.keys(payload);
        if (request.operation !== META_MEDIA_TASKS_READ_OPERATION || request.requestKind !== "query" || request.idempotencyKey !== null ||
          !(keys.length === 0 || (keys.length === 1 && keys[0] === "after"))) throw new RailwayApiDispatchError("INVALID_REQUEST");
        const after = keys.length === 0 ? null : parseMetaMediaTaskCursor(payload.after);
        if (keys.length !== 0 && after === null) throw new RailwayApiDispatchError("INVALID_REQUEST");
        const session = await dependencies.tenantSessions.resolve(context.userIdentity);
        requireTenantPermission(session, "workspace.manage");
        const page = parseMetaMediaTaskPage(await dependencies.mediaTasks.read(session, after));
        if (!page) throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        return { page };
      } catch (error) {
        if (error instanceof RailwayApiDispatchError) throw error;
        if (error instanceof MetaMediaTaskReadError) throw new RailwayApiDispatchError(error.code);
        if (error instanceof TenantSessionError) {
          if (error.code === "TENANT_MEMBERSHIP_REQUIRED" || error.code === "TENANT_SELECTION_REQUIRED" || error.code === "PERMISSION_DENIED") throw new RailwayApiDispatchError(error.code);
          throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
        }
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
      }
    },
  } satisfies RailwayApiOperation);
}
