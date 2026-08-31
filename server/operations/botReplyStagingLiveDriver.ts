import {
  createHash,
} from "node:crypto";

import {
  buildBotReplyStagingEvidenceFromReceipt,
} from "./botReplyStagingEvidenceBuilder.ts";

export const botReplyStagingLiveDriverVersion =
  "connect-bot-reply-staging-live-driver-v1" as const;

export const botReplyStagingLiveDriverConfirmation =
  "RUN_AUTHORIZED_BOT_REPLY_STAGING_SCENARIOS" as const;

const maximumRequestAgeMilliseconds = 10 * 60 * 1_000;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const auditKeyPattern = /^bot_reply_staging_audit_v1_[a-f0-9]{64}$/;

export interface BotReplyStagingLiveDriverRequest {
  readonly schemaVersion: 1;
  readonly driverVersion: typeof botReplyStagingLiveDriverVersion;
  readonly confirmation: typeof botReplyStagingLiveDriverConfirmation;
  readonly targetTenantId: number;
  readonly expectedConnectionVersion: number;
  readonly expectedPolicyVersion: number;
  readonly requestedAt: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
}

export interface BotReplyStagingLiveSafetySnapshot {
  readonly environment: "staging";
  readonly connectionMode: "approved-staging-waba";
  readonly connectionStatus: "connected";
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly deliveryState: "enabled";
  readonly policyEvidenceExpiresAt: string;
  readonly graphApiVersion: string;
  readonly credentialSource: "encrypted-vault";
  readonly executionBoundary: "railway-bullmq-bot-reply-worker";
  readonly evidenceSource: "durable-postgres";
  readonly recipientAuthorization: Readonly<{
    status: "approved";
    optInRecorded: true;
    expiresAt: string;
    recipientFingerprint: string;
  }>;
  readonly rateLimitTestApproval: Readonly<{
    status: "approved";
    approvedBy: "tal";
    approvedAt: string;
    expiresAt: string;
    methodFingerprint: string;
  }>;
}

export interface BotReplyStagingLiveRunInput {
  readonly runKey: string;
  readonly targetTenantId: number;
  readonly expectedConnectionVersion: number;
  readonly expectedPolicyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly requestedAt: string;
  readonly recipientFingerprint: string;
  readonly rateLimitMethodFingerprint: string;
  readonly actorExternalUserId: string;
}

export interface BotReplyStagingLiveDriverExecutionContext {
  readonly actorExternalUserId: string;
}

export type BotReplyStagingDurableRunResult = Readonly<
  | {
      outcome: "completed" | "replayed";
      runKey: string;
      auditKey: string;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "in-progress";
      runKey: string;
    }
>;

export interface BotReplyStagingLiveDriverDependencies {
  readonly stagingTenantId: number;
  readonly clock: Readonly<{ now(): Date }>;
  readonly safety: Readonly<{
    read(
      targetTenantId: number,
    ): Promise<BotReplyStagingLiveSafetySnapshot | null>;
  }>;
  readonly durableRuns: Readonly<{
    run(
      input: Readonly<BotReplyStagingLiveRunInput>,
    ): Promise<BotReplyStagingDurableRunResult>;
  }>;
}

export type BotReplyStagingLiveDriverResult = Readonly<{
  outcome: "completed" | "replayed";
  runKey: string;
  auditKey: string;
  verifiedAt: string;
  expiresAt: string;
  evidenceDigest: string;
}>;

export class BotReplyStagingLiveDriverError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BotReplyStagingLiveDriverError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new BotReplyStagingLiveDriverError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function canonicalTimestampMilliseconds(value: unknown): number | null {
  if (typeof value !== "string" || value.length > 40) {
    return null;
  }

  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
      new Date(milliseconds).toISOString() === value
    ? milliseconds
    : null;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

function requireExecutionContext(
  value: unknown,
): Readonly<BotReplyStagingLiveDriverExecutionContext> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["actorExternalUserId"]) ||
    typeof value.actorExternalUserId !== "string" ||
    value.actorExternalUserId.length < 1 ||
    value.actorExternalUserId.length > 255 ||
    value.actorExternalUserId.trim() !== value.actorExternalUserId ||
    /[\u0000-\u001f\u007f]/.test(value.actorExternalUserId)
  ) {
    fail("BOT_REPLY_STAGING_DRIVER_EXECUTION_CONTEXT_INVALID");
  }

  return value as unknown as Readonly<
    BotReplyStagingLiveDriverExecutionContext
  >;
}

