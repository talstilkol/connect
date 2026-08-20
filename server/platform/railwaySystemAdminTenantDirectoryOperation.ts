import type {
  SystemAdminTenantDirectoryRepository,
} from "../../db/systemAdminTenantDirectoryRepository.ts";
import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  resolveSystemAdminSession,
  SystemAdminSessionError,
} from "../auth/systemAdminSession.ts";
import {
  createSystemAdminTenantDirectoryService,
  SystemAdminTenantDirectoryInputError,
} from "../admin/systemAdminTenantDirectoryService.ts";
import type {
  RailwayApiJsonObject,
  RailwayApiRequestEnvelope,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";

export const railwaySystemAdminTenantDirectoryOperationPolicy =
  Object.freeze({
    id: "system-admin.tenant-directory.list",
    requestKind: "query" as const,
    authorization: "system-admin-allowlist" as const,
    mutationSafety: null,
  });

export interface RailwaySystemAdminTenantDirectoryOperationDependencies {
  readonly allowedExternalUserIds: readonly UserId[];
  readonly tenantDirectory: Pick<
    SystemAdminTenantDirectoryRepository,
    "listPage"
  >;
}

function hasExactKeys(
  payload: Readonly<RailwayApiJsonObject>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(payload).sort();
  const expected = [...expectedKeys].sort();

  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminTenantDirectoryOperationDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "allowedExternalUserIds,tenantDirectory" ||
    !Array.isArray(dependencies.allowedExternalUserIds) ||
    dependencies.allowedExternalUserIds.length === 0 ||
    dependencies.allowedExternalUserIds.some(
      (identity) =>
        typeof identity !== "string" ||
        identity.length === 0 ||
        identity.length > 255 ||
        identity.trim() !== identity ||
        /[\u0000-\u001f\u007f]/.test(identity),
    ) ||
    new Set(dependencies.allowedExternalUserIds).size !==
      dependencies.allowedExternalUserIds.length ||
    typeof dependencies.tenantDirectory?.listPage !== "function"
  ) {
    throw new Error(
      "Railway system admin tenant directory dependencies are invalid",
    );
  }
}

function mapServiceError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }

  if (error instanceof SystemAdminSessionError) {
    throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
  }

  if (error instanceof SystemAdminTenantDirectoryInputError) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

export function createRailwaySystemAdminTenantDirectoryOperation(
  dependencies: Readonly<
    RailwaySystemAdminTenantDirectoryOperationDependencies
  >,
): Readonly<RailwayApiOperation> {
  requireDependencies(dependencies);
  const service = createSystemAdminTenantDirectoryService(
    dependencies.tenantDirectory,
  );
  const policy = railwaySystemAdminTenantDirectoryOperationPolicy;

  return Object.freeze({
    id: policy.id,
    requestKind: policy.requestKind,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        if (
          !hasExactKeys(payload, [
            "afterTenantId",
            "search",
            "subscription",
            "tenantStatus",
          ]) ||
          request.operation !== policy.id ||
          request.requestKind !== "query" ||
          request.idempotencyKey !== null
        ) {
          throw new RailwayApiDispatchError("INVALID_REQUEST");
        }

        const session = resolveSystemAdminSession(
          context.userIdentity,
          dependencies.allowedExternalUserIds,
        );
        const directory = await service.list(session, payload);

        return Object.freeze({
          directory: Object.freeze({
            tenants: Object.freeze(
              directory.tenants.map((tenant) =>
                Object.freeze({
                  targetTenantId: tenant.tenantId,
                  displayName: tenant.displayName,
                  tenantStatus: tenant.tenantStatus,
                  businessProfile: tenant.businessProfile,
                  subscription: tenant.subscription,
                }),
              ),
            ),
            nextCursor: directory.nextCursor,
          }),
        });
      } catch (error) {
        mapServiceError(error);
      }
    },
  });
}
