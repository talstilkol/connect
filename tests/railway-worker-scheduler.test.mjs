import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayWorkerScheduler,
  RailwayWorkerSchedulerError,
} from "../server/platform/railwayWorkerScheduler.ts";
import {
  railwayWorkerSchedulerId,
} from "../shared/domain/workerScheduler.ts";

const ownerKey = `scheduler_owner_v1_${"c".repeat(64)}`;
const now = "2026-08-17T10:04:15.000Z";

function claim(tick, fencingToken) {
  return {
    outcome: "claimed",
    claim: {
      schedulerId: railwayWorkerSchedulerId,
      ownerKey,
      fencingToken,
      tick,
      claimedAt: now,
      leaseExpiresAt: "2026-08-17T10:06:15.000Z",
    },
  };
}

function clock(value = now) {
  return {
    now() {
      return new Date(value);
    },
  };
}

test("runs bounded catch-up ticks under exact fenced claims", async () => {
  const ticks = [
    "2026-08-17T10:02:00.000Z",
    "2026-08-17T10:03:00.000Z",
    "2026-08-17T10:04:00.000Z",
  ];
  const claims = ticks.map((tick, index) => claim(tick, index + 4));
  claims.push({ outcome: "not-claimed", claim: null });
  const claimCalls = [];
  const completionCalls = [];
  const taskCalls = [];
  const scheduler = createRailwayWorkerScheduler({
    ownerKey,
    leases: {
      async claimNext(command) {
        claimCalls.push(command);
        return claims.shift();
      },
      async complete(command) {
        completionCalls.push(command);
        return {
          outcome: "completed",
          completedTick: command.tick,
        };
      },
    },
    campaigns: {
      async run() {
        taskCalls.push("campaigns");
      },
    },
    invitationExpirations: {
      async run() {
        taskCalls.push("invitations");
      },
    },
    botReplyDeliveries: {
      async run() {
        taskCalls.push("bot-replies");
      },
    },
    messageTemplateSubmissions: {
      async run() {
        taskCalls.push("message-templates");
      },
    },
    clock: clock(),
  });

  assert.deepEqual(await scheduler.run(), {
    outcome: "completed",
    completedTicks: 3,
    lastCompletedTick: "2026-08-17T10:04:00.000Z",
  });
  assert.equal(claimCalls.length, 4);
  assert.equal(
    claimCalls.every(
      (call) =>
        call.currentTick === "2026-08-17T10:04:00.000Z" &&
        call.maximumCatchUpTicks === 5 &&
        call.leaseSeconds === 120,
    ),
    true,
  );
  assert.deepEqual(taskCalls, [
    "campaigns",
    "invitations",
    "bot-replies",
    "message-templates",
    "campaigns",
    "invitations",
    "bot-replies",
    "message-templates",
    "campaigns",
    "invitations",
    "bot-replies",
    "message-templates",
  ]);
  assert.deepEqual(
    completionCalls.map(({ tick, fencingToken }) => ({ tick, fencingToken })),
    ticks.map((tick, index) => ({ tick, fencingToken: index + 4 })),
  );
});

test("returns idle without starting tasks when another worker owns the tick", async () => {
  let taskCalls = 0;
  const scheduler = createRailwayWorkerScheduler({
    ownerKey,
    leases: {
      async claimNext() {
        return { outcome: "not-claimed", claim: null };
      },
      async complete() {
        throw new Error("must not complete");
      },
    },
    campaigns: {
      async run() {
        taskCalls += 1;
      },
    },
    invitationExpirations: {
      async run() {
        taskCalls += 1;
      },
    },
    clock: clock(),
  });

  assert.deepEqual(await scheduler.run(), {
    outcome: "idle",
    completedTicks: 0,
    lastCompletedTick: null,
  });
  assert.equal(taskCalls, 0);
});

