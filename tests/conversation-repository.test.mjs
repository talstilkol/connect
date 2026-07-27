import assert from "node:assert/strict";
import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  DatabaseSync,
} from "node:sqlite";
import test from "node:test";

import {
  createConversationRepository,
  MessageIdentityConflictError,
} from "../db/conversationRepository.ts";
import {
  deriveConversationKey,
  deriveInboundMessageKey,
} from "../server/conversations/conversationKey.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const inboundMessageKey =
  `message_v1_${"b".repeat(64)}`;
const outboundMessageKey =
  `message_v1_${"c".repeat(64)}`;
const firstStatusEventKey = "d".repeat(64);
const secondStatusEventKey = "e".repeat(64);
const occurredAt = "2026-07-26T08:30:00.000Z";

function inboundRow(overrides = {}) {
  return {
    messageKey: inboundMessageKey,
    conversationKey,
    tenantId: 7,
    providerMessageId: "wamid.inbound-17",
    direction: "inbound",
    contentKind: "text",
    status: "received",
    textContent: "שלום",
    occurredAt,
    statusUpdatedAt: occurredAt,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    createdAt: "2026-07-26 08:30:01",
    updatedAt: "2026-07-26 08:30:01",
    ...overrides,
  };
}

function outboundRow(overrides = {}) {
  return inboundRow({
    messageKey: outboundMessageKey,
    providerMessageId: "wamid.outbound-17",
    direction: "outbound",
    status: "delivered",
    statusUpdatedAt: "2026-07-26T08:32:00.000Z",
    lastStatusEventKey: firstStatusEventKey,
    lastStatusEventAt: "2026-07-26T08:32:00.000Z",
    ...overrides,
  });
}

function inboxConversationRow(overrides = {}) {
  return {
    conversationKey,
    tenantId: 7,
    contactId: 17,
    status: "new",
    assignedExternalUserId: null,
    unreadCount: 2,
    lastMessageKey: inboundMessageKey,
    lastMessageAt: occurredAt,
    version: 3,
    createdAt: "2026-07-26 08:29:00",
    updatedAt: "2026-07-26 08:30:01",
    phoneNumber: "+972501234567",
    firstName: "טל",
    lastName: "כהן",
    lastMessageDirection: "inbound",
    lastMessageContentKind: "text",
    lastMessageTextContent: "שלום",
    ...overrides,
  };
}

function recordInput(overrides = {}) {
  return {
    tenantId: 7,
    contactId: 17,
    conversationKey,
    messageKey: inboundMessageKey,
    providerMessageId: "wamid.inbound-17",
    contentKind: "text",
    textContent: "שלום",
    occurredAt,
    ...overrides,
  };
}

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.database.recordings.push({
      sql: this.sql,
      values,
    });
    return this;
  }

  async first() {
    return this.database.firstResults.shift() ?? null;
  }

  async all() {
    return (
      this.database.allResults.shift() ?? {
        success: true,
        results: [],
      }
    );
  }

  async run() {
    return { success: true };
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.firstResults = [];
    this.allResults = [];
    this.batchResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }

  async batch() {
    return (
      this.batchResults.shift() ?? [
        { success: true },
        { success: true },
        { success: true, results: [] },
      ]
    );
  }
}

class SqliteD1Statement {
  constructor(sql, statement) {
    this.sql = sql;
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return this.statement.get(...this.values) ?? null;
  }

  async all() {
    return {
      success: true,
      results: this.statement.all(...this.values),
    };
  }

