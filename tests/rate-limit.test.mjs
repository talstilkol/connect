import assert from "node:assert/strict";
import test from "node:test";

import {
  createRateLimitGuard,
  deriveRateLimitKey,
  RateLimitConfigurationError,
  RateLimitUnavailableError,
} from "../server/security/rateLimit.ts";

test("derives stable purpose-separated keys without retaining the subject", async () => {
  const subject = "authenticated-external-identity";
  const firstKey = await deriveRateLimitKey(
    "tenant-mutation",
    subject,
  );
  const retryKey = await deriveRateLimitKey(
    "tenant-mutation",
    subject,
  );
  const separatePolicyKey = await deriveRateLimitKey(
    "system-admin-mutation",
    subject,
  );
  const providerPolicyKey = await deriveRateLimitKey(
    "clerk-organization-invitation",
    subject,
  );

  assert.equal(firstKey, retryKey);
  assert.match(
    firstKey,
    /^rate_limit_v1_[0-9a-f]{64}$/,
  );
  assert.notEqual(firstKey, separatePolicyKey);
  assert.notEqual(firstKey, providerPolicyKey);
  assert.notEqual(separatePolicyKey, providerPolicyKey);
  assert.doesNotMatch(firstKey, new RegExp(subject));
});

test("passes only the derived key to the rate limit binding", async () => {
  const calls = [];
  const guard = createRateLimitGuard(
    {
      async limit(input) {
        calls.push(input);
        return { success: true };
      },
    },
    "meta-webhook",
  );

  assert.deepEqual(
    await guard.consume("verified-waba-identity"),
    { outcome: "allowed" },
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(calls[0]), ["key"]);
  assert.match(
    calls[0].key,
    /^rate_limit_v1_[0-9a-f]{64}$/,
  );
});

test("returns a bounded limited result from the binding", async () => {
  const guard = createRateLimitGuard(
    {
      async limit() {
        return { success: false };
      },
    },
    "meta-webhook",
  );

  assert.deepEqual(
    await guard.consume("verified-waba-identity"),
    { outcome: "limited" },
  );
});

test("rejects missing bindings and invalid subjects before external access", async () => {
  assert.throws(
    () =>
      createRateLimitGuard(
        undefined,
        "meta-webhook",
      ),
    RateLimitConfigurationError,
  );

  let calls = 0;
  const guard = createRateLimitGuard(
    {
      async limit() {
        calls += 1;
        return { success: true };
      },
    },
    "meta-webhook",
  );

  await assert.rejects(
    guard.consume(" invalid"),
    RateLimitConfigurationError,
  );
  assert.equal(calls, 0);
});

test("fails closed and sanitizes binding failures", async () => {
  const privateFailure =
    "private provider rate limit failure";
  const guard = createRateLimitGuard(
    {
      async limit() {
        throw new Error(privateFailure);
      },
    },
    "meta-webhook",
  );

  await assert.rejects(
    guard.consume("verified-waba-identity"),
    (error) => {
      assert.equal(
        error instanceof RateLimitUnavailableError,
        true,
      );
      assert.doesNotMatch(
        JSON.stringify(error),
        new RegExp(privateFailure),
      );
      return true;
    },
  );
});
