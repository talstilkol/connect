import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBotReplyStagingDurableObservationReader,
  postgresBotReplyStagingDurableObservationSql,
} from "../server/platform/postgresBotReplyStagingDurableObservationReader.ts";

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

function allocatedCase(caseName, subjectDeliveryKey = context().deliveryKey) {
  const value = context();
  return {
    schemaVersion: 1,
    source: "durable-postgres",
    caseName,
    runKey: value.run.runKey,
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    subjectDeliveryKey,
    targetTenantId: value.run.targetTenantId,
    connectionVersion: value.run.expectedConnectionVersion,
    policyVersion: value.run.expectedPolicyVersion,
    recipientFingerprint: value.run.recipientFingerprint,
    claimVersion: value.claim.claimVersion,
    leaseExpiresAt: value.claim.leaseExpiresAt,
    executionMode: subjectDeliveryKey === value.deliveryKey
      ? "dispatch"
      : "observe-only",
    serviceWindowOpenedAt: subjectDeliveryKey === value.deliveryKey
      ? "2026-08-20T13:20:00.000Z"
      : null,
    serviceWindowExpiresAt: subjectDeliveryKey === value.deliveryKey
      ? "2026-08-21T13:20:00.000Z"
      : null,
    caseFingerprint: `sha256:${"5".repeat(64)}`,
  };
}

function baseRow(overrides = {}) {
  const value = context();
  return {
    eventKey: `bot_reply_staging_observation_v1_${"6".repeat(64)}`,
    runKey: value.run.runKey,
    claimVersion: value.claim.claimVersion,
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    subjectDeliveryKey: value.deliveryKey,
    caseName: "text-send",
    factKind: "scenario",
    scenario: "text-send",
    providerErrorCode: null,
    dispatchOutcome: "accepted",
    firstDispatchOutcome: null,
    secondDispatchOutcome: null,
    retryAfterSeconds: null,
    cooldownScope: null,
    backoffPolicy: null,
    queueDeliveryCount: null,
    providerRequestCount: null,
    disabledPolicyVersion: null,
    policyState: null,
    recipientFingerprint: value.run.recipientFingerprint,
    observedAt: "2026-08-21T13:30:00.000Z",
    targetTenantId: value.run.targetTenantId,
    connectionVersion: value.run.expectedConnectionVersion,
    policyVersion: value.run.expectedPolicyVersion,
    releaseId: value.run.releaseId,
    commitSha: value.run.commitSha,
    artifactDigest: value.run.artifactDigest,
    graphApiVersion: value.run.graphApiVersion,
    ...overrides,
  };
}

function rowFor(kind) {
  if (kind === "provider-retry") {
    return baseRow({
      factKind: kind,
      caseName: kind,
      scenario: null,
      providerErrorCode: 130429,
      dispatchOutcome: "deferred",
      retryAfterSeconds: 16,
      cooldownScope: "sender",
    });
  }
  if (kind === "pair-limit") {
    return baseRow({
      factKind: kind,
      caseName: kind,
      scenario: null,
      providerErrorCode: 131056,
      dispatchOutcome: "deferred",
      cooldownScope: "pair",
      backoffPolicy: "meta-4-power-x",
    });
  }
  if (kind === "duplicate-safety") {
    return baseRow({
      factKind: kind,
      caseName: kind,
      scenario: null,
      dispatchOutcome: null,
      firstDispatchOutcome: "accepted",
      secondDispatchOutcome: "duplicate",
      queueDeliveryCount: 2,
      providerRequestCount: 1,
    });
  }
  if (kind === "kill-switch") {
    return baseRow({
      factKind: kind,
      caseName: kind,
      scenario: null,
      dispatchOutcome: "rejected",
      providerRequestCount: 0,
      disabledPolicyVersion: 5,
      policyState: "disabled",
    });
  }
  return baseRow();
}

function fixture(resolveRows = (kind) => [rowFor(kind)]) {
  const calls = [];
  const reader = createPostgresBotReplyStagingDurableObservationReader({
    query: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        const rows = resolveRows(parameters[2]);
        return { rows, rowCount: rows.length };
      },
    },
  });
  return { reader, calls };
}

