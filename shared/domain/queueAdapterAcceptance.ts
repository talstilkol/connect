import {
  QUEUE_BATCH_CAPACITY,
} from "./queuePolicy.ts";

export const queueAdapterAcceptancePolicyVersion =
  "connect-queue-adapter-acceptance-v1" as const;

export const queueAdapterAcceptanceMaximumAgeMilliseconds =
  24 * 60 * 60 * 1_000;

export type QueueAdapterQueueId =
  | "meta-webhook"
  | "campaign-delivery"
  | "team-invitation"
  | "message-template-submission";

export interface QueueAdapterRequirement {
  readonly queueId: QueueAdapterQueueId;
  readonly maximumBatchSize: typeof QUEUE_BATCH_CAPACITY;
  readonly maximumRetries: 10;
  readonly minimumDelayedRetrySeconds: number;
}

export const QUEUE_ADAPTER_REQUIREMENTS: readonly Readonly<
  QueueAdapterRequirement
>[] = Object.freeze([
  Object.freeze({
    queueId: "meta-webhook",
    maximumBatchSize: QUEUE_BATCH_CAPACITY,
    maximumRetries: 10,
    minimumDelayedRetrySeconds: 0,
  }),
  Object.freeze({
    queueId: "campaign-delivery",
    maximumBatchSize: QUEUE_BATCH_CAPACITY,
    maximumRetries: 10,
    minimumDelayedRetrySeconds: 24 * 60 * 60,
  }),
  Object.freeze({
    queueId: "team-invitation",
    maximumBatchSize: QUEUE_BATCH_CAPACITY,
    maximumRetries: 10,
    minimumDelayedRetrySeconds: 30,
  }),
  Object.freeze({
    queueId: "message-template-submission",
    maximumBatchSize: QUEUE_BATCH_CAPACITY,
    maximumRetries: 10,
    minimumDelayedRetrySeconds: 30,
  }),
]);

export type QueueAdapterAcceptanceResult =
  | Readonly<{
      outcome: "accepted";
      queueCount: 4;
      verifiedAt: string;
      expiresAt: string;
      artifactDigest: string;
    }>
  | Readonly<{
      outcome: "rejected";
    }>;

const timestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const commitPattern = /^[a-f0-9]{40}$/;
const providerPattern = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const adapterVersionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function isCanonicalTimestamp(value: unknown): value is string {
  return typeof value === "string" && timestampPattern.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

function delayedRetryIsAccepted(
  value: unknown,
  minimumSeconds: number,
): boolean {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["supported", "maximumSeconds"])
  ) {
    return false;
  }

  if (minimumSeconds === 0 && value.supported === false) {
    return value.maximumSeconds === null;
  }

  return value.supported === true &&
    Number.isSafeInteger(value.maximumSeconds) &&
    Number(value.maximumSeconds) >= Math.max(1, minimumSeconds) &&
    Number(value.maximumSeconds) <= 7 * 24 * 60 * 60;
}

function queueProofIsAccepted(
  value: unknown,
  requirement: Readonly<QueueAdapterRequirement>,
): boolean {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "queueId",
      "provider",
      "adapterVersion",
      "deliverySemantics",
      "maximumBatchSize",
      "maximumRetries",
      "explicitAcknowledgement",
      "deadLetterQueue",
      "preservesMessageBody",
      "delayedRetry",
      "duplicateDeliveryTest",
      "poisonMessageDeadLetterTest",
      "outageRecoveryTest",
      "payloadRoundTripTest",
      "acknowledgementIsolationTest",
    ]) ||
    value.queueId !== requirement.queueId ||
    typeof value.provider !== "string" ||
    !providerPattern.test(value.provider) ||
    typeof value.adapterVersion !== "string" ||
    !adapterVersionPattern.test(value.adapterVersion) ||
    value.deliverySemantics !== "at-least-once" ||
    value.maximumBatchSize !== requirement.maximumBatchSize ||
    value.maximumRetries !== requirement.maximumRetries ||
    value.explicitAcknowledgement !== true ||
    value.deadLetterQueue !== true ||
    value.preservesMessageBody !== true ||
    value.duplicateDeliveryTest !== "passed" ||
    value.poisonMessageDeadLetterTest !== "passed" ||
    value.outageRecoveryTest !== "passed" ||
    value.payloadRoundTripTest !== "passed" ||
    value.acknowledgementIsolationTest !== "passed"
  ) {
    return false;
  }

  return delayedRetryIsAccepted(
    value.delayedRetry,
    requirement.minimumDelayedRetrySeconds,
  );
}

/**
 * Validates a short-lived staging proof. Resource names, account identifiers,
 * connection strings and payloads are excluded by the exact-key contract.
 */
export function verifyQueueAdapterAcceptanceEvidence(
  value: unknown,
  checkedAt: unknown,
): QueueAdapterAcceptanceResult {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "policyVersion",
      "environment",
      "commitSha",
      "verifiedAt",
      "expiresAt",
      "artifactDigest",
      "queues",
    ]) ||
    value.schemaVersion !== 1 ||
    value.policyVersion !== queueAdapterAcceptancePolicyVersion ||
    value.environment !== "staging" ||
    typeof value.commitSha !== "string" ||
    !commitPattern.test(value.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !digestPattern.test(value.artifactDigest) ||
    !isCanonicalTimestamp(value.verifiedAt) ||
    !isCanonicalTimestamp(value.expiresAt) ||
    !isCanonicalTimestamp(checkedAt) ||
    !Array.isArray(value.queues) ||
    value.queues.length !== QUEUE_ADAPTER_REQUIREMENTS.length
  ) {
    return Object.freeze({ outcome: "rejected" });
  }

  const age = Date.parse(value.expiresAt) - Date.parse(value.verifiedAt);
  const checkedAtMilliseconds = Date.parse(checkedAt);
  if (
    age <= 0 ||
    age > queueAdapterAcceptanceMaximumAgeMilliseconds ||
    checkedAtMilliseconds < Date.parse(value.verifiedAt) ||
    checkedAtMilliseconds >= Date.parse(value.expiresAt)
  ) {
    return Object.freeze({ outcome: "rejected" });
  }

  for (let index = 0; index < QUEUE_ADAPTER_REQUIREMENTS.length; index += 1) {
    if (!queueProofIsAccepted(
      value.queues[index],
      QUEUE_ADAPTER_REQUIREMENTS[index],
    )) {
      return Object.freeze({ outcome: "rejected" });
    }
  }

  return Object.freeze({
    outcome: "accepted",
    queueCount: 4,
    verifiedAt: value.verifiedAt,
    expiresAt: value.expiresAt,
    artifactDigest: value.artifactDigest,
  });
}
