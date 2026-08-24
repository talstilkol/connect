import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../shared/domain/productionReadinessRegistryV2.ts";
import {
  createProductionReadinessV2Evidence,
  deriveProductionReadinessV2EvidenceDigest,
  deriveProductionReadinessV2ReleaseManifestDigest,
  evaluateProductionReadinessV2,
  parseProductionReadinessV2Evidence,
  ProductionReadinessV2ContractError,
} from "../server/operations/productionReadinessV2.ts";

const evaluatedAt = "2026-08-24T12:00:30.000Z";
const releaseIdentity = Object.freeze({
  releaseId: `connect_release_v1_${"e".repeat(64)}`,
  commitSha: "f".repeat(40),
});
const serviceArtifactDigests = Object.freeze({
  "railway-api": `sha256:${"b".repeat(64)}`,
  "railway-worker": `sha256:${"c".repeat(64)}`,
  "vercel-web": `sha256:${"a".repeat(64)}`,
});
const release = Object.freeze({
  ...releaseIdentity,
  releaseManifestDigest:
    deriveProductionReadinessV2ReleaseManifestDigest({
      environment: "production",
      ...releaseIdentity,
      serviceArtifactDigests,
    }),
});
const issuers = Object.freeze({
  "queue.redis-bullmq": "railway-api",
  "runtime.railway-api": "railway-api",
  "runtime.railway-worker": "railway-worker",
  "runtime.vercel-web": "vercel-web",
  "storage.object": "railway-worker",
  "storage.postgresql": "railway-api",
});

function clock(value = evaluatedAt) {
  return { now: () => new Date(value) };
}

function definition(checkId, registry = PRODUCTION_READINESS_REGISTRY_V2) {
  return registry.find(
    ({ id }) => id === checkId,
  );
}

function evidence(
  checkId,
  overrides = {},
  registry = PRODUCTION_READINESS_REGISTRY_V2,
) {
  const issuer = overrides.issuer ?? issuers[checkId];
  return createProductionReadinessV2Evidence({
    checkId,
    environment: "production",
    issuer,
    ...release,
    artifactDigest: serviceArtifactDigests[issuer],
    observedAt: "2026-08-24T12:00:00.000Z",
    expiresAt: "2026-08-24T12:01:00.000Z",
    outcome: "passed",
    evidence: definition(checkId, registry).requiredEvidence,
    ...overrides,
  }, registry);
}

function evaluationInput(rawEvidence, overrides = {}) {
  return {
    environment: "production",
    ...release,
    serviceArtifactDigests,
    evidence: rawEvidence,
    ...overrides,
  };
}

function serialize(value) {
  return JSON.stringify(value);
}

function allEvidence(registry = PRODUCTION_READINESS_REGISTRY_V2) {
  return registry.map(({ id }) =>
    serialize(evidence(id, {}, registry))
  );
}

function expectEvidenceFailure(action) {
  assert.throws(
    action,
    (error) =>
      error instanceof ProductionReadinessV2ContractError &&
      error.code === "evidence-invalid",
  );
}

test("keeps service artifacts distinct under one shared release manifest", () => {
  const apiEvidence = evidence("runtime.railway-api");
  const workerEvidence = evidence("runtime.railway-worker");
  const webEvidence = evidence("runtime.vercel-web");

  assert.notEqual(apiEvidence.artifactDigest, workerEvidence.artifactDigest);
  assert.notEqual(apiEvidence.artifactDigest, webEvidence.artifactDigest);
  assert.notEqual(workerEvidence.artifactDigest, webEvidence.artifactDigest);
  assert.equal(
    apiEvidence.releaseManifestDigest,
    workerEvidence.releaseManifestDigest,
  );
  assert.equal(
    workerEvidence.releaseManifestDigest,
    webEvidence.releaseManifestDigest,
  );
  assert.match(
    apiEvidence.evidenceDigest,
    /^production_readiness_evidence_v2_[a-f0-9]{64}$/,
  );
  assert.deepEqual(
    parseProductionReadinessV2Evidence(serialize(apiEvidence)),
    apiEvidence,
  );
});