test("waits for both tasks and leaves a failed tick uncompleted", async () => {
  let completions = 0;
  let invitationFinished = false;
  const scheduler = createRailwayWorkerScheduler({
    ownerKey,
    leases: {
      async claimNext() {
        return claim("2026-08-17T10:04:00.000Z", 8);
      },
      async complete() {
        completions += 1;
        return {
          outcome: "completed",
          completedTick: "2026-08-17T10:04:00.000Z",
        };
      },
    },
    campaigns: {
      async run() {
        throw new Error("private campaign failure");
      },
    },
    invitationExpirations: {
      async run() {
        invitationFinished = true;
      },
    },
    clock: clock(),
  });

  await assert.rejects(
    scheduler.run(),
    (error) =>
      error instanceof RailwayWorkerSchedulerError &&
      error.code === "task-failed" &&
      !error.message.includes("private"),
  );
  assert.equal(invitationFinished, true);
  assert.equal(completions, 0);
});

test("fails the leased tick when optional template maintenance fails", async () => {
  let completions = 0;
  const scheduler = createRailwayWorkerScheduler({
    ownerKey,
    leases: {
      async claimNext() {
        return claim("2026-08-17T10:04:00.000Z", 10);
      },
      async complete() {
        completions += 1;
        return {
          outcome: "completed",
          completedTick: "2026-08-17T10:04:00.000Z",
        };
      },
    },
    campaigns: { async run() {} },
    invitationExpirations: { async run() {} },
    messageTemplateSubmissions: {
      async run() {
        throw new Error("private template maintenance failure");
      },
    },
    clock: clock(),
  });

  await assert.rejects(
    scheduler.run(),
    (error) =>
      error instanceof RailwayWorkerSchedulerError &&
      error.code === "task-failed" &&
      !error.message.includes("private"),
  );
  assert.equal(completions, 0);
});

test("fails closed for invalid options, clocks, leases, and stale completion", async () => {
  assert.throws(
    () =>
      createRailwayWorkerScheduler({
        ownerKey: "plain-owner",
        leases: {},
        campaigns: {},
        invitationExpirations: {},
        clock: {},
      }),
    (error) =>
      error instanceof RailwayWorkerSchedulerError &&
      error.code === "options-invalid",
  );

  const base = {
    ownerKey,
    campaigns: { async run() {} },
    invitationExpirations: { async run() {} },
    clock: clock(),
  };
  assert.throws(
    () => createRailwayWorkerScheduler({
      ...base,
      leases: {
        async claimNext() {
          return { outcome: "not-claimed", claim: null };
        },
        async complete() {
          throw new Error("must not complete");
        },
      },
      messageTemplateSubmissions: {},
    }),
    (error) =>
      error instanceof RailwayWorkerSchedulerError &&
      error.code === "options-invalid",
  );
  const cases = [
    {
      expected: "clock-invalid",
      scheduler: createRailwayWorkerScheduler({
        ...base,
        clock: clock("invalid"),
        leases: {
          async claimNext() {
            throw new Error("must not claim");
          },
          async complete() {
            throw new Error("must not complete");
          },
        },
      }),
    },
    {
      expected: "lease-unavailable",
      scheduler: createRailwayWorkerScheduler({
        ...base,
        leases: {
          async claimNext() {
            throw new Error("private database failure");
          },
          async complete() {
            throw new Error("must not complete");
          },
        },
      }),
    },
    {
      expected: "claim-lost",
      scheduler: createRailwayWorkerScheduler({
        ...base,
        leases: {
          async claimNext() {
            return claim("2026-08-17T10:04:00.000Z", 9);
          },
          async complete() {
            return { outcome: "claim-lost", completedTick: null };
          },
        },
      }),
    },
  ];

  for (const { expected, scheduler } of cases) {
    await assert.rejects(
      scheduler.run(),
      (error) =>
        error instanceof RailwayWorkerSchedulerError &&
        error.code === expected,
    );
  }
});
