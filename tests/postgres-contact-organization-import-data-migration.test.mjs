import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  createPostgresContactOrganizationImportDataMigrationPlan,
  createPostgresContactOrganizationImportDataSnapshot,
  executePostgresContactOrganizationImportDataMigration,
} from "../server/platform/postgresContactOrganizationImportDataMigration.ts";
import {
  D1DataMigrationSnapshotError,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  readD1ContactOrganizationImportSnapshot,
} from "../scripts/read-d1-contact-organization-import-snapshot.mjs";
import {
  requireLocalContactOrganizationImportDataMigrationUrl,
} from "../scripts/verify-postgres-contact-organization-import-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 31).toString("base64");
const occurredAt = "2026-08-20T08:00:00.000Z";
const completedAt = "2026-08-20T08:05:00.000Z";
const idempotencyKey = `contact_import_v1_${"a".repeat(64)}`;
const fingerprints = Object.freeze({
  created: "b".repeat(64),
  updated: "c".repeat(64),
  unchanged: "d".repeat(64),
  duplicate: "e".repeat(64),
});

function rawTables() {
  return {
    contact_tags: [{
      id: 1,
      tenant_id: 1,
      name: "Priority",
      normalized_name: "priority",
      created_at: occurredAt,
      updated_at: occurredAt,
    }],
    contact_lists: [{
      id: 1,
      tenant_id: 1,
      name: "Customers",
      normalized_name: "customers",
      created_at: occurredAt,
      updated_at: occurredAt,
    }],
    contact_tag_assignments: [{
      tenant_id: 1,
      contact_id: 1,
      tag_id: 1,
      created_at: occurredAt,
    }],
    contact_list_memberships: [{
      tenant_id: 1,
      contact_id: 1,
      list_id: 1,
      created_at: occurredAt,
    }],
    contact_import_jobs: [{
      id: 1,
      tenant_id: 1,
      idempotency_key: idempotencyKey,
      file_name: "private-customer-import.xlsx",
      total_rows: 5,
      processed_rows: 5,
      created_rows: 1,
      updated_rows: 1,
      unchanged_rows: 1,
      rejected_rows: 1,
      duplicate_rows: 1,
      status: "completed",
      created_by_external_user_id: "private-operator-identifier",
      created_at: occurredAt,
      updated_at: completedAt,
      completed_at: completedAt,
    }],
    contact_import_rows: [
      {
        id: 1,
        tenant_id: 1,
        job_id: 1,
        source_row_number: 2,
        contact_id: 1,
        phone_fingerprint: fingerprints.created,
        status: "created",
        reason: null,
        created_at: occurredAt,
      },
      {
        id: 2,
        tenant_id: 1,
        job_id: 1,
        source_row_number: 3,
        contact_id: 1,
        phone_fingerprint: fingerprints.updated,
        status: "updated",
        reason: null,
        created_at: occurredAt,
      },
      {
        id: 3,
        tenant_id: 1,
        job_id: 1,
        source_row_number: 4,
        contact_id: 1,
        phone_fingerprint: fingerprints.unchanged,
        status: "unchanged",
        reason: null,
        created_at: occurredAt,
      },
      {
        id: 4,
        tenant_id: 1,
        job_id: 1,
        source_row_number: 5,
        contact_id: null,
        phone_fingerprint: fingerprints.duplicate,
        status: "duplicate",
        reason: "duplicate_in_file",
        created_at: occurredAt,
      },
      {
        id: 5,
        tenant_id: 1,
        job_id: 1,
        source_row_number: 6,
        contact_id: null,
        phone_fingerprint: null,
        status: "rejected",
        reason: "missing_phone",
        created_at: occurredAt,
      },
    ],
  };
}

function createPlan(tables = rawTables()) {
  return createPostgresContactOrganizationImportDataMigrationPlan({
    snapshot: createPostgresContactOrganizationImportDataSnapshot(tables),
    createdAt: "2026-08-20T10:00:00.000Z",
    expiresAt: "2026-08-20T10:15:00.000Z",
    evidenceHmacKey,
  });
}

