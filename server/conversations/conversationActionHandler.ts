import type {
  TenantSession,
} from "../auth/tenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import type {
  ChangeConversationAssignmentActionResult,
  ConversationActionFailure,
  LoadConversationThreadActionResult,
  MarkConversationReadActionResult,
  RefreshInboxActionResult,
} from "./conversationActionResult.ts";
import {
  hasPermission,
} from "../../shared/domain/model.ts";
import {
  ConversationServiceError,
  type ConversationService,
} from "./conversationService.ts";
import {
  toConversationAssignmentStateView,
  toConversationReadStateView,
  toInboxConversationView,
  toInboxConversationThreadView,
} from "./conversationView.ts";

interface ConversationActionContext {
  session: TenantSession;
  service: ConversationService;
}

export interface ConversationActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext(): Promise<ConversationActionContext>;
}

export interface ConversationActionHandler {
  loadThread(
    conversationKey: unknown,
  ): Promise<LoadConversationThreadActionResult>;
  markRead(
    input: unknown,
  ): Promise<MarkConversationReadActionResult>;
  changeAssignment(
    input: unknown,
  ): Promise<ChangeConversationAssignmentActionResult>;
  refresh(
    input: unknown,
  ): Promise<RefreshInboxActionResult>;
}

function mapTenantSessionError(
  error: TenantSessionError,
) {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return { status: "unauthenticated" as const };
  }

  if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
    return { status: "onboarding-required" as const };
  }

  if (error.code === "TENANT_SELECTION_REQUIRED") {
    return {
      status: "tenant-selection-required" as const,
    };
  }

  return { status: "permission-denied" as const };
}

function mapServiceError(
  error: ConversationServiceError,
): ConversationActionFailure {
  const statuses: Record<
    ConversationServiceError["code"],
    ConversationActionFailureStatus
  > = {
    INVALID_INPUT: "invalid-input",
    NOT_FOUND: "not-found",
    STATE_CONFLICT: "state-conflict",
    ASSIGNMENT_CONFLICT: "assignment-conflict",
    PERSISTENCE_FAILED: "server-error",
  };

  return { status: statuses[error.code] };
}

type ConversationActionFailureStatus =
  | "invalid-input"
  | "not-found"
  | "state-conflict"
  | "assignment-conflict"
  | "server-error";

export function createConversationActionHandler(
  dependencies: ConversationActionHandlerDependencies,
): ConversationActionHandler {
  return {
    async loadThread(conversationKey) {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const thread = await service.readThread(
          session,
          conversationKey,
        );

        return {
          status: "loaded",
          thread: toInboxConversationThreadView(
            thread.conversation,
            thread.messages,
            session.externalUserId,
          ),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof ConversationServiceError) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },

    async markRead(input) {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const state = await service.markRead(
          session,
          input,
        );

        return {
          status: "marked-read",
          conversation:
            toConversationReadStateView(state),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof ConversationServiceError) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },

    async changeAssignment(input) {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const state =
          await service.changeAssignment(
            session,
            input,
          );

        return {
          status: "assignment-updated",
          conversation:
            toConversationAssignmentStateView(
              state,
              session.externalUserId,
            ),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof ConversationServiceError) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },

    async refresh(input) {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const snapshot = await service.refresh(
          session,
          input,
        );

        return {
          status: "refreshed",
          inbox: {
            conversations:
              snapshot.conversations.map(
                (conversation) =>
                  toInboxConversationView(
                    conversation,
                    session.externalUserId,
                  ),
              ),
            selectedThread: snapshot.selectedThread
              ? toInboxConversationThreadView(
                  snapshot.selectedThread
                    .conversation,
                  snapshot.selectedThread.messages,
                  session.externalUserId,
                )
              : null,
            canReply: hasPermission(
              session.role,
              "conversations.reply",
            ),
            filters: snapshot.filters,
          },
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof ConversationServiceError) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}
