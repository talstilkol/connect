import assert from "node:assert/strict";
import test from "node:test";

import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";
import {
  inspectRailwayBotReplyStagingCrossServiceEvidence,
} from "../server/platform/railwayBotReplyStagingCrossServiceEvidence.ts";
import {
  issueRailwayBotReplyStagingReleaseEvidence,
  RailwayBotReplyStagingReleaseEvidenceIssuerError,
  railwayBotReplyStagingReleaseEvidenceIssuerVersion,
} from "../server/platform/railwayBotReplyStagingReleaseEvidenceIssuer.ts";

const release = Object.freeze({
  releaseId: `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
  artifactDigest: `sha256:${"c".repeat(64)}`,
});
const clock = Object.freeze({
  now: () => new Date("2026-08-24T14:00:00.000Z"),
});

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

function dependencies(overrides = {}) {
  return {
    async readCurrentReleaseIdentity() {
      return release;
    },
    async inspectCrossServiceActivation() {
      return readyReport();
    },
    clock,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    expectedRelease: release,
    lifetimeSeconds: 600,
    ...overrides,
  };
}

test("issues evidence only after the same release is observed twice", async () => {
  const calls = [];
  const result = await issueRailwayBotReplyStagingReleaseEvidence(
    input(),
    dependencies({
      async readCurrentReleaseIdentity() {
        calls.push("release");
        return release;
      },
      async inspectCrossServiceActivation() {
        calls.push("activation");
        return readyReport();
      },
    }),
  );

  assert.deepEqual(calls, ["release", "activation", "release"]);
  assert.equal(result.status, "issued");
  assert.equal(
    result.issuerVersion,
    railwayBotReplyStagingReleaseEvidenceIssuerVersion,
  );
  assert.equal(result.expiresAt, "2026-08-24T14:10:00.000Z");
  assert.equal(
    inspectRailwayBotReplyStagingCrossServiceEvidence({
      APP_RELEASE_ID: release.releaseId,
      APP_DEPLOYED_COMMIT_SHA: release.commitSha,
      APP_DEPLOYMENT_ARTIFACT_DIGEST: release.artifactDigest,
      BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON: result.evidenceJson,
    }, new Date("2026-08-24T14:05:00.000Z")).status,
    "configured",
  );
});

test("blocks when the expected release is not current", async () => {
  let activationCalls = 0;
  const result = await issueRailwayBotReplyStagingReleaseEvidence(
    input(),
    dependencies({
      async readCurrentReleaseIdentity() {
        return { ...release, commitSha: "d".repeat(40) };
      },
      async inspectCrossServiceActivation() {
        activationCalls += 1;
        return readyReport();
      },
    }),
  );

  assert.equal(result.code, "BOT_REPLY_STAGING_RELEASE_IDENTITY_CHANGED");
  assert.equal(result.evidenceJson, null);
  assert.equal(activationCalls, 0);
});

test("blocks release drift observed after activation", async () => {
  let reads = 0;
  const result = await issueRailwayBotReplyStagingReleaseEvidence(
    input(),
    dependencies({
      async readCurrentReleaseIdentity() {
        reads += 1;
        return reads === 1
          ? release
          : { ...release, artifactDigest: `sha256:${"d".repeat(64)}` };
      },
    }),
  );

  assert.equal(result.code, "BOT_REPLY_STAGING_RELEASE_IDENTITY_CHANGED");
  assert.equal(result.evidenceDigest, null);
});

test("blocks a non-ready activation report without emitting evidence", async () => {
  const result = await issueRailwayBotReplyStagingReleaseEvidence(
    input(),
    dependencies({
      async inspectCrossServiceActivation() {
        return readyReport({ status: "blocked" });
      },
    }),
  );

  assert.equal(result.code, "BOT_REPLY_STAGING_RELEASE_ACTIVATION_REQUIRED");
  assert.equal(result.evidenceJson, null);
});

test("contains dependency and clock failures in bounded output", async () => {
  for (const currentDependencies of [
    dependencies({
      async readCurrentReleaseIdentity() {
        throw new Error("secret-release-reader-failure");
      },
    }),
    dependencies({
      async inspectCrossServiceActivation() {
        throw new Error("secret-activation-failure");
      },
    }),
    dependencies({ clock: { now: () => new Date("invalid") } }),
  ]) {
    const result = await issueRailwayBotReplyStagingReleaseEvidence(
      input(),
      currentDependencies,
    );
    assert.equal(
      result.code,
      "BOT_REPLY_STAGING_RELEASE_DEPENDENCY_UNAVAILABLE",
    );
    assert.doesNotMatch(JSON.stringify(result), /secret/i);
  }
});

test("rejects malformed or extended input and dependencies", async () => {
  for (const invalidInput of [
    input({ lifetimeSeconds: 59 }),
    input({ expectedRelease: { ...release, tenantId: 7 } }),
    { ...input(), extension: true },
  ]) {
    await assert.rejects(
      issueRailwayBotReplyStagingReleaseEvidence(
        invalidInput,
        dependencies(),
      ),
      (error) =>
        error instanceof RailwayBotReplyStagingReleaseEvidenceIssuerError &&
        error.code === "input-invalid",
    );
  }

  await assert.rejects(
    issueRailwayBotReplyStagingReleaseEvidence(
      input(),
      { ...dependencies(), extension: true },
    ),
    (error) =>
      error instanceof RailwayBotReplyStagingReleaseEvidenceIssuerError &&
      error.code === "dependencies-invalid",
  );
});
