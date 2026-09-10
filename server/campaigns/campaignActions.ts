"use server";

import { createCurrentRailwayCampaignHandler } from "./currentRailwayCampaignHandler.ts";
import type {
  ActivateCampaignActionResult,
  ControlCampaignActionResult,
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

export async function controlCampaignAction(input: unknown): Promise<ControlCampaignActionResult> {
  return createCurrentRailwayCampaignHandler().control(input);
}

export async function refreshCampaignDirectoryAction() {
  return createCurrentRailwayCampaignHandler().readCurrent();
}
