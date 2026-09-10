"use server";

import type {
  SystemAdminProductionDecisionActionResult,
} from "./systemAdminProductionDecisionActionResult.ts";
import {
  createCurrentRailwaySystemAdminProductionDecisionHandler,
} from "./currentRailwaySystemAdminProductionDecisionHandler.ts";

export async function saveSystemAdminProductionDecisionAction(
  input: unknown,
): Promise<SystemAdminProductionDecisionActionResult> {
  try {
    return await createCurrentRailwaySystemAdminProductionDecisionHandler()
      .save(input);
  } catch {
    return { status: "server-error" };
  }
}