function nowMilliseconds(
  clock: Readonly<{ now(): Date }>,
): number {
  let value: Date;

  try {
    value = clock.now();
  } catch {
    fail("BOT_REPLY_STAGING_DRIVER_CLOCK_UNAVAILABLE");
  }

  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    fail("BOT_REPLY_STAGING_DRIVER_CLOCK_INVALID");
  }

  return value.getTime();
}

function requireRequest(
  value: unknown,
  currentMilliseconds: number,
): Readonly<BotReplyStagingLiveDriverRequest> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
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
    ]) ||
    value.schemaVersion !== 1 ||
    value.driverVersion !== botReplyStagingLiveDriverVersion ||
    value.confirmation !== botReplyStagingLiveDriverConfirmation ||
    !isPositiveSafeInteger(value.targetTenantId) ||
    !isPositiveSafeInteger(value.expectedConnectionVersion) ||
    !isPositiveSafeInteger(value.expectedPolicyVersion) ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !fingerprintPattern.test(value.artifactDigest)
  ) {
    fail("BOT_REPLY_STAGING_DRIVER_REQUEST_INVALID");
  }

  const requestedAtMilliseconds =
    canonicalTimestampMilliseconds(value.requestedAt);
  if (requestedAtMilliseconds === null) {
    fail("BOT_REPLY_STAGING_DRIVER_REQUEST_INVALID");
  }
  if (requestedAtMilliseconds > currentMilliseconds) {
    fail("BOT_REPLY_STAGING_DRIVER_REQUEST_NOT_YET_VALID");
  }
  if (
    currentMilliseconds - requestedAtMilliseconds >
      maximumRequestAgeMilliseconds
  ) {
    fail("BOT_REPLY_STAGING_DRIVER_REQUEST_EXPIRED");
  }

  return value as unknown as Readonly<BotReplyStagingLiveDriverRequest>;
}

function requireDependencies(
  dependencies: Readonly<BotReplyStagingLiveDriverDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "clock,durableRuns,safety,stagingTenantId" ||
    !isPositiveSafeInteger(dependencies.stagingTenantId) ||
    typeof dependencies.clock?.now !== "function" ||
    typeof dependencies.safety?.read !== "function" ||
    typeof dependencies.durableRuns?.run !== "function"
  ) {
    throw new Error("Bot reply staging live driver dependencies are invalid");
  }
}

