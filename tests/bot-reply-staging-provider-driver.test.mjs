import assert from "node:assert/strict";
import test from "node:test";

import {
  BotReplyStagingProviderDriverError,
  botReplyStagingProviderDriverVersion,
  createBotReplyStagingProviderDriver,
} from "../server/operations/botReplyStagingProviderDriver.ts";
import {
  deriveBotReplyStagingStepDeliveryKey,
} from "../server/operations/botReplyStagingScenarioExecutor.ts";
import {
  botReplyStagingScenarioRequirements,
} from "../server/operations/botReplyStagingEvidence.ts";

const observedAt = "2026-08-21T13:30:00.000Z";
const openedAt = "2026-08-21T12:00:00.000Z";
const expiresAt = "2026-08-22T12:00:00.000Z";
const leaseExpiresAt = "2026-08-21T14:00:00.000Z";

function proof(label) {
  return `${label}:durable-staging-observation`;
}

function stepContext(index = 1) {
  const digit = (index % 10).toString();
  return {
    run: {
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
    },
    claim: {
      runKey: `bot_reply_staging_run_v1_${"a".repeat(64)}`,
      auditKey: `bot_reply_staging_audit_v1_${"1".repeat(64)}`,
      claimVersion: 2,
      leaseExpiresAt,
    },
    operationKey: `bot_reply_staging_step_v1_${digit.repeat(64)}`,
    deliveryKey: `bot_reply_delivery_v1_${digit.repeat(64)}`,
  };
}

function scenarioContext(scenario, index) {
  const requirement = botReplyStagingScenarioRequirements.find(
    (candidate) => candidate.scenario === scenario,
  );
  return {
    ...stepContext(index),
    scenario,
    expectedProviderErrorCode: requirement.providerErrorCode,
  };
}

function executionMode(caseName) {
  return caseName === "text-send" || caseName === "button-send" ||
      caseName === "customer-window-expired" ||
      caseName === "provider-retry" || caseName === "pair-limit" ||
      caseName === "duplicate-safety" || caseName === "kill-switch"
    ? "dispatch"
    : "observe-only";
}

function allocatedCase(request, overrides = {}) {
  const mode = executionMode(request.caseName);
  return {
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: request.caseName,
    runKey: request.runKey,
    operationKey: request.operationKey,
    deliveryKey: request.deliveryKey,
    subjectDeliveryKey: mode === "dispatch"
      ? request.deliveryKey
      : deriveBotReplyStagingStepDeliveryKey(
          request.runKey,
          "scenario:button-send",
        ),
    targetTenantId: request.targetTenantId,
    connectionVersion: request.connectionVersion,
    policyVersion: request.policyVersion,
    recipientFingerprint: request.recipientFingerprint,
    claimVersion: request.claimVersion,
    leaseExpiresAt: request.leaseExpiresAt,
    executionMode: mode,
    serviceWindowOpenedAt: mode === "dispatch" ? openedAt : null,
    serviceWindowExpiresAt: mode === "dispatch" ? expiresAt : null,
    caseFingerprint: `sha256:${"8".repeat(64)}`,
    ...overrides,
  };
}

