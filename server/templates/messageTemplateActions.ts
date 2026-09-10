"use server";

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

export async function syncMessageTemplatesAction(): Promise<SyncMessageTemplatesActionResult> {
  // The legacy D1 sync cannot run on the Railway/Vercel path. Activation awaits
  // an atomic PostgreSQL synchronization operation and connection revalidation.
  return { status: "meta-configuration-required" };
}
