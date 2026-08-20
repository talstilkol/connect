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
  POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS,
  createPostgresWhatsappDeliveryPolicyDataMigrationPlan,
  createPostgresWhatsappDeliveryPolicyDataSnapshot,
  executePostgresWhatsappDeliveryPolicyDataMigration,
} from "../server/platform/postgresWhatsappDeliveryPolicyDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1WhatsappDeliveryPolicySnapshot,
} from "./read-d1-whatsapp-delivery-policy-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName =
  "connect_whatsapp_delivery_policy_data_migration_rehearsal";
const environmentKey =
  "CONNECT_POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_MIGRATION_REHEARSAL_URL";
const evidenceHmacKey = Buffer.alloc(32, 101).toString("base64");
const actor = "user_whatsapp_policy_owner";
const evidenceDigest = "3".repeat(64);
const values = Object.freeze({
  base: "2026-08-20T08:00:00.000Z",
  checked: "2026-08-20T09:00:00.000Z",
  recorded: "2026-08-20T09:30:00.000Z",
  firstReserved: "2026-08-20T10:00:00.000Z",
  firstPair: "2026-08-20T10:00:06.000Z",
  firstExpires: "2026-08-20T10:05:00.000Z",
  firstSettled: "2026-08-20T10:01:00.000Z",
  firstBlocked: "2026-08-20T10:01:30.000Z",
  secondReserved: "2026-08-20T10:02:00.000Z",
  secondPair: "2026-08-20T10:02:06.000Z",
  secondExpires: "2026-08-20T10:07:00.000Z",
  secondSettled: "2026-08-20T10:03:00.000Z",
  advanced: "2026-08-20T10:04:00.000Z",
  expires: "2026-08-21T09:00:00.000Z",
});

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function opaque(prefix, character) {
  return `${prefix}${character.repeat(64)}`;
}

const keys = Object.freeze({
  portfolio: opaque("whatsapp_portfolio_v1_", "a"),
  senderOne: opaque("whatsapp_sender_v1_", "b"),
  recipientOne: opaque("whatsapp_recipient_v1_", "c"),
  reservationOne: opaque("whatsapp_rate_reservation_v1_", "d"),
  senderTwo: opaque("whatsapp_sender_v1_", "e"),
  recipientTwo: opaque("whatsapp_recipient_v1_", "f"),
  reservationTwo: opaque("whatsapp_rate_reservation_v1_", "1"),
  delivery: opaque("campaign_delivery_v1_", "2"),
  campaign: opaque("campaign_v1_", "5"),
  template: opaque("template_v1_", "6"),
  submission: opaque("template_submission_v1_", "7"),
  audience: "8".repeat(64),
  personalization: "9".repeat(64),
  deliveredEvent: "4".repeat(64),
  readEvent: "5".repeat(64),
});

function fail(code) {
  throw new Error(`POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_${code}`);
}

export function requireLocalWhatsappDeliveryPolicyDataMigrationUrl(value) {
  if (typeof value !== "string") fail("URL_INVALID");
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("URL_INVALID");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== `/${databaseName}` || url.password !== "" ||
    url.search !== "" || url.hash !== ""
  ) {
    fail("URL_INVALID");
  }
  const port = Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail("URL_INVALID");
  }
  return url.toString();
}

function policyKey({ expectedPolicyVersion, deliveryState }) {
  return `whatsapp_delivery_policy_event_v1_${digest(JSON.stringify({
    namespace: "whatsapp_delivery_policy_event_v1",
    tenantId: 1,
    connectionVersion: 1,
    expectedPolicyVersion,
    deliveryState,
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 250,
    },
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 64,
    },
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v23.0",
    evidenceDigest,
    evidenceCheckedAt: values.checked,
    evidenceExpiresAt: values.expires,
    actorExternalUserId: actor,
  }))}`;
}

const enabledPolicyKey = policyKey({
  expectedPolicyVersion: 0,
  deliveryState: "enabled",
});
const disabledPolicyKey = policyKey({
  expectedPolicyVersion: 1,
  deliveryState: "disabled",
});
const gapPolicyKey = policyKey({
  expectedPolicyVersion: 3,
  deliveryState: "enabled",
});

