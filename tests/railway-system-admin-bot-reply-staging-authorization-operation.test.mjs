import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBotReplyStagingAuthorizationEventKey,
} from "../server/platform/postgresBotReplyStagingSafetyRepository.ts";
import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  botReplyStagingAuthorizationConfirmations,
  createRailwaySystemAdminBotReplyStagingAuthorizationOperation,
  railwaySystemAdminBotReplyStagingAuthorizationPolicy,
} from "../server/platform/railwaySystemAdminBotReplyStagingAuthorizationOperation.ts";

const operationId = "system-admin.bot-reply-staging.authorization";
const talIdentity = "system-admin-tal";
const backupIdentity = "system-admin-backup";
const recordedAt = "2026-08-21T13:25:00.000Z";
const recipientFingerprint = `sha256:${"a".repeat(64)}`;
const methodFingerprint = `sha256:${"b".repeat(64)}`;

function context(externalUserId = talIdentity) {
  return Object.freeze({
    serviceIdentity: Object.freeze({
      provider: "vercel",
      teamSlug: "connect-team",
      projectName: "connect-web",
      environment: "staging",
      subject: "owner:connect-team:project:connect-web:environment:staging",
    }),
    userIdentity: Object.freeze({ externalUserId }),
  });
}

function approvalPayload(overrides = {}) {
  return {
    schemaVersion: 1,
    status: "approved",
    confirmation: botReplyStagingAuthorizationConfirmations.approved,
    targetTenantId: 7,
    authorizationVersion: 1,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    recipientFingerprint,
    recipientOptInRecordedAt: "2026-08-21T13:00:00.000Z",
    recipientExpiresAt: "2026-08-22T13:00:00.000Z",
    rateLimitApprovedAt: "2026-08-21T13:05:00.000Z",
    rateLimitExpiresAt: "2026-08-22T13:05:00.000Z",
    rateLimitMethodFingerprint: methodFingerprint,
    recordedAt,
    ...overrides,
  };
}

function revocationPayload(overrides = {}) {
  return {
    schemaVersion: 1,
    status: "revoked",
    confirmation: botReplyStagingAuthorizationConfirmations.revoked,
    targetTenantId: 7,
    authorizationVersion: 2,
    recordedAt: "2026-08-21T13:29:00.000Z",
    ...overrides,
  };
}

function eventFromCommand(command) {
  return {
    ...structuredClone(command),
    eventKey: deriveBotReplyStagingAuthorizationEventKey(command),
    environment: "staging",
    connectionMode: "approved-staging-waba",
    recipientOptInRecorded: true,
    rateLimitApprovedBy: "tal",
    createdAt: command.recordedAt,
  };
}

function approvedEvent(overrides = {}) {
  const command = {
    tenantId: 7,
    authorizationVersion: 1,
    status: "approved",
    connectionVersion: 3,
    policyVersion: 4,
    recipientFingerprint,
    recipientOptInRecordedAt: "2026-08-21T13:00:00.000Z",
    recipientExpiresAt: "2026-08-22T13:00:00.000Z",
    rateLimitApprovedAt: "2026-08-21T13:05:00.000Z",
    rateLimitExpiresAt: "2026-08-22T13:05:00.000Z",
    rateLimitMethodFingerprint: methodFingerprint,
    actorExternalUserId: talIdentity,
    recordedAt,
    ...overrides,
  };
  return eventFromCommand(command);
}

async function request(payload, overrides = {}) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation: operationId,
    requestKind: "mutation",
    idempotencyKey:
      await deriveRailwayApiDeterministicIdempotencyKey(operationId, payload),
    payload,
    ...overrides,
  };
}

