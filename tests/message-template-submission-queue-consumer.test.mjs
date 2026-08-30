import assert from "node:assert/strict";
import test from "node:test";

import {
  QueueBackpressureError,
} from "../server/operations/queueBackpressure.ts";
import {
  createMessageTemplateSubmissionQueueConsumer,
} from "../server/templates/messageTemplateSubmissionQueueConsumer.ts";
import {
  createMessageTemplateSubmissionQueueMessage,
} from "../server/templates/messageTemplateSubmissionQueueMessage.ts";

const submissionKey = `template_submission_v1_${"a".repeat(64)}`;

function delivery(body) {
  const calls = [];

  return {
    calls,
    value: {
      id: "message-template-submission-delivery",
      timestamp: new Date("2026-08-21T10:00:00.000Z"),
      attempts: 1,
      body,
      ack() {
        calls.push({ operation: "ack" });
      },
      retry(options) {
        calls.push({ operation: "retry", options });
      },
    },
  };
}

function emptyResult() {
  return {
    submitted: 0,
    rejected: 0,
    ambiguous: 0,
    blocked: 0,
    duplicates: 0,
    discarded: 0,
    retried: 0,
  };
}

test("acknowledges every bounded terminal worker outcome", async () => {
  const scenarios = [
    ["submitted", "submitted"],
    ["rejected", "rejected"],
    ["ambiguous", "ambiguous"],
    ["blocked", "blocked"],
    ["duplicate", "duplicates"],
    ["not-found", "duplicates"],
  ];

  for (const [outcome, resultKey] of scenarios) {
    const item = delivery(
      createMessageTemplateSubmissionQueueMessage(7, submissionKey),
    );
    const consumer = createMessageTemplateSubmissionQueueConsumer({
      async process(tenantId, key) {
        assert.equal(tenantId, 7);
        assert.equal(key, submissionKey);
        return { outcome };
      },
    });
    const expected = emptyResult();
    expected[resultKey] = 1;

    assert.deepEqual(
      await consumer.handle({
        queue: "connect-message-template-submissions",
        messages: [item.value],
      }),
      expected,
    );
    assert.deepEqual(item.calls, [{ operation: "ack" }]);
  }
});

test("discards malformed messages and retries bounded worker failures", async () => {
  const malformed = delivery({ version: 1, tenantId: 7, submissionKey: "invalid" });
  const failed = delivery(
    createMessageTemplateSubmissionQueueMessage(7, submissionKey),
  );
  const consumer = createMessageTemplateSubmissionQueueConsumer({
    async process() {
      throw new Error("private storage failure");
    },
  });

  assert.deepEqual(
    await consumer.handle({
      queue: "connect-message-template-submissions",
      messages: [malformed.value, failed.value],
    }),
    { ...emptyResult(), discarded: 1, retried: 1 },
  );
  assert.deepEqual(malformed.calls, [{ operation: "ack" }]);
  assert.deepEqual(failed.calls, [{
    operation: "retry",
    options: { delaySeconds: 30 },
  }]);
});

test("rejects oversized batches before invoking the worker", async () => {
  let processorCalls = 0;
  const consumer = createMessageTemplateSubmissionQueueConsumer({
    async process() {
      processorCalls += 1;
      return { outcome: "submitted" };
    },
  });
  const messages = Array.from(
    { length: 11 },
    () => delivery(
      createMessageTemplateSubmissionQueueMessage(7, submissionKey),
    ).value,
  );

  await assert.rejects(
    consumer.handle({
      queue: "connect-message-template-submissions",
      messages,
    }),
    (error) => error instanceof QueueBackpressureError,
  );
  assert.equal(processorCalls, 0);
});
