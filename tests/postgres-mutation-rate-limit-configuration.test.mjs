import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  inspectPostgresTenantMutationRateLimitConfiguration,
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

test("documents every Railway rate-limit setting without committing values", async () => {
  const source = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  for (const key of postgresTenantMutationRateLimitEnvironmentKeys) {
    assert.match(source, new RegExp(`^${key}=$`, "m"));
  }
});
