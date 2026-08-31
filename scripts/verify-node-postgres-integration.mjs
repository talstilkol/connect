import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import {
  readFileSync,
  readdirSync,
} from "node:fs";
import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";
import { DatabaseSync } from "node:sqlite";

import pg from "pg";

import {
  createNodePostgresQueryExecutor,
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  createPostgresBotReplyStagingSafetyRepository,
} from "../server/platform/postgresBotReplyStagingSafetyRepository.ts";
import {
  POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION,
  PostgresFullDataMigrationCutoverError,
  createPostgresFullDataMigrationCutoverPreflight,
  executePostgresFullDataMigrationCutover,
} from "../server/platform/postgresFullDataMigrationCutover.ts";
import {
  readD1FullDataMigrationSnapshot,
} from "./read-d1-full-data-migration-snapshot.mjs";
import {
  verifyBotReplyStagingAttestationNoncePostgres,
} from "./verify-bot-reply-staging-attestation-nonce-postgres.mjs";
import {
  verifyBotReplyStagingAttestedEvidencePostgres,
} from "./verify-bot-reply-staging-attested-evidence-postgres.mjs";
import {
  verifyBotReplyStagingProviderOperationFencePostgres,
} from "./verify-bot-reply-staging-provider-operation-fence-postgres.mjs";
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
  createBotReplyAdmission,
} from "../server/bot/botReplyAdmission.ts";
import {
  createBotReplyDeliveryWorker,
} from "../server/bot/botReplyDeliveryWorker.ts";
import {
  createMetaBotReplyProcessor,
} from "../server/bot/metaBotReplyProcessor.ts";
import {
  createCampaignDeliveryRateLimitPolicySource,
} from "../server/campaigns/d1CampaignDeliveryRateLimitPolicySource.ts";
import {
  createWhatsappRateLimitKeyDeriver,
} from "../server/campaigns/whatsappRateLimitKeyDeriver.ts";
import {
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "../server/operations/botReplyStagingDurableRunner.ts";
import {
  deriveBotReplyStagingReceiptDigest,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgePassageKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  deriveAiReplyOutboxKey,
} from "../server/ai/aiReplyOutboxKey.ts";
import {
  deriveAiProviderRequestKey,
  deriveAiRuntimeAuditKey,
} from "../server/ai/aiRuntimeKey.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  RAILWAY_API_ENDPOINT_PATH,
  VERCEL_OIDC_HEADER,
} from "../server/platform/railwayApiContract.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
  deriveRailwayApiMutationRequestDigest,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
} from "../server/platform/railwayMessageTemplateSubmissionMutationExecutor.ts";
import {
  deriveTeamInvitationDeliveryKey,
} from "../server/team/teamInvitationKey.ts";
import {
  deriveTeamMemberKey,
} from "../server/team/teamMemberKey.ts";
import {
  deriveContactConsentEventKey,
} from "../server/contacts/contactConsentEventKey.ts";
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
  "0017_ai_reply_outbox.sql",
  "0018_tenant_subscriptions.sql",
  "0019_production_decisions.sql",
  "0020_system_admin_business_profiles.sql",
  "0021_contact_consent_events.sql",
  "0022_campaign_delivery_provider_links.sql",
  "0023_api_mutation_rate_limits.sql",
  "0024_whatsapp_legacy_reservation_category.sql",
  "0025_data_migration_bundle_receipts.sql",
  "0026_message_template_submission_outbox.sql",
  "0027_clerk_organization_binding.sql",
  "0028_clerk_invitation_rate_limit.sql",
  "0029_team_invitation_delivery_deferrals.sql",
  "0030_whatsapp_service_reply_reservations.sql",
  "0031_bot_reply_delivery_deferrals.sql",
  "0032_bot_reply_delivery_provider_links.sql",
  "0033_bot_reply_staging_runs.sql",
  "0034_bot_reply_staging_authorizations.sql",
  "0035_bot_reply_staging_observations.sql",
  "0036_bot_reply_provider_attempt_provenance.sql",
  "0037_inbound_button_reply_provenance.sql",
  "0038_bot_reply_service_window_rejection_provenance.sql",
  "0039_bot_reply_provider_request_fence.sql",
  "0040_bot_reply_staging_release_evidence.sql",
  "0041_production_readiness_release_evidence_v2.sql",
  "0042_bot_reply_provider_outcome_request_fence.sql",
  "0043_bot_reply_staging_release_evidence_operator_audit.sql",
  "0044_bot_reply_staging_release_evidence_atomic_publish.sql",
  "0045_bot_reply_provider_clock_domains.sql",
  "0046_bot_reply_staging_release_evidence_atomic_initialize.sql",
  "0047_bot_reply_staging_attestation_nonce_ledger.sql",
  "0048_bot_reply_staging_attested_evidence_atomic_publish.sql",
  "0049_bot_reply_staging_attested_evidence_readback.sql",
  "0050_bot_reply_staging_trigger_hardening.sql",
  "0051_bot_reply_staging_run_capability_wrappers.sql",
  "0052_bot_reply_staging_authorization_observation_hardening.sql",
  "0053_bot_reply_staging_provider_operation_fence.sql",
]);

