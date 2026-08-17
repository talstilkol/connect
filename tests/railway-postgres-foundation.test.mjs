import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayPostgresFoundation,
  RailwayPostgresFoundationError,
} from "../server/platform/railwayPostgresFoundation.ts";

function localEnvironment(overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "test",
    DATABASE_URL:
      "postgresql://tal@127.0.0.1:55434/connect_driver_integration",
    POSTGRES_APPLICATION_NAME: "connect-integration",
    POSTGRES_MAX_CONNECTIONS: "4",
    POSTGRES_CONNECTION_TIMEOUT_MS: "2000",
    POSTGRES_IDLE_TIMEOUT_MS: "2000",
    POSTGRES_STATEMENT_TIMEOUT_MS: "15000",
    POSTGRES_QUERY_TIMEOUT_MS: "20000",
    POSTGRES_LOCK_TIMEOUT_MS: "3000",
    POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS: "10000",
    POSTGRES_MAX_LIFETIME_SECONDS: "1800",
    POSTGRES_TLS_MODE: "disabled",
    ...overrides,
  };
}

function telemetry() {
  return {
    recordIdleClientError() {},
  };
}

test("composes every completed PostgreSQL repository behind one pool", async () => {
  const foundation = createRailwayPostgresFoundation({
    environment: localEnvironment(),
    telemetry: telemetry(),
  });

  assert.deepEqual(Object.keys(foundation).sort(), [
    "businessProfiles",
    "close",
    "contacts",
    "invitationAcceptances",
    "invitationDeliveries",
    "invitationExpirations",
    "invitations",
    "membershipMutations",
    "memberships",
    "railwayApiMutations",
    "readiness",
    "reports",
    "selections",
  ]);
  assert.equal(
    typeof foundation.memberships.findActiveByExternalUserId,
    "function",
  );
  assert.equal(typeof foundation.contacts.list, "function");
  assert.equal(typeof foundation.readiness.check, "function");
  assert.equal(typeof foundation.reports.read, "function");
  assert.equal(typeof foundation.selections.save, "function");
  assert.equal(
    typeof foundation.railwayApiMutations.saveContact,
    "function",
  );
  assert.equal(typeof foundation.invitations.request, "function");
  assert.equal(
    typeof foundation.invitationDeliveries.claim,
    "function",
  );
  assert.equal(
    typeof foundation.invitationAcceptances.accept,
    "function",
  );
  assert.doesNotMatch(
    JSON.stringify(foundation),
    /DATABASE_URL|connectionString|credential|55434/,
  );

  await foundation.close();
  await foundation.close();
});

test("fails closed without complete and valid configuration", () => {
  const cases = [
    [
      {},
      "configuration-disabled",
    ],
    [
      { APP_RUNTIME_ENVIRONMENT: "test" },
      "configuration-incomplete",
    ],
    [
      localEnvironment({ POSTGRES_MAX_CONNECTIONS: "0" }),
      "configuration-invalid",
    ],
  ];

  for (const [environment, code] of cases) {
    assert.throws(
      () =>
        createRailwayPostgresFoundation({
          environment,
          telemetry: telemetry(),
        }),
      (error) =>
        error instanceof RailwayPostgresFoundationError &&
        error.code === code &&
        !error.message.includes("postgresql://"),
    );
  }
});

test("rejects extended options and missing telemetry before configuration", () => {
  assert.throws(
    () =>
      createRailwayPostgresFoundation({
        environment: localEnvironment(),
        telemetry: telemetry(),
        tenantId: 7,
      }),
    (error) =>
      error instanceof RailwayPostgresFoundationError &&
      error.code === "options-invalid",
  );

  assert.throws(
    () =>
      createRailwayPostgresFoundation({
        environment: localEnvironment(),
        telemetry: {},
      }),
    (error) =>
      error instanceof RailwayPostgresFoundationError &&
      error.code === "options-invalid",
  );
});
