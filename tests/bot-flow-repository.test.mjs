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
  createBotFlowRepository,
} from "../db/botFlowRepository.ts";
import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";

async function definitionFixture(
  versionNumber = 1,
) {
  const name = "מענה ראשוני ללקוחות";
  const botFlowKey = await deriveBotFlowKey(
    7,
    name,
  );
  const triggerKey =
    await deriveBotFlowBlockKey(botFlowKey, 1);
  const textKey =
    await deriveBotFlowBlockKey(botFlowKey, 2);
  const endKey =
    await deriveBotFlowBlockKey(botFlowKey, 3);
  const definition = {
    name,
    blocks: [
      {
        blockKey: triggerKey,
        type: "trigger",
        nextBlockKey: textKey,
      },
      {
        blockKey: textKey,
        type: "text",
        text:
          versionNumber === 1
            ? "כיצד אפשר לעזור?"
            : "כיצד נוכל לעזור?",
        nextBlockKey: endKey,
      },
      {
        blockKey: endKey,
        type: "end",
      },
    ],
  };
  const botFlowVersionKey =
    await deriveBotFlowVersionKey(
      7,
      botFlowKey,
      versionNumber,
      definition,
    );

  return {
    botFlowKey,
    botFlowVersionKey,
    definition,
    versionNumber,
  };
}

function flowRow(fixture, overrides = {}) {
  return {
    botFlowKey: fixture.botFlowKey,
    tenantId: 7,
    name: fixture.definition.name,
    status: "draft",
    latestVersionKey:
      fixture.botFlowVersionKey,
    latestVersionNumber:
      fixture.versionNumber,
    activeVersionKey: null,
    version: fixture.versionNumber,
    createdAt: "2026-07-26 09:00:00",
    updatedAt: "2026-07-26 09:00:00",
    ...overrides,
  };
}

