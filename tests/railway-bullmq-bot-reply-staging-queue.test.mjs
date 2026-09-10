import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyStagingQueueMessage,
  deriveBotReplyStagingQueueJobId,
} from "../server/operations/botReplyStagingQueueMessage.ts";
import {
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "../server/operations/botReplyStagingDurableRunner.ts";
import {
  createRailwayBullMqBotReplyStagingPublisherRuntime,
  createRailwayBullMqBotReplyStagingWorkerRuntime,
  railwayBullMqBotReplyStagingDeadLetterQueueName,
  RailwayBullMqBotReplyStagingQueueError,
  railwayBullMqBotReplyStagingQueueName,
} from "../server/platform/railwayBullMqBotReplyStagingQueue.ts";

const fixedNow = "2026-08-21T13:30:00.000Z";
const fixedJobTimestamp = Date.parse("2026-08-21T13:29:00.000Z");
const runKey = `bot_reply_staging_run_v1_${"a".repeat(64)}`;

function environment(overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "test",
    REDIS_URL: "redis://default:secret@127.0.0.1:6379/0",
    BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
    BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
    BULLMQ_FAILED_RETENTION_SECONDS: "604800",
    BULLMQ_FAILED_RETENTION_COUNT: "2000",
    BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
    BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
    ...overrides,
  };
}

function runInput(overrides = {}) {
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
    ...overrides,
  };
}

function queueMessage({ leaseExpiresAt = "2026-08-21T14:00:00.000Z" } = {}) {
  const run = runInput();
  const requestDigest = deriveBotReplyStagingDurableRequestDigest(run);
  return createBotReplyStagingQueueMessage(run, {
    runKey,
    auditKey: deriveBotReplyStagingDurableAuditKey(runKey, requestDigest),
    claimVersion: 1,
    leaseExpiresAt,
  });
}

function telemetry(events) {
  return {
    recordConnectionFailure() {
      events.push("telemetry.connection-failure");
    },
    recordWorkerFailure() {
      events.push("telemetry.worker-failure");
    },
    recordWorkerRuntimeFailure() {
      events.push("telemetry.worker-runtime-failure");
    },
    recordPublisherFailure() {
      events.push("telemetry.publisher-failure");
    },
    recordDeadLetter(reason) {
      events.push(`telemetry.dead-letter.${reason}`);
    },
    recordDeadLetterCleanup(count) {
      events.push(`telemetry.dead-letter-cleanup.${count}`);
    },
  };
}

function infrastructure(overrides = {}) {
  const events = [];
  const queues = [];
  const workerRecord = {};
  const dependencies = {
    createQueue(name, options) {
      const record = {
        name,
        options,
        added: [],
        cleaned: [],
        closeCalls: 0,
        errorListener: null,
      };
      queues.push(record);
      return {
        async add(jobName, data, jobOptions) {
          events.push(`${name}.add`);
          if (
            overrides.publishFailure &&
            name === railwayBullMqBotReplyStagingQueueName
          ) {
            throw new Error("private redis publisher failure");
          }
          if (
            overrides.deadLetterFailure &&
            name === railwayBullMqBotReplyStagingDeadLetterQueueName
          ) {
            throw new Error("private redis dead-letter failure");
          }
          record.added.push({ jobName, data, jobOptions });
        },
        async clean(graceMilliseconds, limit, type) {
          events.push(`${name}.clean`);
          if (overrides.cleanFailure) {
            throw new Error("private redis cleanup failure");
          }
          record.cleaned.push({ graceMilliseconds, limit, type });
          return overrides.cleanedIds ?? ["first", "second"];
        },
        async waitUntilReady() {
          events.push(`${name}.ready`);
          if (overrides.readinessFailure) {
            throw new Error("private redis readiness failure");
          }
        },
        async close() {
          events.push(`${name}.close`);
          record.closeCalls += 1;
          if (overrides.queueCloseFailure) {
            throw new Error("private redis close failure");
          }
        },
        onError(listener) {
          record.errorListener = listener;
        },
      };
    },
    createWorker(name, processor, options) {
      Object.assign(workerRecord, {
        name,
        processor,
        options,
        closeCalls: 0,
        errorListener: null,
        failedListener: null,
      });
      return {
        async run() {
          events.push("worker.run");
          if (overrides.workerRunFailure) {
            throw new Error("private worker runtime failure");
          }
        },
        async waitUntilReady() {
          events.push("worker.ready");
          if (overrides.workerReadinessFailure) {
            throw new Error("private worker readiness failure");
          }
        },
        async close() {
          events.push("worker.close");
          workerRecord.closeCalls += 1;
          if (overrides.workerCloseFailure) {
            throw new Error("private worker close failure");
          }
        },
        onError(listener) {
          workerRecord.errorListener = listener;
        },
        onFailed(listener) {
          workerRecord.failedListener = listener;
        },
      };
    },
  };
  return {
    dependencies,
    events,
    workerRecord,
    queue(name) {
      return queues.find((queue) => queue.name === name);
    },
  };
}

