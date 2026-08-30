import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createPostgresBotReplyStagingProviderDeferralObservationProducer,
  postgresBotReplyStagingProviderDeferralObservationProducerSql,
  postgresBotReplyStagingProviderDeferralObservationProducerVersion,
} from "../server/platform/postgresBotReplyStagingProviderDeferralObservationProducer.ts";
import {
  postgresBotReplyProviderDeferralVersion,
} from "../server/platform/postgresBotReplyDeliveryRepository.ts";

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

function allocatedCase(caseName = "provider-retry") {
  const value = context();
  return {
    schemaVersion: 1,
    source: "durable-postgres",
    caseName,
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

function eventKey(identity) {
  return `bot_reply_provider_deferral_v1_${createHash("sha256")
    .update(postgresBotReplyProviderDeferralVersion)
    .update("\0")
    .update(JSON.stringify(identity))
    .digest("hex")}`;
}

function row(caseName = "provider-retry", overrides = {}) {
  const sender = caseName === "provider-retry";
  const identity = {
    deliveryKey: context().deliveryKey,
    tenantId: 7,
    claimVersion: 5,
    reservationKey: `whatsapp_rate_reservation_v1_${"5".repeat(64)}`,
    providerErrorCode: sender ? 130429 : 131056,
    cooldownScope: sender ? "sender" : "pair",
    retryAfterSeconds: 60,
    reasonCode: sender
      ? "META_PHONE_THROUGHPUT_LIMITED"
      : "META_PAIR_RATE_LIMITED",
    attemptedAt: "2026-08-21T13:30:00.000Z",
    deferredAt: "2026-08-21T13:30:00.100Z",
    retryAt: "2026-08-21T13:31:00.000Z",
    ...overrides,
  };
  return {
    eventKey: eventKey(identity),
    ...identity,
  };
}

function fixture(resolveRows = (_sql, _parameters, activeCase) => [row(activeCase)]) {
  const calls = [];
  const writes = [];
  let activeCase = "provider-retry";
  const dependencies = {
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        const rows = resolveRows(sql, parameters, activeCase);
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
        return new Date("2026-08-21T13:30:30.000Z");
      },
    },
  };
  return {
    producer:
      createPostgresBotReplyStagingProviderDeferralObservationProducer(
        dependencies,
      ),
    calls,
    writes,
    dependencies,
    setCase(value) {
      activeCase = value;
    },
  };
}

test("records 130429 only from the current durable provider deferral", async () => {
  const current = fixture();
  const dispatch = {
    outcome: "deferred",
    retryAt: "2026-08-21T13:31:00.000Z",
  };
  const result = await current.producer.recordDeferral(
    context(),
    allocatedCase(),
    dispatch,
  );

  assert.equal(
    postgresBotReplyStagingProviderDeferralObservationProducerVersion,
    "connect-postgres-bot-reply-staging-provider-deferral-observation-producer-v1",
  );
  assert.equal(current.producer.isConfigured(), true);
  assert.deepEqual(result, {
    outcome: "created",
    eventKey: `bot_reply_staging_observation_v1_${"6".repeat(64)}`,
  });
  assert.equal(current.calls[0].sql,
    postgresBotReplyStagingProviderDeferralObservationProducerSql
      .readCurrentDeferral);
  assert.deepEqual(current.calls[0].parameters, [context().deliveryKey, 7]);
  assert.deepEqual(current.writes, [{
    runKey: context().run.runKey,
    claimVersion: 2,
    operationKey: context().operationKey,
    deliveryKey: context().deliveryKey,
    subjectDeliveryKey: context().deliveryKey,
    recipientFingerprint: context().run.recipientFingerprint,
    observedAt: "2026-08-21T13:30:00.000Z",
    factKind: "provider-retry",
    caseName: "provider-retry",
    providerErrorCode: 130429,
    dispatchOutcome: "deferred",
    retryAfterSeconds: 60,
    cooldownScope: "sender",
  }]);
  assert.equal(Object.isFrozen(current.producer), true);
});

