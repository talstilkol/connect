import type {
  TeamMembership,
} from "../../shared/domain/teamMembership.ts";
import type {
  TeamMembershipMutationView,
} from "../../shared/domain/teamMembershipMutationView.ts";
import type {
  TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveTeamMemberKey,
} from "./teamMemberKey.ts";
import {
  requireTeamMembershipStatus,
  requireTeamMembershipVersion,
  requireTeamRole,
} from "./teamMembershipValidation.ts";

export function toTeamMembershipMutationView(
  session: TenantSession,
  membership: TeamMembership,
): TeamMembershipMutationView {
  if (
    membership.tenantId !==
      session.tenantId
  ) {
    throw new Error(
      "The team membership mutation result is invalid",
    );
  }

  const role =
    requireTeamRole(
      membership.role,
    );
  const status =
    requireTeamMembershipStatus(
      membership.status,
    );
  const version =
    requireTeamMembershipVersion(
      membership.version,
    );

  return {
    memberKey:
      deriveTeamMemberKey(
        session.tenantId,
        membership.externalUserId,
      ),
    role,
    status,
    version,
  };
}
