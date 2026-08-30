import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayBullMqCampaignDeliveryQueueRuntime,
  railwayBullMqCampaignDeliveryDeadLetterQueueName,
  RailwayBullMqCampaignDeliveryQueueError,
  railwayBullMqCampaignDeliveryQueueName,
} from "../server/platform/railwayBullMqCampaignDeliveryQueue.ts";
import {
  createCampaignDeliveryQueueMessage,
} from "../server/campaigns/campaignDeliveryQueueMessage.ts";

const fixedNow = "2026-08-21T12:00:00.000Z";
const fixedJobTimestamp = Date.parse("2026-08-21T11:59:00.000Z");
const firstDeliveryKey = `campaign_delivery_v1_${"a".repeat(64)}`;
const secondDeliveryKey = `campaign_delivery_v1_${"b".repeat(64)}`;

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
              name === railwayBullMqCampaignDeliveryQueueName) {
            throw new Error("private redis publisher failure");
          }
          record.addedBulk.push(jobs);
        },
        async add(jobName, data, jobOptions) {
          events.push(`${name}.add`);
          if (overrides.deadLetterFailure &&
              name === railwayBullMqCampaignDeliveryDeadLetterQueueName) {
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
          return overrides.cleanedIds ?? ["dead-letter-one"];
        },
        async waitUntilReady() {
          events.push(`${name}.ready`);
          if (overrides.readinessFailure &&
              name === railwayBullMqCampaignDeliveryQueueName) {
            throw new Error("private redis readiness failure");
          }
        },
        async close() {
          events.push(`${name}.close`);
          record.closeCalls += 1;
          if (overrides.queueCloseFailure &&
              name === railwayBullMqCampaignDeliveryQueueName) {
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
  return createRailwayBullMqCampaignDeliveryQueueRuntime({
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

function queueEntry(deliveryKey) {
  return {
    body: createCampaignDeliveryQueueMessage(deliveryKey),
    contentType: "json",
  };
}

function workerJob(message, overrides = {}) {
  return {
    id: message.deliveryKey,
    name: "deliver-campaign-message-v1",
    data: message,
    timestamp: fixedJobTimestamp,
    attemptsMade: 0,
    ...overrides,
  };
}

test("publishes bounded campaign jobs with deterministic IDs", async () => {
  const testInfrastructure = infrastructure();
  const queueRuntime = runtime(testInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });
  const first = queueEntry(firstDeliveryKey);
  const second = queueEntry(secondDeliveryKey);

  await assert.rejects(
    queueRuntime.queue.sendBatch([first]),
    (error) =>
      error instanceof RailwayBullMqCampaignDeliveryQueueError &&
      error.code === "not-started",
  );

  await queueRuntime.start();
  await queueRuntime.queue.sendBatch([first, second]);
  await queueRuntime.queue.sendBatch([first, second]);
  await queueRuntime.queue.sendBatch([]);

  const source = testInfrastructure.queue(
    railwayBullMqCampaignDeliveryQueueName,
  );
  assert.equal(source.addedBulk.length, 2);
  assert.deepEqual(
    source.addedBulk[0].map((job) => job.opts.jobId),
    [firstDeliveryKey, secondDeliveryKey],
  );
  assert.deepEqual(source.addedBulk[0], source.addedBulk[1]);
  assert.deepEqual(source.options.defaultJobOptions.backoff, {
    type: "campaign-delivery-bounded-v1",
  });
  assert.equal(source.options.defaultJobOptions.attempts, 11);
  assert.deepEqual(source.options.defaultJobOptions.removeOnComplete, {
    age: 86400,
    count: 1000,
  });
  assert.deepEqual(source.options.defaultJobOptions.removeOnFail, {
    age: 604800,
    count: 2000,
  });
  assert.equal(source.options.connection.maxRetriesPerRequest, 1);
  assert.equal(source.options.connection.enableOfflineQueue, false);

  await assert.rejects(
    queueRuntime.queue.sendBatch(
      Array.from({ length: 11 }, () => first),
    ),
    (error) =>
      error instanceof RailwayBullMqCampaignDeliveryQueueError &&
      error.code === "message-invalid",
  );
  await assert.rejects(
    queueRuntime.queue.sendBatch([{
      ...first,
      contentType: "text",
    }]),
    (error) =>
      error instanceof RailwayBullMqCampaignDeliveryQueueError &&
      error.code === "message-invalid",
  );
  await queueRuntime.close();
});

test("maps acknowledgement and exact dynamic delays without jitter", async () => {
  const testInfrastructure = infrastructure();
  let action = "ack";
  let delaySeconds = 6;
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
        delivery.retry({ delaySeconds });
      }
    },
  });
  const message = createCampaignDeliveryQueueMessage(firstDeliveryKey);

  await queueRuntime.start();
  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(workerJob(message)),
    { outcome: "acknowledged" },
  );
  assert.deepEqual(deliveries[0], {
    id: firstDeliveryKey,
    timestamp: "2026-08-21T11:59:00.000Z",
    attempts: 1,
    body: message,
  });

  action = "retry";
  let retryError;
  try {
    await testInfrastructure.workerRecord.processor(workerJob(message));
  } catch (error) {
    retryError = error;
  }
  assert.equal(retryError?.message, "BullMQ campaign delivery requires retry");
  assert.equal(retryError?.delayMilliseconds, 6000);
  assert.equal(
    testInfrastructure.workerRecord.options.settings.backoffStrategy(
      1,
      "campaign-delivery-bounded-v1",
      retryError,
    ),
    6000,
  );

  delaySeconds = 86400;
  await assert.rejects(
    testInfrastructure.workerRecord.processor(workerJob(message)),
    (error) =>
      error?.delayMilliseconds === 86400000,
  );
  assert.equal(
    testInfrastructure.workerRecord.options.settings.backoffStrategy(
      1,
      "unknown",
      retryError,
    ),
    -1,
  );
  await queueRuntime.close();
});

