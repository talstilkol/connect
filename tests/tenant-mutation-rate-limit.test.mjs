import assert from "node:assert/strict";
import test from "node:test";

import {
  enforceTenantMutationRateLimit,
  TenantMutationRateLimitError,
} from "../server/security/tenantMutationRateLimit.ts";

test("allows a tenant mutation through the tenant policy", async () => {
  const keys = [];

  await enforceTenantMutationRateLimit(
    "authenticated-external-identity",
    {
      async limit(input) {
        keys.push(input.key);
        return { success: true };
      },
    },
  );

  assert.equal(keys.length, 1);
  assert.match(
    keys[0],
    /^rate_limit_v1_[0-9a-f]{64}$/,
  );
});

test("returns a bounded error when the tenant mutation is limited", async () => {
  await assert.rejects(
    enforceTenantMutationRateLimit(
      "authenticated-external-identity",
      {
        async limit() {
          return { success: false };
        },
      },
    ),
    (error) =>
      error instanceof
        TenantMutationRateLimitError &&
      error.code === "RATE_LIMITED",
  );
});

test("fails closed for missing, failed, or malformed bindings", async () => {
  const bindings = [
    undefined,
    {
      async limit() {
        throw new Error(
          "private provider failure",
        );
      },
    },
    {
      async limit() {
        return {};
      },
    },
  ];

  for (const binding of bindings) {
    await assert.rejects(
      enforceTenantMutationRateLimit(
        "authenticated-external-identity",
        binding,
      ),
      (error) => {
        assert.equal(
          error instanceof
            TenantMutationRateLimitError,
          true,
        );
        assert.equal(
          error.code,
          "RATE_LIMIT_UNAVAILABLE",
        );
        assert.doesNotMatch(
          JSON.stringify(error),
          /private|provider/i,
        );
        return true;
      },
    );
  }
});
