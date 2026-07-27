import assert from "node:assert/strict";
import test from "node:test";

import {
  CampaignSchedulerError,
  createCampaignScheduler,
} from "../server/campaigns/campaignScheduler.ts";

const now = "2026-07-26T10:00:00.000Z";
const firstDeliveryKey =
  `campaign_delivery_v1_${"a".repeat(64)}`;
const secondDeliveryKey =
  `campaign_delivery_v1_${"b".repeat(64)}`;

function fixture(options = {}) {
  const calls = [];
  const repository = {
    async completeSettledCampaigns(timestamp, limit) {
      calls.push({
        operation: "complete",
        timestamp,
        limit,
      });

      return options.completed ?? 1;
    },
    async promoteDueCampaigns(timestamp, limit) {
      calls.push({
        operation: "promote",
        timestamp,
        limit,
      });

      if (options.repositoryError) {
        throw options.repositoryError;
      }

      return options.promoted ?? [
        {
          campaignKey:
            `campaign_v1_${"c".repeat(64)}`,
        },
      ];
    },
    async claimPendingRecipients(timestamp, limit) {
      calls.push({
        operation: "claim",
        timestamp,
        limit,
      });
      return options.jobs ?? [
        { deliveryKey: firstDeliveryKey },
        { deliveryKey: secondDeliveryKey },
      ];
    },
    async releaseQueuedRecipients(
      deliveryKeys,
      timestamp,
    ) {
      calls.push({
        operation: "release",
        deliveryKeys,
        timestamp,
      });

      if (options.releaseError) {
        throw options.releaseError;
      }
    },
  };
  const queue = {
    async sendBatch(messages) {
      calls.push({
        operation: "send-batch",
        messages,
      });

      if (options.queueError) {
        throw options.queueError;
      }
    },
  };
  const scheduler = createCampaignScheduler(
    repository,
    queue,
    {
      now() {
        return new Date(now);
      },
    },
  );

  return { calls, scheduler };
}

test("promotes due campaigns and publishes one bounded JSON batch", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.scheduler.run();

  assert.deepEqual(result, {
    completedCampaigns: 1,
    promotedCampaigns: 1,
    queuedRecipients: 2,
  });
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["complete", "promote", "claim", "send-batch"],
  );
  assert.equal(testFixture.calls[0].limit, 50);
  assert.equal(testFixture.calls[1].limit, 50);
  assert.equal(testFixture.calls[2].limit, 50);
  assert.deepEqual(
    testFixture.calls[3].messages,
    [
      {
        body: {
          version: 1,
          deliveryKey: firstDeliveryKey,
        },
        contentType: "json",
      },
      {
        body: {
          version: 1,
          deliveryKey: secondDeliveryKey,
        },
        contentType: "json",
      },
    ],
  );
});

test("does not call the queue when no recipient was claimed", async () => {
  const testFixture = fixture({
    completed: 0,
    promoted: [],
    jobs: [],
  });

  assert.deepEqual(
    await testFixture.scheduler.run(),
    {
      completedCampaigns: 0,
      promotedCampaigns: 0,
      queuedRecipients: 0,
    },
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["complete", "promote", "claim"],
  );
});

test("releases claimed recipients after a queue publication failure", async () => {
  const testFixture = fixture({
    queueError: new Error("private queue detail"),
  });

  await assert.rejects(
    testFixture.scheduler.run(),
    (error) => {
      assert.ok(error instanceof CampaignSchedulerError);
      assert.doesNotMatch(
        error.message,
        /private|queue detail/,
      );
      return true;
    },
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    [
      "complete",
      "promote",
      "claim",
      "send-batch",
      "release",
    ],
  );
  assert.deepEqual(
    testFixture.calls[4].deliveryKeys,
    [firstDeliveryKey, secondDeliveryKey],
  );
  assert.equal(testFixture.calls[4].timestamp, now);
});
