import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayPostgresFoundation,
  RailwayPostgresFoundationError,
} from "../server/platform/railwayPostgresFoundation.ts";

function localEnvironment(overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "test",
    DATABASE_URL:
      "postgresql://tal@127.0.0.1:55434/connect_driver_integration",
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
    ...overrides,
  };
}

function telemetry() {
  return {
    recordIdleClientError() {},
  };
}

test("composes every completed PostgreSQL repository behind one pool", async () => {
  const foundation = createRailwayPostgresFoundation({
    environment: localEnvironment(),
    telemetry: telemetry(),
  });

  assert.deepEqual(Object.keys(foundation).sort(), [
    "aiAgents",
    "aiReplyOutbox",
    "aiRuntime",
    "botFlows",
    "botReplyDeliveries",
    "botReplyProviderLinks",
    "botReplyStagingObservationWriter",
    "botReplyStagingObservations",
    "botReplyStagingProviderDeferralObservations",
    "botReplyStagingRuns",
    "botReplyStagingSafety",
    "botReplyStagingSendObservations",
    "botReplyStagingServiceWindows",
    "botReplyStagingWebhookObservations",
    "botRuntime",
    "businessProfiles",
    "campaignAudiences",
    "campaignDispatch",
    "campaignProviderDeliveries",
    "campaigns",
    "close",
    "contactConsents",
    "contactImports",
    "contactOrganization",
    "contacts",
    "conversations",
    "createBotReplyStagingReleaseEvidenceRepository",
    "createMutationRateLimitBinding",
    "createRailwayCampaignMutationExecutor",
    "createRailwayMessageTemplateSubmissionMutationExecutor",
    "identityOrganizations",
    "invitationAcceptances",
    "invitationDeliveries",
    "invitationExpirations",
    "invitations",
    "knowledgePassages",
    "knowledgeSources",
    "membershipMutations",
    "memberships",
    "messageTemplateSubmissionOutbox",
    "messageTemplates",
    "metaConnections",
    "metaCredentialEnvelopes",
    "metaWebhooks",
    "productionDecisions",
    "provisioning",
    "railwayAiAgentMutations",
    "railwayAiReplyApprovalMutations",
    "railwayApiMutations",
    "railwayBotFlowMutations",
    "railwayContactImportMutations",
    "railwayContactOrganizationMutations",
    "railwayConversationMutations",
    "railwayMessageTemplateDraftMutations",
    "railwayOnboardingBusinessProfileMutations",
    "railwayTenantSelectionMutations",
    "readiness",
    "reports",
    "selections",
    "subscriptions",
    "systemAdminBusinessProfiles",
    "systemAdminTenantDirectory",
    "whatsappDeliveryPolicies",
    "whatsappDeliveryPolicyMetaConnections",
    "whatsappRateLimits",
    "workerSchedulerLeases",
  ]);
  assert.equal(
    typeof foundation.memberships.findActiveByExternalUserId,
    "function",
  );
  assert.equal(
    typeof foundation.identityOrganizations.findByTenantId,
    "function",
  );
  assert.equal(typeof foundation.aiAgents.saveDraft, "function");
  assert.equal(typeof foundation.railwayAiAgentMutations.execute, "function");
  assert.equal(typeof foundation.aiReplyOutbox.stage, "function");
  assert.equal(typeof foundation.aiReplyOutbox.decide, "function");
  assert.equal(typeof foundation.aiRuntime.costGate.authorize, "function");
  assert.equal(typeof foundation.aiRuntime.auditSink.record, "function");
  assert.equal(typeof foundation.botFlows.saveDraft, "function");
  assert.equal(typeof foundation.botReplyDeliveries.stage, "function");
  assert.equal(typeof foundation.botRuntime.applyHandoff, "function");
  assert.equal(typeof foundation.contacts.list, "function");
  assert.equal(typeof foundation.contactConsents.recordEvent, "function");
  assert.equal(
    typeof foundation.conversations.recordInboundMessage,
    "function",
  );
  assert.equal(typeof foundation.contactOrganization.createTag, "function");
  assert.equal(typeof foundation.contactImports.start, "function");
  assert.equal(
    typeof foundation.railwayContactImportMutations.execute,
    "function",
  );
  assert.equal(
    typeof foundation.railwayConversationMutations.execute,
    "function",
  );
  assert.equal(
    typeof foundation.railwayBotFlowMutations.execute,
    "function",
  );
  assert.equal(
    typeof foundation.railwayAiReplyApprovalMutations.execute,
    "function",
  );
  assert.equal(
    typeof foundation.railwayOnboardingBusinessProfileMutations.execute,
    "function",
  );
  assert.equal(
    typeof foundation.railwayTenantSelectionMutations.execute,
    "function",
  );
  assert.equal(
    typeof foundation.createRailwayCampaignMutationExecutor(
      () => false,
    ).execute,
    "function",
  );
  assert.equal(
    typeof foundation.railwayMessageTemplateDraftMutations.execute,
    "function",
  );
  assert.equal(
    typeof foundation.createRailwayMessageTemplateSubmissionMutationExecutor,
    "function",
  );
  assert.equal(
    typeof foundation
      .createRailwayMessageTemplateSubmissionMutationExecutor("v23.0")
      .execute,
    "function",
  );
  assert.equal(typeof foundation.metaConnections.read, "function");
  assert.equal(
    typeof foundation.metaCredentialEnvelopes.findByTenantId,
    "function",
  );
  assert.equal(typeof foundation.messageTemplates.saveDraft, "function");
  assert.equal(
    typeof foundation.messageTemplateSubmissionOutbox.claim,
    "function",
  );
  assert.equal(
    typeof foundation.messageTemplateSubmissionOutbox.reconcileSubmitted,
    "function",
  );
  assert.equal(typeof foundation.botReplyStagingRuns.claim, "function");
  assert.equal(typeof foundation.botReplyStagingRuns.complete, "function");
  assert.equal(typeof foundation.botReplyStagingRuns.read, "function");
  assert.equal(typeof foundation.botReplyStagingSafety.record, "function");
  assert.equal(typeof foundation.botReplyStagingSafety.read, "function");
  assert.equal(typeof foundation.botReplyStagingSafety.findLatest, "function");
  assert.equal(
    typeof foundation.createBotReplyStagingReleaseEvidenceRepository,
    "function",
  );
  assert.equal(
    typeof foundation.botReplyStagingObservations.readScenario,
    "function",
  );
  assert.equal(
    typeof foundation.botReplyStagingObservationWriter.record,
    "function",
  );
  assert.equal(
    typeof foundation.botReplyStagingWebhookObservations.recordStatus,
    "function",
  );
  assert.equal(
    typeof foundation.botReplyStagingProviderDeferralObservations
      .recordDeferral,
    "function",
  );
  assert.equal(
    typeof foundation.botReplyStagingSendObservations.recordAcceptedSend,
    "function",
  );
  assert.equal(
    typeof foundation.botReplyStagingServiceWindows.read,
    "function",
  );
  assert.equal(
    typeof foundation.knowledgeSources.registerUploaded,
    "function",
  );
  assert.equal(
    typeof foundation.knowledgePassages.storeProcessedAndMarkReady,
    "function",
  );
  assert.equal(typeof foundation.metaWebhooks.claimWebhookReceipt, "function");
  assert.equal(
    typeof foundation.whatsappDeliveryPolicies.recordPolicyEvent,
    "function",
  );
  assert.equal(
    typeof foundation.whatsappDeliveryPolicyMetaConnections
      .findConnectionByTenantId,
    "function",
  );
  assert.equal(
    typeof foundation.whatsappRateLimits.reserveBusinessInitiatedMessage,
    "function",
  );
  assert.equal(
    typeof foundation.workerSchedulerLeases.claimNext,
    "function",
  );
  assert.equal(
    typeof foundation.campaignAudiences.listEligibleBySource,
    "function",
  );
  assert.equal(
    typeof foundation.campaignDispatch.claimPendingRecipients,
    "function",
  );
  assert.equal(
    typeof foundation.campaignProviderDeliveries.recordAccepted,
    "function",
  );
  assert.equal(
    typeof foundation.campaignProviderDeliveries.applyProviderStatus,
    "function",
  );
  assert.equal(typeof foundation.campaigns.saveSnapshot, "function");
  assert.equal(typeof foundation.readiness.check, "function");
  assert.equal(typeof foundation.reports.read, "function");
  assert.equal(typeof foundation.selections.save, "function");
  assert.equal(typeof foundation.subscriptions.create, "function");
  assert.equal(
    typeof foundation.provisioning.provisionOwnerWorkspace,
    "function",
  );
  assert.equal(typeof foundation.productionDecisions.save, "function");
  assert.equal(
    typeof foundation.systemAdminBusinessProfiles.update,
    "function",
  );
  assert.equal(
    typeof foundation.systemAdminTenantDirectory.listPage,
    "function",
  );
  assert.equal(
    typeof foundation.railwayApiMutations.saveContact,
    "function",
  );
  assert.equal(typeof foundation.createMutationRateLimitBinding, "function");
  assert.equal(typeof foundation.invitations.request, "function");
  assert.equal(
    typeof foundation.invitationDeliveries.claim,
    "function",
  );
  assert.equal(
    typeof foundation.invitationAcceptances.accept,
    "function",
  );
  assert.doesNotMatch(
    JSON.stringify(foundation),
    /DATABASE_URL|connectionString|credential|55434/,
  );

  await foundation.close();
  await foundation.close();
});

