"use server";

import {
  createAiReplyOutboxRepository,
} from "../../db/aiReplyOutboxRepository.ts";
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
  createAiReplyApprovalActionHandler,
} from "./aiReplyApprovalActionHandler.ts";
import type {
  DecideAiReplyApprovalActionResult,
  LoadAiReplyApprovalsActionResult,
} from "./aiReplyApprovalActionResult.ts";
import {
  createAiReplyApprovalService,
} from "./aiReplyApprovalService.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
    "configured"
  );
}

function createActionHandler(
  mutation: boolean,
) {
  return createAiReplyApprovalActionHandler({
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
        service:
          createAiReplyApprovalService(
            createAiReplyOutboxRepository(
              database,
            ),
          ),
      };
    },
  });
}

export async function loadAiReplyApprovalsAction():
Promise<LoadAiReplyApprovalsActionResult> {
  try {
    return await createActionHandler(false).load();
  } catch {
    return { status: "server-error" };
  }
}

export async function decideAiReplyApprovalAction(
  input: unknown,
): Promise<DecideAiReplyApprovalActionResult> {
  try {
    return await createActionHandler(true).decide(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}
