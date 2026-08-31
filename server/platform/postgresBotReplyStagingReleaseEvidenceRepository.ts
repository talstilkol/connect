import {
  inspectRailwayBotReplyStagingCrossServiceEvidence,
  type RailwayBotReplyStagingCrossServiceEvidenceClock,
} from "./railwayBotReplyStagingCrossServiceEvidence.ts";
import type {
  RailwayBotReplyStagingReleaseEvidencePublisherDependencies,
  RailwayBotReplyStagingReleaseEvidenceState,
  RailwayBotReplyStagingReleaseEvidenceWrite,
  RailwayBotReplyStagingReleaseEvidenceWriteResult,
} from "./railwayBotReplyStagingReleaseEvidencePublisher.ts";
import type {
  RailwayBotReplyStagingReleaseIdentity,
} from "./railwayBotReplyStagingReleaseEvidenceIssuer.ts";
import {
  parsePostgresNonnegativeInteger,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

export const postgresBotReplyStagingReleaseEvidenceRepositoryVersion =
  "connect-postgres-bot-reply-staging-release-evidence-repository-v1" as const;

const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v1_[a-f0-9]{64}$/;
const maximumVersion = 2_147_483_647;
const rowKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "evidenceDigest",
  "evidenceJson",
  "releaseId",
  "version",
]);
const releaseKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "releaseId",
]);
const writeKeys = Object.freeze([
  "expectedEvidenceDigest",
  "expectedRelease",
  "expectedVersion",
  "nextEvidenceDigest",
  "nextEvidenceJson",
]);

const columns = `
  release_id AS "releaseId",
  commit_sha AS "commitSha",
  artifact_digest AS "artifactDigest",
  evidence_version AS "version",
  evidence_digest AS "evidenceDigest",
  evidence_json AS "evidenceJson"
`;

export const postgresBotReplyStagingReleaseEvidenceSql = Object.freeze({
  initialize: `
    INSERT INTO bot_reply_staging_release_evidence (
      release_id,
      commit_sha,
      artifact_digest,
      initialized_at,
      updated_at
    ) VALUES ($1, $2, $3, $4::timestamptz, $4::timestamptz)
    ON CONFLICT DO NOTHING
    RETURNING ${columns}
  `,
  read: `
    SELECT ${columns}
    FROM bot_reply_staging_release_evidence
    WHERE release_id = $1
    LIMIT 1
  `,
  compareAndSet: `
    UPDATE bot_reply_staging_release_evidence
    SET
      evidence_version = evidence_version + 1,
      evidence_digest = $6,
      evidence_json = $7,
      verified_at = $8::timestamptz,
      expires_at = $9::timestamptz,
      updated_at = GREATEST(updated_at, $8::timestamptz)
    WHERE release_id = $1
      AND commit_sha = $2
      AND artifact_digest = $3
      AND evidence_version = $4
      AND evidence_version < 2147483647
      AND evidence_digest IS NOT DISTINCT FROM $5
    RETURNING evidence_version AS "version"
  `,
});

export interface PostgresBotReplyStagingReleaseEvidenceRepository
  extends RailwayBotReplyStagingReleaseEvidencePublisherDependencies {
  initialize(initializedAt: string): Promise<
    Readonly<RailwayBotReplyStagingReleaseEvidenceState>
  >;
  readCurrentEvidenceStateOrInitial(): Promise<
    Readonly<RailwayBotReplyStagingReleaseEvidenceState>
  >;
}

function exactKeys(
  value: unknown,
  expected: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function requirePattern(value: unknown, pattern: RegExp, label: string) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function requireRelease(
  value: unknown,
): Readonly<RailwayBotReplyStagingReleaseIdentity> {
  if (!exactKeys(value, releaseKeys)) {
    throw new Error("release identity is invalid");
  }
  return Object.freeze({
    releaseId: requirePattern(value.releaseId, releaseIdPattern, "releaseId"),
    commitSha: requirePattern(value.commitSha, commitShaPattern, "commitSha"),
    artifactDigest: requirePattern(
      value.artifactDigest,
      artifactDigestPattern,
      "artifactDigest",
    ),
  });
}

function requireCanonicalTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length > 40) {
    throw new Error(`${label} is invalid`);
  }
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function sameRelease(
  left: Readonly<RailwayBotReplyStagingReleaseIdentity>,
  right: Readonly<RailwayBotReplyStagingReleaseIdentity>,
) {
  return left.releaseId === right.releaseId &&
    left.commitSha === right.commitSha &&
    left.artifactDigest === right.artifactDigest;
}

function parseRow(
  value: unknown,
): Readonly<RailwayBotReplyStagingReleaseEvidenceState> {
  const row = requireExactPostgresRow(value, rowKeys);
  const release = requireRelease({
    releaseId: row.releaseId,
    commitSha: row.commitSha,
    artifactDigest: row.artifactDigest,
  });
  const version = parsePostgresNonnegativeInteger(row.version);
  const evidenceDigest = row.evidenceDigest === null
    ? null
    : requirePattern(
        row.evidenceDigest,
        evidenceDigestPattern,
        "evidenceDigest",
      );
  const evidenceJson = row.evidenceJson;
  if (
    version > maximumVersion ||
    !(evidenceJson === null || typeof evidenceJson === "string") ||
    (evidenceDigest === null) !== (evidenceJson === null) ||
    (version === 0) !== (evidenceJson === null)
  ) {
    throw new Error("PostgreSQL returned inconsistent release evidence");
  }
  return Object.freeze({ release, version, evidenceDigest, evidenceJson });
}

