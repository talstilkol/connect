import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayBullMqTeamInvitationPublisherRuntime,
  createRailwayBullMqTeamInvitationWorkerRuntime,
  railwayBullMqTeamInvitationDeadLetterQueueName,
  RailwayBullMqTeamInvitationQueueError,
  railwayBullMqTeamInvitationQueueName,
} from "../server/platform/railwayBullMqTeamInvitationQueue.ts";

const fixedNow = "2026-08-21T12:00:00.000Z";
const fixedJobTimestamp = Date.parse("2026-08-21T11:59:00.000Z");
const deliveryKey = `team_invitation_delivery_v1_${"a".repeat(64)}`;

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
            name === railwayBullMqTeamInvitationQueueName
          ) {
            throw new Error("private redis publisher failure");
          }
          if (
            overrides.deadLetterFailure &&
            name === railwayBullMqTeamInvitationDeadLetterQueueName
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
            throw new Error("private worker failure");
          }
        },
        async waitUntilReady() {
          events.push("worker.ready");
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
    queues,
    workerRecord,
    queue(name) {
      return queues.find((queue) => queue.name === name);
    },
  };
}

function workerRuntime(testInfrastructure, consumer) {
  return createRailwayBullMqTeamInvitationWorkerRuntime({
    environment: environment(),
    consumer,
    telemetry: telemetry(testInfrastructure.events),
    clock: {
      now() {
        return new Date(fixedNow);
      },
    },
  }, testInfrastructure.dependencies);
}

function sourceJob(overrides = {}) {
  return {
    id: deliveryKey,
    name: "deliver-team-invitation-v1",
    data: { version: 1, tenantId: 7, deliveryKey },
    timestamp: fixedJobTimestamp,
    attemptsMade: 0,
    ...overrides,
  };
}

test("publisher uses the durable delivery key as the deterministic job ID", async () => {
  const testInfrastructure = infrastructure();
  const runtime = createRailwayBullMqTeamInvitationPublisherRuntime({
    environment: environment(),
    telemetry: {
      recordConnectionFailure() {},
      recordPublisherFailure() {},
    },
  }, testInfrastructure.dependencies);

  await assert.rejects(runtime.publisher.publish(7, deliveryKey));
  await runtime.start();
  await runtime.publisher.publish(7, deliveryKey);
  await runtime.publisher.publish(7, deliveryKey);

  const source = testInfrastructure.queue(
    railwayBullMqTeamInvitationQueueName,
  );
  assert.equal(source.added.length, 2);
  assert.equal(source.added[0].jobOptions.jobId, deliveryKey);
  assert.equal(source.added[1].jobOptions.jobId, deliveryKey);
  assert.equal(source.added[0].jobOptions.attempts, 11);
  assert.deepEqual(source.added[0].jobOptions.backoff, {
    type: "team-invitation-bounded-v1",
  });
  assert.deepEqual(source.added[0].data, {
    version: 1,
    tenantId: 7,
    deliveryKey,
  });
  assert.deepEqual(source.added[0].jobOptions.removeOnComplete, {
    age: 86400,
    count: 1000,
  });
  assert.equal(source.options.connection.maxRetriesPerRequest, 1);
  assert.equal(source.options.connection.enableOfflineQueue, false);
  assert.equal(source.options.prefix, "connect-test-v1");

  await runtime.close();
});

test("worker acknowledges success and preserves every bounded Retry-After delay", async () => {
  const testInfrastructure = infrastructure();
  let action = "ack";
  const deliveries = [];
  const runtime = workerRuntime(testInfrastructure, {
    async handle(batch) {
      const delivery = batch.messages[0];
      deliveries.push(delivery);
      if (action === "ack") {
        delivery.ack();
      } else {
        delivery.retry({
          delaySeconds:
            action === "provider"
              ? 60
              : action === "rate-limit"
              ? 3_600
              : 30,
        });
      }
    },
  });
  await runtime.start();

  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(sourceJob()),
    { outcome: "acknowledged" },
  );
  assert.equal(deliveries[0].attempts, 1);
  assert.equal(deliveries[0].timestamp.toISOString(),
    "2026-08-21T11:59:00.000Z");

  for (const [retryAction, expectedDelay] of [
    ["storage", 30_000],
    ["provider", 60_000],
    ["rate-limit", 3_600_000],
  ]) {
    action = retryAction;
    let retryError;
    await assert.rejects(
      testInfrastructure.workerRecord.processor(sourceJob()),
      (error) => {
        retryError = error;
        return /requires retry/.test(error.message);
      },
    );
    assert.equal(
      testInfrastructure.workerRecord.options.settings.backoffStrategy(
        1,
        "team-invitation-bounded-v1",
        retryError,
      ),
      expectedDelay,
    );
  }

  assert.equal(
    testInfrastructure.workerRecord.options.settings.backoffStrategy(
      1,
      "unknown",
      new Error("untrusted"),
    ),
    -1,
  );
  await runtime.close();
});

