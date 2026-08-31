import type {
  TeamInvitationAcceptanceRepository,
} from "../../db/teamInvitationAcceptanceRepository.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import {
  createTeamInvitationAcceptanceService,
  TeamInvitationAcceptanceServiceError,
} from "../team/teamInvitationAcceptanceService.ts";
import type {
  TeamInvitationAcceptanceIdentityResolver,
} from "../team/teamInvitationAcceptanceIdentityResolver.ts";
import {
  requireTeamInvitationKey,
} from "../team/teamInvitationValidation.ts";
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

export const RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION =
  "team.invitation.accept" as const;

export const railwayTeamInvitationAcceptanceOperationPolicy = Object.freeze({
  id: RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
  requestKind: "mutation" as const,
  permission: "authenticated-user" as const,
  mutationSafety: Object.freeze({
    rateLimit: "tenant-mutation" as const,
    idempotency: "deterministic-invitation-replay" as const,
    identity: "server-resolved-verified-primary-email" as const,
    transaction: "required" as const,
  }),
});

export interface RailwayTeamInvitationAcceptanceOperationDependencies {
  readonly acceptances: TeamInvitationAcceptanceRepository;
  readonly identity: TeamInvitationAcceptanceIdentityResolver;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly clock?: () => Date;
}

function requireDependencies(
  dependencies: Readonly<
    RailwayTeamInvitationAcceptanceOperationDependencies
  >,
): void {
  const expectedKeys = dependencies.clock === undefined
    ? ["acceptances", "identity", "mutationRateLimit"]
    : ["acceptances", "clock", "identity", "mutationRateLimit"];

  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== expectedKeys.join(",") ||
    typeof dependencies.acceptances?.accept !== "function" ||
    typeof dependencies.identity?.resolve !== "function" ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    (dependencies.clock !== undefined && typeof dependencies.clock !== "function")
  ) {
    throw new Error("Railway invitation acceptance dependencies are invalid");
  }
}

function parsePayload(payload: RailwayApiJsonObject): string {
  if (
    Object.keys(payload).length !== 1 ||
    !Object.hasOwn(payload, "invitationKey")
  ) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  try {
    return requireTeamInvitationKey(payload.invitationKey);
  } catch {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }
}

function mapError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }

  if (error instanceof TeamInvitationAcceptanceServiceError) {
    switch (error.code) {
      case "INVALID_INPUT":
        throw new RailwayApiDispatchError("INVALID_REQUEST");
      case "IDENTITY_REJECTED":
        throw new RailwayApiDispatchError("IDENTITY_VERIFICATION_REQUIRED");
      case "INVITATION_NOT_FOUND":
      case "EMAIL_MISMATCH":
      case "INVITATION_INELIGIBLE":
      case "CONFLICT":
        throw new RailwayApiDispatchError("INVITATION_UNAVAILABLE");
      case "AUTHENTICATION_REQUIRED":
        throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
      case "IDENTITY_UNAVAILABLE":
      case "PERSISTENCE_UNAVAILABLE":
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
  }

  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

export function createRailwayTeamInvitationAcceptanceOperation(
  dependencies: Readonly<
    RailwayTeamInvitationAcceptanceOperationDependencies
  >,
): Readonly<RailwayApiOperation> {
  requireDependencies(dependencies);
  const proof = Object.freeze({ kind: "railway-team-invitation-acceptance-v1" });

  return Object.freeze({
    ...railwayTeamInvitationAcceptanceOperationPolicy,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        if (
          request.operation !== RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION ||
          request.requestKind !== "mutation" ||
          request.idempotencyKey === null ||
          request.idempotencyKey !==
            await deriveRailwayApiDeterministicIdempotencyKey(
              RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
              payload,
            )
        ) {
          throw new RailwayApiDispatchError("INVALID_REQUEST");
        }

        const invitationKey = parsePayload(payload);
        let rateLimitDecision;

        try {
          rateLimitDecision = await dependencies.mutationRateLimit.consume(
            `team-invitation-acceptance:${context.userIdentity.externalUserId}`,
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

        const resolution = await dependencies.identity.resolve(
          context.userIdentity.externalUserId,
        );

        if (resolution.status === "rejected") {
          throw new RailwayApiDispatchError("IDENTITY_VERIFICATION_REQUIRED");
        }

        if (resolution.status !== "verified") {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }

        const service = createTeamInvitationAcceptanceService(
          dependencies.acceptances,
          {
            async verify(candidateProof) {
              return candidateProof === proof
                ? {
                    status: "verified" as const,
                    externalUserId: context.userIdentity.externalUserId,
                    verifiedEmail: resolution.verifiedEmail,
                  }
                : { status: "rejected" as const };
            },
          },
          { now: dependencies.clock ?? (() => new Date()) },
        );
        const result = await service.accept({ invitationKey, proof });

        if (
          result.status !== "accepted" &&
          result.status !== "already-accepted"
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
