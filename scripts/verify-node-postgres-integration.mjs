import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import pg from "pg";

import {
  createNodePostgresQueryExecutor,
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  createPostgresRailwayApiMutationExecutor,
} from "../server/platform/postgresRailwayApiMutationExecutor.ts";
import {
  createPostgresTeamInvitationAcceptanceRepository,
} from "../server/platform/postgresTeamInvitationAcceptanceRepository.ts";
import {
  createPostgresTeamInvitationDeliveryRepository,
} from "../server/platform/postgresTeamInvitationDeliveryRepository.ts";
import {
  createPostgresTeamInvitationRepository,
} from "../server/platform/postgresTeamInvitationRepository.ts";
import {
  deriveTeamInvitationDeliveryKey,
} from "../server/team/teamInvitationKey.ts";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const integrationDatabaseName = "connect_driver_integration";
const integrationUrlEnvironmentKey =
  "CONNECT_POSTGRES_INTEGRATION_URL";
const migrationFiles = Object.freeze([
  "0000_core_contacts.sql",
  "0001_railway_api_mutation_receipts.sql",
  "0002_tenant_access_foundation.sql",
  "0003_tenant_membership_events.sql",
  "0004_team_invitation_lifecycle.sql",
]);

function fail(code) {
  throw new Error(`NODE_POSTGRES_INTEGRATION_${code}`);
}

