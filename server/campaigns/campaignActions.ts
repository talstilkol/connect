"use server";

import { createCurrentRailwayCampaignHandler } from "./currentRailwayCampaignHandler.ts";
import type {
  ActivateCampaignActionResult,
  SaveCampaignSnapshotActionResult,
} from "./campaignActionResult.ts";

export async function saveCampaignSnapshotAction(
  input: unknown,
): Promise<SaveCampaignSnapshotActionResult> {
  return createCurrentRailwayCampaignHandler().saveSnapshot(input);
}

export async function activateCampaignAction(
  input: unknown,
): Promise<ActivateCampaignActionResult> {
  return createCurrentRailwayCampaignHandler().activate(input);
}
