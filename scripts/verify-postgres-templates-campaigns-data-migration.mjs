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
  POSTGRES_TEMPLATES_CAMPAIGNS_DATA_TABLE_CONTRACTS,
  createPostgresTemplatesCampaignsDataMigrationPlan,
  createPostgresTemplatesCampaignsDataSnapshot,
  executePostgresTemplatesCampaignsDataMigration,
} from "../server/platform/postgresTemplatesCampaignsDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1TemplatesCampaignsSnapshot,
} from "./read-d1-templates-campaigns-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_templates_campaigns_data_migration_rehearsal";
const environmentKey =
  "CONNECT_POSTGRES_TEMPLATES_CAMPAIGNS_DATA_MIGRATION_REHEARSAL_URL";
const evidenceHmacKey = Buffer.alloc(32, 53).toString("base64");
const times = Object.freeze({
  created: "2026-08-20T08:00:00.000Z",
  submitted: "2026-08-20T08:05:00.000Z",
  reviewed: "2026-08-20T08:10:00.000Z",
  scheduled: "2026-08-20T09:00:00.000Z",
  changed: "2026-08-20T09:05:00.000Z",
  completed: "2026-08-20T09:10:00.000Z",
});
const keys = Object.freeze({
  primaryTemplate: `template_v1_${"1".repeat(64)}`,
  secondaryTemplate: `template_v1_${"2".repeat(64)}`,
  draftTemplate: `template_v1_${"3".repeat(64)}`,
  primaryCampaign: `campaign_v1_${"4".repeat(64)}`,
  secondaryCampaign: `campaign_v1_${"5".repeat(64)}`,
  primaryDelivery: `campaign_delivery_v1_${"6".repeat(64)}`,
  secondDelivery: `campaign_delivery_v1_${"7".repeat(64)}`,
  secondaryDelivery: `campaign_delivery_v1_${"8".repeat(64)}`,
  primarySubmission: `template_submission_v1_${"9".repeat(64)}`,
  secondarySubmission: `template_submission_v1_${"a".repeat(64)}`,
  draftSubmission: `template_submission_v1_${"b".repeat(64)}`,
});

function fail(code) {
  throw new Error(`POSTGRES_TEMPLATES_CAMPAIGNS_DATA_${code}`);
}

