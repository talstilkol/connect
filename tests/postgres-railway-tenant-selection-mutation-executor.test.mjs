import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRailwayTenantSelectionMutationExecutor,
  postgresRailwayTenantSelectionMutationSql,
} from "../server/platform/postgresRailwayTenantSelectionMutationExecutor.ts";

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function fixture(responses) {
  const calls = [];
  const state = {
    options: null,
    committed: false,
    rolledBack: false,
  };
  const executor = createPostgresRailwayTenantSelectionMutationExecutor({
    async transaction(options, execute) {
      state.options = options;
      const remaining = [...responses];
      try {
        const result = await execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            const response = remaining.shift();
            if (response instanceof Error) throw response;
            if (!response) throw new Error("missing test response");
            return response;
          },
        });
        if (remaining.length !== 0) throw new Error("unused test response");
        state.committed = true;
        return result;
      } catch (error) {
        state.rolledBack = true;
        throw error;
      }
    },
  });
  return { calls, executor, state };
}

function command(overrides = {}) {
  return Object.freeze({
    identity: Object.freeze({ externalUserId: "verified-user" }),
    operation: "tenant-selection.save",
    idempotencyKey: `connect_idempotency_v1_${"a".repeat(64)}`,
    requestDigest: `railway_mutation_request_v1_${"b".repeat(64)}`,
    input: Object.freeze({
      externalUserId: "verified-user",
      tenantId: 11,
      expectedVersion: 0,
    }),
    ...overrides,
  });
}

const savedState = Object.freeze({
  repositoryOutcome: "saved",
  selection: Object.freeze({ tenantId: 11, version: 1 }),
});

test("commits eligible selection, receipt, and audit in one transaction", async () => {
  const testFixture = fixture([
    queryResult([{ tenantId: "11" }]),
    queryResult([{ idempotencyKey: command().idempotencyKey }]),
    queryResult([{ tenantId: "11", version: 1 }]),
    queryResult([{ id: "31" }]),
    queryResult([{ idempotencyKey: command().idempotencyKey }]),
  ]);

  assert.deepEqual(await testFixture.executor.execute(command()), {
    outcome: "committed",
    tenantId: 11,
    state: savedState,
  });
  assert.deepEqual(testFixture.state.options, {
    isolationLevel: "read-committed",
  });
  assert.equal(testFixture.state.committed, true);
  assert.equal(testFixture.calls.length, 5);
  assert.match(testFixture.calls[0].sql, /FOR KEY SHARE/);
  assert.match(testFixture.calls[1].sql, /railway_api_mutation_receipts/);
  assert.match(testFixture.calls[2].sql, /INSERT INTO tenant_selections/);
  assert.match(testFixture.calls[3].sql, /INSERT INTO audit_logs/);
  assert.match(testFixture.calls[4].sql, /status = 'completed'/);
});

test("replays a completed receipt only after rechecking membership", async () => {
  const testFixture = fixture([
    queryResult([{ tenantId: 11 }]),
    queryResult([]),
    queryResult([{
      requestDigest: command().requestDigest,
      status: "completed",
      responseJson: savedState,
    }]),
  ]);

  assert.deepEqual(await testFixture.executor.execute(command()), {
    outcome: "replayed",
    tenantId: 11,
    state: savedState,
  });
  assert.equal(testFixture.calls.length, 3);
  assert.equal(testFixture.state.committed, true);
});

test("rolls back a conflicting digest or stale selection", async () => {
  const digestConflict = fixture([
    queryResult([{ tenantId: 11 }]),
    queryResult([]),
    queryResult([{
      requestDigest: `railway_mutation_request_v1_${"c".repeat(64)}`,
      status: "completed",
      responseJson: savedState,
    }]),
  ]);
  assert.deepEqual(await digestConflict.executor.execute(command()), {
    outcome: "conflict",
    tenantId: null,
    state: null,
  });
  assert.equal(digestConflict.state.rolledBack, true);

  const stale = fixture([
    queryResult([{ tenantId: 11 }]),
    queryResult([{ idempotencyKey: command().idempotencyKey }]),
    queryResult([]),
    queryResult([{ tenantId: 7, version: 4 }]),
  ]);
  assert.deepEqual(await stale.executor.execute(command()), {
    outcome: "conflict",
    tenantId: null,
    state: null,
  });
  assert.equal(stale.state.rolledBack, true);
  assert.equal(stale.calls.some(({ sql }) => /INSERT INTO audit_logs/.test(sql)), false);
});

test("fails closed before receipt access for an ineligible membership", async () => {
  const testFixture = fixture([queryResult([])]);
  assert.deepEqual(await testFixture.executor.execute(command()), {
    outcome: "unavailable",
    tenantId: null,
    state: null,
  });
  assert.equal(testFixture.calls.length, 1);
  assert.equal(testFixture.state.rolledBack, true);
});

test("rejects invalid commands before opening a transaction", async () => {
  const testFixture = fixture([]);
  assert.deepEqual(
    await testFixture.executor.execute(command({
      input: { externalUserId: "other-user", tenantId: 11, expectedVersion: 0 },
    })),
    { outcome: "unavailable", tenantId: null, state: null },
  );
  assert.equal(testFixture.state.options, null);
});

test("freezes membership, receipt, and audit SQL boundaries", () => {
  assert.match(
    postgresRailwayTenantSelectionMutationSql.lockEligibleMembership,
    /membership\.status = 'active'/,
  );
  assert.match(
    postgresRailwayTenantSelectionMutationSql.lockEligibleMembership,
    /'trial', 'active', 'payment_failed'/,
  );
  assert.match(
    postgresRailwayTenantSelectionMutationSql.claimReceipt,
    /ON CONFLICT \(tenant_id, operation, idempotency_key\)/,
  );
  assert.match(
    postgresRailwayTenantSelectionMutationSql.insertAudit,
    /'tenant_selection'/,
  );
});

test("rejects incomplete executor dependencies", () => {
  assert.throws(
    () => createPostgresRailwayTenantSelectionMutationExecutor({}),
    /dependencies are invalid/,
  );
});
