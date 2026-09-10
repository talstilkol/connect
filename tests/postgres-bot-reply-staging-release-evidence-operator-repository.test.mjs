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
  createPostgresBotReplyStagingReleaseEvidenceOperatorRepository,
  deriveBotReplyStagingReleaseEvidenceOperatorEventKey,
  postgresBotReplyStagingReleaseEvidenceOperatorSql,
  RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
} from "../server/platform/postgresBotReplyStagingReleaseEvidenceOperatorRepository.ts";

const release = Object.freeze({
  releaseId: `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
  artifactDigest: `sha256:${"c".repeat(64)}`,
});
const actorExternalUserId = "system-admin-primary";
const idempotencyKey = `connect_idempotency_v1_${"d".repeat(64)}`;
const verifiedAt = "2026-08-25T10:00:00.000Z";

function evidence() {
  return createRailwayBotReplyStagingCrossServiceEvidence({
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
  }, { now: () => new Date(verifiedAt) });
}

function command(overrides = {}) {
  const issued = evidence();
  return {
    write: {
      expectedRelease: release,
      expectedVersion: 0,
      expectedEvidenceDigest: null,
      nextEvidenceDigest: issued.evidenceDigest,
      nextEvidenceJson: JSON.stringify(issued),
    },
    idempotencyKey,
    actorExternalUserId,
    ...overrides,
  };
}

function rowFromPublish(parameters, resultStatus = "stored") {
  if (resultStatus === "conflict") {
    return {
      resultStatus,
      eventKey: null,
      releaseId: null,
      commitSha: null,
      artifactDigest: null,
      operationId: null,
      idempotencyKey: null,
      actorExternalUserId: null,
      expectedVersion: null,
      expectedEvidenceDigest: null,
      publishedVersion: null,
      evidenceDigest: null,
      evidenceExpiresAt: null,
      occurredAt: null,
    };
  }
  return {
    resultStatus,
    eventKey: parameters[0],
    releaseId: parameters[1],
    commitSha: parameters[2],
    artifactDigest: parameters[3],
    operationId:
      RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
    idempotencyKey: parameters[4],
    actorExternalUserId: parameters[5],
    expectedVersion: parameters[6],
    expectedEvidenceDigest: parameters[7],
    publishedVersion: parameters[6] + 1,
    evidenceDigest: parameters[8],
    evidenceExpiresAt: parameters[11],
    occurredAt: parameters[10],
  };
}

function eventFromPublishRow(row) {
  return {
    eventKey: row.eventKey,
    releaseId: row.releaseId,
    commitSha: row.commitSha,
    artifactDigest: row.artifactDigest,
    operationId: row.operationId,
    idempotencyKey: row.idempotencyKey,
    actorExternalUserId: row.actorExternalUserId,
    expectedVersion: row.expectedVersion,
    expectedEvidenceDigest: row.expectedEvidenceDigest,
    publishedVersion: row.publishedVersion,
    evidenceDigest: row.evidenceDigest,
    evidenceExpiresAt: row.evidenceExpiresAt,
    occurredAt: row.occurredAt,
  };
}

function fixture({ publishStatus = "stored", publishRows = null } = {}) {
  const calls = [];
  let storedEvent = null;
  const transactions = {
    async transaction(options, execute) {
      calls.push({ kind: "transaction", options });
      return execute({
        async query(sql, parameters) {
          calls.push({ kind: "query", sql, parameters });
          if (
            sql === postgresBotReplyStagingReleaseEvidenceOperatorSql
              .initializeAndPublishWithAudit
          ) {
            const rows = publishRows === null
              ? [rowFromPublish(parameters, publishStatus)]
              : publishRows;
            if (
              rows.length === 1 &&
              (rows[0].resultStatus === "stored" ||
                rows[0].resultStatus === "replayed")
            ) {
              storedEvent = eventFromPublishRow(rows[0]);
            }
            return { rows, rowCount: rows.length };
          }
          if (
            sql === postgresBotReplyStagingReleaseEvidenceOperatorSql.findEvent
          ) {
            const rows = storedEvent === null ? [] : [storedEvent];
            return { rows, rowCount: rows.length };
          }
          throw new Error("unexpected SQL");
        },
      });
    },
  };
  const repository =
    createPostgresBotReplyStagingReleaseEvidenceOperatorRepository(
      transactions,
      release,
      { now: () => new Date("2026-08-25T10:01:00.000Z") },
    );
  return { repository, calls, getStoredEvent: () => storedEvent };
}

test("commits the evidence CAS and actor audit in one transaction", async () => {
  const testFixture = fixture();
  const result = await testFixture.repository
    .compareAndSetEvidenceWithAudit(command());

  assert.equal(result.status, "stored");
  assert.equal(result.version, 1);
  assert.equal(result.event.actorExternalUserId, actorExternalUserId);
  assert.equal(result.event.idempotencyKey, idempotencyKey);
  assert.equal(
    result.event.operationId,
    RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
  );
  assert.equal(
    result.event.eventKey,
    deriveBotReplyStagingReleaseEvidenceOperatorEventKey({
      release,
      operationId:
        RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
      idempotencyKey,
      actorExternalUserId,
      expectedVersion: 0,
      expectedEvidenceDigest: null,
      publishedVersion: 1,
      evidenceDigest: evidence().evidenceDigest,
      evidenceExpiresAt: "2026-08-25T10:10:00.000Z",
      occurredAt: verifiedAt,
    }),
  );
  const queries = testFixture.calls.filter((call) => call.kind === "query");
  assert.deepEqual(queries.map((call) => call.sql), [
    postgresBotReplyStagingReleaseEvidenceOperatorSql
      .initializeAndPublishWithAudit,
  ]);
  assert.match(
    queries[0].sql,
    /public\.initialize_publish_bot_reply_staging_evidence_with_audit/,
  );
  assert.doesNotMatch(
    queries[0].sql,
    /\b(?:UPDATE|INSERT\s+INTO)\s+(?:public\.)?bot_reply_staging_release_evidence/i,
  );
  assert.equal(
    testFixture.calls.filter((call) => call.kind === "transaction").length,
    1,
  );
});

test("reads back the exact immutable operator event", async () => {
  const testFixture = fixture();
  const stored = await testFixture.repository
    .compareAndSetEvidenceWithAudit(command());
  const read = await testFixture.repository.findOperatorEvent(idempotencyKey);

  assert.deepEqual(read, stored.event);
  assert.ok(Object.isFrozen(read));
});

test("returns the atomic function conflict without partial evidence", async () => {
  const testFixture = fixture({ publishStatus: "conflict" });
  const result = await testFixture.repository
    .compareAndSetEvidenceWithAudit(command());

  assert.deepEqual(result, {
    status: "conflict",
    version: null,
    event: null,
  });
  assert.equal(
    testFixture.calls.filter((call) => call.kind === "query").length,
    1,
  );
});

test("preserves an exact atomic replay result", async () => {
  const testFixture = fixture({ publishStatus: "replayed" });
  const result = await testFixture.repository
    .compareAndSetEvidenceWithAudit(command());

  assert.equal(result.status, "replayed");
  assert.equal(result.version, 1);
  assert.equal(result.event.idempotencyKey, idempotencyKey);
});

test("fails closed when the atomic function returns no row", async () => {
  const testFixture = fixture({ publishRows: [] });
  await assert.rejects(
    testFixture.repository.compareAndSetEvidenceWithAudit(command()),
    /publish returned no result/,
  );
});

test("rejects malformed actor, key, extension and evidence before SQL", async () => {
  for (const invalid of [
    command({ actorExternalUserId: " operator " }),
    command({ idempotencyKey: "invalid" }),
    { ...command(), extension: true },
    command({ write: { ...command().write, nextEvidenceJson: "{}" } }),
  ]) {
    const testFixture = fixture();
    await assert.rejects(
      testFixture.repository.compareAndSetEvidenceWithAudit(invalid),
    );
    assert.equal(
      testFixture.calls.some((call) => call.kind === "query"),
      false,
    );
  }
});
