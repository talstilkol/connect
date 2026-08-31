import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBotReplyStagingSendObservationProducer,
  postgresBotReplyStagingSendObservationProducerSql,
  postgresBotReplyStagingSendObservationProducerVersion,
} from "../server/platform/postgresBotReplyStagingSendObservationProducer.ts";

function context(scenario = "text-send") {
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
    scenario,
    expectedProviderErrorCode:
      scenario === "customer-window-expired" ? 131047 : null,
  };
}

function allocatedCase(scenario = "text-send") {
  const value = context(scenario);
  return {
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: scenario,
    runKey: value.run.runKey,
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    subjectDeliveryKey: value.deliveryKey,
    targetTenantId: value.run.targetTenantId,
    connectionVersion: value.run.expectedConnectionVersion,
    policyVersion: value.run.expectedPolicyVersion,
    recipientFingerprint: value.run.recipientFingerprint,
    claimVersion: value.claim.claimVersion,
    leaseExpiresAt: value.claim.leaseExpiresAt,
    executionMode: "dispatch",
    serviceWindowOpenedAt: "2026-08-20T13:40:00.000Z",
    serviceWindowExpiresAt: "2026-08-21T13:40:00.000Z",
    caseFingerprint: `sha256:${"4".repeat(64)}`,
  };
}

function buttonReplyAllocatedCase() {
  const value = context("button-reply");
  return {
    ...allocatedCase("button-reply"),
    subjectDeliveryKey: `bot_reply_delivery_v1_${"7".repeat(64)}`,
    executionMode: "observe-only",
    serviceWindowOpenedAt: null,
    serviceWindowExpiresAt: null,
    deliveryKey: value.deliveryKey,
  };
}

function buttonReplyRow(overrides = {}) {
  return {
    messageKey: `message_v1_${"8".repeat(64)}`,
    tenantId: 7,
    selectedBotOptionKey: `bot_option_v1_${"9".repeat(64)}`,
    subjectDeliveryKey: buttonReplyAllocatedCase().subjectDeliveryKey,
    occurredAt: "2026-08-21T13:35:00.000Z",
    ...overrides,
  };
}

function row(scenario = "text-send", overrides = {}) {
  return {
    deliveryKey: context().deliveryKey,
    tenantId: 7,
    acceptedAt: "2026-08-21T13:30:00.000Z",
    providerAcceptedAt: "2026-08-21T13:30:00.000Z",
    replyKind: scenario === "text-send" ? "text" : "buttons",
    providerStatus: "accepted",
    reservationKey: `whatsapp_rate_reservation_v1_${"5".repeat(64)}`,
    ...overrides,
  };
}

function serviceWindowRejectionRow(overrides = {}) {
  return {
    deliveryKey: context("customer-window-expired").deliveryKey,
    tenantId: 7,
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    attemptedAt: "2026-08-21T13:30:00.000Z",
    rejectedAt: "2026-08-21T13:30:00.001Z",
    ...overrides,
  };
}

function duplicateSafetyRow(overrides = {}) {
  return {
    deliveryKey: context("duplicate-safety").deliveryKey,
    tenantId: 7,
    deliveryStatus: "accepted",
    deliveryClaimVersion: 1,
    requestStartedAt: "2026-08-21T13:29:59.999Z",
    acceptedAt: "2026-08-21T13:30:00.000Z",
    providerRequestCount: "1",
    providerAcceptanceCount: "1",
    ...overrides,
  };
}

function killSwitchRow(overrides = {}) {
  return {
    deliveryKey: context("kill-switch").deliveryKey,
    tenantId: 7,
    deliveryStatus: "pending",
    deliveryClaimVersion: 1,
    deferredAt: "2026-08-21T13:40:00.000Z",
    nextAttemptAt: "2026-08-21T13:41:00.000Z",
    deferralReasonCode: "WHATSAPP_ADMISSION_UNAVAILABLE",
    policyVersion: 5,
    policyState: "disabled",
    policyRecordedAt: "2026-08-21T13:40:00.000Z",
    providerRequestCount: "0",
    providerAcceptanceCount: "0",
    policyAuditCount: "1",
    ...overrides,
  };
}

