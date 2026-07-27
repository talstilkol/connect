import type {
  ConversationStatus,
} from "./model.ts";

export const persistedConversationStatuses = [
  "new",
  "bot_active",
  "waiting_for_agent",
  "agent_active",
  "waiting_for_contact",
  "closed",
] as const satisfies readonly ConversationStatus[];

export const messageDirections = [
  "inbound",
  "outbound",
] as const;

export const messageContentKinds = [
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contacts",
  "interactive",
  "unsupported",
] as const;

export const messageStatuses = [
  "received",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;

export type MessageDirection =
  (typeof messageDirections)[number];

export type MessageContentKind =
  (typeof messageContentKinds)[number];

export type MessageStatus =
  (typeof messageStatuses)[number];

export interface ValidatedInboundMessage {
  contactId: number;
  providerMessageId: string;
  contentKind: MessageContentKind;
  textContent: string | null;
  occurredAt: string;
}

export interface PersistedConversation {
  conversationKey: string;
  tenantId: number;
  contactId: number;
  status: ConversationStatus;
  assignedExternalUserId: string | null;
  unreadCount: number;
  lastMessageKey: string | null;
  lastMessageAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedMessage {
  messageKey: string;
  conversationKey: string;
  tenantId: number;
  providerMessageId: string;
  direction: MessageDirection;
  contentKind: MessageContentKind;
  status: MessageStatus;
  textContent: string | null;
  occurredAt: string;
  statusUpdatedAt: string;
  lastStatusEventKey: string | null;
  lastStatusEventAt: string | null;
  createdAt: string;
  updatedAt: string;
}
