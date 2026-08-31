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
  POSTGRES_CONVERSATIONS_MESSAGES_DATA_TABLE_CONTRACTS,
  createPostgresConversationsMessagesDataMigrationPlan,
  createPostgresConversationsMessagesDataSnapshot,
  executePostgresConversationsMessagesDataMigration,
} from "../server/platform/postgresConversationsMessagesDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1ConversationsMessagesSnapshot,
} from "./read-d1-conversations-messages-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_conversations_messages_data_migration_rehearsal";
const environmentKey =
  "CONNECT_POSTGRES_CONVERSATIONS_MESSAGES_DATA_MIGRATION_REHEARSAL_URL";
const evidenceHmacKey = Buffer.alloc(32, 61).toString("base64");
const times = Object.freeze({
  created: "2026-08-20T08:00:00.000Z",
  firstInbound: "2026-08-20T08:05:00.000Z",
  outbound: "2026-08-20T08:10:00.000Z",
  secondInbound: "2026-08-20T08:15:00.000Z",
  delivered: "2026-08-20T09:00:00.000Z",
  read: "2026-08-20T09:05:00.000Z",
  changed: "2026-08-20T09:10:00.000Z",
  newInbound: "2026-08-20T09:15:00.000Z",
});
const keys = Object.freeze({
  primaryConversation: `conversation_v1_${"1".repeat(64)}`,
  secondaryConversation: `conversation_v1_${"2".repeat(64)}`,
  firstInbound: `message_v1_${"3".repeat(64)}`,
  outbound: `message_v1_${"4".repeat(64)}`,
  secondInbound: `message_v1_${"5".repeat(64)}`,
  newInbound: `message_v1_${"6".repeat(64)}`,
});

function fail(code) {
  throw new Error(`POSTGRES_CONVERSATIONS_MESSAGES_DATA_${code}`);
}

export function requireLocalConversationsMessagesDataMigrationUrl(value) {
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

function seedD1Dependencies(database) {
  const insertTenant = database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (?, ?, 'active', ?, ?, ?)`,
  );
  insertTenant.run(
    1, "Primary conversation rehearsal", times.created, times.created,
    "conversations-primary",
  );
  insertTenant.run(
    2, "Secondary conversation rehearsal", times.created, times.created,
    "conversations-secondary",
  );
  const insertContact = database.prepare(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       version, created_at, updated_at
     ) VALUES (?, ?, ?, 'unsubscribed', 'unknown', 1, ?, ?)`,
  );
  insertContact.run(11, 1, "+972501111111", times.created, times.created);
  insertContact.run(21, 2, "+972502222221", times.created, times.created);
  insertContact.run(22, 2, "+972502222222", times.created, times.created);
}

