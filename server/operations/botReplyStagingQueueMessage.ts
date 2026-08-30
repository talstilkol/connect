import type {
  BotReplyStagingLiveRunInput,
} from "./botReplyStagingLiveDriver.ts";
import {
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "./botReplyStagingDurableRunner.ts";

export const botReplyStagingQueueMessageVersion =
  "connect-bot-reply-staging-queue-v1" as const;

const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const auditKeyPattern = /^bot_reply_staging_audit_v1_[a-f0-9]{64}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const unsafeControlCharacters = /[\u0000-\u001f\u007f]/;

export interface BotReplyStagingQueueMessage {
  readonly schemaVersion: 1;
  readonly messageVersion: typeof botReplyStagingQueueMessageVersion;
  readonly run: Readonly<BotReplyStagingLiveRunInput>;
  readonly requestDigest: string;
  readonly auditKey: string;
  readonly claimVersion: number;
  readonly leaseExpiresAt: string;
}

export interface BotReplyStagingQueueClaim {
  readonly runKey: string;
  readonly auditKey: string;
  readonly claimVersion: number;
  readonly leaseExpiresAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const normalized = [...expected].sort();
  return actual.length === normalized.length &&
    actual.every((key, index) => key === normalized[index]);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) {
    return false;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function isActor(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 255 &&
    value.trim() === value &&
    !unsafeControlCharacters.test(value);
}

function parseRun(value: unknown): Readonly<BotReplyStagingLiveRunInput> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "actorExternalUserId",
      "artifactDigest",
      "commitSha",
      "expectedConnectionVersion",
      "expectedPolicyVersion",
      "graphApiVersion",
      "rateLimitMethodFingerprint",
      "recipientFingerprint",
      "releaseId",
      "requestedAt",
      "runKey",
      "targetTenantId",
    ]) ||
    typeof value.runKey !== "string" ||
    !runKeyPattern.test(value.runKey) ||
    !isPositiveSafeInteger(value.targetTenantId) ||
    !isPositiveSafeInteger(value.expectedConnectionVersion) ||
    !isPositiveSafeInteger(value.expectedPolicyVersion) ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !fingerprintPattern.test(value.artifactDigest) ||
    typeof value.graphApiVersion !== "string" ||
    !graphApiVersionPattern.test(value.graphApiVersion) ||
    !isCanonicalTimestamp(value.requestedAt) ||
    typeof value.recipientFingerprint !== "string" ||
    !fingerprintPattern.test(value.recipientFingerprint) ||
    typeof value.rateLimitMethodFingerprint !== "string" ||
    !fingerprintPattern.test(value.rateLimitMethodFingerprint) ||
    !isActor(value.actorExternalUserId)
  ) {
    return null;
  }

  return Object.freeze({
    runKey: value.runKey,
    targetTenantId: value.targetTenantId,
    expectedConnectionVersion: value.expectedConnectionVersion,
    expectedPolicyVersion: value.expectedPolicyVersion,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    artifactDigest: value.artifactDigest,
    graphApiVersion: value.graphApiVersion,
    requestedAt: value.requestedAt,
    recipientFingerprint: value.recipientFingerprint,
    rateLimitMethodFingerprint: value.rateLimitMethodFingerprint,
    actorExternalUserId: value.actorExternalUserId,
  });
}

export function parseBotReplyStagingQueueMessage(
  value: unknown,
): Readonly<BotReplyStagingQueueMessage> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "auditKey",
      "claimVersion",
      "leaseExpiresAt",
      "messageVersion",
      "requestDigest",
      "run",
      "schemaVersion",
    ]) ||
    value.schemaVersion !== 1 ||
    value.messageVersion !== botReplyStagingQueueMessageVersion ||
    typeof value.requestDigest !== "string" ||
    !fingerprintPattern.test(value.requestDigest) ||
    typeof value.auditKey !== "string" ||
    !auditKeyPattern.test(value.auditKey) ||
    !isPositiveSafeInteger(value.claimVersion) ||
    !isCanonicalTimestamp(value.leaseExpiresAt)
  ) {
    return null;
  }

  const run = parseRun(value.run);
  if (
    run === null ||
    Date.parse(value.leaseExpiresAt) <= Date.parse(run.requestedAt) ||
    value.requestDigest !==
      deriveBotReplyStagingDurableRequestDigest(run) ||
    value.auditKey !== deriveBotReplyStagingDurableAuditKey(
      run.runKey,
      value.requestDigest,
    )
  ) {
    return null;
  }

  return Object.freeze({
    schemaVersion: 1,
    messageVersion: botReplyStagingQueueMessageVersion,
    run,
    requestDigest: value.requestDigest,
    auditKey: value.auditKey,
    claimVersion: value.claimVersion,
    leaseExpiresAt: value.leaseExpiresAt,
  });
}

export function createBotReplyStagingQueueMessage(
  run: Readonly<BotReplyStagingLiveRunInput>,
  claim: Readonly<BotReplyStagingQueueClaim>,
): Readonly<BotReplyStagingQueueMessage> {
  const requestDigest = deriveBotReplyStagingDurableRequestDigest(run);
  const candidate = parseBotReplyStagingQueueMessage({
    schemaVersion: 1,
    messageVersion: botReplyStagingQueueMessageVersion,
    run,
    requestDigest,
    auditKey: claim?.auditKey,
    claimVersion: claim?.claimVersion,
    leaseExpiresAt: claim?.leaseExpiresAt,
  });

  if (candidate === null || claim?.runKey !== run.runKey) {
    throw new Error("Bot reply staging queue message is invalid");
  }
  return candidate;
}

export function deriveBotReplyStagingQueueJobId(
  message: Readonly<BotReplyStagingQueueMessage>,
): string {
  const parsed = parseBotReplyStagingQueueMessage(message);
  if (parsed === null) {
    throw new Error("Bot reply staging queue message is invalid");
  }
  return `${parsed.run.runKey}_${parsed.claimVersion}`;
}
