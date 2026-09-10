import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createNodePostgresBotReplyStagingProviderFenceWorkerCapability,
} from "../server/platform/nodePostgresBotReplyStagingProviderFenceWorkerCapability.ts";

const runKey = `bot_reply_staging_run_v1_${"1".repeat(64)}`;
const tenantId = 7;
const requestDigest = `sha256:${"2".repeat(64)}`;
const releaseId = `connect_release_v1_${"3".repeat(64)}`;
const commitSha = "4".repeat(40);
const artifactDigest = `sha256:${"5".repeat(64)}`;
const runLeaseExpiresAt = "2026-08-25T12:30:00.000Z";
const operationKey = `bot_reply_staging_step_v1_${"6".repeat(64)}`;
const deliveryKey = `bot_reply_delivery_v1_${"7".repeat(64)}`;
const reservationKey =
  `whatsapp_rate_reservation_v1_${"8".repeat(64)}`;
const requestedAt = "2026-08-25T12:20:00.000Z";
const observationKey =
  `bot_reply_staging_observation_v1_${"a".repeat(64)}`;
const finalizedAt = "2026-08-25T12:21:00.000Z";

function auditKeyFor(currentRunKey, currentRequestDigest) {
  const digest = createHash("sha256")
    .update(currentRunKey, "utf8")
    .update("\0", "utf8")
    .update(currentRequestDigest, "utf8")
    .digest("hex");
  return `bot_reply_staging_audit_v1_${digest}`;
}

function providerRequestKeyFor(request, timestamp) {
  const digest = createHash("sha256")
    .update(
      "connect-bot-reply-staging-provider-operation-request-v1",
      "utf8",
    )
    .update("\0", "utf8")
    .update(request.runKey, "utf8")
    .update("\0", "utf8")
    .update(request.requestDigest, "utf8")
    .update("\0", "utf8")
    .update(request.operationKey, "utf8")
    .update("\0", "utf8")
    .update(request.deliveryKey, "utf8")
    .update("\0", "utf8")
    .update(String(request.deliveryClaimVersion), "utf8")
    .update("\0", "utf8")
    .update(request.reservationKey, "utf8")
    .update("\0", "utf8")
    .update(timestamp, "utf8")
    .digest("hex");
  return `bot_reply_provider_request_v1_${digest}`;
}

function input(overrides = {}) {
  const value = {
    runKey,
    tenantId,
    requestDigest,
    auditKey: auditKeyFor(runKey, requestDigest),
    releaseId,
    commitSha,
    artifactDigest,
    runClaimVersion: 2,
    runLeaseExpiresAt,
    operationKey,
    operationKind: "text-send",
    deliveryKey,
    deliveryClaimVersion: 3,
    reservationKey,
    ...overrides,
  };
  return value;
}

const providerRequestKey = providerRequestKeyFor(input(), requestedAt);

function reserveRow(overrides = {}) {
  return {
    outcome: "authorized",
    operationKey,
    providerRequestKey,
    state: "reserved",
    requestedAt,
    ...overrides,
  };
}

function replayBlockedRow(state = "reserved") {
  return {
    outcome: "replay-blocked",
    operationKey,
    providerRequestKey: null,
    state,
    requestedAt: null,
  };
}

function finalizeRow(overrides = {}) {
  return {
    outcome: "finalized",
    operationKey,
    state: "completed",
    providerOutcomeKind: "accepted",
    observationKey,
    finalizedAt,
    ...overrides,
  };
}

function queryResult(rows, rowCount = rows.length) {
  return {
    command: "SELECT",
    fields: [],
    oid: null,
    rowCount,
    rows,
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, reject, resolve });
}

function poolFixture(responses = [], options = {}) {
  const calls = [];
  const releases = [];
  const remaining = [...responses];
  const client = {
    async query(sql, parameters) {
      calls.push({ scope: "client", sql, parameters });
      if (sql === "ROLLBACK") {
        if (options.rollbackFailure instanceof Error) {
          throw options.rollbackFailure;
        }
        return {
          command: "ROLLBACK",
          fields: [],
          oid: null,
          rowCount: null,
          rows: [],
        };
      }
      if (sql === "DISCARD ALL") {
        if (options.discardFailure instanceof Error) {
          throw options.discardFailure;
        }
        return {
          command: "DISCARD",
          fields: [],
          oid: null,
          rowCount: null,
          rows: [],
        };
      }
      if (remaining.length === 0) {
        throw new Error("unexpected fixture query");
      }
      const response = remaining.shift();
      if (response instanceof Error) throw response;
      return await response;
    },
    release(destroy) {
      releases.push(destroy);
      if (options.releaseFailure instanceof Error) {
        throw options.releaseFailure;
      }
    },
  };
  const pool = {
    async connect() {
      calls.push({ scope: "pool", sql: "connect" });
      return client;
    },
  };
  return { calls, client, pool, releases, remaining };
}

