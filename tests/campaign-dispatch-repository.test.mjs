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
import {
  createCampaignDispatchRepository,
} from "../db/campaignDispatchRepository.ts";

const campaignKey =
  `campaign_v1_${"a".repeat(64)}`;
const templateKey =
  `template_v1_${"b".repeat(64)}`;
const firstDeliveryKey =
  `campaign_delivery_v1_${"c".repeat(64)}`;
const secondDeliveryKey =
  `campaign_delivery_v1_${"d".repeat(64)}`;
const activatedAt = "2026-07-26T10:00:00.000Z";
const runningAt = "2026-07-26T10:01:00.000Z";

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
    return (
      this.database.runResults.shift() ?? {
        success: true,
      }
    );
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.firstResults = [];
    this.allResults = [];
    this.runResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
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

function dispatchState(overrides = {}) {
  return {
    campaignKey,
    tenantId: 7,
    status: "scheduled",
    version: 2,
    activatedAt,
    startedAt: null,
    ...overrides,
  };
}

function recipientRow(overrides = {}) {
  return {
    campaignKey,
    tenantId: 7,
    contactId: 17,
    contactVersion: 2,
    phoneNumber: "+972501234567",
    personalizationJson: "{}",
    personalizationKey: "e".repeat(64),
    deliveryKey: firstDeliveryKey,
    status: "sending",
    attemptCount: 1,
    lastErrorCode: null,
    queuedAt: runningAt,
    acceptedAt: null,
    createdAt: "2026-07-26T09:00:00.000Z",
    updatedAt: runningAt,
    ...overrides,
  };
}

test("activates, promotes, claims, and releases bounded dispatch rows", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    dispatchState(),
    {
      campaignKey,
      tenantId: 7,
      recipientPhoneNumber: "+972501234567",
      attemptCount: 0,
    },
  );
  database.allResults.push(
    {
      success: true,
      results: [
        dispatchState({
          status: "running",
          version: 3,
          startedAt: runningAt,
        }),
      ],
    },
    {
      success: true,
      results: [
        { deliveryKey: firstDeliveryKey },
      ],
    },
    {
      success: true,
      results: [{ campaignKey }],
    },
  );
  const repository =
    createCampaignDispatchRepository(database);

  assert.equal(
    (
      await repository.activateCampaign(
        7,
        campaignKey,
        1,
        activatedAt,
      )
    ).status,
    "scheduled",
  );
  assert.equal(
    (
      await repository.promoteDueCampaigns(
        runningAt,
        50,
      )
    )[0].status,
    "running",
  );
  assert.deepEqual(
    await repository.claimPendingRecipients(
      runningAt,
      50,
    ),
    [{ deliveryKey: firstDeliveryKey }],
  );
  assert.deepEqual(
    await repository.findQueuedDeliveryContext(
      firstDeliveryKey,
    ),
    {
      campaignKey,
      tenantId: 7,
      recipientPhoneNumber: "+972501234567",
      nextDeliveryAttemptNumber: 1,
    },
  );
  assert.equal(
    await repository.completeSettledCampaigns(
      runningAt,
      50,
    ),
    1,
  );
  await repository.releaseQueuedRecipients(
    [firstDeliveryKey],
    runningAt,
  );

  assert.deepEqual(
    database.recordings[0].values,
    [7, campaignKey, 1, activatedAt],
  );
  assert.match(
    database.recordings[0].sql,
    /status = 'scheduled'[\s\S]+status = 'draft'/,
  );
  assert.match(
    database.recordings[1].sql,
    /status = 'running'[\s\S]+scheduled_at <= \?1/,
  );
  assert.match(
    database.recordings[2].sql,
    /recipients\.status = 'pending'[\s\S]+campaigns\.status = 'running'/,
  );
  assert.match(
    database.recordings[3].sql,
    /delivery_key = \?1[\s\S]+status = 'queued'[\s\S]+campaigns\.status = 'running'/,
  );
  assert.match(
    database.recordings[4].sql,
    /status = 'completed'[\s\S]+status IN \([\s\S]+'pending'[\s\S]+'queued'[\s\S]+'sending'[\s\S]+'accepted'/,
  );
  assert.match(
    database.recordings[5].sql,
    /status = 'pending'[\s\S]+delivery_key IN \(\?2\)/,
  );
});