export function requireLocalIntegrationUrl(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2_048
  ) {
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
    url.pathname !== `/${integrationDatabaseName}` ||
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

async function applyMigrations(pool) {
  const existingTables = await pool.query(
    `SELECT count(*)::integer AS count
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'`,
  );
  if (existingTables.rows[0]?.count !== 0) {
    fail("DATABASE_NOT_EMPTY");
  }

  for (const migrationFile of migrationFiles) {
    const sql = await readFile(
      join(projectRoot, "postgres", "migrations", migrationFile),
      "utf8",
    );
    await pool.query(sql);
  }
}

async function createTenant(pool) {
  const result = await pool.query(
    `INSERT INTO tenants (
       display_name, status, created_at, updated_at
     )
     VALUES ($1, 'active', $2::timestamptz, $2::timestamptz)
     RETURNING id`,
    [
      "Driver integration tenant",
      "2026-08-17T08:00:00.000Z",
    ],
  );
  const tenantId = Number(result.rows[0]?.id);

  if (!Number.isSafeInteger(tenantId) || tenantId < 1) {
    fail("TENANT_INVALID");
  }

  return tenantId;
}

function contactCommand(tenantId, suffix) {
  return Object.freeze({
    session: Object.freeze({
      tenantId,
      externalUserId: "driver-integration-owner",
      displayName: "Driver integration tenant",
      status: "active",
      role: "owner",
    }),
    idempotencyKey:
      `connect_idempotency_v1_${suffix.repeat(64)}`,
    requestDigest:
      `railway_mutation_request_v1_${
        (suffix === "c" ? "d" : "f").repeat(64)
      }`,
    profile: Object.freeze({
      phoneNumber:
        suffix === "c" ? "+972501234567" : "+972501234568",
      firstName: "Integration",
      lastName: null,
      email: null,
      company: "Connect",
    }),
  });
}

async function verifyContactLifecycle(
  pool,
  transactions,
  tenantId,
) {
  const contacts = createPostgresRailwayApiMutationExecutor(
    transactions,
  );
  const command = contactCommand(tenantId, "c");
  const created = await contacts.saveContact(command);
  const replay = await contacts.saveContact(command);

  assert.equal(created.outcome, "committed");
  assert.equal(replay.outcome, "replayed");
  assert.deepEqual(replay.contact, created.contact);

  const concurrentCommand = contactCommand(tenantId, "e");
  const concurrent = await Promise.all([
    contacts.saveContact(concurrentCommand),
    contacts.saveContact(concurrentCommand),
  ]);
  assert.deepEqual(
    concurrent.map(({ outcome }) => outcome).sort(),
    ["committed", "replayed"],
  );

  const rollbackMarker = new Error("EXPECTED_ROLLBACK_MARKER");
  await assert.rejects(
    transactions.transaction(
      { isolationLevel: "read-committed" },
      async (transaction) => {
        await transaction.query(
          "UPDATE contacts SET first_name = $1 WHERE tenant_id = $2",
          ["Rolled back", tenantId],
        );
        throw rollbackMarker;
      },
    ),
    (error) => error === rollbackMarker,
  );
  const persisted = await pool.query(
    `SELECT first_name AS name
     FROM contacts
     WHERE tenant_id = $1
       AND phone_e164 = $2`,
    [tenantId, command.profile.phoneNumber],
  );
  assert.equal(persisted.rows[0]?.name, "Integration");
}

async function prepareBlockedInvitation(
  invitationRepository,
  deliveryRepository,
  tenantId,
  email,
  hour,
) {
  const requestedAt = `2026-08-17T${hour}:00:00.000Z`;
  const invitationResult = await invitationRepository.request({
    tenantId,
    email,
    role: "agent",
    expectedVersion: 0,
    actorExternalUserId: "driver-integration-owner",
    requestedAt,
    expiresAt: `2026-08-18T${hour}:00:00.000Z`,
  });
  assert.equal(invitationResult.outcome, "created");

  const deliveryKey = await deriveTeamInvitationDeliveryKey({
    tenantId,
    invitationKey: invitationResult.invitation.invitationKey,
    invitationVersion: invitationResult.invitation.version,
  });
  const claim = await deliveryRepository.claim(
    tenantId,
    deliveryKey,
    `2026-08-17T${hour}:01:00.000Z`,
  );
  assert.equal(claim.outcome, "claimed");
  const blocked = await deliveryRepository.markBlocked(
    tenantId,
    deliveryKey,
    "PROVIDER_UNAVAILABLE",
    `2026-08-17T${hour}:02:00.000Z`,
  );
  assert.equal(blocked.status, "blocked");

  return invitationResult.invitation;
}

async function verifyInvitationLifecycle(
  pool,
  queries,
  transactions,
  tenantId,
) {
  const invitationRepository = createPostgresTeamInvitationRepository({
    queries,
    transactions,
  });
  const deliveryRepository =
    createPostgresTeamInvitationDeliveryRepository({ queries });
  const acceptanceRepository =
    createPostgresTeamInvitationAcceptanceRepository({ transactions });
  const invitation = await prepareBlockedInvitation(
    invitationRepository,
    deliveryRepository,
    tenantId,
    "integration@example.com",
    "09",
  );
  const acceptanceInput = Object.freeze({
    invitationKey: invitation.invitationKey,
    externalUserId: "driver-integration-agent",
    verifiedEmail: invitation.normalizedEmail,
    acceptedAt: "2026-08-17T09:03:00.000Z",
  });
  const acceptance = await acceptanceRepository.accept(
    acceptanceInput,
  );
  const replay = await acceptanceRepository.accept(acceptanceInput);
  assert.equal(acceptance.outcome, "created");
  assert.equal(replay.outcome, "unchanged");

  const concurrentInvitation = await prepareBlockedInvitation(
    invitationRepository,
    deliveryRepository,
    tenantId,
    "concurrent@example.com",
    "10",
  );
  const concurrentInput = Object.freeze({
    invitationKey: concurrentInvitation.invitationKey,
    externalUserId: "driver-concurrent-agent",
    verifiedEmail: concurrentInvitation.normalizedEmail,
    acceptedAt: "2026-08-17T10:03:00.000Z",
  });
  const concurrent = await Promise.all([
    acceptanceRepository.accept(concurrentInput),
    acceptanceRepository.accept(concurrentInput),
  ]);
  assert.deepEqual(
    concurrent.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );

  const acceptanceCount = await pool.query(
    `SELECT count(*)::integer AS count
     FROM team_invitation_acceptances
     WHERE invitation_key = $1`,
    [concurrentInvitation.invitationKey],
  );
  assert.equal(acceptanceCount.rows[0]?.count, 1);
}

export async function verifyNodePostgresIntegration(
  connectionString,
) {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: requireLocalIntegrationUrl(connectionString),
    max: 4,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 2_000,
  });

  try {
    const identity = await pool.query(
      `SELECT
         current_database() AS database,
         current_setting('server_version') AS version`,
    );
    assert.equal(identity.rows[0]?.database, integrationDatabaseName);
    assert.match(identity.rows[0]?.version, /^16\./);

    await applyMigrations(pool);
    const tenantId = await createTenant(pool);
    const queries = createNodePostgresQueryExecutor(pool);
    const transactions = createNodePostgresTransactionManager(pool);

    await verifyContactLifecycle(pool, transactions, tenantId);
    await verifyInvitationLifecycle(
      pool,
      queries,
      transactions,
      tenantId,
    );

    return Object.freeze({
      status: "passed",
      migrationCount: migrationFiles.length,
      concurrencyScenarios: 2,
    });
  } finally {
    await pool.end();
  }
}

async function runCli() {
  if (process.argv.length !== 2) {
    fail("ARGUMENTS_INVALID");
  }

  const result = await verifyNodePostgresIntegration(
    process.env[integrationUrlEnvironmentKey],
  );
  process.stdout.write(
    `Node PostgreSQL integration: PASS (${result.migrationCount} migrations, ${result.concurrencyScenarios} concurrency scenarios)\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  runCli().catch(() => {
    process.stderr.write("Node PostgreSQL integration: FAIL\n");
    process.exitCode = 1;
  });
}
