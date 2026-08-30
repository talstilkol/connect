import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("composes the optional system-admin route only with complete isolated policy", async () => {
  const runtime = await createRailwayPostgresApiRuntime(
    options({
      systemAdminEnvironment: {
        CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
          '["railway-system-admin"]',
        SYSTEM_ADMIN_MUTATION_RATE_LIMIT_POLICY_VERSION: "5",
        SYSTEM_ADMIN_MUTATION_RATE_LIMIT_CAPACITY: "30",
        SYSTEM_ADMIN_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "60",
      },
    }),
  );

  assert.equal(typeof runtime.handler.handle, "function");
  assert.doesNotMatch(
    JSON.stringify(runtime),
    /railway-system-admin|SYSTEM_ADMIN_MUTATION_RATE_LIMIT/,
  );
  await runtime.close();
});

test("rejects the legacy bot reply staging option without reading it", async () => {
  const runtimeOptions = options();
  let legacyOptionReads = 0;
  Object.defineProperty(runtimeOptions, "botReplyStaging", {
    enumerable: true,
    get() {
      legacyOptionReads += 1;
      throw new Error("legacy staging option must not be read");
    },
  });

  await assert.rejects(
    createRailwayPostgresApiRuntime(runtimeOptions),
    /runtime options are invalid/,
  );
  assert.equal(legacyOptionReads, 0);
});

test("composes a release-bound PostgreSQL evidence reader", async () => {
  const releaseEvidence = {
    environment: {
      BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "postgresql",
      APP_RELEASE_ID: `connect_release_v1_${"a".repeat(64)}`,
      APP_DEPLOYED_COMMIT_SHA: "b".repeat(40),
      APP_DEPLOYMENT_ARTIFACT_DIGEST: `sha256:${"c".repeat(64)}`,
    },
    clock: {
      now() {
        return new Date("2026-08-24T12:05:00.000Z");
      },
    },
  };
  const runtime = await createRailwayPostgresApiRuntime(
    options({ botReplyStagingReleaseEvidence: releaseEvidence }),
  );

  assert.equal(typeof runtime.handler.handle, "function");
  assert.doesNotMatch(
    JSON.stringify(runtime),
    /connect_release_v1_|APP_DEPLOYED_COMMIT_SHA|evidenceJson/,
  );
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
      systemAdminEnvironment: {
        CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
          '["railway-system-admin"]',
      },
    }),
    /system-admin configuration is unavailable/,
  );
  await assert.rejects(
    createRailwayPostgresApiRuntime({
      ...options(),
      botReplyStagingReleaseEvidence: {
        environment: {
          BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "POSTGRESQL",
        },
      },
    }),
    /release evidence storage is unavailable/,
  );
  await assert.rejects(
    createRailwayPostgresApiRuntime({
      ...options(),
      botReplyStagingReleaseEvidence: {
        environment: {
          BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "postgresql",
        },
      },
    }),
    /releaseId is invalid/,
  );
  await assert.rejects(
    createRailwayPostgresApiRuntime({
      ...options(),
      systemAdminEnvironment: {
        SYSTEM_ADMIN_MUTATION_RATE_LIMIT_POLICY_VERSION: "5",
        SYSTEM_ADMIN_MUTATION_RATE_LIMIT_CAPACITY: "30",
        SYSTEM_ADMIN_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "60",
      },
    }),
    /system-admin configuration is unavailable/,
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

test("has no static import or composition for the legacy staging driver", () => {
  const source = readFileSync(
    "server/platform/railwayPostgresApiRuntime.ts",
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /botReplyStagingDurableRunner|botReplyStagingLiveDriver|botReplyStagingQueuedExecutor|railwayBullMqBotReplyStagingQueue|createBotReplyStagingDurableRunner|createBotReplyStagingLiveDriver|createBotReplyStagingQueuedExecutor|waitForBotReplyStagingPoll/,
  );
  assert.match(source, /botReplyStagingReleaseEvidence/);
});
