import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaWebhookIngress,
  MetaWebhookIngressError,
  MetaWebhookProcessorError,
} from "../server/meta/metaWebhookIngress.ts";
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

function connection(overrides = {}) {
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
    ...overrides,
  };
}

function fixture(receiptStatus = "processing") {
  const calls = [];
  const repository = {
    async findConnectionByTenantId() {
      return null;
    },
    async findConnectionByWabaId(wabaId) {
      calls.push({ operation: "find", wabaId });
      return connection();
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
    async claimWebhookReceipt(input) {
      calls.push({ operation: "claim", input });
      return {
        claimed: receiptStatus === "processing",
        receipt: {
          id: 31,
          tenantId: 7,
          wabaId: "waba-id",
          eventKey: input.eventKey,
          objectType: input.objectType,
          status: receiptStatus,
          attemptCount: 1,
          lastErrorCode: null,
          receivedAt: "2026-07-25 10:00:00",
          processedAt:
            receiptStatus === "processed"
              ? "2026-07-25 10:00:01"
              : null,
          updatedAt: "2026-07-25 10:00:01",
        },
      };
    },
    async completeWebhookReceipt(tenantId, receiptId) {
      calls.push({ operation: "complete", tenantId, receiptId });
    },
    async failWebhookReceipt(tenantId, receiptId, errorCode) {
      calls.push({
        operation: "fail",
        tenantId,
        receiptId,
        errorCode,
      });
    },
  };

  return { calls, repository };
}

test("verifies, routes, claims, processes, and completes a Meta webhook", async () => {
  const testFixture = fixture();
  const processed = [];
  const ingress = createMetaWebhookIngress(
    testFixture.repository,
    async (event) => {
      processed.push(event);
    },
    appSecret,
  );
  const signature = await createMetaWebhookSignature(payload, appSecret);

  const result = await ingress.receive(payload, signature);

  assert.equal(result.outcome, "processed");
  assert.equal(result.tenantId, 7);
  assert.equal(result.receiptId, 31);
  assert.match(result.eventKey, /^[0-9a-f]{64}$/);
  assert.equal(processed.length, 1);
  assert.equal(processed[0].envelope.wabaId, "waba-id");
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["find", "claim", "complete"],
  );
  assert.equal(testFixture.calls[1].input.tenantId, 7);
  assert.equal(testFixture.calls[1].input.wabaId, "waba-id");
});

test("acknowledges an already processed receipt without running the processor again", async () => {
  const testFixture = fixture("processed");
  let processorCalls = 0;
  const ingress = createMetaWebhookIngress(
    testFixture.repository,
    async () => {
      processorCalls += 1;
    },
    appSecret,
  );
  const signature = await createMetaWebhookSignature(payload, appSecret);

  const result = await ingress.receive(payload, signature);

  assert.equal(result.outcome, "duplicate");
  assert.equal(processorCalls, 0);
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["find", "claim"],
  );
});

test("rejects an invalid signature before parsing or database access", async () => {
  const testFixture = fixture();
  const ingress = createMetaWebhookIngress(
    testFixture.repository,
    async () => {},
    appSecret,
  );

  await assert.rejects(
    ingress.receive(payload, `sha256=${"0".repeat(64)}`),
    (error) =>
      error instanceof MetaWebhookIngressError &&
      error.code === "INVALID_SIGNATURE",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("rejects a verified webhook when its WABA is not connected", async () => {
  const testFixture = fixture();
  testFixture.repository.findConnectionByWabaId = async (wabaId) => {
    testFixture.calls.push({ operation: "find", wabaId });
    return null;
  };
  const ingress = createMetaWebhookIngress(
    testFixture.repository,
    async () => {},
    appSecret,
  );
  const signature = await createMetaWebhookSignature(payload, appSecret);

  await assert.rejects(
    ingress.receive(payload, signature),
    (error) =>
      error instanceof MetaWebhookIngressError &&
      error.code === "CONNECTION_NOT_FOUND",
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["find"],
  );
});

test("rejects a pending WABA before claiming a receipt", async () => {
  const testFixture = fixture();
  testFixture.repository.findConnectionByWabaId = async (wabaId) => {
    testFixture.calls.push({ operation: "find", wabaId });
    return connection({
      status: "pending",
      webhookSubscribedAt: null,
      connectedAt: null,
    });
  };
  const ingress = createMetaWebhookIngress(
    testFixture.repository,
    async () => {},
    appSecret,
  );
  const signature = await createMetaWebhookSignature(
    payload,
    appSecret,
  );

  await assert.rejects(
    ingress.receive(payload, signature),
    (error) =>
      error instanceof MetaWebhookIngressError &&
      error.code === "CONNECTION_NOT_FOUND",
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["find"],
  );
});

test("records only a safe processor error code and leaves the receipt retryable", async () => {
  const testFixture = fixture();
  const ingress = createMetaWebhookIngress(
    testFixture.repository,
    async () => {
      throw new MetaWebhookProcessorError("TEMPLATE_SYNC_FAILED");
    },
    appSecret,
  );
  const signature = await createMetaWebhookSignature(payload, appSecret);

  await assert.rejects(
    ingress.receive(payload, signature),
    (error) =>
      error instanceof MetaWebhookIngressError &&
      error.code === "PROCESSING_FAILED",
  );
  assert.deepEqual(testFixture.calls.at(-1), {
    operation: "fail",
    tenantId: 7,
    receiptId: 31,
    errorCode: "TEMPLATE_SYNC_FAILED",
  });
});
