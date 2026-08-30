import assert from "node:assert/strict";
import test from "node:test";

import {
  botReplyStagingLiveDriverConfirmation,
  botReplyStagingLiveDriverVersion,
  BotReplyStagingLiveDriverError,
  createBotReplyStagingLiveDriver,
} from "../server/operations/botReplyStagingLiveDriver.ts";
import {
  botReplyStagingRunnerVersion,
} from "../server/operations/botReplyStagingEvidenceBuilder.ts";
import {
  botReplyStagingScenarioRequirements,
} from "../server/operations/botReplyStagingEvidence.ts";

const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const recipientFingerprint = `sha256:${"d".repeat(64)}`;
const methodFingerprint = `sha256:${"e".repeat(64)}`;
const auditKey = `bot_reply_staging_audit_v1_${"f".repeat(64)}`;
const now = new Date("2026-08-21T13:30:00.000Z");
const executionContext = Object.freeze({
  actorExternalUserId: "system-admin-primary",
});

function proof(label) {
  return `${label}:verified-staging-observation`;
}

function request(overrides = {}) {
  return {
    schemaVersion: 1,
    driverVersion: botReplyStagingLiveDriverVersion,
    confirmation: botReplyStagingLiveDriverConfirmation,
    targetTenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    requestedAt: "2026-08-21T13:25:00.000Z",
    releaseId,
    commitSha,
    artifactDigest,
    ...overrides,
  };
}

function safety(overrides = {}) {
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
      recipientFingerprint,
    },
    rateLimitTestApproval: {
      status: "approved",
      approvedBy: "tal",
      approvedAt: "2026-08-21T12:00:00.000Z",
      expiresAt: "2026-08-21T15:00:00.000Z",
      methodFingerprint,
    },
    ...overrides,
  };
}

function receipt(overrides = {}) {
  return {
    schemaVersion: 1,
    runnerVersion: botReplyStagingRunnerVersion,
    environment: "staging",
    provider: "meta-whatsapp-cloud-api",
    connectionMode: "approved-staging-waba",
    graphApiVersion: "v24.0",
    verifiedAt: "2026-08-21T13:00:00.000Z",
    releaseId,
    commitSha,
    artifactDigest,
    assetProofs: {
      app: proof("app"),
      waba: proof("waba"),
      phoneNumber: proof("phone-number"),
    },
    scenarios: botReplyStagingScenarioRequirements.map(
      (requirement, index) => ({
        ...requirement,
        status: "passed",
        observedAt: "2026-08-21T12:30:00.000Z",
        evidenceProof: proof(`scenario-${index}`),
      }),
    ),
    rateLimits: {
      throughput: {
        messagesPerSecond: 80,
        source: "graph-api",
        observedAt: "2026-08-21T12:31:00.000Z",
        evidenceProof: proof("throughput"),
      },
      providerRetry: {
        status: "passed",
        providerErrorCode: 130429,
        retryAfterSeconds: 12,
        cooldownScope: "sender",
        observedAt: "2026-08-21T12:32:00.000Z",
        evidenceProof: proof("provider-retry"),
      },
      pairLimit: {
        status: "passed",
        providerErrorCode: 131056,
        cooldownScope: "pair",
        backoffPolicy: "meta-4-power-x",
        observedAt: "2026-08-21T12:33:00.000Z",
        evidenceProof: proof("pair-limit"),
      },
    },
    killSwitch: {
      status: "passed",
      providerRequestCount: 0,
      observedAt: "2026-08-21T12:34:00.000Z",
      evidenceProof: proof("kill-switch"),
    },
    duplicateSafety: {
      status: "passed",
      queueDeliveryCount: 2,
      providerRequestCount: 1,
      observedAt: "2026-08-21T12:35:00.000Z",
      evidenceProof: proof("duplicate-safety"),
    },
    credentialBoundary: {
      source: "encrypted-vault",
      plaintextExposureFindings: 0,
      observedAt: "2026-08-21T12:36:00.000Z",
      evidenceProof: proof("credential-boundary"),
    },
    redaction: {
      testedFieldCount: 16,
      findings: 0,
      observedAt: "2026-08-21T12:37:00.000Z",
      evidenceProof: proof("redaction"),
    },
    ...overrides,
  };
}