function disabledPolicy(overrides = {}) {
  const value = context("kill-switch");
  return {
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    targetTenantId: 7,
    previousPolicyVersion: 4,
    disabledPolicyVersion: 5,
    state: "disabled",
    recordedAt: "2026-08-21T13:40:00.000Z",
    evidenceProof: "durable-policy-proof",
    ...overrides,
  };
}

function fixture(resolveRows = (_sql, _parameters, scenario) => [row(scenario)]) {
  const calls = [];
  const writes = [];
  let activeScenario = "text-send";
  const dependencies = {
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        const rows = resolveRows(sql, parameters, activeScenario);
        return { rows, rowCount: rows.length };
      },
    },
    writer: {
      isConfigured() {
        return true;
      },
      async record(input) {
        writes.push(structuredClone(input));
        return {
          outcome: "created",
          eventKey: `bot_reply_staging_observation_v1_${"6".repeat(64)}`,
        };
      },
    },
    clock: {
      now() {
        return new Date("2026-08-21T13:40:00.000Z");
      },
    },
  };
  return {
    producer: createPostgresBotReplyStagingSendObservationProducer(
      dependencies,
    ),
    calls,
    writes,
    dependencies,
    setScenario(value) {
      activeScenario = value;
    },
  };
}

test("records text acceptance only from the durable provider link", async () => {
  const current = fixture();
  const result = await current.producer.recordAcceptedSend(
    context(),
    allocatedCase(),
    { outcome: "accepted" },
  );

  assert.equal(
    postgresBotReplyStagingSendObservationProducerVersion,
    "connect-postgres-bot-reply-staging-send-observation-producer-v1",
  );
  assert.equal(current.producer.isConfigured(), true);
  assert.deepEqual(result, {
    outcome: "created",
    eventKey: `bot_reply_staging_observation_v1_${"6".repeat(64)}`,
  });
  assert.equal(
    current.calls[0].sql,
    postgresBotReplyStagingSendObservationProducerSql.readAcceptance,
  );
  assert.deepEqual(current.calls[0].parameters, [context().deliveryKey, 7]);
  assert.deepEqual(current.writes, [{
    runKey: context().run.runKey,
    claimVersion: 2,
    operationKey: context().operationKey,
    deliveryKey: context().deliveryKey,
    subjectDeliveryKey: context().deliveryKey,
    recipientFingerprint: context().run.recipientFingerprint,
    observedAt: "2026-08-21T13:30:00.000Z",
    factKind: "scenario",
    caseName: "text-send",
    scenario: "text-send",
    providerErrorCode: null,
    dispatchOutcome: "accepted",
  }]);
  assert.equal(Object.isFrozen(current.producer), true);
});

test("records a duplicate button dispatch from the same immutable acceptance", async () => {
  const current = fixture();
  current.setScenario("button-send");
  await current.producer.recordAcceptedSend(
    context("button-send"),
    allocatedCase("button-send"),
    { outcome: "duplicate" },
  );
  assert.equal(current.writes[0].scenario, "button-send");
  assert.equal(current.writes[0].dispatchOutcome, "duplicate");
});

test("records button-reply only from immutable inbound provenance", async () => {
  const current = fixture(() => [buttonReplyRow()]);
  const value = context("button-reply");
  const item = buttonReplyAllocatedCase();

  await current.producer.recordButtonReply(value, item);

  assert.equal(
    current.calls[0].sql,
    postgresBotReplyStagingSendObservationProducerSql.readButtonReply,
  );
  assert.deepEqual(current.calls[0].parameters, [
    item.subjectDeliveryKey,
    7,
    value.run.requestedAt,
    value.claim.leaseExpiresAt,
  ]);
  assert.deepEqual(current.writes[0], {
    runKey: value.run.runKey,
    claimVersion: 2,
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    subjectDeliveryKey: item.subjectDeliveryKey,
    recipientFingerprint: value.run.recipientFingerprint,
    observedAt: "2026-08-21T13:35:00.000Z",
    factKind: "scenario",
    caseName: "button-reply",
    scenario: "button-reply",
    providerErrorCode: null,
    dispatchOutcome: null,
  });
  assert.doesNotMatch(
    postgresBotReplyStagingSendObservationProducerSql.readButtonReply,
    /provider_message_id|reply_json|phone|text_content/,
  );
});