function fixture({
  latest = null,
  findError = null,
  recordError = null,
  quota = { outcome: "allowed" },
  clockValue = "2026-08-21T13:30:00.000Z",
} = {}) {
  const calls = { quota: [], find: [], record: [] };
  const operation =
    createRailwaySystemAdminBotReplyStagingAuthorizationOperation({
      allowedExternalUserIds: [talIdentity, backupIdentity],
      talExternalUserId: talIdentity,
      clock: () => clockValue,
      mutationRateLimit: {
        async consume(subject) {
          calls.quota.push(subject);
          if (quota instanceof Error) throw quota;
          return quota;
        },
      },
      authorizations: {
        async findLatest(tenantId) {
          calls.find.push(tenantId);
          if (findError) throw findError;
          return latest;
        },
        async record(command) {
          calls.record.push(structuredClone(command));
          if (recordError) throw recordError;
          return eventFromCommand(command);
        },
      },
    });
  return { operation, calls };
}

function hasCode(code) {
  return (error) =>
    error instanceof RailwayApiDispatchError && error.code === code;
}

test("publishes an explicit Tal-only approval and provider-free mutation policy", () => {
  assert.deepEqual(railwaySystemAdminBotReplyStagingAuthorizationPolicy, {
    id: operationId,
    requestKind: "mutation",
    authorization: "system-admin-allowlist-and-tal-approval",
    mutationSafety: {
      rateLimit: "system-admin-mutation",
      idempotency: "deterministic-request-key-and-event-replay",
      audit: "append-only-postgres-authorization-event",
      transaction: "postgres-trigger-guarded",
      providerBoundary: "none",
    },
  });
  assert.ok(Object.isFrozen(
    railwaySystemAdminBotReplyStagingAuthorizationPolicy,
  ));
});

test("allows only Tal to record one exact approval without raw recipient data", async () => {
  const testFixture = fixture();
  const payload = approvalPayload();
  const result = await testFixture.operation.execute(
    context(),
    payload,
    await request(payload),
  );

  assert.deepEqual(testFixture.calls.quota, [`${talIdentity}:${operationId}`]);
  assert.deepEqual(testFixture.calls.find, [7]);
  assert.deepEqual(testFixture.calls.record, [{
    tenantId: 7,
    authorizationVersion: 1,
    status: "approved",
    connectionVersion: 3,
    policyVersion: 4,
    recipientFingerprint,
    recipientOptInRecordedAt: "2026-08-21T13:00:00.000Z",
    recipientExpiresAt: "2026-08-22T13:00:00.000Z",
    rateLimitApprovedAt: "2026-08-21T13:05:00.000Z",
    rateLimitExpiresAt: "2026-08-22T13:05:00.000Z",
    rateLimitMethodFingerprint: methodFingerprint,
    actorExternalUserId: talIdentity,
    recordedAt,
  }]);
  assert.deepEqual(result, {
    outcome: "recorded",
    eventKey: deriveBotReplyStagingAuthorizationEventKey(
      testFixture.calls.record[0],
    ),
    authorizationVersion: 1,
    status: "approved",
    recordedAt,
  });
  assert.doesNotMatch(JSON.stringify(result), /recipient|method|actor|phone|token/i);

  const denied = fixture();
  await assert.rejects(
    denied.operation.execute(
      context(backupIdentity),
      payload,
      await request(payload),
    ),
    hasCode("AUTHORIZATION_DENIED"),
  );
  assert.deepEqual(denied.calls, { quota: [], find: [], record: [] });
});

test("lets an allowlisted backup revoke only by copying the latest approval", async () => {
  const previous = approvedEvent();
  const testFixture = fixture({ latest: previous });
  const payload = revocationPayload();
  const result = await testFixture.operation.execute(
    context(backupIdentity),
    payload,
    await request(payload),
  );

  assert.equal(testFixture.calls.record.length, 1);
  assert.deepEqual(testFixture.calls.record[0], {
    tenantId: 7,
    authorizationVersion: 2,
    status: "revoked",
    connectionVersion: previous.connectionVersion,
    policyVersion: previous.policyVersion,
    recipientFingerprint: previous.recipientFingerprint,
    recipientOptInRecordedAt: previous.recipientOptInRecordedAt,
    recipientExpiresAt: previous.recipientExpiresAt,
    rateLimitApprovedAt: previous.rateLimitApprovedAt,
    rateLimitExpiresAt: previous.rateLimitExpiresAt,
    rateLimitMethodFingerprint: previous.rateLimitMethodFingerprint,
    actorExternalUserId: backupIdentity,
    recordedAt: payload.recordedAt,
  });
  assert.equal(result.status, "revoked");
  assert.equal(result.authorizationVersion, 2);
});

