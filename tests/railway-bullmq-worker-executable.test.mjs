import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayBullMqWorkerExecutableError,
  startRailwayBullMqWorkerExecutable,
} from "../server/platform/railwayBullMqWorkerExecutable.ts";
import {
  inspectRailwayBullMqConfiguration,
} from "../server/platform/railwayBullMqConfiguration.ts";

const ownerKey = `scheduler_owner_v1_${"f".repeat(64)}`;
const environment = Object.freeze({
  APP_RUNTIME_ENVIRONMENT: "test",
  DATABASE_URL: "postgresql://tal@127.0.0.1:55434/connect",
  RAILWAY_WORKER_SCHEDULER_OWNER_KEY: ownerKey,
  META_GRAPH_API_VERSION: "v21.0",
  META_CREDENTIAL_ENCRYPTION_KEY_V1:
    "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
  WHATSAPP_RATE_LIMIT_HMAC_KEY_V1:
    "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
  REDIS_URL: "redis://127.0.0.1:6379/0",
  BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
  BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
  BULLMQ_FAILED_RETENTION_SECONDS: "604800",
  BULLMQ_FAILED_RETENTION_COUNT: "1000",
  BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
  BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
});

const expectedBullMqEnvironment = Object.freeze({
  APP_RUNTIME_ENVIRONMENT: "test",
  REDIS_URL: "redis://127.0.0.1:6379/0",
  BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
  BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
  BULLMQ_FAILED_RETENTION_SECONDS: "604800",
  BULLMQ_FAILED_RETENTION_COUNT: "1000",
  BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
  BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
});

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
    environment,
    telemetry: {
      recordPostgresIdleClientError() {},
      recordSchedulerRunFailure() {},
      recordSchedulerTimerFailure() {},
      recordSchedulerOverlapSuppressed() {},
    },
    campaignDeliveries: {
      retryEvidenceSource: {
        isConfigured() {
          return false;
        },
        async load() {
          return null;
        },
      },
      telemetrySink: { async record() {} },
      queueTelemetry: queueTelemetry(),
    },
    messageTemplateSubmissions: {
      telemetrySink: { async record() {} },
      queueTelemetry: queueTelemetry(),
    },
    metaWebhooks: {
      telemetrySink: { async record() {} },
      queueTelemetry: queueTelemetry(),
    },
    teamInvitations: {
      createProvider() {
        return {
          isConfigured() {
            return true;
          },
          async invite() {
            return { status: "submitted" };
          },
          async lookup() {
            return { status: "submitted" };
          },
        };
      },
      telemetrySink: { async record() {} },
      queueTelemetry: queueTelemetry(),
    },
    ...overrides,
  };
}

function dependencies(overrides = {}) {
  const captured = {};
  const controller = { async start() {}, async close() {} };
  return {
    captured,
    controller,
    value: {
      async startExecutable(input) {
        captured.executable = input;
        if (overrides.startFailure) {
          throw new Error("private startup failure");
        }
        return controller;
      },
      createCampaignQueueRuntime(input) {
        captured.campaignQueue = input;
        return {
          queue: { async sendBatch() {} },
          async start() {},
          async cleanExpiredDeadLetters() {
            return 0;
          },
          async close() {},
        };
      },
      createTemplateQueueRuntime(input) {
        captured.templateQueue = input;
        return {
          publisher: { async publish() {} },
          async start() {},
          async cleanExpiredDeadLetters() {
            return 0;
          },
          async close() {},
        };
      },
      createMetaWebhookQueueRuntime(input) {
        captured.metaWebhookQueue = input;
        return {
          async start() {},
          async cleanExpiredDeadLetters() {
            return 0;
          },
          async close() {},
        };
      },
      createTeamInvitationQueueRuntime(input) {
        captured.teamInvitationQueue = input;
        return {
          async start() {},
          async cleanExpiredDeadLetters() {
            return 0;
          },
          async close() {},
        };
      },
    },
  };
}

