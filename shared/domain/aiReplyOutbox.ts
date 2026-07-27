import type {
  AiResponseMode,
} from "./aiAgent.ts";

export const aiReplyOutboxStatuses = [
  "awaiting-approval",
  "ready-for-delivery",
  "rejected",
] as const;

export type AiReplyOutboxStatus =
  (typeof aiReplyOutboxStatuses)[number];

export interface PersistedAiReplyOutboxItem {
  outboxKey: string;
  requestKey: string;
  auditKey: string;
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  aiAgentKey: string;
  aiAgentVersionKey: string;
  expectedConversationVersion: number;
  recipientPhoneNumber: string;
  responseMode: AiResponseMode;
  replyText: string;
  groundedSourceKeys: readonly string[];
  groundingScoreBasisPoints: number;
  status: AiReplyOutboxStatus;
  decidedByExternalUserId: string | null;
  decidedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

