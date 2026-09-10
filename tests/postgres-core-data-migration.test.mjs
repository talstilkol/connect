import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresCoreDataMigrationError,
  createPostgresCoreDataMigrationPlan,
  createPostgresCoreDataSnapshot,
  executePostgresCoreDataMigration,
} from "../server/platform/postgresCoreDataMigration.ts";
import {
  D1CoreDataSnapshotError,
  readD1CoreDataSnapshot,
} from "../scripts/read-d1-core-data-snapshot.mjs";
import {
  requireLocalDataMigrationRehearsalUrl,
} from "../scripts/verify-postgres-core-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 7).toString("base64");
const occurredAt = "2026-08-19T08:00:00.000Z";
const expiresAt = "2026-08-19T08:15:00.000Z";
const consentEventKey = `contact_consent_v1_${"a".repeat(64)}`;

function rawCoreTables() {
  return {
    tenants: [{
      id: 1,
      display_name: "Connect",
      status: "active",
      created_at: occurredAt,
      updated_at: occurredAt,
      provisioning_key: "connect-provisioning-key",
    }],
    tenant_memberships: [{
      id: 1,
      tenant_id: 1,
      external_user_id: "tal",
      role: "owner",
      status: "active",
      created_at: occurredAt,
      updated_at: occurredAt,
      version: 1,
    }],
    tenant_selections: [{
      external_user_id: "tal",
      tenant_id: 1,
      version: 1,
      created_at: occurredAt,
      updated_at: occurredAt,
    }],
    business_profiles: [{
      tenant_id: 1,
      business_name: "Connect",
      timezone: "Asia/Jerusalem",
      interface_language: "he",
      version: 1,
      created_at: occurredAt,
      updated_at: occurredAt,
    }],
    contacts: [{
      id: 1,
      tenant_id: 1,
      phone_e164: "+10000000000",
      first_name: null,
      last_name: null,
      email: null,
      company: "Connect",
      mailing_status: "subscribed",
      consent_status: "granted",
      consent_source: "owner-recorded",
      consent_recorded_at: occurredAt,
      consent_withdrawn_at: null,
      consent_evidence_reference: "connect-consent-evidence",
      version: 1,
      created_at: occurredAt,
      updated_at: occurredAt,
    }],
    contact_consent_events: [{
      id: 1,
      tenant_id: 1,
      contact_id: 1,
      event_type: "granted",
      source: "owner-recorded",
      occurred_at: occurredAt,
      evidence_reference: "connect-consent-evidence",
      actor_external_user_id: "tal",
      idempotency_key: consentEventKey,
      created_at: occurredAt,
    }],
    audit_logs: [{
      id: 1,
      tenant_id: 1,
      actor_external_user_id: "tal",
      action: "tenant.provisioned",
      target_type: "tenant",
      target_id: "1",
      metadata_json: "{\"z\":2,\"a\":1}",
      created_at: occurredAt,
      idempotency_key: "connect-provisioning-key",
    }],
  };
}

function createPlan(tables = rawCoreTables()) {
  return createPostgresCoreDataMigrationPlan({
    snapshot: createPostgresCoreDataSnapshot(tables),
    createdAt: occurredAt,
    expiresAt,
    evidenceHmacKey,
  });
}

function createCurrentD1Database() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const fileName of readdirSync("drizzle")
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort()) {
    database.exec(
      readFileSync(`drizzle/${fileName}`, "utf8")
        .replaceAll("--> statement-breakpoint", ""),
    );
  }
  return database;
}

function tableNameFromQuery(sql) {
  const match = /\bFROM\s+([a-z_]+)/i.exec(sql);
  return match?.[1] ?? null;
}

function createTargetFixture({
  nonEmptyTable = null,
  mutateTargetRow = null,
} = {}) {
  const sourceTables = rawCoreTables();
  const calls = [];
  let transactions = 0;

  return {
    calls,
    get transactions() {
      return transactions;
    },
    manager: {
      async transaction(options, execute) {
        transactions += 1;
        assert.deepEqual(options, { isolationLevel: "read-committed" });
        return execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            const tableName = tableNameFromQuery(sql);

            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return {
                rows: [{ count: tableName === nonEmptyTable ? "1" : "0" }],
                rowCount: 1,
              };
            }
            if (/^INSERT INTO /i.test(sql)) {
              return { rows: [], rowCount: 1 };
            }
            if (/^SELECT [\s\S]+\bFROM\s+[a-z_]+\s+ORDER BY/i.test(sql)) {
              const rows = sourceTables[tableName].map((row) => {
                const targetRow = { ...row };
                if (tableName === "audit_logs") {
                  targetRow.metadata_json = { a: 1, z: 2 };
                }
                return typeof mutateTargetRow === "function"
                  ? mutateTargetRow(tableName, targetRow)
                  : targetRow;
              });
              return { rows, rowCount: rows.length };
            }
            return { rows: [{}], rowCount: 1 };
          },
        });
      },
    },
  };
}

test("builds a short-lived, privacy-safe manifest", () => {
  const plan = createPlan();

  assert.equal(plan.manifest.length, 7);
  assert.equal(plan.manifest.every(({ rowCount }) => rowCount === 1), true);
  assert.match(plan.planId, /^connect_postgres_core_data_v1_[0-9a-f]{64}$/);
  assert.equal(
    plan.manifest.every(({ sourceDigest }) => (
      /^hmac_sha256_v1_[0-9a-f]{64}$/.test(sourceDigest)
    )),
    true,
  );

  const serializedManifest = JSON.stringify(plan.manifest);
  assert.doesNotMatch(serializedManifest, /\+10000000000|tal|Connect/);
});

