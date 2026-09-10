import assert from "node:assert/strict";
import test from "node:test";

import {
  QUEUE_ADAPTER_REQUIREMENTS,
  queueAdapterAcceptancePolicyVersion,
  verifyQueueAdapterAcceptanceEvidence,
} from "../shared/domain/queueAdapterAcceptance.ts";

const verifiedAt = "2026-08-21T13:00:00.000Z";
const expiresAt = "2026-08-22T13:00:00.000Z";
const checkedAt = "2026-08-21T14:00:00.000Z";

function verify(input, at = checkedAt) {
  return verifyQueueAdapterAcceptanceEvidence(input, at);
}

function proof(requirement) {
  return {
    queueId: requirement.queueId,
    provider: "approved-provider",
    adapterVersion: "1.0.0",
    deliverySemantics: "at-least-once",
    maximumBatchSize: requirement.maximumBatchSize,
    maximumRetries: requirement.maximumRetries,
    explicitAcknowledgement: true,
    deadLetterQueue: true,
    preservesMessageBody: true,
    delayedRetry: requirement.minimumDelayedRetrySeconds === 0
      ? { supported: false, maximumSeconds: null }
      : {
          supported: true,
          maximumSeconds: requirement.minimumDelayedRetrySeconds,
        },
    duplicateDeliveryTest: "passed",
    poisonMessageDeadLetterTest: "passed",
    outageRecoveryTest: "passed",
    payloadRoundTripTest: "passed",
    acknowledgementIsolationTest: "passed",
  };
}

function evidence(overrides = {}) {
  return {
    schemaVersion: 1,
    policyVersion: queueAdapterAcceptancePolicyVersion,
    environment: "staging",
    commitSha: "a".repeat(40),
    verifiedAt,
    expiresAt,
    artifactDigest: `sha256:${"b".repeat(64)}`,
    queues: QUEUE_ADAPTER_REQUIREMENTS.map(proof),
    ...overrides,
  };
}

test("accepts one complete short-lived staging proof", () => {
  assert.deepEqual(
    verify(evidence()),
    {
      outcome: "accepted",
      queueCount: 4,
      verifiedAt,
      expiresAt,
      artifactDigest: `sha256:${"b".repeat(64)}`,
    },
  );
});

test("keeps all queue requirements deterministic and bounded", () => {
  assert.deepEqual(
    QUEUE_ADAPTER_REQUIREMENTS.map((item) => item.queueId),
    [
      "meta-webhook",
      "campaign-delivery",
      "team-invitation",
      "message-template-submission",
    ],
  );
  assert.equal(
    QUEUE_ADAPTER_REQUIREMENTS.every(
      (item) =>
        item.maximumBatchSize === 10 &&
        item.maximumRetries === 10,
    ),
    true,
  );
});

test("rejects loss-prone delivery and missing dead-letter behavior", () => {
  for (const mutation of [
    { deliverySemantics: "at-most-once" },
    { explicitAcknowledgement: false },
    { deadLetterQueue: false },
    { preservesMessageBody: false },
    { duplicateDeliveryTest: "failed" },
    { poisonMessageDeadLetterTest: "failed" },
    { outageRecoveryTest: "failed" },
    { payloadRoundTripTest: "failed" },
    { acknowledgementIsolationTest: "failed" },
  ]) {
    const queues = QUEUE_ADAPTER_REQUIREMENTS.map(proof);
    queues[0] = { ...queues[0], ...mutation };
    assert.deepEqual(
      verify(evidence({ queues })),
      { outcome: "rejected" },
    );
  }
});

test("rejects unsafe batch, retry and delay mappings", () => {
  for (const mutate of [
    (queues) => { queues[1].maximumBatchSize = 11; },
    (queues) => { queues[1].maximumRetries = 9; },
    (queues) => {
      queues[1].delayedRetry = {
        supported: true,
        maximumSeconds: 86_399,
      };
    },
    (queues) => {
      queues[2].delayedRetry = {
        supported: false,
        maximumSeconds: null,
      };
    },
    (queues) => {
      queues[3].delayedRetry = {
        supported: true,
        maximumSeconds: 604_801,
      };
    },
  ]) {
    const queues = QUEUE_ADAPTER_REQUIREMENTS.map(proof);
    mutate(queues);
    assert.deepEqual(
      verify(evidence({ queues })),
      { outcome: "rejected" },
    );
  }
});

test("rejects reordered, missing, duplicated and extended queue proofs", () => {
  const base = QUEUE_ADAPTER_REQUIREMENTS.map(proof);
  for (const queues of [
    base.slice(0, 3),
    [base[1], base[0], base[2], base[3]],
    [base[0], base[0], base[2], base[3]],
    [{ ...base[0], resourceName: "must-not-leak" }, ...base.slice(1)],
  ]) {
    assert.deepEqual(
      verify(evidence({ queues })),
      { outcome: "rejected" },
    );
  }
});

test("rejects stale, future-reversed and noncanonical evidence windows", () => {
  for (const input of [
    evidence({ expiresAt: "2026-08-22T13:00:00.001Z" }),
    evidence({ expiresAt: verifiedAt }),
    evidence({
      verifiedAt: "2026-08-21T13:00:00Z",
    }),
  ]) {
    assert.deepEqual(
      verify(input),
      { outcome: "rejected" },
    );
  }
});

test("rejects wrong environment, policy, commit and artifact identity", () => {
  for (const input of [
    evidence({ environment: "production" }),
    evidence({ policyVersion: "legacy" }),
    evidence({ commitSha: "a".repeat(39) }),
    evidence({ artifactDigest: `sha256:${"B".repeat(64)}` }),
    evidence({ secret: "blocked" }),
  ]) {
    assert.deepEqual(
      verify(input),
      { outcome: "rejected" },
    );
  }
});

test("does not expose provider or queue resource identity in acceptance", () => {
  const result = verify(evidence());
  assert.doesNotMatch(
    JSON.stringify(result),
    /provider|resource|account|connection|queueId/i,
  );
});

test("requires an explicit current canonical check time", () => {
  for (const at of [
    undefined,
    null,
    "invalid",
    "2026-08-21T14:00:00Z",
  ]) {
    assert.deepEqual(
      verifyQueueAdapterAcceptanceEvidence(evidence(), at),
      { outcome: "rejected" },
    );
  }

  assert.deepEqual(
    verifyQueueAdapterAcceptanceEvidence(evidence()),
    { outcome: "rejected" },
  );
});

test("rejects not-yet-valid and expired evidence at exact boundaries", () => {
  for (const at of [
    "2026-08-21T12:59:59.999Z",
    expiresAt,
    "2026-08-22T13:00:00.001Z",
  ]) {
    assert.deepEqual(verify(evidence(), at), { outcome: "rejected" });
  }

  assert.equal(verify(evidence(), verifiedAt).outcome, "accepted");
  assert.equal(
    verify(evidence(), "2026-08-22T12:59:59.999Z").outcome,
    "accepted",
  );
});
