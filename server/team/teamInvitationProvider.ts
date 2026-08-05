import type {
  TenantRole,
  UserId,
} from "../../shared/domain/model.ts";

export type TeamInvitationRole =
  Exclude<TenantRole, "owner">;

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
