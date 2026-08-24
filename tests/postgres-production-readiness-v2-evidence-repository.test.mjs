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
  createProductionReadinessV2Candidate,
} from "../server/operations/productionReadinessV2Candidate.ts";
import {
  createPostgresProductionReadinessV2EvidenceRepository,
  postgresProductionReadinessV2EvidenceRepositoryVersion,
  postgresProductionReadinessV2EvidenceSql,
} from "../server/platform/postgresProductionReadinessV2EvidenceRepository.ts";

const now = "2026-08-24T12:00:30.000Z";
const clock = Object.freeze({ now: () => new Date(now) });
const serviceArtifactDigests = Object.freeze({
  "railway-api": `sha256:${"1".repeat(64)}`,
  "railway-worker": `sha256:${"2".repeat(64)}`,
  "vercel-web": `sha256:${"3".repeat(64)}`,
});
const registry = Object.freeze(
  PRODUCTION_READINESS_REGISTRY_V2.map((definition) =>
    Object.freeze({
      ...definition,
      decisionId: definition.id === "storage.object"
        ? null
        : definition.decisionId,
    })
  ),
);
const release = {
  environment: "staging",
  releaseId: `connect_release_v1_${"4".repeat(64)}`,
  commitSha: "5".repeat(40),
  serviceArtifactDigests,
};
const identity = Object.freeze({
  ...release,
  registryVersion: 2,
  registryDigest: deriveProductionReadinessRegistryV2Digest(registry),
  releaseManifestDigest:
    deriveProductionReadinessV2ReleaseManifestDigest(release),
});

function buildCandidate() {
  const evidence = registry.map((definition) => {
    const issuer = definition.allowedIssuer[0];
    return JSON.stringify(createProductionReadinessV2Evidence({
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
    }, registry));
  });
  return createProductionReadinessV2Candidate({ identity, evidence }, registry, clock);
}

const candidate = buildCandidate();

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
    candidateDigest: candidate.candidateDigest,
    evidenceSetJson: candidate.evidenceSetJson,
    validUntil: candidate.validUntil,
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
      clock,
      registry,
    ),
    calls,
    remaining,
  };
}

test("initializes and verifies one immutable composite release identity", async () => {
  const current = fixture([
    result([{ releaseId: identity.releaseId }]),
    result([headRow()]),
  ]);

  assert.deepEqual(await current.repository.initializeRelease(), {
    identity,
    activeVersion: 0,
    activeCandidateDigest: null,
  });
  assert.equal(current.calls[0].options.isolationLevel, "repeatable-read");
  assert.equal(current.calls[1].sql, postgresProductionReadinessV2EvidenceSql.initialize);
  assert.equal(current.calls[2].sql, postgresProductionReadinessV2EvidenceSql.readHead);
  assert.equal(current.remaining.length, 0);
});

test("stages an immutable candidate and verifies the exact persisted bytes", async () => {
  const current = fixture([
    result([{ candidateDigest: candidate.candidateDigest }]),
    result([candidateRow()]),
  ]);

  assert.deepEqual(await current.repository.stageCandidate(candidate), {
    status: "stored",
    replayed: false,
    candidateDigest: candidate.candidateDigest,
  });
  assert.equal(current.calls[1].sql, postgresProductionReadinessV2EvidenceSql.stageCandidate);
  assert.equal(current.calls[2].sql, postgresProductionReadinessV2EvidenceSql.readCandidate);
  assert.deepEqual(current.calls[1].parameters, [
    identity.environment,
    identity.releaseId,
    candidate.candidateDigest,
    candidate.evidenceSetJson,
    candidate.validUntil,
    now,
  ]);
});

test("classifies an identical candidate replay without changing active state", async () => {
  const current = fixture([result([]), result([candidateRow()])]);

  assert.deepEqual(await current.repository.stageCandidate(candidate), {
    status: "stored",
    replayed: true,
    candidateDigest: candidate.candidateDigest,
  });
  assert.doesNotMatch(
    current.calls[1].sql,
    /active_candidate_digest\s*=/,
  );
});