  async run() {
    if (/\bRETURNING\b/i.test(this.sql)) {
      const results = this.statement.all(...this.values);

      return {
        success: true,
        results,
        meta: {
          changes: results.length,
        },
      };
    }

    const result = this.statement.run(...this.values);

    return {
      success: true,
      meta: {
        changes: Number(result.changes),
      },
    };
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(
      sql,
      this.database.prepare(sql),
    );
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");

    try {
      const results = [];

      for (const statement of statements) {
        results.push(await statement.run());
      }

      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

async function createSqliteD1() {
  const migrationsUrl = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrationFiles = (await readdir(migrationsUrl))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const migrationParts = await Promise.all(
    migrationFiles.map((fileName) =>
      readFile(new URL(fileName, migrationsUrl), "utf8"),
    ),
  );
  const database = new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON");
  database.exec(
    migrationParts
      .join("\n")
      .replaceAll("--> statement-breakpoint", ""),
  );

  return {
    database,
    d1: new SqliteD1Database(database),
  };
}

test("resolves an inbound phone without overwriting profile or consent", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push({
    contactId: 17,
    tenantId: 7,
    phoneNumber: "+972501234567",
  });
  const repository =
    createConversationRepository(database);

  const contact = await repository.resolveInboundContact(
    7,
    "+972501234567",
  );

  assert.deepEqual(contact, {
    contactId: 17,
    tenantId: 7,
    phoneNumber: "+972501234567",
  });
  assert.match(
    database.recordings[0].sql,
    /INSERT INTO contacts/,
  );
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(tenant_id, phone_e164\)/,
  );
  assert.doesNotMatch(
    database.recordings[0].sql,
    /first_name\s*=|mailing_status\s*=|consent_status\s*=/,
  );
});

test("writes conversation, unread state, and inbound message in one batch", async () => {
  const database = new RecordingDatabase();
  database.batchResults.push([
    { success: true },
    { success: true },
    {
      success: true,
      results: [inboundRow()],
    },
  ]);
  const repository =
    createConversationRepository(database);

  const result = await repository.recordInboundMessage(
    recordInput(),
  );

  assert.equal(result.outcome, "created");
  assert.equal(result.message.status, "received");
  assert.equal(database.recordings.length, 3);
  assert.match(
    database.recordings[0].sql,
    /INSERT INTO conversations/,
  );
  assert.match(
    database.recordings[1].sql,
    /unread_count = unread_count \+ 1/,
  );
  assert.match(
    database.recordings[1].sql,
    /NOT EXISTS \([\s\S]+provider_message_id = \?5/,
  );
  assert.match(
    database.recordings[2].sql,
    /ON CONFLICT \(tenant_id, provider_message_id\) DO NOTHING/,
  );
});

test("returns an exact inbound retry without incrementing it again", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(inboundRow());
  const repository =
    createConversationRepository(database);

  const result = await repository.recordInboundMessage(
    recordInput(),
  );

  assert.equal(result.outcome, "duplicate");
  assert.match(
    database.recordings[1].sql,
    /NOT EXISTS \([\s\S]+FROM messages/,
  );
  assert.deepEqual(
    database.recordings[3].values,
    [7, "wamid.inbound-17", "inbound"],
  );
});

test("rejects reuse of one provider identity with different message content", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    inboundRow({
      textContent: "תוכן אחר",
    }),
  );
  const repository =
    createConversationRepository(database);

  await assert.rejects(
    repository.recordInboundMessage(recordInput()),
    (error) =>
      error instanceof MessageIdentityConflictError,
  );
});

test("applies, deduplicates, and orders delivery status by provider time", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    outboundRow(),
    null,
    outboundRow(),
    null,
    outboundRow(),
    null,
  );
  const repository =
    createConversationRepository(database);
  const input = {
    tenantId: 7,
    providerMessageId: "wamid.outbound-17",
    status: "delivered",
    statusEventKey: firstStatusEventKey,
    statusEventAt: "2026-07-26T08:32:00.000Z",
  };

  assert.equal(
    (await repository.applyDeliveryStatus(input)).outcome,
    "applied",
  );
  assert.equal(
    (
      await repository.applyDeliveryStatus(input)
    ).outcome,
    "duplicate",
  );
  assert.equal(
    (
      await repository.applyDeliveryStatus({
        ...input,
        status: "sent",
        statusEventKey: secondStatusEventKey,
        statusEventAt:
          "2026-07-26T08:31:00.000Z",
      })
    ).outcome,
    "stale",
  );
  assert.deepEqual(
    await repository.applyDeliveryStatus({
      ...input,
      providerMessageId: "wamid.missing",
    }),
    { outcome: "not-found" },
  );
  assert.match(
    database.recordings[0].sql,
    /last_status_event_at < \?5/,
  );
  assert.match(
    database.recordings[0].sql,
    /WHEN 'delivered' THEN 2/,
  );
});

