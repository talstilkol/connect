import assert from "node:assert/strict";
import test from "node:test";

import {
  BotReplyStagingObservationSourceError,
  createBotReplyStagingObservationSource,
} from "../server/operations/botReplyStagingObservationSource.ts";

const validKey = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const observedAt = "2026-08-21T13:30:00.000Z";

function context() {
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
      actorExternalUserId: "user_tal",
    },
    claim: {
      runKey: `bot_reply_staging_run_v1_${"a".repeat(64)}`,
      auditKey: `bot_reply_staging_audit_v1_${"1".repeat(64)}`,
      claimVersion: 2,
      leaseExpiresAt: "2026-08-21T14:00:00.000Z",
    },
    operationKey: `bot_reply_staging_step_v1_${"2".repeat(64)}`,
    deliveryKey: `bot_reply_delivery_v1_${"3".repeat(64)}`,
  };
}

function allocatedCase(caseName = "text-send", executionMode = "dispatch") {
  const value = context();
  return {
    schemaVersion: 1,
    source: "durable-postgres",
    caseName,
    runKey: value.run.runKey,
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    subjectDeliveryKey: `bot_reply_delivery_v1_${"4".repeat(64)}`,
    targetTenantId: value.run.targetTenantId,
    connectionVersion: value.run.expectedConnectionVersion,
    policyVersion: value.run.expectedPolicyVersion,
    recipientFingerprint: value.run.recipientFingerprint,
    claimVersion: value.claim.claimVersion,
    leaseExpiresAt: value.claim.leaseExpiresAt,
    executionMode,
    serviceWindowOpenedAt: executionMode === "dispatch"
      ? "2026-08-20T13:20:00.000Z"
      : null,
    serviceWindowExpiresAt: executionMode === "dispatch"
      ? "2026-08-21T13:20:00.000Z"
      : null,
    caseFingerprint: `sha256:${"5".repeat(64)}`,
  };
}

function binding(value = context()) {
  return {
    schemaVersion: 1,
    runKey: value.run.runKey,
    operationKey: value.operationKey,
    targetTenantId: value.run.targetTenantId,
    connectionVersion: value.run.expectedConnectionVersion,
    policyVersion: value.run.expectedPolicyVersion,
    releaseId: value.run.releaseId,
    commitSha: value.run.commitSha,
    artifactDigest: value.run.artifactDigest,
    graphApiVersion: value.run.graphApiVersion,
    observedAt,
    recordDigest: `sha256:${"6".repeat(64)}`,
  };
}

function caseBinding(value, item) {
  return {
    ...binding(value),
    source: "durable-postgres",
    caseName: item.caseName,
    deliveryKey: item.deliveryKey,
    subjectDeliveryKey: item.subjectDeliveryKey,
    recipientFingerprint: item.recipientFingerprint,
  };
}

function graphReader(overrides = {}) {
  return {
    isConfigured() {
      return true;
    },
    async readAssets(value) {
      return {
        ...binding(value),
        source: "meta-graph-api",
        appId: "101",
        businessPortfolioId: "202",
        wabaId: "303",
        phoneNumberId: "404",
      };
    },
    async readThroughput(value) {
      return {
        ...binding(value),
        source: "meta-graph-api",
        phoneNumberId: "404",
        messagesPerSecond: 80,
      };
    },
    ...overrides,
  };
}

