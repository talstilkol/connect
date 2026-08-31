import type {
  TenantMembershipMutationRepository,
} from "../../db/tenantMembershipMutationRepository.ts";
import type {
  TeamMembershipMutationResult,
  TeamOwnerTransferResult,
} from "../../shared/domain/teamMembership.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import {
  toTeamMembershipMutationView,
} from "../team/teamMembershipMutationMapper.ts";
import {
  createTeamMembershipMutationService,
  TeamMembershipMutationError,
  TeamMembershipMutationInputError,
} from "../team/teamMembershipMutationService.ts";
import type {
  RailwayApiJsonObject,
  RailwayApiRequestEnvelope,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "./railwayApiMutationExecutor.ts";
import type {
  RailwayTenantSessionResolver,
} from "./railwayTenantSessionResolver.ts";

export const RAILWAY_TEAM_MEMBER_ROLE_OPERATION =
  "team.membership.role.change" as const;
export const RAILWAY_TEAM_MEMBER_STATUS_OPERATION =
  "team.membership.status.change" as const;
export const RAILWAY_TEAM_OWNER_TRANSFER_OPERATION =
  "team.membership.owner.transfer" as const;

export const railwayTeamMembershipOperationPolicies = Object.freeze([
  RAILWAY_TEAM_MEMBER_ROLE_OPERATION,
  RAILWAY_TEAM_MEMBER_STATUS_OPERATION,
  RAILWAY_TEAM_OWNER_TRANSFER_OPERATION,
].map((id) => Object.freeze({
  id,
  requestKind: "mutation" as const,
  permission: "workspace.manage" as const,
  mutationSafety: Object.freeze({
    rateLimit: "tenant-mutation" as const,
    idempotency: "deterministic-domain-event-replay" as const,
    audit: "atomic-immutable-event" as const,
    transaction: "required" as const,
  }),
})));

export interface RailwayTeamMembershipOperationDependencies {
  readonly tenantSessions: RailwayTenantSessionResolver;
  readonly membershipMutations: TenantMembershipMutationRepository;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly clock?: () => string;
}

function requireDependencies(
  dependencies: Readonly<RailwayTeamMembershipOperationDependencies>,
): void {
  const expectedKeys = dependencies.clock === undefined
    ? ["membershipMutations", "mutationRateLimit", "tenantSessions"]
    : ["clock", "membershipMutations", "mutationRateLimit", "tenantSessions"];
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== expectedKeys.join(",") ||
    typeof dependencies.tenantSessions?.resolve !== "function" ||
    typeof dependencies.membershipMutations?.listByTenantId !== "function" ||
    typeof dependencies.membershipMutations?.changeRole !== "function" ||
    typeof dependencies.membershipMutations?.changeStatus !== "function" ||
    typeof dependencies.membershipMutations?.transferOwner !== "function" ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    (dependencies.clock !== undefined && typeof dependencies.clock !== "function")
  ) {
    throw new Error("Railway team membership dependencies are invalid");
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
  if (error instanceof TeamMembershipMutationInputError) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }
  if (error instanceof TeamMembershipMutationError) {
    switch (error.code) {
      case "NOT_FOUND":
        throw new RailwayApiDispatchError("NOT_FOUND");
      case "CONFLICT":
        throw new RailwayApiDispatchError("CONFLICT");
      case "INVALID_TRANSITION":
        throw new RailwayApiDispatchError("INVALID_TRANSITION");
      case "STALE_SESSION":
        throw new RailwayApiDispatchError("STALE_SESSION");
      case "PERSISTENCE_FAILED":
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
  }
  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

function validateSingleResult(
  result: Readonly<TeamMembershipMutationResult>,
): asserts result is Readonly<TeamMembershipMutationResult> & {
  readonly outcome: "updated" | "unchanged";
  readonly membership: NonNullable<TeamMembershipMutationResult["membership"]>;
} {
  if (
    (result.outcome !== "updated" && result.outcome !== "unchanged") ||
    result.membership === null
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
}

function validateTransferResult(
  result: Readonly<TeamOwnerTransferResult>,
): asserts result is Readonly<TeamOwnerTransferResult> & {
  readonly outcome: "updated" | "unchanged";
  readonly formerOwner: NonNullable<TeamOwnerTransferResult["formerOwner"]>;
  readonly newOwner: NonNullable<TeamOwnerTransferResult["newOwner"]>;
} {
  if (
    (result.outcome !== "updated" && result.outcome !== "unchanged") ||
    result.formerOwner === null ||
    result.newOwner === null
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
}

function createOperation(
  operation: typeof railwayTeamMembershipOperationPolicies[number]["id"],
  dependencies: Readonly<RailwayTeamMembershipOperationDependencies>,
): Readonly<RailwayApiOperation> {
  return Object.freeze({
    id: operation,
    requestKind: "mutation" as const,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        if (
          request.operation !== operation ||
          request.requestKind !== "mutation" ||
          request.idempotencyKey === null
        ) {
          throw new RailwayApiDispatchError("INVALID_REQUEST");
        }
        const expectedIdempotencyKey =
          await deriveRailwayApiDeterministicIdempotencyKey(
            operation,
            payload,
          );
        if (request.idempotencyKey !== expectedIdempotencyKey) {
          throw new RailwayApiDispatchError("INVALID_REQUEST");
        }
        const session = await dependencies.tenantSessions.resolve(
          context.userIdentity,
        );
        let rateLimitDecision;
        try {
          rateLimitDecision = await dependencies.mutationRateLimit.consume(
            `${session.tenantId}:${session.externalUserId}:${operation}`,
          );
        } catch {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        if (rateLimitDecision.outcome === "limited") {
          throw new RailwayApiDispatchError("RATE_LIMITED");
        }
        if (rateLimitDecision.outcome !== "allowed") {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        const service = createTeamMembershipMutationService(
          dependencies.membershipMutations,
          dependencies.clock,
        );
        if (operation === RAILWAY_TEAM_MEMBER_ROLE_OPERATION) {
          const result = await service.changeRole(session, payload);
          validateSingleResult(result);
          return Object.freeze({
            outcome: result.outcome,
            membership: toTeamMembershipMutationView(
              session,
              result.membership,
            ),
          });
        }
        if (operation === RAILWAY_TEAM_MEMBER_STATUS_OPERATION) {
          const result = await service.changeStatus(session, payload);
          validateSingleResult(result);
          return Object.freeze({
            outcome: result.outcome,
            membership: toTeamMembershipMutationView(
              session,
              result.membership,
            ),
          });
        }
        const result = await service.transferOwner(session, payload);
        validateTransferResult(result);
        return Object.freeze({
          outcome: result.outcome,
          formerOwner: toTeamMembershipMutationView(
            session,
            result.formerOwner,
          ),
          newOwner: toTeamMembershipMutationView(
            session,
            result.newOwner,
          ),
        });
      } catch (error) {
        mapOperationError(error);
      }
    },
  });
}

export function createRailwayTeamMembershipOperations(
  dependencies: Readonly<RailwayTeamMembershipOperationDependencies>,
): readonly Readonly<RailwayApiOperation>[] {
  requireDependencies(dependencies);
  return Object.freeze(
    railwayTeamMembershipOperationPolicies.map(({ id }) =>
      createOperation(id, dependencies),
    ),
  );
}
