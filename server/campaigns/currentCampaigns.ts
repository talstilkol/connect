import { createCurrentRailwayCampaignHandler } from "./currentRailwayCampaignHandler.ts";
import type {
  RailwayCurrentCampaignsResult,
} from "./railwayCampaignHandler.ts";

export type CurrentCampaignsResult = RailwayCurrentCampaignsResult;

export async function readCurrentCampaigns():
Promise<CurrentCampaignsResult> {
  return createCurrentRailwayCampaignHandler().readCurrent();
}
