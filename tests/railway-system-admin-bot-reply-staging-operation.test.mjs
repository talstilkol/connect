import assert from "node:assert/strict";
import test from "node:test";

import {
  botReplyStagingLiveDriverConfirmation,
  botReplyStagingLiveDriverVersion,
  BotReplyStagingLiveDriverError,
} from "../server/operations/botReplyStagingLiveDriver.ts";
import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwaySystemAdminBotReplyStagingOperation,
  railwaySystemAdminBotReplyStagingOperationPolicy,
} from "../server/platform/railwaySystemAdminBotReplyStagingOperation.ts";

const operationId = "system-admin.bot-reply-staging.run";
const adminIdentity = "system-admin-primary";
const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const runKey = `bot_reply_staging_run_v1_${"d".repeat(64)}`;
const auditKey = `bot_reply_staging_audit_v1_${"e".repeat(64)}`;
const evidenceDigest = `bot_reply_staging_evidence_v1_${"f".repeat(64)}`;
const dispatchContext = Object.freeze({
  serviceIdentity: Object.freeze({
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "staging",
    subject: "owner:connect-team:project:connect-web:environment:staging",
  }),
  userIdentity: Object.freeze({ externalUserId: adminIdentity }),
});

function payload(overrides = {}) {
  return {
    schemaVersion: 1,
    driverVersion: botReplyStagingLiveDriverVersion,
    confirmation: botReplyStagingLiveDriverConfirmation,
    targetTenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    requestedAt: "2026-08-21T13:25:00.000Z",
    releaseId,
    commitSha,
    artifactDigest,
    ...overrides,
  };
}

async function request(input = payload(), overrides = {}) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation: operationId,
    requestKind: "mutation",
    idempotencyKey:
      await deriveRailwayApiDeterministicIdempotencyKey(
        operationId,
        input,
      ),
    payload: input,
    ...overrides,
  };
}

function fixture({
  allowedExternalUserIds = [adminIdentity],
  rateLimitDecision = { outcome: "allowed" },
  rateLimitError = null,
  driverError = null,
} = {}) {
  const calls = { quota: [], driver: [] };
  const operation = createRailwaySystemAdminBotReplyStagingOperation({
    allowedExternalUserIds,
    mutationRateLimit: {
      async consume(subject) {
        calls.quota.push(subject);
        if (rateLimitError) throw rateLimitError;
        return rateLimitDecision;
      },
    },
    driver: {
      async run(input, context) {
        calls.driver.push({ input, context });
        if (driverError) throw driverError;
        return {
          outcome: "completed",
          runKey,
          auditKey,
          verifiedAt: "2026-08-21T13:00:00.000Z",
          expiresAt: "2026-08-22T13:00:00.000Z",
          evidenceDigest,
        };
      },
    },
  });
  return { operation, calls };
}

function hasDispatchCode(code) {
  return (error) =>
    error instanceof RailwayApiDispatchError && error.code === code;
}

test("publishes a fail-closed Railway-only mutation policy", () => {
  assert.deepEqual(railwaySystemAdminBotReplyStagingOperationPolicy, {
    id: operationId,
    requestKind: "mutation",
    authorization: "system-admin-allowlist",
    mutationSafety: {
      rateLimit: "system-admin-mutation",
      idempotency: "deterministic-request-key-and-durable-run-replay",
      audit: "durable-run-bound-immutable-event",
      transaction: "runner-required",
      providerBoundary: "railway-bullmq-bot-reply-worker",
    },
  });
  assert.ok(Object.isFrozen(railwaySystemAdminBotReplyStagingOperationPolicy));
  assert.ok(Object.isFrozen(
    railwaySystemAdminBotReplyStagingOperationPolicy.mutationSafety,
  ));
});

