"use server";

import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
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
  createUnavailableTeamInvitationProvider,
} from "./teamInvitationProvider.ts";
import {
  createTeamInvitationService,
} from "./teamInvitationService.ts";

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

        return {
          session,
          service:
            createTeamInvitationService(
              createUnavailableTeamInvitationProvider(),
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
