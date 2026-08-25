import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  requireLocalIntegrationUrl,
} from "../scripts/verify-node-postgres-integration.mjs";

test("accepts only the dedicated loopback integration database", () => {
  assert.equal(
    requireLocalIntegrationUrl(
      "postgresql://tal@127.0.0.1:55433/connect_driver_integration",
    ),
    "postgresql://tal@127.0.0.1:55433/connect_driver_integration",
  );
  assert.equal(
    requireLocalIntegrationUrl(
      "postgres://tal@localhost:55434/connect_driver_integration",
    ),
    "postgres://tal@localhost:55434/connect_driver_integration",
  );
});

test("rejects remote, reusable, credential-bearing, and extended URLs", () => {
  const invalidUrls = [
    "postgresql://tal@database.example.com:5432/connect_driver_integration",
    "postgresql://tal@127.0.0.1:5432/connect",
    "postgresql://tal:secret@127.0.0.1:5432/connect_driver_integration",
    "postgresql://tal@127.0.0.1:5432/connect_driver_integration?sslmode=disable",
    "postgresql://tal@127.0.0.1/connect_driver_integration",
    "https://127.0.0.1:5432/connect_driver_integration",
  ];

  for (const value of invalidUrls) {
    assert.throws(
      () => requireLocalIntegrationUrl(value),
      {
        message: "NODE_POSTGRES_INTEGRATION_URL_INVALID",
      },
    );
  }
});