function durableReader(overrides = {}) {
  return {
    isConfigured() {
      return true;
    },
    async readScenario(value, item) {
      return {
        ...caseBinding(value, item),
        scenario: value.scenario,
        providerErrorCode: value.expectedProviderErrorCode,
        dispatchOutcome: item.executionMode === "dispatch"
          ? value.scenario === "customer-window-expired"
            ? "rejected"
            : "accepted"
          : null,
      };
    },
    async readProviderRetry(value, item) {
      return {
        ...caseBinding(value, item),
        providerErrorCode: 130429,
        retryAfterSeconds: 16,
        cooldownScope: "sender",
        dispatchOutcome: "deferred",
      };
    },
    async readPairLimit(value, item) {
      return {
        ...caseBinding(value, item),
        providerErrorCode: 131056,
        cooldownScope: "pair",
        backoffPolicy: "meta-4-power-x",
        dispatchOutcome: "deferred",
      };
    },
    async readDuplicateSafety(value, item) {
      return {
        ...caseBinding(value, item),
        queueDeliveryCount: 2,
        providerRequestCount: 1,
        dispatchOutcomes: ["accepted", "duplicate"],
      };
    },
    async readKillSwitch(value, item) {
      return {
        ...caseBinding(value, item),
        disabledPolicyVersion: 5,
        policyState: "disabled",
        providerRequestCount: 0,
        dispatchOutcome: "rejected",
      };
    },
    ...overrides,
  };
}

function securityReader(overrides = {}) {
  return {
    isConfigured() {
      return true;
    },
    async readCredentialBoundary(value) {
      return {
        ...binding(value),
        source: "encrypted-vault-audit",
        plaintextExposureFindings: 0,
      };
    },
    async readRedaction(value) {
      return {
        ...binding(value),
        source: "durable-telemetry-audit",
        testedFieldCount: 12,
        findings: 0,
      };
    },
    ...overrides,
  };
}

function webhookProducer(overrides = {}) {
  return {
    isConfigured() {
      return true;
    },
    async recordStatus() {
      return {
        outcome: "created",
        eventKey: `bot_reply_staging_observation_v1_${"7".repeat(64)}`,
      };
    },
    ...overrides,
  };
}

function providerDeferralProducer(overrides = {}) {
  return {
    isConfigured() {
      return true;
    },
    async recordDeferral() {
      return {
        outcome: "created",
        eventKey: `bot_reply_staging_observation_v1_${"8".repeat(64)}`,
      };
    },
    ...overrides,
  };
}

function sendProducer(overrides = {}) {
  return {
    isConfigured() {
      return true;
    },
    async recordAcceptedSend() {
      return {
        outcome: "created",
        eventKey: `bot_reply_staging_observation_v1_${"9".repeat(64)}`,
      };
    },
    async recordButtonReply() {
      return {
        outcome: "created",
        eventKey: `bot_reply_staging_observation_v1_${"9".repeat(64)}`,
      };
    },
    async recordServiceWindowRejection() {
      return {
        outcome: "created",
        eventKey: `bot_reply_staging_observation_v1_${"9".repeat(64)}`,
      };
    },
    async recordDuplicateSafety() {
      return {
        outcome: "created",
        eventKey: `bot_reply_staging_observation_v1_${"9".repeat(64)}`,
      };
    },
    async recordKillSwitch() {
      return {
        outcome: "created",
        eventKey: `bot_reply_staging_observation_v1_${"9".repeat(64)}`,
      };
    },
    ...overrides,
  };
}

function source(overrides = {}) {
  return createBotReplyStagingObservationSource(
    {
      BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1: validKey,
      ...overrides.environment,
    },
    {
      graph: overrides.graph ?? graphReader(),
      durable: overrides.durable ?? durableReader(),
      security: overrides.security ?? securityReader(),
      webhook: overrides.webhook ?? webhookProducer(),
      providerDeferrals:
        overrides.providerDeferrals ?? providerDeferralProducer(),
      send: overrides.send ?? sendProducer(),
    },
    overrides.clock ?? {
      now() {
        return new Date("2026-08-21T13:40:00.000Z");
      },
    },
  );
}

test("materializes webhook-backed statuses before reading durable evidence", async () => {
  const calls = [];
  const observations = source({
    webhook: webhookProducer({
      async recordStatus(value, item) {
        calls.push({ value, item });
        return { outcome: "created" };
      },
    }),
  });
  const value = {
    ...context(),
    scenario: "status-sent",
    expectedProviderErrorCode: null,
  };
  const item = allocatedCase("status-sent", "observe-only");

  const result = await observations.observeScenario(value, item, null);

  assert.equal(result.scenario, "status-sent");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].value, value);
  assert.equal(calls[0].item, item);
});

