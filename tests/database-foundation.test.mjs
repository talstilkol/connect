import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const hostingConfigUrl = new URL("../.openai/hosting.json", import.meta.url);
const migrationsUrl = new URL("../drizzle/", import.meta.url);

async function readAllMigrations() {
  const migrationFiles = (await readdir(migrationsUrl))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const migrationParts = await Promise.all(
    migrationFiles.map((migrationFile) =>
      readFile(new URL(migrationFile, migrationsUrl), "utf8"),
    ),
  );

  return {
    migrationFiles,
    sql: migrationParts
      .join("\n")
      .replaceAll("--> statement-breakpoint", ""),
  };
}

test("declares the logical D1 and R2 bindings", async () => {
  const hostingConfig = JSON.parse(
    await readFile(hostingConfigUrl, "utf8"),
  );

  assert.equal(hostingConfig.d1, "DB");
  assert.equal(hostingConfig.r2, "FILES");
});

test("initial migration contains the tenant foundation without seed data", async () => {
  const migrationFiles = (await readdir(migrationsUrl))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  assert.deepEqual(migrationFiles, [
    "0000_connect_foundation.sql",
    "0001_tenant_provisioning.sql",
    "0002_contacts_and_consent.sql",
    "0003_contact_import_jobs.sql",
    "0004_contact_cursor_index.sql",
    "0005_contact_tags_and_lists.sql",
    "0006_meta_connection_webhooks.sql",
    "0007_meta_credential_vault.sql",
    "0008_message_templates.sql",
    "0009_template_submission_lifecycle.sql",
    "0010_template_status_events.sql",
    "0011_campaign_foundation.sql",
    "0012_conversations_and_messages.sql",
    "0013_bot_flow_foundation.sql",
    "0014_neat_kingpin.sql",
    "0015_chilly_dreaming_celestial.sql",
    "0016_uneven_firestar.sql",
    "0017_unusual_veda.sql",
    "0018_material_guardian.sql",
    "0019_purple_silvermane.sql",
    "0020_production_decision_records.sql",
    "0021_tenant_selection.sql",
    "0022_tenant_membership_lifecycle.sql",
    "0023_team_invitation_lifecycle.sql",
    "0024_team_invitation_outbox.sql",
    "0025_team_invitation_reconciliation.sql",
    "0026_team_invitation_transition_outbox_guard.sql",
    "0027_team_invitation_system_actor.sql",
    "0028_team_invitation_expiration_scan.sql",
    "0029_team_invitation_acceptance.sql",
    "0030_whatsapp_rate_limit_reservations.sql",
    "0031_campaign_delivery_provider_links.sql",
    "0032_whatsapp_provider_cooldowns.sql",
    "0033_large_union_jack.sql",
    "0034_whatsapp_campaign_delivery_policy_events.sql",
    "0035_whatsapp_phone_throughput.sql",
    "0036_team_invitation_delivery_deferrals.sql",
    "0037_whatsapp_service_reply_reservations.sql",
    "0038_bot_reply_delivery_deferrals.sql",
    "0039_bot_reply_delivery_provider_links.sql",
    "0040_inbound_button_reply_provenance.sql",
    "0041_bot_reply_service_window_rejection_provenance.sql",
    "0042_bot_reply_provider_clock_domains.sql",
  ]);

  const migration = await readFile(
    new URL("0000_connect_foundation.sql", migrationsUrl),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `tenants`/);
  assert.match(migration, /CREATE TABLE `tenant_memberships`/);
  assert.match(migration, /CREATE TABLE `business_profiles`/);
  assert.match(migration, /CREATE TABLE `audit_logs`/);
  assert.match(
    migration,
    /tenant_memberships_tenant_user_uq.*`tenant_id`,`external_user_id`/,
  );
  assert.match(
    migration,
    /business_profiles.*FOREIGN KEY \(`tenant_id`\).*ON DELETE cascade/s,
  );
  assert.match(
    migration,
    /audit_logs.*FOREIGN KEY \(`tenant_id`\).*ON DELETE restrict/s,
  );
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("provisioning migration adds deterministic idempotency constraints", async () => {
  const migration = await readFile(
    new URL("0001_tenant_provisioning.sql", migrationsUrl),
    "utf8",
  );

  assert.match(
    migration,
    /ALTER TABLE `tenants` ADD `provisioning_key` text/,
  );
  assert.match(migration, /tenants_provisioning_key_uq/);
  assert.match(
    migration,
    /ALTER TABLE `audit_logs` ADD `idempotency_key` text/,
  );
  assert.match(migration, /audit_logs_idempotency_key_uq/);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("contacts migration is fail-closed and keeps consent history", async () => {
  const migration = await readFile(
    new URL("0002_contacts_and_consent.sql", migrationsUrl),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `contacts`/);
  assert.match(migration, /CREATE TABLE `contact_consent_events`/);
  assert.match(
    migration,
    /`mailing_status` text DEFAULT 'unsubscribed' NOT NULL/,
  );
  assert.match(
    migration,
    /`consent_status` text DEFAULT 'unknown' NOT NULL/,
  );
  assert.match(migration, /contacts_tenant_phone_uq/);
  assert.match(migration, /contact_consent_events_tenant_key_uq/);
  assert.match(migration, /contacts_consent_state_consistent/);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("contact import migration stores resumable jobs without raw row PII", async () => {
  const migration = await readFile(
    new URL("0003_contact_import_jobs.sql", migrationsUrl),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `contact_import_jobs`/);
  assert.match(migration, /CREATE TABLE `contact_import_rows`/);
  assert.match(migration, /contact_import_jobs_tenant_key_uq/);
  assert.match(migration, /contact_import_rows_job_source_uq/);
  assert.match(migration, /`phone_fingerprint` text/);
  assert.doesNotMatch(migration, /phone_e164/);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("contact cursor migration adds the tenant and ID keyset index", async () => {
  const migration = await readFile(
    new URL("0004_contact_cursor_index.sql", migrationsUrl),
    "utf8",
  );

  assert.match(
    migration,
    /contacts_tenant_id_idx.*`tenant_id`,`id`/,
  );
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("contact organization migration adds tenant-scoped tags and lists", async () => {
  const migration = await readFile(
    new URL("0005_contact_tags_and_lists.sql", migrationsUrl),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `contact_tags`/);
  assert.match(migration, /CREATE TABLE `contact_lists`/);
  assert.match(migration, /CREATE TABLE `contact_tag_assignments`/);
  assert.match(migration, /CREATE TABLE `contact_list_memberships`/);
  assert.match(migration, /contact_tags_tenant_name_uq/);
  assert.match(migration, /contact_lists_tenant_name_uq/);
  assert.doesNotMatch(migration, /mailing_status|consent_status/);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("Meta migration isolates assets and stores idempotency receipts without payloads", async () => {
  const migration = await readFile(
    new URL("0006_meta_connection_webhooks.sql", migrationsUrl),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `meta_connections`/);
  assert.match(migration, /CREATE TABLE `meta_webhook_receipts`/);
  assert.match(migration, /meta_connections_waba_uq/);
  assert.match(migration, /meta_connections_phone_number_uq/);
  assert.match(migration, /meta_webhook_receipts_tenant_event_uq/);
  assert.match(migration, /meta_webhook_receipts_event_key_sha256/);
  assert.doesNotMatch(
    migration,
    /raw_payload|payload_json|message_body|access_token/,
  );
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("Meta credential migration stores only tenant-bound encrypted envelopes", async () => {
  const migration = await readFile(
    new URL(
      "0007_meta_credential_vault.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `meta_credential_envelopes`/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`\).*ON DELETE cascade/s,
  );
  assert.match(
    migration,
    /meta_credential_envelopes_key_version_valid/,
  );
  assert.match(
    migration,
    /meta_credential_envelopes_iv_base64/,
  );
  assert.match(
    migration,
    /meta_credential_envelopes_ciphertext_bounded/,
  );
  assert.doesNotMatch(
    migration,
    /access_token|plaintext|provider_payload/,
  );
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("WhatsApp rate-limit migration stores only opaque keys and immutable lifecycle evidence", async () => {
  const migration = await readFile(
    new URL(
      "0030_whatsapp_rate_limit_reservations.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `whatsapp_rate_limit_reservations`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `whatsapp_pair_rate_limit_state`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `whatsapp_portfolio_recipient_rate_limit_state`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `whatsapp_rate_limit_settlements`/,
  );
  assert.match(
    migration,
    /whatsapp_rate_reservations_update_guard/,
  );
  assert.match(
    migration,
    /whatsapp_rate_settlements_state_update/,
  );
  const pairStateDefinition = migration.slice(
    migration.indexOf(
      "CREATE TABLE `whatsapp_pair_rate_limit_state`",
    ),
    migration.indexOf(
      "CREATE TABLE `whatsapp_portfolio_recipient_rate_limit_state`",
    ),
  );
  const portfolioStateDefinition = migration.slice(
    migration.indexOf(
      "CREATE TABLE `whatsapp_portfolio_recipient_rate_limit_state`",
    ),
    migration.indexOf(
      "CREATE TRIGGER\n  `whatsapp_pair_state_insert_proof_guard`",
    ),
  );

  assert.doesNotMatch(pairStateDefinition, /tenant_id/);
  assert.doesNotMatch(portfolioStateDefinition, /tenant_id/);
  assert.doesNotMatch(
    migration,
    /phone_e164|phone_number|message_body|access_token/,
  );
  assert.doesNotMatch(migration, /Math\.random/);
});

test("WhatsApp service replies share pair admission without occupying portfolio quota", async () => {
  const migration = await readFile(
    new URL(
      "0037_whatsapp_service_reply_reservations.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /ADD COLUMN `reservation_class` text/,
  );
  assert.match(
    migration,
    /ADD COLUMN `template_category` text/,
  );
  assert.match(
    migration,
    /WHEN NEW\.`reservation_class` = 'business-initiated'/,
  );
  assert.match(
    migration,
    /NEW\.`reservation_class` IS NULL[\s\S]*NEW\.`template_category` IS NULL/,
  );
  assert.match(
    migration,
    /Service replies cannot create portfolio-recipient cooldowns/,
  );
});

test("bot reply deferrals are fenced and constrained to the service window", async () => {
  const migration = await readFile(
    new URL(
      "0038_bot_reply_delivery_deferrals.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(migration, /ADD COLUMN `claim_version` integer NOT NULL DEFAULT 0/);
  assert.match(migration, /ADD COLUMN `next_attempt_at` text/);
  assert.match(migration, /NEW\.`claim_version` = OLD\.`claim_version` \+ 1/);
  assert.match(migration, /NEW\.`next_attempt_at` < \([\s\S]*'\+24 hours'/);
});

test("campaign provider reconciliation migration links one target without retaining message content", async () => {
  const migration = await readFile(
    new URL(
      "0031_campaign_delivery_provider_links.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `campaign_delivery_provider_links`/,
  );
  assert.match(
    migration,
    /campaign_delivery_provider_links_insert_proof_guard/,
  );
  assert.match(
    migration,
    /campaign_delivery_provider_links_terminal_guard/,
  );
  assert.match(
    migration,
    /campaign_delivery_provider_links_settle_rate_limit/,
  );
  assert.match(
    migration,
    /messages_campaign_delivery_target_guard/,
  );
  assert.match(
    migration,
    /campaign_delivery_provider_links_delete_guard/,
  );
  assert.doesNotMatch(
    migration,
    /phone_e164|message_body|text_content|provider_payload|webhook_payload|access_token/,
  );
  assert.equal(
    migration.match(/\bINSERT\s+INTO\b/gi)?.length,
    1,
  );
  assert.match(
    migration,
    /INSERT INTO `whatsapp_rate_limit_settlements`/,
  );
});

test("provider cooldown migration derives opaque blocking state from immutable rejection evidence", async () => {
  const migration = await readFile(
    new URL(
      "0032_whatsapp_provider_cooldowns.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `whatsapp_provider_cooldown_events`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `whatsapp_provider_cooldown_state`/,
  );
  assert.match(
    migration,
    /whatsapp_provider_cooldown_events_proof_guard/,
  );
  assert.match(
    migration,
    /whatsapp_provider_cooldown_events_state_insert/,
  );
  assert.match(
    migration,
    /whatsapp_provider_cooldown_state_monotonic_guard/,
  );
  assert.doesNotMatch(
    migration,
    /tenant_id|phone_e164|phone_number|message_body|access_token|provider_payload/,
  );
  assert.doesNotMatch(migration, /Math\.random/);
});

test("business profile admin migration stores digest-only immutable audit evidence", async () => {
  const migration = await readFile(
    new URL(
      "0033_large_union_jack.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `business_profile_admin_events`/,
  );
  assert.match(
    migration,
    /previous_profile_digest/,
  );
  assert.match(
    migration,
    /new_profile_digest/,
  );
  assert.match(
    migration,
    /business_profile_admin_events_proof_guard/,
  );
  assert.match(
    migration,
    /business_profile_admin_events_insert_audit/,
  );
  assert.match(
    migration,
    /business_profile_admin_events_update_guard/,
  );
  assert.match(
    migration,
    /business_profile_admin_events_delete_guard/,
  );
  assert.doesNotMatch(
    migration,
    /business_name|interface_language|Math\.random/,
  );
});

test("WhatsApp delivery policy migration stores expiring immutable evidence and a kill switch", async () => {
  const migration = await readFile(
    new URL(
      "0034_whatsapp_campaign_delivery_policy_events.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `whatsapp_campaign_delivery_policy_events`/,
  );
  assert.match(
    migration,
    /whatsapp_delivery_policy_events_connection_guard/,
  );
  assert.match(
    migration,
    /whatsapp_delivery_policy_events_sequence_guard/,
  );
  assert.match(
    migration,
    /whatsapp_delivery_policy_events_disable_guard/,
  );
  assert.match(
    migration,
    /whatsapp_delivery_policy_events_insert_audit/,
  );
  assert.match(
    migration,
    /whatsapp_delivery_policy_events_update_guard/,
  );
  assert.match(
    migration,
    /whatsapp_delivery_policy_events_delete_guard/,
  );
  assert.doesNotMatch(
    migration,
    /phone_e164|message_body|access_token|provider_payload|Math\.random/,
  );
});

test("AI persistence migration stores immutable definitions and source metadata without file bytes or secrets", async () => {
  const migration = await readFile(
    new URL(
      "0015_chilly_dreaming_celestial.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `ai_agents`/);
  assert.match(
    migration,
    /CREATE TABLE `ai_agent_versions`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `knowledge_sources`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `ai_agent_version_sources`/,
  );
  assert.match(
    migration,
    /ai_agent_versions_one_published_uq/,
  );
  assert.match(
    migration,
    /knowledge_sources_tenant_digest_uq/,
  );
  assert.match(
    migration,
    /knowledge_sources_state_consistent/,
  );
  assert.doesNotMatch(
    migration,
    /api_key|access_token|provider_payload|raw_payload|file_bytes|content_blob/i,
  );
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("AI runtime migration stores bounded cost and audit records without message or generated content", async () => {
  const migration = await readFile(
    new URL(
      "0016_uneven_firestar.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `ai_runtime_cost_authorizations`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `ai_runtime_usage`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `ai_runtime_audit_events`/,
  );
  assert.match(
    migration,
    /ai_runtime_audit_events_tenant_request_uq/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`request_key`\) REFERENCES `ai_runtime_cost_authorizations`\(`tenant_id`,`request_key`\)/,
  );
  assert.doesNotMatch(
    migration,
    /customer_message|system_prompt|passage_content|response_text|api_key|access_token|provider_payload/i,
  );
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("knowledge passage migration isolates approved retrieval content by tenant and source", async () => {
  const migration = await readFile(
    new URL(
      "0017_unusual_veda.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `knowledge_passages`/,
  );
  assert.match(
    migration,
    /knowledge_passages_tenant_source_ordinal_uq/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`source_key`\) REFERENCES `knowledge_sources`\(`tenant_id`,`source_key`\)/,
  );
  assert.match(
    migration,
    /knowledge_passages_content_bounded/,
  );
  assert.doesNotMatch(
    migration,
    /embedding|provider_payload|api_key|access_token|file_bytes/i,
  );
  assert.doesNotMatch(
    migration,
    /\bINSERT\s+INTO\b/i,
  );
});

test("AI reply outbox migration keeps generated text behind an explicit approval lifecycle", async () => {
  const migration = await readFile(
    new URL(
      "0018_material_guardian.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `ai_reply_outbox`/,
  );
  assert.match(
    migration,
    /ai_reply_outbox_tenant_inbound_uq/,
  );
  assert.match(
    migration,
    /ai_reply_outbox_state_consistent/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`audit_key`\) REFERENCES `ai_runtime_audit_events`\(`tenant_id`,`audit_key`\)/,
  );
  assert.doesNotMatch(
    migration,
    /provider_message_id|access_token|provider_payload/i,
  );
  assert.doesNotMatch(
    migration,
    /\bINSERT\s+INTO\b/i,
  );
});

test("tenant subscription migration adds manual lifecycle state and immutable history without billing assumptions", async () => {
  const migration = await readFile(
    new URL(
      "0019_purple_silvermane.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `tenant_subscriptions`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `tenant_subscription_events`/,
  );
  assert.match(
    migration,
    /tenant_subscription_events_tenant_version_uq/,
  );
  assert.match(
    migration,
    /tenant_subscriptions_cancelled_state_consistent/,
  );
  assert.doesNotMatch(
    migration,
    /price|invoice|payment_provider|provider_customer|card|vat/i,
  );
  assert.doesNotMatch(
    migration,
    /\bINSERT\s+INTO\b/i,
  );
});

test("production decision migration stores versioned global decisions with atomic audit triggers", async () => {
  const migration = await readFile(
    new URL(
      "0020_production_decision_records.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `production_decision_records`/,
  );
  assert.match(
    migration,
    /CREATE TABLE `production_decision_events`/,
  );
  assert.match(
    migration,
    /production_decision_events_check_version_uq/,
  );
  assert.match(
    migration,
    /CREATE TRIGGER `production_decision_records_insert_audit`/,
  );
  assert.match(
    migration,
    /CREATE TRIGGER `production_decision_records_update_guard`/,
  );
  assert.match(
    migration,
    /CREATE TRIGGER `production_decision_records_update_audit`/,
  );
  assert.doesNotMatch(
    migration,
    /access_token|api_key|client_secret|provider_payload/i,
  );
});

test("message template migration stores tenant-owned definitions without provider payloads", async () => {
  const migration = await readFile(
    new URL("0008_message_templates.sql", migrationsUrl),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `message_templates`/);
  assert.match(
    migration,
    /message_templates_tenant_name_language_uq/,
  );
  assert.match(migration, /message_templates_meta_id_uq/);
  assert.match(migration, /message_templates_key_sha256/);
  assert.match(
    migration,
    /message_templates_lifecycle_consistent/,
  );
  assert.doesNotMatch(
    migration,
    /provider_payload|webhook_payload|access_token/,
  );
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("template submission migration adds a durable ambiguity-safe lifecycle", async () => {
  const migration = await readFile(
    new URL(
      "0009_template_submission_lifecycle.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(migration, /`submission_key` text/);
  assert.match(migration, /`submission_started_at` text/);
  assert.match(
    migration,
    /`last_submission_error_code` text/,
  );
  assert.match(
    migration,
    /'draft', 'submitting', 'pending_review'/,
  );
  assert.match(
    migration,
    /'template_submission_v1_' \|\| substr\("template_key", 13\)/,
  );
  assert.doesNotMatch(
    migration,
    /provider_payload|webhook_payload|access_token/,
  );
});

test("template status migration adds paired event identity and provider time", async () => {
  const migration = await readFile(
    new URL(
      "0010_template_status_events.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(migration, /`last_status_event_at` text/);
  assert.match(
    migration,
    /message_templates_status_event_pair_consistent/,
  );
  assert.match(
    migration,
    /message_templates_status_event_at_valid/,
  );
  assert.match(
    migration,
    /"last_submission_error_code", null, null, "version"/,
  );
  assert.doesNotMatch(
    migration,
    /provider_payload|webhook_payload|reason|description|access_token/,
  );
});

test("campaign migration stores frozen snapshots and deterministic delivery identities", async () => {
  const migration = await readFile(
    new URL(
      "0011_campaign_foundation.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `campaigns`/);
  assert.match(
    migration,
    /CREATE TABLE `campaign_recipients`/,
  );
  assert.match(migration, /campaigns_key_sha256/);
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`template_key`\) REFERENCES `message_templates`\(`tenant_id`,`template_key`\)/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`campaign_key`\) REFERENCES `campaigns`\(`tenant_id`,`campaign_key`\)/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`contact_id`\) REFERENCES `contacts`\(`tenant_id`,`id`\)/,
  );
  assert.match(
    migration,
    /campaign_recipients_delivery_key_uq/,
  );
  assert.doesNotMatch(
    migration,
    /access_token|provider_payload|webhook_payload/,
  );
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("conversation migration stores normalized messages without provider payloads", async () => {
  const migration = await readFile(
    new URL(
      "0012_conversations_and_messages.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `conversations`/);
  assert.match(migration, /CREATE TABLE `messages`/);
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`contact_id`\) REFERENCES `contacts`\(`tenant_id`,`id`\)/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`conversation_key`\) REFERENCES `conversations`\(`tenant_id`,`conversation_key`\)/,
  );
  assert.match(
    migration,
    /messages_tenant_provider_id_uq/,
  );
  assert.match(
    migration,
    /messages_direction_status_consistent/,
  );
  assert.doesNotMatch(
    migration,
    /raw_payload|provider_payload|webhook_payload|access_token/,
  );
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});

test("bot flow migration stores immutable tenant-scoped version snapshots", async () => {
  const migration = await readFile(
    new URL(
      "0013_bot_flow_foundation.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE `bot_flows`/);
  assert.match(
    migration,
    /CREATE TABLE `bot_flow_versions`/,
  );
  assert.match(migration, /bot_flows_key_sha256/);
  assert.match(
    migration,
    /bot_flow_versions_one_published_uq/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`bot_flow_key`\) REFERENCES `bot_flows`\(`tenant_id`,`bot_flow_key`\)/,
  );
  assert.match(
    migration,
    /bot_flow_versions_publication_consistent/,
  );
  assert.doesNotMatch(
    migration,
    /access_token|provider_payload|webhook_payload|system_prompt/,
  );
  assert.doesNotMatch(
    migration,
    /\bINSERT\s+INTO\b/i,
  );
});

test("bot reply outbox migration stores tenant-scoped idempotent delivery state", async () => {
  const migration = await readFile(
    new URL(
      "0014_neat_kingpin.sql",
      migrationsUrl,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TABLE `bot_reply_deliveries`/,
  );
  assert.match(
    migration,
    /bot_reply_deliveries_inbound_reply_uq/,
  );
  assert.match(
    migration,
    /bot_reply_deliveries_state_consistent/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`tenant_id`,`inbound_message_key`\) REFERENCES `messages`\(`tenant_id`,`message_key`\)/,
  );
  assert.doesNotMatch(
    migration,
    /access_token|webhook_payload|system_prompt/,
  );
  assert.doesNotMatch(
    migration,
    /\bINSERT\s+INTO\b/i,
  );
});

test("all migrations are accepted by SQLite with foreign keys enabled", async () => {
  const { sql: migrations } = await readAllMigrations();

  const tableNames = execFileSync("/usr/bin/sqlite3", [":memory:"], {
    encoding: "utf8",
    input: [
      "PRAGMA foreign_keys = ON;",
      migrations,
      "SELECT name FROM sqlite_master",
      "WHERE type = 'table'",
      "AND name NOT LIKE 'sqlite_%'",
      "ORDER BY name;",
    ].join("\n"),
  })
    .trim()
    .split("\n");

  assert.deepEqual(tableNames, [
    "ai_agent_version_sources",
    "ai_agent_versions",
    "ai_agents",
    "ai_reply_outbox",
    "ai_runtime_audit_events",
    "ai_runtime_cost_authorizations",
    "ai_runtime_usage",
    "audit_logs",
    "bot_flow_versions",
    "bot_flows",
    "bot_reply_deliveries",
    "bot_reply_delivery_provider_links",
    "bot_reply_service_window_rejection_events",
    "business_profile_admin_events",
    "business_profiles",
    "campaign_delivery_provider_links",
    "campaign_recipients",
    "campaigns",
    "contact_consent_events",
    "contact_import_jobs",
    "contact_import_rows",
    "contact_list_memberships",
    "contact_lists",
    "contact_tag_assignments",
    "contact_tags",
    "contacts",
    "conversations",
    "inbound_button_reply_events",
    "knowledge_passages",
    "knowledge_sources",
    "message_templates",
    "messages",
    "meta_connections",
    "meta_credential_envelopes",
    "meta_webhook_receipts",
    "production_decision_events",
    "production_decision_records",
    "team_invitation_acceptances",
    "team_invitation_deliveries",
    "team_invitation_delivery_deferrals",
    "team_invitation_events",
    "team_invitations",
    "tenant_membership_events",
    "tenant_memberships",
    "tenant_selections",
    "tenant_subscription_events",
    "tenant_subscriptions",
    "tenants",
    "whatsapp_campaign_delivery_policy_events",
    "whatsapp_pair_rate_limit_state",
    "whatsapp_portfolio_recipient_rate_limit_state",
    "whatsapp_provider_cooldown_events",
    "whatsapp_provider_cooldown_state",
    "whatsapp_rate_limit_reservations",
    "whatsapp_rate_limit_settlements",
  ]);
});

test("bot flow constraints isolate versions by tenant and allow one published version", async () => {
  const { sql: migrations } =
    await readAllMigrations();
  const botFlowKey =
    `bot_flow_v1_${"a".repeat(64)}`;
  const firstVersionKey =
    `bot_flow_version_v1_${"b".repeat(64)}`;
  const secondVersionKey =
    `bot_flow_version_v1_${"c".repeat(64)}`;
  const definition = JSON.stringify({
    name: "support",
    entryBlockKey:
      `bot_block_v1_${"d".repeat(64)}`,
    blocks: [
      {
        blockKey:
          `bot_block_v1_${"d".repeat(64)}`,
        type: "trigger",
        nextBlockKey:
          `bot_block_v1_${"e".repeat(64)}`,
      },
      {
        blockKey:
          `bot_block_v1_${"e".repeat(64)}`,
        type: "end",
      },
    ],
  });
  const baseSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
    "INSERT INTO tenants (display_name) VALUES ('tenant-two');",
    "INSERT INTO bot_flows",
    "(bot_flow_key, tenant_id, name, latest_version_key, latest_version_number)",
    `VALUES ('${botFlowKey}', 1, 'support', '${firstVersionKey}', 1);`,
  ];

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO bot_flow_versions",
        "(bot_flow_version_key, bot_flow_key, tenant_id, version_number, definition_json)",
        `VALUES ('${firstVersionKey}', '${botFlowKey}', 2, 1, '${definition}');`,
      ].join("\n"),
    }),
  );

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO bot_flow_versions",
        "(bot_flow_version_key, bot_flow_key, tenant_id, version_number, status, definition_json, published_at)",
        `VALUES ('${firstVersionKey}', '${botFlowKey}', 1, 1, 'published', '${definition}', CURRENT_TIMESTAMP);`,
        "INSERT INTO bot_flow_versions",
        "(bot_flow_version_key, bot_flow_key, tenant_id, version_number, status, definition_json, published_at)",
        `VALUES ('${secondVersionKey}', '${botFlowKey}', 1, 2, 'published', '${definition}', CURRENT_TIMESTAMP);`,
      ].join("\n"),
    }),
  );

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO bot_flow_versions",
        "(bot_flow_version_key, bot_flow_key, tenant_id, version_number, status, definition_json)",
        `VALUES ('${firstVersionKey}', '${botFlowKey}', 1, 1, 'published', '${definition}');`,
      ].join("\n"),
    }),
  );
});

test("conversation constraints isolate contacts and messages by tenant", async () => {
  const { sql: migrations } = await readAllMigrations();
  const conversationKey =
    `conversation_v1_${"a".repeat(64)}`;
  const anotherConversationKey =
    `conversation_v1_${"b".repeat(64)}`;
  const messageKey = `message_v1_${"c".repeat(64)}`;
  const occurredAt = "2026-07-26T08:30:00.000Z";
  const baseSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
    "INSERT INTO tenants (display_name) VALUES ('tenant-two');",
    "INSERT INTO contacts (tenant_id, phone_e164)",
    "VALUES (1, '+972501234567');",
    "INSERT INTO contacts (tenant_id, phone_e164)",
    "VALUES (2, '+972509876543');",
    "INSERT INTO conversations",
    "(conversation_key, tenant_id, contact_id)",
    `VALUES ('${conversationKey}', 1, 1);`,
  ];
  const result = execFileSync(
    "/usr/bin/sqlite3",
    [":memory:"],
    {
      encoding: "utf8",
      input: [
        ...baseSql,
        "INSERT INTO messages",
        "(message_key, conversation_key, tenant_id, provider_message_id,",
        "direction, content_kind, status, text_content, occurred_at, status_updated_at)",
        `VALUES ('${messageKey}', '${conversationKey}', 1, 'wamid.message-17',`,
        `'inbound', 'text', 'received', 'hello', '${occurredAt}', '${occurredAt}');`,
        "SELECT unread_count FROM conversations;",
      ].join("\n"),
    },
  ).trim();

  assert.equal(result, "0");

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO conversations",
        "(conversation_key, tenant_id, contact_id)",
        `VALUES ('${anotherConversationKey}', 1, 2);`,
      ].join("\n"),
    }),
  );

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO messages",
        "(message_key, conversation_key, tenant_id, provider_message_id,",
        "direction, content_kind, status, text_content, occurred_at, status_updated_at)",
        `VALUES ('${messageKey}', '${conversationKey}', 2, 'wamid.message-17',`,
        `'inbound', 'text', 'received', 'hello', '${occurredAt}', '${occurredAt}');`,
      ].join("\n"),
    }),
  );

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO messages",
        "(message_key, conversation_key, tenant_id, provider_message_id,",
        "direction, content_kind, status, text_content, occurred_at, status_updated_at)",
        `VALUES ('${messageKey}', '${conversationKey}', 1, 'wamid.message-17',`,
        `'inbound', 'text', 'received', null, '${occurredAt}', '${occurredAt}');`,
      ].join("\n"),
    }),
  );
});

test("message constraints reject inconsistent direction and content", async () => {
  const { sql: migrations } = await readAllMigrations();
  const conversationKey =
    `conversation_v1_${"d".repeat(64)}`;
  const messageKey = `message_v1_${"e".repeat(64)}`;
  const occurredAt = "2026-07-26T08:30:00.000Z";
  const baseSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
    "INSERT INTO contacts (tenant_id, phone_e164)",
    "VALUES (1, '+972501234567');",
    "INSERT INTO conversations",
    "(conversation_key, tenant_id, contact_id)",
    `VALUES ('${conversationKey}', 1, 1);`,
  ];

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO messages",
        "(message_key, conversation_key, tenant_id, provider_message_id,",
        "direction, content_kind, status, text_content, occurred_at, status_updated_at)",
        `VALUES ('${messageKey}', '${conversationKey}', 1, 'wamid.message-17',`,
        `'inbound', 'text', 'delivered', 'hello', '${occurredAt}', '${occurredAt}');`,
      ].join("\n"),
    }),
  );

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO messages",
        "(message_key, conversation_key, tenant_id, provider_message_id,",
        "direction, content_kind, status, text_content, occurred_at, status_updated_at)",
        `VALUES ('${messageKey}', '${conversationKey}', 1, 'wamid.message-17',`,
        `'inbound', 'image', 'received', 'invented text', '${occurredAt}', '${occurredAt}');`,
      ].join("\n"),
    }),
  );
});

test("campaign constraints keep templates and recipients inside one tenant", async () => {
  const { sql: migrations } = await readAllMigrations();
  const templateKey =
    `template_v1_${"a".repeat(64)}`;
  const campaignKey =
    `campaign_v1_${"b".repeat(64)}`;
  const audienceKey = "c".repeat(64);
  const personalizationKey = "d".repeat(64);
  const deliveryKey =
    `campaign_delivery_v1_${"e".repeat(64)}`;
  const definitionJson = JSON.stringify({
    header: "",
    body: "body",
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
  const tenantAndTemplateSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
    "INSERT INTO tenants (display_name) VALUES ('tenant-two');",
    "INSERT INTO message_templates",
    "(template_key, tenant_id, name, language, category, definition_json)",
    `VALUES ('${templateKey}', 1, 'service_update', 'he', 'UTILITY', '${definitionJson}');`,
  ];
  const baseSql = [
    ...tenantAndTemplateSql,
    "INSERT INTO contacts (tenant_id, phone_e164)",
    "VALUES (2, '+972501234567');",
    "INSERT INTO campaigns",
    "(campaign_key, tenant_id, name, delivery_mode, scheduled_at, timezone,",
    "template_key, template_snapshot_json, audience_snapshot_key, recipient_count)",
    `VALUES ('${campaignKey}', 1, 'service update', 'immediate', null,`,
    `'Asia/Jerusalem', '${templateKey}', '${definitionJson}', '${audienceKey}', 1);`,
  ];

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...tenantAndTemplateSql,
        "INSERT INTO campaigns",
        "(campaign_key, tenant_id, name, delivery_mode, scheduled_at, timezone,",
        "template_key, template_snapshot_json, audience_snapshot_key, recipient_count)",
        `VALUES ('${campaignKey}', 2, 'service update', 'immediate', null,`,
        `'Asia/Jerusalem', '${templateKey}', '${definitionJson}', '${audienceKey}', 1);`,
      ].join("\n"),
    }),
  );

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO campaign_recipients",
        "(campaign_key, tenant_id, contact_id, contact_version, phone_e164,",
        "personalization_json, personalization_key, delivery_key)",
        `VALUES ('${campaignKey}', 1, 1, 1, '+972501234567', '{}',`,
        `'${personalizationKey}', '${deliveryKey}');`,
      ].join("\n"),
    }),
  );
});

