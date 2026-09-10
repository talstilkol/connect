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
  POSTGRES_META_CONNECTION_DATA_TABLE_CONTRACTS,
  createPostgresMetaConnectionDataMigrationPlan,
  executePostgresMetaConnectionDataMigration,
} from "../server/platform/postgresMetaConnectionDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1MetaConnectionSnapshot,
} from "./read-d1-meta-connection-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_meta_connection_data_migration_rehearsal";
const environmentKey =
  "CONNECT_POSTGRES_META_CONNECTION_DATA_MIGRATION_REHEARSAL_URL";
const credentialRevisionMigrationName =
  "0054_meta_credential_revision_ledger.sql";
const evidenceHmacKey = Buffer.alloc(32, 43).toString("base64");
const times = Object.freeze({
  created: "2026-08-20T08:00:00.000Z",
  connected: "2026-08-20T08:05:00.000Z",
  changed: "2026-08-20T09:00:00.000Z",
  completed: "2026-08-20T09:05:00.000Z",
  failed: "2026-08-20T09:10:00.000Z",
});
const events = Object.freeze({
  processed: "1".repeat(64),
  failed: "2".repeat(64),
  newReceipt: "3".repeat(64),
  crossTenant: "4".repeat(64),
});
const credentials = Object.freeze({
  initialVector: "AQIDBAUGBwgJCgsM",
  initialCiphertext: "AQIDBAUGBwgJCgsMDQ4PEA==",
  rotatedVector: "ERITFBUWFxgZGhsc",
  rotatedCiphertext: "ERITFBUWFxgZGhscHR4fIA==",
});

function fail(code) {
  throw new Error(`POSTGRES_META_CONNECTION_DATA_${code}`);
}

export function requireLocalMetaConnectionDataMigrationUrl(value) {
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
    url.username !== "" ||
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
  const files = await migrationFiles(directory);
  const revisionMigrationIndex = files.indexOf(
    credentialRevisionMigrationName,
  );
  if (revisionMigrationIndex !== files.length - 1) {
    fail("REVISION_MIGRATION_ORDER_INVALID");
  }
  for (const fileName of files.slice(0, revisionMigrationIndex)) {
    await pool.query(await readFile(join(directory, fileName), "utf8"));
  }
  return Object.freeze({
    files,
    revisionMigrationSource: await readFile(
      join(directory, credentialRevisionMigrationName),
      "utf8",
    ),
  });
}

