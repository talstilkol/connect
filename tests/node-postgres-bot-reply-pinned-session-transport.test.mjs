import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createNodePostgresBotReplyPinnedSessionTransport,
  NodePostgresBotReplyPinnedSessionTransportError,
  nodePostgresBotReplyPinnedSessionTransportStatus,
} from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";

const backendPid = 4_321;
const permitKey = `bot_reply_staging_pre_send_permit_v1_${"a".repeat(64)}`;
const observationKey = `bot_reply_staging_observation_v1_${"b".repeat(64)}`;
const sendBefore = "2026-08-26T12:00:00.000Z";
const finalizedAt = "2026-08-26T11:59:00.000Z";

const sql = Object.freeze({
  acquire: [
    "SELECT capability.outcome,",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.acquire_bot_reply_staging_pre_send_session_barrier_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  consume: [
    "SELECT capability.outcome, capability.\"reasonCode\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.consume_bot_reply_staging_credential_bound_pre_send_permit_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  finalize: [
    "SELECT capability.outcome, capability.state,",
    "capability.\"providerOutcomeKind\", capability.\"observationKey\",",
    "capability.\"finalizedAt\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.finalize_bot_reply_staging_credential_bound_pre_send_permit_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  lockProof: [
    "SELECT pg_catalog.count(*)::integer AS \"advisoryLockCount\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM pg_catalog.pg_locks AS lock",
    "WHERE lock.pid = pg_catalog.pg_backend_pid()",
    "AND lock.locktype = 'advisory'",
    "AND lock.granted",
  ].join(" "),
  pid: "SELECT pg_catalog.pg_backend_pid()::integer AS \"backendPid\"",
  prove: [
    "SELECT capability.outcome, capability.\"backendPid\",",
    "capability.\"sendBefore\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.prove_bot_reply_staging_pre_send_session_barrier_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  reconcile: [
    "SELECT capability.outcome, capability.state,",
    "capability.\"providerOutcomeKind\", capability.\"observationKey\",",
    "capability.\"finalizedAt\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  release: [
    "SELECT capability.outcome, capability.\"releasedCount\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.release_bot_reply_staging_pre_send_session_barrier_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
});

const fieldContracts = Object.freeze({
  acquire: Object.freeze([
    ["outcome", 25, -1],
    ["ackBackendPid", 23, 4],
  ]),
  consume: Object.freeze([
    ["outcome", 25, -1],
    ["reasonCode", 25, -1],
    ["ackBackendPid", 23, 4],
  ]),
  finalization: Object.freeze([
    ["outcome", 25, -1],
    ["state", 25, -1],
    ["providerOutcomeKind", 25, -1],
    ["observationKey", 25, -1],
    ["finalizedAt", 1184, 8],
    ["ackBackendPid", 23, 4],
  ]),
  lockProof: Object.freeze([
    ["advisoryLockCount", 23, 4],
    ["ackBackendPid", 23, 4],
  ]),
  pid: Object.freeze([["backendPid", 23, 4]]),
  prove: Object.freeze([
    ["outcome", 25, -1],
    ["backendPid", 23, 4],
    ["sendBefore", 1184, 8],
    ["ackBackendPid", 23, 4],
  ]),
  release: Object.freeze([
    ["outcome", 25, -1],
    ["releasedCount", 23, 4],
    ["ackBackendPid", 23, 4],
  ]),
});

function freshSignal() {
  return new AbortController().signal;
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

function field([name, dataTypeID, dataTypeSize]) {
  return {
    name,
    tableID: 0,
    columnID: 0,
    dataTypeID,
    dataTypeSize,
    dataTypeModifier: -1,
    format: "text",
  };
}

function baseResult(command, rowCount, rows, fields, rowAsArray) {
  const result = {
    command,
    rowCount,
    oid: null,
    rows,
    fields,
    _parsers: fields.length === 0 ? undefined : fields.map(() => String),
    _types: undefined,
    RowCtor: null,
    rowAsArray,
    _prebuiltEmptyResultObject: fields.length === 0 ? null : {},
  };
  if (rowAsArray) result.parseRow = function parseRow() {};
  return result;
}

function controlResult(command) {
  return baseResult(command, null, [], [], false);
}

function selectResult(contract, row) {
  return baseResult("SELECT", 1, [row], contract.map(field), true);
}

function kindOf(input) {
  if (typeof input === "string") return input;
  const entry = Object.entries(sql).find(([, text]) => text === input.text);
  if (entry === undefined) throw new Error("unexpected SQL");
  return entry[0];
}

class FakeClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.pipeline = Object.hasOwn(options, "pipeline")
      ? options.pipeline
      : false;
    this.status = "I";
    this.pid = options.pid ?? backendPid;
    this.acquireOutcome = options.acquireOutcome ?? "acquired";
    this.consumeOutcome = options.consumeOutcome ?? "authorized";
    this.consumeReasonCode = options.consumeReasonCode ?? "CAPABILITY_RELEASED";
    this.finalizeOutcome = options.finalizeOutcome ?? "pending";
    this.lockCount = options.lockCount ?? 0;
    this.releaseCount = options.releaseCount ?? 1;
    this.emitEndOnDestroy = options.emitEndOnDestroy ?? true;
    this.rejectHeldOnDestroy = options.rejectHeldOnDestroy ?? true;
    this.throwOnDestroy = options.throwOnDestroy ?? false;
    this.driverNamedQueryCache = new Set(
      options.namedQueryNames ?? [],
    );
    this.serverPreparedStatements = new Set(
      options.namedQueryNames ?? [],
    );
    this.returnedReusable = false;
    this.queries = [];
    this.releaseCalls = [];
    this.events = [];
    this.heldQueries = new Set();
    this.nextHold = null;
    this.nextOverrides = new Map();
    this.nextFailures = new Set();
    this.nextStatuses = new Map();
  }

  getTransactionStatus() {
    return this.status;
  }

  once(eventName, listener) {
    if (eventName === "end") this.events.push("listener:end");
    return super.once(eventName, listener);
  }

  holdNext(kind) {
    const reached = deferred();
    const completion = deferred();
    this.nextHold = { completion, kind, reached };
    return reached.promise;
  }

  overrideNext(kind, transform) {
    this.nextOverrides.set(kind, transform);
  }

  failNext(kind) {
    this.nextFailures.add(kind);
  }

  statusAfterNext(kind, status) {
    this.nextStatuses.set(kind, status);
  }

  query(input) {
    const kind = kindOf(input);
    this.queries.push(input);
    const execute = () => {
      if (this.nextFailures.delete(kind)) throw new Error("query failed");
      let result = this.resultFor(kind);
      const transform = this.nextOverrides.get(kind);
      if (transform !== undefined) {
        this.nextOverrides.delete(kind);
        result = transform(result);
      }
      if (this.nextStatuses.has(kind)) {
        this.status = this.nextStatuses.get(kind);
        this.nextStatuses.delete(kind);
      }
      return result;
    };
    if (this.nextHold?.kind === kind) {
      const hold = this.nextHold;
      this.nextHold = null;
      this.heldQueries.add(hold.completion);
      hold.reached.resolve();
      return hold.completion.promise.finally(() => {
        this.heldQueries.delete(hold.completion);
      }).then(execute);
    }
    return Promise.resolve().then(execute);
  }

  resultFor(kind) {
    if (kind === "BEGIN ISOLATION LEVEL READ COMMITTED") {
      this.status = "T";
      return controlResult("BEGIN");
    }
    if (kind === "COMMIT") {
      this.status = "I";
      return controlResult("COMMIT");
    }
    if (kind === "ROLLBACK") {
      this.status = "I";
      return controlResult("ROLLBACK");
    }
    if (kind === "DISCARD ALL") {
      this.serverPreparedStatements.clear();
      return controlResult("DISCARD");
    }
    if (kind === "pid") {
      return selectResult(fieldContracts.pid, [this.pid]);
    }
    if (kind === "lockProof") {
      return selectResult(fieldContracts.lockProof, [
        this.lockCount,
        this.pid,
      ]);
    }
    if (kind === "acquire") {
      return selectResult(fieldContracts.acquire, [
        this.acquireOutcome,
        this.pid,
      ]);
    }
    if (kind === "consume") {
      return selectResult(fieldContracts.consume, [
        this.consumeOutcome,
        this.consumeReasonCode,
        this.pid,
      ]);
    }
    if (kind === "prove") {
      return selectResult(fieldContracts.prove, [
        "held",
        this.pid,
        new Date(sendBefore),
        this.pid,
      ]);
    }
    if (kind === "finalize" || kind === "reconcile") {
      if (this.finalizeOutcome === "replayed") {
        return selectResult(fieldContracts.finalization, [
          "replayed",
          "completed",
          "accepted",
          observationKey,
          new Date(finalizedAt),
          this.pid,
        ]);
      }
      return selectResult(fieldContracts.finalization, [
        "pending",
        "reserved",
        null,
        null,
        null,
        this.pid,
      ]);
    }
    if (kind === "release") {
      return selectResult(fieldContracts.release, [
        "released",
        this.releaseCount,
        this.pid,
      ]);
    }
    throw new Error("unsupported SQL kind");
  }

  release(destroy) {
    this.events.push(destroy === true ? "release:true" : "release:clean");
    this.releaseCalls.push(destroy);
    if (destroy !== true) {
      this.returnedReusable = true;
      return;
    }
    if (this.throwOnDestroy) throw new Error("destructive release failed");
    this.status = null;
    if (this.rejectHeldOnDestroy) {
      for (const held of this.heldQueries) {
        held.reject(new Error("physical client destroyed"));
      }
      this.heldQueries.clear();
    }
    if (this.emitEndOnDestroy) this.emit("end");
  }
}

function makePool(clientOrConnect) {
  let checkoutCount = 0;
  const pool = {
    connect() {
      assert.equal(this, pool);
      checkoutCount += 1;
      return typeof clientOrConnect === "function"
        ? clientOrConnect()
        : clientOrConnect;
    },
  };
  return Object.freeze({
    checkoutCount: () => checkoutCount,
    pool,
  });
}

async function openSession(client) {
  const poolState = makePool(client);
  const transport = createNodePostgresBotReplyPinnedSessionTransport({
    pool: poolState.pool,
  });
  const session = await transport.openPinned(freshSignal());
  return Object.freeze({ poolState, session, transport });
}

async function preparedSession(client = new FakeClient()) {
  const opened = await openSession(client);
  await opened.session.prepare(freshSignal());
  return Object.freeze({ ...opened, client });
}

async function assertCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error instanceof NodePostgresBotReplyPinnedSessionTransportError, true);
    assert.equal(error.code, code);
    assert.equal(Object.hasOwn(error, "cause"), false);
    return true;
  });
}