test("contact constraints isolate duplicate phones per tenant", async () => {
  const { sql: migrations } = await readAllMigrations();
  const result = execFileSync("/usr/bin/sqlite3", [":memory:"], {
    encoding: "utf8",
    input: [
      "PRAGMA foreign_keys = ON;",
      migrations,
      "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
      "INSERT INTO tenants (display_name) VALUES ('tenant-two');",
      "INSERT INTO contacts (tenant_id, phone_e164)",
      "VALUES (1, '+972501234567');",
      "INSERT INTO contacts (tenant_id, phone_e164)",
      "VALUES (2, '+972501234567');",
      "SELECT mailing_status || ':' || consent_status FROM contacts",
      "ORDER BY tenant_id;",
    ].join("\n"),
  })
    .trim()
    .split("\n");

  assert.deepEqual(result, [
    "unsubscribed:unknown",
    "unsubscribed:unknown",
  ]);

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        "PRAGMA foreign_keys = ON;",
        migrations,
        "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
        "INSERT INTO contacts (tenant_id, phone_e164)",
        "VALUES (1, '+972501234567');",
        "INSERT INTO contacts (tenant_id, phone_e164)",
        "VALUES (1, '+972501234567');",
      ].join("\n"),
    }),
  );
});

test("contact constraints reject invalid phone and consent states", async () => {
  const { sql: migrations } = await readAllMigrations();
  const baseSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
  ];

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO contacts (tenant_id, phone_e164)",
        "VALUES (1, '+972+501234567');",
      ].join("\n"),
    }),
  );

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO contacts (tenant_id, phone_e164)",
        "VALUES (1, '+972501234567');",
        "UPDATE contacts SET mailing_status = 'subscribed'",
        "WHERE id = 1;",
      ].join("\n"),
    }),
  );
});

