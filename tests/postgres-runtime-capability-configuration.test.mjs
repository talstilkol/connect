import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  inspectPostgresRuntimeCapabilityConfiguration,
  postgresMigrationOwnerRole,
  postgresRuntimeCapabilities,
  postgresRuntimeCapabilityEnvironmentKeys,
  postgresRuntimeCapabilityLoginRoles,
  postgresRuntimeCapabilityUrlKeys,
} from "../server/platform/postgresRuntimeCapabilityConfiguration.ts";

const localUrls = Object.freeze({
  api:
    "postgresql://connect_api_runtime:local-test-only@127.0.0.1:5432/connect_test",
  worker:
    "postgresql://connect_worker_runtime:local-test-only@127.0.0.1:5432/connect_test",
  verifier:
    "postgresql://connect_verifier_runtime:local-test-only@127.0.0.1:5432/connect_test",
  migration:
    "postgresql://connect_migrator_login:local-test-only@127.0.0.1:5432/connect_test",
});

function environment(capability, overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "test",
    [postgresRuntimeCapabilityUrlKeys[capability]]: localUrls[capability],
    ...overrides,
  };
}

test("declares only login capability URLs in the environment catalog", () => {
  const example = readFileSync(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  for (const key of Object.values(postgresRuntimeCapabilityUrlKeys)) {
    assert.match(example, new RegExp(`^${key}=$`, "m"));
  }
  assert.doesNotMatch(example, /^POSTGRES_OWNER_URL=/m);
  assert.doesNotMatch(example, /^NEXT_PUBLIC_POSTGRES_/m);
});

test("defines four deterministic PostgreSQL capabilities and login roles", () => {
  assert.deepEqual(postgresRuntimeCapabilities, [
    "api",
    "worker",
    "verifier",
    "migration",
  ]);
  assert.deepEqual(postgresRuntimeCapabilityUrlKeys, {
    api: "POSTGRES_API_URL",
    worker: "POSTGRES_WORKER_URL",
    verifier: "POSTGRES_VERIFIER_URL",
    migration: "POSTGRES_MIGRATION_URL",
  });
  assert.deepEqual(postgresRuntimeCapabilityLoginRoles, {
    api: "connect_api_runtime",
    worker: "connect_worker_runtime",
    verifier: "connect_verifier_runtime",
    migration: "connect_migrator_login",
  });
  assert.equal(postgresMigrationOwnerRole, "connect_migration_owner");
  assert.equal(Object.isFrozen(postgresRuntimeCapabilities), true);
  assert.equal(Object.isFrozen(postgresRuntimeCapabilityUrlKeys), true);
  assert.equal(Object.isFrozen(postgresRuntimeCapabilityLoginRoles), true);
});

test("selects exactly one capability URL without DATABASE_URL fallback", () => {
  for (const capability of postgresRuntimeCapabilities) {
    const state = inspectPostgresRuntimeCapabilityConfiguration(
      capability,
      environment(capability),
    );

    assert.equal(state.status, "configured");
    assert.deepEqual(state.missingKeys, []);
    assert.deepEqual(state.invalidKeys, []);
    assert.deepEqual(state.configuration, {
      capability,
      runtimeEnvironment: "test",
      urlEnvironmentKey: postgresRuntimeCapabilityUrlKeys[capability],
      loginRole: postgresRuntimeCapabilityLoginRoles[capability],
    });
    assert.equal(
      JSON.stringify(state).includes("local-test-only"),
      false,
    );
    assert.equal(Object.isFrozen(state), true);
    assert.equal(Object.isFrozen(state.configuration), true);
  }
});

test("fails closed when capability configuration is absent or partial", () => {
  assert.deepEqual(
    inspectPostgresRuntimeCapabilityConfiguration("api", {}),
    {
      status: "disabled",
      missingKeys: ["APP_RUNTIME_ENVIRONMENT", "POSTGRES_API_URL"],
      invalidKeys: [],
      configuration: null,
    },
  );

  assert.deepEqual(
    inspectPostgresRuntimeCapabilityConfiguration("api"),
    {
      status: "invalid",
      missingKeys: [],
      invalidKeys: postgresRuntimeCapabilityEnvironmentKeys,
      configuration: null,
    },
  );

  assert.deepEqual(
    inspectPostgresRuntimeCapabilityConfiguration("worker", {
      APP_RUNTIME_ENVIRONMENT: "staging",
    }),
    {
      status: "incomplete",
      missingKeys: ["POSTGRES_WORKER_URL"],
      invalidKeys: [],
      configuration: null,
    },
  );
});

test("rejects legacy and cross-capability credentials without reflecting them", () => {
  const sensitiveValue =
    "postgresql://connect_verifier_runtime:sensitive-value@postgres.railway.internal:5432/railway";
  const scenarios = [
    { DATABASE_URL: sensitiveValue },
    { POSTGRES_OWNER_URL: sensitiveValue },
    { POSTGRES_VERIFIER_URL: sensitiveValue },
    {
      POSTGRES_API_URL:
        "postgresql://connect_api_runtime:api-value@postgres.railway.internal:5432/railway",
      POSTGRES_WORKER_URL:
        "postgresql://connect_worker_runtime:worker-value@postgres.railway.internal:5432/railway",
    },
  ];

  for (const extra of scenarios) {
    const state = inspectPostgresRuntimeCapabilityConfiguration("api", {
      APP_RUNTIME_ENVIRONMENT: "staging",
      POSTGRES_API_URL:
        "postgresql://connect_api_runtime:api-value@postgres.railway.internal:5432/railway",
      ...extra,
    });
    assert.equal(state.status, "invalid");
    assert.equal(state.configuration, null);
    assert.equal(JSON.stringify(state).includes("sensitive-value"), false);
    assert.equal(JSON.stringify(state).includes("worker-value"), false);
  }
});

test("requires the exact capability login role", () => {
  for (const capability of postgresRuntimeCapabilities) {
    const key = postgresRuntimeCapabilityUrlKeys[capability];
    const state = inspectPostgresRuntimeCapabilityConfiguration(
      capability,
      environment(capability, {
        [key]:
          "postgresql://connect_wrong:local-test-only@127.0.0.1:5432/connect_test",
      }),
    );
    assert.equal(state.status, "invalid");
    assert.deepEqual(state.invalidKeys, [key]);
    assert.equal(state.configuration, null);
  }

  const ownerLogin = inspectPostgresRuntimeCapabilityConfiguration(
    "migration",
    environment("migration", {
      POSTGRES_MIGRATION_URL:
        "postgresql://connect_migration_owner:local-test-only@127.0.0.1:5432/connect_test",
    }),
  );
  assert.equal(ownerLogin.status, "invalid");
  assert.deepEqual(ownerLogin.invalidKeys, ["POSTGRES_MIGRATION_URL"]);
});

test("requires private Railway runtime hosts and authenticated production URLs", () => {
  for (const capability of ["api", "worker", "verifier"]) {
    const key = postgresRuntimeCapabilityUrlKeys[capability];
    const role = postgresRuntimeCapabilityLoginRoles[capability];
    const configured = inspectPostgresRuntimeCapabilityConfiguration(
      capability,
      environment(capability, {
        APP_RUNTIME_ENVIRONMENT: "production",
        [key]:
          `postgresql://${role}:production-test-only@postgres.railway.internal:5432/railway`,
      }),
    );
    assert.equal(configured.status, "configured");

    for (const invalidUrl of [
      `postgresql://${role}:production-test-only@127.0.0.1:5432/railway`,
      `postgresql://${role}:production-test-only@db.example.com:5432/railway`,
      `postgresql://${role}@postgres.railway.internal:5432/railway`,
    ]) {
      const state = inspectPostgresRuntimeCapabilityConfiguration(
        capability,
        environment(capability, {
          APP_RUNTIME_ENVIRONMENT: "production",
          [key]: invalidUrl,
        }),
      );
      assert.equal(state.status, "invalid");
      assert.deepEqual(state.invalidKeys, [key]);
    }
  }
});

test("allows a remote migration endpoint but never a production loopback", () => {
  const remote = inspectPostgresRuntimeCapabilityConfiguration(
    "migration",
    environment("migration", {
      APP_RUNTIME_ENVIRONMENT: "staging",
      POSTGRES_MIGRATION_URL:
        "postgresql://connect_migrator_login:production-test-only@roundhouse.proxy.rlwy.net:5432/railway",
    }),
  );
  assert.equal(remote.status, "configured");

  for (const untrustedHost of [
    "migration-db.example.com",
    "railway.internal.attacker.example",
    "proxy.rlwy.net.attacker.example",
  ]) {
    const untrusted = inspectPostgresRuntimeCapabilityConfiguration(
      "migration",
      environment("migration", {
        APP_RUNTIME_ENVIRONMENT: "staging",
        POSTGRES_MIGRATION_URL:
          `postgresql://connect_migrator_login:production-test-only@${untrustedHost}:5432/railway`,
      }),
    );
    assert.equal(untrusted.status, "invalid");
    assert.deepEqual(untrusted.invalidKeys, ["POSTGRES_MIGRATION_URL"]);
  }

  for (const localHost of [
    "localhost",
    "localhost.",
    "service.localhost",
    "127.0.0.1",
    "127.0.0.2",
    "0.0.0.0",
    "[::1]",
    "[::ffff:127.0.0.1]",
    "[::127.0.0.1]",
  ]) {
    const loopback = inspectPostgresRuntimeCapabilityConfiguration(
      "migration",
      environment("migration", {
        APP_RUNTIME_ENVIRONMENT: "staging",
        POSTGRES_MIGRATION_URL:
          `postgresql://connect_migrator_login:production-test-only@${localHost}:5432/railway`,
      }),
    );
    assert.equal(loopback.status, "invalid");
    assert.deepEqual(loopback.invalidKeys, ["POSTGRES_MIGRATION_URL"]);
  }
});

test("rejects malformed URLs, extensions and an invalid capability", () => {
  const malformedUrls = [
    "not-a-url",
    "mysql://connect_api_runtime:local-test-only@127.0.0.1:5432/connect_test",
    "postgresql://connect_api_runtime:local-test-only@127.0.0.1/connect_test",
    "postgresql://connect_api_runtime:local-test-only@127.0.0.1:5432/a/b",
    "postgresql://connect_api_runtime:local-test-only@127.0.0.1:5432/connect_test?ssl=true",
    "postgresql://connect_api_runtime:local-test-only@127.0.0.1:5432/connect_test#fragment",
  ];

  for (const POSTGRES_API_URL of malformedUrls) {
    const state = inspectPostgresRuntimeCapabilityConfiguration(
      "api",
      environment("api", { POSTGRES_API_URL }),
    );
    assert.equal(state.status, "invalid");
    assert.deepEqual(state.invalidKeys, ["POSTGRES_API_URL"]);
  }

  const extension = inspectPostgresRuntimeCapabilityConfiguration("api", {
    ...environment("api"),
    PRIVATE_EXTENSION: "must-not-leak",
  });
  assert.equal(extension.status, "invalid");
  assert.deepEqual(
    extension.invalidKeys,
    postgresRuntimeCapabilityEnvironmentKeys,
  );
  assert.equal(JSON.stringify(extension).includes("must-not-leak"), false);

  assert.deepEqual(
    inspectPostgresRuntimeCapabilityConfiguration("owner", {}),
    {
      status: "invalid",
      missingKeys: [],
      invalidKeys: ["POSTGRES_RUNTIME_CAPABILITY"],
      configuration: null,
    },
  );
});

test("fails closed for hostile environment accessors", () => {
  const environmentProxy = new Proxy({}, {
    ownKeys() {
      throw new Error("hostile-environment");
    },
  });

  assert.deepEqual(
    inspectPostgresRuntimeCapabilityConfiguration("api", environmentProxy),
    {
      status: "invalid",
      missingKeys: [],
      invalidKeys: postgresRuntimeCapabilityEnvironmentKeys,
      configuration: null,
    },
  );

  const customPrototype = Object.create({ inherited: "value" });
  Object.assign(customPrototype, environment("api"));
  const symbolKey = {
    ...environment("api"),
    [Symbol.for("connect.test.postgres.hidden")]: "value",
  };
  const nonEnumerable = environment("api");
  Object.defineProperty(nonEnumerable, "POSTGRES_OWNER_URL", {
    value: "postgresql://owner:secret@127.0.0.1:5432/connect_test",
    enumerable: false,
  });
  const accessor = environment("api");
  Object.defineProperty(accessor, "POSTGRES_OWNER_URL", {
    get() {
      return "postgresql://owner:secret@127.0.0.1:5432/connect_test";
    },
    enumerable: true,
  });

  for (const hostile of [
    customPrototype,
    symbolKey,
    nonEnumerable,
    accessor,
  ]) {
    const state = inspectPostgresRuntimeCapabilityConfiguration(
      "api",
      hostile,
    );
    assert.equal(state.status, "invalid");
    assert.deepEqual(
      state.invalidKeys,
      postgresRuntimeCapabilityEnvironmentKeys,
    );
    assert.equal(JSON.stringify(state).includes("secret"), false);
  }
});
