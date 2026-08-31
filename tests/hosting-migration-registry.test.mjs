import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  HOSTING_MIGRATION_REGISTRY,
  hostingMigrationDecisionStates,
  hostingMigrationNextActions,
} from "../shared/domain/hostingMigrationRegistry.ts";

const projectFile = (path) =>
  new URL(`../${path}`, import.meta.url);

const actualPostgresMigrationSourceFiles = () =>
  readdirSync(projectFile("postgres/migrations"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => `postgres/migrations/${entry.name}`)
    .sort();

const actualMigrationInventory = () => {
  const d1MigrationFiles = readdirSync(projectFile("drizzle"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
  const d1Tables = new Set(
    d1MigrationFiles.flatMap((fileName) =>
      [...readFileSync(projectFile(`drizzle/${fileName}`), "utf8").matchAll(
        /CREATE TABLE (?:IF NOT EXISTS )?[`"]?([A-Za-z0-9_]+)/gi,
      )]
        .map((match) => match[1])
        .filter((tableName) => !tableName.startsWith("__new_")),
    ),
  );

  return Object.freeze({
    d1MigrationCount: d1MigrationFiles.length,
    d1TableCount: d1Tables.size,
    postgresMigrationCount: actualPostgresMigrationSourceFiles().length,
  });
};

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

  assert.equal(ids.length, 19);
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

test("keeps only the still-unresolved shared services provider-neutral", () => {
  const unresolved = HOSTING_MIGRATION_REGISTRY.filter(
    ({ decisionState }) => decisionState === "decision-required",
  );
  const selected = HOSTING_MIGRATION_REGISTRY.filter(
    ({ decisionState }) => decisionState === "selected",
  );

  assert.equal(unresolved.length, 2);
  assert.equal(selected.length, 17);
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

test("records the parallel Vercel build without claiming cutover", () => {
  const buildRuntime = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "web.build-runtime",
  );

  assert.ok(buildRuntime);
  assert.equal(buildRuntime.targetProvider, "vercel");
  assert.equal(buildRuntime.nextAction, "configuration-required");
  for (const path of [
    "next.config.ts",
    "app/layout.tsx",
    "styles/tokens.css",
    "server/platform/vercelUnavailableCloudflareEnvironment.ts",
  ]) {
    assert.equal(buildRuntime.sourceFiles.includes(path), true);
  }
  assert.match(buildRuntime.cutoverBlocker, /Next\.js 16 Webpack/);
  assert.match(buildRuntime.cutoverBlocker, /passes locally/);
  assert.match(buildRuntime.cutoverBlocker, /fail closed/);
  assert.match(buildRuntime.cutoverBlocker, /default production command/);
  assert.match(buildRuntime.cutoverBlocker, /preview deployment/);
});

test("records the selected layered limiter without claiming live proof", () => {
  const rateLimits = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "security.distributed-rate-limits",
  );

  assert.ok(rateLimits);
  assert.equal(rateLimits.decisionState, "selected");
  assert.equal(rateLimits.targetProvider, "railway");
  assert.equal(rateLimits.nextAction, "configuration-required");
  for (const path of [
    "postgres/migrations/0023_api_mutation_rate_limits.sql",
    "postgres/migrations/0024_whatsapp_legacy_reservation_category.sql",
    "server/platform/postgresMutationRateLimitBinding.ts",
    "server/platform/postgresMutationRateLimitConfiguration.ts",
    "server/platform/railwayMetaWebhookRuntime.ts",
    "server/platform/railwayPostgresApiRuntime.ts",
  ]) {
    assert.equal(rateLimits.sourceFiles.includes(path), true);
  }
  assert.match(
    rateLimits.cutoverBlocker,
    /atomic shared token-bucket contract/,
  );
  assert.match(rateLimits.cutoverBlocker, /system-admin-mutation/);
  assert.match(rateLimits.cutoverBlocker, /Meta-webhook/);
  assert.match(rateLimits.cutoverBlocker, /live-derived layered policy is selected/);
  assert.match(rateLimits.cutoverBlocker, /system-admin route wiring/);
  assert.match(rateLimits.cutoverBlocker, /Current WABA and phone values/);
});

test("records the bounded Railway Meta webhook route with its local BullMQ publisher", () => {
  const webhook = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "api.meta-webhook-ingress",
  );

  assert.ok(webhook);
  assert.equal(webhook.targetProvider, "railway");
  assert.equal(webhook.nextAction, "configuration-required");
  for (const path of [
    "server/meta/metaWebhookQueuePort.ts",
    "server/meta/metaWebhookQueuePublisher.ts",
    "server/platform/railwayMetaWebhookRuntime.ts",
    "server/platform/railwayPostgresApiRuntime.ts",
    "server/platform/railwayBullMqMetaWebhookQueue.ts",
    "server/platform/railwayBullMqPostgresApiRuntime.ts",
    "server/platform/railwayBullMqApiMain.ts",
    "server/platform/railwayBetterStackTelemetry.ts",
    "scripts/start-railway-bullmq-api.mjs",
    "docs/better-stack-opentelemetry.md",
    "server/platform/railwayNodeHttpServer.ts",
  ]) {
    assert.equal(webhook.sourceFiles.includes(path), true);
  }
  assert.match(webhook.cutoverBlocker, /signed, bounded Railway Node route/);
  assert.match(webhook.cutoverBlocker, /provider-neutral durable queue port/);
  assert.match(webhook.cutoverBlocker, /Redis readiness before opening HTTP/);
  assert.match(webhook.cutoverBlocker, /package start command/);
  assert.match(webhook.cutoverBlocker, /Batched Better Stack OTLP Logs/);
  assert.match(webhook.cutoverBlocker, /structural redaction/);
  assert.match(webhook.cutoverBlocker, /live Better Stack source/);
  assert.match(webhook.cutoverBlocker, /[Ll]ive secrets and policy values/);
  assert.match(webhook.cutoverBlocker, /load evidence/);
});

test("records the local BullMQ template adapter without claiming staging readiness", () => {
  const queue = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "queue.message-template-submission",
  );

  assert.ok(queue);
  assert.equal(queue.targetProvider, "railway");
  assert.equal(queue.decisionState, "selected");
  assert.equal(queue.nextAction, "configuration-required");
  assert.match(queue.targetContract, /BullMQ/);
  for (const path of [
    "server/templates/messageTemplateSubmissionQueueMessage.ts",
    "server/templates/messageTemplateSubmissionQueueConsumer.ts",
    "shared/domain/queuePolicy.ts",
    "shared/domain/queueAdapterAcceptance.ts",
    "scripts/verify-queue-adapter-evidence.mjs",
    "server/templates/messageTemplateSubmissionMaintenanceRunner.ts",
    "server/operations/messageTemplateSubmissionMaintenanceTelemetry.ts",
    "server/platform/railwayMessageTemplateSubmissionWorkerRuntime.ts",
    "server/platform/railwayMessageTemplateSubmissionMaintenanceRuntime.ts",
    "server/platform/railwayBullMqConfiguration.ts",
    "server/platform/railwayBullMqMessageTemplateSubmissionQueue.ts",
    "server/platform/railwayBullMqMessageTemplateSubmissionWorkerExecutable.ts",
    "server/platform/railwayBullMqWorkerMain.ts",
    "server/platform/railwayWorkerTelemetry.ts",
    "server/platform/railwayWorkerExecutable.ts",
    "server/platform/railwayPostgresWorkerService.ts",
    "docs/railway-bullmq-message-template-submission-adapter.md",
    "scripts/start-railway-bullmq-worker.mjs",
  ]) {
    assert.equal(queue.sourceFiles.includes(path), true);
  }
  assert.match(queue.cutoverBlocker, /single-POST worker/);
  assert.match(queue.cutoverBlocker, /GET-only reconciliation/);
  assert.match(queue.cutoverBlocker, /fail-closed BullMQ v5 adapter/);
  assert.match(queue.cutoverBlocker, /provider-bound composition/);
  assert.match(queue.cutoverBlocker, /drains BullMQ before PostgreSQL/);
  assert.match(queue.cutoverBlocker, /ten retries after the initial delivery/);
  assert.match(queue.cutoverBlocker, /real local Redis publish\/consume\/deduplication test passed/);
  assert.match(queue.cutoverBlocker, /fail-closed package start command/);
  assert.match(queue.cutoverBlocker, /all four queues/);
  assert.match(queue.cutoverBlocker, /AOF everysec, noeviction/);
  assert.match(queue.cutoverBlocker, /500\/500 completed load jobs/);
  assert.match(queue.cutoverBlocker, /authorized Railway durability\/load evidence/);
  assert.match(queue.cutoverBlocker, /staging acceptance contract/);
  assert.match(queue.cutoverBlocker, /production telemetry provider/);
  assert.match(queue.cutoverBlocker, /scheduler wiring/);
  assert.match(queue.cutoverBlocker, /Migration 0026/);
  assert.match(queue.cutoverBlocker, /proven against local PostgreSQL 16\.13/);
  assert.match(queue.cutoverBlocker, /Railway staging proof/);
});

test("records the local BullMQ campaign adapter without claiming staging readiness", () => {
  const queue = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "queue.campaign-delivery",
  );

  assert.ok(queue);
  assert.equal(queue.targetProvider, "railway");
  assert.equal(queue.decisionState, "selected");
  assert.equal(queue.nextAction, "configuration-required");
  for (const path of [
    "server/campaigns/campaignDeliveryQueueConsumer.ts",
    "server/campaigns/campaignDeliveryDeadLetter.ts",
    "server/campaigns/providerResponseMetaCampaignDeliveryRetryEvidenceSource.ts",
    "server/platform/railwayBullMqConfiguration.ts",
    "server/platform/railwayBullMqCampaignDeliveryQueue.ts",
    "server/platform/railwayCampaignDeliveryConsumerRuntime.ts",
    "server/platform/railwayBullMqWorkerExecutable.ts",
    "server/platform/railwayBullMqWorkerMain.ts",
    "server/platform/railwayWorkerTelemetry.ts",
    "server/platform/railwayWorkerExecutable.ts",
    "server/platform/railwayWorkerRuntime.ts",
    "server/platform/railwayPostgresWorkerService.ts",
    "scripts/start-railway-bullmq-worker.mjs",
  ]) {
    assert.equal(queue.sourceFiles.includes(path), true);
  }
  assert.match(queue.cutoverBlocker, /batches of ten/);
  assert.match(queue.cutoverBlocker, /ten retries after the initial delivery/);
  assert.match(queue.cutoverBlocker, /up to 24 hours without jitter/);
  assert.match(queue.cutoverBlocker, /real local Redis test/);
  assert.match(queue.cutoverBlocker, /ambiguous Meta outcomes/);
  assert.match(queue.cutoverBlocker, /provider-response Meta retry-evidence source/);
  assert.match(queue.cutoverBlocker, /without inventing Retry-After/);
  assert.match(queue.cutoverBlocker, /live-account retry validation/);
  assert.match(queue.cutoverBlocker, /current-release Railway staging/);
});

test("records the local BullMQ invitation adapter without claiming a live provider", () => {
  const queue = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "queue.team-invitation",
  );

  assert.ok(queue);
  assert.equal(queue.targetProvider, "railway");
  assert.equal(queue.decisionState, "selected");
  assert.equal(queue.nextAction, "configuration-required");
  for (const path of [
    "server/team/teamInvitationQueuePublisher.ts",
    "server/team/teamInvitationQueueConsumer.ts",
    "server/team/teamInvitationDispatchProcessor.ts",
    "server/platform/postgresTeamInvitationDeliveryRepository.ts",
    "server/platform/clerkRailwayTeamInvitationProvider.ts",
    "server/platform/railwayTeamInvitationProviderFactory.ts",
    "server/platform/postgresMutationRateLimitConfiguration.ts",
    "postgres/migrations/0028_clerk_invitation_rate_limit.sql",
    "postgres/migrations/0029_team_invitation_delivery_deferrals.sql",
    "server/platform/railwayBullMqConfiguration.ts",
    "server/platform/railwayBullMqTeamInvitationQueue.ts",
    "server/platform/railwayBullMqPostgresApiRuntime.ts",
    "server/platform/railwayBullMqApiMain.ts",
    "server/platform/railwayBullMqWorkerExecutable.ts",
    "server/platform/railwayBullMqWorkerMain.ts",
    "server/platform/railwayWorkerTelemetry.ts",
    "server/platform/railwayWorkerExecutable.ts",
    "server/platform/railwayPostgresWorkerService.ts",
    "docs/railway-bullmq-team-invitation-adapter.md",
    "scripts/start-railway-bullmq-worker.mjs",
  ]) {
    assert.equal(queue.sourceFiles.includes(path), true);
  }
  assert.match(queue.cutoverBlocker, /persisted delivery key/);
  assert.match(queue.cutoverBlocker, /ten retries after the initial delivery/);
  assert.match(queue.cutoverBlocker, /bounded delays from 1 second through 24 hours/);
  assert.match(queue.cutoverBlocker, /real local Redis test/);
  assert.match(queue.cutoverBlocker, /local Clerk Organization provider adapter/);
  assert.match(queue.cutoverBlocker, /deterministic private-metadata reconciliation/);
  assert.match(queue.cutoverBlocker, /dedicated shared PostgreSQL guard/);
  assert.match(queue.cutoverBlocker, /Worker factory is connected/);
  assert.match(queue.cutoverBlocker, /fail-closed package start command/);
  assert.match(queue.cutoverBlocker, /persist exact Retry-After evidence/);
  assert.match(queue.cutoverBlocker, /missing or invalid Retry-After is never invented/);
  assert.match(queue.cutoverBlocker, /live Clerk 429 evidence/);
  assert.match(queue.cutoverBlocker, /current-release Railway staging/);
});

test("requires one shared acceptance contract for every target queue", () => {
  const queueIds = [
    "queue.meta-webhook",
    "queue.campaign-delivery",
    "queue.team-invitation",
    "queue.message-template-submission",
  ];

  for (const queueId of queueIds) {
    const queue = HOSTING_MIGRATION_REGISTRY.find(({ id }) => id === queueId);
    assert.ok(queue);
    assert.equal(
      queue.sourceFiles.includes("shared/domain/queuePolicy.ts"),
      true,
    );
    assert.equal(
      queue.sourceFiles.includes("shared/domain/queueAdapterAcceptance.ts"),
      true,
    );
    assert.equal(
      queue.sourceFiles.includes("scripts/verify-queue-adapter-evidence.mjs"),
      true,
    );
    for (const path of [
      "shared/domain/redisDurabilityAcceptance.ts",
      "scripts/rehearse-local-redis-resilience.mjs",
      "docs/railway-redis-durability-rehearsal.md",
      "server/platform/railwayBetterStackTelemetry.ts",
      "docs/better-stack-opentelemetry.md",
    ]) {
      assert.equal(queue.sourceFiles.includes(path), true);
    }
    for (const path of [
      "server/platform/railwayBullMqWorkerMain.ts",
      "server/platform/railwayWorkerTelemetry.ts",
      "scripts/start-railway-bullmq-worker.mjs",
    ]) {
      assert.equal(queue.sourceFiles.includes(path), true);
    }
    assert.match(queue.cutoverBlocker, /acceptance contract/);
    assert.match(queue.cutoverBlocker, /trusted-file verifier/);
    assert.match(queue.cutoverBlocker, /current-release/);
    assert.equal(queue.targetProvider, "railway");
    assert.equal(queue.decisionState, "selected");
    assert.equal(
      queue.nextAction,
      "configuration-required",
    );
    assert.match(queue.targetContract, /BullMQ/);
    assert.match(queue.cutoverBlocker, /package start command/);
    assert.match(queue.cutoverBlocker, /AOF everysec, noeviction/);
    assert.match(queue.cutoverBlocker, /500\/500 completed load jobs/);
    assert.match(queue.cutoverBlocker, /authorized Railway durability/);
    assert.match(queue.cutoverBlocker, /current-release Railway staging/);
  }
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
  assert.equal(scheduler.nextAction, "configuration-required");
  assert.match(scheduler.targetContract, /atomic PostgreSQL lease/);
  assert.match(scheduler.cutoverBlocker, /Railway Cron cannot satisfy/);
  assert.match(scheduler.cutoverBlocker, /lease, fencing token/);
  assert.match(
    scheduler.cutoverBlocker,
    /five-tick catch-up,[\s\S]*PostgreSQL runtime composition are implemented/,
  );
  assert.match(scheduler.cutoverBlocker, /minute-aligned timer/);
  assert.match(scheduler.cutoverBlocker, /active-run drain/);
  assert.match(scheduler.cutoverBlocker, /SIGINT\/SIGTERM process lifecycle/);
  assert.match(scheduler.cutoverBlocker, /four baseline BullMQ queues/);
  assert.match(scheduler.cutoverBlocker, /fifth Bot reply staging queue/);
  assert.match(scheduler.cutoverBlocker, /BOT_REPLY_STAGING_ENABLED is exactly true/);
  assert.match(scheduler.cutoverBlocker, /seven-check activation preflight/);
  assert.match(scheduler.cutoverBlocker, /without returning configuration values/);
  assert.match(scheduler.cutoverBlocker, /before Worker startup/);
  assert.match(scheduler.cutoverBlocker, /optional task/);
  assert.match(scheduler.cutoverBlocker, /identity-free telemetry/);
  assert.match(scheduler.cutoverBlocker, /fail-closed provider-neutral bootstrap/);
  assert.match(scheduler.cutoverBlocker, /partial startup failure/);
  assert.match(scheduler.cutoverBlocker, /package start command/);
  assert.match(scheduler.cutoverBlocker, /shared PostgreSQL creation guard/);
  assert.match(scheduler.cutoverBlocker, /provider-response Meta retry policy/);
  assert.match(scheduler.cutoverBlocker, /production telemetry provider/);
  assert.match(scheduler.cutoverBlocker, /One provider-bound process/);
  assert.match(scheduler.cutoverBlocker, /Team invitation/);
  assert.match(scheduler.cutoverBlocker, /incomplete Identity or rate-limit configuration/);
  assert.match(scheduler.cutoverBlocker, /live Railway configuration/);
  for (const path of [
    "shared/domain/workerScheduler.ts",
    "server/platform/postgresWorkerSchedulerLeaseRepository.ts",
    "server/platform/railwayWorkerScheduler.ts",
    "server/platform/railwayWorkerSchedulerService.ts",
    "server/platform/railwayWorkerProcess.ts",
    "server/platform/railwayWorkerMain.ts",
    "server/platform/railwayWorkerExecutable.ts",
    "server/platform/railwayBullMqMessageTemplateSubmissionWorkerExecutable.ts",
    "server/platform/railwayBullMqCampaignDeliveryQueue.ts",
    "server/platform/railwayCampaignDeliveryConsumerRuntime.ts",
    "server/platform/railwayBullMqWorkerExecutable.ts",
    "server/platform/railwayBullMqWorkerMain.ts",
    "server/platform/railwayBotReplyStagingActivationPreflight.ts",
    "server/platform/railwayWorkerTelemetry.ts",
    "server/platform/railwayBetterStackTelemetry.ts",
    "server/platform/railwayWorkerRuntime.ts",
    "server/platform/railwayPostgresWorkerService.ts",
    "server/platform/postgresCampaignDispatchRepository.ts",
    "server/templates/messageTemplateSubmissionMaintenanceRunner.ts",
    "server/operations/messageTemplateSubmissionMaintenanceTelemetry.ts",
    "server/platform/railwayMessageTemplateSubmissionMaintenanceRuntime.ts",
    "server/platform/postgresMessageTemplateSubmissionOutboxRepository.ts",
    "server/platform/clerkRailwayTeamInvitationProvider.ts",
    "server/platform/postgresMutationRateLimitConfiguration.ts",
    "server/campaigns/providerResponseMetaCampaignDeliveryRetryEvidenceSource.ts",
    "scripts/start-railway-bullmq-worker.mjs",
    "scripts/verify-bot-reply-staging-activation.mjs",
    "postgres/migrations/0014_worker_scheduler_lease.sql",
    "postgres/migrations/0015_campaign_dispatch.sql",
    "postgres/migrations/0026_message_template_submission_outbox.sql",
  ]) {
    assert.equal(scheduler.sourceFiles.includes(path), true);
  }
});

test("records all three bounded OTLP slices without claiming live ingestion", () => {
  const observability = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "operations.observability",
  );

  assert.ok(observability);
  assert.equal(observability.targetProvider, "better-stack");
  assert.equal(observability.nextAction, "adapter-required");
  for (const path of [
    "server/operations/operationalTelemetry.ts",
    "server/operations/teamInvitationDeliveryTelemetry.ts",
    "server/templates/messageTemplateSubmissionWorker.ts",
    "server/platform/railwayWorkerTelemetry.ts",
    "server/platform/betterStackOtlpLogs.ts",
    "server/platform/betterStackOtlpApiSignals.ts",
    "server/platform/betterStackOtlpWorkerSignals.ts",
    "server/platform/deterministicOtlpIds.ts",
    "server/platform/railwayBetterStackTelemetry.ts",
    "server/platform/railwayMessageTemplateSubmissionWorkerRuntime.ts",
    "server/platform/railwayPostgresWorkerService.ts",
    "server/platform/vercelBetterStackTelemetry.ts",
    "server/platform/w3cTraceContext.ts",
    "server/platform/currentVercelOpaqueTraceContext.ts",
    "server/platform/railwayApiClient.ts",
    "server/platform/railwayApiHttpHandler.ts",
    "scripts/start-railway-bullmq-worker.mjs",
    "server/platform/railwayBullMqApiMain.ts",
    "scripts/start-railway-bullmq-api.mjs",
    "docs/better-stack-opentelemetry.md",
  ]) {
    assert.equal(observability.sourceFiles.includes(path), true);
  }
  assert.match(observability.cutoverBlocker, /local OTLP Logs exporters/);
  assert.match(observability.cutoverBlocker, /structural redaction/);
  assert.match(observability.cutoverBlocker, /Vercel schedules forceFlush/);
  assert.match(observability.cutoverBlocker, /opaque W3C trace context/);
  assert.match(observability.cutoverBlocker, /Vercel-only HMAC key/);
  assert.match(observability.cutoverBlocker, /fixed OIDC-authenticated Railway API/);
  assert.match(observability.cutoverBlocker, /root client span/);
  assert.match(observability.cutoverBlocker, /duration histogram/);
  assert.match(observability.cutoverBlocker, /Worker emits deterministic root spans/);
  assert.match(observability.cutoverBlocker, /four baseline queues/);
  assert.match(observability.cutoverBlocker, /explicitly enabled Bot reply staging queue/);
  assert.match(observability.cutoverBlocker, /per-delivery consumer spans/);
  assert.match(observability.cutoverBlocker, /deterministic client child span/);
  assert.match(observability.cutoverBlocker, /without URL, tenant, template, WABA or payload/);
  assert.match(observability.cutoverBlocker, /verified live ingestion/);
  assert.match(observability.cutoverBlocker, /campaign delivery, reconciliation and Clerk/);
});

test("records the local API contract without claiming live adapter readiness", () => {
  const boundary = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "web.server-api-boundary",
  );
  const migrationInventory = actualMigrationInventory();

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
    "server/platform/railwayBotFlowMutationExecutor.ts",
    "server/platform/postgresRailwayBotFlowMutationExecutor.ts",
    "server/ai/railwayAiReplyApprovalHandler.ts",
    "server/ai/currentRailwayAiReplyApprovalHandler.ts",
    "server/ai/railwayAiReplyApprovalResult.ts",
    "server/platform/railwayAiReplyApprovalMutationExecutor.ts",
    "server/platform/postgresRailwayAiReplyApprovalMutationExecutor.ts",
    "server/onboarding/currentBusinessProfile.ts",
    "server/onboarding/saveBusinessProfileAction.ts",
    "server/onboarding/businessProfileActionResult.ts",
    "server/onboarding/railwayBusinessProfileHandler.ts",
    "server/onboarding/currentRailwayBusinessProfileHandler.ts",
    "server/onboarding/railwayBusinessProfileResult.ts",
    "server/platform/railwayOnboardingBusinessProfileOperations.ts",
    "server/platform/railwayOnboardingBusinessProfileMutationExecutor.ts",
    "server/platform/postgresRailwayOnboardingBusinessProfileMutationExecutor.ts",
    "server/platform/postgresClerkOrganizationBindingRepository.ts",
    "shared/domain/businessProfileView.ts",
    "server/auth/tenantSelectionActions.ts",
    "server/auth/tenantSelectionActionResult.ts",
    "server/auth/railwayTenantSelectionHandler.ts",
    "server/auth/currentRailwayTenantSelectionHandler.ts",
    "server/auth/railwayTenantSelectionResult.ts",
    "server/platform/railwayTenantSelectionOperations.ts",
    "server/platform/railwayTenantSelectionMutationExecutor.ts",
    "server/platform/postgresRailwayTenantSelectionMutationExecutor.ts",
    "server/team/currentTeamDirectory.ts",
    "server/team/railwayTeamDirectoryHandler.ts",
    "server/team/currentRailwayTeamDirectoryHandler.ts",
    "server/team/railwayTeamDirectoryResult.ts",
    "server/platform/railwayTeamDirectoryOperation.ts",
    "server/team/teamMembershipActions.ts",
    "server/team/railwayTeamMembershipHandler.ts",
    "server/team/currentRailwayTeamMembershipHandler.ts",
    "server/team/railwayTeamMembershipResult.ts",
    "server/platform/railwayTeamMembershipOperations.ts",
    "server/team/teamInvitationActions.ts",
    "server/team/railwayTeamInvitationRequestHandler.ts",
    "server/team/currentRailwayTeamInvitationRequestHandler.ts",
    "server/team/railwayTeamInvitationRequestResult.ts",
    "server/platform/railwayTeamInvitationRequestOperation.ts",
    "server/team/teamInvitationAcceptanceActions.ts",
    "server/team/teamInvitationAcceptanceIdentityResolver.ts",
    "server/team/railwayTeamInvitationAcceptanceHandler.ts",
    "server/team/currentRailwayTeamInvitationAcceptanceHandler.ts",
    "server/team/railwayTeamInvitationAcceptanceResult.ts",
    "server/platform/clerkRailwayTeamInvitationIdentityResolver.ts",
    "server/platform/railwayTeamInvitationAcceptanceOperation.ts",
    "server/campaigns/railwayCampaignHandler.ts",
    "server/campaigns/currentRailwayCampaignHandler.ts",
    "server/campaigns/railwayCampaignResult.ts",
    "server/platform/railwayCampaignMutationExecutor.ts",
    "server/platform/postgresRailwayCampaignMutationExecutor.ts",
    "server/platform/postgresTransaction.ts",
    "server/platform/nodePostgresAdapter.ts",
    "server/platform/nodePostgresPoolConfiguration.ts",
    "server/platform/postgresReadinessProbe.ts",
    "server/platform/railwayPostgresFoundation.ts",
    "server/platform/railwayPostgresApiRuntime.ts",
    "server/platform/railwayMetaWebhookRuntime.ts",
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
    "server/platform/postgresRailwayBotFlowMutationExecutor.ts",
    "server/platform/postgresBotReplyDeliveryRepository.ts",
    "server/platform/postgresBotReplyDeliveryProviderRepository.ts",
    "server/operations/botReplyStagingLiveDriver.ts",
    "server/operations/botReplyStagingDurableRunner.ts",
    "server/operations/botReplyStagingQueueMessage.ts",
    "server/operations/botReplyStagingQueueConsumer.ts",
    "server/operations/botReplyStagingQueuedExecutor.ts",
    "server/operations/botReplyStagingScenarioExecutor.ts",
    "server/operations/botReplyStagingProviderDriver.ts",
    "server/operations/botReplyStagingProviderCaseInventory.ts",
    "server/operations/botReplyStagingPrivateCaseSource.ts",
    "server/operations/botReplyStagingObservationSource.ts",
    "server/operations/botReplyStagingRecipientFingerprint.ts",
    "server/platform/railwayBullMqBotReplyStagingQueue.ts",
    "server/platform/railwayBotReplyStagingProviderDriverFactory.ts",
    "server/platform/railwayBotReplyStagingActivationPreflight.ts",
    "server/platform/railwayBotReplyStagingApiConfiguration.ts",
    "server/platform/railwayBotReplyStagingCrossServiceActivation.ts",
    "server/platform/railwayBotReplyStagingCrossServiceEvidence.ts",
    "server/platform/railwayBotReplyStagingReleaseEvidenceIssuer.ts",
    "server/platform/railwayBotReplyStagingReleaseEvidencePublisher.ts",
    "server/platform/railwayBotReplyStagingReleaseEvidenceStorageConfiguration.ts",
    "server/platform/postgresBotReplyStagingReleaseEvidenceRepository.ts",
    "server/platform/railwayBullMqPostgresApiRuntime.ts",
    "server/platform/railwayBullMqApiMain.ts",
    "server/platform/railwaySystemAdminBotReplyStagingOperation.ts",
    "server/platform/railwaySystemAdminBotReplyStagingAuthorizationOperation.ts",
    "server/platform/postgresBotReplyStagingRunRepository.ts",
    "server/platform/postgresBotReplyStagingSafetyRepository.ts",
    "server/platform/postgresBotReplyStagingServiceWindowSource.ts",
    "server/platform/postgresBotReplyStagingDurableObservationReader.ts",
    "server/platform/postgresBotReplyStagingDurableObservationWriter.ts",
    "server/platform/postgresBotReplyStagingWebhookObservationProducer.ts",
    "server/platform/postgresBotReplyStagingProviderDeferralObservationProducer.ts",
    "server/platform/postgresBotReplyStagingSendObservationProducer.ts",
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
    "server/platform/postgresRailwayAiReplyApprovalMutationExecutor.ts",
    "server/platform/postgresRailwayOnboardingBusinessProfileMutationExecutor.ts",
    "server/platform/postgresAiRuntimeRepository.ts",
    "server/platform/postgresContactOrganizationRepository.ts",
    "server/platform/postgresContactImportRepository.ts",
    "server/platform/postgresRailwayContactImportMutationExecutor.ts",
    "server/platform/postgresRailwayMessageTemplateDraftMutationExecutor.ts",
    "server/platform/postgresRailwayMessageTemplateSubmissionMutationExecutor.ts",
    "server/platform/postgresMessageTemplateSubmissionOutboxRepository.ts",
    "server/platform/postgresMetaRepository.ts",
    "server/platform/postgresMetaCredentialRepository.ts",
    "server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts",
    "server/platform/postgresWhatsappRateLimitRepository.ts",
    "server/platform/postgresWorkerSchedulerLeaseRepository.ts",
    "server/platform/postgresCampaignAudienceRepository.ts",
    "server/platform/postgresCampaignDeliveryProviderRepository.ts",
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
    "postgres/migrations/0022_campaign_delivery_provider_links.sql",
    "postgres/migrations/0023_api_mutation_rate_limits.sql",
    "postgres/migrations/0024_whatsapp_legacy_reservation_category.sql",
    "postgres/migrations/0025_data_migration_bundle_receipts.sql",
    "postgres/migrations/0026_message_template_submission_outbox.sql",
    "postgres/migrations/0027_clerk_organization_binding.sql",
    "postgres/migrations/0028_clerk_invitation_rate_limit.sql",
    "postgres/migrations/0029_team_invitation_delivery_deferrals.sql",
    "postgres/migrations/0030_whatsapp_service_reply_reservations.sql",
    "postgres/migrations/0031_bot_reply_delivery_deferrals.sql",
    "postgres/migrations/0032_bot_reply_delivery_provider_links.sql",
    "postgres/migrations/0033_bot_reply_staging_runs.sql",
    "postgres/migrations/0034_bot_reply_staging_authorizations.sql",
    "postgres/migrations/0035_bot_reply_staging_observations.sql",
    "postgres/migrations/0036_bot_reply_provider_attempt_provenance.sql",
    "postgres/migrations/0037_inbound_button_reply_provenance.sql",
    "postgres/migrations/0038_bot_reply_service_window_rejection_provenance.sql",
    "postgres/migrations/0039_bot_reply_provider_request_fence.sql",
    "postgres/migrations/0040_bot_reply_staging_release_evidence.sql",
    "postgres/migrations/0041_production_readiness_release_evidence_v2.sql",
    "postgres/migrations/0042_bot_reply_provider_outcome_request_fence.sql",
    "postgres/migrations/0043_bot_reply_staging_release_evidence_operator_audit.sql",
    "postgres/postgresMigrationParityRegistry.mjs",
    "scripts/read-d1-full-data-migration-snapshot.mjs",
    "scripts/run-postgres-full-data-migration-cutover.mjs",
    "scripts/verify-d1-full-data-migration-snapshot.mjs",
    "scripts/verify-postgres-migration-parity.mjs",
    "server/platform/postgresDataMigrationBundleProtocol.ts",
    "server/platform/postgresFullDataMigrationBundle.ts",
    "server/platform/postgresFullDataMigrationCutover.ts",
    "server/platform/postgresMutationRateLimitBinding.ts",
    "server/platform/postgresMutationRateLimitConfiguration.ts",
    "server/platform/railwayApiRuntime.ts",
    "server/platform/railwayMessageTemplateProviderRuntime.ts",
    "server/platform/railwayMessageTemplateSubmissionWorkerRuntime.ts",
    "server/platform/railwayMessageTemplateSubmissionReconciliationRuntime.ts",
    "server/platform/railwayMessageTemplateSubmissionMaintenanceRuntime.ts",
    "server/templates/railwayMessageTemplateDirectoryHandler.ts",
    "server/templates/railwayMessageTemplateDraftHandler.ts",
    "server/templates/railwayMessageTemplateSubmissionHandler.ts",
    "server/templates/messageTemplateSubmissionMaintenanceRunner.ts",
  ];

  for (const path of expectedBoundaryFiles) {
    assert.equal(boundary.sourceFiles.includes(path), true);
  }

  assert.deepEqual(
    boundary.sourceFiles
      .filter((path) => path.startsWith("postgres/migrations/"))
      .sort(),
    actualPostgresMigrationSourceFiles().filter(
      (path) => !/\/000[0-3]_/.test(path),
    ),
    "server API boundary must list every PostgreSQL migration from 0004 onward",
  );
  assert.match(
    boundary.cutoverBlocker,
    new RegExp(
      `maps all ${migrationInventory.d1MigrationCount} D1 migrations and all ${migrationInventory.d1TableCount} D1 tables to the ${migrationInventory.postgresMigrationCount} PostgreSQL migrations`,
    ),
  );

  assert.match(boundary.cutoverBlocker, /authenticated runtime/);
  assert.match(boundary.cutoverBlocker, /contacts\.save/);
  assert.match(boundary.cutoverBlocker, /Meta template provider runtime/);
  assert.match(boundary.cutoverBlocker, /template submission outbox/i);
  assert.match(boundary.cutoverBlocker, /PostgreSQL transaction executor/);
  assert.match(boundary.cutoverBlocker, /fifty-four-adapter PostgreSQL foundation/);
  assert.match(
    boundary.cutoverBlocker,
    /complete onboarding business-profile read\/save Vercel BFF/,
  );
  assert.match(
    boundary.cutoverBlocker,
    /complete tenant-selection directory\/save Vercel BFF/,
  );
  assert.match(
    boundary.cutoverBlocker,
    /complete team-directory, membership-mutation, invitation-request, and invitation-acceptance Vercel BFF/,
  );
  assert.match(boundary.cutoverBlocker, /complete bot-flow list\/details\/draft\/publish routes/);
  assert.match(boundary.cutoverBlocker, /complete campaign directory\/snapshot\/activation Vercel BFF/);
  assert.match(boundary.cutoverBlocker, /complete AI-agent directory\/details\/draft\/publish Vercel BFF/);
  assert.match(boundary.cutoverBlocker, /complete AI reply approval list\/decide routes/);
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
  assert.match(
    boundary.cutoverBlocker,
    /campaign-snapshot, campaign-dispatch and atomic provider-reconciliation persistence/,
  );
  assert.match(boundary.cutoverBlocker, /atomic provider-reconciliation persistence/);
  assert.match(boundary.cutoverBlocker, /contact-organization/);
  assert.match(boundary.cutoverBlocker, /atomic contact-import/);
  assert.match(boundary.cutoverBlocker, /contact-import start\/chunk/);
  assert.match(boundary.cutoverBlocker, /message-template list\/draft save/);
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
  assert.match(boundary.cutoverBlocker, /executable API bootstrap/);
  assert.match(boundary.cutoverBlocker, /graceful SIGTERM shutdown/);
  assert.match(boundary.cutoverBlocker, /live Railway service configuration/);
  assert.doesNotMatch(boundary.cutoverBlocker, /missing executable bootstrap/);
  assert.match(boundary.cutoverBlocker, /All six operational-report source families are migrated/);
  assert.match(boundary.cutoverBlocker, /complete authenticated reports\.read HTTP path passed against PostgreSQL 16\.13/);
  assert.match(
    boundary.cutoverBlocker,
    /shared PostgreSQL token-bucket contracts for tenant mutations, system-admin mutations, Meta webhook ingress and Clerk Organization invitation creation/,
  );
  assert.match(
    boundary.cutoverBlocker,
    /provider-bound pool and rate-limit policy values/,
  );
  assert.match(boundary.cutoverBlocker, /all ten slices and all 55 tables/);
  assert.match(boundary.cutoverBlocker, /exact 55-table D1 export contract/);
  assert.doesNotMatch(boundary.cutoverBlocker, /40 D1 migrations|53 D1 tables|35 PostgreSQL migrations/);
  assert.match(boundary.cutoverBlocker, /single-transaction full-source snapshot boundary/);
  assert.match(boundary.cutoverBlocker, /signed all-slice bundle/);
  assert.match(boundary.cutoverBlocker, /immutable source-level replay receipt/);
  assert.match(boundary.cutoverBlocker, /live controlled-environment export and signed full rehearsal/);
  assert.doesNotMatch(boundary.cutoverBlocker, /remaining eight D1 tables/);
  assert.match(boundary.cutoverBlocker, /live account configuration/);
  assert.match(boundary.cutoverBlocker, /staging evidence/);
});

test("records Railway PostgreSQL for Pilot without claiming live readiness", () => {
  const database = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "data.relational-database",
  );
  const migrationInventory = actualMigrationInventory();

  assert.ok(database);
  assert.equal(database.decisionState, "selected");
  assert.equal(database.targetProvider, "railway");
  assert.equal(database.nextAction, "configuration-required");
  assert.match(database.targetContract, /controlled Pilot/);

  const registeredPostgresMigrations = database.sourceFiles
    .filter((path) => path.startsWith("postgres/migrations/"))
    .sort();
  const actualPostgresMigrations = actualPostgresMigrationSourceFiles();

  assert.deepEqual(
    registeredPostgresMigrations,
    actualPostgresMigrations,
    "hosting registry must list the complete PostgreSQL migration inventory",
  );
  assert.equal(
    database.currentResources.includes(
      `${migrationInventory.d1MigrationCount} SQL migrations`,
    ),
    true,
  );

  for (const path of [
    "server/platform/postgresTransaction.ts",
    "server/platform/postgresRailwayApiMutationExecutor.ts",
    "server/platform/postgresResultValidation.ts",
    "server/platform/postgresTenantMembershipRepository.ts",
    "server/platform/postgresTenantMembershipMutationRepository.ts",
    "server/platform/postgresTenantSelectionRepository.ts",
    "server/platform/postgresRailwayTenantSelectionMutationExecutor.ts",
    "server/platform/postgresBusinessProfileRepository.ts",
    "server/platform/postgresTeamInvitationRepository.ts",
    "server/platform/postgresTeamInvitationExpirationRepository.ts",
    "server/platform/postgresTeamInvitationDeliveryRepository.ts",
    "server/platform/postgresTeamInvitationAcceptanceRepository.ts",
    "server/platform/postgresContactReadRepository.ts",
    "server/platform/postgresContactConsentRepository.ts",
    "server/platform/postgresConversationRepository.ts",
    "server/platform/postgresBotFlowRepository.ts",
    "server/platform/postgresRailwayBotFlowMutationExecutor.ts",
    "server/platform/postgresBotReplyDeliveryRepository.ts",
    "server/platform/postgresBotReplyDeliveryProviderRepository.ts",
    "server/operations/botReplyStagingLiveDriver.ts",
    "server/operations/botReplyStagingDurableRunner.ts",
    "server/operations/botReplyStagingScenarioExecutor.ts",
    "server/operations/botReplyStagingProviderDriver.ts",
    "server/operations/botReplyStagingProviderCaseInventory.ts",
    "server/operations/botReplyStagingPrivateCaseSource.ts",
    "server/operations/botReplyStagingObservationSource.ts",
    "server/operations/botReplyStagingRecipientFingerprint.ts",
    "server/platform/railwayBotReplyStagingProviderDriverFactory.ts",
    "server/platform/railwayBotReplyStagingActivationPreflight.ts",
    "server/platform/railwaySystemAdminBotReplyStagingOperation.ts",
    "server/platform/railwaySystemAdminBotReplyStagingAuthorizationOperation.ts",
    "server/platform/postgresBotReplyStagingRunRepository.ts",
    "server/platform/postgresBotReplyStagingSafetyRepository.ts",
    "server/platform/postgresBotReplyStagingServiceWindowSource.ts",
    "server/platform/postgresBotReplyStagingDurableObservationReader.ts",
    "server/platform/postgresBotReplyStagingDurableObservationWriter.ts",
    "server/platform/postgresBotReplyStagingWebhookObservationProducer.ts",
    "server/platform/postgresBotReplyStagingProviderDeferralObservationProducer.ts",
    "server/platform/postgresBotReplyStagingSendObservationProducer.ts",
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
    "server/platform/postgresRailwayAiReplyApprovalMutationExecutor.ts",
    "server/platform/postgresAiRuntimeRepository.ts",
    "server/platform/postgresContactOrganizationRepository.ts",
    "server/platform/postgresContactImportRepository.ts",
    "server/platform/postgresMetaRepository.ts",
    "server/platform/postgresMetaCredentialRepository.ts",
    "server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts",
    "server/platform/postgresWhatsappRateLimitRepository.ts",
    "server/platform/postgresWorkerSchedulerLeaseRepository.ts",
    "server/platform/postgresCampaignAudienceRepository.ts",
    "server/platform/postgresCampaignDeliveryProviderRepository.ts",
    "server/platform/postgresCampaignDispatchRepository.ts",
    "server/platform/postgresCampaignRepository.ts",
    "server/platform/postgresRailwayCampaignMutationExecutor.ts",
    "server/platform/postgresMessageTemplateRepository.ts",
    "server/platform/postgresMessageTemplateSubmissionOutboxRepository.ts",
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
    "postgres/migrations/0022_campaign_delivery_provider_links.sql",
    "postgres/migrations/0023_api_mutation_rate_limits.sql",
    "postgres/migrations/0024_whatsapp_legacy_reservation_category.sql",
    "postgres/migrations/0025_data_migration_bundle_receipts.sql",
    "postgres/migrations/0026_message_template_submission_outbox.sql",
    "postgres/migrations/0027_clerk_organization_binding.sql",
    "postgres/migrations/0028_clerk_invitation_rate_limit.sql",
    "postgres/migrations/0029_team_invitation_delivery_deferrals.sql",
    "postgres/migrations/0030_whatsapp_service_reply_reservations.sql",
    "postgres/migrations/0031_bot_reply_delivery_deferrals.sql",
    "postgres/migrations/0032_bot_reply_delivery_provider_links.sql",
    "postgres/migrations/0033_bot_reply_staging_runs.sql",
    "postgres/migrations/0034_bot_reply_staging_authorizations.sql",
    "postgres/migrations/0035_bot_reply_staging_observations.sql",
    "postgres/migrations/0036_bot_reply_provider_attempt_provenance.sql",
    "postgres/migrations/0037_inbound_button_reply_provenance.sql",
    "postgres/migrations/0038_bot_reply_service_window_rejection_provenance.sql",
    "postgres/migrations/0039_bot_reply_provider_request_fence.sql",
    "postgres/migrations/0040_bot_reply_staging_release_evidence.sql",
    "postgres/migrations/0041_production_readiness_release_evidence_v2.sql",
    "postgres/migrations/0042_bot_reply_provider_outcome_request_fence.sql",
    "postgres/migrations/0043_bot_reply_staging_release_evidence_operator_audit.sql",
    "postgres/postgresMigrationParityRegistry.mjs",
    "scripts/read-d1-full-data-migration-snapshot.mjs",
    "scripts/run-postgres-full-data-migration-cutover.mjs",
    "scripts/verify-d1-full-data-migration-snapshot.mjs",
    "scripts/verify-postgres-migration-contract.mjs",
    "scripts/verify-postgres-migration-parity.mjs",
    "scripts/verify-node-postgres-integration.mjs",
    "docs/postgresql-runtime-role-decision.md",
    "server/platform/postgresDataMigrationBundleProtocol.ts",
    "server/platform/postgresFullDataMigrationBundle.ts",
    "server/platform/postgresFullDataMigrationCutover.ts",
    "server/platform/postgresMutationRateLimitBinding.ts",
    "server/platform/postgresMutationRateLimitConfiguration.ts",
    "server/platform/postgresRuntimeCapabilityConfiguration.ts",
    "server/platform/postgresRuntimeCapabilityEvidence.ts",
    "server/platform/postgresRuntimeCapabilityTrustedDriverContract.ts",
  ]) {
    assert.equal(database.sourceFiles.includes(path), true);
  }

  assert.match(database.cutoverBlocker, /Railway PostgreSQL is selected/);
  assert.match(database.cutoverBlocker, /fifty-eight ordered PostgreSQL migrations/);
  assert.match(database.cutoverBlocker, /twenty-nine Railway-only migrations/);
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
  assert.match(database.cutoverBlocker, /eighty-seven real concurrency scenarios/);
  assert.match(
    database.cutoverBlocker,
    /inventory contains all 58 ordered PostgreSQL migrations through migration 0057/i,
  );
  assert.match(database.cutoverBlocker, /44 migrations through 0043 form the earlier critical-path foundation/);
  assert.match(database.cutoverBlocker, /migrations 0044-0057 are dormant hardening contracts/);
  assert.match(database.cutoverBlocker, /D31-C1 is dormant-complete/);
  assert.match(database.cutoverBlocker, /selectedCollectionMode remains null/);
  assert.match(database.cutoverBlocker, /D1e is also dormant-complete/);
  assert.match(database.cutoverBlocker, /does not authorize Runtime activation/);
  assert.match(
    database.cutoverBlocker,
    /concurrent authenticated team-invitation acceptance replay/,
  );
  assert.match(database.cutoverBlocker, /complete conversation/);
  assert.match(
    database.cutoverBlocker,
    /live 55-table rehearsal remains required/,
  );
  assert.match(
    database.cutoverBlocker,
    /production pool and rate-limit configuration contracts/,
  );
  assert.match(database.cutoverBlocker, /composed-adapter foundation/);
  assert.match(
    database.cutoverBlocker,
    /concurrent onboarding first-owner provisioning and receipt replay/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent tenant-selection save and receipt replay/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent authenticated team-membership replay/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent authenticated team-invitation request replay/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent campaign snapshot and activation replay through the authenticated HTTP path/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent AI reply approval replay through the authenticated HTTP path/,
  );
  assert.match(
    database.cutoverBlocker,
    /concurrent AI-agent draft replay through the authenticated HTTP path/,
  );
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
  assert.match(
    database.cutoverBlocker,
    /live Railway plan and region, provider-bound pool and rate-limit values/,
  );
  assert.match(
    database.cutoverBlocker,
    new RegExp(
      `maps all ${migrationInventory.d1MigrationCount} D1 migrations and all ${migrationInventory.d1TableCount} D1 tables`,
    ),
  );
  assert.doesNotMatch(
    database.cutoverBlocker,
    /42 D1 migrations|44 migrations through migration 0043|sixteen Railway-only migrations/,
  );
  assert.match(database.cutoverBlocker, /all ten slices and all 55 tables/);
  assert.match(database.cutoverBlocker, /single-transaction full-source snapshot boundary/);
  assert.match(database.cutoverBlocker, /signed all-slice bundle/);
  assert.match(database.cutoverBlocker, /immutable receipt unique by bundle and source digest/);
  assert.match(
    database.cutoverBlocker,
    /controlled-environment export, signed full rehearsal/,
  );
  assert.doesNotMatch(database.cutoverBlocker, /remaining eight D1 tables/);
  assert.match(
    database.cutoverBlocker,
    /concurrent provider acceptance and terminal status reconciliation/,
  );
});
