import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  inspectPostgresMetaWebhookRateLimitConfiguration,
  inspectPostgresSystemAdminMutationRateLimitConfiguration,
  inspectPostgresTenantMutationRateLimitConfiguration,
  postgresMetaWebhookRateLimitEnvironmentKeys,
  postgresSystemAdminMutationRateLimitEnvironmentKeys,
  postgresTenantMutationRateLimitEnvironmentKeys,
} from "../server/platform/postgresMutationRateLimitConfiguration.ts";

function configured(overrides = {}) {
  return {
    TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION: "3",
    TENANT_MUTATION_RATE_LIMIT_CAPACITY: "120",
    TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "60",
    ...overrides,
  };
}

function configuredSystemAdmin(overrides = {}) {
  return {
    SYSTEM_ADMIN_MUTATION_RATE_LIMIT_POLICY_VERSION: "4",
    SYSTEM_ADMIN_MUTATION_RATE_LIMIT_CAPACITY: "30",
    SYSTEM_ADMIN_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "60",
    ...overrides,
  };
}

function configuredMetaWebhook(overrides = {}) {
  return {
    META_WEBHOOK_RATE_LIMIT_POLICY_VERSION: "5",
    META_WEBHOOK_RATE_LIMIT_CAPACITY: "960",
    META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS: "1",
    ...overrides,
  };
}

test("requires an explicit versioned tenant mutation policy without defaults", () => {
  assert.deepEqual(
    inspectPostgresTenantMutationRateLimitConfiguration(configured()),
    {
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      policy: {
        policyId: "tenant-mutation",
        policyVersion: 3,
        capacity: 120,
        refillPeriodSeconds: 60,
      },
    },
  );
});

test("distinguishes disabled, incomplete, and invalid configuration", () => {
  assert.deepEqual(
    inspectPostgresTenantMutationRateLimitConfiguration({}),
    {
      status: "disabled",
      missingKeys: postgresTenantMutationRateLimitEnvironmentKeys,
      invalidKeys: [],
      policy: null,
    },
  );
  assert.deepEqual(
    inspectPostgresTenantMutationRateLimitConfiguration({
      TENANT_MUTATION_RATE_LIMIT_CAPACITY: "120",
    }),
    {
      status: "incomplete",
      missingKeys: [
        "TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION",
        "TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS",
      ],
      invalidKeys: [],
      policy: null,
    },
  );
  assert.deepEqual(
    inspectPostgresTenantMutationRateLimitConfiguration(
      configured({
        TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION: "0",
        TENANT_MUTATION_RATE_LIMIT_CAPACITY: "1000001",
        TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "1.5",
      }),
    ),
    {
      status: "invalid",
      missingKeys: [],
      invalidKeys: [
        "TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION",
        "TENANT_MUTATION_RATE_LIMIT_CAPACITY",
        "TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS",
      ],
      policy: null,
    },
  );
});

test("keeps system-admin and Meta webhook policies isolated and explicit", () => {
  assert.deepEqual(
    inspectPostgresSystemAdminMutationRateLimitConfiguration(
      configuredSystemAdmin(),
    ),
    {
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      policy: {
        policyId: "system-admin-mutation",
        policyVersion: 4,
        capacity: 30,
        refillPeriodSeconds: 60,
      },
    },
  );
  assert.deepEqual(
    inspectPostgresMetaWebhookRateLimitConfiguration(
      configuredMetaWebhook(),
    ),
    {
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      policy: {
        policyId: "meta-webhook",
        policyVersion: 5,
        capacity: 960,
        refillPeriodSeconds: 1,
      },
    },
  );

  assert.deepEqual(
    inspectPostgresSystemAdminMutationRateLimitConfiguration({}),
    {
      status: "disabled",
      missingKeys: postgresSystemAdminMutationRateLimitEnvironmentKeys,
      invalidKeys: [],
      policy: null,
    },
  );
  assert.deepEqual(
    inspectPostgresMetaWebhookRateLimitConfiguration({
      META_WEBHOOK_RATE_LIMIT_CAPACITY: "960",
    }),
    {
      status: "incomplete",
      missingKeys: [
        "META_WEBHOOK_RATE_LIMIT_POLICY_VERSION",
        "META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS",
      ],
      invalidKeys: [],
      policy: null,
    },
  );
});

test("documents every Railway rate-limit setting without committing values", async () => {
  const source = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  for (const key of [
    ...postgresTenantMutationRateLimitEnvironmentKeys,
    ...postgresSystemAdminMutationRateLimitEnvironmentKeys,
    ...postgresMetaWebhookRateLimitEnvironmentKeys,
  ]) {
    assert.match(source, new RegExp(`^${key}=$`, "m"));
  }
});
