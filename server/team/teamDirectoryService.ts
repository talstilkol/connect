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
import type {
  TeamIdentityDirectory,
  TeamIdentityDisplay,
} from "./teamIdentityDirectory.ts";

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
  version: number,
  identity:
    TeamIdentityDisplay | null,
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
    displayName:
      identity?.displayName ??
      null,
    primaryEmail:
      identity?.primaryEmail ??
      null,
    role,
    version,
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

interface TeamDirectoryServiceDependencies {
  identities:
    TeamIdentityDirectory;
  memberships:
    TenantMembershipRepository;
}

function normalizeIdentityText(
  value: string,
  fieldName: string,
  maximumLength: number,
): string {
  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length >
      maximumLength ||
    /[\u0000-\u001f\u007f]/.test(
      normalized,
    )
  ) {
    throw new Error(
      `The identity ${fieldName} is invalid`,
    );
  }

  return normalized;
}

function normalizeIdentity(
  identity:
    TeamIdentityDisplay,
): TeamIdentityDisplay {
  const externalUserId =
    normalizeIdentityText(
      identity.externalUserId,
      "external user ID",
      512,
    );
  const displayName =
    normalizeIdentityText(
      identity.displayName,
      "display name",
      160,
    );
  const primaryEmail =
    normalizeIdentityText(
      identity.primaryEmail,
      "primary email",
      320,
    );

  if (
    /\s/.test(primaryEmail) ||
    !/^[^@]+@[^@]+$/.test(
      primaryEmail,
    )
  ) {
    throw new Error(
      "The identity primary email is invalid",
    );
  }

  return {
    externalUserId:
      externalUserId as
        TeamIdentityDisplay["externalUserId"],
    displayName,
    primaryEmail,
  };
}

export function createTeamDirectoryService(
  dependencies:
    TeamDirectoryServiceDependencies,
): TeamDirectoryService {
  return {
    async list(session) {
      requireTenantPermission(
        session,
        "team.manage",
      );
      const members =
        await dependencies.memberships
          .findActiveByTenantId(
            session.tenantId,
          );

      if (
        members.length > 100 ||
        new Set(
          members.map(
            (membership) =>
              membership.externalUserId,
          ),
        ).size !== members.length ||
        members.some(
          (membership) =>
            membership.tenantId !==
              session.tenantId ||
            membership.tenantStatus !==
              session.status ||
            !Number.isSafeInteger(
              membership.version,
            ) ||
            membership.version <= 0,
        )
      ) {
        throw new Error(
          "D1 returned an invalid, duplicate, cross-tenant, or stale team member",
        );
      }

      const currentUserCount =
        members.filter(
          (membership) =>
            membership.externalUserId ===
            session.externalUserId,
        ).length;

      if (currentUserCount !== 1) {
        throw new Error(
          "The current tenant member is missing or duplicated",
        );
      }

      const identityResult =
        await dependencies.identities
          .resolve(
            members.map(
              (membership) =>
                membership.externalUserId,
            ),
          );
      let identities:
        readonly TeamIdentityDisplay[];

      switch (identityResult.status) {
        case "ready":
          identities =
            identityResult.identities.map(
              normalizeIdentity,
            );
          break;
        case "unavailable":
          if (
            identityResult.identities
              .length !== 0
          ) {
            throw new Error(
              "The unavailable identity directory returned profile data",
            );
          }
          identities = [];
          break;
        default:
          throw new Error(
            "The identity directory returned an unsupported status",
          );
      }
      const memberIdentityIds =
        new Set(
          members.map(
            (membership) =>
              membership.externalUserId,
          ),
        );
      const identityIds =
        new Set(
          identities.map(
            (identity) =>
              identity.externalUserId,
          ),
        );
      const identityById =
        new Map(
          identities.map(
            (identity) => [
              identity.externalUserId,
              identity,
            ],
          ),
        );

      if (
        identityResult.status === "ready" &&
        (identities.length !==
          members.length ||
          identityIds.size !==
            identities.length ||
          identities.some(
            (identity) =>
              !memberIdentityIds.has(
                identity.externalUserId,
              ),
          ))
      ) {
        throw new Error(
          "The identity directory returned an incomplete or foreign team profile",
        );
      }

      return {
        identityStatus:
          identityResult.status,
        members: members.map(
          (membership) =>
            toMemberView(
              session,
              membership.externalUserId,
              membership.role,
              membership.version,
              identityById.get(
                membership.externalUserId,
              ) ?? null,
            ),
        ),
      };
    },
  };
}
