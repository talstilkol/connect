import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  createPostgresGovernanceBillingDataMigrationPlan,
  createPostgresGovernanceBillingDataSnapshot,
  executePostgresGovernanceBillingDataMigration,
} from "../server/platform/postgresGovernanceBillingDataMigration.ts";
import {
  D1DataMigrationSnapshotError,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  readD1GovernanceBillingSnapshot,
} from "../scripts/read-d1-governance-billing-snapshot.mjs";
import {
  requireLocalGovernanceBillingDataMigrationUrl,
} from "../scripts/verify-postgres-governance-billing-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 83).toString("base64");
const createdAt = "2026-08-20T08:00:00.000Z";
const changedAt = "2026-08-20T09:00:00.000Z";
const initialEndsAt = "2026-09-20T08:00:00.000Z";
const extendedEndsAt = "2026-10-20T08:00:00.000Z";
const actor = "user_governance_owner";
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

function adminEventKey(newProfileDigest) {
  return namespaced("business_profile_admin_event_v1_", {
    namespace: "business_profile_admin_event_v1",
    tenantId: 1,
    expectedVersion: 1,
    newProfileDigest,
    actorExternalUserId: actor,
  });
}

function rawTables() {
  const subscriptionCreatedKey = subscriptionEventKey({
    eventType: "created",
    expectedVersion: null,
    toStatus: "active",
    newEndsAt: initialEndsAt,
  });
  const subscriptionExtendedKey = subscriptionEventKey({
    eventType: "extended",
    expectedVersion: 1,
    toStatus: "active",
    newEndsAt: extendedEndsAt,
  });
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
  const previousProfileDigest = profileDigest({
    ...profile,
    businessName: "Connect",
  });
  return {
    tenant_subscriptions: [{
      tenant_id: 1,
      status: "active",
      starts_at: createdAt,
      ends_at: extendedEndsAt,
      cancelled_at: null,
      version: 2,
      created_at: createdAt,
      updated_at: changedAt,
    }],
    tenant_subscription_events: [{
      event_key: subscriptionCreatedKey,
      tenant_id: 1,
      event_type: "created",
      from_status: null,
      to_status: "active",
      previous_ends_at: null,
      new_ends_at: initialEndsAt,
      actor_external_user_id: actor,
      subscription_version: 1,
      occurred_at: createdAt,
      created_at: createdAt,
    }, {
      event_key: subscriptionExtendedKey,
      tenant_id: 1,
      event_type: "extended",
      from_status: "active",
      to_status: "active",
      previous_ends_at: initialEndsAt,
      new_ends_at: extendedEndsAt,
      actor_external_user_id: actor,
      subscription_version: 2,
      occurred_at: changedAt,
      created_at: changedAt,
    }],
    production_decision_records: [{
      check_id: "billing.provider",
      selection: secondSelection,
      rationale: secondRationale,
      version: 2,
      last_event_key: secondDecisionKey,
      decided_by_external_user_id: actor,
      decided_at: changedAt,
      updated_at: changedAt,
    }],
    production_decision_events: [{
      event_key: firstDecisionKey,
      check_id: "billing.provider",
      event_type: "recorded",
      selection: firstSelection,
      rationale: firstRationale,
      actor_external_user_id: actor,
      decision_version: 1,
      occurred_at: createdAt,
      created_at: createdAt,
    }, {
      event_key: secondDecisionKey,
      check_id: "billing.provider",
      event_type: "recorded",
      selection: secondSelection,
      rationale: secondRationale,
      actor_external_user_id: actor,
      decision_version: 2,
      occurred_at: changedAt,
      created_at: changedAt,
    }],
    business_profile_admin_events: [{
      event_key: adminEventKey(currentProfileDigest),
      tenant_id: 1,
      previous_profile_digest: previousProfileDigest,
      new_profile_digest: currentProfileDigest,
      changed_fields: "businessName",
      actor_external_user_id: actor,
      profile_version: 2,
      occurred_at: changedAt,
      created_at: changedAt,
    }],
  };
}

function createPlan(tables = rawTables()) {
  return createPostgresGovernanceBillingDataMigrationPlan({
    snapshot: createPostgresGovernanceBillingDataSnapshot(tables),
    createdAt: "2026-08-20T10:00:00.000Z",
    expiresAt: "2026-08-20T10:15:00.000Z",
    evidenceHmacKey,
  });
}

