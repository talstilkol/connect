import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBotReplyStagingWebhookObservationProducer,
  postgresBotReplyStagingWebhookObservationProducerSql,
  postgresBotReplyStagingWebhookObservationProducerVersion,
} from "../server/platform/postgresBotReplyStagingWebhookObservationProducer.ts";

function context(scenario = "status-sent") {
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
    expectedProviderErrorCode: null,
  };
}

function allocatedCase(scenario = "status-sent") {
  const value = context(scenario);
  return {
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: scenario,
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
    executionMode: "observe-only",
    serviceWindowOpenedAt: null,
    serviceWindowExpiresAt: null,
    caseFingerprint: `sha256:${"5".repeat(64)}`,
  };
}

function statusForScenario(scenario) {
  return scenario === "status-sent"
    ? "sent"
    : scenario === "status-delivered"
      ? "delivered"
      : "read";
}

function row(scenario = "status-sent", overrides = {}) {
  return {
    deliveryKey: allocatedCase(scenario).subjectDeliveryKey,
    tenantId: 7,
    providerStatus: statusForScenario(scenario),
    lastStatusEventKey: "6".repeat(64),
    lastStatusEventAt: "2026-08-21T13:30:00.000Z",
    acceptedAt: "2026-08-21T13:10:00.000Z",
    updatedAt: "2026-08-21T13:35:00.000Z",
    ...overrides,
  };
}

function fixture(resolveRows = (_sql, _parameters, scenario) => [row(scenario)]) {
  const calls = [];
  const writes = [];
  let activeScenario = "status-sent";
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
        return Object.freeze({
          outcome: "created",
          eventKey: `bot_reply_staging_observation_v1_${"7".repeat(64)}`,
        });
      },
    },
    clock: {
      now() {
        return new Date("2026-08-21T13:40:00.000Z");
      },
    },
  };
  const producer = createPostgresBotReplyStagingWebhookObservationProducer(
    dependencies,
  );
  return {
    producer,
    calls,
    writes,
    dependencies,
    setScenario(value) {
      activeScenario = value;
    },
  };
}

test("records a webhook status only from the exact durable provider projection", async () => {
  const { producer, calls, writes } = fixture();
  const result = await producer.recordStatus(
    context("status-sent"),
    allocatedCase("status-sent"),
  );

  assert.equal(
    postgresBotReplyStagingWebhookObservationProducerVersion,
    "connect-postgres-bot-reply-staging-webhook-observation-producer-v1",
  );
  assert.equal(producer.isConfigured(), true);
  assert.deepEqual(result, {
    outcome: "created",
    eventKey: `bot_reply_staging_observation_v1_${"7".repeat(64)}`,
  });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].sql,
    postgresBotReplyStagingWebhookObservationProducerSql.readStatus,
  );
  assert.match(
    calls[0].sql,
    /INNER JOIN bot_reply_provider_request_claims AS request/,
  );
  assert.match(
    calls[0].sql,
    /request\.reservation_key = link\.reservation_key/,
  );
  assert.deepEqual(calls[0].parameters, [
    allocatedCase().subjectDeliveryKey,
    7,
  ]);
  assert.deepEqual(writes, [{
    runKey: context().run.runKey,
    claimVersion: 2,
    operationKey: context().operationKey,
    deliveryKey: context().deliveryKey,
    subjectDeliveryKey: allocatedCase().subjectDeliveryKey,
    recipientFingerprint: context().run.recipientFingerprint,
    observedAt: "2026-08-21T13:35:00.000Z",
    factKind: "scenario",
    caseName: "status-sent",
    scenario: "status-sent",
    providerErrorCode: null,
    dispatchOutcome: null,
  }]);
  assert.equal(Object.isFrozen(producer), true);
});

test("maps sent, delivered, and read without weakening exact status", async () => {
  const testFixture = fixture();
  for (const scenario of ["status-sent", "status-delivered", "status-read"]) {
    testFixture.setScenario(scenario);
    const value = context(scenario);
    value.operationKey = `bot_reply_staging_step_v1_${String(
      ["status-sent", "status-delivered", "status-read"].indexOf(scenario) + 3,
    ).repeat(64)}`;
    const allocated = { ...allocatedCase(scenario), operationKey: value.operationKey };
    await testFixture.producer.recordStatus(value, allocated);
  }
  assert.deepEqual(
    testFixture.writes.map(({ scenario }) => scenario),
    ["status-sent", "status-delivered", "status-read"],
  );
});

test("rejects missing, ambiguous, cross-tenant, and progressed status facts", async () => {
  const missing = fixture(() => []).producer;
  await assert.rejects(
    () => missing.recordStatus(context(), allocatedCase()),
    /observation is unavailable/,
  );
  const ambiguous = fixture((_sql, _parameters, scenario) => [
    row(scenario),
    row(scenario),
  ]).producer;
  await assert.rejects(
    () => ambiguous.recordStatus(context(), allocatedCase()),
    /observation is unavailable/,
  );
  const crossTenant = fixture((_sql, _parameters, scenario) => [
    row(scenario, { tenantId: 8 }),
  ]).producer;
  await assert.rejects(
    () => crossTenant.recordStatus(context(), allocatedCase()),
    /scope is invalid/,
  );
  const progressed = fixture((_sql, _parameters, scenario) => [
    row(scenario, { providerStatus: "delivered" }),
  ]).producer;
  await assert.rejects(
    () => progressed.recordStatus(context(), allocatedCase()),
    /scope is invalid/,
  );
});

test("rejects stale, future, inconsistent, and extended webhook projections", async () => {
  for (const overrides of [
    { updatedAt: "2026-08-21T12:59:59.999Z" },
    { updatedAt: "2026-08-21T13:41:00.000Z" },
    {
      acceptedAt: "2026-08-21T13:36:00.000Z",
      updatedAt: "2026-08-21T13:35:00.000Z",
    },
    { providerPayload: "forbidden" },
  ]) {
    const producer = fixture((_sql, _parameters, scenario) => [
      row(scenario, overrides),
    ]).producer;
    await assert.rejects(
      () => producer.recordStatus(context(), allocatedCase()),
    );
  }
});

test("fails closed for non-webhook scenarios and unavailable dependencies", async () => {
  const testFixture = fixture();
  await assert.rejects(
    () => testFixture.producer.recordStatus(
      context("button-reply"),
      allocatedCase("button-reply"),
    ),
    /not webhook-backed/,
  );
  testFixture.dependencies.writer.isConfigured = () => false;
  assert.equal(testFixture.producer.isConfigured(), false);
  await assert.rejects(
    () => testFixture.producer.recordStatus(context(), allocatedCase()),
    /producer is unavailable/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingWebhookObservationProducer({}),
    /dependency is invalid/,
  );
});
