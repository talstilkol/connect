import assert from "node:assert/strict";
import test from "node:test";

import {
  BillingProviderAdapterError,
  BillingProviderProcessorError,
} from "../server/billing/billingProviderContracts.ts";
import {
  BillingWebhookIngressError,
  createBillingProviderEventKey,
  createBillingWebhookIngress,
} from "../server/billing/billingWebhookIngress.ts";
import {
  unavailableBillingProviderAdapter,
} from "../server/billing/unavailableBillingProvider.ts";

const rawBody = new TextEncoder().encode(
  '{"provider":"opaque"}',
);

function event(overrides = {}) {
  return {
    type: "subscription-renewed",
    providerKey: "configured_provider",
    providerEventId: "provider-event-001",
    providerCustomerReference:
      "provider-customer",
    providerSubscriptionReference:
      "provider-subscription",
    occurredAt: "2026-07-26T09:00:00.000Z",
    periodStartAt:
      "2026-07-26T00:00:00.000Z",
    periodEndAt:
      "2026-08-26T00:00:00.000Z",
    ...overrides,
  };
}

function fixture(
  claimResult = {
    claimed: true,
    receiptKey: "receipt-key-001",
  },
) {
  const calls = [];
  const adapter = {
    providerKey: "configured_provider",
    async verifyAndNormalize(request) {
      calls.push({
        operation: "adapter",
        request,
      });
      return event();
    },
  };
  const tenantResolver = {
    async resolve(input) {
      calls.push({
        operation: "resolve",
        input,
      });
      return { tenantId: 7 };
    },
  };
  const receiptStore = {
    async claim(input) {
      calls.push({
        operation: "claim",
        input,
      });
      return claimResult;
    },
    async complete(tenantId, receiptKey) {
      calls.push({
        operation: "complete",
        tenantId,
        receiptKey,
      });
    },
    async fail(
      tenantId,
      receiptKey,
      safeCode,
    ) {
      calls.push({
        operation: "fail",
        tenantId,
        receiptKey,
        safeCode,
      });
    },
  };
  const processor = {
    async process(input) {
      calls.push({
        operation: "process",
        input,
      });
    },
  };

  return {
    calls,
    adapter,
    tenantResolver,
    receiptStore,
    processor,
  };
}

function request(overrides = {}) {
  return {
    rawBody,
    headers: {
      "content-type": "application/json",
    },
    ...overrides,
  };
}

test("verifies, validates, resolves, claims, processes, and completes in order", async () => {
  const testFixture = fixture();
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  const result = await ingress.receive(
    request(),
  );

  assert.equal(result.outcome, "processed");
  assert.equal(result.tenantId, 7);
  assert.equal(
    result.receiptKey,
    "receipt-key-001",
  );
  assert.match(
    result.eventKey,
    /^billing_provider_event_v1_[0-9a-f]{64}$/,
  );
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    [
      "adapter",
      "resolve",
      "claim",
      "process",
      "complete",
    ],
  );
  assert.equal(
    testFixture.calls[1].input
      .providerCustomerReference,
    "provider-customer",
  );
  assert.equal(
    Object.hasOwn(
      testFixture.calls[1].input,
      "tenantId",
    ),
    false,
  );
});

test("uses a deterministic key based on provider identity", async () => {
  const first =
    await createBillingProviderEventKey(
      "configured_provider",
      "provider-event-001",
    );
  const repeated =
    await createBillingProviderEventKey(
      "configured_provider",
      "provider-event-001",
    );
  const other =
    await createBillingProviderEventKey(
      "configured_provider",
      "provider-event-002",
    );

  assert.equal(first, repeated);
  assert.notEqual(first, other);
});

test("rejects a client supplied tenantId before tenant resolution", async () => {
  const testFixture = fixture();
  testFixture.adapter.verifyAndNormalize =
    async (adapterRequest) => {
      testFixture.calls.push({
        operation: "adapter",
        request: adapterRequest,
      });
      return event({ tenantId: 99 });
    };
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code ===
        "INVALID_PROVIDER_EVENT",
  );
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    ["adapter"],
  );
});

test("rejects a cross-provider event before tenant resolution", async () => {
  const testFixture = fixture();
  testFixture.adapter.verifyAndNormalize =
    async (adapterRequest) => {
      testFixture.calls.push({
        operation: "adapter",
        request: adapterRequest,
      });
      return event({
        providerKey: "other_provider",
      });
    };
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code ===
        "INVALID_PROVIDER_EVENT",
  );
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    ["adapter"],
  );
});

