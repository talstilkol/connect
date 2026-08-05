import type {
  TeamInvitationDeliveryStatus,
  TeamInvitationRole,
  TeamInvitationStatus,
} from "../../shared/domain/teamInvitation.ts";
import {
  teamInvitationDeliveryStatuses,
  teamInvitationStatuses,
} from "../../shared/domain/teamInvitation.ts";

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

  return value as TeamInvitationRole;
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

export function requireTeamInvitationKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !/^team_invitation_v1_[0-9a-f]{64}$/.test(
      value,
    )
  ) {
    throw new Error(
      "team invitation key is invalid",
    );
  }

  return value;
}

export function requireTeamInvitationOperationKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !/^team_invitation_operation_v1_[0-9a-f]{64}$/.test(
      value,
    )
  ) {
    throw new Error(
      "team invitation operation key is invalid",
    );
  }

  return value;
}

export function requireTeamInvitationEventKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !/^team_invitation_event_v1_[0-9a-f]{64}$/.test(
      value,
    )
  ) {
    throw new Error(
      "team invitation event key is invalid",
    );
  }

  return value;
}

export function requireTeamInvitationAcceptanceKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !/^team_invitation_acceptance_v1_[0-9a-f]{64}$/.test(
      value,
    )
  ) {
    throw new Error(
      "team invitation acceptance key is invalid",
    );
  }

  return value;
}

export function requireTeamInvitationStatus(
  value: unknown,
): TeamInvitationStatus {
  if (
    typeof value !== "string" ||
    !teamInvitationStatuses.some(
      (status) => status === value,
    )
  ) {
    throw new Error(
      "team invitation status is invalid",
    );
  }

  return value as
    TeamInvitationStatus;
}

export function requireTeamInvitationDeliveryKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !/^team_invitation_delivery_v1_[0-9a-f]{64}$/.test(
      value,
    )
  ) {
    throw new Error(
      "team invitation delivery key is invalid",
    );
  }

  return value;
}

export function requireTeamInvitationDeliveryStatus(
  value: unknown,
): TeamInvitationDeliveryStatus {
  if (
    typeof value !== "string" ||
    !teamInvitationDeliveryStatuses.some(
      (status) => status === value,
    )
  ) {
    throw new Error(
      "team invitation delivery status is invalid",
    );
  }

  return value as
    TeamInvitationDeliveryStatus;
}

export function requireTeamInvitationDeliveryErrorCode(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !/^[A-Z0-9_]{1,100}$/.test(
      value,
    )
  ) {
    throw new Error(
      "team invitation delivery error code is invalid",
    );
  }

  return value;
}
