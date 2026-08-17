import assert from "node:assert/strict";
import test from "node:test";

import {
  createNodePostgresQueryExecutor,
  createNodePostgresTransactionManager,
  NodePostgresAdapterError,
} from "../server/platform/nodePostgresAdapter.ts";

function queryResult(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function poolFixture(responses = []) {
  const queued = [...responses];
  const calls = [];
  const releases = [];
  const client = {
    async query(sql, parameters) {
      calls.push({ scope: "client", sql, parameters });
      if (sql === "BEGIN ISOLATION LEVEL READ COMMITTED") {
        const controlResponse = queued[0];
        if (
          controlResponse?.control === sql &&
          queued.shift().result instanceof Error
        ) {
          throw controlResponse.result;
        }
        return queryResult([], null);
      }
      if (sql === "COMMIT" || sql === "ROLLBACK") {
        const controlResponse = queued[0];
        if (
          controlResponse?.control === sql &&
          queued.shift().result instanceof Error
        ) {
          throw controlResponse.result;
        }
        return queryResult([], null);
      }

      if (queued.length === 0) {
        throw new Error("unexpected fixture query");
      }

      const response = queued.shift();
      if (response instanceof Error) {
        throw response;
      }
      return response;
    },
    release(failure) {
      releases.push(failure);
    },
  };
  const pool = {
    async connect() {
      calls.push({ scope: "pool", sql: "connect" });
      return client;
    },
    async query(sql, parameters) {
      calls.push({ scope: "pool", sql, parameters });
      if (queued.length === 0) {
        throw new Error("unexpected fixture query");
      }
      return queued.shift();
    },
  };

  return { calls, client, pool, queued, releases };
}

test("adapts one pool query without changing parameters", async () => {
  const fixture = poolFixture([
    queryResult([{ id: "41", version: "3" }]),
  ]);
  const executor = createNodePostgresQueryExecutor(fixture.pool);

  const result = await executor.query(
    "SELECT id, version FROM contacts WHERE tenant_id = $1",
    [7],
  );

  assert.deepEqual(result, {
    rows: [{ id: "41", version: "3" }],
    rowCount: 1,
  });
  assert.deepEqual(fixture.calls, [
    {
      scope: "pool",
      sql: "SELECT id, version FROM contacts WHERE tenant_id = $1",
      parameters: [7],
    },
  ]);
});

test("pins every callback query between begin and commit", async () => {
  const fixture = poolFixture([
    queryResult([{ id: "41" }]),
  ]);
  const transactions = createNodePostgresTransactionManager(
    fixture.pool,
  );

  const value = await transactions.transaction(
    { isolationLevel: "read-committed" },
    async (transaction) => {
      const result = await transaction.query(
        "SELECT id FROM contacts WHERE tenant_id = $1 FOR UPDATE",
        [7],
      );
      return result.rows[0].id;
    },
  );

  assert.equal(value, "41");
  assert.deepEqual(
    fixture.calls.map(({ scope, sql }) => ({ scope, sql })),
    [
      { scope: "pool", sql: "connect" },
      {
        scope: "client",
        sql: "BEGIN ISOLATION LEVEL READ COMMITTED",
      },
      {
        scope: "client",
        sql: "SELECT id FROM contacts WHERE tenant_id = $1 FOR UPDATE",
      },
      { scope: "client", sql: "COMMIT" },
    ],
  );
  assert.deepEqual(fixture.releases, [undefined]);
});

test("rolls back a callback failure and preserves the original error", async () => {
  const fixture = poolFixture();
  const failure = new Error("domain failure");

  await assert.rejects(
    createNodePostgresTransactionManager(fixture.pool).transaction(
      { isolationLevel: "read-committed" },
      async () => {
        throw failure;
      },
    ),
    (error) => error === failure,
  );

  assert.deepEqual(
    fixture.calls.map(({ sql }) => sql),
    [
      "connect",
      "BEGIN ISOLATION LEVEL READ COMMITTED",
      "ROLLBACK",
    ],
  );
  assert.deepEqual(fixture.releases, [undefined]);
});

test("destroys a client after commit failure", async () => {
  const commitFailure = new Error("commit transport failure");
  const fixture = poolFixture([
    { control: "COMMIT", result: commitFailure },
  ]);

  await assert.rejects(
    createNodePostgresTransactionManager(fixture.pool).transaction(
      { isolationLevel: "read-committed" },
      async () => "completed",
    ),
    (error) => error === commitFailure,
  );

  assert.deepEqual(
    fixture.calls.map(({ sql }) => sql),
    [
      "connect",
      "BEGIN ISOLATION LEVEL READ COMMITTED",
      "COMMIT",
      "ROLLBACK",
    ],
  );
  assert.deepEqual(fixture.releases, [true]);
});

test("destroys a client when begin fails before the callback", async () => {
  const beginFailure = new Error("begin transport failure");
  const fixture = poolFixture([
    {
      control: "BEGIN ISOLATION LEVEL READ COMMITTED",
      result: beginFailure,
    },
  ]);
  let callbackCalls = 0;

  await assert.rejects(
    createNodePostgresTransactionManager(fixture.pool).transaction(
      { isolationLevel: "read-committed" },
      async () => {
        callbackCalls += 1;
      },
    ),
    (error) => error === beginFailure,
  );

  assert.equal(callbackCalls, 0);
  assert.deepEqual(
    fixture.calls.map(({ sql }) => sql),
    ["connect", "BEGIN ISOLATION LEVEL READ COMMITTED"],
  );
  assert.deepEqual(fixture.releases, [true]);
});

test("destroys a client and reports a bounded rollback failure", async () => {
  const callbackFailure = new Error("callback failure");
  const rollbackFailure = new Error("rollback transport failure");
  const fixture = poolFixture([
    { control: "ROLLBACK", result: rollbackFailure },
  ]);

  await assert.rejects(
    createNodePostgresTransactionManager(fixture.pool).transaction(
      { isolationLevel: "read-committed" },
      async () => {
        throw callbackFailure;
      },
    ),
    (error) =>
      error instanceof NodePostgresAdapterError &&
      error.code === "rollback-failed" &&
      !error.message.includes(callbackFailure.message) &&
      !error.message.includes(rollbackFailure.message),
  );

  assert.deepEqual(fixture.releases, [true]);
});

test("rejects invalid dependencies, options, and driver results", async () => {
  assert.throws(
    () => createNodePostgresQueryExecutor(null),
    (error) =>
      error instanceof NodePostgresAdapterError &&
      error.code === "invalid-dependency",
  );

  const invalidResult = poolFixture([
    { rows: [], rowCount: null },
  ]);
  await assert.rejects(
    createNodePostgresQueryExecutor(invalidResult.pool).query(
      "SELECT id FROM contacts",
      [],
    ),
    (error) =>
      error instanceof NodePostgresAdapterError &&
      error.code === "invalid-query-result",
  );

  const invalidOptions = poolFixture();
  await assert.rejects(
    createNodePostgresTransactionManager(
      invalidOptions.pool,
    ).transaction(
      { isolationLevel: "serializable" },
      async () => null,
    ),
    (error) =>
      error instanceof NodePostgresAdapterError &&
      error.code === "invalid-transaction-options",
  );
  assert.equal(invalidOptions.calls.length, 0);
});