test("never passes production while object storage still requires D14", () => {
  const report = evaluateProductionReadinessV2(
    evaluationInput(allEvidence()),
    PRODUCTION_READINESS_REGISTRY_V2,
    clock(),
  );
  const byId = new Map(report.checks.map((check) => [check.id, check]));

  assert.equal(report.readyForProduction, false);
  assert.equal(report.readyForEnvironment, false);
  assert.deepEqual(report.counts, {
    ready: 4,
    blocked: 1,
    decisionRequired: 1,
    unavailable: 0,
    stale: 0,
  });
  assert.equal(byId.get("storage.object")?.status, "decision-required");
  assert.equal(byId.get("runtime.railway-worker")?.status, "blocked");
  assert.equal(byId.get("runtime.railway-api")?.status, "ready");
  assert.equal(byId.get("runtime.vercel-web")?.status, "ready");
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.checks), true);
});

test("requires the production environment even when every check is ready", () => {
  const selectedObjectStorageRegistry =
    PRODUCTION_READINESS_REGISTRY_V2.map((entry) =>
      entry.id === "storage.object"
        ? { ...entry, decisionId: null }
        : entry
    );
  const productionReport = evaluateProductionReadinessV2(
    evaluationInput(allEvidence(selectedObjectStorageRegistry)),
    selectedObjectStorageRegistry,
    clock(),
  );

  assert.equal(productionReport.readyForEnvironment, true);
  assert.equal(productionReport.readyForProduction, true);

  const stagingManifestDigest =
    deriveProductionReadinessV2ReleaseManifestDigest({
      environment: "staging",
      ...releaseIdentity,
      serviceArtifactDigests,
    });
  const stagingEvidence = selectedObjectStorageRegistry.map(({ id }) =>
    serialize(evidence(id, {
      environment: "staging",
      releaseManifestDigest: stagingManifestDigest,
    }, selectedObjectStorageRegistry))
  );
  const stagingReport = evaluateProductionReadinessV2(
    evaluationInput(stagingEvidence, {
      environment: "staging",
      releaseManifestDigest: stagingManifestDigest,
    }),
    selectedObjectStorageRegistry,
    clock(),
  );

  assert.equal(stagingReport.readyForEnvironment, true);
  assert.equal(stagingReport.readyForProduction, false);
});

test("distinguishes unavailable, stale and failed evidence without opening the gate", () => {
  const unavailable = evaluateProductionReadinessV2(
    evaluationInput([]),
    PRODUCTION_READINESS_REGISTRY_V2,
    clock(),
  );
  assert.deepEqual(unavailable.counts, {
    ready: 0,
    blocked: 0,
    decisionRequired: 1,
    unavailable: 5,
    stale: 0,
  });

  const stalePostgres = evidence("storage.postgresql", {
    observedAt: "2026-08-24T11:58:00.000Z",
    expiresAt: "2026-08-24T12:00:00.000Z",
  });
  const stale = evaluateProductionReadinessV2(
    evaluationInput([serialize(stalePostgres)]),
    PRODUCTION_READINESS_REGISTRY_V2,
    clock(),
  );
  assert.equal(
    stale.checks.find(({ id }) => id === "storage.postgresql")?.status,
    "stale",
  );

  const failedRedis = evidence("queue.redis-bullmq", {
    outcome: "failed",
  });
  const blocked = evaluateProductionReadinessV2(
    evaluationInput([serialize(failedRedis)]),
    PRODUCTION_READINESS_REGISTRY_V2,
    clock(),
  );
  assert.equal(
    blocked.checks.find(({ id }) => id === "queue.redis-bullmq")?.status,
    "blocked",
  );
  assert.equal(blocked.readyForProduction, false);

  const incompleteRedis = evidence("queue.redis-bullmq", {
    evidence: ["redis-connectivity"],
  });
  const incomplete = evaluateProductionReadinessV2(
    evaluationInput([serialize(incompleteRedis)]),
    PRODUCTION_READINESS_REGISTRY_V2,
    clock(),
  );
  assert.equal(
    incomplete.checks.find(({ id }) => id === "queue.redis-bullmq")
      ?.status,
    "blocked",
  );
});

test("rejects digest, version, extension and oversized evidence", () => {
  const valid = evidence("runtime.railway-api");
  const tampered = {
    ...valid,
    artifactDigest: serviceArtifactDigests["railway-worker"],
  };
  const wrongVersion = { ...valid, schemaVersion: 3 };
  const wrongRegistryVersion = { ...valid, registryVersion: 3 };
  const extended = { ...valid, extension: true };
  const oversized = `${serialize(valid)}${" ".repeat(8_193)}`;

  for (const raw of [
    serialize(tampered),
    serialize(wrongVersion),
    serialize(wrongRegistryVersion),
    serialize(extended),
    oversized,
  ]) {
    expectEvidenceFailure(() => parseProductionReadinessV2Evidence(raw));
  }
});

