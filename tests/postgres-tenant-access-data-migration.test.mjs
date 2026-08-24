import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  createPostgresTenantAccessDataMigrationPlan,
  createPostgresTenantAccessDataSnapshot,
  executePostgresTenantAccessDataMigration,
} from "../server/platform/postgresTenantAccessDataMigration.ts";
import {
  D1DataMigrationSnapshotError,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  readD1TenantAccessDataSnapshot,
} from "../scripts/read-d1-tenant-access-snapshot.mjs";
import {
  requireLocalTenantAccessDataMigrationUrl,
} from "../scripts/verify-postgres-tenant-access-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 23).toString("base64");
const requestedAt = "2026-08-20T08:00:00.000Z";
const expiresAt = "2026-08-27T08:00:00.000Z";
const eventKey = `tenant_membership_event_v1_${"a".repeat(64)}`;
const membershipOperationKey =
  `tenant_membership_operation_v1_${"b".repeat(64)}`;
const invitationKey = `team_invitation_v1_${"c".repeat(64)}`;
const invitationEventKey = `team_invitation_event_v1_${"d".repeat(64)}`;
const invitationOperationKey =
  `team_invitation_operation_v1_${"e".repeat(64)}`;
const deliveryKey = `team_invitation_delivery_v1_${"f".repeat(64)}`;

function rawTenantAccessTables() {
  return {
    tenant_membership_events: [{
      event_key: eventKey,
      operation_key: membershipOperationKey,
      tenant_id: 1,
      target_external_user_id: "member-user",
      actor_external_user_id: "owner-user",
      event_type: "role-changed",
      from_role: "agent",
      to_role: "viewer",
      from_status: "active",
      to_status: "active",
      from_version: 1,
      to_version: 2,
      occurred_at: requestedAt,
    }],
    team_invitations: [{
      invitation_key: invitationKey,
      tenant_id: 1,
      normalized_email: "member@example.com",
      role: "agent",
      status: "pending",
      version: 1,
      invited_by_external_user_id: "owner-user",
      last_actor_external_user_id: "owner-user",
      requested_at: requestedAt,
      expires_at: expiresAt,
      created_at: requestedAt,
      updated_at: requestedAt,
      last_actor_kind: "user",
    }],
    team_invitation_events: [{
      event_key: invitationEventKey,
      operation_key: invitationOperationKey,
      invitation_key: invitationKey,
      tenant_id: 1,
      actor_external_user_id: "owner-user",
      event_type: "requested",
      from_role: null,
      to_role: "agent",
      from_status: null,
      to_status: "pending",
      from_version: 0,
      to_version: 1,
      occurred_at: requestedAt,
      expires_at: expiresAt,
      created_at: requestedAt,
      actor_kind: "user",
    }],
    team_invitation_deliveries: [{
      delivery_key: deliveryKey,
      tenant_id: 1,
      invitation_key: invitationKey,
      invitation_version: 1,
      status: "pending",
      attempt_count: 0,
      last_error_code: null,
      submitted_at: null,
      created_at: requestedAt,
      updated_at: requestedAt,
    }],
    team_invitation_delivery_deferrals: [],
    team_invitation_acceptances: [],
  };
}

function createPlan(tables = rawTenantAccessTables()) {
  return createPostgresTenantAccessDataMigrationPlan({
    snapshot: createPostgresTenantAccessDataSnapshot(tables),
    createdAt: "2026-08-20T10:00:00.000Z",
    expiresAt: "2026-08-20T10:15:00.000Z",
    evidenceHmacKey,
  });
}

function tableNameFromTargetRead(sql) {
  return /^SELECT[\s\S]+?FROM\s+([a-z_]+)\s+ORDER BY/i.exec(sql)?.[1] ?? null;
}

function createTargetFixture({ disabledTrigger = false } = {}) {
  const sourceTables = rawTenantAccessTables();
  const calls = [];
  let rolledBack = false;
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      try {
        return await execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return { rows: [{ count: "0" }], rowCount: 1 };
            }
            if (/FROM pg_trigger AS trigger/i.test(sql)) {
              return disabledTrigger
                ? { rows: [{ invalid: 1 }], rowCount: 1 }
                : { rows: [], rowCount: 0 };
            }
            if (/^WITH |^SELECT 1\s+FROM team_/i.test(sql)) {
              return { rows: [], rowCount: 0 };
            }
            if (/^INSERT INTO /i.test(sql)) {
              return { rows: [], rowCount: 1 };
            }
            const tableName = tableNameFromTargetRead(sql);
            if (tableName) {
              return {
                rows: sourceTables[tableName],
                rowCount: sourceTables[tableName].length,
              };
            }
            return { rows: [{}], rowCount: 1 };
          },
        });
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  };
  return {
    calls,
    manager,
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

test("builds a six-table privacy-safe tenant-access plan", () => {
  const plan = createPlan();

  assert.equal(plan.manifest.length, 6);
  assert.equal(plan.manifest.reduce((sum, table) => sum + table.rowCount, 0), 4);
  assert.match(
    plan.planId,
    /^connect_postgres_tenant_access_data_v2_[0-9a-f]{64}$/,
  );
  assert.doesNotMatch(
    JSON.stringify(plan.manifest),
    /member@example\.com|member-user|owner-user/,
  );
});

test("loads history with triggers disabled only inside the transaction", async () => {
  const fixture = createTargetFixture();
  const evidence = await executePostgresTenantAccessDataMigration({
    plan: createPlan(),
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T10:05:00.000Z",
  });
  const statements = fixture.calls.map(({ sql }) => sql);

  assert.equal(evidence.tableCount, 6);
  assert.equal(evidence.totalRowCount, 4);
  assert.equal(
    statements.filter((sql) => /DISABLE TRIGGER USER/.test(sql)).length,
    5,
  );
  assert.equal(
    statements.filter((sql) => /ENABLE TRIGGER USER/.test(sql)).length,
    5,
  );
  assert.equal(
    evidence.tables.every(
      ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
    ),
    true,
  );
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /member@example\.com|member-user|owner-user/,
  );
});

