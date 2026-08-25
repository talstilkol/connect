import {
  MessageIdentityConflictError,
  type ConversationRepository,
} from "../../db/conversationRepository.ts";
import type {
  MessageContentKind,
  MessageStatus,
} from "../../shared/domain/conversation.ts";
import {
  deriveConversationKey,
  deriveInboundMessageKey,
} from "./conversationKey.ts";
import type {
  MetaDeliveryStatusesWebhookEvent,
  MetaInboundMessagesWebhookEvent,
  MetaWebhookDispatchBatch,
} from "../meta/metaWebhookEventDispatcher.ts";
import {
  MetaWebhookProcessorError,
} from "../meta/metaWebhookIngress.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import type {
  InboundAutomationProcessor,
} from "../automation/inboundAutomationProcessor.ts";
import type {
  CampaignDeliveryStatusReconciler,
} from "../campaigns/campaignDeliveryStatusReconciler.ts";
import type {
  BotReplyDeliveryStatusReconciler,
} from "../bot/botReplyDeliveryStatusReconciler.ts";

const MAXIMUM_ITEMS_PER_EVENT = 100;
const MAXIMUM_MESSAGE_TEXT_LENGTH = 16_384;
const MAXIMUM_REPLY_BUTTON_TITLE_LENGTH = 20;
const BOT_OPTION_KEY_PATTERN =
  /^bot_option_v1_[0-9a-f]{64}$/;
const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const knownContentKinds = new Set<MessageContentKind>([
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contacts",
  "interactive",
]);

const supportedDeliveryStatuses = new Set<
  Exclude<MessageStatus, "received">
>(["sent", "delivered", "read", "failed"]);

export interface ParsedMetaInboundMessage {
  phoneNumber: string;
  providerMessageId: string;
  contentKind: MessageContentKind;
  textContent: string | null;
  selectedBotOptionKey: string | null;
  replyToProviderMessageId: string | null;
  occurredAt: string;
}

export interface ParsedMetaDeliveryStatus {
  providerMessageId: string;
  status: Exclude<MessageStatus, "received">;
  providerErrorCode: number | null;
  statusEventAt: string;
  statusIndex: number;
}

function processorError(code: string): never {
  throw new MetaWebhookProcessorError(code);
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireMessageEventMetadata(
  value: Readonly<Record<string, unknown>>,
  expectedPhoneNumberId: string,
): void {
  const metadata = value.metadata;

  if (
    value.messaging_product !== "whatsapp" ||
    !isRecord(metadata) ||
    typeof metadata.phone_number_id !== "string" ||
    metadata.phone_number_id !== expectedPhoneNumberId
  ) {
    processorError("INVALID_MESSAGE_EVENT_METADATA");
  }
}

function readProviderMessageId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0 ||
    value.length > 255
  ) {
    return processorError("INVALID_MESSAGE_EVENT");
  }

  return value;
}

function readProviderTimestamp(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !/^[0-9]{1,12}$/.test(value)
  ) {
    return processorError("INVALID_MESSAGE_EVENT_TIMESTAMP");
  }

  const seconds = Number(value);

  if (
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    seconds > 253_402_300_799
  ) {
    return processorError("INVALID_MESSAGE_EVENT_TIMESTAMP");
  }

  return new Date(seconds * 1_000).toISOString();
}

function readSenderPhoneNumber(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[1-9][0-9]{0,14}$/.test(value)
  ) {
    return processorError("INVALID_MESSAGE_SENDER");
  }

  return `+${value}`;
}

function readContent(
  message: Readonly<Record<string, unknown>>,
): {
  contentKind: MessageContentKind;
  textContent: string | null;
  selectedBotOptionKey: string | null;
  replyToProviderMessageId: string | null;
} {
  if (
    typeof message.type !== "string" ||
    message.type.length === 0 ||
    message.type.length > 100
  ) {
    return processorError("INVALID_MESSAGE_CONTENT");
  }

  if (message.type === "text") {
    if (
      !isRecord(message.text) ||
      typeof message.text.body !== "string" ||
      message.text.body.trim().length === 0 ||
      message.text.body.length >
        MAXIMUM_MESSAGE_TEXT_LENGTH
    ) {
      return processorError("INVALID_MESSAGE_CONTENT");
    }

    return {
      contentKind: "text",
      textContent: message.text.body,
      selectedBotOptionKey: null,
      replyToProviderMessageId: null,
    };
  }

  if (message.type === "interactive") {
    if (
      !isRecord(message.interactive) ||
      typeof message.interactive.type !== "string" ||
      message.interactive.type.length === 0 ||
      message.interactive.type.length > 100
    ) {
      return processorError("INVALID_MESSAGE_CONTENT");
    }

    if (
      message.interactive.type !== "button_reply"
    ) {
      return {
        contentKind: "interactive",
        textContent: null,
        selectedBotOptionKey: null,
        replyToProviderMessageId: null,
      };
    }

    const buttonReply =
      message.interactive.button_reply;

    if (
      !isRecord(buttonReply) ||
      !isRecord(message.context) ||
      typeof buttonReply.id !== "string" ||
      !BOT_OPTION_KEY_PATTERN.test(buttonReply.id) ||
      typeof buttonReply.title !== "string" ||
      buttonReply.title.trim() !== buttonReply.title ||
      buttonReply.title.length === 0 ||
      buttonReply.title.length >
        MAXIMUM_REPLY_BUTTON_TITLE_LENGTH ||
      UNSAFE_CONTROL_CHARACTERS.test(
        buttonReply.title,
      )
    ) {
      return processorError("INVALID_MESSAGE_CONTENT");
    }

    return {
      contentKind: "interactive",
      textContent: buttonReply.title,
      selectedBotOptionKey: buttonReply.id,
      replyToProviderMessageId:
        readProviderMessageId(
          message.context.id,
        ),
    };
  }

  const contentKind = knownContentKinds.has(
    message.type as MessageContentKind,
  )
    ? (message.type as MessageContentKind)
    : "unsupported";

  return {
    contentKind,
    textContent: null,
    selectedBotOptionKey: null,
    replyToProviderMessageId: null,
  };
}

