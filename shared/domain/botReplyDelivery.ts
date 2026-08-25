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
  senderPhoneNumberId: string;
  recipientPhoneNumber: string;
  reply: BotReplyPayload;
  status: BotReplyDeliveryStatus;
  attemptCount: number;
  claimVersion: number;
  nextAttemptAt: string | null;
  deferredAt: string | null;
  lastDeferralReasonCode: string | null;
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
      reservationKey: string;
    }
  | {
      outcome: "rejected";
      errorCode: string;
      reservationKey?: never;
      providerErrorCode?: never;
    }
  | {
      outcome: "rejected";
      errorCode: "META_SERVICE_WINDOW_CLOSED";
      reservationKey: string;
      providerErrorCode: 131047;
    }
  | {
      outcome: "deferred";
      errorCode: string;
      retryAt: string;
      reservationKey?: never;
      providerErrorCode?: never;
      cooldownScope?: never;
      retryAfterSeconds?: never;
    }
  | {
      outcome: "deferred";
      errorCode: "META_PHONE_THROUGHPUT_LIMITED";
      retryAt: string;
      reservationKey: string;
      providerErrorCode: 130429;
      cooldownScope: "sender";
      retryAfterSeconds: number;
    }
  | {
      outcome: "deferred";
      errorCode: "META_PAIR_RATE_LIMITED";
      retryAt: string;
      reservationKey: string;
      providerErrorCode: 131056;
      cooldownScope: "pair";
      retryAfterSeconds: number;
    };

export interface PreparedBotReplyDelivery {
  phoneNumberId: string;
  serviceWindowOpenedAt: string;
  serviceWindowExpiresAt: string;
  attemptedAt: string;
  delivery: PersistedBotReplyDelivery;
}

export interface BotReplyProcessor {
  isConfigured(): boolean;
  process(
    prepared: PreparedBotReplyDelivery,
  ): Promise<BotReplyProcessorResult>;
}
