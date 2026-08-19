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
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";
import {
  deriveBotReplyDeliveryKey,
} from "../server/bot/botReplyDeliveryKey.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgePassageKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  RAILWAY_API_ENDPOINT_PATH,
  VERCEL_OIDC_HEADER,
} from "../server/platform/railwayApiContract.ts";
import {
  deriveTeamInvitationDeliveryKey,
} from "../server/team/teamInvitationKey.ts";
import {
  railwayWorkerSchedulerId,
} from "../shared/domain/workerScheduler.ts";

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
  "0010_meta_connection_credentials.sql",
  "0011_whatsapp_delivery_policy.sql",
  "0012_whatsapp_rate_limit_ledger.sql",
  "0013_whatsapp_phone_throughput.sql",
  "0014_worker_scheduler_lease.sql",
  "0015_campaign_dispatch.sql",
  "0016_ai_knowledge.sql",
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

  const importJob = await foundation.contactImports.start(session, {
    fileName: "integration.csv",
    sourceDigest: "a".repeat(64),
    totalRows: 2,
    mapping: {
      phoneNumber: 0,
      firstName: 1,
      lastName: 2,
      email: 3,
      company: 4,
    },
  });
  const importResult = await foundation.contactImports.processChunk(
    session,
    {
      jobId: importJob.id,
      rows: [
        {
          sourceRowNumber: 2,
          phoneNumber: "+972501234569",
          firstName: "Imported",
          lastName: "Contact",
          email: "",
          company: "Connect",
        },
        {
          sourceRowNumber: 3,
          phoneNumber: "",
          firstName: "Rejected",
          lastName: "Contact",
          email: "",
          company: "Connect",
        },
      ],
    },
  );
  const jobId = importResult.job.id;

  assert.equal(Number.isSafeInteger(jobId) && jobId > 0, true);
  assert.deepEqual(importResult.job, {
    id: jobId,
    fileName: "integration.csv",
    totalRows: 2,
    processedRows: 2,
    createdRows: 1,
    updatedRows: 0,
    unchangedRows: 0,
    rejectedRows: 1,
    duplicateRows: 0,
    status: "completed",
  });
  assert.equal(importResult.contacts.length, 1);
  assert.equal(importResult.contacts[0]?.phoneNumber, "+972501234569");
  assert.deepEqual(
    await foundation.contactImports.processChunk(session, {
      jobId,
      rows: [
        {
          sourceRowNumber: 2,
          phoneNumber: "+972501234569",
          firstName: "Imported",
          lastName: "Contact",
          email: "",
          company: "Connect",
        },
      ],
    }),
    {
      job: importResult.job,
      contacts: [],
    },
  );

  const concurrentImportJob = await foundation.contactImports.start(
    session,
    {
      fileName: "concurrent.csv",
      sourceDigest: "c".repeat(64),
      totalRows: 1,
      mapping: {
        phoneNumber: 0,
        firstName: 1,
        lastName: 2,
        email: 3,
        company: 4,
      },
    },
  );
  const concurrentChunk = {
    jobId: concurrentImportJob.id,
    rows: [
      {
        sourceRowNumber: 2,
        phoneNumber: "+972501234570",
        firstName: "Concurrent",
        lastName: "Import",
        email: "",
        company: "Connect",
      },
    ],
  };
  const concurrentImports = await Promise.all([
    foundation.contactImports.processChunk(session, concurrentChunk),
    foundation.contactImports.processChunk(session, concurrentChunk),
  ]);

  assert.equal(
    concurrentImports.every(
      ({ job: concurrentJob }) =>
        concurrentJob.status === "completed" &&
        concurrentJob.processedRows === 1 &&
        concurrentJob.createdRows === 1,
    ),
    true,
  );
  const concurrentImportCounts = await pool.query(
    `SELECT
       (
         SELECT count(*)::integer
         FROM contact_import_rows
         WHERE tenant_id = $1
           AND job_id = $2
       ) AS row_count,
       (
         SELECT count(*)::integer
         FROM contacts
         WHERE tenant_id = $1
           AND phone_e164 = '+972501234570'
       ) AS contact_count`,
    [tenantId, concurrentImportJob.id],
  );
  assert.deepEqual(concurrentImportCounts.rows, [
    { row_count: 1, contact_count: 1 },
  ]);

  await assert.rejects(
    pool.query(
      `UPDATE contact_import_jobs
       SET processed_rows = 1
       WHERE tenant_id = $1
         AND id = $2`,
      [tenantId, jobId],
    ),
    (error) => error?.code === "23514",
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

async function verifyMetaConnectionCredentials(
  pool,
  foundation,
  tenantId,
) {
  const session = {
    tenantId,
    externalUserId: "driver-integration-owner",
    displayName: "Driver integration tenant",
    status: "active",
    role: "owner",
  };
  const pending = await foundation.metaConnections.captureVerifiedAssets(
    session,
    {
      businessPortfolioId: "integration-business-portfolio",
      wabaId: "integration-waba",
      phoneNumberId: "integration-phone-number",
    },
  );

  assert.equal(pending.status, "pending");
  assert.equal(pending.version, 1);
  await foundation.metaCredentialEnvelopes.store({
    tenantId,
    keyVersion: "v1",
    initializationVector: "AQIDBAUGBwgJCgsM",
    ciphertext: "AQIDBAUGBwgJCgsMDQ4PEA==",
  });
  const envelope = await foundation.metaCredentialEnvelopes.findByTenantId(
    tenantId,
  );

  assert.deepEqual(
    envelope === null
      ? null
      : {
          tenantId: envelope.tenantId,
          keyVersion: envelope.keyVersion,
          initializationVector: envelope.initializationVector,
          ciphertext: envelope.ciphertext,
        },
    {
      tenantId,
      keyVersion: "v1",
      initializationVector: "AQIDBAUGBwgJCgsM",
      ciphertext: "AQIDBAUGBwgJCgsMDQ4PEA==",
    },
  );

  const connected = await foundation.metaConnections.confirmWebhookSubscription(
    session,
  );
  assert.equal(connected.status, "connected");
  assert.equal(connected.version, 2);
  assert.equal(connected.webhookSubscribedAt !== null, true);
  assert.equal(connected.connectedAt !== null, true);
  assert.equal(
    (await foundation.metaWebhooks.findConnectionByWabaId(
      "integration-waba",
    ))?.tenantId,
    tenantId,
  );

  const concurrentClaimInput = Object.freeze({
    tenantId,
    wabaId: "integration-waba",
    eventKey: "d".repeat(64),
    objectType: "whatsapp_business_account",
  });
  const concurrentClaims = await Promise.all([
    foundation.metaWebhooks.claimWebhookReceipt(concurrentClaimInput),
    foundation.metaWebhooks.claimWebhookReceipt(concurrentClaimInput),
  ]);

  assert.deepEqual(
    concurrentClaims.map(({ claimed }) => claimed).sort(),
    [false, true],
  );
  const receiptId = concurrentClaims[0].receipt.id;
  assert.equal(
    concurrentClaims.every(({ receipt }) => receipt.id === receiptId),
    true,
  );
  await foundation.metaWebhooks.completeWebhookReceipt(tenantId, receiptId);
  const processedDuplicate =
    await foundation.metaWebhooks.claimWebhookReceipt(concurrentClaimInput);
  assert.equal(processedDuplicate.claimed, false);
  assert.equal(processedDuplicate.receipt.status, "processed");
  await assert.rejects(
    foundation.metaWebhooks.claimWebhookReceipt({
      ...concurrentClaimInput,
      objectType: "different_object",
    }),
    /conflicts with stored evidence/,
  );

  const persisted = await pool.query(
    `SELECT
       connection.status,
       connection.version,
       receipt.status AS receipt_status,
       receipt.attempt_count,
       envelope.key_version,
       length(envelope.ciphertext)::integer AS ciphertext_length
     FROM meta_connections AS connection
     JOIN meta_webhook_receipts AS receipt
       ON receipt.tenant_id = connection.tenant_id
      AND receipt.waba_id = connection.waba_id
     JOIN meta_credential_envelopes AS envelope
       ON envelope.tenant_id = connection.tenant_id
     WHERE connection.tenant_id = $1
       AND receipt.event_key = $2`,
    [tenantId, concurrentClaimInput.eventKey],
  );
  assert.deepEqual(persisted.rows, [
    {
      status: "connected",
      version: 2,
      receipt_status: "processed",
      attempt_count: 1,
      key_version: "v1",
      ciphertext_length: 24,
    },
  ]);
}

async function verifyWhatsappDeliveryPolicy(
  pool,
  foundation,
  tenantId,
) {
  const enabledCommand = Object.freeze({
    tenantId,
    connectionVersion: 2,
    expectedPolicyVersion: 0,
    deliveryState: "enabled",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 250,
    phoneThroughputMessagesPerSecond: 20,
    maximumOutboundMessagesPerSecond: 2,
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v21.0",
    evidenceDigest: "e".repeat(64),
    evidenceCheckedAt: "2026-08-17T08:31:00.000Z",
    evidenceExpiresAt: "2026-08-18T08:31:00.000Z",
    actorExternalUserId: "tal-rate-limit-research",
    recordedAt: "2026-08-17T08:32:00.000Z",
  });
  const concurrent = await Promise.all([
    foundation.whatsappDeliveryPolicies.recordPolicyEvent(enabledCommand),
    foundation.whatsappDeliveryPolicies.recordPolicyEvent(enabledCommand),
  ]);

  assert.deepEqual(
    concurrent.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );
  assert.equal(
    concurrent[0].record.eventKey,
    concurrent[1].record.eventKey,
  );

  const current =
    await foundation.whatsappDeliveryPolicies.findCurrentEnabledPolicy({
      tenantId,
      businessPortfolioId: "integration-business-portfolio",
      wabaId: "integration-waba",
      phoneNumberId: "integration-phone-number",
      checkedAt: "2026-08-17T08:33:00.000Z",
    });
  assert.equal(current?.policyVersion, 1);
  assert.deepEqual(current?.portfolioCapacity, {
    kind: "bounded",
    maximumUniqueRecipients: 250,
  });
  assert.deepEqual(current?.phoneThroughput, {
    maximumMessagesPerSecond: 20,
    maximumOutboundMessagesPerSecond: 2,
  });

  const disabled = await foundation.whatsappDeliveryPolicies.recordPolicyEvent({
    ...enabledCommand,
    expectedPolicyVersion: 1,
    deliveryState: "disabled",
    recordedAt: "2026-08-17T08:34:00.000Z",
  });
  assert.equal(disabled.outcome, "updated");
  assert.equal(disabled.record.policyVersion, 2);
  assert.equal(disabled.record.deliveryState, "disabled");
  assert.equal(
    await foundation.whatsappDeliveryPolicies.findCurrentEnabledPolicy({
      tenantId,
      businessPortfolioId: "integration-business-portfolio",
      wabaId: "integration-waba",
      phoneNumberId: "integration-phone-number",
      checkedAt: "2026-08-17T08:35:00.000Z",
    }),
    null,
  );

  const persisted = await pool.query(
    `SELECT
       count(*)::integer AS event_count,
       max(policy_version)::integer AS latest_version,
       count(*) FILTER (
         WHERE delivery_state = 'disabled'
       )::integer AS disabled_count
     FROM whatsapp_campaign_delivery_policy_events
     WHERE tenant_id = $1`,
    [tenantId],
  );
  assert.deepEqual(persisted.rows, [
    { event_count: 2, latest_version: 2, disabled_count: 1 },
  ]);

  const audit = await pool.query(
    `SELECT count(*)::integer AS count
     FROM audit_logs
     WHERE tenant_id = $1
       AND action = 'whatsapp.delivery_policy.recorded'
       AND target_type = 'whatsapp_campaign_delivery_policy'`,
    [tenantId],
  );
  assert.equal(audit.rows[0]?.count, 2);

  await assert.rejects(
    pool.query(
      `UPDATE whatsapp_campaign_delivery_policy_events
       SET reservation_duration_seconds = 600
       WHERE tenant_id = $1
         AND policy_version = 1`,
      [tenantId],
    ),
    (error) =>
      error?.code === "P0001" &&
      /immutable/.test(error.message),
  );

  const reenabled =
    await foundation.whatsappDeliveryPolicies.recordPolicyEvent({
      ...enabledCommand,
      expectedPolicyVersion: 2,
      recordedAt: "2026-08-17T08:36:00.000Z",
    });
  assert.equal(reenabled.outcome, "updated");
  assert.equal(reenabled.record.deliveryState, "enabled");

  return reenabled.record.eventKey;
}

async function verifyWhatsappRateLimitLedger(
  pool,
  foundation,
  tenantId,
  policyEventKey,
) {
  const command = Object.freeze({
    reservationKey: `whatsapp_rate_reservation_v1_${"1".repeat(64)}`,
    tenantId,
    portfolioKey: `whatsapp_portfolio_v1_${"2".repeat(64)}`,
    senderKey: `whatsapp_sender_v1_${"3".repeat(64)}`,
    recipientKey: `whatsapp_recipient_v1_${"4".repeat(64)}`,
    policyEventKey,
    templateCategory: "MARKETING",
    portfolioCapacity: Object.freeze({
      kind: "bounded",
      maximumUniqueRecipients: 250,
    }),
    phoneThroughput: Object.freeze({
      maximumMessagesPerSecond: 20,
      maximumOutboundMessagesPerSecond: 2,
    }),
    reservedAt: "2026-08-17T09:00:00.000Z",
    reservationExpiresAt: "2026-08-17T09:05:00.000Z",
  });
  const concurrent = await Promise.all([
    foundation.whatsappRateLimits.reserveBusinessInitiatedMessage(command),
    foundation.whatsappRateLimits.reserveBusinessInitiatedMessage(command),
  ]);
  assert.equal(
    concurrent.every(({ outcome }) => outcome === "reserved"),
    true,
  );
  assert.deepEqual(
    concurrent.map(({ idempotent }) => idempotent).sort(),
    [false, true],
  );

  const pairLimited =
    await foundation.whatsappRateLimits.reserveBusinessInitiatedMessage({
      ...command,
      reservationKey: `whatsapp_rate_reservation_v1_${"5".repeat(64)}`,
    });
  assert.equal(pairLimited.outcome, "pair-limited");
  assert.equal(pairLimited.retryAt, "2026-08-17T09:00:06.000Z");

  const cancelled = await foundation.whatsappRateLimits.settle({
    reservationKey: command.reservationKey,
    outcome: "cancelled-before-submit",
    settledAt: "2026-08-17T09:00:02.000Z",
  });
  assert.equal(cancelled.outcome, "settled");
  assert.equal(cancelled.idempotent, false);

  const secondCommand = Object.freeze({
    ...command,
    reservationKey: `whatsapp_rate_reservation_v1_${"6".repeat(64)}`,
    reservedAt: "2026-08-17T09:00:02.000Z",
    reservationExpiresAt: "2026-08-17T09:05:02.000Z",
  });
  const second =
    await foundation.whatsappRateLimits.reserveBusinessInitiatedMessage(
      secondCommand,
    );
  assert.equal(second.outcome, "reserved");

  const cooldown = await foundation.whatsappRateLimits.applyProviderCooldown({
    reservationKey: secondCommand.reservationKey,
    scope: "pair",
    providerErrorCode: 131056,
    observedAt: "2026-08-17T09:00:03.000Z",
    blockedUntil: "2026-08-17T09:00:30.000Z",
  });
  assert.equal(cooldown.outcome, "applied");
  assert.equal(cooldown.idempotent, false);

  const providerLimited =
    await foundation.whatsappRateLimits.reserveBusinessInitiatedMessage({
      ...command,
      reservationKey: `whatsapp_rate_reservation_v1_${"7".repeat(64)}`,
      reservedAt: "2026-08-17T09:00:09.000Z",
      reservationExpiresAt: "2026-08-17T09:05:09.000Z",
    });
  assert.equal(providerLimited.outcome, "provider-cooldown");
  assert.equal(providerLimited.scope, "pair");
  assert.equal(providerLimited.providerErrorCode, 131056);
  assert.equal(providerLimited.retryAt, "2026-08-17T09:00:30.000Z");

  const throughputCommands = ["8", "9", "a"].map(
    (suffix, index) => ({
      ...command,
      reservationKey:
        `whatsapp_rate_reservation_v1_${suffix.repeat(64)}`,
      recipientKey:
        `whatsapp_recipient_v1_${String(index + 5).repeat(64)}`,
      reservedAt: "2026-08-17T09:01:00.000Z",
      reservationExpiresAt:
        "2026-08-17T09:06:00.000Z",
    }),
  );
  const throughputResults = await Promise.all(
    throughputCommands.map((throughputCommand) =>
      foundation.whatsappRateLimits
        .reserveBusinessInitiatedMessage(
          throughputCommand,
        ),
    ),
  );
  assert.deepEqual(
    throughputResults
      .map(({ outcome }) => outcome)
      .sort(),
    [
      "phone-throughput-limited",
      "reserved",
      "reserved",
    ],
  );
  assert.equal(
    throughputResults.find(
      ({ outcome }) =>
        outcome === "phone-throughput-limited",
    )?.retryAt,
    "2026-08-17T09:01:01.000Z",
  );

  const persisted = await pool.query(
    `SELECT
       (
         SELECT count(*)::integer
         FROM whatsapp_rate_limit_reservations
         WHERE tenant_id = $1
       ) AS reservation_count,
       (
         SELECT count(*)::integer
         FROM whatsapp_rate_limit_settlements AS settlement
         INNER JOIN whatsapp_rate_limit_reservations AS reservation
           USING (reservation_key)
         WHERE reservation.tenant_id = $1
       ) AS settlement_count,
       (
         SELECT count(*)::integer
         FROM whatsapp_provider_cooldown_events AS cooldown
         INNER JOIN whatsapp_rate_limit_reservations AS reservation
           USING (reservation_key)
         WHERE reservation.tenant_id = $1
       ) AS cooldown_count`,
    [tenantId],
  );
  assert.deepEqual(persisted.rows, [
    { reservation_count: 4, settlement_count: 2, cooldown_count: 1 },
  ]);

  await assert.rejects(
    pool.query(
      `UPDATE whatsapp_rate_limit_reservations
       SET template_category = 'UTILITY'
       WHERE reservation_key = $1`,
      [command.reservationKey],
    ),
    (error) => error?.code === "P0001" && /immutable/.test(error.message),
  );
  await assert.rejects(
    pool.query(
      `UPDATE whatsapp_pair_rate_limit_state
       SET reserved_until = reserved_until + INTERVAL '1 hour'
       WHERE sender_key = $1
         AND recipient_key = $2`,
      [command.senderKey, command.recipientKey],
    ),
    (error) => error?.code === "P0001" && /lacks reservation proof/.test(
      error.message,
    ),
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

async function verifyConversationLifecycle(pool, foundation, tenantId) {
  const phoneNumber = "+972509876541";
  const contacts = await Promise.all([
    foundation.conversations.resolveInboundContact(tenantId, phoneNumber),
    foundation.conversations.resolveInboundContact(tenantId, phoneNumber),
  ]);
  assert.equal(contacts[0].contactId, contacts[1].contactId);
  assert.equal(contacts[0].tenantId, tenantId);
  const contactCount = await pool.query(
    `SELECT count(*)::integer AS count
     FROM contacts
     WHERE tenant_id = $1
       AND phone_e164 = $2`,
    [tenantId, phoneNumber],
  );
  assert.deepEqual(contactCount.rows, [{ count: 1 }]);

  const conversationKey = `conversation_v1_${"1".repeat(64)}`;
  const inboundMessageKey = `message_v1_${"2".repeat(64)}`;
  const inboundOccurredAt = "2026-08-17T09:10:00.000Z";
  const inboundInput = Object.freeze({
    tenantId,
    conversationKey,
    messageKey: inboundMessageKey,
    contactId: contacts[0].contactId,
    providerMessageId: "driver-conversation-inbound-1",
    contentKind: "text",
    textContent: "PostgreSQL conversation lifecycle",
    occurredAt: inboundOccurredAt,
  });
  const inboundResults = await Promise.all([
    foundation.conversations.recordInboundMessage(inboundInput),
    foundation.conversations.recordInboundMessage(inboundInput),
  ]);
  assert.deepEqual(
    inboundResults.map(({ outcome }) => outcome).sort(),
    ["created", "duplicate"],
  );

  const inbox = await foundation.conversations.findByKey(
    tenantId,
    conversationKey,
  );
  assert.ok(inbox);
  assert.equal(inbox.unreadCount, 1);
  assert.equal(inbox.version, 2);
  assert.equal(inbox.lastMessageKey, inboundMessageKey);
  assert.equal(inbox.contact.phoneNumber, phoneNumber);
  const filtered = await foundation.conversations.listFilteredByTenant(
    tenantId,
    {
      searchTerm: "6541",
      status: "new",
      assignment: "unassigned",
      currentExternalUserId: null,
    },
    25,
  );
  assert.equal(
    filtered.some((conversation) =>
      conversation.conversationKey === conversationKey),
    true,
  );
  const inboundMessages = await foundation.conversations
    .listMessagesByConversation(tenantId, conversationKey, 50);
  assert.equal(inboundMessages.length, 1);
  assert.equal(inboundMessages[0].providerMessageId, inboundInput.providerMessageId);

  const readResults = await Promise.all([
    foundation.conversations.markRead(tenantId, conversationKey, 2),
    foundation.conversations.markRead(tenantId, conversationKey, 2),
  ]);
  assert.deepEqual(
    readResults.map(({ outcome }) => outcome).sort(),
    ["conflict", "updated"],
  );
  const readState = await foundation.conversations.findByKey(
    tenantId,
    conversationKey,
  );
  assert.equal(readState?.unreadCount, 0);
  assert.equal(readState?.version, 3);

  const externalUserId = "auth0|postgres-conversation-agent";
  const assignmentResults = await Promise.all([
    foundation.conversations.changeAssignment(
      tenantId,
      conversationKey,
      3,
      externalUserId,
      "assign-self",
    ),
    foundation.conversations.changeAssignment(
      tenantId,
      conversationKey,
      3,
      externalUserId,
      "assign-self",
    ),
  ]);
  assert.deepEqual(
    assignmentResults.map(({ outcome }) => outcome).sort(),
    ["conflict", "updated"],
  );
  const assigned = await foundation.conversations.findByKey(
    tenantId,
    conversationKey,
  );
  assert.equal(assigned?.assignedExternalUserId, externalUserId);
  assert.equal(assigned?.version, 4);

  const outboundMessageKey = `message_v1_${"3".repeat(64)}`;
  const outboundProviderMessageId = "driver-conversation-outbound-1";
  const outboundOccurredAt = new Date(
    Date.parse(inboundOccurredAt) + 60_000,
  ).toISOString();
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
       status_updated_at
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       'outbound',
       'text',
       'sent',
       'PostgreSQL outbound lifecycle',
       $5::timestamptz,
       $5::timestamptz
     )`,
    [
      outboundMessageKey,
      conversationKey,
      tenantId,
      outboundProviderMessageId,
      outboundOccurredAt,
    ],
  );
  const deliveryEventAt = new Date(
    Date.parse(outboundOccurredAt) + 60_000,
  ).toISOString();
  const deliveryInput = Object.freeze({
    tenantId,
    providerMessageId: outboundProviderMessageId,
    status: "delivered",
    statusEventKey: "4".repeat(64),
    statusEventAt: deliveryEventAt,
  });
  const deliveryResults = await Promise.all([
    foundation.conversations.applyDeliveryStatus(deliveryInput),
    foundation.conversations.applyDeliveryStatus(deliveryInput),
  ]);
  assert.deepEqual(
    deliveryResults.map(({ outcome }) => outcome).sort(),
    ["applied", "duplicate"],
  );
  const stale = await foundation.conversations.applyDeliveryStatus({
    ...deliveryInput,
    status: "read",
    statusEventKey: "5".repeat(64),
    statusEventAt: new Date(
      Date.parse(outboundOccurredAt) + 30_000,
    ).toISOString(),
  });
  assert.equal(stale.outcome, "stale");

  const persisted = await pool.query(
    `SELECT
       conversation.unread_count,
       conversation.version,
       conversation.assigned_external_user_id,
       count(message.message_key)::integer AS message_count,
       max(message.status) FILTER (
         WHERE message.provider_message_id = $3
       ) AS outbound_status
     FROM conversations AS conversation
     INNER JOIN messages AS message
       ON message.tenant_id = conversation.tenant_id
      AND message.conversation_key = conversation.conversation_key
     WHERE conversation.tenant_id = $1
       AND conversation.conversation_key = $2
     GROUP BY
       conversation.unread_count,
       conversation.version,
       conversation.assigned_external_user_id`,
    [tenantId, conversationKey, outboundProviderMessageId],
  );
  assert.deepEqual(persisted.rows, [{
    unread_count: 0,
    version: 4,
    assigned_external_user_id: externalUserId,
    message_count: 2,
    outbound_status: "delivered",
  }]);
}

async function verifyTemplateCampaignSchema(pool, tenantId) {
  const templateKey = `template_v1_${"d".repeat(64)}`;
  const campaignKey = `campaign_v1_${"e".repeat(64)}`;
  const audienceKey = "f".repeat(64);
  const occurredAt = "2026-08-17T10:00:00.000Z";
  const templateDefinition = Object.freeze({
    header: "",
    body: "Integration template",
    footer: "",
    variableExamples: {},
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
  });
  const definition = JSON.stringify(templateDefinition);
  const campaignTemplateSnapshot = JSON.stringify({
    templateKey,
    metaTemplateId: "987654321098765",
    name: "integration_template",
    language: "he",
    category: "UTILITY",
    version: 1,
    ...templateDefinition,
  });

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
      campaignTemplateSnapshot,
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
        campaignTemplateSnapshot,
        "1".repeat(64),
        occurredAt,
      ],
    ),
    (error) => error?.code === "23514",
  );
}

async function verifyCampaignDispatch(pool, foundation, tenantId) {
  const templateKey = `template_v1_${"4".repeat(64)}`;
  const campaignKey = `campaign_v1_${"5".repeat(64)}`;
  const firstDeliveryKey = `campaign_delivery_v1_${"6".repeat(64)}`;
  const secondDeliveryKey = `campaign_delivery_v1_${"7".repeat(64)}`;
  const templateSubmissionKey = `template_submission_v1_${"8".repeat(64)}`;
  const personalizationKey = "9".repeat(64);
  const metaTemplateId = "123456789012345";
  const createdAt = "2026-08-17T12:00:00.000Z";
  const templateDefinition = Object.freeze({
    header: "",
    body: "Dispatch integration",
    footer: "",
    variableExamples: {},
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
  });
  const contacts = await pool.query(
    `SELECT id, phone_e164 AS "phoneNumber", version
     FROM contacts
     WHERE tenant_id = $1
     ORDER BY id ASC
     LIMIT 2`,
    [tenantId],
  );
  assert.equal(contacts.rowCount, 2);

  await pool.query(
    `UPDATE contacts
     SET
       mailing_status = 'subscribed',
       consent_status = 'granted',
       consent_source = 'driver-integration',
       consent_recorded_at = $2::timestamptz,
       consent_withdrawn_at = NULL,
       version = version + 1,
       updated_at = $2::timestamptz
     WHERE tenant_id = $1
       AND id = ANY($3::bigint[])`,
    [tenantId, createdAt, contacts.rows.map(({ id }) => id)],
  );
  const eligibleContacts = await pool.query(
    `SELECT id, phone_e164 AS "phoneNumber", version
     FROM contacts
     WHERE tenant_id = $1
       AND id = ANY($2::bigint[])
     ORDER BY id ASC`,
    [tenantId, contacts.rows.map(({ id }) => id)],
  );

  const templateDraft = Object.freeze({
    templateKey,
    tenantId,
    name: "dispatch_integration",
    language: "he",
    category: "UTILITY",
    ...templateDefinition,
  });
  const templateWrites = await Promise.all([
    foundation.messageTemplates.saveDraft(templateDraft),
    foundation.messageTemplates.saveDraft(templateDraft),
  ]);
  assert.equal(
    templateWrites.every(
      (template) => template.status === "draft" && template.version === 1,
    ),
    true,
  );

  const submissionClaims = await Promise.allSettled([
    foundation.messageTemplates.claimSubmission(
      tenantId,
      templateKey,
      1,
      templateSubmissionKey,
    ),
    foundation.messageTemplates.claimSubmission(
      tenantId,
      templateKey,
      1,
      templateSubmissionKey,
    ),
  ]);
  assert.deepEqual(
    submissionClaims.map(({ status }) => status).sort(),
    ["fulfilled", "rejected"],
  );

  const completedTemplate =
    await foundation.messageTemplates.completeSubmission(
      tenantId,
      templateKey,
      templateSubmissionKey,
      metaTemplateId,
    );
  assert.equal(completedTemplate.status, "pending_review");
  const statusEventAt = new Date(
    Date.parse(completedTemplate.updatedAt) + 1_000,
  ).toISOString();
  const statusEvent = Object.freeze({
    tenantId,
    metaTemplateId,
    name: "dispatch_integration",
    language: "he",
    category: "UTILITY",
    status: "approved",
    statusEventKey: "b".repeat(64),
    statusEventAt,
  });
  const statusEvents = await Promise.all([
    foundation.messageTemplates.applyStatusEvent(statusEvent),
    foundation.messageTemplates.applyStatusEvent(statusEvent),
  ]);
  assert.deepEqual(
    statusEvents.map(({ outcome }) => outcome).sort(),
    ["applied", "duplicate"],
  );
  const approvedTemplate =
    await foundation.messageTemplates.findByKey(tenantId, templateKey);
  assert.ok(approvedTemplate);
  assert.equal(approvedTemplate.status, "approved");
  assert.equal(approvedTemplate.version, 4);
  assert.equal(
    (await foundation.messageTemplates.listByTenant(tenantId, 100)).some(
      ({ templateKey: savedKey }) => savedKey === templateKey,
    ),
    true,
  );
  const snapshot = Object.freeze({
    campaignKey,
    tenantId,
    name: "Dispatch integration",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "UTC",
    template: {
      templateKey,
      metaTemplateId,
      name: "dispatch_integration",
      category: "UTILITY",
      language: "he",
      version: approvedTemplate.version,
      ...templateDefinition,
    },
    audienceSnapshotKey: "a".repeat(64),
    recipientCount: 2,
    recipients: eligibleContacts.rows.map((contact, index) => ({
      contactId: Number(contact.id),
      contactVersion: contact.version,
      phoneNumber: contact.phoneNumber,
      personalization: {},
      personalizationKey,
      deliveryKey: index === 0 ? firstDeliveryKey : secondDeliveryKey,
    })),
  });
  const snapshotWrites = await Promise.all([
    foundation.campaigns.saveSnapshot(snapshot),
    foundation.campaigns.saveSnapshot(snapshot),
  ]);
  assert.equal(
    snapshotWrites.every(({ campaignKey: savedKey }) => savedKey === campaignKey),
    true,
  );
  const campaignCreatedAt = snapshotWrites[0].createdAt;
  const activatedAt = new Date(
    Date.parse(campaignCreatedAt) + 60_000,
  ).toISOString();
  const runningAt = new Date(
    Date.parse(campaignCreatedAt) + 120_000,
  ).toISOString();
  assert.equal(
    (await foundation.campaigns.findByKey(tenantId, campaignKey))?.status,
    "draft",
  );
  assert.equal(
    (await foundation.campaigns.listByTenant(tenantId, 100)).some(
      ({ campaignKey: savedKey }) => savedKey === campaignKey,
    ),
    true,
  );

  const activation = await Promise.all([
    foundation.campaignDispatch.activateCampaign(
      tenantId,
      campaignKey,
      1,
      activatedAt,
    ),
    foundation.campaignDispatch.activateCampaign(
      tenantId,
      campaignKey,
      1,
      activatedAt,
    ),
  ]);
  assert.deepEqual(
    activation.map((state) => state?.status ?? null).sort(),
    [null, "scheduled"],
  );

  const promotion = await Promise.all([
    foundation.campaignDispatch.promoteDueCampaigns(runningAt, 1),
    foundation.campaignDispatch.promoteDueCampaigns(runningAt, 1),
  ]);
  assert.deepEqual(
    promotion.map((states) => states.length).sort(),
    [0, 1],
  );

  const claims = await Promise.all([
    foundation.campaignDispatch.claimPendingRecipients(runningAt, 1),
    foundation.campaignDispatch.claimPendingRecipients(runningAt, 1),
  ]);
  assert.deepEqual(
    claims.flat().map(({ deliveryKey }) => deliveryKey).sort(),
    [firstDeliveryKey, secondDeliveryKey].sort(),
  );
  assert.deepEqual(
    await foundation.campaignDispatch.findQueuedDeliveryContext(
      firstDeliveryKey,
    ),
    {
      campaignKey,
      tenantId,
      recipientPhoneNumber: eligibleContacts.rows[0].phoneNumber,
      nextDeliveryAttemptNumber: 1,
    },
  );

  const preparation = await Promise.all([
    foundation.campaignDispatch.prepareDelivery(firstDeliveryKey, runningAt),
    foundation.campaignDispatch.prepareDelivery(firstDeliveryKey, runningAt),
  ]);
  assert.deepEqual(
    preparation.map(({ outcome }) => outcome).sort(),
    ["claimed", "duplicate"],
  );
  await foundation.campaignDispatch.markDeferred(
    firstDeliveryKey,
    "PROVIDER_THROTTLED",
    runningAt,
  );
  const retried = await foundation.campaignDispatch.prepareDelivery(
    firstDeliveryKey,
    runningAt,
  );
  assert.equal(retried.outcome, "claimed");
  assert.equal(retried.recipient.attemptCount, 2);
  await foundation.campaignDispatch.markRejected(
    firstDeliveryKey,
    "PROVIDER_REJECTED",
    runningAt,
  );

  await pool.query(
    `UPDATE contacts
     SET
       mailing_status = 'unsubscribed',
       consent_status = 'withdrawn',
       consent_withdrawn_at = $3::timestamptz,
       version = version + 1,
       updated_at = $3::timestamptz
     WHERE tenant_id = $1
       AND id = $2`,
    [tenantId, eligibleContacts.rows[1].id, runningAt],
  );
  assert.deepEqual(
    await foundation.campaignDispatch.prepareDelivery(
      secondDeliveryKey,
      runningAt,
    ),
    { outcome: "skipped" },
  );
  assert.equal(
    await foundation.campaignDispatch.completeSettledCampaigns(runningAt, 1),
    1,
  );

  const persisted = await pool.query(
    `SELECT
       campaigns.status,
       campaigns.version,
       count(*) FILTER (
         WHERE recipients.status = 'failed'
       )::integer AS failed,
       count(*) FILTER (
         WHERE recipients.status = 'skipped'
       )::integer AS skipped,
       max(recipients.attempt_count)::integer AS "maximumAttempts"
     FROM campaigns
     INNER JOIN campaign_recipients AS recipients
       ON recipients.tenant_id = campaigns.tenant_id
       AND recipients.campaign_key = campaigns.campaign_key
     WHERE campaigns.tenant_id = $1
       AND campaigns.campaign_key = $2
     GROUP BY campaigns.status, campaigns.version`,
    [tenantId, campaignKey],
  );
  assert.deepEqual(persisted.rows, [{
    status: "completed",
    version: 4,
    failed: 1,
    skipped: 1,
    maximumAttempts: 2,
  }]);
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

async function verifyBotFlowDeliveryLifecycle(pool, foundation, tenantId) {
  const name = "PostgreSQL integration bot flow";
  const botFlowKey = await deriveBotFlowKey(tenantId, name);

  async function flowVersion(versionNumber) {
    const triggerKey = await deriveBotFlowBlockKey(botFlowKey, 1);
    const textKey = await deriveBotFlowBlockKey(botFlowKey, 2);
    const endKey = await deriveBotFlowBlockKey(botFlowKey, 3);
    const definition = Object.freeze({
      name,
      entryBlockKey: triggerKey,
      blocks: Object.freeze([
        Object.freeze({
          blockKey: triggerKey,
          type: "trigger",
          nextBlockKey: textKey,
        }),
        Object.freeze({
          blockKey: textKey,
          type: "text",
          text: versionNumber === 1
            ? "Integration reply"
            : "Updated integration reply",
          nextBlockKey: endKey,
        }),
        Object.freeze({
          blockKey: endKey,
          type: "end",
        }),
      ].sort((first, second) =>
        first.blockKey.localeCompare(second.blockKey))),
    });
    const botFlowVersionKey = await deriveBotFlowVersionKey(
      tenantId,
      botFlowKey,
      versionNumber,
      definition,
    );
    return Object.freeze({
      tenantId,
      botFlowKey,
      botFlowVersionKey,
      versionNumber,
      definition,
    });
  }

  const first = await flowVersion(1);
  const firstInput = Object.freeze({
    ...first,
    expectedFlowVersion: null,
  });
  const firstDrafts = await Promise.all([
    foundation.botFlows.saveDraft(firstInput),
    foundation.botFlows.saveDraft(firstInput),
  ]);
  assert.deepEqual(
    firstDrafts.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );

  const publications = await Promise.all([
    foundation.botFlows.publishDraft(
      tenantId,
      botFlowKey,
      first.botFlowVersionKey,
      1,
    ),
    foundation.botFlows.publishDraft(
      tenantId,
      botFlowKey,
      first.botFlowVersionKey,
      1,
    ),
  ]);
  assert.deepEqual(
    publications.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );

  const second = await flowVersion(2);
  const secondInput = Object.freeze({
    ...second,
    expectedFlowVersion: 2,
  });
  const secondDrafts = await Promise.all([
    foundation.botFlows.saveDraft(secondInput),
    foundation.botFlows.saveDraft(secondInput),
  ]);
  assert.deepEqual(
    secondDrafts.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );
  assert.equal(
    (await foundation.botFlows.listVersions(tenantId, botFlowKey, 10)).length,
    2,
  );
  assert.equal(
    (await foundation.botFlows.listActiveByTenant(tenantId, 100)).some(
      ({ botFlowKey: storedKey }) => storedKey === botFlowKey,
    ),
    true,
  );

  const conversationKey = `conversation_v1_${"1".repeat(64)}`;
  const inboundMessageKey = `message_v1_${"2".repeat(64)}`;
  const phone = await pool.query(
    `SELECT contacts.phone_e164 AS "phoneNumber"
     FROM conversations
     INNER JOIN contacts
       ON contacts.tenant_id = conversations.tenant_id
      AND contacts.id = conversations.contact_id
     WHERE conversations.tenant_id = $1
       AND conversations.conversation_key = $2`,
    [tenantId, conversationKey],
  );
  assert.equal(phone.rowCount, 1);
  const reply = Object.freeze({ kind: "text", text: "Integration reply" });
  const deliveryKey = await deriveBotReplyDeliveryKey(tenantId, {
    conversationKey,
    inboundMessageKey,
    botFlowVersionKey: first.botFlowVersionKey,
    replyIndex: 1,
    reply,
  });
  const deliveryInput = Object.freeze({
    deliveryKey,
    tenantId,
    conversationKey,
    inboundMessageKey,
    botFlowKey,
    botFlowVersionKey: first.botFlowVersionKey,
    replyIndex: 1,
    recipientPhoneNumber: phone.rows[0].phoneNumber,
    reply,
  });
  const staged = await Promise.all([
    foundation.botReplyDeliveries.stage(deliveryInput),
    foundation.botReplyDeliveries.stage(deliveryInput),
  ]);
  assert.deepEqual(
    staged.map(({ outcome }) => outcome).sort(),
    ["created", "duplicate"],
  );
  const createdDelivery = staged.find(({ outcome }) => outcome === "created")
    ?.delivery;
  assert.ok(createdDelivery);
  const claimAt = new Date(
    Date.parse(createdDelivery.createdAt) + 1_000,
  ).toISOString();
  const claims = await Promise.all([
    foundation.botReplyDeliveries.claim(tenantId, deliveryKey, claimAt),
    foundation.botReplyDeliveries.claim(tenantId, deliveryKey, claimAt),
  ]);
  assert.deepEqual(
    claims.map(({ outcome }) => outcome).sort(),
    ["claimed", "uncertain"],
  );
  const acceptedAt = new Date(Date.parse(claimAt) + 1_000).toISOString();
  const accepted = await foundation.botReplyDeliveries.markAccepted(
    tenantId,
    deliveryKey,
    "wamid.bot-integration-1",
    acceptedAt,
  );
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.attemptCount, 1);

  const persisted = await pool.query(
    `SELECT
       flow.status AS flow_status,
       flow.version AS flow_version,
       count(version.bot_flow_version_key)::integer AS version_count,
       max(delivery.status) AS delivery_status
     FROM bot_flows AS flow
     INNER JOIN bot_flow_versions AS version
       ON version.tenant_id = flow.tenant_id
      AND version.bot_flow_key = flow.bot_flow_key
     LEFT JOIN bot_reply_deliveries AS delivery
       ON delivery.tenant_id = flow.tenant_id
      AND delivery.bot_flow_key = flow.bot_flow_key
     WHERE flow.tenant_id = $1
       AND flow.bot_flow_key = $2
     GROUP BY flow.status, flow.version`,
    [tenantId, botFlowKey],
  );
  assert.deepEqual(persisted.rows, [{
    flow_status: "active",
    flow_version: 3,
    version_count: 2,
    delivery_status: "accepted",
  }]);
}

async function verifyKnowledgeLifecycle(pool, foundation, tenantId) {
  const sourceContent =
    "שעות הפעילות מופיעות באתר. ניתן לפנות לשירות דרך WhatsApp.";
  const contentSha256 = await sha256Hex(
    new TextEncoder().encode(sourceContent),
  );
  const sourceKey = await deriveKnowledgeSourceKey(
    tenantId,
    contentSha256,
  );
  const registerInput = Object.freeze({
    tenantId,
    sourceKey,
    contentSha256,
    fileName: "service-policy.txt",
    mediaType: "text/plain",
    sizeBytes: new TextEncoder().encode(sourceContent).byteLength,
  });
  const registrations = await Promise.all([
    foundation.knowledgeSources.registerUploaded(registerInput),
    foundation.knowledgeSources.registerUploaded(registerInput),
  ]);
  assert.deepEqual(
    registrations.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );

  const transition = (expectedVersion, action) => Object.freeze({
    tenantId,
    sourceKey,
    expectedVersion,
    action,
    errorCode: null,
  });
  const validation = await Promise.all([
    foundation.knowledgeSources.transition(
      transition(1, "validation-passed"),
    ),
    foundation.knowledgeSources.transition(
      transition(1, "validation-passed"),
    ),
  ]);
  assert.deepEqual(
    validation.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );
  const scanning = await Promise.all([
    foundation.knowledgeSources.transition(transition(2, "scan-started")),
    foundation.knowledgeSources.transition(transition(2, "scan-started")),
  ]);
  assert.deepEqual(
    scanning.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );
  const recovery = await Promise.all([
    foundation.knowledgeSources.transition(
      transition(3, "scan-retry-started"),
    ),
    foundation.knowledgeSources.transition(
      transition(3, "scan-retry-started"),
    ),
  ]);
  assert.deepEqual(
    recovery.map(({ outcome }) => outcome).sort(),
    ["conflict", "updated"],
  );

  async function passage(passageOrdinal, content) {
    const passageDigest = await sha256Hex(
      new TextEncoder().encode(content),
    );
    return Object.freeze({
      passageKey: await deriveKnowledgePassageKey(
        tenantId,
        sourceKey,
        passageOrdinal,
        passageDigest,
      ),
      passageOrdinal,
      contentSha256: passageDigest,
      content,
    });
  }
  const passages = Object.freeze([
    await passage(1, "שעות הפעילות מופיעות באתר."),
    await passage(2, "ניתן לפנות לשירות דרך WhatsApp."),
  ]);
  const processingInput = Object.freeze({
    tenantId,
    sourceKey,
    expectedSourceVersion: 4,
    passages,
  });
  const processing = await Promise.all([
    foundation.knowledgePassages.storeProcessedAndMarkReady(processingInput),
    foundation.knowledgePassages.storeProcessedAndMarkReady(processingInput),
  ]);
  assert.deepEqual(
    processing.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );
  const approved = await foundation.knowledgePassages
    .listApprovedBySourceKeys(tenantId, [sourceKey], 100);
  assert.equal(approved.length, 2);
  assert.deepEqual(
    approved.map(({ passageOrdinal }) => passageOrdinal),
    [1, 2],
  );

  const persisted = await pool.query(
    `SELECT
       source.status,
       source.version,
       count(passage.passage_key)::integer AS passage_count
     FROM knowledge_sources AS source
     INNER JOIN knowledge_passages AS passage
       ON passage.tenant_id = source.tenant_id
      AND passage.source_key = source.source_key
     WHERE source.tenant_id = $1
       AND source.source_key = $2
     GROUP BY source.status, source.version`,
    [tenantId, sourceKey],
  );
  assert.deepEqual(persisted.rows, [{
    status: "ready",
    version: 5,
    passage_count: 2,
  }]);
  await assert.rejects(
    pool.query(
      `UPDATE knowledge_sources
       SET ready_at = NULL
       WHERE tenant_id = $1
         AND source_key = $2`,
      [tenantId, sourceKey],
    ),
    (error) => error?.code === "23514",
  );

  return sourceKey;
}

async function verifyAiAgentLifecycle(
  pool,
  foundation,
  tenantId,
  sourceKey,
) {
  const name = "PostgreSQL integration AI agent";
  const aiAgentKey = await deriveAiAgentKey(tenantId, name);

  async function agentVersion(versionNumber) {
    const definition = Object.freeze({
      name,
      systemPrompt: versionNumber === 1
        ? "Answer only from approved knowledge sources."
        : "Answer concisely and only from approved knowledge sources.",
      handoffMessage: "Approved knowledge is unavailable. Escalating to an agent.",
      responseMode: "agent-approval",
      minimumGroundingScoreBasisPoints: 8_000,
      monthlyCostLimitMinorUnits: 50_000,
      billingCurrency: "ILS",
      knowledgeSourceKeys: Object.freeze([sourceKey]),
    });
    return Object.freeze({
      tenantId,
      aiAgentKey,
      aiAgentVersionKey: await deriveAiAgentVersionKey(
        tenantId,
        aiAgentKey,
        versionNumber,
        definition,
      ),
      versionNumber,
      definition,
    });
  }

  const first = await agentVersion(1);
  const firstDrafts = await Promise.all([
    foundation.aiAgents.saveDraft(Object.freeze({
      ...first,
      expectedAgentVersion: null,
    })),
    foundation.aiAgents.saveDraft(Object.freeze({
      ...first,
      expectedAgentVersion: null,
    })),
  ]);
  assert.deepEqual(
    firstDrafts.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );

  const firstPublications = await Promise.all([
    foundation.aiAgents.publishDraft(
      tenantId,
      aiAgentKey,
      first.aiAgentVersionKey,
      1,
    ),
    foundation.aiAgents.publishDraft(
      tenantId,
      aiAgentKey,
      first.aiAgentVersionKey,
      1,
    ),
  ]);
  assert.deepEqual(
    firstPublications.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );

  const second = await agentVersion(2);
  const secondDrafts = await Promise.all([
    foundation.aiAgents.saveDraft(Object.freeze({
      ...second,
      expectedAgentVersion: 2,
    })),
    foundation.aiAgents.saveDraft(Object.freeze({
      ...second,
      expectedAgentVersion: 2,
    })),
  ]);
  assert.deepEqual(
    secondDrafts.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );

  const secondPublications = await Promise.all([
    foundation.aiAgents.publishDraft(
      tenantId,
      aiAgentKey,
      second.aiAgentVersionKey,
      3,
    ),
    foundation.aiAgents.publishDraft(
      tenantId,
      aiAgentKey,
      second.aiAgentVersionKey,
      3,
    ),
  ]);
  assert.deepEqual(
    secondPublications.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );

  const versions = await foundation.aiAgents.listVersions(
    tenantId,
    aiAgentKey,
    10,
  );
  assert.deepEqual(
    versions.map(({ versionNumber, status }) => ({ versionNumber, status })),
    [
      { versionNumber: 2, status: "published" },
      { versionNumber: 1, status: "archived" },
    ],
  );
  assert.equal(
    (await foundation.aiAgents.listActiveByTenant(tenantId, 100)).some(
      ({ aiAgentKey: storedKey }) => storedKey === aiAgentKey,
    ),
    true,
  );

  const persisted = await pool.query(
    `SELECT
       agent.status AS agent_status,
       agent.version AS agent_version,
       count(DISTINCT version.ai_agent_version_key)::integer AS version_count,
       count(link.source_key)::integer AS source_link_count
     FROM ai_agents AS agent
     INNER JOIN ai_agent_versions AS version
       ON version.tenant_id = agent.tenant_id
      AND version.ai_agent_key = agent.ai_agent_key
     INNER JOIN ai_agent_version_sources AS link
       ON link.tenant_id = version.tenant_id
      AND link.ai_agent_version_key = version.ai_agent_version_key
     WHERE agent.tenant_id = $1
       AND agent.ai_agent_key = $2
     GROUP BY agent.status, agent.version`,
    [tenantId, aiAgentKey],
  );
  assert.deepEqual(persisted.rows, [{
    agent_status: "active",
    agent_version: 4,
    version_count: 2,
    source_link_count: 2,
  }]);
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

async function verifyWorkerSchedulerLease(pool, foundation) {
  const firstTick = "2026-08-17T10:00:00.000Z";
  const firstObservedAt = "2026-08-17T10:00:15.000Z";
  const firstOwner = `scheduler_owner_v1_${"1".repeat(64)}`;
  const secondOwner = `scheduler_owner_v1_${"2".repeat(64)}`;
  const claimCommand = (ownerKey) => ({
    schedulerId: railwayWorkerSchedulerId,
    ownerKey,
    currentTick: firstTick,
    observedAt: firstObservedAt,
    leaseSeconds: 60,
    maximumCatchUpTicks: 5,
  });
  const concurrent = await Promise.all([
    foundation.workerSchedulerLeases.claimNext(claimCommand(firstOwner)),
    foundation.workerSchedulerLeases.claimNext(claimCommand(secondOwner)),
  ]);
  assert.deepEqual(
    concurrent.map(({ outcome }) => outcome).sort(),
    ["claimed", "not-claimed"],
  );
  const firstClaim = concurrent.find(({ outcome }) => outcome === "claimed");
  assert.equal(firstClaim?.outcome, "claimed");
  assert.equal(firstClaim.claim.tick, firstTick);
  assert.deepEqual(
    await foundation.workerSchedulerLeases.complete({
      schedulerId: railwayWorkerSchedulerId,
      ownerKey: firstClaim.claim.ownerKey,
      fencingToken: firstClaim.claim.fencingToken,
      tick: firstClaim.claim.tick,
      completedAt: "2026-08-17T10:00:20.000Z",
    }),
    { outcome: "completed", completedTick: firstTick },
  );

  const catchUpTicks = [];
  for (let minute = 1; minute <= 4; minute += 1) {
    const catchUp = await foundation.workerSchedulerLeases.claimNext({
      schedulerId: railwayWorkerSchedulerId,
      ownerKey: firstOwner,
      currentTick: "2026-08-17T10:04:00.000Z",
      observedAt: "2026-08-17T10:04:15.000Z",
      leaseSeconds: 60,
      maximumCatchUpTicks: 5,
    });
    assert.equal(catchUp.outcome, "claimed");
    catchUpTicks.push(catchUp.claim.tick);
    assert.deepEqual(
      await foundation.workerSchedulerLeases.complete({
        schedulerId: railwayWorkerSchedulerId,
        ownerKey: catchUp.claim.ownerKey,
        fencingToken: catchUp.claim.fencingToken,
        tick: catchUp.claim.tick,
        completedAt: "2026-08-17T10:04:20.000Z",
      }),
      { outcome: "completed", completedTick: catchUp.claim.tick },
    );
  }
  assert.deepEqual(catchUpTicks, [
    "2026-08-17T10:01:00.000Z",
    "2026-08-17T10:02:00.000Z",
    "2026-08-17T10:03:00.000Z",
    "2026-08-17T10:04:00.000Z",
  ]);

  const expiring = await foundation.workerSchedulerLeases.claimNext({
    schedulerId: railwayWorkerSchedulerId,
    ownerKey: firstOwner,
    currentTick: "2026-08-17T10:05:00.000Z",
    observedAt: "2026-08-17T10:05:00.000Z",
    leaseSeconds: 60,
    maximumCatchUpTicks: 5,
  });
  assert.equal(expiring.outcome, "claimed");
  const takeover = await foundation.workerSchedulerLeases.claimNext({
    schedulerId: railwayWorkerSchedulerId,
    ownerKey: secondOwner,
    currentTick: "2026-08-17T10:06:00.000Z",
    observedAt: "2026-08-17T10:06:01.000Z",
    leaseSeconds: 60,
    maximumCatchUpTicks: 5,
  });
  assert.equal(takeover.outcome, "claimed");
  assert.equal(takeover.claim.tick, expiring.claim.tick);
  assert.equal(takeover.claim.fencingToken > expiring.claim.fencingToken, true);
  assert.deepEqual(
    await foundation.workerSchedulerLeases.complete({
      schedulerId: railwayWorkerSchedulerId,
      ownerKey: expiring.claim.ownerKey,
      fencingToken: expiring.claim.fencingToken,
      tick: expiring.claim.tick,
      completedAt: "2026-08-17T10:06:02.000Z",
    }),
    { outcome: "claim-lost", completedTick: null },
  );
  assert.deepEqual(
    await foundation.workerSchedulerLeases.complete({
      schedulerId: railwayWorkerSchedulerId,
      ownerKey: takeover.claim.ownerKey,
      fencingToken: takeover.claim.fencingToken,
      tick: takeover.claim.tick,
      completedAt: "2026-08-17T10:06:03.000Z",
    }),
    { outcome: "completed", completedTick: takeover.claim.tick },
  );

  const rows = await pool.query(
    `SELECT
       state,
       current_tick AS "currentTick",
       last_completed_tick AS "lastCompletedTick"
     FROM worker_scheduler_leases
     WHERE scheduler_id = $1`,
    [railwayWorkerSchedulerId],
  );
  assert.equal(rows.rowCount, 1);
  assert.equal(rows.rows[0]?.state, "completed");
  assert.equal(
    rows.rows[0]?.currentTick.toISOString(),
    "2026-08-17T10:05:00.000Z",
  );
  assert.equal(
    rows.rows[0]?.lastCompletedTick.toISOString(),
    "2026-08-17T10:05:00.000Z",
  );
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
      await verifyMetaConnectionCredentials(pool, foundation, tenantId);
      const whatsappPolicyEventKey =
        await verifyWhatsappDeliveryPolicy(
          pool,
          foundation,
          tenantId,
        );
      await verifyWhatsappRateLimitLedger(
        pool,
        foundation,
        tenantId,
        whatsappPolicyEventKey,
      );
      await verifyConversationMessageSchema(pool, tenantId);
      await verifyTemplateCampaignSchema(pool, tenantId);
      await verifyBotDeliverySchema(pool, tenantId);
      await verifyAiReportingSchema(pool, foundation, tenantId);
      await verifyPostgresHttpRuntime(checkedConnectionString);
      await verifyConversationLifecycle(pool, foundation, tenantId);
      await verifyBotFlowDeliveryLifecycle(pool, foundation, tenantId);
      const sourceKey = await verifyKnowledgeLifecycle(
        pool,
        foundation,
        tenantId,
      );
      await verifyAiAgentLifecycle(pool, foundation, tenantId, sourceKey);
      await verifyInvitationLifecycle(pool, foundation, tenantId);
      await verifyWorkerSchedulerLease(pool, foundation);
      await verifyCampaignDispatch(pool, foundation, tenantId);
    } finally {
      await foundation.close();
    }

    return Object.freeze({
      status: "passed",
      migrationCount: migrationFiles.length,
      concurrencyScenarios: 36,
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
