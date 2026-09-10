import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyStagingQueuedExecutor,
  BotReplyStagingQueuedExecutorError,
} from "../server/operations/botReplyStagingQueuedExecutor.ts";
import {
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "../server/operations/botReplyStagingDurableRunner.ts";

const runKey = `bot_reply_staging_run_v1_${"a".repeat(64)}`;
const leaseExpiresAt = "2026-08-21T14:00:00.000Z";

function runInput() {
  return {
    runKey,
    targetTenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    releaseId: `connect_release_v1_${"b".repeat(64)}`,
    commitSha: "c".repeat(40),
    artifactDigest: `sha256:${"d".repeat(64)}`,
    graphApiVersion: "v24.0",
    requestedAt: "2026-08-21T13:25:00.000Z",
    recipientFingerprint: `sha256:${"e".repeat(64)}`,
    rateLimitMethodFingerprint: `sha256:${"f".repeat(64)}`,
    actorExternalUserId: "system-admin-primary",
  };
}

function claim() {
  const run = runInput();
  const requestDigest = deriveBotReplyStagingDurableRequestDigest(run);
  return {
    runKey,
    auditKey: deriveBotReplyStagingDurableAuditKey(runKey, requestDigest),
    claimVersion: 1,
    leaseExpiresAt,
  };
}

function runningStatus(overrides = {}) {
  return {
    outcome: "running",
    runKey,
    auditKey: claim().auditKey,
    claimVersion: 1,
    leaseExpiresAt,
    ...overrides,
  };
}

function completedStatus(overrides = {}) {
  return {
    outcome: "completed",
    runKey,
    auditKey: claim().auditKey,
    claimVersion: 1,
    completedAt: "2026-08-21T13:31:00.000Z",
    receipt: { bounded: true },
    ...overrides,
  };
}

function fixture({
  statuses = [runningStatus(), completedStatus()],
  publishError = null,
  readError = null,
  waitError = null,
  clockValues = ["2026-08-21T13:30:00.000Z"],
} = {}) {
  const calls = { published: [], reads: [], waits: [] };
  const remainingStatuses = [...statuses];
  let clockIndex = 0;
  const executor = createBotReplyStagingQueuedExecutor({
    clock: {
      now() {
        const value = clockValues[Math.min(clockIndex, clockValues.length - 1)];
        clockIndex += 1;
        return new Date(value);
      },
    },
    pollIntervalMilliseconds: 100,
    publisher: {
      async publish(message) {
        calls.published.push(message);
        if (publishError) throw publishError;
      },
    },
    runs: {
      async read(input) {
        calls.reads.push(input);
        if (readError) throw readError;
        if (remainingStatuses.length === 0) {
          throw new Error("unexpected extra read");
        }
        return remainingStatuses.shift();
      },
      async claim() {
        throw new Error("not used by the queued executor");
      },
      async complete() {
        throw new Error("completion remains owned by the queue consumer");
      },
    },
    async wait(milliseconds) {
      calls.waits.push(milliseconds);
      if (waitError) throw waitError;
    },
  });
  return { executor, calls };
}

function expectsError(code) {
  return (error) =>
    error instanceof BotReplyStagingQueuedExecutorError &&
    error.code === code && error.message === code;
}

test("publishes once and polls PostgreSQL until durable completion", async () => {
  const { executor, calls } = fixture();
  const result = await executor.execute(runInput(), claim());

  assert.deepEqual(result, { bounded: true });
  assert.equal(calls.published.length, 1);
  assert.equal(calls.published[0].run.runKey, runKey);
  assert.equal(calls.published[0].claimVersion, 1);
  assert.deepEqual(calls.reads, [
    {
      runKey,
      requestDigest: deriveBotReplyStagingDurableRequestDigest(runInput()),
    },
    {
      runKey,
      requestDigest: deriveBotReplyStagingDurableRequestDigest(runInput()),
    },
  ]);
  assert.deepEqual(calls.waits, [100]);
});

test("returns an already-completed durable result without waiting", async () => {
  const { executor, calls } = fixture({ statuses: [completedStatus()] });
  assert.deepEqual(await executor.execute(runInput(), claim()), {
    bounded: true,
  });
  assert.equal(calls.published.length, 1);
  assert.equal(calls.reads.length, 1);
  assert.equal(calls.waits.length, 0);
});

test("rejects missing identity and a changed durable fence", async () => {
  await assert.rejects(
    () => fixture({
      statuses: [{ outcome: "missing-or-conflict", runKey }],
    }).executor.execute(runInput(), claim()),
    expectsError("BOT_REPLY_STAGING_QUEUED_RUN_CONFLICT"),
  );
  await assert.rejects(
    () => fixture({
      statuses: [runningStatus({ claimVersion: 2 })],
    }).executor.execute(runInput(), claim()),
    expectsError("BOT_REPLY_STAGING_QUEUED_STATUS_INVALID"),
  );
  await assert.rejects(
    () => fixture({
      statuses: [completedStatus({ unexpected: true })],
    }).executor.execute(runInput(), claim()),
    expectsError("BOT_REPLY_STAGING_QUEUED_STATUS_INVALID"),
  );
});

test("stops polling exactly at lease expiry", async () => {
  const { executor, calls } = fixture({
    statuses: [runningStatus()],
    clockValues: [leaseExpiresAt],
  });
  await assert.rejects(
    () => executor.execute(runInput(), claim()),
    expectsError("BOT_REPLY_STAGING_QUEUED_LEASE_EXPIRED"),
  );
  assert.equal(calls.waits.length, 0);
});

test("sanitizes publisher, reader and wait failures", async () => {
  await assert.rejects(
    () => fixture({ publishError: new Error("private") }).executor.execute(
      runInput(),
      claim(),
    ),
    expectsError("BOT_REPLY_STAGING_QUEUED_PUBLISH_FAILED"),
  );
  await assert.rejects(
    () => fixture({ readError: new Error("private") }).executor.execute(
      runInput(),
      claim(),
    ),
    expectsError("BOT_REPLY_STAGING_QUEUED_READ_UNAVAILABLE"),
  );
  await assert.rejects(
    () => fixture({ waitError: new Error("private") }).executor.execute(
      runInput(),
      claim(),
    ),
    expectsError("BOT_REPLY_STAGING_QUEUED_READ_UNAVAILABLE"),
  );
});

test("rejects unsafe polling dependencies", () => {
  assert.throws(
    () => createBotReplyStagingQueuedExecutor({}),
    /dependencies are invalid/,
  );
});
