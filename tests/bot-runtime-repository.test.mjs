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
  createBotRuntimeRepository,
} from "../db/botRuntimeRepository.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;

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
    return (
      this.database.firstResults.shift() ??
      null
    );
  }

  async all() {
    return {
      success: true,
      results: [],
    };
  }

  async run() {
    return { success: true };
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.firstResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }

  async batch() {
    return [];
  }
}

class SqliteD1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return (
      this.statement.get(...this.values) ??
      null
    );
  }

  async all() {
    return {
      success: true,
      results: this.statement.all(
        ...this.values,
      ),
    };
  }

  async run() {
    const result = this.statement.run(
      ...this.values,
    );

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
      this.database.prepare(sql),
    );
  }

  async batch(statements) {
    const results = [];

    for (const statement of statements) {
      results.push(await statement.run());
    }

    return results;
  }
}

async function createSqliteD1() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  const migrationDirectory = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrations = (
    await readdir(migrationDirectory)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();

  for (const migration of migrations) {
    const sql = await readFile(
      new URL(migration, migrationDirectory),
      "utf8",
    );

    for (const statement of sql.split(
      "--> statement-breakpoint",
    )) {
      if (statement.trim()) {
        database.exec(statement);
      }
    }
  }

  return {
    database,
    d1: new SqliteD1Database(database),
  };
}

function stateRow(overrides = {}) {
  return {
    conversationKey,
    tenantId: 7,
    status: "new",
    assignedExternalUserId: null,
    version: 3,
    ...overrides,
  };
}

test("applies handoff only through tenant, version, status, and unassigned guards", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    stateRow({
      status: "waiting_for_agent",
      version: 4,
    }),
  );
  const repository =
    createBotRuntimeRepository(database);

  const result = await repository.applyHandoff(
    7,
    conversationKey,
    3,
  );

  assert.equal(result.outcome, "updated");
  assert.equal(
    result.state.assignedExternalUserId,
    null,
  );
  assert.deepEqual(
    database.recordings[0].values,
    [7, conversationKey, 3],
  );
  assert.match(
    database.recordings[0].sql,
    /assigned_external_user_id IS NULL[\s\S]+status IN \('new', 'bot_active'\)/,
  );
});

test("classifies an idempotent retry, assignment lock, and stale version", async () => {
  const retryDatabase = new RecordingDatabase();
  retryDatabase.firstResults.push(
    null,
    stateRow({
      status: "waiting_for_agent",
      version: 4,
    }),
  );
  const lockedDatabase = new RecordingDatabase();
  lockedDatabase.firstResults.push(
    null,
    stateRow({
      assignedExternalUserId: "agent-id",
    }),
  );
  const staleDatabase = new RecordingDatabase();
  staleDatabase.firstResults.push(
    null,
    stateRow({ version: 5 }),
  );

  assert.equal(
    (
      await createBotRuntimeRepository(
        retryDatabase,
      ).applyHandoff(
        7,
        conversationKey,
        3,
      )
    ).outcome,
    "unchanged",
  );
  assert.equal(
    (
      await createBotRuntimeRepository(
        lockedDatabase,
      ).applyHandoff(
        7,
        conversationKey,
        3,
      )
    ).outcome,
    "locked",
  );
  assert.equal(
    (
      await createBotRuntimeRepository(
        staleDatabase,
      ).applyHandoff(
        7,
        conversationKey,
        3,
      )
    ).outcome,
    "conflict",
  );
});

test("moves only an unassigned eligible conversation in SQLite and preserves the agent lock", async () => {
  const { database, d1 } =
    await createSqliteD1();
  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-one");
  database
    .prepare(
      "INSERT INTO contacts (tenant_id, phone_e164) VALUES (?, ?)",
    )
    .run(1, "+972501234567");
  database
    .prepare(
      "INSERT INTO contacts (tenant_id, phone_e164) VALUES (?, ?)",
    )
    .run(1, "+972501234568");
  const secondConversationKey =
    `conversation_v1_${"b".repeat(64)}`;
  database
    .prepare(
      `INSERT INTO conversations
        (conversation_key, tenant_id, contact_id, status)
       VALUES (?, ?, ?, ?)`,
    )
    .run(conversationKey, 1, 1, "bot_active");
  database
    .prepare(
      `INSERT INTO conversations
        (conversation_key, tenant_id, contact_id, status, assigned_external_user_id)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      secondConversationKey,
      1,
      2,
      "new",
      "agent-id",
    );
  const repository =
    createBotRuntimeRepository(d1);

  const applied = await repository.applyHandoff(
    1,
    conversationKey,
    1,
  );
  const retry = await repository.applyHandoff(
    1,
    conversationKey,
    1,
  );
  const locked = await repository.applyHandoff(
    1,
    secondConversationKey,
    1,
  );

  assert.equal(applied.outcome, "updated");
  assert.equal(retry.outcome, "unchanged");
  assert.equal(locked.outcome, "locked");
  const handedOff = database
    .prepare(
      `SELECT status, assigned_external_user_id AS assignee
       FROM conversations
       WHERE conversation_key = ?`,
    )
    .get(conversationKey);
  const agentLocked = database
    .prepare(
      `SELECT status, assigned_external_user_id AS assignee
       FROM conversations
       WHERE conversation_key = ?`,
    )
    .get(secondConversationKey);

  assert.equal(
    handedOff.status,
    "waiting_for_agent",
  );
  assert.equal(handedOff.assignee, null);
  assert.equal(agentLocked.status, "new");
  assert.equal(
    agentLocked.assignee,
    "agent-id",
  );
  assert.equal(
    await repository.findConversationState(
      2,
      conversationKey,
    ),
    null,
  );
});
