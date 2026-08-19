import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  HOSTING_MIGRATION_REGISTRY,
  hostingMigrationDecisionStates,
  hostingMigrationNextActions,
} from "../shared/domain/hostingMigrationRegistry.ts";

const projectFile = (path) =>
  new URL(`../${path}`, import.meta.url);

const workerSource = readFileSync(
  projectFile("worker/index.ts"),
  "utf8",
);
const viteSource = readFileSync(
  projectFile("vite.config.ts"),
  "utf8",
);

test("freezes every current Cloudflare binding exactly once", () => {
  const expectedBindings = [
    "ASSETS",
    "CAMPAIGN_DELIVERY_QUEUE",
    "DB",
    "FILES",
    "IMAGES",
    "META_APP_SECRET",
    "META_WEBHOOK_QUEUE",
    "META_WEBHOOK_RATE_LIMITER",
    "META_WEBHOOK_VERIFY_TOKEN",
    "SYSTEM_ADMIN_MUTATION_RATE_LIMITER",
    "TEAM_INVITATION_QUEUE",
    "TENANT_MUTATION_RATE_LIMITER",
    "WHATSAPP_RATE_LIMIT_HMAC_KEY_V1",
  ].sort();
  const registeredBindings = HOSTING_MIGRATION_REGISTRY
    .flatMap(({ currentBindings }) => currentBindings)
    .sort();

  assert.deepEqual(registeredBindings, expectedBindings);
  assert.equal(
    new Set(registeredBindings).size,
    registeredBindings.length,
  );

  for (const binding of expectedBindings) {
    assert.match(workerSource, new RegExp(`\\b${binding}\\b`));
  }
});

test("covers all queue, DLQ, and scheduler resources from the current runtime", () => {
  for (const resource of [
    "connect-meta-webhooks",
    "connect-meta-webhooks-dlq",
    "connect-campaign-deliveries",
    "connect-campaign-deliveries-dlq",
    "connect-team-invitations",
    "connect-team-invitations-dlq",
  ]) {
    assert.match(viteSource, new RegExp(resource));
    assert.ok(
      HOSTING_MIGRATION_REGISTRY.some(({ currentResources }) =>
        currentResources.includes(resource),
      ),
    );
  }

  assert.match(viteSource, /crons: \["\* \* \* \* \*"\]/);
  assert.ok(
    HOSTING_MIGRATION_REGISTRY.some(
      ({ id, currentResources }) =>
        id === "worker.scheduler" &&
        currentResources.includes("Cloudflare Cron */1 minute"),
    ),
  );
});

test("keeps migration entries unique, immutable, and linked to real sources", () => {
  const ids = HOSTING_MIGRATION_REGISTRY.map(({ id }) => id);

  assert.equal(ids.length, 18);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(Object.isFrozen(HOSTING_MIGRATION_REGISTRY));

  for (const capability of HOSTING_MIGRATION_REGISTRY) {
    assert.ok(Object.isFrozen(capability));
    assert.ok(Object.isFrozen(capability.currentBindings));
    assert.ok(Object.isFrozen(capability.currentResources));
    assert.ok(Object.isFrozen(capability.sourceFiles));
    assert.ok(capability.sourceFiles.length > 0);
    assert.ok(capability.cutoverBlocker.length > 0);
    assert.ok(
      hostingMigrationDecisionStates.includes(
        capability.decisionState,
      ),
    );
    assert.ok(
      hostingMigrationNextActions.includes(
        capability.nextAction,
      ),
    );

    for (const sourceFile of capability.sourceFiles) {
      assert.ok(
        existsSync(projectFile(sourceFile)),
        `${capability.id} source is missing: ${sourceFile}`,
      );
    }
  }
});