function workerRuntime(testInfrastructure, consumer, now = fixedNow) {
  return createRailwayBullMqBotReplyStagingWorkerRuntime({
    environment: environment(),
    consumer,
    telemetry: telemetry(testInfrastructure.events),
    clock: {
      now() {
        return new Date(now);
      },
    },
  }, testInfrastructure.dependencies);
}

function sourceJob(message = queueMessage(), overrides = {}) {
  return {
    id: deriveBotReplyStagingQueueJobId(message),
    name: "run-bot-reply-staging-v1",
    data: message,
    timestamp: fixedJobTimestamp,
    attemptsMade: 0,
    ...overrides,
  };
}

function expectsQueueError(code) {
  return (error) =>
    error instanceof RailwayBullMqBotReplyStagingQueueError &&
    error.code === code && !error.message.includes("private");
}

test("publisher uses one fenced run identity with no automatic retries", async () => {
  const testInfrastructure = infrastructure();
  const runtime = createRailwayBullMqBotReplyStagingPublisherRuntime({
    environment: environment(),
    telemetry: {
      recordConnectionFailure() {},
      recordPublisherFailure() {},
    },
  }, testInfrastructure.dependencies);
  const message = queueMessage();

  await assert.rejects(
    () => runtime.publisher.publish(message),
    expectsQueueError("not-started"),
  );
  await runtime.start();
  await runtime.publisher.publish(message);
  await runtime.publisher.publish(message);

  const source = testInfrastructure.queue(
    railwayBullMqBotReplyStagingQueueName,
  );
  assert.equal(source.added.length, 2);
  assert.equal(
    source.added[0].jobOptions.jobId,
    deriveBotReplyStagingQueueJobId(message),
  );
  assert.equal(source.added[0].jobOptions.attempts, 1);
  assert.deepEqual(source.added[0].jobOptions.removeOnComplete, {
    age: 86400,
    count: 1000,
  });
  assert.equal(source.options.connection.maxRetriesPerRequest, 1);
  assert.equal(source.options.connection.enableOfflineQueue, false);
  assert.equal(source.options.prefix, "connect-test-v1");

  await assert.rejects(
    () => runtime.publisher.publish({ ...message, accessToken: "blocked" }),
    expectsQueueError("message-invalid"),
  );
  assert.equal(source.added.length, 2);
  await runtime.close();
});

test("worker acknowledges one current exact envelope", async () => {
  const testInfrastructure = infrastructure();
  const received = [];
  const runtime = workerRuntime(testInfrastructure, {
    async handle(message) {
      received.push(message);
    },
  });
  await runtime.start();

  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(sourceJob()),
    { outcome: "acknowledged" },
  );
  assert.equal(received.length, 1);
  assert.equal(received[0].run.runKey, runKey);
  assert.equal(testInfrastructure.workerRecord.options.concurrency, 1);
  assert.equal(testInfrastructure.workerRecord.options.maxStalledCount, 0);
  assert.equal(
    testInfrastructure.workerRecord.options.connection.maxRetriesPerRequest,
    null,
  );
  await runtime.close();
});