test("authorizes, rate-limits and delegates an exact request to the driver", async () => {
  const { operation, calls } = fixture();
  const input = payload();
  const envelope = await request(input);
  const result = await operation.execute(dispatchContext, input, envelope);

  assert.equal(operation.id, operationId);
  assert.equal(operation.requestKind, "mutation");
  assert.deepEqual(calls.quota, [
    `${adminIdentity}:${operationId}`,
  ]);
  assert.deepEqual(calls.driver, [{
    input,
    context: { actorExternalUserId: adminIdentity },
  }]);
  assert.deepEqual(result, {
    outcome: "completed",
    runKey,
    auditKey,
    verifiedAt: "2026-08-21T13:00:00.000Z",
    expiresAt: "2026-08-22T13:00:00.000Z",
    evidenceDigest,
  });
  assert.doesNotMatch(JSON.stringify(result), /tenant|phone|waba|token/i);
  assert.ok(Object.isFrozen(result));
});

test("rejects unauthorized users before quota or driver execution", async () => {
  const { operation, calls } = fixture();
  const input = payload();
  const envelope = await request(input);

  await assert.rejects(
    () => operation.execute({
      ...dispatchContext,
      userIdentity: { externalUserId: "not-allowed" },
    }, input, envelope),
    hasDispatchCode("AUTHORIZATION_DENIED"),
  );
  assert.deepEqual(calls, { quota: [], driver: [] });
});

test("rejects extensions and wrong idempotency before driver execution", async () => {
  const extended = { ...payload(), accessToken: "forbidden" };
  const extensionFixture = fixture();
  await assert.rejects(
    async () => extensionFixture.operation.execute(
      dispatchContext,
      extended,
      await request(extended),
    ),
    hasDispatchCode("INVALID_REQUEST"),
  );
  assert.deepEqual(extensionFixture.calls, { quota: [], driver: [] });

  const input = payload();
  const idempotencyFixture = fixture();
  await assert.rejects(
    async () => idempotencyFixture.operation.execute(
      dispatchContext,
      input,
      { ...await request(input), idempotencyKey: "wrong" },
    ),
    hasDispatchCode("CONFLICT"),
  );
  assert.deepEqual(idempotencyFixture.calls, { quota: [], driver: [] });
});

test("blocks rate-limited and unavailable quota decisions", async () => {
  for (const [configuration, code] of [
    [{ rateLimitDecision: { outcome: "limited" } }, "RATE_LIMITED"],
    [{ rateLimitDecision: { outcome: "unknown" } }, "DEPENDENCY_UNAVAILABLE"],
    [{ rateLimitError: new Error("offline") }, "DEPENDENCY_UNAVAILABLE"],
  ]) {
    const { operation, calls } = fixture(configuration);
    const input = payload();
    await assert.rejects(
      async () => operation.execute(
        dispatchContext,
        input,
        await request(input),
      ),
      hasDispatchCode(code),
    );
    assert.equal(calls.driver.length, 0);
  }
});

test("maps driver safety failures without exposing internal errors", async () => {
  const cases = [
    ["BOT_REPLY_STAGING_DRIVER_REQUEST_EXPIRED", "INVALID_REQUEST"],
    ["BOT_REPLY_STAGING_DRIVER_TENANT_NOT_AUTHORIZED", "AUTHORIZATION_DENIED"],
    ["BOT_REPLY_STAGING_DRIVER_SAFETY_GATE_BLOCKED", "INVALID_TRANSITION"],
    ["BOT_REPLY_STAGING_DRIVER_RUN_IN_PROGRESS", "CONFLICT"],
    ["BOT_REPLY_STAGING_DRIVER_RECEIPT_INVALID", "DEPENDENCY_UNAVAILABLE"],
  ];

  for (const [driverCode, dispatchCode] of cases) {
    const { operation } = fixture({
      driverError: new BotReplyStagingLiveDriverError(driverCode),
    });
    const input = payload();
    await assert.rejects(
      async () => operation.execute(
        dispatchContext,
        input,
        await request(input),
      ),
      hasDispatchCode(dispatchCode),
    );
  }
});

test("rejects incomplete operation dependencies", () => {
  assert.throws(
    () => createRailwaySystemAdminBotReplyStagingOperation({
      allowedExternalUserIds: [adminIdentity],
      mutationRateLimit: { consume: async () => ({ outcome: "allowed" }) },
    }),
    /dependencies are invalid/,
  );
});