test("worker dead-letters poison and retry-exhausted jobs", async () => {
  const testInfrastructure = infrastructure();
  let consumerCalls = 0;
  const runtime = workerRuntime(testInfrastructure, {
    async handle(batch) {
      consumerCalls += 1;
      batch.messages[0].retry({ delaySeconds: 60 });
    },
  });
  await runtime.start();

  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(sourceJob({
      data: { invalid: true },
    })),
    { outcome: "dead-lettered" },
  );
  assert.equal(consumerCalls, 0);
  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(sourceJob({
      attemptsMade: 10,
    })),
    { outcome: "dead-lettered" },
  );

  const deadLetters = testInfrastructure.queue(
    railwayBullMqTeamInvitationDeadLetterQueueName,
  ).added;
  assert.equal(deadLetters[0].data.reason, "invalid-envelope");
  assert.equal(deadLetters[1].data.reason, "retry-exhausted");
  assert.equal(deadLetters[1].data.attempts, 11);
  assert.equal(deadLetters[1].data.failedAt, fixedNow);
  assert.deepEqual(deadLetters[1].data.body, sourceJob().data);
  await runtime.close();
});

test("DLQ persistence failure keeps the source failed and cleanup is bounded", async () => {
  const failedInfrastructure = infrastructure({ deadLetterFailure: true });
  const failedRuntime = workerRuntime(failedInfrastructure, {
    async handle(batch) {
      batch.messages[0].retry({ delaySeconds: 30 });
    },
  });
  await failedRuntime.start();
  await assert.rejects(
    failedInfrastructure.workerRecord.processor(sourceJob({
      data: { invalid: true },
    })),
    (error) =>
      error instanceof Error &&
      /dead-letter persistence failed/.test(error.message) &&
      !error.message.includes("private"),
  );
  await failedRuntime.close();

  const cleanInfrastructure = infrastructure({
    cleanedIds: ["first", "second", "third"],
  });
  const cleanRuntime = workerRuntime(cleanInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });
  await assert.rejects(
    cleanRuntime.cleanExpiredDeadLetters(),
    (error) =>
      error instanceof RailwayBullMqTeamInvitationQueueError &&
      error.code === "not-started",
  );
  await cleanRuntime.start();
  assert.equal(await cleanRuntime.cleanExpiredDeadLetters(), 3);
  assert.deepEqual(
    cleanInfrastructure.queue(
      railwayBullMqTeamInvitationDeadLetterQueueName,
    ).cleaned,
    [{ graceMilliseconds: 2592000000, limit: 100, type: "wait" }],
  );
  await cleanRuntime.close();
});

test("publisher fails closed and both runtimes reject invalid composition", async () => {
  const testInfrastructure = infrastructure({ publishFailure: true });
  const runtime = createRailwayBullMqTeamInvitationPublisherRuntime({
    environment: environment(),
    telemetry: {
      recordConnectionFailure() {},
      recordPublisherFailure() {
        testInfrastructure.events.push("telemetry.publisher-failure");
      },
    },
  }, testInfrastructure.dependencies);
  await runtime.start();
  await assert.rejects(
    runtime.publisher.publish(7, deliveryKey),
    (error) =>
      error?.name === "TeamInvitationQueuePublisherError" &&
      !error.message.includes("private"),
  );
  assert.equal(
    testInfrastructure.events.includes("telemetry.publisher-failure"),
    true,
  );
  await runtime.close();

  assert.throws(
    () => createRailwayBullMqTeamInvitationPublisherRuntime({}),
    (error) =>
      error instanceof RailwayBullMqTeamInvitationQueueError &&
      error.code === "options-invalid",
  );
  assert.throws(
    () => createRailwayBullMqTeamInvitationWorkerRuntime({
      environment: {},
      consumer: { async handle() {} },
      telemetry: telemetry([]),
    }, testInfrastructure.dependencies),
    (error) =>
      error instanceof RailwayBullMqTeamInvitationQueueError &&
      error.code === "configuration-disabled",
  );
  assert.throws(
    () => createRailwayBullMqTeamInvitationPublisherRuntime({
      environment: environment(),
      telemetry: {
        recordConnectionFailure() {},
        recordPublisherFailure() {},
      },
    }, { ...testInfrastructure.dependencies, extension: true }),
    (error) =>
      error instanceof RailwayBullMqTeamInvitationQueueError &&
      error.code === "dependencies-invalid",
  );
});