test("lists only the requested tenant inbox scope and maps the latest message", async () => {
  const database = new RecordingDatabase();
  database.allResults.push({
    success: true,
    results: [inboxConversationRow()],
  });
  const repository =
    createConversationRepository(database);

  const conversations =
    await repository.listByTenant(7, 50);

  assert.equal(conversations.length, 1);
  assert.deepEqual(conversations[0].contact, {
    phoneNumber: "+972501234567",
    firstName: "טל",
    lastName: "כהן",
  });
  assert.deepEqual(conversations[0].lastMessage, {
    direction: "inbound",
    contentKind: "text",
    textContent: "שלום",
  });
  assert.deepEqual(database.recordings[0].values, [
    7,
    null,
    null,
    "all",
    null,
    50,
  ]);
  assert.match(
    database.recordings[0].sql,
    /WHERE conversations\.tenant_id = \?1/,
  );
});

test("binds server-side inbox search, status, and assignment filters without wildcard SQL", async () => {
  const database = new RecordingDatabase();
  database.allResults.push({
    success: true,
    results: [inboxConversationRow()],
  });
  const repository =
    createConversationRepository(database);

  const result =
    await repository.listFilteredByTenant(
      7,
      {
        searchTerm: "טל",
        status: "waiting_for_agent",
        assignment: "mine",
        currentExternalUserId:
          "external-user-id",
      },
      25,
    );

  assert.equal(result.length, 1);
  assert.deepEqual(database.recordings[0].values, [
    7,
    "טל",
    "waiting_for_agent",
    "mine",
    "external-user-id",
    25,
  ]);
  assert.match(
    database.recordings[0].sql,
    /instr\([\s\S]+conversations\.assigned_external_user_id = \?5/,
  );
  assert.doesNotMatch(
    database.recordings[0].sql,
    /\bLIKE\b/,
  );
});

test("returns the latest bounded messages in chronological order", async () => {
  const database = new RecordingDatabase();
  const newerMessageKey =
    `message_v1_${"f".repeat(64)}`;
  database.allResults.push({
    success: true,
    results: [
      inboundRow({
        messageKey: newerMessageKey,
        providerMessageId: "wamid.inbound-18",
        occurredAt: "2026-07-26T08:31:00.000Z",
        statusUpdatedAt:
          "2026-07-26T08:31:00.000Z",
        textContent: "הודעה שנייה",
      }),
      inboundRow(),
    ],
  });
  const repository =
    createConversationRepository(database);

  const messages =
    await repository.listMessagesByConversation(
      7,
      conversationKey,
      100,
    );

  assert.deepEqual(
    messages.map((message) => message.messageKey),
    [inboundMessageKey, newerMessageKey],
  );
  assert.deepEqual(database.recordings[0].values, [
    7,
    conversationKey,
    100,
  ]);
  assert.match(
    database.recordings[0].sql,
    /ORDER BY occurred_at DESC, message_key DESC/,
  );
});

test("marks unread state with optimistic versioning and classifies misses", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    {
      conversationKey,
      tenantId: 7,
      unreadCount: 0,
      version: 4,
    },
    null,
    {
      conversationKey,
      tenantId: 7,
      unreadCount: 0,
      version: 4,
    },
    null,
    {
      conversationKey,
      tenantId: 7,
      unreadCount: 1,
      version: 5,
    },
    null,
    null,
  );
  const repository =
    createConversationRepository(database);

  assert.deepEqual(
    await repository.markRead(
      7,
      conversationKey,
      3,
    ),
    {
      outcome: "updated",
      state: {
        conversationKey,
        unreadCount: 0,
        version: 4,
      },
    },
  );
  assert.equal(
    (
      await repository.markRead(
        7,
        conversationKey,
        4,
      )
    ).outcome,
    "unchanged",
  );
  assert.deepEqual(
    await repository.markRead(
      7,
      conversationKey,
      4,
    ),
    { outcome: "conflict" },
  );
  assert.deepEqual(
    await repository.markRead(
      7,
      conversationKey,
      4,
    ),
    { outcome: "not-found" },
  );
  assert.match(
    database.recordings[0].sql,
    /version = \?3[\s\S]+unread_count > 0/,
  );
});