test("materializes accepted sends before reading durable evidence", async () => {
  const calls = [];
  const observations = source({
    send: sendProducer({
      async recordAcceptedSend(value, item, dispatch) {
        calls.push({ value, item, dispatch });
        return { outcome: "created" };
      },
    }),
  });
  const value = {
    ...context(),
    scenario: "text-send",
    expectedProviderErrorCode: null,
  };
  const item = allocatedCase("text-send");
  const dispatch = { outcome: "accepted" };

  await observations.observeScenario(value, item, dispatch);

  assert.deepEqual(calls, [{ value, item, dispatch }]);
});

test("materializes exact 131047 provenance before reading durable evidence", async () => {
  const calls = [];
  const observations = source({
    send: sendProducer({
      async recordServiceWindowRejection(value, item, dispatch) {
        calls.push({ value, item, dispatch });
        return { outcome: "created" };
      },
    }),
  });
  const value = {
    ...context(),
    scenario: "customer-window-expired",
    expectedProviderErrorCode: 131047,
  };
  const item = allocatedCase("customer-window-expired");
  const dispatch = { outcome: "rejected" };

  await observations.observeScenario(value, item, dispatch);

  assert.deepEqual(calls, [{ value, item, dispatch }]);
});

test("materializes duplicate-safety evidence before reading it", async () => {
  const calls = [];
  const baseReader = durableReader();
  const observations = source({
    send: sendProducer({
      async recordDuplicateSafety(value, item, dispatches) {
        calls.push({ stage: "producer", value, item, dispatches });
        return { outcome: "created" };
      },
    }),
    durable: durableReader({
      async readDuplicateSafety(value, item) {
        calls.push({ stage: "reader", value, item });
        return baseReader.readDuplicateSafety(value, item);
      },
    }),
  });
  const value = context();
  const item = allocatedCase("duplicate-safety");
  const dispatches = [{ outcome: "accepted" }, { outcome: "duplicate" }];

  await observations.observeDuplicateSafety(value, item, dispatches);

  assert.deepEqual(calls.map(({ stage }) => stage), ["producer", "reader"]);
});

test("materializes kill-switch evidence before reading it", async () => {
  const calls = [];
  const baseReader = durableReader();
  const observations = source({
    send: sendProducer({
      async recordKillSwitch(value, item, disabled, dispatch) {
        calls.push({ stage: "producer", value, item, disabled, dispatch });
        return { outcome: "created" };
      },
    }),
    durable: durableReader({
      async readKillSwitch(value, item) {
        calls.push({ stage: "reader", value, item });
        return baseReader.readKillSwitch(value, item);
      },
    }),
  });
  const value = context();
  const item = allocatedCase("kill-switch");
  const disabled = {
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    targetTenantId: 7,
    previousPolicyVersion: 4,
    disabledPolicyVersion: 5,
    state: "disabled",
    recordedAt: observedAt,
    evidenceProof: "durable-policy-proof",
  };
  const dispatch = { outcome: "rejected" };

  await observations.observeKillSwitch(value, item, disabled, dispatch);

  assert.deepEqual(calls.map(({ stage }) => stage), ["producer", "reader"]);
});

test("materializes an inbound button reply before reading durable evidence", async () => {
  const calls = [];
  const observations = source({
    send: sendProducer({
      async recordButtonReply(value, item) {
        calls.push({ value, item });
        return { outcome: "created" };
      },
    }),
  });
  const value = {
    ...context(),
    scenario: "button-reply",
    expectedProviderErrorCode: null,
  };
  const item = allocatedCase("button-reply", "observe-only");

  await observations.observeScenario(value, item, null);

  assert.deepEqual(calls, [{ value, item }]);
});

