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
  createClerkTeamInvitationIdentityContext,
} from "./clerkTeamInvitationIdentityVerifier.ts";
import {
  inspectTeamInvitationAcceptanceActivation,
} from "./teamInvitationAcceptanceActivation.ts";
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
        inspectTeamInvitationAcceptanceActivation()
          .status === "ready",
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

export async function acceptTeamInvitationFromPageAction(
  invitationKey: unknown,
  _previousResult:
    TeamInvitationAcceptanceActionResult | null,
  formData: FormData,
): Promise<TeamInvitationAcceptanceActionResult> {
  if (
    !(formData instanceof FormData) ||
    [...formData.keys()].length !== 0
  ) {
    return {
      status: "invalid-input",
    };
  }

  return acceptTeamInvitationAction({
    invitationKey,
  });
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
