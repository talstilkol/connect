import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

async function readSource(path) {
  return readFile(
    new URL(
      `../${path}`,
      import.meta.url,
    ),
    "utf8",
  );
}

test("routes team mutations through Railway without D1 fallback", async () => {
  const source =
    await readSource(
      "server/team/teamMembershipActions.ts",
    );

  assert.match(
    source,
    /^"use server";/,
  );
  assert.match(
    source,
    /createCurrentRailwayTeamMembershipHandler/,
  );
  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createTenantMembershipMutationRepository|createTeamMembershipMutationService/,
  );
});

test("connects team controls only through server actions and opaque membership keys", async () => {
  const [
    component,
    view,
  ] = await Promise.all([
    readSource(
      "features/team/TeamManagement.tsx",
    ),
    readSource(
      "shared/domain/teamMembershipMutationView.ts",
    ),
  ]);

  assert.match(component, /changeTeamMemberRoleAction/);
  assert.match(component, /changeTeamMemberStatusAction/);
  assert.match(component, /transferTeamOwnershipAction/);
  assert.doesNotMatch(component, /\bexternalUserId\b|\btenantId\b|localStorage|sessionStorage/);
  assert.doesNotMatch(
    view,
    /tenantId|externalUserId|actorExternalUserId|eventKey|operationKey/,
  );
});