async function completeThrough(session, operation) {
  if (["consume", "prove", "finalize", "release"].includes(operation)) {
    await session.acquire(permitKey, freshSignal());
  }
  if (["prove", "finalize", "release"].includes(operation)) {
    await session.consume(permitKey, freshSignal());
  }
  if (["finalize", "release"].includes(operation)) {
    await session.prove(permitKey, freshSignal());
  }
  if (operation === "release") {
    await session.finalize(permitKey, freshSignal());
  }
}

function invoke(session, operation, signal) {
  return session[operation](permitKey, signal);
}

test("publishes one immutable dormant transport with a deliberately narrow surface", async () => {
  assert.deepEqual(nodePostgresBotReplyPinnedSessionTransportStatus, {
    activationAllowed: false,
    runtimeImporters: 0,
    trustedWriters: "missing",
  });
  assert.equal(Object.isFrozen(nodePostgresBotReplyPinnedSessionTransportStatus), true);

  const client = new FakeClient();
  const { poolState, session, transport } = await openSession(client);
  assert.equal(poolState.checkoutCount(), 1);
  assert.equal(Object.isFrozen(transport), true);
  assert.equal(Object.isFrozen(session), true);
  assert.deepEqual(Object.keys(transport), ["openPinned"]);
  assert.deepEqual(Object.keys(session).sort(), [
    "acquire",
    "close",
    "consume",
    "destroy",
    "finalize",
    "prepare",
    "prove",
    "release",
  ]);
  assert.equal("persistProviderFact" in session, false);
  assert.equal("persistProviderUncertainty" in session, false);
  await session.destroy(freshSignal());

  assert.throws(
    () => createNodePostgresBotReplyPinnedSessionTransport({
      pool: makePool(new FakeClient()).pool,
      extra: true,
    }),
    (error) => error.code === "invalid-dependency",
  );
});

