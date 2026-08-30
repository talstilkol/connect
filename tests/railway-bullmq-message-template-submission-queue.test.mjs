import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayBullMqMessageTemplateSubmissionQueueRuntime,
  railwayBullMqMessageTemplateSubmissionDeadLetterQueueName,
  RailwayBullMqMessageTemplateSubmissionQueueError,
  railwayBullMqMessageTemplateSubmissionQueueName,
} from "../server/platform/railwayBullMqMessageTemplateSubmissionQueue.ts";
import {
  createMessageTemplateSubmissionQueueMessage,
} from "../server/templates/messageTemplateSubmissionQueueMessage.ts";

const fixedNow = "2026-08-21T12:00:00.000Z";
const fixedJobTimestamp = Date.parse("2026-08-21T11:59:00.000Z");
const firstSubmissionKey = `template_submission_v1_${"a".repeat(64)}`;
const secondSubmissionKey = `template_submission_v1_${"b".repeat(64)}`;

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
        addedBulk: [],
        added: [],
        cleaned: [],
        closeCalls: 0,
        errorListener: null,
      };
      queues.push(record);

      return {
        async addBulk(jobs) {
          events.push(`${name}.add-bulk`);
          if (overrides.publishFailure &&
              name === railwayBullMqMessageTemplateSubmissionQueueName) {
            throw new Error("private redis publisher failure");
          }
          record.addedBulk.push(jobs);
        },
        async add(jobName, data, jobOptions) {
          events.push(`${name}.add`);
          if (overrides.deadLetterFailure &&
              name ===
                railwayBullMqMessageTemplateSubmissionDeadLetterQueueName) {
            throw new Error("private redis dlq failure");
          }
          record.added.push({ jobName, data, jobOptions });
        },
        async clean(graceMilliseconds, limit, type) {
          events.push(`${name}.clean`);
          if (overrides.cleanFailure) {
            throw new Error("private redis cleanup failure");
          }
          record.cleaned.push({ graceMilliseconds, limit, type });
          return overrides.cleanedIds ?? ["dead-letter-one", "dead-letter-two"];
        },
        async waitUntilReady() {
          events.push(`${name}.ready`);
          if (overrides.readinessFailure &&
              name === railwayBullMqMessageTemplateSubmissionQueueName) {
            throw new Error("private redis readiness failure");
          }
        },
        async close() {
          events.push(`${name}.close`);
          record.closeCalls += 1;
          if (overrides.queueCloseFailure &&
              name === railwayBullMqMessageTemplateSubmissionQueueName) {
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
            throw new Error("private worker run failure");
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
    queues,
    workerRecord,
    queue(name) {
      return queues.find((queue) => queue.name === name);
    },
  };
}

function runtime(testInfrastructure, consumer) {
  return createRailwayBullMqMessageTemplateSubmissionQueueRuntime({
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

function workerJob(message, overrides = {}) {
  return {
    id: message.submissionKey,
    name: "submit-message-template-v1",
    data: message,
    timestamp: fixedJobTimestamp,
    attemptsMade: 0,
    ...overrides,
  };
}

test("publishes bounded messages with deterministic IDs and fixed retry policy", async () => {
  const testInfrastructure = infrastructure();
  const queueRuntime = runtime(testInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });
  const first = createMessageTemplateSubmissionQueueMessage(
    7,
    firstSubmissionKey,
  );
  const second = createMessageTemplateSubmissionQueueMessage(
    8,
    secondSubmissionKey,
  );

  await assert.rejects(
    queueRuntime.publisher.publish([first]),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "not-started",
  );

  await queueRuntime.start();
  await queueRuntime.publisher.publish([first, second]);
  await queueRuntime.publisher.publish([first, second]);
  await queueRuntime.publisher.publish([]);

  const source = testInfrastructure.queue(
    railwayBullMqMessageTemplateSubmissionQueueName,
  );
  assert.equal(source.addedBulk.length, 2);
  assert.deepEqual(
    source.addedBulk[0].map((job) => job.opts.jobId),
    [firstSubmissionKey, secondSubmissionKey],
  );
  assert.deepEqual(source.addedBulk[0], source.addedBulk[1]);
  assert.deepEqual(source.options.defaultJobOptions.backoff, {
    type: "fixed",
    delay: 30000,
  });
  assert.equal(
    Object.hasOwn(source.options.defaultJobOptions.backoff, "jitter"),
    false,
  );
  assert.equal(source.options.defaultJobOptions.attempts, 11);
  assert.deepEqual(source.options.defaultJobOptions.removeOnComplete, {
    age: 86400,
    count: 1000,
  });
  assert.deepEqual(source.options.defaultJobOptions.removeOnFail, {
    age: 604800,
    count: 2000,
  });
  assert.equal(source.options.connection.family, 0);
  assert.equal(source.options.connection.maxRetriesPerRequest, 1);
  assert.equal(source.options.connection.enableOfflineQueue, false);
  assert.equal(source.options.prefix, "connect-test-v1");

  await assert.rejects(
    queueRuntime.publisher.publish(Array.from({ length: 11 }, () => first)),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "message-invalid",
  );
  await assert.rejects(
    queueRuntime.publisher.publish([{ ...first, extension: true }]),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "message-invalid",
  );
  await queueRuntime.close();
});

test("maps explicit acknowledgement and bounded retries per delivery", async () => {
  const testInfrastructure = infrastructure();
  let action = "ack";
  const deliveries = [];
  const queueRuntime = runtime(testInfrastructure, {
    async handle(batch) {
      const delivery = batch.messages[0];
      deliveries.push({
        id: delivery.id,
        timestamp: delivery.timestamp.toISOString(),
        attempts: delivery.attempts,
        body: delivery.body,
      });
      if (action === "ack") {
        delivery.ack();
      } else {
        delivery.retry({ delaySeconds: 30 });
      }
    },
  });
  const message = createMessageTemplateSubmissionQueueMessage(
    7,
    firstSubmissionKey,
  );

  await queueRuntime.start();
  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(workerJob(message)),
    { outcome: "acknowledged" },
  );
  assert.deepEqual(deliveries[0], {
    id: firstSubmissionKey,
    timestamp: "2026-08-21T11:59:00.000Z",
    attempts: 1,
    body: message,
  });

  action = "retry";
  await assert.rejects(
    testInfrastructure.workerRecord.processor(workerJob(message)),
    /requires retry/,
  );
  assert.equal(
    testInfrastructure.queue(
      railwayBullMqMessageTemplateSubmissionDeadLetterQueueName,
    ).added.length,
    0,
  );

  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(workerJob(message, {
      attemptsMade: 10,
    })),
    { outcome: "dead-lettered" },
  );
  const deadLetter = testInfrastructure.queue(
    railwayBullMqMessageTemplateSubmissionDeadLetterQueueName,
  ).added[0];
  assert.equal(
    deadLetter.jobOptions.jobId,
    `${firstSubmissionKey}_${fixedJobTimestamp}`,
  );
  assert.equal(deadLetter.data.reason, "retry-exhausted");
  assert.equal(deadLetter.data.attempts, 11);
  assert.equal(deadLetter.data.failedAt, fixedNow);
  assert.deepEqual(deadLetter.data.body, message);
  assert.equal(
    testInfrastructure.events.includes(
      "telemetry.dead-letter.retry-exhausted",
    ),
    true,
  );
  await queueRuntime.close();
});

test("moves a poison envelope directly to the dedicated DLQ", async () => {
  const testInfrastructure = infrastructure();
  let consumerCalls = 0;
  const queueRuntime = runtime(testInfrastructure, {
    async handle() {
      consumerCalls += 1;
    },
  });
  const poisonBody = Object.freeze({
    version: 1,
    tenantId: 7,
    submissionKey: "invalid",
  });

  await queueRuntime.start();
  assert.deepEqual(
    await testInfrastructure.workerRecord.processor({
      id: "poison_job",
      name: "submit-message-template-v1",
      data: poisonBody,
      timestamp: fixedJobTimestamp,
      attemptsMade: 0,
    }),
    { outcome: "dead-lettered" },
  );
  assert.equal(consumerCalls, 0);
  const deadLetter = testInfrastructure.queue(
    railwayBullMqMessageTemplateSubmissionDeadLetterQueueName,
  ).added[0];
  assert.equal(deadLetter.data.reason, "invalid-envelope");
  assert.deepEqual(deadLetter.data.body, poisonBody);
  assert.equal(
    testInfrastructure.events.includes(
      "telemetry.dead-letter.invalid-envelope",
    ),
    true,
  );
  await queueRuntime.close();
});

test("retains the source failure when the dedicated DLQ cannot accept it", async () => {
  const testInfrastructure = infrastructure({ deadLetterFailure: true });
  const queueRuntime = runtime(testInfrastructure, {
    async handle(batch) {
      batch.messages[0].retry({ delaySeconds: 30 });
    },
  });
  const message = createMessageTemplateSubmissionQueueMessage(
    7,
    firstSubmissionKey,
  );

  await queueRuntime.start();
  await assert.rejects(
    testInfrastructure.workerRecord.processor(workerJob(message, {
      attemptsMade: 10,
    })),
    (error) =>
      error instanceof Error &&
      /dead-letter persistence failed/.test(error.message) &&
      !error.message.includes("private"),
  );
  assert.equal(
    testInfrastructure.events.includes(
      "telemetry.dead-letter.retry-exhausted",
    ),
    false,
  );
  await queueRuntime.close();
});

test("cleans only expired waiting DLQ jobs in one bounded maintenance batch", async () => {
  const testInfrastructure = infrastructure({
    cleanedIds: ["first", "second", "third"],
  });
  const queueRuntime = runtime(testInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });

  await assert.rejects(
    queueRuntime.cleanExpiredDeadLetters(),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "not-started",
  );
  await queueRuntime.start();
  assert.equal(await queueRuntime.cleanExpiredDeadLetters(), 3);

  const deadLetterQueue = testInfrastructure.queue(
    railwayBullMqMessageTemplateSubmissionDeadLetterQueueName,
  );
  assert.deepEqual(deadLetterQueue.cleaned, [{
    graceMilliseconds: 2592000000,
    limit: 100,
    type: "wait",
  }]);
  assert.equal(
    testInfrastructure.events.includes("telemetry.dead-letter-cleanup.3"),
    true,
  );
  await queueRuntime.close();
});