async function migrationFiles(directory) {
  return (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
}

async function applyD1Migrations(database) {
  const directory = join(projectRoot, "drizzle");
  const files = await migrationFiles(directory);
  for (const fileName of files) {
    database.exec((await readFile(join(directory, fileName), "utf8"))
      .replaceAll("--> statement-breakpoint", ""));
  }
  return files.length;
}

async function applyPostgresMigrations(pool) {
  const existing = await pool.query(
    `SELECT count(*)::integer AS count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  if (existing.rows[0]?.count !== 0) fail("DATABASE_NOT_EMPTY");
  const directory = join(projectRoot, "postgres", "migrations");
  const files = await migrationFiles(directory);
  for (const fileName of files) {
    await pool.query(await readFile(join(directory, fileName), "utf8"));
  }
  return files.length;
}

function insertD1Policy(database, {
  eventKey,
  policyVersion,
  deliveryState,
  recordedAt,
}) {
  database.prepare(
    `INSERT INTO whatsapp_campaign_delivery_policy_events (
       event_key, tenant_id, connection_version, policy_version,
       delivery_state, portfolio_limit_kind, portfolio_limit_value,
       reservation_duration_seconds, meta_graph_api_version,
       evidence_digest, evidence_checked_at, evidence_expires_at,
       actor_external_user_id, recorded_at, created_at,
       phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second
     ) VALUES (?, 1, 1, ?, ?, 'bounded', 250, 300, 'v23.0',
       ?, ?, ?, ?, ?, ?, 80, 64)`,
  ).run(eventKey, policyVersion, deliveryState, evidenceDigest,
    values.checked, values.expires, actor, recordedAt, recordedAt);
}

function insertD1Reservation(database, {
  reservationKey,
  senderKey,
  recipientKey,
  reservedAt,
  pairUntil,
  expiresAt,
}) {
  database.prepare(
    `INSERT INTO whatsapp_rate_limit_reservations (
       reservation_key, tenant_id, portfolio_key, sender_key, recipient_key,
       portfolio_limit_kind, portfolio_limit_value, reserved_at,
       pair_reserved_until, reservation_expires_at, created_at,
       policy_event_key, phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second
     ) VALUES (?, 1, ?, ?, ?, 'bounded', 250, ?, ?, ?, ?, ?, 80, 64)`,
  ).run(reservationKey, keys.portfolio, senderKey, recipientKey, reservedAt,
    pairUntil, expiresAt, reservedAt, enabledPolicyKey);
}

function seedD1(database) {
  database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (1, 'Connect Delivery', 'active', ?, ?, 'whatsapp-delivery')`,
  ).run(values.base, values.base);
  database.prepare(
    `INSERT INTO meta_connections (
       tenant_id, business_portfolio_id, waba_id, phone_number_id, status,
       webhook_subscribed_at, connected_at, version, created_at, updated_at
     ) VALUES (1, 'portfolio-live', 'waba-live', 'phone-live', 'connected',
       ?, ?, 1, ?, ?)`,
  ).run(values.base, values.base, values.base, values.base);
  database.prepare(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, first_name, mailing_status,
       consent_status, consent_source, consent_recorded_at,
       version, created_at, updated_at
     ) VALUES (1, 1, '+972501234567', 'Delivery', 'subscribed',
       'granted', 'explicit-form', ?, 1, ?, ?)`,
  ).run(values.base, values.base, values.base);
  database.prepare(
    `INSERT INTO message_templates (
       template_key, tenant_id, meta_template_id, name, language, category,
       status, definition_json, submission_key, submission_started_at,
       last_status_event_key, last_status_event_at, version,
       submitted_at, reviewed_at, created_at, updated_at
     ) VALUES (?, 1, '123456', 'delivery_update', 'he', 'UTILITY',
       'approved', '{}', ?, ?, ?, ?, 2, ?, ?, ?, ?)`,
  ).run(keys.template, keys.submission, values.base, "6".repeat(64),
    values.base, values.base, values.base, values.base, values.base);
  database.prepare(
    `INSERT INTO campaigns (
       campaign_key, tenant_id, name, status, delivery_mode, scheduled_at,
       timezone, template_key, template_snapshot_json, audience_snapshot_key,
       recipient_count, version, activated_at, started_at,
       created_at, updated_at
     ) VALUES (?, 1, 'Delivery proof', 'running', 'immediate', NULL,
       'Asia/Jerusalem', ?, '{}', ?, 1, 2, ?, ?, ?, ?)`,
  ).run(keys.campaign, keys.template, keys.audience, values.base, values.base,
    values.base, values.secondReserved);
  database.prepare(
    `INSERT INTO campaign_recipients (
       campaign_key, tenant_id, contact_id, contact_version, phone_e164,
       personalization_json, personalization_key, delivery_key, status,
       attempt_count, queued_at, created_at, updated_at
     ) VALUES (?, 1, 1, 1, '+972501234567', '{}', ?, ?, 'sending',
       1, ?, ?, ?)`,
  ).run(keys.campaign, keys.personalization, keys.delivery,
    values.secondReserved, values.base, values.secondReserved);

  insertD1Policy(database, {
    eventKey: enabledPolicyKey,
    policyVersion: 1,
    deliveryState: "enabled",
    recordedAt: values.recorded,
  });
  insertD1Reservation(database, {
    reservationKey: keys.reservationOne,
    senderKey: keys.senderOne,
    recipientKey: keys.recipientOne,
    reservedAt: values.firstReserved,
    pairUntil: values.firstPair,
    expiresAt: values.firstExpires,
  });
  database.prepare(
    `INSERT INTO whatsapp_rate_limit_settlements (
       reservation_key, outcome, settled_at, created_at
     ) VALUES (?, 'provider-failed', ?, ?)`,
  ).run(keys.reservationOne, values.firstSettled, values.firstSettled);
  database.prepare(
    `INSERT INTO whatsapp_provider_cooldown_events (
       reservation_key, scope, provider_error_code,
       observed_at, blocked_until, created_at
     ) VALUES (?, 'pair', 131056, ?, ?, ?)`,
  ).run(keys.reservationOne, values.firstSettled, values.firstBlocked,
    values.firstSettled);

  insertD1Reservation(database, {
    reservationKey: keys.reservationTwo,
    senderKey: keys.senderTwo,
    recipientKey: keys.recipientTwo,
    reservedAt: values.secondReserved,
    pairUntil: values.secondPair,
    expiresAt: values.secondExpires,
  });
  database.prepare(
    `INSERT INTO campaign_delivery_provider_links (
       delivery_key, tenant_id, provider_message_id, reservation_key,
       provider_status, accepted_at, created_at, updated_at
     ) VALUES (?, 1, 'wamid.delivery-proof', ?, 'accepted', ?, ?, ?)`,
  ).run(keys.delivery, keys.reservationTwo, values.secondReserved,
    values.secondReserved, values.secondReserved);
  database.prepare(
    `UPDATE campaign_delivery_provider_links SET
       provider_status = 'delivered', last_status_event_key = ?,
       last_status_event_at = ?, terminal_outcome = 'delivered',
       terminal_settled_at = ?, updated_at = ?
     WHERE delivery_key = ?`,
  ).run(keys.deliveredEvent, values.secondSettled, values.secondSettled,
    values.secondSettled, keys.delivery);
}

async function seedPostgresDependencies(database, pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (1, 'Connect Delivery', 'active', $1, $1, 'whatsapp-delivery')`,
    [values.base],
  );
  await pool.query(
    `INSERT INTO meta_connections (
       tenant_id, business_portfolio_id, waba_id, phone_number_id, status,
       webhook_subscribed_at, connected_at, version, created_at, updated_at
     ) VALUES (1, 'portfolio-live', 'waba-live', 'phone-live', 'connected',
       $1, $1, 1, $1, $1)`,
    [values.base],
  );
  await pool.query(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, first_name, mailing_status,
       consent_status, consent_source, consent_recorded_at,
       version, created_at, updated_at
     ) VALUES (1, 1, '+972501234567', 'Delivery', 'subscribed',
       'granted', 'explicit-form', $1, 1, $1, $1)`,
    [values.base],
  );
  await pool.query(
    `INSERT INTO message_templates (
       template_key, tenant_id, meta_template_id, name, language, category,
       status, definition_json, submission_key, submission_started_at,
       last_status_event_key, last_status_event_at, version,
       submitted_at, reviewed_at, created_at, updated_at
     ) VALUES ($1, 1, '123456', 'delivery_update', 'he', 'UTILITY',
       'approved', '{}'::jsonb, $2, $3, $4, $3, 2, $3, $3, $3, $3)`,
    [keys.template, keys.submission, values.base, "6".repeat(64)],
  );
  await pool.query(
    `INSERT INTO campaigns (
       campaign_key, tenant_id, name, status, delivery_mode, scheduled_at,
       timezone, template_key, template_snapshot_json, audience_snapshot_key,
       recipient_count, version, activated_at, started_at,
       created_at, updated_at
     ) VALUES ($1, 1, 'Delivery proof', 'running', 'immediate', NULL,
       'Asia/Jerusalem', $2, '{}'::jsonb, $3, 1, 2, $4, $4, $4, $5)`,
    [keys.campaign, keys.template, keys.audience, values.base,
      values.secondReserved],
  );
  await pool.query(
    `INSERT INTO campaign_recipients (
       campaign_key, tenant_id, contact_id, contact_version, phone_e164,
       personalization_json, personalization_key, delivery_key, status,
       attempt_count, queued_at, accepted_at, created_at, updated_at
     ) VALUES ($1, 1, 1, 1, '+972501234567', '{}'::jsonb, $2, $3,
       'delivered', 1, $4, $4, $5, $6)`,
    [keys.campaign, keys.personalization, keys.delivery,
      values.secondReserved, values.base, values.secondSettled],
  );
  const audits = database.prepare(
    `SELECT id, tenant_id, actor_external_user_id, action, target_type,
       target_id, idempotency_key, metadata_json, created_at
     FROM audit_logs ORDER BY id`,
  ).all();
  for (const audit of audits) {
    await pool.query(
      `INSERT INTO audit_logs (
         id, tenant_id, actor_external_user_id, action, target_type,
         target_id, idempotency_key, metadata_json, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
      [audit.id, audit.tenant_id, audit.actor_external_user_id, audit.action,
        audit.target_type, audit.target_id, audit.idempotency_key,
        audit.metadata_json, audit.created_at],
    );
  }
  await pool.query(
    `SELECT setval(
       pg_get_serial_sequence('public.audit_logs', 'id'),
       COALESCE(max(id), 1), count(*) > 0
     ) FROM audit_logs`,
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

async function compareOutcome(observations, name, d1Operation,
  postgresOperation, expected) {
  const [d1Outcome, postgresOutcome] = await Promise.all([
    captureOutcome(d1Operation),
    captureOutcome(postgresOperation),
  ]);
  assert.equal(postgresOutcome, d1Outcome, `${name} diverged`);
  assert.equal(d1Outcome, expected, `${name} outcome was not ${expected}`);
  observations.push(Object.freeze({ name, outcome: expected }));
}

async function runSemanticParityScenarios(database, pool) {
  const observations = [];
  await compareOutcome(observations, "advance-provider-to-read", () => {
    database.prepare(
      `UPDATE campaign_delivery_provider_links SET provider_status = 'read',
       last_status_event_key = ?, last_status_event_at = ?, updated_at = ?
       WHERE delivery_key = ?`,
    ).run(keys.readEvent, values.advanced, values.advanced, keys.delivery);
  }, () => pool.query(
    `UPDATE campaign_delivery_provider_links SET provider_status = 'read',
     last_status_event_key = $1, last_status_event_at = $2, updated_at = $2
     WHERE delivery_key = $3`,
    [keys.readEvent, values.advanced, keys.delivery],
  ), "accepted");

  await compareOutcome(observations, "disable-policy", () => {
    insertD1Policy(database, {
      eventKey: disabledPolicyKey,
      policyVersion: 2,
      deliveryState: "disabled",
      recordedAt: values.advanced,
    });
  }, () => pool.query(
    `INSERT INTO whatsapp_campaign_delivery_policy_events (
       event_key, tenant_id, connection_version, policy_version,
       delivery_state, portfolio_limit_kind, portfolio_limit_value,
       reservation_duration_seconds, meta_graph_api_version,
       evidence_digest, evidence_checked_at, evidence_expires_at,
       actor_external_user_id, recorded_at, created_at,
       phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second
     ) VALUES ($1, 1, 1, 2, 'disabled', 'bounded', 250, 300, 'v23.0',
       $2, $3, $4, $5, $6, $6, 80, 64)`,
    [disabledPolicyKey, evidenceDigest, values.checked, values.expires,
      actor, values.advanced],
  ), "accepted");

  const rejected = [
    ["mutate-reservation",
      () => database.prepare(
        "UPDATE whatsapp_rate_limit_reservations SET tenant_id = 2 WHERE reservation_key = ?",
      ).run(keys.reservationOne),
      () => pool.query(
        "UPDATE whatsapp_rate_limit_reservations SET tenant_id = 2 WHERE reservation_key = $1",
        [keys.reservationOne],
      )],
    ["delete-settlement",
      () => database.prepare(
        "DELETE FROM whatsapp_rate_limit_settlements WHERE reservation_key = ?",
      ).run(keys.reservationOne),
      () => pool.query(
        "DELETE FROM whatsapp_rate_limit_settlements WHERE reservation_key = $1",
        [keys.reservationOne],
      )],
    ["shorten-cooldown",
      () => database.prepare(
        "UPDATE whatsapp_provider_cooldown_state SET blocked_until = ? WHERE reservation_key = ?",
      ).run(values.firstSettled, keys.reservationOne),
      () => pool.query(
        "UPDATE whatsapp_provider_cooldown_state SET blocked_until = $1 WHERE reservation_key = $2",
        [values.firstSettled, keys.reservationOne],
      )],
    ["mutate-provider-identity",
      () => database.prepare(
        "UPDATE campaign_delivery_provider_links SET provider_message_id = 'changed' WHERE delivery_key = ?",
      ).run(keys.delivery),
      () => pool.query(
        "UPDATE campaign_delivery_provider_links SET provider_message_id = 'changed' WHERE delivery_key = $1",
        [keys.delivery],
      )],
    ["delete-provider-link",
      () => database.prepare(
        "DELETE FROM campaign_delivery_provider_links WHERE delivery_key = ?",
      ).run(keys.delivery),
      () => pool.query(
        "DELETE FROM campaign_delivery_provider_links WHERE delivery_key = $1",
        [keys.delivery],
      )],
    ["policy-version-gap",
      () => database.prepare(
        `INSERT INTO whatsapp_campaign_delivery_policy_events (
           event_key, tenant_id, connection_version, policy_version,
           delivery_state, portfolio_limit_kind, portfolio_limit_value,
           reservation_duration_seconds, meta_graph_api_version,
           evidence_digest, evidence_checked_at, evidence_expires_at,
           actor_external_user_id, recorded_at, created_at,
           phone_throughput_messages_per_second,
           maximum_outbound_messages_per_second
         ) VALUES (?, 1, 1, 4, 'enabled', 'bounded', 250, 300, 'v23.0',
           ?, ?, ?, ?, ?, ?, 80, 64)`,
      ).run(gapPolicyKey, evidenceDigest, values.checked, values.expires,
        actor, values.advanced, values.advanced),
      () => pool.query(
        `INSERT INTO whatsapp_campaign_delivery_policy_events (
           event_key, tenant_id, connection_version, policy_version,
           delivery_state, portfolio_limit_kind, portfolio_limit_value,
           reservation_duration_seconds, meta_graph_api_version,
           evidence_digest, evidence_checked_at, evidence_expires_at,
           actor_external_user_id, recorded_at, created_at,
           phone_throughput_messages_per_second,
           maximum_outbound_messages_per_second
         ) VALUES ($1, 1, 1, 4, 'enabled', 'bounded', 250, 300, 'v23.0',
           $2, $3, $4, $5, $6, $6, 80, 64)`,
        [gapPolicyKey, evidenceDigest, values.checked, values.expires,
          actor, values.advanced],
      )],
    ["reservation-after-kill-switch",
      () => insertD1Reservation(database, {
        reservationKey: opaque("whatsapp_rate_reservation_v1_", "a"),
        senderKey: opaque("whatsapp_sender_v1_", "a"),
        recipientKey: opaque("whatsapp_recipient_v1_", "a"),
        reservedAt: values.advanced,
        pairUntil: "2026-08-20T10:04:06.000Z",
        expiresAt: "2026-08-20T10:09:00.000Z",
      }),
      () => pool.query(
        `INSERT INTO whatsapp_rate_limit_reservations (
           reservation_key, tenant_id, portfolio_key, sender_key,
           recipient_key, template_category, portfolio_limit_kind,
           portfolio_limit_value, reserved_at, pair_reserved_until,
           reservation_expires_at, created_at, policy_event_key,
           phone_throughput_messages_per_second,
           maximum_outbound_messages_per_second
         ) VALUES ($1, 1, $2, $3, $4, 'UTILITY', 'bounded', 250,
           $5, $6, $7, $5, $8, 80, 64)`,
        [opaque("whatsapp_rate_reservation_v1_", "a"), keys.portfolio,
          opaque("whatsapp_sender_v1_", "a"),
          opaque("whatsapp_recipient_v1_", "a"), values.advanced,
          "2026-08-20T10:04:06.000Z", "2026-08-20T10:09:00.000Z",
          enabledPolicyKey],
      )],
  ];
  for (const [name, d1Operation, postgresOperation] of rejected) {
    await compareOutcome(
      observations,
      name,
      d1Operation,
      postgresOperation,
      "rejected",
    );
  }
  return observations;
}

function readD1State(database) {
  return readD1WhatsappDeliveryPolicySnapshot(database).tables;
}

async function readPostgresState(pool) {
  return Object.fromEntries(await Promise.all(
    POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS.map(
      async (table) => {
        const result = await pool.query(
          `SELECT ${table.columns.map(({ name }) => name).join(", ")}
           FROM ${table.name}
           ORDER BY ${table.orderBy.join(", ")}`,
        );
        return [table.name, result.rows];
      },
    ),
  ));
}

function comparableSnapshot(tables) {
  return JSON.parse(JSON.stringify(
    createPostgresWhatsappDeliveryPolicyDataSnapshot(tables).tables,
  ));
}

async function main() {
  const url = requireLocalWhatsappDeliveryPolicyDataMigrationUrl(
    process.env[environmentKey],
  );
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  try {
    const d1MigrationCount = await applyD1Migrations(database);
    const postgresMigrationCount = await applyPostgresMigrations(pool);
    seedD1(database);
    await seedPostgresDependencies(database, pool);
    const snapshot = readD1WhatsappDeliveryPolicySnapshot(database);
    const plan = createPostgresWhatsappDeliveryPolicyDataMigrationPlan({
      snapshot,
      createdAt: "2026-08-20T11:00:00.000Z",
      expiresAt: "2026-08-20T11:15:00.000Z",
      evidenceHmacKey,
    });
    const evidence = await executePostgresWhatsappDeliveryPolicyDataMigration({
      plan,
      transactions: createNodePostgresTransactionManager(pool),
      evidenceHmacKey,
      now: "2026-08-20T11:05:00.000Z",
    });
    assert.equal(evidence.tableCount, 8);
    assert.equal(evidence.totalRowCount, 12);
    await assert.rejects(
      executePostgresWhatsappDeliveryPolicyDataMigration({
        plan,
        transactions: createNodePostgresTransactionManager(pool),
        evidenceHmacKey,
        now: "2026-08-20T11:05:00.000Z",
      }),
      (error) => error instanceof PostgresDataMigrationError &&
        error.code === "target-not-empty",
    );
    const observations = await runSemanticParityScenarios(database, pool);
    assert.equal(observations.length, 9);
    assert.deepEqual(
      comparableSnapshot(await readPostgresState(pool)),
      comparableSnapshot(readD1State(database)),
    );
    console.log(
      `PostgreSQL WhatsApp delivery-policy data rehearsal: PASS (${d1MigrationCount} D1 migrations, ${postgresMigrationCount} PostgreSQL migrations, 8 tables, 12 rows, replay rejected, legacy category unknown, delivery evidence private, ${observations.length} parity scenarios)`,
    );
  } finally {
    database.close();
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    const code = error instanceof PostgresDataMigrationError
      ? error.code
      : "REHEARSAL_FAILED";
    console.error(`PostgreSQL WhatsApp delivery-policy data rehearsal: FAIL (${code})`);
    process.exitCode = 1;
  });
}
