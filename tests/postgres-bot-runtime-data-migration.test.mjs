import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  createPostgresBotRuntimeDataMigrationPlan,
  createPostgresBotRuntimeDataSnapshot,
  executePostgresBotRuntimeDataMigration,
} from "../server/platform/postgresBotRuntimeDataMigration.ts";
import {
  D1DataMigrationSnapshotError,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  readD1BotRuntimeSnapshot,
} from "../scripts/read-d1-bot-runtime-snapshot.mjs";
import {
  requireLocalBotRuntimeDataMigrationUrl,
} from "../scripts/verify-postgres-bot-runtime-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 71).toString("base64");
const createdAt = "2026-08-20T08:00:00.000Z";
const changedAt = "2026-08-20T08:05:00.000Z";
const conversationKey = `conversation_v1_${"1".repeat(64)}`;
const messageKey = `message_v1_${"2".repeat(64)}`;
const flowKey = `bot_flow_v1_${"3".repeat(64)}`;
const versionKey = `bot_flow_version_v1_${"4".repeat(64)}`;
const deliveryKey = `bot_reply_delivery_v1_${"5".repeat(64)}`;

function blockKey(character) {
  return `bot_block_v1_${character.repeat(64)}`;
}

function validDefinition() {
  return {
    name: "מענה אוטומטי",
    entryBlockKey: blockKey("a"),
    blocks: [
      {
        blockKey: blockKey("a"),
        type: "trigger",
        nextBlockKey: blockKey("b"),
      },
      {
        blockKey: blockKey("b"),
        type: "text",
        text: "קיבלנו את פנייתך",
        nextBlockKey: blockKey("c"),
      },
      { blockKey: blockKey("c"), type: "end" },
    ],
  };
}

function rawTables() {
  return {
    bot_flows: [{
      bot_flow_key: flowKey,
      tenant_id: 1,
      name: "מענה אוטומטי",
      status: "active",
      latest_version_key: versionKey,
      latest_version_number: 1,
      active_version_key: versionKey,
      version: 2,
      created_at: createdAt,
      updated_at: changedAt,
    }],
    bot_flow_versions: [{
      bot_flow_version_key: versionKey,
      bot_flow_key: flowKey,
      tenant_id: 1,
      version_number: 1,
      status: "published",
      definition_json: JSON.stringify(validDefinition()),
      published_at: changedAt,
      created_at: createdAt,
    }],
    bot_reply_deliveries: [{
      delivery_key: deliveryKey,
      tenant_id: 1,
      conversation_key: conversationKey,
      inbound_message_key: messageKey,
      bot_flow_key: flowKey,
      bot_flow_version_key: versionKey,
      reply_index: 1,
      recipient_phone_e164: "+972501234567",
      reply_json: JSON.stringify({
        kind: "text",
        text: "תוכן תשובה פרטי",
      }),
      status: "accepted",
      attempt_count: 1,
      provider_message_id: "wamid.private-bot-reply",
      last_error_code: null,
      accepted_at: changedAt,
      created_at: createdAt,
      updated_at: changedAt,
    }],
  };
}

function createPlan(tables = rawTables()) {
  return createPostgresBotRuntimeDataMigrationPlan({
    snapshot: createPostgresBotRuntimeDataSnapshot(tables),
    createdAt: "2026-08-20T10:00:00.000Z",
    expiresAt: "2026-08-20T10:15:00.000Z",
    evidenceHmacKey,
  });
}

function tableNameFromTargetRead(sql) {
  return /^SELECT[\s\S]+?FROM\s+([a-z_]+)\s+ORDER BY/i.exec(sql)?.[1] ?? null;
}