function versionRow(
  fixture,
  overrides = {},
) {
  return {
    botFlowVersionKey:
      fixture.botFlowVersionKey,
    botFlowKey: fixture.botFlowKey,
    tenantId: 7,
    versionNumber: fixture.versionNumber,
    status: "draft",
    definitionJson: JSON.stringify({
      name: fixture.definition.name,
      entryBlockKey:
        fixture.definition.blocks[0].blockKey,
      blocks: [...fixture.definition.blocks].sort(
        (first, second) =>
          first.blockKey < second.blockKey
            ? -1
            : first.blockKey >
                second.blockKey
              ? 1
              : 0,
      ),
    }),
    publishedAt: null,
    createdAt: "2026-07-26 09:00:00",
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
    return (
      this.database.firstResults.shift() ??
      null
    );
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
    return {
      success: true,
      meta: { changes: 1 },
    };
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
    return this.batchResults;
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
  const migrationFiles = (
    await readdir(migrationsUrl)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();
  const migrationParts = await Promise.all(
    migrationFiles.map((fileName) =>
      readFile(
        new URL(fileName, migrationsUrl),
        "utf8",
      ),
    ),
  );
  const database = new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON");
  database.exec(
    migrationParts
      .join("\n")
      .replaceAll(
        "--> statement-breakpoint",
        "",
      ),
  );

  return {
    database,
    d1: new SqliteD1Database(database),
  };
}

test("creates one tenant-scoped immutable draft snapshot in a batch", async () => {
  const fixture = await definitionFixture();
  const database = new RecordingDatabase();
  database.batchResults = [
    { success: true, meta: { changes: 1 } },
    { success: true, meta: { changes: 1 } },
  ];
  database.firstResults.push(
    flowRow(fixture),
    versionRow(fixture),
  );
  const repository =
    createBotFlowRepository(database);

  const result = await repository.saveDraft({
    tenantId: 7,
    botFlowKey: fixture.botFlowKey,
    botFlowVersionKey:
      fixture.botFlowVersionKey,
    versionNumber: 1,
    expectedFlowVersion: null,
    definition: fixture.definition,
  });

  assert.equal(result.outcome, "created");
  assert.equal(result.flow.status, "draft");
  assert.equal(
    result.draftVersion.status,
    "draft",
  );
  assert.match(
    database.recordings[0].sql,
    /INSERT INTO bot_flows[\s\S]+ON CONFLICT/,
  );
  assert.match(
    database.recordings[1].sql,
    /INSERT INTO bot_flow_versions[\s\S]+FROM bot_flows/,
  );
  assert.doesNotMatch(
    database.recordings[1].values[4],
    /tenantId|accessToken|providerPayload/,
  );
});

test("appends a new draft only at the expected flow version", async () => {
  const fixture = await definitionFixture(2);
  const database = new RecordingDatabase();
  database.batchResults = [
    { success: true, meta: { changes: 1 } },
    { success: true, meta: { changes: 1 } },
  ];
  database.firstResults.push(
    flowRow(fixture, {
      version: 2,
    }),
    versionRow(fixture),
  );
  const repository =
    createBotFlowRepository(database);

  const result = await repository.saveDraft({
    tenantId: 7,
    botFlowKey: fixture.botFlowKey,
    botFlowVersionKey:
      fixture.botFlowVersionKey,
    versionNumber: 2,
    expectedFlowVersion: 1,
    definition: fixture.definition,
  });

  assert.equal(result.outcome, "updated");
  assert.deepEqual(
    database.recordings[0].values,
    [
      7,
      fixture.botFlowKey,
      1,
      fixture.botFlowVersionKey,
      2,
      fixture.definition.name,
    ],
  );
  assert.match(
    database.recordings[0].sql,
    /version = \?3[\s\S]+latest_version_number = \?5 - 1/,
  );
});

test("publishes the latest draft behind guarded tenant and version checks", async () => {
  const fixture = await definitionFixture();
  const database = new RecordingDatabase();
  database.batchResults = [
    { success: true, meta: { changes: 1 } },
    { success: true, meta: { changes: 0 } },
    { success: true, meta: { changes: 1 } },
  ];
  database.firstResults.push(
    flowRow(fixture, {
      status: "active",
      activeVersionKey:
        fixture.botFlowVersionKey,
      version: 2,
    }),
    versionRow(fixture, {
      status: "published",
      publishedAt: "2026-07-26 09:05:00",
    }),
  );
  const repository =
    createBotFlowRepository(database);

  const result = await repository.publishDraft(
    7,
    fixture.botFlowKey,
    fixture.botFlowVersionKey,
    1,
  );

  assert.equal(result.outcome, "updated");
  assert.equal(
    result.flow.activeVersionKey,
    fixture.botFlowVersionKey,
  );
  assert.equal(
    result.publishedVersion.status,
    "published",
  );
  assert.match(
    database.recordings[0].sql,
    /tenant_id = \?1[\s\S]+version = \?3[\s\S]+status = 'draft'/,
  );
  assert.match(
    database.recordings[2].sql,
    /active_version_key = \?4[\s\S]+version = \?5/,
  );
});

test("rejects mismatched deterministic identity before D1 access", async () => {
  const fixture = await definitionFixture();
  const database = new RecordingDatabase();
  const repository =
    createBotFlowRepository(database);

  await assert.rejects(
    repository.saveDraft({
      tenantId: 7,
      botFlowKey: fixture.botFlowKey,
      botFlowVersionKey:
        `bot_flow_version_v1_${"f".repeat(64)}`,
      versionNumber: 1,
      expectedFlowVersion: null,
      definition: fixture.definition,
    }),
    /identity is invalid/,
  );
  assert.equal(database.recordings.length, 0);
});

test("lists only validated rows inside the requested tenant scope", async () => {
  const fixture = await definitionFixture();
  const database = new RecordingDatabase();
  database.allResults.push({
    success: true,
    results: [flowRow(fixture)],
  });
  const repository =
    createBotFlowRepository(database);

  const flows = await repository.listByTenant(
    7,
    50,
  );

  assert.equal(flows.length, 1);
  assert.deepEqual(
    database.recordings[0].values,
    [7, 50],
  );

  database.allResults.push({
    success: true,
    results: [
      flowRow(fixture, { tenantId: 8 }),
    ],
  });

  await assert.rejects(
    repository.listByTenant(7, 50),
    /outside the requested tenant/,
  );
});

test("lists at most two active runtime candidates inside the tenant", async () => {
  const fixture = await definitionFixture();
  const database = new RecordingDatabase();
  database.allResults.push({
    success: true,
    results: [
      flowRow(fixture, {
        status: "active",
        activeVersionKey:
          fixture.botFlowVersionKey,
      }),
    ],
  });
  const repository =
    createBotFlowRepository(database);

  const flows =
    await repository.listActiveByTenant(
      7,
      2,
    );

  assert.equal(flows.length, 1);
  assert.equal(flows[0].status, "active");
  assert.deepEqual(
    database.recordings[0].values,
    [7, 2],
  );
  assert.match(
    database.recordings[0].sql,
    /status = 'active'/,
  );
});

test("runs draft history and publication replacement atomically against SQLite", async () => {
  const { database, d1 } =
    await createSqliteD1();
  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-one");
  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-two");
  const repository = createBotFlowRepository(d1);
  const first = await definitionFixture(1);

  await assert.rejects(
    repository.saveDraft({
      tenantId: 7,
      botFlowKey: first.botFlowKey,
      botFlowVersionKey:
        first.botFlowVersionKey,
      versionNumber: 1,
      expectedFlowVersion: null,
      definition: first.definition,
    }),
    /draft write failed/,
  );

  const tenantSeven = database
    .prepare(
      "INSERT INTO tenants (id, display_name) VALUES (?, ?)",
    );
  tenantSeven.run(7, "tenant-seven");

  const stored = await repository.saveDraft({
    tenantId: 7,
    botFlowKey: first.botFlowKey,
    botFlowVersionKey:
      first.botFlowVersionKey,
    versionNumber: 1,
    expectedFlowVersion: null,
    definition: first.definition,
  });

  assert.equal(stored.outcome, "created");
  assert.equal(
    await repository.findByKey(
      8,
      first.botFlowKey,
    ),
    null,
  );

  const firstPublication =
    await repository.publishDraft(
      7,
      first.botFlowKey,
      first.botFlowVersionKey,
      1,
    );

  assert.equal(
    firstPublication.outcome,
    "updated",
  );

  const second = await definitionFixture(2);
  const secondDraft =
    await repository.saveDraft({
      tenantId: 7,
      botFlowKey: second.botFlowKey,
      botFlowVersionKey:
        second.botFlowVersionKey,
      versionNumber: 2,
      expectedFlowVersion: 2,
      definition: second.definition,
    });

  assert.equal(secondDraft.outcome, "updated");
  assert.equal(secondDraft.flow.status, "active");
  assert.equal(
    secondDraft.flow.activeVersionKey,
    first.botFlowVersionKey,
  );

  const secondPublication =
    await repository.publishDraft(
      7,
      second.botFlowKey,
      second.botFlowVersionKey,
      3,
    );

  assert.equal(
    secondPublication.outcome,
    "updated",
  );
  assert.equal(
    (
      await repository.publishDraft(
        7,
        second.botFlowKey,
        second.botFlowVersionKey,
        3,
      )
    ).outcome,
    "unchanged",
  );

  const versions =
    await repository.listVersions(
      7,
      second.botFlowKey,
      50,
    );

  assert.deepEqual(
    versions.map((version) => [
      version.versionNumber,
      version.status,
    ]),
    [
      [2, "published"],
      [1, "archived"],
    ],
  );
});