test("skips stale consent and claims each valid delivery only once", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    recipientRow({
      status: "skipped",
      attemptCount: 0,
      lastErrorCode: "CONSENT_NOT_GRANTED",
    }),
    recipientRow(),
    null,
  );
  const repository =
    createCampaignDispatchRepository(database);

  assert.deepEqual(
    await repository.prepareDelivery(
      firstDeliveryKey,
      runningAt,
    ),
    { outcome: "skipped" },
  );
  const claimed = await repository.prepareDelivery(
    firstDeliveryKey,
    runningAt,
  );
  const duplicate = await repository.prepareDelivery(
    firstDeliveryKey,
    runningAt,
  );

  assert.equal(claimed.outcome, "claimed");
  assert.equal(
    claimed.recipient.status,
    "sending",
  );
  assert.deepEqual(duplicate, {
    outcome: "duplicate",
  });
  assert.match(
    database.recordings[0].sql,
    /WHEN NOT EXISTS \([\s\S]+contacts\.consent_status = 'granted'[\s\S]+THEN 'CONSENT_NOT_GRANTED'/,
  );
  assert.match(
    database.recordings[1].sql,
    /THEN 'sending'[\s\S]+attempt_count = attempt_count \+ CASE/,
  );
});

test("returns only a claimed delivery to queued after an explicit provider deferral", async () => {
  const database = new RecordingDatabase();

  database.firstResults.push({
    deliveryKey: firstDeliveryKey,
  });
  const repository =
    createCampaignDispatchRepository(database);

  await repository.markDeferred(
    firstDeliveryKey,
    "META_PAIR_RATE_LIMITED",
    runningAt,
  );

  assert.deepEqual(database.recordings[0].values, [
    firstDeliveryKey,
    "META_PAIR_RATE_LIMITED",
    runningAt,
  ]);
  assert.match(
    database.recordings[0].sql,
    /status = 'queued'[\s\S]+status = 'sending'/,
  );
});

