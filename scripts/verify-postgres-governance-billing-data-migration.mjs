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
  POSTGRES_GOVERNANCE_BILLING_DATA_TABLE_CONTRACTS,
  createPostgresGovernanceBillingDataMigrationPlan,
  createPostgresGovernanceBillingDataSnapshot,
  executePostgresGovernanceBillingDataMigration,
} from "../server/platform/postgresGovernanceBillingDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1GovernanceBillingSnapshot,
} from "./read-d1-governance-billing-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_governance_billing_data_migration_rehearsal";
const environmentKey =
  "CONNECT_POSTGRES_GOVERNANCE_BILLING_DATA_MIGRATION_REHEARSAL_URL";
const evidenceHmacKey = Buffer.alloc(32, 89).toString("base64");
const actor = "user_governance_owner";
const times = Object.freeze({
  created: "2026-08-20T08:00:00.000Z",
  changed: "2026-08-20T09:00:00.000Z",
  extended: "2026-08-20T11:00:00.000Z",
  suspended: "2026-08-20T12:00:00.000Z",
  decided: "2026-08-20T13:00:00.000Z",
  administered: "2026-08-20T14:00:00.000Z",
});
const initialEndsAt = "2026-09-20T08:00:00.000Z";
const migratedEndsAt = "2026-10-20T08:00:00.000Z";
const extendedEndsAt = "2026-11-20T08:00:00.000Z";
const profile = Object.freeze({
  businessName: "Connect Operations",
  timezone: "Asia/Jerusalem",
  interfaceLanguage: "he",
});

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function namespaced(prefix, value) {
  return `${prefix}${digest(JSON.stringify(value))}`;
}

function fail(code) {
  throw new Error(`POSTGRES_GOVERNANCE_BILLING_DATA_${code}`);
}

export function requireLocalGovernanceBillingDataMigrationUrl(value) {
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
    url.pathname !== `/${databaseName}` ||
    url.password !== "" || url.search !== "" || url.hash !== ""
  ) {
    fail("URL_INVALID");
  }
  const port = Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail("URL_INVALID");
  }
  return url.toString();
}

function subscriptionEventKey({
  eventType,
  expectedVersion,
  toStatus,
  newEndsAt,
}) {
  return namespaced("tenant_subscription_event_v1_", {
    namespace: "tenant_subscription_event_v1",
    tenantId: 1,
    eventType,
    expectedVersion,
    toStatus,
    newEndsAt,
    actorExternalUserId: actor,
  });
}

function decisionEventKey({ expectedVersion, selection, rationale }) {
  return namespaced("production_decision_event_v1_", {
    namespace: "production_decision_event_v1",
    checkId: "billing.provider",
    expectedVersion,
    selection,
    rationale,
    actorExternalUserId: actor,
  });
}

function profileDigest(value) {
  return digest(JSON.stringify({
    namespace: "business_profile_state_v1",
    businessName: value.businessName,
    timezone: value.timezone,
    interfaceLanguage: value.interfaceLanguage,
  }));
}

function adminEventKey(expectedVersion, newProfileDigest) {
  return namespaced("business_profile_admin_event_v1_", {
    namespace: "business_profile_admin_event_v1",
    tenantId: 1,
    expectedVersion,
    newProfileDigest,
    actorExternalUserId: actor,
  });
}

function insertD1SubscriptionAudit(
  database,
  eventKey,
  action,
  occurredAt,
) {
  database.prepare(
    `INSERT INTO audit_logs (
       tenant_id, actor_external_user_id, action, target_type,
       target_id, idempotency_key, metadata_json, created_at
     ) VALUES (1, ?, ?, 'tenant_subscription', '1', ?, NULL, ?)`,
  ).run(actor, action, eventKey, occurredAt);
}

