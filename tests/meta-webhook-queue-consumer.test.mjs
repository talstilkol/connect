import assert from "node:assert/strict";
import test from "node:test";

import {
  MetaWebhookEnvelopeError,
} from "../server/meta/metaWebhookEnvelope.ts";
import {
  MetaWebhookIngressError,
} from "../server/meta/metaWebhookIngress.ts";
import {
  createMetaWebhookQueueConsumer,
} from "../server/meta/metaWebhookQueueConsumer.ts";

const rawPayload = new TextEncoder().encode(
  '{"object":"whatsapp_business_account","entry":[{"id":"waba-id"}]}',
);
const signatureHeader = `sha256=${"a".repeat(64)}`;

function queueBody() {
  const copy = new Uint8Array(rawPayload.byteLength);
  copy.set(rawPayload);

  return {
    version: 1,
    rawPayload: copy.buffer,
    signatureHeader,
  };
}

function delivery(body = queueBody()) {
  const actions = [];

  return {
    actions,
    message: {
      body,
      ack() {
        actions.push({ action: "ack" });
      },
      retry(options) {
        actions.push({ action: "retry", options });
      },
    },
  };
}

test("acknowledges a processed or duplicate queue message individually", async () => {
  for (const outcome of ["processed", "duplicate"]) {
    const calls = [];
    const testDelivery = delivery();
    const consumer = createMetaWebhookQueueConsumer({
      async receive(payload, signature) {
        calls.push({ payload, signature });
        return {
          outcome,
          tenantId: 7,
          receiptId: 31,
          eventKey: "event-key",
        };
      },
    });

    const result = await consumer.handle({
      messages: [testDelivery.message],
    });

    assert.deepEqual(result, {
      processed: 1,
      discarded: 0,
      retried: 0,
    });
    assert.deepEqual(testDelivery.actions, [
      { action: "ack" },
    ]);
    assert.deepEqual([...calls[0].payload], [...rawPayload]);
    assert.equal(calls[0].signature, signatureHeader);
  }
});

test("retries transient processing and receipt failures with a bounded delay", async () => {
  for (const code of [
    "RECEIPT_ALREADY_PROCESSING",
    "PROCESSING_FAILED",
    "RECEIPT_TRANSITION_FAILED",
  ]) {
    const testDelivery = delivery();
    const consumer = createMetaWebhookQueueConsumer({
      async receive() {
        throw new MetaWebhookIngressError(
          code,
          "private transient detail",
        );
      },
    });

    const result = await consumer.handle({
      messages: [testDelivery.message],
    });

    assert.deepEqual(result, {
      processed: 0,
      discarded: 0,
      retried: 1,
    });
    assert.deepEqual(testDelivery.actions, [
      {
        action: "retry",
        options: { delaySeconds: 30 },
      },
    ]);
  }
});

test("acknowledges permanent provider failures without retry loops", async () => {
  const errors = [
    new MetaWebhookEnvelopeError(
      "INVALID_ENVELOPE",
      "private invalid envelope",
    ),
    new MetaWebhookIngressError(
      "INVALID_SIGNATURE",
      "private invalid signature",
    ),
    new MetaWebhookIngressError(
      "CONNECTION_NOT_FOUND",
      "private missing connection",
    ),
  ];

  for (const error of errors) {
    const testDelivery = delivery();
    const consumer = createMetaWebhookQueueConsumer({
      async receive() {
        throw error;
      },
    });

    const result = await consumer.handle({
      messages: [testDelivery.message],
    });

    assert.deepEqual(result, {
      processed: 0,
      discarded: 1,
      retried: 0,
    });
    assert.deepEqual(testDelivery.actions, [
      { action: "ack" },
    ]);
  }
});

test("acknowledges malformed queue bodies before ingress access", async () => {
  let ingressCalls = 0;
  const consumer = createMetaWebhookQueueConsumer({
    async receive() {
      ingressCalls += 1;
      return {
        outcome: "processed",
        tenantId: 7,
        receiptId: 31,
        eventKey: "event-key",
      };
    },
  });
  const deliveries = [
    delivery(null),
    delivery({}),
    delivery({
      ...queueBody(),
      version: 2,
    }),
    delivery({
      ...queueBody(),
      rawPayload: new ArrayBuffer(0),
    }),
    delivery({
      ...queueBody(),
      signatureHeader: "invalid",
    }),
  ];

  const result = await consumer.handle({
    messages: deliveries.map((item) => item.message),
  });

  assert.deepEqual(result, {
    processed: 0,
    discarded: deliveries.length,
    retried: 0,
  });
  assert.equal(ingressCalls, 0);

  for (const testDelivery of deliveries) {
    assert.deepEqual(testDelivery.actions, [
      { action: "ack" },
    ]);
  }
});

test("retries unexpected failures and continues processing the batch", async () => {
  const first = delivery();
  const second = delivery();
  let calls = 0;
  const consumer = createMetaWebhookQueueConsumer({
    async receive() {
      calls += 1;

      if (calls === 1) {
        throw new Error("private unexpected failure");
      }

      return {
        outcome: "processed",
        tenantId: 7,
        receiptId: 31,
        eventKey: "event-key",
      };
    },
  });

  const result = await consumer.handle({
    messages: [first.message, second.message],
  });

  assert.deepEqual(result, {
    processed: 1,
    discarded: 0,
    retried: 1,
  });
  assert.deepEqual(first.actions, [
    {
      action: "retry",
      options: { delaySeconds: 30 },
    },
  ]);
  assert.deepEqual(second.actions, [
    { action: "ack" },
  ]);
});
