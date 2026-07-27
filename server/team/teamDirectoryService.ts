import {
  createHash,
} from "node:crypto";

import type {
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import type {
  TeamDirectoryView,
  TeamMemberView,
} from "../../shared/domain/teamDirectoryView.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";

const memberKeyPattern =
  /^team_member_v1_[a-f0-9]{64}$/;

function deriveMemberKey(
  session: TenantSession,
  externalUserId: string,
): string {
  return `team_member_v1_${createHash(
    "sha256",
  )
    .update(
      JSON.stringify({
        purpose:
          "team-member-reference",
        tenantId: session.tenantId,
        externalUserId,
      }),
    )
    .digest("hex")}`;
}

function toMemberView(
  session: TenantSession,
  externalUserId: string,
  role: TeamMemberView["role"],
): TeamMemberView {
  const memberKey =
    deriveMemberKey(
      session,
      externalUserId,
    );

  if (
    !memberKeyPattern.test(memberKey)
  ) {
    throw new Error(
      "The derived team member key is invalid",
    );
  }

  return {
    memberKey,
    referenceCode: memberKey
      .slice(-12)
      .toUpperCase(),
    role,
    currentUser:
      externalUserId ===
      session.externalUserId,
  };
}

export interface TeamDirectoryService {
  list(
    session: TenantSession,
  ): Promise<TeamDirectoryView>;
}

export function createTeamDirectoryService(
  memberships:
    TenantMembershipRepository,
): TeamDirectoryService {
  return {
    async list(session) {
      requireTenantPermission(
        session,
        "team.manage",
      );
      const members =
        await memberships
          .findActiveByTenantId(
            session.tenantId,
          );

      if (
        members.some(
          (membership) =>
            membership.tenantId !==
              session.tenantId ||
            membership.tenantStatus !==
              session.status,
        )
      ) {
        throw new Error(
          "D1 returned a cross-tenant or stale team member",
        );
      }

      const views = members.map(
        (membership) =>
          toMemberView(
            session,
            membership.externalUserId,
            membership.role,
          ),
      );
      const currentUserCount =
        views.filter(
          (member) =>
            member.currentUser,
        ).length;

      if (currentUserCount !== 1) {
        throw new Error(
          "The current tenant member is missing or duplicated",
        );
      }

      return {
        members: views,
      };
    },
  };
}
