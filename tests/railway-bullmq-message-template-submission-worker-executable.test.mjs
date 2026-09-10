import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayBullMqMessageTemplateSubmissionWorkerExecutableError,
  startRailwayBullMqMessageTemplateSubmissionWorkerExecutable,
} from "../server/platform/railwayBullMqMessageTemplateSubmissionWorkerExecutable.ts";

const ownerKey = `scheduler_owner_v1_${"d".repeat(64)}`;
const clock = Object.freeze({
  now() {
    return new Date("2026-08-21T15:00:00.000Z");
  },
});

function environment() {
  return {
    APP_RUNTIME_ENVIRONMENT: "test",
    DATABASE_URL:
      "postgresql://tal@127.0.0.1:55434/connect_driver_integration",
    POSTGRES_APPLICATION_NAME: "connect-worker-test",
    POSTGRES_MAX_CONNECTIONS: "4",
    POSTGRES_CONNECTION_TIMEOUT_MS: "2000",
    POSTGRES_IDLE_TIMEOUT_MS: "2000",
    POSTGRES_STATEMENT_TIMEOUT_MS: "15000",
    POSTGRES_QUERY_TIMEOUT_MS: "20000",
    POSTGRES_LOCK_TIMEOUT_MS: "3000",
    POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS: "10000",
    POSTGRES_MAX_LIFETIME_SECONDS: "1800",
    POSTGRES_TLS_MODE: "disabled",
    RAILWAY_WORKER_SCHEDULER_OWNER_KEY: ownerKey,
    META_GRAPH_API_VERSION: "v21.0",
    META_CREDENTIAL_ENCRYPTION_KEY_V1:
      "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
    REDIS_URL: "redis://default:secret@127.0.0.1:6379/0",
    BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
    BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
    BULLMQ_FAILED_RETENTION_SECONDS: "604800",
    BULLMQ_FAILED_RETENTION_COUNT: "2000",
    BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
    BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
  };
}

function queueTelemetry() {
  return {
    recordConnectionFailure() {},
    recordWorkerFailure() {},
    recordWorkerRuntimeFailure() {},
    recordPublisherFailure() {},
    recordDeadLetter() {},
    recordDeadLetterCleanup() {},
  };
}

function options(overrides = {}) {
  return {
    environment: environment(),
    campaignQueue: {
      async sendBatch() {},
    },
    telemetry: {
      recordPostgresIdleClientError() {},
      recordSchedulerRunFailure() {},
      recordSchedulerTimerFailure() {},
      recordSchedulerOverlapSuppressed() {},
    },
    clock,
    messageTemplateSubmissions: {
      queueTelemetry: queueTelemetry(),
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
    ...overrides,
  };
}

function dependencies(overrides = {}) {
  const captured = {};
  const controller = Object.freeze({
    async start() {},
    async close() {},
  });
  const queueRuntime = Object.freeze({
    publisher: Object.freeze({ async publish() {} }),
    async start() {},
    async cleanExpiredDeadLetters() {
      return 0;
    },
    async close() {},
  });

  return {
    captured,
    controller,
    queueRuntime,
    value: {
      async startExecutable(executableOptions) {
        captured.executableOptions = executableOptions;
        if (overrides.startupFailure) {
          throw new Error("private executable failure");
        }
        return controller;
      },
      createQueueRuntime(queueOptions) {
        captured.queueOptions = queueOptions;
        return queueRuntime;
      },
    },
  };
}

test("binds BullMQ to the durable template consumer without copying telemetry into jobs", async () => {
  const fixture = dependencies();
  const executableOptions = options();
  const controller =
    await startRailwayBullMqMessageTemplateSubmissionWorkerExecutable(
      executableOptions,
      fixture.value,
    );

  assert.equal(controller, fixture.controller);
  assert.equal(
    fixture.captured.executableOptions.environment,
    executableOptions.environment,
  );
  assert.equal(
    fixture.captured.executableOptions.messageTemplateSubmissions.telemetrySink,
    executableOptions.messageTemplateSubmissions.telemetrySink,
  );
  assert.equal(
    Object.hasOwn(
      fixture.captured.executableOptions.messageTemplateSubmissions,
      "queueTelemetry",
    ),
    false,
  );

  const consumer = Object.freeze({ async handle() {} });
  const runtime =
    fixture.captured.executableOptions.messageTemplateSubmissions
      .createQueueRuntime({ consumer });

  assert.equal(runtime, fixture.queueRuntime);
  assert.equal(fixture.captured.queueOptions.environment, executableOptions.environment);
  assert.equal(fixture.captured.queueOptions.consumer, consumer);
  assert.equal(
    fixture.captured.queueOptions.telemetry,
    executableOptions.messageTemplateSubmissions.queueTelemetry,
  );
  assert.equal(fixture.captured.queueOptions.clock, clock);
});

test("rejects malformed or extended provider bindings before startup", async () => {
  for (const invalidOptions of [
    {},
    options({ campaignQueue: {} }),
    options({ telemetry: {} }),
    options({ clock: {} }),
    options({ messageTemplateSubmissions: {} }),
    options({
      messageTemplateSubmissions: {
        queueTelemetry: {
          ...queueTelemetry(),
          unexpected: true,
        },
        telemetrySink: { async record() {} },
      },
    }),
    options({ unsupported: true }),
  ]) {
    await assert.rejects(
      startRailwayBullMqMessageTemplateSubmissionWorkerExecutable(
        invalidOptions,
        dependencies().value,
      ),
      (error) =>
        error instanceof
          RailwayBullMqMessageTemplateSubmissionWorkerExecutableError &&
        error.code === "options-invalid",
    );
  }
});

test("rejects altered dependencies and sanitizes startup failure", async () => {
  const fixture = dependencies();
  await assert.rejects(
    startRailwayBullMqMessageTemplateSubmissionWorkerExecutable(
      options(),
      { ...fixture.value, extra: true },
    ),
    (error) =>
      error instanceof
        RailwayBullMqMessageTemplateSubmissionWorkerExecutableError &&
      error.code === "dependencies-invalid",
  );

  await assert.rejects(
    startRailwayBullMqMessageTemplateSubmissionWorkerExecutable(
      options(),
      dependencies({ startupFailure: true }).value,
    ),
    (error) =>
      error instanceof
        RailwayBullMqMessageTemplateSubmissionWorkerExecutableError &&
      error.code === "startup-failed" &&
      !error.message.includes("private"),
  );
});