test("keeps the real integration proof explicit and outside the default gate", async () => {
  const [packageJson, source] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../scripts/verify-node-postgres-integration.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  const scripts = JSON.parse(packageJson).scripts;

  assert.equal(
    scripts["verify:node-postgres-integration"],
    "node scripts/verify-node-postgres-integration.mjs",
  );
  assert.doesNotMatch(scripts.test, /node-postgres-integration/);
  assert.match(source, /DATABASE_NOT_EMPTY/);
  assert.match(source, /Promise\.all/);
  assert.match(source, /0004_team_invitation_lifecycle\.sql/);
  assert.match(source, /0005_conversations_messages\.sql/);
  assert.match(source, /0006_message_templates_campaigns\.sql/);
  assert.match(source, /0007_bot_flows_deliveries\.sql/);
  assert.match(source, /0008_ai_reporting\.sql/);
  assert.match(source, /0011_whatsapp_delivery_policy\.sql/);
  assert.match(source, /0012_whatsapp_rate_limit_ledger\.sql/);
  assert.match(source, /0013_whatsapp_phone_throughput\.sql/);
  assert.match(source, /0014_worker_scheduler_lease\.sql/);
  assert.match(source, /0015_campaign_dispatch\.sql/);
  assert.match(source, /0016_ai_knowledge\.sql/);
  assert.match(source, /0017_ai_reply_outbox\.sql/);
  assert.match(source, /0018_tenant_subscriptions\.sql/);
  assert.match(source, /0019_production_decisions\.sql/);
  assert.match(source, /0020_system_admin_business_profiles\.sql/);
  assert.match(source, /0021_contact_consent_events\.sql/);
  assert.match(source, /0022_campaign_delivery_provider_links\.sql/);
  assert.match(source, /0023_api_mutation_rate_limits\.sql/);
  assert.match(source, /0024_whatsapp_legacy_reservation_category\.sql/);
  assert.match(source, /0025_data_migration_bundle_receipts\.sql/);
  assert.match(source, /0026_message_template_submission_outbox\.sql/);
  assert.match(source, /0027_clerk_organization_binding\.sql/);
  assert.match(source, /0028_clerk_invitation_rate_limit\.sql/);
  assert.match(source, /0029_team_invitation_delivery_deferrals\.sql/);
  assert.match(source, /0030_whatsapp_service_reply_reservations\.sql/);
  assert.match(source, /0031_bot_reply_delivery_deferrals\.sql/);
  assert.match(source, /0032_bot_reply_delivery_provider_links\.sql/);
  assert.match(source, /0033_bot_reply_staging_runs\.sql/);
  assert.match(source, /0034_bot_reply_staging_authorizations\.sql/);
  assert.match(source, /0035_bot_reply_staging_observations\.sql/);
  assert.match(source, /0036_bot_reply_provider_attempt_provenance\.sql/);
  assert.match(source, /0037_inbound_button_reply_provenance\.sql/);
  assert.match(
    source,
    /0038_bot_reply_service_window_rejection_provenance\.sql/,
  );
  assert.match(source, /0039_bot_reply_provider_request_fence\.sql/);
  assert.match(source, /0040_bot_reply_staging_release_evidence\.sql/);
  assert.match(
    source,
    /0041_production_readiness_release_evidence_v2\.sql/,
  );
  assert.match(
    source,
    /0042_bot_reply_provider_outcome_request_fence\.sql/,
  );
  assert.match(
    source,
    /0043_bot_reply_staging_release_evidence_operator_audit\.sql/,
  );
  assert.match(
    source,
    /0044_bot_reply_staging_release_evidence_atomic_publish\.sql/,
  );
  assert.match(
    source,
    /0045_bot_reply_provider_clock_domains\.sql/,
  );
  assert.match(
    source,
    /0046_bot_reply_staging_release_evidence_atomic_initialize\.sql/,
  );
  assert.match(
    source,
    /0047_bot_reply_staging_attestation_nonce_ledger\.sql/,
  );
  assert.match(source, /verifyFullDataMigrationBundle/);
  assert.match(source, /verifyBotReplyStagingAttestationNoncePostgres/);
  assert.match(source, /executePostgresFullDataMigrationCutover/);
  assert.match(source, /target-already-cut-over/);
  assert.match(source, /verifyConversationMessageSchema/);
  assert.match(source, /verifyConversationLifecycle/);
  assert.match(source, /verifyTemplateCampaignSchema/);
  assert.match(source, /verifyBotDeliverySchema/);
  assert.match(source, /verifyBotFlowDeliveryLifecycle/);
  assert.match(source, /verifyKnowledgeLifecycle/);
  assert.match(source, /verifyAiAgentLifecycle/);
  assert.match(source, /verifyAiRuntimePersistence/);
  assert.match(source, /verifyAiReportingSchema/);
  assert.match(source, /verifyWhatsappDeliveryPolicy/);
  assert.match(source, /verifyWhatsappRateLimitLedger/);
  assert.match(source, /verifyWorkerSchedulerLease/);
  assert.match(source, /verifyCampaignDispatch/);
  assert.match(source, /verifyCampaignProviderReconciliation/);
  assert.match(source, /verifyTenantSubscriptionLifecycle/);
  assert.match(source, /verifyTenantProvisioningLifecycle/);
  assert.match(source, /verifyProductionDecisionLifecycle/);
  assert.match(source, /verifySystemAdminLifecycle/);
  assert.match(source, /verifyContactConsentLifecycle/);
  assert.match(source, /verifyCampaignAudienceRead/);
  assert.match(source, /verifyPostgresHttpRuntime/);
  assert.match(source, /verifyApiMutationRateLimit/);
  assert.match(source, /foundation\.createMutationRateLimitBinding/);
  assert.match(source, /foundation\.reports\.read/);
  assert.match(source, /foundation\.campaigns\.saveSnapshot/);
  assert.match(source, /foundation\.messageTemplates\.saveDraft/);
  assert.match(source, /foundation\.messageTemplates\.applyStatusEvent/);
  assert.match(source, /foundation\.conversations\.recordInboundMessage/);
  assert.match(source, /foundation\.botFlows\.saveDraft/);
  assert.match(source, /foundation\.botReplyDeliveries\.stage/);
  assert.match(
    source,
    /foundation\.botReplyDeliveries\.claimProviderRequest/,
  );
  assert.match(
    source,
    /foundation\.whatsappRateLimits\.reserveServiceReply/,
  );
  assert.match(source, /senderPhoneNumberId/);
  assert.match(
    source,
    /foundation\.botRuntime[\s\S]*\.findAcceptedButtonContinuation/,
  );
  assert.match(source, /foundation\.botRuntime\.applyHandoff/);
  assert.match(source, /foundation\.knowledgeSources\.registerUploaded/);
  assert.match(source, /foundation\.aiAgents\.saveDraft/);
  assert.match(source, /foundation\.aiRuntime\.costGate\.authorize/);
  assert.match(source, /foundation\.aiRuntime\.auditSink\.record/);
  assert.match(source, /foundation\.aiReplyOutbox\.stage/);
  assert.match(source, /foundation\.aiReplyOutbox\.decide/);
  assert.match(source, /foundation\.subscriptions\.create/);
  assert.match(source, /foundation\.subscriptions\.extend/);
  assert.match(source, /foundation\.subscriptions\.changeStatus/);
  assert.match(source, /foundation\.subscriptions\.cancel/);
  assert.match(source, /foundation\.provisioning\.provisionOwnerWorkspace/);
  assert.match(source, /foundation\.productionDecisions\.save/);
  assert.match(source, /foundation\.systemAdminTenantDirectory\.listPage/);
  assert.match(source, /foundation\.systemAdminBusinessProfiles\.update/);
  assert.match(source, /foundation\.contactConsents\.recordEvent/);
  assert.match(
    source,
    /foundation\.campaignAudiences\.listEligibleBySource/,
  );
  assert.match(source, /foundation\.campaignProviderDeliveries\.recordAccepted/);
  assert.match(source, /foundation\.campaignProviderDeliveries\.applyProviderStatus/);
  assert.match(source, /concurrencyScenarios: 61/);
  assert.match(
    source,
    /foundation\.knowledgePassages\.storeProcessedAndMarkReady/,
  );
  assert.match(source, /runtime\.handler\.handle/);
  assert.match(source, /runtime\.readiness\.check/);
  assert.match(source, /createRailwayPostgresApiRuntime/);
  assert.match(source, /messages_direction_status_consistent|23514/);
  assert.match(source, /createRailwayPostgresFoundation/);
  assert.doesNotMatch(source, /Math\.random|randomUUID/);
});