function parseEvidence(
  write: Readonly<RailwayBotReplyStagingReleaseEvidenceWrite>,
) {
  if (!exactKeys(write, writeKeys)) {
    throw new Error("release evidence write is invalid");
  }
  const release = requireRelease(write.expectedRelease);
  if (
    !Number.isSafeInteger(write.expectedVersion) ||
    write.expectedVersion < 0 || write.expectedVersion >= maximumVersion ||
    !(write.expectedEvidenceDigest === null ||
      typeof write.expectedEvidenceDigest === "string" &&
      evidenceDigestPattern.test(write.expectedEvidenceDigest)) ||
    typeof write.nextEvidenceJson !== "string" ||
    Buffer.byteLength(write.nextEvidenceJson, "utf8") > 8_192 ||
    !evidenceDigestPattern.test(write.nextEvidenceDigest)
  ) {
    throw new Error("release evidence write is invalid");
  }
  let evidence: unknown;
  try {
    evidence = JSON.parse(write.nextEvidenceJson);
  } catch {
    throw new Error("release evidence write is invalid");
  }
  if (!exactKeys(evidence, [
    "activationVersion",
    "artifactDigest",
    "checkCount",
    "checks",
    "commitSha",
    "environment",
    "evidenceDigest",
    "expiresAt",
    "policyVersion",
    "releaseId",
    "schemaVersion",
    "source",
    "verifiedAt",
  ])) {
    throw new Error("release evidence write is invalid");
  }
  const verifiedAt = requireCanonicalTimestamp(evidence.verifiedAt, "verifiedAt");
  const expiresAt = requireCanonicalTimestamp(evidence.expiresAt, "expiresAt");
  const report = inspectRailwayBotReplyStagingCrossServiceEvidence({
    APP_RELEASE_ID: release.releaseId,
    APP_DEPLOYED_COMMIT_SHA: release.commitSha,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: release.artifactDigest,
    BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON: write.nextEvidenceJson,
  }, new Date(verifiedAt));
  if (
    report.status !== "configured" ||
    evidence.evidenceDigest !== write.nextEvidenceDigest ||
    report.expiresAt !== expiresAt
  ) {
    throw new Error("release evidence write is invalid");
  }
  return Object.freeze({ release, verifiedAt, expiresAt });
}

export function createPostgresBotReplyStagingReleaseEvidenceRepository(
  transactions: PostgresTransactionManager,
  rawRelease: Readonly<RailwayBotReplyStagingReleaseIdentity>,
  clock: Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>,
): PostgresBotReplyStagingReleaseEvidenceRepository {
  if (!transactions || typeof transactions.transaction !== "function") {
    throw new Error("PostgreSQL release evidence transactions are invalid");
  }
  const release = requireRelease(rawRelease);
  if (!clock || typeof clock.now !== "function") {
    throw new Error("PostgreSQL release evidence clock is invalid");
  }

  async function readEvidenceState(allowInitialState: boolean) {
    return transactions.transaction(
      { isolationLevel: "read-committed" },
      async (transaction) => {
        const rows = requirePostgresRows(
          await transaction.query<unknown>(
            postgresBotReplyStagingReleaseEvidenceSql.read,
            [release.releaseId],
          ),
          1,
        );
        if (rows.length === 0 && allowInitialState) {
          return Object.freeze({
            release,
            version: 0,
            evidenceDigest: null,
            evidenceJson: null,
          });
        }
        if (rows.length !== 1) {
          throw new Error("PostgreSQL release evidence is not initialized");
        }
        const state = parseRow(rows[0]);
        if (!sameRelease(state.release, release)) {
          throw new Error("PostgreSQL release evidence identity conflicts");
        }
        return state;
      },
    );
  }

  async function readCurrentEvidenceState() {
    return readEvidenceState(false);
  }

  return Object.freeze({
    clock,

    async initialize(rawInitializedAt: string) {
      const initializedAt = requireCanonicalTimestamp(
        rawInitializedAt,
        "initializedAt",
      );
      await transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const rows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyStagingReleaseEvidenceSql.initialize,
              [
                release.releaseId,
                release.commitSha,
                release.artifactDigest,
                initializedAt,
              ],
            ),
            1,
          );
          if (rows.length === 1) {
            const inserted = parseRow(rows[0]);
            if (!sameRelease(inserted.release, release)) {
              throw new Error("PostgreSQL initialized conflicting release evidence");
            }
          }
        },
      );
      return readCurrentEvidenceState();
    },

    readCurrentEvidenceState,

    async readCurrentEvidenceStateOrInitial() {
      return readEvidenceState(true);
    },

    async compareAndSetEvidence(
      rawWrite: Readonly<RailwayBotReplyStagingReleaseEvidenceWrite>,
    ) {
      const parsed = parseEvidence(rawWrite);
      if (!sameRelease(parsed.release, release)) {
        throw new Error("release evidence write identity conflicts");
      }
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction): Promise<
          RailwayBotReplyStagingReleaseEvidenceWriteResult
        > => {
          const rows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyStagingReleaseEvidenceSql.compareAndSet,
              [
                release.releaseId,
                release.commitSha,
                release.artifactDigest,
                rawWrite.expectedVersion,
                rawWrite.expectedEvidenceDigest,
                rawWrite.nextEvidenceDigest,
                rawWrite.nextEvidenceJson,
                parsed.verifiedAt,
                parsed.expiresAt,
              ],
            ),
            1,
          );
          if (rows.length === 0) {
            return Object.freeze({ status: "conflict" as const, version: null });
          }
          const row = requireExactPostgresRow(rows[0], ["version"]);
          const version = parsePostgresNonnegativeInteger(row.version);
          if (version !== rawWrite.expectedVersion + 1) {
            throw new Error("PostgreSQL advanced an invalid evidence version");
          }
          return Object.freeze({ status: "stored" as const, version });
        },
      );
    },
  });
}
