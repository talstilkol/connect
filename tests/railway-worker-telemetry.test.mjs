import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayWorkerOperationalTelemetrySink,
  createRailwayWorkerQueueTelemetry,
  createRailwayWorkerStructuredLogger,
  isRailwayWorkerLogEvent,
  recordRailwayWorkerSignal,
} from "../server/platform/railwayWorkerTelemetry.ts";

test("writes bounded queue and worker signals without runtime identities", () => {
  const lines = [];
  const logger = createRailwayWorkerStructuredLogger({
    write(line) {
      lines.push(line);
    },
  });
  const telemetry = createRailwayWorkerQueueTelemetry(
    logger,
    "team-invitation",
  );

  telemetry.recordConnectionFailure();
  telemetry.recordDeadLetter("retry-exhausted");
  telemetry.recordDeadLetterCleanup(3);
  recordRailwayWorkerSignal(logger, "scheduler-overlap-suppressed");

  assert.deepEqual(lines.map((line) => JSON.parse(line)), [
    {
      version: 1,
      service: "connect-railway-worker",
      kind: "queue-signal",
      queue: "team-invitation",
      code: "connection-failure",
    },
    {
      version: 1,
      service: "connect-railway-worker",
      kind: "queue-signal",
      queue: "team-invitation",
      code: "dead-letter",
      reason: "retry-exhausted",
    },
    {
      version: 1,
      service: "connect-railway-worker",
      kind: "queue-signal",
      queue: "team-invitation",
      code: "dead-letter-cleanup",
      count: 3,
    },
    {
      version: 1,
      service: "connect-railway-worker",
      kind: "worker-signal",
      code: "scheduler-overlap-suppressed",
    },
  ]);
  assert.equal(lines.join("").includes("tenantId"), false);
  assert.equal(lines.join("").includes("deliveryKey"), false);
});

test("records validated operational counters as one structured event", async () => {
  const lines = [];
  const sink = createRailwayWorkerOperationalTelemetrySink(
    createRailwayWorkerStructuredLogger({
      write(line) {
        lines.push(line);
      },
    }),
  );
  const event = {
    version: 1,
    kind: "queue-batch",
    queue: "meta-webhook",
    outcome: "completed",
    startedAt: "2026-08-21T08:00:00.000Z",
    completedAt: "2026-08-21T08:00:00.005Z",
    durationMilliseconds: 5,
    counts: { processed: 1, discarded: 0, retried: 0 },
  };

  assert.deepEqual(await sink.record(event), { outcome: "recorded" });
  assert.deepEqual(JSON.parse(lines[0]), {
    version: 1,
    service: "connect-railway-worker",
    kind: "operational-event",
    event,
  });
});

test("contains writer failures and rejects malformed dependencies", async () => {
  const logger = createRailwayWorkerStructuredLogger({
    write() {
      throw new Error("private log failure");
    },
  });
  const sink = createRailwayWorkerOperationalTelemetrySink(logger);

  assert.deepEqual(await sink.record({}), { outcome: "unavailable" });
  assert.throws(
    () => createRailwayWorkerStructuredLogger({}),
    /writer is invalid/,
  );
  assert.throws(
    () => createRailwayWorkerQueueTelemetry(logger, "unknown"),
    /queue telemetry is invalid/,
  );
});

test("rejects extended and inconsistent Worker events before writing", () => {
  const lines = [];
  const logger = createRailwayWorkerStructuredLogger({
    write(line) {
      lines.push(line);
    },
  });
  assert.equal(isRailwayWorkerLogEvent({
    version: 1,
    service: "connect-railway-worker",
    kind: "queue-signal",
    queue: "team-invitation",
    code: "dead-letter",
  }), false);
  assert.equal(logger.record({
    version: 1,
    service: "connect-railway-worker",
    kind: "worker-signal",
    code: "shutdown-failure",
    privateError: "provider secret",
  }), false);
  assert.deepEqual(lines, []);
});
