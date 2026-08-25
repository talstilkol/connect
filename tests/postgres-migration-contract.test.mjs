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
const whatsappRateLimitLedgerSchema = migrationSources[12];
const whatsappPhoneThroughputSchema = migrationSources[13];
const workerSchedulerLeaseSchema = migrationSources[14];
const campaignDispatchSchema = migrationSources[15];
const aiKnowledgeSchema = migrationSources[16];
const aiReplyOutboxSchema = migrationSources[17];
const tenantSubscriptionSchema = migrationSources[18];
const productionDecisionSchema = migrationSources[19];
const systemAdminBusinessProfileSchema = migrationSources[20];
const contactConsentSchema = migrationSources[21];
const campaignDeliveryProviderSchema = migrationSources[22];
const apiMutationRateLimitSchema = migrationSources[23];
const whatsappLegacyReservationCategorySchema = migrationSources[24];
const dataMigrationBundleReceiptSchema = migrationSources[25];
const messageTemplateSubmissionOutboxSchema = migrationSources[26];
const clerkOrganizationBindingSchema = migrationSources[27];
const clerkInvitationRateLimitSchema = migrationSources[28];
const invitationDeferralSchema = migrationSources[29];
const whatsappServiceReplyReservationSchema =
  migrationSources[30];
const botReplyDeliveryProviderSchema =
  migrationSources[32];
const botReplyStagingRunSchema = migrationSources[33];
const botReplyStagingAuthorizationSchema = migrationSources[34];
const botReplyStagingObservationSchema = migrationSources[35];
const botReplyProviderDeferralSchema = migrationSources[36];
const inboundButtonReplySchema = migrationSources[37];
const serviceWindowRejectionSchema = migrationSources[38];
const providerRequestFenceSchema = migrationSources[39];
const releaseEvidenceSchema = migrationSources[40];
const productionReadinessV2EvidenceSchema = migrationSources[41];
const botReplyProviderOutcomeRequestFenceSchema = migrationSources[42];
const botReplyReleaseEvidenceAtomicPublishSchema = migrationSources[44];
const botReplyProviderClockDomainsSchema = migrationSources[45];
const botReplyStagingAttestationNonceSchema = migrationSources[47];
const botReplyStagingAttestedEvidenceAtomicPublishSchema =
  migrationSources[48];
const botReplyStagingAttestedEvidenceReadbackSchema =
  migrationSources[49];
const botReplyStagingTriggerHardeningSchema =
  migrationSources[50];
const botReplyStagingRunCapabilityWrappersSchema =
  migrationSources[51];
const botReplyStagingAuthorizationObservationHardeningSchema =
  migrationSources[52];
const botReplyStagingProviderOperationFenceSchema =
  migrationSources[53];
const metaCredentialRevisionLedgerSchema =
  migrationSources[54];

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
    "0054_meta_credential_revision_ledger.sql",
  ]);
  assert.deepEqual(
    await inspectPostgresMigrationContract(),
    {
      status: "passed",
      migrationCount: 55,
      findings: [],
    },
  );
});

test("hardens staging authorization and observation boundaries", () => {
  assert.equal(
    (botReplyStagingAuthorizationObservationHardeningSchema.match(
      /SET search_path = pg_catalog, pg_temp/g,
    ) ?? []).length,
    8,
  );
  assert.match(
    botReplyStagingAuthorizationObservationHardeningSchema,
    /NEW\.observed_at >= active_run\.lease_expires_at[\s\S]*database_now >= active_run\.lease_expires_at/,
  );
  assert.match(
    botReplyStagingAuthorizationObservationHardeningSchema,
    /CREATE FUNCTION public\.guard_bot_reply_staging_audit_insert\(\)[\s\S]*pg_catalog\.pg_trigger_depth\(\) < 2/,
  );
  assert.doesNotMatch(
    botReplyStagingAuthorizationObservationHardeningSchema,
    /\bSECURITY DEFINER\b|\bGRANT\b|\bCREATE ROLE\b|\bALTER ROLE\b/i,
  );
});

test("keeps the staging provider side effect behind one dormant operation fence", () => {
  assert.match(
    botReplyStagingProviderOperationFenceSchema,
    /reserve_bot_reply_staging_provider_operation_v1/,
  );
  assert.match(
    botReplyStagingProviderOperationFenceSchema,
    /finalize_bot_reply_staging_provider_operation_v1/,
  );
  assert.match(
    botReplyStagingProviderOperationFenceSchema,
    /'replay-blocked'::TEXT,[\s\S]*NULL::TEXT/,
  );
});

