import type {
  TenantRole,
} from "../../shared/domain/model.ts";
import type {
  TeamInvitationRole,
} from "./teamInvitationProvider.ts";

const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invitationRequestKeyPattern =
  /^team_invitation_request_v1_[0-9a-f]{64}$/;
const invitationRoles:
  readonly TeamInvitationRole[] = [
    "manager",
    "agent",
    "viewer",
  ];

export function requireTeamInvitationEmail(
  value: unknown,
): string {
  if (typeof value !== "string") {
    throw new Error(
      "team invitation email is invalid",
    );
  }

  const normalized =
    value.trim().toLowerCase();

  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !emailPattern.test(normalized) ||
    /[\u0000-\u001f\u007f]/.test(
      normalized,
    )
  ) {
    throw new Error(
      "team invitation email is invalid",
    );
  }

  const [
    localPart,
    domain,
  ] = normalized.split("@");

  if (
    localPart.length > 64 ||
    domain.length > 253 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..")
  ) {
    throw new Error(
      "team invitation email is invalid",
    );
  }

  return normalized;
}

export function requireTeamInvitationRole(
  value: unknown,
): TeamInvitationRole {
  if (
    typeof value !== "string" ||
    !invitationRoles.some(
      (role) => role === value,
    )
  ) {
    throw new Error(
      "team invitation role is invalid",
    );
  }

  return value as Exclude<
    TenantRole,
    "owner"
  >;
}

export function requireTeamInvitationRequestKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !invitationRequestKeyPattern.test(
      value,
    )
  ) {
    throw new Error(
      "team invitation request key is invalid",
    );
  }

  return value;
}
