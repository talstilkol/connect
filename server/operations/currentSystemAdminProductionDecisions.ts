import type {
  CurrentSystemAdminProductionDecisions,
} from "../../shared/domain/productionDecisionRecord.ts";
import {
  createCurrentRailwaySystemAdminProductionDecisionHandler,
} from "./currentRailwaySystemAdminProductionDecisionHandler.ts";

export async function readCurrentSystemAdminProductionDecisions():
  Promise<CurrentSystemAdminProductionDecisions> {
  try {
    return await createCurrentRailwaySystemAdminProductionDecisionHandler()
      .read();
  } catch {
    return {
      status: "server-error",
      records: [],
    };
  }
}
