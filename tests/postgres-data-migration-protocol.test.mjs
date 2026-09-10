import assert from "node:assert/strict";
import test from "node:test";

import {
  PostgresDataMigrationError,
  createPostgresDataMigrationProtocol,
} from "../server/platform/postgresDataMigrationProtocol.ts";

const evidenceHmacKey = Buffer.alloc(32, 19).toString("base64");
const createdAt = "2026-08-20T08:00:00.000Z";
const expiresAt = "2026-08-20T08:15:00.000Z";
const sourceRows = [{
  id: 1,
  label: "private migration value",
  occurred_at: createdAt,
}];

function createProtocol({ verifyLoadedState } = {}) {
  return createPostgresDataMigrationProtocol({
    version: "connect_postgres_protocol_test_v1",
    planKind: "postgres-protocol-test-migration-plan",
    evidenceKind: "postgres-protocol-test-migration-evidence",
    advisoryLockKey: [1129270867, 1],
    tables: [{
      name: "records",
      columns: [
        { name: "id", kind: "positive-integer" },
        { name: "label", kind: "text" },
        { name: "occurred_at", kind: "timestamp" },
      ],
      orderBy: ["id"],
      identityColumn: "id",
    }],
    triggerDisabledTables: ["records"],
    verifyLoadedState,
  });
}

function createPlan(protocol = createProtocol()) {
  return protocol.createPlan({
    snapshot: protocol.createSnapshot({ records: sourceRows }),
    createdAt,
    expiresAt,
    evidenceHmacKey,
  });
}

function createTargetFixture({
  nonEmpty = false,
  targetRows = sourceRows,
  verifyResult = true,
  insertError = null,
} = {}) {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      try {
        const result = await execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return {
                rows: [{ count: nonEmpty ? "1" : "0" }],
                rowCount: 1,
              };
            }
            if (/^INSERT INTO /i.test(sql)) {
              if (insertError) throw insertError;
              return { rows: [], rowCount: 1 };
            }
            if (/^SELECT setval/i.test(sql)) {
              return { rows: [{}], rowCount: 1 };
            }
            if (/^SELECT true AS verified/i.test(sql)) {
              return {
                rows: [{ verified: verifyResult }],
                rowCount: 1,
              };
            }
            if (/^SELECT [\s\S]+FROM records\s+ORDER BY/i.test(sql)) {
              return { rows: targetRows, rowCount: targetRows.length };
            }
            return { rows: [{}], rowCount: 1 };
          },
        });
        committed = true;
        return result;
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  };
  return {
    calls,
    manager,
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
  };
}