test("materializes exact provider deferrals before reading durable evidence", async () => {
  const calls = [];
  const observations = source({
    providerDeferrals: providerDeferralProducer({
      async recordDeferral(value, item, dispatch) {
        calls.push({ value, item, dispatch });
        return { outcome: "created" };
      },
    }),
  });
  const value = context();
  const retryCase = allocatedCase("provider-retry");
  const pairCase = allocatedCase("pair-limit");
  const dispatch = {
    outcome: "deferred",
    retryAt: "2026-08-21T13:31:00.000Z",
  };

  await observations.observeProviderRetry(value, retryCase, dispatch);
  await observations.observePairLimit(value, pairCase, dispatch);

  assert.deepEqual(calls, [
    { value, item: retryCase, dispatch },
    { value, item: pairCase, dispatch },
  ]);
});

function errorCode(error, code) {
  return error instanceof BotReplyStagingObservationSourceError &&
    error.code === code;
}

test("derives privacy-preserving observations from all explicit truth readers", async () => {
  const observations = source();
  const value = context();
  const scenario = { ...value, scenario: "text-send", expectedProviderErrorCode: null };

  const assets = await observations.inspectAssets(value);
  const scenarioResult = await observations.observeScenario(
    scenario,
    allocatedCase(),
    { outcome: "accepted" },
  );
  const throughput = await observations.inspectThroughput(value);
  const retry = await observations.observeProviderRetry(
    value,
    allocatedCase("provider-retry"),
    { outcome: "deferred", retryAt: "2026-08-21T13:31:00.000Z" },
  );
  const pair = await observations.observePairLimit(
    value,
    allocatedCase("pair-limit"),
    { outcome: "deferred", retryAt: "2026-08-21T13:31:00.000Z" },
  );
  const duplicate = await observations.observeDuplicateSafety(
    value,
    allocatedCase("duplicate-safety"),
    [{ outcome: "accepted" }, { outcome: "duplicate" }],
  );
  const credential = await observations.inspectCredentialBoundary(value);
  const redaction = await observations.inspectRedaction(value);
  const disabled = {
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    targetTenantId: 7,
    previousPolicyVersion: 4,
    disabledPolicyVersion: 5,
    state: "disabled",
    recordedAt: observedAt,
    evidenceProof: "durable-policy-proof",
  };
  const killSwitch = await observations.observeKillSwitch(
    value,
    allocatedCase("kill-switch"),
    disabled,
    { outcome: "rejected" },
  );

  assert.equal(observations.isConfigured(), true);
  assert.match(assets.assetProofs.app, /^bot-reply-staging-proof-v1:[a-f0-9]{64}$/);
  assert.notEqual(assets.assetProofs.app, assets.assetProofs.waba);
  assert.equal(scenarioResult.status, "passed");
  assert.equal(throughput.messagesPerSecond, 80);
  assert.equal(retry.retryAfterSeconds, 16);
  assert.equal(pair.backoffPolicy, "meta-4-power-x");
  assert.equal(duplicate.providerRequestCount, 1);
  assert.equal(credential.plaintextExposureFindings, 0);
  assert.deepEqual(redaction, {
    operationKey: value.operationKey,
    testedFieldCount: 12,
    findings: 0,
    observedAt,
    evidenceProof: redaction.evidenceProof,
  });
  assert.match(
    redaction.evidenceProof,
    /^bot-reply-staging-proof-v1:[a-f0-9]{64}$/,
  );
  assert.equal(killSwitch.providerRequestCount, 0);

  const serialized = JSON.stringify({
    assets,
    scenarioResult,
    throughput,
    retry,
    pair,
    duplicate,
    credential,
    redaction,
    killSwitch,
  });
  for (const privateIdentifier of ["101", "202", "303", "404"]) {
    assert.equal(serialized.includes(`\"${privateIdentifier}\"`), false);
  }
  assert.equal(Object.isFrozen(assets), true);
  assert.equal(Object.isFrozen(assets.assetProofs), true);
});