test("binds all four implemented queues into one Railway worker process", async () => {
  const fixture = dependencies();
  const executableOptions = options();
  const controller = await startRailwayBullMqWorkerExecutable(
    executableOptions,
    fixture.value,
  );

  assert.equal(controller, fixture.controller);
  assert.equal(fixture.captured.executable.environment, environment);
  assert.equal(
    Object.hasOwn(fixture.captured.executable, "campaignQueue"),
    false,
  );
  assert.equal(
    Object.hasOwn(fixture.captured.executable, "botReplies"),
    false,
  );
  assert.equal(
    Object.hasOwn(fixture.captured.executable, "botReplyStaging"),
    false,
  );

  const campaignConsumer = { async handle() {} };
  const templateConsumer = { async handle() {} };
  const metaWebhookConsumer = { async handle() {} };
  const teamInvitationConsumer = { async handle() {} };
  fixture.captured.executable.campaignDeliveries
    .createQueueRuntime({ consumer: campaignConsumer });
  fixture.captured.executable.messageTemplateSubmissions
    .createQueueRuntime({ consumer: templateConsumer });
  fixture.captured.executable.metaWebhooks
    .createQueueRuntime({ consumer: metaWebhookConsumer });
  fixture.captured.executable.teamInvitations
    .createQueueRuntime({ consumer: teamInvitationConsumer });

  assert.equal(
    fixture.captured.campaignQueue.consumer,
    campaignConsumer,
  );
  assert.equal(
    fixture.captured.templateQueue.consumer,
    templateConsumer,
  );
  assert.equal(
    fixture.captured.metaWebhookQueue.consumer,
    metaWebhookConsumer,
  );
  assert.equal(
    fixture.captured.teamInvitationQueue.consumer,
    teamInvitationConsumer,
  );
  assert.deepEqual(
    fixture.captured.campaignQueue.environment,
    expectedBullMqEnvironment,
  );
  assert.deepEqual(
    fixture.captured.templateQueue.environment,
    expectedBullMqEnvironment,
  );
  assert.deepEqual(
    fixture.captured.metaWebhookQueue.environment,
    expectedBullMqEnvironment,
  );
  assert.deepEqual(
    fixture.captured.teamInvitationQueue.environment,
    expectedBullMqEnvironment,
  );
  assert.equal(
    inspectRailwayBullMqConfiguration(
      fixture.captured.teamInvitationQueue.environment,
    ).status,
    "configured",
  );
});

test("rejects legacy bot options before creating any queue or worker", async () => {
  for (const legacyOptions of [
    { botReplies: { telemetrySink: { async record() {} } } },
    {
      botReplyStaging: {
        createScenarioDriver() {},
        queueTelemetry: queueTelemetry(),
      },
    },
  ]) {
    const fixture = dependencies();
    await assert.rejects(
      startRailwayBullMqWorkerExecutable(
        options(legacyOptions),
        fixture.value,
      ),
      (error) =>
        error instanceof RailwayBullMqWorkerExecutableError &&
        error.code === "options-invalid",
    );
    assert.deepEqual(fixture.captured, {});
  }
});

test("rejects incomplete options and altered dependencies", async () => {
  for (const value of [
    {},
    options({ campaignDeliveries: {} }),
    options({ messageTemplateSubmissions: {} }),
    options({ metaWebhooks: {} }),
    options({ teamInvitations: {} }),
    options({ telemetry: {} }),
    options({ unsupported: true }),
  ]) {
    await assert.rejects(
      startRailwayBullMqWorkerExecutable(value, dependencies().value),
      (error) =>
        error instanceof RailwayBullMqWorkerExecutableError &&
        error.code === "options-invalid",
    );
  }

  const fixture = dependencies();
  await assert.rejects(
    startRailwayBullMqWorkerExecutable(options(), {
      ...fixture.value,
      unsupported: true,
    }),
    (error) =>
      error instanceof RailwayBullMqWorkerExecutableError &&
      error.code === "dependencies-invalid",
  );
});

test("maps provider startup failure without leaking its detail", async () => {
  await assert.rejects(
    startRailwayBullMqWorkerExecutable(
      options(),
      dependencies({ startFailure: true }).value,
    ),
    (error) =>
      error instanceof RailwayBullMqWorkerExecutableError &&
      error.code === "startup-failed" &&
      !error.message.includes("private"),
  );
});