test("prepares dormant database-clocked staging-run capabilities", () => {
  assert.equal(
    (botReplyStagingRunCapabilityWrappersSchema.match(
      /CREATE FUNCTION public\.(?:claim|read|complete)_bot_reply_staging_run_v1\(/g,
    ) ?? []).length,
    3,
  );
  assert.equal(
    (botReplyStagingRunCapabilityWrappersSchema.match(
      /SET search_path = pg_catalog, pg_temp/g,
    ) ?? []).length,
    3,
  );
  assert.equal(
    (botReplyStagingRunCapabilityWrappersSchema.match(
      /\nSECURITY INVOKER\n/g,
    ) ?? []).length,
    3,
  );
  assert.match(
    botReplyStagingRunCapabilityWrappersSchema,
    /requested_lease_duration_seconds NOT BETWEEN 60 AND 3600/,
  );
  assert.match(
    botReplyStagingRunCapabilityWrappersSchema,
    /database_now >= stored_run\.lease_expires_at/,
  );
  assert.match(
    botReplyStagingRunCapabilityWrappersSchema,
    /database_now < staging_run\.lease_expires_at/,
  );
  assert.doesNotMatch(
    botReplyStagingRunCapabilityWrappersSchema,
    /\nSECURITY DEFINER\n|^\s*GRANT\b|^\s*(?:CREATE|ALTER) ROLE\b/gm,
  );
});

test("hardens Bot reply staging triggers without granting runtime access", () => {
  assert.equal(
    (botReplyStagingTriggerHardeningSchema.match(
      /INSERT INTO public\.audit_logs\s*\(/g,
    ) ?? []).length,
    2,
  );
  assert.equal(
    (botReplyStagingTriggerHardeningSchema.match(
      /SET search_path = pg_catalog, pg_temp/g,
    ) ?? []).length,
    5,
  );
  assert.equal(
    (botReplyStagingTriggerHardeningSchema.match(
      /REVOKE ALL ON FUNCTION public\.[a-z0-9_]+\(\)\s+FROM PUBLIC/g,
    ) ?? []).length,
    5,
  );
  assert.match(
    botReplyStagingTriggerHardeningSchema,
    /CREATE OR REPLACE FUNCTION public\.audit_bot_reply_staging_run_start\(\)[\s\S]*SECURITY INVOKER/,
  );
  assert.match(
    botReplyStagingTriggerHardeningSchema,
    /CREATE OR REPLACE FUNCTION public\.audit_bot_reply_staging_run_completion\(\)[\s\S]*SECURITY INVOKER/,
  );
  assert.doesNotMatch(
    botReplyStagingTriggerHardeningSchema,
    /INSERT INTO audit_logs|\bSECURITY DEFINER\b|\bGRANT\b|\bCREATE ROLE\b|\bALTER ROLE\b/i,
  );
});

test("composes attested v2 evidence and audit in one dormant boundary", () => {
  assert.match(
    botReplyStagingAttestedEvidenceAtomicPublishSchema,
    /CREATE FUNCTION public\.publish_bot_reply_staging_attested_evidence_with_audit\(/,
  );
  assert.match(
    botReplyStagingAttestedEvidenceAtomicPublishSchema,
    /LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog/,
  );
  assert.match(
    botReplyStagingAttestedEvidenceAtomicPublishSchema,
    /consume_bot_reply_staging_attestation_nonce\([\s\S]*publish_bot_reply_staging_release_evidence_with_operator_audit\(/,
  );
  assert.match(
    botReplyStagingAttestedEvidenceAtomicPublishSchema,
    /WHEN SQLSTATE 'ZB001'/,
  );
  assert.match(
    botReplyStagingAttestedEvidenceAtomicPublishSchema,
    /REVOKE ALL ON FUNCTION public\.publish_bot_reply_staging_attested_evidence_with_audit\([\s\S]*\) FROM PUBLIC/,
  );
  assert.doesNotMatch(
    botReplyStagingAttestedEvidenceAtomicPublishSchema,
    /\bGRANT\b|WHEN OTHERS|private_key|phone_e164|recipient_phone/i,
  );
});

test("defines a dormant release-bound attested evidence readback", () => {
  assert.match(
    botReplyStagingAttestedEvidenceReadbackSchema,
    /CREATE FUNCTION public\.read_bot_reply_staging_attested_release_evidence_v1\(/,
  );
  assert.match(
    botReplyStagingAttestedEvidenceReadbackSchema,
    /LANGUAGE sql\s+VOLATILE\s+STRICT\s+PARALLEL UNSAFE\s+ROWS 2\s+SECURITY INVOKER\s+SET search_path = pg_catalog, pg_temp/,
  );
  assert.match(
    botReplyStagingAttestedEvidenceReadbackSchema,
    /WHERE release_evidence\.release_id = requested_release_id[\s\S]*release_evidence\.commit_sha = requested_commit_sha[\s\S]*release_evidence\.artifact_digest = requested_artifact_digest[\s\S]*LIMIT 2/,
  );
  assert.match(
    botReplyStagingAttestedEvidenceReadbackSchema,
    /REVOKE ALL ON FUNCTION[\s\S]*read_bot_reply_staging_attested_release_evidence_v1\([\s\S]*FROM PUBLIC/,
  );
  assert.doesNotMatch(
    botReplyStagingAttestedEvidenceReadbackSchema,
    /\bSECURITY DEFINER\b|\bALTER FUNCTION\b/,
  );
  assert.doesNotMatch(
    botReplyStagingAttestedEvidenceReadbackSchema,
    /\b(?:CREATE ROLE|GRANT|INSERT|UPDATE|DELETE|MERGE|CALL)\b/i,
  );
});

test("keeps staging attestation replay evidence payload-free and dormant", () => {
  assert.match(
    botReplyStagingAttestationNonceSchema,
    /CREATE TABLE public\.bot_reply_staging_attestation_nonces/,
  );
  assert.match(
    botReplyStagingAttestationNonceSchema,
    /CREATE FUNCTION public\.consume_bot_reply_staging_attestation_nonce\(/,
  );
  assert.match(
    botReplyStagingAttestationNonceSchema,
    /LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog/,
  );
  assert.match(
    botReplyStagingAttestationNonceSchema,
    /REVOKE ALL ON FUNCTION public\.consume_bot_reply_staging_attestation_nonce\([\s\S]*\) FROM PUBLIC/,
  );
  assert.match(
    botReplyStagingAttestationNonceSchema,
    /REVOKE ALL ON TABLE public\.bot_reply_staging_attestation_nonces FROM PUBLIC/,
  );
  assert.doesNotMatch(
    botReplyStagingAttestationNonceSchema,
    /\bGRANT\b|signature\s+TEXT|private_key|receipt_json|phone_e164|recipient_phone/i,
  );
});

test("separates raw Meta occurrence from local bot settlement time", () => {
  assert.match(
    botReplyProviderClockDomainsSchema,
    /CREATE OR REPLACE FUNCTION public\.guard_bot_reply_provider_link_update\(\)/,
  );
  assert.match(
    botReplyProviderClockDomainsSchema,
    /OLD\.last_status_event_at[\s\S]*NEW\.last_status_event_at < OLD\.last_status_event_at/,
  );
  assert.match(
    botReplyProviderClockDomainsSchema,
    /NEW\.terminal_settled_at IS DISTINCT FROM NEW\.updated_at/,
  );
  assert.match(
    botReplyProviderClockDomainsSchema,
    /CREATE OR REPLACE FUNCTION public\.guard_campaign_delivery_provider_link_update\(\)/,
  );
  assert.doesNotMatch(
    botReplyProviderClockDomainsSchema,
    /NEW\.last_status_event_at < NEW\.accepted_at/,
  );
});

test("binds every Bot reply provider outcome to its preceding request", () => {
  assert.match(
    botReplyProviderOutcomeRequestFenceSchema,
    /CREATE OR REPLACE FUNCTION enforce_bot_reply_provider_link_insert\(\)/,
  );
  assert.match(
    botReplyProviderOutcomeRequestFenceSchema,
    /CREATE OR REPLACE FUNCTION enforce_bot_reply_provider_deferral_insert\(\)/,
  );
  assert.match(
    botReplyProviderOutcomeRequestFenceSchema,
    /CREATE OR REPLACE FUNCTION enforce_bot_reply_window_rejection_insert\(\)/,
  );
  assert.equal(
    (botReplyProviderOutcomeRequestFenceSchema.match(
      /INNER JOIN bot_reply_provider_request_claims AS request/g,
    ) ?? []).length,
    4,
  );
  assert.doesNotMatch(
    botReplyProviderOutcomeRequestFenceSchema,
    /DROP\s+(?:TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i,
  );
});

test("keeps readiness v2 candidates separate until atomic activation", () => {
  assert.match(
    productionReadinessV2EvidenceSchema,
    /CREATE TABLE production_readiness_release_heads_v2/,
  );
  assert.match(
    productionReadinessV2EvidenceSchema,
    /CREATE TABLE production_readiness_release_candidates_v2/,
  );
  assert.match(
    productionReadinessV2EvidenceSchema,
    /CREATE TABLE production_readiness_release_activation_events_v2/,
  );
  assert.doesNotMatch(
    productionReadinessV2EvidenceSchema,
    /REFERENCES\s+bot_reply_staging_release_evidence/i,
  );
});

test("stores release evidence behind one versioned compare-and-set row", () => {
  assert.match(
    releaseEvidenceSchema,
    /CREATE TABLE bot_reply_staging_release_evidence/,
  );
  assert.match(releaseEvidenceSchema, /evidence_version INTEGER NOT NULL/);
  assert.match(releaseEvidenceSchema, /octet_length\(evidence_json\)/);
  assert.match(releaseEvidenceSchema, /'releaseId' = release_id/);
  assert.match(releaseEvidenceSchema, /'evidenceDigest' = evidence_digest/);
  assert.match(releaseEvidenceSchema, /INTERVAL '60 seconds'/);
  assert.match(releaseEvidenceSchema, /INTERVAL '900 seconds'/);
  assert.doesNotMatch(releaseEvidenceSchema, /random|uuid/i);
});

test("adds one dormant atomic release-evidence CAS and operator-audit boundary", () => {
  assert.match(
    botReplyReleaseEvidenceAtomicPublishSchema,
    /CREATE FUNCTION public\.publish_bot_reply_staging_release_evidence_with_operator_audit\(/,
  );
  assert.match(
    botReplyReleaseEvidenceAtomicPublishSchema,
    /LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog/,
  );
  assert.match(
    botReplyReleaseEvidenceAtomicPublishSchema,
    /UPDATE public\.bot_reply_staging_release_evidence AS evidence[\s\S]*MERGE INTO public\.bot_reply_staging_release_evidence_operator_events/,
  );
  assert.match(
    botReplyReleaseEvidenceAtomicPublishSchema,
    /REVOKE ALL ON FUNCTION public\.publish_bot_reply_staging_release_evidence_with_operator_audit\([\s\S]*\) FROM PUBLIC/,
  );
  assert.match(
    botReplyReleaseEvidenceAtomicPublishSchema,
    /EXPAND-ONLY[\s\S]*does not claim that direct table DML is[\s\S]*blocked/,
  );
  assert.doesNotMatch(
    botReplyReleaseEvidenceAtomicPublishSchema,
    /\bEXECUTE\s+(?:format\s*\(|["'])|\bGRANT\b|production_readiness_release_(?:heads|activation_events)_v2/i,
  );
});

test("binds provider cooldown deferrals to exact durable Bot reply facts", () => {
  assert.match(
    botReplyProviderDeferralSchema,
    /CREATE TABLE bot_reply_provider_deferral_events/,
  );
  assert.match(
    botReplyProviderDeferralSchema,
    /reservation\.reservation_class = 'service-reply'/,
  );
  assert.match(
    botReplyProviderDeferralSchema,
    /settlement\.outcome = 'provider-failed'/,
  );
  assert.match(
    botReplyProviderDeferralSchema,
    /cooldown\.blocked_until = NEW\.retry_at/,
  );
  assert.match(
    botReplyProviderDeferralSchema,
    /delivery\.claim_version = NEW\.claim_version/,
  );
  assert.match(
    botReplyProviderDeferralSchema,
    /provider deferral evidence is immutable/,
  );
  assert.doesNotMatch(
    botReplyProviderDeferralSchema,
    /phone_number|recipient_phone|access_token|ciphertext|raw_payload/,
  );
});

test("binds inbound button replies to one accepted delivery and immutable option", () => {
  assert.match(
    inboundButtonReplySchema,
    /CREATE TABLE inbound_button_reply_events/,
  );
  assert.match(
    inboundButtonReplySchema,
    /delivery\.status = 'accepted'/,
  );
  assert.match(
    inboundButtonReplySchema,
    /jsonb_array_elements\(delivery\.reply_json -> 'options'\)/,
  );
  assert.match(
    inboundButtonReplySchema,
    /reject_inbound_button_reply_mutation/,
  );
  assert.match(
    inboundButtonReplySchema,
    /DROP CONSTRAINT data_migration_bundle_counts_valid[\s\S]*table_count IN \(51, 52, 53, 54\)/,
  );
  assert.doesNotMatch(
    inboundButtonReplySchema,
    /phone_e164|recipient_phone|message_payload|access_token/,
  );
});

test("binds Meta 131047 to one exact service-window rejection", () => {
  assert.match(
    serviceWindowRejectionSchema,
    /CREATE TABLE bot_reply_service_window_rejection_events/,
  );
  assert.match(
    serviceWindowRejectionSchema,
    /provider_error_code = 131047/,
  );
  assert.match(
    serviceWindowRejectionSchema,
    /reservation\.reservation_class = 'service-reply'/,
  );
  assert.match(
    serviceWindowRejectionSchema,
    /settlement\.outcome = 'provider-failed'/,
  );
  assert.match(
    serviceWindowRejectionSchema,
    /delivery\.claim_version = NEW\.claim_version/,
  );
  assert.match(
    serviceWindowRejectionSchema,
    /service-window rejection evidence is immutable/,
  );
  assert.match(
    serviceWindowRejectionSchema,
    /table_count IN \(51, 52, 53, 54, 55\)/,
  );
  assert.doesNotMatch(
    serviceWindowRejectionSchema,
    /phone_e164|recipient_phone|message_payload|access_token|raw_payload/,
  );
});

test("fences each Bot reply provider request before the Meta boundary", () => {
  assert.match(
    providerRequestFenceSchema,
    /CREATE TABLE bot_reply_provider_request_claims/,
  );
  assert.match(
    providerRequestFenceSchema,
    /UNIQUE INDEX bot_reply_provider_requests_delivery_claim_uq/,
  );
  assert.match(
    providerRequestFenceSchema,
    /reservation\.reservation_class = 'service-reply'/,
  );
  assert.match(
    providerRequestFenceSchema,
    /delivery\.status = 'sending'/,
  );
  assert.match(
    providerRequestFenceSchema,
    /settlement\.reservation_key IS NULL/,
  );
  assert.match(
    providerRequestFenceSchema,
    /provider request evidence is immutable/,
  );
  assert.doesNotMatch(
    providerRequestFenceSchema,
    /phone_e164|recipient_phone|message_payload|access_token|raw_payload/,
  );
});

test("keeps Bot reply staging observations immutable, scoped, and PII-free", () => {
  assert.match(
    botReplyStagingObservationSchema,
    /CREATE TABLE bot_reply_staging_observation_events/,
  );
  assert.match(
    botReplyStagingObservationSchema,
    /CREATE UNIQUE INDEX bot_reply_staging_observation_operation_uq/,
  );
  assert.match(
    botReplyStagingObservationSchema,
    /observation lacks an active run/,
  );
  assert.match(
    botReplyStagingObservationSchema,
    /observation subject is invalid/,
  );
  assert.match(
    botReplyStagingObservationSchema,
    /observation is immutable/,
  );
  assert.match(
    botReplyStagingObservationSchema,
    /provider_request_count = 0/,
  );
  assert.doesNotMatch(
    botReplyStagingObservationSchema,
    /phone_number|access_token|ciphertext|raw_payload/,
  );
});

test("keeps Bot reply staging authorization immutable and provider-safe", () => {
  assert.match(
    botReplyStagingAuthorizationSchema,
    /CREATE TABLE bot_reply_staging_authorization_events/,
  );
  assert.match(
    botReplyStagingAuthorizationSchema,
    /recipient_fingerprint ~ '\^sha256:/,
  );
  assert.match(
    botReplyStagingAuthorizationSchema,
    /rate_limit_approved_by = 'tal'/,
  );
  assert.match(
    botReplyStagingAuthorizationSchema,
    /authorization version is not sequential/,
  );
  assert.match(
    botReplyStagingAuthorizationSchema,
    /authorization revocation is invalid/,
  );
  assert.match(
    botReplyStagingAuthorizationSchema,
    /authorization events are immutable/,
  );
  assert.match(
    botReplyStagingAuthorizationSchema,
    /BEFORE UPDATE OR DELETE ON audit_logs/,
  );
  assert.doesNotMatch(
    botReplyStagingAuthorizationSchema,
    /phone_number|access_token|ciphertext/,
  );
});

test("fences and audits every Railway Bot reply staging run", () => {
  assert.match(
    botReplyStagingRunSchema,
    /CREATE TABLE bot_reply_staging_runs/,
  );
  assert.match(
    botReplyStagingRunSchema,
    /NEW\.claim_version <> OLD\.claim_version \+ 1/,
  );
  assert.match(
    botReplyStagingRunSchema,
    /Completed Bot reply staging run is immutable/,
  );
  assert.match(
    botReplyStagingRunSchema,
    /'bot-reply-staging\.started'/,
  );
  assert.match(
    botReplyStagingRunSchema,
    /'bot-reply-staging\.completed'/,
  );
  assert.match(
    botReplyStagingRunSchema,
    /BEFORE UPDATE OR DELETE ON audit_logs/,
  );
});

test("separates service replies from business-initiated portfolio quota", () => {
  assert.match(
    whatsappServiceReplyReservationSchema,
    /reservation_class IN \([\s\S]*'business-initiated'[\s\S]*'service-reply'/,
  );
  assert.match(
    whatsappServiceReplyReservationSchema,
    /NEW\.reservation_class = 'business-initiated'[\s\S]*whatsapp_portfolio_recipient_rate_limit_state/,
  );
  assert.match(
    whatsappServiceReplyReservationSchema,
    /reservation\.reservation_class = 'business-initiated'/,
  );
  assert.match(
    whatsappServiceReplyReservationSchema,
    /NEW\.reservation_class = 'business-initiated'[\s\S]*NEW\.template_category IS NULL/,
  );
});

test("fences deferred bot replies inside the WhatsApp service window", () => {
  const migration = readFileSync(
    new URL(
      "0031_bot_reply_delivery_deferrals.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(migration, /ADD COLUMN claim_version INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration, /NEW\.claim_version <> OLD\.claim_version \+ 1/);
  assert.match(migration, /NEW\.next_attempt_at >= service_window_expires_at/);
  assert.match(migration, /bot_reply_deliveries_transition_guard/);
});

test("binds bot provider acceptance and terminal settlement atomically", () => {
  assert.match(
    botReplyDeliveryProviderSchema,
    /CREATE TABLE bot_reply_delivery_provider_links/,
  );
  assert.match(
    botReplyDeliveryProviderSchema,
    /reservation\.reservation_class = 'service-reply'/,
  );
  assert.match(
    botReplyDeliveryProviderSchema,
    /project_bot_reply_provider_acceptance/,
  );
  assert.match(
    botReplyDeliveryProviderSchema,
    /INSERT INTO whatsapp_rate_limit_settlements/,
  );
  assert.match(
    botReplyDeliveryProviderSchema,
    /Provider message already belongs to another target/,
  );
  assert.match(
    botReplyDeliveryProviderSchema,
    /BEFORE UPDATE OF tenant_id, provider_message_id ON messages/,
  );
  assert.match(
    botReplyDeliveryProviderSchema,
    /DROP CONSTRAINT data_migration_bundle_counts_valid[\s\S]*table_count IN \(51, 52, 53\)/,
  );
});

test("binds every Railway tenant to at most one Clerk Organization", () => {
  assert.match(
    clerkOrganizationBindingSchema,
    /ALTER TABLE tenants[\s\S]*ADD COLUMN clerk_organization_id TEXT/,
  );
  assert.match(
    clerkOrganizationBindingSchema,
    /CREATE UNIQUE INDEX tenants_clerk_organization_id_uq[\s\S]*WHERE clerk_organization_id IS NOT NULL/,
  );
  assert.match(
    clerkOrganizationBindingSchema,
    /length\(clerk_organization_id\) BETWEEN 1 AND 255/,
  );
  assert.doesNotMatch(clerkOrganizationBindingSchema, /random|uuid/i);
});

test("allows a dedicated Clerk invitation policy in the shared PostgreSQL limiter", () => {
  assert.match(
    clerkInvitationRateLimitSchema,
    /DROP CONSTRAINT api_mutation_rate_limit_policy_valid/,
  );
  assert.match(
    clerkInvitationRateLimitSchema,
    /policy_id IN[\s\S]*'clerk-organization-invitation'/,
  );
});

test("persists bounded Clerk Retry-After evidence and atomically releases delivery claims", () => {
  assert.match(
    invitationDeferralSchema,
    /CREATE TABLE team_invitation_delivery_deferrals/,
  );
  assert.match(
    invitationDeferralSchema,
    /retry_after_at <= deferred_at \+ INTERVAL '1 day'/,
  );
  assert.match(
    invitationDeferralSchema,
    /OLD\.status = 'sending'[\s\S]*NEW\.status = 'pending'[\s\S]*NEW\.attempt_count = 0/,
  );
  assert.match(
    invitationDeferralSchema,
    /NEW\.status = 'pending'[\s\S]*EXISTS \([\s\S]*FROM team_invitation_delivery_deferrals[\s\S]*deferred_at = NEW\.updated_at/,
  );
  assert.match(
    invitationDeferralSchema,
    /AFTER INSERT OR UPDATE[\s\S]*apply_team_invitation_delivery_deferral/,
  );
});

test("defines a durable Meta template outbox with immutable recovery evidence", () => {
  assert.match(
    messageTemplateSubmissionOutboxSchema,
    /CREATE TABLE message_template_submission_outbox[\s\S]*CREATE TABLE message_template_submission_events/,
  );
  assert.match(
    messageTemplateSubmissionOutboxSchema,
    /FOREIGN KEY \([\s\S]*request_operation,[\s\S]*request_idempotency_key[\s\S]*REFERENCES railway_api_mutation_receipts/,
  );
  assert.match(
    messageTemplateSubmissionOutboxSchema,
    /request_operation = 'templates\.submit'/,
  );
  assert.match(
    messageTemplateSubmissionOutboxSchema,
    /status IN \([\s\S]*'pending'[\s\S]*'submitting'[\s\S]*'submitted'[\s\S]*'rejected'[\s\S]*'blocked'[\s\S]*'ambiguous'/,
  );
  assert.match(
    messageTemplateSubmissionOutboxSchema,
    /OLD\.status = 'pending'[\s\S]*OLD\.status = 'submitting'[\s\S]*OLD\.status = 'ambiguous'/,
  );
  assert.match(
    messageTemplateSubmissionOutboxSchema,
    /CREATE CONSTRAINT TRIGGER message_template_submission_outbox_event_guard[\s\S]*DEFERRABLE INITIALLY DEFERRED/,
  );
  assert.match(
    messageTemplateSubmissionOutboxSchema,
    /message_template_submission_events_immutable_guard[\s\S]*BEFORE UPDATE OR DELETE/,
  );
  assert.doesNotMatch(
    messageTemplateSubmissionOutboxSchema,
    /Math\.random|random\s*\(|uuid/i,
  );
});

test("defines immutable all-slice migration bundle receipts", () => {
  assert.match(
    dataMigrationBundleReceiptSchema,
    /CREATE TABLE data_migration_bundle_receipts[\s\S]*execution_scope TEXT PRIMARY KEY[\s\S]*bundle_id TEXT NOT NULL UNIQUE[\s\S]*source_digest TEXT NOT NULL UNIQUE[\s\S]*evidence_digest TEXT NOT NULL UNIQUE/,
  );
  assert.match(
    dataMigrationBundleReceiptSchema,
    /execution_scope = 'full-d1-cutover'/,
  );
  assert.match(
    dataMigrationBundleReceiptSchema,
    /slice_count = 10[\s\S]*table_count = 51[\s\S]*total_row_count >= 0/,
  );
  assert.match(
    invitationDeferralSchema,
    /DROP CONSTRAINT data_migration_bundle_counts_valid[\s\S]*table_count IN \(51, 52\)/,
  );
  assert.match(
    dataMigrationBundleReceiptSchema,
    /reject_data_migration_bundle_receipt_mutation[\s\S]*BEFORE UPDATE OR DELETE/,
  );
  assert.doesNotMatch(dataMigrationBundleReceiptSchema, /random|uuid/i);
});

test("preserves unknown legacy reservation categories without weakening new writes", () => {
  assert.match(
    whatsappLegacyReservationCategorySchema,
    /ALTER COLUMN template_category DROP NOT NULL/,
  );
  assert.match(
    whatsappLegacyReservationCategorySchema,
    /template_category IS NULL[\s\S]*MARKETING[\s\S]*UTILITY/,
  );
  assert.match(
    whatsappLegacyReservationCategorySchema,
    /requires a template category[\s\S]*BEFORE INSERT/,
  );
  assert.doesNotMatch(
    whatsappLegacyReservationCategorySchema,
    /random|uuid/i,
  );
});

test("defines bounded opaque PostgreSQL API mutation token buckets", () => {
  assert.match(
    apiMutationRateLimitSchema,
    /CREATE TABLE api_mutation_rate_limit_buckets[\s\S]*PRIMARY KEY \(policy_id, policy_version, subject_key\)/,
  );
  assert.match(
    apiMutationRateLimitSchema,
    /policy_id IN \([\s\S]*'meta-webhook'[\s\S]*'tenant-mutation'[\s\S]*'system-admin-mutation'[\s\S]*\)/,
  );
  assert.match(
    apiMutationRateLimitSchema,
    /subject_key ~ '\^rate_limit_v1_\[a-f0-9\]\{64\}\$'/,
  );
  assert.match(
    apiMutationRateLimitSchema,
    /available_tokens >= 0[\s\S]*available_tokens <= capacity/,
  );
  assert.doesNotMatch(apiMutationRateLimitSchema, /random|uuid/i);
});

test("defines atomic PostgreSQL campaign provider reconciliation evidence", () => {
  assert.match(
    campaignDeliveryProviderSchema,
    /CREATE TABLE campaign_delivery_provider_links[\s\S]*FOREIGN KEY \(delivery_key\)[\s\S]*REFERENCES campaign_recipients \(delivery_key\)/,
  );
  assert.match(
    campaignDeliveryProviderSchema,
    /pg_advisory_xact_lock[\s\S]*provider-message:/,
  );
  assert.match(
    campaignDeliveryProviderSchema,
    /Campaign delivery provider link lacks active proof/,
  );
  assert.match(
    campaignDeliveryProviderSchema,
    /INSERT INTO whatsapp_rate_limit_settlements[\s\S]*ON CONFLICT \(reservation_key\) DO NOTHING/,
  );
  assert.match(
    campaignDeliveryProviderSchema,
    /provider identity is immutable[\s\S]*terminal outcome is immutable[\s\S]*status does not advance[\s\S]*immutable evidence/i,
  );
  assert.doesNotMatch(campaignDeliveryProviderSchema, /random|uuid/i);
});

test("defines tenant-scoped immutable PostgreSQL consent evidence", () => {
  assert.match(
    contactConsentSchema,
    /CREATE TABLE contact_consent_events[\s\S]*FOREIGN KEY \(tenant_id, contact_id\)[\s\S]*REFERENCES contacts \(tenant_id, id\)/,
  );
  assert.match(
    contactConsentSchema,
    /contact_consent_events_key_sha256[\s\S]*contact_consent_v1_/,
  );
  assert.match(
    contactConsentSchema,
    /contact_consent_events_tenant_key_uq[\s\S]*UNIQUE \(tenant_id, idempotency_key\)/,
  );
  assert.match(
    contactConsentSchema,
    /reject_contact_consent_event_mutation[\s\S]*events are immutable[\s\S]*BEFORE UPDATE[\s\S]*BEFORE DELETE/i,
  );
  assert.doesNotMatch(contactConsentSchema, /random|uuid/i);
});

test("defines PostgreSQL system-admin profile evidence with proof and immutable audit", () => {
  assert.match(
    systemAdminBusinessProfileSchema,
    /CREATE TABLE business_profile_admin_events[\s\S]*business_profile_admin_events_tenant_version_uq/,
  );
  assert.match(
    systemAdminBusinessProfileSchema,
    /enforce_business_profile_admin_event_proof[\s\S]*version = NEW\.profile_version[\s\S]*updated_at = NEW\.occurred_at/,
  );
  assert.match(
    systemAdminBusinessProfileSchema,
    /audit_business_profile_admin_event[\s\S]*INSERT INTO audit_logs[\s\S]*business_profile\.updated/,
  );
  assert.match(
    systemAdminBusinessProfileSchema,
    /reject_business_profile_admin_event_mutation[\s\S]*events are immutable[\s\S]*BEFORE UPDATE[\s\S]*BEFORE DELETE/i,
  );
  assert.doesNotMatch(systemAdminBusinessProfileSchema, /random|uuid/i);
});

test("defines registered PostgreSQL production decisions with immutable evidence", () => {
  assert.match(
    productionDecisionSchema,
    /CREATE TABLE production_decision_records[\s\S]*CREATE TABLE production_decision_events/,
  );
  assert.match(
    productionDecisionSchema,
    /production_decision_records_check_id_registered[\s\S]*identity\.team-invitation-policy[\s\S]*governance\.data-retention-policy/,
  );
  assert.match(
    productionDecisionSchema,
    /enforce_production_decision_record_transition[\s\S]*NEW\.version <> OLD\.version \+ 1/,
  );
  assert.match(
    productionDecisionSchema,
    /audit_production_decision_record[\s\S]*INSERT INTO production_decision_events/,
  );
  assert.match(
    productionDecisionSchema,
    /reject_production_decision_event_mutation[\s\S]*events are immutable[\s\S]*BEFORE UPDATE[\s\S]*BEFORE DELETE/i,
  );
  assert.doesNotMatch(productionDecisionSchema, /random|uuid/i);
});

test("defines synchronized PostgreSQL subscriptions with immutable audited events", () => {
  assert.match(
    tenantSubscriptionSchema,
    /CREATE TABLE tenant_subscriptions[\s\S]*CREATE TABLE tenant_subscription_events/,
  );
  assert.match(
    tenantSubscriptionSchema,
    /tenant_subscriptions_cancelled_state_consistent[\s\S]*status = 'cancelled'[\s\S]*cancelled_at IS NOT NULL/,
  );
  assert.match(
    tenantSubscriptionSchema,
    /tenant_subscription_events_tenant_version_uq[\s\S]*UNIQUE \(tenant_id, subscription_version\)/,
  );
  assert.match(
    tenantSubscriptionSchema,
    /audit_tenant_subscription_event_insert[\s\S]*INSERT INTO audit_logs[\s\S]*subscription\.status_changed/,
  );
  assert.match(
    tenantSubscriptionSchema,
    /reject_tenant_subscription_event_mutation[\s\S]*events are immutable[\s\S]*BEFORE UPDATE[\s\S]*BEFORE DELETE/,
  );
  assert.doesNotMatch(tenantSubscriptionSchema, /random|uuid/i);
});

test("defines a tenant-bound PostgreSQL AI reply approval outbox", () => {
  assert.match(
    aiReplyOutboxSchema,
    /CREATE TABLE ai_reply_outbox[\s\S]*FOREIGN KEY \(tenant_id, audit_key\)[\s\S]*REFERENCES ai_runtime_audit_events/,
  );
  assert.match(
    aiReplyOutboxSchema,
    /response_mode = 'automatic'[\s\S]*status = 'ready-for-delivery'[\s\S]*response_mode = 'agent-approval'[\s\S]*status = 'awaiting-approval'/,
  );
  assert.match(
    aiReplyOutboxSchema,
    /tenant_request_uq[\s\S]*tenant_inbound_uq[\s\S]*tenant_status_created_idx/,
  );
  assert.doesNotMatch(aiReplyOutboxSchema, /random|uuid/i);
});

test("defines tenant-bound PostgreSQL AI knowledge and immutable passages", () => {
  assert.match(
    aiKnowledgeSchema,
    /CREATE TABLE knowledge_sources[\s\S]*CREATE TABLE knowledge_passages[\s\S]*CREATE TABLE ai_agent_version_sources/,
  );
  assert.match(
    aiKnowledgeSchema,
    /knowledge_passages_source_fk[\s\S]*FOREIGN KEY \(tenant_id, source_key\)[\s\S]*REFERENCES knowledge_sources \(tenant_id, source_key\)/,
  );
  assert.match(
    aiKnowledgeSchema,
    /ai_agent_version_sources_version_fk[\s\S]*REFERENCES ai_agent_versions \(tenant_id, ai_agent_version_key\)/,
  );
  assert.match(
    aiKnowledgeSchema,
    /ai_agent_version_sources_source_fk[\s\S]*REFERENCES knowledge_sources \(tenant_id, source_key\)[\s\S]*ON DELETE RESTRICT/,
  );
  assert.match(
    aiKnowledgeSchema,
    /knowledge_sources_state_consistent[\s\S]*status = 'ready'[\s\S]*status = 'rejected'[\s\S]*status = 'archived'/,
  );
  assert.doesNotMatch(aiKnowledgeSchema, /random|uuid/i);
});

test("defines tenant-bound PostgreSQL campaign dispatch rows", () => {
  assert.match(
    campaignDispatchSchema,
    /CREATE TABLE campaign_recipients[\s\S]*PRIMARY KEY \(campaign_key, contact_id\)/,
  );
  assert.match(
    campaignDispatchSchema,
    /campaign_recipients_campaign_fk[\s\S]*FOREIGN KEY \(tenant_id, campaign_key\)[\s\S]*REFERENCES campaigns \(tenant_id, campaign_key\)/,
  );
  assert.match(
    campaignDispatchSchema,
    /campaign_recipients_contact_fk[\s\S]*FOREIGN KEY \(tenant_id, contact_id\)[\s\S]*REFERENCES contacts \(tenant_id, id\)/,
  );
  assert.match(
    campaignDispatchSchema,
    /campaign_recipients_delivery_key_uq[\s\S]*campaign_recipients_dispatch_idx/,
  );
  assert.doesNotMatch(campaignDispatchSchema, /random|uuid/i);
});

test("defines one fenced PostgreSQL lease for the Railway scheduler", () => {
  assert.match(
    workerSchedulerLeaseSchema,
    /CREATE TABLE worker_scheduler_leases[\s\S]*fencing_token BIGINT[\s\S]*state IN \('claimed', 'completed'\)/,
  );
  assert.match(
    workerSchedulerLeaseSchema,
    /current_tick = date_trunc\('minute', current_tick\)[\s\S]*last_completed_tick < current_tick/,
  );
  assert.match(
    workerSchedulerLeaseSchema,
    /worker_scheduler_leases_expiry_idx[\s\S]*WHERE state = 'claimed'/,
  );
  assert.doesNotMatch(workerSchedulerLeaseSchema, /random|uuid/i);
});

test("defines provider-bound PostgreSQL phone throughput enforcement", () => {
  assert.match(
    whatsappPhoneThroughputSchema,
    /phone_throughput_messages_per_second IN \(20, 80, 1000\)/,
  );
  assert.match(
    whatsappPhoneThroughputSchema,
    /maximum_outbound_messages_per_second[\s\S]*< phone_throughput_messages_per_second/,
  );
  assert.match(
    whatsappPhoneThroughputSchema,
    /pg_advisory_xact_lock[\s\S]*interval '1 second'[\s\S]*phone throughput limit exceeded/,
  );
});

test("defines serialized PostgreSQL WhatsApp rate-limit evidence", () => {
  for (const tableName of [
    "whatsapp_rate_limit_reservations",
    "whatsapp_pair_rate_limit_state",
    "whatsapp_portfolio_recipient_rate_limit_state",
    "whatsapp_rate_limit_settlements",
    "whatsapp_provider_cooldown_events",
    "whatsapp_provider_cooldown_state",
  ]) {
    assert.match(
      whatsappRateLimitLedgerSchema,
      new RegExp(`CREATE TABLE ${tableName}`),
    );
  }
  assert.match(
    whatsappRateLimitLedgerSchema,
    /enforce_whatsapp_rate_reservation_insert[\s\S]*pg_advisory_xact_lock[\s\S]*portfolio recipient limit reached/,
  );
  assert.match(
    whatsappRateLimitLedgerSchema,
    /project_whatsapp_rate_settlement_state[\s\S]*last_delivered_at[\s\S]*cancelled-before-submit/,
  );
  assert.match(
    whatsappRateLimitLedgerSchema,
    /provider cooldown lacks rejection proof[\s\S]*project_whatsapp_provider_cooldown_state/,
  );
  assert.match(
    whatsappRateLimitLedgerSchema,
    /rate-limit evidence is immutable[\s\S]*state cannot be deleted/,
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

function assertTriggerReferenceBypassRejected(functionSource) {
  const tamperedSources = [...migrationSources];
  tamperedSources[11] = `${tamperedSources[11]}\n${functionSource}`;
  const findings = validatePostgresMigrationSources({
    migrationFiles,
    sources: tamperedSources,
  });
  assert.equal(
    findings.some(({ code }) => code === "POSTGRES_SEED_DATA_PRESENT"),
    true,
  );
}

test("does not trust NEW references inside a non-trigger function", () => {
  assertTriggerReferenceBypassRejected(`
CREATE FUNCTION public.non_trigger_new_reference_bypass()
RETURNS void
LANGUAGE plpgsql
-- RETURNS trigger is a comment, not the declared return type.
AS $$
BEGIN
  INSERT INTO whatsapp_campaign_delivery_policy_events (event_key)
  VALUES (NEW.event_key);
END;
$$;
  `);
});

test("does not trust NEW references inside SQL comments", () => {
  assertTriggerReferenceBypassRejected(`
CREATE FUNCTION public.comment_new_reference_bypass()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO whatsapp_campaign_delivery_policy_events (event_key)
  VALUES ('forbidden-seed') /* NEW.event_key */;
  RETURN NEW;
END;
$$;
  `);
});

test("does not trust quoted NEW references", () => {
  assertTriggerReferenceBypassRejected(`
CREATE FUNCTION public.quoted_new_reference_bypass()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO whatsapp_campaign_delivery_policy_events (event_key)
  VALUES ('NEW.event_key');
  RETURN NEW;
END;
$$;
  `);
});

test("does not trust dollar-quoted NEW references", () => {
  assertTriggerReferenceBypassRejected(`
CREATE FUNCTION public.dollar_quoted_new_reference_bypass()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO whatsapp_campaign_delivery_policy_events (event_key)
  VALUES ($quoted$NEW.event_key$quoted$);
  RETURN NEW;
END;
$$;
  `);
});

test("rejects a literal hidden inside the reviewed staging-run insert", () => {
  const tamperedSources = [...migrationSources];
  tamperedSources[51] = tamperedSources[51].replace(
    "    database_now,\n    database_now,\n    database_now\n  )\n  ON CONFLICT",
    "    database_now,\n    database_now,\n    'forbidden-seed'\n  )\n  ON CONFLICT",
  );
  assert.notEqual(tamperedSources[51], migrationSources[51]);

  const findings = validatePostgresMigrationSources({
    migrationFiles,
    sources: tamperedSources,
  });

  assert.equal(
    findings.some(({ code }) => code === "POSTGRES_SEED_DATA_PRESENT"),
    true,
  );
});

test("does not allow the reviewed staging-run insert in another migration", () => {
  const reviewedInsert = migrationSources[51].match(
    /INSERT INTO public\.bot_reply_staging_runs\s*\([\s\S]*?RETURNING \* INTO stored_run;/,
  )?.[0];
  assert.equal(typeof reviewedInsert, "string");

  const tamperedSources = [...migrationSources];
  tamperedSources[50] += `
CREATE FUNCTION public.unreviewed_staging_run_insert()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN;
${reviewedInsert}
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

function assertProviderFenceInsertMutationRejected(mutator) {
  const tamperedSources = [...migrationSources];
  tamperedSources[53] = mutator(tamperedSources[53]);
  assert.notEqual(tamperedSources[53], migrationSources[53]);
  const findings = validatePostgresMigrationSources({
    migrationFiles,
    sources: tamperedSources,
  });
  assert.equal(
    findings.some(({ code }) => code === "POSTGRES_SEED_DATA_PRESENT"),
    true,
  );
}

test("rejects a different table in the reviewed provider-operation insert", () => {
  assertProviderFenceInsertMutationRejected((source) => source.replace(
    "INSERT INTO public.bot_reply_staging_provider_operations (",
    "INSERT INTO public.bot_reply_staging_provider_operations_copy (",
  ));
});

test("rejects a different column in the reviewed provider-operation insert", () => {
  assertProviderFenceInsertMutationRejected((source) => source.replace(
    [
      "INSERT INTO public.bot_reply_staging_provider_operations (",
      "    operation_key,",
      "    run_key,",
    ].join("\n"),
    [
      "INSERT INTO public.bot_reply_staging_provider_operations (",
      "    operation_key,",
      "    run_identity,",
    ].join("\n"),
  ));
});

test("rejects a different value in the reviewed provider-operation insert", () => {
  assertProviderFenceInsertMutationRejected((source) => source.replace(
    [
      "  ) VALUES (",
      "    requested_operation_key,",
      "    requested_run_key,",
    ].join("\n"),
    [
      "  ) VALUES (",
      "    requested_operation_key,",
      "    'forbidden-seed',",
    ].join("\n"),
  ));
});

test("rejects an additional insert inside the reviewed provider reserve function", () => {
  assertProviderFenceInsertMutationRejected((source) => source.replace(
    "  RETURN QUERY SELECT\n    'authorized'::TEXT,",
    [
      "  INSERT INTO public.bot_reply_staging_provider_operation_outcomes (",
      "    observation_key",
      "  ) VALUES ('forbidden-seed');",
      "  RETURN QUERY SELECT",
      "    'authorized'::TEXT,",
    ].join("\n"),
  ));
});

function assertMetaCredentialBackfillMutationRejected(mutator) {
  const tamperedSources = [...migrationSources];
  tamperedSources[54] = mutator(tamperedSources[54]);
  assert.notEqual(tamperedSources[54], migrationSources[54]);
  const findings = validatePostgresMigrationSources({
    migrationFiles,
    sources: tamperedSources,
  });
  assert.equal(
    findings.some(({ code }) => code === "POSTGRES_SEED_DATA_PRESENT"),
    true,
  );
}

test("allows only the exact reviewed Meta credential revision backfill", () => {
  assert.match(
    metaCredentialRevisionLedgerSchema,
    /INSERT INTO public\.meta_credential_revision_events \([\s\S]*?ORDER BY credential\.tenant_id;/,
  );
  assert.deepEqual(
    validatePostgresMigrationSources({
      migrationFiles,
      sources: migrationSources,
    }),
    [],
  );
});

test("rejects a different table in the Meta credential revision backfill", () => {
  assertMetaCredentialBackfillMutationRejected((source) => source.replace(
    "INSERT INTO public.meta_credential_revision_events (",
    "INSERT INTO public.meta_credential_revision_events_copy (",
  ));
});

test("rejects a different column in the Meta credential revision backfill", () => {
  assertMetaCredentialBackfillMutationRejected((source) => source.replace(
    [
      "INSERT INTO public.meta_credential_revision_events (",
      "  event_key,",
      "  tenant_id,",
    ].join("\n"),
    [
      "INSERT INTO public.meta_credential_revision_events (",
      "  event_identity,",
      "  tenant_id,",
    ].join("\n"),
  ));
});

test("rejects a different source in the Meta credential revision backfill", () => {
  assertMetaCredentialBackfillMutationRejected((source) => source.replace(
    "FROM public.meta_credential_envelopes AS credential\nORDER BY credential.tenant_id;",
    "FROM public.meta_credential_envelopes_copy AS credential\nORDER BY credential.tenant_id;",
  ));
});

test("rejects a literal in the Meta credential revision backfill", () => {
  assertMetaCredentialBackfillMutationRejected((source) => source.replace(
    "  credential.updated_at,\n  credential.updated_at\nFROM public.meta_credential_envelopes",
    "  credential.updated_at,\n  'forbidden-seed'\nFROM public.meta_credential_envelopes",
  ));
});

test("allows the exact immutable-ledger truncate trigger but rejects SQL truncation", () => {
  const tamperedSources = [...migrationSources];
  tamperedSources[54] += `
TRUNCATE public.meta_credential_revision_events;
`;
  const findings = validatePostgresMigrationSources({
    migrationFiles,
    sources: tamperedSources,
  });
  assert.equal(
    findings.some(
      ({ code }) => code === "POSTGRES_DESTRUCTIVE_STATEMENT",
    ),
    true,
  );
});