function tableNameFromTargetRead(sql) {
  return /^SELECT[\s\S]+?FROM\s+([a-z_]+)\s+ORDER BY/i.exec(sql)?.[1] ?? null;
}

function createTargetFixture({ invalidLoadedState = false } = {}) {
  const tables = rawTables();
  const calls = [];
  let committed = false;
  let rolledBack = false;
  let verificationCalls = 0;
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      try {
        const value = await execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return { rows: [{ count: "0" }], rowCount: 1 };
            }
            if (/^INSERT INTO ([a-z_]+)/i.test(sql)) {
              const tableName = /^INSERT INTO ([a-z_]+)/i.exec(sql)[1];
              return { rows: [], rowCount: tables[tableName].length };
            }
            if (/^WITH row_counts|^SELECT 1\s+FROM contact_import_rows/i.test(sql)) {
              verificationCalls += 1;
              const invalid = invalidLoadedState && verificationCalls === 1;
              return invalid
                ? { rows: [{ invalid: 1 }], rowCount: 1 }
                : { rows: [], rowCount: 0 };
            }
            if (/^SELECT setval/i.test(sql)) {
              return { rows: [{}], rowCount: 1 };
            }
            const tableName = tableNameFromTargetRead(sql);
            if (tableName) {
              return {
                rows: tables[tableName],
                rowCount: tables[tableName].length,
              };
            }
            return { rows: [{}], rowCount: 1 };
          },
        });
        committed = true;
        return value;
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

test("builds a six-table plan whose manifest and evidence expose no row data", async () => {
  const plan = createPlan();
  const fixture = createTargetFixture();
  const evidence = await executePostgresContactOrganizationImportDataMigration({
    plan,
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T10:05:00.000Z",
  });
  const serializedPublicArtifacts = JSON.stringify({
    manifest: plan.manifest,
    evidence,
  });

  assert.equal(plan.manifest.length, 6);
  assert.equal(evidence.tableCount, 6);
  assert.equal(evidence.totalRowCount, 10);
  assert.equal(fixture.committed, true);
  assert.equal(fixture.rolledBack, false);
  assert.match(
    plan.planId,
    /^connect_postgres_contact_organization_import_data_v1_[0-9a-f]{64}$/,
  );
  assert.doesNotMatch(
    serializedPublicArtifacts,
    /private-customer|private-operator|priority|customers|bbbbbbbb/,
  );
  assert.equal(
    evidence.tables.every(
      ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
    ),
    true,
  );
  assert.equal(
    fixture.calls.filter(({ sql }) => /^SELECT setval/i.test(sql)).length,
    4,
  );
});

test("rejects D1 legacy values that violate the PostgreSQL contract", () => {
  const invalidCases = [
    ["contact_tags", "name", " Priority "],
    ["contact_import_jobs", "idempotency_key", "legacy-key"],
    ["contact_import_jobs", "file_name", "unsafe.txt"],
    ["contact_import_rows", "phone_fingerprint", "raw-phone-value"],
  ];

  for (const [tableName, fieldName, value] of invalidCases) {
    const tables = rawTables();
    tables[tableName][0][fieldName] = value;
    assert.throws(
      () => createPostgresContactOrganizationImportDataSnapshot(tables),
      (error) => (
        error instanceof PostgresDataMigrationError &&
        error.code === "row-invalid" &&
        error.table === tableName &&
        error.rowIndex === 0
      ),
    );
  }
});