function requireBoundedItems(
  value: readonly unknown[],
): void {
  if (
    value.length === 0 ||
    value.length > MAXIMUM_ITEMS_PER_EVENT
  ) {
    processorError("INVALID_MESSAGE_EVENT_SIZE");
  }
}

export function parseMetaInboundMessagesEvent(
  event: MetaInboundMessagesWebhookEvent,
  expectedPhoneNumberId: string,
): readonly ParsedMetaInboundMessage[] {
  requireMessageEventMetadata(
    event.value,
    expectedPhoneNumberId,
  );
  requireBoundedItems(event.messages);

  return event.messages.map((candidate) => {
    if (!isRecord(candidate)) {
      return processorError("INVALID_MESSAGE_EVENT");
    }

    const content = readContent(candidate);

    return {
      phoneNumber: readSenderPhoneNumber(candidate.from),
      providerMessageId: readProviderMessageId(
        candidate.id,
      ),
      occurredAt: readProviderTimestamp(
        candidate.timestamp,
      ),
      ...content,
    };
  });
}

function readDeliveryStatus(
  value: unknown,
): Exclude<MessageStatus, "received"> {
  if (
    typeof value !== "string" ||
    !supportedDeliveryStatuses.has(
      value as Exclude<MessageStatus, "received">,
    )
  ) {
    return processorError("UNSUPPORTED_MESSAGE_STATUS");
  }

  return value as Exclude<MessageStatus, "received">;
}

function readDeliveryFailureCode(
  candidate: Readonly<Record<string, unknown>>,
  status: Exclude<MessageStatus, "received">,
): number | null {
  if (status !== "failed") {
    if (candidate.errors !== undefined) {
      return processorError(
        "INVALID_MESSAGE_STATUS_ERRORS",
      );
    }

    return null;
  }

  if (
    !Array.isArray(candidate.errors) ||
    candidate.errors.length === 0 ||
    candidate.errors.length > 10
  ) {
    return processorError(
      "INVALID_MESSAGE_STATUS_ERRORS",
    );
  }

  const codes = candidate.errors.map((error) => {
    if (
      !isRecord(error) ||
      !Number.isSafeInteger(error.code) ||
      Number(error.code) < 1 ||
      Number(error.code) > 999_999
    ) {
      return processorError(
        "INVALID_MESSAGE_STATUS_ERRORS",
      );
    }

    return Number(error.code);
  });
  const firstCode = codes[0];

  if (
    firstCode === undefined ||
    codes.some((code) => code !== firstCode)
  ) {
    return processorError(
      "AMBIGUOUS_MESSAGE_STATUS_ERRORS",
    );
  }

  return firstCode;
}

export function parseMetaDeliveryStatusesEvent(
  event: MetaDeliveryStatusesWebhookEvent,
  expectedPhoneNumberId: string,
): readonly ParsedMetaDeliveryStatus[] {
  requireMessageEventMetadata(
    event.value,
    expectedPhoneNumberId,
  );
  requireBoundedItems(event.statuses);

  return event.statuses.map((candidate, statusIndex) => {
    if (!isRecord(candidate)) {
      return processorError("INVALID_MESSAGE_STATUS_EVENT");
    }

    const status = readDeliveryStatus(
      candidate.status,
    );

    return {
      providerMessageId: readProviderMessageId(
        candidate.id,
      ),
      status,
      providerErrorCode: readDeliveryFailureCode(
        candidate,
        status,
      ),
      statusEventAt: readProviderTimestamp(
        candidate.timestamp,
      ),
      statusIndex,
    };
  });
}

export function preflightMetaMessageWebhookEvent(
  event:
    | MetaInboundMessagesWebhookEvent
    | MetaDeliveryStatusesWebhookEvent,
  expectedPhoneNumberId: string,
): void {
  if (event.kind === "inbound_messages") {
    parseMetaInboundMessagesEvent(
      event,
      expectedPhoneNumberId,
    );
    return;
  }

  parseMetaDeliveryStatusesEvent(
    event,
    expectedPhoneNumberId,
  );
}

