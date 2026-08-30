import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

async function readServerSource(path) {
  return readFile(
    new URL(`../server/${path}`, import.meta.url),
    "utf8",
  );
}

test("routes tenant-only mutation modules through the mutation session", async () => {
  const paths = [
    "meta/metaEmbeddedSignupActions.ts",
    "templates/messageTemplateActions.ts",
  ];

  for (const path of paths) {
    const source = await readServerSource(path);

    assert.match(
      source,
      /requireCurrentTenantMutationSession/,
      path,
    );
    assert.doesNotMatch(
      source,
      /from "\.\.\/auth\/currentTenantSession/,
      path,
    );
  }
});

test("routes team invitation requests through Railway", async () => {
  const source = await readServerSource(
    "team/teamInvitationActions.ts",
  );

  assert.match(
    source,
    /createCurrentRailwayTeamInvitationRequestHandler/,
  );
  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createTeamInvitationRepository|requireRuntimeTeamInvitationPublisher/,
  );
});

test("routes team invitation acceptance through Railway", async () => {
  const source = await readServerSource(
    "team/teamInvitationAcceptanceActions.ts",
  );

  assert.match(
    source,
    /createCurrentRailwayTeamInvitationAcceptanceHandler/,
  );
  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase|createTeamInvitationAcceptanceRepository|createClerkTeamInvitationIdentityContext|enforceCurrentTenantMutationRateLimit/,
  );
});

test("routes team membership mutations through Railway", async () => {
  const source = await readServerSource(
    "team/teamMembershipActions.ts",
  );

  assert.match(source, /createCurrentRailwayTeamMembershipHandler/);
  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createTenantMembershipMutationRepository/,
  );
});

test("routes campaign reads and mutations through Railway", async () => {
  const directorySource = await readServerSource(
    "campaigns/currentCampaigns.ts",
  );
  const actionSource = await readServerSource(
    "campaigns/campaignActions.ts",
  );

  assert.match(directorySource, /createCurrentRailwayCampaignHandler/);
  assert.match(actionSource, /createCurrentRailwayCampaignHandler/);
  assert.doesNotMatch(
    `${directorySource}\n${actionSource}`,
    /requireRuntimeDatabase|requireCurrentTenantSession|requireCurrentTenantMutationSession|createCampaignRepository/,
  );
});

test("routes tenant selection reads and mutations through Railway", async () => {
  const source = await readServerSource("auth/tenantSelectionActions.ts");

  assert.match(source, /createCurrentRailwayTenantSelectionHandler/);
  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase|readClerkIdentity|createTenantMembershipRepository|createTenantSelectionRepository|enforceCurrentTenantMutationRateLimit/,
  );
});

test("routes AI reply approval reads and decisions through Railway", async () => {
  const directorySource = await readServerSource(
    "ai/currentAiReplyApprovals.ts",
  );
  const actionSource = await readServerSource(
    "ai/aiReplyApprovalActions.ts",
  );

  assert.match(
    `${directorySource}\n${actionSource}`,
    /createCurrentRailwayAiReplyApprovalHandler/,
  );
  assert.doesNotMatch(
    `${directorySource}\n${actionSource}`,
    /requireRuntimeDatabase|requireCurrentTenantSession|requireCurrentTenantMutationSession|createAiReplyOutboxRepository/,
  );
});

test("routes contact organization mutations through Railway", async () => {
  const source = await readServerSource(
    "contacts/contactOrganizationActions.ts",
  );

  assert.match(
    source,
    /createCurrentRailwayContactOrganizationHandler/,
  );
  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createContactOrganizationRepository/,
  );
});

test("routes contact imports through Railway", async () => {
  const source = await readServerSource(
    "contacts/contactImportActions.ts",
  );

  assert.match(source, /createCurrentRailwayContactImportHandler/);
  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createContactImportRepository/,
  );
});

test("routes message template reads and draft saves through Railway", async () => {
  const directorySource = await readServerSource(
    "templates/currentMessageTemplates.ts",
  );
  const actionSource = await readServerSource(
    "templates/messageTemplateActions.ts",
  );
  const saveSource = actionSource.match(
    /export async function saveMessageTemplateDraftAction[\s\S]*?(?=export async function submitMessageTemplateAction)/,
  )?.[0];

  assert.match(
    directorySource,
    /createCurrentRailwayMessageTemplateDirectoryHandler/,
  );
  assert.doesNotMatch(
    directorySource,
    /requireRuntimeDatabase|requireCurrentTenantSession|createMessageTemplateRepository/,
  );
  assert.ok(saveSource);
  assert.match(
    saveSource,
    /createCurrentRailwayMessageTemplateDraftHandler/,
  );
  assert.doesNotMatch(
    saveSource,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createMessageTemplateRepository/,
  );
});

test("routes all conversation reads and mutations through Railway", async () => {
  const actionSource = await readServerSource(
    "conversations/conversationActions.ts",
  );
  const directorySource = await readServerSource(
    "conversations/currentInbox.ts",
  );

  assert.match(
    actionSource,
    /createCurrentRailwayConversationHandler/,
  );
  assert.match(
    directorySource,
    /createCurrentRailwayConversationHandler/,
  );
  assert.doesNotMatch(
    `${actionSource}\n${directorySource}`,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|requireCurrentTenantSession|createConversationRepository/,
  );
});

