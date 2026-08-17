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
  createRailwayPostgresApiRuntime,
} from "../server/platform/railwayPostgresApiRuntime.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  RAILWAY_API_ENDPOINT_PATH,
  VERCEL_OIDC_HEADER,
} from "../server/platform/railwayApiContract.ts";
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
  "0006_message_templates_campaigns.sql",
  "0007_bot_flows_deliveries.sql",
  "0008_ai_reporting.sql",
  "0009_contact_organization_imports.sql",
]);

function postgresEnvironment(connectionString) {
  return {
    APP_RUNTIME_ENVIRONMENT: "test",
    DATABASE_URL: connectionString,
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
  };
}

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
  const occurredAt = "2026-08-17T08:00:00.000Z";
  const result = await pool.query(
    `INSERT INTO tenants (
       display_name, status, created_at, updated_at
     )
     VALUES ($1, 'active', $2::timestamptz, $2::timestamptz)
     RETURNING id`,
    [
      "Driver integration tenant",
      occurredAt,
    ],
  );
  const tenantId = Number(result.rows[0]?.id);

  if (!Number.isSafeInteger(tenantId) || tenantId < 1) {
    fail("TENANT_INVALID");
  }

  await pool.query(
    `INSERT INTO tenant_memberships (
       tenant_id,
       external_user_id,
       role,
       status,
       version,
       created_at,
       updated_at
     )
     VALUES ($1, 'driver-integration-owner', 'owner', 'active', 1, $2, $2)`,
    [tenantId, occurredAt],
  );

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

