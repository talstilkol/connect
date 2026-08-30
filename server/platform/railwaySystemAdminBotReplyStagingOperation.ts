import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  resolveSystemAdminSession,
  SystemAdminSessionError,
} from "../auth/systemAdminSession.ts";
import {
  BotReplyStagingLiveDriverError,
  type BotReplyStagingLiveDriverRequest,
  type BotReplyStagingLiveDriverResult,
} from "../operations/botReplyStagingLiveDriver.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
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

export const railwaySystemAdminBotReplyStagingOperationPolicy =
  Object.freeze({
    id: "system-admin.bot-reply-staging.run",
    requestKind: "mutation" as const,
    authorization: "system-admin-allowlist" as const,
    mutationSafety: Object.freeze({
      rateLimit: "system-admin-mutation" as const,
      idempotency: "deterministic-request-key-and-durable-run-replay" as const,
      audit: "durable-run-bound-immutable-event" as const,
      transaction: "runner-required" as const,
      providerBoundary: "railway-bullmq-bot-reply-worker" as const,
    }),
  });

export interface RailwaySystemAdminBotReplyStagingOperationDependencies {
  readonly allowedExternalUserIds: readonly UserId[];
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly driver: Readonly<{
    run(
      request: unknown,
      context: unknown,
    ): Promise<BotReplyStagingLiveDriverResult>;
  }>;
}

const payloadKeys = Object.freeze([
  "schemaVersion",
  "driverVersion",
  "confirmation",
  "targetTenantId",
  "expectedConnectionVersion",
  "expectedPolicyVersion",
  "requestedAt",
  "releaseId",
  "commitSha",
  "artifactDigest",
]);

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function hasExactKeys(
  value: Readonly<RailwayApiJsonObject>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return keys.length === expected.length &&
    keys.every((key, index) => key === expected[index]);
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminBotReplyStagingOperationDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "allowedExternalUserIds,driver,mutationRateLimit" ||
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
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    typeof dependencies.driver?.run !== "function"
  ) {
    throw new Error(
      "Railway system admin bot reply staging dependencies are invalid",
    );
  }
}

function mapDriverError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }
  if (error instanceof SystemAdminSessionError) {
    throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
  }
  if (error instanceof BotReplyStagingLiveDriverError) {
    switch (error.code) {
      case "BOT_REPLY_STAGING_DRIVER_REQUEST_INVALID":
      case "BOT_REPLY_STAGING_DRIVER_REQUEST_NOT_YET_VALID":
      case "BOT_REPLY_STAGING_DRIVER_REQUEST_EXPIRED":
        throw new RailwayApiDispatchError("INVALID_REQUEST");
      case "BOT_REPLY_STAGING_DRIVER_TENANT_NOT_AUTHORIZED":
        throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
      case "BOT_REPLY_STAGING_DRIVER_SAFETY_GATE_BLOCKED":
      case "BOT_REPLY_STAGING_DRIVER_SAFETY_EVIDENCE_EXPIRED":
        throw new RailwayApiDispatchError("INVALID_TRANSITION");
      case "BOT_REPLY_STAGING_DRIVER_RUN_IN_PROGRESS":
        throw new RailwayApiDispatchError("CONFLICT");
      default:
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
  }
  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

async function consumeMutationQuota(
  dependencies: Readonly<
    RailwaySystemAdminBotReplyStagingOperationDependencies
  >,
  externalUserId: string,
): Promise<void> {
  let decision;
  try {
    decision = await dependencies.mutationRateLimit.consume(
      `${externalUserId}:${railwaySystemAdminBotReplyStagingOperationPolicy.id}`,
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

export function createRailwaySystemAdminBotReplyStagingOperation(
  dependencies: Readonly<
    RailwaySystemAdminBotReplyStagingOperationDependencies
  >,
): Readonly<RailwayApiOperation> {
  requireDependencies(dependencies);
  const policy = railwaySystemAdminBotReplyStagingOperationPolicy;

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
          invalidRequest();
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

        await consumeMutationQuota(
          dependencies,
          session.externalUserId,
        );
        const result = await dependencies.driver.run(
          payload as unknown as BotReplyStagingLiveDriverRequest,
          Object.freeze({
            actorExternalUserId: session.externalUserId,
          }),
        );

        return Object.freeze({
          outcome: result.outcome,
          runKey: result.runKey,
          auditKey: result.auditKey,
          verifiedAt: result.verifiedAt,
          expiresAt: result.expiresAt,
          evidenceDigest: result.evidenceDigest,
        });
      } catch (error) {
        mapDriverError(error);
      }
    },
  });
}