function initialRows() {
  const firstSelection = "Manual billing";
  const firstRationale = "Invoices are reviewed before provider selection.";
  const secondSelection = "Provider decision deferred";
  const secondRationale = "Live billing remains disabled until finance approval.";
  const firstDecisionKey = decisionEventKey({
    expectedVersion: 0,
    selection: firstSelection,
    rationale: firstRationale,
  });
  const secondDecisionKey = decisionEventKey({
    expectedVersion: 1,
    selection: secondSelection,
    rationale: secondRationale,
  });
  const currentProfileDigest = profileDigest(profile);
  return Object.freeze({
    subscription: {
      tenant_id: 1, status: "active", starts_at: times.created,
      ends_at: migratedEndsAt, cancelled_at: null, version: 2,
      created_at: times.created, updated_at: times.changed,
    },
    subscriptionEvents: [{
      event_key: subscriptionEventKey({
        eventType: "created", expectedVersion: null, toStatus: "active",
        newEndsAt: initialEndsAt,
      }),
      tenant_id: 1, event_type: "created", from_status: null,
      to_status: "active", previous_ends_at: null,
      new_ends_at: initialEndsAt, actor_external_user_id: actor,
      subscription_version: 1, occurred_at: times.created,
      created_at: times.created,
    }, {
      event_key: subscriptionEventKey({
        eventType: "extended", expectedVersion: 1, toStatus: "active",
        newEndsAt: migratedEndsAt,
      }),
      tenant_id: 1, event_type: "extended", from_status: "active",
      to_status: "active", previous_ends_at: initialEndsAt,
      new_ends_at: migratedEndsAt, actor_external_user_id: actor,
      subscription_version: 2, occurred_at: times.changed,
      created_at: times.changed,
    }],
    decisionEvents: [{
      event_key: firstDecisionKey, check_id: "billing.provider",
      event_type: "recorded", selection: firstSelection,
      rationale: firstRationale, actor_external_user_id: actor,
      decision_version: 1, occurred_at: times.created,
    }, {
      event_key: secondDecisionKey, check_id: "billing.provider",
      event_type: "recorded", selection: secondSelection,
      rationale: secondRationale, actor_external_user_id: actor,
      decision_version: 2, occurred_at: times.changed,
    }],
    adminEvent: {
      event_key: adminEventKey(1, currentProfileDigest), tenant_id: 1,
      previous_profile_digest: profileDigest({
        ...profile, businessName: "Connect",
      }),
      new_profile_digest: currentProfileDigest, changed_fields: "businessName",
      actor_external_user_id: actor, profile_version: 2,
      occurred_at: times.changed, created_at: times.changed,
    },
  });
}

