import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../shared/domain/productionReadinessRegistryV2.ts";
import {
  productionReadinessV2CheckIds,
} from "../shared/domain/productionReadinessV2.ts";
import {
  createProductionReadinessV2Evidence,
  deriveProductionReadinessRegistryV2Digest,
  deriveProductionReadinessV2ReleaseManifestDigest,
} from "../server/operations/productionReadinessV2.ts";
import {
  createProductionReadinessV2Candidate,
  inspectProductionReadinessV2Candidate,
  ProductionReadinessV2CandidateError,
  productionReadinessV2CandidateVersion,
} from "../server/operations/productionReadinessV2Candidate.ts";

const observedAt = "2026-08-24T12:00:00.000Z";
const expiresAt = "2026-08-24T12:01:00.000Z";
const clock = Object.freeze({
  now: () => new Date("2026-08-24T12:00:30.000Z"),
});
const serviceArtifactDigests = Object.freeze({
  "railway-api": `sha256:${"a".repeat(64)}`,
  "railway-worker": `sha256:${"b".repeat(64)}`,
  "vercel-web": `sha256:${"c".repeat(64)}`,
});
const baseIdentity = Object.freeze({
  environment: "staging",
  releaseId: `connect_release_v1_${"d".repeat(64)}`,
  commitSha: "e".repeat(40),
  registryVersion: 2,
  serviceArtifactDigests,
});
const activationRegistry = Object.freeze(
  PRODUCTION_READINESS_REGISTRY_V2.map((definition) =>
    Object.freeze({
      ...definition,
      decisionId: definition.id === "storage.object"
        ? null
        : definition.decisionId,
    })
  ),
);
const identity = Object.freeze({
  ...baseIdentity,
  registryDigest:
    deriveProductionReadinessRegistryV2Digest(activationRegistry),
  releaseManifestDigest:
    deriveProductionReadinessV2ReleaseManifestDigest({
      environment: baseIdentity.environment,
      releaseId: baseIdentity.releaseId,
      commitSha: baseIdentity.commitSha,
      serviceArtifactDigests: baseIdentity.serviceArtifactDigests,
    }),
});

function evidenceSet(overrides = {}) {
  return activationRegistry.map((definition) => {
    const issuer = definition.allowedIssuer[0];
    const envelope = createProductionReadinessV2Evidence({
      checkId: definition.id,
      environment: identity.environment,
      issuer,
      releaseId: identity.releaseId,
      commitSha: identity.commitSha,
      artifactDigest: identity.serviceArtifactDigests[issuer],
      releaseManifestDigest: identity.releaseManifestDigest,
      observedAt,
      expiresAt,
      outcome: "passed",
      evidence: definition.requiredEvidence,
      ...(overrides[definition.id] ?? {}),
    }, activationRegistry);
    return JSON.stringify(envelope);
  });
}

test("builds one canonical ready candidate from all six checks", () => {
  const candidate = createProductionReadinessV2Candidate({
    identity,
    evidence: evidenceSet().reverse(),
  }, activationRegistry, clock);

  assert.equal(
    candidate.candidateDigest,
    `production_readiness_candidate_v2_${candidate.candidateDigest.slice(-64)}`,
  );
  assert.equal(candidate.validUntil, expiresAt);
  assert.deepEqual(
    JSON.parse(candidate.evidenceSetJson).map(({ checkId }) => checkId),
    productionReadinessV2CheckIds,
  );
  assert.deepEqual(
    inspectProductionReadinessV2Candidate(
      candidate,
      activationRegistry,
      clock,
    ),
    candidate,
  );
  assert.equal(
    productionReadinessV2CandidateVersion,
    "connect-production-readiness-candidate-v2",
  );
});

test("rejects missing, duplicate and failed checks before persistence", () => {
  const complete = evidenceSet();
  for (const evidence of [
    complete.slice(1),
    [...complete.slice(0, -1), complete[0]],
    evidenceSet({
      "runtime.railway-api": { outcome: "failed" },
    }),
  ]) {
    assert.throws(
      () => createProductionReadinessV2Candidate({
        identity,
        evidence,
      }, activationRegistry, clock),
      ProductionReadinessV2CandidateError,
    );
  }
});

test("rejects open decisions, release drift and expired evidence", () => {
  assert.throws(
    () => createProductionReadinessV2Candidate({
      identity: {
        ...identity,
        registryDigest:
          deriveProductionReadinessRegistryV2Digest(
            PRODUCTION_READINESS_REGISTRY_V2,
          ),
      },
      evidence: evidenceSet(),
    }, PRODUCTION_READINESS_REGISTRY_V2, clock),
    ProductionReadinessV2CandidateError,
  );
  assert.throws(
    () => createProductionReadinessV2Candidate({
      identity: {
        ...identity,
        commitSha: "f".repeat(40),
      },
      evidence: evidenceSet(),
    }, activationRegistry, clock),
    ProductionReadinessV2CandidateError,
  );
  assert.throws(
    () => createProductionReadinessV2Candidate({
      identity,
      evidence: evidenceSet(),
    }, activationRegistry, {
      now: () => new Date(expiresAt),
    }),
    ProductionReadinessV2CandidateError,
  );
});

test("rejects byte, digest and validity tampering on read-back", () => {
  const candidate = createProductionReadinessV2Candidate({
    identity,
    evidence: evidenceSet(),
  }, activationRegistry, clock);
  const parsed = JSON.parse(candidate.evidenceSetJson);
  const reorderedJson = JSON.stringify([...parsed].reverse());
  for (const persisted of [
    {
      ...candidate,
      candidateDigest:
        `production_readiness_candidate_v2_${"0".repeat(64)}`,
    },
    { ...candidate, evidenceSetJson: reorderedJson },
    { ...candidate, validUntil: "2026-08-24T12:02:00.000Z" },
    { ...candidate, extra: true },
  ]) {
    assert.throws(
      () => inspectProductionReadinessV2Candidate(
        persisted,
        activationRegistry,
        clock,
      ),
      ProductionReadinessV2CandidateError,
    );
  }
});
