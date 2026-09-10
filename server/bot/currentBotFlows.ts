import type {
  RailwayCurrentBotFlowsResult,
} from "./railwayBotFlowHandler.ts";
import {
  createCurrentRailwayBotFlowHandler,
} from "./currentRailwayBotFlowHandler.ts";

export type CurrentBotFlowsResult = RailwayCurrentBotFlowsResult;

export async function readCurrentBotFlows():
Promise<CurrentBotFlowsResult> {
  return createCurrentRailwayBotFlowHandler().readCurrent();
}