async function verifyContactOrganizationImportSchema(
  pool,
  foundation,
  tenantId,
) {
  const occurredAt = "2026-08-17T08:30:00.000Z";
  const contacts = await pool.query(
    `SELECT id
     FROM contacts
     WHERE tenant_id = $1
     ORDER BY id ASC`,
    [tenantId],
  );
  const contactId = Number(contacts.rows[0]?.id);

  assert.equal(Number.isSafeInteger(contactId) && contactId > 0, true);

  const session = {
    tenantId,
    externalUserId: "driver-integration-owner",
    displayName: "Driver integration tenant",
    status: "active",
    role: "owner",
  };
  const tagSnapshot = await foundation.contactOrganization.createTag(
    session,
    "Priority",
  );
  const listSnapshot = await foundation.contactOrganization.createList(
    session,
    "Pilot",
  );
  const tagId = Number(tagSnapshot.tags[0]?.id);
  const listId = Number(listSnapshot.lists[0]?.id);

  assert.equal(Number.isSafeInteger(tagId) && tagId > 0, true);
  assert.equal(Number.isSafeInteger(listId) && listId > 0, true);

  await foundation.contactOrganization.setTagAssignment(session, {
    contactId,
    groupId: tagId,
    assigned: true,
  });
  const organizationSnapshot =
    await foundation.contactOrganization.setListMembership(session, {
      contactId,
      groupId: listId,
      assigned: true,
    });
  assert.deepEqual(organizationSnapshot.tagAssignments, [
    { contactId, tagId },
  ]);
  assert.deepEqual(organizationSnapshot.listMemberships, [
    { contactId, listId },
  ]);

  const job = await pool.query(
    `INSERT INTO contact_import_jobs (
       tenant_id,
       idempotency_key,
       file_name,
       total_rows,
       created_by_external_user_id,
       created_at,
       updated_at
     )
     VALUES (
       $1,
       $2,
       'integration.csv',
       2,
       'driver-integration-owner',
       $3,
       $3
     )
     RETURNING id`,
    [tenantId, `contact_import_v1_${"a".repeat(64)}`, occurredAt],
  );
  const jobId = Number(job.rows[0]?.id);

  assert.equal(Number.isSafeInteger(jobId) && jobId > 0, true);

  await pool.query(
    `INSERT INTO contact_import_rows (
       tenant_id,
       job_id,
       source_row_number,
       contact_id,
       phone_fingerprint,
       status,
       reason,
       created_at
     )
     VALUES ($1, $2, 2, $3, $4, 'created', NULL, $5)`,
    [tenantId, jobId, contactId, "b".repeat(64), occurredAt],
  );
  await pool.query(
    `INSERT INTO contact_import_rows (
       tenant_id,
       job_id,
       source_row_number,
       contact_id,
       phone_fingerprint,
       status,
       reason,
       created_at
     )
     VALUES ($1, $2, 3, NULL, NULL, 'rejected', 'missing_phone', $3)`,
    [tenantId, jobId, occurredAt],
  );

  await assert.rejects(
    pool.query(
      `UPDATE contact_import_jobs
       SET status = 'completed'
       WHERE tenant_id = $1
         AND id = $2`,
      [tenantId, jobId],
    ),
    (error) => error?.code === "23514",
  );

  await pool.query(
    `UPDATE contact_import_jobs
     SET
       processed_rows = 2,
       created_rows = 1,
       rejected_rows = 1,
       status = 'completed',
       completed_at = $3,
       updated_at = $3
     WHERE tenant_id = $1
       AND id = $2`,
    [tenantId, jobId, occurredAt],
  );

  const snapshot = await pool.query(
    `SELECT
       tag.name AS tag_name,
       count(DISTINCT assignment.contact_id)::integer AS tagged_contacts,
       list.name AS list_name,
       count(DISTINCT membership.contact_id)::integer AS listed_contacts,
       job.status AS job_status,
       job.processed_rows,
       job.created_rows,
       job.rejected_rows
     FROM contact_tags AS tag
     JOIN contact_tag_assignments AS assignment
       ON assignment.tenant_id = tag.tenant_id
      AND assignment.tag_id = tag.id
     JOIN contact_lists AS list
       ON list.tenant_id = tag.tenant_id
     JOIN contact_list_memberships AS membership
       ON membership.tenant_id = list.tenant_id
      AND membership.list_id = list.id
     JOIN contact_import_jobs AS job
       ON job.tenant_id = tag.tenant_id
     WHERE tag.tenant_id = $1
       AND tag.id = $2
       AND list.id = $3
       AND job.id = $4
     GROUP BY tag.name, list.name, job.id`,
    [tenantId, tagId, listId, jobId],
  );
  assert.deepEqual(snapshot.rows, [
    {
      tag_name: "Priority",
      tagged_contacts: 1,
      list_name: "Pilot",
      listed_contacts: 1,
      job_status: "completed",
      processed_rows: 2,
      created_rows: 1,
      rejected_rows: 1,
    },
  ]);

  const otherTenant = await pool.query(
    `INSERT INTO tenants (
       display_name, status, created_at, updated_at
     )
     VALUES ('Isolated tenant', 'active', $1, $1)
     RETURNING id`,
    [occurredAt],
  );
  const otherTenantId = Number(otherTenant.rows[0]?.id);
  const otherTag = await pool.query(
    `INSERT INTO contact_tags (
       tenant_id, name, normalized_name, created_at, updated_at
     )
     VALUES ($1, 'Other', 'other', $2, $2)
     RETURNING id`,
    [otherTenantId, occurredAt],
  );
  const otherTagId = Number(otherTag.rows[0]?.id);

  await assert.rejects(
    pool.query(
      `INSERT INTO contact_tag_assignments (
         tenant_id, contact_id, tag_id, created_at
       )
       VALUES ($1, $2, $3, $4)`,
      [tenantId, contactId, otherTagId, occurredAt],
    ),
    (error) => error?.code === "23503",
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO contact_import_rows (
         tenant_id,
         job_id,
         source_row_number,
         contact_id,
         phone_fingerprint,
         status,
         reason,
         created_at
       )
       VALUES ($1, $2, 4, NULL, NULL, 'rejected', 'invalid_phone', $3)`,
      [otherTenantId, jobId, occurredAt],
    ),
    (error) => error?.code === "23503",
  );
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

async function verifyTemplateCampaignSchema(pool, tenantId) {
  const templateKey = `template_v1_${"d".repeat(64)}`;
  const campaignKey = `campaign_v1_${"e".repeat(64)}`;
  const audienceKey = "f".repeat(64);
  const occurredAt = "2026-08-17T10:00:00.000Z";
  const definition = JSON.stringify({ body: "Integration template" });

  await pool.query(
    `INSERT INTO message_templates (
       template_key,
       tenant_id,
       name,
       language,
       category,
       status,
       definition_json,
       created_at,
       updated_at
     )
     VALUES (
       $1,
       $2,
       'integration_template',
       'he',
       'UTILITY',
       'draft',
       $3::jsonb,
       $4::timestamptz,
       $4::timestamptz
     )`,
    [templateKey, tenantId, definition, occurredAt],
  );
  await pool.query(
    `INSERT INTO campaigns (
       campaign_key,
       tenant_id,
       name,
       status,
       delivery_mode,
       timezone,
       template_key,
       template_snapshot_json,
       audience_snapshot_key,
       recipient_count,
       created_at,
       updated_at
     )
     VALUES (
       $1,
       $2,
       'Integration campaign',
       'draft',
       'immediate',
       'UTC',
       $3,
       $4::jsonb,
       $5,
       2,
       $6::timestamptz,
       $6::timestamptz
     )`,
    [
      campaignKey,
      tenantId,
      templateKey,
      definition,
      audienceKey,
      occurredAt,
    ],
  );

  const persisted = await pool.query(
    `SELECT
       campaign.status,
       campaign.recipient_count,
       template.status AS template_status
     FROM campaigns AS campaign
     JOIN message_templates AS template
       ON template.tenant_id = campaign.tenant_id
      AND template.template_key = campaign.template_key
     WHERE campaign.tenant_id = $1
       AND campaign.campaign_key = $2`,
    [tenantId, campaignKey],
  );
  assert.deepEqual(persisted.rows, [
    {
      status: "draft",
      recipient_count: 2,
      template_status: "draft",
    },
  ]);

  await assert.rejects(
    pool.query(
      `INSERT INTO campaigns (
         campaign_key,
         tenant_id,
         name,
         status,
         delivery_mode,
         scheduled_at,
         timezone,
         template_key,
         template_snapshot_json,
         audience_snapshot_key,
         recipient_count,
         created_at,
         updated_at
       )
       VALUES (
         $1,
         $2,
         'Invalid scheduled campaign',
         'draft',
         'scheduled',
         NULL,
         'UTC',
         $3,
         $4::jsonb,
         $5,
         1,
         $6::timestamptz,
         $6::timestamptz
       )`,
      [
        `campaign_v1_${"0".repeat(64)}`,
        tenantId,
        templateKey,
        definition,
        "1".repeat(64),
        occurredAt,
      ],
    ),
    (error) => error?.code === "23514",
  );
}

async function verifyBotDeliverySchema(pool, tenantId) {
  const conversationKey = `conversation_v1_${"a".repeat(64)}`;
  const inboundMessageKey = `message_v1_${"b".repeat(64)}`;
  const botFlowKey = `bot_flow_v1_${"7".repeat(64)}`;
  const botFlowVersionKey = `bot_flow_version_v1_${"8".repeat(64)}`;
  const deliveryKey = `bot_reply_delivery_v1_${"9".repeat(64)}`;
  const occurredAt = "2026-08-17T11:00:00.000Z";
  const definition = JSON.stringify({ entry: "integration" });
  const reply = JSON.stringify({ type: "text", text: "Integration reply" });

  await pool.query(
    `INSERT INTO bot_flows (
       bot_flow_key,
       tenant_id,
       name,
       status,
       latest_version_key,
       latest_version_number,
       active_version_key,
       version,
       created_at,
       updated_at
     )
     VALUES (
       $1,
       $2,
       'Integration bot flow',
       'draft',
       $3,
       1,
       NULL,
       1,
       $4::timestamptz,
       $4::timestamptz
     )`,
    [botFlowKey, tenantId, botFlowVersionKey, occurredAt],
  );
  await pool.query(
    `INSERT INTO bot_flow_versions (
       bot_flow_version_key,
       bot_flow_key,
       tenant_id,
       version_number,
       status,
       definition_json,
       published_at,
       created_at
     )
     VALUES ($1, $2, $3, 1, 'draft', $4::jsonb, NULL, $5::timestamptz)`,
    [botFlowVersionKey, botFlowKey, tenantId, definition, occurredAt],
  );
  await pool.query(
    `INSERT INTO bot_reply_deliveries (
       delivery_key,
       tenant_id,
       conversation_key,
       inbound_message_key,
       bot_flow_key,
       bot_flow_version_key,
       reply_index,
       recipient_phone_e164,
       reply_json,
       status,
       attempt_count,
       created_at,
       updated_at
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       1,
       '+972501234567',
       $7::jsonb,
       'pending',
       0,
       $8::timestamptz,
       $8::timestamptz
     )`,
    [
      deliveryKey,
      tenantId,
      conversationKey,
      inboundMessageKey,
      botFlowKey,
      botFlowVersionKey,
      reply,
      occurredAt,
    ],
  );

  const persisted = await pool.query(
    `SELECT
       delivery.status,
       delivery.attempt_count,
       version.status AS version_status
     FROM bot_reply_deliveries AS delivery
     JOIN bot_flow_versions AS version
       ON version.tenant_id = delivery.tenant_id
      AND version.bot_flow_key = delivery.bot_flow_key
      AND version.bot_flow_version_key = delivery.bot_flow_version_key
     WHERE delivery.tenant_id = $1
       AND delivery.delivery_key = $2`,
    [tenantId, deliveryKey],
  );
  assert.deepEqual(persisted.rows, [
    {
      status: "pending",
      attempt_count: 0,
      version_status: "draft",
    },
  ]);

  await assert.rejects(
    pool.query(
      `UPDATE bot_reply_deliveries
       SET attempt_count = 1
       WHERE tenant_id = $1
         AND delivery_key = $2`,
      [tenantId, deliveryKey],
    ),
    (error) => error?.code === "23514",
  );
}

async function verifyAiReportingSchema(pool, foundation, tenantId) {
  const conversationKey = `conversation_v1_${"a".repeat(64)}`;
  const inboundMessageKey = `message_v1_${"b".repeat(64)}`;
  const aiAgentKey = `ai_agent_v1_${"3".repeat(64)}`;
  const aiAgentVersionKey = `ai_agent_version_v1_${"4".repeat(64)}`;
  const requestKey = `ai_provider_request_v1_${"5".repeat(64)}`;
  const auditKey = `ai_runtime_audit_v1_${"6".repeat(64)}`;
  const occurredAt = "2026-08-17T12:00:00.000Z";
  const definition = JSON.stringify({ responseMode: "automatic" });

  await pool.query(
    `INSERT INTO ai_agents (
       ai_agent_key,
       tenant_id,
       name,
       status,
       latest_version_key,
       latest_version_number,
       active_version_key,
       version,
       created_at,
       updated_at
     )
     VALUES (
       $1,
       $2,
       'Integration AI agent',
       'draft',
       $3,
       1,
       NULL,
       1,
       $4::timestamptz,
       $4::timestamptz
     )`,
    [aiAgentKey, tenantId, aiAgentVersionKey, occurredAt],
  );
  await pool.query(
    `INSERT INTO ai_agent_versions (
       ai_agent_version_key,
       ai_agent_key,
       tenant_id,
       version_number,
       status,
       definition_json,
       published_at,
       created_at
     )
     VALUES ($1, $2, $3, 1, 'draft', $4::jsonb, NULL, $5::timestamptz)`,
    [aiAgentVersionKey, aiAgentKey, tenantId, definition, occurredAt],
  );
  await pool.query(
    `INSERT INTO ai_runtime_cost_authorizations (
       request_key,
       tenant_id,
       ai_agent_key,
       period_start,
       monthly_limit_minor_units,
       currency,
       created_at
     )
     VALUES ($1, $2, $3, '2026-08-01'::date, 100, 'USD', $4::timestamptz)`,
    [requestKey, tenantId, aiAgentKey, occurredAt],
  );
  await pool.query(
    `INSERT INTO ai_runtime_usage (
       request_key,
       tenant_id,
       ai_agent_key,
       period_start,
       input_tokens,
       output_tokens,
       cost_minor_units,
       currency,
       within_limit,
       created_at
     )
     VALUES (
       $1,
       $2,
       $3,
       '2026-08-01'::date,
       10,
       5,
       2,
       'USD',
       TRUE,
       $4::timestamptz
     )`,
    [requestKey, tenantId, aiAgentKey, occurredAt],
  );
  await pool.query(
    `INSERT INTO ai_runtime_audit_events (
       audit_key,
       request_key,
       tenant_id,
       conversation_key,
       inbound_message_key,
       ai_agent_key,
       ai_agent_version_key,
       expected_conversation_version,
       outcome,
       reason,
       response_mode,
       grounding_score_basis_points,
       input_tokens,
       output_tokens,
       cost_minor_units,
       currency,
       created_at
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       2,
       'reply-planned',
       NULL,
       'automatic',
       9000,
       10,
       5,
       2,
       'USD',
       $8::timestamptz
     )`,
    [
      auditKey,
      requestKey,
      tenantId,
      conversationKey,
      inboundMessageKey,
      aiAgentKey,
      aiAgentVersionKey,
      occurredAt,
    ],
  );

  const report = await foundation.reports.read(
    {
      tenantId,
      externalUserId: "driver-integration-owner",
      displayName: "Driver integration tenant",
      status: "active",
      role: "owner",
    },
    {
      startDate: "2026-08-17",
      endDate: "2026-08-17",
    },
  );
  assert.deepEqual(report.period, {
    startDate: "2026-08-17",
    endDate: "2026-08-17",
  });
  assert.deepEqual(report.snapshot.campaigns, {
    total: 1,
    recipientCount: 2,
    draft: 1,
    scheduled: 0,
    running: 0,
    paused: 0,
    completed: 0,
    cancelled: 0,
    failed: 0,
  });
  assert.deepEqual(report.snapshot.messages, {
    total: 1,
    inbound: 1,
    outbound: 0,
    received: 1,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  });
  assert.deepEqual(report.snapshot.conversations, {
    active: 1,
    unreadCount: 1,
    new: 1,
    botActive: 0,
    waitingForAgent: 0,
    agentActive: 0,
    waitingForContact: 0,
    closed: 0,
  });
  assert.deepEqual(report.snapshot.bot, {
    total: 1,
    pending: 1,
    sending: 0,
    accepted: 0,
    rejected: 0,
    ambiguous: 0,
  });
  assert.deepEqual(report.snapshot.ai, {
    totalTurns: 1,
    replyPlanned: 1,
    handoff: 0,
  });
  assert.deepEqual(report.snapshot.aiUsage, [
    {
      currency: "USD",
      requestCount: 1,
      inputTokens: 10,
      outputTokens: 5,
      costMinorUnits: 2,
    },
  ]);

  await assert.rejects(
    pool.query(
      `UPDATE ai_runtime_audit_events
       SET outcome = 'handoff'
       WHERE tenant_id = $1
         AND audit_key = $2`,
      [tenantId, auditKey],
    ),
    (error) => error?.code === "23514",
  );
}

async function verifyPostgresHttpRuntime(connectionString) {
  const runtime = await createRailwayPostgresApiRuntime({
    identityEnvironment: {
      APP_PUBLIC_ORIGIN: "https://connect.example.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        "publishable-key-for-driver-integration",
      CLERK_SECRET_KEY: "secret-key-for-driver-integration",
      VERCEL_OIDC_TEAM_SLUG: "connect-team",
      VERCEL_OIDC_PROJECT_NAME: "connect-web",
      VERCEL_OIDC_ENVIRONMENT: "production",
      NODE_ENV: "production",
    },
    postgresEnvironment: postgresEnvironment(connectionString),
    identityDependencies: {
      vercelOidc: {
        createRemoteKeySet() {
          return async () => {};
        },
        async verifyJwt() {},
      },
      clerk: {
        create() {
          return {
            async authenticateRequest() {
              return {
                isAuthenticated: true,
                toAuth() {
                  return {
                    isAuthenticated: true,
                    tokenType: "session_token",
                    userId: "driver-integration-owner",
                  };
                },
              };
            },
          };
        },
      },
    },
    postgresTelemetry: {
      recordIdleClientError() {},
    },
    mutationRateLimit: {
      async consume() {
        return { outcome: "allowed" };
      },
    },
  });

  try {
    assert.deepEqual(await runtime.readiness.check(), {
      status: "ready",
    });
    const compactJwt = "header.payload.signature";
    const response = await runtime.handler.handle(
      new Request(
        new URL(
          RAILWAY_API_ENDPOINT_PATH,
          "https://railway.example.com",
        ),
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${compactJwt}`,
            "content-type": "application/json",
            [VERCEL_OIDC_HEADER]: compactJwt,
          },
          body: JSON.stringify({
            contractVersion: RAILWAY_API_CONTRACT_VERSION,
            operation: "reports.read",
            requestKind: "query",
            idempotencyKey: null,
            payload: {
              startDate: "2026-08-17",
              endDate: "2026-08-17",
            },
          }),
        },
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.contractVersion, RAILWAY_API_CONTRACT_VERSION);
    assert.equal(body.outcome, "ok");
    assert.deepEqual(body.data.period, {
      startDate: "2026-08-17",
      endDate: "2026-08-17",
    });
    assert.equal(body.data.snapshot.campaigns.total, 1);
    assert.equal(body.data.snapshot.messages.total, 1);
    assert.equal(body.data.snapshot.conversations.active, 1);
    assert.equal(body.data.snapshot.bot.total, 1);
    assert.equal(body.data.snapshot.ai.totalTurns, 1);
    assert.equal(body.data.snapshot.aiUsage[0]?.requestCount, 1);
    assert.doesNotMatch(
      JSON.stringify(body),
      /tenantId|externalUserId|driver-integration-owner/,
    );
  } finally {
    await runtime.close();
  }
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
      environment: postgresEnvironment(checkedConnectionString),
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
      await verifyContactOrganizationImportSchema(
        pool,
        foundation,
        tenantId,
      );
      await verifyConversationMessageSchema(pool, tenantId);
      await verifyTemplateCampaignSchema(pool, tenantId);
      await verifyBotDeliverySchema(pool, tenantId);
      await verifyAiReportingSchema(pool, foundation, tenantId);
      await verifyPostgresHttpRuntime(checkedConnectionString);
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