function createTargetFixture({ invalidProjection = false,
  invalidDelivery = false } = {}) {
  const tables = createPlan().payload.tables;
  let committed = false;
  let rolledBack = false;
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      try {
        const result = await execute({
          async query(sql) {
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return { rows: [{ count: "0" }], rowCount: 1 };
            }
            const insert = /^INSERT INTO ([a-z_]+)/i.exec(sql);
            if (insert) {
              return { rows: [], rowCount: tables[insert[1]].length };
            }
            if (/^SELECT 1\s+FROM bot_flows AS flow/i.test(sql)) {
              return invalidProjection
                ? { rows: [{ invalid: 1 }], rowCount: 1 }
                : { rows: [], rowCount: 0 };
            }
            if (/^SELECT 1\s+FROM bot_reply_deliveries AS delivery/i.test(sql)) {
              return invalidDelivery
                ? { rows: [{ invalid: 1 }], rowCount: 1 }
                : { rows: [], rowCount: 0 };
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
        return result;
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  };
  return {
    manager,
    get committed() { return committed; },
    get rolledBack() { return rolledBack; },
  };
}

function createCurrentD1Database() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const fileName of readdirSync("drizzle")
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort()) {
    database.exec(readFileSync(`drizzle/${fileName}`, "utf8")
      .replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

test("builds privacy-safe evidence without bot definitions or delivery data",
  async () => {
    const plan = createPlan();
    const fixture = createTargetFixture();
    const evidence = await executePostgresBotRuntimeDataMigration({
      plan,
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    });
    const publicArtifacts = JSON.stringify({ manifest: plan.manifest, evidence });
    assert.equal(evidence.tableCount, 3);
    assert.equal(evidence.totalRowCount, 3);
    assert.equal(fixture.committed, true);
    assert.match(plan.planId,
      /^connect_postgres_bot_runtime_data_v1_[0-9a-f]{64}$/);
    assert.doesNotMatch(publicArtifacts,
      /מענה אוטומטי|תוכן תשובה|wamid|972501234567|accepted/);
  });

test("rejects unsafe legacy bot definition and delivery lifecycle values", () => {
  const cases = [
    ["bot_flows", "name", " flow "],
    ["bot_flows", "active_version_key", null],
    ["bot_flow_versions", "definition_json", JSON.stringify({ blocks: [] })],
    ["bot_reply_deliveries", "recipient_phone_e164", "0501234567"],
    ["bot_reply_deliveries", "reply_json",
      JSON.stringify({ kind: "text", text: "ok", extra: true })],
    ["bot_reply_deliveries", "provider_message_id", null],
  ];
  for (const [tableName, fieldName, value] of cases) {
    const tables = rawTables();
    tables[tableName][0][fieldName] = value;
    assert.throws(() => createPostgresBotRuntimeDataSnapshot(tables),
      (error) => error instanceof PostgresDataMigrationError &&
        error.code === "row-invalid" && error.table === tableName &&
        error.rowIndex === 0);
  }
});

test("rolls back when a flow projection does not identify its version",
  async () => {
    const fixture = createTargetFixture({ invalidProjection: true });
    await assert.rejects(executePostgresBotRuntimeDataMigration({
      plan: createPlan(), transactions: fixture.manager, evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    }), (error) => error instanceof PostgresDataMigrationError &&
      error.code === "target-verification-failed");
    assert.equal(fixture.committed, false);
    assert.equal(fixture.rolledBack, true);
  });

test("rolls back when a delivery is not linked to its inbound message",
  async () => {
    const fixture = createTargetFixture({ invalidDelivery: true });
    await assert.rejects(executePostgresBotRuntimeDataMigration({
      plan: createPlan(), transactions: fixture.manager, evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    }), (error) => error instanceof PostgresDataMigrationError &&
      error.code === "target-verification-failed");
    assert.equal(fixture.committed, false);
    assert.equal(fixture.rolledBack, true);
  });

test("reads the three current D1 bot runtime tables atomically", () => {
  const database = createCurrentD1Database();
  try {
    database.prepare(
      `INSERT INTO tenants (
         id, display_name, status, created_at, updated_at, provisioning_key
       ) VALUES (1, 'Connect', 'active', ?, ?, 'bot-runtime-test')`,
    ).run(createdAt, createdAt);
    database.prepare(
      `INSERT INTO contacts (
         id, tenant_id, phone_e164, mailing_status, consent_status,
         version, created_at, updated_at
       ) VALUES (1, 1, '+972501234567', 'unsubscribed', 'unknown', 1, ?, ?)`,
    ).run(createdAt, createdAt);
    database.prepare(
      `INSERT INTO conversations (
         conversation_key, tenant_id, contact_id, status, unread_count,
         version, created_at, updated_at
       ) VALUES (?, 1, 1, 'bot_active', 1, 1, ?, ?)`,
    ).run(conversationKey, createdAt, changedAt);
    database.prepare(
      `INSERT INTO messages (
         message_key, conversation_key, tenant_id, provider_message_id,
         direction, content_kind, status, text_content, occurred_at,
         status_updated_at, created_at, updated_at
       ) VALUES (?, ?, 1, 'wamid.test', 'inbound', 'text', 'received',
                 'שירות', ?, ?, ?, ?)`,
    ).run(messageKey, conversationKey, changedAt, changedAt, changedAt,
      changedAt);
    const source = rawTables();
    database.prepare(
      `INSERT INTO bot_flows (
         bot_flow_key, tenant_id, name, status, latest_version_key,
         latest_version_number, active_version_key, version, created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(source.bot_flows[0]));
    database.prepare(
      `INSERT INTO bot_flow_versions (
         bot_flow_version_key, bot_flow_key, tenant_id, version_number,
         status, definition_json, published_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(source.bot_flow_versions[0]));
    database.prepare(
      `INSERT INTO bot_reply_deliveries (
         delivery_key, tenant_id, conversation_key, inbound_message_key,
         bot_flow_key, bot_flow_version_key, reply_index,
         recipient_phone_e164, reply_json, status, attempt_count,
         provider_message_id, last_error_code, accepted_at, created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(source.bot_reply_deliveries[0]));
    const snapshot = readD1BotRuntimeSnapshot(database);
    assert.equal(snapshot.tables.bot_flows.length, 1);
    assert.equal(snapshot.tables.bot_flow_versions.length, 1);
    assert.equal(snapshot.tables.bot_reply_deliveries.length, 1);
  } finally {
    database.close();
  }
});

test("rejects a D1 schema outside the exact bot runtime contract", () => {
  const database = new DatabaseSync(":memory:");
  try {
    assert.throws(() => readD1BotRuntimeSnapshot(database),
      (error) => error instanceof D1DataMigrationSnapshotError &&
        error.code === "schema-mismatch" && error.table === "bot_flows");
  } finally {
    database.close();
  }
});

test("limits the rehearsal URL to its passwordless local database", () => {
  const valid = "postgresql://tal@127.0.0.1:55432/" +
    "connect_bot_runtime_data_migration_rehearsal";
  assert.equal(requireLocalBotRuntimeDataMigrationUrl(valid), valid);
  for (const unsafe of [
    "postgresql://tal:secret@127.0.0.1:55432/" +
      "connect_bot_runtime_data_migration_rehearsal",
    "postgresql://tal@database.example.com:55432/" +
      "connect_bot_runtime_data_migration_rehearsal",
    "postgresql://tal@127.0.0.1:55432/connect",
    valid + "?ssl=true",
  ]) {
    assert.throws(() => requireLocalBotRuntimeDataMigrationUrl(unsafe),
      /POSTGRES_BOT_RUNTIME_DATA_URL_INVALID/);
  }
});
