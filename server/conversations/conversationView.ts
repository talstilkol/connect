import type {
  ConversationAssignmentState,
  ConversationReadState,
  PersistedInboxConversation,
} from "../../db/conversationRepository.ts";
import type {
  PersistedMessage,
} from "../../shared/domain/conversation.ts";
import type {
  ConversationAssignmentStateView,
  ConversationReadStateView,
  InboxConversationThreadView,
  InboxConversationView,
  InboxMessageView,
} from "../../shared/domain/conversationView.ts";

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

function contactDisplayName(
  conversation: PersistedInboxConversation,
): string {
  const displayName = [
    conversation.contact.firstName,
    conversation.contact.lastName,
  ]
    .filter(
      (part): part is string => part !== null,
    )
    .join(" ");

  return (
    displayName || conversation.contact.phoneNumber
  );
}

export function toInboxConversationView(
  conversation: PersistedInboxConversation,
  currentExternalUserId: string,
): InboxConversationView {
  return {
    conversationKey: conversation.conversationKey,
    status: conversation.status,
    contact: {
      displayName: contactDisplayName(conversation),
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
  message: PersistedMessage,
): InboxMessageView {
  return {
    messageKey: message.messageKey,
    direction: message.direction,
    contentKind: message.contentKind,
    status: message.status,
    textContent: message.textContent,
    occurredAt: message.occurredAt,
    statusUpdatedAt: message.statusUpdatedAt,
  };
}

export function toInboxConversationThreadView(
  conversation: PersistedInboxConversation,
  messages: readonly PersistedMessage[],
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
