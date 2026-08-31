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

test("routes invitation requests through the protected Railway boundary", async () => {
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
    /createCurrentRailwayTeamInvitationRequestHandler/,
  );
  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createTeamInvitationRepository|requireRuntimeTeamInvitationPublisher|requireTeamInvitationPolicy/,
  );
  assert.doesNotMatch(
    source,
    /requireCurrentTenantSession|createUnavailableTeamInvitationProvider/,
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

test("accepts invitations only through the protected Railway boundary", async () => {
  const [
    action,
    identity,
  ] = await Promise.all([
    readSource(
      "server/team/teamInvitationAcceptanceActions.ts",
    ),
    readSource(
      "server/platform/clerkRailwayTeamInvitationIdentityResolver.ts",
    ),
  ]);

  assert.match(
    action,
    /^"use server";/,
  );
  assert.match(
    action,
    /createCurrentRailwayTeamInvitationAcceptanceHandler/,
  );
  assert.match(
    action,
    /formData instanceof FormData/,
  );
  assert.doesNotMatch(
    action,
    /requireRuntimeDatabase|createTeamInvitationAcceptanceRepository|createTeamInvitationAcceptanceService|createClerkTeamInvitationIdentityContext|requireCurrentTenantSession|requireCurrentTenantMutationSession/,
  );
  assert.match(
    identity,
    /verification[\s\S]*status !== "verified"/,
  );
  assert.match(
    identity,
    /client\.users\.getUser/,
  );
});

test("keeps the invitation landing route private and activation-gated", async () => {
  const [source, form, presentation] =
    await Promise.all([
      readSource(
        "app/invite/[invitationKey]/page.tsx",
      ),
      readSource(
        "app/invite/[invitationKey]/InvitationAcceptanceForm.tsx",
      ),
      readSource(
        "shared/i18n/invitation.ts",
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
    /readInvitationResultMessage\(language, result\)/,
  );
  for (const status of [
    "accepted",
    "already-accepted",
    "sign-in-required",
    "identity-verification-required",
    "invitation-unavailable",
    "invalid-input",
    "temporarily-unavailable",
    "configuration-required",
    "server-error",
  ]) {
    assert.match(
      presentation,
      new RegExp(`(?:"${status}"|${status}):`),
    );
  }
  for (const focusReference of [
    "skip-link",
    "brand-link",
    "accept-button",
    "home-link",
  ]) {
    assert.match(
      `${source}\n${form}`,
      new RegExp(
        `data-e2e-focus-ref="${focusReference}"`,
      ),
    );
  }
  assert.doesNotMatch(
    form,
    /invitationKey|email"|tenantId|externalUserId|type="hidden"/,
  );
});