function postgresEnvironment(connectionString) {
  const runtimeUrl = new URL(connectionString);
  return {
    APP_RUNTIME_ENVIRONMENT: "test",
    DATABASE_URL: runtimeUrl.toString(),
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

async function verifyFullDataMigrationBundle(pool, transactions) {
  const sourceDatabase = new DatabaseSync(":memory:");
  const evidenceHmacKey = Buffer.alloc(32, 29).toString("base64");
  const createdAt = "2026-08-17T07:00:00.000Z";
  const now = "2026-08-17T07:05:00.000Z";
  try {
    sourceDatabase.exec("PRAGMA foreign_keys = ON");
    for (const fileName of readdirSync(join(projectRoot, "drizzle"))
      .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
      .sort()) {
      sourceDatabase.exec(
        readFileSync(join(projectRoot, "drizzle", fileName), "utf8")
          .replaceAll("--> statement-breakpoint", ""),
      );
    }
    const source = readD1FullDataMigrationSnapshot(sourceDatabase);
    const preflight = createPostgresFullDataMigrationCutoverPreflight({
      snapshots: source.slices,
      startedAt: createdAt,
      evidenceHmacKey,
    });
    assert.equal(preflight.expiresAt, "2026-08-17T07:10:00.000Z");
    const evidence = await executePostgresFullDataMigrationCutover({
      snapshots: source.slices,
      startedAt: now,
      transactions,
      evidenceHmacKey,
      approvedSourceDigest: preflight.sourceDigest,
      confirmation: POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION,
      targetEnvironment: "staging",
    });
    assert.equal(evidence.sliceCount, 10);
    assert.equal(evidence.tableCount, 55);
    assert.equal(evidence.totalRowCount, 0);
    assert.match(evidence.evidenceDigest, /^hmac_sha256_v1_[0-9a-f]{64}$/);

    await assert.rejects(
      executePostgresFullDataMigrationCutover({
        snapshots: source.slices,
        startedAt: now,
        transactions,
        evidenceHmacKey,
        approvedSourceDigest: preflight.sourceDigest,
        confirmation: POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION,
        targetEnvironment: "staging",
      }),
      (error) => error instanceof PostgresFullDataMigrationCutoverError &&
        error.code === "target-already-cut-over",
    );
    const receipt = await pool.query(
      `SELECT
         bundle_id AS "bundleId",
         source_digest AS "sourceDigest",
         evidence_digest AS "evidenceDigest",
         slice_count AS "sliceCount",
         table_count AS "tableCount",
         total_row_count AS "totalRowCount"
       FROM data_migration_bundle_receipts`,
      [],
    );
    assert.equal(receipt.rowCount, 1);
    assert.equal(receipt.rows[0]?.bundleId, evidence.bundleId);
    assert.equal(receipt.rows[0]?.sourceDigest, preflight.sourceDigest);
    assert.equal(receipt.rows[0]?.evidenceDigest, evidence.evidenceDigest);
    assert.equal(receipt.rows[0]?.sliceCount, 10);
    assert.equal(receipt.rows[0]?.tableCount, 55);
    assert.equal(Number(receipt.rows[0]?.totalRowCount), 0);
  } finally {
    sourceDatabase.close();
  }
}

async function createTenant(
  pool,
  externalUserId = "driver-integration-owner",
  displayName = "Driver integration tenant",
) {
  const occurredAt = "2026-08-17T08:00:00.000Z";
  const result = await pool.query(
    `INSERT INTO tenants (
       display_name, status, created_at, updated_at
     )
     VALUES ($1, 'active', $2::timestamptz, $2::timestamptz)
     RETURNING id`,
    [
      displayName,
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
     VALUES ($1, $2, 'owner', 'active', 1, $3, $3)`,
    [tenantId, externalUserId, occurredAt],
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

async function verifyContactConsentLifecycle(pool, foundation, tenantId) {
  const createdAt = "2026-08-19T08:15:00.000Z";
  const inserted = await pool.query(
    `INSERT INTO contacts (
       tenant_id,
       phone_e164,
       first_name,
       mailing_status,
       consent_status,
       version,
       created_at,
       updated_at
     ) VALUES (
       $1, '+972501234579', 'Consent',
       'unsubscribed', 'unknown', 1,
       $2::timestamptz, $2::timestamptz
     )
     RETURNING id`,
    [tenantId, createdAt],
  );
  const contactId = Number(inserted.rows[0]?.id);
  assert.equal(Number.isSafeInteger(contactId) && contactId > 0, true);

  const actorExternalUserId = "driver-integration-owner";
  const consentInput = async (eventType, occurredAt, evidenceReference) => {
    const identity = Object.freeze({
      tenantId,
      contactId,
      eventType,
      source: "documented-whatsapp-opt-in",
      occurredAt,
      evidenceReference,
      actorExternalUserId,
    });
    return Object.freeze({
      ...identity,
      idempotencyKey: await deriveContactConsentEventKey(identity),
    });
  };

  const grant = await consentInput(
    "granted",
    "2026-08-20T09:00:00.000Z",
    "consent-proof-granted",
  );
  const exact = await Promise.all([
    foundation.contactConsents.recordEvent(grant),
    foundation.contactConsents.recordEvent(grant),
  ]);
  assert.deepEqual(exact.map(({ version }) => version), [2, 2]);
  assert.equal(exact.every(({ consentStatus }) => consentStatus === "granted"), true);

  const older = await consentInput(
    "unsubscribed",
    "2026-08-19T09:00:00.000Z",
    "consent-proof-older-unsubscribe",
  );
  const newer = await consentInput(
    "unsubscribed",
    "2026-08-21T09:00:00.000Z",
    "consent-proof-newer-unsubscribe",
  );
  await Promise.all([
    foundation.contactConsents.recordEvent(older),
    foundation.contactConsents.recordEvent(newer),
  ]);

  const persisted = await pool.query(
    `SELECT
       contact.mailing_status AS "mailingStatus",
       contact.consent_status AS "consentStatus",
       contact.consent_recorded_at AS "consentRecordedAt",
       contact.consent_withdrawn_at AS "consentWithdrawnAt",
       contact.consent_evidence_reference AS "evidenceReference",
       contact.version,
       count(event.id)::integer AS "eventCount"
     FROM contacts AS contact
     INNER JOIN contact_consent_events AS event
       ON event.tenant_id = contact.tenant_id
      AND event.contact_id = contact.id
     WHERE contact.tenant_id = $1
       AND contact.id = $2
     GROUP BY
       contact.mailing_status,
       contact.consent_status,
       contact.consent_recorded_at,
       contact.consent_withdrawn_at,
       contact.consent_evidence_reference,
       contact.version`,
    [tenantId, contactId],
  );
  assert.deepEqual(persisted.rows, [{
    mailingStatus: "unsubscribed",
    consentStatus: "withdrawn",
    consentRecordedAt: new Date(grant.occurredAt),
    consentWithdrawnAt: new Date(newer.occurredAt),
    evidenceReference: newer.evidenceReference,
    version: 3,
    eventCount: 3,
  }]);
  await assert.rejects(
    pool.query(
      `UPDATE contact_consent_events
       SET source = 'tampered'
       WHERE tenant_id = $1
         AND contact_id = $2`,
      [tenantId, contactId],
    ),
    /events are immutable/i,
  );
  await assert.rejects(
    pool.query(
      `DELETE FROM contact_consent_events
       WHERE tenant_id = $1
         AND contact_id = $2`,
      [tenantId, contactId],
    ),
    /events are immutable/i,
  );
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
  const importedContactId = Number(importResult.contacts[0]?.id);
  assert.equal(
    Number.isSafeInteger(importedContactId) && importedContactId > 0,
    true,
  );
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

  return Object.freeze({
    contactId,
    importedContactId,
    listId,
    otherTagId,
    tagId,
  });
}

async function verifyCampaignAudienceRead(
  foundation,
  tenantId,
  organization,
) {
  const actorExternalUserId = "driver-integration-owner";
  const recordConsent = async (contactId, eventType, occurredAt) => {
    const identity = Object.freeze({
      tenantId,
      contactId,
      eventType,
      source: "campaign-audience-integration",
      occurredAt,
      evidenceReference: `campaign-audience-consent-${contactId}-${eventType}`,
      actorExternalUserId,
    });
    await foundation.contactConsents.recordEvent(Object.freeze({
      ...identity,
      idempotencyKey: await deriveContactConsentEventKey(identity),
    }));
  };

  await recordConsent(
    organization.contactId,
    "granted",
    "2026-08-22T08:00:00.000Z",
  );
  await recordConsent(
    organization.importedContactId,
    "granted",
    "2026-08-22T08:01:00.000Z",
  );

  const all = await foundation.campaignAudiences.listEligibleBySource(
    tenantId,
    { kind: "all" },
    100,
  );
  const expectedAllIds = [
    organization.contactId,
    organization.importedContactId,
  ].sort((first, second) => first - second);
  assert.deepEqual(all.map(({ contactId }) => contactId), expectedAllIds);
  assert.equal(all.every(({ consentStatus }) => consentStatus === "granted"), true);

  const listed = await foundation.campaignAudiences.listEligibleBySource(
    tenantId,
    { kind: "list", listId: organization.listId },
    100,
  );
  const tagged = await foundation.campaignAudiences.listEligibleBySource(
    tenantId,
    { kind: "tag", tagId: organization.tagId },
    100,
  );
  assert.deepEqual(listed.map(({ contactId }) => contactId), [
    organization.contactId,
  ]);
  assert.deepEqual(tagged.map(({ contactId }) => contactId), [
    organization.contactId,
  ]);
  assert.deepEqual(
    await foundation.campaignAudiences.listEligibleBySource(
      tenantId,
      { kind: "tag", tagId: organization.otherTagId },
      100,
    ),
    [],
  );

  await recordConsent(
    organization.importedContactId,
    "unsubscribed",
    "2026-08-22T09:00:00.000Z",
  );
  const afterWithdrawal =
    await foundation.campaignAudiences.listEligibleBySource(
      tenantId,
      { kind: "all" },
      100,
    );
  assert.deepEqual(afterWithdrawal.map(({ contactId }) => contactId), [
    organization.contactId,
  ]);
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
      phoneNumberId: "155512345678901",
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
      phoneNumberId: "155512345678901",
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
      phoneNumberId: "155512345678901",
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

async function currentPostgresTimestamp(pool) {
  const result = await pool.query(
    `SELECT date_trunc('milliseconds', clock_timestamp()) AS "occurredAt"`,
  );
  const occurredAt = result.rows[0]?.occurredAt;

  if (!(occurredAt instanceof Date)) {
    fail("POSTGRES_CLOCK_INVALID");
  }

  return occurredAt.toISOString();
}

async function verifyMessageTemplateSubmissionOutboxLifecycle(
  pool,
  foundation,
) {
  const externalUserId = "template-submission-integration-owner";
  const displayName = "Template submission integration tenant";
  const tenantId = await createTenant(pool, externalUserId, displayName);
  const session = Object.freeze({
    tenantId,
    externalUserId,
    displayName,
    status: "active",
    role: "owner",
  });
  const templateKey = `template_v1_${"a".repeat(64)}`;

  await foundation.metaConnections.captureVerifiedAssets(session, {
    businessPortfolioId: "123456789012340",
    wabaId: "123456789012341",
    phoneNumberId: "123456789012342",
  });
  const connection = await foundation.metaConnections.confirmWebhookSubscription(
    session,
  );
  assert.equal(connection.status, "connected");
  assert.equal(connection.version, 2);

  const draft = await foundation.messageTemplates.saveDraft({
    tenantId,
    templateKey,
    name: "submission_integration_template",
    language: "he",
    category: "UTILITY",
    header: "",
    body: "Integration submission template",
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
  assert.equal(draft.status, "draft");

  const payload = Object.freeze({ templateKey });
  const [idempotencyKey, requestDigest] = await Promise.all([
    deriveRailwayApiDeterministicIdempotencyKey(
      RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
      payload,
    ),
    deriveRailwayApiMutationRequestDigest(
      RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
      payload,
    ),
  ]);
  const stagedAt = await currentPostgresTimestamp(pool);
  const executor =
    foundation.createRailwayMessageTemplateSubmissionMutationExecutor(
      "v23.0",
      () => stagedAt,
    );
  const command = Object.freeze({
    session,
    operation: RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
    idempotencyKey,
    requestDigest,
    payload,
  });
  const staged = await Promise.all([
    executor.execute(command),
    executor.execute(command),
  ]);

  assert.deepEqual(
    staged.map(({ outcome }) => outcome).sort(),
    ["committed", "replayed"],
  );
  assert.equal(staged.every(({ tenantId: resultTenantId }) => (
    resultTenantId === tenantId
  )), true);
  const submissionKey = staged[0].queueMessage?.submissionKey;
  assert.equal(
    staged.every(({ queueMessage }) => (
      queueMessage?.submissionKey === submissionKey
    )),
    true,
  );
  assert.match(
    submissionKey,
    /^template_submission_v1_[0-9a-f]{64}$/,
  );

  const pendingCutoff = await currentPostgresTimestamp(pool);
  const pending = await foundation.messageTemplateSubmissionOutbox
    .listPendingBefore(pendingCutoff, 10);
  assert.equal(
    pending.some((candidate) => candidate.submissionKey === submissionKey),
    true,
  );

  const claimedAt = await currentPostgresTimestamp(pool);
  const claimed = await foundation.messageTemplateSubmissionOutbox.claim(
    tenantId,
    submissionKey,
    "v23.0",
    claimedAt,
  );
  assert.equal(claimed.outcome, "claimed");
  assert.equal(claimed.prepared.outbox.status, "submitting");

  const ambiguousAt = await currentPostgresTimestamp(pool);
  const ambiguous = await foundation.messageTemplateSubmissionOutbox.claim(
    tenantId,
    submissionKey,
    "v23.0",
    ambiguousAt,
  );
  assert.equal(ambiguous.outcome, "ambiguous");
  assert.equal(ambiguous.outbox.lastErrorCode, "PROVIDER_OUTCOME_UNKNOWN");

  const ambiguousCutoff = await currentPostgresTimestamp(pool);
  const ambiguousCandidates = await foundation.messageTemplateSubmissionOutbox
    .listAmbiguousBefore(ambiguousCutoff, 10);
  assert.equal(
    ambiguousCandidates.some((candidate) => (
      candidate.submissionKey === submissionKey
    )),
    true,
  );

  const reconciledAt = await currentPostgresTimestamp(pool);
  const reconciled = await foundation.messageTemplateSubmissionOutbox
    .reconcileSubmitted(
      tenantId,
      submissionKey,
      "123456789012343",
      reconciledAt,
    );
  assert.equal(reconciled.status, "submitted");
  assert.equal(reconciled.stateVersion, 4);
  assert.equal(reconciled.metaTemplateId, "123456789012343");

  const persistedTemplate = await foundation.messageTemplates.findByKey(
    tenantId,
    templateKey,
  );
  assert.equal(persistedTemplate?.status, "pending_review");
  assert.equal(persistedTemplate?.submissionKey, submissionKey);
  assert.equal(persistedTemplate?.metaTemplateId, "123456789012343");

  const events = await pool.query(
    `SELECT event_type AS "eventType", to_version AS "toVersion"
     FROM message_template_submission_events
     WHERE tenant_id = $1
       AND submission_key = $2
     ORDER BY to_version ASC`,
    [tenantId, submissionKey],
  );
  assert.deepEqual(events.rows, [
    { eventType: "staged", toVersion: 1 },
    { eventType: "claimed", toVersion: 2 },
    { eventType: "ambiguous", toVersion: 3 },
    { eventType: "reconciled-submitted", toVersion: 4 },
  ]);
  await assert.rejects(
    pool.query(
      `UPDATE message_template_submission_events
       SET actor_external_user_id = actor_external_user_id || '-changed'
       WHERE tenant_id = $1
         AND submission_key = $2
         AND to_version = 1`,
      [tenantId, submissionKey],
    ),
    (error) => (
      error?.code === "23514" &&
      /message template submission events are immutable/.test(error.message)
    ),
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
    promotion.flat().map(({ campaignKey: promotedKey }) => promotedKey),
    [campaignKey],
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

async function verifyCampaignProviderReconciliation(
  pool,
  foundation,
  tenantId,
  policyEventKey,
) {
  const sourceCampaignKey = `campaign_v1_${"5".repeat(64)}`;
  const campaignKey = `campaign_v1_${"c".repeat(64)}`;
  const deliveryKey = `campaign_delivery_v1_${"d".repeat(64)}`;
  const reservationKey =
    `whatsapp_rate_reservation_v1_${"e".repeat(64)}`;
  const providerMessageId = "wamid.postgres-campaign-reconciliation";
  const policy = await pool.query(
    `SELECT recorded_at AS "recordedAt"
     FROM whatsapp_campaign_delivery_policy_events
     WHERE event_key = $1`,
    [policyEventKey],
  );
  assert.equal(policy.rowCount, 1);
  const policyRecordedAt = policy.rows[0].recordedAt.toISOString();
  const createdAt = policyRecordedAt;
  const reservedAt = new Date(
    Date.parse(policyRecordedAt) + 60_000,
  ).toISOString();
  const acceptedAt = new Date(
    Date.parse(reservedAt) + 1_000,
  ).toISOString();
  const deliveredAt = new Date(
    Date.parse(reservedAt) + 3_000,
  ).toISOString();
  const deliveredReconciledAt = new Date(
    Date.parse(deliveredAt) + 500,
  ).toISOString();
  const readAt = new Date(
    Date.parse(reservedAt) + 4_000,
  ).toISOString();
  const readReconciledAt = new Date(
    Date.parse(readAt) + 500,
  ).toISOString();
  const contact = await pool.query(
    `SELECT id, phone_e164 AS "phoneNumber", version
     FROM contacts
     WHERE tenant_id = $1
       AND mailing_status = 'subscribed'
       AND consent_status = 'granted'
     ORDER BY id ASC
     LIMIT 1`,
    [tenantId],
  );
  assert.equal(contact.rowCount, 1);

  const campaign = await pool.query(
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
       version,
       activated_at,
       started_at,
       created_at,
       updated_at
     )
     SELECT
       $3,
       tenant_id,
       'Provider reconciliation integration',
       'running',
       'immediate',
       NULL,
       timezone,
       template_key,
       template_snapshot_json,
       $4,
       1,
       3,
       $5::timestamptz,
       $5::timestamptz,
       $5::timestamptz,
       $5::timestamptz
     FROM campaigns
     WHERE tenant_id = $1
       AND campaign_key = $2
     RETURNING campaign_key AS "campaignKey"`,
    [
      tenantId,
      sourceCampaignKey,
      campaignKey,
      "f".repeat(64),
      createdAt,
    ],
  );
  assert.deepEqual(campaign.rows, [{ campaignKey }]);

  await pool.query(
    `INSERT INTO campaign_recipients (
       campaign_key,
       tenant_id,
       contact_id,
       contact_version,
       phone_e164,
       personalization_json,
       personalization_key,
       delivery_key,
       status,
       attempt_count,
       queued_at,
       created_at,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, $5,
       '{}'::jsonb, $6, $7,
       'sending', 1,
       $8::timestamptz, $8::timestamptz, $8::timestamptz
     )`,
    [
      campaignKey,
      tenantId,
      contact.rows[0].id,
      contact.rows[0].version,
      contact.rows[0].phoneNumber,
      "1".repeat(64),
      deliveryKey,
      createdAt,
    ],
  );

  const reservation =
    await foundation.whatsappRateLimits.reserveBusinessInitiatedMessage({
      reservationKey,
      tenantId,
      portfolioKey: `whatsapp_portfolio_v1_${"c".repeat(64)}`,
      senderKey: `whatsapp_sender_v1_${"d".repeat(64)}`,
      recipientKey: `whatsapp_recipient_v1_${"0".repeat(64)}`,
      policyEventKey,
      templateCategory: "UTILITY",
      portfolioCapacity: Object.freeze({
        kind: "bounded",
        maximumUniqueRecipients: 250,
      }),
      phoneThroughput: Object.freeze({
        maximumMessagesPerSecond: 20,
        maximumOutboundMessagesPerSecond: 2,
      }),
      reservedAt,
      reservationExpiresAt: new Date(
        Date.parse(reservedAt) + 300_000,
      ).toISOString(),
    });
  assert.equal(reservation.outcome, "reserved");

  const acceptance = Object.freeze({
    tenantId,
    deliveryKey,
    providerMessageId,
    reservationKey,
    acceptedAt,
  });
  const accepted = await Promise.all([
    foundation.campaignProviderDeliveries.recordAccepted(acceptance),
    foundation.campaignProviderDeliveries.recordAccepted(acceptance),
  ]);
  assert.deepEqual(
    accepted.map(({ outcome }) => outcome).sort(),
    ["idempotent", "recorded"],
  );

  const delivered = Object.freeze({
    tenantId,
    providerMessageId,
    status: "delivered",
    statusEventKey: "2".repeat(64),
    statusEventAt: deliveredAt,
    reconciledAt: deliveredReconciledAt,
  });
  const reconciled = await Promise.all([
    foundation.campaignProviderDeliveries.applyProviderStatus(delivered),
    foundation.campaignProviderDeliveries.applyProviderStatus(delivered),
  ]);
  assert.deepEqual(
    reconciled.map(({ outcome }) => outcome).sort(),
    ["applied", "duplicate"],
  );
  assert.equal(
    reconciled.every(
      (result) =>
        "settlement" in result &&
        result.settlement?.reservationKey === reservationKey &&
        result.settlement?.outcome === "delivered" &&
        result.settlement?.settledAt === deliveredReconciledAt,
    ),
    true,
  );

  assert.equal(
    (await foundation.campaignProviderDeliveries.applyProviderStatus({
      ...delivered,
      status: "read",
    })).outcome,
    "event-conflict",
  );
  assert.equal(
    (await foundation.campaignProviderDeliveries.applyProviderStatus({
      ...delivered,
      status: "failed",
      statusEventKey: "3".repeat(64),
      statusEventAt: readAt,
    })).outcome,
    "terminal-conflict",
  );
  assert.equal(
    (await foundation.campaignProviderDeliveries.applyProviderStatus({
      ...delivered,
      status: "sent",
      statusEventKey: "4".repeat(64),
      statusEventAt: readAt,
    })).outcome,
    "stale",
  );
  const read = await foundation.campaignProviderDeliveries.applyProviderStatus({
    ...delivered,
    status: "read",
    statusEventKey: "5".repeat(64),
    statusEventAt: readAt,
    reconciledAt: readReconciledAt,
  });
  assert.equal(read.outcome, "applied");
  assert.equal("link" in read ? read.link.recipientStatus : null, "read");

  const evidence = await pool.query(
    `SELECT
       link.provider_status AS "providerStatus",
       link.terminal_outcome AS "terminalOutcome",
       link.terminal_settled_at AS "terminalSettledAt",
       recipient.status AS "recipientStatus",
       settlement.outcome AS "settlementOutcome",
       settlement.settled_at AS "settlementAt",
       portfolio.active_reservation_key AS "activeReservationKey",
       portfolio.last_delivered_at AS "lastDeliveredAt"
     FROM campaign_delivery_provider_links AS link
     INNER JOIN campaign_recipients AS recipient
       ON recipient.delivery_key = link.delivery_key
      AND recipient.tenant_id = link.tenant_id
     INNER JOIN whatsapp_rate_limit_reservations AS reservation
       ON reservation.reservation_key = link.reservation_key
     INNER JOIN whatsapp_rate_limit_settlements AS settlement
       ON settlement.reservation_key = reservation.reservation_key
     INNER JOIN whatsapp_portfolio_recipient_rate_limit_state AS portfolio
       ON portfolio.portfolio_key = reservation.portfolio_key
      AND portfolio.recipient_key = reservation.recipient_key
     WHERE link.tenant_id = $1
       AND link.delivery_key = $2`,
    [tenantId, deliveryKey],
  );
  assert.deepEqual(evidence.rows, [{
    providerStatus: "read",
    terminalOutcome: "delivered",
    terminalSettledAt: new Date(deliveredReconciledAt),
    recipientStatus: "read",
    settlementOutcome: "delivered",
    settlementAt: new Date(deliveredReconciledAt),
    activeReservationKey: null,
    lastDeliveredAt: new Date(deliveredReconciledAt),
  }]);

  await assert.rejects(
    pool.query(
      `UPDATE campaign_delivery_provider_links
       SET provider_message_id = 'wamid.tampered'
       WHERE delivery_key = $1`,
      [deliveryKey],
    ),
    /identity is immutable/i,
  );
  await assert.rejects(
    pool.query(
      `UPDATE campaign_delivery_provider_links
       SET
         last_status_event_key = $2,
         last_status_event_at = $3::timestamptz,
         updated_at = $3::timestamptz
       WHERE delivery_key = $1`,
      [deliveryKey, "6".repeat(64), deliveredAt],
    ),
    /status does not advance/i,
  );
  await assert.rejects(
    pool.query(
      `DELETE FROM campaign_delivery_provider_links
       WHERE delivery_key = $1`,
      [deliveryKey],
    ),
    /immutable evidence/i,
  );

  const conversation = await pool.query(
    `SELECT conversation_key AS "conversationKey"
     FROM conversations
     WHERE tenant_id = $1
     ORDER BY conversation_key ASC
     LIMIT 1`,
    [tenantId],
  );
  assert.equal(conversation.rowCount, 1);
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
         status_updated_at,
         created_at,
         updated_at
       ) VALUES (
         $1, $2, $3, $4,
         'outbound', 'text', 'sent',
         'Provider collision proof',
         $5::timestamptz, $5::timestamptz,
         $5::timestamptz, $5::timestamptz
       )`,
      [
        `message_v1_${"f".repeat(64)}`,
        conversation.rows[0].conversationKey,
        tenantId,
        providerMessageId,
        acceptedAt,
      ],
    ),
    /already belongs to a campaign delivery/i,
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
       sender_phone_number_id,
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
       '155512345678901',
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
    senderPhoneNumberId: "155512345678901",
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
  const latestPolicyVersion = await pool.query(
    `SELECT max(policy_version)::integer AS version
     FROM whatsapp_campaign_delivery_policy_events
     WHERE tenant_id = $1`,
    [tenantId],
  );
  const currentPolicyRecordedAt = createdDelivery.createdAt;
  const currentPolicy =
    await foundation.whatsappDeliveryPolicies.recordPolicyEvent({
      tenantId,
      connectionVersion: 2,
      expectedPolicyVersion:
        latestPolicyVersion.rows[0].version,
      deliveryState: "enabled",
      portfolioLimitKind: "bounded",
      portfolioLimitValue: 250,
      phoneThroughputMessagesPerSecond: 20,
      maximumOutboundMessagesPerSecond: 2,
      reservationDurationSeconds: 300,
      metaGraphApiVersion: "v21.0",
      evidenceDigest: "b".repeat(64),
      evidenceCheckedAt: new Date(
        Date.parse(currentPolicyRecordedAt) - 60_000,
      ).toISOString(),
      evidenceExpiresAt: new Date(
        Date.parse(currentPolicyRecordedAt) + 86_400_000,
      ).toISOString(),
      actorExternalUserId: "tal-rate-limit-research",
      recordedAt: currentPolicyRecordedAt,
    });
  assert.notEqual(currentPolicy.outcome, "unchanged");
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
  const botReservationKey =
    `whatsapp_rate_reservation_v1_${"b".repeat(64)}`;
  const botReservation =
    await foundation.whatsappRateLimits.reserveServiceReply({
      reservationKey: botReservationKey,
      tenantId,
      portfolioKey: `whatsapp_portfolio_v1_${"c".repeat(64)}`,
      senderKey: `whatsapp_sender_v1_${"d".repeat(64)}`,
      recipientKey: `whatsapp_recipient_v1_${"e".repeat(64)}`,
      policyEventKey: currentPolicy.record.eventKey,
      portfolioCapacity: Object.freeze({
        kind: "bounded",
        maximumUniqueRecipients: 250,
      }),
      phoneThroughput: Object.freeze({
        maximumMessagesPerSecond: 20,
        maximumOutboundMessagesPerSecond: 2,
      }),
      reservedAt: claimAt,
      reservationExpiresAt: new Date(
        Date.parse(claimAt) + 300_000,
      ).toISOString(),
    });
  assert.equal(botReservation.outcome, "reserved");
  const claimedDelivery = claims.find(
    ({ outcome }) => outcome === "claimed",
  ).delivery;
  const providerRequestInput = Object.freeze({
    tenantId,
    deliveryKey,
    expectedClaimVersion: claimedDelivery.claimVersion,
    reservationKey: botReservationKey,
    requestedAt: claimAt,
  });
  const providerRequestClaims = await Promise.all([
    foundation.botReplyDeliveries.claimProviderRequest(providerRequestInput),
    foundation.botReplyDeliveries.claimProviderRequest(providerRequestInput),
  ]);
  assert.deepEqual(
    providerRequestClaims.map(({ outcome }) => outcome).sort(),
    ["created", "duplicate"],
  );
  assert.equal(
    providerRequestClaims[0].requestKey,
    providerRequestClaims[1].requestKey,
  );
  const accepted = await foundation.botReplyDeliveries.markAccepted(
    tenantId,
    deliveryKey,
    claimedDelivery.claimVersion,
    "wamid.bot-integration-1",
    botReservationKey,
    acceptedAt,
  );
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.attemptCount, 1);
  const deliveredAt = new Date(
    Date.parse(acceptedAt) + 1_000,
  ).toISOString();
  const reconciledAt = new Date(
    Date.parse(deliveredAt) + 1_000,
  ).toISOString();
  const providerStatus =
    await foundation.botReplyProviderLinks.applyProviderStatus({
      tenantId,
      providerMessageId: "wamid.bot-integration-1",
      status: "delivered",
      statusEventKey: "f".repeat(64),
      statusEventAt: deliveredAt,
      reconciledAt,
    });
  assert.equal(providerStatus.outcome, "applied");
  assert.deepEqual(providerStatus.settlement, {
    reservationKey: botReservationKey,
    outcome: "delivered",
    settledAt: reconciledAt,
  });
  assert.equal(
    (await foundation.whatsappRateLimits.settle(
      providerStatus.settlement,
    )).outcome,
    "settled",
  );

  const providerDeferredReply = Object.freeze({
    kind: "text",
    text: "Integration provider deferral",
  });
  const providerDeferredInboundMessageKey =
    `message_v1_${"0".repeat(64)}`;
  const providerDeferredContact =
    await foundation.conversations.resolveInboundContact(
      tenantId,
      phone.rows[0].phoneNumber,
    );
  await foundation.conversations.recordInboundMessage(Object.freeze({
    tenantId,
    conversationKey,
    messageKey: providerDeferredInboundMessageKey,
    contactId: providerDeferredContact.contactId,
    providerMessageId: "driver-bot-provider-deferral-inbound",
    contentKind: "text",
    textContent: "Provider deferral integration",
    occurredAt: currentPolicyRecordedAt,
  }));
  const providerDeferredDeliveryKey =
    await deriveBotReplyDeliveryKey(tenantId, {
      conversationKey,
      inboundMessageKey: providerDeferredInboundMessageKey,
      botFlowVersionKey: first.botFlowVersionKey,
      replyIndex: 2,
      reply: providerDeferredReply,
    });
  const providerDeferredStage =
    await foundation.botReplyDeliveries.stage(Object.freeze({
      ...deliveryInput,
      deliveryKey: providerDeferredDeliveryKey,
      inboundMessageKey: providerDeferredInboundMessageKey,
      replyIndex: 2,
      reply: providerDeferredReply,
    }));
  assert.equal(providerDeferredStage.outcome, "created");
  const providerDeferredClaimAt = new Date(
    Date.parse(providerDeferredStage.delivery.createdAt) + 1_000,
  ).toISOString();
  const providerDeferredClaim =
    await foundation.botReplyDeliveries.claim(
      tenantId,
      providerDeferredDeliveryKey,
      providerDeferredClaimAt,
    );
  assert.equal(providerDeferredClaim.outcome, "claimed");
  const providerDeferredReservationKey =
    `whatsapp_rate_reservation_v1_${"4".repeat(64)}`;
  const providerDeferredReservation =
    await foundation.whatsappRateLimits.reserveServiceReply({
      reservationKey: providerDeferredReservationKey,
      tenantId,
      portfolioKey: `whatsapp_portfolio_v1_${"9".repeat(64)}`,
      senderKey: `whatsapp_sender_v1_${"7".repeat(64)}`,
      recipientKey: `whatsapp_recipient_v1_${"8".repeat(64)}`,
      policyEventKey: currentPolicy.record.eventKey,
      portfolioCapacity: Object.freeze({
        kind: "bounded",
        maximumUniqueRecipients: 250,
      }),
      phoneThroughput: Object.freeze({
        maximumMessagesPerSecond: 20,
        maximumOutboundMessagesPerSecond: 2,
      }),
      reservedAt: providerDeferredClaimAt,
      reservationExpiresAt: new Date(
        Date.parse(providerDeferredClaimAt) + 300_000,
      ).toISOString(),
    });
  assert.equal(providerDeferredReservation.outcome, "reserved");
  const providerDeferredRequest =
    await foundation.botReplyDeliveries.claimProviderRequest({
      tenantId,
      deliveryKey: providerDeferredDeliveryKey,
      expectedClaimVersion:
        providerDeferredClaim.delivery.claimVersion,
      reservationKey: providerDeferredReservationKey,
      requestedAt: providerDeferredClaimAt,
    });
  assert.equal(providerDeferredRequest.outcome, "created");
  const providerAttemptedAt = new Date(
    Date.parse(providerDeferredClaimAt) + 1_000,
  ).toISOString();
  const providerDeferredAt = new Date(
    Date.parse(providerAttemptedAt) + 1_000,
  ).toISOString();
  const providerRetryAt = new Date(
    Date.parse(providerAttemptedAt) + 900_000,
  ).toISOString();
  const cooldown =
    await foundation.whatsappRateLimits.applyProviderCooldown({
      reservationKey: providerDeferredReservationKey,
      scope: "sender",
      providerErrorCode: 130429,
      observedAt: providerAttemptedAt,
      blockedUntil: providerRetryAt,
    });
  assert.equal(cooldown.outcome, "applied");
  const providerDeferralCommand = Object.freeze({
    tenantId,
    deliveryKey: providerDeferredDeliveryKey,
    expectedClaimVersion:
      providerDeferredClaim.delivery.claimVersion,
    attemptedAt: providerAttemptedAt,
    deferredAt: providerDeferredAt,
    retryAt: providerRetryAt,
    reasonCode: "META_PHONE_THROUGHPUT_LIMITED",
    reservationKey: providerDeferredReservationKey,
    providerErrorCode: 130429,
    cooldownScope: "sender",
    retryAfterSeconds: 900,
  });
  const providerDeferrals = await Promise.all([
    foundation.botReplyDeliveries.deferProviderRejection(
      providerDeferralCommand,
    ),
    foundation.botReplyDeliveries.deferProviderRejection(
      providerDeferralCommand,
    ),
  ]);
  assert.equal(
    providerDeferrals.every(
      (delivery) =>
        delivery.status === "pending" &&
        delivery.nextAttemptAt === providerRetryAt,
    ),
    true,
  );
  const persistedProviderDeferral = await pool.query(
    `SELECT
       count(*)::integer AS count,
       max(reservation_key) AS "reservationKey"
     FROM bot_reply_provider_deferral_events
     WHERE tenant_id = $1
       AND delivery_key = $2`,
    [tenantId, providerDeferredDeliveryKey],
  );
  assert.deepEqual(persistedProviderDeferral.rows, [{
    count: 1,
    reservationKey: providerDeferredReservationKey,
  }]);
  await assert.rejects(
    pool.query(
      `UPDATE bot_reply_provider_deferral_events
       SET retry_after_seconds = 18
       WHERE delivery_key = $1`,
      [providerDeferredDeliveryKey],
    ),
    /provider deferral evidence is immutable/,
  );

  const windowInboundMessageKey = `message_v1_${"a1".repeat(32)}`;
  await foundation.conversations.recordInboundMessage(Object.freeze({
    tenantId,
    conversationKey,
    messageKey: windowInboundMessageKey,
    contactId: providerDeferredContact.contactId,
    providerMessageId: "driver-bot-window-rejection-inbound",
    contentKind: "text",
    textContent: "Window rejection integration",
    occurredAt: currentPolicyRecordedAt,
  }));
  const windowReply = Object.freeze({
    kind: "text",
    text: "Integration service-window rejection",
  });
  const windowDeliveryKey = await deriveBotReplyDeliveryKey(tenantId, {
    conversationKey,
    inboundMessageKey: windowInboundMessageKey,
    botFlowVersionKey: first.botFlowVersionKey,
    replyIndex: 3,
    reply: windowReply,
  });
  const windowStage = await foundation.botReplyDeliveries.stage(
    Object.freeze({
      ...deliveryInput,
      deliveryKey: windowDeliveryKey,
      inboundMessageKey: windowInboundMessageKey,
      replyIndex: 3,
      reply: windowReply,
    }),
  );
  assert.equal(windowStage.outcome, "created");
  const windowAttemptedAt = new Date(
    Date.parse(windowStage.delivery.createdAt) + 1_000,
  ).toISOString();
  const windowClaim = await foundation.botReplyDeliveries.claim(
    tenantId,
    windowDeliveryKey,
    windowAttemptedAt,
  );
  assert.equal(windowClaim.outcome, "claimed");
  const windowReservationKey =
    `whatsapp_rate_reservation_v1_${"a".repeat(64)}`;
  const windowReservation =
    await foundation.whatsappRateLimits.reserveServiceReply({
      reservationKey: windowReservationKey,
      tenantId,
      portfolioKey: `whatsapp_portfolio_v1_${"a".repeat(64)}`,
      senderKey: `whatsapp_sender_v1_${"a".repeat(64)}`,
      recipientKey: `whatsapp_recipient_v1_${"b".repeat(64)}`,
      policyEventKey: currentPolicy.record.eventKey,
      portfolioCapacity: Object.freeze({
        kind: "bounded",
        maximumUniqueRecipients: 250,
      }),
      phoneThroughput: Object.freeze({
        maximumMessagesPerSecond: 20,
        maximumOutboundMessagesPerSecond: 2,
      }),
      reservedAt: windowAttemptedAt,
      reservationExpiresAt: new Date(
        Date.parse(windowAttemptedAt) + 300_000,
      ).toISOString(),
    });
  assert.equal(windowReservation.outcome, "reserved");
  const windowProviderRequest =
    await foundation.botReplyDeliveries.claimProviderRequest({
      tenantId,
      deliveryKey: windowDeliveryKey,
      expectedClaimVersion: windowClaim.delivery.claimVersion,
      reservationKey: windowReservationKey,
      requestedAt: windowAttemptedAt,
    });
  assert.equal(windowProviderRequest.outcome, "created");
  assert.equal(
    (await foundation.whatsappRateLimits.settle({
      reservationKey: windowReservationKey,
      outcome: "provider-failed",
      settledAt: windowAttemptedAt,
    })).outcome,
    "settled",
  );
  const windowRejectedAt = new Date(
    Date.parse(windowAttemptedAt) + 1,
  ).toISOString();
  const windowRejectionCommand = Object.freeze({
    tenantId,
    deliveryKey: windowDeliveryKey,
    expectedClaimVersion: windowClaim.delivery.claimVersion,
    reservationKey: windowReservationKey,
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    serviceWindowOpenedAt: currentPolicyRecordedAt,
    serviceWindowExpiresAt: new Date(
      Date.parse(currentPolicyRecordedAt) + 86_400_000,
    ).toISOString(),
    attemptedAt: windowAttemptedAt,
    rejectedAt: windowRejectedAt,
  });
  const windowRejections = await Promise.all([
    foundation.botReplyDeliveries.rejectProviderServiceWindow(
      windowRejectionCommand,
    ),
    foundation.botReplyDeliveries.rejectProviderServiceWindow(
      windowRejectionCommand,
    ),
  ]);
  assert.equal(
    windowRejections.every(
      (delivery) =>
        delivery.status === "rejected" &&
        delivery.lastErrorCode === "META_SERVICE_WINDOW_CLOSED",
    ),
    true,
  );
  const persistedWindowRejection = await pool.query(
    `SELECT
       count(*)::integer AS count,
       max(provider_error_code)::integer AS "providerErrorCode"
     FROM bot_reply_service_window_rejection_events
     WHERE tenant_id = $1
       AND delivery_key = $2`,
    [tenantId, windowDeliveryKey],
  );
  assert.deepEqual(persistedWindowRejection.rows, [{
    count: 1,
    providerErrorCode: 131047,
  }]);
  await assert.rejects(
    pool.query(
      `UPDATE bot_reply_service_window_rejection_events
       SET reason_code = 'META_BOT_REPLY_REJECTED'
       WHERE delivery_key = $1`,
      [windowDeliveryKey],
    ),
    /service-window rejection evidence is immutable/,
  );

  const continuationPhoneNumber = "+972509876542";
  const continuationContact = await foundation.conversations
    .resolveInboundContact(tenantId, continuationPhoneNumber);
  const continuationConversationKey = `conversation_v1_${"4".repeat(64)}`;
  const previousInboundMessageKey = `message_v1_${"5".repeat(64)}`;
  const currentInboundMessageKey = `message_v1_${"6".repeat(64)}`;
  const previousOccurredAt = "2026-08-19T08:00:00.000Z";
  await foundation.conversations.recordInboundMessage(Object.freeze({
    tenantId,
    conversationKey: continuationConversationKey,
    messageKey: previousInboundMessageKey,
    contactId: continuationContact.contactId,
    providerMessageId: "driver-bot-continuation-previous",
    contentKind: "text",
    textContent: "עזרה",
    occurredAt: previousOccurredAt,
  }));
  const buttonReply = Object.freeze({
    kind: "buttons",
    text: "באיזו מחלקה לבחור?",
    options: Object.freeze([Object.freeze({
      optionKey: `bot_option_v1_${"9".repeat(64)}`,
      label: "שירות",
    })]),
  });
  const buttonDeliveryKey = await deriveBotReplyDeliveryKey(tenantId, {
    conversationKey: continuationConversationKey,
    inboundMessageKey: previousInboundMessageKey,
    botFlowVersionKey: first.botFlowVersionKey,
    replyIndex: 1,
    reply: buttonReply,
  });
  const buttonStage = await foundation.botReplyDeliveries.stage(Object.freeze({
    deliveryKey: buttonDeliveryKey,
    tenantId,
    conversationKey: continuationConversationKey,
    inboundMessageKey: previousInboundMessageKey,
    botFlowKey,
    botFlowVersionKey: first.botFlowVersionKey,
    senderPhoneNumberId: "155512345678901",
    replyIndex: 1,
    recipientPhoneNumber: continuationPhoneNumber,
    reply: buttonReply,
  }));
  assert.equal(buttonStage.outcome, "created");
  const buttonClaimAt = new Date(
    Date.parse(buttonStage.delivery.createdAt) + 1_000,
  ).toISOString();
  const buttonClaim = await foundation.botReplyDeliveries.claim(
    tenantId,
    buttonDeliveryKey,
    buttonClaimAt,
  );
  assert.equal(buttonClaim.outcome, "claimed");
  const buttonAcceptedAt = new Date(
    Date.parse(buttonClaimAt) + 1_000,
  ).toISOString();
  const buttonReservationKey =
    `whatsapp_rate_reservation_v1_${"c".repeat(64)}`;
  const buttonReservation =
    await foundation.whatsappRateLimits.reserveServiceReply({
      reservationKey: buttonReservationKey,
      tenantId,
      portfolioKey: `whatsapp_portfolio_v1_${"c".repeat(64)}`,
      senderKey: `whatsapp_sender_v1_${"d".repeat(64)}`,
      recipientKey: `whatsapp_recipient_v1_${"1".repeat(64)}`,
      policyEventKey: currentPolicy.record.eventKey,
      portfolioCapacity: Object.freeze({
        kind: "bounded",
        maximumUniqueRecipients: 250,
      }),
      phoneThroughput: Object.freeze({
        maximumMessagesPerSecond: 20,
        maximumOutboundMessagesPerSecond: 2,
      }),
      reservedAt: buttonClaimAt,
      reservationExpiresAt: new Date(
        Date.parse(buttonClaimAt) + 300_000,
      ).toISOString(),
    });
  assert.equal(buttonReservation.outcome, "reserved");
  const buttonProviderRequest =
    await foundation.botReplyDeliveries.claimProviderRequest({
      tenantId,
      deliveryKey: buttonDeliveryKey,
      expectedClaimVersion: buttonClaim.delivery.claimVersion,
      reservationKey: buttonReservationKey,
      requestedAt: buttonClaimAt,
    });
  assert.equal(buttonProviderRequest.outcome, "created");
  await foundation.botReplyDeliveries.markAccepted(
    tenantId,
    buttonDeliveryKey,
    buttonClaim.delivery.claimVersion,
    "wamid.bot-integration-buttons",
    buttonReservationKey,
    buttonAcceptedAt,
  );
  await foundation.conversations.recordInboundMessage(Object.freeze({
    tenantId,
    conversationKey: continuationConversationKey,
    messageKey: currentInboundMessageKey,
    contactId: continuationContact.contactId,
    providerMessageId: "driver-bot-continuation-current",
    contentKind: "interactive",
    textContent: null,
    occurredAt: new Date(Date.parse(buttonAcceptedAt) + 1_000).toISOString(),
    selectedBotOptionKey: buttonReply.options[0].optionKey,
    replyToProviderMessageId: "wamid.bot-integration-buttons",
  }));
  const persistedButtonReply = await pool.query(
    `SELECT
       event.selected_bot_option_key AS "selectedBotOptionKey",
       event.subject_delivery_key AS "subjectDeliveryKey"
     FROM inbound_button_reply_events AS event
     WHERE event.tenant_id = $1
       AND event.message_key = $2`,
    [tenantId, currentInboundMessageKey],
  );
  assert.deepEqual(persistedButtonReply.rows, [{
    selectedBotOptionKey: buttonReply.options[0].optionKey,
    subjectDeliveryKey: buttonDeliveryKey,
  }]);
  await assert.rejects(
    pool.query(
      `UPDATE bot_reply_provider_request_claims
       SET requested_at = requested_at + interval '1 millisecond'
       WHERE request_key = $1`,
      [buttonProviderRequest.requestKey],
    ),
    /provider request evidence is immutable/,
  );
  await assert.rejects(
    pool.query(
      `UPDATE inbound_button_reply_events
       SET selected_bot_option_key = $2
       WHERE message_key = $1`,
      [currentInboundMessageKey, `bot_option_v1_${"8".repeat(64)}`],
    ),
    /button reply evidence is immutable/,
  );
  const continuation = await foundation.botRuntime
    .findAcceptedButtonContinuation(
      tenantId,
      continuationConversationKey,
      currentInboundMessageKey,
    );
  assert.equal(continuation.outcome, "found");
  assert.equal(continuation.evidence.botFlowVersionKey, first.botFlowVersionKey);
  assert.deepEqual(JSON.parse(continuation.evidence.replyJson), buttonReply);

  const handoffPhoneNumber = "+972509876543";
  const handoffContact = await foundation.conversations.resolveInboundContact(
    tenantId,
    handoffPhoneNumber,
  );
  const handoffConversationKey = `conversation_v1_${"c".repeat(64)}`;
  await foundation.conversations.recordInboundMessage(Object.freeze({
    tenantId,
    conversationKey: handoffConversationKey,
    messageKey: `message_v1_${"d".repeat(64)}`,
    contactId: handoffContact.contactId,
    providerMessageId: "driver-bot-handoff-inbound",
    contentKind: "text",
    textContent: "נציג",
    occurredAt: "2026-08-19T08:02:00.000Z",
  }));
  const handoffs = await Promise.all([
    foundation.botRuntime.applyHandoff(tenantId, handoffConversationKey, 2),
    foundation.botRuntime.applyHandoff(tenantId, handoffConversationKey, 2),
  ]);
  assert.deepEqual(
    handoffs.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );
  assert.deepEqual(
    await foundation.botRuntime.findConversationState(
      tenantId,
      handoffConversationKey,
    ),
    {
      conversationKey: handoffConversationKey,
      tenantId,
      status: "waiting_for_agent",
      assignedExternalUserId: null,
      version: 3,
    },
  );

  const persisted = await pool.query(
    `SELECT
       flow.status AS flow_status,
       flow.version AS flow_version,
       count(DISTINCT version.bot_flow_version_key)::integer AS version_count,
       max(delivery.status) AS delivery_status
     FROM bot_flows AS flow
     INNER JOIN bot_flow_versions AS version
       ON version.tenant_id = flow.tenant_id
      AND version.bot_flow_key = flow.bot_flow_key
     LEFT JOIN bot_reply_deliveries AS delivery
       ON delivery.tenant_id = flow.tenant_id
      AND delivery.bot_flow_key = flow.bot_flow_key
      AND delivery.delivery_key = $3
     WHERE flow.tenant_id = $1
       AND flow.bot_flow_key = $2
     GROUP BY flow.status, flow.version`,
    [tenantId, botFlowKey, deliveryKey],
  );
  assert.deepEqual(persisted.rows, [{
    flow_status: "active",
    flow_version: 3,
    version_count: 2,
    delivery_status: "accepted",
  }]);
  return currentPolicy.record.eventKey;
}

async function verifyTenantSubscriptionLifecycle(pool, foundation) {
  const tenant = await pool.query(
    `INSERT INTO tenants (display_name, status)
     VALUES ('Subscription integration tenant', 'trial')
     RETURNING id`,
  );
  const subscriptionTenantId = Number(tenant.rows[0]?.id);
  assert.equal(
    Number.isSafeInteger(subscriptionTenantId) && subscriptionTenantId > 0,
    true,
  );
  const actorExternalUserId = "system-admin-subscription-integration";
  const startsAt = "2026-08-01T00:00:00.000Z";
  const firstEndsAt = "2026-09-01T00:00:00.000Z";
  const extendedEndsAt = "2026-10-01T00:00:00.000Z";
  const createInput = Object.freeze({
    tenantId: subscriptionTenantId,
    status: "active",
    startsAt,
    endsAt: firstEndsAt,
    actorExternalUserId,
    occurredAt: "2026-07-26T12:00:00.000Z",
  });
  const created = await Promise.all([
    foundation.subscriptions.create(createInput),
    foundation.subscriptions.create(createInput),
  ]);
  assert.deepEqual(
    created.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );

  const extendInput = Object.freeze({
    tenantId: subscriptionTenantId,
    expectedVersion: 1,
    newEndsAt: extendedEndsAt,
    actorExternalUserId,
    occurredAt: "2026-08-15T08:00:00.000Z",
  });
  const extended = await Promise.all([
    foundation.subscriptions.extend(extendInput),
    foundation.subscriptions.extend(extendInput),
  ]);
  assert.deepEqual(
    extended.map(({ outcome }) => outcome).sort(),
    ["conflict", "updated"],
  );

  const statusInput = Object.freeze({
    tenantId: subscriptionTenantId,
    expectedVersion: 2,
    status: "suspended",
    actorExternalUserId,
    occurredAt: "2026-08-20T08:00:00.000Z",
  });
  const suspended = await Promise.all([
    foundation.subscriptions.changeStatus(statusInput),
    foundation.subscriptions.changeStatus(statusInput),
  ]);
  assert.deepEqual(
    suspended.map(({ outcome }) => outcome).sort(),
    ["conflict", "updated"],
  );

  const cancelInput = Object.freeze({
    tenantId: subscriptionTenantId,
    expectedVersion: 3,
    actorExternalUserId,
    occurredAt: "2026-08-21T08:00:00.000Z",
  });
  const cancelled = await Promise.all([
    foundation.subscriptions.cancel(cancelInput),
    foundation.subscriptions.cancel(cancelInput),
  ]);
  assert.deepEqual(
    cancelled.map(({ outcome }) => outcome).sort(),
    ["conflict", "updated"],
  );

  const events = await foundation.subscriptions.listEvents(
    subscriptionTenantId,
  );
  assert.deepEqual(
    events.map(({ eventType, subscriptionVersion }) => ({
      eventType,
      subscriptionVersion,
    })),
    [
      { eventType: "cancelled", subscriptionVersion: 4 },
      { eventType: "status-changed", subscriptionVersion: 3 },
      { eventType: "extended", subscriptionVersion: 2 },
      { eventType: "created", subscriptionVersion: 1 },
    ],
  );
  const persisted = await pool.query(
    `SELECT
       subscription.status,
       subscription.version,
       subscription.ends_at AS "endsAt",
       subscription.cancelled_at AS "cancelledAt",
       tenant.status AS "tenantStatus",
       count(DISTINCT event.event_key)::integer AS "eventCount",
       count(DISTINCT audit.id)::integer AS "auditCount"
     FROM tenant_subscriptions AS subscription
     INNER JOIN tenants AS tenant
       ON tenant.id = subscription.tenant_id
     INNER JOIN tenant_subscription_events AS event
       ON event.tenant_id = subscription.tenant_id
     INNER JOIN audit_logs AS audit
       ON audit.tenant_id = subscription.tenant_id
      AND audit.target_type = 'tenant_subscription'
     WHERE subscription.tenant_id = $1
     GROUP BY
       subscription.status,
       subscription.version,
       subscription.ends_at,
       subscription.cancelled_at,
       tenant.status`,
    [subscriptionTenantId],
  );
  assert.deepEqual(persisted.rows, [{
    status: "cancelled",
    version: 4,
    endsAt: new Date(extendedEndsAt),
    cancelledAt: new Date(cancelInput.occurredAt),
    tenantStatus: "cancelled",
    eventCount: 4,
    auditCount: 4,
  }]);
  await assert.rejects(
    pool.query(
      `UPDATE tenant_subscription_events
       SET actor_external_user_id = 'tampered'
       WHERE tenant_id = $1`,
      [subscriptionTenantId],
    ),
    /events are immutable/,
  );
}

async function verifyTenantProvisioningLifecycle(pool, foundation) {
  const provisioningKey = `tenant_v1_${"d".repeat(64)}`;
  const input = Object.freeze({
    provisioningKey,
    externalUserId: "clerk|postgres-provisioning-owner",
    businessName: "PostgreSQL provisioned workspace",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  });
  const exactRetries = await Promise.all([
    foundation.provisioning.provisionOwnerWorkspace(input),
    foundation.provisioning.provisionOwnerWorkspace(input),
  ]);
  assert.equal(exactRetries[0].tenantId, exactRetries[1].tenantId);
  assert.equal(exactRetries[0].profileVersion, 1);
  assert.equal(exactRetries[1].profileVersion, 1);

  const persisted = await pool.query(
    `SELECT
       tenant.status AS "tenantStatus",
       count(DISTINCT membership.id)::integer AS "ownerCount",
       count(DISTINCT profile.tenant_id)::integer AS "profileCount",
       count(DISTINCT audit.id)::integer AS "auditCount"
     FROM tenants AS tenant
     INNER JOIN tenant_memberships AS membership
       ON membership.tenant_id = tenant.id
      AND membership.role = 'owner'
      AND membership.status = 'active'
     INNER JOIN business_profiles AS profile
       ON profile.tenant_id = tenant.id
     INNER JOIN audit_logs AS audit
       ON audit.tenant_id = tenant.id
      AND audit.action = 'tenant.provisioned'
     WHERE tenant.provisioning_key = $1
     GROUP BY tenant.status`,
    [provisioningKey],
  );
  assert.deepEqual(persisted.rows, [{
    tenantStatus: "trial",
    ownerCount: 1,
    profileCount: 1,
    auditCount: 1,
  }]);

  const collisionKey = `tenant_v1_${"e".repeat(64)}`;
  const collisionBase = Object.freeze({
    provisioningKey: collisionKey,
    businessName: "Provisioning collision workspace",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "en",
  });
  const collision = await Promise.allSettled([
    foundation.provisioning.provisionOwnerWorkspace({
      ...collisionBase,
      externalUserId: "clerk|postgres-provisioning-collision-a",
    }),
    foundation.provisioning.provisionOwnerWorkspace({
      ...collisionBase,
      externalUserId: "clerk|postgres-provisioning-collision-b",
    }),
  ]);
  assert.deepEqual(
    collision.map(({ status }) => status).sort(),
    ["fulfilled", "rejected"],
  );
  const rejected = collision.find(({ status }) => status === "rejected");
  assert.match(rejected?.reason?.message ?? "", /identity conflict/);
  const collisionPersisted = await pool.query(
    `SELECT
       count(DISTINCT membership.id)::integer AS "ownerCount",
       count(DISTINCT audit.id)::integer AS "auditCount"
     FROM tenants AS tenant
     INNER JOIN tenant_memberships AS membership
       ON membership.tenant_id = tenant.id
      AND membership.role = 'owner'
      AND membership.status = 'active'
     INNER JOIN audit_logs AS audit
       ON audit.tenant_id = tenant.id
      AND audit.action = 'tenant.provisioned'
     WHERE tenant.provisioning_key = $1`,
    [collisionKey],
  );
  assert.deepEqual(collisionPersisted.rows, [{
    ownerCount: 1,
    auditCount: 1,
  }]);

  return exactRetries[0].tenantId;
}

async function verifySystemAdminLifecycle(pool, foundation, tenantId) {
  const directory = await foundation.systemAdminTenantDirectory.listPage({
    search: "postgresql provisioned",
    tenantStatus: "trial",
    subscription: "without-subscription",
    afterTenantId: null,
  });
  assert.equal(directory.tenants.length, 1);
  assert.equal(directory.tenants[0]?.tenantId, tenantId);
  assert.equal(directory.tenants[0]?.businessProfile?.version, 1);

  const profileClock = await pool.query(
    `SELECT created_at AS "createdAt"
     FROM business_profiles
     WHERE tenant_id = $1`,
    [tenantId],
  );
  assert.equal(profileClock.rowCount, 1);
  const profileCreatedAt = profileClock.rows[0]?.createdAt;
  assert.equal(profileCreatedAt instanceof Date, true);
  const firstUpdateAt = new Date(
    profileCreatedAt.getTime() + 60_000,
  ).toISOString();
  const competingUpdateAt = new Date(
    profileCreatedAt.getTime() + 120_000,
  ).toISOString();

  const actorExternalUserId = "system-admin-postgres-profile";
  const firstUpdate = Object.freeze({
    tenantId,
    expectedVersion: 1,
    businessName: "PostgreSQL administered workspace",
    timezone: "Europe/London",
    interfaceLanguage: "en",
    actorExternalUserId,
    occurredAt: firstUpdateAt,
  });
  const identical = await Promise.all([
    foundation.systemAdminBusinessProfiles.update(firstUpdate),
    foundation.systemAdminBusinessProfiles.update(firstUpdate),
  ]);
  assert.deepEqual(
    identical.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );

  const competingBase = Object.freeze({
    tenantId,
    expectedVersion: 2,
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
    actorExternalUserId,
    occurredAt: competingUpdateAt,
  });
  const competing = await Promise.all([
    foundation.systemAdminBusinessProfiles.update({
      ...competingBase,
      businessName: "Competing admin profile A",
    }),
    foundation.systemAdminBusinessProfiles.update({
      ...competingBase,
      businessName: "Competing admin profile B",
    }),
  ]);
  assert.deepEqual(
    competing.map(({ outcome }) => outcome).sort(),
    ["conflict", "updated"],
  );

  const persisted = await pool.query(
    `SELECT
       profile.version,
       profile.business_name AS "businessName",
       tenant.display_name AS "tenantDisplayName",
       count(DISTINCT event.event_key)::integer AS "eventCount",
       count(DISTINCT audit.id)::integer AS "auditCount"
     FROM business_profiles AS profile
     INNER JOIN tenants AS tenant
       ON tenant.id = profile.tenant_id
     INNER JOIN business_profile_admin_events AS event
       ON event.tenant_id = profile.tenant_id
     INNER JOIN audit_logs AS audit
       ON audit.tenant_id = profile.tenant_id
      AND audit.action = 'business_profile.updated'
     WHERE profile.tenant_id = $1
     GROUP BY profile.version, profile.business_name, tenant.display_name`,
    [tenantId],
  );
  assert.deepEqual(persisted.rows, [{
    version: 3,
    businessName: persisted.rows[0]?.tenantDisplayName,
    tenantDisplayName: persisted.rows[0]?.tenantDisplayName,
    eventCount: 2,
    auditCount: 2,
  }]);
  await assert.rejects(
    pool.query(
      `UPDATE business_profile_admin_events
       SET changed_fields = 'timezone'
       WHERE tenant_id = $1`,
      [tenantId],
    ),
    /events are immutable/i,
  );
  await assert.rejects(
    pool.query(
      `DELETE FROM business_profile_admin_events
       WHERE tenant_id = $1`,
      [tenantId],
    ),
    /events are immutable/i,
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO business_profile_admin_events (
         event_key,
         tenant_id,
         previous_profile_digest,
         new_profile_digest,
         changed_fields,
         actor_external_user_id,
         profile_version,
         occurred_at
       ) VALUES ($1, $2, $3, $4, 'businessName', $5, 4, $6)`,
      [
        `business_profile_admin_event_v1_${"0".repeat(64)}`,
        tenantId,
        "a".repeat(64),
        "b".repeat(64),
        actorExternalUserId,
        "2026-08-22T15:10:00.000Z",
      ],
    ),
    (error) => error?.code === "23514" &&
      /not linked to current state/.test(error.message),
  );
}

