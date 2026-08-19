import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_TABLE_CONTRACTS,
  createPostgresContactOrganizationImportDataMigrationPlan,
  executePostgresContactOrganizationImportDataMigration,
} from "../server/platform/postgresContactOrganizationImportDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1ContactOrganizationImportSnapshot,
} from "./read-d1-contact-organization-import-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName =
  "connect_contact_organization_import_data_migration_rehearsal";
const environmentKey =
  "CONNECT_POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_MIGRATION_REHEARSAL_URL";
const evidenceHmacKey = Buffer.alloc(32, 37).toString("base64");
const times = Object.freeze({
  created: "2026-08-20T08:00:00.000Z",
  completed: "2026-08-20T08:05:00.000Z",
  changed: "2026-08-20T09:00:00.000Z",
});
const keys = Object.freeze({
  completedImport: `contact_import_v1_${"1".repeat(64)}`,
  pendingImport: `contact_import_v1_${"2".repeat(64)}`,
});
const fingerprints = Object.freeze({
  created: "a".repeat(64),
  duplicate: "b".repeat(64),
  crossTenant: "c".repeat(64),
});

function fail(code) {
  throw new Error(`POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_${code}`);
}

export function requireLocalContactOrganizationImportDataMigrationUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    fail("URL_INVALID");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("URL_INVALID");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== `/${databaseName}` ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    fail("URL_INVALID");
  }
  const port = Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail("URL_INVALID");
  }
  return url.toString();
}