test("activates only through one CAS statement that also appends the event", async () => {
  const current = fixture([
    result([candidateRow()]),
    result([{ activeVersion: 1 }]),
  ]);

  assert.deepEqual(await current.repository.confirmCandidate({
    expectedActiveVersion: 0,
    expectedActiveCandidateDigest: null,
    candidateDigest: candidate.candidateDigest,
  }), {
    status: "activated",
    activeVersion: 1,
    candidateDigest: candidate.candidateDigest,
  });
  assert.equal(current.calls[2].sql, postgresProductionReadinessV2EvidenceSql.activateCandidate);
  assert.match(current.calls[2].sql, /WITH activated AS/);
  assert.match(current.calls[2].sql, /INSERT INTO production_readiness_release_activation_events_v2/);
  assert.match(current.calls[2].sql, /candidate\.valid_until > \$13::timestamptz/);
  assert.equal(current.calls[2].parameters.at(-1), now);
});

test("returns one bounded conflict when another confirmation wins", async () => {
  const current = fixture([result([candidateRow()]), result([])]);

  assert.deepEqual(await current.repository.confirmCandidate({
    expectedActiveVersion: 0,
    expectedActiveCandidateDigest: null,
    candidateDigest: candidate.candidateDigest,
  }), {
    status: "conflict",
    activeVersion: null,
    candidateDigest: null,
  });
});

test("leaves activation unavailable when the atomic event write fails", async () => {
  const current = fixture([
    result([candidateRow()]),
    new Error("event write failed"),
  ]);

  await assert.rejects(
    current.repository.confirmCandidate({
      expectedActiveVersion: 0,
      expectedActiveCandidateDigest: null,
      candidateDigest: candidate.candidateDigest,
    }),
    /event write failed/,
  );
  assert.equal(current.calls.filter(({ kind }) => kind === "transaction").length, 1);
});

test("reads only a candidate joined to the active pointer and event", async () => {
  const current = fixture([
    result([{ ...candidateRow(), activeVersion: 1 }]),
  ]);

  assert.deepEqual(await current.repository.readActive(), {
    status: "available",
    activeVersion: 1,
    candidate,
  });
  assert.match(current.calls[1].sql, /INNER JOIN production_readiness_release_candidates_v2/);
  assert.match(current.calls[1].sql, /INNER JOIN production_readiness_release_activation_events_v2/);
});

test("fails closed for a missing, expired or tampered active candidate", async () => {
  const missing = fixture([result([])]);
  assert.deepEqual(await missing.repository.readActive(), {
    status: "unavailable",
    activeVersion: null,
    candidate: null,
  });

  const expired = fixture([result([{
    ...candidateRow({ validUntil: "2026-08-24T12:00:30.000Z" }),
    activeVersion: 1,
  }])]);
  assert.deepEqual(await expired.repository.readActive(), {
    status: "unavailable",
    activeVersion: null,
    candidate: null,
  });

  const tampered = fixture([result([{
    ...candidateRow({
      candidateDigest:
        `production_readiness_candidate_v2_${"6".repeat(64)}`,
    }),
    activeVersion: 1,
  }])]);
  assert.deepEqual(await tampered.repository.readActive(), {
    status: "unavailable",
    activeVersion: null,
    candidate: null,
  });
});

test("exports a frozen deterministic repository contract", () => {
  const current = fixture([]);
  assert.equal(
    postgresProductionReadinessV2EvidenceRepositoryVersion,
    "connect-postgres-production-readiness-v2-evidence-repository-v1",
  );
  assert.equal(Object.isFrozen(postgresProductionReadinessV2EvidenceSql), true);
  assert.equal(Object.isFrozen(current.repository), true);
  assert.doesNotMatch(
    JSON.stringify(postgresProductionReadinessV2EvidenceSql),
    /random|uuid/i,
  );
});