async function verifyProductionDecisionLifecycle(pool, foundation) {
  const actorExternalUserId = "system-admin-postgres-decision";
  const createCommand = Object.freeze({
    checkId: "ai.provider",
    expectedVersion: 0,
    selection: "Approved provider contract",
    rationale: "The provider and bounded fallback policy completed review.",
    actorExternalUserId,
    occurredAt: "2026-08-19T14:00:00.000Z",
  });
  const created = await Promise.all([
    foundation.productionDecisions.save(createCommand),
    foundation.productionDecisions.save(createCommand),
  ]);
  assert.deepEqual(
    created.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );

  const updateCommand = Object.freeze({
    ...createCommand,
    expectedVersion: 1,
    selection: "Approved provider and fallback contract",
    rationale: "The revised decision includes fail-closed fallback limits.",
    occurredAt: "2026-08-19T14:05:00.000Z",
  });
  const updated = await Promise.all([
    foundation.productionDecisions.save(updateCommand),
    foundation.productionDecisions.save(updateCommand),
  ]);
  assert.deepEqual(
    updated.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );
  const records = await foundation.productionDecisions.list();
  assert.deepEqual(
    records.map(({ checkId, version }) => ({ checkId, version })),
    [{ checkId: "ai.provider", version: 2 }],
  );

  const persisted = await pool.query(
    `SELECT
       record.version,
       count(event.event_key)::integer AS "eventCount",
       array_agg(event.decision_version ORDER BY event.decision_version)
         AS "eventVersions"
     FROM production_decision_records AS record
     INNER JOIN production_decision_events AS event
       ON event.check_id = record.check_id
     WHERE record.check_id = 'ai.provider'
     GROUP BY record.version`,
  );
  assert.deepEqual(persisted.rows, [{
    version: 2,
    eventCount: 2,
    eventVersions: [1, 2],
  }]);
  await assert.rejects(
    pool.query(
      `UPDATE production_decision_events
       SET rationale = 'tampered'
       WHERE check_id = 'ai.provider'`,
    ),
    /events are immutable/i,
  );
  await assert.rejects(
    pool.query(
      `UPDATE production_decision_records
       SET version = version + 2
       WHERE check_id = 'ai.provider'`,
    ),
    (error) => error?.code === "23514" &&
      /invalid production decision transition/.test(error.message),
  );
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

  return Object.freeze({
    aiAgentKey,
    aiAgentVersionKey: second.aiAgentVersionKey,
    sourceKey,
  });
}

