export const hostingMigrationDecisionStates = [
  "selected",
  "decision-required",
] as const;

export type HostingMigrationDecisionState =
  (typeof hostingMigrationDecisionStates)[number];

export const hostingMigrationNextActions = [
  "adapter-required",
  "configuration-required",
  "provider-decision-required",
  "evidence-rebuild-required",
] as const;

export type HostingMigrationNextAction =
  (typeof hostingMigrationNextActions)[number];

export type HostingMigrationTargetProvider =
  | "vercel"
  | "railway"
  | "vercel+railway"
  | "unknown/unavailable";

export interface HostingMigrationCapability {
  id: string;
  currentBindings: readonly string[];
  currentResources: readonly string[];
  sourceFiles: readonly string[];
  targetPlacement: string;
  targetContract: string;
  targetProvider: HostingMigrationTargetProvider;
  decisionState: HostingMigrationDecisionState;
  nextAction: HostingMigrationNextAction;
  cutoverBlocker: string;
}

function capability(
  definition: HostingMigrationCapability,
): Readonly<HostingMigrationCapability> {
  return Object.freeze({
    ...definition,
    currentBindings: Object.freeze([
      ...definition.currentBindings,
    ]),
    currentResources: Object.freeze([
      ...definition.currentResources,
    ]),
    sourceFiles: Object.freeze([
      ...definition.sourceFiles,
    ]),
  });
}

/**
 * Contract-freeze inventory for ADR-0001.
 *
 * This registry maps the current Cloudflare-specific runtime to the accepted
 * Vercel/Railway direction. It does not select an unapproved database, queue,
 * storage, monitoring, or backup provider and it does not claim migration
 * readiness.
 */
