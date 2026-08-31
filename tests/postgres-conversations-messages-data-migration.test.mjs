import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  createPostgresConversationsMessagesDataMigrationPlan,
  createPostgresConversationsMessagesDataSnapshot,
  executePostgresConversationsMessagesDataMigration,
} from "../server/platform/postgresConversationsMessagesDataMigration.ts";
import {
  D1DataMigrationSnapshotError,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  readD1ConversationsMessagesSnapshot,
} from "../scripts/read-d1-conversations-messages-snapshot.mjs";
import {
  requireLocalConversationsMessagesDataMigrationUrl,
} from "../scripts/verify-postgres-conversations-messages-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 59).toString("base64");
const createdAt = "2026-08-20T08:00:00.000Z";
const occurredAt = "2026-08-20T08:05:00.000Z";
const conversationKey = `conversation_v1_${"a".repeat(64)}`;
const messageKey = `message_v1_${"b".repeat(64)}`;

function rawTables() {
  return {
    conversations: [{
      conversation_key: conversationKey,
      tenant_id: 1,
      contact_id: 1,
      status: "waiting_for_agent",
      assigned_external_user_id: null,
      unread_count: 1,
      last_message_key: messageKey,
      last_message_at: occurredAt,
      version: 2,
      created_at: createdAt,
      updated_at: occurredAt,
    }],
    messages: [{
      message_key: messageKey,
      conversation_key: conversationKey,
      tenant_id: 1,
      provider_message_id: "wamid.private-message-identity",
      direction: "inbound",
      content_kind: "text",
      status: "received",
      text_content: "תוכן שיחה פרטי",
      occurred_at: occurredAt,
      status_updated_at: occurredAt,
      last_status_event_key: null,
      last_status_event_at: null,
      created_at: occurredAt,
      updated_at: occurredAt,
    }],
  };
}

function createPlan(tables = rawTables()) {
  return createPostgresConversationsMessagesDataMigrationPlan({
    snapshot: createPostgresConversationsMessagesDataSnapshot(tables),
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
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      try {
        const result = await execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return { rows: [{ count: "0" }], rowCount: 1 };
            }
            if (/^INSERT INTO ([a-z_]+)/i.test(sql)) {
              const tableName = /^INSERT INTO ([a-z_]+)/i.exec(sql)[1];
              return { rows: [], rowCount: tables[tableName].length };
            }
            if (/^SELECT 1\s+FROM conversations AS conversation/i.test(sql)) {
              return invalidLoadedState
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

test("builds privacy-safe evidence without message content or provider IDs", async () => {
  const plan = createPlan();
  const fixture = createTargetFixture();
  const evidence = await executePostgresConversationsMessagesDataMigration({
    plan,
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T10:05:00.000Z",
  });
  const publicArtifacts = JSON.stringify({ manifest: plan.manifest, evidence });

  assert.equal(evidence.tableCount, 2);
  assert.equal(evidence.totalRowCount, 2);
  assert.equal(fixture.committed, true);
  assert.match(
    plan.planId,
    /^connect_postgres_conversations_messages_data_v1_[0-9a-f]{64}$/,
  );
  assert.doesNotMatch(
    publicArtifacts,
    /תוכן שיחה|private-message|wamid|waiting_for_agent/,
  );
  assert.equal(
    evidence.tables.every(
      ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
    ),
    true,
  );
});

test("rejects unsafe legacy message and conversation values", () => {
  const cases = [
    ["conversations", "assigned_external_user_id", " operator "],
    ["messages", "provider_message_id", " wamid.private "],
    ["messages", "status_updated_at", createdAt],
    ["messages", "content_kind", "image"],
    ["messages", "last_status_event_key", "not-a-digest"],
  ];

  for (const [tableName, fieldName, value] of cases) {
    const tables = rawTables();
    tables[tableName][0][fieldName] = value;
    assert.throws(
      () => createPostgresConversationsMessagesDataSnapshot(tables),
      (error) => (
        error instanceof PostgresDataMigrationError &&
        error.code === "row-invalid" &&
        error.table === tableName &&
        error.rowIndex === 0
      ),
    );
  }
});

test("rolls back when a last-message projection is not linked", async () => {
  const fixture = createTargetFixture({ invalidLoadedState: true });

  await assert.rejects(
    executePostgresConversationsMessagesDataMigration({
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

test("reads the two current D1 conversation tables atomically", () => {
  const database = createCurrentD1Database();
  try {
    database.prepare(
      `INSERT INTO tenants (
         id, display_name, status, created_at, updated_at, provisioning_key
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, "Connect", "active", createdAt, createdAt, "conversation-key");
    database.prepare(
      `INSERT INTO contacts (
         id, tenant_id, phone_e164, mailing_status, consent_status,
         version, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 1, "+972501234567", "unsubscribed", "unknown", 1,
      createdAt, createdAt);
    const source = rawTables();
    const conversation = source.conversations[0];
    database.prepare(
      `INSERT INTO conversations (
         conversation_key, tenant_id, contact_id, status,
         assigned_external_user_id, unread_count, last_message_key,
         last_message_at, version, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(conversation));
    const message = source.messages[0];
    database.prepare(
      `INSERT INTO messages (
         message_key, conversation_key, tenant_id, provider_message_id,
         direction, content_kind, status, text_content, occurred_at,
         status_updated_at, last_status_event_key, last_status_event_at,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(message));

    const snapshot = readD1ConversationsMessagesSnapshot(database);
    assert.equal(snapshot.tables.conversations.length, 1);
    assert.equal(snapshot.tables.messages.length, 1);
  } finally {
    database.close();
  }
});

test("rejects a D1 schema outside the exact two-table contract", () => {
  const database = new DatabaseSync(":memory:");
  try {
    assert.throws(
      () => readD1ConversationsMessagesSnapshot(database),
      (error) => (
        error instanceof D1DataMigrationSnapshotError &&
        error.code === "schema-mismatch" &&
        error.table === "conversations"
      ),
    );
  } finally {
    database.close();
  }
});

test("limits the rehearsal URL to its passwordless local database", () => {
  const valid =
    "postgresql://tal@127.0.0.1:55432/" +
    "connect_conversations_messages_data_migration_rehearsal";
  assert.equal(requireLocalConversationsMessagesDataMigrationUrl(valid), valid);

  for (const unsafe of [
    "postgresql://tal:secret@127.0.0.1:55432/" +
      "connect_conversations_messages_data_migration_rehearsal",
    "postgresql://tal@database.example.com:55432/" +
      "connect_conversations_messages_data_migration_rehearsal",
    "postgresql://tal@127.0.0.1:55432/connect",
    valid + "?ssl=true",
  ]) {
    assert.throws(
      () => requireLocalConversationsMessagesDataMigrationUrl(unsafe),
      /POSTGRES_CONVERSATIONS_MESSAGES_DATA_URL_INVALID/,
    );
  }
});
