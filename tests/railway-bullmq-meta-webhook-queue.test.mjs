import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayBullMqMetaWebhookPublisherRuntime,
  createRailwayBullMqMetaWebhookWorkerRuntime,
  railwayBullMqMetaWebhookDeadLetterQueueName,
  RailwayBullMqMetaWebhookQueueError,
  railwayBullMqMetaWebhookQueueName,
} from "../server/platform/railwayBullMqMetaWebhookQueue.ts";
import {
  createMetaWebhookQueueMessage,
} from "../server/meta/metaWebhookQueueMessage.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";

const fixedNow = "2026-08-21T12:00:00.000Z";
const fixedJobTimestamp = Date.parse("2026-08-21T11:59:00.000Z");
const signatureHeader = `sha256=${"a".repeat(64)}`;

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
            name === railwayBullMqMetaWebhookQueueName
          ) {
            throw new Error("private redis publisher failure");
          }
          if (
            overrides.deadLetterFailure &&
            name === railwayBullMqMetaWebhookDeadLetterQueueName
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
          if (
            overrides.readinessFailure &&
            name === railwayBullMqMetaWebhookQueueName
          ) {
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

function message() {
  return createMetaWebhookQueueMessage(
    new TextEncoder().encode(
      '{"object":"whatsapp_business_account","entry":[{"id":"waba-1","time":1787310000,"changes":[]}]}',
    ),
    signatureHeader,
  );
}

function workerRuntime(testInfrastructure, consumer) {
  return createRailwayBullMqMetaWebhookWorkerRuntime({
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

test("publisher preserves webhook bytes and uses their deterministic digest as the job ID", async () => {
  const testInfrastructure = infrastructure();
  const runtime = createRailwayBullMqMetaWebhookPublisherRuntime({
    environment: environment(),
    telemetry: {
      recordConnectionFailure() {},
      recordPublisherFailure() {},
    },
  }, testInfrastructure.dependencies);
  const queueMessage = message();
  const eventKey = await sha256Hex(
    new Uint8Array(queueMessage.rawPayload),
  );

  await assert.rejects(
    runtime.queue.publish(queueMessage),
    (error) =>
      error instanceof RailwayBullMqMetaWebhookQueueError &&
      error.code === "not-started",
  );
  await runtime.start();
  await runtime.queue.publish(queueMessage);
  await runtime.queue.publish(queueMessage);

  const source = testInfrastructure.queue(railwayBullMqMetaWebhookQueueName);
  assert.equal(source.added.length, 2);
  assert.equal(source.added[0].jobOptions.jobId, eventKey);
  assert.equal(source.added[1].jobOptions.jobId, eventKey);
  assert.equal(source.added[0].jobOptions.attempts, 11);
  assert.deepEqual(source.added[0].jobOptions.backoff, {
    type: "fixed",
    delay: 30000,
  });
  assert.equal(
    Object.hasOwn(source.added[0].jobOptions.backoff, "jitter"),
    false,
  );
  assert.deepEqual(source.added[0].jobOptions.removeOnComplete, {
    age: 86400,
    count: 1000,
  });
  assert.equal(
    Buffer.from(source.added[0].data.rawPayloadBase64, "base64")
      .equals(Buffer.from(queueMessage.rawPayload)),
    true,
  );
  assert.equal(source.options.connection.maxRetriesPerRequest, 1);
  assert.equal(source.options.connection.enableOfflineQueue, false);
  assert.equal(source.options.prefix, "connect-test-v1");

  await runtime.close();
});

test("worker reconstructs the exact ArrayBuffer and isolates ack from retry", async () => {
  const publisherInfrastructure = infrastructure();
  const publisher = createRailwayBullMqMetaWebhookPublisherRuntime({
    environment: environment(),
    telemetry: {
      recordConnectionFailure() {},
      recordPublisherFailure() {},
    },
  }, publisherInfrastructure.dependencies);
  const queueMessage = message();
  await publisher.start();
  await publisher.queue.publish(queueMessage);
  const published = publisherInfrastructure.queue(
    railwayBullMqMetaWebhookQueueName,
  ).added[0];
  await publisher.close();

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
        delivery.retry({ delaySeconds: 30 });
      }
    },
  });
  await runtime.start();
  const job = {
    id: published.jobOptions.jobId,
    name: published.jobName,
    data: published.data,
    timestamp: fixedJobTimestamp,
    attemptsMade: 0,
  };

  assert.deepEqual(
    await testInfrastructure.workerRecord.processor(job),
    { outcome: "acknowledged" },
  );
  assert.equal(deliveries[0].id, published.jobOptions.jobId);
  assert.equal(deliveries[0].attempts, 1);
  assert.equal(deliveries[0].timestamp.toISOString(),
    "2026-08-21T11:59:00.000Z");
  assert.equal(
    Buffer.from(deliveries[0].body.rawPayload)
      .equals(Buffer.from(queueMessage.rawPayload)),
    true,
  );

  action = "retry";
  await assert.rejects(
    testInfrastructure.workerRecord.processor(job),
    /requires retry/,
  );
  assert.deepEqual(
    await testInfrastructure.workerRecord.processor({
      ...job,
      attemptsMade: 10,
    }),
    { outcome: "dead-lettered" },
  );
  const deadLetter = testInfrastructure.queue(
    railwayBullMqMetaWebhookDeadLetterQueueName,
  ).added[0];
  assert.equal(deadLetter.data.reason, "retry-exhausted");
  assert.equal(deadLetter.data.attempts, 11);
  assert.equal(deadLetter.data.failedAt, fixedNow);
  assert.deepEqual(deadLetter.data.body, published.data);
  await runtime.close();
});

test("worker dead-letters a poison wire envelope before the domain consumer", async () => {
  const testInfrastructure = infrastructure();
  let consumerCalls = 0;
  const runtime = workerRuntime(testInfrastructure, {
    async handle() {
      consumerCalls += 1;
    },
  });
  await runtime.start();

  assert.deepEqual(
    await testInfrastructure.workerRecord.processor({
      id: "poison_job",
      name: "process-meta-webhook-v1",
      data: {
        version: 1,
        rawPayloadBase64: "not canonical base64",
        signatureHeader,
      },
      timestamp: fixedJobTimestamp,
      attemptsMade: 0,
    }),
    { outcome: "dead-lettered" },
  );
  assert.equal(consumerCalls, 0);
  const deadLetter = testInfrastructure.queue(
    railwayBullMqMetaWebhookDeadLetterQueueName,
  ).added[0];
  assert.equal(deadLetter.data.reason, "invalid-envelope");
  assert.equal(
    testInfrastructure.events.includes(
      "telemetry.dead-letter.invalid-envelope",
    ),
    true,
  );
  await runtime.close();
});

test("DLQ persistence failure keeps the source job failed and maintenance is bounded", async () => {
  const failedInfrastructure = infrastructure({ deadLetterFailure: true });
  const failedRuntime = workerRuntime(failedInfrastructure, {
    async handle(batch) {
      batch.messages[0].retry({ delaySeconds: 30 });
    },
  });
  await failedRuntime.start();
  await assert.rejects(
    failedInfrastructure.workerRecord.processor({
      id: "poison_job",
      name: "process-meta-webhook-v1",
      data: { invalid: true },
      timestamp: fixedJobTimestamp,
      attemptsMade: 10,
    }),
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
      error instanceof RailwayBullMqMetaWebhookQueueError &&
      error.code === "not-started",
  );
  await cleanRuntime.start();
  assert.equal(await cleanRuntime.cleanExpiredDeadLetters(), 3);
  assert.deepEqual(
    cleanInfrastructure.queue(
      railwayBullMqMetaWebhookDeadLetterQueueName,
    ).cleaned,
    [{ graceMilliseconds: 2592000000, limit: 100, type: "wait" }],
  );
  await cleanRuntime.close();
});

test("publisher fails closed on Redis errors and both runtimes reject invalid configuration", async () => {
  const testInfrastructure = infrastructure({ publishFailure: true });
  const runtime = createRailwayBullMqMetaWebhookPublisherRuntime({
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
    runtime.queue.publish(message()),
    (error) =>
      error instanceof RailwayBullMqMetaWebhookQueueError &&
      error.code === "publish-failed" &&
      !error.message.includes("private"),
  );
  assert.equal(
    testInfrastructure.events.includes("telemetry.publisher-failure"),
    true,
  );
  await runtime.close();

  assert.throws(
    () => createRailwayBullMqMetaWebhookPublisherRuntime({}),
    (error) =>
      error instanceof RailwayBullMqMetaWebhookQueueError &&
      error.code === "options-invalid",
  );
  assert.throws(
    () => createRailwayBullMqMetaWebhookWorkerRuntime({
      environment: {},
      consumer: { async handle() {} },
      telemetry: telemetry([]),
    }, testInfrastructure.dependencies),
    (error) =>
      error instanceof RailwayBullMqMetaWebhookQueueError &&
      error.code === "configuration-disabled",
  );
  assert.throws(
    () => createRailwayBullMqMetaWebhookPublisherRuntime({
      environment: environment(),
      telemetry: {
        recordConnectionFailure() {},
        recordPublisherFailure() {},
      },
    }, { ...testInfrastructure.dependencies, extension: true }),
    (error) =>
      error instanceof RailwayBullMqMetaWebhookQueueError &&
      error.code === "dependencies-invalid",
  );
});