async function verifyPostgresAiAgentHttpRuntime(
  connectionString,
  pool,
  tenantId,
  sourceKey,
) {
  const runtime = await createPostgresIntegrationApiRuntime(connectionString);
  const compactJwt = "header.payload.signature";
  const createRequest = (operation, requestKind, payload, idempotencyKey) =>
    new Request(
      new URL(RAILWAY_API_ENDPOINT_PATH, "https://railway.example.com"),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${compactJwt}`,
          "content-type": "application/json",
          [VERCEL_OIDC_HEADER]: compactJwt,
        },
        body: JSON.stringify({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation,
          requestKind,
          idempotencyKey,
          payload,
        }),
      },
    );
  const definition = Object.freeze({
    name: "Railway HTTP AI agent",
    systemPrompt: "Answer only from approved knowledge sources.",
    handoffMessage: "Approved knowledge is unavailable. Escalating.",
    responseMode: "agent-approval",
    minimumGroundingScoreBasisPoints: 8_000,
    monthlyCostLimitMinorUnits: 50_000,
    billingCurrency: "ILS",
    knowledgeSourceKeys: Object.freeze([sourceKey]),
  });
  const draftPayload = Object.freeze({
    definition,
    expectedAgentVersion: null,
  });
  const draftOperation = "ai.agents.draft.save";
  const draftIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      draftOperation,
      draftPayload,
    );

  try {
    const responses = await Promise.all([
      runtime.handler.handle(createRequest(
        draftOperation,
        "mutation",
        draftPayload,
        draftIdempotencyKey,
      )),
      runtime.handler.handle(createRequest(
        draftOperation,
        "mutation",
        draftPayload,
        draftIdempotencyKey,
      )),
    ]);
    const bodies = await Promise.all(
      responses.map((response) => response.json()),
    );
    assert.deepEqual(responses.map(({ status }) => status), [200, 200]);
    assert.deepEqual(
      bodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    assert.deepEqual(
      bodies.map(({ data }) => data.outcome),
      ["created", "created"],
    );
    const createdAgentKey = bodies[0].data.agent.aiAgentKey;
    const createdVersionKey =
      bodies[0].data.draftVersion.aiAgentVersionKey;
    const publishPayload = Object.freeze({
      aiAgentKey: createdAgentKey,
      aiAgentVersionKey: createdVersionKey,
      expectedAgentVersion: 1,
    });
    const publishOperation = "ai.agents.publish";
    const publishIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        publishOperation,
        publishPayload,
      );
    const publishResponse = await runtime.handler.handle(createRequest(
      publishOperation,
      "mutation",
      publishPayload,
      publishIdempotencyKey,
    ));
    const publishBody = await publishResponse.json();
    assert.equal(publishResponse.status, 200);
    assert.equal(publishBody.data.outcome, "activation-blocked");
    assert.equal(publishBody.data.replayed, false);
    assert.ok(publishBody.data.issues.includes("provider-required"));

    const directoryResponse = await runtime.handler.handle(createRequest(
      "ai.agents.directory.read",
      "query",
      Object.freeze({}),
      null,
    ));
    const directoryBody = await directoryResponse.json();
    assert.equal(directoryResponse.status, 200);
    assert.equal(
      directoryBody.data.agents.some(
        ({ aiAgentKey }) => aiAgentKey === createdAgentKey,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify({ bodies, publishBody, directoryBody }),
      /"tenantId"|externalUserId|storageObjectKey|contentSha256/,
    );

    const evidence = await pool.query(
      `SELECT
         count(*) FILTER (
           WHERE operation = $2 AND idempotency_key = $3
         )::integer AS "draftReceiptCount",
         count(*) FILTER (
           WHERE operation = $4 AND idempotency_key = $5
         )::integer AS "publishReceiptCount"
       FROM railway_api_mutation_receipts
       WHERE tenant_id = $1`,
      [
        tenantId,
        draftOperation,
        draftIdempotencyKey,
        publishOperation,
        publishIdempotencyKey,
      ],
    );
    assert.deepEqual(evidence.rows, [{
      draftReceiptCount: 1,
      publishReceiptCount: 0,
    }]);
  } finally {
    await runtime.close();
  }
}

async function verifyAiRuntimePersistence(
  pool,
  foundation,
  tenantId,
  aiAgent,
) {
  const identityInputs = await Promise.all(
    ["7", "8", "9", "e"].map(async (hexDigit, index) => {
      const contact = await foundation.conversations.resolveInboundContact(
        tenantId,
        `+9725098700${index + 1}`,
      );
      const conversationKey = `conversation_v1_${hexDigit.repeat(64)}`;
      const inboundMessageKey = `message_v1_${hexDigit.repeat(64)}`;
      await foundation.conversations.recordInboundMessage(Object.freeze({
        tenantId,
        conversationKey,
        messageKey: inboundMessageKey,
        contactId: contact.contactId,
        providerMessageId: `driver-ai-runtime-inbound-${index + 1}`,
        contentKind: "text",
        textContent: `AI runtime persistence ${index + 1}`,
        occurredAt: `2026-08-17T13:0${index}:00.000Z`,
      }));
      const identity = Object.freeze({
        conversationKey,
        inboundMessageKey,
        aiAgentVersionKey: aiAgent.aiAgentVersionKey,
      });
      return Object.freeze({
        ...identity,
        requestKey: await deriveAiProviderRequestKey(tenantId, identity),
        auditKey: await deriveAiRuntimeAuditKey(tenantId, identity),
      });
    }),
  );

  function authorization(identity) {
    return Object.freeze({
      requestKey: identity.requestKey,
      tenantId,
      aiAgentKey: aiAgent.aiAgentKey,
      monthlyLimitMinorUnits: 10,
      currency: "ILS",
    });
  }

  function usage(identity, costMinorUnits) {
    return Object.freeze({
      requestKey: identity.requestKey,
      tenantId,
      aiAgentKey: aiAgent.aiAgentKey,
      usage: Object.freeze({
        inputTokens: 120,
        outputTokens: 24,
        costMinorUnits,
        currency: "ILS",
      }),
    });
  }

  const authorizationReplay = await Promise.all([
    foundation.aiRuntime.costGate.authorize(authorization(identityInputs[0])),
    foundation.aiRuntime.costGate.authorize(authorization(identityInputs[0])),
  ]);
  assert.deepEqual(
    authorizationReplay.map(({ outcome }) => outcome),
    ["authorized", "authorized"],
  );

  const usageReplay = await Promise.all([
    foundation.aiRuntime.costGate.recordUsage(usage(identityInputs[0], 7)),
    foundation.aiRuntime.costGate.recordUsage(usage(identityInputs[0], 7)),
  ]);
  assert.deepEqual(
    usageReplay.map(({ outcome, withinLimit }) => ({ outcome, withinLimit })),
    [
      { outcome: "recorded", withinLimit: true },
      { outcome: "recorded", withinLimit: true },
    ],
  );

  assert.deepEqual(
    await Promise.all(
      identityInputs.slice(1).map((identity) =>
        foundation.aiRuntime.costGate.authorize(authorization(identity)),
      ),
    ),
    [
      { outcome: "authorized" },
      { outcome: "authorized" },
      { outcome: "authorized" },
    ],
  );
  const budgetRace = await Promise.all(
    identityInputs.slice(1).map((identity) =>
      foundation.aiRuntime.costGate.recordUsage(usage(identity, 2)),
    ),
  );
  assert.deepEqual(
    budgetRace.map(({ withinLimit }) => withinLimit).sort(),
    [false, false, true],
  );

  const replyAuditEvent = Object.freeze({
    auditKey: identityInputs[1].auditKey,
    requestKey: identityInputs[1].requestKey,
    tenantId,
    conversationKey: identityInputs[1].conversationKey,
    inboundMessageKey: identityInputs[1].inboundMessageKey,
    expectedConversationVersion: 2,
    aiAgentKey: aiAgent.aiAgentKey,
    aiAgentVersionKey: aiAgent.aiAgentVersionKey,
    outcome: "reply-planned",
    reason: null,
    responseMode: "agent-approval",
    groundingScoreBasisPoints: 9_000,
    inputTokens: 120,
    outputTokens: 24,
    costMinorUnits: 2,
    currency: "ILS",
  });
  assert.deepEqual(
    await foundation.aiRuntime.auditSink.record(replyAuditEvent),
    { outcome: "recorded" },
  );
  const replyOutboxKey = await deriveAiReplyOutboxKey(
    tenantId,
    identityInputs[1].requestKey,
  );
  const stageInput = Object.freeze({
    outboxKey: replyOutboxKey,
    requestKey: identityInputs[1].requestKey,
    auditKey: identityInputs[1].auditKey,
    tenantId,
    conversationKey: identityInputs[1].conversationKey,
    inboundMessageKey: identityInputs[1].inboundMessageKey,
    aiAgentKey: aiAgent.aiAgentKey,
    aiAgentVersionKey: aiAgent.aiAgentVersionKey,
    expectedConversationVersion: 2,
    recipientPhoneNumber: "+97250987002",
    responseMode: "agent-approval",
    replyText: "Approved knowledge supports this response.",
    groundedSourceKeys: Object.freeze([aiAgent.sourceKey]),
    groundingScoreBasisPoints: 9_000,
  });
  const stagedReplies = await Promise.all([
    foundation.aiReplyOutbox.stage(stageInput),
    foundation.aiReplyOutbox.stage(stageInput),
  ]);
  assert.deepEqual(
    stagedReplies.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );
  assert.equal(
    (await foundation.aiReplyOutbox.listAwaitingApproval(tenantId, 10)).some(
      ({ outboxKey: storedKey }) => storedKey === replyOutboxKey,
    ),
    true,
  );
  const decisionAt = new Date(
    Date.parse(stagedReplies[0].item.createdAt) + 1_000,
  ).toISOString();
  const decision = Object.freeze({
    tenantId,
    outboxKey: replyOutboxKey,
    expectedVersion: 1,
    decidedByExternalUserId: "auth0|postgres-ai-approver",
    decision: "approve",
    decidedAt: decisionAt,
  });
  const decisions = await Promise.all([
    foundation.aiReplyOutbox.decide(decision),
    foundation.aiReplyOutbox.decide(decision),
  ]);
  assert.deepEqual(
    decisions.map(({ outcome }) => outcome).sort(),
    ["unchanged", "updated"],
  );

  const httpReplyAuditEvent = Object.freeze({
    auditKey: identityInputs[3].auditKey,
    requestKey: identityInputs[3].requestKey,
    tenantId,
    conversationKey: identityInputs[3].conversationKey,
    inboundMessageKey: identityInputs[3].inboundMessageKey,
    expectedConversationVersion: 2,
    aiAgentKey: aiAgent.aiAgentKey,
    aiAgentVersionKey: aiAgent.aiAgentVersionKey,
    outcome: "reply-planned",
    reason: null,
    responseMode: "agent-approval",
    groundingScoreBasisPoints: 9_100,
    inputTokens: 120,
    outputTokens: 24,
    costMinorUnits: 2,
    currency: "ILS",
  });
  assert.deepEqual(
    await foundation.aiRuntime.auditSink.record(httpReplyAuditEvent),
    { outcome: "recorded" },
  );
  const httpReplyOutboxKey = await deriveAiReplyOutboxKey(
    tenantId,
    identityInputs[3].requestKey,
  );
  const httpStageInput = Object.freeze({
    outboxKey: httpReplyOutboxKey,
    requestKey: identityInputs[3].requestKey,
    auditKey: identityInputs[3].auditKey,
    tenantId,
    conversationKey: identityInputs[3].conversationKey,
    inboundMessageKey: identityInputs[3].inboundMessageKey,
    aiAgentKey: aiAgent.aiAgentKey,
    aiAgentVersionKey: aiAgent.aiAgentVersionKey,
    expectedConversationVersion: 2,
    recipientPhoneNumber: "+97250987004",
    responseMode: "agent-approval",
    replyText: "Railway approval preserves the bounded response.",
    groundedSourceKeys: Object.freeze([aiAgent.sourceKey]),
    groundingScoreBasisPoints: 9_100,
  });
  const httpStagedReplies = await Promise.all([
    foundation.aiReplyOutbox.stage(httpStageInput),
    foundation.aiReplyOutbox.stage(httpStageInput),
  ]);
  assert.deepEqual(
    httpStagedReplies.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );

  const handoffEvent = Object.freeze({
    auditKey: identityInputs[2].auditKey,
    requestKey: identityInputs[2].requestKey,
    tenantId,
    conversationKey: identityInputs[2].conversationKey,
    inboundMessageKey: identityInputs[2].inboundMessageKey,
    expectedConversationVersion: 2,
    aiAgentKey: aiAgent.aiAgentKey,
    aiAgentVersionKey: aiAgent.aiAgentVersionKey,
    outcome: "handoff",
    reason: "customer-request",
    responseMode: "agent-approval",
    groundingScoreBasisPoints: null,
    inputTokens: null,
    outputTokens: null,
    costMinorUnits: null,
    currency: "ILS",
  });
  const handoffReplay = await Promise.all([
    foundation.aiRuntime.auditSink.record(handoffEvent),
    foundation.aiRuntime.auditSink.record(handoffEvent),
  ]);
  assert.deepEqual(handoffReplay, [
    { outcome: "recorded" },
    { outcome: "recorded" },
  ]);

  const persisted = await pool.query(
    `SELECT
       (SELECT count(*)::integer
        FROM ai_runtime_cost_authorizations
        WHERE tenant_id = $1
          AND ai_agent_key = $2
          AND currency = 'ILS') AS authorization_count,
       (SELECT count(*)::integer
        FROM ai_runtime_usage
        WHERE tenant_id = $1
          AND ai_agent_key = $2
          AND currency = 'ILS') AS usage_count,
       (SELECT sum(cost_minor_units)::integer
        FROM ai_runtime_usage
        WHERE tenant_id = $1
          AND ai_agent_key = $2
          AND currency = 'ILS') AS total_cost,
       (SELECT count(*)::integer
        FROM ai_runtime_audit_events
        WHERE tenant_id = $1
          AND audit_key = $3) AS audit_count,
       (SELECT count(*)::integer
        FROM ai_reply_outbox
        WHERE tenant_id = $1
          AND outbox_key = $5) AS outbox_count,
       (SELECT status
        FROM ai_reply_outbox
        WHERE tenant_id = $1
          AND outbox_key = $5) AS outbox_status,
       conversation.status,
       conversation.version
     FROM conversations AS conversation
     WHERE conversation.tenant_id = $1
       AND conversation.conversation_key = $4`,
    [
      tenantId,
      aiAgent.aiAgentKey,
      identityInputs[2].auditKey,
      identityInputs[2].conversationKey,
      replyOutboxKey,
    ],
  );
  assert.deepEqual(persisted.rows, [{
    authorization_count: 4,
    usage_count: 4,
    total_cost: 13,
    audit_count: 1,
    outbox_count: 1,
    outbox_status: "ready-for-delivery",
    status: "waiting_for_agent",
    version: 3,
  }]);

  await assert.rejects(
    foundation.aiRuntime.costGate.recordUsage(usage(identityInputs[0], 8)),
    /conflicting AI usage/,
  );

  return Object.freeze({
    httpReplyOutboxKey,
  });
}

async function verifyPostgresAiReplyApprovalHttpRuntime(
  connectionString,
  pool,
  httpReplyOutboxKey,
) {
  const runtime = await createPostgresIntegrationApiRuntime(connectionString);
  const compactJwt = "header.payload.signature";
  const createApiRequest = (operation, requestKind, payload, idempotencyKey) =>
    new Request(
      new URL(RAILWAY_API_ENDPOINT_PATH, "https://railway.example.com"),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${compactJwt}`,
          "content-type": "application/json",
          [VERCEL_OIDC_HEADER]: compactJwt,
        },
        body: JSON.stringify({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation,
          requestKind,
          idempotencyKey,
          payload,
        }),
      },
    );

  try {
    const directoryResponse = await runtime.handler.handle(
      createApiRequest(
        "ai.reply-approvals.list",
        "query",
        {},
        null,
      ),
    );
    const directoryBody = await directoryResponse.json();
    assert.equal(directoryResponse.status, 200);
    assert.equal(directoryBody.outcome, "ok");
    assert.equal(directoryBody.data.canDecide, true);
    const approval = directoryBody.data.approvals.find(
      ({ outboxKey }) => outboxKey === httpReplyOutboxKey,
    );
    assert.deepEqual(approval, {
      outboxKey: httpReplyOutboxKey,
      conversationKey: `conversation_v1_${"e".repeat(64)}`,
      replyText: "Railway approval preserves the bounded response.",
      groundedSourceCount: 1,
      groundingScoreBasisPoints: 9_100,
      version: 1,
      createdAt: approval.createdAt,
    });
    assert.doesNotMatch(
      JSON.stringify(directoryBody),
      /tenantId|externalUserId|requestKey|auditKey|driver-integration-owner/,
    );

    const decisionPayload = Object.freeze({
      outboxKey: httpReplyOutboxKey,
      expectedVersion: 1,
      decision: "approve",
    });
    const decisionIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "ai.reply-approvals.decide",
        decisionPayload,
      );
    const decisionResponses = await Promise.all([
      runtime.handler.handle(createApiRequest(
        "ai.reply-approvals.decide",
        "mutation",
        decisionPayload,
        decisionIdempotencyKey,
      )),
      runtime.handler.handle(createApiRequest(
        "ai.reply-approvals.decide",
        "mutation",
        decisionPayload,
        decisionIdempotencyKey,
      )),
    ]);
    const decisionBodies = await Promise.all(
      decisionResponses.map((candidate) => candidate.json()),
    );
    assert.deepEqual(
      decisionResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      decisionBodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    assert.deepEqual(
      decisionBodies.map(({ data }) => data.outcome),
      ["updated", "updated"],
    );
    assert.deepEqual(decisionBodies[0].data.approval, {
      outboxKey: httpReplyOutboxKey,
      status: "ready-for-delivery",
      version: 2,
    });
    assert.doesNotMatch(
      JSON.stringify(decisionBodies),
      /tenantId|externalUserId|requestKey|auditKey|driver-integration-owner/,
    );

    const evidence = await pool.query(
      `SELECT
         (SELECT count(*)::integer
          FROM railway_api_mutation_receipts
          WHERE operation = 'ai.reply-approvals.decide') AS receipts,
         (SELECT count(*)::integer
          FROM audit_logs
          WHERE action = 'ai.reply-approvals.decide') AS audits,
         outbox.status,
         outbox.version,
         outbox.decided_by_external_user_id AS "decidedByExternalUserId"
       FROM ai_reply_outbox AS outbox
       WHERE outbox.tenant_id = 1
         AND outbox.outbox_key = $1`,
      [httpReplyOutboxKey],
    );
    assert.deepEqual(evidence.rows, [{
      receipts: 1,
      audits: 1,
      status: "ready-for-delivery",
      version: 2,
      decidedByExternalUserId: "driver-integration-owner",
    }]);
  } finally {
    await runtime.close();
  }
}

