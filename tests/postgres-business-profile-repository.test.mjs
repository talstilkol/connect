import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBusinessProfileRepository,
  postgresBusinessProfileSql,
} from "../server/platform/postgresBusinessProfileRepository.ts";

const createdAt = new Date("2026-08-17T07:00:00.000Z");
const updatedAt = new Date("2026-08-17T07:05:00.000Z");

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function profileRow(overrides = {}) {
  return {
    tenantId: "7",
    businessName: "Connect Business",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
    version: 1,
    createdAt,
    updatedAt,
    ...overrides,
  };
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

test("reads and normalizes a PostgreSQL business profile", async () => {
  const fixture = dependencies([], [profileRow()]);
  const repository = createPostgresBusinessProfileRepository(
    fixture.value,
  );
  const profile = await repository.findByTenantId(7);

  assert.deepEqual(profile, {
    tenantId: 7,
    businessName: "Connect Business",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
    version: 1,
    createdAt: "2026-08-17T07:00:00.000Z",
    updatedAt: "2026-08-17T07:05:00.000Z",
  });
  assert.deepEqual(fixture.queryCalls[0].parameters, [7]);
  assert.equal(Object.isFrozen(profile), true);
});

test("saves tenant display name and profile in one transaction", async () => {
  const fixture = dependencies([
    queryResult([{ id: "7" }]),
    queryResult([{ tenantId: "7" }]),
    queryResult([profileRow()]),
  ]);
  const repository = createPostgresBusinessProfileRepository(
    fixture.value,
  );

  await repository.save({
    tenantId: 7,
    businessName: " Connect Business ",
    timezone: " Asia/Jerusalem ",
    interfaceLanguage: "he",
  });

  assert.deepEqual(fixture.transaction.state.options, {
    isolationLevel: "read-committed",
  });
  assert.deepEqual(
    fixture.transaction.state.calls.map(({ parameters }) => parameters),
    [
      [7, "Connect Business"],
      [7, "Connect Business", "Asia/Jerusalem", "he"],
      [7],
    ],
  );
  assert.equal(fixture.transaction.state.committed, true);
  assert.equal(fixture.transaction.state.rolledBack, false);
});

test("confirms an identical no-op profile before commit", async () => {
  const fixture = dependencies([
    queryResult([]),
    queryResult([]),
    queryResult([profileRow({ version: "4" })]),
  ]);
  const repository = createPostgresBusinessProfileRepository(
    fixture.value,
  );

  await repository.save({
    tenantId: 7,
    businessName: "Connect Business",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  });

  assert.equal(fixture.transaction.state.committed, true);
});

test("rolls back when PostgreSQL cannot confirm the requested profile", async () => {
  const fixture = dependencies([
    queryResult([{ id: 7 }]),
    queryResult([{ tenantId: 7 }]),
    queryResult([
      profileRow({ businessName: "Unexpected profile" }),
    ]),
  ]);
  const repository = createPostgresBusinessProfileRepository(
    fixture.value,
  );

  await assert.rejects(
    repository.save({
      tenantId: 7,
      businessName: "Connect Business",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
    }),
    /write was not confirmed/,
  );
  assert.equal(fixture.transaction.state.committed, false);
  assert.equal(fixture.transaction.state.rolledBack, true);
});

test("rejects cross-tenant profile reads and write results", async () => {
  const readFixture = dependencies([], [
    profileRow({ tenantId: "11" }),
  ]);
  const readRepository = createPostgresBusinessProfileRepository(
    readFixture.value,
  );

  await assert.rejects(
    readRepository.findByTenantId(7),
    /cross-tenant business profile/,
  );

  const writeFixture = dependencies([
    queryResult([{ id: "11" }]),
  ]);
  const writeRepository = createPostgresBusinessProfileRepository(
    writeFixture.value,
  );

  await assert.rejects(
    writeRepository.save({
      tenantId: 7,
      businessName: "Connect Business",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
    }),
    /cross-tenant write result/,
  );
  assert.equal(writeFixture.transaction.state.rolledBack, true);
});

test("rejects invalid profile input before PostgreSQL access", async () => {
  const fixture = dependencies([]);
  const repository = createPostgresBusinessProfileRepository(
    fixture.value,
  );

  await assert.rejects(
    repository.save({
      tenantId: 0,
      businessName: "Connect Business",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
    }),
    /tenantId must be a positive integer/,
  );
  assert.equal(fixture.transaction.state.options, null);
});

test("uses PostgreSQL null-safe profile change detection", () => {
  assert.match(
    postgresBusinessProfileSql.updateTenantDisplayName,
    /display_name IS DISTINCT FROM \$2/,
  );
  assert.match(
    postgresBusinessProfileSql.upsert,
    /ON CONFLICT \(tenant_id\) DO UPDATE/,
  );
  assert.match(
    postgresBusinessProfileSql.upsert,
    /business_profiles\.timezone IS DISTINCT FROM EXCLUDED\.timezone/,
  );
  assert.match(postgresBusinessProfileSql.upsert, /RETURNING tenant_id/);
});

test("rejects incomplete PostgreSQL business profile dependencies", () => {
  assert.throws(
    () =>
      createPostgresBusinessProfileRepository({
        queries: {},
        transactions: {},
      }),
    /dependencies are invalid/,
  );
});
