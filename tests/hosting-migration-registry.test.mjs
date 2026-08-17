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
    "server/platform/railwayPostgresFoundation.ts",
    "server/platform/postgresTenantMembershipRepository.ts",
    "server/platform/postgresTenantMembershipMutationRepository.ts",
    "server/platform/postgresTenantSelectionRepository.ts",
    "server/platform/postgresRailwayApiMutationExecutor.ts",
    "server/platform/postgresTeamInvitationRepository.ts",
    "server/platform/postgresTeamInvitationExpirationRepository.ts",
    "server/platform/postgresTeamInvitationDeliveryRepository.ts",
    "server/platform/postgresTeamInvitationAcceptanceRepository.ts",
    "server/platform/postgresContactReadRepository.ts",
    "server/platform/postgresOperationalReportRepository.ts",
    "postgres/migrations/0004_team_invitation_lifecycle.sql",
    "postgres/migrations/0005_conversations_messages.sql",
    "postgres/migrations/0006_message_templates_campaigns.sql",
    "server/platform/railwayApiRuntime.ts",
  ];

  for (const path of expectedBoundaryFiles) {
    assert.equal(boundary.sourceFiles.includes(path), true);
  }

  assert.match(boundary.cutoverBlocker, /authenticated runtime/);
  assert.match(boundary.cutoverBlocker, /contacts\.save/);
  assert.match(boundary.cutoverBlocker, /PostgreSQL transaction executor/);
  assert.match(boundary.cutoverBlocker, /eleven-adapter PostgreSQL foundation/);
  assert.match(boundary.cutoverBlocker, /PostgreSQL contacts\.list read/);
  assert.match(boundary.cutoverBlocker, /single-statement reports\.read adapter/);
  assert.match(boundary.cutoverBlocker, /templates, and campaigns are migrated/);
  assert.match(boundary.cutoverBlocker, /other three operational-report source tables/);
  assert.match(boundary.cutoverBlocker, /live provider-bound pool values/);
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
    "server/platform/postgresOperationalReportRepository.ts",
    "postgres/migrations/0000_core_contacts.sql",
    "postgres/migrations/0001_railway_api_mutation_receipts.sql",
    "postgres/migrations/0002_tenant_access_foundation.sql",
    "postgres/migrations/0003_tenant_membership_events.sql",
    "postgres/migrations/0004_team_invitation_lifecycle.sql",
    "postgres/migrations/0005_conversations_messages.sql",
    "postgres/migrations/0006_message_templates_campaigns.sql",
    "scripts/verify-postgres-migration-contract.mjs",
    "scripts/verify-node-postgres-integration.mjs",
  ]) {
    assert.equal(database.sourceFiles.includes(path), true);
  }

  assert.match(database.cutoverBlocker, /provider-neutral/i);
  assert.match(database.cutoverBlocker, /seven ordered/);
  assert.match(database.cutoverBlocker, /node-postgres adapter/);
  assert.match(database.cutoverBlocker, /two real concurrency scenarios/);
  assert.match(database.cutoverBlocker, /pool configuration contract/);
  assert.match(database.cutoverBlocker, /eleven-adapter foundation/);
  assert.match(database.cutoverBlocker, /contacts\.list/);
  assert.match(database.cutoverBlocker, /reports\.read/);
  assert.match(database.cutoverBlocker, /other three operational-report source tables/);
  assert.match(database.cutoverBlocker, /live provider-bound pool values/);
  assert.match(database.cutoverBlocker, /35-migration parity conversion/);
  assert.match(database.cutoverBlocker, /remaining repository DML\/concurrency/);
});