async function migrationFiles(directory) {
  return (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
}

async function applyD1Migrations(database) {
  const directory = join(projectRoot, "drizzle");
  for (const fileName of await migrationFiles(directory)) {
    database.exec((await readFile(join(directory, fileName), "utf8"))
      .replaceAll("--> statement-breakpoint", ""));
  }
}

async function applyPostgresMigrations(pool) {
  const existing = await pool.query(
    `SELECT count(*)::integer AS count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  if (existing.rows[0]?.count !== 0) fail("DATABASE_NOT_EMPTY");
  const directory = join(projectRoot, "postgres", "migrations");
  for (const fileName of await migrationFiles(directory)) {
    await pool.query(await readFile(join(directory, fileName), "utf8"));
  }
}

function seedD1(database) {
  const rows = initialRows();
  database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (1, ?, 'active', ?, ?, 'governance-billing-primary')`,
  ).run(profile.businessName, times.created, times.changed);
  database.prepare(
    `INSERT INTO business_profiles (
       tenant_id, business_name, timezone, interface_language,
       version, created_at, updated_at
     ) VALUES (1, ?, ?, ?, 2, ?, ?)`,
  ).run(profile.businessName, profile.timezone, profile.interfaceLanguage,
    times.created, times.changed);
  database.prepare(
    `INSERT INTO tenant_subscriptions (
       tenant_id, status, starts_at, ends_at, cancelled_at,
       version, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(...Object.values(rows.subscription));
  for (const event of rows.subscriptionEvents) {
    database.prepare(
      `INSERT INTO tenant_subscription_events (
         event_key, tenant_id, event_type, from_status, to_status,
         previous_ends_at, new_ends_at, actor_external_user_id,
         subscription_version, occurred_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(event));
    insertD1SubscriptionAudit(
      database,
      event.event_key,
      event.event_type === "created"
        ? "subscription.created"
        : "subscription.extended",
      event.occurred_at,
    );
  }
  const [firstDecision, secondDecision] = rows.decisionEvents;
  database.prepare(
    `INSERT INTO production_decision_records (
       check_id, selection, rationale, version, last_event_key,
       decided_by_external_user_id, decided_at, updated_at
     ) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
  ).run(firstDecision.check_id, firstDecision.selection, firstDecision.rationale,
    firstDecision.event_key, firstDecision.actor_external_user_id,
    firstDecision.occurred_at, firstDecision.occurred_at);
  database.prepare(
    `UPDATE production_decision_records
     SET selection = ?, rationale = ?, version = 2, last_event_key = ?,
       decided_by_external_user_id = ?, decided_at = ?, updated_at = ?
     WHERE check_id = ?`,
  ).run(secondDecision.selection, secondDecision.rationale,
    secondDecision.event_key, secondDecision.actor_external_user_id,
    secondDecision.occurred_at, secondDecision.occurred_at,
    secondDecision.check_id);
  database.prepare(
    `INSERT INTO business_profile_admin_events (
       event_key, tenant_id, previous_profile_digest, new_profile_digest,
       changed_fields, actor_external_user_id, profile_version,
       occurred_at, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(...Object.values(rows.adminEvent));
}

async function seedPostgresDependencies(database, pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (1, $1, 'active', $2, $3, 'governance-billing-primary')`,
    [profile.businessName, times.created, times.changed],
  );
  await pool.query(
    `INSERT INTO business_profiles (
       tenant_id, business_name, timezone, interface_language,
       version, created_at, updated_at
     ) VALUES (1, $1, $2, $3, 2, $4, $5)`,
    [profile.businessName, profile.timezone, profile.interfaceLanguage,
      times.created, times.changed],
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
  const d1Outcome = await captureOutcome(d1Operation);
  const postgresOutcome = await captureOutcome(postgresOperation);
  assert.equal(postgresOutcome, d1Outcome, `${name} diverged`);
  assert.equal(d1Outcome, expected, `${name} outcome was not ${expected}`);
  observations.push(Object.freeze({ name, outcome: expected }));
}

async function runSemanticParityScenarios(database, pool) {
  const observations = [];
  const extensionKey = subscriptionEventKey({
    eventType: "extended", expectedVersion: 2, toStatus: "active",
    newEndsAt: extendedEndsAt,
  });
  await compareOutcome(observations, "extend-subscription", () => {
    database.exec("BEGIN");
    try {
      database.prepare(
        `UPDATE tenant_subscriptions SET ends_at = ?, version = 3,
           updated_at = ? WHERE tenant_id = 1 AND version = 2`,
      ).run(extendedEndsAt, times.extended);
      database.prepare(
        `INSERT INTO tenant_subscription_events (
           event_key, tenant_id, event_type, from_status, to_status,
           previous_ends_at, new_ends_at, actor_external_user_id,
           subscription_version, occurred_at, created_at
         ) VALUES (?, 1, 'extended', 'active', 'active', ?, ?, ?, 3, ?, ?)`,
      ).run(extensionKey, migratedEndsAt, extendedEndsAt, actor,
        times.extended, times.extended);
      insertD1SubscriptionAudit(
        database,
        extensionKey,
        "subscription.extended",
        times.extended,
      );
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }, async () => {
    await pool.query("BEGIN");
    try {
      await pool.query(
        `UPDATE tenant_subscriptions SET ends_at = $1, version = 3,
           updated_at = $2 WHERE tenant_id = 1 AND version = 2`,
        [extendedEndsAt, times.extended],
      );
      await pool.query(
        `INSERT INTO tenant_subscription_events (
           event_key, tenant_id, event_type, from_status, to_status,
           previous_ends_at, new_ends_at, actor_external_user_id,
           subscription_version, occurred_at, created_at
         ) VALUES ($1, 1, 'extended', 'active', 'active', $2, $3, $4, 3, $5, $5)`,
        [extensionKey, migratedEndsAt, extendedEndsAt, actor, times.extended],
      );
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }, "accepted");

  const statusKey = subscriptionEventKey({
    eventType: "status-changed", expectedVersion: 3, toStatus: "suspended",
    newEndsAt: extendedEndsAt,
  });
  await compareOutcome(observations, "suspend-subscription", () => {
    database.exec("BEGIN");
    try {
      database.prepare(
        `UPDATE tenant_subscriptions SET status = 'suspended', version = 4,
           updated_at = ? WHERE tenant_id = 1 AND version = 3`,
      ).run(times.suspended);
      database.prepare(
        "UPDATE tenants SET status = 'suspended', updated_at = ? WHERE id = 1",
      ).run(times.suspended);
      database.prepare(
        `INSERT INTO tenant_subscription_events (
           event_key, tenant_id, event_type, from_status, to_status,
           previous_ends_at, new_ends_at, actor_external_user_id,
           subscription_version, occurred_at, created_at
         ) VALUES (?, 1, 'status-changed', 'active', 'suspended',
           ?, ?, ?, 4, ?, ?)`,
      ).run(statusKey, extendedEndsAt, extendedEndsAt, actor,
        times.suspended, times.suspended);
      insertD1SubscriptionAudit(
        database,
        statusKey,
        "subscription.status_changed",
        times.suspended,
      );
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }, async () => {
    await pool.query("BEGIN");
    try {
      await pool.query(
        `UPDATE tenant_subscriptions SET status = 'suspended', version = 4,
           updated_at = $1 WHERE tenant_id = 1 AND version = 3`,
        [times.suspended],
      );
      await pool.query(
        "UPDATE tenants SET status = 'suspended', updated_at = $1 WHERE id = 1",
        [times.suspended],
      );
      await pool.query(
        `INSERT INTO tenant_subscription_events (
           event_key, tenant_id, event_type, from_status, to_status,
           previous_ends_at, new_ends_at, actor_external_user_id,
           subscription_version, occurred_at, created_at
         ) VALUES ($1, 1, 'status-changed', 'active', 'suspended',
           $2, $2, $3, 4, $4, $4)`,
        [statusKey, extendedEndsAt, actor, times.suspended],
      );
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }, "accepted");

  const invalidSubscriptionKey = subscriptionEventKey({
    eventType: "extended", expectedVersion: 3, toStatus: "suspended",
    newEndsAt: "2026-12-20T08:00:00.000Z",
  });
  await compareOutcome(observations, "reject-duplicate-subscription-version", () =>
    database.prepare(
      `INSERT INTO tenant_subscription_events (
         event_key, tenant_id, event_type, from_status, to_status,
         previous_ends_at, new_ends_at, actor_external_user_id,
         subscription_version, occurred_at, created_at
       ) VALUES (?, 1, 'extended', 'suspended', 'suspended',
         ?, ?, ?, 4, ?, ?)`,
    ).run(invalidSubscriptionKey, extendedEndsAt,
      "2026-12-20T08:00:00.000Z", actor, times.decided, times.decided), () =>
    pool.query(
      `INSERT INTO tenant_subscription_events (
         event_key, tenant_id, event_type, from_status, to_status,
         previous_ends_at, new_ends_at, actor_external_user_id,
         subscription_version, occurred_at, created_at
       ) VALUES ($1, 1, 'extended', 'suspended', 'suspended',
         $2, $3, $4, 4, $5, $5)`,
      [invalidSubscriptionKey, extendedEndsAt,
        "2026-12-20T08:00:00.000Z", actor, times.decided],
    ), "rejected");

  const thirdSelection = "Finance review scheduled";
  const thirdRationale = "A provider will be selected after contractual review.";
  const thirdDecisionKey = decisionEventKey({
    expectedVersion: 2,
    selection: thirdSelection,
    rationale: thirdRationale,
  });
  await compareOutcome(observations, "update-production-decision", () =>
    database.prepare(
      `UPDATE production_decision_records
       SET selection = ?, rationale = ?, version = 3, last_event_key = ?,
         decided_by_external_user_id = ?, decided_at = ?, updated_at = ?
       WHERE check_id = 'billing.provider' AND version = 2`,
    ).run(thirdSelection, thirdRationale, thirdDecisionKey, actor,
      times.decided, times.decided), () => pool.query(
    `UPDATE production_decision_records
     SET selection = $1, rationale = $2, version = 3, last_event_key = $3,
       decided_by_external_user_id = $4, decided_at = $5, updated_at = $5
     WHERE check_id = 'billing.provider' AND version = 2`,
    [thirdSelection, thirdRationale, thirdDecisionKey, actor, times.decided],
  ), "accepted");

  await compareOutcome(observations, "reject-decision-version-gap", () =>
    database.prepare(
      `UPDATE production_decision_records SET version = 5,
       last_event_key = ? WHERE check_id = 'billing.provider'`,
    ).run(`production_decision_event_v1_${"0".repeat(64)}`), () =>
    pool.query(
      `UPDATE production_decision_records SET version = 5,
       last_event_key = $1 WHERE check_id = 'billing.provider'`,
      [`production_decision_event_v1_${"0".repeat(64)}`],
    ), "rejected");

  const nextProfile = Object.freeze({
    ...profile,
    timezone: "UTC",
  });
  const nextProfileDigest = profileDigest(nextProfile);
  const nextAdminKey = adminEventKey(2, nextProfileDigest);
  await compareOutcome(observations, "update-admin-profile", () => {
    database.exec("BEGIN");
    try {
      database.prepare(
        `UPDATE business_profiles SET timezone = 'UTC', version = 3,
           updated_at = ? WHERE tenant_id = 1 AND version = 2`,
      ).run(times.administered);
      database.prepare(
        `INSERT INTO business_profile_admin_events (
           event_key, tenant_id, previous_profile_digest, new_profile_digest,
           changed_fields, actor_external_user_id, profile_version,
           occurred_at, created_at
         ) VALUES (?, 1, ?, ?, 'timezone', ?, 3, ?, ?)`,
      ).run(nextAdminKey, profileDigest(profile), nextProfileDigest, actor,
        times.administered, times.administered);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }, async () => {
    await pool.query("BEGIN");
    try {
      await pool.query(
        `UPDATE business_profiles SET timezone = 'UTC', version = 3,
           updated_at = $1 WHERE tenant_id = 1 AND version = 2`,
        [times.administered],
      );
      await pool.query(
        `INSERT INTO business_profile_admin_events (
           event_key, tenant_id, previous_profile_digest, new_profile_digest,
           changed_fields, actor_external_user_id, profile_version,
           occurred_at, created_at
         ) VALUES ($1, 1, $2, $3, 'timezone', $4, 3, $5, $5)`,
        [nextAdminKey, profileDigest(profile), nextProfileDigest, actor,
          times.administered],
      );
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }, "accepted");

  const invalidStateKey = subscriptionEventKey({
    eventType: "extended", expectedVersion: 4, toStatus: "suspended",
    newEndsAt: extendedEndsAt,
  });
  await compareOutcome(observations, "reject-invalid-subscription-event", () =>
    database.prepare(
      `INSERT INTO tenant_subscription_events (
         event_key, tenant_id, event_type, from_status, to_status,
         previous_ends_at, new_ends_at, actor_external_user_id,
         subscription_version, occurred_at, created_at
       ) VALUES (?, 1, 'extended', 'suspended', 'suspended',
         ?, ?, ?, 5, ?, ?)`,
    ).run(invalidStateKey, extendedEndsAt, extendedEndsAt, actor,
      times.administered, times.administered), () => pool.query(
    `INSERT INTO tenant_subscription_events (
       event_key, tenant_id, event_type, from_status, to_status,
       previous_ends_at, new_ends_at, actor_external_user_id,
       subscription_version, occurred_at, created_at
     ) VALUES ($1, 1, 'extended', 'suspended', 'suspended',
       $2, $2, $3, 5, $4, $4)`,
    [invalidStateKey, extendedEndsAt, actor, times.administered],
  ), "rejected");
  await compareOutcome(observations, "reject-duplicate-decision-event", () =>
    database.prepare(
      `INSERT INTO production_decision_events (
         event_key, check_id, event_type, selection, rationale,
         actor_external_user_id, decision_version, occurred_at, created_at
       ) VALUES (?, 'billing.provider', 'recorded', ?, ?, ?, 3, ?, ?)`,
    ).run(thirdDecisionKey, thirdSelection, thirdRationale, actor,
      times.decided, times.decided), () => pool.query(
    `INSERT INTO production_decision_events (
       event_key, check_id, event_type, selection, rationale,
       actor_external_user_id, decision_version, occurred_at, created_at
     ) VALUES ($1, 'billing.provider', 'recorded', $2, $3, $4, 3, $5, $5)`,
    [thirdDecisionKey, thirdSelection, thirdRationale, actor, times.decided],
  ), "rejected");
  await compareOutcome(observations, "reject-admin-event-mutation", () =>
    database.prepare(
      "UPDATE business_profile_admin_events SET changed_fields = 'businessName'",
    ).run(), () => pool.query(
    "UPDATE business_profile_admin_events SET changed_fields = 'businessName'",
  ), "rejected");
  return Object.freeze(observations);
}

function normalizePostgresValue(column, value) {
  if (value instanceof Date) return value.toISOString();
  if (value !== null && ["positive-integer", "nonnegative-integer"]
    .includes(column.kind)) return Number(value);
  return value;
}

function semanticRows(tableName, rows) {
  if (tableName !== "production_decision_events") return rows;
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).filter(([key]) => key !== "created_at"),
  ));
}

async function compareFinalState(database, pool) {
  const d1Snapshot = readD1GovernanceBillingSnapshot(database);
  const targetTables = {};
  for (const table of POSTGRES_GOVERNANCE_BILLING_DATA_TABLE_CONTRACTS) {
    const postgres = await pool.query(
      `SELECT ${table.columns.map(({ name }) => name).join(", ")}
       FROM ${table.name} ORDER BY ${table.orderBy.join(", ")}`,
    );
    targetTables[table.name] = postgres.rows.map((row) =>
      Object.fromEntries(table.columns.map((column) => [
        column.name,
        normalizePostgresValue(column, row[column.name]),
      ])),
    );
  }
  const targetSnapshot = createPostgresGovernanceBillingDataSnapshot(targetTables);
  const evidence = [];
  for (const table of POSTGRES_GOVERNANCE_BILLING_DATA_TABLE_CONTRACTS) {
    const sourceRows = semanticRows(table.name, d1Snapshot.tables[table.name]);
    const targetRows = semanticRows(table.name, targetSnapshot.tables[table.name]);
    assert.deepEqual(targetRows, sourceRows, `${table.name} final state diverged`);
    evidence.push(Object.freeze({
      table: table.name,
      rowCount: targetRows.length,
      digest: digest(JSON.stringify(targetRows)),
    }));
  }
  return Object.freeze(evidence);
}

export async function verifyPostgresGovernanceBillingDataMigration(
  connectionString,
) {
  const checkedUrl = requireLocalGovernanceBillingDataMigrationUrl(
    connectionString,
  );
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: checkedUrl,
    max: 2,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 2_000,
  });
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  try {
    await applyD1Migrations(database);
    await applyPostgresMigrations(pool);
    database.exec("BEGIN IMMEDIATE");
    try {
      seedD1(database);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    await seedPostgresDependencies(database, pool);
    const snapshot = readD1GovernanceBillingSnapshot(database);
    const plan = createPostgresGovernanceBillingDataMigrationPlan({
      snapshot,
      createdAt: "2026-08-20T10:00:00.000Z",
      expiresAt: "2026-08-20T10:15:00.000Z",
      evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    const migrationEvidence = await executePostgresGovernanceBillingDataMigration({
      plan,
      transactions,
      evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    });
    assert.equal(migrationEvidence.tableCount, 5);
    assert.equal(migrationEvidence.totalRowCount, 7);
    assert.equal(migrationEvidence.tables.every(
      ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest), true);
    assert.doesNotMatch(JSON.stringify(migrationEvidence),
      /Manual billing|finance approval|user_governance_owner|Connect Operations/);
    const semanticObservations = await runSemanticParityScenarios(database, pool);
    const finalState = await compareFinalState(database, pool);
    await assert.rejects(executePostgresGovernanceBillingDataMigration({
      plan,
      transactions,
      evidenceHmacKey,
      now: "2026-08-20T10:06:00.000Z",
    }), (error) => error instanceof PostgresDataMigrationError &&
      error.code === "target-not-empty");
    return Object.freeze({
      d1MigrationCount: (await migrationFiles(join(projectRoot, "drizzle"))).length,
      postgresMigrationCount: (await migrationFiles(
        join(projectRoot, "postgres", "migrations"))).length,
      tableCount: migrationEvidence.tableCount,
      rowCount: migrationEvidence.totalRowCount,
      replayRejected: true,
      auditLineageVerified: true,
      governancePayloadPrivate: true,
      semanticScenarioCount: semanticObservations.length,
      semanticScenarioDigest: digest(JSON.stringify(semanticObservations)),
      semanticStateDigest: digest(JSON.stringify(finalState)),
    });
  } finally {
    database.close();
    await pool.end();
  }
}

async function main() {
  const connectionString = process.env[environmentKey];
  if (!connectionString) fail("URL_MISSING");
  const result = await verifyPostgresGovernanceBillingDataMigration(
    connectionString,
  );
  process.stdout.write(
    `PostgreSQL governance/billing data rehearsal: PASS (` +
    `${result.d1MigrationCount} D1 migrations, ` +
    `${result.postgresMigrationCount} PostgreSQL migrations, ` +
    `${result.tableCount} tables, ${result.rowCount} rows, replay rejected, ` +
    `audit lineage verified, governance payload private, ` +
    `${result.semanticScenarioCount} parity scenarios)\n`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    const context = error instanceof PostgresDataMigrationError && error.table
      ? ` (table: ${error.table})`
      : "";
    process.stderr.write(`${message}${context}\n`);
    process.exitCode = 1;
  });
}
