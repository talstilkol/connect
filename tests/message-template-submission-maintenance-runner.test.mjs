import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageTemplateSubmissionMaintenanceRunner,
  MessageTemplateSubmissionMaintenanceError,
} from "../server/templates/messageTemplateSubmissionMaintenanceRunner.ts";

const now = "2026-08-21T10:00:00.000Z";

function candidate(index, status) {
  const submissionCharacter = String(index + 1);

  return {
    tenantId: index + 1,
    submissionKey: `template_submission_v1_${submissionCharacter.repeat(64)}`,
    status,
  };
}

function fixture(options = {}) {
  const calls = {
    pending: [],
    ambiguous: [],
    published: [],
    reconciled: [],
  };
  const pending = options.pending ?? [];
  const ambiguous = options.ambiguous ?? [];
  const outcomes = options.outcomes ?? [];
  let reconciliationIndex = 0;

  const runner = createMessageTemplateSubmissionMaintenanceRunner({
    candidates: {
      async listPendingBefore(...args) {
        calls.pending.push(args);
        if (options.pendingError) {
          throw options.pendingError;
        }
        return pending;
      },
      async listAmbiguousBefore(...args) {
        calls.ambiguous.push(args);
        if (options.ambiguousError) {
          throw options.ambiguousError;
        }
        return ambiguous;
      },
    },
    publisher: {
      async publish(messages) {
        calls.published.push(messages);
        if (options.publishError) {
          throw options.publishError;
        }
      },
    },
    reconciler: {
      async process(...args) {
        calls.reconciled.push(args);
        const outcome = outcomes[reconciliationIndex];
        reconciliationIndex += 1;
        if (outcome instanceof Error) {
          throw outcome;
        }
        return { outcome };
      },
    },
    clock: () => options.clockValue ?? now,
    batchSize: options.batchSize,
    pendingMinimumAgeSeconds: options.pendingMinimumAgeSeconds,
    ambiguousMinimumAgeSeconds: options.ambiguousMinimumAgeSeconds,
  });

  return { calls, runner };
}

test("publishes bounded pending identities and reconciles ambiguous identities sequentially", async () => {
  const testFixture = fixture({
    pending: [candidate(0, "pending"), candidate(1, "pending")],
    ambiguous: [
      candidate(2, "ambiguous"),
      candidate(3, "ambiguous"),
      candidate(4, "ambiguous"),
      candidate(5, "ambiguous"),
      candidate(6, "ambiguous"),
      candidate(7, "ambiguous"),
    ],
    outcomes: [
      "resolved-submitted",
      "resolved-rejected",
      "deferred",
      "duplicate",
      "not-found",
      new Error("storage unavailable"),
    ],
  });

  assert.deepEqual(await testFixture.runner.run(), {
    pendingCandidates: 2,
    published: 2,
    ambiguousCandidates: 6,
    resolvedSubmitted: 1,
    resolvedRejected: 1,
    deferred: 1,
    duplicates: 1,
    missing: 1,
    failed: 1,
  });
  assert.deepEqual(testFixture.calls.pending, [[
    "2026-08-21T09:59:55.000Z",
    10,
  ]]);
  assert.deepEqual(testFixture.calls.ambiguous, [[
    "2026-08-21T09:59:00.000Z",
    10,
  ]]);
  assert.deepEqual(testFixture.calls.published[0], [
    {
      version: 1,
      tenantId: 1,
      submissionKey: `template_submission_v1_${"1".repeat(64)}`,
    },
    {
      version: 1,
      tenantId: 2,
      submissionKey: `template_submission_v1_${"2".repeat(64)}`,
    },
  ]);
  assert.deepEqual(testFixture.calls.reconciled[0], [
    3,
    `template_submission_v1_${"3".repeat(64)}`,
  ]);
});

test("does not call the publisher when no pending identities are due", async () => {
  const testFixture = fixture();

  assert.deepEqual(await testFixture.runner.run(), {
    pendingCandidates: 0,
    published: 0,
    ambiguousCandidates: 0,
    resolvedSubmitted: 0,
    resolvedRejected: 0,
    deferred: 0,
    duplicates: 0,
    missing: 0,
    failed: 0,
  });
  assert.equal(testFixture.calls.published.length, 0);
});

test("fails closed with a sanitized error when scans or publishing fail", async () => {
  const cases = [
    { pendingError: new Error("private database detail") },
    {
      pending: [candidate(0, "pending")],
      publishError: new Error("private queue detail"),
    },
    { ambiguousError: new Error("private database detail") },
    { clockValue: "invalid" },
    {
      pending: [{
        tenantId: 1,
        submissionKey: "invalid",
        status: "pending",
      }],
    },
  ];

  for (const options of cases) {
    await assert.rejects(
      fixture(options).runner.run(),
      (error) =>
        error instanceof MessageTemplateSubmissionMaintenanceError &&
        error.message ===
          "Message template submission maintenance could not complete",
    );
  }
});

test("rejects unsafe scheduler configuration at construction", () => {
  for (const options of [
    { batchSize: 0 },
    { batchSize: 11 },
    { pendingMinimumAgeSeconds: -1 },
    { ambiguousMinimumAgeSeconds: 86_401 },
  ]) {
    assert.throws(
      () => fixture(options),
      (error) => error instanceof MessageTemplateSubmissionMaintenanceError,
    );
  }

  assert.throws(
    () => createMessageTemplateSubmissionMaintenanceRunner({
      candidates: {
        async listPendingBefore() {
          return [];
        },
        async listAmbiguousBefore() {
          return [];
        },
      },
      publisher: {
        async publish() {},
      },
      reconciler: {
        async process() {
          return { outcome: "deferred" };
        },
      },
      unsupported: true,
    }),
    (error) => error instanceof MessageTemplateSubmissionMaintenanceError,
  );
});