test("records 131056 as pair evidence without scenario-derived limits", async () => {
  const current = fixture();
  current.setCase("pair-limit");
  await current.producer.recordDeferral(
    context(),
    allocatedCase("pair-limit"),
    { outcome: "duplicate" },
  );
  assert.deepEqual(current.writes[0], {
    runKey: context().run.runKey,
    claimVersion: 2,
    operationKey: context().operationKey,
    deliveryKey: context().deliveryKey,
    subjectDeliveryKey: context().deliveryKey,
    recipientFingerprint: context().run.recipientFingerprint,
    observedAt: "2026-08-21T13:30:00.000Z",
    factKind: "pair-limit",
    caseName: "pair-limit",
    providerErrorCode: 131056,
    dispatchOutcome: "duplicate",
    cooldownScope: "pair",
    backoffPolicy: "meta-4-power-x",
  });
});

test("rejects missing, ambiguous, cross-tenant, and mismatched cases", async () => {
  for (const producer of [
    fixture(() => []).producer,
    fixture((_sql, _parameters, activeCase) => [row(activeCase), row(activeCase)])
      .producer,
  ]) {
    await assert.rejects(
      () => producer.recordDeferral(
        context(),
        allocatedCase(),
        { outcome: "deferred", retryAt: row().retryAt },
      ),
      /observation is unavailable/,
    );
  }
  const crossTenant = fixture((_sql, _parameters, activeCase) => [
    row(activeCase, { tenantId: 8 }),
  ]).producer;
  await assert.rejects(
    () => crossTenant.recordDeferral(
      context(),
      allocatedCase(),
      { outcome: "deferred", retryAt: row().retryAt },
    ),
  );
  const mismatched = fixture(() => [row("pair-limit")]).producer;
  await assert.rejects(
    () => mismatched.recordDeferral(
      context(),
      allocatedCase(),
      { outcome: "deferred", retryAt: row("pair-limit").retryAt },
    ),
    /scope is invalid/,
  );
});

test("rejects changed digests, invalid timing, stale facts, and retry conflicts", async () => {
  const cases = [
    {
      producer: fixture((_sql, _parameters, activeCase) => [{
        ...row(activeCase),
        eventKey: `bot_reply_provider_deferral_v1_${"9".repeat(64)}`,
      }]).producer,
      dispatch: { outcome: "deferred", retryAt: row().retryAt },
    },
    {
      producer: fixture((_sql, _parameters, activeCase) => [row(activeCase, {
        deferredAt: "2026-08-21T13:29:59.999Z",
      })]).producer,
      dispatch: { outcome: "deferred", retryAt: row().retryAt },
    },
    {
      producer: fixture((_sql, _parameters, activeCase) => [row(activeCase, {
        attemptedAt: "2026-08-21T12:59:00.000Z",
        deferredAt: "2026-08-21T12:59:00.100Z",
        retryAt: "2026-08-21T13:00:00.000Z",
      })]).producer,
      dispatch: { outcome: "deferred", retryAt: "2026-08-21T13:00:00.000Z" },
    },
    {
      producer: fixture().producer,
      dispatch: { outcome: "deferred", retryAt: "2026-08-21T13:32:00.000Z" },
    },
  ];
  for (const current of cases) {
    await assert.rejects(() => current.producer.recordDeferral(
      context(),
      allocatedCase(),
      current.dispatch,
    ));
  }
});

test("fails closed for unavailable dependencies and unsupported outcomes", async () => {
  const current = fixture();
  await assert.rejects(
    () => current.producer.recordDeferral(
      context(),
      allocatedCase(),
      { outcome: "accepted" },
    ),
    /scope is invalid/,
  );
  current.dependencies.writer.isConfigured = () => false;
  assert.equal(current.producer.isConfigured(), false);
  await assert.rejects(
    () => current.producer.recordDeferral(
      context(),
      allocatedCase(),
      { outcome: "duplicate" },
    ),
    /producer is unavailable/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingProviderDeferralObservationProducer({}),
    /dependency is invalid/,
  );
});