test("records 131047 only from immutable provider rejection provenance", async () => {
  const current = fixture(() => [serviceWindowRejectionRow()]);
  const value = context("customer-window-expired");
  const item = allocatedCase("customer-window-expired");

  await current.producer.recordServiceWindowRejection(
    value,
    item,
    { outcome: "rejected" },
  );

  assert.equal(
    current.calls[0].sql,
    postgresBotReplyStagingSendObservationProducerSql
      .readServiceWindowRejection,
  );
  assert.deepEqual(current.calls[0].parameters, [value.deliveryKey, 7]);
  assert.deepEqual(current.writes[0], {
    runKey: value.run.runKey,
    claimVersion: 2,
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    subjectDeliveryKey: item.subjectDeliveryKey,
    recipientFingerprint: value.run.recipientFingerprint,
    observedAt: "2026-08-21T13:30:00.000Z",
    factKind: "scenario",
    caseName: "customer-window-expired",
    scenario: "customer-window-expired",
    providerErrorCode: 131047,
    dispatchOutcome: "rejected",
  });
  assert.doesNotMatch(
    postgresBotReplyStagingSendObservationProducerSql
      .readServiceWindowRejection,
    /reservation_key|provider_message_id|reply_json|phone|text_content/,
  );
});

test("records duplicate safety only from one durable request fence and acceptance", async () => {
  const current = fixture(() => [duplicateSafetyRow()]);
  const value = context("duplicate-safety");
  const item = allocatedCase("duplicate-safety");
  const dispatches = [{ outcome: "accepted" }, { outcome: "duplicate" }];

  await current.producer.recordDuplicateSafety(value, item, dispatches);

  assert.equal(
    current.calls[0].sql,
    postgresBotReplyStagingSendObservationProducerSql.readDuplicateSafety,
  );
  assert.deepEqual(current.calls[0].parameters, [value.deliveryKey, 7]);
  assert.deepEqual(current.writes[0], {
    runKey: value.run.runKey,
    claimVersion: 2,
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    subjectDeliveryKey: item.subjectDeliveryKey,
    recipientFingerprint: value.run.recipientFingerprint,
    observedAt: "2026-08-21T13:30:00.000Z",
    factKind: "duplicate-safety",
    caseName: "duplicate-safety",
    firstDispatchOutcome: "accepted",
    secondDispatchOutcome: "duplicate",
    queueDeliveryCount: 2,
    providerRequestCount: 1,
  });
  assert.doesNotMatch(
    postgresBotReplyStagingSendObservationProducerSql.readDuplicateSafety,
    /provider_message_id|reply_json|phone|text_content|request_key/,
  );
});

test("records kill switch only from disabled policy and zero provider requests", async () => {
  const current = fixture(() => [killSwitchRow()]);
  const value = context("kill-switch");
  const item = allocatedCase("kill-switch");
  const disabled = disabledPolicy();
  const dispatch = {
    outcome: "deferred",
    retryAt: "2026-08-21T13:41:00.000Z",
  };

  const result = await current.producer.recordKillSwitch(
    value,
    item,
    disabled,
    dispatch,
  );

  assert.deepEqual(result, {
    outcome: "created",
    eventKey: `bot_reply_staging_observation_v1_${"6".repeat(64)}`,
  });
  assert.equal(
    current.calls[0].sql,
    postgresBotReplyStagingSendObservationProducerSql.readKillSwitch,
  );
  assert.deepEqual(current.calls[0].parameters, [
    value.deliveryKey,
    7,
    5,
    3,
    4,
  ]);
  assert.deepEqual(current.writes, [{
    runKey: value.run.runKey,
    claimVersion: 2,
    operationKey: value.operationKey,
    deliveryKey: value.deliveryKey,
    subjectDeliveryKey: value.deliveryKey,
    recipientFingerprint: value.run.recipientFingerprint,
    observedAt: "2026-08-21T13:40:00.000Z",
    factKind: "kill-switch",
    caseName: "kill-switch",
    dispatchOutcome: "deferred",
    disabledPolicyVersion: 5,
    policyState: "disabled",
    providerRequestCount: 0,
  }]);
  assert.doesNotMatch(
    postgresBotReplyStagingSendObservationProducerSql.readKillSwitch,
    /recipient_phone_e164|reply_json|provider_message_id AS|text_content/,
  );
});

