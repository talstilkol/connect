import assert from "node:assert/strict";
import test from "node:test";

import {
  createCampaignDeliveryQueueMessage,
  parseCampaignDeliveryQueueMessage,
} from "../server/campaigns/campaignDeliveryQueueMessage.ts";

const deliveryKey =
  `campaign_delivery_v1_${"a".repeat(64)}`;

test("creates and parses the exact campaign delivery queue contract", () => {
  const message =
    createCampaignDeliveryQueueMessage(
      deliveryKey,
    );

  assert.deepEqual(message, {
    version: 1,
    deliveryKey,
  });
  assert.deepEqual(
    parseCampaignDeliveryQueueMessage(message),
    message,
  );
});

test("rejects malformed, unknown, and extended queue messages", () => {
  for (const value of [
    null,
    {},
    {
      version: 2,
      deliveryKey,
    },
    {
      version: 1,
      deliveryKey: "../delivery",
    },
    {
      version: 1,
      deliveryKey,
      tenantId: 7,
    },
  ]) {
    assert.equal(
      parseCampaignDeliveryQueueMessage(value),
      null,
    );
  }
});