async function verifyAiReportingSchema(pool, foundation, tenantId) {
  const conversationKey = `conversation_v1_${"a".repeat(64)}`;
  const inboundMessageKey = `message_v1_${"b".repeat(64)}`;
  const requestKey = `ai_provider_request_v1_${"5".repeat(64)}`;
  const auditKey = `ai_runtime_audit_v1_${"6".repeat(64)}`;
  const occurredAt = "2026-08-17T12:00:00.000Z";
  const agentName = "Integration AI agent";
  const definitionValue = Object.freeze({
    name: agentName,
    systemPrompt: "Answer only from approved operational context.",
    handoffMessage: "Operational context is unavailable. Escalating.",
    responseMode: "automatic",
    minimumGroundingScoreBasisPoints: 8_000,
    monthlyCostLimitMinorUnits: 100,
    billingCurrency: "USD",
    knowledgeSourceKeys: Object.freeze([]),
  });
  const aiAgentKey = await deriveAiAgentKey(tenantId, agentName);
  const aiAgentVersionKey = await deriveAiAgentVersionKey(
    tenantId,
    aiAgentKey,
    1,
    definitionValue,
  );
  const definition = JSON.stringify(definitionValue);

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
       $5,
       'draft',
       $3,
       1,
       NULL,
       1,
       $4::timestamptz,
       $4::timestamptz
     )`,
    [aiAgentKey, tenantId, aiAgentVersionKey, occurredAt, agentName],
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

async function createPostgresIntegrationApiRuntime(
  connectionString,
  externalUserId = "driver-integration-owner",
  teamInvitationPublications = [],
  verifiedInvitationEmail = "driver-integration-owner@example.com",
  enableSystemAdmin = false,
  externalOrganizationId = "org_driver_integration",
) {
  return createRailwayPostgresApiRuntime({
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
                    userId: externalUserId,
                    orgId: externalOrganizationId,
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
    mutationRateLimitEnvironment: {
      TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION: "3",
      TENANT_MUTATION_RATE_LIMIT_CAPACITY: "120",
      TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "60",
    },
    ...(enableSystemAdmin
      ? {
          systemAdminEnvironment: {
            CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
              JSON.stringify([externalUserId]),
            SYSTEM_ADMIN_MUTATION_RATE_LIMIT_POLICY_VERSION: "1",
            SYSTEM_ADMIN_MUTATION_RATE_LIMIT_CAPACITY: "120",
            SYSTEM_ADMIN_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "60",
          },
        }
      : {}),
    campaignDeliveryConfigured: () => true,
    teamInvitationPolicyEnvironment: {
      TEAM_INVITATION_TTL_HOURS: "72",
      TEAM_INVITATION_REREQUEST_POLICY: "after-terminal",
    },
    teamInvitationPublisher: {
      async publish(tenantId, deliveryKey) {
        teamInvitationPublications.push({ tenantId, deliveryKey });
        return { outcome: "queued" };
      },
    },
    teamInvitationAcceptanceIdentityResolver: {
      async resolve(receivedExternalUserId) {
        assert.equal(receivedExternalUserId, externalUserId);
        return {
          status: "verified",
          verifiedEmail: verifiedInvitationEmail,
        };
      },
    },
  });
}

async function verifyPostgresSystemAdminWhatsappDeliveryPolicyHttpRuntime(
  connectionString,
  pool,
  tenantId,
) {
  const externalUserId = "driver-system-admin-whatsapp-policy";
  const runtime = await createPostgresIntegrationApiRuntime(
    connectionString,
    externalUserId,
    [],
    "driver-system-admin-whatsapp-policy@example.com",
    true,
  );
  const compactJwt = "header.payload.signature";
  const createApiRequest = (
    operation,
    requestKind,
    payload,
    idempotencyKey,
  ) => new Request(
    new URL(RAILWAY_API_ENDPOINT_PATH, "https://railway.example.com"),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${compactJwt}`,
        "content-type": "application/json",
        [VERCEL_OIDC_HEADER]: compactJwt,
      },
      body: JSON.stringify({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation,
        requestKind,
        idempotencyKey,
        payload,
      }),
    },
  );

  try {
    const readPayload = Object.freeze({ targetTenantId: tenantId });
    const initialRead = await runtime.handler.handle(
      createApiRequest(
        "system-admin.whatsapp-delivery-policy.read",
        "query",
        readPayload,
        null,
      ),
    );
    const initialBody = await initialRead.json();
    assert.equal(initialRead.status, 200);
    assert.equal(initialBody.data.connection.status, "connected");
    const initialPolicyVersion = initialBody.data.record.policyVersion;
    assert.equal(
      Number.isSafeInteger(initialPolicyVersion) && initialPolicyVersion >= 1,
      true,
    );
    assert.equal(initialBody.data.record.deliveryState, "enabled");

    const observedAt = new Date();
    const evidenceCheckedAt = new Date(
      observedAt.getTime() - 60_000,
    ).toISOString();
    const evidenceExpiresAt = new Date(
      observedAt.getTime() + 60 * 60 * 1_000,
    ).toISOString();
    const approvalPayload = Object.freeze({
      targetTenantId: tenantId,
      expectedConnectionVersion: 2,
      expectedPolicyVersion: initialPolicyVersion,
      expectedBusinessPortfolioIdentifier:
        "integration-business-portfolio",
      expectedWabaIdentifier: "integration-waba",
      expectedPhoneNumberIdentifier: "155512345678901",
      portfolioLimitKind: "bounded",
      portfolioLimitValue: 250,
      phoneThroughputMessagesPerSecond: 20,
      maximumOutboundMessagesPerSecond: 2,
      reservationDurationSeconds: 300,
      metaGraphApiVersion: "v21.0",
      evidenceDigest: "9".repeat(64),
      evidenceCheckedAt,
      evidenceExpiresAt,
    });
    const approvalOperation =
      "system-admin.whatsapp-delivery-policy.approve";
    const approvalIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        approvalOperation,
        approvalPayload,
      );
    const approvalResponses = await Promise.all([
      runtime.handler.handle(createApiRequest(
        approvalOperation,
        "mutation",
        approvalPayload,
        approvalIdempotencyKey,
      )),
      runtime.handler.handle(createApiRequest(
        approvalOperation,
        "mutation",
        approvalPayload,
        approvalIdempotencyKey,
      )),
    ]);
    const approvalBodies = await Promise.all(
      approvalResponses.map((response) => response.json()),
    );
    assert.deepEqual(
      approvalResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      approvalBodies.map(({ data }) => data.outcome).sort(),
      ["unchanged", "updated"],
    );
    assert.deepEqual(
      approvalBodies.map(({ data }) => data.record.policyVersion),
      [initialPolicyVersion + 1, initialPolicyVersion + 1],
    );
    const approvalReplayResponse = await runtime.handler.handle(
      createApiRequest(
        approvalOperation,
        "mutation",
        approvalPayload,
        approvalIdempotencyKey,
      ),
    );
    const approvalReplayBody = await approvalReplayResponse.json();
    assert.equal(approvalReplayResponse.status, 200);
    assert.equal(approvalReplayBody.data.outcome, "unchanged");
    assert.equal(
      approvalReplayBody.data.record.policyVersion,
      initialPolicyVersion + 1,
    );

    const killSwitchPayload = Object.freeze({
      targetTenantId: tenantId,
      expectedConnectionVersion: 2,
      expectedPolicyVersion: initialPolicyVersion + 1,
    });
    const killSwitchOperation =
      "system-admin.whatsapp-delivery-policy.kill-switch";
    const killSwitchIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        killSwitchOperation,
        killSwitchPayload,
      );
    const killSwitchResponses = await Promise.all([
      runtime.handler.handle(createApiRequest(
        killSwitchOperation,
        "mutation",
        killSwitchPayload,
        killSwitchIdempotencyKey,
      )),
      runtime.handler.handle(createApiRequest(
        killSwitchOperation,
        "mutation",
        killSwitchPayload,
        killSwitchIdempotencyKey,
      )),
    ]);
    const killSwitchBodies = await Promise.all(
      killSwitchResponses.map((response) => response.json()),
    );
    assert.deepEqual(
      killSwitchResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      killSwitchBodies.map(({ data }) => data.outcome).sort(),
      ["unchanged", "updated"],
    );
    assert.deepEqual(
      killSwitchBodies.map(({ data }) => data.record.deliveryState),
      ["disabled", "disabled"],
    );
    const killSwitchReplayResponse = await runtime.handler.handle(
      createApiRequest(
        killSwitchOperation,
        "mutation",
        killSwitchPayload,
        killSwitchIdempotencyKey,
      ),
    );
    const killSwitchReplayBody = await killSwitchReplayResponse.json();
    assert.equal(killSwitchReplayResponse.status, 200);
    assert.equal(killSwitchReplayBody.data.outcome, "unchanged");
    assert.equal(
      killSwitchReplayBody.data.record.policyVersion,
      initialPolicyVersion + 2,
    );
    assert.doesNotMatch(
      JSON.stringify({
        initialBody,
        approvalBodies,
        approvalReplayBody,
        killSwitchBodies,
        killSwitchReplayBody,
      }),
      /"tenantId"|"businessPortfolioId"|"wabaId"|"phoneNumberId"|externalUserId|driver-system-admin-whatsapp-policy/,
    );

    const evidence = await pool.query(
      `SELECT
         max(policy_version)::integer AS "latestVersion",
         (array_agg(delivery_state ORDER BY policy_version DESC))[1]
           AS "latestState",
         count(*) FILTER (
           WHERE actor_external_user_id = $2
         )::integer AS "httpEventCount"
       FROM whatsapp_campaign_delivery_policy_events
       WHERE tenant_id = $1`,
      [tenantId, externalUserId],
    );
    assert.deepEqual(evidence.rows, [{
      latestVersion: initialPolicyVersion + 2,
      latestState: "disabled",
      httpEventCount: 2,
    }]);
  } finally {
    await runtime.close();
  }
}

