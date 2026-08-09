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
  assert.match(
    action,
    /inspectTeamInvitationAcceptanceActivation/,
  );
  assert.match(
    action,
    /formData instanceof FormData/,
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

test("keeps the invitation landing route private and activation-gated", async () => {
  const [source, form] =
    await Promise.all([
      readSource(
        "app/invite/[invitationKey]/page.tsx",
      ),
      readSource(
        "app/invite/[invitationKey]/InvitationAcceptanceForm.tsx",
      ),
    ]);

  assert.match(
    source,
    /robots:[\s\S]*index: false,[\s\S]*follow: false/,
  );
  assert.match(
    source,
    /referrer: "no-referrer"/,
  );
  assert.match(
    source,
    /aria-describedby="invitation-action-status"/,
  );
  assert.match(
    source,
    /inspectTeamInvitationAcceptanceActivation/,
  );
  assert.match(
    source,
    /acceptTeamInvitationFromPageAction\.bind/,
  );
  assert.doesNotMatch(
    source,
    /acceptTeamInvitationAction|requireRuntimeDatabase|currentUser/,
  );
  assert.match(
    form,
    /^"use client";/,
  );
  assert.match(
    form,
    /useActionState/,
  );
  assert.match(
    form,
    /data-invitation-status/,
  );
  assert.match(
    form,
    /case "sign-in-required"/,
  );
  assert.doesNotMatch(
    form,
    /invitationKey|email"|tenantId|externalUserId|type="hidden"/,
  );
});
