export const redisDurabilityAcceptancePolicyVersion =
  "connect-redis-durability-acceptance-v1" as const;

export const redisDurabilityAcceptanceMaximumAgeMilliseconds =
  24 * 60 * 60 * 1_000;

export const redisDurabilityAcceptanceMinimumLoadJobs = 500;

export type RedisDurabilityAcceptanceResult =
  | Readonly<{
      outcome: "accepted";
      commitSha: string;
      artifactDigest: string;
      verifiedAt: string;
      expiresAt: string;
      loadJobCount: number;
    }>
  | Readonly<{ outcome: "rejected" }>;

const timestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const commitPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const redisVersionPattern =
  /^(?:[1-9][0-9]{0,2})\.(?:0|[1-9][0-9]{0,2})\.(?:0|[1-9][0-9]{0,2})$/;

function snapshotExactDataRecord(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  try {
    if (Array.isArray(value)) {
      return null;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return null;
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actualKeys = Reflect.ownKeys(descriptors);
    if (
      actualKeys.length !== keys.length ||
      actualKeys.some((key) =>
        typeof key !== "string" || !keys.includes(key)
      )
    ) {
      return null;
    }

    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) {
        return null;
      }
      snapshot[key] = descriptor.value;
    }

    return snapshot;
  } catch {
    return null;
  }
}

function isCanonicalTimestamp(value: unknown): value is string {
  return typeof value === "string" && timestampPattern.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

function parseAcceptedLoadTest(value: unknown): number | null {
  const record = snapshotExactDataRecord(value, [
    "jobCount",
    "completedCount",
    "failedCount",
    "durationMilliseconds",
  ]);
  if (
    record === null ||
    !Number.isSafeInteger(record.jobCount) ||
    Number(record.jobCount) < redisDurabilityAcceptanceMinimumLoadJobs ||
    Number(record.jobCount) > 1_000_000 ||
    record.completedCount !== record.jobCount ||
    record.failedCount !== 0 ||
    !Number.isSafeInteger(record.durationMilliseconds) ||
    Number(record.durationMilliseconds) < 1 ||
    Number(record.durationMilliseconds) > 60 * 60 * 1_000
  ) {
    return null;
  }

  return Number(record.jobCount);
}

/**
 * Accepts only short-lived staging evidence. Redis URL, resource name,
 * account identity, queue payload and credentials are excluded by the exact
 * key contract. Expected identities must come from the current trusted
 * release manifest; caller-provided evidence cannot select its own release.
 */
export function verifyRedisDurabilityAcceptanceEvidence(
  value: unknown,
  checkedAt: string,
  expectedCommitSha: string,
  expectedArtifactDigest: string,
): RedisDurabilityAcceptanceResult {
  const evidence = snapshotExactDataRecord(value, [
    "schemaVersion",
    "policyVersion",
    "environment",
    "provider",
    "commitSha",
    "artifactDigest",
    "verifiedAt",
    "expiresAt",
    "redisVersion",
    "appendOnly",
    "appendFsync",
    "maxmemoryPolicy",
    "aofWriteStatus",
    "aofRewriteStatus",
    "persistenceRestartTest",
    "publisherOutageFailureTest",
    "queuedWorkRecoveryTest",
    "loadTest",
  ]);
  const loadJobCount = evidence === null
    ? null
    : parseAcceptedLoadTest(evidence.loadTest);
  if (
    evidence === null ||
    typeof expectedCommitSha !== "string" ||
    !commitPattern.test(expectedCommitSha) ||
    typeof expectedArtifactDigest !== "string" ||
    !digestPattern.test(expectedArtifactDigest) ||
    evidence.schemaVersion !== 1 ||
    evidence.policyVersion !== redisDurabilityAcceptancePolicyVersion ||
    evidence.environment !== "staging" ||
    evidence.provider !== "railway" ||
    typeof evidence.commitSha !== "string" ||
    !commitPattern.test(evidence.commitSha) ||
    typeof evidence.artifactDigest !== "string" ||
    !digestPattern.test(evidence.artifactDigest) ||
    evidence.commitSha !== expectedCommitSha ||
    evidence.artifactDigest !== expectedArtifactDigest ||
    !isCanonicalTimestamp(evidence.verifiedAt) ||
    !isCanonicalTimestamp(evidence.expiresAt) ||
    typeof evidence.redisVersion !== "string" ||
    !redisVersionPattern.test(evidence.redisVersion) ||
    evidence.appendOnly !== true ||
    evidence.appendFsync !== "everysec" ||
    evidence.maxmemoryPolicy !== "noeviction" ||
    evidence.aofWriteStatus !== "ok" ||
    evidence.aofRewriteStatus !== "ok" ||
    evidence.persistenceRestartTest !== "passed" ||
    evidence.publisherOutageFailureTest !== "passed" ||
    evidence.queuedWorkRecoveryTest !== "passed" ||
    loadJobCount === null ||
    !isCanonicalTimestamp(checkedAt)
  ) {
    return Object.freeze({ outcome: "rejected" });
  }

  const age = Date.parse(evidence.expiresAt) -
    Date.parse(evidence.verifiedAt);
  const checkedAtMilliseconds = Date.parse(checkedAt);
  if (
    age <= 0 ||
    age > redisDurabilityAcceptanceMaximumAgeMilliseconds ||
    checkedAtMilliseconds < Date.parse(evidence.verifiedAt) ||
    checkedAtMilliseconds >= Date.parse(evidence.expiresAt)
  ) {
    return Object.freeze({ outcome: "rejected" });
  }

  return Object.freeze({
    outcome: "accepted",
    commitSha: evidence.commitSha,
    artifactDigest: evidence.artifactDigest,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    loadJobCount,
  });
}
