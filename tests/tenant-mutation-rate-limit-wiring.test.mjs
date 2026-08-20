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
    "contacts/contactOrganizationActions.ts",
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

test("separates reads from mutations in mixed action modules", async () => {
  const paths = [
    "ai/aiAgentActions.ts",
    "ai/aiReplyApprovalActions.ts",
    "bot/botFlowActions.ts",
    "contacts/contactActions.ts",
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
