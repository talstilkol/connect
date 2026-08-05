import type {
  TenantRole,
  UserId,
} from "../../shared/domain/model.ts";
import {
  teamMembershipStatuses,
  type TeamMembershipStatus,
} from "../../shared/domain/teamMembership.ts";

const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const memberKeyPattern =
  /^team_member_v1_[0-9a-f]{64}$/;
const tenantRoles:
  readonly TenantRole[] = [
    "owner",
    "manager",
    "agent",
    "viewer",
  ];

export function requireTeamTenantId(
  value: unknown,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) <= 0
  ) {
    throw new Error(
      "team tenant ID is invalid",
    );
  }

  return Number(value);
}

export function requireTeamMembershipVersion(
  value: unknown,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) <= 0
  ) {
    throw new Error(
      "team membership version is invalid",
    );
  }

  return Number(value);
}

export function requireTeamExternalUserId(
  value: unknown,
): UserId {
  if (typeof value !== "string") {
    throw new Error(
      "team external user ID is invalid",
    );
  }

  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 512 ||
    normalized !== value ||
    /[\u0000-\u001f\u007f]/.test(
      normalized,
    )
  ) {
    throw new Error(
      "team external user ID is invalid",
    );
  }

  return normalized as UserId;
}

export function requireTeamRole(
  value: unknown,
): TenantRole {
  if (
    typeof value !== "string" ||
    !tenantRoles.some(
      (role) => role === value,
    )
  ) {
    throw new Error(
      "team membership role is invalid",
    );
  }

  return value as TenantRole;
}

export function requireFormerOwnerRole(
  value: unknown,
): Exclude<TenantRole, "owner"> {
  const role = requireTeamRole(value);

  if (role === "owner") {
    throw new Error(
      "former owner role is invalid",
    );
  }

  return role;
}

export function requireTeamMembershipStatus(
  value: unknown,
): TeamMembershipStatus {
  if (
    typeof value !== "string" ||
    !teamMembershipStatuses.some(
      (status) => status === value,
    )
  ) {
    throw new Error(
      "team membership status is invalid",
    );
  }

  return value as TeamMembershipStatus;
}

export function requireTeamTimestamp(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !canonicalTimestampPattern.test(
      value,
    )
  ) {
    throw new Error(
      "team membership timestamp is invalid",
    );
  }

  const milliseconds = Date.parse(value);

  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !==
      value
  ) {
    throw new Error(
      "team membership timestamp is invalid",
    );
  }

  return value;
}

export function requireTeamMemberKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !memberKeyPattern.test(value)
  ) {
    throw new Error(
      "team member key is invalid",
    );
  }

  return value;
}