function seedD1Slice(database) {
  const insertConversation = database.prepare(
    `INSERT INTO conversations (
       conversation_key, tenant_id, contact_id, status,
       assigned_external_user_id, unread_count, last_message_key,
       last_message_at, version, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertConversation.run(
    keys.primaryConversation,
    1,
    11,
    "waiting_for_agent",
    null,
    1,
    keys.outbound,
    times.outbound,
    3,
    times.created,
    times.outbound,
  );
  insertConversation.run(
    keys.secondaryConversation,
    2,
    21,
    "new",
    null,
    1,
    keys.secondInbound,
    times.secondInbound,
    2,
    times.created,
    times.secondInbound,
  );

  const insertMessage = database.prepare(
    `INSERT INTO messages (
       message_key, conversation_key, tenant_id, provider_message_id,
       direction, content_kind, status, text_content, occurred_at,
       status_updated_at, last_status_event_key, last_status_event_at,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertMessage.run(
    keys.firstInbound,
    keys.primaryConversation,
    1,
    "wamid.primary.inbound",
    "inbound",
    "text",
    "received",
    "הודעת לקוח פרטית",
    times.firstInbound,
    times.firstInbound,
    null,
    null,
    times.firstInbound,
    times.firstInbound,
  );
  insertMessage.run(
    keys.outbound,
    keys.primaryConversation,
    1,
    "wamid.primary.outbound",
    "outbound",
    "text",
    "sent",
    "תשובת שירות פרטית",
    times.outbound,
    times.outbound,
    null,
    null,
    times.outbound,
    times.outbound,
  );
  insertMessage.run(
    keys.secondInbound,
    keys.secondaryConversation,
    2,
    "wamid.secondary.inbound",
    "inbound",
    "text",
    "received",
    "שיחה פרטית נוספת",
    times.secondInbound,
    times.secondInbound,
    null,
    null,
    times.secondInbound,
    times.secondInbound,
  );
}

async function seedPostgresDependencies(pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES
       (1, 'Primary conversation rehearsal', 'active', $1, $1,
        'conversations-primary'),
       (2, 'Secondary conversation rehearsal', 'active', $1, $1,
        'conversations-secondary')`,
    [times.created],
  );
  await pool.query(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       version, created_at, updated_at
     ) VALUES
       (11, 1, '+972501111111', 'unsubscribed', 'unknown', 1, $1, $1),
       (21, 2, '+972502222221', 'unsubscribed', 'unknown', 1, $1, $1),
       (22, 2, '+972502222222', 'unsubscribed', 'unknown', 1, $1, $1)`,
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
    "record-delivered-status",
    () => database.prepare(
      `UPDATE messages
       SET status = 'delivered', status_updated_at = ?,
           last_status_event_key = ?, last_status_event_at = ?, updated_at = ?
       WHERE tenant_id = 1 AND provider_message_id = 'wamid.primary.outbound'
         AND direction = 'outbound'`,
    ).run(times.delivered, "7".repeat(64), times.delivered, times.delivered),
    () => pool.query(
      `UPDATE messages
       SET status = 'delivered', status_updated_at = $1,
           last_status_event_key = $2, last_status_event_at = $1,
           updated_at = $1
       WHERE tenant_id = 1 AND provider_message_id = 'wamid.primary.outbound'
         AND direction = 'outbound'`,
      [times.delivered, "7".repeat(64)],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "record-read-status",
    () => database.prepare(
      `UPDATE messages
       SET status = 'read', status_updated_at = ?, last_status_event_key = ?,
           last_status_event_at = ?, updated_at = ?
       WHERE tenant_id = 1 AND provider_message_id = 'wamid.primary.outbound'
         AND status = 'delivered'`,
    ).run(times.read, "8".repeat(64), times.read, times.read),
    () => pool.query(
      `UPDATE messages
       SET status = 'read', status_updated_at = $1,
           last_status_event_key = $2, last_status_event_at = $1,
           updated_at = $1
       WHERE tenant_id = 1 AND provider_message_id = 'wamid.primary.outbound'
         AND status = 'delivered'`,
      [times.read, "8".repeat(64)],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "mark-conversation-read",
    () => database.prepare(
      `UPDATE conversations
       SET unread_count = 0, version = 4, updated_at = ?
       WHERE conversation_key = ? AND tenant_id = 1 AND version = 3`,
    ).run(times.changed, keys.primaryConversation),
    () => pool.query(
      `UPDATE conversations
       SET unread_count = 0, version = 4, updated_at = $1
       WHERE conversation_key = $2 AND tenant_id = 1 AND version = 3`,
      [times.changed, keys.primaryConversation],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "assign-conversation",
    () => database.prepare(
      `UPDATE conversations
       SET assigned_external_user_id = 'agent-1', version = 5, updated_at = ?
       WHERE conversation_key = ? AND tenant_id = 1 AND version = 4`,
    ).run(times.changed, keys.primaryConversation),
    () => pool.query(
      `UPDATE conversations
       SET assigned_external_user_id = 'agent-1', version = 5,
           updated_at = $1
       WHERE conversation_key = $2 AND tenant_id = 1 AND version = 4`,
      [times.changed, keys.primaryConversation],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "unassign-conversation",
    () => database.prepare(
      `UPDATE conversations
       SET assigned_external_user_id = NULL, version = 6, updated_at = ?
       WHERE conversation_key = ? AND tenant_id = 1 AND version = 5`,
    ).run(times.newInbound, keys.primaryConversation),
    () => pool.query(
      `UPDATE conversations
       SET assigned_external_user_id = NULL, version = 6, updated_at = $1
       WHERE conversation_key = $2 AND tenant_id = 1 AND version = 5`,
      [times.newInbound, keys.primaryConversation],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "project-new-inbound-message",
    () => database.prepare(
      `UPDATE conversations
       SET unread_count = 2, last_message_key = ?, last_message_at = ?,
           version = 3, updated_at = ?
       WHERE conversation_key = ? AND tenant_id = 2`,
    ).run(
      keys.newInbound,
      times.newInbound,
      times.newInbound,
      keys.secondaryConversation,
    ),
    () => pool.query(
      `UPDATE conversations
       SET unread_count = 2, last_message_key = $1, last_message_at = $2,
           version = 3, updated_at = $2
       WHERE conversation_key = $3 AND tenant_id = 2`,
      [keys.newInbound, times.newInbound, keys.secondaryConversation],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "store-new-nontext-message",
    () => database.prepare(
      `INSERT INTO messages (
         message_key, conversation_key, tenant_id, provider_message_id,
         direction, content_kind, status, text_content, occurred_at,
         status_updated_at, created_at, updated_at
       ) VALUES (?, ?, 2, 'wamid.secondary.image', 'inbound', 'image',
                 'received', NULL, ?, ?, ?, ?)`,
    ).run(
      keys.newInbound,
      keys.secondaryConversation,
      times.newInbound,
      times.newInbound,
      times.newInbound,
      times.newInbound,
    ),
    () => pool.query(
      `INSERT INTO messages (
         message_key, conversation_key, tenant_id, provider_message_id,
         direction, content_kind, status, text_content, occurred_at,
         status_updated_at, created_at, updated_at
       ) VALUES ($1, $2, 2, 'wamid.secondary.image', 'inbound', 'image',
                 'received', NULL, $3, $3, $3, $3)`,
      [keys.newInbound, keys.secondaryConversation, times.newInbound],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "reject-duplicate-provider-message",
    () => database.prepare(
      `INSERT INTO messages (
         message_key, conversation_key, tenant_id, provider_message_id,
         direction, content_kind, status, text_content, occurred_at,
         status_updated_at, created_at, updated_at
       ) VALUES (?, ?, 1, 'wamid.primary.inbound', 'inbound', 'text',
                 'received', 'duplicate', ?, ?, ?, ?)`,
    ).run(
      `message_v1_${"9".repeat(64)}`,
      keys.primaryConversation,
      times.newInbound,
      times.newInbound,
      times.newInbound,
      times.newInbound,
    ),
    () => pool.query(
      `INSERT INTO messages (
         message_key, conversation_key, tenant_id, provider_message_id,
         direction, content_kind, status, text_content, occurred_at,
         status_updated_at, created_at, updated_at
       ) VALUES ($1, $2, 1, 'wamid.primary.inbound', 'inbound', 'text',
                 'received', 'duplicate', $3, $3, $3, $3)`,
      [
        `message_v1_${"9".repeat(64)}`,
        keys.primaryConversation,
        times.newInbound,
      ],
    ),
    "rejected",
  );
  await compareOutcome(
    observations,
    "reject-cross-tenant-conversation",
    () => database.prepare(
      `INSERT INTO messages (
         message_key, conversation_key, tenant_id, provider_message_id,
         direction, content_kind, status, text_content, occurred_at,
         status_updated_at, created_at, updated_at
       ) VALUES (?, ?, 1, 'wamid.cross-tenant', 'inbound', 'text',
                 'received', 'cross tenant', ?, ?, ?, ?)`,
    ).run(
      `message_v1_${"a".repeat(64)}`,
      keys.secondaryConversation,
      times.newInbound,
      times.newInbound,
      times.newInbound,
      times.newInbound,
    ),
    () => pool.query(
      `INSERT INTO messages (
         message_key, conversation_key, tenant_id, provider_message_id,
         direction, content_kind, status, text_content, occurred_at,
         status_updated_at, created_at, updated_at
       ) VALUES ($1, $2, 1, 'wamid.cross-tenant', 'inbound', 'text',
                 'received', 'cross tenant', $3, $3, $3, $3)`,
      [
        `message_v1_${"a".repeat(64)}`,
        keys.secondaryConversation,
        times.newInbound,
      ],
    ),
    "rejected",
  );
  return Object.freeze(observations);
}

async function requirePostgresIsolationAndShape(pool) {
  await assert.rejects(
    pool.query(
      `INSERT INTO conversations (
         conversation_key, tenant_id, contact_id, status, unread_count,
         version, created_at, updated_at
       ) VALUES ($1, 1, 22, 'new', 0, 1, $2, $2)`,
      [`conversation_v1_${"b".repeat(64)}`, times.changed],
    ),
    (error) => error?.code === "23503",
  );
  await assert.rejects(
    pool.query(
      `UPDATE messages
       SET provider_message_id = ' unsafe '
       WHERE message_key = $1`,
      [keys.firstInbound],
    ),
    (error) => error?.code === "23514",
  );
  const providerLinks = await pool.query(
    "SELECT count(*)::integer AS count FROM campaign_delivery_provider_links",
  );
  assert.equal(providerLinks.rows[0]?.count, 0);
}

function normalizePostgresValue(column, value) {
  if (value instanceof Date) return value.toISOString();
  if (
    value !== null &&
    ["positive-integer", "nonnegative-integer"].includes(column.kind)
  ) {
    return Number(value);
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function compareFinalState(database, pool) {
  const d1Snapshot = readD1ConversationsMessagesSnapshot(database);
  const targetTables = {};
  for (const table of POSTGRES_CONVERSATIONS_MESSAGES_DATA_TABLE_CONTRACTS) {
    const postgres = await pool.query(
      `SELECT ${table.columns.map(({ name }) => name).join(", ")}
       FROM ${table.name}
       ORDER BY ${table.orderBy.join(", ")}`,
    );
    targetTables[table.name] = postgres.rows.map((row) =>
      Object.fromEntries(table.columns.map((column) => [
        column.name,
        normalizePostgresValue(column, row[column.name]),
      ])),
    );
  }
  const targetSnapshot = createPostgresConversationsMessagesDataSnapshot(
    targetTables,
  );
  const evidence = [];
  for (const table of POSTGRES_CONVERSATIONS_MESSAGES_DATA_TABLE_CONTRACTS) {
    const targetRows = targetSnapshot.tables[table.name];
    assert.deepEqual(
      targetRows,
      d1Snapshot.tables[table.name],
      `${table.name} final state diverged`,
    );
    evidence.push(Object.freeze({
      table: table.name,
      rowCount: targetRows.length,
      digest: digest(targetRows),
    }));
  }
  return Object.freeze(evidence);
}

export async function verifyPostgresConversationsMessagesDataMigration(
  connectionString,
) {
  const checkedUrl = requireLocalConversationsMessagesDataMigrationUrl(
    connectionString,
  );
  const { Pool } = pg;
  const pool = new Pool({ connectionString: checkedUrl, max: 2 });
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");

  try {
    await applyD1Migrations(database);
    await applyPostgresMigrations(pool);
    database.exec("BEGIN IMMEDIATE");
    try {
      seedD1Dependencies(database);
      seedD1Slice(database);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    await seedPostgresDependencies(pool);

    const snapshot = readD1ConversationsMessagesSnapshot(database);
    const plan = createPostgresConversationsMessagesDataMigrationPlan({
      snapshot,
      createdAt: "2026-08-20T10:00:00.000Z",
      expiresAt: "2026-08-20T10:15:00.000Z",
      evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    const migrationEvidence =
      await executePostgresConversationsMessagesDataMigration({
        plan,
        transactions,
        evidenceHmacKey,
        now: "2026-08-20T10:05:00.000Z",
      });

    assert.equal(migrationEvidence.tableCount, 2);
    assert.equal(migrationEvidence.totalRowCount, 5);
    assert.equal(
      migrationEvidence.tables.every(
        ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(migrationEvidence),
      /הודעת לקוח|תשובת שירות|שיחה פרטית|wamid|waiting_for_agent/,
    );
    await requirePostgresIsolationAndShape(pool);
    const semanticObservations = await runSemanticParityScenarios(
      database,
      pool,
    );
    const finalState = await compareFinalState(database, pool);
    await assert.rejects(
      executePostgresConversationsMessagesDataMigration({
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
      messageContentPrivate: true,
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
  const result = await verifyPostgresConversationsMessagesDataMigration(
    connectionString,
  );
  process.stdout.write(
    `PostgreSQL conversations/messages data rehearsal: PASS (` +
    `${result.d1MigrationCount} D1 migrations, ` +
    `${result.postgresMigrationCount} PostgreSQL migrations, ` +
    `${result.tableCount} tables, ${result.rowCount} rows, ` +
    `replay rejected, tenant isolation verified, message content private, ` +
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
