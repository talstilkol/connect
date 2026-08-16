import assert from "node:assert/strict";
import test from "node:test";

import {
  createCampaignDeliveryQueueConsumer,
} from "../server/campaigns/campaignDeliveryQueueConsumer.ts";
import {
  createMetaWebhookQueueConsumer,
} from "../server/meta/metaWebhookQueueConsumer.ts";
import {
  QUEUE_BATCH_CAPACITY,
  QueueBackpressureError,
} from "../server/operations/queueBackpressure.ts";

const signatureHeader =
  `sha256=${"a".repeat(64)}`;

function metaDelivery(ordinal) {
  const rawPayload = new TextEncoder().encode(
    JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: `waba-${ordinal}` }],
    }),
  );
  let action = null;

  return {
    message: {
      id: `meta-message-${ordinal}`,
      timestamp: new Date(
        Date.parse(
          "2026-07-26T10:00:00.000Z",
        ) +
          ordinal * 1_000,
      ),
      attempts: 1,
      body: {
        version: 1,
        rawPayload: rawPayload.buffer,
        signatureHeader,
      },
      ack() {
        action = "ack";
      },
      retry() {
        action = "retry";
      },
    },
    action() {
      return action;
    },
  };
}

test("processes 100 full Meta batches with one in-flight item", async () => {
  const batchCount = 100;
  let active = 0;
  let maximumActive = 0;
  let processed = 0;
  const consumer = createMetaWebhookQueueConsumer({
    async receive() {
      active += 1;
      maximumActive = Math.max(
        maximumActive,
        active,
      );
      await Promise.resolve();
      active -= 1;

      return {
        outcome: "processed",
        tenantId: 7,
        receiptId: 31,
        eventKey: "event-key",
      };
    },
  });

  for (
    let batchIndex = 0;
    batchIndex < batchCount;
    batchIndex += 1
  ) {
    const deliveries = Array.from(
      { length: QUEUE_BATCH_CAPACITY },
      (_, index) =>
        metaDelivery(
          batchIndex *
            QUEUE_BATCH_CAPACITY +
            index +
            1,
        ),
    );
    const result = await consumer.handle({
      queue: "connect-meta-webhooks",
      messages: deliveries.map(
        (delivery) => delivery.message,
      ),
    });

    processed += result.processed;
    assert.equal(result.discarded, 0);
    assert.equal(result.retried, 0);
    assert.equal(
      deliveries.every(
        (delivery) =>
          delivery.action() === "ack",
      ),
      true,
    );
  }

  assert.equal(
    processed,
    batchCount * QUEUE_BATCH_CAPACITY,
  );
  assert.equal(maximumActive, 1);
});

test("rejects oversized Meta and campaign batches before business access", async () => {
  const messages = Array.from(
    { length: QUEUE_BATCH_CAPACITY + 1 },
    (_, index) => metaDelivery(index + 1).message,
  );
  let businessCalls = 0;
  const metaConsumer =
    createMetaWebhookQueueConsumer({
      async receive() {
        businessCalls += 1;
        throw new Error(
          "must not process an oversized batch",
        );
      },
    });
  const campaignConsumer =
    createCampaignDeliveryQueueConsumer(
      {
        async findQueuedDeliveryContext() {
          businessCalls += 1;
          return null;
        },
      },
      {
        async findByKey() {
          businessCalls += 1;
          return null;
        },
      },
      {
        async recordAccepted() {
          businessCalls += 1;
          throw new Error(
            "must not process an oversized batch",
          );
        },
      },
      {
        isConfigured() {
          return true;
        },
        async reserve() {
          businessCalls += 1;
          throw new Error(
            "must not process an oversized batch",
          );
        },
        async settle() {
          businessCalls += 1;
        },
      },
      {
        isConfigured() {
          return true;
        },
        async process() {
          businessCalls += 1;
          return {
            outcome: "accepted",
            providerMessageId:
              "wamid.oversized-batch",
          };
        },
      },
      {
        now() {
          return new Date(
            "2026-07-26T10:00:00.000Z",
          );
        },
      },
    );

  await assert.rejects(
    metaConsumer.handle({
      queue: "connect-meta-webhooks",
      messages,
    }),
    QueueBackpressureError,
  );
  await assert.rejects(
    campaignConsumer.handle({
      queue: "connect-campaign-deliveries",
      messages,
    }),
    QueueBackpressureError,
  );
  assert.equal(businessCalls, 0);
});