function harness({
  safetyValue = safety(),
  outcome = "completed",
  receiptValue = receipt(),
  completedAt = "2026-08-21T13:00:00.000Z",
} = {}) {
  const calls = [];
  const driver = createBotReplyStagingLiveDriver({
    stagingTenantId: 7,
    clock: { now: () => now },
    safety: {
      async read(tenantId) {
        calls.push({ kind: "safety", tenantId });
        return safetyValue;
      },
    },
    durableRuns: {
      async run(input) {
        calls.push({ kind: "run", input });
        if (outcome === "in-progress") {
          return { outcome, runKey: input.runKey };
        }
        return {
          outcome,
          runKey: input.runKey,
          auditKey,
          completedAt,
          receipt: receiptValue,
        };
      },
    },
  });
  return { driver, calls };
}

function expectsError(code) {
  return (error) =>
    error instanceof BotReplyStagingLiveDriverError &&
    error.code === code && error.message === code;
}

test("runs only through the bounded Railway staging contract", async () => {
  const { driver, calls } = harness();
  const result = await driver.run(request(), executionContext);

  assert.equal(result.outcome, "completed");
  assert.match(result.runKey, /^bot_reply_staging_run_v1_[a-f0-9]{64}$/);
  assert.equal(result.auditKey, auditKey);
  assert.equal(result.verifiedAt, "2026-08-21T13:00:00.000Z");
  assert.equal(result.expiresAt, "2026-08-22T13:00:00.000Z");
  assert.match(
    result.evidenceDigest,
    /^bot_reply_staging_evidence_v1_[a-f0-9]{64}$/,
  );
  assert.deepEqual(calls.map((entry) => entry.kind), ["safety", "run"]);
  assert.equal(calls[1].input.recipientFingerprint, recipientFingerprint);
  assert.equal(calls[1].input.rateLimitMethodFingerprint, methodFingerprint);
  assert.equal(calls[1].input.graphApiVersion, "v24.0");
  assert.equal(
    calls[1].input.actorExternalUserId,
    executionContext.actorExternalUserId,
  );

  const serializedResult = JSON.stringify(result);
  assert.doesNotMatch(serializedResult, /verified-staging-observation/);
  assert.doesNotMatch(serializedResult, /receipt|phone|waba|token/i);
  assert.ok(Object.isFrozen(result));
});

test("supports deterministic durable replay without a second contract", async () => {
  const { driver } = harness({ outcome: "replayed" });
  const first = await driver.run(request(), executionContext);
  const second = await driver.run(request(), executionContext);

  assert.equal(first.outcome, "replayed");
  assert.equal(first.runKey, second.runKey);
  assert.equal(first.evidenceDigest, second.evidenceDigest);
});

test("rejects missing confirmation, extensions and stale requests before I/O", async () => {
  const cases = [
    [
      request({ confirmation: "yes" }),
      "BOT_REPLY_STAGING_DRIVER_REQUEST_INVALID",
    ],
    [
      { ...request(), recipientPhoneNumber: "+972501234567" },
      "BOT_REPLY_STAGING_DRIVER_REQUEST_INVALID",
    ],
    [
      request({ requestedAt: "2026-08-21T13:31:00.000Z" }),
      "BOT_REPLY_STAGING_DRIVER_REQUEST_NOT_YET_VALID",
    ],
    [
      request({ requestedAt: "2026-08-21T13:19:59.999Z" }),
      "BOT_REPLY_STAGING_DRIVER_REQUEST_EXPIRED",
    ],
  ];

  for (const [candidate, code] of cases) {
    const { driver, calls } = harness();
    await assert.rejects(
      () => driver.run(candidate, executionContext),
      expectsError(code),
    );
    assert.equal(calls.length, 0);
  }
});

test("requires the authenticated Railway actor outside the browser payload", async () => {
  for (const context of [
    undefined,
    {},
    { actorExternalUserId: "" },
    { actorExternalUserId: "system-admin", tenantId: 7 },
  ]) {
    const { driver, calls } = harness();
    await assert.rejects(
      () => driver.run(request(), context),
      expectsError(
        "BOT_REPLY_STAGING_DRIVER_EXECUTION_CONTEXT_INVALID",
      ),
    );
    assert.equal(calls.length, 0);
  }
});