function requireSafetySnapshot(
  value: BotReplyStagingLiveSafetySnapshot | null,
  request: Readonly<BotReplyStagingLiveDriverRequest>,
  currentMilliseconds: number,
): Readonly<BotReplyStagingLiveSafetySnapshot> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "environment",
      "connectionMode",
      "connectionStatus",
      "connectionVersion",
      "policyVersion",
      "deliveryState",
      "policyEvidenceExpiresAt",
      "graphApiVersion",
      "credentialSource",
      "executionBoundary",
      "evidenceSource",
      "recipientAuthorization",
      "rateLimitTestApproval",
    ]) ||
    value.environment !== "staging" ||
    value.connectionMode !== "approved-staging-waba" ||
    value.connectionStatus !== "connected" ||
    value.deliveryState !== "enabled" ||
    value.credentialSource !== "encrypted-vault" ||
    value.executionBoundary !== "railway-bullmq-bot-reply-worker" ||
    value.evidenceSource !== "durable-postgres" ||
    value.connectionVersion !== request.expectedConnectionVersion ||
    value.policyVersion !== request.expectedPolicyVersion ||
    typeof value.graphApiVersion !== "string" ||
    !graphApiVersionPattern.test(value.graphApiVersion) ||
    !isRecord(value.recipientAuthorization) ||
    !hasExactKeys(value.recipientAuthorization, [
      "status",
      "optInRecorded",
      "expiresAt",
      "recipientFingerprint",
    ]) ||
    value.recipientAuthorization.status !== "approved" ||
    value.recipientAuthorization.optInRecorded !== true ||
    typeof value.recipientAuthorization.recipientFingerprint !== "string" ||
    !fingerprintPattern.test(
      value.recipientAuthorization.recipientFingerprint,
    ) ||
    !isRecord(value.rateLimitTestApproval) ||
    !hasExactKeys(value.rateLimitTestApproval, [
      "status",
      "approvedBy",
      "approvedAt",
      "expiresAt",
      "methodFingerprint",
    ]) ||
    value.rateLimitTestApproval.status !== "approved" ||
    value.rateLimitTestApproval.approvedBy !== "tal" ||
    typeof value.rateLimitTestApproval.methodFingerprint !== "string" ||
    !fingerprintPattern.test(
      value.rateLimitTestApproval.methodFingerprint,
    )
  ) {
    fail("BOT_REPLY_STAGING_DRIVER_SAFETY_GATE_BLOCKED");
  }

  const policyExpiresAt = canonicalTimestampMilliseconds(
    value.policyEvidenceExpiresAt,
  );
  const recipientExpiresAt = canonicalTimestampMilliseconds(
    value.recipientAuthorization.expiresAt,
  );
  const approvalApprovedAt = canonicalTimestampMilliseconds(
    value.rateLimitTestApproval.approvedAt,
  );
  const approvalExpiresAt = canonicalTimestampMilliseconds(
    value.rateLimitTestApproval.expiresAt,
  );

  if (
    policyExpiresAt === null ||
    recipientExpiresAt === null ||
    approvalApprovedAt === null ||
    approvalExpiresAt === null ||
    policyExpiresAt <= currentMilliseconds ||
    recipientExpiresAt <= currentMilliseconds ||
    approvalApprovedAt > currentMilliseconds ||
    approvalExpiresAt <= currentMilliseconds ||
    approvalExpiresAt <= approvalApprovedAt
  ) {
    fail("BOT_REPLY_STAGING_DRIVER_SAFETY_EVIDENCE_EXPIRED");
  }

  return value;
}

function deriveRunKey(
  request: Readonly<BotReplyStagingLiveDriverRequest>,
  safety: Readonly<BotReplyStagingLiveSafetySnapshot>,
): string {
  const digest = createHash("sha256").update(JSON.stringify({
    driverVersion: request.driverVersion,
    targetTenantId: request.targetTenantId,
    connectionVersion: request.expectedConnectionVersion,
    policyVersion: request.expectedPolicyVersion,
    releaseId: request.releaseId,
    commitSha: request.commitSha,
    artifactDigest: request.artifactDigest,
    graphApiVersion: safety.graphApiVersion,
    recipientFingerprint:
      safety.recipientAuthorization.recipientFingerprint,
    rateLimitMethodFingerprint:
      safety.rateLimitTestApproval.methodFingerprint,
  })).digest("hex");

  return `bot_reply_staging_run_v1_${digest}`;
}

