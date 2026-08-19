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
