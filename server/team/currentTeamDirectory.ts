import type {
  TeamDirectoryStatus,
  TeamDirectoryView,
} from "../../shared/domain/teamDirectoryView.ts";
import {
  createCurrentRailwayTeamDirectoryHandler,
} from "./currentRailwayTeamDirectoryHandler.ts";

export type CurrentTeamDirectoryResult =
  | {
      status: "ready";
      directory:
        TeamDirectoryView;
    }
  | {
      status: Exclude<
        TeamDirectoryStatus,
        "ready"
      >;
      directory: {
        identityStatus:
          "unavailable";
        members: readonly [];
      };
    };

export async function readCurrentTeamDirectory():
Promise<CurrentTeamDirectoryResult> {
  try {
    return await createCurrentRailwayTeamDirectoryHandler().read();
  } catch {
    return {
      status: "server-error",
      directory: {
        identityStatus: "unavailable",
        members: [],
      },
    };
  }
}