test("maps publisher and cleanup failures without leaking Redis details", async () => {
  const publishInfrastructure = infrastructure({ publishFailure: true });
  const publishRuntime = runtime(publishInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });
  const message = createMessageTemplateSubmissionQueueMessage(
    7,
    firstSubmissionKey,
  );
  await publishRuntime.start();
  await assert.rejects(
    publishRuntime.publisher.publish([message]),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "publish-failed" &&
      !error.message.includes("private"),
  );
  assert.equal(
    publishInfrastructure.events.includes("telemetry.publisher-failure"),
    true,
  );
  await publishRuntime.close();

  const cleanInfrastructure = infrastructure({ cleanFailure: true });
  const cleanRuntime = runtime(cleanInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });
  await cleanRuntime.start();
  await assert.rejects(
    cleanRuntime.cleanExpiredDeadLetters(),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "maintenance-failed" &&
      !error.message.includes("private"),
  );
  await cleanRuntime.close();
});

test("records queue and worker failures without giving telemetry control", async () => {
  const testInfrastructure = infrastructure({ workerRunFailure: true });
  const queueRuntime = runtime(testInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });

  await queueRuntime.start();
  testInfrastructure.queue(
    railwayBullMqMessageTemplateSubmissionQueueName,
  ).errorListener();
  testInfrastructure.workerRecord.errorListener();
  testInfrastructure.workerRecord.failedListener();
  await Promise.resolve();

  assert.equal(
    testInfrastructure.events.filter(
      (event) => event === "telemetry.connection-failure",
    ).length,
    2,
  );
  assert.equal(
    testInfrastructure.events.includes("telemetry.worker-failure"),
    true,
  );
  assert.equal(
    testInfrastructure.events.includes("telemetry.worker-runtime-failure"),
    true,
  );
  await queueRuntime.close();
});

