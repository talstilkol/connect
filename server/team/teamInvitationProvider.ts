import type {
  UserId,
} from "../../shared/domain/model.ts";
import type {
  TeamInvitationRole,
} from "../../shared/domain/teamInvitation.ts";

export type {
  TeamInvitationRole,
} from "../../shared/domain/teamInvitation.ts";

export interface TeamInvitationProviderCommand {
  requestKey: string;
  tenantId: number;
  inviterExternalUserId: UserId;
  email: string;
  role: TeamInvitationRole;
  requestedAt: string;
}

export type TeamInvitationProviderResult =
  | {
      status: "submitted";
    }
  | {
      status: "already-pending";
    }
  | {
      status: "unavailable";
    };

export interface TeamInvitationProvider {
  invite(
    command:
      TeamInvitationProviderCommand,
  ): Promise<unknown>;
}

export function createUnavailableTeamInvitationProvider():
TeamInvitationProvider {
  return {
    async invite() {
      return {
        status: "unavailable",
      };
    },
  };
}
