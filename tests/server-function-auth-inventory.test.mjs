import assert from "node:assert/strict";
import {
  readdir,
  readFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const serverRoot = path.join(
  projectRoot,
  "server",
);

const auditedServerFunctions = new Map([
  ["server/admin/systemAdminBusinessProfileActions.ts", ["resolveCurrentRailwayApiServerIdentity"]],
  ["server/admin/systemAdminTenantDirectoryActions.ts", ["requireCurrentSystemAdminSession"]],
  ["server/ai/aiAgentActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/ai/aiReplyApprovalActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/ai/knowledgeUploadActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/auth/tenantSelectionActions.ts", ["readClerkIdentity"]],
  ["server/billing/systemAdminSubscriptionActions.ts", ["requireCurrentSystemAdminMutationSession"]],
  ["server/bot/botFlowActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/campaigns/campaignActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/campaigns/systemAdminWhatsappDeliveryPolicyActions.ts", ["requireCurrentSystemAdminMutationSession"]],
  ["server/contacts/contactActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/contacts/contactImportActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/contacts/contactOrganizationActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/conversations/conversationActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/meta/metaEmbeddedSignupActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/onboarding/saveBusinessProfileAction.ts", ["readClerkIdentity"]],
  ["server/operations/systemAdminProductionDecisionActions.ts", ["requireCurrentSystemAdminMutationSession"]],
  ["server/reports/operationalReportActions.ts", ["requireCurrentTenantSession"]],
  ["server/team/teamInvitationAcceptanceActions.ts", ["createClerkTeamInvitationIdentityContext"]],
  ["server/team/teamInvitationActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/team/teamMembershipActions.ts", ["requireCurrentTenantMutationSession"]],
  ["server/templates/messageTemplateActions.ts", ["requireCurrentTenantMutationSession"]],
]);

async function collectTypescriptFiles(directory) {
  const entries = await readdir(
    directory,
    { withFileTypes: true },
  );
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(
        directory,
        entry.name,
      );

      if (entry.isDirectory()) {
        return collectTypescriptFiles(
          absolutePath,
        );
      }

      return entry.isFile() && entry.name.endsWith(".ts")
        ? [absolutePath]
        : [];
    }),
  );

  return nestedFiles.flat();
}

test("keeps every Server Function inside the reviewed authentication inventory", async () => {
  const typescriptFiles = await collectTypescriptFiles(
    serverRoot,
  );
  const discoveredServerFunctions = [];

  for (const absolutePath of typescriptFiles) {
    const source = await readFile(
      absolutePath,
      "utf8",
    );

    if (!source.trimStart().startsWith('"use server";')) {
      continue;
    }

    discoveredServerFunctions.push(
      path.relative(projectRoot, absolutePath),
    );
  }

  assert.deepEqual(
    discoveredServerFunctions.sort(),
    [...auditedServerFunctions.keys()].sort(),
    "a Server Function was added, removed, or moved without updating the authentication inventory",
  );
});

test("routes every Server Function through its reviewed identity or session boundary", async () => {
  for (const [file, acceptedBoundaries] of auditedServerFunctions) {
    const source = await readFile(
      path.join(projectRoot, file),
      "utf8",
    );

    assert.equal(
      acceptedBoundaries.some(
        (boundary) => source.includes(boundary),
      ),
      true,
      `${file} must use one of its reviewed authentication boundaries: ${acceptedBoundaries.join(", ")}`,
    );
    assert.doesNotMatch(
      source,
      /createRouteMatcher/,
      `${file} must not depend on path-level authorization`,
    );
  }
});
