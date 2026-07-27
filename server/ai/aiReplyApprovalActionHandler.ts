import {
  hasPermission,
} from "../../shared/domain/model.ts";
import type {
  TenantSession,
} from "../auth/tenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import type {
  AiReplyApprovalActionFailure,
  DecideAiReplyApprovalActionResult,
  LoadAiReplyApprovalsActionResult,
} from "./aiReplyApprovalActionResult.ts";
import {
  AiReplyApprovalServiceError,
  type AiReplyApprovalService,
} from "./aiReplyApprovalService.ts";
import {
  toAiReplyApprovalDecisionView,
  toAiReplyApprovalView,
} from "./aiReplyApprovalView.ts";

interface AiReplyApprovalActionContext {
  session: TenantSession;
  service: AiReplyApprovalService;
}

export interface AiReplyApprovalActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<AiReplyApprovalActionContext>;
}

export interface AiReplyApprovalActionHandler {
  load():
    Promise<LoadAiReplyApprovalsActionResult>;
  decide(
    input: unknown,
  ): Promise<DecideAiReplyApprovalActionResult>;
}

function mapTenantError(
  error: TenantSessionError,
): AiReplyApprovalActionFailure {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return { status: "unauthenticated" };
  }

  if (
    error.code ===
    "TENANT_MEMBERSHIP_REQUIRED"
  ) {
    return { status: "onboarding-required" };
  }

  if (
    error.code ===
    "TENANT_SELECTION_REQUIRED"
  ) {
    return {
      status: "tenant-selection-required",
    };
  }

  return { status: "permission-denied" };
}

function mapServiceError(
  error: AiReplyApprovalServiceError,
): AiReplyApprovalActionFailure {
  const statuses: Record<
    AiReplyApprovalServiceError["code"],
    AiReplyApprovalActionFailure["status"]
  > = {
    INVALID_INPUT: "invalid-input",
    NOT_FOUND: "not-found",
    STATE_CONFLICT: "state-conflict",
    INVALID_STATE: "invalid-state",
    PERSISTENCE_FAILED: "server-error",
  };

  return { status: statuses[error.code] };
}

export function createAiReplyApprovalActionHandler(
  dependencies:
    AiReplyApprovalActionHandlerDependencies,
): AiReplyApprovalActionHandler {
  return {
    async load() {
      if (!dependencies.applicationConfigured()) {
        return {
          status: "configuration-required",
        };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const approvals =
          await service.listAwaiting(session);

        return {
          status: "loaded",
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
        if (error instanceof TenantSessionError) {
          return mapTenantError(error);
        }

        if (
          error instanceof
          AiReplyApprovalServiceError
        ) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },

    async decide(input) {
      if (!dependencies.applicationConfigured()) {
        return {
          status: "configuration-required",
        };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const result = await service.decide(
          session,
          input,
        );

        return {
          status: "decided",
          outcome: result.outcome,
          approval:
            toAiReplyApprovalDecisionView(
              result.item,
            ),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantError(error);
        }

        if (
          error instanceof
          AiReplyApprovalServiceError
        ) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}

