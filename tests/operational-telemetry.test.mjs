import assert from "node:assert/strict";
import test from "node:test";

import {
  recordOperationalTelemetry,
} from "../server/operations/operationalTelemetry.ts";
import {
  observeCampaignDeliveryQueueHandler,
  observeMetaWebhookQueueHandler,
} from "../server/operations/queueTelemetry.ts";
import {
  observeKnowledgeScanRecoveryService,
} from "../server/operations/knowledgeRecoveryTelemetry.ts";

function clock(...timestamps) {
  const values = timestamps.map(
    (timestamp) => new Date(timestamp),
  );

  return {
    now() {
      const current = values.shift();

      if (!current) {
        throw new Error(
          "test clock was exhausted",
        );
      }

      return current;
    },
  };
}

test("records only a bounded queue telemetry contract", async () => {
  const recorded = [];
  const event = {
    version: 1,
    kind: "queue-batch",
    queue: "meta-webhook",
    outcome: "completed",
    startedAt: "2026-07-26T10:00:00.000Z",
    completedAt: "2026-07-26T10:00:00.250Z",
    durationMilliseconds: 250,
    counts: {
      processed: 8,
      discarded: 1,
      retried: 1,
    },
  };
  const result = await recordOperationalTelemetry(
    {
      async record(received) {
        recorded.push(received);
        return { outcome: "recorded" };
      },
    },
    event,
  );

  assert.deepEqual(result, {
    outcome: "recorded",
  });
  assert.deepEqual(recorded, [event]);
  assert.notEqual(recorded[0], event);
  assert.doesNotMatch(
    JSON.stringify(recorded[0]),
    /tenant|phone|payload|content|messageId|deliveryKey/i,
  );
});

test("sanitizes invalid telemetry events and sink failures", async () => {
  let calls = 0;
  const sink = {
    async record() {
      calls += 1;
      throw new Error(
        "private telemetry provider failure",
      );
    },
  };

  assert.deepEqual(
    await recordOperationalTelemetry(sink, {
      version: 1,
      kind: "queue-batch",
      queue: "meta-webhook",
      outcome: "completed",
      startedAt:
        "2026-07-26T10:00:00.000Z",
      completedAt:
        "2026-07-26T10:00:00.100Z",
      durationMilliseconds: 99,
      counts: {
        processed: 1,
        discarded: 0,
        retried: 0,
      },
    }),
    { outcome: "unavailable" },
  );
  assert.equal(calls, 0);

  assert.deepEqual(
    await recordOperationalTelemetry(sink, {
      version: 1,
      kind: "queue-batch",
      queue: "meta-webhook",
      outcome: "completed",
      startedAt:
        "2026-07-26T10:00:00.000Z",
      completedAt:
        "2026-07-26T10:00:00.100Z",
      durationMilliseconds: 100,
      counts: {
        processed: 1,
        discarded: 0,
        retried: 0,
      },
    }),
    { outcome: "unavailable" },
  );
  assert.equal(calls, 1);
});

test("observes a completed Meta batch without changing its result", async () => {
  const events = [];
  const expected = {
    processed: 7,
    discarded: 2,
    retried: 1,
  };
  const observed =
    observeMetaWebhookQueueHandler(
      {
        async handle() {
          return expected;
        },
      },
      {
        async record(event) {
          events.push(event);
          return { outcome: "recorded" };
        },
      },
      clock(
        "2026-07-26T10:00:00.000Z",
        "2026-07-26T10:00:00.125Z",
      ),
    );

  assert.equal(
    await observed.handle({
      queue: "connect-meta-webhooks",
      messages: [],
    }),
    expected,
  );
  assert.deepEqual(events, [
    {
      version: 1,
      kind: "queue-batch",
      queue: "meta-webhook",
      outcome: "completed",
      startedAt:
        "2026-07-26T10:00:00.000Z",
      completedAt:
        "2026-07-26T10:00:00.125Z",
      durationMilliseconds: 125,
      counts: expected,
    },
  ]);
});

test("records a failed campaign batch and preserves the original failure", async () => {
  const events = [];
  const failure = new Error(
    "campaign batch failed",
  );
  const observed =
    observeCampaignDeliveryQueueHandler(
      {
        async handle() {
          throw failure;
        },
      },
      {
        async record(event) {
          events.push(event);
          return { outcome: "recorded" };
        },
      },
      clock(
        "2026-07-26T10:00:00.000Z",
        "2026-07-26T10:00:00.075Z",
      ),
    );

  await assert.rejects(
    observed.handle({
      queue: "connect-campaign-deliveries",
      messages: [],
    }),
    (error) => error === failure,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].outcome, "failed");
  assert.equal(
    events[0].durationMilliseconds,
    75,
  );
  assert.deepEqual(events[0].counts, {
    accepted: 0,
    rejected: 0,
    deferred: 0,
    skipped: 0,
    duplicates: 0,
    ambiguous: 0,
    discarded: 0,
    retried: 0,
  });
});

test("observes knowledge recovery without retaining source or tenant identity", async () => {
  const events = [];
  const expected = {
    outcome: "scan-clean",
    source: {
      sourceKey:
        `knowledge_source_v1_${"a".repeat(64)}`,
    },
  };
  const observed =
    observeKnowledgeScanRecoveryService(
      {
        async recover() {
          return expected;
        },
      },
      {
        async record(event) {
          events.push(event);
          return { outcome: "recorded" };
        },
      },
      clock(
        "2026-07-26T10:00:00.000Z",
        "2026-07-26T10:00:00.050Z",
      ),
    );

  assert.equal(
    await observed.recover(
      {
        externalUserId:
          "user_knowledge_owner",
        tenantId: 7,
        displayName: "צוות שירות",
        status: "active",
        role: "owner",
      },
      {
        sourceKey:
          `knowledge_source_v1_${"a".repeat(64)}`,
        expectedVersion: 4,
      },
    ),
    expected,
  );
  assert.deepEqual(events, [
    {
      version: 1,
      kind: "knowledge-scan-recovery",
      outcome: "scan-clean",
      startedAt:
        "2026-07-26T10:00:00.000Z",
      completedAt:
        "2026-07-26T10:00:00.050Z",
      durationMilliseconds: 50,
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(events),
    /tenant|sourceKey|externalUserId/i,
  );
});
