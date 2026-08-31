"use server";

import type {
  LoadAiAgentDetailsActionResult,
  PublishAiAgentDraftActionResult,
  SaveAiAgentDraftActionResult,
} from "./aiAgentActionResult.ts";
import { createCurrentRailwayAiAgentHandler } from
  "./currentRailwayAiAgentHandler.ts";

export async function loadAiAgentDetailsAction(
  aiAgentKey: unknown,
): Promise<LoadAiAgentDetailsActionResult> {
  try {
    return await createCurrentRailwayAiAgentHandler().loadDetails(
      aiAgentKey,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function saveAiAgentDraftAction(
  input: unknown,
): Promise<SaveAiAgentDraftActionResult> {
  try {
    return await createCurrentRailwayAiAgentHandler().saveDraft(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function publishAiAgentDraftAction(
  input: unknown,
): Promise<PublishAiAgentDraftActionResult> {
  try {
    return await createCurrentRailwayAiAgentHandler().publishDraft(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}
