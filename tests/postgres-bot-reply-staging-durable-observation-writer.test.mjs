import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBotReplyStagingDurableObservationWriter,
  postgresBotReplyStagingDurableObservationWriterSql,
  postgresBotReplyStagingDurableObservationWriterVersion,
} from "../server/platform/postgresBotReplyStagingDurableObservationWriter.ts";

function common(digit = "1") {
  return {
    runKey: `bot_reply_staging_run_v1_${"a".repeat(64)}`,
    claimVersion: 2,
    operationKey: `bot_reply_staging_step_v1_${digit.repeat(64)}`,
    deliveryKey: `bot_reply_delivery_v1_${digit.repeat(64)}`,
    subjectDeliveryKey: `bot_reply_delivery_v1_${digit.repeat(64)}`,
    recipientFingerprint: `sha256:${"f".repeat(64)}`,
    observedAt: "2026-08-21T13:30:00.000Z",
  };
}

function records() {
  return [
    {
      ...common("1"),
      factKind: "scenario",
      caseName: "text-send",
      scenario: "text-send",
      providerErrorCode: null,
      dispatchOutcome: "accepted",
    },
    {
      ...common("2"),
      factKind: "provider-retry",
      caseName: "provider-retry",
      providerErrorCode: 130429,
      dispatchOutcome: "deferred",
      retryAfterSeconds: 16,
      cooldownScope: "sender",
    },
    {
      ...common("3"),
      factKind: "pair-limit",
      caseName: "pair-limit",
      providerErrorCode: 131056,
      dispatchOutcome: "deferred",
      cooldownScope: "pair",
      backoffPolicy: "meta-4-power-x",
    },
    {
      ...common("4"),
      factKind: "duplicate-safety",
      caseName: "duplicate-safety",
      firstDispatchOutcome: "accepted",
      secondDispatchOutcome: "duplicate",
      queueDeliveryCount: 2,
      providerRequestCount: 1,
    },
    {
      ...common("5"),
      factKind: "kill-switch",
      caseName: "kill-switch",
      dispatchOutcome: "rejected",
      disabledPolicyVersion: 5,
      policyState: "disabled",
      providerRequestCount: 0,
    },
  ];
}

function rowFromParameters(parameters) {
  return {
    eventKey: parameters[0],
    runKey: parameters[1],
    claimVersion: parameters[2],
    operationKey: parameters[3],
    deliveryKey: parameters[4],
    subjectDeliveryKey: parameters[5],
    caseName: parameters[6],
    factKind: parameters[7],
    scenario: parameters[8],
    providerErrorCode: parameters[9],
    dispatchOutcome: parameters[10],
    firstDispatchOutcome: parameters[11],
    secondDispatchOutcome: parameters[12],
    retryAfterSeconds: parameters[13],
    cooldownScope: parameters[14],
    backoffPolicy: parameters[15],
    queueDeliveryCount: parameters[16],
    providerRequestCount: parameters[17],
    disabledPolicyVersion: parameters[18],
    policyState: parameters[19],
    recipientFingerprint: parameters[20],
    observedAt: parameters[21],
  };
}

function fixture() {
  const calls = [];
  const stored = new Map();
  const transactions = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      return execute({
        async query(sql, parameters) {
          calls.push({ sql, parameters });
          if (sql === postgresBotReplyStagingDurableObservationWriterSql.insert) {
            const key = `${parameters[1]}:${parameters[3]}`;
            if (stored.has(key)) return { rows: [], rowCount: 0 };
            const row = rowFromParameters(parameters);
            stored.set(key, row);
            return { rows: [{ eventKey: row.eventKey }], rowCount: 1 };
          }
          assert.equal(
            sql,
            postgresBotReplyStagingDurableObservationWriterSql.readForUpdate,
          );
          const row = stored.get(`${parameters[0]}:${parameters[1]}`);
          return { rows: row ? [structuredClone(row)] : [], rowCount: row ? 1 : 0 };
        },
      });
    },
  };
  return {
    writer: createPostgresBotReplyStagingDurableObservationWriter(transactions),
    calls,
    stored,
  };
}

test("records every exact durable observation kind with deterministic identity", async () => {
  const { writer, calls } = fixture();
  assert.equal(
    postgresBotReplyStagingDurableObservationWriterVersion,
    "connect-postgres-bot-reply-staging-observation-writer-v1",
  );
  assert.equal(writer.isConfigured(), true);

  const results = [];
  for (const record of records()) {
    results.push(await writer.record(record));
  }

  assert.equal(results.every(({ outcome }) => outcome === "created"), true);
  assert.equal(new Set(results.map(({ eventKey }) => eventKey)).size, 5);
  for (const { eventKey } of results) {
    assert.match(eventKey, /^bot_reply_staging_observation_v1_[a-f0-9]{64}$/);
  }
  assert.equal(calls.length, 10);
  assert.equal(Object.isFrozen(writer), true);
  assert.equal(results.every(Object.isFrozen), true);
});

test("returns unchanged only for an exact persisted replay", async () => {
  const { writer } = fixture();
  const record = records()[0];
  const created = await writer.record(record);
  const replay = await writer.record(structuredClone(record));
  assert.deepEqual(replay, {
    outcome: "unchanged",
    eventKey: created.eventKey,
  });
});

test("rejects a conflicting replay without replacing durable evidence", async () => {
  const { writer, stored } = fixture();
  const record = records()[1];
  const created = await writer.record(record);
  await assert.rejects(
    () => writer.record({ ...record, retryAfterSeconds: 17 }),
    /conflicting staging observation/,
  );
  assert.equal(stored.size, 1);
  assert.equal([...stored.values()][0].eventKey, created.eventKey);
});

test("rejects extensions, invalid retry bounds, and invalid scenario subjects", async () => {
  const { writer } = fixture();
  await assert.rejects(
    () => writer.record({ ...records()[0], rawPayload: "forbidden" }),
    /scenario observation is invalid/,
  );
  await assert.rejects(
    () => writer.record({ ...records()[1], retryAfterSeconds: 86_401 }),
    /retry observation is invalid/,
  );
  await assert.rejects(
    () => writer.record({
      ...records()[0],
      subjectDeliveryKey: `bot_reply_delivery_v1_${"9".repeat(64)}`,
    }),
    /scenario observation is invalid/,
  );
});

test("rejects malformed dependency, identity, and zero where positive is required", async () => {
  assert.throws(
    () => createPostgresBotReplyStagingDurableObservationWriter({}),
    /writer dependency is invalid/,
  );
  const { writer } = fixture();
  await assert.rejects(
    () => writer.record({ ...records()[2], claimVersion: 0 }),
    /integer is invalid/,
  );
  await assert.rejects(
    () => writer.record({ ...records()[4], disabledPolicyVersion: 0 }),
    /integer is invalid/,
  );
});
