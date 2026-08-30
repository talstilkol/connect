import {
  messageContentKinds,
  messageDirections,
  messageStatuses,
  persistedConversationStatuses,
} from "../../shared/domain/conversation.ts";
import type {
  InboxConversationThreadView,
  InboxConversationView,
  InboxMessageView,
} from "../../shared/domain/conversationView.ts";

const conversationKeyPattern =
  /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern = /^message_v1_[0-9a-f]{64}$/;
const phonePattern = /^\+[1-9][0-9]{0,14}$/;
const timestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: object,
  expectedKeys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !timestampPattern.test(value)) {
    return false;
  }

  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximum &&
    value.trim() === value &&
    !controlCharacterPattern.test(value);
}

function parseLastMessage(
  value: unknown,
): InboxConversationView["lastMessage"] | undefined {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "contentKind",
      "direction",
      "occurredAt",
      "textContent",
    ]) ||
    !messageDirections.includes(
      value.direction as (typeof messageDirections)[number],
    ) ||
    !messageContentKinds.includes(
      value.contentKind as (typeof messageContentKinds)[number],
    ) ||
    (value.textContent !== null && typeof value.textContent !== "string") ||
    !isCanonicalTimestamp(value.occurredAt)
  ) {
    return undefined;
  }

  return Object.freeze({
    direction: value.direction as (typeof messageDirections)[number],
    contentKind: value.contentKind as (typeof messageContentKinds)[number],
    textContent: value.textContent as string | null,
    occurredAt: value.occurredAt,
  });
}

export function parseRailwayInboxConversationView(
  value: unknown,
): Readonly<InboxConversationView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "assignment",
      "contact",
      "conversationKey",
      "lastMessage",
      "status",
      "unreadCount",
      "version",
    ]) ||
    typeof value.conversationKey !== "string" ||
    !conversationKeyPattern.test(value.conversationKey) ||
    !persistedConversationStatuses.includes(
      value.status as (typeof persistedConversationStatuses)[number],
    ) ||
    (value.assignment !== "unassigned" &&
      value.assignment !== "current-user" &&
      value.assignment !== "other-user") ||
    !Number.isSafeInteger(value.unreadCount) ||
    Number(value.unreadCount) < 0 ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) <= 0 ||
    !isRecord(value.contact) ||
    !hasExactKeys(value.contact, ["displayName", "phoneNumber"]) ||
    !isBoundedText(value.contact.displayName, 256) ||
    typeof value.contact.phoneNumber !== "string" ||
    !phonePattern.test(value.contact.phoneNumber)
  ) {
    return null;
  }

  const lastMessage = parseLastMessage(value.lastMessage);
  if (lastMessage === undefined) {
    return null;
  }

  return Object.freeze({
    conversationKey: value.conversationKey,
    status: value.status as (typeof persistedConversationStatuses)[number],
    contact: Object.freeze({
      displayName: value.contact.displayName,
      phoneNumber: value.contact.phoneNumber,
    }),
    unreadCount: Number(value.unreadCount),
    assignment: value.assignment,
    lastMessage,
    version: Number(value.version),
  });
}

export function parseRailwayInboxMessageView(
  value: unknown,
): Readonly<InboxMessageView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "contentKind",
      "direction",
      "messageKey",
      "occurredAt",
      "status",
      "statusUpdatedAt",
      "textContent",
    ]) ||
    typeof value.messageKey !== "string" ||
    !messageKeyPattern.test(value.messageKey) ||
    !messageDirections.includes(
      value.direction as (typeof messageDirections)[number],
    ) ||
    !messageContentKinds.includes(
      value.contentKind as (typeof messageContentKinds)[number],
    ) ||
    !messageStatuses.includes(
      value.status as (typeof messageStatuses)[number],
    ) ||
    (value.textContent !== null && typeof value.textContent !== "string") ||
    !isCanonicalTimestamp(value.occurredAt) ||
    !isCanonicalTimestamp(value.statusUpdatedAt)
  ) {
    return null;
  }

  return Object.freeze({
    messageKey: value.messageKey,
    direction: value.direction as (typeof messageDirections)[number],
    contentKind: value.contentKind as (typeof messageContentKinds)[number],
    status: value.status as (typeof messageStatuses)[number],
    textContent: value.textContent as string | null,
    occurredAt: value.occurredAt,
    statusUpdatedAt: value.statusUpdatedAt,
  });
}

export function parseRailwayConversationList(
  value: unknown,
): readonly Readonly<InboxConversationView>[] | null {
  if (!Array.isArray(value) || value.length > 50) {
    return null;
  }

  const conversations: Readonly<InboxConversationView>[] = [];
  const keys = new Set<string>();
  for (const item of value) {
    const conversation = parseRailwayInboxConversationView(item);
    if (conversation === null || keys.has(conversation.conversationKey)) {
      return null;
    }
    keys.add(conversation.conversationKey);
    conversations.push(conversation);
  }

  return Object.freeze(conversations);
}

export function parseRailwayConversationThread(
  value: unknown,
  expectedConversationKey: string,
): Readonly<InboxConversationThreadView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["conversation", "messages"]) ||
    !Array.isArray(value.messages) ||
    value.messages.length > 100
  ) {
    return null;
  }

  const conversation = parseRailwayInboxConversationView(value.conversation);
  if (
    conversation === null ||
    conversation.conversationKey !== expectedConversationKey
  ) {
    return null;
  }

  const messages: Readonly<InboxMessageView>[] = [];
  const keys = new Set<string>();
  let previous: Readonly<InboxMessageView> | null = null;
  for (const item of value.messages) {
    const message = parseRailwayInboxMessageView(item);
    if (
      message === null ||
      keys.has(message.messageKey) ||
      (previous !== null &&
        (message.occurredAt < previous.occurredAt ||
          (message.occurredAt === previous.occurredAt &&
            message.messageKey <= previous.messageKey)))
    ) {
      return null;
    }
    keys.add(message.messageKey);
    messages.push(message);
    previous = message;
  }

  return Object.freeze({
    conversation,
    messages: Object.freeze(messages),
  });
}