export const HOSTING_MIGRATION_REGISTRY = Object.freeze([
  capability({
    id: "web.build-runtime",
    currentBindings: [],
    currentResources: [
      "vinext",
      "@cloudflare/vite-plugin",
      "sites-vite-plugin",
    ],
    sourceFiles: [
      "vite.config.ts",
      "package.json",
      ".openai/hosting.json",
    ],
    targetPlacement: "vercel-web",
    targetContract:
      "Vercel-supported React/Next.js build and runtime",
    targetProvider: "vercel",
    decisionState: "selected",
    nextAction: "adapter-required",
    cutoverBlocker:
      "The production build still emits a Cloudflare Worker through Vinext.",
  }),
  capability({
    id: "web.server-api-boundary",
    currentBindings: [],
    currentResources: [
      "co-located Server Actions and business services",
    ],
    sourceFiles: [
      "app",
      "server",
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
      "server/platform/postgresResultValidation.ts",
      "server/platform/postgresTenantMembershipRepository.ts",
      "server/platform/postgresTenantMembershipMutationRepository.ts",
      "server/platform/postgresTenantSelectionRepository.ts",
      "server/platform/postgresRailwayApiMutationExecutor.ts",
      "server/platform/postgresTeamInvitationRepository.ts",
      "server/platform/postgresTeamInvitationExpirationRepository.ts",
      "server/platform/postgresTeamInvitationDeliveryRepository.ts",
      "server/platform/postgresTeamInvitationAcceptanceRepository.ts",
      "server/platform/postgresContactReadRepository.ts",
      "server/platform/postgresConversationRepository.ts",
      "server/platform/postgresBotFlowRepository.ts",
      "server/platform/postgresBotReplyDeliveryRepository.ts",
      "server/platform/postgresContactOrganizationRepository.ts",
      "server/platform/postgresContactImportRepository.ts",
      "server/platform/postgresMetaRepository.ts",
      "server/platform/postgresMetaCredentialRepository.ts",
      "server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts",
      "server/platform/postgresWhatsappRateLimitRepository.ts",
      "server/platform/postgresWorkerSchedulerLeaseRepository.ts",
      "server/platform/postgresCampaignDispatchRepository.ts",
      "server/platform/postgresCampaignRepository.ts",
      "server/platform/postgresMessageTemplateRepository.ts",
      "server/platform/postgresOperationalReportRepository.ts",
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
      "server/platform/railwayApiRuntime.ts",
      "worker/index.ts",
    ],
    targetPlacement: "vercel-web+railway-api",
    targetContract:
      "Versioned authenticated HTTP API with bounded DTOs",
    targetProvider: "vercel+railway",
    decisionState: "selected",
    nextAction: "adapter-required",
    cutoverBlocker:
      "The authenticated runtime, initial reads, guarded contacts.save mutation, provider-neutral PostgreSQL transaction executor, node-postgres transaction adapter, pool contract, PostgreSQL contacts.list read, contact-organization, atomic contact-import, conversation/message inbox persistence, bot-flow version/publication and reply-delivery persistence, Meta connection/webhook and encrypted credential paths, immutable WhatsApp delivery-policy evidence and kill switch, serialized WhatsApp reservation/settlement/provider-cooldown ledger, provider-bound rolling phone-throughput enforcement, fenced worker-scheduler lease, message-template lifecycle, campaign-snapshot and campaign-dispatch persistence, single-statement reports.read adapter, twenty-four-adapter PostgreSQL foundation, owned PostgreSQL API runtime composition, bounded Node HTTP adapter, database readiness probe, ordered HTTP-before-pool shutdown owner, strict PORT configuration, and SIGINT/SIGTERM lifecycle exist. All six operational-report source families are migrated, and the complete authenticated reports.read HTTP path passed against PostgreSQL 16.13. Cutover remains blocked because the executable bootstrap cannot be safely composed without a provider-bound distributed mutation rate-limit adapter, live provider-bound pool values, full 36-migration schema parity, remaining domain mutations, live account configuration, and staging evidence.",
  }),
  capability({
    id: "web.static-assets",
    currentBindings: ["ASSETS"],
    currentResources: ["Cloudflare asset fetcher"],
    sourceFiles: ["worker/index.ts"],
    targetPlacement: "vercel-web",
    targetContract: "Static asset delivery",
    targetProvider: "vercel",
    decisionState: "selected",
    nextAction: "configuration-required",
    cutoverBlocker:
      "Asset delivery is still wired through the Worker ASSETS binding.",
  }),
  capability({
    id: "web.image-optimization",
    currentBindings: ["IMAGES"],
    currentResources: ["Cloudflare image transformation"],
    sourceFiles: ["worker/index.ts"],
    targetPlacement: "vercel-web",
    targetContract: "Bounded image optimization",
    targetProvider: "vercel",
    decisionState: "selected",
    nextAction: "adapter-required",
    cutoverBlocker:
      "The image route still invokes the Cloudflare IMAGES binding.",
  }),
  capability({
    id: "api.meta-webhook-ingress",
    currentBindings: [],
    currentResources: ["Worker fetch route /webhooks/meta"],
    sourceFiles: [
      "worker/index.ts",
      "server/meta/metaWebhookQueueRuntime.ts",
    ],
    targetPlacement: "railway-api",
    targetContract:
      "Signed bounded Meta webhook ingress",
    targetProvider: "railway",
    decisionState: "selected",
    nextAction: "adapter-required",
    cutoverBlocker:
      "The webhook route and execution lifecycle are owned by the Worker entry point.",
  }),
  capability({
    id: "data.relational-database",
    currentBindings: ["DB"],
    currentResources: ["Cloudflare D1", "36 SQL migrations"],
    sourceFiles: [
      "db",
      "drizzle.config.ts",
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
      "server/platform/postgresConversationRepository.ts",
      "server/platform/postgresBotFlowRepository.ts",
      "server/platform/postgresBotReplyDeliveryRepository.ts",
      "server/platform/postgresContactOrganizationRepository.ts",
      "server/platform/postgresContactImportRepository.ts",
      "server/platform/postgresMetaRepository.ts",
      "server/platform/postgresMetaCredentialRepository.ts",
      "server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts",
      "server/platform/postgresWhatsappRateLimitRepository.ts",
      "server/platform/postgresWorkerSchedulerLeaseRepository.ts",
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
      "scripts/verify-postgres-migration-contract.mjs",
      "scripts/verify-node-postgres-integration.mjs",
    ],
    targetPlacement: "shared-managed-service",
    targetContract:
      "PostgreSQL persistence with transactional and concurrency parity",
    targetProvider: "unknown/unavailable",
    decisionState: "decision-required",
    nextAction: "provider-decision-required",
    cutoverBlocker:
      "Provider-neutral contacts.save, contacts.list, contact organization, atomic contact import, conversation/message inbox persistence, bot-flow version/publication and reply-delivery persistence, Meta connection/webhook and encrypted credential persistence, immutable WhatsApp delivery-policy evidence and kill switch, serialized WhatsApp reservation/settlement/provider-cooldown persistence, provider-bound rolling phone-throughput enforcement, fenced worker-scheduler lease, atomic message-template lifecycle, campaign-snapshot and campaign-dispatch persistence, single-statement reports.read, tenant access, team membership mutation, and complete invitation lifecycle repositories plus sixteen ordered critical-path PostgreSQL migrations exist. A node-postgres adapter, fail-closed production pool configuration contract, twenty-four-adapter foundation, owned API runtime composition, exact readiness query, and repeatable loopback PostgreSQL 16.13 rehearsal prove contact write/read, tenant-isolated contact organization/import schema, atomic contact-profile plus import-outcome writes, exact inbound-message replay/conflict with a single unread increment, optimistic inbox read/assignment transitions, delivery-status replay/staleness, concurrent bot-flow draft replay, publication replacement and version advancement, referentially scoped reply staging and single delivery claim, tenant-bound Meta connection/credential state, webhook claim/replay/conflict behavior, atomic delivery-policy audit/replay/conflict, disable and re-enable behavior, WhatsApp pair/portfolio/phone-throughput reservation replay, settlement, cooldown and tamper rejection, scheduler claim/catch-up/fencing, exact template draft replay, single submission claim and duplicate status-event classification, exact campaign-snapshot replay/conflict/rollback, campaign activation/claim/retry/consent revalidation/completion, the complete authenticated six-source reporting HTTP path, conversation/message, template/campaign, bot delivery and AI reporting constraints, commit/replay/rollback, invitation delivery/acceptance, and twenty-seven real concurrency scenarios. The provider, live provider-bound pool values and telemetry, full 36-migration parity conversion, remaining repository DML/concurrency coverage, controlled-environment migration evidence, queue runtime and load evidence are not implemented.",
  }),
  capability({
    id: "data.object-storage",
    currentBindings: ["FILES"],
    currentResources: ["Cloudflare R2"],
    sourceFiles: [
      ".openai/hosting.json",
      "server/ai/knowledgeObjectStorage.ts",
    ],
    targetPlacement: "shared-managed-service",
    targetContract: "KnowledgeObjectStorage",
    targetProvider: "unknown/unavailable",
    decisionState: "decision-required",
    nextAction: "provider-decision-required",
    cutoverBlocker:
      "Only the R2 adapter and R2-specific evidence exist.",
  }),
  capability({
    id: "queue.meta-webhook",
    currentBindings: ["META_WEBHOOK_QUEUE"],
    currentResources: [
      "connect-meta-webhooks",
      "connect-meta-webhooks-dlq",
    ],
    sourceFiles: [
      "vite.config.ts",
      "server/meta/metaWebhookQueuePublisher.ts",
      "server/meta/metaWebhookQueueConsumer.ts",
    ],
    targetPlacement: "railway-worker",
    targetContract: "MetaWebhookQueueBinding",
    targetProvider: "unknown/unavailable",
    decisionState: "decision-required",
    nextAction: "provider-decision-required",
    cutoverBlocker:
      "No target queue, DLQ, retry, or acknowledgement adapter is selected.",
  }),
  capability({
    id: "queue.campaign-delivery",
    currentBindings: ["CAMPAIGN_DELIVERY_QUEUE"],
    currentResources: [
      "connect-campaign-deliveries",
      "connect-campaign-deliveries-dlq",
    ],
    sourceFiles: [
      "vite.config.ts",
      "server/campaigns/campaignScheduler.ts",
      "server/campaigns/campaignDeliveryQueueConsumer.ts",
    ],
    targetPlacement: "railway-worker",
    targetContract: "CampaignDeliveryQueueBinding",
    targetProvider: "unknown/unavailable",
    decisionState: "decision-required",
    nextAction: "provider-decision-required",
    cutoverBlocker:
      "No target batch publish, delay, retry, or DLQ adapter is selected.",
  }),
  capability({
    id: "queue.team-invitation",
    currentBindings: ["TEAM_INVITATION_QUEUE"],
    currentResources: [
      "connect-team-invitations",
      "connect-team-invitations-dlq",
    ],
    sourceFiles: [
      "vite.config.ts",
      "server/team/teamInvitationQueuePublisher.ts",
      "server/team/teamInvitationQueueConsumer.ts",
    ],
    targetPlacement: "railway-worker",
    targetContract: "TeamInvitationQueueBinding",
    targetProvider: "unknown/unavailable",
    decisionState: "decision-required",
    nextAction: "provider-decision-required",
    cutoverBlocker:
      "No target queue, retry, ambiguity, or DLQ adapter is selected.",
  }),
  capability({
    id: "worker.scheduler",
    currentBindings: [],
    currentResources: ["Cloudflare Cron */1 minute"],
    sourceFiles: [
      "vite.config.ts",
      "worker/index.ts",
      "server/campaigns/campaignDispatchRuntime.ts",
      "server/team/teamInvitationExpirationRuntime.ts",
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
    ],
    targetPlacement: "railway-worker",
    targetContract:
      "Always-on one-minute scheduler with an atomic PostgreSQL lease and bounded catch-up",
    targetProvider: "railway",
    decisionState: "selected",
    nextAction: "adapter-required",
    cutoverBlocker:
      "Railway Cron cannot satisfy the one-minute cadence. The atomic PostgreSQL lease, fencing token, two-task orchestrator, five-tick catch-up, minute-aligned timer, overlap suppression, active-run drain, SIGINT/SIGTERM process lifecycle and PostgreSQL campaign/invitation runtime composition are implemented; the target queue adapter, executable bootstrap and live Railway configuration are not implemented.",
  }),
  capability({
    id: "security.distributed-rate-limits",
    currentBindings: [
      "META_WEBHOOK_RATE_LIMITER",
      "TENANT_MUTATION_RATE_LIMITER",
      "SYSTEM_ADMIN_MUTATION_RATE_LIMITER",
    ],
    currentResources: [
      "Cloudflare Rate Limit bindings",
      "D1 WhatsApp reservation ledger",
    ],
    sourceFiles: [
      "server/security/rateLimit.ts",
      "db/whatsappRateLimitRepository.ts",
      "worker/index.ts",
    ],
    targetPlacement: "shared-managed-service",
    targetContract:
      "RateLimitBinding plus atomic WhatsApp reservation ledger",
    targetProvider: "unknown/unavailable",
    decisionState: "decision-required",
    nextAction: "provider-decision-required",
    cutoverBlocker:
      "No distributed target for mutation limits and atomic reservations is selected.",
  }),
  capability({
    id: "security.secret-management",
    currentBindings: [
      "META_APP_SECRET",
      "META_WEBHOOK_VERIFY_TOKEN",
      "WHATSAPP_RATE_LIMIT_HMAC_KEY_V1",
    ],
    currentResources: ["Cloudflare Worker secrets"],
    sourceFiles: [
      "worker/index.ts",
      "server/operations/productionReadiness.ts",
    ],
    targetPlacement: "vercel-web+railway-api+railway-worker",
    targetContract:
      "Purpose-separated secret inventory with rotation evidence",
    targetProvider: "vercel+railway",
    decisionState: "selected",
    nextAction: "configuration-required",
    cutoverBlocker:
      "Secret ownership, placement, rotation, and cross-service access are not configured.",
  }),
  capability({
    id: "operations.environment-isolation-evidence",
    currentBindings: [],
    currentResources: ["Cloudflare environment isolation evidence v2"],
    sourceFiles: [
      "server/operations/environmentIsolationEvidence.ts",
      "scripts/create-cloudflare-evidence.mjs",
    ],
    targetPlacement: "vercel+railway",
    targetContract:
      "Provider-neutral environment isolation evidence",
    targetProvider: "vercel+railway",
    decisionState: "selected",
    nextAction: "evidence-rebuild-required",
    cutoverBlocker:
      "The verifier fingerprints only Cloudflare resources and deployments.",
  }),
  capability({
    id: "operations.deployment-provenance-evidence",
    currentBindings: [],
    currentResources: ["Cloudflare deployment provenance"],
    sourceFiles: [
      "server/operations/deploymentProvenanceEvidence.ts",
      "scripts/create-cloudflare-evidence.mjs",
    ],
    targetPlacement: "vercel+railway",
    targetContract:
      "Release-bound multi-service deployment provenance",
    targetProvider: "vercel+railway",
    decisionState: "selected",
    nextAction: "evidence-rebuild-required",
    cutoverBlocker:
      "No evidence links one release to Vercel Web and both Railway services.",
  }),
  capability({
    id: "operations.backup-restore",
    currentBindings: [],
    currentResources: ["D1 and R2 backup evidence v2"],
    sourceFiles: [
      "server/operations/backupRestoreEvidence.ts",
      "docs/external-decisions-recommendations.md",
    ],
    targetPlacement: "shared-managed-service",
    targetContract:
      "PostgreSQL and object storage backup/restore evidence",
    targetProvider: "unknown/unavailable",
    decisionState: "decision-required",
    nextAction: "provider-decision-required",
    cutoverBlocker:
      "The database, storage, PITR window, backup region, and restore path are not selected.",
  }),
  capability({
    id: "operations.browser-database-proof",
    currentBindings: [],
    currentResources: ["Cloudflare D1 read-only proof API"],
    sourceFiles: [
      "db/teamInvitationBrowserProofReader.ts",
      "scripts/run-team-invitation-browser-e2e.mjs",
    ],
    targetPlacement: "shared-managed-service",
    targetContract:
      "Read-only PostgreSQL browser acceptance proof",
    targetProvider: "unknown/unavailable",
    decisionState: "decision-required",
    nextAction: "adapter-required",
    cutoverBlocker:
      "Browser evidence can currently query only Cloudflare D1.",
  }),
  capability({
    id: "operations.observability",
    currentBindings: [],
    currentResources: ["Cloudflare Workers logs and traces recommendation"],
    sourceFiles: [
      "server/operations/sloMonitoringService.ts",
      "docs/external-decisions-recommendations.md",
    ],
    targetPlacement: "vercel+railway",
    targetContract:
      "PII-safe cross-service logs, metrics, traces, SLOs, and alerts",
    targetProvider: "unknown/unavailable",
    decisionState: "decision-required",
    nextAction: "provider-decision-required",
    cutoverBlocker:
      "No shared telemetry sink, retention policy, alert provider, or correlation contract is selected.",
  }),
] satisfies readonly Readonly<HostingMigrationCapability>[]);