function assertFrozenExact(value, keys) {
  assert.equal(Object.isFrozen(value), true);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
}

function flushTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("requires one exact fail-closed pool dependency", () => {
  const fixture = poolFixture();
  let accessorRead = false;
  const accessorDependency = {};
  Object.defineProperty(accessorDependency, "pool", {
    enumerable: true,
    get() {
      accessorRead = true;
      return fixture.pool;
    },
  });
  const proxyDependency = new Proxy(
    { pool: fixture.pool },
    {
      ownKeys() {
        throw new Error("dependency proxy was inspected");
      },
    },
  );

  for (const dependencies of [
    undefined,
    null,
    [],
    {},
    { pool: fixture.pool, extra: true },
    accessorDependency,
    proxyDependency,
    { pool: null },
    { pool: {} },
    { pool: { connect: "not-a-function" } },
  ]) {
    assert.throws(
      () =>
        createNodePostgresBotReplyStagingProviderFenceWorkerCapability(
          dependencies,
        ),
      /invalid/i,
    );
  }

  assert.equal(accessorRead, false);
  assert.deepEqual(fixture.calls, []);
});

test("returns only one immutable Worker capability without raw database access", () => {
  const fixture = poolFixture();
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({
      pool: fixture.pool,
    });

  assertFrozenExact(capability, ["finalize", "reserve"]);
  assert.equal(typeof capability.reserve, "function");
  assert.equal(typeof capability.finalize, "function");
  assert.equal("pool" in capability, false);
  assert.equal("client" in capability, false);
  assert.equal("query" in capability, false);
  assert.equal("queryCommitted" in capability, false);
  assert.deepEqual(fixture.calls, []);
});

test("destroys a checked-out malformed client before failing closed", async () => {
  const releases = [];
  const malformedClient = {
    release(destroy) {
      releases.push(destroy);
    },
  };
  const pool = {
    async connect() {
      return malformedClient;
    },
  };
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({ pool });

  await assert.rejects(
    capability.reserve(input()),
    /connection-failed/,
  );

  assert.deepEqual(releases, [true]);
});

