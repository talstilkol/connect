import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayPostgresWorkerService,
} from "../server/platform/railwayPostgresWorkerService.ts";

const ownerKey = `scheduler_owner_v1_${"f".repeat(64)}`;

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

test("rejects worker options before opening a PostgreSQL pool", async () => {
  await assert.rejects(
    createRailwayPostgresWorkerService(options({ ownerKey: "plain-owner" })),
    /options are invalid/,
  );
  await assert.rejects(
    createRailwayPostgresWorkerService({}),
    /options are invalid/,
  );
});

test("preserves the bounded PostgreSQL configuration state", async () => {
  const { environment: unused, ...withoutEnvironment } = options();
  assert.equal(typeof unused, "object");

  await assert.rejects(
    createRailwayPostgresWorkerService(withoutEnvironment),
    (error) => error?.code === "configuration-disabled",
  );
});
