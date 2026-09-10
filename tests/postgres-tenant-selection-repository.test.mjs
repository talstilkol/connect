import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresTenantSelectionRepository,
  postgresTenantSelectionSql,
} from "../server/platform/postgresTenantSelectionRepository.ts";

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function transactionManager(responses) {
  const state = {
    calls: [],
    committed: false,
    rolledBack: false,
    options: null,
  };

  return {
    state,
    manager: {
      async transaction(options, execute) {
        state.options = options;
        const remaining = [...responses];
        const transaction = {
          async query(sql, parameters) {
            state.calls.push({ sql, parameters });
            const response = remaining.shift();

            if (response instanceof Error) {
              throw response;
            }

            if (!response) {
              throw new Error("missing test transaction response");
            }

            return response;
          },
        };

        try {
          const result = await execute(transaction);

          if (remaining.length !== 0) {
            throw new Error("unused test transaction response");
          }

          state.committed = true;
          return result;
        } catch (error) {
          state.rolledBack = true;
          throw error;
        }
      },
    },
  };
}

function dependencies(responses, queryRows = []) {
  const transaction = transactionManager(responses);
  const queryCalls = [];

  return {
    queryCalls,
    transaction,
    value: {
      queries: {
        async query(sql, parameters) {
          queryCalls.push({ sql, parameters });
          return queryResult(queryRows);
        },
      },
      transactions: transaction.manager,
    },
  };
}

test("reads one PostgreSQL tenant selection with bigint normalization", async () => {
  const fixture = dependencies([], [
    { tenantId: "11", version: "3" },
  ]);
  const repository = createPostgresTenantSelectionRepository(
    fixture.value,
  );

  assert.deepEqual(
    await repository.findByExternalUserId("verified-user"),
    { tenantId: 11, version: 3 },
  );
  assert.deepEqual(fixture.queryCalls[0].parameters, ["verified-user"]);
  assert.match(fixture.queryCalls[0].sql, /external_user_id = \$1/);
});

test("creates and updates eligible selections in read-committed transactions", async () => {
  const createdFixture = dependencies([
    queryResult([{ tenantId: "7", version: 1 }]),
  ]);
  const createdRepository = createPostgresTenantSelectionRepository(
    createdFixture.value,
  );
  const created = await createdRepository.save({
    externalUserId: "verified-user",
    tenantId: 7,
    expectedVersion: 0,
  });

  assert.deepEqual(created, {
    outcome: "saved",
    selection: { tenantId: 7, version: 1 },
  });
  assert.deepEqual(createdFixture.transaction.state.options, {
    isolationLevel: "read-committed",
  });
  assert.deepEqual(
    createdFixture.transaction.state.calls[0].parameters,
    ["verified-user", 7],
  );
  assert.equal(createdFixture.transaction.state.committed, true);

  const updatedFixture = dependencies([
    queryResult([{ tenantId: 11, version: 2 }]),
  ]);
  const updatedRepository = createPostgresTenantSelectionRepository(
    updatedFixture.value,
  );

  assert.deepEqual(
    await updatedRepository.save({
      externalUserId: "verified-user",
      tenantId: 11,
      expectedVersion: 1,
    }),
    {
      outcome: "saved",
      selection: { tenantId: 11, version: 2 },
    },
  );
  assert.deepEqual(
    updatedFixture.transaction.state.calls[0].parameters,
    ["verified-user", 11, 1],
  );
});

test("returns unchanged only for an exact replay after locking", async () => {
  const fixture = dependencies([
    queryResult([]),
    queryResult([{ tenantId: 7, version: 1 }]),
  ]);
  const repository = createPostgresTenantSelectionRepository(
    fixture.value,
  );

  assert.deepEqual(
    await repository.save({
      externalUserId: "verified-user",
      tenantId: 7,
      expectedVersion: 0,
    }),
    {
      outcome: "unchanged",
      selection: { tenantId: 7, version: 1 },
    },
  );
  assert.match(fixture.transaction.state.calls[1].sql, /FOR UPDATE/);
  assert.equal(fixture.transaction.state.committed, true);
});

test("distinguishes stale conflicts from ineligible selections", async () => {
  const conflictFixture = dependencies([
    queryResult([]),
    queryResult([{ tenantId: 11, version: 4 }]),
  ]);
  const conflictRepository = createPostgresTenantSelectionRepository(
    conflictFixture.value,
  );

  assert.deepEqual(
    await conflictRepository.save({
      externalUserId: "verified-user",
      tenantId: 7,
      expectedVersion: 1,
    }),
    { outcome: "conflict", selection: null },
  );

  const rejectedFixture = dependencies([
    queryResult([]),
    queryResult([]),
  ]);
  const rejectedRepository = createPostgresTenantSelectionRepository(
    rejectedFixture.value,
  );

  assert.deepEqual(
    await rejectedRepository.save({
      externalUserId: "verified-user",
      tenantId: 19,
      expectedVersion: 0,
    }),
    { outcome: "rejected", selection: null },
  );
});

test("rolls back malformed PostgreSQL selection results", async () => {
  const fixture = dependencies([
    queryResult([{ tenantId: 7, version: 9 }]),
  ]);
  const repository = createPostgresTenantSelectionRepository(
    fixture.value,
  );

  await assert.rejects(
    repository.save({
      externalUserId: "verified-user",
      tenantId: 7,
      expectedVersion: 0,
    }),
    /mismatched tenant selection/,
  );
  assert.equal(fixture.transaction.state.committed, false);
  assert.equal(fixture.transaction.state.rolledBack, true);
});

test("rejects invalid selection input before opening a transaction", async () => {
  const fixture = dependencies([]);
  const repository = createPostgresTenantSelectionRepository(
    fixture.value,
  );

  await assert.rejects(
    repository.save({
      externalUserId: " ",
      tenantId: 7,
      expectedVersion: 0,
    }),
    /externalUserId is invalid/,
  );
  assert.equal(fixture.transaction.state.options, null);
});

test("freezes selection SQL around eligibility, version, and row locks", () => {
  assert.match(postgresTenantSelectionSql.create, /ON CONFLICT \(external_user_id\) DO NOTHING/);
  assert.match(postgresTenantSelectionSql.create, /tenant_memberships\.status = 'active'/);
  assert.match(postgresTenantSelectionSql.create, /'trial', 'active', 'payment_failed'/);
  assert.match(postgresTenantSelectionSql.update, /version = \$3/);
  assert.match(postgresTenantSelectionSql.lockByExternalUserId, /FOR UPDATE/);
});

test("rejects incomplete PostgreSQL selection dependencies", () => {
  assert.throws(
    () =>
      createPostgresTenantSelectionRepository({
        queries: {},
        transactions: {},
      }),
    /dependencies are invalid/,
  );
});
