import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  requireTeamTenantId,
} from "./teamMembershipValidation.ts";
import {
  requireTeamInvitationEmail,
} from "./teamInvitationValidation.ts";

export async function deriveTeamInvitationRequestKey(
  input: {
    tenantId: unknown;
    email: unknown;
  },
): Promise<string> {
  const tenantId =
    requireTeamTenantId(
      input.tenantId,
    );
  const email =
    requireTeamInvitationEmail(
      input.email,
    );
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "team_invitation_request_v1",
        tenantId,
        email,
      }),
    ),
  );

  return `team_invitation_request_v1_${digest}`;
}