export function requireLocalTemplatesCampaignsDataMigrationUrl(value) {
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

function templateDefinition(body) {
  return {
    header: "",
    body,
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

function templateSnapshot(templateKey, metaTemplateId, version, name, body) {
  return {
    templateKey,
    metaTemplateId,
    version,
    name,
    category: "UTILITY",
    language: "he",
    ...templateDefinition(body),
  };
}

function seedD1Dependencies(database) {
  const insertTenant = database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (?, ?, 'active', ?, ?, ?)`,
  );
  insertTenant.run(
    1, "Primary campaign rehearsal", times.created, times.created,
    "templates-campaigns-primary",
  );
  insertTenant.run(
    2, "Secondary campaign rehearsal", times.created, times.created,
    "templates-campaigns-secondary",
  );

  const insertContact = database.prepare(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       consent_source, consent_recorded_at, version, created_at, updated_at
     ) VALUES (?, ?, ?, 'subscribed', 'granted', 'documented-consent', ?, 2, ?, ?)`,
  );
  for (const [id, tenantId, phone] of [
    [11, 1, "+972501111111"],
    [12, 1, "+972501111112"],
    [21, 2, "+972502222221"],
    [22, 2, "+972502222222"],
  ]) {
    insertContact.run(
      id,
      tenantId,
      phone,
      times.created,
      times.created,
      times.created,
    );
  }
}

function seedD1Slice(database) {
  const insertTemplate = database.prepare(
    `INSERT INTO message_templates (
       template_key, tenant_id, meta_template_id, name, language, category,
       status, definition_json, submission_key, submission_started_at,
       last_submission_error_code, last_status_event_key,
       last_status_event_at, version, submitted_at, reviewed_at,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, 'he', 'UTILITY', ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertTemplate.run(
    keys.primaryTemplate,
    1,
    "400001",
    "primary_service_update",
    "approved",
    JSON.stringify(templateDefinition("שלום {{1}}")),
    keys.primarySubmission,
    times.submitted,
    "c".repeat(64),
    times.reviewed,
    3,
    times.submitted,
    times.reviewed,
    times.created,
    times.reviewed,
  );
  insertTemplate.run(
    keys.secondaryTemplate,
    2,
    "400002",
    "secondary_service_update",
    "approved",
    JSON.stringify(templateDefinition("עדכון עבור {{1}}")),
    keys.secondarySubmission,
    times.submitted,
    "d".repeat(64),
    times.reviewed,
    2,
    times.submitted,
    times.reviewed,
    times.created,
    times.reviewed,
  );
  insertTemplate.run(
    keys.draftTemplate,
    1,
    null,
    "draft_service_update",
    "draft",
    JSON.stringify(templateDefinition("טיוטה עבור {{1}}")),
    null,
    null,
    null,
    null,
    1,
    null,
    null,
    times.created,
    times.created,
  );

  const insertCampaign = database.prepare(
    `INSERT INTO campaigns (
       campaign_key, tenant_id, name, status, delivery_mode, scheduled_at,
       timezone, template_key, template_snapshot_json,
       audience_snapshot_key, recipient_count, version, activated_at,
       started_at, completed_at, last_error_code, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'Asia/Jerusalem', ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
  );
  insertCampaign.run(
    keys.primaryCampaign,
    1,
    "עדכון שירות ראשי",
    "draft",
    "immediate",
    null,
    keys.primaryTemplate,
    JSON.stringify(templateSnapshot(
      keys.primaryTemplate,
      "400001",
      3,
      "primary_service_update",
      "שלום {{1}}",
    )),
    "e".repeat(64),
    2,
    1,
    null,
    times.reviewed,
    times.reviewed,
  );
  insertCampaign.run(
    keys.secondaryCampaign,
    2,
    "עדכון שירות משני",
    "scheduled",
    "scheduled",
    times.scheduled,
    keys.secondaryTemplate,
    JSON.stringify(templateSnapshot(
      keys.secondaryTemplate,
      "400002",
      2,
      "secondary_service_update",
      "עדכון עבור {{1}}",
    )),
    "f".repeat(64),
    1,
    2,
    times.reviewed,
    times.reviewed,
    times.reviewed,
  );

  const insertRecipient = database.prepare(
    `INSERT INTO campaign_recipients (
       campaign_key, tenant_id, contact_id, contact_version, phone_e164,
       personalization_json, personalization_key, delivery_key, status,
       attempt_count, last_error_code, queued_at, accepted_at,
       created_at, updated_at
     ) VALUES (?, ?, ?, 2, ?, ?, ?, ?, 'pending', 0, NULL, NULL, NULL, ?, ?)`,
  );
  insertRecipient.run(
    keys.primaryCampaign,
    1,
    11,
    "+972501111111",
    JSON.stringify({ "body:1": "לקוח ראשון" }),
    "1".repeat(64),
    keys.primaryDelivery,
    times.reviewed,
    times.reviewed,
  );
  insertRecipient.run(
    keys.primaryCampaign,
    1,
    12,
    "+972501111112",
    JSON.stringify({ "body:1": "לקוח שני" }),
    "2".repeat(64),
    keys.secondDelivery,
    times.reviewed,
    times.reviewed,
  );
  insertRecipient.run(
    keys.secondaryCampaign,
    2,
    21,
    "+972502222221",
    JSON.stringify({ "body:1": "לקוח שלישי" }),
    "3".repeat(64),
    keys.secondaryDelivery,
    times.reviewed,
    times.reviewed,
  );
}

async function seedPostgresDependencies(pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES
       (1, 'Primary campaign rehearsal', 'active', $1, $1,
        'templates-campaigns-primary'),
       (2, 'Secondary campaign rehearsal', 'active', $1, $1,
        'templates-campaigns-secondary')`,
    [times.created],
  );
  await pool.query(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       consent_source, consent_recorded_at, version, created_at, updated_at
     ) VALUES
       (11, 1, '+972501111111', 'subscribed', 'granted',
        'documented-consent', $1, 2, $1, $1),
       (12, 1, '+972501111112', 'subscribed', 'granted',
        'documented-consent', $1, 2, $1, $1),
       (21, 2, '+972502222221', 'subscribed', 'granted',
        'documented-consent', $1, 2, $1, $1),
       (22, 2, '+972502222222', 'subscribed', 'granted',
        'documented-consent', $1, 2, $1, $1)`,
    [times.created],
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

async function compareOutcome(
  observations,
  name,
  d1Operation,
  postgresOperation,
  expected,
) {
  const d1Outcome = await captureOutcome(d1Operation);
  const postgresOutcome = await captureOutcome(postgresOperation);
  assert.equal(postgresOutcome, d1Outcome, `${name} diverged`);
  assert.equal(d1Outcome, expected, `${name} outcome was not ${expected}`);
  observations.push(Object.freeze({ name, outcome: expected }));
}

async function runSemanticParityScenarios(database, pool) {
  const observations = [];
  await compareOutcome(
    observations,
    "begin-template-submission",
    () => database.prepare(
      `UPDATE message_templates
       SET status = 'submitting', submission_key = ?,
           submission_started_at = ?, version = 2, updated_at = ?
       WHERE template_key = ? AND tenant_id = 1 AND status = 'draft'`,
    ).run(keys.draftSubmission, times.changed, times.changed, keys.draftTemplate),
    () => pool.query(
      `UPDATE message_templates
       SET status = 'submitting', submission_key = $1,
           submission_started_at = $2, version = 2, updated_at = $2
       WHERE template_key = $3 AND tenant_id = 1 AND status = 'draft'`,
      [keys.draftSubmission, times.changed, keys.draftTemplate],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "accept-template-submission",
    () => database.prepare(
      `UPDATE message_templates
       SET status = 'pending_review', meta_template_id = '400003',
           submitted_at = ?, version = 3, updated_at = ?
       WHERE template_key = ? AND tenant_id = 1 AND status = 'submitting'`,
    ).run(times.completed, times.completed, keys.draftTemplate),
    () => pool.query(
      `UPDATE message_templates
       SET status = 'pending_review', meta_template_id = '400003',
           submitted_at = $1, version = 3, updated_at = $1
       WHERE template_key = $2 AND tenant_id = 1 AND status = 'submitting'`,
      [times.completed, keys.draftTemplate],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "approve-template",
    () => database.prepare(
      `UPDATE message_templates
       SET status = 'approved', last_status_event_key = ?,
           last_status_event_at = ?, reviewed_at = ?, version = 4,
           updated_at = ?
       WHERE template_key = ? AND tenant_id = 1
         AND status = 'pending_review'`,
    ).run("4".repeat(64), times.completed, times.completed,
      times.completed, keys.draftTemplate),
    () => pool.query(
      `UPDATE message_templates
       SET status = 'approved', last_status_event_key = $1,
           last_status_event_at = $2, reviewed_at = $2, version = 4,
           updated_at = $2
       WHERE template_key = $3 AND tenant_id = 1
         AND status = 'pending_review'`,
      ["4".repeat(64), times.completed, keys.draftTemplate],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "activate-campaign",
    () => database.prepare(
      `UPDATE campaigns
       SET status = 'scheduled', activated_at = ?, version = 2, updated_at = ?
       WHERE campaign_key = ? AND tenant_id = 1 AND status = 'draft'`,
    ).run(times.changed, times.changed, keys.primaryCampaign),
    () => pool.query(
      `UPDATE campaigns
       SET status = 'scheduled', activated_at = $1, version = 2,
           updated_at = $1
       WHERE campaign_key = $2 AND tenant_id = 1 AND status = 'draft'`,
      [times.changed, keys.primaryCampaign],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "promote-due-campaigns",
    () => database.prepare(
      `UPDATE campaigns
       SET status = 'running', started_at = ?, version = version + 1,
           updated_at = ?
       WHERE status = 'scheduled'`,
    ).run(times.completed, times.completed),
    () => pool.query(
      `UPDATE campaigns
       SET status = 'running', started_at = $1, version = version + 1,
           updated_at = $1
       WHERE status = 'scheduled'`,
      [times.completed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "claim-pending-recipients",
    () => database.prepare(
      `UPDATE campaign_recipients
       SET status = 'queued', queued_at = ?, updated_at = ?
       WHERE status = 'pending'`,
    ).run(times.completed, times.completed),
    () => pool.query(
      `UPDATE campaign_recipients
       SET status = 'queued', queued_at = $1, updated_at = $1
       WHERE status = 'pending'`,
      [times.completed],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "release-one-queued-recipient",
    () => database.prepare(
      `UPDATE campaign_recipients
       SET status = 'pending', queued_at = NULL,
           last_error_code = 'QUEUE_PUBLISH_FAILED', updated_at = ?
       WHERE delivery_key = ? AND status = 'queued'`,
    ).run(times.completed, keys.primaryDelivery),
    () => pool.query(
      `UPDATE campaign_recipients
       SET status = 'pending', queued_at = NULL,
           last_error_code = 'QUEUE_PUBLISH_FAILED', updated_at = $1
       WHERE delivery_key = $2 AND status = 'queued'`,
      [times.completed, keys.primaryDelivery],
    ),
    "accepted",
  );
  await compareOutcome(
    observations,
    "reject-cross-tenant-recipient",
    () => database.prepare(
      `INSERT INTO campaign_recipients (
         campaign_key, tenant_id, contact_id, contact_version, phone_e164,
         personalization_json, personalization_key, delivery_key, status,
         attempt_count, created_at, updated_at
       ) VALUES (?, 1, 22, 2, '+972502222222', '{}', ?, ?, 'pending', 0, ?, ?)`,
    ).run(
      keys.primaryCampaign,
      "5".repeat(64),
      `campaign_delivery_v1_${"c".repeat(64)}`,
      times.completed,
      times.completed,
    ),
    () => pool.query(
      `INSERT INTO campaign_recipients (
         campaign_key, tenant_id, contact_id, contact_version, phone_e164,
         personalization_json, personalization_key, delivery_key, status,
         attempt_count, created_at, updated_at
       ) VALUES ($1, 1, 22, 2, '+972502222222', '{}'::jsonb, $2, $3,
                 'pending', 0, $4, $4)`,
      [
        keys.primaryCampaign,
        "5".repeat(64),
        `campaign_delivery_v1_${"c".repeat(64)}`,
        times.completed,
      ],
    ),
    "rejected",
  );
  return Object.freeze(observations);
}

async function requirePostgresIsolationAndShape(pool) {
  await assert.rejects(
    pool.query(
      `INSERT INTO campaigns (
         campaign_key, tenant_id, name, status, delivery_mode, timezone,
         template_key, template_snapshot_json, audience_snapshot_key,
         recipient_count, created_at, updated_at
       ) VALUES ($1, 1, 'Cross tenant', 'draft', 'immediate',
                 'Asia/Jerusalem', $2, $3::jsonb, $4, 1, $5, $5)`,
      [
        `campaign_v1_${"d".repeat(64)}`,
        keys.secondaryTemplate,
        JSON.stringify(templateSnapshot(
          keys.secondaryTemplate,
          "400002",
          2,
          "secondary_service_update",
          "עדכון עבור {{1}}",
        )),
        "6".repeat(64),
        times.completed,
      ],
    ),
    (error) => error?.code === "23503",
  );
  await assert.rejects(
    pool.query(
      `UPDATE campaign_recipients
       SET personalization_json = '[]'::jsonb
       WHERE delivery_key = $1`,
      [keys.primaryDelivery],
    ),
    (error) => error?.code === "23514",
  );
  const providerLinks = await pool.query(
    "SELECT count(*)::integer AS count FROM campaign_delivery_provider_links",
  );
  assert.equal(providerLinks.rows[0]?.count, 0);
}

function normalizePostgresValue(column, value) {
  if (value instanceof Date) return value.toISOString();
  if (
    value !== null &&
    ["positive-integer", "nonnegative-integer"].includes(column.kind)
  ) {
    return Number(value);
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function compareFinalState(database, pool) {
  const d1Snapshot = readD1TemplatesCampaignsSnapshot(database);
  const targetTables = {};
  for (const table of POSTGRES_TEMPLATES_CAMPAIGNS_DATA_TABLE_CONTRACTS) {
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
  const targetSnapshot = createPostgresTemplatesCampaignsDataSnapshot(
    targetTables,
  );
  const evidence = [];
  for (const table of POSTGRES_TEMPLATES_CAMPAIGNS_DATA_TABLE_CONTRACTS) {
    const targetRows = targetSnapshot.tables[table.name];
    assert.deepEqual(
      targetRows,
      d1Snapshot.tables[table.name],
      `${table.name} final state diverged`,
    );
    evidence.push(Object.freeze({
      table: table.name,
      rowCount: targetRows.length,
      digest: digest(targetRows),
    }));
  }
  return Object.freeze(evidence);
}

export async function verifyPostgresTemplatesCampaignsDataMigration(
  connectionString,
) {
  const checkedUrl = requireLocalTemplatesCampaignsDataMigrationUrl(
    connectionString,
  );
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

    const snapshot = readD1TemplatesCampaignsSnapshot(database);
    const plan = createPostgresTemplatesCampaignsDataMigrationPlan({
      snapshot,
      createdAt: "2026-08-20T10:00:00.000Z",
      expiresAt: "2026-08-20T10:15:00.000Z",
      evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    const migrationEvidence =
      await executePostgresTemplatesCampaignsDataMigration({
        plan,
        transactions,
        evidenceHmacKey,
        now: "2026-08-20T10:05:00.000Z",
      });

    assert.equal(migrationEvidence.tableCount, 3);
    assert.equal(migrationEvidence.totalRowCount, 8);
    assert.equal(
      migrationEvidence.tables.every(
        ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(migrationEvidence),
      /לקוח|שלום|service_update|\+972|40000/,
    );
    await requirePostgresIsolationAndShape(pool);
    const semanticObservations = await runSemanticParityScenarios(
      database,
      pool,
    );
    const finalState = await compareFinalState(database, pool);
    await assert.rejects(
      executePostgresTemplatesCampaignsDataMigration({
        plan,
        transactions,
        evidenceHmacKey,
        now: "2026-08-20T10:06:00.000Z",
      }),
      (error) => (
        error instanceof PostgresDataMigrationError &&
        error.code === "target-not-empty"
      ),
    );

    return Object.freeze({
      d1MigrationCount: (await migrationFiles(join(projectRoot, "drizzle"))).length,
      postgresMigrationCount: (
        await migrationFiles(join(projectRoot, "postgres", "migrations"))
      ).length,
      tableCount: migrationEvidence.tableCount,
      rowCount: migrationEvidence.totalRowCount,
      replayRejected: true,
      tenantIsolationVerified: true,
      providerEvidenceDeferred: true,
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
  const result = await verifyPostgresTemplatesCampaignsDataMigration(
    connectionString,
  );
  process.stdout.write(
    `PostgreSQL templates/campaigns data rehearsal: PASS (` +
    `${result.d1MigrationCount} D1 migrations, ` +
    `${result.postgresMigrationCount} PostgreSQL migrations, ` +
    `${result.tableCount} tables, ${result.rowCount} rows, ` +
    `replay rejected, tenant isolation verified, provider evidence deferred, ` +
    `${result.semanticScenarioCount} parity scenarios)\n`,
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