test("rejects forged, stale, requested, accepted, and unaudited kill switches", async () => {
  const value = context("kill-switch");
  const item = allocatedCase("kill-switch");
  const disabled = disabledPolicy();
  const dispatch = {
    outcome: "deferred",
    retryAt: "2026-08-21T13:41:00.000Z",
  };
  for (const rows of [[], [killSwitchRow(), killSwitchRow()]]) {
    await assert.rejects(() => fixture(() => rows).producer.recordKillSwitch(
      value,
      item,
      disabled,
      dispatch,
    ));
  }
  for (const overrides of [
    { tenantId: 8 },
    { deliveryStatus: "sending" },
    { deferralReasonCode: "META_CONNECTION_UNAVAILABLE" },
    { policyVersion: 6 },
    { policyState: "enabled" },
    { providerRequestCount: "1" },
    { providerAcceptanceCount: "1" },
    { policyAuditCount: "0" },
    { policyRecordedAt: "2026-08-21T12:59:59.999Z" },
    { deferredAt: "2026-08-21T13:39:59.999Z" },
    { nextAttemptAt: "2026-08-21T13:42:00.000Z" },
    { recipientPhoneNumber: "+972500000000" },
  ]) {
    await assert.rejects(() => fixture(() => [
      killSwitchRow(overrides),
    ]).producer.recordKillSwitch(value, item, disabled, dispatch));
  }
  await assert.rejects(() => fixture(() => [killSwitchRow()]).producer
    .recordKillSwitch(value, item, disabled, { outcome: "rejected" }));
  await assert.rejects(() => fixture(() => [killSwitchRow()]).producer
    .recordKillSwitch(
      value,
      item,
      disabledPolicy({ disabledPolicyVersion: 6 }),
      dispatch,
    ));
});

test("rejects missing, multiple, forged, stale, and repeated provider requests", async () => {
  const value = context("duplicate-safety");
  const item = allocatedCase("duplicate-safety");
  const dispatches = [{ outcome: "accepted" }, { outcome: "duplicate" }];
  for (const rows of [
    [],
    [duplicateSafetyRow(), duplicateSafetyRow()],
  ]) {
    await assert.rejects(() => fixture(() => rows).producer
      .recordDuplicateSafety(value, item, dispatches));
  }
  for (const overrides of [
    { tenantId: 8 },
    { deliveryStatus: "sending" },
    { providerRequestCount: "2" },
    { providerAcceptanceCount: "2" },
    { requestStartedAt: "2026-08-21T12:59:59.999Z" },
    { acceptedAt: "2026-08-21T14:00:00.001Z" },
    { providerMessageId: "forbidden" },
  ]) {
    await assert.rejects(() => fixture(() => [
      duplicateSafetyRow(overrides),
    ]).producer.recordDuplicateSafety(value, item, dispatches));
  }
  await assert.rejects(() => fixture(() => [duplicateSafetyRow()]).producer
    .recordDuplicateSafety(
      value,
      item,
      [{ outcome: "accepted" }, { outcome: "accepted" }],
    ));
});

test("rejects missing, forged, stale, and extended 131047 facts", async () => {
  for (const rows of [
    [],
    [serviceWindowRejectionRow(), serviceWindowRejectionRow()],
  ]) {
    await assert.rejects(() => fixture(() => rows).producer
      .recordServiceWindowRejection(
        context("customer-window-expired"),
        allocatedCase("customer-window-expired"),
        { outcome: "rejected" },
      ));
  }
  for (const overrides of [
    { tenantId: 8 },
    { providerErrorCode: 131056 },
    { reasonCode: "META_PAIR_RATE_LIMITED" },
    { attemptedAt: "2026-08-21T12:59:59.999Z" },
    { rejectedAt: "2026-08-21T14:00:00.001Z" },
    { reservationKey: "forbidden" },
  ]) {
    await assert.rejects(() => fixture(() => [
      serviceWindowRejectionRow(overrides),
    ]).producer.recordServiceWindowRejection(
      context("customer-window-expired"),
      allocatedCase("customer-window-expired"),
      { outcome: "rejected" },
    ));
  }
});