test("runs the exact happy-path SQL, parameters, transaction brackets, and clean close", async () => {
  const client = new FakeClient();
  const { poolState, session } = await preparedSession(client);
  const acquired = await session.acquire(permitKey, freshSignal());
  const consumed = await session.consume(permitKey, freshSignal());
  const proof = await session.prove(permitKey, freshSignal());
  const finalization = await session.finalize(permitKey, freshSignal());
  const released = await session.release(permitKey, freshSignal());
  await session.close(freshSignal());

  assert.deepEqual(acquired, {
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: "acquired",
  });
  assert.deepEqual(consumed, {
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: "authorized",
    reasonCode: "CAPABILITY_RELEASED",
  });
  assert.deepEqual(proof, {
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: "held",
    sendBefore,
  });
  assert.equal(finalization.outcome, "pending");
  assert.deepEqual(released, {
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: "released",
    releasedCount: 1,
  });
  for (const result of [acquired, consumed, proof, finalization, released]) {
    assert.equal(Object.isFrozen(result), true);
  }
  assert.equal(poolState.checkoutCount(), 1);
  assert.deepEqual(client.releaseCalls, [true]);

  const expectedKinds = [
    "ROLLBACK",
    "DISCARD ALL",
    "pid",
    "BEGIN ISOLATION LEVEL READ COMMITTED",
    "acquire",
    "COMMIT",
    "BEGIN ISOLATION LEVEL READ COMMITTED",
    "consume",
    "COMMIT",
    "BEGIN ISOLATION LEVEL READ COMMITTED",
    "prove",
    "COMMIT",
    "BEGIN ISOLATION LEVEL READ COMMITTED",
    "finalize",
    "COMMIT",
    "BEGIN ISOLATION LEVEL READ COMMITTED",
    "release",
    "COMMIT",
    "lockProof",
    "ROLLBACK",
    "DISCARD ALL",
    "pid",
  ];
  assert.deepEqual(client.queries.map(kindOf), expectedKinds);
  for (const query of client.queries.filter((entry) => typeof entry !== "string")) {
    assert.deepEqual(Object.keys(query).sort(), ["rowMode", "text", "values"]);
    assert.equal(query.rowMode, "array");
    assert.equal(Object.isFrozen(query), true);
    assert.equal(Object.isFrozen(query.values), true);
    assert.deepEqual(
      query.values,
      query.text === sql.pid || query.text === sql.lockProof
        ? []
        : [permitKey],
    );
    assert.equal(Object.hasOwn(query, "name"), false);
  }
});

