"use server";

import {
  createConversationRepository,
} from "../../db/conversationRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantSession,
} from "../auth/currentTenantSession.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import {
  createConversationActionHandler,
} from "./conversationActionHandler.ts";
import type {
  ChangeConversationAssignmentActionResult,
  LoadConversationThreadActionResult,
  MarkConversationReadActionResult,
  RefreshInboxActionResult,
} from "./conversationActionResult.ts";
import {
  createConversationService,
} from "./conversationService.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
    "configured"
  );
}

function createActionHandler(
  mutation: boolean,
) {
  return createConversationActionHandler({
    applicationConfigured,
    async createContext() {
      const database =
        await requireRuntimeDatabase();
      const session = mutation
        ? await requireCurrentTenantMutationSession(
            database,
          )
        : await requireCurrentTenantSession(
            database,
          );

      return {
        session,
        service: createConversationService(
          createConversationRepository(database),
        ),
      };
    },
  });
}

export async function loadConversationThreadAction(
  conversationKey: unknown,
): Promise<LoadConversationThreadActionResult> {
  try {
    return await createActionHandler(false).loadThread(
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
    return await createActionHandler(true).markRead(input);
  } catch {
    return { status: "server-error" };
  }
}

export async function changeConversationAssignmentAction(
  input: unknown,
): Promise<ChangeConversationAssignmentActionResult> {
  try {
    return await createActionHandler(true).changeAssignment(
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
    return await createActionHandler(false).refresh(input);
  } catch {
    return { status: "server-error" };
  }
}