test("replays the same actor and rejects stale or altered versions", async () => {
  const previous = approvedEvent();
  const replay = fixture({ latest: previous });
  const payload = approvalPayload();
  assert.deepEqual(
    await replay.operation.execute(context(), payload, await request(payload)),
    {
      outcome: "replayed",
      eventKey: previous.eventKey,
      authorizationVersion: 1,
      status: "approved",
      recordedAt,
    },
  );
  assert.deepEqual(replay.calls.record, []);

  for (const malformedReplayPayload of [
    approvalPayload({ confirmation: "invalid-replay-confirmation" }),
    approvalPayload({ unexpectedEvidence: "must-not-be-ignored" }),
  ]) {
    const malformedReplay = fixture({ latest: previous });
    await assert.rejects(
      malformedReplay.operation.execute(
        context(),
        malformedReplayPayload,
        await request(malformedReplayPayload),
      ),
      hasCode("INVALID_REQUEST"),
    );
    assert.deepEqual(malformedReplay.calls, {
      quota: [],
      find: [],
      record: [],
    });
  }

  for (const candidate of [
    approvalPayload({ authorizationVersion: 1, recordedAt: "2026-08-21T13:26:00.000Z" }),
    approvalPayload({ authorizationVersion: 3 }),
    revocationPayload({ authorizationVersion: 1 }),
  ]) {
    const conflict = fixture({ latest: previous });
    await assert.rejects(
      conflict.operation.execute(
        context(),
        candidate,
        await request(candidate),
      ),
      (error) =>
        error instanceof RailwayApiDispatchError &&
        (error.code === "CONFLICT" || error.code === "INVALID_TRANSITION"),
    );
    assert.deepEqual(conflict.calls.record, []);
  }
});

test("rejects malformed, expired, limited and failed requests with bounded codes", async () => {
  const invalidCases = [
    approvalPayload({ confirmation: "approve" }),
    approvalPayload({ recordedAt: "2026-08-21T13:19:59.999Z" }),
    approvalPayload({ rateLimitMethodFingerprint: "invalid" }),
    approvalPayload({ recipientExpiresAt: recordedAt }),
  ];
  for (const payload of invalidCases) {
    const testFixture = fixture();
    await assert.rejects(
      testFixture.operation.execute(context(), payload, await request(payload)),
      hasCode("INVALID_REQUEST"),
    );
    assert.deepEqual(testFixture.calls.record, []);
  }

  for (const [options, expectedCode] of [
    [{ quota: { outcome: "limited" } }, "RATE_LIMITED"],
    [{ findError: new Error("private read failure") }, "DEPENDENCY_UNAVAILABLE"],
    [{ recordError: new Error("private write failure") }, "DEPENDENCY_UNAVAILABLE"],
  ]) {
    const testFixture = fixture(options);
    const payload = approvalPayload();
    await assert.rejects(
      testFixture.operation.execute(context(), payload, await request(payload)),
      (error) => hasCode(expectedCode)(error) && !error.message.includes("private"),
    );
  }

  const wrongKey = fixture();
  const payload = approvalPayload();
  await assert.rejects(
    wrongKey.operation.execute(
      context(),
      payload,
      await request(payload, { idempotencyKey: `railway_api_idempotency_v1_${"9".repeat(64)}` }),
    ),
    hasCode("CONFLICT"),
  );
});
