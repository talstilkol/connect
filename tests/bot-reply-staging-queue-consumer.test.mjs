import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyStagingQueueConsumer,
  BotReplyStagingQueueConsumerError,
} from "../server/operations/botReplyStagingQueueConsumer.ts";
import {
  createBotReplyStagingQueueMessage,
} from "../server/operations/botReplyStagingQueueMessage.ts";
import {
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "../server/operations/botReplyStagingDurableRunner.ts";
import {
  deriveBotReplyStagingReceiptDigest,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";

const runKey = `bot_reply_staging_run_v1_${"a".repeat(64)}`;

function runInput() {
  return {
    runKey,
    targetTenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    releaseId: `connect_release_v1_${"b".repeat(64)}`,
    commitSha: "c".repeat(40),
    artifactDigest: `sha256:${"d".repeat(64)}`,
    graphApiVersion: "v24.0",
    requestedAt: "2026-08-21T13:25:00.000Z",
    recipientFingerprint: `sha256:${"e".repeat(64)}`,
    rateLimitMethodFingerprint: `sha256:${"f".repeat(64)}`,
    actorExternalUserId: "system-admin-primary",
  };
}

function queueMessage(leaseExpiresAt = "2026-08-21T14:00:00.000Z") {
  const run = runInput();
  const requestDigest = deriveBotReplyStagingDurableRequestDigest(run);
  return createBotReplyStagingQueueMessage(run, {
    runKey,
    auditKey: deriveBotReplyStagingDurableAuditKey(runKey, requestDigest),
    claimVersion: 1,
    leaseExpiresAt,
  });
}

function validReceipt(overrides = {}) {
  const observedAt = "2026-08-21T13:30:00.000Z";
  const proof = (name) => `verified-${name}-proof-value`;
  return {
    schemaVersion: 1,
    runnerVersion: "connect-bot-reply-staging-runner-v1",
    environment: "staging",
    provider: "meta-whatsapp-cloud-api",
    connectionMode: "approved-staging-waba",
    graphApiVersion: "v24.0",
    verifiedAt: observedAt,
    releaseId: `connect_release_v1_${"b".repeat(64)}`,
    commitSha: "c".repeat(40),
    artifactDigest: `sha256:${"d".repeat(64)}`,
    assetProofs: {
      app: proof("app"),
      waba: proof("waba"),
      phoneNumber: proof("phone"),
    },
    scenarios: [
      ["text-send", null],
      ["button-send", null],
      ["button-reply", null],
      ["status-sent", null],
      ["status-delivered", null],
      ["status-read", null],
      ["customer-window-expired", 131047],
    ].map(([scenario, providerErrorCode], index) => ({
      scenario,
      status: "passed",
      providerErrorCode,
      observedAt,
      evidenceProof: proof(`scenario-${index}`),
    })),
    rateLimits: {
      throughput: {
        messagesPerSecond: 80,
        source: "graph-api",
        observedAt,
        evidenceProof: proof("throughput"),
      },
      providerRetry: {
        status: "passed",
        providerErrorCode: 130429,
        retryAfterSeconds: 30,
        cooldownScope: "sender",
        observedAt,
        evidenceProof: proof("provider-retry"),
      },
      pairLimit: {
        status: "passed",
        providerErrorCode: 131056,
        cooldownScope: "pair",
        backoffPolicy: "meta-4-power-x",
        observedAt,
        evidenceProof: proof("pair-limit"),
      },
    },
    killSwitch: {
      status: "passed",
      providerRequestCount: 0,
      observedAt,
      evidenceProof: proof("kill-switch"),
    },
    duplicateSafety: {
      status: "passed",
      queueDeliveryCount: 2,
      providerRequestCount: 1,
      observedAt,
      evidenceProof: proof("duplicate"),
    },
    credentialBoundary: {
      source: "encrypted-vault",
      plaintextExposureFindings: 0,
      observedAt,
      evidenceProof: proof("credential"),
    },
    redaction: {
      testedFieldCount: 12,
      findings: 0,
      observedAt,
      evidenceProof: proof("redaction"),
    },
    ...overrides,
  };
}

function fixture({
  executorReceipt = validReceipt(),
  executorError = null,
  completionOutcome = "completed",
  completionError = null,
  clockValues = [
    "2026-08-21T13:30:00.000Z",
    "2026-08-21T13:31:00.000Z",
  ],
} = {}) {
  const calls = { executions: [], completions: [] };
  let clockIndex = 0;
  const consumer = createBotReplyStagingQueueConsumer({
    clock: {
      now() {
        const value = clockValues[Math.min(clockIndex, clockValues.length - 1)];
        clockIndex += 1;
        return new Date(value);
      },
    },
    executor: {
      async execute(run, claim) {
        calls.executions.push({ run, claim });
        if (executorError) throw executorError;
        return executorReceipt;
      },
    },
    runs: {
      async claim() {
        throw new Error("claim must remain owned by the API runner");
      },
      async complete(input) {
        calls.completions.push(input);
        if (completionError) throw completionError;
        if (
          completionOutcome === "conflict" ||
          completionOutcome === "lease-expired"
        ) {
          return { outcome: completionOutcome, runKey: input.runKey };
        }
        return {
          outcome: completionOutcome,
          runKey: input.runKey,
          auditKey: queueMessage().auditKey,
          completedAt: input.completedAt,
          receipt: input.receipt,
        };
      },
    },
  });
  return { consumer, calls };
}

function expectsError(code) {
  return (error) =>
    error instanceof BotReplyStagingQueueConsumerError &&
    error.code === code && error.message === code;
}

test("executes once and persists one closed receipt behind the fence", async () => {
  const { consumer, calls } = fixture();
  const result = await consumer.handle(queueMessage());

  assert.deepEqual(result, {
    outcome: "completed",
    runKey,
    auditKey: queueMessage().auditKey,
    completedAt: "2026-08-21T13:31:00.000Z",
  });
  assert.equal(calls.executions.length, 1);
  assert.equal(calls.completions.length, 1);
  assert.equal(calls.completions[0].expectedClaimVersion, 1);
  assert.equal(calls.completions[0].requestDigest, queueMessage().requestDigest);
  assert.equal(
    calls.completions[0].receiptDigest,
    deriveBotReplyStagingReceiptDigest(calls.completions[0].receipt),
  );
  assert.equal("receipt" in result, false);
});

test("accepts an identical durable replay without returning the receipt", async () => {
  const { consumer, calls } = fixture({ completionOutcome: "replayed" });
  const result = await consumer.handle(queueMessage());

  assert.equal(result.outcome, "replayed");
  assert.equal(calls.executions.length, 1);
  assert.equal(calls.completions.length, 1);
  assert.equal("receipt" in result, false);
});

test("rejects invalid or expired work before scenario execution", async () => {
  const invalid = fixture();
  await assert.rejects(
    () => invalid.consumer.handle({ ...queueMessage(), token: "blocked" }),
    expectsError("BOT_REPLY_STAGING_QUEUE_MESSAGE_INVALID"),
  );
  assert.equal(invalid.calls.executions.length, 0);

  const expired = fixture({
    clockValues: ["2026-08-21T14:00:00.000Z"],
  });
  await assert.rejects(
    () => expired.consumer.handle(queueMessage()),
    expectsError("BOT_REPLY_STAGING_QUEUE_LEASE_EXPIRED"),
  );
  assert.equal(expired.calls.executions.length, 0);
});

test("never completes failed execution or an invalid receipt", async () => {
  const failed = fixture({ executorError: new Error("private failure") });
  await assert.rejects(
    () => failed.consumer.handle(queueMessage()),
    expectsError("BOT_REPLY_STAGING_QUEUE_EXECUTION_FAILED"),
  );
  assert.equal(failed.calls.completions.length, 0);

  const invalid = fixture({
    executorReceipt: validReceipt({ accessToken: "blocked" }),
  });
  await assert.rejects(
    () => invalid.consumer.handle(queueMessage()),
    expectsError("BOT_REPLY_STAGING_QUEUE_RECEIPT_INVALID"),
  );
  assert.equal(invalid.calls.completions.length, 0);
});

test("maps fence, lease and repository failures to bounded errors", async () => {
  await assert.rejects(
    () => fixture({ completionOutcome: "conflict" }).consumer.handle(
      queueMessage(),
    ),
    expectsError("BOT_REPLY_STAGING_QUEUE_COMPLETION_CONFLICT"),
  );
  await assert.rejects(
    () => fixture({ completionOutcome: "lease-expired" }).consumer.handle(
      queueMessage(),
    ),
    expectsError("BOT_REPLY_STAGING_QUEUE_LEASE_EXPIRED"),
  );
  await assert.rejects(
    () => fixture({ completionError: new Error("private") }).consumer.handle(
      queueMessage(),
    ),
    expectsError("BOT_REPLY_STAGING_QUEUE_COMPLETION_UNAVAILABLE"),
  );
});

test("rejects incomplete dependency wiring", () => {
  assert.throws(
    () => createBotReplyStagingQueueConsumer({}),
    /dependencies are invalid/,
  );
});