test("Meta constraints prevent cross-tenant WABA reuse and incomplete connected state", async () => {
  const { sql: migrations } = await readAllMigrations();
  const baseSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
    "INSERT INTO tenants (display_name) VALUES ('tenant-two');",
  ];

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO meta_connections",
        "(tenant_id, business_portfolio_id, waba_id, phone_number_id)",
        "VALUES (1, 'portfolio-one', 'shared-waba', 'phone-one');",
        "INSERT INTO meta_connections",
        "(tenant_id, business_portfolio_id, waba_id, phone_number_id)",
        "VALUES (2, 'portfolio-two', 'shared-waba', 'phone-two');",
      ].join("\n"),
    }),
  );

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO meta_connections",
        "(tenant_id, business_portfolio_id, waba_id, phone_number_id, status)",
        "VALUES (1, 'portfolio-one', 'waba-one', 'phone-one', 'connected');",
      ].join("\n"),
    }),
  );
});

test("Meta receipt constraints accept only lowercase SHA-256 event keys", async () => {
  const { sql: migrations } = await readAllMigrations();
  const baseSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
  ];

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO meta_webhook_receipts",
        "(tenant_id, waba_id, event_key, object_type)",
        "VALUES (1, 'waba-one', 'not-a-digest', 'whatsapp_business_account');",
      ].join("\n"),
    }),
  );
});

