import assert from "node:assert/strict";
import test from "node:test";

import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";
import {
  deriveBotReplyStagingReleaseEvidenceOperatorEventKey,
  RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
} from "../server/platform/postgresBotReplyStagingReleaseEvidenceOperatorRepository.ts";
import {
  operateRailwayBotReplyStagingReleaseEvidence,
  railwayBotReplyStagingReleaseEvidenceOperatorConfirmation,
  RailwayBotReplyStagingReleaseEvidenceOperatorError,
} from "../server/platform/railwayBotReplyStagingReleaseEvidenceOperator.ts";

const release = Object.freeze({
  releaseId: `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
  artifactDigest: `sha256:${"c".repeat(64)}`,
});
const actorExternalUserId = "system-admin-primary";
const idempotencyKey = `connect_idempotency_v1_${"d".repeat(64)}`;
const requestedAt = "2026-08-25T10:00:00.000Z";

function input(overrides = {}) {
  return {
    schemaVersion: 1,
    confirmation:
      railwayBotReplyStagingReleaseEvidenceOperatorConfirmation,
    expectedRelease: release,
    expectedVersion: 0,
    expectedEvidenceDigest: null,
    lifetimeSeconds: 600,
    requestedAt,
    ...overrides,
  };
}

function context(overrides = {}) {
  return { actorExternalUserId, idempotencyKey, ...overrides };
}

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

function fixture({
  activationAuthorization = "approved",
  activationReport = readyReport(),
  compareStatus = "stored",
  hideAuditReadBack = false,
} = {}) {
  const calls = {
    authorization: 0,
    find: [],
    release: 0,
    activation: 0,
    read: 0,
    compare: [],
  };
  let state = {
    release,
    version: 0,
    evidenceDigest: null,
    evidenceJson: null,
  };
  let event = null;
  const repository = {
    clock: { now: () => new Date("2026-08-25T10:01:00.000Z") },
    async readCurrentEvidenceState() {
      calls.read += 1;
      return state;
    },
    async findOperatorEvent(key) {
      calls.find.push(key);
      return hideAuditReadBack ? null : event;
    },
    async compareAndSetEvidenceWithAudit(command) {
      calls.compare.push(structuredClone(command));
      if (compareStatus === "conflict") {
        return { status: "conflict", version: null, event: null };
      }
      const parsed = JSON.parse(command.write.nextEvidenceJson);
      const eventWithoutKey = {
        release,
        operationId:
          RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
        idempotencyKey: command.idempotencyKey,
        actorExternalUserId: command.actorExternalUserId,
        expectedVersion: command.write.expectedVersion,
        expectedEvidenceDigest: command.write.expectedEvidenceDigest,
        publishedVersion: command.write.expectedVersion + 1,
        evidenceDigest: command.write.nextEvidenceDigest,
        evidenceExpiresAt: parsed.expiresAt,
        occurredAt: parsed.verifiedAt,
      };
      event = Object.freeze({
        eventKey:
          deriveBotReplyStagingReleaseEvidenceOperatorEventKey(
            eventWithoutKey,
          ),
        ...eventWithoutKey,
      });
      state = {
        release,
        version: 1,
        evidenceDigest: command.write.nextEvidenceDigest,
        evidenceJson: command.write.nextEvidenceJson,
      };
      return { status: "stored", version: 1, event };
    },
  };
  const dependencies = {
    repository,
    async readCurrentReleaseIdentity() {
      calls.release += 1;
      return release;
    },
    async inspectCrossServiceActivation() {
      calls.activation += 1;
      return activationReport;
    },
    async readActivationAuthorization() {
      calls.authorization += 1;
      return activationAuthorization;
    },
  };
  return { dependencies, calls, getEvent: () => event };
}

test("issues, atomically initializes with audit and verifies readback", async () => {
  const testFixture = fixture();
  const result = await operateRailwayBotReplyStagingReleaseEvidence(
    input(),
    context(),
    testFixture.dependencies,
  );

  assert.equal(result.status, "published");
  assert.equal(result.outcome, "published");
  assert.equal(result.version, 1);
  assert.equal(result.expiresAt, "2026-08-25T10:10:00.000Z");
  assert.equal(result.auditEventKey, testFixture.getEvent().eventKey);
  assert.equal(testFixture.calls.release, 2);
  assert.equal(testFixture.calls.activation, 1);
  assert.equal(testFixture.calls.compare.length, 1);
  assert.equal(
    testFixture.calls.compare[0].actorExternalUserId,
    actorExternalUserId,
  );
  assert.equal(
    testFixture.calls.compare[0].idempotencyKey,
    idempotencyKey,
  );
  assert.doesNotMatch(JSON.stringify(result), /actor|token|secret/i);
  assert.ok(Object.isFrozen(result));
});

test("replays only the same actor-bound immutable operator event", async () => {
  const testFixture = fixture();
  const first = await operateRailwayBotReplyStagingReleaseEvidence(
    input(),
    context(),
    testFixture.dependencies,
  );
  const beforeReplay = structuredClone(testFixture.calls);
  const replay = await operateRailwayBotReplyStagingReleaseEvidence(
    input(),
    context(),
    testFixture.dependencies,
  );

  assert.equal(first.outcome, "published");
  assert.equal(replay.outcome, "replayed");
  assert.equal(replay.auditEventKey, first.auditEventKey);
  assert.equal(testFixture.calls.activation, beforeReplay.activation);
  assert.equal(testFixture.calls.compare.length, beforeReplay.compare.length);

  const forgedActor = await operateRailwayBotReplyStagingReleaseEvidence(
    input(),
    context({ actorExternalUserId: "system-admin-backup" }),
    testFixture.dependencies,
  );
  assert.equal(
    forgedActor.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_PRECONDITION_FAILED",
  );
});

test("keeps activation blocked until the external approval exists", async () => {
  const testFixture = fixture({ activationAuthorization: "blocked" });
  const result = await operateRailwayBotReplyStagingReleaseEvidence(
    input(),
    context(),
    testFixture.dependencies,
  );

  assert.equal(
    result.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_ACTIVATION_REQUIRED",
  );
  assert.equal(testFixture.calls.find.length, 0);
  assert.equal(testFixture.calls.compare.length, 0);
});

test("does not publish when cross-service evidence is not ready", async () => {
  const testFixture = fixture({
    activationReport: readyReport({
      status: "blocked",
      code: "BOT_REPLY_STAGING_CROSS_SERVICE_REQUIRED",
      passedCheckCount: 0,
      checks: railwayBotReplyStagingCrossServiceCheckIds.map((id) => ({
        id,
        status: "blocked",
      })),
    }),
  });
  const result = await operateRailwayBotReplyStagingReleaseEvidence(
    input(),
    context(),
    testFixture.dependencies,
  );

  assert.equal(
    result.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_RELEASE_NOT_READY",
  );
  assert.equal(testFixture.calls.compare.length, 0);
});

test("fails closed for CAS conflict and missing audit readback", async () => {
  const conflict = fixture({ compareStatus: "conflict" });
  const conflictResult = await operateRailwayBotReplyStagingReleaseEvidence(
    input(),
    context(),
    conflict.dependencies,
  );
  assert.equal(
    conflictResult.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_WRITE_CONFLICT",
  );

  const missingAudit = fixture({ hideAuditReadBack: true });
  const missingResult = await operateRailwayBotReplyStagingReleaseEvidence(
    input(),
    context(),
    missingAudit.dependencies,
  );
  assert.equal(
    missingResult.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_AUDIT_READ_BACK_MISMATCH",
  );
});

test("rejects stale, malformed and extended requests without persistence", async () => {
  const stale = fixture();
  const staleResult = await operateRailwayBotReplyStagingReleaseEvidence(
    input({ requestedAt: "2026-08-25T09:00:00.000Z" }),
    context(),
    stale.dependencies,
  );
  assert.equal(
    staleResult.code,
    "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_REQUEST_NOT_CURRENT",
  );
  assert.equal(stale.calls.find.length, 0);

  for (const invalid of [
    input({ expectedVersion: 1 }),
    input({ confirmation: "wrong" }),
    { ...input(), extension: true },
  ]) {
    const testFixture = fixture();
    await assert.rejects(
      operateRailwayBotReplyStagingReleaseEvidence(
        invalid,
        context(),
        testFixture.dependencies,
      ),
      (error) =>
        error instanceof RailwayBotReplyStagingReleaseEvidenceOperatorError &&
        error.code === "input-invalid",
    );
    assert.equal(testFixture.calls.authorization, 0);
  }
});
