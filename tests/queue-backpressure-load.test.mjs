import assert from "node:assert/strict";
import test from "node:test";

import {
  createCampaignDeliveryQueueConsumer,
} from "../server/campaigns/campaignDeliveryQueueConsumer.ts";
import {
  createMetaWebhookQueueConsumer,
} from "../server/meta/metaWebhookQueueConsumer.ts";
import {
  createTeamInvitationQueueConsumer,
} from "../server/team/teamInvitationQueueConsumer.ts";
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

const campaignKey =
  `campaign_v1_${"a".repeat(64)}`;

function campaignDelivery(ordinal) {
  const suffix = ordinal.toString(16).padStart(64, "0");
  const deliveryKey =
    `campaign_delivery_v1_${suffix}`;
  let action = null;

  return {
    deliveryKey,
    message: {
      id: `campaign-message-${ordinal}`,
      timestamp: new Date(
        Date.parse(
          "2026-07-26T10:00:00.000Z",
        ) +
          ordinal * 1_000,
      ),
      attempts: 1,
      body: {
        version: 1,
        deliveryKey,
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

function invitationDelivery(ordinal) {
  const deliveryKey =
    `team_invitation_delivery_v1_${ordinal.toString(16).padStart(64, "0")}`;
  let action = null;

  return {
    message: {
      id: `invitation-message-${ordinal}`,
      timestamp: new Date(
        Date.parse(
          "2026-07-26T10:00:00.000Z",
        ) +
          ordinal * 1_000,
      ),
      attempts: 1,
      body: {
        version: 1,
        tenantId: 7,
        deliveryKey,
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

test("processes 100 full campaign batches with one provider submission in flight", async () => {
  const batchCount = 100;
  let active = 0;
  let maximumActive = 0;
  let accepted = 0;
  const consumer = createCampaignDeliveryQueueConsumer(
    {
      async findQueuedDeliveryContext(deliveryKey) {
        return {
          campaignKey,
          tenantId: 7,
          recipientPhoneNumber: "+972501234567",
          nextDeliveryAttemptNumber: 1,
          deliveryKey,
        };
      },
      async prepareDelivery(deliveryKey) {
        return {
          outcome: "claimed",
          recipient: {
            deliveryKey,
            status: "sending",
          },
        };
      },
      async markRejected() {
        throw new Error("must not reject");
      },
      async markDeferred() {
        throw new Error("must not defer");
      },
      async markAmbiguous() {
        throw new Error("must not mark ambiguous");
      },
    },
    {
      async findByKey() {
        return {
          campaignKey,
          tenantId: 7,
          status: "running",
          template: { category: "UTILITY" },
        };
      },
    },
    {
      async recordAccepted() {
        accepted += 1;
        return {
          outcome: "recorded",
          link: {},
        };
      },
    },
    {
      isConfigured() {
        return true;
      },
      async reserve(request) {
        return {
          outcome: "reserved",
          reservationKey:
            `whatsapp_rate_reservation_v1_${request.deliveryKey.slice(-64)}`,
        };
      },
      async settle() {
        throw new Error("must settle through provider acceptance");
      },
      async deferProviderRejection() {
        throw new Error("must not defer provider rejection");
      },
    },
    {
      isConfigured() {
        return true;
      },
      async process(prepared) {
        active += 1;
        maximumActive = Math.max(
          maximumActive,
          active,
        );
        await Promise.resolve();
        active -= 1;

        return {
          outcome: "accepted",
          providerMessageId:
            `wamid.${prepared.recipient.deliveryKey.slice(-64)}`,
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

  for (
    let batchIndex = 0;
    batchIndex < batchCount;
    batchIndex += 1
  ) {
    const deliveries = Array.from(
      { length: QUEUE_BATCH_CAPACITY },
      (_, index) =>
        campaignDelivery(
          batchIndex *
            QUEUE_BATCH_CAPACITY +
            index +
            1,
        ),
    );
    const result = await consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: deliveries.map(
        (delivery) => delivery.message,
      ),
    });

    assert.equal(result.accepted, QUEUE_BATCH_CAPACITY);
    assert.equal(result.rejected, 0);
    assert.equal(result.deferred, 0);
    assert.equal(result.ambiguous, 0);
    assert.equal(result.retried, 0);
    assert.equal(
      deliveries.every(
        (delivery) => delivery.action() === "ack",
      ),
      true,
    );
  }

  assert.equal(
    accepted,
    batchCount * QUEUE_BATCH_CAPACITY,
  );
  assert.equal(maximumActive, 1);
});

test("processes 100 full invitation batches with one dispatch in flight", async () => {
  const batchCount = 100;
  let active = 0;
  let maximumActive = 0;
  let submitted = 0;
  const consumer = createTeamInvitationQueueConsumer(
    {
      async process() {
        active += 1;
        maximumActive = Math.max(
          maximumActive,
          active,
        );
        await Promise.resolve();
        active -= 1;
        submitted += 1;

        return { outcome: "submitted" };
      },
    },
    {
      isConfigured() {
        return true;
      },
    },
  );

  for (
    let batchIndex = 0;
    batchIndex < batchCount;
    batchIndex += 1
  ) {
    const deliveries = Array.from(
      { length: QUEUE_BATCH_CAPACITY },
      (_, index) =>
        invitationDelivery(
          batchIndex *
            QUEUE_BATCH_CAPACITY +
            index +
            1,
        ),
    );
    const result = await consumer.handle({
      queue: "connect-team-invitations",
      messages: deliveries.map(
        (delivery) => delivery.message,
      ),
    });

    assert.equal(result.submitted, QUEUE_BATCH_CAPACITY);
    assert.equal(result.blocked, 0);
    assert.equal(result.ambiguous, 0);
    assert.equal(result.retried, 0);
    assert.equal(
      deliveries.every(
        (delivery) => delivery.action() === "ack",
      ),
      true,
    );
  }

  assert.equal(
    submitted,
    batchCount * QUEUE_BATCH_CAPACITY,
  );
  assert.equal(maximumActive, 1);
});

test("rejects oversized Meta, campaign, and invitation batches before business access", async () => {
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
  const invitationConsumer =
    createTeamInvitationQueueConsumer(
      {
        async process() {
          businessCalls += 1;
          return { outcome: "submitted" };
        },
      },
      {
        isConfigured() {
          return true;
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
  await assert.rejects(
    invitationConsumer.handle({
      queue: "connect-team-invitations",
      messages,
    }),
    QueueBackpressureError,
  );
  assert.equal(businessCalls, 0);
});
