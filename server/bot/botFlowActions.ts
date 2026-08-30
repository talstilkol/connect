"use server";

import type {
  LoadBotFlowDetailsActionResult,
  PublishBotFlowDraftActionResult,
  SaveBotFlowDraftActionResult,
} from "./botFlowActionResult.ts";
import {
  createCurrentRailwayBotFlowHandler,
} from "./currentRailwayBotFlowHandler.ts";

export async function loadBotFlowDetailsAction(
  botFlowKey: unknown,
): Promise<LoadBotFlowDetailsActionResult> {
  try {
    return await createCurrentRailwayBotFlowHandler().loadDetails(botFlowKey);
  } catch {
    return { status: "server-error" };
  }
}

export async function saveBotFlowDraftAction(
  input: unknown,
): Promise<SaveBotFlowDraftActionResult> {
  try {
    return await createCurrentRailwayBotFlowHandler().saveDraft(input);
  } catch {
    return { status: "server-error" };
  }
}

export async function publishBotFlowDraftAction(
  input: unknown,
): Promise<PublishBotFlowDraftActionResult> {
  try {
    return await createCurrentRailwayBotFlowHandler().publishDraft(input);
  } catch {
    return { status: "server-error" };
  }
}
