import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../shared/domain/productionReadinessRegistryV2.ts";
import {
  createProductionReadinessV2Evidence,
  deriveProductionReadinessRegistryV2Digest,
  deriveProductionReadinessV2ReleaseManifestDigest,
} from "../server/operations/productionReadinessV2.ts";
import {
  createPostgresProductionReadinessV2EvidenceRepository,
  postgresProductionReadinessV2EvidenceRepositoryVersion,
  postgresProductionReadinessV2EvidenceSql,
} from "../server/platform/postgresProductionReadinessV2EvidenceRepository.ts";

const now = "2026-08-24T12:00:30.000Z";
const serviceArtifactDigests = Object.freeze({
  "railway-api": `sha256:${"1".repeat(64)}`,
  "railway-worker": `sha256:${"2".repeat(64)}`,
  "vercel-web": `sha256:${"3".repeat(64)}`,
});
const release = Object.freeze({
  environment: "staging",
  releaseId: `connect_release_v1_${"4".repeat(64)}`,
  commitSha: "5".repeat(40),
  serviceArtifactDigests,
});
const identity = Object.freeze({
  ...release,
  registryVersion: 2,
  registryDigest: deriveProductionReadinessRegistryV2Digest(),
  releaseManifestDigest:
    deriveProductionReadinessV2ReleaseManifestDigest(release),
});

const evidence = Object.freeze(
  PRODUCTION_READINESS_REGISTRY_V2.map((definition) => {
    const issuer = definition.allowedIssuer[0];
    return createProductionReadinessV2Evidence({
      checkId: definition.id,
      environment: identity.environment,
      issuer,
      releaseId: identity.releaseId,
      commitSha: identity.commitSha,
      artifactDigest: identity.serviceArtifactDigests[issuer],
      releaseManifestDigest: identity.releaseManifestDigest,
      observedAt: "2026-08-24T12:00:00.000Z",
      expiresAt: "2026-08-24T12:01:00.000Z",
      outcome: "passed",
      evidence: definition.requiredEvidence,
    });
  }),
);
const blockedCandidate = Object.freeze({
  identity,
  candidateDigest:
    `production_readiness_candidate_v2_${"6".repeat(64)}`,
  evidenceSetJson: JSON.stringify(evidence),
  validUntil: "2026-08-24T12:01:00.000Z",
});

function result(rows) {
  return { rows, rowCount: rows.length };
}

function identityRow() {
  return {
    environment: identity.environment,
    releaseId: identity.releaseId,
    commitSha: identity.commitSha,
    registryVersion: identity.registryVersion,
    registryDigest: identity.registryDigest,
    releaseManifestDigest: identity.releaseManifestDigest,
    railwayApiArtifactDigest:
      identity.serviceArtifactDigests["railway-api"],
    railwayWorkerArtifactDigest:
      identity.serviceArtifactDigests["railway-worker"],
    vercelWebArtifactDigest:
      identity.serviceArtifactDigests["vercel-web"],
  };
}

function headRow(overrides = {}) {
  return {
    ...identityRow(),
    activeVersion: 0,
    activeCandidateDigest: null,
    ...overrides,
  };
}

function candidateRow(overrides = {}) {
  return {
    ...identityRow(),
    candidateDigest: blockedCandidate.candidateDigest,
    databaseNow: now,
    evidenceSetJson: blockedCandidate.evidenceSetJson,
    validUntil: blockedCandidate.validUntil,
    ...overrides,
  };
}

function fixture(results) {
  const calls = [];
  const remaining = [...results];
  const transactions = {
    async transaction(options, execute) {
      calls.push({ kind: "transaction", options });
      return execute({
        async query(sql, parameters) {
          calls.push({ kind: "query", sql, parameters });
          if (remaining.length === 0) throw new Error("unexpected query");
          const next = remaining.shift();
          if (next instanceof Error) throw next;
          return next;
        },
      });
    },
  };
  return {
    repository: createPostgresProductionReadinessV2EvidenceRepository(
      transactions,
      identity,
    ),
    calls,
    remaining,
  };
}

test("initializes one canonical immutable composite release identity", async () => {
  const current = fixture([
    result([{ releaseId: identity.releaseId }]),
    result([headRow()]),
  ]);

  assert.deepEqual(await current.repository.initializeRelease(), {
    identity,
    activeVersion: 0,
    activeCandidateDigest: null,
  });
  assert.equal(current.calls[0].options.isolationLevel, "read-committed");
  assert.equal(
    current.calls[1].sql,
    postgresProductionReadinessV2EvidenceSql.initialize,
  );
  assert.equal(
    current.calls[2].sql,
    postgresProductionReadinessV2EvidenceSql.readHead,
  );
  assert.equal(current.calls[1].parameters.length, 9);
  assert.equal(current.calls[1].parameters.includes(now), false);
  assert.deepEqual(current.calls[2].parameters, [
    identity.environment,
    identity.releaseId,
    identity.releaseManifestDigest,
  ]);
  assert.match(current.calls[1].sql, /clock_timestamp\(\)/);
  assert.equal(current.remaining.length, 0);
});