test("preserves the two-lock reconciliation shape through finalize and release", async () => {
  const client = new FakeClient({
    acquireOutcome: "reconciliation-required",
    finalizeOutcome: "replayed",
    releaseCount: 2,
  });
  const { session } = await preparedSession(client);
  const acquired = await session.acquire(permitKey, freshSignal());
  const finalization = await session.finalize(permitKey, freshSignal());
  const released = await session.release(permitKey, freshSignal());
  await session.close(freshSignal());

  assert.equal(acquired.outcome, "reconciliation-required");
  assert.equal(finalization.outcome, "replayed");
  assert.equal(finalization.finalizedAt, finalizedAt);
  assert.equal(released.releasedCount, 2);
  assert.equal(client.queries.map(kindOf).includes("reconcile"), true);
  assert.equal(client.queries.map(kindOf).includes("finalize"), false);
  assert.deepEqual(client.releaseCalls, [true]);
});

test("returns busy and blocked outcomes without retaining a lock", async () => {
  for (const acquireOutcome of ["busy", "blocked-unresolved"]) {
    const client = new FakeClient({ acquireOutcome });
    const { session } = await preparedSession(client);
    const result = await session.acquire(permitKey, freshSignal());
    assert.equal(result.outcome, acquireOutcome);
    await session.close(freshSignal());
    assert.deepEqual(client.releaseCalls, [true]);
    assert.equal(client.queries.map(kindOf).includes("consume"), false);
  }
});

