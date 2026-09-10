import { requireTenantPermission, TenantSessionError } from "../auth/tenantSession.ts";
import { META_MEDIA_CLEANUP_OPERATION, parseMetaMediaCleanupInput } from "../../shared/domain/metaMediaCleanup.ts";
import { MetaMediaCleanupError, metaMediaCleanupKey, type MetaMediaCleanupRepository } from "../meta/metaMediaCleanup.ts";
import { RailwayApiDispatchError, type RailwayApiOperation } from "./railwayApiHttpHandler.ts";
import type { RailwayTenantSessionResolver } from "./railwayTenantSessionResolver.ts";
export function createRailwayMetaMediaCleanupOperation(dependencies: Readonly<{
  tenantSessions: Pick<RailwayTenantSessionResolver, "resolve">; cleanup: MetaMediaCleanupRepository;
}>): Readonly<RailwayApiOperation> {
  return Object.freeze({ id: META_MEDIA_CLEANUP_OPERATION, requestKind: "mutation",
    async execute(context, payload, request) {
      try {
        const input = parseMetaMediaCleanupInput(payload);
        if (!input || request.operation !== META_MEDIA_CLEANUP_OPERATION || request.requestKind !== "mutation" ||
          request.idempotencyKey !== await metaMediaCleanupKey(input)) throw new RailwayApiDispatchError("INVALID_REQUEST");
        const session = await dependencies.tenantSessions.resolve(context.userIdentity);
        requireTenantPermission(session, "workspace.manage");
        const status = await dependencies.cleanup.request(session, input, request.idempotencyKey);
        if (status !== "queued" && status !== "already-requested") throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        return { status };
      } catch (error) {
        if (error instanceof RailwayApiDispatchError) throw error;
        if (error instanceof MetaMediaCleanupError) throw new RailwayApiDispatchError(error.code === "INVALID_REQUEST" || error.code === "PERMISSION_DENIED" || error.code === "CONFLICT" ? error.code : "DEPENDENCY_UNAVAILABLE");
        if (error instanceof TenantSessionError) throw new RailwayApiDispatchError("PERMISSION_DENIED");
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
      }
    },
  } satisfies RailwayApiOperation);
}
