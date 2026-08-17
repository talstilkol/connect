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
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  createRailwayPostgresFoundation,
} from "../server/platform/railwayPostgresFoundation.ts";
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
  "0005_conversations_messages.sql",
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
  contacts,
  contactReads,
  tenantId,
) {
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

  const page = await contactReads.list(
    {
      tenantId,
      externalUserId: "driver-integration-owner",
      displayName: "Driver integration tenant",
      status: "active",
      role: "owner",
    },
    null,
  );
  assert.equal(page.contacts.length, 2);
  assert.equal(page.nextCursor, null);
  assert.equal(
    page.contacts.every((contact) => contact.tenantId === tenantId),
    true,
  );
  assert.equal(page.contacts[0].id > page.contacts[1].id, true);

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

async function verifyConversationMessageSchema(pool, tenantId) {
  const contact = await pool.query(
    `SELECT id
     FROM contacts
     WHERE tenant_id = $1
     ORDER BY id ASC
     LIMIT 1`,
    [tenantId],
  );
  const contactId = Number(contact.rows[0]?.id);
  assert.equal(Number.isSafeInteger(contactId) && contactId > 0, true);

  const conversationKey = `conversation_v1_${"a".repeat(64)}`;
  const messageKey = `message_v1_${"b".repeat(64)}`;
  const occurredAt = "2026-08-17T09:00:00.000Z";

  await pool.query(
    `INSERT INTO conversations (
       conversation_key,
       tenant_id,
       contact_id,
       status,
       unread_count,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, 'new', 1, $4::timestamptz, $4::timestamptz)`,
    [conversationKey, tenantId, contactId, occurredAt],
  );
  await pool.query(
    `INSERT INTO messages (
       message_key,
       conversation_key,
       tenant_id,
       provider_message_id,
       direction,
       content_kind,
       status,
       text_content,
       occurred_at,
       status_updated_at,
       created_at,
       updated_at
     )
     VALUES (
       $1,
       $2,
       $3,
       'driver-integration-message-1',
       'inbound',
       'text',
       'received',
       'Integration message',
       $4::timestamptz,
       $4::timestamptz,
       $4::timestamptz,
       $4::timestamptz
     )`,
    [messageKey, conversationKey, tenantId, occurredAt],
  );
  await pool.query(
    `UPDATE conversations
     SET
       last_message_key = $1,
       last_message_at = $2::timestamptz,
       updated_at = $2::timestamptz,
       version = version + 1
     WHERE tenant_id = $3
       AND conversation_key = $4`,
    [messageKey, occurredAt, tenantId, conversationKey],
  );

  const persisted = await pool.query(
    `SELECT
       conversation.status,
       conversation.last_message_key,
       message.direction,
       message.status AS message_status
     FROM conversations AS conversation
     JOIN messages AS message
       ON message.tenant_id = conversation.tenant_id
      AND message.conversation_key = conversation.conversation_key
     WHERE conversation.tenant_id = $1
       AND conversation.conversation_key = $2`,
    [tenantId, conversationKey],
  );
  assert.deepEqual(persisted.rows, [
    {
      status: "new",
      last_message_key: messageKey,
      direction: "inbound",
      message_status: "received",
    },
  ]);

  await assert.rejects(
    pool.query(
      `INSERT INTO messages (
         message_key,
         conversation_key,
         tenant_id,
         provider_message_id,
         direction,
         content_kind,
         status,
         text_content,
         occurred_at,
         status_updated_at
       )
       VALUES (
         $1,
         $2,
         $3,
         'driver-integration-message-invalid',
         'outbound',
         'text',
         'received',
         'Invalid state',
         $4::timestamptz,
         $4::timestamptz
       )`,
      [
        `message_v1_${"c".repeat(64)}`,
        conversationKey,
        tenantId,
        occurredAt,
      ],
    ),
    (error) => error?.code === "23514",
  );
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
  foundation,
  tenantId,
) {
  const invitationRepository = foundation.invitations;
  const deliveryRepository = foundation.invitationDeliveries;
  const acceptanceRepository = foundation.invitationAcceptances;
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
  const checkedConnectionString = requireLocalIntegrationUrl(
    connectionString,
  );
  const pool = new Pool({
    connectionString: checkedConnectionString,
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
    const transactions = createNodePostgresTransactionManager(pool);
    const foundation = createRailwayPostgresFoundation({
      environment: {
        APP_RUNTIME_ENVIRONMENT: "test",
        DATABASE_URL: checkedConnectionString,
        POSTGRES_APPLICATION_NAME: "connect-integration",
        POSTGRES_MAX_CONNECTIONS: "4",
        POSTGRES_CONNECTION_TIMEOUT_MS: "2000",
        POSTGRES_IDLE_TIMEOUT_MS: "2000",
        POSTGRES_STATEMENT_TIMEOUT_MS: "15000",
        POSTGRES_QUERY_TIMEOUT_MS: "20000",
        POSTGRES_LOCK_TIMEOUT_MS: "3000",
        POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS: "10000",
        POSTGRES_MAX_LIFETIME_SECONDS: "1800",
        POSTGRES_TLS_MODE: "disabled",
      },
      telemetry: {
        recordIdleClientError() {},
      },
    });

    try {
      await verifyContactLifecycle(
        pool,
        transactions,
        foundation.railwayApiMutations,
        foundation.contacts,
        tenantId,
      );
      await verifyConversationMessageSchema(pool, tenantId);
      await verifyInvitationLifecycle(pool, foundation, tenantId);
    } finally {
      await foundation.close();
    }

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
