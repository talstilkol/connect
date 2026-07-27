import assert from "node:assert/strict";
import test from "node:test";

import {
  enforceSystemAdminMutationRateLimit,
  SystemAdminMutationRateLimitError,
} from "../server/security/systemAdminMutationRateLimit.ts";

test("allows a system admin mutation through its separate policy", async () => {
  const keys = [];

  await enforceSystemAdminMutationRateLimit(
    "authorized-system-admin-identity",
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

test("separates tenant and system admin mutation keys", async () => {
  const identity =
    "authorized-system-admin-identity";
  const keys = [];
  const binding = {
    async limit(input) {
      keys.push(input.key);
      return { success: true };
    },
  };
  const {
    enforceTenantMutationRateLimit,
  } = await import(
    "../server/security/tenantMutationRateLimit.ts"
  );

  await enforceTenantMutationRateLimit(
    identity,
    binding,
  );
  await enforceSystemAdminMutationRateLimit(
    identity,
    binding,
  );

  assert.equal(keys.length, 2);
  assert.notEqual(keys[0], keys[1]);
});

test("fails closed with bounded system admin rate limit errors", async () => {
  const cases = [
    {
      binding: {
        async limit() {
          return { success: false };
        },
      },
      code: "RATE_LIMITED",
    },
    {
      binding: undefined,
      code: "RATE_LIMIT_UNAVAILABLE",
    },
    {
      binding: {
        async limit() {
          throw new Error(
            "private binding failure",
          );
        },
      },
      code: "RATE_LIMIT_UNAVAILABLE",
    },
  ];

  for (const fixture of cases) {
    await assert.rejects(
      enforceSystemAdminMutationRateLimit(
        "authorized-system-admin-identity",
        fixture.binding,
      ),
      (error) => {
        assert.equal(
          error instanceof
            SystemAdminMutationRateLimitError,
          true,
        );
        assert.equal(
          error.code,
          fixture.code,
        );
        assert.doesNotMatch(
          JSON.stringify(error),
          /private|binding failure/i,
        );
        return true;
      },
    );
  }
});