test("loads and verifies all core rows inside one transaction", async () => {
  const fixture = createTargetFixture();
  const evidence = await executePostgresCoreDataMigration({
    plan: createPlan(),
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-19T08:05:00.000Z",
  });

  assert.equal(fixture.transactions, 1);
  assert.equal(evidence.tableCount, 7);
  assert.equal(evidence.totalRowCount, 7);
  assert.equal(
    evidence.tables.every(
      ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
    ),
    true,
  );
  assert.equal(
    fixture.calls.some(({ sql }) => /ACCESS EXCLUSIVE MODE/.test(sql)),
    true,
  );
  assert.equal(
    fixture.calls.filter(({ sql }) => /^INSERT INTO /i.test(sql)).length,
    7,
  );
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /\+10000000000|"tal"|"Connect"|owner-recorded/,
  );
});

test("rejects an expired or tampered plan before opening a transaction", async () => {
  const fixture = createTargetFixture();
  const plan = createPlan();

  await assert.rejects(
    executePostgresCoreDataMigration({
      plan,
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-19T08:15:00.001Z",
    }),
    (error) => (
      error instanceof PostgresCoreDataMigrationError &&
      error.code === "plan-expired"
    ),
  );

  await assert.rejects(
    executePostgresCoreDataMigration({
      plan: {
        ...plan,
        manifest: plan.manifest.map((entry, index) => (
          index === 0 ? { ...entry, rowCount: 2 } : entry
        )),
      },
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-19T08:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresCoreDataMigrationError &&
      error.code === "manifest-mismatch"
    ),
  );
  assert.equal(fixture.transactions, 0);
});

test("rejects a non-empty target instead of merging data", async () => {
  const fixture = createTargetFixture({ nonEmptyTable: "contacts" });

  await assert.rejects(
    executePostgresCoreDataMigration({
      plan: createPlan(),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-19T08:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresCoreDataMigrationError &&
      error.code === "target-not-empty" &&
      error.table === "contacts"
    ),
  );
  assert.equal(
    fixture.calls.some(({ sql }) => /^INSERT INTO /i.test(sql)),
    false,
  );
});

test("rejects target data that differs before the transaction can commit", async () => {
  const fixture = createTargetFixture({
    mutateTargetRow(tableName, row) {
      return tableName === "contacts"
        ? { ...row, company: "Changed during rehearsal" }
        : row;
    },
  });

  await assert.rejects(
    executePostgresCoreDataMigration({
      plan: createPlan(),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-19T08:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresCoreDataMigrationError &&
      error.code === "target-verification-failed" &&
      error.table === "contacts"
    ),
  );
});

test("rejects legacy consent evidence that cannot satisfy PostgreSQL", () => {
  const tables = rawCoreTables();
  tables.contact_consent_events[0].actor_external_user_id = null;

  assert.throws(
    () => createPostgresCoreDataSnapshot(tables),
    (error) => (
      error instanceof PostgresCoreDataMigrationError &&
      error.code === "row-invalid" &&
      error.table === "contact_consent_events" &&
      error.rowIndex === 0
    ),
  );
});

test("reads the current D1 schema in one checked snapshot", () => {
  const database = createCurrentD1Database();
  try {
    database.prepare(
      `INSERT INTO tenants (
         id, display_name, status, created_at, updated_at, provisioning_key
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      1,
      "Connect",
      "active",
      "2026-08-19 08:00:00",
      "2026-08-19 08:00:00",
      "connect-provisioning-key",
    );

    const snapshot = readD1CoreDataSnapshot(database);
    assert.equal(snapshot.tables.tenants.length, 1);
    assert.equal(
      snapshot.tables.tenants[0].created_at,
      "2026-08-19T08:00:00.000Z",
    );
    assert.equal(
      Object.values(snapshot.tables)
        .reduce((total, rows) => total + rows.length, 0),
      1,
    );
  } finally {
    database.close();
  }
});

test("rejects a D1 schema that is not the current migration contract", () => {
  const database = new DatabaseSync(":memory:");
  try {
    assert.throws(
      () => readD1CoreDataSnapshot(database),
      (error) => (
        error instanceof D1CoreDataSnapshotError &&
        error.code === "schema-mismatch" &&
        error.table === "tenants"
      ),
    );
  } finally {
    database.close();
  }
});

test("restricts the real rehearsal to the named local database", () => {
  assert.equal(
    requireLocalDataMigrationRehearsalUrl(
      "postgresql://127.0.0.1:55439/connect_data_migration_rehearsal",
    ),
    "postgresql://127.0.0.1:55439/connect_data_migration_rehearsal",
  );

  for (const invalid of [
    "postgresql://database.example:55439/connect_data_migration_rehearsal",
    "postgresql://tal:x@127.0.0.1:55439/connect_data_migration_rehearsal",
    "postgresql://127.0.0.1:55439/connect_driver_integration",
    "postgresql://127.0.0.1:55439/connect_data_migration_rehearsal?sslmode=disable",
  ]) {
    assert.throws(
      () => requireLocalDataMigrationRehearsalUrl(invalid),
      /POSTGRES_CORE_DATA_REHEARSAL_URL_INVALID/,
    );
  }
});
