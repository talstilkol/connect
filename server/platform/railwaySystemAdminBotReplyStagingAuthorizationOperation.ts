import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  resolveSystemAdminSession,
  SystemAdminSessionError,
} from "../auth/systemAdminSession.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import type {
  BotReplyStagingAuthorizationEvent,
  RecordBotReplyStagingAuthorizationCommand,
} from "./postgresBotReplyStagingSafetyRepository.ts";
import {
  deriveBotReplyStagingAuthorizationEventKey,
} from "./postgresBotReplyStagingSafetyRepository.ts";
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

export const railwaySystemAdminBotReplyStagingAuthorizationPolicy =
  Object.freeze({
    id: "system-admin.bot-reply-staging.authorization" as const,
    requestKind: "mutation" as const,
    authorization: "system-admin-allowlist-and-tal-approval" as const,
    mutationSafety: Object.freeze({
      rateLimit: "system-admin-mutation" as const,
      idempotency: "deterministic-request-key-and-event-replay" as const,
      audit: "append-only-postgres-authorization-event" as const,
      transaction: "postgres-trigger-guarded" as const,
      providerBoundary: "none" as const,
    }),
  });

export const botReplyStagingAuthorizationConfirmations = Object.freeze({
  approved: "APPROVE_BOT_REPLY_STAGING_AUTHORIZATION",
  revoked: "REVOKE_BOT_REPLY_STAGING_AUTHORIZATION",
} as const);

export interface RailwaySystemAdminBotReplyStagingAuthorizationDependencies {
  readonly allowedExternalUserIds: readonly UserId[];
  readonly talExternalUserId: UserId;
  readonly clock: () => string;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly authorizations: Readonly<{
    findLatest(
      tenantId: number,
    ): Promise<Readonly<BotReplyStagingAuthorizationEvent> | null>;
    record(
      command: Readonly<RecordBotReplyStagingAuthorizationCommand>,
    ): Promise<Readonly<BotReplyStagingAuthorizationEvent>>;
  }>;
}

const approvalKeys = Object.freeze([
  "schemaVersion",
  "status",
  "confirmation",
  "targetTenantId",
  "authorizationVersion",
  "expectedConnectionVersion",
  "expectedPolicyVersion",
  "recipientFingerprint",
  "recipientOptInRecordedAt",
  "recipientExpiresAt",
  "rateLimitApprovedAt",
  "rateLimitExpiresAt",
  "rateLimitMethodFingerprint",
  "recordedAt",
]);
const revocationKeys = Object.freeze([
  "schemaVersion",
  "status",
  "confirmation",
  "targetTenantId",
  "authorizationVersion",
  "recordedAt",
]);
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const unsafeControlCharacters = /[\u0000-\u001f\u007f]/;
const maximumRequestAgeMilliseconds = 10 * 60 * 1_000;

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function exactKeys(
  value: Readonly<RailwayApiJsonObject>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function validIdentity(value: unknown): value is UserId {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= 255 && value.trim() === value &&
    !unsafeControlCharacters.test(value);
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminBotReplyStagingAuthorizationDependencies
  >,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "allowedExternalUserIds,authorizations,clock,mutationRateLimit,talExternalUserId" ||
    !Array.isArray(dependencies.allowedExternalUserIds) ||
    dependencies.allowedExternalUserIds.length === 0 ||
    dependencies.allowedExternalUserIds.some(
      (identity) => !validIdentity(identity),
    ) ||
    new Set(dependencies.allowedExternalUserIds).size !==
      dependencies.allowedExternalUserIds.length ||
    !validIdentity(dependencies.talExternalUserId) ||
    !dependencies.allowedExternalUserIds.includes(
      dependencies.talExternalUserId,
    ) ||
    typeof dependencies.clock !== "function" ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    typeof dependencies.authorizations?.findLatest !== "function" ||
    typeof dependencies.authorizations?.record !== "function"
  ) {
    throw new Error(
      "Railway Bot reply staging authorization dependencies are invalid",
    );
  }
}

