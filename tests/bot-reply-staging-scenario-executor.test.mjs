import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyStagingScenarioExecutor,
  BotReplyStagingScenarioExecutorError,
} from "../server/operations/botReplyStagingScenarioExecutor.ts";
import {
  botReplyStagingScenarioRequirements,
} from "../server/operations/botReplyStagingEvidence.ts";
import {
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "../server/operations/botReplyStagingDurableRunner.ts";

const observedAt = "2026-08-21T13:30:00.000Z";
const leaseExpiresAt = "2026-08-21T14:00:00.000Z";

function proof(label) {
  return `${label}:verified-live-staging-observation`;
}

function runInput(overrides = {}) {
  return {
    runKey: `bot_reply_staging_run_v1_${"a".repeat(64)}`,
    targetTenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    releaseId: `connect_release_v1_${"b".repeat(64)}`,
    commitSha: "c".repeat(40),
    artifactDigest: `sha256:${"d".repeat(64)}`,
    graphApiVersion: "v24.0",
    requestedAt: "2026-08-21T13:00:00.000Z",
    recipientFingerprint: `sha256:${"e".repeat(64)}`,
    rateLimitMethodFingerprint: `sha256:${"f".repeat(64)}`,
    actorExternalUserId: "system-admin-primary",
    ...overrides,
  };
}

function claim(run = runInput(), overrides = {}) {
  const requestDigest = deriveBotReplyStagingDurableRequestDigest(run);
  return {
    runKey: run.runKey,
    auditKey: deriveBotReplyStagingDurableAuditKey(
      run.runKey,
      requestDigest,
    ),
    claimVersion: 1,
    leaseExpiresAt,
    ...overrides,
  };
}

function safetySnapshot(overrides = {}) {
  return {
    environment: "staging",
    connectionMode: "approved-staging-waba",
    connectionStatus: "connected",
    connectionVersion: 3,
    policyVersion: 4,
    deliveryState: "enabled",
    policyEvidenceExpiresAt: "2026-08-21T15:00:00.000Z",
    graphApiVersion: "v24.0",
    credentialSource: "encrypted-vault",
    executionBoundary: "railway-bullmq-bot-reply-worker",
    evidenceSource: "durable-postgres",
    recipientAuthorization: {
      status: "approved",
      optInRecorded: true,
      expiresAt: "2026-08-21T15:00:00.000Z",
      recipientFingerprint: `sha256:${"e".repeat(64)}`,
    },
    rateLimitTestApproval: {
      status: "approved",
      approvedBy: "tal",
      approvedAt: "2026-08-21T12:00:00.000Z",
      expiresAt: "2026-08-21T15:00:00.000Z",
      methodFingerprint: `sha256:${"f".repeat(64)}`,
    },
    ...overrides,
  };
}

function driver(calls, overrides = {}) {
  return {
    async inspectAssets(context) {
      calls.push("assets");
      return {
        operationKey: context.operationKey,
        graphApiVersion: context.run.graphApiVersion,
        assetProofs: {
          app: proof("app"),
          waba: proof("waba"),
          phoneNumber: proof("phone-number"),
        },
      };
    },
    async executeScenario(context) {
      calls.push(`scenario:${context.scenario}`);
      return {
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        scenario: context.scenario,
        status: "passed",
        providerErrorCode: context.expectedProviderErrorCode,
        observedAt,
        evidenceProof: proof(`scenario:${context.scenario}`),
        executionBoundary: "railway-bot-reply-worker",
      };
    },
    async inspectThroughput(context) {
      calls.push("control:throughput");
      return {
        operationKey: context.operationKey,
        messagesPerSecond: 80,
        source: "graph-api",
        observedAt,
        evidenceProof: proof("throughput"),
      };
    },
    async verifyProviderRetry(context) {
      calls.push("control:provider-retry");
      return {
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        status: "passed",
        providerErrorCode: 130429,
        retryAfterSeconds: 12,
        cooldownScope: "sender",
        observedAt,
        evidenceProof: proof("provider-retry"),
        executionBoundary: "railway-bot-reply-worker",
      };
    },
    async verifyPairLimit(context) {
      calls.push("control:pair-limit");
      return {
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        status: "passed",
        providerErrorCode: 131056,
        cooldownScope: "pair",
        backoffPolicy: "meta-4-power-x",
        observedAt,
        evidenceProof: proof("pair-limit"),
        executionBoundary: "railway-bot-reply-worker",
      };
    },
    async verifyDuplicateSafety(context) {
      calls.push("control:duplicate-safety");
      return {
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        status: "passed",
        queueDeliveryCount: 2,
        providerRequestCount: 1,
        observedAt,
        evidenceProof: proof("duplicate-safety"),
        executionBoundary: "railway-bot-reply-worker",
      };
    },
    async verifyCredentialBoundary(context) {
      calls.push("control:credential-boundary");
      return {
        operationKey: context.operationKey,
        source: "encrypted-vault",
        plaintextExposureFindings: 0,
        observedAt,
        evidenceProof: proof("credential-boundary"),
      };
    },
    async verifyRedaction(context) {
      calls.push("control:redaction");
      return {
        operationKey: context.operationKey,
        testedFieldCount: 16,
        findings: 0,
        observedAt,
        evidenceProof: proof("redaction"),
      };
    },
    async verifyKillSwitch(context) {
      calls.push("control:kill-switch");
      return {
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        status: "passed",
        providerRequestCount: 0,
        observedAt,
        evidenceProof: proof("kill-switch"),
        executionBoundary: "railway-bot-reply-worker",
      };
    },
    ...overrides,
  };
}

function fixture({
  snapshots = null,
  driverOverrides = {},
  clockValue = observedAt,
} = {}) {
  const calls = [];
  let safetyReads = 0;
  const executor = createBotReplyStagingScenarioExecutor({
    clock: {
      now() {
        return new Date(clockValue);
      },
    },
    safety: {
      async read() {
        const value = snapshots === null
          ? safetySnapshot()
          : snapshots[Math.min(safetyReads, snapshots.length - 1)];
        safetyReads += 1;
        return value;
      },
    },
    driver: driver(calls, driverOverrides),
  });
  return {
    executor,
    calls,
    safetyReads: () => safetyReads,
  };
}

function expectsError(code) {
  return (error) =>
    error instanceof BotReplyStagingScenarioExecutorError &&
    error.code === code && error.message === code;
}

test("executes the exact scenario order and builds a closed receipt", async () => {
  const run = runInput();
  const { executor, calls, safetyReads } = fixture();
  const receipt = await executor.execute(run, claim(run));

  assert.deepEqual(calls, [
    "assets",
    ...botReplyStagingScenarioRequirements.map(
      ({ scenario }) => `scenario:${scenario}`,
    ),
    "control:throughput",
    "control:provider-retry",
    "control:pair-limit",
    "control:duplicate-safety",
    "control:credential-boundary",
    "control:redaction",
    "control:kill-switch",
  ]);
  assert.equal(safetyReads(), 15);
  assert.equal(receipt.scenarios.length, 7);
  assert.equal(receipt.verifiedAt, observedAt);
  assert.equal(receipt.killSwitch.providerRequestCount, 0);
  assert.equal(receipt.duplicateSafety.providerRequestCount, 1);
  assert.ok(Object.isFrozen(receipt));
});

test("derives stable operation keys across a changed claim version", async () => {
  const firstKeys = [];
  const secondKeys = [];
  const first = fixture({
    driverOverrides: {
      async inspectAssets(context) {
        firstKeys.push({
          operationKey: context.operationKey,
          deliveryKey: context.deliveryKey,
        });
        return driver([]).inspectAssets(context);
      },
    },
  });
  const second = fixture({
    driverOverrides: {
      async inspectAssets(context) {
        secondKeys.push({
          operationKey: context.operationKey,
          deliveryKey: context.deliveryKey,
        });
        return driver([]).inspectAssets(context);
      },
    },
  });
  const run = runInput();
  await first.executor.execute(run, claim(run));
  await second.executor.execute(run, claim(run, { claimVersion: 2 }));
  assert.deepEqual(firstKeys, secondKeys);
  assert.match(
    firstKeys[0].operationKey,
    /^bot_reply_staging_step_v1_[a-f0-9]{64}$/,
  );
  assert.match(
    firstKeys[0].deliveryKey,
    /^bot_reply_delivery_v1_[a-f0-9]{64}$/,
  );
});

test("rechecks durable authorization before every step and stops on revocation", async () => {
  const { executor, calls, safetyReads } = fixture({
    snapshots: [
      safetySnapshot(),
      safetySnapshot(),
      null,
    ],
  });
  const run = runInput();
  await assert.rejects(
    () => executor.execute(run, claim(run)),
    expectsError("BOT_REPLY_STAGING_SCENARIO_SAFETY_BLOCKED"),
  );
  assert.deepEqual(calls, ["assets", "scenario:text-send"]);
  assert.equal(safetyReads(), 3);
});

test("rejects an expired lease before reading safety or invoking the driver", async () => {
  const { executor, calls, safetyReads } = fixture({
    clockValue: leaseExpiresAt,
  });
  const run = runInput();
  await assert.rejects(
    () => executor.execute(run, claim(run)),
    expectsError("BOT_REPLY_STAGING_SCENARIO_LEASE_EXPIRED"),
  );
  assert.deepEqual(calls, []);
  assert.equal(safetyReads(), 0);
});

test("requires every authorization to cover the complete durable lease", async () => {
  const { executor, calls, safetyReads } = fixture({
    snapshots: [safetySnapshot({
      policyEvidenceExpiresAt: "2026-08-21T13:45:00.000Z",
    })],
  });
  const run = runInput();
  await assert.rejects(
    () => executor.execute(run, claim(run)),
    expectsError("BOT_REPLY_STAGING_SCENARIO_SAFETY_BLOCKED"),
  );
  assert.deepEqual(calls, []);
  assert.equal(safetyReads(), 1);
});

test("rejects an observation that is not bound to its operation key", async () => {
  const { executor } = fixture({
    driverOverrides: {
      async executeScenario(context) {
        return {
          operationKey: `bot_reply_staging_step_v1_${"9".repeat(64)}`,
          deliveryKey: context.deliveryKey,
          scenario: context.scenario,
          status: "passed",
          providerErrorCode: context.expectedProviderErrorCode,
          observedAt,
          evidenceProof: proof(`scenario:${context.scenario}`),
          executionBoundary: "railway-bot-reply-worker",
        };
      },
    },
  });
  const run = runInput();
  await assert.rejects(
    () => executor.execute(run, claim(run)),
    expectsError("BOT_REPLY_STAGING_SCENARIO_OBSERVATION_INVALID"),
  );

  const wrongDelivery = fixture({
    driverOverrides: {
      async executeScenario(context) {
        return {
          operationKey: context.operationKey,
          deliveryKey: `bot_reply_delivery_v1_${"9".repeat(64)}`,
          scenario: context.scenario,
          status: "passed",
          providerErrorCode: context.expectedProviderErrorCode,
          observedAt,
          evidenceProof: proof(`scenario:${context.scenario}`),
          executionBoundary: "railway-bot-reply-worker",
        };
      },
    },
  });
  await assert.rejects(
    () => wrongDelivery.executor.execute(run, claim(run)),
    expectsError("BOT_REPLY_STAGING_SCENARIO_OBSERVATION_INVALID"),
  );
});

test("rejects duplicate proofs while assembling the final receipt", async () => {
  const { executor } = fixture({
    driverOverrides: {
      async inspectAssets(context) {
        return {
          operationKey: context.operationKey,
          graphApiVersion: context.run.graphApiVersion,
          assetProofs: {
            app: proof("same-asset"),
            waba: proof("same-asset"),
            phoneNumber: proof("phone-number"),
          },
        };
      },
    },
  });
  const run = runInput();
  await assert.rejects(
    () => executor.execute(run, claim(run)),
    expectsError("BOT_REPLY_STAGING_SCENARIO_RECEIPT_INVALID"),
  );
});

test("sanitizes driver failures and rejects invalid dependencies", async () => {
  const { executor } = fixture({
    driverOverrides: {
      async inspectAssets() {
        throw new Error("provider-private-response");
      },
    },
  });
  const run = runInput();
  await assert.rejects(
    () => executor.execute(run, claim(run)),
    expectsError("BOT_REPLY_STAGING_SCENARIO_DRIVER_FAILED"),
  );
  assert.throws(
    () => createBotReplyStagingScenarioExecutor({}),
    /dependencies are invalid/,
  );
});