function observations(calls) {
  return {
    isConfigured() {
      return true;
    },
    async inspectAssets(context) {
      calls.push("observe:assets");
      return {
        operationKey: context.operationKey,
        graphApiVersion: context.run.graphApiVersion,
        assetProofs: {
          app: proof("app"),
          waba: proof("waba"),
          phoneNumber: proof("phone"),
        },
      };
    },
    async observeScenario(context, caseValue, dispatch) {
      calls.push({
        kind: "observe:scenario",
        scenario: context.scenario,
        caseName: caseValue.caseName,
        dispatch: dispatch?.outcome ?? null,
      });
      return {
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        scenario: context.scenario,
        status: "passed",
        providerErrorCode: context.expectedProviderErrorCode,
        observedAt,
        evidenceProof: proof(context.scenario),
        executionBoundary: "railway-bot-reply-worker",
      };
    },
    async inspectThroughput(context) {
      return {
        operationKey: context.operationKey,
        messagesPerSecond: 80,
        source: "graph-api",
        observedAt,
        evidenceProof: proof("throughput"),
      };
    },
    async observeProviderRetry(context, _caseValue, dispatch) {
      calls.push(`observe:provider-retry:${dispatch.outcome}`);
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
    async observePairLimit(context, _caseValue, dispatch) {
      calls.push(`observe:pair-limit:${dispatch.outcome}`);
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
    async observeDuplicateSafety(context, _caseValue, dispatches) {
      calls.push(
        `observe:duplicate:${dispatches.map((item) => item.outcome).join(",")}`,
      );
      return {
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        status: "passed",
        queueDeliveryCount: 2,
        providerRequestCount: 1,
        observedAt,
        evidenceProof: proof("duplicate"),
        executionBoundary: "railway-bot-reply-worker",
      };
    },
    async inspectCredentialBoundary(context) {
      return {
        operationKey: context.operationKey,
        source: "encrypted-vault",
        plaintextExposureFindings: 0,
        observedAt,
        evidenceProof: proof("credential"),
      };
    },
    async inspectRedaction(context) {
      return {
        operationKey: context.operationKey,
        testedFieldCount: 16,
        findings: 0,
      };
    },
    async observeKillSwitch(context, _caseValue, disabled, dispatch) {
      calls.push(`observe:kill-switch:${disabled.state}:${dispatch.outcome}`);
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
  };
}

function fixture({
  dispatchResults = [],
  caseOverride = null,
  caseError = false,
  dispatchError = false,
  configured = true,
  observationOverride = {},
  killSwitchOverride = {},
} = {}) {
  const calls = [];
  let dispatchIndex = 0;
  const baseObservations = observations(calls);
  const driver = createBotReplyStagingProviderDriver({
    cases: {
      isConfigured() {
        return configured;
      },
      async allocate(request) {
        calls.push(`allocate:${request.caseName}`);
        if (caseError) {
          throw new Error("sensitive-case-detail");
        }
        return allocatedCase(
          request,
          caseOverride === null ? {} : caseOverride,
        );
      },
    },
    deliveryWorker: {
      isConfigured() {
        return configured;
      },
      async dispatch(input) {
        calls.push({ kind: "dispatch", input });
        if (dispatchError) {
          throw new Error("sensitive-provider-detail");
        }
        const result = dispatchResults[dispatchIndex];
        dispatchIndex += 1;
        return result ?? { outcome: "accepted" };
      },
    },
    observations: {
      ...baseObservations,
      ...observationOverride,
    },
    killSwitch: {
      isConfigured() {
        return configured;
      },
      async disable(request) {
        calls.push("kill-switch:disable");
        return {
          operationKey: request.operationKey,
          deliveryKey: request.deliveryKey,
          targetTenantId: request.targetTenantId,
          previousPolicyVersion: request.expectedPolicyVersion,
          disabledPolicyVersion: request.expectedPolicyVersion + 1,
          state: "disabled",
          recordedAt: observedAt,
          evidenceProof: proof("policy-disabled"),
        };
      },
      ...killSwitchOverride,
    },
  });
  return { driver, calls };
}

function expectsError(code) {
  return (error) =>
    error instanceof BotReplyStagingProviderDriverError &&
    error.code === code && error.message === code;
}

test("exports a closed provider driver version and exact driver surface", () => {
  const { driver } = fixture();
  assert.equal(
    botReplyStagingProviderDriverVersion,
    "connect-bot-reply-staging-provider-driver-v1",
  );
  assert.deepEqual(Object.keys(driver).sort(), [
    "executeScenario",
    "inspectAssets",
    "inspectThroughput",
    "verifyCredentialBoundary",
    "verifyDuplicateSafety",
    "verifyKillSwitch",
    "verifyPairLimit",
    "verifyProviderRetry",
    "verifyRedaction",
  ]);
  assert.ok(Object.isFrozen(driver));
});

test("dispatches only send scenarios and observes webhook scenarios durably", async () => {
  const { driver, calls } = fixture({
    dispatchResults: [
      { outcome: "accepted" },
      { outcome: "accepted" },
      { outcome: "rejected" },
    ],
  });

  for (const [index, requirement] of
    botReplyStagingScenarioRequirements.entries()) {
    await driver.executeScenario(
      scenarioContext(requirement.scenario, index + 1),
    );
  }

  const dispatchCalls = calls.filter((call) => call.kind === "dispatch");
  assert.equal(dispatchCalls.length, 3);
  assert.deepEqual(
    calls.filter((call) => typeof call === "string" &&
      call.startsWith("allocate:")),
    botReplyStagingScenarioRequirements.map(
      ({ scenario }) => `allocate:${scenario}`,
    ),
  );
  assert.deepEqual(
    calls.filter((call) => call.kind === "observe:scenario")
      .map(({ scenario, dispatch }) => [scenario, dispatch]),
    [
      ["text-send", "accepted"],
      ["button-send", "accepted"],
      ["button-reply", null],
      ["status-sent", null],
      ["status-delivered", null],
      ["status-read", null],
      ["customer-window-expired", "rejected"],
    ],
  );
});

test("requires provider throttles to pass through a deferred worker result", async () => {
  const { driver, calls } = fixture({
    dispatchResults: [
      { outcome: "deferred", retryAt: "2026-08-21T13:31:00.000Z" },
      { outcome: "deferred", retryAt: "2026-08-21T13:31:06.000Z" },
    ],
  });

  await driver.verifyProviderRetry(stepContext(1));
  await driver.verifyPairLimit(stepContext(2));
  assert.ok(calls.includes("observe:provider-retry:deferred"));
  assert.ok(calls.includes("observe:pair-limit:deferred"));

  const invalid = fixture({ dispatchResults: [{ outcome: "accepted" }] });
  await assert.rejects(
    () => invalid.driver.verifyProviderRetry(stepContext(3)),
    expectsError("BOT_REPLY_STAGING_PROVIDER_DELIVERY_OUTCOME_INVALID"),
  );
});

test("proves duplicate safety by dispatching one delivery key exactly twice", async () => {
  const { driver, calls } = fixture({
    dispatchResults: [
      { outcome: "accepted" },
      { outcome: "duplicate" },
    ],
  });
  const context = stepContext(4);
  await driver.verifyDuplicateSafety(context);
  const dispatchCalls = calls.filter((call) => call.kind === "dispatch");
  assert.equal(dispatchCalls.length, 2);
  assert.equal(dispatchCalls[0].input.deliveryKey, context.deliveryKey);
  assert.deepEqual(dispatchCalls[0].input, dispatchCalls[1].input);
  assert.ok(calls.includes("observe:duplicate:accepted,duplicate"));

  const invalid = fixture({
    dispatchResults: [
      { outcome: "accepted" },
      { outcome: "accepted" },
    ],
  });
  await assert.rejects(
    () => invalid.driver.verifyDuplicateSafety(context),
    expectsError("BOT_REPLY_STAGING_PROVIDER_DELIVERY_OUTCOME_INVALID"),
  );
});

test("disables the policy before kill-switch dispatch and rejects acceptance", async () => {
  const passing = fixture({
    dispatchResults: [
      { outcome: "deferred", retryAt: "2026-08-21T13:31:00.000Z" },
    ],
  });
  await passing.driver.verifyKillSwitch(stepContext(5));
  assert.deepEqual(
    passing.calls.filter((call) =>
      call === "kill-switch:disable" || call.kind === "dispatch" ||
      (typeof call === "string" && call.startsWith("observe:kill-switch"))),
    [
      "kill-switch:disable",
      passing.calls.find((call) => call.kind === "dispatch"),
      "observe:kill-switch:disabled:deferred",
    ],
  );

  const unsafe = fixture({ dispatchResults: [{ outcome: "accepted" }] });
  await assert.rejects(
    () => unsafe.driver.verifyKillSwitch(stepContext(6)),
    expectsError("BOT_REPLY_STAGING_PROVIDER_DELIVERY_OUTCOME_INVALID"),
  );
  assert.equal(
    unsafe.calls.some((call) =>
      typeof call === "string" && call.startsWith("observe:kill-switch")),
    false,
  );
});

test("rejects a case that is not bound to the exact delivery identity", async () => {
  const { driver, calls } = fixture({
    caseOverride: {
      deliveryKey: `bot_reply_delivery_v1_${"9".repeat(64)}`,
    },
  });
  await assert.rejects(
    () => driver.executeScenario(scenarioContext("text-send", 1)),
    expectsError("BOT_REPLY_STAGING_PROVIDER_CASE_INVALID"),
  );
  assert.equal(calls.some((call) => call.kind === "dispatch"), false);
});

test("rejects webhook evidence linked to a non-button subject", async () => {
  const { driver, calls } = fixture({
    caseOverride: {
      subjectDeliveryKey: `bot_reply_delivery_v1_${"9".repeat(64)}`,
    },
  });
  await assert.rejects(
    () => driver.executeScenario(
      scenarioContext("status-delivered", 4),
    ),
    expectsError("BOT_REPLY_STAGING_PROVIDER_CASE_INVALID"),
  );
  assert.equal(calls.some((call) => call.kind === "dispatch"), false);
  assert.equal(
    calls.some((call) => call.kind === "observe:scenario"),
    false,
  );
});

test("fails closed before allocation when one live dependency is unavailable", async () => {
  const { driver, calls } = fixture({ configured: false });
  await assert.rejects(
    () => driver.inspectAssets(stepContext(1)),
    expectsError("BOT_REPLY_STAGING_PROVIDER_RUNTIME_UNAVAILABLE"),
  );
  assert.deepEqual(calls, []);
});

test("sanitizes provider, kill-switch, and observation failures", async () => {
  const caseFailure = fixture({ caseError: true });
  await assert.rejects(
    () => caseFailure.driver.executeScenario(
      scenarioContext("text-send", 1),
    ),
    expectsError("BOT_REPLY_STAGING_PROVIDER_CASE_UNAVAILABLE"),
  );

  const deliveryFailure = fixture({ dispatchError: true });
  await assert.rejects(
    () => deliveryFailure.driver.executeScenario(
      scenarioContext("text-send", 1),
    ),
    expectsError("BOT_REPLY_STAGING_PROVIDER_DELIVERY_FAILED"),
  );

  const observationFailure = fixture({
    observationOverride: {
      async inspectAssets() {
        throw new Error("sensitive-observation-detail");
      },
    },
  });
  await assert.rejects(
    () => observationFailure.driver.inspectAssets(stepContext(1)),
    expectsError("BOT_REPLY_STAGING_PROVIDER_OBSERVATION_FAILED"),
  );

  const killSwitchFailure = fixture({
    killSwitchOverride: {
      async disable() {
        throw new Error("sensitive-policy-detail");
      },
    },
  });
  await assert.rejects(
    () => killSwitchFailure.driver.verifyKillSwitch(stepContext(2)),
    expectsError("BOT_REPLY_STAGING_PROVIDER_KILL_SWITCH_FAILED"),
  );
});
