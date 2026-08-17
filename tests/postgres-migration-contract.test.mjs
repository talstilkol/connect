import assert from "node:assert/strict";
import {
  readFileSync,
  readdirSync,
} from "node:fs";
import test from "node:test";

import {
  inspectPostgresMigrationContract,
  validatePostgresMigrationSources,
} from "../scripts/verify-postgres-migration-contract.mjs";

const migrationsUrl = new URL(
  "../postgres/migrations/",
  import.meta.url,
);
const migrationFiles = readdirSync(migrationsUrl)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();
const migrationSources = migrationFiles.map((fileName) =>
  readFileSync(new URL(fileName, migrationsUrl), "utf8"),
);
const coreSchema = migrationSources[0];
const accessSchema = migrationSources[2];
const membershipEventSchema = migrationSources[3];
const invitationSchema = migrationSources[4];
const conversationSchema = migrationSources[5];
const campaignSchema = migrationSources[6];
const botSchema = migrationSources[7];
const aiSchema = migrationSources[8];
const contactOrganizationImportSchema = migrationSources[9];
const metaConnectionCredentialSchema = migrationSources[10];
const whatsappDeliveryPolicySchema = migrationSources[11];

test("keeps the PostgreSQL critical-path migration inventory ordered", async () => {
  assert.deepEqual(migrationFiles, [
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
  ]);
  assert.deepEqual(
    await inspectPostgresMigrationContract(),
    {
      status: "passed",
      migrationCount: 12,
      findings: [],
    },
  );
});

test("defines immutable and audited PostgreSQL WhatsApp delivery policy", () => {
  assert.match(
    whatsappDeliveryPolicySchema,
    /CREATE TABLE whatsapp_campaign_delivery_policy_events/,
  );
  assert.match(
    whatsappDeliveryPolicySchema,
    /enforce_whatsapp_delivery_policy_insert[\s\S]*FOR UPDATE[\s\S]*version is not sequential[\s\S]*disable transition is invalid/,
  );
  assert.match(
    whatsappDeliveryPolicySchema,
    /audit_whatsapp_delivery_policy_insert[\s\S]*INSERT INTO audit_logs[\s\S]*whatsapp\.delivery_policy\.recorded/,
  );
  assert.match(
    whatsappDeliveryPolicySchema,
    /reject_whatsapp_delivery_policy_mutation[\s\S]*events are immutable[\s\S]*BEFORE UPDATE[\s\S]*BEFORE DELETE/,
  );
});

test("defines tenant-bound PostgreSQL Meta state without plaintext credentials", () => {
  assert.match(
    metaConnectionCredentialSchema,
    /CREATE TABLE meta_connections[\s\S]*CREATE TABLE meta_webhook_receipts[\s\S]*CREATE TABLE meta_credential_envelopes/,
  );
  assert.match(
    metaConnectionCredentialSchema,
    /meta_webhook_receipts_connection_fk[\s\S]*FOREIGN KEY \(tenant_id, waba_id\)[\s\S]*REFERENCES meta_connections \(tenant_id, waba_id\)/,
  );
  assert.match(
    metaConnectionCredentialSchema,
    /meta_connections_lifecycle_consistent[\s\S]*status = 'pending'[\s\S]*status = 'connected'/,
  );
  assert.match(
    metaConnectionCredentialSchema,
    /meta_webhook_receipts_state_consistent[\s\S]*status = 'processing'[\s\S]*status = 'processed'[\s\S]*status = 'failed'/,
  );
  assert.match(
    metaConnectionCredentialSchema,
    /meta_credential_envelopes_ciphertext_bounded[\s\S]*ciphertext ~ '\^\[A-Za-z0-9\+\/\]\+=\{0,2\}\$'/,
  );
  assert.doesNotMatch(
    metaConnectionCredentialSchema,
    /access_token|plaintext|secret_value/i,
  );
});

