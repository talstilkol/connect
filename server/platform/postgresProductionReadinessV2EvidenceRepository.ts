import {
  inspectProductionReadinessV2Candidate,
  inspectProductionReadinessV2ReleaseIdentity,
  type ProductionReadinessV2Candidate,
  type ProductionReadinessV2ReleaseIdentity,
} from "../operations/productionReadinessV2Candidate.ts";
import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../../shared/domain/productionReadinessRegistryV2.ts";
import type {
  ProductionReadinessV2Definition,
} from "../../shared/domain/productionReadinessV2.ts";
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
  "connect-postgres-production-readiness-v2-evidence-repository-v1" as const;

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
  candidate.valid_until AS "validUntil"
`;

export const postgresProductionReadinessV2EvidenceSql = Object.freeze({
  initialize: `
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
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10::timestamptz, $10::timestamptz
    )
    ON CONFLICT (environment, release_id) DO NOTHING
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
    LIMIT 1
  `,
  stageCandidate: `
    INSERT INTO production_readiness_release_candidates_v2 (
      environment,
      release_id,
      candidate_digest,
      evidence_set_json,
      valid_until,
      staged_at
    ) VALUES (
      $1, $2, $3, $4, $5::timestamptz, $6::timestamptz
    )
    ON CONFLICT (environment, release_id, candidate_digest) DO NOTHING
    RETURNING candidate_digest AS "candidateDigest"
  `,
  readCandidate: `
    SELECT ${joinedCandidateColumns}
    FROM production_readiness_release_candidates_v2 AS candidate
    INNER JOIN production_readiness_release_heads_v2 AS head
      ON head.environment = candidate.environment
      AND head.release_id = candidate.release_id
    WHERE candidate.environment = $1
      AND candidate.release_id = $2
      AND candidate.candidate_digest = $3
    LIMIT 1
  `,
  activateCandidate: `
    WITH activated AS (
      UPDATE production_readiness_release_heads_v2 AS head
      SET
        active_version = head.active_version + 1,
        active_candidate_digest = $12,
        updated_at = $13::timestamptz
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
            AND candidate.candidate_digest = $12
            AND candidate.valid_until > $13::timestamptz
        )
      RETURNING head.active_version
    ), recorded AS (
      INSERT INTO production_readiness_release_activation_events_v2 (
        environment,
        release_id,
        active_version,
        previous_candidate_digest,
        activated_candidate_digest,
        activated_at
      )
      SELECT
        $1,
        $2,
        activated.active_version,
        $11,
        $12,
        $13::timestamptz
      FROM activated
      RETURNING active_version AS "activeVersion"
    )
    SELECT "activeVersion" FROM recorded
  `,
  readActive: `
    SELECT
      ${joinedCandidateColumns},
      head.active_version AS "activeVersion"
    FROM production_readiness_release_heads_v2 AS head
    INNER JOIN production_readiness_release_candidates_v2 AS candidate
      ON candidate.environment = head.environment
      AND candidate.release_id = head.release_id
      AND candidate.candidate_digest = head.active_candidate_digest
    INNER JOIN production_readiness_release_activation_events_v2 AS event
      ON event.environment = head.environment
      AND event.release_id = head.release_id
      AND event.active_version = head.active_version
      AND event.activated_candidate_digest = head.active_candidate_digest
    WHERE head.environment = $1
      AND head.release_id = $2
      AND head.active_version > 0
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

interface ProductionReadinessV2RepositoryClock {
  readonly now: () => Date;
}

function canonicalNow(clock: Readonly<ProductionReadinessV2RepositoryClock>) {
  const value = clock.now();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("production readiness v2 clock is invalid");
  }
  return value.toISOString();
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
  registry: readonly ProductionReadinessV2Definition[],
) {
  return inspectProductionReadinessV2ReleaseIdentity({
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
  }, registry);
}

