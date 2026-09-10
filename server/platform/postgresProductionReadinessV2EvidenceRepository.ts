import {
  inspectProductionReadinessV2Candidate,
  inspectProductionReadinessV2ReleaseIdentity,
  ProductionReadinessV2CandidateError,
  type ProductionReadinessV2Candidate,
  type ProductionReadinessV2ReleaseIdentity,
} from "../operations/productionReadinessV2Candidate.ts";
import {
  parsePostgresNonnegativeInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

export const postgresProductionReadinessV2EvidenceRepositoryVersion =
  "connect-postgres-production-readiness-v2-evidence-repository-v2" as const;

const maximumVersion = 2_147_483_647;
const candidateDigestPattern =
  /^production_readiness_candidate_v2_[a-f0-9]{64}$/;
const headRowKeys = Object.freeze([
  "activeCandidateDigest",
  "activeVersion",
  "commitSha",
  "environment",
  "railwayApiArtifactDigest",
  "railwayWorkerArtifactDigest",
  "registryDigest",
  "registryVersion",
  "releaseId",
  "releaseManifestDigest",
  "vercelWebArtifactDigest",
]);
const candidateRowKeys = Object.freeze([
  "candidateDigest",
  "commitSha",
  "databaseNow",
  "environment",
  "evidenceSetJson",
  "railwayApiArtifactDigest",
  "railwayWorkerArtifactDigest",
  "registryDigest",
  "registryVersion",
  "releaseId",
  "releaseManifestDigest",
  "validUntil",
  "vercelWebArtifactDigest",
]);

const identityColumns = `
  environment,
  release_id AS "releaseId",
  commit_sha AS "commitSha",
  registry_version AS "registryVersion",
  registry_digest AS "registryDigest",
  release_manifest_digest AS "releaseManifestDigest",
  railway_api_artifact_digest AS "railwayApiArtifactDigest",
  railway_worker_artifact_digest AS "railwayWorkerArtifactDigest",
  vercel_web_artifact_digest AS "vercelWebArtifactDigest"
`;
const joinedCandidateColumns = `
  head.environment,
  head.release_id AS "releaseId",
  head.commit_sha AS "commitSha",
  head.registry_version AS "registryVersion",
  head.registry_digest AS "registryDigest",
  head.release_manifest_digest AS "releaseManifestDigest",
  head.railway_api_artifact_digest AS "railwayApiArtifactDigest",
  head.railway_worker_artifact_digest AS "railwayWorkerArtifactDigest",
  head.vercel_web_artifact_digest AS "vercelWebArtifactDigest",
  candidate.candidate_digest AS "candidateDigest",
  candidate.evidence_set_json AS "evidenceSetJson",
  candidate.valid_until AS "validUntil",
  date_trunc('milliseconds', clock_timestamp()) AS "databaseNow"
`;

export const postgresProductionReadinessV2EvidenceSql = Object.freeze({
  initialize: `
    WITH database_clock AS (
      SELECT date_trunc(
        'milliseconds',
        clock_timestamp()
      ) AS initialized_at
    )
    INSERT INTO production_readiness_release_heads_v2 (
      environment,
      release_id,
      commit_sha,
      registry_version,
      registry_digest,
      release_manifest_digest,
      railway_api_artifact_digest,
      railway_worker_artifact_digest,
      vercel_web_artifact_digest,
      initialized_at,
      updated_at
    )
    SELECT
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      database_clock.initialized_at,
      database_clock.initialized_at
    FROM database_clock
    ON CONFLICT (
      environment,
      release_id,
      release_manifest_digest
    ) DO NOTHING
    RETURNING release_id AS "releaseId"
  `,
  readHead: `
    SELECT
      ${identityColumns},
      active_version AS "activeVersion",
      active_candidate_digest AS "activeCandidateDigest"
    FROM production_readiness_release_heads_v2
    WHERE environment = $1
      AND release_id = $2
      AND release_manifest_digest = $3
    LIMIT 1
  `,
  readDatabaseNow: `
    SELECT date_trunc(
      'milliseconds',
      clock_timestamp()
    ) AS "databaseNow"
  `,
  stageCandidate: `
    WITH database_clock AS (
      SELECT date_trunc(
        'milliseconds',
        clock_timestamp()
      ) AS staged_at
    )
    INSERT INTO production_readiness_release_candidates_v2 (
      environment,
      release_id,
      release_manifest_digest,
      candidate_digest,
      evidence_set_json,
      valid_until,
      staged_at
    )
    SELECT
      $1, $2, $3, $4, $5, $6::timestamptz,
      database_clock.staged_at
    FROM database_clock
    ON CONFLICT (
      environment,
      release_id,
      release_manifest_digest,
      candidate_digest
    ) DO NOTHING
    RETURNING
      candidate_digest AS "candidateDigest",
      staged_at AS "stagedAt"
  `,
  readCandidate: `
    SELECT ${joinedCandidateColumns}
    FROM production_readiness_release_candidates_v2 AS candidate
    INNER JOIN production_readiness_release_heads_v2 AS head
      ON head.environment = candidate.environment
      AND head.release_id = candidate.release_id
      AND head.release_manifest_digest =
        candidate.release_manifest_digest
    WHERE candidate.environment = $1
      AND candidate.release_id = $2
      AND candidate.release_manifest_digest = $3
      AND candidate.candidate_digest = $4
    LIMIT 1
  `,
  lockHeadForActivation: `
    SELECT
      active_version AS "activeVersion",
      active_candidate_digest AS "activeCandidateDigest"
    FROM production_readiness_release_heads_v2
    WHERE environment = $1
      AND release_id = $2
      AND commit_sha = $3
      AND registry_version = $4
      AND registry_digest = $5
      AND release_manifest_digest = $6
      AND railway_api_artifact_digest = $7
      AND railway_worker_artifact_digest = $8
      AND vercel_web_artifact_digest = $9
    FOR UPDATE
  `,
  activateCandidate: `
    WITH activation_clock AS (
      SELECT date_trunc(
        'milliseconds',
        clock_timestamp()
      ) AS database_now
    ), activated AS (
      UPDATE production_readiness_release_heads_v2 AS head
      SET
        active_version = head.active_version + 1,
        active_candidate_digest = $12,
        updated_at = GREATEST(
          head.updated_at,
          activation_clock.database_now
        )
      FROM activation_clock
      WHERE head.environment = $1
        AND head.release_id = $2
        AND head.commit_sha = $3
        AND head.registry_version = $4
        AND head.registry_digest = $5
        AND head.release_manifest_digest = $6
        AND head.railway_api_artifact_digest = $7
        AND head.railway_worker_artifact_digest = $8
        AND head.vercel_web_artifact_digest = $9
        AND head.active_version = $10
        AND head.active_version < 2147483647
        AND head.active_candidate_digest IS NOT DISTINCT FROM $11
        AND EXISTS (
          SELECT 1
          FROM production_readiness_release_candidates_v2 AS candidate
          WHERE candidate.environment = head.environment
            AND candidate.release_id = head.release_id
            AND candidate.release_manifest_digest =
              head.release_manifest_digest
            AND candidate.candidate_digest = $12
            AND candidate.valid_until > GREATEST(
              head.updated_at,
              activation_clock.database_now
            )
        )
      RETURNING
        head.active_version,
        head.updated_at AS activated_at
    ), recorded AS (
      INSERT INTO production_readiness_release_activation_events_v2 (
        environment,
        release_id,
        release_manifest_digest,
        active_version,
        previous_candidate_digest,
        activated_candidate_digest,
        activated_at
      )
      SELECT
        $1,
        $2,
        $6,
        activated.active_version,
        $11,
        $12,
        activated.activated_at
      FROM activated
      RETURNING
        active_version AS "activeVersion",
        activated_at AS "activatedAt"
    )
    SELECT "activeVersion", "activatedAt" FROM recorded
  `,
  readActive: `
    SELECT
      ${joinedCandidateColumns},
      head.active_version AS "activeVersion"
    FROM production_readiness_release_heads_v2 AS head
    INNER JOIN production_readiness_release_candidates_v2 AS candidate
      ON candidate.environment = head.environment
      AND candidate.release_id = head.release_id
      AND candidate.release_manifest_digest =
        head.release_manifest_digest
      AND candidate.candidate_digest = head.active_candidate_digest
    INNER JOIN production_readiness_release_activation_events_v2 AS event
      ON event.environment = head.environment
      AND event.release_id = head.release_id
      AND event.release_manifest_digest =
        head.release_manifest_digest
      AND event.active_version = head.active_version
      AND event.activated_candidate_digest = head.active_candidate_digest
    WHERE head.environment = $1
      AND head.release_id = $2
      AND head.release_manifest_digest = $3
      AND head.active_version > 0
      AND candidate.valid_until > date_trunc(
        'milliseconds',
        clock_timestamp()
      )
    LIMIT 1
  `,
});

export interface ProductionReadinessV2HeadState {
  readonly identity: Readonly<ProductionReadinessV2ReleaseIdentity>;
  readonly activeVersion: number;
  readonly activeCandidateDigest: string | null;
}

export type ProductionReadinessV2StageResult = Readonly<{
  status: "stored";
  replayed: boolean;
  candidateDigest: string;
}>;

export type ProductionReadinessV2ActivationResult = Readonly<
  | {
      status: "activated";
      activeVersion: number;
      candidateDigest: string;
    }
  | {
      status: "conflict";
      activeVersion: null;
      candidateDigest: null;
    }
>;

export type ProductionReadinessV2ActiveReadResult = Readonly<
  | {
      status: "available";
      activeVersion: number;
      candidate: Readonly<ProductionReadinessV2Candidate>;
    }
  | {
      status: "unavailable";
      activeVersion: null;
      candidate: null;
    }
>;

export interface ProductionReadinessV2ConfirmationInput {
  readonly expectedActiveVersion: number;
  readonly expectedActiveCandidateDigest: string | null;
  readonly candidateDigest: string;
}

export interface PostgresProductionReadinessV2EvidenceRepository {
  readonly identity: Readonly<ProductionReadinessV2ReleaseIdentity>;
  initializeRelease(): Promise<Readonly<ProductionReadinessV2HeadState>>;
  stageCandidate(
    candidate: Readonly<ProductionReadinessV2Candidate>,
  ): Promise<ProductionReadinessV2StageResult>;
  readCandidate(candidateDigest: string): Promise<
    Readonly<ProductionReadinessV2Candidate>
  >;
  confirmCandidate(
    input: Readonly<ProductionReadinessV2ConfirmationInput>,
  ): Promise<ProductionReadinessV2ActivationResult>;
  readActive(): Promise<ProductionReadinessV2ActiveReadResult>;
}

function fixedClock(timestamp: string) {
  return Object.freeze({ now: () => new Date(timestamp) });
}

function sameIdentity(
  left: Readonly<ProductionReadinessV2ReleaseIdentity>,
  right: Readonly<ProductionReadinessV2ReleaseIdentity>,
) {
  return left.environment === right.environment &&
    left.releaseId === right.releaseId &&
    left.commitSha === right.commitSha &&
    left.registryVersion === right.registryVersion &&
    left.registryDigest === right.registryDigest &&
    left.releaseManifestDigest === right.releaseManifestDigest &&
    left.serviceArtifactDigests["railway-api"] ===
      right.serviceArtifactDigests["railway-api"] &&
    left.serviceArtifactDigests["railway-worker"] ===
      right.serviceArtifactDigests["railway-worker"] &&
    left.serviceArtifactDigests["vercel-web"] ===
      right.serviceArtifactDigests["vercel-web"];
}

function identityParameters(
  identity: Readonly<ProductionReadinessV2ReleaseIdentity>,
) {
  return [
    identity.environment,
    identity.releaseId,
    identity.commitSha,
    identity.registryVersion,
    identity.registryDigest,
    identity.releaseManifestDigest,
    identity.serviceArtifactDigests["railway-api"],
    identity.serviceArtifactDigests["railway-worker"],
    identity.serviceArtifactDigests["vercel-web"],
  ] as const;
}

function identityFromRow(
  row: Readonly<Record<string, unknown>>,
) {
  const value = {
    environment: row.environment,
    releaseId: row.releaseId,
    commitSha: row.commitSha,
    registryVersion: row.registryVersion,
    registryDigest: row.registryDigest,
    releaseManifestDigest: row.releaseManifestDigest,
    serviceArtifactDigests: {
      "railway-api": row.railwayApiArtifactDigest,
      "railway-worker": row.railwayWorkerArtifactDigest,
      "vercel-web": row.vercelWebArtifactDigest,
    },
  };
  return inspectProductionReadinessV2ReleaseIdentity(value);
}

function parseHeadRow(
  value: unknown,
): Readonly<ProductionReadinessV2HeadState> {
  const row = requireExactPostgresRow(value, headRowKeys);
  const identity = identityFromRow(row);
  const activeVersion = parsePostgresNonnegativeInteger(row.activeVersion);
  const activeCandidateDigest = row.activeCandidateDigest;
  if (
    activeVersion > maximumVersion ||
    !(activeCandidateDigest === null ||
      typeof activeCandidateDigest === "string" &&
      candidateDigestPattern.test(activeCandidateDigest)) ||
    (activeVersion === 0) !== (activeCandidateDigest === null)
  ) {
    throw new Error("PostgreSQL returned invalid readiness head state");
  }
  return Object.freeze({ identity, activeVersion, activeCandidateDigest });
}

function parseCandidateRow(
  value: unknown,
): Readonly<ProductionReadinessV2Candidate> {
  const row = requireExactPostgresRow(value, candidateRowKeys);
  const databaseNow = parsePostgresTimestamp(row.databaseNow);
  return inspectProductionReadinessV2Candidate({
    identity: identityFromRow(row),
    candidateDigest: row.candidateDigest,
    evidenceSetJson: row.evidenceSetJson,
    validUntil: parsePostgresTimestamp(row.validUntil),
  }, fixedClock(databaseNow));
}

function requireCandidateDigest(value: unknown): string {
  if (typeof value !== "string" || !candidateDigestPattern.test(value)) {
    throw new Error("production readiness v2 candidate digest is invalid");
  }
  return value;
}

async function readOneCandidate(
  transaction: PostgresTransaction,
  identity: Readonly<ProductionReadinessV2ReleaseIdentity>,
  digest: string,
) {
  const result = await transaction.query(
    postgresProductionReadinessV2EvidenceSql.readCandidate,
    [
      identity.environment,
      identity.releaseId,
      identity.releaseManifestDigest,
      digest,
    ],
  );
  const rows = requirePostgresRows(result, 1);
  if (rows.length !== 1) {
    throw new Error("production readiness v2 candidate is unavailable");
  }
  return parseCandidateRow(rows[0]);
}

async function readDatabaseNow(transaction: PostgresTransaction) {
  const rows = requirePostgresRows(await transaction.query(
    postgresProductionReadinessV2EvidenceSql.readDatabaseNow,
    [],
  ), 1);
  if (rows.length !== 1) {
    throw new Error("PostgreSQL did not return its readiness clock");
  }
  const row = requireExactPostgresRow(rows[0], ["databaseNow"]);
  return parsePostgresTimestamp(row.databaseNow);
}

export function createPostgresProductionReadinessV2EvidenceRepository(
  transactions: PostgresTransactionManager,
  rawIdentity: Readonly<ProductionReadinessV2ReleaseIdentity>,
): PostgresProductionReadinessV2EvidenceRepository {
  if (
    !transactions || typeof transactions.transaction !== "function"
  ) {
    throw new Error("production readiness v2 repository dependencies invalid");
  }
  const identity = inspectProductionReadinessV2ReleaseIdentity(rawIdentity);
  const parameters = identityParameters(identity);

  return Object.freeze({
    identity,

    async initializeRelease() {
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          requirePostgresRows(await transaction.query(
            postgresProductionReadinessV2EvidenceSql.initialize,
            parameters,
          ), 1);
          const rows = requirePostgresRows(await transaction.query(
            postgresProductionReadinessV2EvidenceSql.readHead,
            [
              identity.environment,
              identity.releaseId,
              identity.releaseManifestDigest,
            ],
          ), 1);
          if (rows.length !== 1) {
            throw new Error("production readiness v2 release not initialized");
          }
          const head = parseHeadRow(rows[0]);
          if (!sameIdentity(head.identity, identity)) {
            throw new Error("production readiness v2 release identity conflict");
          }
          return head;
        },
      );
    },

    async stageCandidate(
      rawCandidate: Readonly<ProductionReadinessV2Candidate>,
    ) {
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const databaseNow = await readDatabaseNow(transaction);
          const candidate = inspectProductionReadinessV2Candidate(
            rawCandidate,
            fixedClock(databaseNow),
          );
          if (!sameIdentity(candidate.identity, identity)) {
            throw new Error("production readiness v2 candidate identity conflict");
          }
          const inserted = requirePostgresRows(await transaction.query(
            postgresProductionReadinessV2EvidenceSql.stageCandidate,
            [
              identity.environment,
              identity.releaseId,
              identity.releaseManifestDigest,
              candidate.candidateDigest,
              candidate.evidenceSetJson,
              candidate.validUntil,
            ],
          ), 1);
          if (inserted.length === 1) {
            const insertedRow = requireExactPostgresRow(inserted[0], [
              "candidateDigest",
              "stagedAt",
            ]);
            if (
              requireCandidateDigest(insertedRow.candidateDigest) !==
                candidate.candidateDigest
            ) {
              throw new Error(
                "PostgreSQL returned a mismatched readiness candidate",
              );
            }
            parsePostgresTimestamp(insertedRow.stagedAt);
          }
          const persisted = await readOneCandidate(
            transaction,
            identity,
            candidate.candidateDigest,
          );
          if (
            persisted.evidenceSetJson !== candidate.evidenceSetJson ||
            persisted.validUntil !== candidate.validUntil
          ) {
            throw new Error("production readiness v2 candidate read-back mismatch");
          }
          return Object.freeze({
            status: "stored" as const,
            replayed: inserted.length === 0,
            candidateDigest: candidate.candidateDigest,
          });
        },
      );
    },

    async readCandidate(rawDigest: string) {
      const digest = requireCandidateDigest(rawDigest);
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        (transaction) => readOneCandidate(
          transaction,
          identity,
          digest,
        ),
      );
    },

    async confirmCandidate(
      input: Readonly<ProductionReadinessV2ConfirmationInput>,
    ) {
      if (
        typeof input !== "object" || input === null || Array.isArray(input) ||
        Object.keys(input).sort().join(",") !==
          "candidateDigest,expectedActiveCandidateDigest,expectedActiveVersion" ||
        !Number.isSafeInteger(input.expectedActiveVersion) ||
        input.expectedActiveVersion < 0 ||
        input.expectedActiveVersion >= maximumVersion ||
        !(input.expectedActiveCandidateDigest === null ||
          typeof input.expectedActiveCandidateDigest === "string" &&
          candidateDigestPattern.test(input.expectedActiveCandidateDigest))
      ) {
        throw new Error("production readiness v2 activation input invalid");
      }
      const digest = requireCandidateDigest(input.candidateDigest);
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const lockedRows = requirePostgresRows(await transaction.query(
            postgresProductionReadinessV2EvidenceSql.lockHeadForActivation,
            parameters,
          ), 1);
          if (lockedRows.length !== 1) {
            throw new Error(
              "production readiness v2 release identity is unavailable",
            );
          }
          const locked = requireExactPostgresRow(lockedRows[0], [
            "activeCandidateDigest",
            "activeVersion",
          ]);
          const lockedVersion = parsePostgresNonnegativeInteger(
            locked.activeVersion,
          );
          const lockedDigest = locked.activeCandidateDigest;
          if (
            lockedVersion !== input.expectedActiveVersion ||
            lockedDigest !== input.expectedActiveCandidateDigest
          ) {
            return Object.freeze({
              status: "conflict" as const,
              activeVersion: null,
              candidateDigest: null,
            });
          }
          let candidate;
          try {
            candidate = await readOneCandidate(
              transaction,
              identity,
              digest,
            );
          } catch (error) {
            if (
              error instanceof ProductionReadinessV2CandidateError &&
              error.code === "not-ready"
            ) {
              return Object.freeze({
                status: "conflict" as const,
                activeVersion: null,
                candidateDigest: null,
              });
            }
            throw error;
          }
          if (!sameIdentity(candidate.identity, identity)) {
            throw new Error("production readiness v2 candidate identity conflict");
          }
          const rows = requirePostgresRows(await transaction.query(
            postgresProductionReadinessV2EvidenceSql.activateCandidate,
            [
              ...parameters,
              input.expectedActiveVersion,
              input.expectedActiveCandidateDigest,
              digest,
            ],
          ), 1);
          if (rows.length === 0) {
            return Object.freeze({
              status: "conflict" as const,
              activeVersion: null,
              candidateDigest: null,
            });
          }
          const row = requireExactPostgresRow(rows[0], [
            "activatedAt",
            "activeVersion",
          ]);
          const activeVersion = parsePostgresNonnegativeInteger(
            row.activeVersion,
          );
          if (activeVersion !== input.expectedActiveVersion + 1) {
            throw new Error("PostgreSQL returned invalid activation version");
          }
          parsePostgresTimestamp(row.activatedAt);
          return Object.freeze({
            status: "activated" as const,
            activeVersion,
            candidateDigest: digest,
          });
        },
      );
    },

    async readActive() {
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const result = await transaction.query(
            postgresProductionReadinessV2EvidenceSql.readActive,
            [
              identity.environment,
              identity.releaseId,
              identity.releaseManifestDigest,
            ],
          );
          const rows = requirePostgresRows(result, 1);
          if (rows.length === 0) {
            return Object.freeze({
              status: "unavailable" as const,
              activeVersion: null,
              candidate: null,
            });
          }
          const raw = requireExactPostgresRow(rows[0], [
            ...candidateRowKeys,
            "activeVersion",
          ]);
          const activeVersion = parsePostgresNonnegativeInteger(
            raw.activeVersion,
          );
          if (activeVersion < 1 || activeVersion > maximumVersion) {
            return Object.freeze({
              status: "unavailable" as const,
              activeVersion: null,
              candidate: null,
            });
          }
          try {
            return Object.freeze({
              status: "available" as const,
              activeVersion,
              candidate: parseCandidateRow(
                Object.fromEntries(
                  candidateRowKeys.map((key) => [key, raw[key]]),
                ),
              ),
            });
          } catch {
            return Object.freeze({
              status: "unavailable" as const,
              activeVersion: null,
              candidate: null,
            });
          }
        },
      );
    },
  });
}
