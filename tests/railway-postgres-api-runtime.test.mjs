import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayPostgresApiRuntime,
} from "../server/platform/railwayPostgresApiRuntime.ts";

const identityEnvironment = {
  APP_PUBLIC_ORIGIN: "https://connect.example.com",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "publishable-key-for-runtime-test",
  CLERK_SECRET_KEY: "secret-key-for-runtime-test",
  VERCEL_OIDC_TEAM_SLUG: "connect-team",
  VERCEL_OIDC_PROJECT_NAME: "connect-web",
  VERCEL_OIDC_ENVIRONMENT: "production",
  NODE_ENV: "production",
};

function postgresEnvironment() {
  return {
    APP_RUNTIME_ENVIRONMENT: "test",
    DATABASE_URL:
      "postgresql://tal@127.0.0.1:55434/connect_driver_integration",
    POSTGRES_APPLICATION_NAME: "connect-runtime-test",
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
    identityEnvironment,
    postgresEnvironment: postgresEnvironment(),
    identityDependencies: {
      vercelOidc: {
        createRemoteKeySet() {
          return async () => {};
        },
        async verifyJwt() {},
      },
      clerk: {
        create() {
          return {
            async authenticateRequest() {
              throw new Error("not called by method guard");
            },
          };
        },
      },
    },
    postgresTelemetry: {
      recordIdleClientError() {},
    },
    mutationRateLimitEnvironment: {
      TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION: "3",
      TENANT_MUTATION_RATE_LIMIT_CAPACITY: "120",
      TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "60",
    },
    ...overrides,
  };
}

test("composes one authenticated handler over the PostgreSQL foundation", async () => {
  const runtime = await createRailwayPostgresApiRuntime(options());

  assert.deepEqual(Object.keys(runtime).sort(), [
    "close",
    "handler",
    "metaWebhookHandler",
    "readiness",
  ]);
  assert.equal(typeof runtime.handler.handle, "function");
  assert.equal(runtime.metaWebhookHandler, null);
  assert.equal(typeof runtime.readiness.check, "function");
  assert.equal(typeof runtime.close, "function");
  assert.doesNotMatch(
    JSON.stringify(runtime),
    /DATABASE_URL|connectionString|55434|secret-key/,
  );

  const response = await runtime.handler.handle(
    new Request("https://railway.example.com/v1/connect", {
      method: "GET",
    }),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
  await runtime.close();
  await runtime.close();
});

test("composes the optional Meta webhook route without exposing its secrets", async () => {
  const runtime = await createRailwayPostgresApiRuntime(
    options({
      metaWebhook: {
        environment: {
          META_APP_SECRET: "railway-meta-app-secret",
          META_WEBHOOK_VERIFY_TOKEN: "railway-meta-verify-token",
          META_WEBHOOK_RATE_LIMIT_POLICY_VERSION: "8",
          META_WEBHOOK_RATE_LIMIT_CAPACITY: "960",
          META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS: "1",
        },
        queue: {
          async publish() {
            throw new Error("not called by verification");
          },
        },
      },
    }),
  );

  assert.equal(typeof runtime.metaWebhookHandler?.handle, "function");
  assert.doesNotMatch(
    JSON.stringify(runtime),
    /railway-meta-app-secret|railway-meta-verify-token/,
  );
  const response = await runtime.metaWebhookHandler.handle(
    new Request(
      "https://railway.example.com/webhooks/meta?hub.mode=subscribe&hub.verify_token=railway-meta-verify-token&hub.challenge=13579",
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "13579");
  await runtime.close();
});

test("fails closed and closes ownership when identity configuration is absent", async () => {
  await assert.rejects(
    createRailwayPostgresApiRuntime(
      options({ identityEnvironment: {} }),
    ),
    /identity configuration is unavailable/,
  );
});

test("rejects extended or incomplete composition options", async () => {
  await assert.rejects(
    createRailwayPostgresApiRuntime({
      ...options(),
      tenantId: 7,
    }),
    /runtime options are invalid/,
  );
  await assert.rejects(
    createRailwayPostgresApiRuntime({
      ...options(),
      mutationRateLimitEnvironment: {
        TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION: "3",
      },
    }),
    /mutation rate-limit configuration is unavailable/,
  );
  await assert.rejects(
    createRailwayPostgresApiRuntime({
      ...options(),
      metaWebhook: {
        environment: {},
        queue: { async publish() {} },
        tenantId: 7,
      },
    }),
    /runtime options are invalid/,
  );
});