async function deriveDeliveryStatusEventKey(
  dispatchKey: string,
  statusIndex: number,
): Promise<string> {
  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace: "message_status_v1",
        dispatchKey,
        statusIndex,
      }),
    ),
  );
}

export function createMetaMessageWebhookEventProcessor(
  repository: ConversationRepository,
  inboundRuntime?:
    InboundAutomationProcessor,
  campaignStatuses?:
    CampaignDeliveryStatusReconciler,
  botReplyStatuses?:
    BotReplyDeliveryStatusReconciler,
): (
  event:
    | MetaInboundMessagesWebhookEvent
    | MetaDeliveryStatusesWebhookEvent,
  batch: MetaWebhookDispatchBatch,
) => Promise<void> {
  return async (event, batch) => {
    if (event.kind === "inbound_messages") {
      const messages = parseMetaInboundMessagesEvent(
        event,
        batch.connection.phoneNumberId,
      );

      for (const parsed of messages) {
        let conversationKey: string;
        let messageKey: string;

        try {
          const contact =
            await repository.resolveInboundContact(
              batch.tenantId,
              parsed.phoneNumber,
            );
          conversationKey =
            await deriveConversationKey(
              batch.tenantId,
              contact.contactId,
            );
          const derived =
            await deriveInboundMessageKey(
              batch.tenantId,
              {
                contactId: contact.contactId,
                providerMessageId:
                  parsed.providerMessageId,
                contentKind:
                  parsed.contentKind,
                textContent:
                  parsed.textContent,
                occurredAt:
                  parsed.occurredAt,
              },
            );
          messageKey = derived.messageKey;

          await repository.recordInboundMessage({
            tenantId: batch.tenantId,
            conversationKey,
            messageKey,
            ...derived.message,
            selectedBotOptionKey:
              parsed.selectedBotOptionKey,
            replyToProviderMessageId:
              parsed.replyToProviderMessageId,
          });
        } catch (error) {
          if (error instanceof MessageIdentityConflictError) {
            return processorError(
              "MESSAGE_IDENTITY_CONFLICT",
            );
          }

          return processorError("MESSAGE_STORAGE_FAILED");
        }

        if (inboundRuntime) {
          try {
            await inboundRuntime.process({
              tenantId: batch.tenantId,
              conversationKey,
              inboundMessageKey: messageKey,
              recipientPhoneNumber:
                parsed.phoneNumber,
              phoneNumberId:
                batch.connection.phoneNumberId,
              textContent:
                parsed.textContent,
              selectedBotOptionKey:
                parsed.selectedBotOptionKey,
              replyToProviderMessageId:
                parsed.replyToProviderMessageId,
              inboundMessageOccurredAt:
                parsed.occurredAt,
            });
          } catch {
            return processorError(
              "AUTOMATION_RUNTIME_FAILED",
            );
          }
        }
      }

      return;
    }

    const statuses = parseMetaDeliveryStatusesEvent(
      event,
      batch.connection.phoneNumberId,
    );

    for (const parsed of statuses) {
      const statusEventKey =
        await deriveDeliveryStatusEventKey(
          event.dispatchKey,
          parsed.statusIndex,
        );
      let result;

      try {
        result = await repository.applyDeliveryStatus({
          tenantId: batch.tenantId,
          providerMessageId: parsed.providerMessageId,
          status: parsed.status,
          statusEventKey,
          statusEventAt: parsed.statusEventAt,
        });
      } catch {
        return processorError(
          "MESSAGE_STATUS_STORAGE_FAILED",
        );
      }

      let campaignResult: {
        outcome: "not-found" | "reconciled";
      } = { outcome: "not-found" };
      let botReplyResult: {
        outcome: "not-found" | "reconciled";
      } = { outcome: "not-found" };

      if (campaignStatuses) {
        try {
          campaignResult =
            await campaignStatuses.reconcile({
              tenantId: batch.tenantId,
              providerMessageId:
                parsed.providerMessageId,
              status: parsed.status,
              providerErrorCode:
                parsed.providerErrorCode,
              statusEventKey,
              statusEventAt:
                parsed.statusEventAt,
            });
        } catch {
          return processorError(
            "CAMPAIGN_STATUS_RECONCILIATION_FAILED",
          );
        }
      }

      if (botReplyStatuses) {
        try {
          botReplyResult =
            await botReplyStatuses.reconcile({
              tenantId: batch.tenantId,
              providerMessageId:
                parsed.providerMessageId,
              status: parsed.status,
              providerErrorCode:
                parsed.providerErrorCode,
              statusEventKey,
              statusEventAt: parsed.statusEventAt,
            });
        } catch {
          return processorError(
            "BOT_REPLY_STATUS_RECONCILIATION_FAILED",
          );
        }
      }

      if (
        result.outcome === "not-found" &&
        campaignResult.outcome === "not-found" &&
        botReplyResult.outcome === "not-found"
      ) {
        return processorError(
          "MESSAGE_STATUS_TARGET_NOT_FOUND",
        );
      }
    }
  };
}