test("uses a bounded fallback retry when the consumer fails or omits an action", async () => {
  const message = createCampaignDeliveryQueueMessage(firstDeliveryKey);
  for (const consumer of [
    { async handle() {} },
    { async handle() { throw new Error("private consumer failure"); } },
  ]) {
    const testInfrastructure = infrastructure();
    const queueRuntime = runtime(testInfrastructure, consumer);
    await queueRuntime.start();
    await assert.rejects(
      testInfrastructure.workerRecord.processor(workerJob(message)),
      (error) =>
        error?.delayMilliseconds === 30000 &&
        !error.message.includes("private"),
    );
    await queueRuntime.close();
  }
});

test("moves poison and exhausted deliveries to the dedicated DLQ", async () => {
  const testInfrastructure = infrastructure();
  let consumerCalls = 0;
  const queueRuntime = runtime(testInfrastructure, {
    async handle(batch) {
      consumerCalls += 1;
      batch.messages[0].retry({ delaySeconds: 60 });
    },
  });
  const message = createCampaignDeliveryQueueMessage(firstDeliveryKey);

  await queueRuntime.start();
  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(workerJob({
      version: 1,
      deliveryKey: "invalid",
    }, {
      id: firstDeliveryKey,
    })),
    { outcome: "dead-lettered" },
  );
  assert.equal(consumerCalls, 0);

  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(workerJob(message, {
      attemptsMade: 10,
    })),
    { outcome: "dead-lettered" },
  );
  const deadLetters = testInfrastructure.queue(
    railwayBullMqCampaignDeliveryDeadLetterQueueName,
  ).added;
  assert.equal(deadLetters.length, 2);
  assert.equal(deadLetters[0].data.reason, "invalid-envelope");
  assert.equal(deadLetters[1].data.reason, "retry-exhausted");
  assert.equal(deadLetters[1].data.attempts, 11);
  assert.equal(deadLetters[1].data.failedAt, fixedNow);
  assert.deepEqual(deadLetters[1].data.body, message);
  assert.equal(
    testInfrastructure.events.includes(
      "telemetry.dead-letter.retry-exhausted",
    ),
    true,
  );
  await queueRuntime.close();
});

test("retains the source failure when the DLQ cannot accept it", async () => {
  const testInfrastructure = infrastructure({ deadLetterFailure: true });
  const queueRuntime = runtime(testInfrastructure, {
    async handle(batch) {
      batch.messages[0].retry({ delaySeconds: 60 });
    },
  });
  const message = createCampaignDeliveryQueueMessage(firstDeliveryKey);

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

test("cleans bounded expired DLQ jobs and maps provider failures", async () => {
  const testInfrastructure = infrastructure({
    cleanedIds: ["first", "second"],
  });
  const queueRuntime = runtime(testInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });

  await queueRuntime.start();
  assert.equal(await queueRuntime.cleanExpiredDeadLetters(), 2);
  assert.deepEqual(
    testInfrastructure.queue(
      railwayBullMqCampaignDeliveryDeadLetterQueueName,
    ).cleaned,
    [{
      graceMilliseconds: 2592000000,
      limit: 100,
      type: "wait",
    }],
  );
  assert.equal(
    testInfrastructure.events.includes("telemetry.dead-letter-cleanup.2"),
    true,
  );
  await queueRuntime.close();

  const failedInfrastructure = infrastructure({ publishFailure: true });
  const failedRuntime = runtime(failedInfrastructure, {
    async handle(batch) {
      batch.messages[0].ack();
    },
  });
  await failedRuntime.start();
  await assert.rejects(
    failedRuntime.queue.sendBatch([queueEntry(firstDeliveryKey)]),
    (error) =>
      error instanceof RailwayBullMqCampaignDeliveryQueueError &&
      error.code === "publish-failed" &&
      !error.message.includes("private"),
  );
  assert.equal(
    failedInfrastructure.events.includes("telemetry.publisher-failure"),
    true,
  );
  await failedRuntime.close();
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
      error instanceof RailwayBullMqCampaignDeliveryQueueError &&
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
      error instanceof RailwayBullMqCampaignDeliveryQueueError &&
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
    () => createRailwayBullMqCampaignDeliveryQueueRuntime({}),
    (error) =>
      error instanceof RailwayBullMqCampaignDeliveryQueueError &&
      error.code === "options-invalid",
  );
  assert.throws(
    () => createRailwayBullMqCampaignDeliveryQueueRuntime({
      ...validOptions,
      environment: {},
    }, testInfrastructure.dependencies),
    (error) =>
      error instanceof RailwayBullMqCampaignDeliveryQueueError &&
      error.code === "configuration-disabled",
  );
  assert.throws(
    () => createRailwayBullMqCampaignDeliveryQueueRuntime(
      validOptions,
      { ...testInfrastructure.dependencies, extension: true },
    ),
    (error) =>
      error instanceof RailwayBullMqCampaignDeliveryQueueError &&
      error.code === "dependencies-invalid",
  );
});
