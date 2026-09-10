import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  createPostgresTemplatesCampaignsDataMigrationPlan,
  createPostgresTemplatesCampaignsDataSnapshot,
  executePostgresTemplatesCampaignsDataMigration,
} from "../server/platform/postgresTemplatesCampaignsDataMigration.ts";
import {
  D1DataMigrationSnapshotError,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  readD1TemplatesCampaignsSnapshot,
} from "../scripts/read-d1-templates-campaigns-snapshot.mjs";
import {
  requireLocalTemplatesCampaignsDataMigrationUrl,
} from "../scripts/verify-postgres-templates-campaigns-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 47).toString("base64");
const createdAt = "2026-08-20T08:00:00.000Z";
const submittedAt = "2026-08-20T08:05:00.000Z";
const reviewedAt = "2026-08-20T08:10:00.000Z";
const templateKey = `template_v1_${"a".repeat(64)}`;
const campaignKey = `campaign_v1_${"b".repeat(64)}`;
const submissionKey = `template_submission_v1_${"c".repeat(64)}`;
const deliveryKey = `campaign_delivery_v1_${"d".repeat(64)}`;

function templateDefinition() {
  return {
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: { 1: "שם איש קשר" },
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

function templateSnapshot() {
  return {
    templateKey,
    metaTemplateId: "400004",
    version: 3,
    name: "service_update",
    category: "UTILITY",
    language: "he",
    ...templateDefinition(),
  };
}

function rawTables() {
  return {
    message_templates: [{
      template_key: templateKey,
      tenant_id: 1,
      meta_template_id: "400004",
      name: "service_update",
      language: "he",
      category: "UTILITY",
      status: "approved",
      definition_json: JSON.stringify(templateDefinition()),
      submission_key: submissionKey,
      submission_started_at: submittedAt,
      last_submission_error_code: null,
      last_status_event_key: "e".repeat(64),
      last_status_event_at: reviewedAt,
      version: 3,
      submitted_at: submittedAt,
      reviewed_at: reviewedAt,
      created_at: createdAt,
      updated_at: reviewedAt,
    }],
    campaigns: [{
      campaign_key: campaignKey,
      tenant_id: 1,
      name: "עדכון שירות",
      status: "draft",
      delivery_mode: "immediate",
      scheduled_at: null,
      timezone: "Asia/Jerusalem",
      template_key: templateKey,
      template_snapshot_json: JSON.stringify(templateSnapshot()),
      audience_snapshot_key: "f".repeat(64),
      recipient_count: 1,
      version: 1,
      activated_at: null,
      started_at: null,
      completed_at: null,
      last_error_code: null,
      created_at: reviewedAt,
      updated_at: reviewedAt,
    }],
    campaign_recipients: [{
      campaign_key: campaignKey,
      tenant_id: 1,
      contact_id: 1,
      contact_version: 2,
      phone_e164: "+972501234567",
      personalization_json: JSON.stringify({ "body:1": "לקוח פרטי" }),
      personalization_key: "1".repeat(64),
      delivery_key: deliveryKey,
      status: "pending",
      attempt_count: 0,
      last_error_code: null,
      queued_at: null,
      accepted_at: null,
      created_at: reviewedAt,
      updated_at: reviewedAt,
    }],
  };
}

function createPlan(tables = rawTables()) {
  return createPostgresTemplatesCampaignsDataMigrationPlan({
    snapshot: createPostgresTemplatesCampaignsDataSnapshot(tables),
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
            if (/^SELECT 1\s+FROM campaigns AS campaign/i.test(sql)) {
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

test("builds privacy-safe migration evidence for frozen campaign snapshots", async () => {
  const plan = createPlan();
  const fixture = createTargetFixture();
  const evidence = await executePostgresTemplatesCampaignsDataMigration({
    plan,
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T10:05:00.000Z",
  });
  const publicArtifacts = JSON.stringify({ manifest: plan.manifest, evidence });

  assert.equal(evidence.tableCount, 3);
  assert.equal(evidence.totalRowCount, 3);
  assert.equal(fixture.committed, true);
  assert.match(
    plan.planId,
    /^connect_postgres_templates_campaigns_data_v1_[0-9a-f]{64}$/,
  );
  assert.doesNotMatch(
    publicArtifacts,
    /לקוח פרטי|שלום|service_update|\+972|400004/,
  );
  assert.equal(
    evidence.tables.every(
      ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
    ),
    true,
  );
});

test("rejects invalid frozen definitions and recipient lifecycle values", () => {
  const cases = [
    ["message_templates", "definition_json", JSON.stringify({
      ...templateDefinition(),
      providerPayload: "forbidden",
    })],
    ["message_templates", "definition_json", JSON.stringify({
      ...templateDefinition(),
      header: " padded ",
    })],
    ["campaigns", "template_snapshot_json", JSON.stringify({
      ...templateSnapshot(),
      templateKey: `template_v1_${"9".repeat(64)}`,
    })],
    ["campaign_recipients", "personalization_json", JSON.stringify({
      unknown: "value",
    })],
    ["campaign_recipients", "personalization_json", JSON.stringify({
      "body:1": " padded ",
    })],
    ["campaign_recipients", "status", "accepted"],
  ];

  for (const [tableName, fieldName, value] of cases) {
    const tables = rawTables();
    tables[tableName][0][fieldName] = value;
    assert.throws(
      () => createPostgresTemplatesCampaignsDataSnapshot(tables),
      (error) => (
        error instanceof PostgresDataMigrationError &&
        error.code === "row-invalid" &&
        error.table === tableName &&
        error.rowIndex === 0
      ),
    );
  }
});

test("rolls back when campaign recipient counts do not reconcile", async () => {
  const fixture = createTargetFixture({ invalidLoadedState: true });

  await assert.rejects(
    executePostgresTemplatesCampaignsDataMigration({
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

test("reads the three current D1 template and campaign tables atomically", () => {
  const database = createCurrentD1Database();
  try {
    database.prepare(
      `INSERT INTO tenants (
         id, display_name, status, created_at, updated_at, provisioning_key
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, "Connect", "active", createdAt, createdAt, "campaign-key");
    database.prepare(
      `INSERT INTO contacts (
         id, tenant_id, phone_e164, mailing_status, consent_status,
         consent_source, consent_recorded_at, version, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      1,
      1,
      "+972501234567",
      "subscribed",
      "granted",
      "documented-consent",
      createdAt,
      2,
      createdAt,
      createdAt,
    );
    const source = rawTables();
    const template = source.message_templates[0];
    database.prepare(
      `INSERT INTO message_templates (
         template_key, tenant_id, meta_template_id, name, language, category,
         status, definition_json, submission_key, submission_started_at,
         last_submission_error_code, last_status_event_key,
         last_status_event_at, version, submitted_at, reviewed_at,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(template));
    const campaign = source.campaigns[0];
    database.prepare(
      `INSERT INTO campaigns (
         campaign_key, tenant_id, name, status, delivery_mode, scheduled_at,
         timezone, template_key, template_snapshot_json,
         audience_snapshot_key, recipient_count, version, activated_at,
         started_at, completed_at, last_error_code, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(campaign));
    const recipient = source.campaign_recipients[0];
    database.prepare(
      `INSERT INTO campaign_recipients (
         campaign_key, tenant_id, contact_id, contact_version, phone_e164,
         personalization_json, personalization_key, delivery_key, status,
         attempt_count, last_error_code, queued_at, accepted_at,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(recipient));

    const snapshot = readD1TemplatesCampaignsSnapshot(database);
    assert.equal(snapshot.tables.message_templates.length, 1);
    assert.equal(snapshot.tables.campaigns.length, 1);
    assert.equal(snapshot.tables.campaign_recipients.length, 1);
  } finally {
    database.close();
  }
});

test("rejects a D1 schema outside the exact three-table contract", () => {
  const database = new DatabaseSync(":memory:");
  try {
    assert.throws(
      () => readD1TemplatesCampaignsSnapshot(database),
      (error) => (
        error instanceof D1DataMigrationSnapshotError &&
        error.code === "schema-mismatch" &&
        error.table === "message_templates"
      ),
    );
  } finally {
    database.close();
  }
});

test("limits the rehearsal URL to its passwordless local database", () => {
  const valid =
    "postgresql://tal@127.0.0.1:55432/" +
    "connect_templates_campaigns_data_migration_rehearsal";
  assert.equal(requireLocalTemplatesCampaignsDataMigrationUrl(valid), valid);

  for (const unsafe of [
    "postgresql://tal:secret@127.0.0.1:55432/" +
      "connect_templates_campaigns_data_migration_rehearsal",
    "postgresql://tal@database.example.com:55432/" +
      "connect_templates_campaigns_data_migration_rehearsal",
    "postgresql://tal@127.0.0.1:55432/connect",
    valid + "?ssl=true",
  ]) {
    assert.throws(
      () => requireLocalTemplatesCampaignsDataMigrationUrl(unsafe),
      /POSTGRES_TEMPLATES_CAMPAIGNS_DATA_URL_INVALID/,
    );
  }
});