test("rejects every pipeline mode other than exact false and destroys the checkout", async () => {
  for (const pipeline of [true, undefined, null, 0, "false"]) {
    const client = new FakeClient({ pipeline });
    const poolState = makePool(client);
    const transport = createNodePostgresBotReplyPinnedSessionTransport({
      pool: poolState.pool,
    });
    await assertCode(transport.openPinned(freshSignal()), "invalid-client");
    assert.equal(poolState.checkoutCount(), 1);
    assert.deepEqual(client.releaseCalls, [true]);
  }
});

test("rejects forged AbortSignal brands without leaking a checkout", async () => {
  const forgedSignal = Object.create(AbortSignal.prototype);
  const unusedClient = new FakeClient();
  const unusedPool = makePool(unusedClient);
  const unusedTransport = createNodePostgresBotReplyPinnedSessionTransport({
    pool: unusedPool.pool,
  });

  await assertCode(
    unusedTransport.openPinned(forgedSignal),
    "invalid-signal",
  );
  assert.equal(unusedPool.checkoutCount(), 0);
  assert.deepEqual(unusedClient.releaseCalls, []);

  const checkedOutClient = new FakeClient();
  const { session } = await openSession(checkedOutClient);
  await assertCode(session.prepare(forgedSignal), "invalid-signal");
  assert.deepEqual(checkedOutClient.releaseCalls, [true]);
});

test("uses intrinsic AbortSignal operations instead of instance overrides", async () => {
  const signal = freshSignal();
  Object.defineProperties(signal, {
    aborted: {
      get() {
        throw new Error("instance getter must not run");
      },
    },
    addEventListener: {
      value() {
        throw new Error("instance addEventListener must not run");
      },
    },
    removeEventListener: {
      value() {
        throw new Error("instance removeEventListener must not run");
      },
    },
  });
  const client = new FakeClient();
  const poolState = makePool(client);
  const transport = createNodePostgresBotReplyPinnedSessionTransport({
    pool: poolState.pool,
  });

  const session = await transport.openPinned(signal);
  await session.prepare(signal);
  await session.destroy(freshSignal());

  assert.equal(poolState.checkoutCount(), 1);
  assert.deepEqual(client.releaseCalls, [true]);
});

test("pre-abort prevents checkout and late checkout is destroyed exactly once", async () => {
  const preAborted = new AbortController();
  preAborted.abort();
  const unusedPool = makePool(new FakeClient());
  const unusedTransport = createNodePostgresBotReplyPinnedSessionTransport({
    pool: unusedPool.pool,
  });
  await assertCode(unusedTransport.openPinned(preAborted.signal), "aborted");
  assert.equal(unusedPool.checkoutCount(), 0);

  const checkout = deferred();
  const lateClient = new FakeClient();
  const latePool = makePool(() => checkout.promise);
  const lateTransport = createNodePostgresBotReplyPinnedSessionTransport({
    pool: latePool.pool,
  });
  const controller = new AbortController();
  const opening = lateTransport.openPinned(controller.signal);
  controller.abort();
  await assertCode(opening, "aborted");
  checkout.resolve(lateClient);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(lateClient.releaseCalls, [true]);
  assert.equal(latePool.checkoutCount(), 1);
});