test("maps adapter signature failures without resolving a tenant", async () => {
  const testFixture = fixture();
  testFixture.adapter.verifyAndNormalize =
    async (adapterRequest) => {
      testFixture.calls.push({
        operation: "adapter",
        request: adapterRequest,
      });
      throw new BillingProviderAdapterError(
        "INVALID_SIGNATURE",
      );
    };
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code === "INVALID_SIGNATURE",
  );
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    ["adapter"],
  );
});

test("rejects an unresolved tenant before claiming a receipt", async () => {
  const testFixture = fixture();
  testFixture.tenantResolver.resolve =
    async (input) => {
      testFixture.calls.push({
        operation: "resolve",
        input,
      });
      return null;
    };
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code === "TENANT_NOT_FOUND",
  );
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    ["adapter", "resolve"],
  );
});

test("sanitizes tenant resolver failures before receipt access", async () => {
  const testFixture = fixture();
  testFixture.tenantResolver.resolve =
    async (input) => {
      testFixture.calls.push({
        operation: "resolve",
        input,
      });
      throw new Error(
        "customer mapping database details",
      );
    };
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code ===
        "TENANT_RESOLUTION_FAILED" &&
      error.message ===
        "Billing webhook processing failed",
  );
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    ["adapter", "resolve"],
  );
});

test("acknowledges a processed duplicate without invoking the processor", async () => {
  const testFixture = fixture({
    claimed: false,
    receiptKey: "receipt-key-001",
    status: "processed",
  });
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  const result = await ingress.receive(
    request(),
  );

  assert.equal(result.outcome, "duplicate");
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    ["adapter", "resolve", "claim"],
  );
});

test("sanitizes a malformed or failed receipt claim", async () => {
  const testFixture = fixture({
    claimed: true,
    receiptKey: "",
  });
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code ===
        "RECEIPT_STORE_FAILED",
  );
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    ["adapter", "resolve", "claim"],
  );
});

test("rejects a receipt that is still processing without invoking the processor", async () => {
  const testFixture = fixture({
    claimed: false,
    receiptKey: "receipt-key-001",
    status: "processing",
  });
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code ===
        "RECEIPT_ALREADY_PROCESSING",
  );
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    ["adapter", "resolve", "claim"],
  );
});

test("records only a bounded processor code and keeps the receipt retryable", async () => {
  const testFixture = fixture();
  testFixture.processor.process =
    async (input) => {
      testFixture.calls.push({
        operation: "process",
        input,
      });
      throw new BillingProviderProcessorError(
        "SUBSCRIPTION_POLICY_UNAVAILABLE",
      );
    };
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code === "PROCESSING_FAILED" &&
      error.message ===
        "Billing webhook processing failed",
  );
  assert.deepEqual(
    testFixture.calls.at(-1),
    {
      operation: "fail",
      tenantId: 7,
      receiptKey: "receipt-key-001",
      safeCode:
        "SUBSCRIPTION_POLICY_UNAVAILABLE",
    },
  );
});

test("reports a receipt transition failure without leaking the processor error", async () => {
  const testFixture = fixture();
  testFixture.processor.process =
    async (input) => {
      testFixture.calls.push({
        operation: "process",
        input,
      });
      throw new Error(
        "provider secret must not escape",
      );
    };
  testFixture.receiptStore.fail =
    async (
      tenantId,
      receiptKey,
      safeCode,
    ) => {
      testFixture.calls.push({
        operation: "fail",
        tenantId,
        receiptKey,
        safeCode,
      });
      throw new Error("database details");
    };
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code ===
        "RECEIPT_TRANSITION_FAILED" &&
      error.message ===
        "Billing webhook processing failed",
  );
  assert.equal(
    testFixture.calls.at(-1).safeCode,
    "BILLING_PROCESSOR_FAILED",
  );
});

test("fails closed before adapter execution when no provider is configured", async () => {
  const testFixture = fixture();
  const ingress =
    createBillingWebhookIngress(
      unavailableBillingProviderAdapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(request()),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code ===
        "PROVIDER_UNAVAILABLE",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("rejects oversized payloads before provider execution", async () => {
  const testFixture = fixture();
  const ingress =
    createBillingWebhookIngress(
      testFixture.adapter,
      testFixture.tenantResolver,
      testFixture.receiptStore,
      testFixture.processor,
    );

  await assert.rejects(
    ingress.receive(
      request({
        rawBody: new Uint8Array(262_145),
      }),
    ),
    (error) =>
      error instanceof
        BillingWebhookIngressError &&
      error.code === "INVALID_REQUEST",
  );
  assert.deepEqual(testFixture.calls, []);
});