test("recovers and resets the session before the fixed reserve query", async () => {
  const fixture = poolFixture([queryResult([reserveRow()])]);
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({
      pool: fixture.pool,
    });

  const result = await capability.reserve(input());

  assert.deepEqual(
    fixture.calls.map(({ scope, sql }) => ({ scope, sql })),
    [
      { scope: "pool", sql: "connect" },
      { scope: "client", sql: "ROLLBACK" },
      { scope: "client", sql: "DISCARD ALL" },
      {
        scope: "client",
        sql: fixture.calls[3].sql,
      },
    ],
  );
  assert.match(
    fixture.calls[3].sql,
    /public\.reserve_bot_reply_staging_provider_operation_v1\(/,
  );
  assert.equal(fixture.calls[3].parameters.length, 14);
  assert.deepEqual(fixture.releases, [undefined]);
  assert.deepEqual(result, {
    outcome: "authorized",
    operationKey,
    providerRequestKey,
    state: "reserved",
    requestedAt,
  });
  assertFrozenExact(result, [
    "operationKey",
    "outcome",
    "providerRequestKey",
    "requestedAt",
    "state",
  ]);
});

test("keeps reserve pending until the implicit-commit query resolves", async () => {
  const query = deferred();
  const fixture = poolFixture([query.promise]);
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({
      pool: fixture.pool,
    });
  let settled = false;

  const pendingReserve = capability.reserve(input());
  void pendingReserve.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  await flushTurn();

  assert.equal(settled, false);
  assert.deepEqual(
    fixture.calls.map(({ sql }) => sql),
    ["connect", "ROLLBACK", "DISCARD ALL", fixture.calls[3].sql],
  );
  assert.match(
    fixture.calls[3].sql,
    /public\.reserve_bot_reply_staging_provider_operation_v1\(/,
  );
  assert.deepEqual(fixture.releases, []);

  query.resolve(queryResult([reserveRow()]));
  const result = await pendingReserve;

  assert.equal(result.providerRequestKey, providerRequestKey);
  assert.equal(settled, true);
  assert.deepEqual(fixture.releases, [undefined]);
});

test("destroys the client and exposes no provider key when the committed query rejects", async () => {
  const queryFailure = new Error("implicit commit acknowledgement failed");
  const fixture = poolFixture([queryFailure]);
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({
      pool: fixture.pool,
    });
  let observedProviderRequestKey;
  let observedErrorMessage;

  await assert.rejects(
    capability.reserve(input()).then((result) => {
      observedProviderRequestKey = result.providerRequestKey;
      return result;
    }),
    (error) => {
      observedErrorMessage = error.message;
      return /committed-query-failed/.test(error.message);
    },
  );

  assert.equal(observedProviderRequestKey, undefined);
  assert.deepEqual(
    fixture.calls.map(({ sql }) => sql),
    ["connect", "ROLLBACK", "DISCARD ALL", fixture.calls[3].sql],
  );
  assert.deepEqual(fixture.releases, [true]);
  assert.doesNotMatch(
    observedErrorMessage,
    /implicit commit acknowledgement failed/,
  );
});

test("destroys the client and never runs the fence query when ROLLBACK recovery fails", async () => {
  const rollbackFailure = new Error("rollback recovery failed");
  const fixture = poolFixture([], { rollbackFailure });
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({
      pool: fixture.pool,
    });

  await assert.rejects(
    capability.reserve(input()),
    /committed-query-failed/,
  );

  assert.deepEqual(
    fixture.calls.map(({ sql }) => sql),
    ["connect", "ROLLBACK"],
  );
  assert.deepEqual(fixture.releases, [true]);
  assert.equal(fixture.remaining.length, 0);
});

test("destroys the client and never runs the fence query when session reset fails", async () => {
  const discardFailure = new Error("discard reset failed");
  const fixture = poolFixture([], { discardFailure });
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({
      pool: fixture.pool,
    });

  await assert.rejects(
    capability.reserve(input()),
    /committed-query-failed/,
  );

  assert.deepEqual(
    fixture.calls.map(({ sql }) => sql),
    ["connect", "ROLLBACK", "DISCARD ALL"],
  );
  assert.deepEqual(fixture.releases, [true]);
  assert.equal(fixture.remaining.length, 0);
});

test("withholds the provider key when client release fails after commit", async () => {
  const releaseFailure = new Error("release exposed internal state");
  const fixture = poolFixture(
    [queryResult([reserveRow()])],
    { releaseFailure },
  );
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({
      pool: fixture.pool,
    });
  let observedProviderRequestKey;

  await assert.rejects(
    capability.reserve(input()).then((result) => {
      observedProviderRequestKey = result.providerRequestKey;
      return result;
    }),
    /client-release-failed/,
  );

  assert.equal(observedProviderRequestKey, undefined);
  assert.deepEqual(fixture.releases, [undefined]);
});

test("returns replay-blocked without reconstructing or leaking a provider key", async () => {
  const rawResult = queryResult([replayBlockedRow("completed")]);
  const fixture = poolFixture([rawResult]);
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({
      pool: fixture.pool,
    });

  const result = await capability.reserve(input());

  assert.deepEqual(result, {
    outcome: "replay-blocked",
    operationKey,
    state: "completed",
  });
  assertFrozenExact(result, ["operationKey", "outcome", "state"]);
  assert.equal("providerRequestKey" in result, false);
  assert.notEqual(result, rawResult);
  assert.equal("rows" in result, false);
  assert.equal("rowCount" in result, false);
  assert.deepEqual(fixture.releases, [undefined]);
});

test("uses the same committed boundary for finalize without leaking the raw query result", async () => {
  const rawResult = queryResult([finalizeRow()]);
  const fixture = poolFixture([rawResult]);
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({
      pool: fixture.pool,
    });

  const result = await capability.finalize(input());

  assert.deepEqual(
    fixture.calls.map(({ sql }) => sql),
    ["connect", "ROLLBACK", "DISCARD ALL", fixture.calls[3].sql],
  );
  assert.match(
    fixture.calls[3].sql,
    /public\.finalize_bot_reply_staging_provider_operation_v1\(/,
  );
  assert.deepEqual(fixture.releases, [undefined]);
  assert.notEqual(result, rawResult);
  assert.deepEqual(result, {
    outcome: "finalized",
    operationKey,
    state: "completed",
    providerOutcomeKind: "accepted",
    observationKey,
    finalizedAt,
  });
  assertFrozenExact(result, [
    "finalizedAt",
    "observationKey",
    "operationKey",
    "outcome",
    "providerOutcomeKind",
    "state",
  ]);
  assert.equal("rows" in result, false);
  assert.equal("rowCount" in result, false);
});