test("rejects unsafe table configuration before constructing a protocol", () => {
  assert.throws(
    () => createPostgresDataMigrationProtocol({
      version: "connect_postgres_protocol_test_v1",
      planKind: "postgres-protocol-test-migration-plan",
      evidenceKind: "postgres-protocol-test-migration-evidence",
      advisoryLockKey: [1129270867, 1],
      tables: [{
        name: "records; DROP TABLE tenants",
        columns: [{ name: "id", kind: "positive-integer" }],
        orderBy: ["id"],
      }],
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "configuration-invalid"
    ),
  );

  assert.throws(
    () => createPostgresDataMigrationProtocol({
      version: "connect_postgres_protocol_test_v1",
      planKind: "postgres-protocol-test-migration-plan",
      evidenceKind: "postgres-protocol-test-migration-evidence",
      advisoryLockKey: [1129270867, 1],
      tables: [{
        name: "records",
        columns: [{ name: "id", kind: "positive-integer" }],
        orderBy: ["id"],
      }],
      triggerDisabledTables: ["unscoped_table"],
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "configuration-invalid"
    ),
  );
});

test("builds a short-lived manifest without exposing row values", () => {
  const plan = createPlan();

  assert.match(
    plan.planId,
    /^connect_postgres_protocol_test_v1_[0-9a-f]{64}$/,
  );
  assert.match(plan.manifest[0].sourceDigest, /^hmac_sha256_v1_[0-9a-f]{64}$/);
  assert.doesNotMatch(JSON.stringify(plan.manifest), /private migration value/);
});

test("disables only configured user triggers and verifies before commit", async () => {
  const protocol = createProtocol({
    async verifyLoadedState(transaction) {
      const result = await transaction.query(
        "SELECT true AS verified",
        [],
      );
      if (result.rows[0]?.verified !== true) throw new Error("not verified");
    },
  });
  const fixture = createTargetFixture();
  const evidence = await protocol.execute({
    plan: createPlan(protocol),
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T08:05:00.000Z",
  });

  const statements = fixture.calls.map(({ sql }) => sql);
  const disableIndex = statements.findIndex((sql) => (
    /ALTER TABLE records DISABLE TRIGGER USER/.test(sql)
  ));
  const insertIndex = statements.findIndex((sql) => /^INSERT INTO records/.test(sql));
  const enableIndex = statements.findIndex((sql) => (
    /ALTER TABLE records ENABLE TRIGGER USER/.test(sql)
  ));
  const verifyIndex = statements.findIndex((sql) => (
    /^SELECT true AS verified/.test(sql)
  ));

  assert.equal(disableIndex < insertIndex, true);
  assert.equal(insertIndex < enableIndex, true);
  assert.equal(enableIndex < verifyIndex, true);
  assert.equal(fixture.committed, true);
  assert.equal(fixture.rolledBack, false);
  assert.equal(evidence.tableCount, 1);
  assert.equal(evidence.totalRowCount, 1);
  assert.equal(
    evidence.tables[0].sourceDigest,
    evidence.tables[0].targetDigest,
  );
  assert.doesNotMatch(JSON.stringify(evidence), /private migration value/);
});

test("rejects expired, tampered, and non-empty migrations fail closed", async () => {
  const protocol = createProtocol();
  const plan = createPlan(protocol);
  const beforeTransaction = createTargetFixture();

  await assert.rejects(
    protocol.execute({
      plan,
      transactions: beforeTransaction.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:15:00.001Z",
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "plan-expired"
    ),
  );
  assert.equal(beforeTransaction.calls.length, 0);

  await assert.rejects(
    protocol.execute({
      plan: {
        ...plan,
        manifest: [{ ...plan.manifest[0], rowCount: 2 }],
      },
      transactions: beforeTransaction.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "manifest-mismatch"
    ),
  );
  assert.equal(beforeTransaction.calls.length, 0);

  await assert.rejects(
    protocol.execute({
      plan: {
        ...plan,
        payload: { ...plan.payload, tables: null },
      },
      transactions: beforeTransaction.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "plan-invalid"
    ),
  );
  assert.equal(beforeTransaction.calls.length, 0);

  const nonEmpty = createTargetFixture({ nonEmpty: true });
  await assert.rejects(
    protocol.execute({
      plan,
      transactions: nonEmpty.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "target-not-empty" &&
      error.table === "records"
    ),
  );
  assert.equal(
    nonEmpty.calls.some(({ sql }) => /^INSERT INTO /.test(sql)),
    false,
  );
  assert.equal(nonEmpty.rolledBack, true);
});

test("rolls back when post-load lineage verification fails", async () => {
  const protocol = createProtocol({
    async verifyLoadedState(transaction) {
      const result = await transaction.query(
        "SELECT true AS verified",
        [],
      );
      if (result.rows[0]?.verified !== true) throw new Error("not verified");
    },
  });
  const fixture = createTargetFixture({ verifyResult: false });

  await assert.rejects(
    protocol.execute({
      plan: createPlan(protocol),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "target-verification-failed"
    ),
  );
  assert.equal(fixture.committed, false);
  assert.equal(fixture.rolledBack, true);
});

test("maps raw insert failures to a bounded privacy-safe error", async () => {
  const privateValue = "private-row-value@example.com";
  const fixture = createTargetFixture({
    insertError: new Error(`database rejected ${privateValue}`),
  });

  await assert.rejects(
    createProtocol().execute({
      plan: createPlan(),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "target-verification-failed" &&
      error.table === "records" &&
      !error.message.includes(privateValue)
    ),
  );
  assert.equal(fixture.committed, false);
  assert.equal(fixture.rolledBack, true);
});

test("normalizes D1 integer and PostgreSQL boolean values identically", async () => {
  const protocol = createPostgresDataMigrationProtocol({
    version: "connect_postgres_boolean_protocol_test_v1",
    planKind: "postgres-boolean-protocol-test-migration-plan",
    evidenceKind: "postgres-boolean-protocol-test-migration-evidence",
    advisoryLockKey: [1129270867, 3],
    tables: [{
      name: "flags",
      columns: [
        { name: "id", kind: "positive-integer" },
        { name: "enabled", kind: "boolean-integer" },
      ],
      orderBy: ["id"],
    }],
  });
  const snapshot = protocol.createSnapshot({
    flags: [{ id: 1, enabled: 1 }, { id: 2, enabled: 0 }],
  });
  const plan = protocol.createPlan({
    snapshot,
    createdAt,
    expiresAt,
    evidenceHmacKey,
  });
  const calls = [];
  const transactions = {
    async transaction(_options, execute) {
      return execute({
        async query(sql, parameters) {
          calls.push({ sql, parameters });
          if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
            return { rows: [{ count: "0" }], rowCount: 1 };
          }
          if (/^INSERT INTO flags/i.test(sql)) {
            return { rows: [], rowCount: 2 };
          }
          if (/^SELECT [\s\S]+FROM flags\s+ORDER BY/i.test(sql)) {
            return {
              rows: [{ id: "1", enabled: true }, { id: "2", enabled: false }],
              rowCount: 2,
            };
          }
          return { rows: [{}], rowCount: 1 };
        },
      });
    },
  };
  const evidence = await protocol.execute({
    plan,
    transactions,
    evidenceHmacKey,
    now: "2026-08-20T08:05:00.000Z",
  });
  const insert = calls.find(({ sql }) => /^INSERT INTO flags/i.test(sql));
  assert.match(insert.sql, /\(\$2::integer\)::boolean/);
  assert.deepEqual(insert.parameters, [1, 1, 2, 0]);
  assert.equal(evidence.tables[0].sourceDigest, evidence.tables[0].targetDigest);

  for (const invalid of [2, -1, "true", null]) {
    assert.throws(
      () => protocol.createSnapshot({ flags: [{ id: 1, enabled: invalid }] }),
      (error) => error instanceof PostgresDataMigrationError &&
        error.code === "row-invalid",
    );
  }
});

test("reads calendar dates as text without a timezone conversion", async () => {
  const protocol = createPostgresDataMigrationProtocol({
    version: "connect_postgres_date_protocol_test_v1",
    planKind: "postgres-date-protocol-test-migration-plan",
    evidenceKind: "postgres-date-protocol-test-migration-evidence",
    advisoryLockKey: [1129270867, 4],
    tables: [{
      name: "periods",
      columns: [
        { name: "id", kind: "positive-integer" },
        { name: "period_start", kind: "date" },
      ],
      orderBy: ["id"],
    }],
  });
  const snapshot = protocol.createSnapshot({
    periods: [{ id: 1, period_start: "2026-08-01" }],
  });
  const plan = protocol.createPlan({
    snapshot,
    createdAt,
    expiresAt,
    evidenceHmacKey,
  });
  const calls = [];
  const evidence = await protocol.execute({
    plan,
    evidenceHmacKey,
    now: "2026-08-20T08:05:00.000Z",
    transactions: {
      async transaction(_options, execute) {
        return execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return { rows: [{ count: "0" }], rowCount: 1 };
            }
            if (/^INSERT INTO periods/i.test(sql)) {
              return { rows: [], rowCount: 1 };
            }
            if (/^SELECT [\s\S]+FROM periods\s+ORDER BY/i.test(sql)) {
              return {
                rows: [{ id: "1", period_start: "2026-08-01" }],
                rowCount: 1,
              };
            }
            return { rows: [{}], rowCount: 1 };
          },
        });
      },
    },
  });
  const insert = calls.find(({ sql }) => /^INSERT INTO periods/i.test(sql));
  const targetRead = calls.find(({ sql }) => (
    /^SELECT [\s\S]+FROM periods\s+ORDER BY/i.test(sql)
  ));
  assert.match(insert.sql, /\$2::date/);
  assert.match(targetRead.sql, /period_start::text AS period_start/);
  assert.equal(evidence.tables[0].sourceDigest, evidence.tables[0].targetDigest);

  for (const invalid of ["2026-02-30", "2026-8-01", "not-a-date", null]) {
    assert.throws(
      () => protocol.createSnapshot({
        periods: [{ id: 1, period_start: invalid }],
      }),
      (error) => error instanceof PostgresDataMigrationError &&
        error.code === "row-invalid",
    );
  }
});
