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
  POSTGRES_TENANT_ACCESS_DATA_TABLE_CONTRACTS,
  createPostgresTenantAccessDataMigrationPlan,
  executePostgresTenantAccessDataMigration,
} from "../server/platform/postgresTenantAccessDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1TenantAccessDataSnapshot,
} from "./read-d1-tenant-access-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_tenant_access_data_migration_rehearsal";
const environmentKey =
  "CONNECT_POSTGRES_TENANT_ACCESS_DATA_MIGRATION_REHEARSAL_URL";
const evidenceHmacKey = Buffer.alloc(32, 29).toString("base64");
const times = Object.freeze({
  requested: "2026-08-20T08:00:00.000Z",
  revoked: "2026-08-20T09:00:00.000Z",
  rerequested: "2026-08-20T10:00:00.000Z",
  submitted: "2026-08-20T10:05:00.000Z",
  acceptedRequested: "2026-08-20T08:30:00.000Z",
  accepted: "2026-08-20T09:30:00.000Z",
  membershipChanged: "2026-08-20T13:00:00.000Z",
  invitationRevoked: "2026-08-20T13:30:00.000Z",
  firstExpiry: "2026-08-25T08:00:00.000Z",
  secondExpiry: "2026-08-27T10:00:00.000Z",
  acceptedExpiry: "2026-08-25T08:30:00.000Z",
});
const keys = Object.freeze({
  membershipEvent: `tenant_membership_event_v1_${"1".repeat(64)}`,
  membershipOperation: `tenant_membership_operation_v1_${"2".repeat(64)}`,
  invitation: `team_invitation_v1_${"3".repeat(64)}`,
  invitationRequestEvent: `team_invitation_event_v1_${"4".repeat(64)}`,
  invitationRequestOperation:
    `team_invitation_operation_v1_${"5".repeat(64)}`,
  invitationRevokeEvent: `team_invitation_event_v1_${"6".repeat(64)}`,
  invitationRevokeOperation:
    `team_invitation_operation_v1_${"7".repeat(64)}`,
  invitationRerequestEvent: `team_invitation_event_v1_${"8".repeat(64)}`,
  invitationRerequestOperation:
    `team_invitation_operation_v1_${"9".repeat(64)}`,
  invitationFirstDelivery:
    `team_invitation_delivery_v1_${"a".repeat(64)}`,
  invitationSecondDelivery:
    `team_invitation_delivery_v1_${"b".repeat(64)}`,
  acceptedInvitation: `team_invitation_v1_${"c".repeat(64)}`,
  acceptedRequestEvent: `team_invitation_event_v1_${"d".repeat(64)}`,
  acceptedRequestOperation:
    `team_invitation_operation_v1_${"e".repeat(64)}`,
  acceptedDelivery: `team_invitation_delivery_v1_${"f".repeat(64)}`,
  acceptance: `team_invitation_acceptance_v1_${"0".repeat(64)}`,
  rejectedEvent: `tenant_membership_event_v1_${"a".repeat(64)}`,
  rejectedOperation: `tenant_membership_operation_v1_${"b".repeat(64)}`,
  secondMembershipEvent: `tenant_membership_event_v1_${"c".repeat(64)}`,
  secondMembershipOperation:
    `tenant_membership_operation_v1_${"d".repeat(64)}`,
  finalInvitationEvent: `team_invitation_event_v1_${"2".repeat(64)}`,
  finalInvitationOperation:
    `team_invitation_operation_v1_${"3".repeat(64)}`,
});

function fail(code) {
  throw new Error(`POSTGRES_TENANT_ACCESS_DATA_REHEARSAL_${code}`);
}

