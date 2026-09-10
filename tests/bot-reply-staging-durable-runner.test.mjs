import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyStagingDurableRunner,
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
  BotReplyStagingDurableRunnerError,
} from "../server/operations/botReplyStagingDurableRunner.ts";
import {
  deriveBotReplyStagingReceiptDigest,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";

const runKey = `bot_reply_staging_run_v1_${"a".repeat(64)}`;
const now = new Date("2026-08-21T13:30:00.000Z");

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

function runInput(overrides = {}) {
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
    ...overrides,
  };
}

function fixture({
  claimOutcome = "claimed",
  completionOutcome = "completed",
  claimOverride = {},
  completionOverride = {},
  executorError = null,
  executorReceipt = validReceipt(),
} = {}) {
  const calls = { claims: [], executions: [], completions: [] };
  let clockOrdinal = 0;
  const driver = createBotReplyStagingDurableRunner({
    leaseDurationSeconds: 1_800,
    clock: {
      now() {
        const result = new Date(now.getTime() + clockOrdinal * 60_000);
        clockOrdinal += 1;
        return result;
      },
    },
    runs: {
      async claim(input) {
        calls.claims.push(input);
        if (claimOutcome === "in-progress" || claimOutcome === "conflict") {
          return { outcome: claimOutcome, runKey: input.run.runKey };
        }
        if (claimOutcome === "replayed") {
          return {
            outcome: "replayed",
            runKey: input.run.runKey,
            auditKey: input.auditKey,
            completedAt: "2026-08-21T13:31:00.000Z",
            receipt: validReceipt(),
            ...claimOverride,
          };
        }
        return {
          outcome: "claimed",
          runKey: input.run.runKey,
          auditKey: input.auditKey,
          claimVersion: 1,
          leaseExpiresAt: input.leaseExpiresAt,
          ...claimOverride,
        };
      },
      async complete(input) {
        calls.completions.push(input);
        if (
          completionOutcome === "conflict" ||
          completionOutcome === "lease-expired"
        ) {
          return { outcome: completionOutcome, runKey: input.runKey };
        }
        return {
          outcome: completionOutcome,
          runKey: input.runKey,
          auditKey: calls.claims[0].auditKey,
          completedAt: input.completedAt,
          receipt: input.receipt,
          ...completionOverride,
        };
      },
    },
    executor: {
      async execute(input, claim) {
        calls.executions.push({ input, claim });
        if (executorError) throw executorError;
        return executorReceipt;
      },
    },
  });
  return { driver, calls };
}

function expectsError(code) {
  return (error) =>
    error instanceof BotReplyStagingDurableRunnerError &&
    error.code === code && error.message === code;
}

test("claims, executes and completes one fenced durable run", async () => {
  const { driver, calls } = fixture();
  const input = runInput();
  const result = await driver.run(input);

  assert.equal(result.outcome, "completed");
  assert.equal(result.runKey, runKey);
  assert.match(
    result.auditKey,
    /^bot_reply_staging_audit_v1_[a-f0-9]{64}$/,
  );
  assert.equal(result.completedAt, "2026-08-21T13:31:00.000Z");
  assert.equal(
    result.receipt.runnerVersion,
    "connect-bot-reply-staging-runner-v1",
  );
  assert.equal(calls.claims.length, 1);
  assert.equal(calls.executions.length, 1);
  assert.equal(calls.completions.length, 1);
  assert.equal(calls.claims[0].claimedAt, now.toISOString());
  assert.equal(
    calls.claims[0].leaseExpiresAt,
    "2026-08-21T14:00:00.000Z",
  );
  assert.equal(calls.completions[0].expectedClaimVersion, 1);
  assert.equal(
    calls.completions[0].receiptDigest,
    deriveBotReplyStagingReceiptDigest(calls.completions[0].receipt),
  );
  assert.ok(Object.isFrozen(result));
});

test("replays persisted completion without executing a scenario", async () => {
  const { driver, calls } = fixture({ claimOutcome: "replayed" });
  const result = await driver.run(runInput());

  assert.equal(result.outcome, "replayed");
  assert.equal(
    result.receipt.runnerVersion,
    "connect-bot-reply-staging-runner-v1",
  );
  assert.equal(calls.executions.length, 0);
  assert.equal(calls.completions.length, 0);
});