test("defines tenant-isolated PostgreSQL contact organization and imports", () => {
  assert.match(
    contactOrganizationImportSchema,
    /CREATE TABLE contact_tags[\s\S]*CREATE TABLE contact_lists[\s\S]*CREATE TABLE contact_tag_assignments[\s\S]*CREATE TABLE contact_list_memberships[\s\S]*CREATE TABLE contact_import_jobs[\s\S]*CREATE TABLE contact_import_rows/,
  );
  assert.match(
    contactOrganizationImportSchema,
    /contact_tag_assignments_contact_fk[\s\S]*FOREIGN KEY \(tenant_id, contact_id\)[\s\S]*REFERENCES contacts \(tenant_id, id\)/,
  );
  assert.match(
    contactOrganizationImportSchema,
    /contact_list_memberships_list_fk[\s\S]*FOREIGN KEY \(tenant_id, list_id\)[\s\S]*REFERENCES contact_lists \(tenant_id, id\)/,
  );
  assert.match(
    contactOrganizationImportSchema,
    /contact_import_rows_job_fk[\s\S]*FOREIGN KEY \(tenant_id, job_id\)[\s\S]*REFERENCES contact_import_jobs \(tenant_id, id\)/,
  );
  assert.match(
    contactOrganizationImportSchema,
    /contact_import_jobs_counts_valid[\s\S]*processed_rows = created_rows[\s\S]*duplicate_rows/,
  );
  assert.match(
    contactOrganizationImportSchema,
    /contact_import_rows_outcome_consistent[\s\S]*status IN \('created', 'updated', 'unchanged'\)[\s\S]*status = 'duplicate'[\s\S]*status = 'rejected'/,
  );
});

test("defines tenant-scoped PostgreSQL conversations and messages", () => {
  assert.match(
    conversationSchema,
    /CREATE TABLE conversations[\s\S]*CREATE TABLE messages/,
  );
  assert.match(
    conversationSchema,
    /conversations_contact_fk[\s\S]*FOREIGN KEY \(tenant_id, contact_id\)[\s\S]*REFERENCES contacts \(tenant_id, id\)/,
  );
  assert.match(
    conversationSchema,
    /conversations_last_message_pair_consistent[\s\S]*last_message_key IS NULL AND last_message_at IS NULL/,
  );
  assert.match(
    conversationSchema,
    /messages_direction_status_consistent[\s\S]*direction = 'inbound'[\s\S]*status = 'received'/,
  );
  assert.match(
    conversationSchema,
    /messages_tenant_occurred_idx[\s\S]*\(tenant_id, occurred_at\)/,
  );
});

test("defines PostgreSQL templates and tenant-scoped campaigns", () => {
  assert.match(
    campaignSchema,
    /CREATE TABLE message_templates[\s\S]*CREATE TABLE campaigns/,
  );
  assert.match(
    campaignSchema,
    /message_templates_lifecycle_consistent[\s\S]*status = 'submitting'[\s\S]*status = 'pending_review'/,
  );
  assert.match(
    campaignSchema,
    /campaigns_template_fk[\s\S]*FOREIGN KEY \(tenant_id, template_key\)[\s\S]*REFERENCES message_templates \(tenant_id, template_key\)/,
  );
  assert.match(
    campaignSchema,
    /campaigns_schedule_consistent[\s\S]*delivery_mode = 'immediate'[\s\S]*delivery_mode = 'scheduled'/,
  );
  assert.match(
    campaignSchema,
    /campaigns_tenant_created_idx[\s\S]*\(tenant_id, created_at\)/,
  );
});

test("defines PostgreSQL bot flows, versions, and deliveries", () => {
  assert.match(
    botSchema,
    /CREATE TABLE bot_flows[\s\S]*CREATE TABLE bot_flow_versions[\s\S]*CREATE TABLE bot_reply_deliveries/,
  );
  assert.match(
    botSchema,
    /bot_flow_versions_one_published_uq[\s\S]*WHERE status = 'published'/,
  );
  assert.match(
    botSchema,
    /bot_reply_deliveries_flow_version_fk[\s\S]*FOREIGN KEY \(tenant_id, bot_flow_key, bot_flow_version_key\)/,
  );
  assert.match(
    botSchema,
    /bot_reply_deliveries_state_consistent[\s\S]*status = 'pending'[\s\S]*status = 'accepted'[\s\S]*status IN \('rejected', 'ambiguous'\)/,
  );
  assert.match(
    botSchema,
    /bot_reply_deliveries_tenant_created_idx[\s\S]*\(tenant_id, created_at\)/,
  );
});

test("defines PostgreSQL AI agents, usage, and audit report sources", () => {
  assert.match(
    aiSchema,
    /CREATE TABLE ai_agents[\s\S]*CREATE TABLE ai_agent_versions[\s\S]*CREATE TABLE ai_runtime_cost_authorizations[\s\S]*CREATE TABLE ai_runtime_usage[\s\S]*CREATE TABLE ai_runtime_audit_events/,
  );
  assert.match(
    aiSchema,
    /ai_runtime_usage_authorization_fk[\s\S]*FOREIGN KEY \(tenant_id, request_key\)/,
  );
  assert.match(
    aiSchema,
    /ai_runtime_audit_events_agent_version_fk[\s\S]*FOREIGN KEY \(tenant_id, ai_agent_key, ai_agent_version_key\)/,
  );
  assert.match(
    aiSchema,
    /ai_runtime_audit_events_state_consistent[\s\S]*outcome = 'reply-planned'[\s\S]*outcome = 'handoff'/,
  );
  assert.match(
    aiSchema,
    /ai_runtime_usage_tenant_created_idx[\s\S]*ai_runtime_audit_events_tenant_created_idx/,
  );
});

