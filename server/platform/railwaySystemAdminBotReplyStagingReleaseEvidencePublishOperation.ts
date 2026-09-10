import type { UserId } from "../../shared/domain/model.ts";
import {
  resolveSystemAdminSession,
  SystemAdminSessionError,
} from "../auth/systemAdminSession.ts";
import type { RateLimitGuard } from "../security/rateLimit.ts";
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
import {
  RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
} from "./postgresBotReplyStagingReleaseEvidenceOperatorRepository.ts";
import {
  RailwayBotReplyStagingReleaseEvidenceOperatorError,
  type RailwayBotReplyStagingReleaseEvidenceOperatorInput,
  type RailwayBotReplyStagingReleaseEvidenceOperatorResult,
} from "./railwayBotReplyStagingReleaseEvidenceOperator.ts";

export const railwaySystemAdminBotReplyStagingReleaseEvidencePublishPolicy =
  Object.freeze({
    id: RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
    requestKind: "mutation" as const,
    authorization: "system-admin-allowlist" as const,
    mutationSafety: Object.freeze({
      rateLimit: "system-admin-mutation" as const,
      idempotency:
        "deterministic-request-key-and-operator-event-replay" as const,
      audit: "atomic-release-cas-and-append-only-operator-event" as const,
      transaction: "postgres-audited-compare-and-set" as const,
      activation: "explicit-adr-and-live-configuration-approval" as const,
      providerBoundary: "none" as const,
    }),
  });

export interface RailwaySystemAdminBotReplyStagingReleaseEvidencePublishDependencies {
  readonly allowedExternalUserIds: readonly UserId[];
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly operator: Readonly<{
    operate(
      input: Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorInput>,
      context: Readonly<{
        actorExternalUserId: string;
        idempotencyKey: string;
      }>,
    ): Promise<RailwayBotReplyStagingReleaseEvidenceOperatorResult>;
  }>;
}

const payloadKeys = Object.freeze([
  "confirmation",
  "expectedEvidenceDigest",
  "expectedRelease",
  "expectedVersion",
  "lifetimeSeconds",
  "requestedAt",
  "schemaVersion",
]);

function hasExactKeys(
  value: Readonly<RailwayApiJsonObject>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminBotReplyStagingReleaseEvidencePublishDependencies
  >,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "allowedExternalUserIds,mutationRateLimit,operator" ||
    !Array.isArray(dependencies.allowedExternalUserIds) ||
    dependencies.allowedExternalUserIds.length === 0 ||
    dependencies.allowedExternalUserIds.some(
      (identity) =>
        typeof identity !== "string" || identity.length < 1 ||
        identity.length > 255 || identity.trim() !== identity ||
        /[\u0000-\u001f\u007f]/.test(identity),
    ) ||
    new Set(dependencies.allowedExternalUserIds).size !==
      dependencies.allowedExternalUserIds.length ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    typeof dependencies.operator?.operate !== "function"
  ) {
    throw new Error(
      "Railway release evidence publish operation dependencies are invalid",
    );
  }
}

function mapOperatorBlock(
  result: Extract<
    RailwayBotReplyStagingReleaseEvidenceOperatorResult,
    { status: "blocked" }
  >,
): never {
  switch (result.code) {
    case "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_REQUEST_NOT_CURRENT":
      throw new RailwayApiDispatchError("INVALID_REQUEST");
    case "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_ACTIVATION_REQUIRED":
    case "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_RELEASE_NOT_READY":
      throw new RailwayApiDispatchError("INVALID_TRANSITION");
    case "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_PRECONDITION_FAILED":
    case "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_WRITE_CONFLICT":
      throw new RailwayApiDispatchError("CONFLICT");
    default:
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
}

function mapError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) throw error;
  if (error instanceof SystemAdminSessionError) {
    throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
  }
  if (error instanceof RailwayBotReplyStagingReleaseEvidenceOperatorError) {
    throw new RailwayApiDispatchError(
      error.code === "dependencies-invalid"
        ? "DEPENDENCY_UNAVAILABLE"
        : "INVALID_REQUEST",
    );
  }
  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

async function consumeQuota(
  dependencies: Readonly<
    RailwaySystemAdminBotReplyStagingReleaseEvidencePublishDependencies
  >,
  actorExternalUserId: string,
): Promise<void> {
  let decision;
  try {
    decision = await dependencies.mutationRateLimit.consume(
      `${actorExternalUserId}:${RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION}`,
    );
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  if (decision.outcome === "limited") {
    throw new RailwayApiDispatchError("RATE_LIMITED");
  }
  if (decision.outcome !== "allowed") {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
}

export function createRailwaySystemAdminBotReplyStagingReleaseEvidencePublishOperation(
  dependencies: Readonly<
    RailwaySystemAdminBotReplyStagingReleaseEvidencePublishDependencies
  >,
): Readonly<RailwayApiOperation> {
  requireDependencies(dependencies);
  const policy = railwaySystemAdminBotReplyStagingReleaseEvidencePublishPolicy;

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
          !hasExactKeys(payload, payloadKeys) ||
          request.operation !== policy.id ||
          request.requestKind !== policy.requestKind ||
          request.idempotencyKey === null
        ) {
          throw new RailwayApiDispatchError("INVALID_REQUEST");
        }
        const session = resolveSystemAdminSession(
          context.userIdentity,
          dependencies.allowedExternalUserIds,
        );
        const expectedIdempotencyKey =
          await deriveRailwayApiDeterministicIdempotencyKey(
            policy.id,
            payload,
          );
        if (request.idempotencyKey !== expectedIdempotencyKey) {
          throw new RailwayApiDispatchError("CONFLICT");
        }
        await consumeQuota(dependencies, session.externalUserId);

        const result = await dependencies.operator.operate(
          payload as unknown as
            Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorInput>,
          Object.freeze({
            actorExternalUserId: session.externalUserId,
            idempotencyKey: expectedIdempotencyKey,
          }),
        );
        if (result.status === "blocked") mapOperatorBlock(result);

        return Object.freeze({
          outcome: result.outcome,
          version: result.version,
          evidenceDigest: result.evidenceDigest,
          expiresAt: result.expiresAt,
          auditEventKey: result.auditEventKey,
        });
      } catch (error) {
        mapError(error);
      }
    },
  });
}
