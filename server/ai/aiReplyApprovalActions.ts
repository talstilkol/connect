"use server";

import type {
  DecideAiReplyApprovalActionResult,
  LoadAiReplyApprovalsActionResult,
} from "./aiReplyApprovalActionResult.ts";
import { createCurrentRailwayAiReplyApprovalHandler } from
  "./currentRailwayAiReplyApprovalHandler.ts";

export async function loadAiReplyApprovalsAction():
Promise<LoadAiReplyApprovalsActionResult> {
  try {
    return await createCurrentRailwayAiReplyApprovalHandler().load();
  } catch {
    return { status: "server-error" };
  }
}

export async function decideAiReplyApprovalAction(
  input: unknown,
): Promise<DecideAiReplyApprovalActionResult> {
  try {
    return await createCurrentRailwayAiReplyApprovalHandler().decide(input);
  } catch {
    return { status: "server-error" };
  }
}
