"use server";
import { createCurrentRailwayAiAgentHandler } from "./currentRailwayAiAgentHandler.ts";
import type { UploadKnowledgeSourceActionResult } from "./knowledgeUploadActionResult.ts";
export async function uploadKnowledgeSourceAction(input: unknown): Promise<UploadKnowledgeSourceActionResult> {
  try { return await createCurrentRailwayAiAgentHandler().uploadKnowledge(input); } catch { return { status:"server-error" }; }
}
export async function refreshKnowledgeSourcesAction() {
  try { return await createCurrentRailwayAiAgentHandler().readCurrent(); } catch { return { status:"server-error" as const }; }
}
