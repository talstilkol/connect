import assert from "node:assert/strict";
import test from "node:test";

import {
  MetaWebhookIngressError,
} from "../server/meta/metaWebhookIngress.ts";
import {
  createMetaWebhookQueuePublisher,
  MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES,
  MetaWebhookQueuePublisherError,
} from "../server/meta/metaWebhookQueuePublisher.ts";
import {
  createMetaWebhookSignature,
} from "../server/meta/metaWebhookSecurity.ts";

const appSecret = "meta-test-secret";
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

function connection(status = "connected") {
  return {
    tenantId: 7,
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
    status,
    webhookSubscribedAt:
      status === "connected"
        ? "2026-07-25 10:00:00"
        : null,
    connectedAt:
      status === "connected"
        ? "2026-07-25 10:00:00"
        : null,
    version: 2,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 10:00:00",
  };
}

function fixture(status = "connected") {
  const repositoryCalls = [];
  const queueCalls = [];
  const repository = {
    async findConnectionByTenantId() {
      throw new Error("not used");
    },
    async findConnectionByWabaId(wabaId) {
      repositoryCalls.push({ operation: "find", wabaId });
      return connection(status);
    },
    async saveAssetSnapshot() {
      throw new Error("not used");
    },
    async markConnectionConnected() {
      throw new Error("not used");
    },
    async markConnectionStatus() {
      throw new Error("not used");
    },
    async claimWebhookReceipt() {
      repositoryCalls.push({ operation: "claim" });
      throw new Error("must not claim before queue persistence");
    },
    async completeWebhookReceipt() {
      repositoryCalls.push({ operation: "complete" });
      throw new Error("must not complete before processing");
    },
    async failWebhookReceipt() {
      repositoryCalls.push({ operation: "fail" });
      throw new Error("must not fail before processing");
    },
  };
  const queue = {
    async publish(body) {
      queueCalls.push({ body });
    },
  };

  return {
    publisher: createMetaWebhookQueuePublisher(
      repository,
      queue,
      appSecret,
      {
        async consume() {
          return { outcome: "allowed" };
        },
      },
    ),
    queue,
    queueCalls,
    repositoryCalls,
  };
}

test("verifies and writes exact webhook bytes to the queue before acknowledging", async () => {
  const testFixture = fixture();
  const signature = await createMetaWebhookSignature(
    payload,
    appSecret,
  );

  const result = await testFixture.publisher.receive(
    payload,
    signature,
  );

  assert.deepEqual(result, { outcome: "queued" });
  assert.deepEqual(testFixture.repositoryCalls, [
    { operation: "find", wabaId: "waba-id" },
  ]);
  assert.equal(testFixture.queueCalls.length, 1);
  assert.equal(testFixture.queueCalls[0].body.version, 1);
  assert.equal(
    testFixture.queueCalls[0].body.signatureHeader,
    signature,
  );
  assert.deepEqual(
    [
      ...new Uint8Array(
        testFixture.queueCalls[0].body.rawPayload,
      ),
    ],
    [...payload],
  );
});

test("rate limits a verified WABA before database and queue access", async () => {
  const repositoryCalls = [];
  const queueCalls = [];
  const publisher =
    createMetaWebhookQueuePublisher(
      {
        async findConnectionByWabaId() {
          repositoryCalls.push("find");
          return connection();
        },
      },
      {
        async publish() {
          queueCalls.push("publish");
        },
      },
      appSecret,
      {
        async consume(subject) {
          assert.equal(subject, "waba-id");
          return { outcome: "limited" };
        },
      },
    );
  const signature =
    await createMetaWebhookSignature(
      payload,
      appSecret,
    );

  await assert.rejects(
    publisher.receive(payload, signature),
    (error) =>
      error instanceof
        MetaWebhookQueuePublisherError &&
      error.code === "RATE_LIMITED",
  );
  assert.deepEqual(repositoryCalls, []);
  assert.deepEqual(queueCalls, []);
});

test("fails closed when rate limit enforcement is unavailable", async () => {
  const privateFailure =
    "private rate limit provider failure";
  const publisher =
    createMetaWebhookQueuePublisher(
      {
        async findConnectionByWabaId() {
          throw new Error(
            "database must not be reached",
          );
        },
      },
      {
        async publish() {
          throw new Error(
            "queue must not be reached",
          );
        },
      },
      appSecret,
      {
        async consume() {
          throw new Error(privateFailure);
        },
      },
    );
  const signature =
    await createMetaWebhookSignature(
      payload,
      appSecret,
    );

  await assert.rejects(
    publisher.receive(payload, signature),
    (error) => {
      assert.equal(
        error instanceof
          MetaWebhookQueuePublisherError,
        true,
      );
      assert.equal(
        error.code,
        "QUEUE_UNAVAILABLE",
      );
      assert.doesNotMatch(
        JSON.stringify(error),
        new RegExp(privateFailure),
      );
      return true;
    },
  );
});

test("rejects invalid signatures before database and queue access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.publisher.receive(
      payload,
      `sha256=${"0".repeat(64)}`,
    ),
    (error) =>
      error instanceof MetaWebhookIngressError &&
      error.code === "INVALID_SIGNATURE",
  );
  assert.deepEqual(testFixture.repositoryCalls, []);
  assert.deepEqual(testFixture.queueCalls, []);
});

test("rejects pending or unknown WABAs before queue access", async () => {
  const testFixture = fixture("pending");
  const signature = await createMetaWebhookSignature(
    payload,
    appSecret,
  );

  await assert.rejects(
    testFixture.publisher.receive(payload, signature),
    (error) =>
      error instanceof MetaWebhookIngressError &&
      error.code === "CONNECTION_NOT_FOUND",
  );
  assert.deepEqual(testFixture.queueCalls, []);
});

test("enforces the queue payload limit before cryptographic or external access", async () => {
  const testFixture = fixture();
  const oversizedPayload = new Uint8Array(
    MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES + 1,
  );

  await assert.rejects(
    testFixture.publisher.receive(
      oversizedPayload,
      `sha256=${"a".repeat(64)}`,
    ),
    (error) =>
      error instanceof MetaWebhookQueuePublisherError &&
      error.code === "PAYLOAD_TOO_LARGE",
  );
  assert.deepEqual(testFixture.repositoryCalls, []);
  assert.deepEqual(testFixture.queueCalls, []);
});

test("sanitizes queue write failures without exposing payload or provider details", async () => {
  const testFixture = fixture();
  testFixture.queue.publish = async () => {
    throw new Error(
      "private queue failure containing webhook payload",
    );
  };
  const signature = await createMetaWebhookSignature(
    payload,
    appSecret,
  );

  await assert.rejects(
    testFixture.publisher.receive(payload, signature),
    (error) => {
      assert.equal(
        error instanceof MetaWebhookQueuePublisherError,
        true,
      );
      assert.equal(error.code, "QUEUE_UNAVAILABLE");
      assert.doesNotMatch(
        JSON.stringify(error),
        /private|payload|waba-id/i,
      );
      return true;
    },
  );
});
