import type { RailwayCurrentAiAgentsResult } from "./railwayAiAgentHandler.ts";
import { createCurrentRailwayAiAgentHandler } from
  "./currentRailwayAiAgentHandler.ts";

export type CurrentAiAgentsResult = RailwayCurrentAiAgentsResult;

export async function readCurrentAiAgents():
Promise<CurrentAiAgentsResult> {
  return createCurrentRailwayAiAgentHandler().readCurrent();
}
