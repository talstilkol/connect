import {
  createConversationRepository,
} from "../../db/conversationRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  InboxDirectoryStatus,
  InboxView,
} from "../../shared/domain/conversationView.ts";
import {
  defaultInboxFilters,
} from "../../shared/domain/conversationView.ts";
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
  createConversationService,
} from "./conversationService.ts";
import {
  toInboxConversationThreadView,
  toInboxConversationView,
} from "./conversationView.ts";

export type CurrentInboxResult =
  | {
      status: "ready";
      inbox: InboxView;
    }
  | {
      status: Exclude<
        InboxDirectoryStatus,
        "ready"
      >;
      inbox: {
        conversations: readonly [];
        selectedThread: null;
        canReply: false;
        filters: typeof defaultInboxFilters;
      };
    };

const emptyInbox = {
  conversations: [] as const,
  selectedThread: null,
  canReply: false as const,
  filters: { ...defaultInboxFilters },
};

function tenantFailureStatus(
  error: TenantSessionError,
): Exclude<InboxDirectoryStatus, "ready"> {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return "unauthenticated";
  }

  if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
    return "onboarding-required";
  }

  if (error.code === "TENANT_SELECTION_REQUIRED") {
    return "tenant-selection-required";
  }

  if (error.code === "PERMISSION_DENIED") {
    return "permission-denied";
  }

  return "server-error";
}

export async function readCurrentInbox():
Promise<CurrentInboxResult> {
  if (
    inspectClerkConfiguration().status !==
    "configured"
  ) {
    return {
      status: "configuration-required",
      inbox: emptyInbox,
    };
  }

  try {
    const database =
      await requireRuntimeDatabase();
    const session =
      await requireCurrentTenantSession(database);
    const service = createConversationService(
      createConversationRepository(database),
    );
    const conversations =
      await service.list(
        session,
        defaultInboxFilters,
      );
    const selectedConversation =
      conversations[0] ?? null;
    const selectedThread = selectedConversation
      ? await service.readThread(
          session,
          selectedConversation.conversationKey,
        )
      : null;

    return {
      status: "ready",
      inbox: {
        conversations: conversations.map(
          (conversation) =>
            toInboxConversationView(
              conversation,
              session.externalUserId,
            ),
        ),
        selectedThread: selectedThread
          ? toInboxConversationThreadView(
              selectedThread.conversation,
              selectedThread.messages,
              session.externalUserId,
            )
          : null,
        canReply: hasPermission(
          session.role,
          "conversations.reply",
        ),
        filters: { ...defaultInboxFilters },
      },
    };
  } catch (error) {
    return {
      status:
        error instanceof TenantSessionError
          ? tenantFailureStatus(error)
          : "server-error",
      inbox: emptyInbox,
    };
  }
}