async function migrationFiles(directory) {
  return (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
}

async function applyD1Migrations(database) {
  const directory = join(projectRoot, "drizzle");
  for (const fileName of await migrationFiles(directory)) {
    database.exec(
      (await readFile(join(directory, fileName), "utf8"))
        .replaceAll("--> statement-breakpoint", ""),
    );
  }
}

async function applyPostgresMigrations(pool) {
  const existing = await pool.query(
    `SELECT count(*)::integer AS count
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'`,
  );
  if (existing.rows[0]?.count !== 0) fail("DATABASE_NOT_EMPTY");

  const directory = join(projectRoot, "postgres", "migrations");
  for (const fileName of await migrationFiles(directory)) {
    await pool.query(await readFile(join(directory, fileName), "utf8"));
  }
}

function seedD1Core(database) {
  const insertTenant = database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insertTenant.run(
    1, "Primary rehearsal tenant", "active", times.created, times.created,
    "contact-organization-primary",
  );
  insertTenant.run(
    2, "Isolation rehearsal tenant", "active", times.created, times.created,
    "contact-organization-isolation",
  );
  const insertContact = database.prepare(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       version, created_at, updated_at
     ) VALUES (?, ?, ?, 'unsubscribed', 'unknown', 1, ?, ?)`,
  );
  insertContact.run(1, 1, "+972501111111", times.created, times.created);
  insertContact.run(2, 1, "+972502222222", times.created, times.created);
  insertContact.run(3, 2, "+972503333333", times.created, times.created);
}

function seedD1Slice(database) {
  const insertGroup = (table, values) => database.prepare(
    `INSERT INTO ${table} (
       id, tenant_id, name, normalized_name, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(...values);
  insertGroup("contact_tags", [
    1, 1, "Priority", "priority", times.created, times.created,
  ]);
  insertGroup("contact_tags", [
    2, 2, "Isolated", "isolated", times.created, times.created,
  ]);
  insertGroup("contact_lists", [
    1, 1, "Customers", "customers", times.created, times.created,
  ]);
  insertGroup("contact_lists", [
    2, 2, "Other tenant", "other tenant", times.created, times.created,
  ]);
  database.prepare(
    `INSERT INTO contact_tag_assignments (
       tenant_id, contact_id, tag_id, created_at
     ) VALUES (?, ?, ?, ?)`,
  ).run(1, 1, 1, times.created);
  database.prepare(
    `INSERT INTO contact_list_memberships (
       tenant_id, contact_id, list_id, created_at
     ) VALUES (?, ?, ?, ?)`,
  ).run(1, 1, 1, times.created);
  database.prepare(
    `INSERT INTO contact_import_jobs (
       id, tenant_id, idempotency_key, file_name, total_rows,
       processed_rows, created_rows, updated_rows, unchanged_rows,
       rejected_rows, duplicate_rows, status, created_by_external_user_id,
       created_at, updated_at, completed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    1, 1, keys.completedImport, "private-contacts.xlsx", 3,
    3, 1, 0, 0, 1, 1, "completed", "private-operator-user",
    times.created, times.completed, times.completed,
  );
  const insertImportRow = database.prepare(
    `INSERT INTO contact_import_rows (
       id, tenant_id, job_id, source_row_number, contact_id,
       phone_fingerprint, status, reason, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertImportRow.run(
    1, 1, 1, 2, 1, fingerprints.created, "created", null, times.created,
  );
  insertImportRow.run(
    2, 1, 1, 3, null, null, "rejected", "missing_phone", times.created,
  );
  insertImportRow.run(
    3, 1, 1, 4, null, fingerprints.duplicate, "duplicate",
    "duplicate_in_file", times.created,
  );
}

async function seedPostgresCore(pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES
       (1, 'Primary rehearsal tenant', 'active', $1, $1,
        'contact-organization-primary'),
       (2, 'Isolation rehearsal tenant', 'active', $1, $1,
        'contact-organization-isolation')`,
    [times.created],
  );
  await pool.query(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       version, created_at, updated_at
     ) VALUES
       (1, 1, '+972501111111', 'unsubscribed', 'unknown', 1, $1, $1),
       (2, 1, '+972502222222', 'unsubscribed', 'unknown', 1, $1, $1),
       (3, 2, '+972503333333', 'unsubscribed', 'unknown', 1, $1, $1)`,
    [times.created],
  );
}

async function captureOutcome(operation) {
  try {
    await operation();
    return "accepted";
  } catch {
    return "rejected";
  }
}

async function compareOutcome(
  observations,
  name,
  d1Operation,
  postgresOperation,
  expected,
) {
  const d1Outcome = await captureOutcome(d1Operation);
  const postgresOutcome = await captureOutcome(postgresOperation);
  assert.equal(postgresOutcome, d1Outcome, `${name} diverged`);
  assert.equal(d1Outcome, expected, `${name} outcome was not ${expected}`);
  observations.push(Object.freeze({ name, outcome: expected }));
}

async function runSemanticParityScenarios(database, pool) {
  const observations = [];
  await compareOutcome(
    observations,
    "tag-upsert",
    () => database.prepare(
      `INSERT INTO contact_tags (tenant_id, name, normalized_name, updated_at)
       VALUES (1, ?, 'priority', ?)
       ON CONFLICT (tenant_id, normalized_name) DO UPDATE SET
         name = excluded.name,
         updated_at = excluded.updated_at`,
    ).run("Priority customers", times.changed),
    () => pool.query(
      `INSERT INTO contact_tags (tenant_id, name, normalized_name, updated_at)
       VALUES (1, $1, 'priority', $2)
       ON CONFLICT (tenant_id, normalized_name) DO UPDATE SET
         name = excluded.name,
         updated_at = excluded.updated_at`,
      ["Priority customers", times.changed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "tag-assignment",
    () => database.prepare(
      `INSERT INTO contact_tag_assignments (
         tenant_id, contact_id, tag_id, created_at
       ) VALUES (1, 2, 1, ?)`,
    ).run(times.changed),
    () => pool.query(
      `INSERT INTO contact_tag_assignments (
         tenant_id, contact_id, tag_id, created_at
       ) VALUES (1, 2, 1, $1)`,
      [times.changed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "list-membership",
    () => database.prepare(
      `INSERT INTO contact_list_memberships (
         tenant_id, contact_id, list_id, created_at
       ) VALUES (1, 2, 1, ?)`,
    ).run(times.changed),
    () => pool.query(
      `INSERT INTO contact_list_memberships (
         tenant_id, contact_id, list_id, created_at
       ) VALUES (1, 2, 1, $1)`,
      [times.changed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "duplicate-normalized-tag",
    () => database.prepare(
      `INSERT INTO contact_tags (
         tenant_id, name, normalized_name, created_at, updated_at
       ) VALUES (1, 'Duplicate', 'priority', ?, ?)`,
    ).run(times.changed, times.changed),
    () => pool.query(
      `INSERT INTO contact_tags (
         tenant_id, name, normalized_name, created_at, updated_at
       ) VALUES (1, 'Duplicate', 'priority', $1, $1)`,
      [times.changed],
    ),
    "rejected",
  );
  await compareOutcome(
    observations,
    "duplicate-import-source-row",
    () => database.prepare(
      `INSERT INTO contact_import_rows (
         tenant_id, job_id, source_row_number, contact_id,
         phone_fingerprint, status, reason, created_at
       ) VALUES (1, 1, 2, 1, ?, 'created', NULL, ?)`,
    ).run(fingerprints.created, times.changed),
    () => pool.query(
      `INSERT INTO contact_import_rows (
         tenant_id, job_id, source_row_number, contact_id,
         phone_fingerprint, status, reason, created_at
       ) VALUES (1, 1, 2, 1, $1, 'created', NULL, $2)`,
      [fingerprints.created, times.changed],
    ),
    "rejected",
  );
  await compareOutcome(
    observations,
    "invalid-import-counters",
    () => database.prepare(
      "UPDATE contact_import_jobs SET processed_rows = 2 WHERE id = 1",
    ).run(),
    () => pool.query(
      "UPDATE contact_import_jobs SET processed_rows = 2 WHERE id = 1",
    ),
    "rejected",
  );
  await compareOutcome(
    observations,
    "new-processing-import",
    () => database.prepare(
      `INSERT INTO contact_import_jobs (
         tenant_id, idempotency_key, file_name, total_rows,
         created_by_external_user_id, created_at, updated_at
       ) VALUES (1, ?, 'pending.csv', 1, 'operator-user', ?, ?)`,
    ).run(keys.pendingImport, times.changed, times.changed),
    () => pool.query(
      `INSERT INTO contact_import_jobs (
         tenant_id, idempotency_key, file_name, total_rows,
         created_by_external_user_id, created_at, updated_at
       ) VALUES (1, $1, 'pending.csv', 1, 'operator-user', $2, $2)`,
      [keys.pendingImport, times.changed],
    ),
    "accepted",
  );
  return Object.freeze(observations);
}

async function requirePostgresTenantIsolation(pool) {
  await assert.rejects(
    pool.query(
      `INSERT INTO contact_tag_assignments (
         tenant_id, contact_id, tag_id, created_at
       ) VALUES (1, 3, 1, $1)`,
      [times.changed],
    ),
    (error) => error?.code === "23503",
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO contact_import_rows (
         id, tenant_id, job_id, source_row_number, contact_id,
         phone_fingerprint, status, reason, created_at
       ) VALUES (99, 1, 1, 5, 3, $1, 'created', NULL, $2)`,
      [fingerprints.crossTenant, times.changed],
    ),
    (error) => error?.code === "23503",
  );
}

function normalizePostgresValue(column, value) {
  if (value instanceof Date) return value.toISOString();
  if (
    value !== null &&
    ["nonnegative-integer", "positive-integer"].includes(column.kind)
  ) {
    return Number(value);
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function compareFinalState(database, pool) {
  const d1Snapshot = readD1ContactOrganizationImportSnapshot(database);
  const evidence = [];
  for (const table of POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_TABLE_CONTRACTS) {
    const postgres = await pool.query(
      `SELECT ${table.columns.map(({ name }) => name).join(", ")}
       FROM ${table.name}
       ORDER BY ${table.orderBy.join(", ")}`,
    );
    const postgresRows = postgres.rows.map((row) => Object.fromEntries(
      table.columns.map((column) => [
        column.name,
        normalizePostgresValue(column, row[column.name]),
      ]),
    ));
    assert.deepEqual(
      postgresRows,
      d1Snapshot.tables[table.name],
      `${table.name} final state diverged`,
    );
    evidence.push(Object.freeze({
      table: table.name,
      rowCount: postgresRows.length,
      digest: digest(postgresRows),
    }));
  }
  return Object.freeze(evidence);
}

export async function verifyPostgresContactOrganizationImportDataMigration(
  connectionString,
) {
  const checkedUrl =
    requireLocalContactOrganizationImportDataMigrationUrl(connectionString);
  const { Pool } = pg;
  const pool = new Pool({ connectionString: checkedUrl, max: 2 });
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");

  try {
    await applyD1Migrations(database);
    await applyPostgresMigrations(pool);
    database.exec("BEGIN IMMEDIATE");
    try {
      seedD1Core(database);
      seedD1Slice(database);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    await seedPostgresCore(pool);

    const snapshot = readD1ContactOrganizationImportSnapshot(database);
    const plan = createPostgresContactOrganizationImportDataMigrationPlan({
      snapshot,
      createdAt: "2026-08-20T10:00:00.000Z",
      expiresAt: "2026-08-20T10:15:00.000Z",
      evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    const migrationEvidence =
      await executePostgresContactOrganizationImportDataMigration({
        plan,
        transactions,
        evidenceHmacKey,
        now: "2026-08-20T10:05:00.000Z",
      });

    assert.equal(migrationEvidence.tableCount, 6);
    assert.equal(migrationEvidence.totalRowCount, 10);
    assert.equal(
      migrationEvidence.tables.every(
        ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(migrationEvidence),
      /private-contacts|private-operator|aaaaaaaa/,
    );
    await requirePostgresTenantIsolation(pool);
    const semanticObservations = await runSemanticParityScenarios(
      database,
      pool,
    );
    const finalState = await compareFinalState(database, pool);
    await assert.rejects(
      executePostgresContactOrganizationImportDataMigration({
        plan,
        transactions,
        evidenceHmacKey,
        now: "2026-08-20T10:06:00.000Z",
      }),
      (error) => (
        error instanceof PostgresDataMigrationError &&
        error.code === "target-not-empty"
      ),
    );

    return Object.freeze({
      d1MigrationCount: (await migrationFiles(join(projectRoot, "drizzle"))).length,
      postgresMigrationCount: (
        await migrationFiles(join(projectRoot, "postgres", "migrations"))
      ).length,
      tableCount: migrationEvidence.tableCount,
      rowCount: migrationEvidence.totalRowCount,
      replayRejected: true,
      tenantIsolationVerified: true,
      semanticScenarioCount: semanticObservations.length,
      semanticScenarioDigest: digest(semanticObservations),
      semanticStateDigest: digest(finalState),
    });
  } finally {
    database.close();
    await pool.end();
  }
}

async function main() {
  const connectionString = process.env[environmentKey];
  if (!connectionString) fail("URL_MISSING");
  const result =
    await verifyPostgresContactOrganizationImportDataMigration(connectionString);
  process.stdout.write(
    `PostgreSQL contact-organization-import data rehearsal: PASS (` +
    `${result.d1MigrationCount} D1 migrations, ` +
    `${result.postgresMigrationCount} PostgreSQL migrations, ` +
    `${result.tableCount} tables, ${result.rowCount} rows, ` +
    `replay rejected, tenant isolation verified, ` +
    `${result.semanticScenarioCount} parity scenarios)\n`,
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
