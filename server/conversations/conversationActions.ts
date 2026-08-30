"use server";

import type {
  ChangeConversationAssignmentActionResult,
  LoadConversationThreadActionResult,
  MarkConversationReadActionResult,
  RefreshInboxActionResult,
} from "./conversationActionResult.ts";
import { createCurrentRailwayConversationHandler } from "./currentRailwayConversationHandler.ts";

export async function loadConversationThreadAction(
  conversationKey: unknown,
): Promise<LoadConversationThreadActionResult> {
  try {
    return await createCurrentRailwayConversationHandler().loadThread(
      conversationKey,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function markConversationReadAction(
  input: unknown,
): Promise<MarkConversationReadActionResult> {
  try {
    return await createCurrentRailwayConversationHandler().markRead(input);
  } catch {
    return { status: "server-error" };
  }
}

export async function changeConversationAssignmentAction(
  input: unknown,
): Promise<ChangeConversationAssignmentActionResult> {
  try {
    return await createCurrentRailwayConversationHandler().changeAssignment(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function refreshInboxAction(
  input: unknown,
): Promise<RefreshInboxActionResult> {
  try {
    return await createCurrentRailwayConversationHandler().refresh(input);
  } catch {
    return { status: "server-error" };
  }
}