test("returns an active lease without executing or completing", async () => {
  const { driver, calls } = fixture({ claimOutcome: "in-progress" });
  assert.deepEqual(await driver.run(runInput()), {
    outcome: "in-progress",
    runKey,
  });
  assert.equal(calls.executions.length, 0);
  assert.equal(calls.completions.length, 0);
});

test("binds audit to the actor but ignores renewed confirmation time", () => {
  const first = runInput();
  const renewed = runInput({
    requestedAt: "2026-08-21T13:29:00.000Z",
  });
  const otherActor = runInput({ actorExternalUserId: "system-admin-backup" });

  const firstDigest = deriveBotReplyStagingDurableRequestDigest(first);
  assert.equal(
    firstDigest,
    deriveBotReplyStagingDurableRequestDigest(renewed),
  );
  assert.notEqual(
    firstDigest,
    deriveBotReplyStagingDurableRequestDigest(otherActor),
  );
  assert.equal(
    deriveBotReplyStagingDurableAuditKey(runKey, firstDigest),
    deriveBotReplyStagingDurableAuditKey(runKey, firstDigest),
  );
});

test("fails closed for a conflicting identity or active fence", async () => {
  await assert.rejects(
    () => fixture({ claimOutcome: "conflict" }).driver.run(runInput()),
    expectsError("BOT_REPLY_STAGING_DURABLE_REQUEST_CONFLICT"),
  );
  await assert.rejects(
    () => fixture({ completionOutcome: "conflict" }).driver.run(runInput()),
    expectsError("BOT_REPLY_STAGING_DURABLE_COMPLETION_CONFLICT"),
  );
  await assert.rejects(
    () => fixture({
      completionOutcome: "lease-expired",
    }).driver.run(runInput()),
    expectsError("BOT_REPLY_STAGING_DURABLE_LEASE_EXPIRED"),
  );
});

test("never completes a run whose scenario execution failed", async () => {
  const { driver, calls } = fixture({ executorError: new Error("failed") });
  await assert.rejects(
    () => driver.run(runInput()),
    expectsError("BOT_REPLY_STAGING_DURABLE_EXECUTION_FAILED"),
  );
  assert.equal(calls.completions.length, 0);
});

test("rejects an extended executor receipt before durable persistence", async () => {
  const { driver, calls } = fixture({
    executorReceipt: validReceipt({
      accessToken: "must-never-cross-the-receipt-boundary",
    }),
  });

  await assert.rejects(
    () => driver.run(runInput()),
    expectsError("BOT_REPLY_STAGING_DURABLE_RECEIPT_INVALID"),
  );
  assert.equal(calls.executions.length, 1);
  assert.equal(calls.completions.length, 0);
});

test("rejects an invalid persisted replay before returning evidence", async () => {
  const { driver, calls } = fixture({
    claimOutcome: "replayed",
    claimOverride: {
      receipt: validReceipt({ redaction: { testedFieldCount: 12 } }),
    },
  });

  await assert.rejects(
    () => driver.run(runInput()),
    expectsError("BOT_REPLY_STAGING_DURABLE_RECEIPT_INVALID"),
  );
  assert.equal(calls.executions.length, 0);
  assert.equal(calls.completions.length, 0);
});

test("rejects malformed repository results and dependency wiring", async () => {
  await assert.rejects(
    () => fixture({ claimOverride: { claimVersion: 0 } }).driver.run(
      runInput(),
    ),
    expectsError("BOT_REPLY_STAGING_DURABLE_CLAIM_INVALID"),
  );
  await assert.rejects(
    () => fixture({
      completionOverride: { auditKey: "wrong" },
    }).driver.run(runInput()),
    expectsError("BOT_REPLY_STAGING_DURABLE_COMPLETION_INVALID"),
  );
  assert.throws(
    () => createBotReplyStagingDurableRunner({
      leaseDurationSeconds: 10,
      clock: { now: () => now },
      runs: { claim: async () => ({}), complete: async () => ({}) },
      executor: { execute: async () => ({}) },
    }),
    /dependencies are invalid/,
  );
});
