import type {
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import {
  createTeamDirectoryService,
} from "../team/teamDirectoryService.ts";
import {
  createUnavailableTeamIdentityDirectory,
} from "../team/teamIdentityDirectory.ts";
import type {
  RailwayApiJsonObject,
  RailwayApiRequestEnvelope,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import type {
  RailwayTenantSessionResolver,
} from "./railwayTenantSessionResolver.ts";

export const RAILWAY_TEAM_DIRECTORY_OPERATION =
  "team.directory.read" as const;

export const railwayTeamDirectoryOperationPolicy = Object.freeze({
  id: RAILWAY_TEAM_DIRECTORY_OPERATION,
  requestKind: "query" as const,
  permission: "team.manage" as const,
  mutationSafety: null,
});

export interface RailwayTeamDirectoryOperationDependencies {
  readonly tenantSessions: RailwayTenantSessionResolver;
  readonly memberships: TenantMembershipRepository;
}

function requireDependencies(
  dependencies: Readonly<RailwayTeamDirectoryOperationDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "memberships,tenantSessions" ||
    typeof dependencies.tenantSessions?.resolve !== "function" ||
    typeof dependencies.memberships?.findActiveByTenantId !== "function"
  ) {
    throw new Error("Railway team directory dependencies are invalid");
  }
}

function mapOperationError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) throw error;
  if (error instanceof TenantSessionError) {
    switch (error.code) {
      case "TENANT_MEMBERSHIP_REQUIRED":
        throw new RailwayApiDispatchError("TENANT_MEMBERSHIP_REQUIRED");
      case "TENANT_SELECTION_REQUIRED":
        throw new RailwayApiDispatchError("TENANT_SELECTION_REQUIRED");
      case "PERMISSION_DENIED":
        throw new RailwayApiDispatchError("PERMISSION_DENIED");
      case "AUTHENTICATION_REQUIRED":
        throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
    }
  }
  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

export function createRailwayTeamDirectoryOperation(
  dependencies: Readonly<RailwayTeamDirectoryOperationDependencies>,
): Readonly<RailwayApiOperation> {
  requireDependencies(dependencies);

  return Object.freeze({
    id: RAILWAY_TEAM_DIRECTORY_OPERATION,
    requestKind: "query" as const,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        if (
          Object.keys(payload).length !== 0 ||
          request.operation !== RAILWAY_TEAM_DIRECTORY_OPERATION ||
          request.requestKind !== "query" ||
          request.idempotencyKey !== null
        ) {
          throw new RailwayApiDispatchError("INVALID_REQUEST");
        }
        const session = await dependencies.tenantSessions.resolve(
          context.userIdentity,
        );
        const directory = await createTeamDirectoryService({
          identities: createUnavailableTeamIdentityDirectory(),
          memberships: dependencies.memberships,
        }).list(session);

        return Object.freeze({ directory });
      } catch (error) {
        mapOperationError(error);
      }
    },
  });
}
