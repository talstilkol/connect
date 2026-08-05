"use server";

import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  createTeamInvitationRepository,
} from "../../db/teamInvitationRepository.ts";
import type {
  TeamInvitationActionResult,
} from "../../shared/domain/teamInvitationView.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import {
  createTeamInvitationActionHandler,
} from "./teamInvitationActionHandler.ts";
import {
  requireTeamInvitationPolicy,
} from "./teamInvitationPolicy.ts";
import {
  requireRuntimeTeamInvitationPublisher,
} from "./teamInvitationQueueRuntime.ts";
import {
  createTeamInvitationRequestService,
} from "./teamInvitationRequestService.ts";

function createActionHandler() {
  return createTeamInvitationActionHandler(
    {
      applicationConfigured: () =>
        inspectClerkConfiguration()
          .status === "configured",
      async createContext() {
        const database =
          await requireRuntimeDatabase();
        const session =
          await requireCurrentTenantMutationSession(
            database,
          );
        const publisher =
          await requireRuntimeTeamInvitationPublisher();

        return {
          session,
          service:
            createTeamInvitationRequestService(
              createTeamInvitationRepository(
                database,
              ),
              publisher,
              requireTeamInvitationPolicy(),
            ),
        };
      },
    },
  );
}

export async function inviteTeamMemberAction(
  input: unknown,
): Promise<TeamInvitationActionResult> {
  try {
    return await createActionHandler()
      .invite(input);
  } catch {
    return {
      status: "server-error",
    };
  }
}
