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
  inspectProductionReadinessV2ReleaseIdentity,
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
const identity = Object.freeze({
  ...baseIdentity,
  registryDigest: deriveProductionReadinessRegistryV2Digest(),
  releaseManifestDigest:
    deriveProductionReadinessV2ReleaseManifestDigest({
      environment: baseIdentity.environment,
      releaseId: baseIdentity.releaseId,
      commitSha: baseIdentity.commitSha,
      serviceArtifactDigests: baseIdentity.serviceArtifactDigests,
    }),
});

function evidenceSet(overrides = {}) {
  return PRODUCTION_READINESS_REGISTRY_V2.map((definition) => {
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
    });
    return JSON.stringify(envelope);
  });
}

function assertCandidateError(action, expectedCode) {
  assert.throws(
    action,
    (error) =>
      error instanceof ProductionReadinessV2CandidateError &&
      error.code === expectedCode,
  );
}

test("accepts only the canonical release identity", () => {
  const inspected = inspectProductionReadinessV2ReleaseIdentity(identity);

  assert.deepEqual(inspected, identity);
  assert.equal(Object.isFrozen(inspected), true);
  assert.equal(Object.isFrozen(inspected.serviceArtifactDigests), true);
  assert.equal(
    productionReadinessV2CandidateVersion,
    "connect-production-readiness-candidate-v2",
  );
  assert.deepEqual(
    PRODUCTION_READINESS_REGISTRY_V2.map(({ id }) => id),
    productionReadinessV2CheckIds,
  );
});

test("rejects identity drift, malformed identity and non-canonical registry digests", () => {
  const invalidIdentities = [
    {
      ...identity,
      registryDigest:
        `production_readiness_registry_v2_${"0".repeat(64)}`,
    },
    { ...identity, releaseManifestDigest: `sha256:${"0".repeat(64)}` },
    { ...identity, commitSha: "f".repeat(40) },
    { ...identity, environment: "invalid" },
    {
      ...identity,
      serviceArtifactDigests: {
        "railway-api": identity.serviceArtifactDigests["railway-api"],
        "railway-worker": identity.serviceArtifactDigests["railway-worker"],
      },
    },
    { ...identity, extra: true },
  ];

  for (const invalidIdentity of invalidIdentities) {
    assertCandidateError(
      () => inspectProductionReadinessV2ReleaseIdentity(invalidIdentity),
      "input-invalid",
    );
  }
});

test("fails closed while canonical D14 remains an open decision", () => {
  for (const evidence of [evidenceSet(), evidenceSet().reverse()]) {
    assertCandidateError(
      () => createProductionReadinessV2Candidate({ identity, evidence }, clock),
      "not-ready",
    );
  }
});

test("rejects malformed, missing and duplicate evidence before persistence", () => {
  const complete = evidenceSet();
  const tamperedEnvelope = JSON.parse(complete[0]);
  tamperedEnvelope.evidenceDigest =
    `production_readiness_evidence_v2_${"0".repeat(64)}`;

  const invalidInputs = [
    { identity, evidence: complete.slice(1) },
    { identity, evidence: [...complete.slice(0, -1), complete[0]] },
    {
      identity,
      evidence: [JSON.stringify(tamperedEnvelope), ...complete.slice(1)],
    },
    { identity, evidence: [42, ...complete.slice(1)] },
    { identity, evidence: complete, extra: true },
  ];

  for (const input of invalidInputs) {
    assertCandidateError(
      () => createProductionReadinessV2Candidate(input, clock),
      "input-invalid",
    );
  }
});

test("does not create a candidate from failed or expired canonical evidence", () => {
  for (const [evidence, candidateClock] of [
    [
      evidenceSet({
        "runtime.railway-api": { outcome: "failed" },
      }),
      clock,
    ],
    [
      evidenceSet(),
      Object.freeze({ now: () => new Date(expiresAt) }),
    ],
  ]) {
    assertCandidateError(
      () => createProductionReadinessV2Candidate(
        { identity, evidence },
        candidateClock,
      ),
      "not-ready",
    );
  }
});

test("rejects malformed persisted candidates and never reconstructs one past D14", () => {
  const evidenceSetJson = JSON.stringify(
    evidenceSet().map((envelope) => JSON.parse(envelope)),
  );
  const plausiblePersistedCandidate = {
    identity,
    candidateDigest:
      `production_readiness_candidate_v2_${"0".repeat(64)}`,
    evidenceSetJson,
    validUntil: expiresAt,
  };

  const malformedCandidates = [
    null,
    { ...plausiblePersistedCandidate, candidateDigest: "invalid" },
    { ...plausiblePersistedCandidate, evidenceSetJson: "{" },
    { ...plausiblePersistedCandidate, evidenceSetJson: "[]" },
    { ...plausiblePersistedCandidate, validUntil: "2026-08-24" },
    { ...plausiblePersistedCandidate, extra: true },
  ];

  for (const persistedCandidate of malformedCandidates) {
    assertCandidateError(
      () => inspectProductionReadinessV2Candidate(persistedCandidate, clock),
      "input-invalid",
    );
  }
  assertCandidateError(
    () => inspectProductionReadinessV2Candidate(
      plausiblePersistedCandidate,
      clock,
    ),
    "not-ready",
  );
});
