import assert from "node:assert/strict";
import test from "node:test";

import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";
import {
  issueRailwayBotReplyStagingReleaseEvidence,
} from "../server/platform/railwayBotReplyStagingReleaseEvidenceIssuer.ts";
import {
  publishRailwayBotReplyStagingReleaseEvidence,
  RailwayBotReplyStagingReleaseEvidencePublisherError,
  railwayBotReplyStagingReleaseEvidencePublisherVersion,
} from "../server/platform/railwayBotReplyStagingReleaseEvidencePublisher.ts";

const release = Object.freeze({
  releaseId: `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
  artifactDigest: `sha256:${"c".repeat(64)}`,
});
const clock = Object.freeze({
  now: () => new Date("2026-08-24T15:00:00.000Z"),
});

function readyReport() {
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
  };
}

async function issuedEvidence() {
  return issueRailwayBotReplyStagingReleaseEvidence({
    expectedRelease: release,
    lifetimeSeconds: 600,
  }, {
    async readCurrentReleaseIdentity() {
      return release;
    },
    async inspectCrossServiceActivation() {
      return readyReport();
    },
    clock,
  });
}

function emptyState() {
  return {
    release,
    version: 0,
    evidenceDigest: null,
    evidenceJson: null,
  };
}

function input(evidence, overrides = {}) {
  return {
    expectedRelease: release,
    expectedVersion: 0,
    expectedEvidenceDigest: null,
    issuedEvidence: evidence,
    ...overrides,
  };
}

function statefulDependencies(initialState = emptyState()) {
  let state = initialState;
  const writes = [];
  return {
    dependencies: {
      async readCurrentEvidenceState() {
        return state;
      },
      async compareAndSetEvidence(write) {
        writes.push(write);
        if (
          state.version !== write.expectedVersion ||
          state.evidenceDigest !== write.expectedEvidenceDigest
        ) {
          return { status: "conflict", version: null };
        }
        state = {
          release: write.expectedRelease,
          version: write.expectedVersion + 1,
          evidenceDigest: write.nextEvidenceDigest,
          evidenceJson: write.nextEvidenceJson,
        };
        return { status: "stored", version: state.version };
      },
      clock,
    },
    writes,
    currentState() {
      return state;
    },
  };
}

test("publishes with compare-and-set and verifies the exact read back", async () => {
  const evidence = await issuedEvidence();
  const fixture = statefulDependencies();
  const result = await publishRailwayBotReplyStagingReleaseEvidence(
    input(evidence),
    fixture.dependencies,
  );

  assert.deepEqual(result, {
    schemaVersion: 1,
    publisherVersion:
      railwayBotReplyStagingReleaseEvidencePublisherVersion,
    status: "published",
    code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISHED",
    version: 1,
    replayed: false,
    evidenceDigest: evidence.evidenceDigest,
    expiresAt: evidence.expiresAt,
  });
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.currentState().evidenceJson, evidence.evidenceJson);
});

test("returns an identical completed publication as a replay", async () => {
  const evidence = await issuedEvidence();
  const fixture = statefulDependencies({
    release,
    version: 1,
    evidenceDigest: evidence.evidenceDigest,
    evidenceJson: evidence.evidenceJson,
  });
  const result = await publishRailwayBotReplyStagingReleaseEvidence(
    input(evidence),
    fixture.dependencies,
  );

  assert.equal(result.status, "published");
  assert.equal(result.replayed, true);
  assert.equal(fixture.writes.length, 0);
});

test("blocks a release, version or previous-digest precondition mismatch", async () => {
  const evidence = await issuedEvidence();
  const previousDigest =
    `bot_reply_staging_cross_service_evidence_v1_${"d".repeat(64)}`;
  for (const state of [
    { ...emptyState(), release: { ...release, commitSha: "d".repeat(40) } },
    { ...emptyState(), version: 2 },
    {
      ...emptyState(),
      evidenceDigest: previousDigest,
      evidenceJson: "{}",
    },
  ]) {
    const fixture = statefulDependencies(state);
    const result = await publishRailwayBotReplyStagingReleaseEvidence(
      input(evidence),
      fixture.dependencies,
    );
    assert.equal(
      result.code,
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PRECONDITION_FAILED",
    );
    assert.equal(fixture.writes.length, 0);
  }

  const corruptState = statefulDependencies({
    ...emptyState(),
    evidenceDigest: previousDigest,
    evidenceJson: "{}",
  });
  const corruptResult = await publishRailwayBotReplyStagingReleaseEvidence(
    input(evidence, { expectedEvidenceDigest: previousDigest }),
    corruptState.dependencies,
  );
  assert.equal(
    corruptResult.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PRECONDITION_FAILED",
  );
  assert.equal(corruptState.writes.length, 0);
});

test("keeps a compare-and-set conflict distinct from read-back mismatch", async () => {
  const evidence = await issuedEvidence();
  const conflict = await publishRailwayBotReplyStagingReleaseEvidence(
    input(evidence),
    {
      ...statefulDependencies().dependencies,
      async compareAndSetEvidence() {
        return { status: "conflict", version: null };
      },
    },
  );
  assert.equal(
    conflict.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_WRITE_CONFLICT",
  );

  const readBackMismatch = await publishRailwayBotReplyStagingReleaseEvidence(
    input(evidence),
    {
      ...statefulDependencies().dependencies,
      async compareAndSetEvidence() {
        return { status: "stored", version: 1 };
      },
    },
  );
  assert.equal(
    readBackMismatch.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_BACK_MISMATCH",
  );
});

test("rejects changed or expired issued evidence before storage access", async () => {
  const evidence = await issuedEvidence();
  let reads = 0;
  const dependencies = {
    ...statefulDependencies().dependencies,
    async readCurrentEvidenceState() {
      reads += 1;
      return emptyState();
    },
  };
  const changed = {
    ...evidence,
    evidenceDigest:
      `bot_reply_staging_cross_service_evidence_v1_${"d".repeat(64)}`,
  };
  assert.equal(
    (await publishRailwayBotReplyStagingReleaseEvidence(
      input(changed),
      dependencies,
    )).code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_INVALID",
  );
  assert.equal(reads, 0);

  const expired = await publishRailwayBotReplyStagingReleaseEvidence(
    input(evidence),
    {
      ...dependencies,
      clock: { now: () => new Date(evidence.expiresAt) },
    },
  );
  assert.equal(
    expired.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_INVALID",
  );
  assert.equal(reads, 0);
});

test("contains storage failures without leaking their messages", async () => {
  const evidence = await issuedEvidence();
  for (const dependencies of [
    {
      ...statefulDependencies().dependencies,
      async readCurrentEvidenceState() {
        throw new Error("secret-read-failure");
      },
    },
    {
      ...statefulDependencies().dependencies,
      async compareAndSetEvidence() {
        throw new Error("secret-write-failure");
      },
    },
  ]) {
    const result = await publishRailwayBotReplyStagingReleaseEvidence(
      input(evidence),
      dependencies,
    );
    assert.equal(
      result.code,
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_DEPENDENCY_UNAVAILABLE",
    );
    assert.doesNotMatch(JSON.stringify(result), /secret/i);
  }
});

test("rejects extended input, state, write results and dependencies", async () => {
  const evidence = await issuedEvidence();
  await assert.rejects(
    publishRailwayBotReplyStagingReleaseEvidence(
      { ...input(evidence), extension: true },
      statefulDependencies().dependencies,
    ),
    (error) =>
      error instanceof RailwayBotReplyStagingReleaseEvidencePublisherError &&
      error.code === "input-invalid",
  );
  await assert.rejects(
    publishRailwayBotReplyStagingReleaseEvidence(
      input(evidence),
      { ...statefulDependencies().dependencies, extension: true },
    ),
    (error) =>
      error instanceof RailwayBotReplyStagingReleaseEvidencePublisherError &&
      error.code === "dependencies-invalid",
  );

  const invalidState = await publishRailwayBotReplyStagingReleaseEvidence(
    input(evidence),
    {
      ...statefulDependencies().dependencies,
      async readCurrentEvidenceState() {
        return { ...emptyState(), extension: true };
      },
    },
  );
  assert.equal(
    invalidState.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PRECONDITION_FAILED",
  );

  const invalidWrite = await publishRailwayBotReplyStagingReleaseEvidence(
    input(evidence),
    {
      ...statefulDependencies().dependencies,
      async compareAndSetEvidence() {
        return { status: "stored", version: 1, extension: true };
      },
    },
  );
  assert.equal(
    invalidWrite.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_WRITE_CONFLICT",
  );
});
