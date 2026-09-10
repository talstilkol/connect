import assert from "node:assert/strict";
import test from "node:test";

import {
  decideMetaBotReplyRetry,
} from "../server/bot/metaBotReplyRetryPolicy.ts";

function request(overrides = {}) {
  return {
    attemptCount: 1,
    providerErrorCode: 130429,
    cooldownScope: "sender",
    providerRetryAfterSeconds: 17,
    ...overrides,
  };
}

test("uses exact Graph Retry-After for phone throughput", () => {
  assert.deepEqual(
    decideMetaBotReplyRetry(request()),
    { action: "defer", retryAfterSeconds: 17 },
  );

  assert.deepEqual(
    decideMetaBotReplyRetry(request({
      providerRetryAfterSeconds: null,
    })),
    { action: "stop" },
  );
});

test("derives bounded pair backoff from the durable attempt", () => {
  assert.deepEqual(
    decideMetaBotReplyRetry(request({
      attemptCount: 3,
      providerErrorCode: 131056,
      cooldownScope: "pair",
      providerRetryAfterSeconds: null,
    })),
    { action: "defer", retryAfterSeconds: 16 },
  );

  assert.deepEqual(
    decideMetaBotReplyRetry(request({
      attemptCount: 10,
      providerErrorCode: 131056,
      cooldownScope: "pair",
      providerRetryAfterSeconds: null,
    })),
    { action: "stop" },
  );
});

test("never projects a Marketing recipient cooldown onto a service reply", () => {
  for (const invalid of [
    request({
      providerErrorCode: 131049,
      cooldownScope: "portfolio-recipient",
      providerRetryAfterSeconds: null,
    }),
    request({
      providerErrorCode: 131056,
      cooldownScope: "sender",
      providerRetryAfterSeconds: null,
    }),
    request({ unsupported: true }),
  ]) {
    assert.deepEqual(
      decideMetaBotReplyRetry(invalid),
      { action: "stop" },
    );
  }
});
