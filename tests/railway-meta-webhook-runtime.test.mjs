import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaWebhookSignature,
} from "../server/meta/metaWebhookSecurity.ts";
import {
  createRailwayMetaWebhookRuntime,
} from "../server/platform/railwayMetaWebhookRuntime.ts";

const appSecret = "railway-meta-webhook-secret";
const verifyToken = "railway-meta-webhook-verify-token";
const payload = new TextEncoder().encode(
  JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "connected-waba-id",
        changes: [{ field: "messages", value: {} }],
      },
    ],
  }),
);

function environment(overrides = {}) {
  return {
    META_APP_SECRET: appSecret,
    META_WEBHOOK_VERIFY_TOKEN: verifyToken,
    META_WEBHOOK_RATE_LIMIT_POLICY_VERSION: "7",
    META_WEBHOOK_RATE_LIMIT_CAPACITY: "960",
    META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS: "1",
    ...overrides,
  };
}

function fixture({ allowed = true, queueFailure = false } = {}) {
  const calls = [];
  const runtime = createRailwayMetaWebhookRuntime({
    environment: environment(),
    connections: {
      async findConnectionByWabaId(wabaId) {
        calls.push(["connection", wabaId]);
        return {
          tenantId: 7,
          businessPortfolioId: "connected-portfolio-id",
          wabaId,
          phoneNumberId: "connected-phone-number-id",
          status: "connected",
          webhookSubscribedAt: "2026-08-20 10:00:00",
          connectedAt: "2026-08-20 10:00:00",
          version: 2,
          createdAt: "2026-08-20 09:00:00",
          updatedAt: "2026-08-20 10:00:00",
        };
      },
    },
    queue: {
      async publish(message) {
        calls.push(["queue", message]);
        if (queueFailure) {
          throw new Error("private Railway queue provider failure");
        }
      },
    },
    createRateLimitBinding(policy) {
      calls.push(["policy", policy]);
      return {
        async limit({ key }) {
          calls.push(["rate-limit", key]);
          return { success: allowed };
        },
      };
    },
  });

  return { calls, runtime };
}

test("composes the signed Railway webhook route over isolated policy and queue ports", async () => {
  const testFixture = fixture();
  const signature = await createMetaWebhookSignature(payload, appSecret);
  const response = await testFixture.runtime.handle(
    new Request("https://railway.example.com/webhooks/meta", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: payload,
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "EVENT_RECEIVED");
  assert.deepEqual(testFixture.calls[0], [
    "policy",
    {
      policyId: "meta-webhook",
      policyVersion: 7,
      capacity: 960,
      refillPeriodSeconds: 1,
    },
  ]);
  assert.equal(testFixture.calls[1][0], "rate-limit");
  assert.match(
    testFixture.calls[1][1],
    /^rate_limit_v1_[0-9a-f]{64}$/,
  );
  assert.deepEqual(testFixture.calls[2], [
    "connection",
    "connected-waba-id",
  ]);
  assert.equal(testFixture.calls[3][0], "queue");
  assert.deepEqual(
    [...new Uint8Array(testFixture.calls[3][1].rawPayload)],
    [...payload],
  );
});

test("serves Meta verification without database, rate-limit, or queue access", async () => {
  const testFixture = fixture();
  const response = await testFixture.runtime.handle(
    new Request(
      "https://railway.example.com/webhooks/meta?hub.mode=subscribe&hub.verify_token=railway-meta-webhook-verify-token&hub.challenge=246810",
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "246810");
  assert.equal(testFixture.calls.length, 1);
  assert.equal(testFixture.calls[0][0], "policy");
});

test("rate limits before PostgreSQL connection lookup and queue publication", async () => {
  const testFixture = fixture({ allowed: false });
  const signature = await createMetaWebhookSignature(payload, appSecret);
  const response = await testFixture.runtime.handle(
    new Request("https://railway.example.com/webhooks/meta", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: payload,
    }),
  );

  assert.equal(response.status, 429);
  assert.equal(await response.text(), "RATE_LIMITED");
  assert.deepEqual(
    testFixture.calls.map(([operation]) => operation),
    ["policy", "rate-limit"],
  );
});

test("sanitizes queue failures after signature, policy, and connection checks", async () => {
  const testFixture = fixture({ queueFailure: true });
  const signature = await createMetaWebhookSignature(payload, appSecret);
  const response = await testFixture.runtime.handle(
    new Request("https://railway.example.com/webhooks/meta", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: payload,
    }),
  );
  const responseText = await response.text();

  assert.equal(response.status, 503);
  assert.equal(responseText, "RETRY_LATER");
  assert.doesNotMatch(responseText, /private|provider|connected-waba/i);
});

test("fails closed before dependencies for missing policy or extended options", () => {
  const dependencies = {
    connections: {
      async findConnectionByWabaId() {
        throw new Error("must not query");
      },
    },
    queue: {
      async publish() {
        throw new Error("must not publish");
      },
    },
    createRateLimitBinding() {
      throw new Error("must not bind");
    },
  };

  assert.throws(
    () =>
      createRailwayMetaWebhookRuntime({
        environment: environment({
          META_WEBHOOK_RATE_LIMIT_CAPACITY: undefined,
        }),
        ...dependencies,
      }),
    /rate-limit configuration is unavailable/,
  );
  assert.throws(
    () =>
      createRailwayMetaWebhookRuntime({
        environment: environment(),
        ...dependencies,
        tenantId: 7,
      }),
    /runtime options are invalid/,
  );
});
