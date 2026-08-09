"use server";

import {
  createTeamInvitationAcceptanceRepository,
} from "../../db/teamInvitationAcceptanceRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  TeamInvitationAcceptanceActionResult,
} from "../../shared/domain/teamInvitationView.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  createClerkTeamInvitationIdentityContext,
} from "./clerkTeamInvitationIdentityVerifier.ts";
import {
  createTeamInvitationAcceptanceActionHandler,
} from "./teamInvitationAcceptanceActionHandler.ts";
import {
  createTeamInvitationAcceptanceService,
} from "./teamInvitationAcceptanceService.ts";

function createActionHandler() {
  return createTeamInvitationAcceptanceActionHandler(
    {
      applicationConfigured: () =>
        inspectClerkConfiguration()
          .status === "configured",
      async createContext() {
        const database =
          await requireRuntimeDatabase();
        const identity =
          createClerkTeamInvitationIdentityContext();
        const service =
          createTeamInvitationAcceptanceService(
            createTeamInvitationAcceptanceRepository(
              database,
            ),
            identity.identityVerifier,
            {
              now: () =>
                new Date(),
            },
          );

        return {
          accept: (invitationKey) =>
            service.accept({
              invitationKey,
              proof:
                identity.proof,
            }),
        };
      },
    },
  );
}

export async function acceptTeamInvitationAction(
  input: unknown,
): Promise<TeamInvitationAcceptanceActionResult> {
  try {
    return await createActionHandler()
      .accept(input);
  } catch {
    return {
      status: "server-error",
    };
  }
}
