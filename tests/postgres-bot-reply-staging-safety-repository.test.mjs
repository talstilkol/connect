import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBotReplyStagingSafetyRepository,
  deriveBotReplyStagingAuthorizationEventKey,
  postgresBotReplyStagingSafetySql,
} from "../server/platform/postgresBotReplyStagingSafetyRepository.ts";

const checkedAt = "2026-08-21T14:00:00.000Z";

function command(overrides = {}) {
  return {
    tenantId: 7,
    authorizationVersion: 1,
    status: "approved",
    connectionVersion: 3,
    policyVersion: 4,
    recipientFingerprint: `sha256:${"a".repeat(64)}`,
    recipientOptInRecordedAt: "2026-08-21T13:00:00.000Z",
    recipientExpiresAt: "2026-08-22T13:00:00.000Z",
    rateLimitApprovedAt: "2026-08-21T13:05:00.000Z",
    rateLimitExpiresAt: "2026-08-22T13:05:00.000Z",
    rateLimitMethodFingerprint: `sha256:${"b".repeat(64)}`,
    actorExternalUserId: "system-admin-primary",
    recordedAt: "2026-08-21T13:10:00.000Z",
    ...overrides,
  };
}

function eventRow(overrides = {}) {
  const input = command();
  return {
    eventKey: deriveBotReplyStagingAuthorizationEventKey(input),
    tenantId: 7,
    authorizationVersion: 1,
    status: "approved",
    environment: "staging",
    connectionMode: "approved-staging-waba",
    connectionVersion: 3,
    policyVersion: 4,
    recipientFingerprint: input.recipientFingerprint,
    recipientOptInRecorded: true,
    recipientOptInRecordedAt: input.recipientOptInRecordedAt,
    recipientExpiresAt: input.recipientExpiresAt,
    rateLimitApprovedBy: "tal",
    rateLimitApprovedAt: input.rateLimitApprovedAt,
    rateLimitExpiresAt: input.rateLimitExpiresAt,
    rateLimitMethodFingerprint: input.rateLimitMethodFingerprint,
    actorExternalUserId: input.actorExternalUserId,
    recordedAt: input.recordedAt,
    createdAt: input.recordedAt,
    ...overrides,
  };
}

function safetyRow(overrides = {}) {
  return {
    environment: "staging",
    connectionMode: "approved-staging-waba",
    connectionStatus: "connected",
    connectionVersion: 3,
    policyVersion: 4,
    deliveryState: "enabled",
    policyEvidenceExpiresAt: "2026-08-22T12:00:00.000Z",
    graphApiVersion: "v24.0",
    credentialSource: "encrypted-vault",
    executionBoundary: "railway-bullmq-bot-reply-worker",
    evidenceSource: "durable-postgres",
    recipientStatus: "approved",
    optInRecorded: true,
    recipientExpiresAt: "2026-08-22T13:00:00.000Z",
    recipientFingerprint: `sha256:${"a".repeat(64)}`,
    rateLimitStatus: "approved",
    approvedBy: "tal",
    approvedAt: "2026-08-21T13:05:00.000Z",
    rateLimitExpiresAt: "2026-08-22T13:05:00.000Z",
    methodFingerprint: `sha256:${"b".repeat(64)}`,
    ...overrides,
  };
}

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function fixture(results) {
  const calls = [];
  const remaining = [...results];
  const repository = createPostgresBotReplyStagingSafetyRepository({
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        if (remaining.length === 0) throw new Error("unexpected query");
        return remaining.shift();
      },
    },
    clock: { now: () => new Date(checkedAt) },
  });
  return { calls, remaining, repository };
}

test("records deterministic, fingerprint-only staging authorization evidence", async () => {
  const testFixture = fixture([queryResult([eventRow()])]);
  const result = await testFixture.repository.record(command());

  assert.deepEqual(result, eventRow());
  assert.equal(testFixture.calls[0].sql, postgresBotReplyStagingSafetySql.insert);
  assert.equal(testFixture.calls[0].parameters.length, 14);
  assert.equal(
    testFixture.calls[0].parameters[0],
    deriveBotReplyStagingAuthorizationEventKey(command()),
  );
  assert.match(testFixture.calls[0].sql, /'approved-staging-waba'/);
  assert.match(testFixture.calls[0].sql, /'tal'/);
  assert.match(testFixture.calls[0].sql, /ON CONFLICT DO NOTHING/);
  assert.doesNotMatch(JSON.stringify(testFixture.calls[0]), /phone|token|secret/i);
  assert.equal(testFixture.remaining.length, 0);
});