test("rolls back atomically when import counters do not match loaded rows", async () => {
  const fixture = createTargetFixture({ invalidLoadedState: true });

  await assert.rejects(
    executePostgresContactOrganizationImportDataMigration({
      plan: createPlan(),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "target-verification-failed"
    ),
  );
  assert.equal(fixture.committed, false);
  assert.equal(fixture.rolledBack, true);
});

test("reads all six current D1 tables in one integrity-checked snapshot", () => {
  const database = createCurrentD1Database();
  try {
    database.prepare(
      `INSERT INTO tenants (
         id, display_name, status, created_at, updated_at, provisioning_key
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, "Connect", "active", occurredAt, occurredAt, "organization-key");
    database.prepare(
      `INSERT INTO contacts (
         id, tenant_id, phone_e164, mailing_status, consent_status,
         version, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 1, "+972501234567", "unsubscribed", "unknown", 1,
      occurredAt, occurredAt);
    database.prepare(
      `INSERT INTO contact_tags (
         id, tenant_id, name, normalized_name, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, 1, "Priority", "priority", occurredAt, occurredAt);
    database.prepare(
      `INSERT INTO contact_lists (
         id, tenant_id, name, normalized_name, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, 1, "Customers", "customers", occurredAt, occurredAt);
    database.prepare(
      `INSERT INTO contact_tag_assignments (
         tenant_id, contact_id, tag_id, created_at
       ) VALUES (?, ?, ?, ?)`,
    ).run(1, 1, 1, occurredAt);
    database.prepare(
      `INSERT INTO contact_list_memberships (
         tenant_id, contact_id, list_id, created_at
       ) VALUES (?, ?, ?, ?)`,
    ).run(1, 1, 1, occurredAt);
    database.prepare(
      `INSERT INTO contact_import_jobs (
         id, tenant_id, idempotency_key, file_name, total_rows,
         processed_rows, created_rows, updated_rows, unchanged_rows,
         rejected_rows, duplicate_rows, status, created_by_external_user_id,
         created_at, updated_at, completed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      1, 1, idempotencyKey, "contacts.csv", 2,
      2, 1, 0, 0, 1, 0, "completed", "operator-user",
      occurredAt, completedAt, completedAt,
    );
    database.prepare(
      `INSERT INTO contact_import_rows (
         id, tenant_id, job_id, source_row_number, contact_id,
         phone_fingerprint, status, reason, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 1, 1, 2, 1, fingerprints.created, "created", null, occurredAt);
    database.prepare(
      `INSERT INTO contact_import_rows (
         id, tenant_id, job_id, source_row_number, contact_id,
         phone_fingerprint, status, reason, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(2, 1, 1, 3, null, null, "rejected", "missing_phone", occurredAt);

    const snapshot = readD1ContactOrganizationImportSnapshot(database);
    assert.equal(snapshot.tables.contact_tags.length, 1);
    assert.equal(snapshot.tables.contact_lists.length, 1);
    assert.equal(snapshot.tables.contact_tag_assignments.length, 1);
    assert.equal(snapshot.tables.contact_list_memberships.length, 1);
    assert.equal(snapshot.tables.contact_import_jobs.length, 1);
    assert.equal(snapshot.tables.contact_import_rows.length, 2);
  } finally {
    database.close();
  }
});

test("rejects a D1 schema outside the exact six-table source contract", () => {
  const database = new DatabaseSync(":memory:");
  try {
    assert.throws(
      () => readD1ContactOrganizationImportSnapshot(database),
      (error) => (
        error instanceof D1DataMigrationSnapshotError &&
        error.code === "schema-mismatch" &&
        error.table === "contact_tags"
      ),
    );
  } finally {
    database.close();
  }
});

test("limits the real rehearsal URL to its passwordless local database", () => {
  assert.equal(
    requireLocalContactOrganizationImportDataMigrationUrl(
      "postgresql://tal@127.0.0.1:55432/" +
        "connect_contact_organization_import_data_migration_rehearsal",
    ),
    "postgresql://tal@127.0.0.1:55432/" +
      "connect_contact_organization_import_data_migration_rehearsal",
  );
  for (const unsafe of [
    "postgresql://tal:secret@127.0.0.1:55432/" +
      "connect_contact_organization_import_data_migration_rehearsal",
    "postgresql://tal@database.example.com:55432/" +
      "connect_contact_organization_import_data_migration_rehearsal",
    "postgresql://tal@127.0.0.1:55432/connect",
    "postgresql://tal@127.0.0.1:55432/" +
      "connect_contact_organization_import_data_migration_rehearsal?ssl=true",
  ]) {
    assert.throws(
      () => requireLocalContactOrganizationImportDataMigrationUrl(unsafe),
      /POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_URL_INVALID/,
    );
  }
});