test("does not invent providers for unresolved shared services", () => {
  const unresolved = HOSTING_MIGRATION_REGISTRY.filter(
    ({ decisionState }) => decisionState === "decision-required",
  );
  const selected = HOSTING_MIGRATION_REGISTRY.filter(
    ({ decisionState }) => decisionState === "selected",
  );

  assert.equal(unresolved.length, 9);
  assert.equal(selected.length, 9);
  assert.ok(
    unresolved.every(
      ({ targetProvider }) =>
        targetProvider === "unknown/unavailable",
    ),
  );
  assert.ok(
    selected.every(
      ({ targetProvider }) =>
        targetProvider !== "unknown/unavailable",
    ),
  );
  assert.ok(
    HOSTING_MIGRATION_REGISTRY.every(
      ({ nextAction }) => nextAction !== "ready",
    ),
  );
});

test("keeps the contract freeze deterministic and randomness-free", () => {
  const source = readFileSync(
    projectFile("shared/domain/hostingMigrationRegistry.ts"),
    "utf8",
  );

  assert.doesNotMatch(source, /\bMath\.random\s*\(/);
  assert.doesNotMatch(source, /\bcrypto\.randomUUID\s*\(/);
  assert.doesNotMatch(source, /\bDate\.now\s*\(/);
});

test("requires an always-on adapter instead of an incompatible Railway Cron", () => {
  const scheduler = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "worker.scheduler",
  );

  assert.ok(scheduler);
  assert.equal(scheduler.targetProvider, "railway");
  assert.equal(scheduler.nextAction, "adapter-required");
  assert.match(scheduler.targetContract, /atomic PostgreSQL lease/);
  assert.match(scheduler.cutoverBlocker, /Railway Cron cannot satisfy/);
  assert.match(scheduler.cutoverBlocker, /lease, fencing token/);
  assert.match(
    scheduler.cutoverBlocker,
    /five-tick catch-up,[\s\S]*PostgreSQL campaign\/invitation runtime composition are implemented/,
  );
  assert.match(scheduler.cutoverBlocker, /minute-aligned timer/);
  assert.match(scheduler.cutoverBlocker, /active-run drain/);
  assert.match(scheduler.cutoverBlocker, /SIGINT\/SIGTERM process lifecycle/);
  assert.match(scheduler.cutoverBlocker, /target queue adapter/);
  for (const path of [
    "shared/domain/workerScheduler.ts",
    "server/platform/postgresWorkerSchedulerLeaseRepository.ts",
    "server/platform/railwayWorkerScheduler.ts",
    "server/platform/railwayWorkerSchedulerService.ts",
    "server/platform/railwayWorkerProcess.ts",
    "server/platform/railwayWorkerRuntime.ts",
    "server/platform/railwayPostgresWorkerService.ts",
    "server/platform/postgresCampaignDispatchRepository.ts",
    "postgres/migrations/0014_worker_scheduler_lease.sql",
    "postgres/migrations/0015_campaign_dispatch.sql",
  ]) {
    assert.equal(scheduler.sourceFiles.includes(path), true);
  }
});

test("records the local API contract without claiming live adapter readiness", () => {
  const boundary = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "web.server-api-boundary",
  );

  assert.ok(boundary);
  assert.equal(boundary.decisionState, "selected");
  assert.equal(boundary.nextAction, "adapter-required");
  const expectedBoundaryFiles = [
    "server/platform/railwayApiContract.ts",
    "server/platform/railwayApiClient.ts",
    "server/platform/railwayApiHttpHandler.ts",
    "server/platform/railwayApiIdentityConfiguration.ts",
    "server/platform/railwayApiIdentityAdapters.ts",
    "server/platform/vercelOidcVerifier.ts",
    "server/platform/clerkEndUserSessionVerifier.ts",
    "server/platform/railwayTenantSessionResolver.ts",
    "server/platform/railwayApiOperationRegistry.ts",
    "server/platform/railwayApiMutationExecutor.ts",
    "server/platform/postgresTransaction.ts",
    "server/platform/nodePostgresAdapter.ts",
    "server/platform/nodePostgresPoolConfiguration.ts",
    "server/platform/postgresReadinessProbe.ts",
    "server/platform/railwayPostgresFoundation.ts",
    "server/platform/railwayPostgresApiRuntime.ts",
    "server/platform/railwayNodeHttpServer.ts",
    "server/platform/railwayNodeProcess.ts",
    "server/platform/railwayNodeService.ts",
    "server/platform/postgresTenantMembershipRepository.ts",
    "server/platform/postgresTenantMembershipMutationRepository.ts",
    "server/platform/postgresTenantSelectionRepository.ts",
    "server/platform/postgresRailwayApiMutationExecutor.ts",
    "server/platform/postgresTeamInvitationRepository.ts",
    "server/platform/postgresTeamInvitationExpirationRepository.ts",
    "server/platform/postgresTeamInvitationDeliveryRepository.ts",
    "server/platform/postgresTeamInvitationAcceptanceRepository.ts",
    "server/platform/postgresContactReadRepository.ts",
    "server/platform/postgresContactConsentRepository.ts",
    "server/platform/postgresConversationRepository.ts",
    "server/platform/postgresBotFlowRepository.ts",
    "server/platform/postgresBotReplyDeliveryRepository.ts",
    "server/platform/postgresBotRuntimeRepository.ts",
    "server/platform/postgresTenantSubscriptionRepository.ts",
    "server/platform/postgresTenantProvisioningRepository.ts",
    "server/platform/postgresProductionDecisionRepository.ts",
    "server/platform/postgresSystemAdminBusinessProfileRepository.ts",
    "server/platform/postgresSystemAdminTenantDirectoryRepository.ts",
    "server/platform/postgresKnowledgeSourceRepository.ts",
    "server/platform/postgresKnowledgePassageRepository.ts",
    "server/platform/postgresAiAgentRepository.ts",
    "server/platform/postgresAiReplyOutboxRepository.ts",
    "server/platform/postgresAiRuntimeRepository.ts",
    "server/platform/postgresContactOrganizationRepository.ts",
    "server/platform/postgresContactImportRepository.ts",
    "server/platform/postgresMetaRepository.ts",
    "server/platform/postgresMetaCredentialRepository.ts",
    "server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts",
    "server/platform/postgresWhatsappRateLimitRepository.ts",
    "server/platform/postgresWorkerSchedulerLeaseRepository.ts",
    "server/platform/postgresCampaignAudienceRepository.ts",
    "server/platform/postgresOperationalReportRepository.ts",
    "server/platform/postgresCampaignDispatchRepository.ts",
    "server/platform/postgresCampaignRepository.ts",
    "server/platform/postgresMessageTemplateRepository.ts",
    "postgres/migrations/0004_team_invitation_lifecycle.sql",
    "postgres/migrations/0005_conversations_messages.sql",
    "postgres/migrations/0006_message_templates_campaigns.sql",
    "postgres/migrations/0007_bot_flows_deliveries.sql",
    "postgres/migrations/0008_ai_reporting.sql",
    "postgres/migrations/0009_contact_organization_imports.sql",
    "postgres/migrations/0010_meta_connection_credentials.sql",
    "postgres/migrations/0011_whatsapp_delivery_policy.sql",
    "postgres/migrations/0012_whatsapp_rate_limit_ledger.sql",
    "postgres/migrations/0013_whatsapp_phone_throughput.sql",
    "postgres/migrations/0014_worker_scheduler_lease.sql",
    "postgres/migrations/0015_campaign_dispatch.sql",
    "postgres/migrations/0016_ai_knowledge.sql",
    "postgres/migrations/0017_ai_reply_outbox.sql",
    "postgres/migrations/0018_tenant_subscriptions.sql",
    "postgres/migrations/0019_production_decisions.sql",
    "postgres/migrations/0020_system_admin_business_profiles.sql",
    "postgres/migrations/0021_contact_consent_events.sql",
    "server/platform/railwayApiRuntime.ts",
  ];

  for (const path of expectedBoundaryFiles) {
    assert.equal(boundary.sourceFiles.includes(path), true);
  }

  assert.match(boundary.cutoverBlocker, /authenticated runtime/);
  assert.match(boundary.cutoverBlocker, /contacts\.save/);
  assert.match(boundary.cutoverBlocker, /PostgreSQL transaction executor/);
  assert.match(boundary.cutoverBlocker, /thirty-seven-adapter PostgreSQL foundation/);
  assert.match(boundary.cutoverBlocker, /immutable contact-consent evidence/);
  assert.match(boundary.cutoverBlocker, /tenant-isolated campaign-audience reads/);
  assert.match(boundary.cutoverBlocker, /tenant-subscription lifecycle persistence/);
  assert.match(boundary.cutoverBlocker, /first-owner tenant provisioning/);
  assert.match(boundary.cutoverBlocker, /registered production-decision persistence/);
  assert.match(boundary.cutoverBlocker, /bounded system-admin tenant directory and audited profile updates/);
  assert.match(
    boundary.cutoverBlocker,
    /knowledge-source lifecycle and atomic knowledge-passage persistence/,
  );
  assert.match(
    boundary.cutoverBlocker,
    /AI-agent draft\/version\/source-link\/publication persistence/,
  );
  assert.match(
    boundary.cutoverBlocker,
    /bot-flow version\/publication, reply-delivery and bot-runtime continuation\/handoff persistence/,
  );
  assert.match(boundary.cutoverBlocker, /conversation\/message inbox persistence/);
  assert.match(boundary.cutoverBlocker, /message-template lifecycle/);
  assert.match(boundary.cutoverBlocker, /campaign-snapshot and campaign-dispatch persistence/);
  assert.match(boundary.cutoverBlocker, /contact-organization/);
  assert.match(boundary.cutoverBlocker, /atomic contact-import/);
  assert.match(boundary.cutoverBlocker, /Meta connection\/webhook and encrypted credential paths/);
  assert.match(boundary.cutoverBlocker, /immutable WhatsApp delivery-policy evidence and kill switch/);
  assert.match(boundary.cutoverBlocker, /serialized WhatsApp reservation\/settlement\/provider-cooldown ledger/);
  assert.match(boundary.cutoverBlocker, /PostgreSQL contacts\.list read/);
  assert.match(boundary.cutoverBlocker, /single-statement reports\.read adapter/);
  assert.match(boundary.cutoverBlocker, /owned PostgreSQL API runtime composition/);
  assert.match(boundary.cutoverBlocker, /bounded Node HTTP adapter/);
  assert.match(boundary.cutoverBlocker, /database readiness probe/);
  assert.match(boundary.cutoverBlocker, /HTTP-before-pool shutdown/);
  assert.match(boundary.cutoverBlocker, /strict PORT configuration/);
  assert.match(boundary.cutoverBlocker, /SIGINT\/SIGTERM lifecycle/);
  assert.match(boundary.cutoverBlocker, /All six operational-report source families are migrated/);
  assert.match(boundary.cutoverBlocker, /complete authenticated reports\.read HTTP path passed against PostgreSQL 16\.13/);
  assert.match(boundary.cutoverBlocker, /executable bootstrap cannot be safely composed/);
  assert.match(boundary.cutoverBlocker, /provider-bound distributed mutation rate-limit adapter/);
  assert.match(boundary.cutoverBlocker, /live provider-bound pool values/);
  assert.match(boundary.cutoverBlocker, /36-migration schema parity/);
  assert.match(boundary.cutoverBlocker, /live account configuration/);
  assert.match(boundary.cutoverBlocker, /staging evidence/);
});

test("records the PostgreSQL persistence contracts without selecting a provider", () => {
  const database = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "data.relational-database",
  );

  assert.ok(database);
  assert.equal(database.decisionState, "decision-required");
  assert.equal(database.targetProvider, "unknown/unavailable");
  assert.equal(database.nextAction, "provider-decision-required");

  for (const path of [
    "server/platform/postgresTransaction.ts",
    "server/platform/postgresRailwayApiMutationExecutor.ts",
    "server/platform/postgresResultValidation.ts",
    "server/platform/postgresTenantMembershipRepository.ts",
    "server/platform/postgresTenantMembershipMutationRepository.ts",
    "server/platform/postgresTenantSelectionRepository.ts",
    "server/platform/postgresBusinessProfileRepository.ts",
    "server/platform/postgresTeamInvitationRepository.ts",
    "server/platform/postgresTeamInvitationExpirationRepository.ts",
    "server/platform/postgresTeamInvitationDeliveryRepository.ts",
    "server/platform/postgresTeamInvitationAcceptanceRepository.ts",
    "server/platform/postgresContactReadRepository.ts",
    "server/platform/postgresContactConsentRepository.ts",
    "server/platform/postgresConversationRepository.ts",
    "server/platform/postgresBotFlowRepository.ts",
    "server/platform/postgresBotReplyDeliveryRepository.ts",
    "server/platform/postgresBotRuntimeRepository.ts",
    "server/platform/postgresTenantSubscriptionRepository.ts",
    "server/platform/postgresTenantProvisioningRepository.ts",
    "server/platform/postgresProductionDecisionRepository.ts",
    "server/platform/postgresSystemAdminBusinessProfileRepository.ts",
    "server/platform/postgresSystemAdminTenantDirectoryRepository.ts",
    "server/platform/postgresKnowledgeSourceRepository.ts",
    "server/platform/postgresKnowledgePassageRepository.ts",
    "server/platform/postgresAiAgentRepository.ts",
    "server/platform/postgresAiReplyOutboxRepository.ts",
    "server/platform/postgresAiRuntimeRepository.ts",
    "server/platform/postgresContactOrganizationRepository.ts",
    "server/platform/postgresContactImportRepository.ts",
    "server/platform/postgresMetaRepository.ts",
    "server/platform/postgresMetaCredentialRepository.ts",
    "server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts",
    "server/platform/postgresWhatsappRateLimitRepository.ts",
    "server/platform/postgresWorkerSchedulerLeaseRepository.ts",
    "server/platform/postgresCampaignAudienceRepository.ts",
    "server/platform/postgresCampaignDispatchRepository.ts",
    "server/platform/postgresCampaignRepository.ts",
    "server/platform/postgresMessageTemplateRepository.ts",
    "server/platform/postgresOperationalReportRepository.ts",
    "server/platform/postgresReadinessProbe.ts",
    "server/platform/railwayPostgresApiRuntime.ts",
    "postgres/migrations/0000_core_contacts.sql",
    "postgres/migrations/0001_railway_api_mutation_receipts.sql",
    "postgres/migrations/0002_tenant_access_foundation.sql",
    "postgres/migrations/0003_tenant_membership_events.sql",
    "postgres/migrations/0004_team_invitation_lifecycle.sql",
    "postgres/migrations/0005_conversations_messages.sql",
    "postgres/migrations/0006_message_templates_campaigns.sql",
    "postgres/migrations/0007_bot_flows_deliveries.sql",
    "postgres/migrations/0008_ai_reporting.sql",
    "postgres/migrations/0009_contact_organization_imports.sql",
    "postgres/migrations/0010_meta_connection_credentials.sql",
    "postgres/migrations/0011_whatsapp_delivery_policy.sql",
    "postgres/migrations/0012_whatsapp_rate_limit_ledger.sql",
    "postgres/migrations/0013_whatsapp_phone_throughput.sql",
    "postgres/migrations/0014_worker_scheduler_lease.sql",
    "postgres/migrations/0015_campaign_dispatch.sql",
    "postgres/migrations/0016_ai_knowledge.sql",
    "postgres/migrations/0017_ai_reply_outbox.sql",
    "postgres/migrations/0018_tenant_subscriptions.sql",
    "postgres/migrations/0019_production_decisions.sql",
    "postgres/migrations/0020_system_admin_business_profiles.sql",
    "postgres/migrations/0021_contact_consent_events.sql",
    "scripts/verify-postgres-migration-contract.mjs",
    "scripts/verify-node-postgres-integration.mjs",
  ]) {
    assert.equal(database.sourceFiles.includes(path), true);
  }

  assert.match(database.cutoverBlocker, /provider-neutral/i);
  assert.match(database.cutoverBlocker, /twenty-two ordered/);
  assert.match(database.cutoverBlocker, /immutable contact-consent evidence/);
  assert.match(
    database.cutoverBlocker,
    /tenant-isolated immutable contact-consent history and latest-event projection/,
  );
  assert.match(database.cutoverBlocker, /tenant-isolated contact organization\/import schema/);
  assert.match(database.cutoverBlocker, /atomic contact-profile plus import-outcome writes/);
  assert.match(database.cutoverBlocker, /tenant-bound Meta connection\/credential state/);
  assert.match(database.cutoverBlocker, /webhook claim\/replay\/conflict behavior/);
  assert.match(database.cutoverBlocker, /node-postgres adapter/);
  assert.match(database.cutoverBlocker, /fifty-five real concurrency scenarios/);
  assert.match(database.cutoverBlocker, /pool configuration contract/);
  assert.match(database.cutoverBlocker, /thirty-seven-adapter foundation/);
  assert.match(
    database.cutoverBlocker,
    /consent-filtered all\/list\/tag campaign audiences with cross-tenant group isolation/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent tenant-subscription creation\/extension\/status\/cancellation replay/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent first-owner provisioning replay and identity-collision rejection/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent production-decision creation\/update replay with immutable event guards/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent exact system-admin profile replay and conflicting profile updates/,
  );
  assert.match(database.cutoverBlocker, /accepted-button continuation/);
  assert.match(database.cutoverBlocker, /serialized bot handoff replay/);
  assert.match(
    database.cutoverBlocker,
    /deterministic knowledge-source registration, validation\/scanning\/recovery transitions and atomic passage processing\/replay/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent AI-agent draft replay, immutable version advancement, source-link verification and publication replacement/,
  );
  assert.match(database.cutoverBlocker, /concurrent bot-flow draft replay/);
  assert.match(database.cutoverBlocker, /referentially scoped reply staging/);
  assert.match(database.cutoverBlocker, /exact inbound-message replay\/conflict/);
  assert.match(database.cutoverBlocker, /single submission claim and duplicate status-event classification/);
  assert.match(database.cutoverBlocker, /exact campaign-snapshot replay\/conflict\/rollback/);
  assert.match(database.cutoverBlocker, /campaign activation\/claim\/retry\/consent revalidation\/completion/);
  assert.match(database.cutoverBlocker, /scheduler claim\/catch-up\/fencing/);
  assert.match(
    database.cutoverBlocker,
    /atomic delivery-policy audit\/replay\/conflict, disable and re-enable behavior/,
  );
  assert.match(database.cutoverBlocker, /WhatsApp pair\/portfolio\/phone-throughput reservation replay, settlement, cooldown and tamper rejection/);
  assert.match(database.cutoverBlocker, /owned API runtime composition/);
  assert.match(database.cutoverBlocker, /exact readiness query/);
  assert.match(database.cutoverBlocker, /contacts\.list/);
  assert.match(database.cutoverBlocker, /reports\.read/);
  assert.match(database.cutoverBlocker, /complete authenticated six-source reporting HTTP path/);
  assert.match(database.cutoverBlocker, /AI reporting constraints/);
  assert.match(database.cutoverBlocker, /live provider-bound pool values/);
  assert.match(database.cutoverBlocker, /36-migration parity conversion/);
  assert.match(
    database.cutoverBlocker,
    /provider-reconciliation repository DML\/concurrency/,
  );
});
