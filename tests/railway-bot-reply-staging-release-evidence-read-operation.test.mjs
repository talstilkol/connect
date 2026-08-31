import assert from "node:assert/strict";
import test from "node:test";

import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";
import {
  createRailwayBotReplyStagingCrossServiceEvidence,
} from "../server/platform/railwayBotReplyStagingCrossServiceEvidence.ts";
import {
  createRailwayBotReplyStagingReleaseEvidenceReadOperation,
  RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_OPERATION,
} from "../server/platform/railwayBotReplyStagingReleaseEvidenceReadOperation.ts";
import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
} from "../server/platform/railwayApiContract.ts";

const release = Object.freeze({
  releaseId: `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
  artifactDigest: `sha256:${"c".repeat(64)}`,
});
const verifiedAt = "2026-08-24T12:00:00.000Z";

function createEvidenceJson() {
  return JSON.stringify(
    createRailwayBotReplyStagingCrossServiceEvidence({
      report: {
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
      },
      ...release,
      lifetimeSeconds: 600,
    }, {
      now: () => new Date(verifiedAt),
    }),
  );
}

function request(overrides = {}) {
  return {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    operation:
      RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_OPERATION,
    requestKind: "query",
    idempotencyKey: null,
    payload: {},
    ...overrides,
  };
}

function operation(overrides = {}) {
  const evidenceJson = createEvidenceJson();
  const evidenceDigest = JSON.parse(evidenceJson).evidenceDigest;
  return createRailwayBotReplyStagingReleaseEvidenceReadOperation({
    repository: {
      clock: {
        now: () => new Date("2026-08-24T12:05:00.000Z"),
      },
      async readCurrentEvidenceState() {
        return {
          release,
          version: 1,
          evidenceDigest,
          evidenceJson,
          ...overrides,
        };
      },
    },
  });
}

test("reads one verified PostgreSQL release evidence DTO", async () => {
  const result = await operation().execute({}, {}, request());

  assert.deepEqual(Object.keys(result).sort(), [
    "evidenceDigest",
    "evidenceJson",
    "evidenceVersion",
    "schemaVersion",
    "storageMode",
  ]);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.storageMode, "postgresql");
  assert.equal(result.evidenceVersion, 1);
  assert.equal(result.evidenceDigest, JSON.parse(result.evidenceJson)
    .evidenceDigest);
  assert.ok(Object.isFrozen(result));
});

test("fails closed for empty, expired, mismatched or corrupt evidence", async () => {
  const cases = [
    { version: 0, evidenceDigest: null, evidenceJson: null },
    { evidenceDigest: `bot_reply_staging_cross_service_evidence_v1_${"d".repeat(64)}` },
    { release: { ...release, commitSha: "d".repeat(40) } },
    { evidenceJson: "{broken" },
  ];

  for (const state of cases) {
    await assert.rejects(
      operation(state).execute({}, {}, request()),
      (error) =>
        error instanceof RailwayApiDispatchError &&
        error.code === "DEPENDENCY_UNAVAILABLE",
    );
  }

  const evidenceJson = createEvidenceJson();
  const evidenceDigest = JSON.parse(evidenceJson).evidenceDigest;
  const expiredOperation =
    createRailwayBotReplyStagingReleaseEvidenceReadOperation({
      repository: {
        clock: {
          now: () => new Date("2026-08-24T12:10:00.000Z"),
        },
        async readCurrentEvidenceState() {
          return { release, version: 1, evidenceDigest, evidenceJson };
        },
      },
    });
  await assert.rejects(
    expiredOperation.execute({}, {}, request()),
    (error) =>
      error instanceof RailwayApiDispatchError &&
      error.code === "DEPENDENCY_UNAVAILABLE",
  );
});

test("rejects extended requests and malformed dependencies", async () => {
  await assert.rejects(
    operation().execute({}, { extension: true }, request()),
    (error) =>
      error instanceof RailwayApiDispatchError &&
      error.code === "INVALID_REQUEST",
  );
  assert.throws(
    () => createRailwayBotReplyStagingReleaseEvidenceReadOperation({
      repository: {
        async readCurrentEvidenceState() {},
      },
    }),
    /dependencies are invalid/,
  );
});
