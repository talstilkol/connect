import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayPostgresWorkerService,
} from "../server/platform/railwayPostgresWorkerService.ts";

const ownerKey = `scheduler_owner_v1_${"f".repeat(64)}`;
const encryptionKey =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
const invitationDeliveryKey =
  `team_invitation_delivery_v1_${"a".repeat(64)}`;

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
  };
}

function options(overrides = {}) {
  return {
    environment: environment(),
    ownerKey,
    campaignQueue: {
      async sendBatch() {},
    },
    postgresTelemetry: {
      recordIdleClientError() {},
    },
    schedulerTelemetry: {
      recordRunFailure() {},
      recordTimerFailure() {},
      recordOverlapSuppressed() {},
    },
    ...overrides,
  };
}

test("composes the PostgreSQL foundation into the minute-aligned worker service", async () => {
  const service = await createRailwayPostgresWorkerService(options());

  assert.equal(typeof service.start, "function");
  assert.equal(typeof service.close, "function");
  await service.close();
  await service.close();
});

test("wires optional template maintenance without claiming provider readiness", async () => {
  const service = await createRailwayPostgresWorkerService(options({
    messageTemplateSubmissions: {
      environment: {
        META_GRAPH_API_VERSION: "v21.0",
        META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
      },
      publisher: {
        async publish() {},
      },
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
  }));

  assert.equal(typeof service.start, "function");
  await service.close();
});

test("wires the campaign queue to the PostgreSQL consumer and owns its lifecycle", async () => {
  const events = [];
  let capturedConsumer;
  const service = await createRailwayPostgresWorkerService(options({
    campaignQueue: undefined,
    campaignDeliveries: {
      environment: {
        META_GRAPH_API_VERSION: "v21.0",
        META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
        WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: encryptionKey,
      },
      createQueueRuntime({ consumer }) {
        capturedConsumer = consumer;
        return {
          queue: {
            async sendBatch() {},
          },
          async start() {
            events.push("campaign-queue.start");
          },
          async cleanExpiredDeadLetters() {
            events.push("campaign-queue.clean");
            return 0;
          },
          async close() {
            events.push("campaign-queue.close");
          },
        };
      },
      retryEvidenceSource: {
        isConfigured() {
          return false;
        },
        async load() {
          return null;
        },
      },
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
  }));

  assert.equal(typeof capturedConsumer.handle, "function");
  await service.start();
  await service.close();
  assert.deepEqual(events, [
    "campaign-queue.start",
    "campaign-queue.close",
  ]);
});

test("wires Meta webhooks to the PostgreSQL business consumer and owns the worker lifecycle", async () => {
  const events = [];
  let capturedConsumer;
  const service = await createRailwayPostgresWorkerService(options({
    metaWebhooks: {
      environment: {
        META_APP_SECRET: "app-secret",
        META_WEBHOOK_VERIFY_TOKEN: "verify-token",
      },
      createQueueRuntime({ consumer }) {
        capturedConsumer = consumer;
        return {
          async start() {
            events.push("meta-webhook-queue.start");
          },
          async cleanExpiredDeadLetters() {
            events.push("meta-webhook-queue.clean");
            return 0;
          },
          async close() {
            events.push("meta-webhook-queue.close");
          },
        };
      },
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
  }));

  assert.equal(typeof capturedConsumer.handle, "function");
  await service.start();
  await service.close();
  assert.deepEqual(events, [
    "meta-webhook-queue.start",
    "meta-webhook-queue.close",
  ]);
});

test("wires invitation delivery to PostgreSQL and retries before claiming when provider is unavailable", async () => {
  const events = [];
  let capturedConsumer;
  let capturedProviderDependencies;
  const service = await createRailwayPostgresWorkerService(options({
    teamInvitations: {
      createProvider(dependencies) {
        capturedProviderDependencies = dependencies;
        return {
          isConfigured() {
            return false;
          },
          async invite() {
            throw new Error("provider must not be called");
          },
          async lookup() {
            return { status: "unavailable" };
          },
        };
      },
      createQueueRuntime({ consumer }) {
        capturedConsumer = consumer;
        return {
          async start() {
            events.push("team-invitation-queue.start");
          },
          async cleanExpiredDeadLetters() {
            events.push("team-invitation-queue.clean");
            return 0;
          },
          async close() {
            events.push("team-invitation-queue.close");
          },
        };
      },
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
  }));

  assert.equal(
    typeof capturedProviderDependencies.identityOrganizations.findByTenantId,
    "function",
  );
  assert.equal(
    typeof capturedProviderDependencies.createMutationRateLimitBinding,
    "function",
  );
  assert.deepEqual(
    Object.keys(capturedProviderDependencies).sort(),
    [
      "createMutationRateLimitBinding",
      "identityOrganizations",
      "providerRequestTelemetry",
      "telemetryClock",
    ],
  );

  let retryDelaySeconds = null;
  const consumerResult = await capturedConsumer.handle({
    queue: "team-invitation-v1",
    messages: [{
      id: invitationDeliveryKey,
      timestamp: new Date("2026-08-21T12:00:00.000Z"),
      attempts: 1,
      body: {
        version: 1,
        tenantId: 7,
        deliveryKey: invitationDeliveryKey,
      },
      ack() {
        throw new Error("unavailable provider must not acknowledge");
      },
      retry({ delaySeconds }) {
        retryDelaySeconds = delaySeconds;
      },
    }],
  });

  assert.equal(retryDelaySeconds, 60);
  assert.equal(consumerResult.retried, 1);
  await service.start();
  await service.close();
  assert.deepEqual(events, [
    "team-invitation-queue.start",
    "team-invitation-queue.close",
  ]);
});

test("starts the provider queue before scheduling and closes it before PostgreSQL", async () => {
  const events = [];
  let capturedConsumer;
  const service = await createRailwayPostgresWorkerService(options({
    messageTemplateSubmissions: {
      environment: {
        META_GRAPH_API_VERSION: "v21.0",
        META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
      },
      createQueueRuntime({ consumer }) {
        capturedConsumer = consumer;
        return {
          publisher: {
            async publish() {},
          },
          async start() {
            events.push("queue.start");
          },
          async cleanExpiredDeadLetters() {
            events.push("queue.clean");
            return 0;
          },
          async close() {
            events.push("queue.close");
          },
        };
      },
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
  }));

  assert.equal(typeof capturedConsumer.handle, "function");
  await service.start();
  await service.start();
  await service.close();
  await service.close();

  assert.deepEqual(events, ["queue.start", "queue.close"]);
  await assert.rejects(service.start(), /already closed/);
});

test("closes queue and database resources after queue startup fails", async () => {
  const events = [];
  const service = await createRailwayPostgresWorkerService(options({
    messageTemplateSubmissions: {
      environment: {
        META_GRAPH_API_VERSION: "v21.0",
        META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
      },
      createQueueRuntime() {
        return {
          publisher: {
            async publish() {},
          },
          async start() {
            events.push("queue.start");
            throw new Error("private redis startup error");
          },
          async cleanExpiredDeadLetters() {
            return 0;
          },
          async close() {
            events.push("queue.close");
          },
        };
      },
      telemetrySink: {
        async record() {
          return { outcome: "recorded" };
        },
      },
    },
  }));

  await assert.rejects(
    service.start(),
    (error) =>
      error instanceof Error &&
      /startup failed/.test(error.message) &&
      !error.message.includes("private"),
  );
  assert.deepEqual(events, ["queue.start", "queue.close"]);
});

test("closes a created queue when later service composition fails", async () => {
  const events = [];

  await assert.rejects(
    createRailwayPostgresWorkerService(options({
      messageTemplateSubmissions: {
        environment: {
          META_GRAPH_API_VERSION: "v21.0",
          META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
        },
        batchSize: 11,
        createQueueRuntime() {
          return {
            publisher: { async publish() {} },
            async start() {},
            async cleanExpiredDeadLetters() {
              return 0;
            },
            async close() {
              events.push("queue.close");
            },
          };
        },
        telemetrySink: { async record() {} },
      },
    })),
    /maintenance could not complete/,
  );

  assert.deepEqual(events, ["queue.close"]);
});

test("rejects worker options before opening a PostgreSQL pool", async () => {
  await assert.rejects(
    createRailwayPostgresWorkerService(options({ ownerKey: "plain-owner" })),
    /options are invalid/,
  );
  await assert.rejects(
    createRailwayPostgresWorkerService({}),
    /options are invalid/,
  );
  await assert.rejects(
    createRailwayPostgresWorkerService(options({
      messageTemplateSubmissions: {
        environment: {},
        publisher: {},
        telemetrySink: {},
      },
    })),
    /options are invalid/,
  );
  await assert.rejects(
    createRailwayPostgresWorkerService(options({
      messageTemplateSubmissions: {
        environment: {
          META_GRAPH_API_VERSION: "v21.0",
          META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
        },
        publisher: { async publish() {} },
        createQueueRuntime() {},
        telemetrySink: { async record() {} },
      },
    })),
    /options are invalid/,
  );
  await assert.rejects(
    createRailwayPostgresWorkerService(options({
      messageTemplateSubmissions: {
        environment: {
          META_GRAPH_API_VERSION: "v21.0",
          META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
        },
        createQueueRuntime() {
          return {
            publisher: { async publish() {} },
            async start() {},
            async close() {},
          };
        },
        telemetrySink: { async record() {} },
      },
    })),
    /queue runtime is invalid/,
  );
  await assert.rejects(
    createRailwayPostgresWorkerService(options({
      campaignDeliveries: {
        environment: {},
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
    })),
    /options are invalid/,
  );
  await assert.rejects(
    createRailwayPostgresWorkerService(options({
      metaWebhooks: {
        environment: {},
        createQueueRuntime() {},
        telemetrySink: {},
      },
    })),
    /options are invalid/,
  );
  await assert.rejects(
    createRailwayPostgresWorkerService(options({
      teamInvitations: {
        createProvider: {},
        createQueueRuntime() {},
        telemetrySink: { async record() {} },
      },
    })),
    /options are invalid/,
  );
});

test("rejects legacy bot options before pool, queue or provider I/O", async () => {
  for (const legacyOptions of [
    { botReplies: { telemetrySink: { async record() {} } } },
    {
      botReplyStaging: {
        createScenarioDriver() {},
        createQueueRuntime() {},
      },
    },
  ]) {
    const calls = [];
    const guardedEnvironment = new Proxy(environment(), {
      get(target, property, receiver) {
        calls.push(`environment:${String(property)}`);
        return Reflect.get(target, property, receiver);
      },
    });

    await assert.rejects(
      createRailwayPostgresWorkerService(options({
        environment: guardedEnvironment,
        teamInvitations: {
          createProvider() {
            calls.push("provider");
            throw new Error("provider must remain unopened");
          },
          createQueueRuntime() {
            calls.push("queue");
            throw new Error("queue must remain unopened");
          },
          telemetrySink: { async record() {} },
        },
        ...legacyOptions,
      })),
      /options are invalid/,
    );
    assert.deepEqual(calls, []);
  }
});

test("preserves the bounded PostgreSQL configuration state", async () => {
  const { environment: unused, ...withoutEnvironment } = options();
  assert.equal(typeof unused, "object");

  await assert.rejects(
    createRailwayPostgresWorkerService(withoutEnvironment),
    (error) => error?.code === "configuration-disabled",
  );
});
