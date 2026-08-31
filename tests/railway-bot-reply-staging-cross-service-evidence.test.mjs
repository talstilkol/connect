import assert from "node:assert/strict";
import test from "node:test";

import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";
import {
  createRailwayBotReplyStagingCrossServiceEvidence,
  deriveRailwayBotReplyStagingCrossServiceEvidenceDigest,
  inspectRailwayBotReplyStagingCrossServiceEvidence,
  RailwayBotReplyStagingCrossServiceEvidenceError,
  railwayBotReplyStagingCrossServiceEvidencePolicyVersion,
} from "../server/platform/railwayBotReplyStagingCrossServiceEvidence.ts";

const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const verifiedAt = "2026-08-24T12:00:00.000Z";

function readyReport(overrides = {}) {
  return {
    schemaVersion: 1,
    activationVersion:
      railwayBotReplyStagingCrossServiceActivationVersion,
    status: "ready",
    code: "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED",
    passedCheckCount: 4,
    requiredCheckCount: 4,
    checks: railwayBotReplyStagingCrossServiceCheckIds.map((id) => ({
      id,
      status: "passed",
    })),
    ...overrides,
  };
}

function createInput(overrides = {}) {
  return {
    report: readyReport(),
    releaseId,
    commitSha,
    artifactDigest,
    lifetimeSeconds: 600,
    ...overrides,
  };
}

const clock = Object.freeze({
  now: () => new Date(verifiedAt),
});

function createEvidence(overrides = {}) {
  return createRailwayBotReplyStagingCrossServiceEvidence(
    createInput(overrides),
    clock,
  );
}

function withDigest(value) {
  const evidence = structuredClone(value);
  delete evidence.evidenceDigest;
  return {
    ...evidence,
    evidenceDigest:
      deriveRailwayBotReplyStagingCrossServiceEvidenceDigest(evidence),
  };
}

function inspect(evidence, overrides = {}, now = verifiedAt) {
  return inspectRailwayBotReplyStagingCrossServiceEvidence({
    APP_RELEASE_ID: releaseId,
    APP_DEPLOYED_COMMIT_SHA: commitSha,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: artifactDigest,
    BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON:
      JSON.stringify(evidence),
    ...overrides,
  }, new Date(now));
}

test("creates and verifies one short-lived release-bound evidence", () => {
  const evidence = createEvidence();

  assert.equal(
    evidence.policyVersion,
    railwayBotReplyStagingCrossServiceEvidencePolicyVersion,
  );
  assert.equal(evidence.verifiedAt, verifiedAt);
  assert.equal(evidence.expiresAt, "2026-08-24T12:10:00.000Z");
  assert.match(
    evidence.evidenceDigest,
    /^bot_reply_staging_cross_service_evidence_v1_[a-f0-9]{64}$/,
  );
  assert.ok(Object.isFrozen(evidence));
  assert.ok(Object.isFrozen(evidence.checks));
  assert.deepEqual(
    inspect(evidence, {}, "2026-08-24T12:05:00.000Z"),
    {
      status: "configured",
      code: "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_VERIFIED",
      releaseId,
      commitSha,
      artifactDigest,
      verifiedAt,
      expiresAt: "2026-08-24T12:10:00.000Z",
      checkCount: 4,
    },
  );
});

test("builder accepts only a complete ready report and an explicit safe lifetime", () => {
  for (const input of [
    createInput({ report: readyReport({ status: "blocked" }) }),
    createInput({ report: readyReport({ passedCheckCount: 3 }) }),
    createInput({ lifetimeSeconds: 59 }),
    createInput({ lifetimeSeconds: 901 }),
    { ...createInput(), extension: "forbidden" },
  ]) {
    assert.throws(
      () => createRailwayBotReplyStagingCrossServiceEvidence(input, clock),
      (error) =>
        error instanceof RailwayBotReplyStagingCrossServiceEvidenceError &&
        error.code === "input-invalid",
    );
  }

  assert.throws(
    () => createRailwayBotReplyStagingCrossServiceEvidence(
      createInput(),
      { now: () => new Date("invalid") },
    ),
    (error) =>
      error instanceof RailwayBotReplyStagingCrossServiceEvidenceError &&
      error.code === "clock-invalid",
  );
});

test("rejects extension fields, failed checks and digest tampering", () => {
  const extended = { ...createEvidence(), tenantId: 7 };
  const failedCheck = structuredClone(createEvidence());
  failedCheck.checks[0].status = "blocked";
  const changedRelease = structuredClone(createEvidence());
  changedRelease.releaseId = `connect_release_v1_${"d".repeat(64)}`;

  for (const evidence of [extended, failedCheck, changedRelease]) {
    assert.equal(inspect(evidence).status, "invalid");
  }
});

test("separates future, expiry and an excessive evidence lifetime", () => {
  const evidence = createEvidence();
  assert.equal(
    inspect(evidence, {}, "2026-08-24T11:59:59.999Z").status,
    "not-yet-valid",
  );
  assert.equal(
    inspect(evidence, {}, evidence.expiresAt).status,
    "expired",
  );

  const longLived = structuredClone(evidence);
  longLived.expiresAt = "2026-08-24T12:15:00.001Z";
  assert.equal(inspect(withDigest(longLived)).status, "invalid");
});

test("rejects release, commit and artifact mismatches independently", () => {
  const evidence = createEvidence();
  for (const overrides of [
    { APP_RELEASE_ID: `connect_release_v1_${"d".repeat(64)}` },
    { APP_DEPLOYED_COMMIT_SHA: "d".repeat(40) },
    { APP_DEPLOYMENT_ARTIFACT_DIGEST: `sha256:${"d".repeat(64)}` },
  ]) {
    const report = inspect(evidence, overrides);
    assert.equal(report.status, "mismatch");
    assert.equal(
      report.code,
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_MISMATCH",
    );
  }
});

test("keeps unavailable and invalid output bounded and deterministic", () => {
  assert.equal(
    inspectRailwayBotReplyStagingCrossServiceEvidence({}).status,
    "disabled",
  );
  assert.equal(
    inspectRailwayBotReplyStagingCrossServiceEvidence({
      BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON: "{broken",
    }).status,
    "invalid",
  );
  assert.deepEqual(createEvidence(), createEvidence());

  const serialized = JSON.stringify(inspect(createEvidence()));
  assert.doesNotMatch(
    serialized,
    /tenant|clerk|phone|token|secret|hmac|inventory|meta/i,
  );
});
