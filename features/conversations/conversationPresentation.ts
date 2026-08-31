import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  InboxConversationThreadView,
  InboxConversationView,
  InboxDirectoryStatus,
  InboxFilters,
  InboxMessageView,
} from "../../shared/domain/conversationView.ts";
import type {
  ConversationStatus,
} from "../../shared/domain/model.ts";
import {
  readConversationMessages,
} from "./conversationMessages.ts";

const hebrewMessages = readConversationMessages("he");

export const inboxDirectoryFailureMessages: Record<
  Exclude<InboxDirectoryStatus, "ready">,
  string
> = hebrewMessages.directoryFailures;

export const conversationStatusLabels: Record<
  ConversationStatus,
  string
> = hebrewMessages.labels.conversationStatuses;

export const conversationAssignmentLabels: Record<
  InboxConversationView["assignment"],
  string
> = hebrewMessages.labels.assignments;

export function hasActiveInboxFilters(
  filters: InboxFilters,
): boolean {
  return (
    filters.searchTerm !== "" ||
    filters.status !== "all" ||
    filters.assignment !== "all"
  );
}

export const messageStatusLabels: Record<
  InboxMessageView["status"],
  string
> = hebrewMessages.labels.messageStatuses;

export function messageBody(
  message: InboxMessageView,
  language: InterfaceLanguage = "he",
): string {
  if (message.contentKind === "text") {
    return message.textContent ?? "";
  }

  return readConversationMessages(language).labels
    .nonTextContent[message.contentKind];
}

export function formatInboxTimestamp(
  value: string,
  language: InterfaceLanguage = "he",
): string {
  const locale = {
    he: "he-IL",
    en: "en-US",
    ar: "ar",
  }[language];

  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function replaceInboxConversation(
  conversations: readonly InboxConversationView[],
  replacement: InboxConversationView,
): readonly InboxConversationView[] {
  return conversations.map((conversation) =>
    conversation.conversationKey ===
    replacement.conversationKey
      ? replacement
      : conversation,
  );
}

export function canMarkConversationRead(
  thread: InboxConversationThreadView | null,
  canReply: boolean,
  isPending: boolean,
): thread is InboxConversationThreadView {
  return (
    thread !== null &&
    canReply &&
    !isPending &&
    thread.conversation.unreadCount > 0
  );
}
