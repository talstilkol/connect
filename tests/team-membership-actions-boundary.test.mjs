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

test("composes team mutations through the protected tenant session", async () => {
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
    /requireCurrentTenantMutationSession/,
  );
  assert.match(
    source,
    /createTenantMembershipMutationRepository/,
  );
  assert.match(
    source,
    /createTeamMembershipMutationService/,
  );
  assert.doesNotMatch(
    source,
    /requireCurrentTenantSession/,
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
