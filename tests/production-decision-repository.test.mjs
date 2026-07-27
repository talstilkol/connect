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
  createProductionDecisionRepository,
} from "../db/productionDecisionRepository.ts";

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

    this.database.exec("BEGIN IMMEDIATE");

    try {
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

async function createFixture() {
  const migrationDirectory = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrationFiles = (
    await readdir(migrationDirectory)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();
  const database = new DatabaseSync(
    ":memory:",
  );

  database.exec(
    "PRAGMA foreign_keys = ON",
  );

  for (const fileName of migrationFiles) {
    const migration = await readFile(
      new URL(
        fileName,
        migrationDirectory,
      ),
      "utf8",
    );

    for (const statement of migration.split(
      "--> statement-breakpoint",
    )) {
      if (statement.trim()) {
        database.exec(statement);
      }
    }
  }

  return {
    database,
    repository:
      createProductionDecisionRepository(
        new SqliteD1Database(database),
      ),
  };
}

const baseCommand = {
  checkId: "ai.provider",
  expectedVersion: 0,
  selection:
    "Provider choice approved",
  rationale:
    "The approved decision satisfies product and security review.",
  actorExternalUserId:
    "system-admin-external-id",
  occurredAt:
    "2026-07-27T12:00:00.000Z",
};

test("creates and updates one decision with an atomic immutable audit event", async () => {
  const { database, repository } =
    await createFixture();
  const created = await repository.save(
    baseCommand,
  );

  assert.equal(
    created.outcome,
    "created",
  );
  assert.equal(
    created.record.version,
    1,
  );
  assert.equal(
    database
      .prepare(
        "SELECT count(*) AS count FROM production_decision_events",
      )
      .get().count,
    1,
  );

  const updated = await repository.save({
    ...baseCommand,
    expectedVersion: 1,
    selection:
      "Provider and fallback policy approved",
    rationale:
      "The revised decision includes a bounded fallback policy.",
    occurredAt:
      "2026-07-27T12:05:00.000Z",
  });

  assert.equal(
    updated.outcome,
    "updated",
  );
  assert.equal(
    updated.record.version,
    2,
  );
  assert.equal(
    database
      .prepare(
        "SELECT count(*) AS count FROM production_decision_events",
      )
      .get().count,
    2,
  );
  assert.deepEqual(
    database
      .prepare(
        `SELECT decision_version AS version
         FROM production_decision_events
         WHERE check_id = ?
         ORDER BY decision_version`,
      )
      .all("ai.provider")
      .map((row) => row.version),
    [1, 2],
  );
});

test("keeps exact retries idempotent and rejects stale conflicting content", async () => {
  const { database, repository } =
    await createFixture();

  await repository.save(baseCommand);
  const updatedCommand = {
    ...baseCommand,
    expectedVersion: 1,
    selection:
      "Provider and fallback policy approved",
    rationale:
      "The revised decision includes a bounded fallback policy.",
    occurredAt:
      "2026-07-27T12:05:00.000Z",
  };
  await repository.save(updatedCommand);

  const retry = await repository.save({
    ...updatedCommand,
    occurredAt:
      "2026-07-27T12:06:00.000Z",
  });
  const conflict =
    await repository.save({
      ...updatedCommand,
      selection:
        "Conflicting stale selection",
    });

  assert.equal(
    retry.outcome,
    "unchanged",
  );
  assert.equal(
    conflict.outcome,
    "conflict",
  );
  assert.equal(
    conflict.record?.version,
    2,
  );
  assert.equal(
    database
      .prepare(
        "SELECT count(*) AS count FROM production_decision_events",
      )
      .get().count,
    2,
  );
});

test("lists only registered decisions and rejects invalid identities before D1 mutation", async () => {
  const { database, repository } =
    await createFixture();

  await repository.save(baseCommand);
  const records =
    await repository.list();

  assert.deepEqual(
    records.map(
      (record) => record.checkId,
    ),
    ["ai.provider"],
  );
  await assert.rejects(
    repository.save({
      ...baseCommand,
      checkId: "unknown.check",
    }),
  );
  assert.equal(
    database
      .prepare(
        "SELECT count(*) AS count FROM production_decision_records",
      )
      .get().count,
    1,
  );
});

test("database guard prevents a decision version without its matching audit transition", async () => {
  const { database, repository } =
    await createFixture();

  await repository.save(baseCommand);

  assert.throws(() =>
    database
      .prepare(
        `UPDATE production_decision_records
         SET version = version + 2
         WHERE check_id = ?`,
      )
      .run("ai.provider"),
  );
  assert.equal(
    database
      .prepare(
        "SELECT version FROM production_decision_records WHERE check_id = ?",
      )
      .get("ai.provider").version,
    1,
  );
});

test("rolls back the decision update when its immutable audit event conflicts", async () => {
  const { database, repository } =
    await createFixture();

  await repository.save(baseCommand);
  const conflictingEventKey =
    `production_decision_event_v1_${"c".repeat(64)}`;

  database
    .prepare(
      `INSERT INTO production_decision_events (
        event_key,
        check_id,
        event_type,
        selection,
        rationale,
        actor_external_user_id,
        decision_version,
        occurred_at
      )
      VALUES (?, ?, 'recorded', ?, ?, ?, 2, ?)`,
    )
    .run(
      conflictingEventKey,
      "ai.provider",
      "Pre-existing conflicting event",
      "The event occupies the next immutable decision version.",
      "system-admin-external-id",
      "2026-07-27T12:04:00.000Z",
    );

  await assert.rejects(
    repository.save({
      ...baseCommand,
      expectedVersion: 1,
      selection:
        "Provider and fallback policy approved",
      rationale:
        "The revised decision includes a bounded fallback policy.",
      occurredAt:
        "2026-07-27T12:05:00.000Z",
    }),
  );
  assert.equal(
    database
      .prepare(
        "SELECT version FROM production_decision_records WHERE check_id = ?",
      )
      .get("ai.provider").version,
    1,
  );
});
