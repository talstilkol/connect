import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  requireTeamInvitationEmail,
  requireTeamInvitationKey,
} from "./teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
  requireTeamMembershipVersion,
  requireTeamTenantId,
} from "./teamMembershipValidation.ts";

export async function deriveTeamInvitationAcceptanceKey(
  input: {
    tenantId: unknown;
    invitationKey: unknown;
    expectedVersion: unknown;
    externalUserId: unknown;
    verifiedEmail: unknown;
  },
): Promise<string> {
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "team_invitation_acceptance_v1",
        tenantId:
          requireTeamTenantId(
            input.tenantId,
          ),
        invitationKey:
          requireTeamInvitationKey(
            input.invitationKey,
          ),
        expectedVersion:
          requireTeamMembershipVersion(
            input.expectedVersion,
          ),
        externalUserId:
          requireTeamExternalUserId(
            input.externalUserId,
          ),
        verifiedEmail:
          requireTeamInvitationEmail(
            input.verifiedEmail,
          ),
      }),
    ),
  );

  return `team_invitation_acceptance_v1_${digest}`;
}
