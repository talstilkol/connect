import type {
  TeamInvitationRepository,
} from "../../db/teamInvitationRepository.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import {
  createTeamInvitationRequestService,
  TeamInvitationRequestError,
  TeamInvitationRequestInputError,
  type TeamInvitationPublisher,
} from "../team/teamInvitationRequestService.ts";
import {
  TeamInvitationPolicyConfigurationError,
  type TeamInvitationPolicy,
} from "../team/teamInvitationPolicy.ts";
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

export const RAILWAY_TEAM_INVITATION_REQUEST_OPERATION =
  "team.invitation.request" as const;

export const railwayTeamInvitationRequestOperationPolicy = Object.freeze({
  id: RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
  requestKind: "mutation" as const,
  permission: "team.manage" as const,
  mutationSafety: Object.freeze({
    rateLimit: "tenant-mutation" as const,
    idempotency: "deterministic-domain-event-replay" as const,
    audit: "atomic-immutable-event" as const,
    transaction: "required" as const,
  }),
});

export interface RailwayTeamInvitationRequestOperationDependencies {
  readonly tenantSessions: RailwayTenantSessionResolver;
  readonly invitations: TeamInvitationRepository;
  readonly publisher: TeamInvitationPublisher;
  readonly policyProvider: () => TeamInvitationPolicy;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly clock?: () => string;
}

function requireDependencies(
  dependencies: Readonly<
    RailwayTeamInvitationRequestOperationDependencies
  >,
): void {
  const expectedKeys = dependencies.clock === undefined
    ? [
        "invitations",
        "mutationRateLimit",
        "policyProvider",
        "publisher",
        "tenantSessions",
      ]
    : [
        "clock",
        "invitations",
        "mutationRateLimit",
        "policyProvider",
        "publisher",
        "tenantSessions",
      ];

  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== expectedKeys.join(",") ||
    typeof dependencies.tenantSessions?.resolve !== "function" ||
    typeof dependencies.invitations?.find !== "function" ||
    typeof dependencies.invitations?.request !== "function" ||
    typeof dependencies.invitations?.transition !== "function" ||
    typeof dependencies.publisher?.publish !== "function" ||
    typeof dependencies.policyProvider !== "function" ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    (dependencies.clock !== undefined &&
      typeof dependencies.clock !== "function")
  ) {
    throw new Error("Railway team invitation dependencies are invalid");
  }
}

function mapError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }

  if (error instanceof TenantSessionError) {
    switch (error.code) {
      case "AUTHENTICATION_REQUIRED":
        throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
      case "TENANT_MEMBERSHIP_REQUIRED":
        throw new RailwayApiDispatchError("TENANT_MEMBERSHIP_REQUIRED");
      case "TENANT_SELECTION_REQUIRED":
        throw new RailwayApiDispatchError("TENANT_SELECTION_REQUIRED");
      case "PERMISSION_DENIED":
        throw new RailwayApiDispatchError("PERMISSION_DENIED");
    }
  }

  if (error instanceof TeamInvitationRequestInputError) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  if (error instanceof TeamInvitationPolicyConfigurationError) {
    throw new RailwayApiDispatchError("CONFIGURATION_REQUIRED");
  }

  if (error instanceof TeamInvitationRequestError) {
    switch (error.code) {
      case "CONFLICT":
      case "REREQUEST_DISABLED":
        throw new RailwayApiDispatchError("CONFLICT");
      case "PERSISTENCE_UNAVAILABLE":
      case "QUEUE_UNAVAILABLE":
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
  }

  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

export function createRailwayTeamInvitationRequestOperation(
  dependencies: Readonly<
    RailwayTeamInvitationRequestOperationDependencies
  >,
): Readonly<RailwayApiOperation> {
  requireDependencies(dependencies);

  return Object.freeze({
    ...railwayTeamInvitationRequestOperationPolicy,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        if (
          request.operation !== RAILWAY_TEAM_INVITATION_REQUEST_OPERATION ||
          request.requestKind !== "mutation" ||
          request.idempotencyKey === null ||
          request.idempotencyKey !==
            await deriveRailwayApiDeterministicIdempotencyKey(
              RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
              payload,
            )
        ) {
          throw new RailwayApiDispatchError("INVALID_REQUEST");
        }

        const policy = dependencies.policyProvider();
        const session = await dependencies.tenantSessions.resolve(
          context.userIdentity,
        );
        let rateLimitDecision;

        try {
          rateLimitDecision = await dependencies.mutationRateLimit.consume(
            `${session.tenantId}:${session.externalUserId}:` +
              RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
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

        const service = createTeamInvitationRequestService(
          dependencies.invitations,
          dependencies.publisher,
          policy,
          dependencies.clock,
        );
        const result = await service.invite(session, payload);

        if (
          result.status !== "queued" &&
          result.status !== "already-pending"
        ) {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }

        return Object.freeze({ status: result.status });
      } catch (error) {
        mapError(error);
      }
    },
  });
}