test("replays an exact authorization and rejects a competing version", async () => {
  const replay = fixture([queryResult([]), queryResult([eventRow()])]);
  assert.deepEqual(await replay.repository.record(command()), eventRow());
  assert.equal(
    replay.calls[1].sql,
    postgresBotReplyStagingSafetySql.findByEventKey,
  );

  const conflict = fixture([queryResult([]), queryResult([])]);
  await assert.rejects(
    conflict.repository.record(command()),
    /staging authorization conflicts/,
  );
});

test("loads the latest immutable authorization event for safe revocation", async () => {
  const present = fixture([queryResult([eventRow()])]);
  assert.deepEqual(await present.repository.findLatest(7), eventRow());
  assert.equal(
    present.calls[0].sql,
    postgresBotReplyStagingSafetySql.findLatest,
  );
  assert.deepEqual(present.calls[0].parameters, [7]);
  assert.match(present.calls[0].sql, /ORDER BY authorization_version DESC/);

  const missing = fixture([queryResult([])]);
  assert.equal(await missing.repository.findLatest(7), null);
});

test("reads only a current joined PostgreSQL safety snapshot", async () => {
  const testFixture = fixture([queryResult([safetyRow()])]);
  assert.deepEqual(await testFixture.repository.read(7), {
    environment: "staging",
    connectionMode: "approved-staging-waba",
    connectionStatus: "connected",
    connectionVersion: 3,
    policyVersion: 4,
    deliveryState: "enabled",
    policyEvidenceExpiresAt: "2026-08-22T12:00:00.000Z",
    graphApiVersion: "v24.0",
    credentialSource: "encrypted-vault",
    executionBoundary: "railway-bullmq-bot-reply-worker",
    evidenceSource: "durable-postgres",
    recipientAuthorization: {
      status: "approved",
      optInRecorded: true,
      expiresAt: "2026-08-22T13:00:00.000Z",
      recipientFingerprint: `sha256:${"a".repeat(64)}`,
    },
    rateLimitTestApproval: {
      status: "approved",
      approvedBy: "tal",
      approvedAt: "2026-08-21T13:05:00.000Z",
      expiresAt: "2026-08-22T13:05:00.000Z",
      methodFingerprint: `sha256:${"b".repeat(64)}`,
    },
  });
  assert.equal(
    testFixture.calls[0].sql,
    postgresBotReplyStagingSafetySql.readCurrent,
  );
  assert.deepEqual(testFixture.calls[0].parameters, [7, checkedAt]);
  assert.match(testFixture.calls[0].sql, /connection\.status = 'connected'/);
  assert.match(testFixture.calls[0].sql, /policy\.delivery_state = 'enabled'/);
  assert.match(testFixture.calls[0].sql, /meta_credential_envelopes/);
});

test("hides missing, revoked, expired or otherwise non-current evidence", async () => {
  const testFixture = fixture([queryResult([])]);
  assert.equal(await testFixture.repository.read(7), null);
});

test("rejects invalid commands and malformed PostgreSQL rows", async () => {
  const invalidTimeline = fixture([]);
  await assert.rejects(
    invalidTimeline.repository.record(command({
      rateLimitExpiresAt: "2026-08-21T13:00:00.000Z",
    })),
    /timeline is invalid/,
  );

  const malformedSafety = fixture([queryResult([safetyRow({
    approvedBy: "someone-else",
  })])]);
  await assert.rejects(
    malformedSafety.repository.read(7),
    /invalid staging safety evidence/,
  );

  const conflictingEvent = fixture([queryResult([eventRow({
    actorExternalUserId: "different-actor",
  })])]);
  await assert.rejects(
    conflictingEvent.repository.record(command()),
    /conflicting staging authorization/,
  );
});

test("derives stable keys and binds revocation into a different identity", () => {
  const first = deriveBotReplyStagingAuthorizationEventKey(command());
  assert.equal(first, deriveBotReplyStagingAuthorizationEventKey(command()));
  assert.notEqual(
    first,
    deriveBotReplyStagingAuthorizationEventKey(command({
      status: "revoked",
      authorizationVersion: 2,
      recordedAt: "2026-08-21T14:10:00.000Z",
    })),
  );
});
