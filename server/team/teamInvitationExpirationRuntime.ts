import {
  createTeamInvitationExpirationRepository,
} from "../../db/teamInvitationExpirationRepository.ts";
import {
  createTeamInvitationRepository,
} from "../../db/teamInvitationRepository.ts";
import {
  requireDatabase,
  type DatabaseEnvironment,
} from "../../db/d1.ts";
import {
  createTeamInvitationExpirationScheduler,
  type TeamInvitationExpirationSchedulerResult,
} from "./teamInvitationExpirationScheduler.ts";

export function createTeamInvitationExpirationScheduledHandler(
  environment:
    DatabaseEnvironment,
  scheduledTime: number,
): {
  run():
    Promise<TeamInvitationExpirationSchedulerResult>;
} {
  const database =
    requireDatabase(environment);

  return createTeamInvitationExpirationScheduler(
    createTeamInvitationExpirationRepository(
      database,
    ),
    createTeamInvitationRepository(
      database,
    ),
    {
      now() {
        return new Date(
          scheduledTime,
        );
      },
    },
  );
}