test("reads every durable staging fact from one exact PostgreSQL boundary", async () => {
  const { reader, calls } = fixture();
  const value = context();
  const scenarioResult = await reader.readScenario(
    { ...value, scenario: "text-send", expectedProviderErrorCode: null },
    allocatedCase("text-send"),
  );
  const retry = await reader.readProviderRetry(
    value,
    allocatedCase("provider-retry"),
  );
  const pair = await reader.readPairLimit(
    value,
    allocatedCase("pair-limit"),
  );
  const duplicate = await reader.readDuplicateSafety(
    value,
    allocatedCase("duplicate-safety"),
  );
  const killSwitch = await reader.readKillSwitch(
    value,
    allocatedCase("kill-switch"),
  );

  assert.equal(reader.isConfigured(), true);
  assert.equal(scenarioResult.dispatchOutcome, "accepted");
  assert.equal(retry.retryAfterSeconds, 16);
  assert.equal(pair.backoffPolicy, "meta-4-power-x");
  assert.deepEqual(duplicate.dispatchOutcomes, ["accepted", "duplicate"]);
  assert.equal(killSwitch.disabledPolicyVersion, 5);
  for (const result of [scenarioResult, retry, pair, duplicate, killSwitch]) {
    assert.match(result.recordDigest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(result.source, "durable-postgres");
    assert.equal(Object.isFrozen(result), true);
  }
  assert.equal(calls.length, 5);
  for (const [index, kind] of [
    "scenario",
    "provider-retry",
    "pair-limit",
    "duplicate-safety",
    "kill-switch",
  ].entries()) {
    assert.equal(calls[index].sql, postgresBotReplyStagingDurableObservationSql.read);
    assert.deepEqual(calls[index].parameters, [
      value.run.runKey,
      value.operationKey,
      kind,
    ]);
  }
});

test("rejects missing and ambiguous durable facts", async () => {
  const value = context();
  const missing = fixture(() => []).reader;
  await assert.rejects(
    () => missing.readProviderRetry(value, allocatedCase("provider-retry")),
    /observation is unavailable/,
  );
  const ambiguous = fixture((kind) => [rowFor(kind), rowFor(kind)]).reader;
  await assert.rejects(
    () => ambiguous.readPairLimit(value, allocatedCase("pair-limit")),
    /observation is unavailable/,
  );
});

test("rejects cross-run identity and extension fields", async () => {
  const value = context();
  const crossTenant = fixture(() => [rowFor("provider-retry")].map((row) => ({
    ...row,
    targetTenantId: 8,
  }))).reader;
  await assert.rejects(
    () => crossTenant.readProviderRetry(value, allocatedCase("provider-retry")),
    /cross-scope/,
  );

  const extended = fixture(() => [{ ...rowFor("scenario"), rawPayload: true }]).reader;
  await assert.rejects(
    () => extended.readScenario(
      { ...value, scenario: "text-send", expectedProviderErrorCode: null },
      allocatedCase("text-send"),
    ),
    /row shape/,
  );
});

test("rejects fact-specific values that do not prove the required control", async () => {
  const value = context();
  const invalidDuplicate = fixture(() => [rowFor("duplicate-safety")].map(
    (row) => ({ ...row, providerRequestCount: 2 }),
  )).reader;
  await assert.rejects(
    () => invalidDuplicate.readDuplicateSafety(
      value,
      allocatedCase("duplicate-safety"),
    ),
    /invalid duplicate observation/,
  );

  const invalidKillSwitch = fixture(() => [rowFor("kill-switch")].map(
    (row) => ({ ...row, disabledPolicyVersion: 6 }),
  )).reader;
  await assert.rejects(
    () => invalidKillSwitch.readKillSwitch(
      value,
      allocatedCase("kill-switch"),
    ),
    /invalid kill switch observation/,
  );

  const invalidScenario = fixture(() => [rowFor("scenario")].map(
    (row) => ({ ...row, dispatchOutcome: "rejected" }),
  )).reader;
  await assert.rejects(
    () => invalidScenario.readScenario(
      { ...value, scenario: "text-send", expectedProviderErrorCode: null },
      allocatedCase("text-send"),
    ),
    /invalid scenario observation/,
  );

  const extendedRetryFact = fixture(() => [rowFor("provider-retry")].map(
    (row) => ({ ...row, queueDeliveryCount: 2 }),
  )).reader;
  await assert.rejects(
    () => extendedRetryFact.readProviderRetry(
      value,
      allocatedCase("provider-retry"),
    ),
    /invalid provider retry observation/,
  );
});

test("rejects incomplete reader dependencies", () => {
  assert.throws(
    () => createPostgresBotReplyStagingDurableObservationReader({}),
    /dependencies are invalid/,
  );
});