test("worker dead-letters invalid, expired and failed work without replay", async () => {
  const testInfrastructure = infrastructure();
  let consumerCalls = 0;
  let failConsumer = false;
  const runtime = workerRuntime(testInfrastructure, {
    async handle() {
      consumerCalls += 1;
      if (failConsumer) throw new Error("private scenario failure");
    },
  });
  await runtime.start();

  const validMessage = queueMessage();
  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(sourceJob(
      validMessage,
      { data: { ...validMessage, accessToken: "must-not-persist" } },
    )),
    { outcome: "dead-lettered" },
  );
  assert.equal(consumerCalls, 0);

  const expiredMessage = queueMessage({
    leaseExpiresAt: "2026-08-21T13:29:30.000Z",
  });
  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(sourceJob(expiredMessage)),
    { outcome: "dead-lettered" },
  );
  assert.equal(consumerCalls, 0);

  failConsumer = true;
  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(sourceJob()),
    { outcome: "dead-lettered" },
  );
  assert.equal(consumerCalls, 1);

  const deadLetters = testInfrastructure.queue(
    railwayBullMqBotReplyStagingDeadLetterQueueName,
  ).added;
  assert.deepEqual(
    deadLetters.map((entry) => entry.data.reason),
    ["invalid-envelope", "lease-expired", "consumer-failed"],
  );
  assert.equal(deadLetters[0].data.runKey, null);
  assert.match(deadLetters[0].data.sourceBodyDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal("body" in deadLetters[0].data, false);
  assert.equal(JSON.stringify(deadLetters).includes("must-not-persist"), false);
  assert.equal(deadLetters[1].data.runKey, runKey);
  assert.equal(deadLetters[2].data.failedAt, fixedNow);
  assert.deepEqual(
    testInfrastructure.events.filter((event) =>
      event.startsWith("telemetry.dead-letter.")
    ),
    [
      "telemetry.dead-letter.invalid-envelope",
      "telemetry.dead-letter.lease-expired",
      "telemetry.dead-letter.consumer-failed",
    ],
  );
  await runtime.close();
});

test("DLQ failure stays failed and cleanup remains bounded", async () => {
  const failedInfrastructure = infrastructure({ deadLetterFailure: true });
  const failedRuntime = workerRuntime(failedInfrastructure, {
    async handle() {},
  });
  await failedRuntime.start();
  await assert.rejects(
    () => failedInfrastructure.workerRecord.processor(sourceJob(
      queueMessage(),
      { data: { invalid: true } },
    )),
    (error) =>
      error instanceof Error &&
      /dead-letter persistence failed/.test(error.message) &&
      !error.message.includes("private"),
  );
  await failedRuntime.close();

  const testInfrastructure = infrastructure();
  const runtime = workerRuntime(testInfrastructure, { async handle() {} });
  await assert.rejects(
    () => runtime.cleanExpiredDeadLetters(),
    expectsQueueError("not-started"),
  );
  await runtime.start();
  assert.equal(await runtime.cleanExpiredDeadLetters(), 2);
  assert.deepEqual(
    testInfrastructure.queue(
      railwayBullMqBotReplyStagingDeadLetterQueueName,
    ).cleaned,
    [{ graceMilliseconds: 2592000000, limit: 100, type: "wait" }],
  );
  await runtime.close();
});

test("publisher sanitizes Redis failures and fails closed after shutdown", async () => {
  const events = [];
  const testInfrastructure = infrastructure({ publishFailure: true });
  const runtime = createRailwayBullMqBotReplyStagingPublisherRuntime({
    environment: environment(),
    telemetry: {
      recordConnectionFailure() {
        events.push("connection");
      },
      recordPublisherFailure() {
        events.push("publisher");
      },
    },
  }, testInfrastructure.dependencies);
  await runtime.start();
  await assert.rejects(
    () => runtime.publisher.publish(queueMessage()),
    expectsQueueError("publish-failed"),
  );
  assert.deepEqual(events, ["publisher"]);
  await runtime.close();
  await assert.rejects(
    () => runtime.start(),
    expectsQueueError("already-closed"),
  );
});

test("configuration and startup failures remain bounded", async () => {
  assert.throws(
    () => createRailwayBullMqBotReplyStagingPublisherRuntime({
      environment: environment({ REDIS_URL: undefined }),
      telemetry: {
        recordConnectionFailure() {},
        recordPublisherFailure() {},
      },
    }),
    expectsQueueError("configuration-incomplete"),
  );

  const testInfrastructure = infrastructure({ readinessFailure: true });
  const runtime = createRailwayBullMqBotReplyStagingPublisherRuntime({
    environment: environment(),
    telemetry: {
      recordConnectionFailure() {},
      recordPublisherFailure() {},
    },
  }, testInfrastructure.dependencies);
  await assert.rejects(
    () => runtime.start(),
    expectsQueueError("startup-failed"),
  );
  assert.equal(
    testInfrastructure.queue(railwayBullMqBotReplyStagingQueueName).closeCalls,
    1,
  );
});
