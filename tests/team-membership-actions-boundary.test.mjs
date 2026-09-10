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

test("keeps team mutation actions outside the read-only React surface", async () => {
  const [
    component,
    view,
  ] = await Promise.all([
    readSource(
      "features/team/TeamDirectory.tsx",
    ),
    readSource(
      "shared/domain/teamMembershipMutationView.ts",
    ),
  ]);

  assert.doesNotMatch(
    component,
    /teamMembershipActions|changeTeamMember|transferTeamOwnership/,
  );
  assert.doesNotMatch(
    view,
    /tenantId|externalUserId|actorExternalUserId|eventKey|operationKey/,
  );
});