function seedD1Core(database) {
  const insertTenant = database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (?, ?, 'active', ?, ?, ?)`,
  );
  insertTenant.run(
    1, "Primary Meta rehearsal", times.created, times.created,
    "meta-connection-primary",
  );
  insertTenant.run(
    2, "Secondary Meta rehearsal", times.created, times.created,
    "meta-connection-secondary",
  );
}

function seedD1Slice(database) {
  const insertConnection = database.prepare(
    `INSERT INTO meta_connections (
       tenant_id, business_portfolio_id, waba_id, phone_number_id, status,
       webhook_subscribed_at, connected_at, version, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertConnection.run(
    1, "portfolio-primary", "waba-primary", "phone-primary", "connected",
    times.connected, times.connected, 2, times.created, times.connected,
  );
  insertConnection.run(
    2, "portfolio-secondary", "waba-secondary", "phone-secondary", "pending",
    null, null, 1, times.created, times.created,
  );
  const insertReceipt = database.prepare(
    `INSERT INTO meta_webhook_receipts (
       id, tenant_id, waba_id, event_key, object_type, status, attempt_count,
       last_error_code, received_at, processed_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertReceipt.run(
    1, 1, "waba-primary", events.processed, "whatsapp_business_account",
    "processed", 1, null, times.created, times.connected, times.connected,
  );
  insertReceipt.run(
    2, 1, "waba-primary", events.failed, "whatsapp_business_account",
    "failed", 2, "PROCESSOR_FAILED", times.created, null, times.connected,
  );
  const insertEnvelope = database.prepare(
    `INSERT INTO meta_credential_envelopes (
       tenant_id, key_version, initialization_vector, ciphertext,
       created_at, updated_at
     ) VALUES (?, 'v1', ?, ?, ?, ?)`,
  );
  insertEnvelope.run(
    1,
    credentials.initialVector,
    credentials.initialCiphertext,
    times.created,
    times.connected,
  );
  insertEnvelope.run(
    2,
    credentials.initialVector,
    credentials.initialCiphertext,
    times.created,
    times.created,
  );
}

async function seedPostgresCore(pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES
       (1, 'Primary Meta rehearsal', 'active', $1, $1,
        'meta-connection-primary'),
       (2, 'Secondary Meta rehearsal', 'active', $1, $1,
        'meta-connection-secondary')`,
    [times.created],
  );
}

async function databaseTimestamp(client) {
  const result = await client.query(
    `SELECT pg_catalog.date_trunc(
       'milliseconds',
       pg_catalog.clock_timestamp()
     ) AS value`,
  );
  assert.equal(result.rowCount, 1);
  assert.equal(result.rows[0]?.value instanceof Date, true);
  return result.rows[0].value.toISOString();
}

async function requireCredentialRevisionBackfill(pool) {
  const credentialsResult = await pool.query(
    `SELECT
       tenant_id::integer AS "tenantId",
       credential_revision::integer AS "credentialRevision",
       envelope_digest AS "envelopeDigest",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM public.meta_credential_envelopes
     ORDER BY tenant_id`,
  );
  assert.equal(credentialsResult.rowCount, 2);
  const credentialsRows = credentialsResult.rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
  assert.deepEqual(
    credentialsRows.map((row) => ({
      tenantId: row.tenantId,
      credentialRevision: row.credentialRevision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    [
      {
        tenantId: 1,
        credentialRevision: 1,
        createdAt: times.created,
        updatedAt: times.connected,
      },
      {
        tenantId: 2,
        credentialRevision: 1,
        createdAt: times.created,
        updatedAt: times.created,
      },
    ],
  );
  assert.equal(
    credentialsRows.every(({ envelopeDigest }) =>
      /^sha256:[a-f0-9]{64}$/.test(envelopeDigest)
    ),
    true,
  );
  assert.equal(
    new Set(
      credentialsRows.map(({ envelopeDigest }) => envelopeDigest),
    ).size,
    2,
  );

  const eventIntegrity = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM public.meta_credential_revision_events AS event
     INNER JOIN public.meta_credential_envelopes AS credential
       ON credential.tenant_id = event.tenant_id
      AND credential.credential_revision = event.credential_revision
      AND credential.envelope_digest = event.envelope_digest
      AND credential.key_version = event.key_version
      AND credential.updated_at = event.recorded_at
     WHERE event.credential_revision = 1
       AND event.created_at = event.recorded_at`,
  );
  assert.deepEqual(eventIntegrity.rows, [{ count: 2 }]);
}

async function verifyFirstCredentialInsertUsesDatabaseClock(pool) {
  const client = await pool.connect();
  const tenantId = 9_001_054;
  const suppliedTimestamp = "2000-01-01T00:00:00.000Z";
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query(
      `INSERT INTO public.tenants (id, display_name, status)
       VALUES ($1, 'Meta migration clock rehearsal', 'active')`,
      [tenantId],
    );
    const lowerBound = await databaseTimestamp(client);
    await client.query(
      `INSERT INTO public.meta_credential_envelopes (
         tenant_id,
         key_version,
         initialization_vector,
         ciphertext,
         created_at,
         updated_at
       ) VALUES ($1, 'v1', $2, $3, $4, $4)`,
      [
        tenantId,
        credentials.initialVector,
        credentials.initialCiphertext,
        suppliedTimestamp,
      ],
    );
    const upperBound = await databaseTimestamp(client);
    const inserted = await client.query(
      `SELECT
         credential_revision::integer AS revision,
         envelope_digest AS digest,
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM public.meta_credential_envelopes
       WHERE tenant_id = $1`,
      [tenantId],
    );
    assert.equal(inserted.rowCount, 1);
    const row = inserted.rows[0];
    const createdAt = row.createdAt.toISOString();
    const updatedAt = row.updatedAt.toISOString();
    assert.equal(row.revision, 1);
    assert.match(row.digest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(createdAt, updatedAt);
    assert.notEqual(createdAt, suppliedTimestamp);
    assert.equal(Date.parse(createdAt) >= Date.parse(lowerBound), true);
    assert.equal(
      Date.parse(createdAt) <= Date.parse(upperBound) + 1,
      true,
    );
    const event = await client.query(
      `SELECT recorded_at AS "recordedAt"
       FROM public.meta_credential_revision_events
       WHERE tenant_id = $1`,
      [tenantId],
    );
    assert.equal(event.rowCount, 1);
    assert.equal(event.rows[0].recordedAt.toISOString(), createdAt);
    await client.query("ROLLBACK");
    transactionOpen = false;
  } finally {
    if (transactionOpen) {
      await client.query("ROLLBACK");
    }
    client.release();
  }
}

async function requireCredentialRotationDatabaseClock(
  pool,
  lowerBound,
) {
  const upperBound = await databaseTimestamp(pool);
  const result = await pool.query(
    `SELECT
       credential.credential_revision::integer AS revision,
       credential.envelope_digest AS digest,
       credential.created_at AS "createdAt",
       credential.updated_at AS "updatedAt",
       event.recorded_at AS "recordedAt"
     FROM public.meta_credential_envelopes AS credential
     INNER JOIN public.meta_credential_revision_events AS event
       ON event.tenant_id = credential.tenant_id
      AND event.credential_revision = credential.credential_revision
      AND event.envelope_digest = credential.envelope_digest
     WHERE credential.tenant_id = 2`,
  );
  assert.equal(result.rowCount, 1);
  const row = result.rows[0];
  const updatedAt = row.updatedAt.toISOString();
  assert.equal(row.revision, 2);
  assert.match(row.digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(row.createdAt.toISOString(), times.created);
  assert.notEqual(updatedAt, times.completed);
  assert.equal(row.recordedAt.toISOString(), updatedAt);
  assert.equal(Date.parse(updatedAt) >= Date.parse(lowerBound), true);
  assert.equal(
    Date.parse(updatedAt) <= Date.parse(upperBound) + 1,
    true,
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
    "connect-pending-tenant",
    () => database.prepare(
      `UPDATE meta_connections
       SET status = 'connected', webhook_subscribed_at = ?, connected_at = ?,
           version = 2, updated_at = ?
       WHERE tenant_id = 2`,
    ).run(times.changed, times.changed, times.changed),
    () => pool.query(
      `UPDATE meta_connections
       SET status = 'connected', webhook_subscribed_at = $1, connected_at = $1,
           version = 2, updated_at = $1
       WHERE tenant_id = 2`,
      [times.changed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "restrict-connected-tenant",
    () => database.prepare(
      `UPDATE meta_connections
       SET status = 'restricted', version = 3, updated_at = ?
       WHERE tenant_id = 1`,
    ).run(times.changed),
    () => pool.query(
      `UPDATE meta_connections
       SET status = 'restricted', version = 3, updated_at = $1
       WHERE tenant_id = 1`,
      [times.changed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "claim-webhook-receipt",
    () => database.prepare(
      `INSERT INTO meta_webhook_receipts (
         id, tenant_id, waba_id, event_key, object_type, status, attempt_count,
         received_at, updated_at
       ) VALUES (3, 2, 'waba-secondary', ?, 'whatsapp_business_account',
                 'processing', 1, ?, ?)`,
    ).run(events.newReceipt, times.changed, times.changed),
    () => pool.query(
      `INSERT INTO meta_webhook_receipts (
         id, tenant_id, waba_id, event_key, object_type, status, attempt_count,
         received_at, updated_at
       ) VALUES (3, 2, 'waba-secondary', $1, 'whatsapp_business_account',
                 'processing', 1, $2, $2)`,
      [events.newReceipt, times.changed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "complete-webhook-receipt",
    () => database.prepare(
      `UPDATE meta_webhook_receipts
       SET status = 'processed', processed_at = ?, updated_at = ?
       WHERE id = 3 AND tenant_id = 2 AND status = 'processing'`,
    ).run(times.completed, times.completed),
    () => pool.query(
      `UPDATE meta_webhook_receipts
       SET status = 'processed', processed_at = $1, updated_at = $1
       WHERE id = 3 AND tenant_id = 2 AND status = 'processing'`,
      [times.completed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "retry-failed-webhook-receipt",
    () => database.prepare(
      `UPDATE meta_webhook_receipts
       SET status = 'processing', attempt_count = 3,
           last_error_code = NULL, updated_at = ?
       WHERE id = 2 AND tenant_id = 1 AND status = 'failed'`,
    ).run(times.changed),
    () => pool.query(
      `UPDATE meta_webhook_receipts
       SET status = 'processing', attempt_count = 3,
           last_error_code = NULL, updated_at = $1
       WHERE id = 2 AND tenant_id = 1 AND status = 'failed'`,
      [times.changed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "fail-webhook-receipt-again",
    () => database.prepare(
      `UPDATE meta_webhook_receipts
       SET status = 'failed', last_error_code = 'SECOND_FAILURE', updated_at = ?
       WHERE id = 2 AND tenant_id = 1 AND status = 'processing'`,
    ).run(times.failed),
    () => pool.query(
      `UPDATE meta_webhook_receipts
       SET status = 'failed', last_error_code = 'SECOND_FAILURE', updated_at = $1
       WHERE id = 2 AND tenant_id = 1 AND status = 'processing'`,
      [times.failed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "rotate-encrypted-envelope",
    () => database.prepare(
      `UPDATE meta_credential_envelopes
       SET initialization_vector = ?, ciphertext = ?, updated_at = ?
       WHERE tenant_id = 2`,
    ).run(
      credentials.rotatedVector,
      credentials.rotatedCiphertext,
      times.completed,
    ),
    () => pool.query(
      `UPDATE meta_credential_envelopes
       SET initialization_vector = $1, ciphertext = $2, updated_at = $3
       WHERE tenant_id = 2`,
      [
        credentials.rotatedVector,
        credentials.rotatedCiphertext,
        times.completed,
      ],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "duplicate-webhook-evidence",
    () => database.prepare(
      `INSERT INTO meta_webhook_receipts (
         id, tenant_id, waba_id, event_key, object_type,
         status, attempt_count, received_at, updated_at
       ) VALUES (4, 1, 'waba-primary', ?, 'whatsapp_business_account',
                 'processing', 1, ?, ?)`,
    ).run(events.processed, times.changed, times.changed),
    () => pool.query(
      `INSERT INTO meta_webhook_receipts (
         id, tenant_id, waba_id, event_key, object_type,
         status, attempt_count, received_at, updated_at
       ) VALUES (4, 1, 'waba-primary', $1, 'whatsapp_business_account',
                 'processing', 1, $2, $2)`,
      [events.processed, times.changed],
    ),
    "rejected",
  );
  return Object.freeze(observations);
}

async function requirePostgresTenantIsolation(pool) {
  await assert.rejects(
    pool.query(
      `INSERT INTO meta_webhook_receipts (
         id, tenant_id, waba_id, event_key, object_type,
         status, attempt_count, received_at, updated_at
       ) VALUES (99, 1, 'waba-secondary', $1, 'whatsapp_business_account',
                 'processing', 1, $2, $2)`,
      [events.crossTenant, times.changed],
    ),
    (error) => error?.code === "23503",
  );
  await assert.rejects(
    pool.query(
      `UPDATE meta_credential_envelopes
       SET ciphertext = 'AQID==BAUGBwgJCgsMDQ4PEA'
       WHERE tenant_id = 1`,
    ),
    (error) => error?.code === "23514",
  );
}

async function requireNoPlaintextCredentialColumns(pool) {
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'meta_credential_envelopes'
     ORDER BY ordinal_position`,
  );
  const columns = result.rows.map(({ column_name }) => column_name);
  assert.deepEqual(columns, [
    "tenant_id",
    "key_version",
    "initialization_vector",
    "ciphertext",
    "created_at",
    "updated_at",
    "credential_revision",
    "envelope_digest",
  ]);
}

function normalizePostgresValue(column, value) {
  if (value instanceof Date) return value.toISOString();
  if (value !== null && column.kind === "positive-integer") {
    return Number(value);
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function compareFinalState(database, pool) {
  const d1Snapshot = readD1MetaConnectionSnapshot(database);
  const evidence = [];
  for (const table of POSTGRES_META_CONNECTION_DATA_TABLE_CONTRACTS) {
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
    const expectedRows = d1Snapshot.tables[table.name];
    assert.equal(postgresRows.length, expectedRows.length);
    const comparableRows = table.name === "meta_credential_envelopes"
      ? postgresRows.map((row, index) => ({
        ...row,
        updated_at: expectedRows[index].updated_at,
      }))
      : postgresRows;
    assert.deepEqual(
      comparableRows,
      expectedRows,
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

export async function verifyPostgresMetaConnectionDataMigration(
  connectionString,
) {
  const checkedUrl = requireLocalMetaConnectionDataMigrationUrl(
    connectionString,
  );
  const { Pool } = pg;
  const pool = new Pool({ connectionString: checkedUrl, max: 2 });
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");

  try {
    await applyD1Migrations(database);
    const postgresMigrations = await applyPostgresMigrations(pool);
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

    const snapshot = readD1MetaConnectionSnapshot(database);
    const plan = createPostgresMetaConnectionDataMigrationPlan({
      snapshot,
      createdAt: "2026-08-20T10:00:00.000Z",
      expiresAt: "2026-08-20T10:15:00.000Z",
      evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    const migrationEvidence = await executePostgresMetaConnectionDataMigration({
      plan,
      transactions,
      evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    });

    assert.equal(migrationEvidence.tableCount, 3);
    assert.equal(migrationEvidence.totalRowCount, 6);
    assert.equal(
      migrationEvidence.tables.every(
        ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(migrationEvidence),
      /portfolio-primary|waba-primary|phone-primary|AQIDBAUG/,
    );
    await pool.query(postgresMigrations.revisionMigrationSource);
    await requireCredentialRevisionBackfill(pool);
    await requirePostgresTenantIsolation(pool);
    await requireNoPlaintextCredentialColumns(pool);
    await verifyFirstCredentialInsertUsesDatabaseClock(pool);
    const rotationClockLowerBound = await databaseTimestamp(pool);
    const semanticObservations = await runSemanticParityScenarios(
      database,
      pool,
    );
    await requireCredentialRotationDatabaseClock(
      pool,
      rotationClockLowerBound,
    );
    const finalState = await compareFinalState(database, pool);
    await assert.rejects(
      executePostgresMetaConnectionDataMigration({
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
      postgresMigrationCount: postgresMigrations.files.length,
      tableCount: migrationEvidence.tableCount,
      rowCount: migrationEvidence.totalRowCount,
      replayRejected: true,
      tenantIsolationVerified: true,
      plaintextCredentialColumnsAbsent: true,
      credentialRevisionLedgerBackfilled: true,
      credentialDatabaseClockVerified: true,
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
  const result = await verifyPostgresMetaConnectionDataMigration(
    connectionString,
  );
  process.stdout.write(
    `PostgreSQL Meta connection data rehearsal: PASS (` +
    `${result.d1MigrationCount} D1 migrations, ` +
    `${result.postgresMigrationCount} PostgreSQL migrations, ` +
    `${result.tableCount} tables, ${result.rowCount} rows, ` +
    `replay rejected, tenant isolation verified, 8-column encrypted ` +
    `credential schema and database clock verified, ` +
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
