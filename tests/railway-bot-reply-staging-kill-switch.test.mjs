import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayBotReplyStagingKillSwitch,
  RailwayBotReplyStagingKillSwitchError,
} from "../server/platform/railwayBotReplyStagingKillSwitch.ts";

const operationKey = `bot_reply_staging_step_v1_${"a".repeat(64)}`;
const deliveryKey = `bot_reply_delivery_v1_${"b".repeat(64)}`;

function policy(overrides = {}) {
  return {
    eventKey: `whatsapp_delivery_policy_event_v1_${"c".repeat(64)}`,
    tenantId: 7,
    connectionVersion: 3,
    policyVersion: 4,
    deliveryState: "enabled",
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 1_000,
    },
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 64,
    },
    reservationDurationSeconds: 600,
    metaGraphApiVersion: "v24.0",
    evidenceDigest: `sha256:${"d".repeat(64)}`,
    evidenceCheckedAt: "2026-08-24T09:00:00.000Z",
    evidenceExpiresAt: "2026-08-24T11:00:00.000Z",
    actorExternalUserId: "system-admin-approver",
    recordedAt: "2026-08-24T09:01:00.000Z",
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    operationKey,
    deliveryKey,
    targetTenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    actorExternalUserId: "system-admin-primary",
    ...overrides,
  };
}

function fixture({ current = policy(), mutation, readFailure, writeFailure } = {}) {
  const calls = [];
  const adapter = createRailwayBotReplyStagingKillSwitch({
    policies: {
      async findLatestPolicyEvent(tenantId) {
        calls.push({ kind: "read", tenantId });
        if (readFailure) throw new Error("private policy read failure");
        return current === null ? null : structuredClone(current);
      },
      async recordPolicyEvent(command) {
        calls.push({ kind: "write", command: structuredClone(command) });
        if (writeFailure) throw new Error("private policy write failure");
        if (mutation) return structuredClone(mutation);
        return {
          outcome: "updated",
          record: policy({
            eventKey:
              `whatsapp_delivery_policy_event_v1_${"e".repeat(64)}`,
            policyVersion: 5,
            deliveryState: "disabled",
            actorExternalUserId: command.actorExternalUserId,
            recordedAt: command.recordedAt,
          }),
        };
      },
    },
    clock: { now: () => new Date("2026-08-24T10:05:00.000Z") },
  });
  return { adapter, calls };
}

function expectsError(code) {
  return (error) =>
    error instanceof RailwayBotReplyStagingKillSwitchError &&
    error.code === code && error.message === code &&
    !error.message.includes("private");
}

test("records one atomic disabled snapshot and returns a bounded proof", async () => {
  const { adapter, calls } = fixture();
  const result = await adapter.disable(request());

  assert.equal(adapter.isConfigured(), true);
  assert.deepEqual(result, {
    operationKey,
    deliveryKey,
    targetTenantId: 7,
    previousPolicyVersion: 4,
    disabledPolicyVersion: 5,
    state: "disabled",
    recordedAt: "2026-08-24T10:05:00.000Z",
    evidenceProof: result.evidenceProof,
  });
  assert.match(
    result.evidenceProof,
    /^bot-reply-staging-kill-switch-proof-v1:[a-f0-9]{64}$/,
  );
  assert.deepEqual(calls[0], { kind: "read", tenantId: 7 });
  assert.deepEqual(calls[1].command, {
    tenantId: 7,
    connectionVersion: 3,
    expectedPolicyVersion: 4,
    deliveryState: "disabled",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 1_000,
    phoneThroughputMessagesPerSecond: 80,
    maximumOutboundMessagesPerSecond: 64,
    reservationDurationSeconds: 600,
    metaGraphApiVersion: "v24.0",
    evidenceDigest: `sha256:${"d".repeat(64)}`,
    evidenceCheckedAt: "2026-08-24T09:00:00.000Z",
    evidenceExpiresAt: "2026-08-24T11:00:00.000Z",
    actorExternalUserId: "system-admin-primary",
    recordedAt: "2026-08-24T10:05:00.000Z",
  });
});

test("accepts only an idempotent disabled replay by the same actor", async () => {
  const disabled = policy({
    eventKey: `whatsapp_delivery_policy_event_v1_${"e".repeat(64)}`,
    policyVersion: 5,
    deliveryState: "disabled",
    actorExternalUserId: "system-admin-primary",
    recordedAt: "2026-08-24T10:04:00.000Z",
  });
  const { adapter } = fixture({
    current: disabled,
    mutation: { outcome: "unchanged", record: disabled },
  });
  const result = await adapter.disable(request());
  assert.equal(result.disabledPolicyVersion, 5);
  assert.equal(result.recordedAt, disabled.recordedAt);

  const anotherActor = fixture({
    current: { ...disabled, actorExternalUserId: "another-admin" },
  });
  await assert.rejects(
    anotherActor.adapter.disable(request()),
    expectsError("BOT_REPLY_STAGING_KILL_SWITCH_POLICY_INVALID"),
  );
});

test("rejects stale policy, connection mismatch, and altered write result", async () => {
  for (const current of [
    null,
    policy({ tenantId: 8 }),
    policy({ connectionVersion: 4 }),
    policy({ policyVersion: 3 }),
    policy({ deliveryState: "disabled" }),
  ]) {
    await assert.rejects(
      fixture({ current }).adapter.disable(request()),
      expectsError("BOT_REPLY_STAGING_KILL_SWITCH_POLICY_INVALID"),
    );
  }

  const altered = fixture({
    mutation: {
      outcome: "updated",
      record: policy({
        policyVersion: 5,
        deliveryState: "disabled",
        actorExternalUserId: "system-admin-primary",
        reservationDurationSeconds: 601,
      }),
    },
  });
  await assert.rejects(
    altered.adapter.disable(request()),
    expectsError("BOT_REPLY_STAGING_KILL_SWITCH_WRITE_FAILED"),
  );
});

test("sanitizes malformed input and repository failures", async () => {
  await assert.rejects(
    fixture().adapter.disable({ ...request(), extension: true }),
    expectsError("BOT_REPLY_STAGING_KILL_SWITCH_REQUEST_INVALID"),
  );
  await assert.rejects(
    fixture({ readFailure: true }).adapter.disable(request()),
    expectsError("BOT_REPLY_STAGING_KILL_SWITCH_POLICY_INVALID"),
  );
  await assert.rejects(
    fixture({ writeFailure: true }).adapter.disable(request()),
    expectsError("BOT_REPLY_STAGING_KILL_SWITCH_WRITE_FAILED"),
  );
  assert.throws(
    () => createRailwayBotReplyStagingKillSwitch({}),
    expectsError("BOT_REPLY_STAGING_KILL_SWITCH_CONFIGURATION_INVALID"),
  );
});
