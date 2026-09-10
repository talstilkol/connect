import { requireTenantPermission, TenantSessionError } from "../auth/tenantSession.ts";
import { META_MEDIA_INSPECTION_RETRY_OPERATION, parseMetaMediaInspectionRetryInput } from "../../shared/domain/metaMediaInspectionRetry.ts";
import { MetaMediaInspectionRetryError, metaMediaInspectionRetryKey, type MetaMediaInspectionRetryRepository } from "../meta/metaMediaInspectionRetry.ts";
import { RailwayApiDispatchError, type RailwayApiOperation } from "./railwayApiHttpHandler.ts";
import type { RailwayTenantSessionResolver } from "./railwayTenantSessionResolver.ts";
export function createRailwayMetaMediaInspectionRetryOperation(dependencies: Readonly<{
  tenantSessions: Pick<RailwayTenantSessionResolver, "resolve">; retries: MetaMediaInspectionRetryRepository;
}>): Readonly<RailwayApiOperation> {
  return Object.freeze({ id: META_MEDIA_INSPECTION_RETRY_OPERATION, requestKind: "mutation",
    async execute(context, payload, request) {
      try {
        const input = parseMetaMediaInspectionRetryInput(payload);
        if (!input || request.operation !== META_MEDIA_INSPECTION_RETRY_OPERATION || request.requestKind !== "mutation" ||
          request.idempotencyKey !== await metaMediaInspectionRetryKey(input)) throw new RailwayApiDispatchError("INVALID_REQUEST");
        const session = await dependencies.tenantSessions.resolve(context.userIdentity);
        requireTenantPermission(session, "workspace.manage");
        const status = await dependencies.retries.request(session, input, request.idempotencyKey);
        if (status !== "queued" && status !== "already-requested") throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        return { status };
      } catch (error) {
        if (error instanceof RailwayApiDispatchError) throw error;
        if (error instanceof MetaMediaInspectionRetryError) throw new RailwayApiDispatchError(error.code);
        if (error instanceof TenantSessionError) throw new RailwayApiDispatchError("PERMISSION_DENIED");
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
      }
    },
  } satisfies RailwayApiOperation);
}
