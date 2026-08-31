import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayWorkerRuntime,
} from "../server/platform/railwayWorkerRuntime.ts";
import {
  railwayWorkerSchedulerId,
} from "../shared/domain/workerScheduler.ts";

const ownerKey = `scheduler_owner_v1_${"a".repeat(64)}`;
const deliveryKey = `campaign_delivery_v1_${"b".repeat(64)}`;
const tick = "2026-08-17T13:00:00.000Z";

function runtimeFixture(overrides = {}) {
  const calls = [];
  let claimCount = 0;
  let closeCount = 0;
  const options = {
    ownerKey,
    leases: {
      async claimNext(command) {
        calls.push(["claim", command]);
        claimCount += 1;
        if (claimCount > 1) {
          return { outcome: "not-claimed", claim: null };
        }
        return {
          outcome: "claimed",
          claim: {
            schedulerId: railwayWorkerSchedulerId,
            ownerKey,
            fencingToken: 1,
            tick,
            claimedAt: tick,
            leaseExpiresAt: "2026-08-17T13:02:00.000Z",
          },
        };
      },
      async complete(command) {
        calls.push(["complete", command]);
        return { outcome: "completed", completedTick: command.tick };
      },
    },
    campaignDispatch: {
      async completeSettledCampaigns() {
        calls.push(["campaign-complete"]);
        return 0;
      },
      async promoteDueCampaigns() {
        calls.push(["campaign-promote"]);
        return [];
      },
      async claimPendingRecipients() {
        calls.push(["campaign-claim"]);
        return [{ deliveryKey }];
      },
      async releaseQueuedRecipients(keys) {
        calls.push(["campaign-release", keys]);
      },
    },
    campaignQueue: {
      async sendBatch(messages) {
        calls.push(["queue", messages]);
      },
    },
    invitationExpirations: {
      async listDuePage() {
        calls.push(["invitation-page"]);
        return { invitations: [], nextCursor: null };
      },
    },
    invitations: {
      async transition() {
        throw new Error("No invitation should be expired");
      },
    },
    clock: {
      now() {
        return new Date(tick);
      },
    },
    async close() {
      closeCount += 1;
      calls.push(["close"]);
    },
    ...overrides,
  };

  return {
    calls,
    options,
    closeCount() {
      return closeCount;
    },
  };
}

test("composes PostgreSQL-ready campaign and invitation tasks behind one lease", async () => {
  const fixture = runtimeFixture();
  const runtime = createRailwayWorkerRuntime(fixture.options);

  assert.deepEqual(await runtime.scheduler.run(), {
    outcome: "completed",
    completedTicks: 1,
    lastCompletedTick: tick,
  });
  assert.equal(
    fixture.calls.some(([name]) => name === "campaign-complete"),
    true,
  );
  assert.equal(
    fixture.calls.some(([name]) => name === "campaign-promote"),
    true,
  );
  assert.equal(
    fixture.calls.some(([name]) => name === "campaign-claim"),
    true,
  );
  assert.equal(
    fixture.calls.some(([name]) => name === "invitation-page"),
    true,
  );
  const queueCall = fixture.calls.find(([name]) => name === "queue");
  assert.equal(queueCall[1].length, 1);
  assert.equal(queueCall[1][0].body.deliveryKey, deliveryKey);
  assert.equal(queueCall[1][0].contentType, "json");
  assert.equal(
    fixture.calls.findIndex(([name]) => name === "complete") >
      fixture.calls.findIndex(([name]) => name === "queue"),
    true,
  );

  await runtime.close();
  await runtime.close();
  assert.equal(fixture.closeCount(), 1);
});

test("releases PostgreSQL claims when queue publication fails", async () => {
  const fixture = runtimeFixture({
    campaignQueue: {
      async sendBatch() {
        throw new Error("queue unavailable");
      },
    },
  });
  const runtime = createRailwayWorkerRuntime(fixture.options);

  await assert.rejects(runtime.scheduler.run(), {
    code: "task-failed",
  });
  assert.deepEqual(
    fixture.calls.find(([name]) => name === "campaign-release")?.[1],
    [deliveryKey],
  );
  assert.equal(
    fixture.calls.some(([name]) => name === "complete"),
    false,
  );
  await runtime.close();
});

test("runs optional message-template maintenance under the shared lease", async () => {
  const fixture = runtimeFixture({
    messageTemplateSubmissions: {
      async run() {
        fixture.calls.push(["message-template-maintenance"]);
      },
    },
  });
  const runtime = createRailwayWorkerRuntime(fixture.options);

  await runtime.scheduler.run();

  const maintenanceIndex = fixture.calls.findIndex(
    ([name]) => name === "message-template-maintenance",
  );
  const completionIndex = fixture.calls.findIndex(
    ([name]) => name === "complete",
  );
  assert.equal(maintenanceIndex >= 0, true);
  assert.equal(completionIndex > maintenanceIndex, true);
  await runtime.close();
});

test("runs due bot replies under the same fenced scheduler lease", async () => {
  const fixture = runtimeFixture({
    botReplyDeliveries: {
      async run() {
        fixture.calls.push(["bot-reply-deliveries"]);
      },
    },
  });
  const runtime = createRailwayWorkerRuntime(fixture.options);

  await runtime.scheduler.run();

  const deliveryIndex = fixture.calls.findIndex(
    ([name]) => name === "bot-reply-deliveries",
  );
  const completionIndex = fixture.calls.findIndex(
    ([name]) => name === "complete",
  );
  assert.equal(deliveryIndex >= 0, true);
  assert.equal(completionIndex > deliveryIndex, true);
  await runtime.close();
});

test("runs campaign DLQ maintenance under the same fenced lease", async () => {
  const fixture = runtimeFixture({
    campaignDeliveryMaintenance: {
      async run() {
        fixture.calls.push(["campaign-delivery-maintenance"]);
      },
    },
  });
  const runtime = createRailwayWorkerRuntime(fixture.options);

  await runtime.scheduler.run();

  const maintenanceIndex = fixture.calls.findIndex(
    ([name]) => name === "campaign-delivery-maintenance",
  );
  const completionIndex = fixture.calls.findIndex(
    ([name]) => name === "complete",
  );
  assert.equal(maintenanceIndex >= 0, true);
  assert.equal(completionIndex > maintenanceIndex, true);
  await runtime.close();
});

test("propagates one shared close failure without retrying the pool", async () => {
  let closeCount = 0;
  const failure = new Error("pool close failed");
  const fixture = runtimeFixture({
    async close() {
      closeCount += 1;
      throw failure;
    },
  });
  const runtime = createRailwayWorkerRuntime(fixture.options);

  await assert.rejects(runtime.close(), (error) => error === failure);
  await assert.rejects(runtime.close(), (error) => error === failure);
  assert.equal(closeCount, 1);
});

test("rejects incomplete and extended runtime composition", () => {
  assert.throws(
    () => createRailwayWorkerRuntime({}),
    /options are invalid/,
  );
  const fixture = runtimeFixture();
  assert.throws(
    () => createRailwayWorkerRuntime({
      ...fixture.options,
      unsupported: true,
    }),
    /options are invalid/,
  );
});
