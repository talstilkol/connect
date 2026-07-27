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
  createCampaignRepository,
} from "../db/campaignRepository.ts";

const campaignKey =
  `campaign_v1_${"a".repeat(64)}`;
const templateKey =
  `template_v1_${"b".repeat(64)}`;
const audienceSnapshotKey = "c".repeat(64);
const personalizationKey = "d".repeat(64);
const deliveryKey =
  `campaign_delivery_v1_${"e".repeat(64)}`;

function templateSnapshot() {
  return {
    templateKey,
    metaTemplateId: "400004",
    version: 3,
    name: "service_update",
    category: "UTILITY",
    language: "he",
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: {
      1: "שם איש קשר",
    },
    buttonMode: "none",
    quickReplies: [],
    urlButton: {
      enabled: false,
      mode: "static",
      text: "",
      value: "",
      example: "",
    },
    phoneButton: {
      enabled: false,
      text: "",
      value: "",
    },
  };
}

function campaignRow(overrides = {}) {
  return {
    campaignKey,
    tenantId: 7,
    name: "עדכון שירות",
    status: "draft",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    templateKey,
    templateSnapshotJson: JSON.stringify(
      templateSnapshot(),
    ),
    audienceSnapshotKey,
    recipientCount: 1,
    version: 1,
    activatedAt: null,
    startedAt: null,
    completedAt: null,
    lastErrorCode: null,
    createdAt: "2026-07-26 08:00:00",
    updatedAt: "2026-07-26 08:00:00",
    ...overrides,
  };
}

function saveInput(overrides = {}) {
  return {
    campaignKey,
    tenantId: 7,
    name: "עדכון שירות",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: templateSnapshot(),
    audienceSnapshotKey,
    recipientCount: 1,
    recipients: [
      {
        contactId: 17,
        contactVersion: 2,
        phoneNumber: "+972501234567",
        personalization: {
          "body:1": "שם איש קשר",
        },
        personalizationKey,
        deliveryKey,
      },
    ],
    ...overrides,
  };
}

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.values = values;
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
    this.batchResults = [
      { success: true },
      { success: true },
    ];
    this.batchCalls = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }

  async batch(statements) {
    this.batchCalls.push(statements);
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
    return this.statement.get(...this.values) ?? null;
  }

  async all() {
    return {
      success: true,
      results: this.statement.all(...this.values),
    };
  }

  async run() {
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

test("writes campaign and recipients in one two-statement transaction", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    campaignRow(),
    { recipientCount: 1 },
  );
  const repository = createCampaignRepository(database);

  const saved = await repository.saveSnapshot(
    saveInput(),
  );

  assert.equal(saved.campaignKey, campaignKey);
  assert.equal(saved.status, "draft");
  assert.equal(database.batchCalls.length, 1);
  assert.equal(database.batchCalls[0].length, 2);
  assert.match(
    database.recordings[0].sql,
    /FROM message_templates[\s\S]+status = 'approved'/,
  );
  assert.deepEqual(
    database.recordings[0].values.slice(10, 12),
    ["400004", 3],
  );
  assert.equal(
    database.recordings[0].values[12],
    database.recordings[1].values[2],
  );
  assert.match(
    database.recordings[0].sql,
    /NOT EXISTS[\s\S]+contacts\.version IS NOT[\s\S]+contacts\.mailing_status != 'subscribed'[\s\S]+contacts\.consent_status != 'granted'/,
  );
  assert.match(
    database.recordings[1].sql,
    /FROM json_each\(\?3\)/,
  );
  assert.match(
    database.recordings[1].sql,
    /ON CONFLICT \(campaign_key, contact_id\) DO NOTHING/,
  );
  assert.match(
    database.recordings[1].sql,
    /contacts\.version = CAST[\s\S]+contacts\.mailing_status = 'subscribed'[\s\S]+contacts\.consent_status = 'granted'/,
  );

  const recipientPayload = JSON.parse(
    database.recordings[1].values[2],
  );

  assert.deepEqual(recipientPayload, [
    {
      contactId: 17,
      contactVersion: 2,
      phoneNumber: "+972501234567",
      personalizationJson:
        "{\"body:1\":\"שם איש קשר\"}",
      personalizationKey,
      deliveryKey,
    },
  ]);
  assert.equal(
    "consentStatus" in recipientPayload[0],
    false,
  );
  assert.equal(
    "mailingStatus" in recipientPayload[0],
    false,
  );
});

test("rejects mismatched recipient counts before D1 access", async () => {
  const database = new RecordingDatabase();
  const repository = createCampaignRepository(database);

  await assert.rejects(
    repository.saveSnapshot(
      saveInput({
        recipientCount: 2,
      }),
    ),
    /recipient count/,
  );
  assert.equal(database.batchCalls.length, 0);
});

test("fails the snapshot when either transactional statement fails", async () => {
  const database = new RecordingDatabase();
  database.batchResults = [
    { success: true },
    {
      success: false,
      error: "internal recipient write detail",
    },
  ];
  const repository = createCampaignRepository(database);

  await assert.rejects(
    repository.saveSnapshot(saveInput()),
    /internal recipient write detail/,
  );
  assert.equal(database.firstResults.length, 0);
});