test("routes all AI agent reads and writes through Railway", async () => {
  const actionSource = await readServerSource("ai/aiAgentActions.ts");
  const directorySource = await readServerSource("ai/currentAiAgents.ts");

  assert.match(actionSource, /createCurrentRailwayAiAgentHandler/);
  assert.match(directorySource, /createCurrentRailwayAiAgentHandler/);
  assert.doesNotMatch(
    `${actionSource}\n${directorySource}`,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|requireCurrentTenantSession|createAiAgentRepository|createKnowledgeSourceRepository/,
  );
});

test("routes all bot flow reads and writes through Railway", async () => {
  const actionSource = await readServerSource("bot/botFlowActions.ts");
  const directorySource = await readServerSource("bot/currentBotFlows.ts");
  const loadSource = actionSource.match(
    /export async function loadBotFlowDetailsAction[\s\S]*?(?=export async function saveBotFlowDraftAction)/,
  )?.[0];

  assert.ok(loadSource);
  assert.match(loadSource, /createCurrentRailwayBotFlowHandler/);
  assert.doesNotMatch(
    loadSource,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createBotFlowRepository/,
  );
  assert.match(directorySource, /createCurrentRailwayBotFlowHandler/);
  assert.doesNotMatch(
    directorySource,
    /requireRuntimeDatabase|requireCurrentTenantSession|createBotFlowRepository/,
  );
  assert.match(actionSource, /createCurrentRailwayBotFlowHandler/);
  assert.doesNotMatch(
    `${actionSource}\n${directorySource}`,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|requireCurrentTenantSession|createBotFlowRepository|createMutationActionHandler/,
  );
});

test("routes contact reads, profile saves, and consent mutations through Railway", async () => {
  const source = await readServerSource("contacts/contactActions.ts");

  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|currentTenantSession|createContactRepository|createContactConsentRepository/,
  );

  const loadMoreSource = source.match(
    /export async function loadMoreContactsAction[\s\S]*?(?=export async function grantContactConsentAction)/,
  )?.[0];

  assert.ok(loadMoreSource);
  assert.match(
    loadMoreSource,
    /createCurrentRailwayContactDirectoryHandler/,
  );
  assert.doesNotMatch(
    loadMoreSource,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createActionContext/,
  );

  const saveSource = source.match(
    /export async function saveContactAction[\s\S]*?(?=export async function loadMoreContactsAction)/,
  )?.[0];

  assert.ok(saveSource);
  assert.match(saveSource, /createCurrentRailwayContactMutationHandler/);
  assert.doesNotMatch(
    saveSource,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createConsentActionContext/,
  );
  assert.match(source, /createCurrentRailwayContactConsentHandler/);
});

test("limits initial onboarding by authenticated server identity before persistence", async () => {
  const actionSource = await readServerSource(
    "onboarding/saveBusinessProfileAction.ts",
  );
  const operationSource = await readServerSource(
    "platform/railwayOnboardingBusinessProfileOperations.ts",
  );
  const runtimeSource = await readServerSource(
    "platform/railwayPostgresApiRuntime.ts",
  );
  const rateLimitIndex = operationSource.indexOf(
    "await dependencies.mutationRateLimit.consume(",
  );
  const mutationIndex = operationSource.indexOf(
    "await dependencies.mutations.execute(",
  );

  assert.match(actionSource, /createCurrentRailwayBusinessProfileHandler/);
  assert.ok(rateLimitIndex > 0);
  assert.ok(mutationIndex > rateLimitIndex);
  assert.match(
    operationSource,
    /context\.userIdentity\.externalUserId/,
  );
  assert.match(
    runtimeSource,
    /foundation\.railwayOnboardingBusinessProfileMutations/,
  );
  assert.doesNotMatch(
    `${actionSource}\n${operationSource}`,
    /requireRuntimeDatabase|enforceCurrentTenantMutationRateLimit|createTenantProvisioningRepository/,
  );
});

test("declares tenant and webhook rate limit bindings only on the server", async () => {
  const environmentSource = await readFile(
    new URL("../cloudflare-env.d.ts", import.meta.url),
    "utf8",
  );
  const exampleEnvironment = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  assert.match(
    environmentSource,
    /META_WEBHOOK_RATE_LIMITER\?: RateLimitBinding/,
  );
  assert.match(
    environmentSource,
    /TENANT_MUTATION_RATE_LIMITER\?: RateLimitBinding/,
  );
  assert.match(
    environmentSource,
    /SYSTEM_ADMIN_MUTATION_RATE_LIMITER\?: RateLimitBinding/,
  );
  assert.doesNotMatch(
    exampleEnvironment,
    /^(?:META_WEBHOOK|TENANT_MUTATION|SYSTEM_ADMIN_MUTATION)_RATE_LIMITER=/m,
  );
});

test("uses the Railway server identity for system-admin writes and directory reads", async () => {
  const mutationSource = await readServerSource(
    "billing/systemAdminSubscriptionActions.ts",
  );
  const readSource = await readServerSource(
    "admin/currentSystemAdminTenantDirectory.ts",
  );

  assert.match(
    mutationSource,
    /resolveCurrentRailwayApiServerIdentity/,
  );
  assert.doesNotMatch(
    mutationSource,
    /requireCurrentSystemAdminSession|requireCurrentSystemAdminMutationSession|requireRuntimeDatabase/,
  );
  assert.match(
    readSource,
    /createCurrentRailwaySystemAdminTenantDirectoryHandler/,
  );
  assert.doesNotMatch(
    readSource,
    /requireCurrentSystemAdminSession|requireCurrentSystemAdminMutationSession|requireRuntimeDatabase/,
  );
});