test("message template constraints isolate names by tenant and language", async () => {
  const { sql: migrations } = await readAllMigrations();
  const templateKeyOne = `template_v1_${"a".repeat(64)}`;
  const templateKeyTwo = `template_v1_${"b".repeat(64)}`;
  const definitionJson = JSON.stringify({
    header: "",
    body: "body",
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
  const baseSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
  ];

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO message_templates",
        "(template_key, tenant_id, name, language, category, definition_json)",
        `VALUES ('${templateKeyOne}', 1, 'service_update', 'he', 'UTILITY', '${definitionJson}');`,
        "INSERT INTO message_templates",
        "(template_key, tenant_id, name, language, category, definition_json)",
        `VALUES ('${templateKeyTwo}', 1, 'service_update', 'he', 'UTILITY', '${definitionJson}');`,
      ].join("\n"),
    }),
  );

  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "INSERT INTO message_templates",
        "(template_key, tenant_id, name, language, category, definition_json)",
        `VALUES ('${templateKeyOne}', 1, 'Service Update', 'he', 'UTILITY', '${definitionJson}');`,
      ].join("\n"),
    }),
  );
});

test("message template lifecycle requires a durable submission claim", async () => {
  const { sql: migrations } = await readAllMigrations();
  const currentTemplateKey =
    `template_v1_${"c".repeat(64)}`;
  const currentSubmissionKey =
    `template_submission_v1_${"d".repeat(64)}`;
  const definitionJson = JSON.stringify({
    header: "",
    body: "body",
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
  const baseSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
    "INSERT INTO message_templates",
    "(template_key, tenant_id, name, language, category, definition_json)",
    `VALUES ('${currentTemplateKey}', 1, 'service_update', 'he', 'UTILITY', '${definitionJson}');`,
  ];
  const result = execFileSync(
    "/usr/bin/sqlite3",
    [":memory:"],
    {
      encoding: "utf8",
      input: [
        ...baseSql,
        "UPDATE message_templates",
        "SET status = 'submitting',",
        `submission_key = '${currentSubmissionKey}',`,
        "submission_started_at = CURRENT_TIMESTAMP",
        "WHERE template_key =",
        `'${currentTemplateKey}';`,
        "SELECT status FROM message_templates;",
      ].join("\n"),
    },
  ).trim();

  assert.equal(result, "submitting");
  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "UPDATE message_templates",
        "SET status = 'submitting'",
        "WHERE template_key =",
        `'${currentTemplateKey}';`,
      ].join("\n"),
    }),
  );
});