function requireDurableResult(
  value: BotReplyStagingDurableRunResult,
  expectedRunKey: string,
): Exclude<BotReplyStagingDurableRunResult, { outcome: "in-progress" }> {
  if (
    !isRecord(value) ||
    value.runKey !== expectedRunKey ||
    !runKeyPattern.test(value.runKey)
  ) {
    fail("BOT_REPLY_STAGING_DRIVER_DURABLE_RESULT_INVALID");
  }

  if (value.outcome === "in-progress") {
    if (!hasExactKeys(value, ["outcome", "runKey"])) {
      fail("BOT_REPLY_STAGING_DRIVER_DURABLE_RESULT_INVALID");
    }
    fail("BOT_REPLY_STAGING_DRIVER_RUN_IN_PROGRESS");
  }

  if (
    (value.outcome !== "completed" && value.outcome !== "replayed") ||
    !hasExactKeys(value, [
      "outcome",
      "runKey",
      "auditKey",
      "completedAt",
      "receipt",
    ]) ||
    typeof value.auditKey !== "string" ||
    !auditKeyPattern.test(value.auditKey) ||
    canonicalTimestampMilliseconds(value.completedAt) === null
  ) {
    fail("BOT_REPLY_STAGING_DRIVER_DURABLE_RESULT_INVALID");
  }

  return value as Exclude<
    BotReplyStagingDurableRunResult,
    { outcome: "in-progress" }
  >;
}

export function createBotReplyStagingLiveDriver(
  dependencies: Readonly<BotReplyStagingLiveDriverDependencies>,
) {
  requireDependencies(dependencies);

  return Object.freeze({
    async run(
      rawRequest: unknown,
      rawContext: unknown,
    ): Promise<BotReplyStagingLiveDriverResult> {
      const currentMilliseconds = nowMilliseconds(dependencies.clock);
      const request = requireRequest(rawRequest, currentMilliseconds);
      const context = requireExecutionContext(rawContext);

      if (request.targetTenantId !== dependencies.stagingTenantId) {
        fail("BOT_REPLY_STAGING_DRIVER_TENANT_NOT_AUTHORIZED");
      }

      let safetySnapshot: BotReplyStagingLiveSafetySnapshot | null;
      try {
        safetySnapshot = await dependencies.safety.read(
          request.targetTenantId,
        );
      } catch {
        fail("BOT_REPLY_STAGING_DRIVER_SAFETY_UNAVAILABLE");
      }
      const safety = requireSafetySnapshot(
        safetySnapshot,
        request,
        currentMilliseconds,
      );
      const runKey = deriveRunKey(request, safety);
      const runInput = Object.freeze({
        runKey,
        targetTenantId: request.targetTenantId,
        expectedConnectionVersion: request.expectedConnectionVersion,
        expectedPolicyVersion: request.expectedPolicyVersion,
        releaseId: request.releaseId,
        commitSha: request.commitSha,
        artifactDigest: request.artifactDigest,
        graphApiVersion: safety.graphApiVersion,
        requestedAt: request.requestedAt,
        recipientFingerprint:
          safety.recipientAuthorization.recipientFingerprint,
        rateLimitMethodFingerprint:
          safety.rateLimitTestApproval.methodFingerprint,
        actorExternalUserId: context.actorExternalUserId,
      });

      let rawRunResult: BotReplyStagingDurableRunResult;
      try {
        rawRunResult = await dependencies.durableRuns.run(runInput);
      } catch {
        fail("BOT_REPLY_STAGING_DRIVER_DURABLE_RUN_UNAVAILABLE");
      }
      const runResult = requireDurableResult(rawRunResult, runKey);

      let evidence;
      try {
        evidence = buildBotReplyStagingEvidenceFromReceipt({
          receipt: runResult.receipt,
          releaseManifest: {
            schemaVersion: 1,
            releaseId: request.releaseId,
            commitSha: request.commitSha,
          },
          artifactDigest: request.artifactDigest,
          now: new Date(currentMilliseconds),
        });
      } catch {
        fail("BOT_REPLY_STAGING_DRIVER_RECEIPT_INVALID");
      }

      if (
        evidence.graphApiVersion !== safety.graphApiVersion ||
        evidence.verifiedAt !== runResult.completedAt
      ) {
        fail("BOT_REPLY_STAGING_DRIVER_RECEIPT_MISMATCH");
      }

      return Object.freeze({
        outcome: runResult.outcome,
        runKey: runResult.runKey,
        auditKey: runResult.auditKey,
        verifiedAt: evidence.verifiedAt,
        expiresAt: evidence.expiresAt,
        evidenceDigest: evidence.evidenceDigest,
      });
    },
  });
}