function parseHeadRow(
  value: unknown,
  registry: readonly ProductionReadinessV2Definition[],
): Readonly<ProductionReadinessV2HeadState> {
  const row = requireExactPostgresRow(value, headRowKeys);
  const identity = identityFromRow(row, registry);
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
  registry: readonly ProductionReadinessV2Definition[],
  clock: Readonly<ProductionReadinessV2RepositoryClock>,
): Readonly<ProductionReadinessV2Candidate> {
  const row = requireExactPostgresRow(value, candidateRowKeys);
  return inspectProductionReadinessV2Candidate({
    identity: identityFromRow(row, registry),
    candidateDigest: row.candidateDigest,
    evidenceSetJson: row.evidenceSetJson,
    validUntil: parsePostgresTimestamp(row.validUntil),
  }, registry, clock);
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
  registry: readonly ProductionReadinessV2Definition[],
  clock: Readonly<ProductionReadinessV2RepositoryClock>,
) {
  const result = await transaction.query(
    postgresProductionReadinessV2EvidenceSql.readCandidate,
    [identity.environment, identity.releaseId, digest],
  );
  const rows = requirePostgresRows(result, 1);
  if (rows.length !== 1) {
    throw new Error("production readiness v2 candidate is unavailable");
  }
  return parseCandidateRow(rows[0], registry, clock);
}

export function createPostgresProductionReadinessV2EvidenceRepository(
  transactions: PostgresTransactionManager,
  rawIdentity: Readonly<ProductionReadinessV2ReleaseIdentity>,
  clock: Readonly<ProductionReadinessV2RepositoryClock>,
  registry: readonly ProductionReadinessV2Definition[] =
    PRODUCTION_READINESS_REGISTRY_V2,
): PostgresProductionReadinessV2EvidenceRepository {
  if (
    !transactions || typeof transactions.transaction !== "function" ||
    !clock || typeof clock.now !== "function"
  ) {
    throw new Error("production readiness v2 repository dependencies invalid");
  }
  const identity = inspectProductionReadinessV2ReleaseIdentity(
    rawIdentity,
    registry,
  );
  const parameters = identityParameters(identity);

  return Object.freeze({
    identity,

    async initializeRelease() {
      const initializedAt = canonicalNow(clock);
      return transactions.transaction(
        { isolationLevel: "repeatable-read" },
        async (transaction) => {
          requirePostgresRows(await transaction.query(
            postgresProductionReadinessV2EvidenceSql.initialize,
            [...parameters, initializedAt],
          ), 1);
          const rows = requirePostgresRows(await transaction.query(
            postgresProductionReadinessV2EvidenceSql.readHead,
            [identity.environment, identity.releaseId],
          ), 1);
          if (rows.length !== 1) {
            throw new Error("production readiness v2 release not initialized");
          }
          const head = parseHeadRow(rows[0], registry);
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
      const stagedAt = canonicalNow(clock);
      const candidate = inspectProductionReadinessV2Candidate(
        rawCandidate,
        registry,
        fixedClock(stagedAt),
      );
      if (!sameIdentity(candidate.identity, identity)) {
        throw new Error("production readiness v2 candidate identity conflict");
      }
      return transactions.transaction(
        { isolationLevel: "repeatable-read" },
        async (transaction) => {
          const inserted = requirePostgresRows(await transaction.query(
            postgresProductionReadinessV2EvidenceSql.stageCandidate,
            [
              identity.environment,
              identity.releaseId,
              candidate.candidateDigest,
              candidate.evidenceSetJson,
              candidate.validUntil,
              stagedAt,
            ],
          ), 1);
          const persisted = await readOneCandidate(
            transaction,
            identity,
            candidate.candidateDigest,
            registry,
            fixedClock(stagedAt),
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
      const readAt = canonicalNow(clock);
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        (transaction) => readOneCandidate(
          transaction,
          identity,
          digest,
          registry,
          fixedClock(readAt),
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
      const activatedAt = canonicalNow(clock);
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const candidate = await readOneCandidate(
            transaction,
            identity,
            digest,
            registry,
            fixedClock(activatedAt),
          );
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
              activatedAt,
            ],
          ), 1);
          if (rows.length === 0) {
            return Object.freeze({
              status: "conflict" as const,
              activeVersion: null,
              candidateDigest: null,
            });
          }
          const row = requireExactPostgresRow(rows[0], ["activeVersion"]);
          const activeVersion = parsePostgresNonnegativeInteger(
            row.activeVersion,
          );
          if (activeVersion !== input.expectedActiveVersion + 1) {
            throw new Error("PostgreSQL returned invalid activation version");
          }
          return Object.freeze({
            status: "activated" as const,
            activeVersion,
            candidateDigest: digest,
          });
        },
      );
    },

    async readActive() {
      const readAt = canonicalNow(clock);
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const result = await transaction.query(
            postgresProductionReadinessV2EvidenceSql.readActive,
            [identity.environment, identity.releaseId],
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
                registry,
                fixedClock(readAt),
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