async function verifyPostgresHttpRuntime(connectionString, pool) {
  const runtime = await createPostgresIntegrationApiRuntime(connectionString);

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
    assert.equal(body.data.campaigns.total, 1);
    assert.equal(body.data.messages.total, 1);
    assert.equal(body.data.conversations.active, 1);
    assert.equal(body.data.bot.total, 1);
    assert.equal(body.data.ai.totalTurns, 1);
    assert.equal(body.data.aiUsage[0]?.requestCount, 1);
    assert.doesNotMatch(
      JSON.stringify(body),
      /tenantId|externalUserId|driver-integration-owner/,
    );

    const mutationPayload = Object.freeze({
      phoneNumber: "+972501234580",
      firstName: "Runtime",
      lastName: null,
      email: null,
      company: "Connect",
      submissionOccurredAt:
        "2026-08-17T10:30:00.000Z",
    });
    const mutationIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "contacts.save",
        mutationPayload,
      );
    const mutationResponse = await runtime.handler.handle(
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
            operation: "contacts.save",
            requestKind: "mutation",
            idempotencyKey: mutationIdempotencyKey,
            payload: mutationPayload,
          }),
        },
      ),
    );
    const mutationBody = await mutationResponse.json();

    assert.equal(mutationResponse.status, 200);
    assert.equal(mutationBody.outcome, "ok");
    assert.equal(mutationBody.data.replayed, false);
    assert.equal(
      mutationBody.data.contact.phoneNumber,
      "+972501234580",
    );
    assert.doesNotMatch(
      JSON.stringify(mutationBody),
      /tenantId|externalUserId|driver-integration-owner/,
    );

    const conversationListResponse = await runtime.handler.handle(
      new Request(
        new URL(RAILWAY_API_ENDPOINT_PATH, "https://railway.example.com"),
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${compactJwt}`,
            "content-type": "application/json",
            [VERCEL_OIDC_HEADER]: compactJwt,
          },
          body: JSON.stringify({
            contractVersion: RAILWAY_API_CONTRACT_VERSION,
            operation: "conversations.list",
            requestKind: "query",
            idempotencyKey: null,
            payload: {
              searchTerm: "",
              status: "all",
              assignment: "all",
            },
          }),
        },
      ),
    );
    const conversationListBody = await conversationListResponse.json();
    assert.equal(conversationListResponse.status, 200);
    assert.equal(conversationListBody.data.conversations.length, 1);
    assert.equal(conversationListBody.data.canReply, true);
    const conversationKey =
      conversationListBody.data.conversations[0]?.conversationKey;
    assert.equal(conversationKey, `conversation_v1_${"a".repeat(64)}`);

    const threadResponse = await runtime.handler.handle(
      new Request(
        new URL(RAILWAY_API_ENDPOINT_PATH, "https://railway.example.com"),
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${compactJwt}`,
            "content-type": "application/json",
            [VERCEL_OIDC_HEADER]: compactJwt,
          },
          body: JSON.stringify({
            contractVersion: RAILWAY_API_CONTRACT_VERSION,
            operation: "conversations.thread.read",
            requestKind: "query",
            idempotencyKey: null,
            payload: { conversationKey },
          }),
        },
      ),
    );
    const threadBody = await threadResponse.json();
    assert.equal(threadResponse.status, 200);
    assert.equal(threadBody.data.thread.messages.length, 1);
    assert.doesNotMatch(
      JSON.stringify({ conversationListBody, threadBody }),
      /tenantId|externalUserId|assignedExternalUserId|providerMessageId|driver-integration-owner/,
    );

    const markReadPayload = Object.freeze({
      conversationKey,
      expectedVersion: 2,
    });
    const markReadIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "conversations.mark-read",
        markReadPayload,
      );
    const createConversationMutationRequest = (operation, payload, key) =>
      new Request(
        new URL(RAILWAY_API_ENDPOINT_PATH, "https://railway.example.com"),
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${compactJwt}`,
            "content-type": "application/json",
            [VERCEL_OIDC_HEADER]: compactJwt,
          },
          body: JSON.stringify({
            contractVersion: RAILWAY_API_CONTRACT_VERSION,
            operation,
            requestKind: "mutation",
            idempotencyKey: key,
            payload,
          }),
        },
      );
    const markReadResponses = await Promise.all([
      runtime.handler.handle(createConversationMutationRequest(
        "conversations.mark-read",
        markReadPayload,
        markReadIdempotencyKey,
      )),
      runtime.handler.handle(createConversationMutationRequest(
        "conversations.mark-read",
        markReadPayload,
        markReadIdempotencyKey,
      )),
    ]);
    const markReadBodies = await Promise.all(
      markReadResponses.map((candidate) => candidate.json()),
    );
    assert.deepEqual(
      markReadResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      markReadBodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    assert.deepEqual(markReadBodies[0].data.conversation, {
      conversationKey,
      unreadCount: 0,
      version: 3,
    });

    const assignmentPayload = Object.freeze({
      conversationKey,
      expectedVersion: 3,
      action: "assign-self",
    });
    const assignmentIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "conversations.assignment.change",
        assignmentPayload,
      );
    const assignmentResponses = await Promise.all([
      runtime.handler.handle(createConversationMutationRequest(
        "conversations.assignment.change",
        assignmentPayload,
        assignmentIdempotencyKey,
      )),
      runtime.handler.handle(createConversationMutationRequest(
        "conversations.assignment.change",
        assignmentPayload,
        assignmentIdempotencyKey,
      )),
    ]);
    const assignmentBodies = await Promise.all(
      assignmentResponses.map((candidate) => candidate.json()),
    );
    assert.deepEqual(
      assignmentResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      assignmentBodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    assert.deepEqual(assignmentBodies[0].data.conversation, {
      conversationKey,
      assignment: "current-user",
      version: 4,
    });

    const conversationEvidence = await pool.query(
      `SELECT
         (SELECT count(*)::integer
          FROM railway_api_mutation_receipts
          WHERE operation IN (
            'conversations.mark-read',
            'conversations.assignment.change'
          )) AS receipts,
         (SELECT count(*)::integer
          FROM audit_logs
          WHERE action IN (
            'conversations.mark-read',
            'conversations.assignment.change'
          )) AS audits,
         conversation.unread_count AS "unreadCount",
         conversation.version,
         conversation.assigned_external_user_id AS "assignedExternalUserId"
       FROM conversations AS conversation
       WHERE conversation.conversation_key = $1`,
      [conversationKey],
    );
    assert.deepEqual(conversationEvidence.rows, [{
      receipts: 2,
      audits: 2,
      unreadCount: 0,
      version: 4,
      assignedExternalUserId: "driver-integration-owner",
    }]);

    const runtimeBotFlowKey = await deriveBotFlowKey(
      1,
      "HTTP runtime flow",
    );
    const botTriggerKey = await deriveBotFlowBlockKey(
      runtimeBotFlowKey,
      1,
    );
    const botEndKey = await deriveBotFlowBlockKey(
      runtimeBotFlowKey,
      2,
    );
    const botDefinition = Object.freeze({
      name: "HTTP runtime flow",
      entryBlockKey: botTriggerKey,
      blocks: Object.freeze([
        Object.freeze({
          blockKey: botTriggerKey,
          type: "trigger",
          nextBlockKey: botEndKey,
        }),
        Object.freeze({
          blockKey: botEndKey,
          type: "end",
        }),
      ]),
    });
    const botDraftPayload = Object.freeze({
      definition: botDefinition,
      expectedFlowVersion: null,
    });
    const botDraftIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "bot.flows.draft.save",
        botDraftPayload,
      );
    const botDraftResponses = await Promise.all([
      runtime.handler.handle(createConversationMutationRequest(
        "bot.flows.draft.save",
        botDraftPayload,
        botDraftIdempotencyKey,
      )),
      runtime.handler.handle(createConversationMutationRequest(
        "bot.flows.draft.save",
        botDraftPayload,
        botDraftIdempotencyKey,
      )),
    ]);
    const botDraftBodies = await Promise.all(
      botDraftResponses.map((candidate) => candidate.json()),
    );
    assert.deepEqual(
      botDraftResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      botDraftBodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    assert.deepEqual(
      botDraftBodies.map(({ data }) => data.outcome),
      ["created", "created"],
    );
    const runtimeBotFlowVersionKey = await deriveBotFlowVersionKey(
      1,
      runtimeBotFlowKey,
      1,
      botDefinition,
    );
    assert.equal(
      botDraftBodies[0].data.flow.botFlowKey,
      runtimeBotFlowKey,
    );

    const botPublishPayload = Object.freeze({
      botFlowKey: runtimeBotFlowKey,
      botFlowVersionKey: runtimeBotFlowVersionKey,
      expectedFlowVersion: 1,
    });
    const botPublishIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "bot.flows.publish",
        botPublishPayload,
      );
    const botPublishResponses = await Promise.all([
      runtime.handler.handle(createConversationMutationRequest(
        "bot.flows.publish",
        botPublishPayload,
        botPublishIdempotencyKey,
      )),
      runtime.handler.handle(createConversationMutationRequest(
        "bot.flows.publish",
        botPublishPayload,
        botPublishIdempotencyKey,
      )),
    ]);
    const botPublishBodies = await Promise.all(
      botPublishResponses.map((candidate) => candidate.json()),
    );
    assert.deepEqual(
      botPublishResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      botPublishBodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    assert.deepEqual(
      botPublishBodies.map(({ data }) => data.outcome),
      ["updated", "updated"],
    );
    assert.equal(botPublishBodies[0].data.flow.status, "active");

    const botMutationEvidence = await pool.query(
      `SELECT
         (SELECT count(*)::integer
          FROM railway_api_mutation_receipts
          WHERE operation IN (
            'bot.flows.draft.save',
            'bot.flows.publish'
          )) AS receipts,
         (SELECT count(*)::integer
          FROM audit_logs
          WHERE action IN (
            'bot.flows.draft.save',
            'bot.flows.publish'
          )) AS audits,
         flow.status,
         flow.version,
         flow.latest_version_key AS "latestVersionKey",
         flow.active_version_key AS "activeVersionKey",
         version.status AS "versionStatus"
       FROM bot_flows AS flow
       INNER JOIN bot_flow_versions AS version
         ON version.tenant_id = flow.tenant_id
        AND version.bot_flow_key = flow.bot_flow_key
        AND version.bot_flow_version_key = flow.active_version_key
       WHERE flow.tenant_id = 1
         AND flow.bot_flow_key = $1`,
      [runtimeBotFlowKey],
    );
    assert.deepEqual(botMutationEvidence.rows, [{
      receipts: 2,
      audits: 2,
      status: "active",
      version: 2,
      latestVersionKey: runtimeBotFlowVersionKey,
      activeVersionKey: runtimeBotFlowVersionKey,
      versionStatus: "published",
    }]);

    const campaignTemplateKey = `template_v1_${"d".repeat(64)}`;
    const campaignLifecycleAt = "2026-08-17T10:20:00.000Z";
    await pool.query(
      `INSERT INTO business_profiles (
         tenant_id,
         business_name,
         timezone,
         interface_language,
         created_at,
         updated_at
       )
       VALUES ($1, 'Connect integration', 'UTC', 'he', $2, $2)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [1, campaignLifecycleAt],
    );
    await pool.query(
      `UPDATE message_templates
       SET
         meta_template_id = '445566778899',
         status = 'approved',
         submission_key = $2,
         submission_started_at = $3,
         last_submission_error_code = NULL,
         last_status_event_key = $4,
         last_status_event_at = $3,
         submitted_at = $3,
         reviewed_at = $3,
         version = version + 1,
         updated_at = $3
       WHERE tenant_id = $1
         AND template_key = $5`,
      [
        1,
        `template_submission_v1_${"6".repeat(64)}`,
        campaignLifecycleAt,
        "7".repeat(64),
        campaignTemplateKey,
      ],
    );

    const campaignDirectoryResponse = await runtime.handler.handle(
      new Request(
        new URL(RAILWAY_API_ENDPOINT_PATH, "https://railway.example.com"),
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${compactJwt}`,
            "content-type": "application/json",
            [VERCEL_OIDC_HEADER]: compactJwt,
          },
          body: JSON.stringify({
            contractVersion: RAILWAY_API_CONTRACT_VERSION,
            operation: "campaigns.directory.read",
            requestKind: "query",
            idempotencyKey: null,
            payload: {},
          }),
        },
      ),
    );
    const campaignDirectoryBody = await campaignDirectoryResponse.json();
    assert.equal(campaignDirectoryResponse.status, 200);
    assert.equal(campaignDirectoryBody.data.deliveryStatus, "ready");
    assert.equal(
      campaignDirectoryBody.data.templates.some(
        ({ templateKey }) => templateKey === campaignTemplateKey,
      ),
      true,
    );

    const campaignSnapshotPayload = Object.freeze({
      name: "HTTP campaign",
      deliveryMode: "scheduled",
      scheduledAt: new Date(
        Date.parse(await currentPostgresTimestamp(pool)) + 86_400_000,
      ).toISOString(),
      templateKey: campaignTemplateKey,
      audienceSource: Object.freeze({ kind: "all" }),
      personalizationMapping: Object.freeze({}),
    });
    const campaignSnapshotIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "campaigns.snapshot.save",
        campaignSnapshotPayload,
      );
    const campaignSnapshotResponses = await Promise.all([
      runtime.handler.handle(createConversationMutationRequest(
        "campaigns.snapshot.save",
        campaignSnapshotPayload,
        campaignSnapshotIdempotencyKey,
      )),
      runtime.handler.handle(createConversationMutationRequest(
        "campaigns.snapshot.save",
        campaignSnapshotPayload,
        campaignSnapshotIdempotencyKey,
      )),
    ]);
    const campaignSnapshotBodies = await Promise.all(
      campaignSnapshotResponses.map((candidate) => candidate.json()),
    );
    assert.deepEqual(
      campaignSnapshotResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      campaignSnapshotBodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    const runtimeCampaignKey =
      campaignSnapshotBodies[0].data.campaign.campaignKey;
    assert.match(runtimeCampaignKey, /^campaign_v1_[0-9a-f]{64}$/);
    assert.equal(
      campaignSnapshotBodies[0].data.campaign.recipientCount > 0,
      true,
    );

    const campaignActivationPayload = Object.freeze({
      campaignKey: runtimeCampaignKey,
      expectedVersion: 1,
    });
    const campaignActivationIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "campaigns.activate",
        campaignActivationPayload,
      );
    const campaignActivationResponses = await Promise.all([
      runtime.handler.handle(createConversationMutationRequest(
        "campaigns.activate",
        campaignActivationPayload,
        campaignActivationIdempotencyKey,
      )),
      runtime.handler.handle(createConversationMutationRequest(
        "campaigns.activate",
        campaignActivationPayload,
        campaignActivationIdempotencyKey,
      )),
    ]);
    const campaignActivationBodies = await Promise.all(
      campaignActivationResponses.map((candidate) => candidate.json()),
    );
    assert.deepEqual(
      campaignActivationResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      campaignActivationBodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    assert.equal(
      campaignActivationBodies[0].data.campaign.status,
      "scheduled",
    );

    const campaignMutationEvidence = await pool.query(
      `SELECT
         (SELECT count(*)::integer
          FROM railway_api_mutation_receipts
          WHERE operation IN (
            'campaigns.snapshot.save',
            'campaigns.activate'
          )) AS receipts,
         (SELECT count(*)::integer
          FROM audit_logs
          WHERE action IN (
            'campaigns.snapshot.save',
            'campaigns.activate'
          )) AS audits,
         campaign.status,
         campaign.version,
         campaign.recipient_count AS "recipientCount"
       FROM campaigns AS campaign
       WHERE campaign.tenant_id = 1
         AND campaign.campaign_key = $1`,
      [runtimeCampaignKey],
    );
    assert.deepEqual(campaignMutationEvidence.rows, [{
      receipts: 2,
      audits: 2,
      status: "scheduled",
      version: 2,
      recipientCount:
        campaignSnapshotBodies[0].data.campaign.recipientCount,
    }]);
    assert.doesNotMatch(
      JSON.stringify({
        campaignDirectoryBody,
        campaignSnapshotBodies,
        campaignActivationBodies,
      }),
      /tenantId|externalUserId|metaTemplateId|driver-integration-owner/,
    );
  } finally {
    await runtime.close();
  }
}

async function verifyPostgresOnboardingBusinessProfileHttpRuntime(
  connectionString,
  pool,
) {
  const externalUserId = "driver-onboarding-owner";
  const runtime = await createPostgresIntegrationApiRuntime(
    connectionString,
    externalUserId,
    [],
    "driver-onboarding-owner@example.com",
    false,
    "org_driver_onboarding",
  );
  const compactJwt = "header.payload.signature";
  const createApiRequest = (
    operation,
    requestKind,
    payload,
    idempotencyKey,
  ) => new Request(
    new URL(RAILWAY_API_ENDPOINT_PATH, "https://railway.example.com"),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${compactJwt}`,
        "content-type": "application/json",
        [VERCEL_OIDC_HEADER]: compactJwt,
      },
      body: JSON.stringify({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation,
        requestKind,
        idempotencyKey,
        payload,
      }),
    },
  );

  try {
    const initialResponse = await runtime.handler.handle(
      createApiRequest(
        "onboarding.business-profile.read",
        "query",
        {},
        null,
      ),
    );
    assert.equal(initialResponse.status, 200);
    assert.deepEqual((await initialResponse.json()).data, {
      profile: null,
    });

    const profilePayload = Object.freeze({
      businessName: "Onboarding integration",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
    });
    const idempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "onboarding.business-profile.save",
        profilePayload,
      );
    const responses = await Promise.all([
      runtime.handler.handle(createApiRequest(
        "onboarding.business-profile.save",
        "mutation",
        profilePayload,
        idempotencyKey,
      )),
      runtime.handler.handle(createApiRequest(
        "onboarding.business-profile.save",
        "mutation",
        profilePayload,
        idempotencyKey,
      )),
    ]);
    const bodies = await Promise.all(
      responses.map((response) => response.json()),
    );
    assert.deepEqual(
      responses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      bodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    assert.deepEqual(
      bodies.map(({ data }) => data.createdTenant),
      [true, true],
    );
    assert.deepEqual(bodies[0].data.profile, {
      ...profilePayload,
      version: 1,
    });
    assert.doesNotMatch(
      JSON.stringify(bodies),
      /tenantId|externalUserId|requestDigest|idempotencyKey|driver-onboarding-owner/,
    );

    const readResponse = await runtime.handler.handle(
      createApiRequest(
        "onboarding.business-profile.read",
        "query",
        {},
        null,
      ),
    );
    assert.equal(readResponse.status, 200);
    assert.deepEqual((await readResponse.json()).data, {
      profile: { ...profilePayload, version: 1 },
    });

    const evidence = await pool.query(
      `SELECT
         tenant.id AS "tenantId",
         tenant.display_name AS "displayName",
         profile.business_name AS "businessName",
         profile.timezone,
         profile.interface_language AS "interfaceLanguage",
         profile.version AS "profileVersion",
         (SELECT count(*)::integer
          FROM tenant_memberships AS owner
          WHERE owner.tenant_id = tenant.id
            AND owner.external_user_id = $1
            AND owner.role = 'owner'
            AND owner.status = 'active') AS owners,
         (SELECT count(*)::integer
          FROM railway_api_mutation_receipts AS receipt
          WHERE receipt.tenant_id = tenant.id
            AND receipt.operation = 'onboarding.business-profile.save'
            AND receipt.status = 'completed') AS receipts,
         (SELECT count(*)::integer
          FROM audit_logs AS audit
          WHERE audit.tenant_id = tenant.id
            AND audit.action = 'onboarding.business-profile.save') AS audits,
         (SELECT count(*)::integer
          FROM audit_logs AS audit
          WHERE audit.tenant_id = tenant.id
            AND audit.action = 'tenant.provisioned') AS "provisioningAudits"
       FROM tenants AS tenant
       INNER JOIN tenant_memberships AS membership
         ON membership.tenant_id = tenant.id
       INNER JOIN business_profiles AS profile
         ON profile.tenant_id = tenant.id
       WHERE membership.external_user_id = $1`,
      [externalUserId],
    );
    assert.deepEqual(evidence.rows, [{
      tenantId: evidence.rows[0]?.tenantId,
      displayName: profilePayload.businessName,
      businessName: profilePayload.businessName,
      timezone: profilePayload.timezone,
      interfaceLanguage: profilePayload.interfaceLanguage,
      profileVersion: 1,
      owners: 1,
      receipts: 1,
      audits: 1,
      provisioningAudits: 1,
    }]);
    const evidenceTenantId = Number(evidence.rows[0]?.tenantId);
    assert.equal(
      Number.isSafeInteger(evidenceTenantId) && evidenceTenantId > 0,
      true,
    );

    await pool.query(
      `UPDATE tenants
       SET status = 'blocked', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [evidenceTenantId],
    );
    const blockedReadResponse = await runtime.handler.handle(
      createApiRequest(
        "onboarding.business-profile.read",
        "query",
        {},
        null,
      ),
    );
    assert.equal(blockedReadResponse.status, 403);
    assert.equal(
      (await blockedReadResponse.json()).code,
      "PERMISSION_DENIED",
    );

    const blockedPayload = Object.freeze({
      ...profilePayload,
      businessName: "Blocked onboarding update",
    });
    const blockedSaveResponse = await runtime.handler.handle(
      createApiRequest(
        "onboarding.business-profile.save",
        "mutation",
        blockedPayload,
        await deriveRailwayApiDeterministicIdempotencyKey(
          "onboarding.business-profile.save",
          blockedPayload,
        ),
      ),
    );
    assert.equal(blockedSaveResponse.status, 403);
    assert.equal(
      (await blockedSaveResponse.json()).code,
      "PERMISSION_DENIED",
    );
    const blockedEvidence = await pool.query(
      `SELECT
         profile.business_name AS "businessName",
         profile.version,
         (SELECT count(*)::integer
          FROM railway_api_mutation_receipts AS receipt
          WHERE receipt.tenant_id = profile.tenant_id
            AND receipt.operation = 'onboarding.business-profile.save')
           AS receipts,
         (SELECT count(*)::integer
          FROM audit_logs AS audit
          WHERE audit.tenant_id = profile.tenant_id
            AND audit.action = 'onboarding.business-profile.save')
           AS audits
       FROM business_profiles AS profile
       WHERE profile.tenant_id = $1`,
      [evidenceTenantId],
    );
    assert.deepEqual(blockedEvidence.rows, [{
      businessName: profilePayload.businessName,
      version: 1,
      receipts: 1,
      audits: 1,
    }]);
  } finally {
    await runtime.close();
  }
}

async function verifyPostgresTenantSelectionHttpRuntime(
  connectionString,
  pool,
) {
  const externalUserId = "driver-tenant-selection-user";
  const firstTenantId = await createTenant(
    pool,
    externalUserId,
    "Tenant selection A",
  );
  const targetTenantId = await createTenant(
    pool,
    externalUserId,
    "Tenant selection B",
  );
  const teamTargetExternalUserId = "driver-team-target";
  const teamInvitationPublications = [];
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
     VALUES (
       $1, $2, 'agent', 'active', 1,
       '2026-08-17T08:00:00.000Z'::timestamptz,
       '2026-08-17T08:00:00.000Z'::timestamptz
     )`,
    [targetTenantId, teamTargetExternalUserId],
  );
  await pool.query(
    `UPDATE tenants
     SET clerk_organization_id = 'org_driver_selection_target'
     WHERE id = $1`,
    [targetTenantId],
  );
  const runtime = await createPostgresIntegrationApiRuntime(
    connectionString,
    externalUserId,
    teamInvitationPublications,
    "driver-integration-owner@example.com",
    false,
    "org_driver_selection_target",
  );
  const compactJwt = "header.payload.signature";
  const createApiRequest = (
    operation,
    requestKind,
    payload,
    idempotencyKey,
  ) => new Request(
    new URL(RAILWAY_API_ENDPOINT_PATH, "https://railway.example.com"),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${compactJwt}`,
        "content-type": "application/json",
        [VERCEL_OIDC_HEADER]: compactJwt,
      },
      body: JSON.stringify({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation,
        requestKind,
        idempotencyKey,
        payload,
      }),
    },
  );

  try {
    const initialResponse = await runtime.handler.handle(
      createApiRequest(
        "tenant-selection.directory.read",
        "query",
        {},
        null,
      ),
    );
    assert.equal(initialResponse.status, 200);
    const initialBody = await initialResponse.json();
    assert.equal(initialBody.data.directory.version, 0);
    assert.equal(initialBody.data.directory.selectionRequired, true);
    assert.equal(initialBody.data.directory.options.length, 2);
    assert.deepEqual(
      initialBody.data.directory.options.map(({ displayName }) => displayName),
      ["Tenant selection A", "Tenant selection B"],
    );
    assert.deepEqual(
      initialBody.data.directory.options.map(({ selected }) => selected),
      [false, false],
    );
    assert.doesNotMatch(
      JSON.stringify(initialBody),
      /tenantId|externalUserId|driver-tenant-selection-user/,
    );

    const targetOption = initialBody.data.directory.options.find(
      ({ displayName }) => displayName === "Tenant selection B",
    );
    assert.match(
      targetOption?.selectionKey ?? "",
      /^tenant_selection_option_v1_[a-f0-9]{64}$/,
    );
    const payload = Object.freeze({
      selectionKey: targetOption.selectionKey,
      expectedVersion: 0,
    });
    const idempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "tenant-selection.save",
        payload,
      );
    const responses = await Promise.all([
      runtime.handler.handle(createApiRequest(
        "tenant-selection.save",
        "mutation",
        payload,
        idempotencyKey,
      )),
      runtime.handler.handle(createApiRequest(
        "tenant-selection.save",
        "mutation",
        payload,
        idempotencyKey,
      )),
    ]);
    const bodies = await Promise.all(
      responses.map((response) => response.json()),
    );
    assert.deepEqual(
      responses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      bodies.map(({ data }) => data.replayed).sort(),
      [false, true],
    );
    assert.deepEqual(
      bodies.map(({ data }) => data.unchanged).sort(),
      [false, true],
    );
    assert.deepEqual(
      bodies.map(({ data }) => data.version),
      [1, 1],
    );
    assert.doesNotMatch(
      JSON.stringify(bodies),
      /tenantId|externalUserId|requestDigest|driver-tenant-selection-user/,
    );

    const selectedResponse = await runtime.handler.handle(
      createApiRequest(
        "tenant-selection.directory.read",
        "query",
        {},
        null,
      ),
    );
    assert.equal(selectedResponse.status, 200);
    const selectedBody = await selectedResponse.json();
    assert.equal(selectedBody.data.directory.version, 1);
    assert.equal(selectedBody.data.directory.selectionRequired, false);
    assert.deepEqual(
      selectedBody.data.directory.options.map(
        ({ displayName, selected }) => ({ displayName, selected }),
      ),
      [
        { displayName: "Tenant selection A", selected: false },
        { displayName: "Tenant selection B", selected: true },
      ],
    );

    const teamResponse = await runtime.handler.handle(
      createApiRequest(
        "team.directory.read",
        "query",
        {},
        null,
      ),
    );
    assert.equal(teamResponse.status, 200);
    const teamBody = await teamResponse.json();
    assert.equal(teamBody.data.directory.identityStatus, "unavailable");
    assert.equal(teamBody.data.directory.members.length, 2);
    assert.deepEqual(
      teamBody.data.directory.members.map(
        ({ role, currentUser, displayName, primaryEmail }) => ({
          role,
          currentUser,
          displayName,
          primaryEmail,
        }),
      ),
      [{
        role: "owner",
        currentUser: true,
        displayName: null,
        primaryEmail: null,
      }, {
        role: "agent",
        currentUser: false,
        displayName: null,
        primaryEmail: null,
      }],
    );
    assert.match(
      teamBody.data.directory.members[0].memberKey,
      /^team_member_v1_[a-f0-9]{64}$/,
    );
    assert.doesNotMatch(
      JSON.stringify(teamBody),
      /tenantId|externalUserId|driver-tenant-selection-user/,
    );

    const membershipPayload = Object.freeze({
      memberKey: deriveTeamMemberKey(
        targetTenantId,
        teamTargetExternalUserId,
      ),
      expectedVersion: 1,
      role: "manager",
    });
    const membershipIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "team.membership.role.change",
        membershipPayload,
      );
    const membershipResponses = await Promise.all([
      runtime.handler.handle(createApiRequest(
        "team.membership.role.change",
        "mutation",
        membershipPayload,
        membershipIdempotencyKey,
      )),
      runtime.handler.handle(createApiRequest(
        "team.membership.role.change",
        "mutation",
        membershipPayload,
        membershipIdempotencyKey,
      )),
    ]);
    const membershipBodies = await Promise.all(
      membershipResponses.map((response) => response.json()),
    );
    assert.deepEqual(
      membershipResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      membershipBodies.map(({ data }) => data.outcome).sort(),
      ["unchanged", "updated"],
    );
    assert.deepEqual(
      membershipBodies.map(({ data }) => data.membership),
      [
        {
          memberKey: membershipPayload.memberKey,
          role: "manager",
          status: "active",
          version: 2,
        },
        {
          memberKey: membershipPayload.memberKey,
          role: "manager",
          status: "active",
          version: 2,
        },
      ],
    );
    assert.doesNotMatch(
      JSON.stringify(membershipBodies),
      /tenantId|externalUserId|driver-team-target|operationKey|eventKey/,
    );
    const membershipEvidence = await pool.query(
      `SELECT
         membership.role,
         membership.version,
         (SELECT count(*)::integer
          FROM tenant_membership_events AS event
          WHERE event.tenant_id = membership.tenant_id
            AND event.target_external_user_id = membership.external_user_id
            AND event.event_type = 'role-changed') AS events
       FROM tenant_memberships AS membership
       WHERE membership.tenant_id = $1
         AND membership.external_user_id = $2`,
      [targetTenantId, teamTargetExternalUserId],
    );
    assert.deepEqual(membershipEvidence.rows, [{
      role: "manager",
      version: 2,
      events: 1,
    }]);

    const invitationPayload = Object.freeze({
      email: "driver-invited-member@example.com",
      role: "agent",
    });
    const invitationIdempotencyKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        "team.invitation.request",
        invitationPayload,
      );
    const invitationResponses = await Promise.all([
      runtime.handler.handle(createApiRequest(
        "team.invitation.request",
        "mutation",
        invitationPayload,
        invitationIdempotencyKey,
      )),
      runtime.handler.handle(createApiRequest(
        "team.invitation.request",
        "mutation",
        invitationPayload,
        invitationIdempotencyKey,
      )),
    ]);
    const invitationBodies = await Promise.all(
      invitationResponses.map((response) => response.json()),
    );
    assert.deepEqual(
      invitationResponses.map(({ status }) => status),
      [200, 200],
    );
    assert.deepEqual(
      invitationBodies.map(({ data }) => data.status).sort(),
      ["already-pending", "queued"],
    );
    assert.equal(teamInvitationPublications.length, 2);
    assert.equal(
      new Set(
        teamInvitationPublications.map(({ deliveryKey }) => deliveryKey),
      ).size,
      1,
    );
    assert.equal(
      teamInvitationPublications.every(
        ({ tenantId }) => tenantId === targetTenantId,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(invitationBodies),
      /tenantId|externalUserId|email|invitationKey|deliveryKey|eventKey/,
    );
    const invitationEvidence = await pool.query(
      `SELECT
         invitation.status,
         invitation.version,
         (SELECT count(*)::integer
          FROM team_invitation_events AS event
          WHERE event.tenant_id = invitation.tenant_id
            AND event.invitation_key = invitation.invitation_key
            AND event.event_type = 'requested') AS events,
         (SELECT count(*)::integer
          FROM team_invitation_deliveries AS delivery
          WHERE delivery.tenant_id = invitation.tenant_id
            AND delivery.invitation_key = invitation.invitation_key) AS deliveries
       FROM team_invitations AS invitation
       WHERE invitation.tenant_id = $1
         AND invitation.normalized_email = $2`,
      [targetTenantId, invitationPayload.email],
    );
    assert.deepEqual(invitationEvidence.rows, [{
      status: "pending",
      version: 1,
      events: 1,
      deliveries: 1,
    }]);

    const invitationKeyEvidence = await pool.query(
      `SELECT invitation_key AS "invitationKey"
       FROM team_invitations
       WHERE tenant_id = $1
         AND normalized_email = $2`,
      [targetTenantId, invitationPayload.email],
    );
    const acceptedInvitationKey =
      invitationKeyEvidence.rows[0]?.invitationKey;
    assert.match(
      acceptedInvitationKey ?? "",
      /^team_invitation_v1_[a-f0-9]{64}$/,
    );
    const inviteeExternalUserId = "driver-invited-member-user";
    const acceptanceRuntime = await createPostgresIntegrationApiRuntime(
      connectionString,
      inviteeExternalUserId,
      [],
      invitationPayload.email,
    );

    try {
      const acceptancePayload = Object.freeze({
        invitationKey: acceptedInvitationKey,
      });
      const acceptanceIdempotencyKey =
        await deriveRailwayApiDeterministicIdempotencyKey(
          "team.invitation.accept",
          acceptancePayload,
        );
      const acceptanceResponses = await Promise.all([
        acceptanceRuntime.handler.handle(createApiRequest(
          "team.invitation.accept",
          "mutation",
          acceptancePayload,
          acceptanceIdempotencyKey,
        )),
        acceptanceRuntime.handler.handle(createApiRequest(
          "team.invitation.accept",
          "mutation",
          acceptancePayload,
          acceptanceIdempotencyKey,
        )),
      ]);
      const acceptanceBodies = await Promise.all(
        acceptanceResponses.map((response) => response.json()),
      );
      assert.deepEqual(
        acceptanceResponses.map(({ status }) => status),
        [200, 200],
      );
      assert.deepEqual(
        acceptanceBodies.map(({ data }) => data.status).sort(),
        ["accepted", "already-accepted"],
      );
      assert.doesNotMatch(
        JSON.stringify(acceptanceBodies),
        /tenantId|externalUserId|verifiedEmail|invitationKey|acceptanceKey/,
      );

      const acceptanceEvidence = await pool.query(
        `SELECT
           invitation.status,
           invitation.version,
           membership.role,
           membership.status AS "membershipStatus",
           membership.version AS "membershipVersion",
           delivery.status AS "deliveryStatus",
           (SELECT count(*)::integer
            FROM team_invitation_acceptances AS acceptance
            WHERE acceptance.invitation_key = invitation.invitation_key)
             AS acceptances,
           (SELECT count(*)::integer
            FROM tenant_memberships AS persisted_membership
            WHERE persisted_membership.tenant_id = invitation.tenant_id
              AND persisted_membership.external_user_id = $3)
             AS memberships
         FROM team_invitations AS invitation
         INNER JOIN tenant_memberships AS membership
           ON membership.tenant_id = invitation.tenant_id
          AND membership.external_user_id = $3
         INNER JOIN team_invitation_deliveries AS delivery
           ON delivery.tenant_id = invitation.tenant_id
          AND delivery.invitation_key = invitation.invitation_key
         WHERE invitation.tenant_id = $1
           AND invitation.invitation_key = $2`,
        [targetTenantId, acceptedInvitationKey, inviteeExternalUserId],
      );
      assert.deepEqual(acceptanceEvidence.rows, [{
        status: "pending",
        version: 2,
        role: "agent",
        membershipStatus: "active",
        membershipVersion: 1,
        deliveryStatus: "cancelled",
        acceptances: 1,
        memberships: 1,
      }]);
    } finally {
      await acceptanceRuntime.close();
    }

    const evidence = await pool.query(
      `SELECT
         selection.tenant_id AS "tenantId",
         selection.version,
         (SELECT count(*)::integer
          FROM railway_api_mutation_receipts AS receipt
          WHERE receipt.tenant_id = selection.tenant_id
            AND receipt.operation = 'tenant-selection.save'
            AND receipt.status = 'completed') AS receipts,
         (SELECT count(*)::integer
          FROM audit_logs AS audit
          WHERE audit.tenant_id = selection.tenant_id
            AND audit.action = 'tenant-selection.save'
            AND audit.target_type = 'tenant_selection') AS audits
       FROM tenant_selections AS selection
       WHERE selection.external_user_id = $1`,
      [externalUserId],
    );
    assert.deepEqual(
      evidence.rows.map(({ tenantId, ...row }) => ({
        tenantId: Number(tenantId),
        ...row,
      })),
      [{
        tenantId: targetTenantId,
        version: 1,
        receipts: 1,
        audits: 1,
      }],
    );
    assert.notEqual(firstTenantId, targetTenantId);
  } finally {
    await runtime.close();
  }
}

async function verifyApiMutationRateLimit(pool, foundation) {
  const policy = Object.freeze({
    policyId: "tenant-mutation",
    policyVersion: 7,
    capacity: 2,
    refillPeriodSeconds: 60,
  });
  const binding = foundation.createMutationRateLimitBinding(policy);
  const subjectKey = `rate_limit_v1_${"3".repeat(64)}`;
  const concurrent = await Promise.all([
    binding.limit({ key: subjectKey }),
    binding.limit({ key: subjectKey }),
    binding.limit({ key: subjectKey }),
  ]);

  assert.deepEqual(
    concurrent.map(({ success }) => success).sort(),
    [false, true, true],
  );
  assert.deepEqual(
    await binding.limit({
      key: `rate_limit_v1_${"4".repeat(64)}`,
    }),
    { success: true },
  );

  const stored = await pool.query(
    `SELECT
       policy_id AS "policyId",
       policy_version AS "policyVersion",
       subject_key AS "subjectKey",
       capacity,
       refill_period_seconds AS "refillPeriodSeconds",
       available_tokens::text AS "availableTokens"
     FROM api_mutation_rate_limit_buckets
     WHERE policy_id = $1
       AND policy_version = $2
       AND subject_key = $3`,
    [policy.policyId, policy.policyVersion, subjectKey],
  );
  assert.equal(stored.rowCount, 1);
  assert.deepEqual(
    {
      policyId: stored.rows[0]?.policyId,
      policyVersion: stored.rows[0]?.policyVersion,
      subjectKey: stored.rows[0]?.subjectKey,
      capacity: stored.rows[0]?.capacity,
      refillPeriodSeconds: stored.rows[0]?.refillPeriodSeconds,
    },
    {
      policyId: "tenant-mutation",
      policyVersion: 7,
      subjectKey,
      capacity: 2,
      refillPeriodSeconds: 60,
    },
  );
  const availableTokens = Number(stored.rows[0]?.availableTokens);
  assert.equal(Number.isFinite(availableTokens), true);
  assert.equal(availableTokens >= 0 && availableTokens < 1, true);

  await assert.rejects(
    foundation
      .createMutationRateLimitBinding({
        ...policy,
        capacity: 3,
      })
      .limit({ key: subjectKey }),
    /policy version conflicts/,
  );

  await pool.query(
    `UPDATE api_mutation_rate_limit_buckets
     SET
       refilled_at = refilled_at - interval '60 seconds',
       updated_at = updated_at
     WHERE policy_id = $1
       AND policy_version = $2
       AND subject_key = $3`,
    [policy.policyId, policy.policyVersion, subjectKey],
  );
  assert.deepEqual(await binding.limit({ key: subjectKey }), {
    success: true,
  });
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

async function verifyBotReplyStagingSafetyEvidence(
  pool,
  foundation,
  tenantId,
) {
  const approvedAt = "2026-08-17T08:37:00.000Z";
  const authorization = Object.freeze({
    tenantId,
    authorizationVersion: 1,
    status: "approved",
    connectionVersion: 2,
    policyVersion: 3,
    recipientFingerprint: `sha256:${"3".repeat(64)}`,
    recipientOptInRecordedAt: "2026-08-17T08:30:00.000Z",
    recipientExpiresAt: "2026-08-18T08:30:00.000Z",
    rateLimitApprovedAt: "2026-08-17T08:35:00.000Z",
    rateLimitExpiresAt: "2026-08-18T08:35:00.000Z",
    rateLimitMethodFingerprint: `sha256:${"2".repeat(64)}`,
    actorExternalUserId: "driver-integration-owner",
    recordedAt: approvedAt,
  });
  const concurrent = await Promise.all([
    foundation.botReplyStagingSafety.record(authorization),
    foundation.botReplyStagingSafety.record(authorization),
  ]);
  assert.equal(concurrent[0].eventKey, concurrent[1].eventKey);
  assert.equal(concurrent[0].authorizationVersion, 1);

  const deterministicSafety =
    createPostgresBotReplyStagingSafetyRepository({
      queries: createNodePostgresQueryExecutor(pool),
      clock: {
        now: () => new Date("2026-08-17T08:38:00.000Z"),
      },
    });
  assert.deepEqual(await deterministicSafety.read(tenantId), {
    environment: "staging",
    connectionMode: "approved-staging-waba",
    connectionStatus: "connected",
    connectionVersion: 2,
    policyVersion: 3,
    deliveryState: "enabled",
    policyEvidenceExpiresAt: "2026-08-18T08:31:00.000Z",
    graphApiVersion: "v21.0",
    credentialSource: "encrypted-vault",
    executionBoundary: "railway-bullmq-bot-reply-worker",
    evidenceSource: "durable-postgres",
    recipientAuthorization: {
      status: "approved",
      optInRecorded: true,
      expiresAt: authorization.recipientExpiresAt,
      recipientFingerprint: authorization.recipientFingerprint,
    },
    rateLimitTestApproval: {
      status: "approved",
      approvedBy: "tal",
      approvedAt: authorization.rateLimitApprovedAt,
      expiresAt: authorization.rateLimitExpiresAt,
      methodFingerprint: authorization.rateLimitMethodFingerprint,
    },
  });

  const revoked = await foundation.botReplyStagingSafety.record({
    ...authorization,
    authorizationVersion: 2,
    status: "revoked",
    recordedAt: "2026-08-17T08:39:00.000Z",
  });
  assert.equal(revoked.status, "revoked");
  assert.equal(await deterministicSafety.read(tenantId), null);

  const persisted = await pool.query(
    `SELECT
       count(*)::integer AS count,
       max(authorization_version)::integer AS latest_version
     FROM bot_reply_staging_authorization_events
     WHERE tenant_id = $1`,
    [tenantId],
  );
  assert.deepEqual(persisted.rows, [{ count: 2, latest_version: 2 }]);

  const audits = await pool.query(
    `SELECT action, metadata_json AS metadata
     FROM audit_logs
     WHERE tenant_id = $1
       AND target_type = 'bot-reply-staging-authorization'
     ORDER BY created_at`,
    [tenantId],
  );
  assert.deepEqual(audits.rows.map(({ action }) => action), [
    "bot-reply-staging.authorization-approved",
    "bot-reply-staging.authorization-revoked",
  ]);
  assert.deepEqual(audits.rows.map(({ metadata }) => metadata.status), [
    "approved",
    "revoked",
  ]);

  await assert.rejects(
    pool.query(
      `UPDATE bot_reply_staging_authorization_events
       SET actor_external_user_id = 'tampered'
       WHERE event_key = $1`,
      [revoked.eventKey],
    ),
    /authorization events are immutable/,
  );
  await assert.rejects(
    pool.query(
      `DELETE FROM audit_logs
       WHERE tenant_id = $1
         AND action = 'bot-reply-staging.authorization-approved'`,
      [tenantId],
    ),
    /authorization audit is immutable/,
  );
}

async function verifyBotReplyStagingRunLedger(
  pool,
  foundation,
  tenantId,
) {
  const stagingPolicy =
    await foundation.whatsappDeliveryPolicies.findLatestPolicyEvent(tenantId);
  assert.equal(stagingPolicy?.deliveryState, "enabled");
  const buttonReplyProjection = await pool.query(
    `SELECT
       message_key AS "messageKey",
       subject_delivery_key AS "subjectDeliveryKey",
       occurred_at AS "occurredAt"
     FROM inbound_button_reply_events
     WHERE tenant_id = $1
     ORDER BY occurred_at DESC, message_key
     LIMIT 1`,
    [tenantId],
  );
  assert.equal(buttonReplyProjection.rowCount, 1);
  const buttonReplySubject = buttonReplyProjection.rows[0];
  const buttonReplyObservedAt = new Date(
    buttonReplySubject.occurredAt,
  ).toISOString();
  const webhookProjection = await pool.query(
    `SELECT
       delivery_key AS "deliveryKey",
       provider_status AS "providerStatus",
       last_status_event_at AS "lastStatusEventAt",
       updated_at AS "updatedAt"
     FROM bot_reply_delivery_provider_links
     WHERE tenant_id = $1
       AND provider_status IN ('sent', 'delivered', 'read')
       AND last_status_event_key IS NOT NULL
     ORDER BY last_status_event_at DESC, delivery_key
     LIMIT 1`,
    [tenantId],
  );
  assert.equal(webhookProjection.rowCount, 1);
  const webhookSubject = webhookProjection.rows[0];
  const webhookObservedAt = new Date(
    webhookSubject.lastStatusEventAt,
  ).toISOString();
  const webhookStoredAt = new Date(
    webhookSubject.updatedAt,
  ).toISOString();
  const providerDeferralProjection = await pool.query(
    `SELECT
       delivery_key AS "deliveryKey",
       provider_error_code AS "providerErrorCode",
       cooldown_scope AS "cooldownScope",
       retry_after_seconds AS "retryAfterSeconds",
       attempted_at AS "attemptedAt",
       retry_at AS "retryAt"
     FROM bot_reply_provider_deferral_events
     WHERE tenant_id = $1
     ORDER BY attempted_at DESC, event_key
     LIMIT 1`,
    [tenantId],
  );
  assert.equal(providerDeferralProjection.rowCount, 1);
  const providerDeferralSubject = providerDeferralProjection.rows[0];
  const providerAttemptedAt = new Date(
    providerDeferralSubject.attemptedAt,
  ).toISOString();
  const providerRetryAt = new Date(
    providerDeferralSubject.retryAt,
  ).toISOString();
  const windowRejectionProjection = await pool.query(
    `SELECT
       delivery_key AS "deliveryKey",
       attempted_at AS "attemptedAt"
     FROM bot_reply_service_window_rejection_events
     WHERE tenant_id = $1
     ORDER BY attempted_at DESC, event_key
     LIMIT 1`,
    [tenantId],
  );
  assert.equal(windowRejectionProjection.rowCount, 1);
  const windowRejectionSubject = windowRejectionProjection.rows[0];
  const windowRejectionObservedAt = new Date(
    windowRejectionSubject.attemptedAt,
  ).toISOString();
  const latestObservedAt = new Date(Math.max(
    Date.parse(webhookObservedAt),
    Date.parse(providerAttemptedAt),
    Date.parse(buttonReplyObservedAt),
    Date.parse(windowRejectionObservedAt),
    Date.parse(webhookStoredAt),
  )).toISOString();
  const webhookClockDelayMilliseconds =
    Date.parse(latestObservedAt) - Date.now();
  assert.equal(webhookClockDelayMilliseconds <= 5_000, true);
  if (webhookClockDelayMilliseconds >= 0) {
    await new Promise((resolve) =>
      setTimeout(resolve, webhookClockDelayMilliseconds + 1)
    );
  }
  const requestedAt = new Date(
    Math.min(
      Date.parse(webhookObservedAt),
      Date.parse(providerAttemptedAt),
      Date.parse(buttonReplyObservedAt),
      Date.parse(windowRejectionObservedAt),
    ) -
      120_000,
  ).toISOString();
  const runKey = `bot_reply_staging_run_v1_${"9".repeat(64)}`;
  const claimedAt = new Date(
    Date.parse(webhookObservedAt) - 60_000,
  ).toISOString();
  const leaseExpiresAt = new Date(
    Date.parse(latestObservedAt) + 1_800_000,
  ).toISOString();
  const completedAt = new Date(
    Date.parse(latestObservedAt) + 60_000,
  ).toISOString();
  const run = Object.freeze({
    runKey,
    targetTenantId: tenantId,
    expectedConnectionVersion: stagingPolicy.connectionVersion,
    expectedPolicyVersion: stagingPolicy.policyVersion,
    releaseId: `connect_release_v1_${"8".repeat(64)}`,
    commitSha: "7".repeat(40),
    artifactDigest: `sha256:${"6".repeat(64)}`,
    graphApiVersion: "v24.0",
    requestedAt,
    recipientFingerprint: `sha256:${"5".repeat(64)}`,
    rateLimitMethodFingerprint: `sha256:${"4".repeat(64)}`,
    actorExternalUserId: "driver-integration-owner",
  });
  const requestDigest = deriveBotReplyStagingDurableRequestDigest(run);
  const auditKey = deriveBotReplyStagingDurableAuditKey(
    runKey,
    requestDigest,
  );
  const claimInput = Object.freeze({
    run,
    requestDigest,
    auditKey,
    claimedAt,
    leaseExpiresAt,
  });

  const claims = await Promise.all([
    foundation.botReplyStagingRuns.claim(claimInput),
    foundation.botReplyStagingRuns.claim(claimInput),
  ]);
  assert.deepEqual(
    claims.map(({ outcome }) => outcome).sort(),
    ["claimed", "in-progress"],
  );
  const claimed = claims.find(({ outcome }) => outcome === "claimed");
  assert.equal(claimed?.claimVersion, 1);
  assert.equal(claimed?.auditKey, auditKey);
  assert.deepEqual(
    await foundation.botReplyStagingRuns.read({ runKey, requestDigest }),
    {
      outcome: "running",
      runKey,
      auditKey,
      claimVersion: 1,
      leaseExpiresAt,
    },
  );

  const subject = await pool.query(
    `SELECT
       delivery.delivery_key AS "deliveryKey",
       delivery.accepted_at AS "acceptedAt"
     FROM bot_reply_deliveries AS delivery
     INNER JOIN bot_reply_delivery_provider_links AS link
       ON link.delivery_key = delivery.delivery_key
      AND link.tenant_id = delivery.tenant_id
     WHERE delivery.tenant_id = $1
       AND delivery.status = 'accepted'
       AND delivery.reply_json ->> 'kind' = 'text'
     ORDER BY delivery.accepted_at DESC, delivery.delivery_key
     LIMIT 1`,
    [tenantId],
  );
  assert.equal(subject.rowCount, 1);
  const deliveryKey = subject.rows[0]?.deliveryKey;
  assert.match(deliveryKey, /^bot_reply_delivery_v1_[0-9a-f]{64}$/);
  const operationKey = `bot_reply_staging_step_v1_${"3".repeat(64)}`;
  const observedAt = new Date(subject.rows[0]?.acceptedAt).toISOString();
  const scenarioContext = Object.freeze({
    run,
    claim: Object.freeze({
      runKey,
      auditKey,
      claimVersion: 1,
      leaseExpiresAt,
    }),
    operationKey,
    deliveryKey,
    scenario: "text-send",
    expectedProviderErrorCode: null,
  });
  const scenarioCase = Object.freeze({
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: "text-send",
    runKey,
    operationKey,
    deliveryKey,
    subjectDeliveryKey: deliveryKey,
    targetTenantId: tenantId,
    connectionVersion: run.expectedConnectionVersion,
    policyVersion: run.expectedPolicyVersion,
    recipientFingerprint: run.recipientFingerprint,
    claimVersion: 1,
    leaseExpiresAt,
    executionMode: "dispatch",
    serviceWindowOpenedAt: "2026-08-16T10:11:00.000Z",
    serviceWindowExpiresAt: "2026-08-17T10:11:00.000Z",
    caseFingerprint: `sha256:${"1".repeat(64)}`,
  });
  const observationRecord = Object.freeze({
    runKey,
    claimVersion: 1,
    operationKey,
    deliveryKey,
    subjectDeliveryKey: deliveryKey,
    recipientFingerprint: run.recipientFingerprint,
    observedAt,
    factKind: "scenario",
    caseName: "text-send",
    scenario: "text-send",
    providerErrorCode: null,
    dispatchOutcome: "accepted",
  });
  const observationWrite =
    await foundation.botReplyStagingSendObservations.recordAcceptedSend(
      scenarioContext,
      scenarioCase,
      { outcome: "accepted" },
    );
  assert.equal(observationWrite.outcome, "created");
  const observationKey = observationWrite.eventKey;
  assert.deepEqual(
    await foundation.botReplyStagingSendObservations.recordAcceptedSend(
      scenarioContext,
      scenarioCase,
      { outcome: "accepted" },
    ),
    { outcome: "unchanged", eventKey: observationKey },
  );
  await assert.rejects(
    foundation.botReplyStagingObservationWriter.record({
      ...observationRecord,
      observedAt: new Date(Date.parse(observedAt) + 1_000).toISOString(),
    }),
    /conflicting staging observation/,
  );
  const scenarioFact = await foundation.botReplyStagingObservations.readScenario(
    scenarioContext,
    scenarioCase,
  );
  assert.equal(scenarioFact.dispatchOutcome, "accepted");
  assert.equal(scenarioFact.observedAt, observedAt);
  assert.match(scenarioFact.recordDigest, /^sha256:[0-9a-f]{64}$/);

  const duplicateContext = Object.freeze({
    run,
    claim: Object.freeze({
      runKey,
      auditKey,
      claimVersion: 1,
      leaseExpiresAt,
    }),
    operationKey: `bot_reply_staging_step_v1_${"a".repeat(64)}`,
    deliveryKey: buttonReplySubject.subjectDeliveryKey,
  });
  const duplicateCase = Object.freeze({
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: "duplicate-safety",
    runKey,
    operationKey: duplicateContext.operationKey,
    deliveryKey: duplicateContext.deliveryKey,
    subjectDeliveryKey: duplicateContext.deliveryKey,
    targetTenantId: tenantId,
    connectionVersion: run.expectedConnectionVersion,
    policyVersion: run.expectedPolicyVersion,
    recipientFingerprint: run.recipientFingerprint,
    claimVersion: 1,
    leaseExpiresAt,
    executionMode: "dispatch",
    serviceWindowOpenedAt: null,
    serviceWindowExpiresAt: null,
    caseFingerprint: `sha256:${"a".repeat(64)}`,
  });
  const duplicateDispatches = Object.freeze([
    Object.freeze({ outcome: "accepted" }),
    Object.freeze({ outcome: "duplicate" }),
  ]);
  const duplicateWrites = await Promise.all([
    foundation.botReplyStagingSendObservations.recordDuplicateSafety(
      duplicateContext,
      duplicateCase,
      duplicateDispatches,
    ),
    foundation.botReplyStagingSendObservations.recordDuplicateSafety(
      duplicateContext,
      duplicateCase,
      duplicateDispatches,
    ),
  ]);
  assert.deepEqual(
    duplicateWrites.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );
  const duplicateFact =
    await foundation.botReplyStagingObservations.readDuplicateSafety(
      duplicateContext,
      duplicateCase,
    );
  assert.equal(duplicateFact.queueDeliveryCount, 2);
  assert.equal(duplicateFact.providerRequestCount, 1);
  assert.deepEqual(
    duplicateFact.dispatchOutcomes,
    ["accepted", "duplicate"],
  );

  const buttonReplyContext = Object.freeze({
    run,
    claim: Object.freeze({
      runKey,
      auditKey,
      claimVersion: 1,
      leaseExpiresAt,
    }),
    operationKey: `bot_reply_staging_step_v1_${"0".repeat(64)}`,
    deliveryKey: `bot_reply_delivery_v1_${"0".repeat(64)}`,
    scenario: "button-reply",
    expectedProviderErrorCode: null,
  });
  const buttonReplyCase = Object.freeze({
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: "button-reply",
    runKey,
    operationKey: buttonReplyContext.operationKey,
    deliveryKey: buttonReplyContext.deliveryKey,
    subjectDeliveryKey: buttonReplySubject.subjectDeliveryKey,
    targetTenantId: tenantId,
    connectionVersion: run.expectedConnectionVersion,
    policyVersion: run.expectedPolicyVersion,
    recipientFingerprint: run.recipientFingerprint,
    claimVersion: 1,
    leaseExpiresAt,
    executionMode: "observe-only",
    serviceWindowOpenedAt: null,
    serviceWindowExpiresAt: null,
    caseFingerprint: `sha256:${"0".repeat(64)}`,
  });
  const buttonReplyWrites = await Promise.all([
    foundation.botReplyStagingSendObservations.recordButtonReply(
      buttonReplyContext,
      buttonReplyCase,
    ),
    foundation.botReplyStagingSendObservations.recordButtonReply(
      buttonReplyContext,
      buttonReplyCase,
    ),
  ]);
  assert.deepEqual(
    buttonReplyWrites.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );
  const buttonReplyFact =
    await foundation.botReplyStagingObservations.readScenario(
      buttonReplyContext,
      buttonReplyCase,
    );
  assert.equal(buttonReplyFact.scenario, "button-reply");
  assert.equal(buttonReplyFact.dispatchOutcome, null);
  assert.equal(buttonReplyFact.observedAt, buttonReplyObservedAt);

  const windowRejectionContext = Object.freeze({
    run,
    claim: Object.freeze({
      runKey,
      auditKey,
      claimVersion: 1,
      leaseExpiresAt,
    }),
    operationKey: `bot_reply_staging_step_v1_${"b".repeat(64)}`,
    deliveryKey: windowRejectionSubject.deliveryKey,
    scenario: "customer-window-expired",
    expectedProviderErrorCode: 131047,
  });
  const windowRejectionCase = Object.freeze({
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: "customer-window-expired",
    runKey,
    operationKey: windowRejectionContext.operationKey,
    deliveryKey: windowRejectionSubject.deliveryKey,
    subjectDeliveryKey: windowRejectionSubject.deliveryKey,
    targetTenantId: tenantId,
    connectionVersion: run.expectedConnectionVersion,
    policyVersion: run.expectedPolicyVersion,
    recipientFingerprint: run.recipientFingerprint,
    claimVersion: 1,
    leaseExpiresAt,
    executionMode: "dispatch",
    serviceWindowOpenedAt: null,
    serviceWindowExpiresAt: null,
    caseFingerprint: `sha256:${"b".repeat(64)}`,
  });
  const windowObservationWrites = await Promise.all([
    foundation.botReplyStagingSendObservations
      .recordServiceWindowRejection(
        windowRejectionContext,
        windowRejectionCase,
        { outcome: "rejected" },
      ),
    foundation.botReplyStagingSendObservations
      .recordServiceWindowRejection(
        windowRejectionContext,
        windowRejectionCase,
        { outcome: "rejected" },
      ),
  ]);
  assert.deepEqual(
    windowObservationWrites.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );
  const windowRejectionFact =
    await foundation.botReplyStagingObservations.readScenario(
      windowRejectionContext,
      windowRejectionCase,
    );
  assert.equal(windowRejectionFact.providerErrorCode, 131047);
  assert.equal(windowRejectionFact.dispatchOutcome, "rejected");
  assert.equal(
    windowRejectionFact.observedAt,
    windowRejectionObservedAt,
  );

  const webhookScenario = webhookSubject.providerStatus === "sent"
    ? "status-sent"
    : webhookSubject.providerStatus === "delivered"
      ? "status-delivered"
      : "status-read";
  const webhookContext = Object.freeze({
    run,
    claim: Object.freeze({
      runKey,
      auditKey,
      claimVersion: 1,
      leaseExpiresAt,
    }),
    operationKey: `bot_reply_staging_step_v1_${"4".repeat(64)}`,
    deliveryKey: `bot_reply_delivery_v1_${"2".repeat(64)}`,
    scenario: webhookScenario,
    expectedProviderErrorCode: null,
  });
  const webhookCase = Object.freeze({
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: webhookScenario,
    runKey,
    operationKey: webhookContext.operationKey,
    deliveryKey: webhookContext.deliveryKey,
    subjectDeliveryKey: webhookSubject.deliveryKey,
    targetTenantId: tenantId,
    connectionVersion: run.expectedConnectionVersion,
    policyVersion: run.expectedPolicyVersion,
    recipientFingerprint: run.recipientFingerprint,
    claimVersion: 1,
    leaseExpiresAt,
    executionMode: "observe-only",
    serviceWindowOpenedAt: null,
    serviceWindowExpiresAt: null,
    caseFingerprint: `sha256:${"0".repeat(64)}`,
  });
  const webhookWrite =
    await foundation.botReplyStagingWebhookObservations.recordStatus(
      webhookContext,
      webhookCase,
    );
  assert.equal(webhookWrite.outcome, "created");
  assert.deepEqual(
    await foundation.botReplyStagingWebhookObservations.recordStatus(
      webhookContext,
      webhookCase,
    ),
    { outcome: "unchanged", eventKey: webhookWrite.eventKey },
  );
  const webhookFact =
    await foundation.botReplyStagingObservations.readScenario(
      webhookContext,
      webhookCase,
    );
  assert.equal(webhookFact.scenario, webhookScenario);
  assert.equal(webhookFact.observedAt, webhookStoredAt);
  assert.equal(webhookFact.dispatchOutcome, null);
  assert.match(webhookFact.recordDigest, /^sha256:[0-9a-f]{64}$/);
  const providerCaseName = providerDeferralSubject.providerErrorCode === 130429
    ? "provider-retry"
    : "pair-limit";
  assert.equal(
    providerCaseName === "provider-retry"
      ? providerDeferralSubject.cooldownScope === "sender"
      : providerDeferralSubject.cooldownScope === "pair",
    true,
  );
  const providerContext = Object.freeze({
    run,
    claim: Object.freeze({
      runKey,
      auditKey,
      claimVersion: 1,
      leaseExpiresAt,
    }),
    operationKey: `bot_reply_staging_step_v1_${"5".repeat(64)}`,
    deliveryKey: providerDeferralSubject.deliveryKey,
  });
  const providerCase = Object.freeze({
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: providerCaseName,
    runKey,
    operationKey: providerContext.operationKey,
    deliveryKey: providerContext.deliveryKey,
    subjectDeliveryKey: providerContext.deliveryKey,
    targetTenantId: tenantId,
    connectionVersion: run.expectedConnectionVersion,
    policyVersion: run.expectedPolicyVersion,
    recipientFingerprint: run.recipientFingerprint,
    claimVersion: 1,
    leaseExpiresAt,
    executionMode: "dispatch",
    serviceWindowOpenedAt: new Date(
      Date.parse(providerAttemptedAt) - 3_600_000,
    ).toISOString(),
    serviceWindowExpiresAt: new Date(
      Date.parse(providerAttemptedAt) + 82_800_000,
    ).toISOString(),
    caseFingerprint: `sha256:${"8".repeat(64)}`,
  });
  const providerDispatch = Object.freeze({
    outcome: "deferred",
    retryAt: providerRetryAt,
  });
  const providerWrite = await foundation
    .botReplyStagingProviderDeferralObservations.recordDeferral(
      providerContext,
      providerCase,
      providerDispatch,
    );
  assert.equal(providerWrite.outcome, "created");
  assert.deepEqual(
    await foundation.botReplyStagingProviderDeferralObservations.recordDeferral(
      providerContext,
      providerCase,
      providerDispatch,
    ),
    { outcome: "unchanged", eventKey: providerWrite.eventKey },
  );
  const providerFact = providerCaseName === "provider-retry"
    ? await foundation.botReplyStagingObservations.readProviderRetry(
      providerContext,
      providerCase,
    )
    : await foundation.botReplyStagingObservations.readPairLimit(
      providerContext,
      providerCase,
    );
  assert.equal(
    providerFact.providerErrorCode,
    providerDeferralSubject.providerErrorCode,
  );
  assert.equal(providerFact.observedAt, providerAttemptedAt);
  if (providerCaseName === "provider-retry") {
    assert.equal(
      providerFact.retryAfterSeconds,
      providerDeferralSubject.retryAfterSeconds,
    );
  }
  assert.match(providerFact.recordDigest, /^sha256:[0-9a-f]{64}$/);

  const killSwitchSource = await pool.query(
    `SELECT
       delivery.conversation_key AS "conversationKey",
       delivery.bot_flow_key AS "botFlowKey",
       delivery.bot_flow_version_key AS "botFlowVersionKey",
       delivery.sender_phone_number_id AS "senderPhoneNumberId",
       delivery.recipient_phone_e164 AS "recipientPhoneNumber",
       delivery.reply_index AS "replyIndex"
     FROM bot_reply_deliveries AS delivery
     WHERE delivery.tenant_id = $1
       AND delivery.delivery_key = $2
     LIMIT 1`,
    [tenantId, deliveryKey],
  );
  assert.equal(killSwitchSource.rowCount, 1);
  const killSource = killSwitchSource.rows[0];
  const killInboundAt = new Date().toISOString();
  const killInboundMessageKey = `message_v1_${"c7".repeat(32)}`;
  const killContact = await foundation.conversations.resolveInboundContact(
    tenantId,
    killSource.recipientPhoneNumber,
  );
  await foundation.conversations.recordInboundMessage(Object.freeze({
    tenantId,
    conversationKey: killSource.conversationKey,
    messageKey: killInboundMessageKey,
    contactId: killContact.contactId,
    providerMessageId: "driver-kill-switch-inbound",
    contentKind: "text",
    textContent: "Kill switch integration",
    occurredAt: killInboundAt,
  }));
  const killReply = Object.freeze({
    kind: "text",
    text: "Kill switch must prevent this provider request",
  });
  const killReplyIndex = killSource.replyIndex + 100;
  const killDeliveryKey = await deriveBotReplyDeliveryKey(tenantId, {
    conversationKey: killSource.conversationKey,
    inboundMessageKey: killInboundMessageKey,
    botFlowVersionKey: killSource.botFlowVersionKey,
    replyIndex: killReplyIndex,
    reply: killReply,
  });
  const killStage = await foundation.botReplyDeliveries.stage(Object.freeze({
    deliveryKey: killDeliveryKey,
    tenantId,
    conversationKey: killSource.conversationKey,
    inboundMessageKey: killInboundMessageKey,
    botFlowKey: killSource.botFlowKey,
    botFlowVersionKey: killSource.botFlowVersionKey,
    senderPhoneNumberId: killSource.senderPhoneNumberId,
    replyIndex: killReplyIndex,
    recipientPhoneNumber: killSource.recipientPhoneNumber,
    reply: killReply,
  }));
  assert.equal(killStage.outcome, "created");
  assert.ok(stagingPolicy.phoneThroughput);
  const killDisabledAt = new Date(
    Date.parse(killStage.delivery.createdAt) + 1,
  ).toISOString();
  const disabledPolicyWrite =
    await foundation.whatsappDeliveryPolicies.recordPolicyEvent({
      tenantId,
      connectionVersion: run.expectedConnectionVersion,
      expectedPolicyVersion: run.expectedPolicyVersion,
      deliveryState: "disabled",
      portfolioLimitKind: stagingPolicy.portfolioCapacity.kind,
      portfolioLimitValue: stagingPolicy.portfolioCapacity.kind === "bounded"
        ? stagingPolicy.portfolioCapacity.maximumUniqueRecipients
        : null,
      phoneThroughputMessagesPerSecond:
        stagingPolicy.phoneThroughput.maximumMessagesPerSecond,
      maximumOutboundMessagesPerSecond:
        stagingPolicy.phoneThroughput.maximumOutboundMessagesPerSecond,
      reservationDurationSeconds: stagingPolicy.reservationDurationSeconds,
      metaGraphApiVersion: stagingPolicy.metaGraphApiVersion,
      evidenceDigest: stagingPolicy.evidenceDigest,
      evidenceCheckedAt: stagingPolicy.evidenceCheckedAt,
      evidenceExpiresAt: stagingPolicy.evidenceExpiresAt,
      actorExternalUserId: run.actorExternalUserId,
      recordedAt: killDisabledAt,
    });
  assert.equal(disabledPolicyWrite.record.deliveryState, "disabled");
  assert.equal(
    disabledPolicyWrite.record.policyVersion,
    run.expectedPolicyVersion + 1,
  );
  const killClockValues = Object.freeze([
    new Date(Date.parse(killDisabledAt) + 1).toISOString(),
    new Date(Date.parse(killDisabledAt) + 2).toISOString(),
    new Date(Date.parse(killDisabledAt) + 3).toISOString(),
  ]);
  let killClockIndex = 0;
  const killClock = Object.freeze({
    now() {
      const value = killClockValues[
        Math.min(killClockIndex, killClockValues.length - 1)
      ];
      killClockIndex += 1;
      return new Date(value);
    },
  });
  let providerRequestCalls = 0;
  let providerSendCalls = 0;
  const killAdmission = createBotReplyAdmission(
    foundation.whatsappRateLimits,
    createWhatsappRateLimitKeyDeriver({
      WHATSAPP_RATE_LIMIT_HMAC_KEY_V1:
        "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
    }),
    createCampaignDeliveryRateLimitPolicySource(
      foundation.whatsappDeliveryPolicies,
    ),
  );
  const killProcessor = createMetaBotReplyProcessor({
    metaConnections: foundation.whatsappDeliveryPolicyMetaConnections,
    credentialVault: {
      async withAccessToken(_tenantId, action) {
        return action("integration-token-never-submitted");
      },
    },
    admission: killAdmission,
    providerRequests: {
      async claim(input) {
        providerRequestCalls += 1;
        return foundation.botReplyDeliveries.claimProviderRequest(input);
      },
    },
    sender: {
      async send() {
        providerSendCalls += 1;
        throw new Error("Kill switch provider boundary was reached");
      },
    },
  });
  const killWorker = createBotReplyDeliveryWorker(
    foundation.botReplyDeliveries,
    killProcessor,
    killClock,
  );
  const killDispatch = await killWorker.dispatch({
    tenantId,
    deliveryKey: killDeliveryKey,
    serviceWindowOpenedAt: killInboundAt,
    serviceWindowExpiresAt: new Date(
      Date.parse(killInboundAt) + 86_400_000,
    ).toISOString(),
  });
  assert.deepEqual(killDispatch, {
    outcome: "deferred",
    retryAt: new Date(
      Date.parse(killClockValues[1]) + 60_000,
    ).toISOString(),
  });
  assert.equal(providerRequestCalls, 0);
  assert.equal(providerSendCalls, 0);
  const killContext = Object.freeze({
    run,
    claim: Object.freeze({
      runKey,
      auditKey,
      claimVersion: 1,
      leaseExpiresAt,
    }),
    operationKey: `bot_reply_staging_step_v1_${"d".repeat(64)}`,
    deliveryKey: killDeliveryKey,
  });
  const killCase = Object.freeze({
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: "kill-switch",
    runKey,
    operationKey: killContext.operationKey,
    deliveryKey: killDeliveryKey,
    subjectDeliveryKey: killDeliveryKey,
    targetTenantId: tenantId,
    connectionVersion: run.expectedConnectionVersion,
    policyVersion: run.expectedPolicyVersion,
    recipientFingerprint: run.recipientFingerprint,
    claimVersion: 1,
    leaseExpiresAt,
    executionMode: "dispatch",
    serviceWindowOpenedAt: killInboundAt,
    serviceWindowExpiresAt: new Date(
      Date.parse(killInboundAt) + 86_400_000,
    ).toISOString(),
    caseFingerprint: `sha256:${"d".repeat(64)}`,
  });
  const disabledPolicyResult = Object.freeze({
    operationKey: killContext.operationKey,
    deliveryKey: killDeliveryKey,
    targetTenantId: tenantId,
    previousPolicyVersion: run.expectedPolicyVersion,
    disabledPolicyVersion: disabledPolicyWrite.record.policyVersion,
    state: "disabled",
    recordedAt: disabledPolicyWrite.record.recordedAt,
    evidenceProof: "durable-policy-integration-proof",
  });
  const killWrites = await Promise.all([
    foundation.botReplyStagingSendObservations.recordKillSwitch(
      killContext,
      killCase,
      disabledPolicyResult,
      killDispatch,
    ),
    foundation.botReplyStagingSendObservations.recordKillSwitch(
      killContext,
      killCase,
      disabledPolicyResult,
      killDispatch,
    ),
  ]);
  assert.deepEqual(
    killWrites.map(({ outcome }) => outcome).sort(),
    ["created", "unchanged"],
  );
  const killFact = await foundation.botReplyStagingObservations.readKillSwitch(
    killContext,
    killCase,
  );
  assert.equal(killFact.policyState, "disabled");
  assert.equal(killFact.providerRequestCount, 0);
  assert.equal(killFact.dispatchOutcome, "deferred");
  assert.match(killFact.recordDigest, /^sha256:[0-9a-f]{64}$/);
  const reenabledPolicyWrite =
    await foundation.whatsappDeliveryPolicies.recordPolicyEvent({
      tenantId,
      connectionVersion: run.expectedConnectionVersion,
      expectedPolicyVersion: disabledPolicyWrite.record.policyVersion,
      deliveryState: "enabled",
      portfolioLimitKind: stagingPolicy.portfolioCapacity.kind,
      portfolioLimitValue: stagingPolicy.portfolioCapacity.kind === "bounded"
        ? stagingPolicy.portfolioCapacity.maximumUniqueRecipients
        : null,
      phoneThroughputMessagesPerSecond:
        stagingPolicy.phoneThroughput.maximumMessagesPerSecond,
      maximumOutboundMessagesPerSecond:
        stagingPolicy.phoneThroughput.maximumOutboundMessagesPerSecond,
      reservationDurationSeconds: stagingPolicy.reservationDurationSeconds,
      metaGraphApiVersion: stagingPolicy.metaGraphApiVersion,
      evidenceDigest: stagingPolicy.evidenceDigest,
      evidenceCheckedAt: stagingPolicy.evidenceCheckedAt,
      evidenceExpiresAt: stagingPolicy.evidenceExpiresAt,
      actorExternalUserId: run.actorExternalUserId,
      recordedAt: new Date(
        Date.parse(killClockValues[2]) + 1,
      ).toISOString(),
    });
  assert.equal(reenabledPolicyWrite.record.deliveryState, "enabled");

  const mismatchedWebhookScenario = webhookScenario === "status-sent"
    ? "status-delivered"
    : "status-sent";
  await assert.rejects(
    foundation.botReplyStagingWebhookObservations.recordStatus(
      { ...webhookContext, scenario: mismatchedWebhookScenario },
      { ...webhookCase, caseName: mismatchedWebhookScenario },
    ),
    /scope is invalid/,
  );
  await assert.rejects(
    pool.query(
      `UPDATE bot_reply_staging_observation_events
       SET dispatch_outcome = 'duplicate'
       WHERE event_key = $1`,
      [observationKey],
    ),
    /observation is immutable/,
  );

  const receipt = Object.freeze({
    scenario: "provider-circuit-open",
    providerSendCount: 0,
    bounded: true,
  });
  const receiptDigest = deriveBotReplyStagingReceiptDigest(receipt);
  const completion = await foundation.botReplyStagingRuns.complete({
    runKey,
    requestDigest,
    expectedClaimVersion: claimed.claimVersion,
    receipt,
    receiptDigest,
    completedAt,
  });
  assert.equal(completion.outcome, "completed");
  assert.deepEqual(completion.receipt, receipt);
  assert.deepEqual(
    await foundation.botReplyStagingRuns.read({ runKey, requestDigest }),
    {
      outcome: "completed",
      runKey,
      auditKey,
      claimVersion: 1,
      completedAt,
      receipt,
    },
  );

  const renewedRun = Object.freeze({
    ...run,
    requestedAt: "2026-08-17T10:11:00.000Z",
  });
  const replay = await foundation.botReplyStagingRuns.claim({
    ...claimInput,
    run: renewedRun,
  });
  assert.equal(replay.outcome, "replayed");
  assert.equal(replay.completedAt, completedAt);
  assert.deepEqual(replay.receipt, receipt);

  const otherActorRun = Object.freeze({
    ...run,
    actorExternalUserId: "driver-integration-backup",
  });
  const otherActorDigest =
    deriveBotReplyStagingDurableRequestDigest(otherActorRun);
  assert.deepEqual(
    await foundation.botReplyStagingRuns.claim({
      run: otherActorRun,
      requestDigest: otherActorDigest,
      auditKey: deriveBotReplyStagingDurableAuditKey(
        runKey,
        otherActorDigest,
      ),
      claimedAt,
      leaseExpiresAt,
    }),
    { outcome: "conflict", runKey },
  );

  const audits = await pool.query(
    `SELECT
       action,
       actor_external_user_id AS "actorExternalUserId",
       idempotency_key AS "idempotencyKey",
       metadata_json AS metadata
     FROM audit_logs
     WHERE target_type = 'bot-reply-staging-run'
       AND target_id = $1
     ORDER BY created_at, action`,
    [runKey],
  );
  assert.equal(audits.rowCount, 2);
  assert.deepEqual(
    audits.rows.map(({ action }) => action),
    ["bot-reply-staging.started", "bot-reply-staging.completed"],
  );
  assert.equal(audits.rows[0]?.actorExternalUserId, run.actorExternalUserId);
  assert.equal(audits.rows[1]?.actorExternalUserId, run.actorExternalUserId);
  assert.equal(audits.rows[0]?.idempotencyKey, auditKey);
  assert.equal(audits.rows[1]?.idempotencyKey, auditKey);
  assert.deepEqual(audits.rows[1]?.metadata, {
    claimVersion: 1,
    receiptDigest,
    requestDigest,
  });

  await assert.rejects(
    pool.query(
      `UPDATE audit_logs
       SET metadata_json = '{}'::jsonb
       WHERE target_type = 'bot-reply-staging-run'
         AND target_id = $1`,
      [runKey],
    ),
    /Bot reply staging audit is immutable/,
  );
  await assert.rejects(
    pool.query(
      `DELETE FROM bot_reply_staging_runs
       WHERE run_key = $1`,
      [runKey],
    ),
    /Bot reply staging run cannot be deleted/,
  );
  return reenabledPolicyWrite.record.eventKey;
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
    const transactions = createNodePostgresTransactionManager(pool);
    await verifyFullDataMigrationBundle(pool, transactions);
    const tenantId = await createTenant(pool);
    await verifyBotReplyStagingAttestationNoncePostgres(
      pool,
      transactions,
      tenantId,
    );
    const attestedEvidenceConcurrencyScenarios =
      await verifyBotReplyStagingAttestedEvidencePostgres(
        pool,
        transactions,
        tenantId,
      );
    let providerOperationFenceConcurrencyScenarios = 0;
    const foundation = createRailwayPostgresFoundation({
      environment: postgresEnvironment(checkedConnectionString),
      telemetry: {
        recordIdleClientError() {},
      },
    });

    try {
      await foundation.identityOrganizations.ensureBinding({
        tenantId,
        externalOrganizationId: "org_driver_integration",
      });
      await verifyContactLifecycle(
        pool,
        transactions,
        foundation.railwayApiMutations,
        foundation.contacts,
        tenantId,
      );
      await verifyContactConsentLifecycle(pool, foundation, tenantId);
      const contactOrganization = await verifyContactOrganizationImportSchema(
        pool,
        foundation,
        tenantId,
      );
      await verifyCampaignAudienceRead(
        foundation,
        tenantId,
        contactOrganization,
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
      await verifyBotReplyStagingSafetyEvidence(
        pool,
        foundation,
        tenantId,
      );
      await verifyConversationMessageSchema(pool, tenantId);
      await verifyTemplateCampaignSchema(pool, tenantId);
      await verifyMessageTemplateSubmissionOutboxLifecycle(pool, foundation);
      await verifyBotDeliverySchema(pool, tenantId);
      await verifyAiReportingSchema(pool, foundation, tenantId);
      await verifyApiMutationRateLimit(pool, foundation);
      await verifyPostgresHttpRuntime(checkedConnectionString, pool);
      await verifyConversationLifecycle(pool, foundation, tenantId);
      await verifyBotFlowDeliveryLifecycle(pool, foundation, tenantId);
      const sourceKey = await verifyKnowledgeLifecycle(
        pool,
        foundation,
        tenantId,
      );
      await verifyPostgresAiAgentHttpRuntime(
        checkedConnectionString,
        pool,
        tenantId,
        sourceKey,
      );
      const aiAgent = await verifyAiAgentLifecycle(
        pool,
        foundation,
        tenantId,
        sourceKey,
      );
      const aiRuntime = await verifyAiRuntimePersistence(
        pool,
        foundation,
        tenantId,
        aiAgent,
      );
      await verifyPostgresAiReplyApprovalHttpRuntime(
        checkedConnectionString,
        pool,
        aiRuntime.httpReplyOutboxKey,
      );
      await verifyInvitationLifecycle(pool, foundation, tenantId);
      await verifyWorkerSchedulerLease(pool, foundation);
      const postKillSwitchPolicyEventKey =
        await verifyBotReplyStagingRunLedger(pool, foundation, tenantId);
      await verifyCampaignDispatch(pool, foundation, tenantId);
      await verifyCampaignProviderReconciliation(
        pool,
        foundation,
        tenantId,
        postKillSwitchPolicyEventKey,
      );
      await verifyTenantSubscriptionLifecycle(pool, foundation);
      const provisionedTenantId =
        await verifyTenantProvisioningLifecycle(pool, foundation);
      await verifySystemAdminLifecycle(
        pool,
        foundation,
        provisionedTenantId,
      );
      await verifyProductionDecisionLifecycle(pool, foundation);
      await verifyPostgresSystemAdminWhatsappDeliveryPolicyHttpRuntime(
        checkedConnectionString,
        pool,
        tenantId,
      );
      await verifyPostgresOnboardingBusinessProfileHttpRuntime(
        checkedConnectionString,
        pool,
      );
      await verifyPostgresTenantSelectionHttpRuntime(
        checkedConnectionString,
        pool,
      );
      providerOperationFenceConcurrencyScenarios =
        await verifyBotReplyStagingProviderOperationFencePostgres(
          pool,
          tenantId,
        );
    } finally {
      await foundation.close();
    }

    return Object.freeze({
      status: "passed",
      migrationCount: migrationFiles.length,
      concurrencyScenarios:
        90 + attestedEvidenceConcurrencyScenarios +
          providerOperationFenceConcurrencyScenarios,
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