test("rejects cross-run, stale and structurally extended facts", async () => {
  const value = context();
  const crossRun = source({
    graph: graphReader({
      async readAssets(input) {
        return {
          ...binding(input),
          runKey: `bot_reply_staging_run_v1_${"9".repeat(64)}`,
          source: "meta-graph-api",
          appId: "101",
          businessPortfolioId: "202",
          wabaId: "303",
          phoneNumberId: "404",
        };
      },
    }),
  });
  await assert.rejects(
    () => crossRun.inspectAssets(value),
    (error) => errorCode(error, "BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID"),
  );

  const stale = source({
    graph: graphReader({
      async readThroughput(input) {
        return {
          ...binding(input),
          observedAt: "2026-08-21T12:59:59.000Z",
          source: "meta-graph-api",
          phoneNumberId: "404",
          messagesPerSecond: 80,
        };
      },
    }),
  });
  await assert.rejects(
    () => stale.inspectThroughput(value),
    (error) => errorCode(error, "BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID"),
  );

  const extended = source({
    security: securityReader({
      async readRedaction(input) {
        return {
          ...binding(input),
          source: "durable-telemetry-audit",
          testedFieldCount: 12,
          findings: 0,
          untrusted: true,
        };
      },
    }),
  });
  await assert.rejects(
    () => extended.inspectRedaction(value),
    (error) => errorCode(error, "BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID"),
  );
});

test("binds scenario, duplicate and kill-switch facts to actual outcomes", async () => {
  const observations = source();
  const value = context();
  await assert.rejects(
    () => observations.observeScenario(
      { ...value, scenario: "text-send", expectedProviderErrorCode: null },
      allocatedCase(),
      { outcome: "duplicate" },
    ),
    (error) => errorCode(error, "BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID"),
  );
  await assert.rejects(
    () => observations.observeDuplicateSafety(
      value,
      allocatedCase("duplicate-safety"),
      [{ outcome: "duplicate" }, { outcome: "duplicate" }],
    ),
    (error) => errorCode(error, "BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID"),
  );
  await assert.rejects(
    () => observations.observeKillSwitch(
      value,
      allocatedCase("kill-switch"),
      {
        operationKey: value.operationKey,
        deliveryKey: value.deliveryKey,
        targetTenantId: 7,
        previousPolicyVersion: 4,
        disabledPolicyVersion: 6,
        state: "disabled",
        recordedAt: observedAt,
        evidenceProof: "durable-policy-proof",
      },
      { outcome: "rejected" },
    ),
    (error) => errorCode(error, "BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID"),
  );
});

test("fails closed for missing key, unavailable readers and reader errors", async () => {
  const missingKey = source({
    environment: { BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1: "" },
  });
  assert.equal(missingKey.isConfigured(), false);
  await assert.rejects(
    () => missingKey.inspectAssets(context()),
    (error) => errorCode(error, "BOT_REPLY_STAGING_OBSERVATION_RUNTIME_UNAVAILABLE"),
  );

  const unavailable = source({
    graph: graphReader({ isConfigured() { return false; } }),
  });
  assert.equal(unavailable.isConfigured(), false);

  const failedRead = source({
    graph: graphReader({
      async readAssets() {
        throw new Error("private provider failure");
      },
    }),
  });
  await assert.rejects(
    () => failedRead.inspectAssets(context()),
    (error) =>
      errorCode(error, "BOT_REPLY_STAGING_OBSERVATION_READ_FAILED") &&
      !error.message.includes("private provider failure"),
  );
});

test("rejects invalid observation clocks", async () => {
  const observations = source({
    clock: {
      now() {
        return new Date("invalid");
      },
    },
  });
  await assert.rejects(
    () => observations.inspectAssets(context()),
    (error) => errorCode(error, "BOT_REPLY_STAGING_OBSERVATION_CLOCK_INVALID"),
  );
});
