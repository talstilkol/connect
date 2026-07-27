import {
  createAiReplyOutboxRepository,
} from "../../db/aiReplyOutboxRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  AiReplyApprovalDirectoryStatus,
  AiReplyApprovalDirectoryView,
} from "../../shared/domain/aiReplyApprovalView.ts";
import {
  hasPermission,
} from "../../shared/domain/model.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantSession,
} from "../auth/currentTenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import {
  createAiReplyApprovalService,
} from "./aiReplyApprovalService.ts";
import {
  toAiReplyApprovalView,
} from "./aiReplyApprovalView.ts";

export type CurrentAiReplyApprovalsResult =
  | {
      status: "ready";
      directory:
        AiReplyApprovalDirectoryView;
    }
  | {
      status: Exclude<
        AiReplyApprovalDirectoryStatus,
        "ready"
      >;
      directory: {
        approvals: readonly [];
        canDecide: false;
      };
    };

const emptyDirectory = {
  approvals: [] as const,
  canDecide: false as const,
};

function tenantFailureStatus(
  error: TenantSessionError,
): Exclude<
  AiReplyApprovalDirectoryStatus,
  "ready"
> {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return "unauthenticated";
  }

  if (
    error.code ===
    "TENANT_MEMBERSHIP_REQUIRED"
  ) {
    return "onboarding-required";
  }

  if (
    error.code ===
    "TENANT_SELECTION_REQUIRED"
  ) {
    return "tenant-selection-required";
  }

  if (error.code === "PERMISSION_DENIED") {
    return "permission-denied";
  }

  return "server-error";
}

export async function readCurrentAiReplyApprovals():
Promise<CurrentAiReplyApprovalsResult> {
  if (
    inspectClerkConfiguration().status !==
    "configured"
  ) {
    return {
      status: "configuration-required",
      directory: emptyDirectory,
    };
  }

  try {
    const database =
      await requireRuntimeDatabase();
    const session =
      await requireCurrentTenantSession(database);
    const service =
      createAiReplyApprovalService(
        createAiReplyOutboxRepository(
          database,
        ),
      );
    const approvals =
      await service.listAwaiting(session);

    return {
      status: "ready",
      directory: {
        approvals: approvals.map(
          toAiReplyApprovalView,
        ),
        canDecide: hasPermission(
          session.role,
          "conversations.reply",
        ),
      },
    };
  } catch (error) {
    return {
      status:
        error instanceof TenantSessionError
          ? tenantFailureStatus(error)
          : "server-error",
      directory: emptyDirectory,
    };
  }
}