test("rejects missing, ambiguous, cross-tenant, stale, and extended button replies", async () => {
  for (const rows of [
    [],
    [buttonReplyRow(), buttonReplyRow()],
  ]) {
    await assert.rejects(
      () => fixture(() => rows).producer.recordButtonReply(
        context("button-reply"),
        buttonReplyAllocatedCase(),
      ),
      /observation is unavailable/,
    );
  }
  for (const overrides of [
    { tenantId: 8 },
    { occurredAt: "2026-08-21T12:59:59.999Z" },
    { providerMessageId: "forbidden" },
  ]) {
    await assert.rejects(() => fixture(() => [
      buttonReplyRow(overrides),
    ]).producer.recordButtonReply(
      context("button-reply"),
      buttonReplyAllocatedCase(),
    ));
  }
});

test("rejects missing, ambiguous, cross-tenant, and mismatched reply facts", async () => {
  for (const producer of [
    fixture(() => []).producer,
    fixture((_sql, _parameters, scenario) => [row(scenario), row(scenario)])
      .producer,
  ]) {
    await assert.rejects(
      () => producer.recordAcceptedSend(
        context(),
        allocatedCase(),
        { outcome: "accepted" },
      ),
      /observation is unavailable/,
    );
  }
  const crossTenant = fixture((_sql, _parameters, scenario) => [
    row(scenario, { tenantId: 8 }),
  ]).producer;
  await assert.rejects(
    () => crossTenant.recordAcceptedSend(
      context(),
      allocatedCase(),
      { outcome: "accepted" },
    ),
    /scope is invalid/,
  );
  const wrongKind = fixture((_sql, _parameters, scenario) => [
    row(scenario, { replyKind: "buttons" }),
  ]).producer;
  await assert.rejects(
    () => wrongKind.recordAcceptedSend(
      context(),
      allocatedCase(),
      { outcome: "accepted" },
    ),
    /scope is invalid/,
  );
});

test("rejects mismatched, stale, future, and extended acceptance rows", async () => {
  for (const overrides of [
    { providerAcceptedAt: "2026-08-21T13:30:00.001Z" },
    {
      acceptedAt: "2026-08-21T12:59:59.999Z",
      providerAcceptedAt: "2026-08-21T12:59:59.999Z",
    },
    {
      acceptedAt: "2026-08-21T13:41:00.000Z",
      providerAcceptedAt: "2026-08-21T13:41:00.000Z",
    },
    { providerMessageId: "forbidden" },
  ]) {
    const producer = fixture((_sql, _parameters, scenario) => [
      row(scenario, overrides),
    ]).producer;
    await assert.rejects(() => producer.recordAcceptedSend(
      context(),
      allocatedCase(),
      { outcome: "accepted" },
    ));
  }
});

test("fails closed for unsupported scenarios, outcomes, and dependencies", async () => {
  const current = fixture();
  await assert.rejects(
    () => current.producer.recordAcceptedSend(
      context("button-reply"),
      allocatedCase("button-reply"),
      { outcome: "accepted" },
    ),
    /not acceptance-backed/,
  );
  await assert.rejects(
    () => current.producer.recordAcceptedSend(
      context(),
      allocatedCase(),
      { outcome: "rejected" },
    ),
    /scope is invalid/,
  );
  current.dependencies.writer.isConfigured = () => false;
  assert.equal(current.producer.isConfigured(), false);
  await assert.rejects(
    () => current.producer.recordAcceptedSend(
      context(),
      allocatedCase(),
      { outcome: "duplicate" },
    ),
    /producer is unavailable/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingSendObservationProducer({}),
    /dependency is invalid/,
  );
});
