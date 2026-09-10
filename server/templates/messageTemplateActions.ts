"use server";

import { createCurrentRailwayMessageTemplateSyncHandler } from "./currentRailwayMessageTemplateSyncHandler.ts";

import type {
  SaveMessageTemplateDraftActionResult,
  SubmitMessageTemplateActionResult,
  SyncMessageTemplatesActionResult,
} from "./messageTemplateActionResult.ts";
import {
  createCurrentRailwayMessageTemplateDraftHandler,
} from "./currentRailwayMessageTemplateDraftHandler.ts";
import {
  createCurrentRailwayMessageTemplateSubmissionHandler,
} from "./currentRailwayMessageTemplateSubmissionHandler.ts";

export async function saveMessageTemplateDraftAction(
  input: unknown,
): Promise<SaveMessageTemplateDraftActionResult> {
  return createCurrentRailwayMessageTemplateDraftHandler().save(input);
}

export async function submitMessageTemplateAction(
  templateKey: unknown,
  expectedVersion: unknown,
): Promise<SubmitMessageTemplateActionResult> {
  try {
    // Railway rechecks tenant, permission, configuration and draft version.
    return await createCurrentRailwayMessageTemplateSubmissionHandler()
      .submit(templateKey, expectedVersion);
  } catch {
    return { status: "server-error" };
  }
}

export async function syncMessageTemplatesAction(requestedAt: unknown): Promise<SyncMessageTemplatesActionResult> {
  try {
    return await createCurrentRailwayMessageTemplateSyncHandler().sync(requestedAt);
  } catch {
    return { status: "server-error" };
  }
}
