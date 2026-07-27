import assert from "node:assert/strict";
import test from "node:test";

import {
  handleMetaWebhookQueueRoute,
} from "../server/meta/metaWebhookQueueRuntime.ts";
import {
  createMetaWebhookSignature,
} from "../server/meta/metaWebhookSecurity.ts";

const appSecret = "meta-test-secret";
const verifyToken = "configured-verify-token";
const payload = new TextEncoder().encode(
  JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-id",
        changes: [{ field: "messages", value: {} }],
      },
    ],
  }),
);

function connectedRecord() {
  return {
    tenantId: 7,
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
    status: "connected",
    webhookSubscribedAt: "2026-07-25 10:00:00",
    connectedAt: "2026-07-25 10:00:00",
    version: 2,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 10:00:00",
  };
}

function runtimeEnvironment() {
  const databaseCalls = [];
  const queueCalls = [];
  const database = {
    prepare(sql) {
      return {
        bind(...values) {
          databaseCalls.push({ sql, values });
          return this;
        },
        async first() {
          return connectedRecord();
        },
        async run() {
          return { success: true };
        },
        async all() {
          return { success: true, results: [] };
        },
      };
    },
    async batch() {
      return [];
    },
  };
  const queue = {
    async send(body, options) {
      queueCalls.push({ body, options });
    },
  };

  return {
    databaseCalls,
    queueCalls,
    environment: {
      DB: database,
      META_APP_SECRET: appSecret,
      META_WEBHOOK_VERIFY_TOKEN: verifyToken,
      META_WEBHOOK_QUEUE: queue,
      META_WEBHOOK_RATE_LIMITER: {
        async limit() {
          return { success: true };
        },
      },
    },
  };
}

test("serves Meta verification only when the complete route runtime exists", async () => {
  const testRuntime = runtimeEnvironment();
  const request = new Request(
    "https://connect.invalid/webhooks/meta?hub.mode=subscribe&hub.verify_token=configured-verify-token&hub.challenge=321654",
  );

  const response = await handleMetaWebhookQueueRoute(
    request,
    testRuntime.environment,
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "321654");
  assert.deepEqual(testRuntime.databaseCalls, []);
  assert.deepEqual(testRuntime.queueCalls, []);
});

test("returns success only after a verified event is written to the queue", async () => {
  const testRuntime = runtimeEnvironment();
  const signature = await createMetaWebhookSignature(
    payload,
    appSecret,
  );
  const request = new Request(
    "https://connect.invalid/webhooks/meta",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: payload,
    },
  );

  const response = await handleMetaWebhookQueueRoute(
    request,
    testRuntime.environment,
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "EVENT_RECEIVED");
  assert.equal(testRuntime.queueCalls.length, 1);
  assert.match(
    testRuntime.databaseCalls[0].sql,
    /WHERE waba_id = \?1/,
  );
  assert.deepEqual(
    testRuntime.databaseCalls[0].values,
    ["waba-id"],
  );
});

test("returns a retryable response when durable queue storage fails", async () => {
  const testRuntime = runtimeEnvironment();
  testRuntime.environment.META_WEBHOOK_QUEUE.send =
    async () => {
      throw new Error("private queue failure");
    };
  const signature = await createMetaWebhookSignature(
    payload,
    appSecret,
  );
  const request = new Request(
    "https://connect.invalid/webhooks/meta",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: payload,
    },
  );

  const response = await handleMetaWebhookQueueRoute(
    request,
    testRuntime.environment,
  );
  const responseText = await response.text();

  assert.equal(response.status, 503);
  assert.equal(responseText, "RETRY_LATER");
  assert.doesNotMatch(responseText, /private|queue failure/i);
});

test("returns a bounded response when a verified WABA is rate limited", async () => {
  const testRuntime = runtimeEnvironment();
  testRuntime.environment
    .META_WEBHOOK_RATE_LIMITER.limit =
    async () => ({ success: false });
  const signature =
    await createMetaWebhookSignature(
      payload,
      appSecret,
    );
  const request = new Request(
    "https://connect.invalid/webhooks/meta",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: payload,
    },
  );

  const response =
    await handleMetaWebhookQueueRoute(
      request,
      testRuntime.environment,
    );
  const responseText =
    await response.text();

  assert.equal(response.status, 429);
  assert.equal(responseText, "RATE_LIMITED");
  assert.deepEqual(
    testRuntime.databaseCalls,
    [],
  );
  assert.deepEqual(testRuntime.queueCalls, []);
});

test("returns retry later when rate limit enforcement fails", async () => {
  const testRuntime = runtimeEnvironment();
  testRuntime.environment
    .META_WEBHOOK_RATE_LIMITER.limit =
    async () => {
      throw new Error(
        "private rate limit provider failure",
      );
    };
  const signature =
    await createMetaWebhookSignature(
      payload,
      appSecret,
    );
  const request = new Request(
    "https://connect.invalid/webhooks/meta",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: payload,
    },
  );

  const response =
    await handleMetaWebhookQueueRoute(
      request,
      testRuntime.environment,
    );
  const responseText =
    await response.text();

  assert.equal(response.status, 503);
  assert.equal(responseText, "RETRY_LATER");
  assert.doesNotMatch(
    responseText,
    /private|provider|failure/i,
  );
  assert.deepEqual(
    testRuntime.databaseCalls,
    [],
  );
  assert.deepEqual(testRuntime.queueCalls, []);
});

test("fails closed without exposing missing runtime configuration", async () => {
  const response = await handleMetaWebhookQueueRoute(
    new Request("https://connect.invalid/webhooks/meta"),
    {},
  );
  const responseText = await response.text();

  assert.equal(response.status, 503);
  assert.equal(responseText, "WEBHOOK_UNAVAILABLE");
  assert.equal(
    response.headers.get("cache-control"),
    "no-store",
  );
  assert.doesNotMatch(
    responseText,
    /secret|binding|database|queue/i,
  );
});