test("runs the full dispatch lifecycle against SQLite", async () => {
  const { database, d1 } = await createSqliteD1();
  const templateDefinition = {
    header: "",
    body: "עדכון שירות",
    footer: "",
    variableExamples: {},
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
      JSON.stringify(templateDefinition),
      `template_submission_v1_${"f".repeat(64)}`,
      "2026-07-26T09:00:00.000Z",
      3,
      "2026-07-26T09:01:00.000Z",
      "2026-07-26T09:02:00.000Z",
    );
  const insertContact = database.prepare(
    `INSERT INTO contacts (
      tenant_id,
      phone_e164,
      first_name,
      mailing_status,
      consent_status,
      consent_source,
      consent_recorded_at
    )
    VALUES (?, ?, ?, 'subscribed', 'granted', ?, ?)`,
  );
  insertContact.run(
    1,
    "+972501234567",
    "נמען ראשון",
    "documented-consent",
    "2026-07-26T09:00:00.000Z",
  );
  insertContact.run(
    1,
    "+972509876543",
    "נמען שני",
    "documented-consent",
    "2026-07-26T09:00:00.000Z",
  );

  const firstPersonalizationKey = "1".repeat(64);
  const secondPersonalizationKey = "2".repeat(64);
  const campaigns = createCampaignRepository(d1);

  await campaigns.saveSnapshot({
    campaignKey,
    tenantId: 1,
    name: "עדכון שירות",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: {
      templateKey,
      metaTemplateId: "400004",
      version: 3,
      name: "service_update",
      category: "UTILITY",
      language: "he",
      ...templateDefinition,
    },
    audienceSnapshotKey: "3".repeat(64),
    recipientCount: 2,
    recipients: [
      {
        contactId: 1,
        contactVersion: 1,
        phoneNumber: "+972501234567",
        personalization: {},
        personalizationKey:
          firstPersonalizationKey,
        deliveryKey: firstDeliveryKey,
      },
      {
        contactId: 2,
        contactVersion: 1,
        phoneNumber: "+972509876543",
        personalization: {},
        personalizationKey:
          secondPersonalizationKey,
        deliveryKey: secondDeliveryKey,
      },
    ],
  });

  const dispatch =
    createCampaignDispatchRepository(d1);

  database
    .prepare(
      `UPDATE message_templates
      SET status = 'disabled'
      WHERE template_key = ?`,
    )
    .run(templateKey);
  assert.equal(
    await dispatch.activateCampaign(
      1,
      campaignKey,
      1,
      activatedAt,
    ),
    null,
  );
  database
    .prepare(
      `UPDATE message_templates
      SET status = 'approved'
      WHERE template_key = ?`,
    )
    .run(templateKey);

  const activated = await dispatch.activateCampaign(
    1,
    campaignKey,
    1,
    activatedAt,
  );
  const promoted =
    await dispatch.promoteDueCampaigns(
      runningAt,
      50,
    );
  const jobs =
    await dispatch.claimPendingRecipients(
      runningAt,
      50,
    );

  assert.equal(activated.status, "scheduled");
  assert.equal(promoted[0].status, "running");
  assert.deepEqual(jobs, [
    { deliveryKey: firstDeliveryKey },
    { deliveryKey: secondDeliveryKey },
  ]);
  assert.deepEqual(
    await dispatch.findQueuedDeliveryContext(
      firstDeliveryKey,
    ),
    {
      campaignKey,
      tenantId: 1,
      recipientPhoneNumber: "+972501234567",
      nextDeliveryAttemptNumber: 1,
    },
  );

  database
    .prepare(
      `UPDATE contacts
      SET
        mailing_status = 'unsubscribed',
        consent_status = 'withdrawn',
        consent_withdrawn_at = ?
      WHERE id = ?`,
    )
    .run("2026-07-26T10:01:30.000Z", 1);

  assert.deepEqual(
    await dispatch.prepareDelivery(
      firstDeliveryKey,
      "2026-07-26T10:02:00.000Z",
    ),
    { outcome: "skipped" },
  );
  const prepared = await dispatch.prepareDelivery(
    secondDeliveryKey,
    "2026-07-26T10:02:00.000Z",
  );

  assert.equal(prepared.outcome, "claimed");
  assert.equal(
    prepared.recipient.attemptCount,
    1,
  );
  assert.deepEqual(
    await dispatch.prepareDelivery(
      secondDeliveryKey,
      "2026-07-26T10:02:30.000Z",
    ),
    { outcome: "duplicate" },
  );

  await dispatch.markRejected(
    secondDeliveryKey,
    "PROVIDER_REJECTED",
    "2026-07-26T10:03:00.000Z",
  );
  const states = database
    .prepare(
      `SELECT
        contact_id AS contactId,
        status,
        attempt_count AS attemptCount,
        last_error_code AS lastErrorCode
      FROM campaign_recipients
      ORDER BY contact_id`,
    )
    .all()
    .map((row) => ({ ...row }));

  assert.deepEqual(states, [
    {
      contactId: 1,
      status: "skipped",
      attemptCount: 0,
      lastErrorCode: "CONSENT_NOT_GRANTED",
    },
    {
      contactId: 2,
      status: "failed",
      attemptCount: 1,
      lastErrorCode: "PROVIDER_REJECTED",
    },
  ]);

  assert.equal(
    await dispatch.completeSettledCampaigns(
      "2026-07-26T10:04:00.000Z",
      50,
    ),
    1,
  );
  assert.deepEqual(
    {
      ...database
        .prepare(
          `SELECT
            status,
            completed_at AS completedAt
          FROM campaigns
          WHERE campaign_key = ?`,
        )
        .get(campaignKey),
    },
    {
      status: "completed",
      completedAt: "2026-07-26T10:04:00.000Z",
    },
  );

  database.close();
});