test("defines the complete PostgreSQL invitation lifecycle in dependency order", () => {
  assert.match(
    invitationSchema,
    /CREATE TABLE team_invitations[\s\S]*CREATE TABLE team_invitation_events[\s\S]*CREATE TABLE team_invitation_deliveries[\s\S]*CREATE TABLE team_invitation_acceptances/,
  );
  assert.match(
    invitationSchema,
    /team_invitations_tenant_email_uq[\s\S]*UNIQUE \(tenant_id, normalized_email\)/,
  );
  assert.match(
    invitationSchema,
    /team_invitation_events_operation_uq[\s\S]*UNIQUE \(operation_key\)/,
  );
  assert.match(
    invitationSchema,
    /team_invitation_deliveries_invitation_version_uq[\s\S]*UNIQUE \(invitation_key, invitation_version\)/,
  );
  assert.match(
    invitationSchema,
    /team_invitation_acceptances_tenant_user_uq[\s\S]*UNIQUE \(tenant_id, external_user_id\)/,
  );
});

test("guards invitation state, delivery reconciliation, and immutable evidence", () => {
  assert.match(
    invitationSchema,
    /CREATE TRIGGER team_invitations_state_version_guard[\s\S]*BEFORE UPDATE OF[\s\S]*last_actor_kind/,
  );
  assert.match(
    invitationSchema,
    /CREATE TRIGGER team_invitation_events_state_guard[\s\S]*BEFORE INSERT/,
  );
  assert.match(
    invitationSchema,
    /OLD\.status = 'ambiguous'[\s\S]*NEW\.status = 'submitted'[\s\S]*OLD\.status = 'ambiguous'[\s\S]*NEW\.status = 'blocked'/,
  );
  assert.match(
    invitationSchema,
    /CREATE TRIGGER team_invitations_delivery_active_guard[\s\S]*BEFORE UPDATE OF role, status, version/,
  );
  assert.match(
    invitationSchema,
    /CREATE TRIGGER team_invitation_acceptances_state_guard[\s\S]*BEFORE INSERT/,
  );
  assert.match(
    invitationSchema,
    /CREATE TRIGGER team_invitation_acceptances_update_delete_guard[\s\S]*BEFORE UPDATE OR DELETE/,
  );
  assert.match(
    invitationSchema,
    /team-invitation-expiration-scheduler-v1/,
  );
});

test("defines an immutable PostgreSQL membership event ledger", () => {
  assert.match(
    membershipEventSchema,
    /CREATE TABLE tenant_membership_events[\s\S]*UNIQUE \(operation_key, target_external_user_id\)/,
  );
  assert.match(
    membershipEventSchema,
    /tenant_membership_events_shape_valid[\s\S]*owner-transfer-out[\s\S]*owner-transfer-in/,
  );
  assert.match(
    membershipEventSchema,
    /CREATE TRIGGER tenant_membership_events_update_delete_guard[\s\S]*BEFORE UPDATE OR DELETE/,
  );
  assert.match(
    membershipEventSchema,
    /CREATE TRIGGER tenant_membership_events_state_guard[\s\S]*BEFORE INSERT/,
  );
  assert.match(
    membershipEventSchema,
    /CREATE TRIGGER tenant_memberships_last_owner_update_guard[\s\S]*CREATE TRIGGER tenant_memberships_last_owner_delete_guard/,
  );
});

test("defines tenant, audit, and contact prerequisites with PostgreSQL-native types", () => {
  assert.match(
    coreSchema,
    /CREATE TABLE tenants[\s\S]*id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY/,
  );
  assert.match(
    coreSchema,
    /CREATE TABLE audit_logs[\s\S]*metadata_json JSONB/,
  );
  assert.match(
    coreSchema,
    /CREATE TABLE contacts[\s\S]*consent_recorded_at TIMESTAMPTZ/,
  );
  assert.match(
    coreSchema,
    /created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP/,
  );
  assert.match(
    coreSchema,
    /contacts_tenant_phone_uq[\s\S]*UNIQUE \(tenant_id, phone_e164\)/,
  );
  assert.match(
    coreSchema,
    /contacts_phone_e164_valid[\s\S]*phone_e164 ~ '\^\\\+\[1-9\]\[0-9\]\{0,14\}\$'/,
  );
});

