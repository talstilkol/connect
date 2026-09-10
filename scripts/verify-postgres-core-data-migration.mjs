import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import {
  PostgresCoreDataMigrationError,
  createPostgresCoreDataMigrationPlan,
  executePostgresCoreDataMigration,
} from "../server/platform/postgresCoreDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1CoreDataSnapshot,
} from "./read-d1-core-data-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_data_migration_rehearsal";
const environmentKey = "CONNECT_POSTGRES_DATA_MIGRATION_REHEARSAL_URL";
const occurredAt = "2026-08-19T08:00:00.000Z";
const evidenceHmacKey = Buffer.alloc(32, 11).toString("base64");
const consentEventKey = `contact_consent_v1_${"b".repeat(64)}`;

function fail(code) {
  throw new Error(`POSTGRES_CORE_DATA_REHEARSAL_${code}`);
}

export function requireLocalDataMigrationRehearsalUrl(value) {
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
  if (existing.rows[0]?.count !== 0) {
    fail("DATABASE_NOT_EMPTY");
  }

  const directory = join(projectRoot, "postgres", "migrations");
  for (const fileName of await migrationFiles(directory)) {
    await pool.query(await readFile(join(directory, fileName), "utf8"));
  }
}

function insertD1RehearsalRows(database) {
  database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(1, "Connect", "active", occurredAt, occurredAt, "rehearsal-tenant");
  database.prepare(
    `INSERT INTO tenant_memberships (
       id, tenant_id, external_user_id, role, status,
       created_at, updated_at, version
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(1, 1, "tal", "owner", "active", occurredAt, occurredAt, 1);
  database.prepare(
    `INSERT INTO tenant_selections (
       external_user_id, tenant_id, version, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?)`,
  ).run("tal", 1, 1, occurredAt, occurredAt);
  database.prepare(
    `INSERT INTO business_profiles (
       tenant_id, business_name, timezone, interface_language,
       version, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(1, "Connect", "Asia/Jerusalem", "he", 1, occurredAt, occurredAt);
  database.prepare(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, first_name, last_name, email, company,
       mailing_status, consent_status, consent_source, consent_recorded_at,
       consent_withdrawn_at, consent_evidence_reference, version,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    1,
    1,
    "+10000000000",
    null,
    null,
    null,
    "Connect",
    "subscribed",
    "granted",
    "owner-recorded",
    occurredAt,
    null,
    "rehearsal-consent-evidence",
    1,
    occurredAt,
    occurredAt,
  );
  database.prepare(
    `INSERT INTO contact_consent_events (
       id, tenant_id, contact_id, event_type, source, occurred_at,
       evidence_reference, actor_external_user_id, idempotency_key, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    1,
    1,
    1,
    "granted",
    "owner-recorded",
    occurredAt,
    "rehearsal-consent-evidence",
    "tal",
    consentEventKey,
    occurredAt,
  );
  database.prepare(
    `INSERT INTO audit_logs (
       id, tenant_id, actor_external_user_id, action, target_type,
       target_id, metadata_json, created_at, idempotency_key
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    1,
    1,
    "tal",
    "tenant.provisioned",
    "tenant",
    "1",
    "{\"source\":\"controlled-rehearsal\"}",
    occurredAt,
    "rehearsal-tenant",
  );
}

export async function verifyPostgresCoreDataMigration(connectionString) {
  const checkedUrl = requireLocalDataMigrationRehearsalUrl(connectionString);
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: checkedUrl,
    max: 2,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 2_000,
  });
  const d1 = new DatabaseSync(":memory:");
  d1.exec("PRAGMA foreign_keys = ON");

  try {
    const identity = await pool.query(
      `SELECT current_database() AS database,
              current_setting('server_version') AS version`,
    );
    assert.equal(identity.rows[0]?.database, databaseName);
    assert.match(identity.rows[0]?.version, /^16\./);

    await applyD1Migrations(d1);
    insertD1RehearsalRows(d1);
    await applyPostgresMigrations(pool);

    const snapshot = readD1CoreDataSnapshot(d1);
    const plan = createPostgresCoreDataMigrationPlan({
      snapshot,
      createdAt: occurredAt,
      expiresAt: "2026-08-19T08:15:00.000Z",
      evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    const evidence = await executePostgresCoreDataMigration({
      plan,
      transactions,
      evidenceHmacKey,
      now: "2026-08-19T08:05:00.000Z",
    });

    assert.equal(evidence.tableCount, 7);
    assert.equal(evidence.totalRowCount, 7);
    assert.equal(
      evidence.tables.every(
        ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(evidence),
      /\+10000000000|"tal"|"Connect"|owner-recorded/,
    );

    const nextIds = await Promise.all(
      ["tenants", "tenant_memberships", "contacts", "contact_consent_events", "audit_logs"]
        .map(async (tableName) => {
          const result = await pool.query(
            `SELECT nextval(pg_get_serial_sequence($1, 'id')) AS id`,
            [`public.${tableName}`],
          );
          return Number(result.rows[0]?.id);
        }),
    );
    assert.deepEqual(nextIds, [2, 2, 2, 2, 2]);

    await assert.rejects(
      executePostgresCoreDataMigration({
        plan,
        transactions,
        evidenceHmacKey,
        now: "2026-08-19T08:06:00.000Z",
      }),
      (error) => (
        error instanceof PostgresCoreDataMigrationError &&
        error.code === "target-not-empty"
      ),
    );

    return Object.freeze({
      status: "passed",
      d1MigrationCount: (await migrationFiles(join(projectRoot, "drizzle"))).length,
      postgresMigrationCount: (
        await migrationFiles(join(projectRoot, "postgres", "migrations"))
      ).length,
      tableCount: evidence.tableCount,
      rowCount: evidence.totalRowCount,
      replayRejected: true,
    });
  } finally {
    d1.close();
    await pool.end();
  }
}

async function main() {
  const result = await verifyPostgresCoreDataMigration(
    process.env[environmentKey],
  );
  process.stdout.write(
    `PostgreSQL core data rehearsal: PASS (${result.d1MigrationCount} D1 migrations, ${result.postgresMigrationCount} PostgreSQL migrations, ${result.tableCount} tables, ${result.rowCount} rows, replay rejected)\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
