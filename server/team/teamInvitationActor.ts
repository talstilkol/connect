import type {
  TeamInvitationActor,
  TeamInvitationActorKind,
  TeamInvitationSystemActorId,
} from "../../shared/domain/teamInvitation.ts";
import {
  teamInvitationActorKinds,
  teamInvitationSystemActorIds,
} from "../../shared/domain/teamInvitation.ts";
import {
  requireTeamExternalUserId,
} from "./teamMembershipValidation.ts";

export function requireTeamInvitationActorKind(
  value: unknown,
): TeamInvitationActorKind {
  if (
    typeof value !== "string" ||
    !teamInvitationActorKinds.some(
      (kind) => kind === value,
    )
  ) {
    throw new Error(
      "team invitation actor kind is invalid",
    );
  }

  return value as
    TeamInvitationActorKind;
}

export function requireTeamInvitationSystemActorId(
  value: unknown,
): TeamInvitationSystemActorId {
  if (
    typeof value !== "string" ||
    !teamInvitationSystemActorIds.some(
      (actorId) => actorId === value,
    )
  ) {
    throw new Error(
      "team invitation system actor ID is invalid",
    );
  }

  return value as
    TeamInvitationSystemActorId;
}

export function requireTeamInvitationActor(
  input: {
    actorExternalUserId?: unknown;
    systemActorId?: unknown;
  },
): TeamInvitationActor {
  const hasUserActor =
    input.actorExternalUserId !==
    undefined;
  const hasSystemActor =
    input.systemActorId !==
    undefined;

  if (
    hasUserActor ===
    hasSystemActor
  ) {
    throw new Error(
      "team invitation actor is invalid",
    );
  }

  return hasUserActor
    ? {
        kind: "user",
        id:
          requireTeamExternalUserId(
            input.actorExternalUserId,
          ),
      }
    : {
        kind: "system",
        id:
          requireTeamInvitationSystemActorId(
            input.systemActorId,
          ),
      };
}

export function requireStoredTeamInvitationActor(
  kindInput: unknown,
  idInput: unknown,
): TeamInvitationActor {
  const kind =
    requireTeamInvitationActorKind(
      kindInput,
    );

  return kind === "user"
    ? {
        kind,
        id:
          requireTeamExternalUserId(
            idInput,
          ),
      }
    : {
        kind,
        id:
          requireTeamInvitationSystemActorId(
            idInput,
          ),
      };
}
