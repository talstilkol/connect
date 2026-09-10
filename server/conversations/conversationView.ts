import type {
  ConversationAssignmentState,
  ConversationReadState,
  PersistedInboxConversation,
} from "../../db/conversationRepository.ts";
import type { PersistedInboxMessage } from "../../shared/domain/inboxHistory.ts";
import type {
  ConversationAssignmentStateView,
  ConversationReadStateView,
  InboxConversationThreadView,
  InboxConversationView,
  InboxMessageView,
} from "../../shared/domain/conversationView.ts";
import { contactDisplayName } from "../../shared/domain/contactDisplayName.ts";

function toAssignmentView(
  assignedExternalUserId: string | null,
  currentExternalUserId: string,
):
  | "unassigned"
  | "current-user"
  | "other-user" {
  if (assignedExternalUserId === null) {
    return "unassigned";
  }

  return assignedExternalUserId ===
    currentExternalUserId
    ? "current-user"
    : "other-user";
}

export function toInboxConversationView(
  conversation: PersistedInboxConversation,
  currentExternalUserId: string,
): InboxConversationView {
  return {
    conversationKey: conversation.conversationKey,
    status: conversation.status,
    contact: {
      displayName: contactDisplayName(conversation.contact),
      phoneNumber: conversation.contact.phoneNumber,
    },
    unreadCount: conversation.unreadCount,
    assignment: toAssignmentView(
      conversation.assignedExternalUserId,
      currentExternalUserId,
    ),
    lastMessage:
      conversation.lastMessage &&
      conversation.lastMessageAt
        ? {
            ...conversation.lastMessage,
            occurredAt: conversation.lastMessageAt,
          }
        : null,
    version: conversation.version,
  };
}

export function toInboxMessageView(
  message: PersistedInboxMessage,
): InboxMessageView {
  return {
    messageKey: message.messageKey,
    direction: message.direction,
    contentKind: message.contentKind,
    ...(message.contentState === undefined ? {} : { contentState: message.contentState }),
    status: message.status,
    ...("source" in message ? { source: message.source, historyDeliveryState: message.historyDeliveryState } : {}),
    textContent: message.textContent,
    occurredAt: message.occurredAt,
    statusUpdatedAt: message.statusUpdatedAt,
  };
}

export function toInboxConversationThreadView(
  conversation: PersistedInboxConversation,
  messages: readonly PersistedInboxMessage[],
  currentExternalUserId: string,
): InboxConversationThreadView {
  return {
    conversation:
      toInboxConversationView(
        conversation,
        currentExternalUserId,
      ),
    messages: messages.map(toInboxMessageView),
  };
}

export function toConversationAssignmentStateView(
  state: ConversationAssignmentState,
  currentExternalUserId: string,
): ConversationAssignmentStateView {
  return {
    conversationKey: state.conversationKey,
    assignment: toAssignmentView(
      state.assignedExternalUserId,
      currentExternalUserId,
    ),
    version: state.version,
  };
}

export function toConversationReadStateView(
  state: ConversationReadState,
): ConversationReadStateView {
  return {
    conversationKey: state.conversationKey,
    unreadCount: state.unreadCount,
    version: state.version,
  };
}