test("fails closed without complete and valid configuration", () => {
  const cases = [
    [
      {},
      "configuration-disabled",
    ],
    [
      { APP_RUNTIME_ENVIRONMENT: "test" },
      "configuration-incomplete",
    ],
    [
      localEnvironment({ POSTGRES_MAX_CONNECTIONS: "0" }),
      "configuration-invalid",
    ],
  ];

  for (const [environment, code] of cases) {
    assert.throws(
      () =>
        createRailwayPostgresFoundation({
          environment,
          telemetry: telemetry(),
        }),
      (error) =>
        error instanceof RailwayPostgresFoundationError &&
        error.code === code &&
        !error.message.includes("postgresql://"),
    );
  }
});

test("rejects extended options and missing telemetry before configuration", () => {
  assert.throws(
    () =>
      createRailwayPostgresFoundation({
        environment: localEnvironment(),
        telemetry: telemetry(),
        tenantId: 7,
      }),
    (error) =>
      error instanceof RailwayPostgresFoundationError &&
      error.code === "options-invalid",
  );

  assert.throws(
    () =>
      createRailwayPostgresFoundation({
        environment: localEnvironment(),
        telemetry: {},
      }),
    (error) =>
      error instanceof RailwayPostgresFoundationError &&
      error.code === "options-invalid",
  );
});