test("closes every resource after startup and shutdown failures", async () => {
  const startupInfrastructure = infrastructure({ readinessFailure: true });
  const startupRuntime = runtime(startupInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });

  await assert.rejects(
    startupRuntime.start(),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "startup-failed" &&
      !error.message.includes("private"),
  );
  assert.equal(startupInfrastructure.workerRecord.closeCalls, 1);
  assert.equal(
    startupInfrastructure.queues.every((queue) => queue.closeCalls === 1),
    true,
  );

  const closeInfrastructure = infrastructure({
    workerCloseFailure: true,
    queueCloseFailure: true,
  });
  const closeRuntime = runtime(closeInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });
  await closeRuntime.start();
  await assert.rejects(
    closeRuntime.close(),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "shutdown-failed" &&
      !error.message.includes("private"),
  );
  assert.equal(closeInfrastructure.workerRecord.closeCalls, 1);
  assert.equal(
    closeInfrastructure.queues.every((queue) => queue.closeCalls === 1),
    true,
  );
});

test("rejects invalid configuration, options and dependency extensions", () => {
  const testInfrastructure = infrastructure();
  const validOptions = {
    environment: environment(),
    consumer: { async handle() {} },
    telemetry: telemetry([]),
  };

  assert.throws(
    () => createRailwayBullMqMessageTemplateSubmissionQueueRuntime({}),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "options-invalid",
  );
  assert.throws(
    () => createRailwayBullMqMessageTemplateSubmissionQueueRuntime({
      ...validOptions,
      environment: {},
    }, testInfrastructure.dependencies),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "configuration-disabled",
  );
  assert.throws(
    () => createRailwayBullMqMessageTemplateSubmissionQueueRuntime(
      validOptions,
      { ...testInfrastructure.dependencies, extension: true },
    ),
    (error) =>
      error instanceof RailwayBullMqMessageTemplateSubmissionQueueError &&
      error.code === "dependencies-invalid",
  );
});
