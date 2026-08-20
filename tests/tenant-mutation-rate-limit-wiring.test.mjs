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
    "campaigns/campaignActions.ts",
    "contacts/contactImportActions.ts",
    "meta/metaEmbeddedSignupActions.ts",
    "team/teamInvitationActions.ts",
    "team/teamMembershipActions.ts",
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

test("separates reads from mutations in mixed action modules", async () => {
  const paths = [
    "ai/aiAgentActions.ts",
    "ai/aiReplyApprovalActions.ts",
    "bot/botFlowActions.ts",
    "conversations/conversationActions.ts",
  ];

  for (const path of paths) {
    const source = await readServerSource(path);

    assert.match(
      source,
      /requireCurrentTenantMutationSession/,
      path,
    );
    assert.match(
      source,
      /requireCurrentTenantSession/,
      path,
    );
    assert.match(
      source,
      /createAction(?:Context|Handler)\(true\)/,
      path,
    );
    assert.match(
      source,
      /createAction(?:Context|Handler)\(false\)/,
      path,
    );
  }
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
  const source = await readServerSource(
    "onboarding/saveBusinessProfileAction.ts",
  );
  const rateLimitIndex = source.indexOf(
    "await enforceCurrentTenantMutationRateLimit(",
  );
  const databaseIndex = source.indexOf(
    "await requireRuntimeDatabase()",
  );

  assert.ok(rateLimitIndex > 0);
  assert.ok(databaseIndex > rateLimitIndex);
  assert.match(
    source,
    /identity\.externalUserId/,
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