test("pre-abort and abort at every prepare query destroy without hanging", async () => {
  const preClient = new FakeClient();
  const { session: preSession } = await openSession(preClient);
  const preController = new AbortController();
  preController.abort();
  await assertCode(preSession.prepare(preController.signal), "aborted");
  assert.deepEqual(preClient.releaseCalls, [true]);

  for (const kind of ["ROLLBACK", "DISCARD ALL", "pid"]) {
    const client = new FakeClient({ rejectHeldOnDestroy: false });
    const { session } = await openSession(client);
    const reached = client.holdNext(kind);
    const controller = new AbortController();
    const pending = session.prepare(controller.signal);
    await reached;
    controller.abort();
    await assertCode(pending, "aborted");
    assert.deepEqual(client.releaseCalls, [true]);
  }
});

test("abort at every capability query and COMMIT returns promptly and destroys once", async () => {
  for (const operation of ["acquire", "consume", "prove", "finalize", "release"]) {
    for (const targetKind of [operation, "COMMIT"]) {
      const client = new FakeClient({ rejectHeldOnDestroy: false });
      const { session } = await preparedSession(client);
      await completeThrough(session, operation);
      const reached = client.holdNext(targetKind);
      const controller = new AbortController();
      let settled = false;
      const pending = invoke(session, operation, controller.signal).finally(() => {
        settled = true;
      });
      await reached;
      await Promise.resolve();
      assert.equal(settled, false);
      controller.abort();
      await assertCode(pending, "aborted");
      assert.deepEqual(client.releaseCalls, [true]);
    }
  }
});

test("concurrent use destroys the client and neither call can reuse it", async () => {
  const client = new FakeClient();
  const { session } = await preparedSession(client);
  const reached = client.holdNext("acquire");
  const first = session.acquire(permitKey, freshSignal());
  await reached;
  const second = session.close(freshSignal());
  await assertCode(second, "concurrent-use");
  await assertCode(first, "query-failed");
  assert.deepEqual(client.releaseCalls, [true]);
  await session.destroy(freshSignal());
  assert.deepEqual(client.releaseCalls, [true]);
});

test("rejects PID, status, row-shape, field, and result-envelope drift", async () => {
  const scenarios = [
    (client) => client.overrideNext("acquire", (result) => {
      result.rows[0][1] = backendPid + 1;
      return result;
    }),
    (client) => client.statusAfterNext("COMMIT", "T"),
    (client) => client.overrideNext("acquire", (result) => {
      result.rows[0].push("extra");
      return result;
    }),
    (client) => client.overrideNext("acquire", (result) => {
      result.fields[1].dataTypeID = 25;
      return result;
    }),
    (client) => client.overrideNext("acquire", (result) => {
      result.unexpected = true;
      return result;
    }),
  ];
  const expectedCodes = [
    "physical-client-changed",
    "invalid-result",
    "invalid-result",
    "invalid-result",
    "invalid-result",
  ];
  for (let index = 0; index < scenarios.length; index += 1) {
    const client = new FakeClient();
    const { session } = await preparedSession(client);
    scenarios[index](client);
    await assertCode(
      session.acquire(permitKey, freshSignal()),
      expectedCodes[index],
    );
    assert.deepEqual(client.releaseCalls, [true]);
  }
});

test("validates every control acknowledgement and idle status before BEGIN", async () => {
  for (const kind of ["ROLLBACK", "DISCARD ALL"]) {
    const client = new FakeClient();
    const { session } = await openSession(client);
    client.overrideNext(kind, (result) => ({ ...result, command: "UPDATE" }));
    await assertCode(session.prepare(freshSignal()), "invalid-result");
    assert.deepEqual(client.releaseCalls, [true]);
  }
  for (const kind of ["BEGIN ISOLATION LEVEL READ COMMITTED", "COMMIT"]) {
    const client = new FakeClient();
    const { session } = await preparedSession(client);
    client.overrideNext(kind, (result) => ({ ...result, command: "UPDATE" }));
    await assertCode(
      session.acquire(permitKey, freshSignal()),
      "invalid-result",
    );
    assert.deepEqual(client.releaseCalls, [true]);
  }

  const contaminatedClient = new FakeClient();
  const { session } = await preparedSession(contaminatedClient);
  contaminatedClient.status = "T";
  await assertCode(
    session.acquire(permitKey, freshSignal()),
    "invalid-result",
  );
  assert.deepEqual(contaminatedClient.releaseCalls, [true]);
});