test("message template status identity and timestamp must be stored together", async () => {
  const { sql: migrations } = await readAllMigrations();
  const currentTemplateKey =
    `template_v1_${"7".repeat(64)}`;
  const currentSubmissionKey =
    `template_submission_v1_${"8".repeat(64)}`;
  const currentEventKey = "9".repeat(64);
  const definitionJson = JSON.stringify({
    header: "",
    body: "body",
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
  const baseSql = [
    "PRAGMA foreign_keys = ON;",
    migrations,
    "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
    "INSERT INTO message_templates",
    "(template_key, tenant_id, meta_template_id, name, language, category, status, definition_json, submission_key, submission_started_at, submitted_at)",
    `VALUES ('${currentTemplateKey}', 1, '500006', 'service_update', 'he', 'UTILITY', 'pending_review', '${definitionJson}', '${currentSubmissionKey}', '2026-07-25 10:00:00', '2026-07-25 10:01:00');`,
  ];
  const result = execFileSync(
    "/usr/bin/sqlite3",
    [":memory:"],
    {
      encoding: "utf8",
      input: [
        ...baseSql,
        "UPDATE message_templates",
        `SET last_status_event_key = '${currentEventKey}',`,
        "last_status_event_at = '2026-07-25T10:02:00.000Z';",
        "SELECT length(last_status_event_key) || ':' || last_status_event_at",
        "FROM message_templates;",
      ].join("\n"),
    },
  ).trim();

  assert.equal(
    result,
    "64:2026-07-25T10:02:00.000Z",
  );
  assert.throws(() =>
    execFileSync("/usr/bin/sqlite3", [":memory:"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      input: [
        ...baseSql,
        "UPDATE message_templates",
        `SET last_status_event_key = '${currentEventKey}';`,
      ].join("\n"),
    }),
  );
});

test("submission migration preserves already-submitted templates", async () => {
  const migrationFiles = (await readdir(migrationsUrl))
    .filter(
      (fileName) =>
        fileName.endsWith(".sql") &&
        fileName <
          "0009_template_submission_lifecycle.sql",
    )
    .sort();
  const earlierMigrations = (
    await Promise.all(
      migrationFiles.map((migrationFile) =>
        readFile(
          new URL(migrationFile, migrationsUrl),
          "utf8",
        ),
      ),
    )
  )
    .join("\n")
    .replaceAll("--> statement-breakpoint", "");
  const lifecycleMigration = (
    await readFile(
      new URL(
        "0009_template_submission_lifecycle.sql",
        migrationsUrl,
      ),
      "utf8",
    )
  ).replaceAll("--> statement-breakpoint", "");
  const existingTemplateKey =
    `template_v1_${"e".repeat(64)}`;
  const definitionJson = JSON.stringify({
    header: "",
    body: "body",
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
  const result = execFileSync(
    "/usr/bin/sqlite3",
    [":memory:"],
    {
      encoding: "utf8",
      input: [
        "PRAGMA foreign_keys = ON;",
        earlierMigrations,
        "INSERT INTO tenants (display_name) VALUES ('tenant-one');",
        "INSERT INTO message_templates",
        "(template_key, tenant_id, meta_template_id, name, language, category, status, definition_json, submitted_at)",
        `VALUES ('${existingTemplateKey}', 1, '500005', 'service_update', 'he', 'UTILITY', 'pending_review', '${definitionJson}', '2026-07-25 10:00:00');`,
        lifecycleMigration,
        "SELECT status || ':' || submission_key",
        "FROM message_templates;",
      ].join("\n"),
    },
  ).trim();

  assert.equal(
    result,
    `pending_review:template_submission_v1_${"e".repeat(64)}`,
  );
});
