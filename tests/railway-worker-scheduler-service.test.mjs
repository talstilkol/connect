import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayWorkerSchedulerService,
  RailwayWorkerSchedulerServiceError,
} from "../server/platform/railwayWorkerSchedulerService.ts";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function timerFixture() {
  let nextId = 1;
  const scheduled = [];
  const cancelled = [];

  return {
    scheduled,
    cancelled,
    timers: {
      schedule(callback, delayMilliseconds) {
        const handle = { id: nextId, callback, delayMilliseconds };
        nextId += 1;
        scheduled.push(handle);
        return handle;
      },
      cancel(handle) {
        cancelled.push(handle.id);
      },
    },
  };
}

function telemetry() {
  const events = [];
  return {
    events,
    value: {
      recordRunFailure() {
        events.push("run-failure");
      },
      recordTimerFailure() {
        events.push("timer-failure");
      },
      recordOverlapSuppressed() {
        events.push("overlap-suppressed");
      },
    },
  };
}

function schedulerResult() {
  return {
    outcome: "completed",
    completedTicks: 1,
    lastCompletedTick: "2026-08-17T10:04:00.000Z",
  };
}

test("runs immediately and realigns every completed run to the next minute", async () => {
  const timers = timerFixture();
  const signals = telemetry();
  const times = [
    "2026-08-17T10:04:15.000Z",
    "2026-08-17T10:05:00.000Z",
  ];
  let timeIndex = 0;
  let runs = 0;
  let closes = 0;
  const service = createRailwayWorkerSchedulerService({
    runtime: {
      scheduler: {
        async run() {
          runs += 1;
          return schedulerResult();
        },
      },
      async close() {
        closes += 1;
      },
    },
    telemetry: signals.value,
    clock: {
      now() {
        return new Date(times[timeIndex]);
      },
    },
    timers: timers.timers,
  });

  await service.start();
  await service.start();
  assert.deepEqual(
    timers.scheduled.map(({ delayMilliseconds }) => delayMilliseconds),
    [0],
  );

  await timers.scheduled[0].callback();
  assert.equal(runs, 1);
  assert.equal(timers.scheduled[1].delayMilliseconds, 45_000);

  timeIndex = 1;
  await timers.scheduled[1].callback();
  assert.equal(runs, 2);
  assert.equal(timers.scheduled[2].delayMilliseconds, 60_000);

  await service.close();
  await service.close();
  assert.deepEqual(timers.cancelled, [3]);
  assert.equal(closes, 1);
  assert.deepEqual(signals.events, []);
});

test("suppresses an overlapping callback and schedules only after the active run", async () => {
  const timers = timerFixture();
  const signals = telemetry();
  const active = deferred();
  let runs = 0;
  const service = createRailwayWorkerSchedulerService({
    runtime: {
      scheduler: {
        async run() {
          runs += 1;
          await active.promise;
          return schedulerResult();
        },
      },
      async close() {},
    },
    telemetry: signals.value,
    clock: {
      now() {
        return new Date("2026-08-17T10:04:30.000Z");
      },
    },
    timers: timers.timers,
  });

  await service.start();
  const callback = timers.scheduled[0].callback;
  const first = callback();
  const second = callback();
  await second;

  assert.equal(runs, 1);
  assert.deepEqual(signals.events, ["overlap-suppressed"]);
  assert.equal(timers.scheduled.length, 1);

  active.resolve();
  await first;
  assert.equal(timers.scheduled.length, 2);
  assert.equal(timers.scheduled[1].delayMilliseconds, 30_000);
  await service.close();
});

test("records a bounded run failure and continues on the next minute", async () => {
  const timers = timerFixture();
  const signals = telemetry();
  let runs = 0;
  const service = createRailwayWorkerSchedulerService({
    runtime: {
      scheduler: {
        async run() {
          runs += 1;
          if (runs === 1) {
            throw new Error("private task failure");
          }
          return schedulerResult();
        },
      },
      async close() {},
    },
    telemetry: signals.value,
    clock: {
      now() {
        return new Date("2026-08-17T10:04:20.000Z");
      },
    },
    timers: timers.timers,
  });

  await service.start();
  await timers.scheduled[0].callback();
  assert.deepEqual(signals.events, ["run-failure"]);
  assert.equal(timers.scheduled[1].delayMilliseconds, 40_000);

  await timers.scheduled[1].callback();
  assert.equal(runs, 2);
  assert.deepEqual(signals.events, ["run-failure"]);
  await service.close();
});

test("drains one active run before closing persistence", async () => {
  const timers = timerFixture();
  const active = deferred();
  const events = [];
  const service = createRailwayWorkerSchedulerService({
    runtime: {
      scheduler: {
        async run() {
          events.push("run-started");
          await active.promise;
          events.push("run-finished");
          return schedulerResult();
        },
      },
      async close() {
        events.push("runtime-closed");
      },
    },
    telemetry: telemetry().value,
    clock: {
      now() {
        return new Date("2026-08-17T10:04:10.000Z");
      },
    },
    timers: timers.timers,
  });

  await service.start();
  const running = timers.scheduled[0].callback();
  await Promise.resolve();
  const closing = service.close();
  await Promise.resolve();
  assert.deepEqual(events, ["run-started"]);

  active.resolve();
  await Promise.all([running, closing]);
  assert.deepEqual(events, [
    "run-started",
    "run-finished",
    "runtime-closed",
  ]);
  assert.equal(timers.scheduled.length, 1);
});

test("fails closed for invalid options, timer startup, clock, and shutdown", async () => {
  assert.throws(
    () => createRailwayWorkerSchedulerService({ runtime: {}, telemetry: {} }),
    (error) =>
      error instanceof RailwayWorkerSchedulerServiceError &&
      error.code === "options-invalid",
  );

  let startupCleanup = 0;
  const startFailure = createRailwayWorkerSchedulerService({
    runtime: {
      scheduler: { async run() { return schedulerResult(); } },
      async close() {
        startupCleanup += 1;
      },
    },
    telemetry: telemetry().value,
    timers: {
      schedule() {
        throw new Error("private timer failure");
      },
      cancel() {},
    },
  });
  await assert.rejects(
    startFailure.start(),
    (error) =>
      error instanceof RailwayWorkerSchedulerServiceError &&
      error.code === "start-failed",
  );
  assert.equal(startupCleanup, 1);
  await assert.rejects(
    startFailure.start(),
    (error) =>
      error instanceof RailwayWorkerSchedulerServiceError &&
      error.code === "already-closed",
  );

  const badClockTimers = timerFixture();
  const badClockTelemetry = telemetry();
  const badClock = createRailwayWorkerSchedulerService({
    runtime: {
      scheduler: { async run() { return schedulerResult(); } },
      async close() {},
    },
    telemetry: badClockTelemetry.value,
    clock: { now() { return new Date(Number.NaN); } },
    timers: badClockTimers.timers,
  });
  await badClock.start();
  await badClockTimers.scheduled[0].callback();
  assert.deepEqual(badClockTelemetry.events, ["timer-failure"]);
  assert.equal(badClockTimers.scheduled.length, 1);
  await badClock.close();

  const shutdown = createRailwayWorkerSchedulerService({
    runtime: {
      scheduler: { async run() { return schedulerResult(); } },
      async close() { throw new Error("private close failure"); },
    },
    telemetry: telemetry().value,
    timers: timerFixture().timers,
  });
  await shutdown.start();
  await assert.rejects(
    shutdown.close(),
    (error) =>
      error instanceof RailwayWorkerSchedulerServiceError &&
      error.code === "shutdown-failed" &&
      !error.message.includes("private"),
  );
});
