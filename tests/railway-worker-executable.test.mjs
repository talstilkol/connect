import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayWorkerExecutableError,
  startRailwayWorkerExecutable,
} from "../server/platform/railwayWorkerExecutable.ts";

const ownerKey = `scheduler_owner_v1_${"e".repeat(64)}`;
const environment = Object.freeze({
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
  WHATSAPP_RATE_LIMIT_HMAC_KEY_V1:
    "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
});

function options(overrides = {}) {
  return {
    environment,
    campaignQueue: {
      async sendBatch() {},
    },
    telemetry: {
      recordPostgresIdleClientError() {},
      recordSchedulerRunFailure() {},
      recordSchedulerTimerFailure() {},
      recordSchedulerOverlapSuppressed() {},
    },
    messageTemplateSubmissions: {
      publisher: {
        async publish() {},
      },
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
    ...overrides,
  };
}

function dependencies() {
  const captured = {};
  const controller = {
    async start() {},
    async close() {},
  };
  return {
    captured,
    controller,
    value: {
      async startBootstrap(input) {
        captured.bootstrap = input;
        const mainEnvironment = input.readEnvironment();
        captured.mainEnvironment = mainEnvironment;
        const service = await input.createService({
          ownerKey: mainEnvironment.RAILWAY_WORKER_SCHEDULER_OWNER_KEY,
          postgresTelemetry: {
            recordIdleClientError() {},
          },
          schedulerTelemetry: {
            recordRunFailure() {},
            recordTimerFailure() {},
            recordOverlapSuppressed() {},
          },
        });
        captured.process = input.createProcess({ service });
        return captured.process;
      },
      async createService(input) {
        captured.service = input;
        return {
          async start() {},
          async close() {},
        };
      },
      createProcess(input) {
        captured.processInput = input;
        return controller;
      },
    },
  };
}

test("composes exact provider bindings without copying them into main config", async () => {
  const fixture = dependencies();
  const executableOptions = options();
  const controller = await startRailwayWorkerExecutable(
    executableOptions,
    fixture.value,
  );

  assert.equal(controller, fixture.controller);
  assert.deepEqual(fixture.captured.mainEnvironment, {
    RAILWAY_WORKER_SCHEDULER_OWNER_KEY: ownerKey,
  });
  assert.equal(fixture.captured.service.environment, environment);
  assert.equal(
    fixture.captured.service.campaignQueue,
    executableOptions.campaignQueue,
  );
  assert.equal(
    fixture.captured.service.messageTemplateSubmissions.publisher,
    executableOptions.messageTemplateSubmissions.publisher,
  );
  assert.equal(
    fixture.captured.service.messageTemplateSubmissions.telemetrySink,
    executableOptions.messageTemplateSubmissions.telemetrySink,
  );
  assert.equal(
    fixture.captured.service.messageTemplateSubmissions.environment,
    environment,
  );
  assert.equal(
    Object.hasOwn(fixture.captured.service, "botReplies"),
    false,
  );
  assert.equal(
    Object.hasOwn(fixture.captured.service, "botReplyStaging"),
    false,
  );
});

test("keeps template maintenance absent when no publisher is selected", async () => {
  const fixture = dependencies();
  const executableOptions = options({
    messageTemplateSubmissions: undefined,
  });

  await startRailwayWorkerExecutable(executableOptions, fixture.value);
  assert.equal(
    fixture.captured.service.messageTemplateSubmissions,
    undefined,
  );
});

test("forwards an explicit queue runtime factory without creating a fallback", async () => {
  const fixture = dependencies();
  const createQueueRuntime = () => ({
    publisher: { async publish() {} },
    async start() {},
    async cleanExpiredDeadLetters() {
      return 0;
    },
    async close() {},
  });
  const executableOptions = options({
    messageTemplateSubmissions: {
      createQueueRuntime,
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
  });

  await startRailwayWorkerExecutable(executableOptions, fixture.value);

  assert.equal(
    fixture.captured.service.messageTemplateSubmissions.createQueueRuntime,
    createQueueRuntime,
  );
  assert.equal(
    Object.hasOwn(
      fixture.captured.service.messageTemplateSubmissions,
      "publisher",
    ),
    false,
  );
});

test("forwards a provider-bound campaign queue without an external binding", async () => {
  const fixture = dependencies();
  const createQueueRuntime = () => ({
    queue: { async sendBatch() {} },
    async start() {},
    async cleanExpiredDeadLetters() {
      return 0;
    },
    async close() {},
  });
  const retryEvidenceSource = {
    isConfigured() {
      return false;
    },
    async load() {
      return null;
    },
  };
  const executableOptions = options({
    campaignQueue: undefined,
    campaignDeliveries: {
      createQueueRuntime,
      retryEvidenceSource,
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
  });

  await startRailwayWorkerExecutable(executableOptions, fixture.value);

  assert.equal(
    fixture.captured.service.campaignDeliveries.createQueueRuntime,
    createQueueRuntime,
  );
  assert.equal(
    fixture.captured.service.campaignDeliveries.retryEvidenceSource,
    retryEvidenceSource,
  );
  assert.equal(
    fixture.captured.service.campaignDeliveries.environment,
    environment,
  );
  assert.equal(fixture.captured.service.campaignQueue, undefined);
});

test("forwards the selected invitation provider factory and queue factory unchanged", async () => {
  const fixture = dependencies();
  const createProvider = () => {
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
  };
  const createQueueRuntime = () => ({
    async start() {},
    async cleanExpiredDeadLetters() {
      return 0;
    },
    async close() {},
  });

  await startRailwayWorkerExecutable(options({
    teamInvitations: {
      createProvider,
      createQueueRuntime,
      telemetrySink: { async record() {} },
    },
  }), fixture.value);

  assert.equal(
    fixture.captured.service.teamInvitations.createProvider,
    createProvider,
  );
  assert.equal(
    fixture.captured.service.teamInvitations.createQueueRuntime,
    createQueueRuntime,
  );
});

test("rejects legacy bot options before bootstrap, pool or provider I/O", async () => {
  for (const legacyOptions of [
    { botReplies: { telemetrySink: { async record() {} } } },
    {
      botReplyStaging: {
        createScenarioDriver() {},
        createQueueRuntime() {},
      },
    },
  ]) {
    const fixture = dependencies();
    await assert.rejects(
      startRailwayWorkerExecutable(
        options(legacyOptions),
        fixture.value,
      ),
      (error) => error instanceof RailwayWorkerExecutableError,
    );
    assert.deepEqual(fixture.captured, {});
  }
});

test("rejects missing, malformed and extended provider bindings", async () => {
  for (const executableOptions of [
    {},
    options({ campaignQueue: {} }),
    options({
      campaignDeliveries: {
        createQueueRuntime() {},
        retryEvidenceSource: {
          isConfigured() {
            return false;
          },
          async load() {
            return null;
          },
        },
        telemetrySink: { async record() {} },
      },
    }),
    options({ telemetry: {} }),
    options({ clock: {} }),
    options({ unsupported: true }),
    options({
      teamInvitations: {
        createProvider: {},
        createQueueRuntime() {},
        telemetrySink: { async record() {} },
      },
    }),
    options({
      messageTemplateSubmissions: {
        publisher: { async publish() {} },
        createQueueRuntime() {},
        telemetrySink: { async record() {} },
      },
    }),
    options({
      messageTemplateSubmissions: {
        publisher: {},
        telemetrySink: { async record() {} },
      },
    }),
    options({
      messageTemplateSubmissions: {
        publisher: { async publish() {} },
        telemetrySink: {},
      },
    }),
  ]) {
    await assert.rejects(
      startRailwayWorkerExecutable(executableOptions, dependencies().value),
      (error) => error instanceof RailwayWorkerExecutableError,
    );
  }
});

test("rejects an altered composition dependency set", async () => {
  const fixture = dependencies();
  await assert.rejects(
    startRailwayWorkerExecutable(options(), {
      ...fixture.value,
      extra: true,
    }),
    (error) => error instanceof RailwayWorkerExecutableError,
  );
});
