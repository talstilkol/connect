import type { MetaDataSyncLifecycleReader } from "./postgresMetaDataSyncLifecycle.ts";
import { requireTenantPermission, TenantSessionError } from "../auth/tenantSession.ts";
import { persistedMetaConnectionStatuses } from "../../shared/domain/metaConnection.ts";
import type { MetaConnectionService } from "../meta/metaConnectionService.ts";
import {
  parseRailwayMetaConnectionView,
  RAILWAY_META_CONNECTION_READ_OPERATION,
} from "../meta/railwayMetaConnectionResult.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import type { RailwayTenantSessionResolver } from "./railwayTenantSessionResolver.ts";

export const railwayMetaConnectionReadOperationPolicy = Object.freeze({
  id: RAILWAY_META_CONNECTION_READ_OPERATION,
  requestKind: "query" as const,
  permission: "workspace.manage" as const,
  mutationSafety: null,
});

export function createRailwayMetaConnectionReadOperation(dependencies: Readonly<{
  tenantSessions: Pick<RailwayTenantSessionResolver, "resolve">;
  connections: Pick<MetaConnectionService, "read">;
  dataSync?: MetaDataSyncLifecycleReader;
}>): Readonly<RailwayApiOperation> {
  if (
    typeof dependencies.tenantSessions?.resolve !== "function" ||
    typeof dependencies.connections?.read !== "function" ||
    (dependencies.dataSync !== undefined && typeof dependencies.dataSync.readView !== "function")
  ) {
    throw new Error("Railway Meta connection dependencies are invalid");
  }

  return Object.freeze({
    id: RAILWAY_META_CONNECTION_READ_OPERATION,
    requestKind: "query" as const,
    async execute(context, payload, request) {
      try {
        if (
          Object.keys(payload).length !== 0 ||
          request.operation !== RAILWAY_META_CONNECTION_READ_OPERATION ||
          request.requestKind !== "query" || request.idempotencyKey !== null
        ) {
          throw new RailwayApiDispatchError("INVALID_REQUEST");
        }
        const session = await dependencies.tenantSessions.resolve(context.userIdentity);
        requireTenantPermission(session, "workspace.manage");
        const connection = await dependencies.connections.read(session);
        if (connection !== null && (
          connection.tenantId !== session.tenantId ||
          !persistedMetaConnectionStatuses.includes(connection.status)
        )) {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        const dataSync = await dependencies.dataSync?.readView(session.tenantId, connection);
        const view = parseRailwayMetaConnectionView({
          status: connection === null ? "disconnected" : connection.status,
          ...(dataSync == null ? {} : { dataSync }),
        });
        if (view === null) throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        return Object.freeze({ connection: view });
      } catch (error) {
        if (error instanceof RailwayApiDispatchError) throw error;
        if (error instanceof TenantSessionError) {
          if (error.code === "TENANT_MEMBERSHIP_REQUIRED" ||
            error.code === "TENANT_SELECTION_REQUIRED" || error.code === "PERMISSION_DENIED") {
            throw new RailwayApiDispatchError(error.code);
          }
          throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
        }
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
      }
    },
  } satisfies RailwayApiOperation);
}
