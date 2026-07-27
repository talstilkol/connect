import assert from "node:assert/strict";
import test from "node:test";

import {
  CampaignDeliveryDeadLetterError,
  inspectCampaignDeliveryDeadLetter,
  requeueConfirmedCampaignDeliveryDeadLetter,
} from "../server/campaigns/campaignDeliveryDeadLetter.ts";
import {
  createCampaignDeliveryQueueMessage,
} from "../server/campaigns/campaignDeliveryQueueMessage.ts";

const deliveryKey =
  `campaign_delivery_v1_${"b".repeat(64)}`;

function deadLetterDelivery(overrides = {}) {
  const actions = [];

  return {
    actions,
    delivery: {
      id: "campaign-queue-message-id",
      timestamp: new Date(
        "2026-07-25T10:00:00.000Z",
      ),
      attempts: 11,
      body:
        createCampaignDeliveryQueueMessage(
          deliveryKey,
        ),
      ack() {
        actions.push("ack");
      },
      retry() {
        actions.push("retry");
      },
      ...overrides,
    },
  };
}

test("inspects campaign dead-letter metadata without exposing the delivery identity", async () => {
  const fixture = deadLetterDelivery();
  const inspection =
    await inspectCampaignDeliveryDeadLetter(
      fixture.delivery,
    );

  assert.equal(inspection.status, "replayable");
  assert.equal(
    inspection.messageId,
    "campaign-queue-message-id",
  );
  assert.equal(
    inspection.enqueuedAt,
    "2026-07-25T10:00:00.000Z",
  );
  assert.equal(inspection.attempts, 11);
  assert.match(
    inspection.recoveryKey,
    /^[0-9a-f]{64}$/,
  );
  assert.equal(
    Object.hasOwn(inspection, "deliveryKey"),
    false,
  );
});

test("marks malformed campaign dead letters as invalid", async () => {
  const fixture = deadLetterDelivery({
    id: "",
    timestamp: new Date("invalid"),
    attempts: 0,
    body: null,
  });

  assert.deepEqual(
    await inspectCampaignDeliveryDeadLetter(
      fixture.delivery,
    ),
    {
      status: "invalid",
      messageId: null,
      enqueuedAt: null,
      attempts: null,
      reason: "INVALID_QUEUE_MESSAGE",
    },
  );
});

test("requeues only an explicitly confirmed campaign dead letter", async () => {
  const fixture = deadLetterDelivery();
  const inspection =
    await inspectCampaignDeliveryDeadLetter(
      fixture.delivery,
    );
  const sent = [];
  const result =
    await requeueConfirmedCampaignDeliveryDeadLetter(
      fixture.delivery,
      {
        async sendBatch(messages) {
          sent.push(...messages);
        },
      },
      inspection.recoveryKey,
    );

  assert.deepEqual(result, {
    outcome: "requeued",
    recoveryKey: inspection.recoveryKey,
  });
  assert.deepEqual(sent, [
    {
      body: {
        version: 1,
        deliveryKey,
      },
      contentType: "json",
    },
  ]);
  assert.deepEqual(fixture.actions, ["ack"]);
});

test("keeps a campaign dead letter unacknowledged on confirmation or queue failure", async () => {
  for (const scenario of [
    {
      expectedRecoveryKey: "0".repeat(64),
      queue: {
        async sendBatch() {},
      },
      code: "CONFIRMATION_MISMATCH",
    },
    {
      expectedRecoveryKey: null,
      queue: {
        async sendBatch() {
          throw new Error(
            "private campaign queue failure",
          );
        },
      },
      code: "REQUEUE_UNAVAILABLE",
    },
  ]) {
    const fixture = deadLetterDelivery();
    const inspection =
      await inspectCampaignDeliveryDeadLetter(
        fixture.delivery,
      );

    await assert.rejects(
      requeueConfirmedCampaignDeliveryDeadLetter(
        fixture.delivery,
        scenario.queue,
        scenario.expectedRecoveryKey ??
          inspection.recoveryKey,
      ),
      (error) =>
        error instanceof
          CampaignDeliveryDeadLetterError &&
        error.code === scenario.code,
    );
    assert.deepEqual(fixture.actions, []);
  }
});
