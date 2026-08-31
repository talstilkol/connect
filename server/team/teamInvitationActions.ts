"use server";

import type {
  TeamInvitationActionResult,
} from "../../shared/domain/teamInvitationView.ts";
import {
  createCurrentRailwayTeamInvitationRequestHandler,
} from "./currentRailwayTeamInvitationRequestHandler.ts";

export async function inviteTeamMemberAction(
  input: unknown,
): Promise<TeamInvitationActionResult> {
  try {
    return await createCurrentRailwayTeamInvitationRequestHandler()
      .invite(input);
  } catch {
    return {
      status: "server-error",
    };
  }
}