function targetReadTable(sql) {
  return /^SELECT[\s\S]+?FROM\s+([a-z_]+)\s+ORDER BY/i.exec(sql)?.[1] ?? null;
}

function createTargetFixture({ invalidVerificationIndex = 0 } = {}) {
  const tables = createPlan().payload.tables;
  const calls = [];
  let verificationIndex = 0;
  let committed = false;
  let rolledBack = false;
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      try {
        const result = await execute({
          async query(sql) {
            calls.push(sql);
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return { rows: [{ count: "0" }], rowCount: 1 };
            }
            const insert = /^INSERT INTO ([a-z_]+)/i.exec(sql);
            if (insert) {
              return { rows: [], rowCount: tables[insert[1]].length };
            }
            if (/^\s*SELECT 1\s+FROM /i.test(sql)) {
              verificationIndex += 1;
              return verificationIndex === invalidVerificationIndex
                ? { rows: [{ invalid: 1 }], rowCount: 1 }
                : { rows: [], rowCount: 0 };
            }
            if (/SELECT event\.tenant_id, event\.new_profile_digest/i.test(sql)) {
              return {
                rows: [{
                  tenant_id: "1",
                  new_profile_digest:
                    tables.business_profile_admin_events[0].new_profile_digest,
                  business_name: profile.businessName,
                  timezone: profile.timezone,
                  interface_language: profile.interfaceLanguage,
                }],
                rowCount: 1,
              };
            }
            const tableName = targetReadTable(sql);
            if (tableName) {
              return { rows: tables[tableName], rowCount: tables[tableName].length };
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
    get committed() { return committed; },
    get rolledBack() { return rolledBack; },
  };
}

function createCurrentD1Database() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const fileName of readdirSync("drizzle")
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort()) {
    database.exec(readFileSync(`drizzle/${fileName}`, "utf8")
      .replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

test("builds privacy-safe evidence and restores all user triggers", async () => {
  const plan = createPlan();
  const fixture = createTargetFixture();
  const evidence = await executePostgresGovernanceBillingDataMigration({
    plan,
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T10:05:00.000Z",
  });
  const statements = fixture.calls.join("\n");
  const publicArtifacts = JSON.stringify({ manifest: plan.manifest, evidence });
  assert.equal(evidence.tableCount, 5);
  assert.equal(evidence.totalRowCount, 7);
  assert.equal(fixture.committed, true);
  for (const table of [
    "tenant_subscription_events",
    "production_decision_records",
    "business_profile_admin_events",
  ]) {
    assert.match(statements, new RegExp(`ALTER TABLE ${table} DISABLE TRIGGER USER`));
    assert.match(statements, new RegExp(`ALTER TABLE ${table} ENABLE TRIGGER USER`));
  }
  assert.doesNotMatch(publicArtifacts,
    /Manual billing|finance approval|user_governance_owner|Connect Operations/);
});

test("rejects forged identities and noncanonical governance rows", () => {
  const cases = [
    ["tenant_subscription_events", 0, "event_key",
      `tenant_subscription_event_v1_${"0".repeat(64)}`],
    ["tenant_subscription_events", 0, "actor_external_user_id", ` ${actor}`],
    ["production_decision_records", 0, "check_id", "unregistered.decision"],
    ["production_decision_events", 1, "event_key",
      `production_decision_event_v1_${"0".repeat(64)}`],
    ["business_profile_admin_events", 0, "new_profile_digest", "0".repeat(64)],
  ];
  for (const [tableName, rowIndex, fieldName, value] of cases) {
    const tables = rawTables();
    tables[tableName][rowIndex][fieldName] = value;
    assert.throws(
      () => createPostgresGovernanceBillingDataSnapshot(tables),
      (error) => error instanceof PostgresDataMigrationError &&
        error.code === "row-invalid" && error.table === tableName &&
        error.rowIndex === rowIndex,
    );
  }
});

test("rolls back for subscription, decision, and admin lineage failures", async () => {
  for (const invalidVerificationIndex of [1, 3, 4, 6]) {
    const fixture = createTargetFixture({ invalidVerificationIndex });
    await assert.rejects(executePostgresGovernanceBillingDataMigration({
      plan: createPlan(),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    }), (error) => error instanceof PostgresDataMigrationError &&
      error.code === "target-verification-failed");
    assert.equal(fixture.committed, false);
    assert.equal(fixture.rolledBack, true);
  }
});

test("reads the five current D1 governance tables atomically", () => {
  const database = createCurrentD1Database();
  const tables = rawTables();
  try {
    database.prepare(
      `INSERT INTO tenants (
         id, display_name, status, created_at, updated_at, provisioning_key
       ) VALUES (1, ?, 'active', ?, ?, 'governance-billing-test')`,
    ).run(profile.businessName, createdAt, changedAt);
    database.prepare(
      `INSERT INTO business_profiles (
         tenant_id, business_name, timezone, interface_language,
         version, created_at, updated_at
       ) VALUES (1, ?, ?, ?, 2, ?, ?)`,
    ).run(profile.businessName, profile.timezone, profile.interfaceLanguage,
      createdAt, changedAt);

    const subscription = tables.tenant_subscriptions[0];
    database.prepare(
      `INSERT INTO tenant_subscriptions (
         tenant_id, status, starts_at, ends_at, cancelled_at,
         version, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(subscription));
    for (const event of tables.tenant_subscription_events) {
      database.prepare(
        `INSERT INTO tenant_subscription_events (
           event_key, tenant_id, event_type, from_status, to_status,
           previous_ends_at, new_ends_at, actor_external_user_id,
           subscription_version, occurred_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(...Object.values(event));
    }

    const [firstDecision, secondDecision] = tables.production_decision_events;
    database.prepare(
      `INSERT INTO production_decision_records (
         check_id, selection, rationale, version, last_event_key,
         decided_by_external_user_id, decided_at, updated_at
       ) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
    ).run(firstDecision.check_id, firstDecision.selection,
      firstDecision.rationale, firstDecision.event_key,
      firstDecision.actor_external_user_id, firstDecision.occurred_at,
      firstDecision.occurred_at);
    database.prepare(
      `UPDATE production_decision_records
       SET selection = ?, rationale = ?, version = 2, last_event_key = ?,
         decided_by_external_user_id = ?, decided_at = ?, updated_at = ?
       WHERE check_id = ?`,
    ).run(secondDecision.selection, secondDecision.rationale,
      secondDecision.event_key, secondDecision.actor_external_user_id,
      secondDecision.occurred_at, secondDecision.occurred_at,
      secondDecision.check_id);

    const adminEvent = tables.business_profile_admin_events[0];
    database.prepare(
      `INSERT INTO business_profile_admin_events (
         event_key, tenant_id, previous_profile_digest, new_profile_digest,
         changed_fields, actor_external_user_id, profile_version,
         occurred_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(adminEvent));

    const snapshot = readD1GovernanceBillingSnapshot(database);
    assert.equal(Object.keys(snapshot.tables).length, 5);
    assert.equal(
      Object.values(snapshot.tables).reduce((total, rows) => total + rows.length, 0),
      7,
    );
  } finally {
    database.close();
  }
});

test("rejects a D1 schema outside the exact governance contract", () => {
  const database = new DatabaseSync(":memory:");
  try {
    assert.throws(
      () => readD1GovernanceBillingSnapshot(database),
      (error) => error instanceof D1DataMigrationSnapshotError &&
        error.code === "schema-mismatch" &&
        error.table === "tenant_subscriptions",
    );
  } finally {
    database.close();
  }
});

test("limits the governance rehearsal URL to its local database", () => {
  const valid = "postgresql://tal@127.0.0.1:55432/" +
    "connect_governance_billing_data_migration_rehearsal";
  assert.equal(requireLocalGovernanceBillingDataMigrationUrl(valid), valid);
  for (const unsafe of [
    "postgresql://tal:secret@127.0.0.1:55432/" +
      "connect_governance_billing_data_migration_rehearsal",
    "postgresql://tal@database.example.com:55432/" +
      "connect_governance_billing_data_migration_rehearsal",
    "postgresql://tal@127.0.0.1:55432/connect",
    valid + "?ssl=true",
  ]) {
    assert.throws(
      () => requireLocalGovernanceBillingDataMigrationUrl(unsafe),
      /POSTGRES_GOVERNANCE_BILLING_DATA_URL_INVALID/,
    );
  }
});
