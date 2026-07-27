export const botReplyDeliveryStatuses = [
  "pending",
  "sending",
  "accepted",
  "rejected",
  "ambiguous",
] as const;

export type BotReplyDeliveryStatus =
  (typeof botReplyDeliveryStatuses)[number];

export type BotReplyPayload =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "buttons";
      text: string;
      options: readonly {
        optionKey: string;
        label: string;
      }[];
    };

export interface PersistedBotReplyDelivery {
  deliveryKey: string;
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  botFlowKey: string;
  botFlowVersionKey: string;
  replyIndex: number;
  recipientPhoneNumber: string;
  reply: BotReplyPayload;
  status: BotReplyDeliveryStatus;
  attemptCount: number;
  providerMessageId: string | null;
  lastErrorCode: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BotReplyProcessorResult =
  | {
      outcome: "accepted";
      providerMessageId: string;
    }
  | {
      outcome: "rejected";
      errorCode: string;
    };

export interface PreparedBotReplyDelivery {
  phoneNumberId: string;
  delivery: PersistedBotReplyDelivery;
}

export interface BotReplyProcessor {
  isConfigured(): boolean;
  process(
    prepared: PreparedBotReplyDelivery,
  ): Promise<BotReplyProcessorResult>;
}