test("rejects an internally consistent but wrong registry digest", () => {
  const valid = evidence("runtime.railway-api");
  const unsigned = { ...valid };
  delete unsigned.evidenceDigest;
  const changed = {
    ...unsigned,
    registryDigest:
      `production_readiness_registry_v2_${"0".repeat(64)}`,
  };
  const raw = serialize({
    ...changed,
    evidenceDigest: deriveProductionReadinessV2EvidenceDigest(changed),
  });

  expectEvidenceFailure(() =>
    evaluateProductionReadinessV2(
      evaluationInput([raw]),
      PRODUCTION_READINESS_REGISTRY_V2,
      clock(),
    )
  );
});

test("rejects duplicate, unknown, wrong-bound and future evidence", () => {
  const api = serialize(evidence("runtime.railway-api"));
  expectEvidenceFailure(() =>
    evaluateProductionReadinessV2(
      evaluationInput([api, api]),
      PRODUCTION_READINESS_REGISTRY_V2,
      clock(),
    )
  );

  const unknown = JSON.parse(api);
  unknown.checkId = "runtime.unknown";
  expectEvidenceFailure(() =>
    evaluateProductionReadinessV2(
      evaluationInput([serialize(unknown)]),
      PRODUCTION_READINESS_REGISTRY_V2,
      clock(),
    )
  );

  const invalidBindings = [
    evidence("runtime.railway-api", { environment: "staging" }),
    evidence("runtime.railway-api", {
      releaseId: `connect_release_v1_${"1".repeat(64)}`,
    }),
    evidence("runtime.railway-api", {
      commitSha: "1".repeat(40),
    }),
    evidence("runtime.railway-api", {
      releaseManifestDigest: `sha256:${"2".repeat(64)}`,
    }),
    evidence("runtime.railway-api", {
      issuer: "railway-worker",
      artifactDigest: serviceArtifactDigests["railway-worker"],
    }),
    evidence("runtime.railway-api", {
      artifactDigest: serviceArtifactDigests["railway-worker"],
    }),
    evidence("runtime.railway-api", {
      observedAt: "2026-08-24T12:01:00.000Z",
      expiresAt: "2026-08-24T12:02:00.000Z",
    }),
  ];

  for (const invalid of invalidBindings) {
    expectEvidenceFailure(() =>
      evaluateProductionReadinessV2(
        evaluationInput([serialize(invalid)]),
        PRODUCTION_READINESS_REGISTRY_V2,
        clock(),
      )
    );
  }
});

test("rejects altered evidence input and an overlong evidence lifetime", () => {
  assert.throws(
    () => createProductionReadinessV2Evidence({}),
    (error) =>
      error instanceof ProductionReadinessV2ContractError &&
      error.code === "evidence-invalid",
  );
  assert.throws(
    () =>
      evaluateProductionReadinessV2(
        {
          ...evaluationInput([]),
          extension: true,
        },
        PRODUCTION_READINESS_REGISTRY_V2,
        clock(),
      ),
    (error) =>
      error instanceof ProductionReadinessV2ContractError &&
      error.code === "evaluation-invalid",
  );

  const overlong = evidence("runtime.railway-api", {
    expiresAt: "2026-08-24T12:03:00.000Z",
  });
  expectEvidenceFailure(() =>
    evaluateProductionReadinessV2(
      evaluationInput([serialize(overlong)]),
      PRODUCTION_READINESS_REGISTRY_V2,
      clock(),
    )
  );
});

test("rejects a changed service artifact under an old release manifest", () => {
  const changedServiceArtifacts = {
    ...serviceArtifactDigests,
    "railway-api": `sha256:${"9".repeat(64)}`,
  };

  assert.throws(
    () =>
      evaluateProductionReadinessV2(
        evaluationInput([], {
          serviceArtifactDigests: changedServiceArtifacts,
          releaseManifestDigest: release.releaseManifestDigest,
        }),
        PRODUCTION_READINESS_REGISTRY_V2,
        clock(),
      ),
    (error) =>
      error instanceof ProductionReadinessV2ContractError &&
      error.code === "evaluation-invalid",
  );
});