function currentMilliseconds(clock: () => string): number {
  let value: unknown;
  try {
    value = clock();
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  if (!canonicalTimestamp(value)) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  return Date.parse(value);
}

function requireRecordedAt(
  value: unknown,
  nowMilliseconds: number,
): string {
  if (!canonicalTimestamp(value)) invalidRequest();
  const recordedAt = Date.parse(value);
  if (
    recordedAt > nowMilliseconds ||
    nowMilliseconds - recordedAt > maximumRequestAgeMilliseconds
  ) {
    invalidRequest();
  }
  return value;
}

function requireApprovalCommand(
  payload: Readonly<RailwayApiJsonObject>,
  actorExternalUserId: string,
  nowMilliseconds: number,
): Readonly<RecordBotReplyStagingAuthorizationCommand> {
  if (
    !exactKeys(payload, approvalKeys) || payload.schemaVersion !== 1 ||
    payload.status !== "approved" ||
    payload.confirmation !== botReplyStagingAuthorizationConfirmations.approved ||
    !positiveInteger(payload.targetTenantId) ||
    !positiveInteger(payload.authorizationVersion) ||
    !positiveInteger(payload.expectedConnectionVersion) ||
    !positiveInteger(payload.expectedPolicyVersion) ||
    typeof payload.recipientFingerprint !== "string" ||
    !fingerprintPattern.test(payload.recipientFingerprint) ||
    !canonicalTimestamp(payload.recipientOptInRecordedAt) ||
    !canonicalTimestamp(payload.recipientExpiresAt) ||
    !canonicalTimestamp(payload.rateLimitApprovedAt) ||
    !canonicalTimestamp(payload.rateLimitExpiresAt) ||
    typeof payload.rateLimitMethodFingerprint !== "string" ||
    !fingerprintPattern.test(payload.rateLimitMethodFingerprint)
  ) {
    invalidRequest();
  }
  const recordedAt = requireRecordedAt(payload.recordedAt, nowMilliseconds);
  if (
    Date.parse(payload.recipientOptInRecordedAt) > Date.parse(recordedAt) ||
    Date.parse(payload.recipientOptInRecordedAt) >=
      Date.parse(payload.recipientExpiresAt) ||
    Date.parse(payload.rateLimitApprovedAt) > Date.parse(recordedAt) ||
    Date.parse(payload.rateLimitApprovedAt) >=
      Date.parse(payload.rateLimitExpiresAt) ||
    Date.parse(recordedAt) >= Date.parse(payload.recipientExpiresAt) ||
    Date.parse(recordedAt) >= Date.parse(payload.rateLimitExpiresAt)
  ) {
    invalidRequest();
  }
  return Object.freeze({
    tenantId: payload.targetTenantId,
    authorizationVersion: payload.authorizationVersion,
    status: "approved" as const,
    connectionVersion: payload.expectedConnectionVersion,
    policyVersion: payload.expectedPolicyVersion,
    recipientFingerprint: payload.recipientFingerprint,
    recipientOptInRecordedAt: payload.recipientOptInRecordedAt,
    recipientExpiresAt: payload.recipientExpiresAt,
    rateLimitApprovedAt: payload.rateLimitApprovedAt,
    rateLimitExpiresAt: payload.rateLimitExpiresAt,
    rateLimitMethodFingerprint: payload.rateLimitMethodFingerprint,
    actorExternalUserId,
    recordedAt,
  });
}

interface ValidatedRevocationPayload {
  readonly targetTenantId: number;
  readonly authorizationVersion: number;
  readonly recordedAt: string;
}

function requireRevocationPayload(
  payload: Readonly<RailwayApiJsonObject>,
  nowMilliseconds: number,
): Readonly<ValidatedRevocationPayload> {
  if (
    !exactKeys(payload, revocationKeys) || payload.schemaVersion !== 1 ||
    payload.status !== "revoked" ||
    payload.confirmation !== botReplyStagingAuthorizationConfirmations.revoked ||
    !positiveInteger(payload.targetTenantId) ||
    !positiveInteger(payload.authorizationVersion)
  ) {
    invalidRequest();
  }
  const recordedAt = requireRecordedAt(payload.recordedAt, nowMilliseconds);
  return Object.freeze({
    targetTenantId: payload.targetTenantId,
    authorizationVersion: payload.authorizationVersion,
    recordedAt,
  });
}

function revocationCommand(
  payload: Readonly<ValidatedRevocationPayload>,
  previous: Readonly<BotReplyStagingAuthorizationEvent>,
  actorExternalUserId: string,
): Readonly<RecordBotReplyStagingAuthorizationCommand> {
  if (
    previous.tenantId !== payload.targetTenantId ||
    previous.status !== "approved" ||
    payload.authorizationVersion !== previous.authorizationVersion + 1
  ) {
    throw new RailwayApiDispatchError("INVALID_TRANSITION");
  }
  return Object.freeze({
    tenantId: previous.tenantId,
    authorizationVersion: payload.authorizationVersion,
    status: "revoked" as const,
    connectionVersion: previous.connectionVersion,
    policyVersion: previous.policyVersion,
    recipientFingerprint: previous.recipientFingerprint,
    recipientOptInRecordedAt: previous.recipientOptInRecordedAt,
    recipientExpiresAt: previous.recipientExpiresAt,
    rateLimitApprovedAt: previous.rateLimitApprovedAt,
    rateLimitExpiresAt: previous.rateLimitExpiresAt,
    rateLimitMethodFingerprint: previous.rateLimitMethodFingerprint,
    actorExternalUserId,
    recordedAt: payload.recordedAt,
  });
}

async function consumeQuota(
  dependencies: Readonly<
    RailwaySystemAdminBotReplyStagingAuthorizationDependencies
  >,
  actorExternalUserId: string,
): Promise<void> {
  let decision;
  try {
    decision = await dependencies.mutationRateLimit.consume(
      `${actorExternalUserId}:${railwaySystemAdminBotReplyStagingAuthorizationPolicy.id}`,
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

function publicResult(
  outcome: "recorded" | "replayed",
  event: Readonly<BotReplyStagingAuthorizationEvent>,
) {
  return Object.freeze({
    outcome,
    eventKey: event.eventKey,
    authorizationVersion: event.authorizationVersion,
    status: event.status,
    recordedAt: event.recordedAt,
  });
}

export function createRailwaySystemAdminBotReplyStagingAuthorizationOperation(
  dependencies: Readonly<
    RailwaySystemAdminBotReplyStagingAuthorizationDependencies
  >,
): Readonly<RailwayApiOperation> {
  requireDependencies(dependencies);
  const policy = railwaySystemAdminBotReplyStagingAuthorizationPolicy;
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
        const nowMilliseconds = currentMilliseconds(dependencies.clock);
        let approvalCommand:
          | Readonly<RecordBotReplyStagingAuthorizationCommand>
          | null = null;
        let revocationPayload: Readonly<ValidatedRevocationPayload> | null =
          null;
        if (payload.status === "approved") {
          if (session.externalUserId !== dependencies.talExternalUserId) {
            throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
          }
          approvalCommand = requireApprovalCommand(
            payload,
            session.externalUserId,
            nowMilliseconds,
          );
        } else if (payload.status === "revoked") {
          revocationPayload = requireRevocationPayload(
            payload,
            nowMilliseconds,
          );
        } else {
          invalidRequest();
        }
        const targetTenantId = approvalCommand?.tenantId ??
          revocationPayload?.targetTenantId;
        if (!positiveInteger(targetTenantId)) invalidRequest();

        await consumeQuota(dependencies, session.externalUserId);
        let previous: Readonly<BotReplyStagingAuthorizationEvent> | null;
        try {
          previous = await dependencies.authorizations.findLatest(
            targetTenantId,
          );
        } catch (error) {
          if (error instanceof RailwayApiDispatchError) throw error;
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }

        if (
          previous !== null && payload.authorizationVersion ===
            previous.authorizationVersion && payload.status === previous.status &&
          payload.recordedAt === previous.recordedAt &&
          session.externalUserId === previous.actorExternalUserId
        ) {
          return publicResult("replayed", previous);
        }
        if (
          !positiveInteger(payload.authorizationVersion) ||
          payload.authorizationVersion !==
            (previous?.authorizationVersion ?? 0) + 1
        ) {
          throw new RailwayApiDispatchError("CONFLICT");
        }

        const command = approvalCommand !== null
          ? approvalCommand
          : previous === null || revocationPayload === null
          ? (() => {
              throw new RailwayApiDispatchError("INVALID_TRANSITION");
            })()
          : revocationCommand(
              revocationPayload,
              previous,
              session.externalUserId,
            );
        let event: Readonly<BotReplyStagingAuthorizationEvent>;
        try {
          event = await dependencies.authorizations.record(command);
        } catch {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        if (
          event.eventKey !== deriveBotReplyStagingAuthorizationEventKey(command) ||
          event.authorizationVersion !== command.authorizationVersion ||
          event.status !== command.status ||
          event.actorExternalUserId !== command.actorExternalUserId ||
          event.recordedAt !== command.recordedAt
        ) {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        return publicResult("recorded", event);
      } catch (error) {
        if (error instanceof RailwayApiDispatchError) throw error;
        if (error instanceof SystemAdminSessionError) {
          throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
        }
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
      }
    },
  });
}
