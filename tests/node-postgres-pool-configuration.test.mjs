import assert from "node:assert/strict";
import test from "node:test";

import {
  createNodePostgresPool,
  inspectNodePostgresPoolConfiguration,
  nodePostgresPoolEnvironmentKeys,
} from "../server/platform/nodePostgresPoolConfiguration.ts";

function productionEnvironment(overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "production",
    DATABASE_URL:
      "postgresql://connect_runtime:credential@postgres.railway.internal:5432/connect",
    POSTGRES_APPLICATION_NAME: "connect-railway-api",
    POSTGRES_MAX_CONNECTIONS: "12",
    POSTGRES_CONNECTION_TIMEOUT_MS: "5000",
    POSTGRES_IDLE_TIMEOUT_MS: "30000",
    POSTGRES_STATEMENT_TIMEOUT_MS: "15000",
    POSTGRES_QUERY_TIMEOUT_MS: "20000",
    POSTGRES_LOCK_TIMEOUT_MS: "3000",
    POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS: "10000",
    POSTGRES_MAX_LIFETIME_SECONDS: "1800",
    POSTGRES_TLS_MODE: "verify-full",
    ...overrides,
  };
}

test("builds one explicit verified production pool configuration", () => {
  const state = inspectNodePostgresPoolConfiguration(
    productionEnvironment(),
  );

  assert.equal(state.status, "configured");
  assert.deepEqual(state.missingKeys, []);
  assert.deepEqual(state.invalidKeys, []);
  assert.equal(state.configuration.runtimeEnvironment, "production");
  assert.equal(state.configuration.maximumConnections, 12);
  assert.equal(state.configuration.tlsMode, "verify-full");
  assert.equal(state.configuration.certificateAuthority, null);
  assert.equal(Object.isFrozen(state.configuration), true);
});

test("separates disabled and incomplete configuration without values", () => {
  const disabled = inspectNodePostgresPoolConfiguration({});
  const incomplete = inspectNodePostgresPoolConfiguration({
    APP_RUNTIME_ENVIRONMENT: "staging",
  });

  assert.equal(disabled.status, "disabled");
  assert.deepEqual(disabled.missingKeys, nodePostgresPoolEnvironmentKeys);
  assert.equal(incomplete.status, "incomplete");
  assert.equal(
    incomplete.missingKeys.includes("APP_RUNTIME_ENVIRONMENT"),
    false,
  );
  assert.equal(incomplete.configuration, null);
});

test("rejects unsafe TLS, URL overrides, loopback, and unbounded values", () => {
  const cases = [
    [
      { POSTGRES_TLS_MODE: "disabled" },
      "POSTGRES_TLS_MODE",
    ],
    [
      {
        DATABASE_URL:
          "postgresql://connect_runtime:credential@127.0.0.1:5432/connect",
      },
      "DATABASE_URL",
    ],
    [
      {
        DATABASE_URL:
          "postgresql://connect_runtime:credential@postgres.railway.internal:5432/connect?sslmode=require",
      },
      "DATABASE_URL",
    ],
    [
      {
        DATABASE_URL:
          "postgresql://connect_runtime:credential@postgres.railway.internal/connect",
      },
      "DATABASE_URL",
    ],
    [
      { POSTGRES_MAX_CONNECTIONS: "0" },
      "POSTGRES_MAX_CONNECTIONS",
    ],
    [
      { POSTGRES_LOCK_TIMEOUT_MS: "30001" },
      "POSTGRES_LOCK_TIMEOUT_MS",
    ],
    [
      { POSTGRES_APPLICATION_NAME: "connect api" },
      "POSTGRES_APPLICATION_NAME",
    ],
    [
      { POSTGRES_TLS_CA_PEM: "not-a-certificate" },
      "POSTGRES_TLS_CA_PEM",
    ],
  ];

  for (const [overrides, invalidKey] of cases) {
    const state = inspectNodePostgresPoolConfiguration(
      productionEnvironment(overrides),
    );
    assert.equal(state.status, "invalid");
    assert.equal(state.invalidKeys.includes(invalidKey), true);
    assert.equal(state.configuration, null);
  }
});

test("allows disabled TLS only for an explicit local runtime", () => {
  const state = inspectNodePostgresPoolConfiguration(
    productionEnvironment({
      APP_RUNTIME_ENVIRONMENT: "test",
      DATABASE_URL:
        "postgresql://tal@127.0.0.1:55434/connect_driver_integration",
      POSTGRES_TLS_MODE: "disabled",
    }),
  );

  assert.equal(state.status, "configured");
  assert.equal(state.configuration.tlsMode, "disabled");

  const conflictingCa = inspectNodePostgresPoolConfiguration(
    productionEnvironment({
      APP_RUNTIME_ENVIRONMENT: "test",
      DATABASE_URL:
        "postgresql://tal@127.0.0.1:55434/connect_driver_integration",
      POSTGRES_TLS_MODE: "disabled",
      POSTGRES_TLS_CA_PEM: "not-a-certificate",
    }),
  );
  assert.equal(conflictingCa.status, "invalid");
  assert.equal(
    conflictingCa.invalidKeys.includes("POSTGRES_TLS_CA_PEM"),
    true,
  );
});

test("creates a bounded pool and records idle errors without forwarding them", async () => {
  const state = inspectNodePostgresPoolConfiguration(
    productionEnvironment(),
  );
  assert.equal(state.status, "configured");
  let telemetryCalls = 0;
  const telemetry = {
    recordIdleClientError(...values) {
      assert.deepEqual(values, []);
      telemetryCalls += 1;
    },
  };
  const pool = createNodePostgresPool(
    state.configuration,
    telemetry,
  );

  assert.equal(pool.options.max, 12);
  assert.equal(pool.options.connectionTimeoutMillis, 5000);
  assert.equal(pool.options.statement_timeout, 15000);
  assert.equal(pool.options.lock_timeout, 3000);
  assert.equal(pool.options.ssl.rejectUnauthorized, true);
  pool.emit("error", new Error("idle transport failure"));
  assert.equal(telemetryCalls, 1);
  await pool.end();
});

test("requires a bounded telemetry dependency before pool creation", () => {
  const state = inspectNodePostgresPoolConfiguration(
    productionEnvironment(),
  );
  assert.equal(state.status, "configured");

  assert.throws(
    () => createNodePostgresPool(state.configuration, {}),
    {
      message: "NODE_POSTGRES_POOL_TELEMETRY_INVALID",
    },
  );

  assert.throws(
    () =>
      createNodePostgresPool(
        {
          ...state.configuration,
          tlsMode: "disabled",
        },
        { recordIdleClientError() {} },
      ),
    {
      message: "NODE_POSTGRES_POOL_CONFIGURATION_INVALID",
    },
  );

  assert.throws(
    () =>
      createNodePostgresPool(
        {
          ...state.configuration,
          browserSuppliedTenantId: 7,
        },
        { recordIdleClientError() {} },
      ),
    {
      message: "NODE_POSTGRES_POOL_CONFIGURATION_INVALID",
    },
  );
});
