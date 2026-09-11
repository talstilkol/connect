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
  const [packageJson, source, providerOperationFenceSource] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../scripts/verify-node-postgres-integration.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../scripts/verify-bot-reply-staging-provider-operation-fence-postgres.mjs",
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
  assert.doesNotMatch(source, /runtimeUrl\.username\s*=/);
  assert.doesNotMatch(source, /userInfo\(\)\.username/);
  assert.match(source, /DATABASE_NOT_EMPTY/);
  assert.match(source, /Promise\.all/);
  assert.match(source, /readdirSync\(join\(projectRoot, "postgres", "migrations"\)\)/);
  assert.match(source, /MIGRATION_SEQUENCE_INVALID/);
  assert.match(source, /for \(const migrationFile of migrationFiles\)/);
  assert.match(source, /verifyFullDataMigrationBundle/);
  assert.match(source, /executePostgresFullDataMigrationCutover/);
  assert.match(source, /target-already-cut-over/);
  assert.match(source, /verifyConversationMessageSchema/);
  assert.match(source, /verifyConversationLifecycle/);
  assert.match(source, /verifyTemplateCampaignSchema/);
  assert.match(source, /verifyMessageTemplateSubmissionOutboxLifecycle/);
  assert.match(source, /verifyBotDeliverySchema/);
  assert.match(source, /verifyBotFlowDeliveryLifecycle/);
  assert.match(source, /verifyKnowledgeLifecycle/);
  assert.match(source, /verifyAiAgentLifecycle/);
  assert.match(source, /verifyAiRuntimePersistence/);
  assert.match(source, /verifyPostgresAiReplyApprovalHttpRuntime/);
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
  assert.match(
    source,
    /verifyPostgresOnboardingBusinessProfileHttpRuntime/,
  );
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
  assert.match(source, /verifyBotReplyStagingRunLedger/);
  assert.match(
    source,
    /verifyBotReplyStagingAttestationNoncePostgres/,
  );
  assert.match(
    source,
    /verifyBotReplyStagingAttestedEvidencePostgres/,
  );
  assert.match(
    source,
    /verifyBotReplyStagingProviderOperationFencePostgres/,
  );
  assert.match(source, /verifyBotReplyStagingSafetyEvidence/);
  assert.match(source, /foundation\.botReplyStagingRuns\.claim/);
  assert.match(source, /foundation\.botReplyStagingRuns\.read/);
  assert.match(source, /foundation\.botReplyStagingSafety\.record/);
  assert.match(source, /foundation\.botReplyStagingObservations\.readScenario/);
  assert.match(source, /foundation\.botReplyStagingObservationWriter\.record/);
  assert.match(
    source,
    /foundation\.botReplyStagingWebhookObservations\.recordStatus/,
  );
  assert.match(
    source,
    /botReplyStagingProviderDeferralObservations\.recordDeferral/,
  );
  assert.match(
    source,
    /botReplyStagingSendObservations\.recordAcceptedSend/,
  );
  assert.match(
    source,
    /botReplyStagingSendObservations\.recordKillSwitch/,
  );
  assert.match(
    source,
    /90 \+ attestedEvidenceConcurrencyScenarios \+/,
  );
  assert.match(
    source,
    /providerOperationFenceConcurrencyScenarios/,
  );
  assert.match(
    providerOperationFenceSource,
    /providerOperationFencePostgresScenarioCount = 9/,
  );
  assert.match(
    providerOperationFenceSource,
    /verifyCancellationWinsBeforeReserve[\s\S]*verifyReserveWinsBeforeCancellation/,
  );
  assert.match(
    providerOperationFenceSource,
    /BEGIN ISOLATION LEVEL REPEATABLE READ/,
  );
  assert.match(
    providerOperationFenceSource,
    /BEGIN ISOLATION LEVEL SERIALIZABLE/,
  );
  assert.match(source, /verifyPostgresTenantSelectionHttpRuntime/);
  assert.match(source, /tenant-selection\.directory\.read/);
  assert.match(source, /tenant-selection\.save/);
  assert.match(source, /team\.directory\.read/);
  assert.match(source, /team\.membership\.role\.change/);
  assert.match(source, /team\.invitation\.request/);
  assert.match(source, /team\.invitation\.accept/);
  assert.match(source, /driver-invited-member-user/);
  assert.match(source, /deliveryStatus: "cancelled"/);
  assert.match(source, /conversations\.mark-read/);
  assert.match(source, /conversations\.assignment\.change/);
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
  assert.doesNotMatch(
    providerOperationFenceSource,
    /Math\.random|randomUUID/,
  );
});
