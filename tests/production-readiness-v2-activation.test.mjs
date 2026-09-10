import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../shared/domain/productionReadinessRegistryV2.ts";
import {
  createProductionReadinessV2Evidence,
  deriveProductionReadinessRegistryV2Digest,
  deriveProductionReadinessV2ReleaseManifestDigest,
} from "../server/operations/productionReadinessV2.ts";
import * as activationModule from
  "../server/operations/productionReadinessV2Activation.ts";
import {
  activateProductionReadinessV2,
  ProductionReadinessV2ActivationError,
  productionReadinessV2ActivationVersion,
  readActiveProductionReadinessV2Report,
} from "../server/operations/productionReadinessV2Activation.ts";

const now = "2026-08-25T00:00:30.000Z";
const clock = Object.freeze({ now: () => new Date(now) });
const release = Object.freeze({
  environment: "staging",
  releaseId: `connect_release_v1_${"7".repeat(64)}`,
  commitSha: "8".repeat(40),
  serviceArtifactDigests: Object.freeze({
    "railway-api": `sha256:${"9".repeat(64)}`,
    "railway-worker": `sha256:${"a".repeat(64)}`,
    "vercel-web": `sha256:${"b".repeat(64)}`,
  }),
});
const identity = Object.freeze({
  ...release,
  registryVersion: 2,
  registryDigest: deriveProductionReadinessRegistryV2Digest(),
  releaseManifestDigest:
    deriveProductionReadinessV2ReleaseManifestDigest(release),
});

function evidenceSet() {
  return PRODUCTION_READINESS_REGISTRY_V2.map((definition) => {
    const issuer = definition.allowedIssuer[0];
    return JSON.stringify(createProductionReadinessV2Evidence({
      checkId: definition.id,
      environment: identity.environment,
      issuer,
      releaseId: identity.releaseId,
      commitSha: identity.commitSha,
      artifactDigest: identity.serviceArtifactDigests[issuer],
      releaseManifestDigest: identity.releaseManifestDigest,
      observedAt: "2026-08-25T00:00:00.000Z",
      expiresAt: "2026-08-25T00:01:00.000Z",
      outcome: "passed",
      evidence: definition.requiredEvidence,
    }));
  });
}

const evidence = Object.freeze(evidenceSet());
const input = Object.freeze({ identity, evidence });
const evidenceSetJson = JSON.stringify(
  evidence.map((envelope) => JSON.parse(envelope)),
);
const candidateDigest = `production_readiness_candidate_v2_${
  createHash("sha256").update(evidenceSetJson, "utf8").digest("hex")
}`;
const persistedCandidate = Object.freeze({
  identity,
  candidateDigest,
  evidenceSetJson,
  validUntil: "2026-08-25T00:01:00.000Z",
});

function unavailableReport() {
  return {
    status: "unavailable",
    activeVersion: null,
    candidateDigest: null,
    report: null,
  };
}

function repositoryFixture(overrides = {}) {
  const calls = [];
  const repository = {
    identity,
    async initializeRelease() {
      calls.push("initialize");
      return {
        identity,
        activeVersion: 0,
        activeCandidateDigest: null,
      };
    },
    async stageCandidate() {
      calls.push("stage");
      throw new Error("canonical D14 block must prevent staging");
    },
    async readCandidate() {
      calls.push("read-candidate");
      throw new Error("canonical D14 block must prevent candidate reads");
    },
    async confirmCandidate() {
      calls.push("confirm");
      throw new Error("canonical D14 block must prevent confirmation");
    },
    async readActive() {
      calls.push("read-active");
      return {
        status: "unavailable",
        activeVersion: null,
        candidate: null,
      };
    },
    ...overrides,
  };
  return { calls, repository };
}

test("exposes no custom-registry activation or report seam", () => {
  assert.equal(
    Object.keys(activationModule).some((name) => name.includes("ForTesting")),
    false,
  );
});

test("blocks canonical D14 before every repository operation", async () => {
  const current = repositoryFixture();

  assert.deepEqual(await activateProductionReadinessV2(
    input,
    current.repository,
    clock,
  ), {
    schemaVersion: 2,
    activationVersion: productionReadinessV2ActivationVersion,
    status: "blocked",
    code: "PRODUCTION_READINESS_V2_NOT_READY",
    activeVersion: null,
    candidateDigest: null,
    replayed: false,
    audit: null,
  });
  assert.deepEqual(current.calls, []);
  assert.equal(
    identity.registryDigest,
    deriveProductionReadinessRegistryV2Digest(
      PRODUCTION_READINESS_REGISTRY_V2,
    ),
  );
});

test("rejects malformed activation dependencies before evaluation", async () => {
  await assert.rejects(
    activateProductionReadinessV2(input, {}, clock),
    (error) =>
      error instanceof ProductionReadinessV2ActivationError &&
      error.code === "dependencies-invalid",
  );
  const current = repositoryFixture();
  await assert.rejects(
    activateProductionReadinessV2(
      input,
      current.repository,
      { now: null },
    ),
    (error) =>
      error instanceof ProductionReadinessV2ActivationError &&
      error.code === "dependencies-invalid",
  );
  assert.deepEqual(current.calls, []);
});

test("rejects malformed activation input without repository access", async () => {
  const current = repositoryFixture();
  await assert.rejects(
    activateProductionReadinessV2(
      { identity, evidence: [] },
      current.repository,
      clock,
    ),
    (error) =>
      error instanceof ProductionReadinessV2ActivationError &&
      error.code === "input-invalid",
  );
  assert.deepEqual(current.calls, []);
});

test("returns unavailable when there is no active candidate", async () => {
  const current = repositoryFixture();
  assert.deepEqual(await readActiveProductionReadinessV2Report(
    current.repository,
    clock,
  ), unavailableReport());
  assert.deepEqual(current.calls, ["read-active"]);
});

test("fails closed when the active repository read throws", async () => {
  const current = repositoryFixture({
    async readActive() {
      current.calls.push("read-active");
      throw new Error("repository unavailable");
    },
  });
  assert.deepEqual(await readActiveProductionReadinessV2Report(
    current.repository,
    clock,
  ), unavailableReport());
  assert.deepEqual(current.calls, ["read-active"]);
});

test("never reports canonical passed evidence as active while D14 is open", async () => {
  const current = repositoryFixture({
    async readActive() {
      current.calls.push("read-active");
      return {
        status: "available",
        activeVersion: 1,
        candidate: persistedCandidate,
      };
    },
  });
  assert.deepEqual(await readActiveProductionReadinessV2Report(
    current.repository,
    clock,
  ), unavailableReport());
  assert.deepEqual(current.calls, ["read-active"]);
});

test("fails closed for malformed persisted active evidence", async () => {
  const current = repositoryFixture({
    async readActive() {
      current.calls.push("read-active");
      return {
        status: "available",
        activeVersion: 1,
        candidate: {
          ...persistedCandidate,
          evidenceSetJson: "{}",
        },
      };
    },
  });
  assert.deepEqual(await readActiveProductionReadinessV2Report(
    current.repository,
    clock,
  ), unavailableReport());
  assert.deepEqual(current.calls, ["read-active"]);
});

test("validates active-report dependencies", async () => {
  await assert.rejects(
    readActiveProductionReadinessV2Report({}, clock),
    (error) =>
      error instanceof ProductionReadinessV2ActivationError &&
      error.code === "dependencies-invalid",
  );
});