test("changes self-assignment with optimistic versioning and classifies foreign locks", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    {
      conversationKey,
      tenantId: 7,
      assignedExternalUserId:
        "external-user-id",
      version: 4,
    },
    null,
    {
      conversationKey,
      tenantId: 7,
      assignedExternalUserId:
        "external-user-id",
      version: 4,
    },
    null,
    {
      conversationKey,
      tenantId: 7,
      assignedExternalUserId:
        "different-user-id",
      version: 4,
    },
  );
  const repository =
    createConversationRepository(database);

  assert.deepEqual(
    await repository.changeAssignment(
      7,
      conversationKey,
      3,
      "external-user-id",
      "assign-self",
    ),
    {
      outcome: "updated",
      state: {
        conversationKey,
        assignedExternalUserId:
          "external-user-id",
        version: 4,
      },
    },
  );
  assert.equal(
    (
      await repository.changeAssignment(
        7,
        conversationKey,
        4,
        "external-user-id",
        "assign-self",
      )
    ).outcome,
    "unchanged",
  );
  assert.deepEqual(
    await repository.changeAssignment(
      7,
      conversationKey,
      4,
      "external-user-id",
      "assign-self",
    ),
    { outcome: "locked" },
  );
  assert.match(
    database.recordings[0].sql,
    /assigned_external_user_id IS NULL[\s\S]+RETURNING/,
  );
});

test("rejects inbox rows returned outside the requested tenant scope", async () => {
  const database = new RecordingDatabase();
  database.allResults.push({
    success: true,
    results: [
      inboxConversationRow({ tenantId: 8 }),
    ],
  });
  const repository =
    createConversationRepository(database);

  await assert.rejects(
    repository.listByTenant(7, 50),
    /outside the requested tenant/,
  );
});