test("scopes audit idempotency to tenant and action", () => {
  assert.match(
    coreSchema,
    /audit_logs_tenant_action_idempotency_uq[\s\S]*\(tenant_id, action, idempotency_key\)[\s\S]*WHERE idempotency_key IS NOT NULL/,
  );
  assert.doesNotMatch(
    coreSchema,
    /UNIQUE\s*\(idempotency_key\)/,
  );
});

test("defines tenant access isolation and exact membership version transitions", () => {
  assert.match(
    accessSchema,
    /CREATE TABLE tenant_memberships[\s\S]*UNIQUE \(tenant_id, external_user_id\)/,
  );
  assert.match(
    accessSchema,
    /CREATE TABLE tenant_selections[\s\S]*FOREIGN KEY \(tenant_id, external_user_id\)[\s\S]*REFERENCES tenant_memberships \(tenant_id, external_user_id\)[\s\S]*ON DELETE CASCADE/,
  );
  assert.match(
    accessSchema,
    /CREATE TRIGGER tenant_memberships_state_version_guard[\s\S]*BEFORE UPDATE OF role, status, version/,
  );
  assert.match(
    accessSchema,
    /NEW\.version <> OLD\.version \+ 1/,
  );
  assert.match(
    accessSchema,
    /CREATE TABLE business_profiles[\s\S]*interface_language IN \('he', 'en', 'ar'\)/,
  );
});

test("rejects missing prerequisites and SQLite migration syntax", () => {
  const sources = [
    "CREATE TABLE tenants (id BIGINT);",
    "CREATE TABLE audit_logs (id BIGINT);",
  ];
  const findings = validatePostgresMigrationSources({
    migrationFiles: [
      "0000_core_contacts.sql",
      "0002_wrong_sequence.sql",
    ],
    sources: [
      sources[0],
      `${sources[1]} PRAGMA foreign_keys = ON;`,
    ],
  });
  const codes = findings.map(({ code }) => code);

  assert.equal(
    codes.includes("POSTGRES_REQUIRED_MIGRATION_PREFIX_INVALID"),
    true,
  );
  assert.equal(
    codes.includes("POSTGRES_MIGRATION_SEQUENCE_INVALID"),
    true,
  );
  assert.equal(
    codes.includes("POSTGRES_SQLITE_PRAGMA"),
    true,
  );
  assert.equal(
    codes.includes("POSTGRES_REQUIRED_TABLE_SEQUENCE_INVALID"),
    true,
  );
});

test("rejects destructive, seeded, and random-identity migrations", () => {
  const findings = validatePostgresMigrationSources({
    migrationFiles: [
      "0000_core_contacts.sql",
      "0001_railway_api_mutation_receipts.sql",
    ],
    sources: [
      [
        "CREATE TABLE tenants (id BIGINT);",
        "CREATE TABLE audit_logs (id BIGINT);",
        "CREATE TABLE contacts (id BIGINT);",
      ].join("\n"),
      [
        "CREATE TABLE railway_api_mutation_receipts (id BIGINT);",
        "INSERT INTO railway_api_mutation_receipts (id) VALUES (1);",
        "DELETE FROM railway_api_mutation_receipts;",
        "SELECT gen_random_uuid();",
      ].join("\n"),
    ],
  });
  const codes = findings.map(({ code }) => code);

  assert.equal(codes.includes("POSTGRES_SEED_DATA_PRESENT"), true);
  assert.equal(
    codes.includes("POSTGRES_DESTRUCTIVE_STATEMENT"),
    true,
  );
  assert.equal(codes.includes("POSTGRES_RANDOM_IDENTITY"), true);
});

test("rejects seed data hidden inside a PostgreSQL function body", () => {
  const tamperedSources = [...migrationSources];
  tamperedSources[11] = `${tamperedSources[11]}
    CREATE FUNCTION seed_hidden_policy()
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      INSERT INTO whatsapp_campaign_delivery_policy_events (
        event_key
      ) VALUES ('forbidden-seed');
    END;
    $$;
  `;
  const findings = validatePostgresMigrationSources({
    migrationFiles,
    sources: tamperedSources,
  });

  assert.equal(
    findings.some(({ code }) => code === "POSTGRES_SEED_DATA_PRESENT"),
    true,
  );
});
