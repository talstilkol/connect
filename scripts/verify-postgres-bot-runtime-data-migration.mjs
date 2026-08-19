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
  POSTGRES_BOT_RUNTIME_DATA_TABLE_CONTRACTS,
  createPostgresBotRuntimeDataMigrationPlan,
  createPostgresBotRuntimeDataSnapshot,
  executePostgresBotRuntimeDataMigration,
} from "../server/platform/postgresBotRuntimeDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1BotRuntimeSnapshot,
} from "./read-d1-bot-runtime-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_bot_runtime_data_migration_rehearsal";
const environmentKey = "CONNECT_POSTGRES_BOT_RUNTIME_DATA_MIGRATION_REHEARSAL_URL";
const evidenceHmacKey = Buffer.alloc(32, 67).toString("base64");
const times = Object.freeze({
  created: "2026-08-20T08:00:00.000Z",
  inbound: "2026-08-20T08:05:00.000Z",
  published: "2026-08-20T08:10:00.000Z",
  changed: "2026-08-20T09:00:00.000Z",
  accepted: "2026-08-20T09:05:00.000Z",
});
const keys = Object.freeze({
  firstConversation: `conversation_v1_${"1".repeat(64)}`,
  secondConversation: `conversation_v1_${"2".repeat(64)}`,
  firstInbound: `message_v1_${"3".repeat(64)}`,
  secondInbound: `message_v1_${"4".repeat(64)}`,
  firstFlow: `bot_flow_v1_${"5".repeat(64)}`,
  secondFlow: `bot_flow_v1_${"6".repeat(64)}`,
  firstVersion: `bot_flow_version_v1_${"7".repeat(64)}`,
  secondVersion: `bot_flow_version_v1_${"8".repeat(64)}`,
  newVersion: `bot_flow_version_v1_${"9".repeat(64)}`,
  firstDelivery: `bot_reply_delivery_v1_${"a".repeat(64)}`,
  secondDelivery: `bot_reply_delivery_v1_${"b".repeat(64)}`,
});

function botBlockKey(character) {
  return `bot_block_v1_${character.repeat(64)}`;
}

function definition(name, character) {
  const trigger = botBlockKey(character);
  const response = botBlockKey(character === "c" ? "d" : "f");
  const end = botBlockKey(character === "c" ? "e" : "0");
  return {
    name,
    entryBlockKey: trigger,
    blocks: [
      { blockKey: trigger, type: "trigger", nextBlockKey: response },
      {
        blockKey: response,
        type: "text",
        text: `תשובת ${name}`,
        nextBlockKey: end,
      },
      { blockKey: end, type: "end" },
    ],
  };
}

function fail(code) {
  throw new Error(`POSTGRES_BOT_RUNTIME_DATA_${code}`);
}

export function requireLocalBotRuntimeDataMigrationUrl(value) {
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
  const tenant = database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (?, ?, 'active', ?, ?, ?)`,
  );
  tenant.run(1, "Primary bot rehearsal", times.created, times.created,
    "bot-runtime-primary");
  tenant.run(2, "Secondary bot rehearsal", times.created, times.created,
    "bot-runtime-secondary");
  const contact = database.prepare(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       version, created_at, updated_at
     ) VALUES (?, ?, ?, 'unsubscribed', 'unknown', 1, ?, ?)`,
  );
  contact.run(11, 1, "+972501111111", times.created, times.created);
  contact.run(21, 2, "+972502222222", times.created, times.created);
  const conversation = database.prepare(
    `INSERT INTO conversations (
       conversation_key, tenant_id, contact_id, status, unread_count,
       version, created_at, updated_at
     ) VALUES (?, ?, ?, 'bot_active', 1, 1, ?, ?)`,
  );
  conversation.run(keys.firstConversation, 1, 11, times.created, times.inbound);
  conversation.run(keys.secondConversation, 2, 21, times.created, times.inbound);
  const message = database.prepare(
    `INSERT INTO messages (
       message_key, conversation_key, tenant_id, provider_message_id,
       direction, content_kind, status, text_content, occurred_at,
       status_updated_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 'inbound', 'text', 'received', ?, ?, ?, ?, ?)`,
  );
  message.run(keys.firstInbound, keys.firstConversation, 1,
    "wamid.bot.primary", "שירות", times.inbound, times.inbound,
    times.inbound, times.inbound);
  message.run(keys.secondInbound, keys.secondConversation, 2,
    "wamid.bot.secondary", "תמיכה", times.inbound, times.inbound,
    times.inbound, times.inbound);
}