test("accepts only the exact migration-defined consume reason mappings", async () => {
  const cases = [
    ["authorized", "CAPABILITY_RELEASED", true],
    ["denied", "PERMIT_EXPIRED", true],
    ["replay-blocked", "CAPABILITY_ALREADY_RELEASED", true],
    ["replay-blocked", "POLICY_DISABLED", true],
    ["authorized", "PERMIT_EXPIRED", false],
    ["denied", "UNRECOGNIZED_REASON", false],
    ["replay-blocked", "UNRECOGNIZED_REASON", false],
  ];
  for (const [consumeOutcome, consumeReasonCode, accepted] of cases) {
    const client = new FakeClient({ consumeOutcome, consumeReasonCode });
    const { session } = await preparedSession(client);
    await session.acquire(permitKey, freshSignal());
    const operation = session.consume(permitKey, freshSignal());
    if (accepted) {
      const result = await operation;
      assert.equal(result.outcome, consumeOutcome);
      await session.release(permitKey, freshSignal());
      await session.close(freshSignal());
    } else {
      await assertCode(operation, "invalid-result");
      assert.deepEqual(client.releaseCalls, [true]);
    }
  }
});

test("phase failures, query failures, and lock leaks destroy once without retry", async () => {
  const phaseClient = new FakeClient();
  const phaseOpened = await preparedSession(phaseClient);
  await assertCode(
    phaseOpened.session.consume(permitKey, freshSignal()),
    "invalid-phase",
  );
  assert.deepEqual(phaseClient.releaseCalls, [true]);
  assert.equal(phaseOpened.poolState.checkoutCount(), 1);

  const queryClient = new FakeClient();
  const queryOpened = await preparedSession(queryClient);
  queryClient.failNext("acquire");
  await assertCode(
    queryOpened.session.acquire(permitKey, freshSignal()),
    "query-failed",
  );
  assert.deepEqual(queryClient.releaseCalls, [true]);
  assert.equal(queryOpened.poolState.checkoutCount(), 1);

  const lockClient = new FakeClient({ lockCount: 1 });
  const lockOpened = await preparedSession(lockClient);
  const queryCountBeforeClose = lockClient.queries.length;
  await assertCode(lockOpened.session.close(freshSignal()), "invalid-result");
  assert.deepEqual(lockClient.releaseCalls, [true]);
  assert.deepEqual(
    lockClient.queries.slice(queryCountBeforeClose).map(kindOf),
    ["lockProof"],
  );
});

test("close is limited to no-lock or released phases and verifies the same PID", async () => {
  const heldClient = new FakeClient();
  const heldOpened = await preparedSession(heldClient);
  await heldOpened.session.acquire(permitKey, freshSignal());
  await assertCode(heldOpened.session.close(freshSignal()), "invalid-phase");
  assert.deepEqual(heldClient.releaseCalls, [true]);

  const pidClient = new FakeClient();
  const pidOpened = await preparedSession(pidClient);
  pidClient.overrideNext("lockProof", (result) => {
    result.rows[0][1] = backendPid + 1;
    return result;
  });
  await assertCode(
    pidOpened.session.close(freshSignal()),
    "physical-client-changed",
  );
  assert.deepEqual(pidClient.releaseCalls, [true]);
});

test("normal close destroys the dedicated checkout and cleanup remains idempotent", async () => {
  const cleanClient = new FakeClient();
  const cleanOpened = await preparedSession(cleanClient);
  await cleanOpened.session.close(freshSignal());
  await cleanOpened.session.destroy(freshSignal());
  await cleanOpened.session.destroy(freshSignal());
  assert.deepEqual(cleanClient.releaseCalls, [true]);

  const destroyedClient = new FakeClient();
  const destroyedOpened = await preparedSession(destroyedClient);
  await assertCode(
    destroyedOpened.session.consume(permitKey, freshSignal()),
    "invalid-phase",
  );
  await destroyedOpened.session.destroy(freshSignal());
  await destroyedOpened.session.destroy(freshSignal());
  assert.deepEqual(destroyedClient.releaseCalls, [true]);
  assert.deepEqual(destroyedClient.events.slice(0, 2), [
    "listener:end",
    "release:true",
  ]);
});

