"use server";

import type {
  TeamInvitationAcceptanceActionResult,
} from "../../shared/domain/teamInvitationView.ts";
import {
  createCurrentRailwayTeamInvitationAcceptanceHandler,
} from "./currentRailwayTeamInvitationAcceptanceHandler.ts";

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
    return await createCurrentRailwayTeamInvitationAcceptanceHandler()
      .accept(input);
  } catch {
    return {
      status: "server-error",
    };
  }
}
