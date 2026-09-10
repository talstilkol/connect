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
  expiresAt?: string;
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
    }
  | {
      status: "deferred";
      retryAfterSeconds: number;
    };

export interface TeamInvitationProviderLookupCommand {
  requestKey: string;
  tenantId: number;
}

export type TeamInvitationProviderLookupResult =
  | {
      status: "submitted";
    }
  | {
      status: "not-found";
    }
  | {
      status: "unavailable";
    };

export interface TeamInvitationProvider {
  isConfigured(): boolean;
  invite(
    command:
      TeamInvitationProviderCommand,
  ): Promise<unknown>;
  lookup(
    command:
      TeamInvitationProviderLookupCommand,
  ): Promise<unknown>;
}

export function createUnavailableTeamInvitationProvider():
TeamInvitationProvider {
  return {
    isConfigured() {
      return false;
    },
    async invite() {
      return {
        status: "unavailable",
      };
    },
    async lookup() {
      return {
        status: "unavailable",
      };
    },
  };
}