test("refuses a target whose user triggers are already disabled", async () => {
  const fixture = createTargetFixture({ disabledTrigger: true });

  await assert.rejects(
    executePostgresTenantAccessDataMigration({
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
  assert.equal(
    fixture.calls.some(({ sql }) => /DISABLE TRIGGER USER/.test(sql)),
    false,
  );
  assert.equal(fixture.rolledBack, true);
});

test("rejects legacy email data that PostgreSQL cannot accept", () => {
  const tables = rawTenantAccessTables();
  tables.team_invitations[0].normalized_email = "member @example.com";

  assert.throws(
    () => createPostgresTenantAccessDataSnapshot(tables),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "row-invalid" &&
      error.table === "team_invitations" &&
      error.rowIndex === 0
    ),
  );
});

test("reads the six current D1 tables in one checked snapshot", () => {
  const database = createCurrentD1Database();
  try {
    database.prepare(
      `INSERT INTO tenants (
         id, display_name, status, created_at, updated_at, provisioning_key
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, "Connect", "active", requestedAt, requestedAt, "tenant-key");
    database.prepare(
      `INSERT INTO tenant_memberships (
         id, tenant_id, external_user_id, role, status,
         created_at, updated_at, version
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 1, "owner-user", "owner", "active", requestedAt, requestedAt, 1);
    database.prepare(
      `INSERT INTO team_invitations (
         invitation_key, tenant_id, normalized_email, role, status, version,
         invited_by_external_user_id, last_actor_external_user_id,
         requested_at, expires_at, created_at, updated_at, last_actor_kind
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      invitationKey,
      1,
      "member@example.com",
      "agent",
      "pending",
      1,
      "owner-user",
      "owner-user",
      requestedAt,
      expiresAt,
      requestedAt,
      requestedAt,
      "user",
    );
    database.prepare(
      `INSERT INTO team_invitation_events (
         event_key, operation_key, invitation_key, tenant_id,
         actor_external_user_id, event_type, from_role, to_role,
         from_status, to_status, from_version, to_version, occurred_at,
         expires_at, created_at, actor_kind
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      invitationEventKey,
      invitationOperationKey,
      invitationKey,
      1,
      "owner-user",
      "requested",
      null,
      "agent",
      null,
      "pending",
      0,
      1,
      requestedAt,
      expiresAt,
      requestedAt,
      "user",
    );
    database.prepare(
      `INSERT INTO team_invitation_deliveries (
         delivery_key, tenant_id, invitation_key, invitation_version,
         status, attempt_count, last_error_code, submitted_at,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      deliveryKey,
      1,
      invitationKey,
      1,
      "pending",
      0,
      null,
      null,
      requestedAt,
      requestedAt,
    );

    const snapshot = readD1TenantAccessDataSnapshot(database);
    assert.equal(snapshot.tables.team_invitations.length, 1);
    assert.equal(snapshot.tables.team_invitation_events.length, 1);
    assert.equal(snapshot.tables.team_invitation_deliveries.length, 1);
    assert.equal(
      snapshot.tables.team_invitation_delivery_deferrals.length,
      0,
    );
    assert.equal(snapshot.tables.tenant_membership_events.length, 0);
    assert.equal(snapshot.tables.team_invitation_acceptances.length, 0);
  } finally {
    database.close();
  }
});

test("rejects a D1 schema outside the exact tenant-access contract", () => {
  const database = new DatabaseSync(":memory:");
  try {
    assert.throws(
      () => readD1TenantAccessDataSnapshot(database),
      (error) => (
        error instanceof D1DataMigrationSnapshotError &&
        error.code === "schema-mismatch" &&
        error.table === "tenant_membership_events"
      ),
    );
  } finally {
    database.close();
  }
});

test("restricts the real rehearsal to its named local database", () => {
  assert.equal(
    requireLocalTenantAccessDataMigrationUrl(
      "postgresql://127.0.0.1:55443/connect_tenant_access_data_migration_rehearsal",
    ),
    "postgresql://127.0.0.1:55443/connect_tenant_access_data_migration_rehearsal",
  );

  for (const invalid of [
    "postgresql://database.example:55443/connect_tenant_access_data_migration_rehearsal",
    "postgresql://tal:x@127.0.0.1:55443/connect_tenant_access_data_migration_rehearsal",
    "postgresql://127.0.0.1:55443/connect_data_migration_rehearsal",
    "postgresql://127.0.0.1:55443/connect_tenant_access_data_migration_rehearsal?sslmode=disable",
  ]) {
    assert.throws(
      () => requireLocalTenantAccessDataMigrationUrl(invalid),
      /POSTGRES_TENANT_ACCESS_DATA_REHEARSAL_URL_INVALID/,
    );
  }
});