test("does not return a client reusable after DISCARD ALL invalidates named statements", async () => {
  const client = new FakeClient({
    namedQueryNames: ["shared_named_query"],
  });
  const { session } = await preparedSession(client);

  assert.deepEqual(
    [...client.driverNamedQueryCache],
    ["shared_named_query"],
  );
  assert.deepEqual([...client.serverPreparedStatements], []);

  await session.close(freshSignal());

  assert.deepEqual(client.releaseCalls, [true]);
  assert.equal(client.returnedReusable, false);
  assert.deepEqual(
    [...client.driverNamedQueryCache],
    ["shared_named_query"],
  );
  assert.deepEqual([...client.serverPreparedStatements], []);
});

test("destroy waits for end but remains bounded by its caller signal", async () => {
  const client = new FakeClient({ emitEndOnDestroy: false });
  const { session } = await openSession(client);
  const controller = new AbortController();
  const destroying = session.destroy(controller.signal);
  assert.deepEqual(client.releaseCalls, [true]);
  controller.abort();
  await assertCode(destroying, "aborted");
  assert.deepEqual(client.releaseCalls, [true]);
});

test("destroy reports a sanitized failure when destructive release throws", async () => {
  const client = new FakeClient({ throwOnDestroy: true });
  const { session } = await openSession(client);

  await assertCode(session.destroy(freshSignal()), "destroy-failed");
  await assertCode(session.destroy(freshSignal()), "destroy-failed");

  assert.deepEqual(client.releaseCalls, [true]);
  assert.deepEqual(client.events, ["listener:end", "release:true"]);
});

test("captures physical-client methods at checkout and ignores later mutation", async () => {
  const client = new FakeClient();
  const { session } = await openSession(client);
  client.query = () => {
    throw new Error("mutated query");
  };
  client.release = () => {
    throw new Error("mutated release");
  };
  client.once = () => {
    throw new Error("mutated once");
  };
  await session.prepare(freshSignal());
  await session.close(freshSignal());
  assert.deepEqual(client.releaseCalls, [true]);
});

test("connection failure is sanitized and never retried", async () => {
  const poolState = makePool(() => Promise.reject(new Error("secret")));
  const transport = createNodePostgresBotReplyPinnedSessionTransport({
    pool: poolState.pool,
  });
  await assertCode(transport.openPinned(freshSignal()), "connection-failed");
  assert.equal(poolState.checkoutCount(), 1);
});

test("source remains dormant, permit-only, allowlisted, and non-multiplexed", async () => {
  const source = await readFile(
    new URL(
      "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /import type \{[\s\S]*RailwayBotReplyPinnedAcquireResult/);
  assert.doesNotMatch(
    source,
    /import\s+(?!type\b)[\s\S]{0,200}railwayBotReplyPinnedBoundaryDriver/,
  );
  assert.doesNotMatch(
    source,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE)\b/,
  );
  assert.doesNotMatch(
    source,
    /providerRequestKey|persistProviderFact|persistProviderUncertainty|Math\.random|crypto\.randomUUID|query_timeout|client\.cancel|pool\.query|process\.env|console\.|\bcause\b/,
  );
  assert.match(source, /pipeline !== false/);
  assert.match(source, /release\(true\)/);
  assert.match(source, /BEGIN ISOLATION LEVEL READ COMMITTED/);
  assert.match(source, /rowMode: "array"/);
  assert.match(
    source,
    /Object\.getOwnPropertyDescriptor\(\s*AbortSignal\.prototype,\s*"aborted",\s*\)\?\.get/,
  );
  assert.doesNotMatch(
    source,
    /\bsignal\.(?:aborted|addEventListener|removeEventListener)\b/,
  );
  assert.equal((source.match(/\bpool\.connect\(\)/g) ?? []).length, 1);
  assert.doesNotMatch(source, /pool:\s*value as Pool/);
  assert.doesNotMatch(source, /Reflect\.apply\(pool\.connect/);
});
