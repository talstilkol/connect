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

test("composes invitations through a protected fail-closed server action", async () => {
  const source =
    await readSource(
      "server/team/teamInvitationActions.ts",
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
    /createTeamInvitationRepository/,
  );
  assert.match(
    source,
    /createTeamInvitationRequestService/,
  );
  assert.match(
    source,
    /requireRuntimeTeamInvitationPublisher/,
  );
  assert.match(
    source,
    /requireTeamInvitationPolicy/,
  );
  assert.doesNotMatch(
    source,
    /createUnavailableTeamInvitationProvider|createTeamInvitationService/,
  );
  assert.doesNotMatch(
    source,
    /requireCurrentTenantSession/,
  );
});

test("keeps invitation actions and sensitive identities outside React", async () => {
  const [
    component,
    view,
  ] = await Promise.all([
    readSource(
      "features/team/TeamDirectory.tsx",
    ),
    readSource(
      "shared/domain/teamInvitationView.ts",
    ),
  ]);

  assert.doesNotMatch(
    component,
    /teamInvitationActions|inviteTeamMemberAction|teamInvitationAcceptanceActions|acceptTeamInvitationAction/,
  );
  assert.doesNotMatch(
    view,
    /email|tenantId|externalUserId|requestKey/,
  );
});

test("accepts invitations only through the verified Clerk server boundary", async () => {
  const [
    action,
    identity,
  ] = await Promise.all([
    readSource(
      "server/team/teamInvitationAcceptanceActions.ts",
    ),
    readSource(
      "server/team/clerkTeamInvitationIdentityVerifier.ts",
    ),
  ]);

  assert.match(
    action,
    /^"use server";/,
  );
  assert.match(
    action,
    /createTeamInvitationAcceptanceRepository/,
  );
  assert.match(
    action,
    /createTeamInvitationAcceptanceService/,
  );
  assert.match(
    action,
    /createClerkTeamInvitationIdentityContext/,
  );
  assert.doesNotMatch(
    action,
    /requireCurrentTenantSession|requireCurrentTenantMutationSession/,
  );
  assert.match(
    identity,
    /verification[\s\S]*status !== "verified"/,
  );
  assert.match(
    identity,
    /enforceCurrentTenantMutationRateLimit/,
  );
});
