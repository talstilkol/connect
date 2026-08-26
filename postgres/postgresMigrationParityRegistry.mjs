function target(migration, token) {
  return Object.freeze({ migration, token });
}

function covered(d1Migration, postgresMigrations, targetEvidence, summary) {
  return Object.freeze({
    d1Migration,
    postgresMigrations: Object.freeze(postgresMigrations),
    status: "covered",
    targetEvidence: Object.freeze(targetEvidence),
    summary,
  });
}

export const POSTGRES_MIGRATION_PARITY_REGISTRY = Object.freeze([
  covered(
    "0000_connect_foundation.sql",
    ["0000_core_contacts.sql", "0002_tenant_access_foundation.sql"],
    [
      target("0000_core_contacts.sql", "CREATE TABLE tenants"),
      target("0000_core_contacts.sql", "CREATE TABLE audit_logs"),
      target("0002_tenant_access_foundation.sql", "CREATE TABLE business_profiles"),
      target("0002_tenant_access_foundation.sql", "CREATE TABLE tenant_memberships"),
    ],
    "The D1 foundation is split between PostgreSQL core data and tenant access.",
  ),
  covered(
    "0001_tenant_provisioning.sql",
    ["0000_core_contacts.sql"],
    [
      target("0000_core_contacts.sql", "provisioning_key TEXT"),
      target("0000_core_contacts.sql", "audit_logs_tenant_action_idempotency_uq"),
    ],
    "Provisioning identity and scoped audit idempotency are present from the PostgreSQL baseline.",
  ),
  covered(
    "0002_contacts_and_consent.sql",
    ["0000_core_contacts.sql", "0021_contact_consent_events.sql"],
    [
      target("0000_core_contacts.sql", "CREATE TABLE contacts"),
      target("0021_contact_consent_events.sql", "CREATE TABLE contact_consent_events"),
    ],
    "Contact state and immutable consent history are separated in PostgreSQL.",
  ),
  covered(
    "0003_contact_import_jobs.sql",
    ["0009_contact_organization_imports.sql"],
    [
      target("0009_contact_organization_imports.sql", "CREATE TABLE contact_import_jobs"),
      target("0009_contact_organization_imports.sql", "CREATE TABLE contact_import_rows"),
    ],
    "Import jobs and row outcomes share one PostgreSQL migration.",
  ),
  covered(
    "0004_contact_cursor_index.sql",
    ["0000_core_contacts.sql"],
    [target("0000_core_contacts.sql", "CREATE INDEX contacts_tenant_id_idx")],
    "The contact keyset index is part of the PostgreSQL contact baseline.",
  ),
  covered(
    "0005_contact_tags_and_lists.sql",
    ["0009_contact_organization_imports.sql"],
    [
      target("0009_contact_organization_imports.sql", "CREATE TABLE contact_tags"),
      target("0009_contact_organization_imports.sql", "CREATE TABLE contact_lists"),
      target("0009_contact_organization_imports.sql", "CREATE TABLE contact_tag_assignments"),
      target("0009_contact_organization_imports.sql", "CREATE TABLE contact_list_memberships"),
    ],
    "Contact organization and import storage are consolidated in PostgreSQL.",
  ),
  covered(
    "0006_meta_connection_webhooks.sql",
    ["0010_meta_connection_credentials.sql"],
    [
      target("0010_meta_connection_credentials.sql", "CREATE TABLE meta_connections"),
      target("0010_meta_connection_credentials.sql", "CREATE TABLE meta_webhook_receipts"),
    ],
    "Meta connection and webhook receipt state are consolidated with credential envelopes.",
  ),
  covered(
    "0007_meta_credential_vault.sql",
    ["0010_meta_connection_credentials.sql"],
    [target("0010_meta_connection_credentials.sql", "CREATE TABLE meta_credential_envelopes")],
    "Encrypted credential envelopes are tenant-bound in PostgreSQL.",
  ),
  covered(
    "0008_message_templates.sql",
    ["0006_message_templates_campaigns.sql"],
    [target("0006_message_templates_campaigns.sql", "CREATE TABLE message_templates")],
    "Template and campaign foundations share one PostgreSQL migration.",
  ),
  covered(
    "0009_template_submission_lifecycle.sql",
    ["0006_message_templates_campaigns.sql"],
    [
      target("0006_message_templates_campaigns.sql", "submission_started_at TIMESTAMPTZ"),
      target("0006_message_templates_campaigns.sql", "message_templates_lifecycle_consistent"),
    ],
    "The final PostgreSQL template table includes the submission lifecycle directly.",
  ),
  covered(
    "0010_template_status_events.sql",
    ["0006_message_templates_campaigns.sql"],
    [
      target("0006_message_templates_campaigns.sql", "last_status_event_at TIMESTAMPTZ"),
      target("0006_message_templates_campaigns.sql", "message_templates_status_event_pair_consistent"),
    ],
    "The final PostgreSQL template table includes paired provider status evidence.",
  ),
  covered(
    "0011_campaign_foundation.sql",
    ["0006_message_templates_campaigns.sql", "0015_campaign_dispatch.sql"],
    [
      target("0006_message_templates_campaigns.sql", "CREATE TABLE campaigns"),
      target("0015_campaign_dispatch.sql", "CREATE TABLE campaign_recipients"),
    ],
    "Campaign metadata and dispatch recipients are intentionally split in PostgreSQL.",
  ),
  covered(
    "0012_conversations_and_messages.sql",
    ["0005_conversations_messages.sql"],
    [
      target("0005_conversations_messages.sql", "CREATE TABLE conversations"),
      target("0005_conversations_messages.sql", "CREATE TABLE messages"),
    ],
    "Conversation and normalized message storage have a direct PostgreSQL counterpart.",
  ),
  covered(
    "0013_bot_flow_foundation.sql",
    ["0007_bot_flows_deliveries.sql"],
    [
      target("0007_bot_flows_deliveries.sql", "CREATE TABLE bot_flows"),
      target("0007_bot_flows_deliveries.sql", "CREATE TABLE bot_flow_versions"),
    ],
    "Bot flow identity and immutable versions are consolidated with delivery state.",
  ),
  covered(
    "0014_neat_kingpin.sql",
    ["0007_bot_flows_deliveries.sql"],
    [target("0007_bot_flows_deliveries.sql", "CREATE TABLE bot_reply_deliveries")],
    "Bot reply delivery evidence is part of the PostgreSQL bot lifecycle migration.",
  ),
  covered(
    "0015_chilly_dreaming_celestial.sql",
    ["0008_ai_reporting.sql", "0016_ai_knowledge.sql"],
    [
      target("0008_ai_reporting.sql", "CREATE TABLE ai_agents"),
      target("0008_ai_reporting.sql", "CREATE TABLE ai_agent_versions"),
      target("0016_ai_knowledge.sql", "CREATE TABLE knowledge_sources"),
      target("0016_ai_knowledge.sql", "CREATE TABLE ai_agent_version_sources"),
    ],
    "AI agent reporting state and knowledge relationships are separated by concern.",
  ),
  covered(
    "0016_uneven_firestar.sql",
    ["0008_ai_reporting.sql"],
    [
      target("0008_ai_reporting.sql", "CREATE TABLE ai_runtime_cost_authorizations"),
      target("0008_ai_reporting.sql", "CREATE TABLE ai_runtime_usage"),
      target("0008_ai_reporting.sql", "CREATE TABLE ai_runtime_audit_events"),
    ],
    "AI authorization, usage and audit evidence have direct PostgreSQL tables.",
  ),
  covered(
    "0017_unusual_veda.sql",
    ["0016_ai_knowledge.sql"],
    [target("0016_ai_knowledge.sql", "CREATE TABLE knowledge_passages")],
    "Verified knowledge passages are stored with the knowledge lifecycle.",
  ),
  covered(
    "0018_material_guardian.sql",
    ["0017_ai_reply_outbox.sql"],
    [target("0017_ai_reply_outbox.sql", "CREATE TABLE ai_reply_outbox")],
    "The AI approval outbox has a dedicated PostgreSQL migration.",
  ),
  covered(
    "0019_purple_silvermane.sql",
    ["0018_tenant_subscriptions.sql"],
    [
      target("0018_tenant_subscriptions.sql", "CREATE TABLE tenant_subscriptions"),
      target("0018_tenant_subscriptions.sql", "CREATE TABLE tenant_subscription_events"),
    ],
    "Subscription state and immutable events have direct PostgreSQL counterparts.",
  ),
  covered(
    "0020_production_decision_records.sql",
    ["0019_production_decisions.sql"],
    [
      target("0019_production_decisions.sql", "CREATE TABLE production_decision_records"),
      target("0019_production_decisions.sql", "CREATE TABLE production_decision_events"),
    ],
    "Registered production decisions and their event ledger are preserved.",
  ),
  covered(
    "0021_tenant_selection.sql",
    ["0002_tenant_access_foundation.sql"],
    [target("0002_tenant_access_foundation.sql", "CREATE TABLE tenant_selections")],
    "Tenant selection is part of the PostgreSQL access foundation.",
  ),
  covered(
    "0022_tenant_membership_lifecycle.sql",
    ["0002_tenant_access_foundation.sql", "0003_tenant_membership_events.sql"],
    [
      target("0002_tenant_access_foundation.sql", "tenant_memberships_state_version_guard"),
      target("0003_tenant_membership_events.sql", "CREATE TABLE tenant_membership_events"),
      target("0003_tenant_membership_events.sql", "tenant_memberships_last_owner_update_guard"),
    ],
    "Membership state guards and immutable events are split across two PostgreSQL migrations.",
  ),
  covered(
    "0023_team_invitation_lifecycle.sql",
    ["0004_team_invitation_lifecycle.sql"],
    [
      target("0004_team_invitation_lifecycle.sql", "CREATE TABLE team_invitations"),
      target("0004_team_invitation_lifecycle.sql", "CREATE TABLE team_invitation_events"),
    ],
    "The final invitation schema folds the complete D1 lifecycle into one migration.",
  ),
  covered(
    "0024_team_invitation_outbox.sql",
    ["0004_team_invitation_lifecycle.sql"],
    [target("0004_team_invitation_lifecycle.sql", "CREATE TABLE team_invitation_deliveries")],
    "Invitation delivery outbox evidence is included in the final PostgreSQL lifecycle.",
  ),
  covered(
    "0025_team_invitation_reconciliation.sql",
    ["0004_team_invitation_lifecycle.sql"],
    [target("0004_team_invitation_lifecycle.sql", "enforce_team_invitation_delivery_transition")],
    "Reconciliation transitions are enforced by the consolidated PostgreSQL trigger function.",
  ),
  covered(
    "0026_team_invitation_transition_outbox_guard.sql",
    ["0004_team_invitation_lifecycle.sql"],
    [target("0004_team_invitation_lifecycle.sql", "team_invitations_delivery_active_guard")],
    "Invitation transitions are bound to active delivery evidence in PostgreSQL.",
  ),
  covered(
    "0027_team_invitation_system_actor.sql",
    ["0004_team_invitation_lifecycle.sql"],
    [
      target("0004_team_invitation_lifecycle.sql", "last_actor_kind TEXT"),
      target("0004_team_invitation_lifecycle.sql", "actor_kind TEXT"),
    ],
    "The bounded expiration scheduler identity is present from initial PostgreSQL creation.",
  ),
  covered(
    "0028_team_invitation_expiration_scan.sql",
    ["0004_team_invitation_lifecycle.sql"],
    [target("0004_team_invitation_lifecycle.sql", "CREATE INDEX team_invitations_expiration_scan_idx")],
    "The expiration keyset index is created with the PostgreSQL invitation lifecycle.",
  ),
  covered(
    "0029_team_invitation_acceptance.sql",
    ["0004_team_invitation_lifecycle.sql"],
    [target("0004_team_invitation_lifecycle.sql", "CREATE TABLE team_invitation_acceptances")],
    "Acceptance evidence and guards are included in the consolidated PostgreSQL lifecycle.",
  ),
  covered(
    "0030_whatsapp_rate_limit_reservations.sql",
    [
      "0012_whatsapp_rate_limit_ledger.sql",
      "0024_whatsapp_legacy_reservation_category.sql",
    ],
    [
      target("0012_whatsapp_rate_limit_ledger.sql", "CREATE TABLE whatsapp_rate_limit_reservations"),
      target("0012_whatsapp_rate_limit_ledger.sql", "CREATE TABLE whatsapp_pair_rate_limit_state"),
      target("0012_whatsapp_rate_limit_ledger.sql", "CREATE TABLE whatsapp_portfolio_recipient_rate_limit_state"),
      target("0012_whatsapp_rate_limit_ledger.sql", "CREATE TABLE whatsapp_rate_limit_settlements"),
      target("0024_whatsapp_legacy_reservation_category.sql", "template_category IS NULL"),
    ],
    "The reservation and settlement ledgers have direct PostgreSQL counterparts; an explicit null preserves the category that legacy D1 never stored, while a trigger rejects unknown categories on every new PostgreSQL reservation.",
  ),
  covered(
    "0031_campaign_delivery_provider_links.sql",
    ["0022_campaign_delivery_provider_links.sql"],
    [target("0022_campaign_delivery_provider_links.sql", "CREATE TABLE campaign_delivery_provider_links")],
    "Campaign provider identity and status evidence have a hardened PostgreSQL counterpart.",
  ),
  covered(
    "0032_whatsapp_provider_cooldowns.sql",
    ["0012_whatsapp_rate_limit_ledger.sql"],
    [
      target("0012_whatsapp_rate_limit_ledger.sql", "CREATE TABLE whatsapp_provider_cooldown_events"),
      target("0012_whatsapp_rate_limit_ledger.sql", "CREATE TABLE whatsapp_provider_cooldown_state"),
    ],
    "Provider cooldown evidence is consolidated with the PostgreSQL rate-limit ledger.",
  ),
  covered(
    "0033_large_union_jack.sql",
    ["0020_system_admin_business_profiles.sql"],
    [target("0020_system_admin_business_profiles.sql", "CREATE TABLE business_profile_admin_events")],
    "System-admin profile evidence has a dedicated PostgreSQL migration.",
  ),
  covered(
    "0034_whatsapp_campaign_delivery_policy_events.sql",
    ["0011_whatsapp_delivery_policy.sql"],
    [target("0011_whatsapp_delivery_policy.sql", "CREATE TABLE whatsapp_campaign_delivery_policy_events")],
    "Immutable delivery-policy evidence has a direct PostgreSQL counterpart.",
  ),
  covered(
    "0035_whatsapp_phone_throughput.sql",
    ["0013_whatsapp_phone_throughput.sql"],
    [
      target("0013_whatsapp_phone_throughput.sql", "phone_throughput_messages_per_second"),
      target("0013_whatsapp_phone_throughput.sql", "maximum_outbound_messages_per_second"),
      target("0013_whatsapp_phone_throughput.sql", "whatsapp_rate_limit_reservations_throughput_guard"),
    ],
    "Provider-bound throughput evidence and rolling admission have a direct PostgreSQL migration.",
  ),
  covered(
    "0036_team_invitation_delivery_deferrals.sql",
    ["0029_team_invitation_delivery_deferrals.sql"],
    [
      target(
        "0029_team_invitation_delivery_deferrals.sql",
        "CREATE TABLE team_invitation_delivery_deferrals",
      ),
      target(
        "0029_team_invitation_delivery_deferrals.sql",
        "apply_team_invitation_delivery_deferral",
      ),
    ],
    "Durable provider Retry-After evidence and the atomic sending-to-pending transition have a direct PostgreSQL counterpart.",
  ),
  covered(
    "0037_whatsapp_service_reply_reservations.sql",
    ["0030_whatsapp_service_reply_reservations.sql"],
    [
      target(
        "0030_whatsapp_service_reply_reservations.sql",
        "reservation_class",
      ),
      target(
        "0030_whatsapp_service_reply_reservations.sql",
        "service-reply",
      ),
      target(
        "0030_whatsapp_service_reply_reservations.sql",
        "reservation.reservation_class = 'business-initiated'",
      ),
    ],
    "Service-window replies share pair and phone throughput admission while remaining outside the business-initiated unique-recipient quota in both databases.",
  ),
  covered(
    "0038_bot_reply_delivery_deferrals.sql",
    ["0031_bot_reply_delivery_deferrals.sql"],
    [
      target(
        "0031_bot_reply_delivery_deferrals.sql",
        "claim_version",
      ),
      target(
        "0031_bot_reply_delivery_deferrals.sql",
        "next_attempt_at",
      ),
      target(
        "0031_bot_reply_delivery_deferrals.sql",
        "enforce_bot_reply_delivery_transition",
      ),
    ],
    "Bot replies have a durable due time and fenced claim lifecycle in both databases.",
  ),
  covered(
    "0039_bot_reply_delivery_provider_links.sql",
    ["0032_bot_reply_delivery_provider_links.sql"],
    [
      target(
        "0032_bot_reply_delivery_provider_links.sql",
        "CREATE TABLE bot_reply_delivery_provider_links",
      ),
      target(
        "0032_bot_reply_delivery_provider_links.sql",
        "project_bot_reply_provider_acceptance",
      ),
      target(
        "0032_bot_reply_delivery_provider_links.sql",
        "project_bot_reply_provider_status",
      ),
    ],
    "Bot reply provider identity, accepted projection and terminal rate-limit settlement are guarded atomically in both databases.",
  ),
  covered(
    "0040_inbound_button_reply_provenance.sql",
    ["0037_inbound_button_reply_provenance.sql"],
    [
      target(
        "0037_inbound_button_reply_provenance.sql",
        "CREATE TABLE inbound_button_reply_events",
      ),
      target(
        "0037_inbound_button_reply_provenance.sql",
        "enforce_inbound_button_reply_insert",
      ),
      target(
        "0037_inbound_button_reply_provenance.sql",
        "reject_inbound_button_reply_mutation",
      ),
    ],
    "Inbound button replies are bound immutably to the exact accepted Bot delivery and selected option in both databases.",
  ),
  covered(
    "0041_bot_reply_service_window_rejection_provenance.sql",
    ["0038_bot_reply_service_window_rejection_provenance.sql"],
    [
      target(
        "0038_bot_reply_service_window_rejection_provenance.sql",
        "CREATE TABLE bot_reply_service_window_rejection_events",
      ),
      target(
        "0038_bot_reply_service_window_rejection_provenance.sql",
        "enforce_bot_reply_window_rejection_insert",
      ),
      target(
        "0038_bot_reply_service_window_rejection_provenance.sql",
        "reject_bot_reply_window_rejection_mutation",
      ),
    ],
    "Meta 131047 rejections are bound immutably to one service-reply reservation, settlement, delivery claim and local service window in both databases.",
  ),
  covered(
    "0042_bot_reply_provider_clock_domains.sql",
    ["0045_bot_reply_provider_clock_domains.sql"],
    [
      target(
        "0045_bot_reply_provider_clock_domains.sql",
        "trusted local reconciliation and settlement time",
      ),
      target(
        "0045_bot_reply_provider_clock_domains.sql",
        "NEW.terminal_settled_at IS DISTINCT FROM NEW.updated_at",
      ),
      target(
        "0045_bot_reply_provider_clock_domains.sql",
        "guard_campaign_delivery_provider_link_update",
      ),
    ],
    "Raw Meta provider occurrence orders Bot and Campaign webhook events, while a separate trusted local reconciliation time settles each reservation in both databases.",
  ),
]);