function seedD1Slice(database) {
  const flow = database.prepare(
    `INSERT INTO bot_flows (
       bot_flow_key, tenant_id, name, status, latest_version_key,
       latest_version_number, active_version_key, version, created_at,
       updated_at
     ) VALUES (?, ?, ?, 'active', ?, 1, ?, 2, ?, ?)`,
  );
  flow.run(keys.firstFlow, 1, "מענה שירות", keys.firstVersion,
    keys.firstVersion, times.created, times.published);
  flow.run(keys.secondFlow, 2, "מענה תמיכה", keys.secondVersion,
    keys.secondVersion, times.created, times.published);
  const version = database.prepare(
    `INSERT INTO bot_flow_versions (
       bot_flow_version_key, bot_flow_key, tenant_id, version_number,
       status, definition_json, published_at, created_at
     ) VALUES (?, ?, ?, 1, 'published', ?, ?, ?)`,
  );
  version.run(keys.firstVersion, keys.firstFlow, 1,
    JSON.stringify(definition("מענה שירות", "c")), times.published,
    times.created);
  version.run(keys.secondVersion, keys.secondFlow, 2,
    JSON.stringify(definition("מענה תמיכה", "7")), times.published,
    times.created);
  const delivery = database.prepare(
    `INSERT INTO bot_reply_deliveries (
       delivery_key, tenant_id, conversation_key, inbound_message_key,
       bot_flow_key, bot_flow_version_key, reply_index,
       recipient_phone_e164, reply_json, status, attempt_count,
       provider_message_id, last_error_code, accepted_at, created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  delivery.run(keys.firstDelivery, 1, keys.firstConversation,
    keys.firstInbound, keys.firstFlow, keys.firstVersion, "+972501111111",
    JSON.stringify({ kind: "text", text: "הפנייה התקבלה" }), "pending", 0,
    null, null, null, times.inbound, times.inbound);
  delivery.run(keys.secondDelivery, 2, keys.secondConversation,
    keys.secondInbound, keys.secondFlow, keys.secondVersion, "+972502222222",
    JSON.stringify({ kind: "text", text: "לא ניתן להשלים" }), "rejected", 1,
    null, "PROVIDER_REJECTED", null, times.inbound, times.published);
}

async function seedPostgresDependencies(pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES
       (1, 'Primary bot rehearsal', 'active', $1, $1, 'bot-runtime-primary'),
       (2, 'Secondary bot rehearsal', 'active', $1, $1, 'bot-runtime-secondary')`,
    [times.created],
  );
  await pool.query(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       version, created_at, updated_at
     ) VALUES
       (11, 1, '+972501111111', 'unsubscribed', 'unknown', 1, $1, $1),
       (21, 2, '+972502222222', 'unsubscribed', 'unknown', 1, $1, $1)`,
    [times.created],
  );
  await pool.query(
    `INSERT INTO conversations (
       conversation_key, tenant_id, contact_id, status, unread_count,
       version, created_at, updated_at
     ) VALUES
       ($1, 1, 11, 'bot_active', 1, 1, $3, $4),
       ($2, 2, 21, 'bot_active', 1, 1, $3, $4)`,
    [keys.firstConversation, keys.secondConversation, times.created, times.inbound],
  );
  await pool.query(
    `INSERT INTO messages (
       message_key, conversation_key, tenant_id, provider_message_id,
       direction, content_kind, status, text_content, occurred_at,
       status_updated_at, created_at, updated_at
     ) VALUES
       ($1, $3, 1, 'wamid.bot.primary', 'inbound', 'text', 'received',
        'שירות', $5, $5, $5, $5),
       ($2, $4, 2, 'wamid.bot.secondary', 'inbound', 'text', 'received',
        'תמיכה', $5, $5, $5, $5)`,
    [keys.firstInbound, keys.secondInbound, keys.firstConversation,
      keys.secondConversation, times.inbound],
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

async function compareOutcome(observations, name, d1Operation,
  postgresOperation, expected) {
  const d1Outcome = await captureOutcome(d1Operation);
  const postgresOutcome = await captureOutcome(postgresOperation);
  assert.equal(postgresOutcome, d1Outcome, `${name} diverged`);
  assert.equal(d1Outcome, expected, `${name} outcome was not ${expected}`);
  observations.push(Object.freeze({ name, outcome: expected }));
}

async function runSemanticParityScenarios(database, pool) {
  const observations = [];
  const nextDefinition = JSON.stringify(definition("מענה שירות מעודכן", "1"));
  await compareOutcome(observations, "rename-flow", () =>
    database.prepare(
      `UPDATE bot_flows SET name = ?, version = 3, updated_at = ?
       WHERE tenant_id = 1 AND bot_flow_key = ? AND version = 2`,
    ).run("מענה שירות מעודכן", times.changed, keys.firstFlow), () =>
    pool.query(
      `UPDATE bot_flows SET name = $1, version = 3, updated_at = $2
       WHERE tenant_id = 1 AND bot_flow_key = $3 AND version = 2`,
      ["מענה שירות מעודכן", times.changed, keys.firstFlow],
    ), "accepted");
  await compareOutcome(observations, "create-next-draft", () =>
    database.prepare(
      `INSERT INTO bot_flow_versions (
         bot_flow_version_key, bot_flow_key, tenant_id, version_number,
         status, definition_json, created_at
       ) VALUES (?, ?, 1, 2, 'draft', ?, ?)`,
    ).run(keys.newVersion, keys.firstFlow, nextDefinition, times.changed), () =>
    pool.query(
      `INSERT INTO bot_flow_versions (
         bot_flow_version_key, bot_flow_key, tenant_id, version_number,
         status, definition_json, created_at
       ) VALUES ($1, $2, 1, 2, 'draft', $3::jsonb, $4)`,
      [keys.newVersion, keys.firstFlow, nextDefinition, times.changed],
    ), "accepted");
  await compareOutcome(observations, "project-next-draft", () =>
    database.prepare(
      `UPDATE bot_flows
       SET latest_version_key = ?, latest_version_number = 2, version = 4
       WHERE tenant_id = 1 AND bot_flow_key = ? AND version = 3`,
    ).run(keys.newVersion, keys.firstFlow), () =>
    pool.query(
      `UPDATE bot_flows
       SET latest_version_key = $1, latest_version_number = 2, version = 4
       WHERE tenant_id = 1 AND bot_flow_key = $2 AND version = 3`,
      [keys.newVersion, keys.firstFlow],
    ), "accepted");
  await compareOutcome(observations, "reject-duplicate-version-number", () =>
    database.prepare(
      `INSERT INTO bot_flow_versions (
         bot_flow_version_key, bot_flow_key, tenant_id, version_number,
         definition_json
       ) VALUES (?, ?, 1, 2, ?)`,
    ).run(`bot_flow_version_v1_${"d".repeat(64)}`, keys.firstFlow,
      nextDefinition), () =>
    pool.query(
      `INSERT INTO bot_flow_versions (
         bot_flow_version_key, bot_flow_key, tenant_id, version_number,
         definition_json
       ) VALUES ($1, $2, 1, 2, $3::jsonb)`,
      [`bot_flow_version_v1_${"d".repeat(64)}`, keys.firstFlow,
        nextDefinition],
    ), "rejected");
  await compareOutcome(observations, "reject-cross-tenant-version", () =>
    database.prepare(
      `INSERT INTO bot_flow_versions (
         bot_flow_version_key, bot_flow_key, tenant_id, version_number,
         definition_json
       ) VALUES (?, ?, 1, 3, ?)`,
    ).run(`bot_flow_version_v1_${"e".repeat(64)}`, keys.secondFlow,
      nextDefinition), () =>
    pool.query(
      `INSERT INTO bot_flow_versions (
         bot_flow_version_key, bot_flow_key, tenant_id, version_number,
         definition_json
       ) VALUES ($1, $2, 1, 3, $3::jsonb)`,
      [`bot_flow_version_v1_${"e".repeat(64)}`, keys.secondFlow,
        nextDefinition],
    ), "rejected");
  await compareOutcome(observations, "claim-pending-delivery", () =>
    database.prepare(
      `UPDATE bot_reply_deliveries
       SET status = 'sending', attempt_count = 1, updated_at = ?
       WHERE tenant_id = 1 AND delivery_key = ? AND status = 'pending'`,
    ).run(times.changed, keys.firstDelivery), () =>
    pool.query(
      `UPDATE bot_reply_deliveries
       SET status = 'sending', attempt_count = 1, updated_at = $1
       WHERE tenant_id = 1 AND delivery_key = $2 AND status = 'pending'`,
      [times.changed, keys.firstDelivery],
    ), "accepted");
  await compareOutcome(observations, "accept-delivery", () =>
    database.prepare(
      `UPDATE bot_reply_deliveries
       SET status = 'accepted', provider_message_id = 'wamid.bot.accepted',
           accepted_at = ?, updated_at = ?
       WHERE tenant_id = 1 AND delivery_key = ? AND status = 'sending'`,
    ).run(times.accepted, times.accepted, keys.firstDelivery), () =>
    pool.query(
      `UPDATE bot_reply_deliveries
       SET status = 'accepted', provider_message_id = 'wamid.bot.accepted',
           accepted_at = $1, updated_at = $1
       WHERE tenant_id = 1 AND delivery_key = $2 AND status = 'sending'`,
      [times.accepted, keys.firstDelivery],
    ), "accepted");
  await compareOutcome(observations, "reject-duplicate-inbound-reply", () =>
    database.prepare(
      `INSERT INTO bot_reply_deliveries (
         delivery_key, tenant_id, conversation_key, inbound_message_key,
         bot_flow_key, bot_flow_version_key, reply_index,
         recipient_phone_e164, reply_json
       ) VALUES (?, 1, ?, ?, ?, ?, 1, '+972501111111', ?)`,
    ).run(`bot_reply_delivery_v1_${"f".repeat(64)}`, keys.firstConversation,
      keys.firstInbound, keys.firstFlow, keys.firstVersion,
      JSON.stringify({ kind: "text", text: "כפילות" })), () =>
    pool.query(
      `INSERT INTO bot_reply_deliveries (
         delivery_key, tenant_id, conversation_key, inbound_message_key,
         bot_flow_key, bot_flow_version_key, reply_index,
         recipient_phone_e164, reply_json
       ) VALUES ($1, 1, $2, $3, $4, $5, 1, '+972501111111', $6::jsonb)`,
      [`bot_reply_delivery_v1_${"f".repeat(64)}`, keys.firstConversation,
        keys.firstInbound, keys.firstFlow, keys.firstVersion,
        JSON.stringify({ kind: "text", text: "כפילות" })],
    ), "rejected");
  await compareOutcome(observations, "reject-invalid-delivery-state", () =>
    database.prepare(
      `UPDATE bot_reply_deliveries
       SET status = 'accepted', attempt_count = 0
       WHERE tenant_id = 2 AND delivery_key = ?`,
    ).run(keys.secondDelivery), () =>
    pool.query(
      `UPDATE bot_reply_deliveries
       SET status = 'accepted', attempt_count = 0
       WHERE tenant_id = 2 AND delivery_key = $1`,
      [keys.secondDelivery],
    ), "rejected");
  return Object.freeze(observations);
}

async function requirePostgresIsolationAndShape(pool) {
  await assert.rejects(pool.query(
    `UPDATE bot_flows SET name = 'unsafe' || chr(7)
     WHERE tenant_id = 1 AND bot_flow_key = $1`,
    [keys.firstFlow],
  ), (error) => error?.code === "23514");
  await assert.rejects(pool.query(
    `INSERT INTO bot_reply_deliveries (
       delivery_key, tenant_id, conversation_key, inbound_message_key,
       bot_flow_key, bot_flow_version_key, reply_index,
       recipient_phone_e164, reply_json
     ) VALUES ($1, 1, $2, $3, $4, $5, 2, '+972501111111', $6::jsonb)`,
    [`bot_reply_delivery_v1_${"0".repeat(64)}`, keys.firstConversation,
      keys.secondInbound, keys.firstFlow, keys.firstVersion,
      JSON.stringify({ kind: "text", text: "cross tenant" })],
  ), (error) => error?.code === "23503");
}

function normalizePostgresValue(column, value) {
  if (value instanceof Date) return value.toISOString();
  if (value !== null &&
      ["positive-integer", "nonnegative-integer"].includes(column.kind)) {
    return Number(value);
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function compareFinalState(database, pool) {
  const d1Snapshot = readD1BotRuntimeSnapshot(database);
  const targetTables = {};
  for (const table of POSTGRES_BOT_RUNTIME_DATA_TABLE_CONTRACTS) {
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
  const targetSnapshot = createPostgresBotRuntimeDataSnapshot(targetTables);
  const evidence = [];
  for (const table of POSTGRES_BOT_RUNTIME_DATA_TABLE_CONTRACTS) {
    const targetRows = targetSnapshot.tables[table.name];
    assert.deepEqual(targetRows, d1Snapshot.tables[table.name],
      `${table.name} final state diverged`);
    evidence.push(Object.freeze({
      table: table.name,
      rowCount: targetRows.length,
      digest: digest(targetRows),
    }));
  }
  return Object.freeze(evidence);
}

export async function verifyPostgresBotRuntimeDataMigration(connectionString) {
  const checkedUrl = requireLocalBotRuntimeDataMigrationUrl(connectionString);
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
    const snapshot = readD1BotRuntimeSnapshot(database);
    const plan = createPostgresBotRuntimeDataMigrationPlan({
      snapshot,
      createdAt: "2026-08-20T10:00:00.000Z",
      expiresAt: "2026-08-20T10:15:00.000Z",
      evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    const migrationEvidence = await executePostgresBotRuntimeDataMigration({
      plan,
      transactions,
      evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    });
    assert.equal(migrationEvidence.tableCount, 3);
    assert.equal(migrationEvidence.totalRowCount, 6);
    assert.equal(migrationEvidence.tables.every(
      ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest), true);
    assert.doesNotMatch(JSON.stringify(migrationEvidence),
      /מענה שירות|מענה תמיכה|הפנייה התקבלה|לא ניתן להשלים|wamid|PROVIDER_REJECTED|97250/);
    await requirePostgresIsolationAndShape(pool);
    const semanticObservations = await runSemanticParityScenarios(database, pool);
    const finalState = await compareFinalState(database, pool);
    await assert.rejects(executePostgresBotRuntimeDataMigration({
      plan,
      transactions,
      evidenceHmacKey,
      now: "2026-08-20T10:06:00.000Z",
    }), (error) => error instanceof PostgresDataMigrationError &&
      error.code === "target-not-empty");
    return Object.freeze({
      d1MigrationCount: (await migrationFiles(join(projectRoot, "drizzle"))).length,
      postgresMigrationCount: (await migrationFiles(
        join(projectRoot, "postgres", "migrations"))).length,
      tableCount: migrationEvidence.tableCount,
      rowCount: migrationEvidence.totalRowCount,
      replayRejected: true,
      tenantIsolationVerified: true,
      botPayloadPrivate: true,
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
  const result = await verifyPostgresBotRuntimeDataMigration(connectionString);
  process.stdout.write(
    `PostgreSQL bot runtime data rehearsal: PASS (` +
    `${result.d1MigrationCount} D1 migrations, ` +
    `${result.postgresMigrationCount} PostgreSQL migrations, ` +
    `${result.tableCount} tables, ${result.rowCount} rows, ` +
    `replay rejected, tenant isolation verified, bot payload private, ` +
    `${result.semanticScenarioCount} parity scenarios)\n`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
