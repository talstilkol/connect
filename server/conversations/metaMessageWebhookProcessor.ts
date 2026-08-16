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

const MAXIMUM_ITEMS_PER_EVENT = 100;
const MAXIMUM_MESSAGE_TEXT_LENGTH = 16_384;

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
  occurredAt: string;
}

export interface ParsedMetaDeliveryStatus {
  providerMessageId: string;
  status: Exclude<MessageStatus, "received">;
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

    return {
      providerMessageId: readProviderMessageId(
        candidate.id,
      ),
      status: readDeliveryStatus(candidate.status),
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

      if (campaignStatuses) {
        try {
          campaignResult =
            await campaignStatuses.reconcile({
              tenantId: batch.tenantId,
              providerMessageId:
                parsed.providerMessageId,
              status: parsed.status,
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

      if (
        result.outcome === "not-found" &&
        campaignResult.outcome === "not-found"
      ) {
        return processorError(
          "MESSAGE_STATUS_TARGET_NOT_FOUND",
        );
      }
    }
  };
}