export const POSTGRES_TARGET_ONLY_MIGRATIONS = Object.freeze([
  Object.freeze({
    migration: "0001_railway_api_mutation_receipts.sql",
    token: "CREATE TABLE railway_api_mutation_receipts",
    summary:
      "Railway requires durable HTTP mutation idempotency that the co-located D1 runtime did not need.",
  }),
  Object.freeze({
    migration: "0014_worker_scheduler_lease.sql",
    token: "CREATE TABLE worker_scheduler_leases",
    summary:
      "An always-on Railway scheduler requires a fenced database lease that Cloudflare Cron did not need.",
  }),
  Object.freeze({
    migration: "0023_api_mutation_rate_limits.sql",
    token: "CREATE TABLE api_mutation_rate_limit_buckets",
    summary:
      "Multiple Railway API instances require one shared mutation token bucket in place of a Cloudflare Rate Limit binding.",
  }),
  Object.freeze({
    migration: "0025_data_migration_bundle_receipts.sql",
    token: "CREATE TABLE data_migration_bundle_receipts",
    summary:
      "A Railway cutover needs one immutable receipt for atomic all-slice execution and source-level replay protection.",
  }),
  Object.freeze({
    migration: "0026_message_template_submission_outbox.sql",
    token: "CREATE TABLE message_template_submission_outbox",
    summary:
      "Railway requires a durable Meta template submission outbox and immutable recovery evidence around the external provider side effect.",
  }),
  Object.freeze({
    migration: "0027_clerk_organization_binding.sql",
    token: "ADD COLUMN clerk_organization_id TEXT",
    summary:
      "Railway binds each tenant to one signed Clerk Organization while legacy D1 remains frozen for migration.",
  }),
  Object.freeze({
    migration: "0028_clerk_invitation_rate_limit.sql",
    token: "clerk-organization-invitation",
    summary:
      "Railway workers share one PostgreSQL token bucket for Clerk Organization invitation creation while legacy D1 remains frozen for migration.",
  }),
  Object.freeze({
    migration: "0033_bot_reply_staging_runs.sql",
    token: "CREATE TABLE bot_reply_staging_runs",
    summary:
      "Railway stores fenced, audited staging evidence runs that never existed in the legacy D1 production path.",
  }),
  Object.freeze({
    migration: "0034_bot_reply_staging_authorizations.sql",
    token: "CREATE TABLE bot_reply_staging_authorization_events",
    summary:
      "Railway stores immutable staging-only recipient opt-in and Tal rate-limit approval evidence without raw phone numbers or provider credentials.",
  }),
  Object.freeze({
    migration: "0035_bot_reply_staging_observations.sql",
    token: "CREATE TABLE bot_reply_staging_observation_events",
    summary:
      "Railway stores immutable, PII-free staging observation facts bound to one active fenced run and one exact operation.",
  }),
  Object.freeze({
    migration: "0036_bot_reply_provider_attempt_provenance.sql",
    token: "CREATE TABLE bot_reply_provider_deferral_events",
    summary:
      "Railway binds each provider-enforced Bot reply deferral to one exact delivery claim, service-reply reservation, settlement, cooldown and retry deadline without storing message or phone payloads.",
  }),
  Object.freeze({
    migration: "0039_bot_reply_provider_request_fence.sql",
    token: "CREATE TABLE bot_reply_provider_request_claims",
    summary:
      "Railway creates one immutable, payload-free provider request fence per Bot reply delivery claim and service-reply reservation before the Meta POST boundary.",
  }),
  Object.freeze({
    migration: "0040_bot_reply_staging_release_evidence.sql",
    token: "CREATE TABLE bot_reply_staging_release_evidence",
    summary:
      "Railway stores short-lived cross-service activation evidence behind a release-bound PostgreSQL compare-and-set contract.",
  }),
  Object.freeze({
    migration: "0041_production_readiness_release_evidence_v2.sql",
    token: "CREATE TABLE production_readiness_release_heads_v2",
    summary:
      "Railway stages immutable multi-service readiness candidates and promotes only a candidate with one atomic head compare-and-set plus append-only activation evidence.",
  }),
  Object.freeze({
    migration: "0042_bot_reply_provider_outcome_request_fence.sql",
    token: "Bot reply provider link lacks an exact provider request claim",
    summary:
      "Railway rejects Bot reply acceptance, provider deferral, and service-window rejection outcomes unless each matches the exact tenant, delivery, claim, reservation, and preceding provider request.",
  }),
  Object.freeze({
    migration:
      "0043_bot_reply_staging_release_evidence_operator_audit.sql",
    token:
      "CREATE TABLE bot_reply_staging_release_evidence_operator_events",
    summary:
      "Railway adds immutable system-admin actor and deterministic operator-request evidence for audited Bot reply staging release-evidence publications; runtime activation remains separately fail-closed.",
  }),
  Object.freeze({
    migration:
      "0044_bot_reply_staging_release_evidence_atomic_publish.sql",
    token:
      "publish_bot_reply_staging_release_evidence_with_operator_audit",
    summary:
      "Railway adds an expand-only, search-path-locked PostgreSQL function that keeps one release-evidence compare-and-set and its immutable operator event in the same database statement; activation remains blocked pending a reviewed migration-owner/runtime-role split.",
  }),
  Object.freeze({
    migration:
      "0046_bot_reply_staging_release_evidence_atomic_initialize.sql",
    token:
      "initialize_publish_bot_reply_staging_evidence_with_audit",
    summary:
      "Railway adds an expand-only, search-path-locked wrapper that initializes a first release and invokes the atomic evidence-plus-audit publisher in one database statement; PUBLIC execution and runtime activation remain blocked.",
  }),
  Object.freeze({
    migration:
      "0047_bot_reply_staging_attestation_nonce_ledger.sql",
    token:
      "CREATE TABLE public.bot_reply_staging_attestation_nonces",
    summary:
      "Railway adds a dormant, payload-free and immutable PostgreSQL replay ledger for worker-signed Bot reply staging receipt attestations; PUBLIC access and runtime activation remain blocked pending atomic composition and distinct database roles.",
  }),
  Object.freeze({
    migration:
      "0048_bot_reply_staging_attested_evidence_atomic_publish.sql",
    token:
      "publish_bot_reply_staging_attested_evidence_with_audit",
    summary:
      "Railway atomically composes one completed-run receipt, one attestation nonce, one v2 release-evidence compare-and-set, and one immutable operator event; the SECURITY DEFINER capability remains dormant with no runtime grant.",
  }),
  Object.freeze({
    migration:
      "0049_bot_reply_staging_attested_evidence_readback.sql",
    token:
      "read_bot_reply_staging_attested_release_evidence_v1",
    summary:
      "Railway prepares one release-bound, invoker-rights readback while keeping definer rights, named runtime grants, and activation blocked for the later verifier-role migration.",
  }),
  Object.freeze({
    migration:
      "0050_bot_reply_staging_trigger_hardening.sql",
    token:
      "REVOKE ALL ON FUNCTION public.audit_bot_reply_staging_run_start() FROM PUBLIC",
    summary:
      "Railway locks the five existing Bot reply staging trigger functions to the canonical safe catalog path, qualifies audit writes, preserves invoker rights, and removes PUBLIC execution without granting or activating a runtime capability.",
  }),
  Object.freeze({
    migration:
      "0051_bot_reply_staging_run_capability_wrappers.sql",
    token:
      "claim_bot_reply_staging_run_v1",
    summary:
      "Railway prepares three database-clocked, half-open and invoker-rights staging-run lifecycle wrappers while keeping direct-table denial, definer conversion, runtime grants and activation blocked for a later reviewed role migration.",
  }),
  Object.freeze({
    migration:
      "0052_bot_reply_staging_authorization_observation_hardening.sql",
    token:
      "guard_bot_reply_staging_audit_insert",
    summary:
      "Railway locks the six authorization and observation trigger functions to fully qualified invoker-rights bodies, closes the observation lease boundary against stale writes, and rejects direct spoofing of trigger-owned staging audit actions without adding a runtime grant or activation.",
  }),
  Object.freeze({
    migration:
      "0053_bot_reply_staging_provider_operation_fence.sql",
    token:
      "reserve_bot_reply_staging_provider_operation_v1",
    summary:
      "Railway adds a dormant two-phase, database-clocked provider-operation fence: only a newly committed reservation exposes one request capability, while exact durable outcomes or lease-expiry uncertainty close an immutable PII-free observation and block automatic replay.",
  }),
  Object.freeze({
    migration:
      "0054_meta_credential_revision_ledger.sql",
    token:
      "CREATE TABLE public.meta_credential_revision_events",
    summary:
      "Railway derives Meta credential revision identity inside PostgreSQL and records an immutable secret-free envelope digest ledger; exact replay is stable, old digest reuse is blocked, and no runtime capability is granted.",
  }),
  Object.freeze({
    migration:
      "0055_bot_reply_staging_credential_bound_pre_send_permit.sql",
    token:
      "reserve_bot_reply_staging_credential_bound_pre_send_permit_v2",
    summary:
      "Railway binds new staging authorization and run-claim evidence to one exact Meta credential revision, requires a separately admitted delivery/reservation/policy identity that is composite-bound to that same run, authorization and credential, and may reserve one DB-clocked immutable pre-send permit; the admission writer, consumption, provider capability release, named grants and runtime activation remain blocked for the later session-barrier migration.",
  }),
  Object.freeze({
    migration:
      "0056_bot_reply_staging_credential_bound_pre_send_session_barrier.sql",
    token:
      "acquire_bot_reply_staging_pre_send_session_barrier_v1",
    summary:
      "Railway adds dormant tenant-session and reconciliation-marker barriers, crash-durable subject fences, exclusive canonical Meta assets, atomic credential-bound request evidence, and a one-shot committed provider-boundary claim. Replay and reconciliation cannot mint send capability; ambiguity and timeout remain nonterminal. Runtime grants, pinned driver, trusted scope writer, cooperating writers and activation remain blocked.",
  }),
  Object.freeze({
    migration:
      "0057_bot_reply_staging_writer_barrier_and_late_truth.sql",
    token:
      "reserve_and_bind_bot_reply_staging_service_reply_v1",
    summary:
      "Railway keeps activation dormant while binding each service-reply reservation to one immutable run/delivery/inbound/recipient scope, reducing admission to that single scope identity, enforcing immutable message occurrence time and barrier-first provider writers, and preserving exact-fact precedence across accepted, deferred and rejected late truth. Public grants, roles, SECURITY DEFINER functions and Runtime wiring remain absent.",
  }),
]);
