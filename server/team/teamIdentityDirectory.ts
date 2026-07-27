import type {
  UserId,
} from "../../shared/domain/model.ts";

export interface TeamIdentityDisplay {
  externalUserId: UserId;
  displayName: string;
  primaryEmail: string;
}

export type TeamIdentityDirectoryResult =
  | {
      status: "ready";
      identities:
        readonly TeamIdentityDisplay[];
    }
  | {
      status: "unavailable";
      identities: readonly [];
    };

export interface TeamIdentityDirectory {
  resolve(
    externalUserIds:
      readonly UserId[],
  ): Promise<TeamIdentityDirectoryResult>;
}

export function createUnavailableTeamIdentityDirectory():
TeamIdentityDirectory {
  return {
    async resolve() {
      return {
        status: "unavailable",
        identities: [],
      };
    },
  };
}