test("persists an inbound retry once and prevents stale delivery regression in SQLite", async () => {
  const { database, d1 } = await createSqliteD1();
  const repository = createConversationRepository(d1);

  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-name");

  const contact = await repository.resolveInboundContact(
    1,
    "+972501234567",
  );
  const currentConversationKey =
    await deriveConversationKey(1, contact.contactId);
  const derived = await deriveInboundMessageKey(1, {
    contactId: contact.contactId,
    providerMessageId: "wamid.inbound-live",
    contentKind: "text",
    textContent: "שלום",
    occurredAt,
  });
  const input = {
    tenantId: 1,
    conversationKey: currentConversationKey,
    messageKey: derived.messageKey,
    ...derived.message,
  };

  assert.equal(
    (await repository.recordInboundMessage(input)).outcome,
    "created",
  );
  assert.equal(
    (await repository.recordInboundMessage(input)).outcome,
    "duplicate",
  );

  const counts = database
    .prepare(
      `SELECT
        conversations.unread_count AS unreadCount,
        count(messages.message_key) AS messageCount
      FROM conversations
      INNER JOIN messages
        ON messages.conversation_key =
          conversations.conversation_key
      GROUP BY conversations.conversation_key`,
    )
    .get();

  assert.equal(counts.unreadCount, 1);
  assert.equal(counts.messageCount, 1);

  const inbox =
    await repository.listByTenant(1, 50);
  const threadMessages =
    await repository.listMessagesByConversation(
      1,
      currentConversationKey,
      100,
    );

  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].contact.phoneNumber, "+972501234567");
  assert.equal(threadMessages.length, 1);
  assert.equal(
    await repository.findByKey(
      2,
      currentConversationKey,
    ),
    null,
  );
  assert.deepEqual(
    await repository.markRead(
      1,
      currentConversationKey,
      2,
    ),
    {
      outcome: "updated",
      state: {
        conversationKey: currentConversationKey,
        unreadCount: 0,
        version: 3,
      },
    },
  );

  assert.deepEqual(
    await repository.changeAssignment(
      1,
      currentConversationKey,
      3,
      "external-user-id",
      "assign-self",
    ),
    {
      outcome: "updated",
      state: {
        conversationKey: currentConversationKey,
        assignedExternalUserId:
          "external-user-id",
        version: 4,
      },
    },
  );
  assert.equal(
    (
      await repository.listFilteredByTenant(
        1,
        {
          searchTerm: "501234",
          status: "new",
          assignment: "mine",
          currentExternalUserId:
            "external-user-id",
        },
        50,
      )
    ).length,
    1,
  );
  assert.deepEqual(
    await repository.changeAssignment(
      1,
      currentConversationKey,
      4,
      "external-user-id",
      "unassign-self",
    ),
    {
      outcome: "updated",
      state: {
        conversationKey: currentConversationKey,
        assignedExternalUserId: null,
        version: 5,
      },
    },
  );

  database
    .prepare(
      `INSERT INTO messages (
        message_key,
        conversation_key,
        tenant_id,
        provider_message_id,
        direction,
        content_kind,
        status,
        text_content,
        occurred_at,
        status_updated_at
      )
      VALUES (?, ?, ?, ?, 'outbound', 'text', 'sent', ?, ?, ?)`,
    )
    .run(
      outboundMessageKey,
      currentConversationKey,
      1,
      "wamid.outbound-live",
      "מענה",
      occurredAt,
      occurredAt,
    );

  assert.equal(
    (
      await repository.applyDeliveryStatus({
        tenantId: 1,
        providerMessageId: "wamid.outbound-live",
        status: "delivered",
        statusEventKey: firstStatusEventKey,
        statusEventAt:
          "2026-07-26T08:32:00.000Z",
      })
    ).outcome,
    "applied",
  );
  assert.equal(
    (
      await repository.applyDeliveryStatus({
        tenantId: 1,
        providerMessageId: "wamid.outbound-live",
        status: "sent",
        statusEventKey: secondStatusEventKey,
        statusEventAt:
          "2026-07-26T08:31:00.000Z",
      })
    ).outcome,
    "stale",
  );

  const storedStatus = database
    .prepare(
      `SELECT status
      FROM messages
      WHERE provider_message_id = ?`,
    )
    .get("wamid.outbound-live");

  assert.equal(storedStatus.status, "delivered");
});

test("rejects invalid tenant, phone, keys, and status before D1 access", async () => {
  const database = new RecordingDatabase();
  const repository =
    createConversationRepository(database);

  await assert.rejects(
    repository.resolveInboundContact(
      7,
      "0501234567",
    ),
    /phoneNumber is invalid/,
  );
  await assert.rejects(
    repository.recordInboundMessage(
      recordInput({
        messageKey: "invalid",
      }),
    ),
    /messageKey is invalid/,
  );
  await assert.rejects(
    repository.applyDeliveryStatus({
      tenantId: 7,
      providerMessageId: "wamid.outbound-17",
      status: "received",
      statusEventKey: firstStatusEventKey,
      statusEventAt: occurredAt,
    }),
    /delivery status is invalid/,
  );
  assert.equal(database.recordings.length, 0);
});
