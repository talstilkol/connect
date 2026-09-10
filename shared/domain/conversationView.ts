import type {
  MessageDirection,
  MessageStatus,
  MessageContentState,
} from "./conversation.ts";
import type {
  ConversationStatus,
} from "./model.ts";
import type { HistoryDeliveryState, InboxContentKind } from "./inboxHistory.ts";

export type InboxDirectoryStatus =
  | "ready"
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "server-error";

export interface InboxConversationLastMessageView {
  contentState?: Exclude<MessageContentState, "original">;
  direction: MessageDirection;
  contentKind: InboxContentKind;
  textContent: string | null;
  occurredAt: string;
}

export interface InboxConversationView {
  conversationKey: string;
  status: ConversationStatus;
  contact: {
    displayName: string;
    phoneNumber: string;
  };
  unreadCount: number;
  assignment:
    | "unassigned"
    | "current-user"
    | "other-user";
  lastMessage: InboxConversationLastMessageView | null;
  version: number;
}

export interface InboxMessageView {
  source?: "history";
  historyDeliveryState?: HistoryDeliveryState;
  contentState?: Exclude<MessageContentState, "original">;
  messageKey: string;
  direction: MessageDirection;
  contentKind: InboxContentKind;
  status: MessageStatus | null;
  textContent: string | null;
  occurredAt: string;
  statusUpdatedAt: string | null;
}

export interface InboxConversationThreadView {
  conversation: InboxConversationView;
  messages: readonly InboxMessageView[];
}

export interface InboxView {
  conversations: readonly InboxConversationView[];
  selectedThread: InboxConversationThreadView | null;
  canReply: boolean;
  filters: InboxFilters;
}

export interface ConversationReadStateView {
  conversationKey: string;
  unreadCount: number;
  version: number;
}

export interface ConversationAssignmentStateView {
  conversationKey: string;
  assignment:
    | "unassigned"
    | "current-user"
    | "other-user";
  version: number;
}

export interface InboxFilters {
  searchTerm: string;
  status: "all" | ConversationStatus;
  assignment: "all" | "unassigned" | "mine";
}

export const defaultInboxFilters: InboxFilters = {
  searchTerm: "",
  status: "all",
  assignment: "all",
};