export function requireLocalTenantAccessDataMigrationUrl(value) {
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

function seedD1Core(database) {
  database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    1,
    "Connect migration rehearsal",
    "active",
    times.requested,
    times.accepted,
    "tenant-access-rehearsal",
  );
  const insertMembership = database.prepare(
    `INSERT INTO tenant_memberships (
       id, tenant_id, external_user_id, role, status,
       created_at, updated_at, version
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertMembership.run(
    1,
    1,
    "owner-user",
    "owner",
    "active",
    times.requested,
    times.requested,
    1,
  );
  insertMembership.run(
    2,
    1,
    "member-user",
    "agent",
    "active",
    times.requested,
    times.requested,
    1,
  );
  database.prepare(
    `UPDATE tenant_memberships
     SET role = ?, version = ?, updated_at = ?
     WHERE tenant_id = ? AND external_user_id = ?`,
  ).run("viewer", 2, times.revoked, 1, "member-user");
  database.prepare(
    `INSERT INTO tenant_membership_events (
       event_key, operation_key, tenant_id, target_external_user_id,
       actor_external_user_id, event_type, from_role, to_role,
       from_status, to_status, from_version, to_version, occurred_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    keys.membershipEvent,
    keys.membershipOperation,
    1,
    "member-user",
    "owner-user",
    "role-changed",
    "agent",
    "viewer",
    "active",
    "active",
    1,
    2,
    times.revoked,
  );
}

function insertD1Invitation(database, input) {
  database.prepare(
    `INSERT INTO team_invitations (
       invitation_key, tenant_id, normalized_email, role, status, version,
       invited_by_external_user_id, last_actor_external_user_id,
       requested_at, expires_at, created_at, updated_at, last_actor_kind
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.invitationKey,
    1,
    input.email,
    input.role,
    "pending",
    1,
    "owner-user",
    "owner-user",
    input.requestedAt,
    input.expiresAt,
    input.requestedAt,
    input.requestedAt,
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
    input.eventKey,
    input.operationKey,
    input.invitationKey,
    1,
    "owner-user",
    "requested",
    null,
    input.role,
    null,
    "pending",
    0,
    1,
    input.requestedAt,
    input.expiresAt,
    input.requestedAt,
    "user",
  );
  database.prepare(
    `INSERT INTO team_invitation_deliveries (
       delivery_key, tenant_id, invitation_key, invitation_version,
       status, attempt_count, last_error_code, submitted_at,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.deliveryKey,
    1,
    input.invitationKey,
    1,
    "pending",
    0,
    null,
    null,
    input.requestedAt,
    input.requestedAt,
  );
}

function seedD1InvitationHistory(database) {
  insertD1Invitation(database, {
    invitationKey: keys.invitation,
    eventKey: keys.invitationRequestEvent,
    operationKey: keys.invitationRequestOperation,
    deliveryKey: keys.invitationFirstDelivery,
    email: "history@example.com",
    role: "agent",
    requestedAt: times.requested,
    expiresAt: times.firstExpiry,
  });
  database.prepare(
    `UPDATE team_invitation_deliveries
     SET status = ?, last_error_code = ?, updated_at = ?
     WHERE delivery_key = ?`,
  ).run(
    "cancelled",
    "INVITATION_REVOKED",
    times.revoked,
    keys.invitationFirstDelivery,
  );
  database.prepare(
    `UPDATE team_invitations
     SET status = ?, version = ?, last_actor_external_user_id = ?,
         updated_at = ?
     WHERE invitation_key = ?`,
  ).run("revoked", 2, "owner-user", times.revoked, keys.invitation);
  database.prepare(
    `INSERT INTO team_invitation_events (
       event_key, operation_key, invitation_key, tenant_id,
       actor_external_user_id, event_type, from_role, to_role,
       from_status, to_status, from_version, to_version, occurred_at,
       expires_at, created_at, actor_kind
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    keys.invitationRevokeEvent,
    keys.invitationRevokeOperation,
    keys.invitation,
    1,
    "owner-user",
    "revoked",
    "agent",
    "agent",
    "pending",
    "revoked",
    1,
    2,
    times.revoked,
    times.firstExpiry,
    times.revoked,
    "user",
  );
  database.prepare(
    `UPDATE team_invitations
     SET role = ?, status = ?, version = ?,
         last_actor_external_user_id = ?, requested_at = ?,
         expires_at = ?, updated_at = ?
     WHERE invitation_key = ?`,
  ).run(
    "viewer",
    "pending",
    3,
    "owner-user",
    times.rerequested,
    times.secondExpiry,
    times.rerequested,
    keys.invitation,
  );
  database.prepare(
    `INSERT INTO team_invitation_events (
       event_key, operation_key, invitation_key, tenant_id,
       actor_external_user_id, event_type, from_role, to_role,
       from_status, to_status, from_version, to_version, occurred_at,
       expires_at, created_at, actor_kind
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    keys.invitationRerequestEvent,
    keys.invitationRerequestOperation,
    keys.invitation,
    1,
    "owner-user",
    "re-requested",
    "agent",
    "viewer",
    "revoked",
    "pending",
    2,
    3,
    times.rerequested,
    times.secondExpiry,
    times.rerequested,
    "user",
  );
  database.prepare(
    `INSERT INTO team_invitation_deliveries (
       delivery_key, tenant_id, invitation_key, invitation_version,
       status, attempt_count, last_error_code, submitted_at,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    keys.invitationSecondDelivery,
    1,
    keys.invitation,
    3,
    "pending",
    0,
    null,
    null,
    times.rerequested,
    times.rerequested,
  );
  database.prepare(
    `UPDATE team_invitation_deliveries
     SET status = ?, attempt_count = ?, updated_at = ?
     WHERE delivery_key = ?`,
  ).run("sending", 1, times.rerequested, keys.invitationSecondDelivery);
  database.prepare(
    `UPDATE team_invitation_deliveries
     SET status = ?, submitted_at = ?, updated_at = ?
     WHERE delivery_key = ?`,
  ).run(
    "submitted",
    times.submitted,
    times.submitted,
    keys.invitationSecondDelivery,
  );
}

function seedD1AcceptedInvitation(database) {
  insertD1Invitation(database, {
    invitationKey: keys.acceptedInvitation,
    eventKey: keys.acceptedRequestEvent,
    operationKey: keys.acceptedRequestOperation,
    deliveryKey: keys.acceptedDelivery,
    email: "accepted@example.com",
    role: "agent",
    requestedAt: times.acceptedRequested,
    expiresAt: times.acceptedExpiry,
  });
  database.prepare(
    `UPDATE team_invitation_deliveries
     SET status = ?, attempt_count = ?, updated_at = ?
     WHERE delivery_key = ?`,
  ).run("sending", 1, times.acceptedRequested, keys.acceptedDelivery);
  database.prepare(
    `UPDATE team_invitation_deliveries
     SET status = ?, submitted_at = ?, updated_at = ?
     WHERE delivery_key = ?`,
  ).run(
    "submitted",
    times.acceptedRequested,
    times.acceptedRequested,
    keys.acceptedDelivery,
  );
  database.prepare(
    `INSERT INTO tenant_memberships (
       id, tenant_id, external_user_id, role, status,
       created_at, updated_at, version
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    3,
    1,
    "accepted-user",
    "agent",
    "active",
    times.accepted,
    times.accepted,
    1,
  );
  database.prepare(
    `UPDATE team_invitations
     SET version = ?, last_actor_external_user_id = ?, updated_at = ?
     WHERE invitation_key = ?`,
  ).run(2, "accepted-user", times.accepted, keys.acceptedInvitation);
  database.prepare(
    `INSERT INTO team_invitation_acceptances (
       acceptance_key, tenant_id, invitation_key, external_user_id,
       normalized_email, role, from_version, to_version,
       accepted_at, expires_at, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    keys.acceptance,
    1,
    keys.acceptedInvitation,
    "accepted-user",
    "accepted@example.com",
    "agent",
    1,
    2,
    times.accepted,
    times.acceptedExpiry,
    times.accepted,
  );
}

async function seedPostgresCore(pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      1,
      "Connect migration rehearsal",
      "active",
      times.requested,
      times.accepted,
      "tenant-access-rehearsal",
    ],
  );
  await pool.query(
    `INSERT INTO tenant_memberships (
       id, tenant_id, external_user_id, role, status,
       created_at, updated_at, version
     ) VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8),
       ($9, $10, $11, $12, $13, $14, $15, $16),
       ($17, $18, $19, $20, $21, $22, $23, $24)`,
    [
      1, 1, "owner-user", "owner", "active",
      times.requested, times.requested, 1,
      2, 1, "member-user", "viewer", "active",
      times.requested, times.revoked, 2,
      3, 1, "accepted-user", "agent", "active",
      times.accepted, times.accepted, 1,
    ],
  );
}

async function requireTriggersRejectInvalidHistory(pool) {
  await assert.rejects(
    pool.query(
      `INSERT INTO tenant_membership_events (
         event_key, operation_key, tenant_id, target_external_user_id,
         actor_external_user_id, event_type, from_role, to_role,
         from_status, to_status, from_version, to_version, occurred_at
       ) VALUES (
         $1, $2, 1, 'member-user', 'owner-user', 'role-changed',
         'agent', 'manager', 'active', 'active', 1, 2, $3
       )`,
      [keys.rejectedEvent, keys.rejectedOperation, times.submitted],
    ),
    (error) => error?.code === "23514",
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

function executeD1Transaction(database, operation) {
  database.exec("BEGIN IMMEDIATE");
  try {
    operation();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

async function executePostgresTransaction(pool, operation) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await operation(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function runSemanticParityScenarios(database, pool) {
  const observations = [];
  await compareOutcome(
    observations,
    "membership-event-immutable",
    () => database.prepare(
      `UPDATE tenant_membership_events
       SET occurred_at = ?
       WHERE event_key = ?`,
    ).run(times.submitted, keys.membershipEvent),
    () => pool.query(
      `UPDATE tenant_membership_events
       SET occurred_at = $1
       WHERE event_key = $2`,
      [times.submitted, keys.membershipEvent],
    ),
    "rejected",
  );
  await compareOutcome(
    observations,
    "last-active-owner-protected",
    () => database.prepare(
      `UPDATE tenant_memberships
       SET status = 'suspended', version = 2, updated_at = ?
       WHERE tenant_id = 1 AND external_user_id = 'owner-user'`,
    ).run(times.membershipChanged),
    () => pool.query(
      `UPDATE tenant_memberships
       SET status = 'suspended', version = 2, updated_at = $1
       WHERE tenant_id = 1 AND external_user_id = 'owner-user'`,
      [times.membershipChanged],
    ),
    "rejected",
  );
  await compareOutcome(
    observations,
    "accepted-invitation-immutable",
    () => database.prepare(
      `UPDATE team_invitations
       SET role = 'viewer', version = 3, updated_at = ?
       WHERE invitation_key = ?`,
    ).run(times.invitationRevoked, keys.acceptedInvitation),
    () => pool.query(
      `UPDATE team_invitations
       SET role = 'viewer', version = 3, updated_at = $1
       WHERE invitation_key = $2`,
      [times.invitationRevoked, keys.acceptedInvitation],
    ),
    "rejected",
  );
  await compareOutcome(
    observations,
    "acceptance-ledger-immutable",
    () => database.prepare(
      "DELETE FROM team_invitation_acceptances WHERE acceptance_key = ?",
    ).run(keys.acceptance),
    () => pool.query(
      "DELETE FROM team_invitation_acceptances WHERE acceptance_key = $1",
      [keys.acceptance],
    ),
    "rejected",
  );
  await compareOutcome(
    observations,
    "settled-delivery-cannot-regress",
    () => database.prepare(
      `UPDATE team_invitation_deliveries
       SET status = 'sending', submitted_at = NULL, updated_at = ?
       WHERE delivery_key = ?`,
    ).run(times.invitationRevoked, keys.invitationSecondDelivery),
    () => pool.query(
      `UPDATE team_invitation_deliveries
       SET status = 'sending', submitted_at = NULL, updated_at = $1
       WHERE delivery_key = $2`,
      [times.invitationRevoked, keys.invitationSecondDelivery],
    ),
    "rejected",
  );
  await compareOutcome(
    observations,
    "membership-transition-with-ledger",
    () => executeD1Transaction(database, () => {
      database.prepare(
        `UPDATE tenant_memberships
         SET role = 'manager', version = 3, updated_at = ?
         WHERE tenant_id = 1 AND external_user_id = 'member-user'`,
      ).run(times.membershipChanged);
      database.prepare(
        `INSERT INTO tenant_membership_events (
           event_key, operation_key, tenant_id, target_external_user_id,
           actor_external_user_id, event_type, from_role, to_role,
           from_status, to_status, from_version, to_version, occurred_at
         ) VALUES (?, ?, 1, 'member-user', 'owner-user', 'role-changed',
                   'viewer', 'manager', 'active', 'active', 2, 3, ?)`,
      ).run(
        keys.secondMembershipEvent,
        keys.secondMembershipOperation,
        times.membershipChanged,
      );
    }),
    () => executePostgresTransaction(pool, async (client) => {
      await client.query(
        `UPDATE tenant_memberships
         SET role = 'manager', version = 3, updated_at = $1
         WHERE tenant_id = 1 AND external_user_id = 'member-user'`,
        [times.membershipChanged],
      );
      await client.query(
        `INSERT INTO tenant_membership_events (
           event_key, operation_key, tenant_id, target_external_user_id,
           actor_external_user_id, event_type, from_role, to_role,
           from_status, to_status, from_version, to_version, occurred_at
         ) VALUES ($1, $2, 1, 'member-user', 'owner-user', 'role-changed',
                   'viewer', 'manager', 'active', 'active', 2, 3, $3)`,
        [
          keys.secondMembershipEvent,
          keys.secondMembershipOperation,
          times.membershipChanged,
        ],
      );
    }),
    "accepted",
  );
  await compareOutcome(
    observations,
    "invitation-transition-with-ledger",
    () => executeD1Transaction(database, () => {
      database.prepare(
        `UPDATE team_invitations
         SET status = 'revoked', version = 4,
             last_actor_external_user_id = 'owner-user', updated_at = ?
         WHERE invitation_key = ?`,
      ).run(times.invitationRevoked, keys.invitation);
      database.prepare(
        `INSERT INTO team_invitation_events (
           event_key, operation_key, invitation_key, tenant_id,
           actor_external_user_id, event_type, from_role, to_role,
           from_status, to_status, from_version, to_version, occurred_at,
           expires_at, created_at, actor_kind
         ) VALUES (?, ?, ?, 1, 'owner-user', 'revoked', 'viewer', 'viewer',
                   'pending', 'revoked', 3, 4, ?, ?, ?, 'user')`,
      ).run(
        keys.finalInvitationEvent,
        keys.finalInvitationOperation,
        keys.invitation,
        times.invitationRevoked,
        times.secondExpiry,
        times.invitationRevoked,
      );
    }),
    () => executePostgresTransaction(pool, async (client) => {
      await client.query(
        `UPDATE team_invitations
         SET status = 'revoked', version = 4,
             last_actor_external_user_id = 'owner-user', updated_at = $1
         WHERE invitation_key = $2`,
        [times.invitationRevoked, keys.invitation],
      );
      await client.query(
        `INSERT INTO team_invitation_events (
           event_key, operation_key, invitation_key, tenant_id,
           actor_external_user_id, event_type, from_role, to_role,
           from_status, to_status, from_version, to_version, occurred_at,
           expires_at, created_at, actor_kind
         ) VALUES ($1, $2, $3, 1, 'owner-user', 'revoked',
                   'viewer', 'viewer', 'pending', 'revoked', 3, 4,
                   $4, $5, $4, 'user')`,
        [
          keys.finalInvitationEvent,
          keys.finalInvitationOperation,
          keys.invitation,
          times.invitationRevoked,
          times.secondExpiry,
        ],
      );
    }),
    "accepted",
  );
  return Object.freeze(observations);
}

function normalizePostgresValue(column, value) {
  if (value instanceof Date) return value.toISOString();
  if (
    value !== null &&
    ["nonnegative-integer", "positive-integer"].includes(column.kind)
  ) {
    return Number(value);
  }
  return value;
}

function digest(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

async function compareTenantAccessFinalState(database, pool) {
  const d1Snapshot = readD1TenantAccessDataSnapshot(database);
  const tableEvidence = [];
  for (const table of POSTGRES_TENANT_ACCESS_DATA_TABLE_CONTRACTS) {
    const postgres = await pool.query(
      `SELECT ${table.columns.map(({ name }) => name).join(", ")}
       FROM ${table.name}
       ORDER BY ${table.orderBy.join(", ")}`,
    );
    const postgresRows = postgres.rows.map((row) => Object.fromEntries(
      table.columns.map((column) => [
        column.name,
        normalizePostgresValue(column, row[column.name]),
      ]),
    ));
    assert.deepEqual(
      postgresRows,
      d1Snapshot.tables[table.name],
      `${table.name} final state diverged`,
    );
    tableEvidence.push(Object.freeze({
      table: table.name,
      rowCount: postgresRows.length,
      digest: digest(postgresRows),
    }));
  }
  const membershipSql =
    `SELECT id, tenant_id, external_user_id, role, status, version
     FROM tenant_memberships
     ORDER BY id`;
  const d1Memberships = database.prepare(membershipSql).all().map(
    (row) => ({ ...row }),
  );
  const postgresMemberships = (await pool.query(membershipSql)).rows.map(
    (row) => ({
      ...row,
      id: Number(row.id),
      tenant_id: Number(row.tenant_id),
    }),
  );
  assert.deepEqual(postgresMemberships, d1Memberships);
  tableEvidence.push(Object.freeze({
    table: "tenant_memberships",
    rowCount: postgresMemberships.length,
    digest: digest(postgresMemberships),
  }));
  return Object.freeze(tableEvidence);
}

export async function verifyPostgresTenantAccessDataMigration(
  connectionString,
) {
  const checkedUrl = requireLocalTenantAccessDataMigrationUrl(connectionString);
  const { Pool } = pg;
  const pool = new Pool({ connectionString: checkedUrl, max: 2 });
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");

  try {
    await applyD1Migrations(database);
    await applyPostgresMigrations(pool);
    database.exec("BEGIN IMMEDIATE");
    try {
      seedD1Core(database);
      seedD1InvitationHistory(database);
      seedD1AcceptedInvitation(database);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    await seedPostgresCore(pool);

    const snapshot = readD1TenantAccessDataSnapshot(database);
    const plan = createPostgresTenantAccessDataMigrationPlan({
      snapshot,
      createdAt: "2026-08-20T12:00:00.000Z",
      expiresAt: "2026-08-20T12:15:00.000Z",
      evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    const evidence = await executePostgresTenantAccessDataMigration({
      plan,
      transactions,
      evidenceHmacKey,
      now: "2026-08-20T12:05:00.000Z",
    });

    assert.equal(evidence.tableCount, 5);
    assert.equal(evidence.totalRowCount, 11);
    assert.equal(
      evidence.tables.every(
        ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(evidence),
      /history@example\.com|accepted@example\.com|member-user|accepted-user/,
    );
    await requireTriggersRejectInvalidHistory(pool);
    const semanticObservations = await runSemanticParityScenarios(
      database,
      pool,
    );
    const finalState = await compareTenantAccessFinalState(database, pool);
    await assert.rejects(
      executePostgresTenantAccessDataMigration({
        plan,
        transactions,
        evidenceHmacKey,
        now: "2026-08-20T12:06:00.000Z",
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
      tableCount: evidence.tableCount,
      rowCount: evidence.totalRowCount,
      replayRejected: true,
      triggersRestored: true,
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
  const result = await verifyPostgresTenantAccessDataMigration(connectionString);
  process.stdout.write(
    `PostgreSQL tenant-access data rehearsal: PASS (` +
    `${result.d1MigrationCount} D1 migrations, ` +
    `${result.postgresMigrationCount} PostgreSQL migrations, ` +
    `${result.tableCount} tables, ${result.rowCount} rows, ` +
    `replay rejected, triggers restored, ` +
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