test("rejects any tenant outside the server-side staging allowlist", async () => {
  const { driver, calls } = harness();
  await assert.rejects(
    () => driver.run(request({ targetTenantId: 8 }), executionContext),
    expectsError("BOT_REPLY_STAGING_DRIVER_TENANT_NOT_AUTHORIZED"),
  );
  assert.equal(calls.length, 0);
});

test("fails closed when any staging safety boundary is not proven", async () => {
  const unsafeSnapshots = [
    safety({ environment: "production" }),
    safety({ deliveryState: "kill-switch" }),
    safety({ connectionVersion: 2 }),
    safety({ policyVersion: 3 }),
    safety({ credentialSource: "environment-token" }),
    safety({ executionBoundary: "direct-graph-script" }),
    safety({ evidenceSource: "memory" }),
    safety({
      recipientAuthorization: {
        ...safety().recipientAuthorization,
        optInRecorded: false,
      },
    }),
    safety({
      rateLimitTestApproval: {
        ...safety().rateLimitTestApproval,
        approvedBy: "david",
      },
    }),
  ];

  for (const safetyValue of unsafeSnapshots) {
    const { driver, calls } = harness({ safetyValue });
    await assert.rejects(
      () => driver.run(request(), executionContext),
      expectsError("BOT_REPLY_STAGING_DRIVER_SAFETY_GATE_BLOCKED"),
    );
    assert.deepEqual(calls.map((entry) => entry.kind), ["safety"]);
  }
});

test("rejects expired policy, recipient or Tal rate-limit approval", async () => {
  const expiredSnapshots = [
    safety({ policyEvidenceExpiresAt: now.toISOString() }),
    safety({
      recipientAuthorization: {
        ...safety().recipientAuthorization,
        expiresAt: now.toISOString(),
      },
    }),
    safety({
      rateLimitTestApproval: {
        ...safety().rateLimitTestApproval,
        expiresAt: now.toISOString(),
      },
    }),
  ];

  for (const safetyValue of expiredSnapshots) {
    const { driver, calls } = harness({ safetyValue });
    await assert.rejects(
      () => driver.run(request(), executionContext),
      expectsError("BOT_REPLY_STAGING_DRIVER_SAFETY_EVIDENCE_EXPIRED"),
    );
    assert.deepEqual(calls.map((entry) => entry.kind), ["safety"]);
  }
});

test("does not turn an active durable lease into a second execution", async () => {
  const { driver } = harness({ outcome: "in-progress" });
  await assert.rejects(
    () => driver.run(request(), executionContext),
    expectsError("BOT_REPLY_STAGING_DRIVER_RUN_IN_PROGRESS"),
  );
});

test("rejects invalid or mismatched durable receipts", async () => {
  const invalidReceipt = receipt({ accessToken: "forbidden" });
  const wrongVersionReceipt = receipt({ graphApiVersion: "v23.0" });

  await assert.rejects(
    () => harness({ receiptValue: invalidReceipt }).driver.run(
      request(),
      executionContext,
    ),
    expectsError("BOT_REPLY_STAGING_DRIVER_RECEIPT_INVALID"),
  );
  await assert.rejects(
    () => harness({ receiptValue: wrongVersionReceipt }).driver.run(
      request(),
      executionContext,
    ),
    expectsError("BOT_REPLY_STAGING_DRIVER_RECEIPT_MISMATCH"),
  );
  await assert.rejects(
    () => harness({
      completedAt: "2026-08-21T13:00:01.000Z",
    }).driver.run(request(), executionContext),
    expectsError("BOT_REPLY_STAGING_DRIVER_RECEIPT_MISMATCH"),
  );
});

test("rejects incomplete dependency wiring at construction", () => {
  assert.throws(
    () => createBotReplyStagingLiveDriver({
      stagingTenantId: 7,
      clock: { now: () => now },
      safety: { read: async () => safety() },
    }),
    /dependencies are invalid/,
  );
});