test("verifies the stored recipient count after an idempotent write", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    campaignRow(),
    { recipientCount: 0 },
  );
  const repository = createCampaignRepository(database);

  await assert.rejects(
    repository.saveSnapshot(saveInput()),
    /verification failed/,
  );
});

test("lists only campaigns inside the requested tenant", async () => {
  const database = new RecordingDatabase();
  database.allResults.push({
    success: true,
    results: [campaignRow()],
  });
  const repository = createCampaignRepository(database);

  const campaigns =
    await repository.listByTenant(7, 100);

  assert.equal(campaigns.length, 1);
  assert.deepEqual(database.recordings[0].values, [
    7,
    100,
  ]);
  assert.match(
    database.recordings[0].sql,
    /WHERE tenant_id = \?1/,
  );
  assert.match(
    database.recordings[0].sql,
    /ORDER BY updated_at DESC, campaign_key ASC/,
  );
});

test("rejects a malformed campaign snapshot returned by D1", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    campaignRow({
      templateSnapshotJson: "{\"name\":",
    }),
  );
  const repository = createCampaignRepository(database);

  await assert.rejects(
    repository.findByKey(7, campaignKey),
    /invalid campaign template snapshot/,
  );
});

test("executes the repository SQL atomically against SQLite", async () => {
  const { database, d1 } = await createSqliteD1();
  const definitionJson = JSON.stringify({
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: {
      1: "שם איש קשר",
    },
    buttonMode: "none",
    quickReplies: [],
    urlButton: {
      enabled: false,
      mode: "static",
      text: "",
      value: "",
      example: "",
    },
    phoneButton: {
      enabled: false,
      text: "",
      value: "",
    },
  });

  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-name");
  database
    .prepare(
      `INSERT INTO message_templates (
        template_key,
        tenant_id,
        meta_template_id,
        name,
        language,
        category,
        status,
        definition_json,
        submission_key,
        submission_started_at,
        version,
        submitted_at,
        reviewed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      templateKey,
      1,
      "400004",
      "service_update",
      "he",
      "UTILITY",
      "approved",
      definitionJson,
      `template_submission_v1_${"f".repeat(64)}`,
      "2026-07-25T09:58:00.000Z",
      3,
      "2026-07-25T09:59:00.000Z",
      "2026-07-25T10:00:00.000Z",
    );
  database
    .prepare(
      `INSERT INTO contacts (
        tenant_id,
        phone_e164,
        mailing_status,
        consent_status,
        consent_source,
        consent_recorded_at
      )
      VALUES (?, ?, 'subscribed', 'granted', ?, ?)`,
    )
    .run(
      1,
      "+972501234567",
      "documented-consent",
      "2026-07-25T09:00:00.000Z",
    );

  const repository = createCampaignRepository(d1);
  const input = saveInput({
    tenantId: 1,
    recipients: [
      {
        ...saveInput().recipients[0],
        contactId: 1,
        contactVersion: 1,
      },
    ],
  });
  const saved = await repository.saveSnapshot(input);
  const repeated =
    await repository.saveSnapshot(input);
  const counts = database
    .prepare(
      `SELECT
        (SELECT count(*) FROM campaigns) AS campaigns,
        (SELECT count(*) FROM campaign_recipients) AS recipients`,
    )
    .get();

  assert.equal(saved.status, "draft");
  assert.equal(repeated.campaignKey, saved.campaignKey);
  assert.equal(counts.campaigns, 1);
  assert.equal(counts.recipients, 1);

  database
    .prepare(
      `UPDATE contacts
      SET
        mailing_status = 'unsubscribed',
        consent_status = 'withdrawn',
        consent_withdrawn_at = ?
      WHERE id = ?`,
    )
    .run("2026-07-26T08:30:00.000Z", 1);

  await assert.rejects(
    repository.saveSnapshot({
      ...input,
      campaignKey:
        `campaign_v1_${"8".repeat(64)}`,
      name: "עדכון לאחר הסרה",
    }),
    /verification failed/,
  );
  assert.equal(
    database
      .prepare("SELECT count(*) AS count FROM campaigns")
      .get().count,
    1,
  );
  assert.equal(
    database
      .prepare(
        "SELECT count(*) AS count FROM campaign_recipients",
      )
      .get().count,
    1,
  );

  database
    .prepare(
      `UPDATE contacts
      SET
        mailing_status = 'subscribed',
        consent_status = 'granted',
        consent_withdrawn_at = NULL
      WHERE id = ?`,
    )
    .run(1);
  database
    .prepare(
      "UPDATE message_templates SET status = 'disabled' WHERE template_key = ?",
    )
    .run(templateKey);

  await assert.rejects(
    repository.saveSnapshot({
      ...input,
      campaignKey:
        `campaign_v1_${"9".repeat(64)}`,
      name: "עדכון שירות נוסף",
    }),
    /campaign snapshot write failed/,
  );
  assert.equal(
    database
      .prepare("SELECT count(*) AS count FROM campaigns")
      .get().count,
    1,
  );

  database.close();
});