test("refuses to stage evidence while canonical D14 remains open", async () => {
  const current = fixture([result([{ databaseNow: now }])]);

  await assert.rejects(
    current.repository.stageCandidate(blockedCandidate),
    /candidate failed: not-ready/,
  );
  assert.equal(
    current.calls[1].sql,
    postgresProductionReadinessV2EvidenceSql.readDatabaseNow,
  );
  assert.equal(
    current.calls.some(
      ({ sql }) => sql === postgresProductionReadinessV2EvidenceSql.stageCandidate,
    ),
    false,
  );
});

test("refuses to read a non-canonical persisted candidate as ready", async () => {
  const current = fixture([result([candidateRow()])]);

  await assert.rejects(
    current.repository.readCandidate(blockedCandidate.candidateDigest),
    /candidate failed: not-ready/,
  );
  assert.deepEqual(current.calls[1].parameters, [
    identity.environment,
    identity.releaseId,
    identity.releaseManifestDigest,
    blockedCandidate.candidateDigest,
  ]);
});

test("returns a bounded conflict when another confirmation already won", async () => {
  const current = fixture([result([{
    activeVersion: 1,
    activeCandidateDigest: blockedCandidate.candidateDigest,
  }])]);

  assert.deepEqual(await current.repository.confirmCandidate({
    expectedActiveVersion: 0,
    expectedActiveCandidateDigest: null,
    candidateDigest: blockedCandidate.candidateDigest,
  }), {
    status: "conflict",
    activeVersion: null,
    candidateDigest: null,
  });
  assert.match(current.calls[1].sql, /FOR UPDATE/);
  assert.equal(current.calls.length, 2);
});

test("keeps a D14-blocked candidate inactive after locking the head", async () => {
  const current = fixture([
    result([{ activeVersion: 0, activeCandidateDigest: null }]),
    result([candidateRow()]),
  ]);

  assert.deepEqual(await current.repository.confirmCandidate({
    expectedActiveVersion: 0,
    expectedActiveCandidateDigest: null,
    candidateDigest: blockedCandidate.candidateDigest,
  }), {
    status: "conflict",
    activeVersion: null,
    candidateDigest: null,
  });
  assert.equal(
    current.calls.some(
      ({ sql }) => sql === postgresProductionReadinessV2EvidenceSql.activateCandidate,
    ),
    false,
  );
});

test("defines one DB-clock CAS statement with an atomic activation event", () => {
  const sql = postgresProductionReadinessV2EvidenceSql.activateCandidate;

  assert.match(sql, /WITH activation_clock AS/);
  assert.match(sql, /clock_timestamp\(\)/);
  assert.match(sql, /UPDATE production_readiness_release_heads_v2/);
  assert.match(
    sql,
    /INSERT INTO production_readiness_release_activation_events_v2/,
  );
  assert.match(
    sql,
    /candidate\.release_manifest_digest\s*=\s*head\.release_manifest_digest/,
  );
  assert.match(sql, /candidate\.valid_until\s*>\s*GREATEST\(/);
  assert.doesNotMatch(sql, /\$13/);
});

test("reads only an unexpired active candidate joined to its event", async () => {
  const missing = fixture([result([])]);
  assert.deepEqual(await missing.repository.readActive(), {
    status: "unavailable",
    activeVersion: null,
    candidate: null,
  });

  const blocked = fixture([result([{
    ...candidateRow(),
    activeVersion: 1,
  }])]);
  assert.deepEqual(await blocked.repository.readActive(), {
    status: "unavailable",
    activeVersion: null,
    candidate: null,
  });
  assert.match(
    blocked.calls[1].sql,
    /INNER JOIN production_readiness_release_activation_events_v2/,
  );
  assert.match(
    blocked.calls[1].sql,
    /candidate\.valid_until\s*>\s*date_trunc\([\s\S]*clock_timestamp\(\)/,
  );
});

test("threads the manifest through every repository identity predicate", () => {
  const sql = JSON.stringify(postgresProductionReadinessV2EvidenceSql);

  assert.match(
    postgresProductionReadinessV2EvidenceSql.readHead,
    /release_manifest_digest\s*=\s*\$3/,
  );
  assert.match(
    postgresProductionReadinessV2EvidenceSql.readCandidate,
    /candidate\.release_manifest_digest\s*=\s*\$3/,
  );
  assert.match(
    postgresProductionReadinessV2EvidenceSql.readActive,
    /head\.release_manifest_digest\s*=\s*\$3/,
  );
  assert.doesNotMatch(sql, /ON CONFLICT \(environment, release_id\) DO NOTHING/);
});

test("exports a frozen deterministic canonical repository contract", () => {
  const current = fixture([]);
  assert.equal(
    postgresProductionReadinessV2EvidenceRepositoryVersion,
    "connect-postgres-production-readiness-v2-evidence-repository-v2",
  );
  assert.equal(Object.isFrozen(postgresProductionReadinessV2EvidenceSql), true);
  assert.equal(Object.isFrozen(current.repository), true);
  assert.doesNotMatch(
    JSON.stringify(postgresProductionReadinessV2EvidenceSql),
    /random|uuid/i,
  );
});

test("canonical factory rejects an altered registry identity", () => {
  const transactions = {
    async transaction() {
      throw new Error("transaction must not run");
    },
  };

  assert.throws(
    () => createPostgresProductionReadinessV2EvidenceRepository(
      transactions,
      {
        ...identity,
        registryDigest:
          `production_readiness_registry_v2_${"7".repeat(64)}`,
      },
    ),
    /candidate failed: input-invalid/,
  );
});
