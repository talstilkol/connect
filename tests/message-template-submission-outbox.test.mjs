import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveMessageTemplateSubmissionEventKey,
  MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
  MESSAGE_TEMPLATE_SUBMISSION_WORKER_ACTOR,
  parseMessageTemplateSubmissionOutbox,
} from "../server/templates/messageTemplateSubmissionOutbox.ts";

const submissionKey = `template_submission_v1_${"a".repeat(64)}`;
const templateKey = `template_v1_${"b".repeat(64)}`;
const idempotencyKey = `connect_idempotency_v1_${"c".repeat(64)}`;

function pending(overrides = {}) {
  return {
    submissionKey,
    tenantId: 7,
    templateKey,
    templateVersion: 3,
    metaConnectionVersion: 2,
    wabaId: "200002",
    graphApiVersion: "v21.0",
    requestOperation: MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
    requestIdempotencyKey: idempotencyKey,
    status: "pending",
    stateVersion: 1,
    attemptCount: 0,
    lastErrorCode: null,
    metaTemplateId: null,
    claimedAt: null,
    settledAt: null,
    createdAt: "2026-08-21T10:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
    ...overrides,
  };
}

test("accepts every valid outbox lifecycle shape", () => {
  const claimedAt = "2026-08-21T10:01:00.000Z";
  const settledAt = "2026-08-21T10:02:00.000Z";
  const records = [
    pending(),
    pending({
      status: "submitting",
      stateVersion: 2,
      attemptCount: 1,
      claimedAt,
      updatedAt: claimedAt,
    }),
    pending({
      status: "submitted",
      stateVersion: 3,
      attemptCount: 1,
      metaTemplateId: "400004",
      claimedAt,
      settledAt,
      updatedAt: settledAt,
    }),
    pending({
      status: "rejected",
      stateVersion: 3,
      attemptCount: 1,
      lastErrorCode: "META_TEMPLATE_REJECTED",
      claimedAt,
      settledAt,
      updatedAt: settledAt,
    }),
    pending({
      status: "ambiguous",
      stateVersion: 3,
      attemptCount: 1,
      lastErrorCode: "PROVIDER_OUTCOME_UNKNOWN",
      claimedAt,
      updatedAt: settledAt,
    }),
    pending({
      status: "blocked",
      stateVersion: 2,
      lastErrorCode: "META_CONNECTION_CHANGED",
      settledAt,
      updatedAt: settledAt,
    }),
  ];

  for (const record of records) {
    assert.deepEqual(parseMessageTemplateSubmissionOutbox(record), record);
  }
});

test("rejects extended, cross-shape, and non-canonical outbox records", () => {
  for (const record of [
    pending({ tenantId: 0 }),
    pending({ graphApiVersion: "latest" }),
    pending({ status: "submitting", stateVersion: 2, attemptCount: 0 }),
    pending({ status: "ambiguous", stateVersion: 3, attemptCount: 1 }),
    pending({ updatedAt: "2026-08-21T09:59:59.999Z" }),
    pending({ accessToken: "forbidden" }),
  ]) {
    assert.equal(parseMessageTemplateSubmissionOutbox(record), null);
  }
});

test("derives a deterministic event identity from the complete transition evidence", async () => {
  const event = {
    submissionKey,
    tenantId: 7,
    templateKey,
    eventType: "claimed",
    fromStatus: "pending",
    toStatus: "submitting",
    fromVersion: 1,
    toVersion: 2,
    actorKind: "system",
    actorExternalUserId: MESSAGE_TEMPLATE_SUBMISSION_WORKER_ACTOR,
    causationKey: submissionKey,
    errorCode: null,
    metaTemplateId: null,
    occurredAt: "2026-08-21T10:01:00.000Z",
  };
  const first = await deriveMessageTemplateSubmissionEventKey(event);
  const second = await deriveMessageTemplateSubmissionEventKey({ ...event });

  assert.equal(first, second);
  assert.match(first, /^template_submission_event_v1_[0-9a-f]{64}$/);
  await assert.rejects(
    deriveMessageTemplateSubmissionEventKey({
      ...event,
      actorKind: "user",
    }),
    /event is invalid/,
  );
  await assert.rejects(
    deriveMessageTemplateSubmissionEventKey({
      ...event,
      toStatus: "submitted",
    }),
    /event is invalid/,
  );
});
