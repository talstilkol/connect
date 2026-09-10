"use server";

import type {
  TeamMembershipActionResult,
  TeamOwnerTransferActionResult,
} from "../../shared/domain/teamMembershipMutationView.ts";
import {
  createCurrentRailwayTeamMembershipHandler,
} from "./currentRailwayTeamMembershipHandler.ts";

export async function changeTeamMemberRoleAction(
  input: unknown,
): Promise<TeamMembershipActionResult> {
  try {
    return await createCurrentRailwayTeamMembershipHandler()
      .changeRole(input);
  } catch {
    return { status: "server-error" };
  }
}

export async function changeTeamMemberStatusAction(
  input: unknown,
): Promise<TeamMembershipActionResult> {
  try {
    return await createCurrentRailwayTeamMembershipHandler()
      .changeStatus(input);
  } catch {
    return { status: "server-error" };
  }
}

export async function transferTeamOwnershipAction(
  input: unknown,
): Promise<TeamOwnerTransferActionResult> {
  try {
    return await createCurrentRailwayTeamMembershipHandler()
      .transferOwner(input);
  } catch {
    return { status: "server-error" };
  }
}
