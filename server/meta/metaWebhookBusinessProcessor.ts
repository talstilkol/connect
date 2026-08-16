import type {
  ConversationRepository,
} from "../../db/conversationRepository.ts";
import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import {
  createMetaMessageWebhookEventProcessor,
  preflightMetaMessageWebhookEvent,
} from "../conversations/metaMessageWebhookProcessor.ts";
import {
  createMessageTemplateStatusEventProcessor,
  parseMetaTemplateStatusEvent,
} from "../templates/messageTemplateStatusProcessor.ts";
import type {
  MetaDeliveryStatusesWebhookEvent,
  MetaInboundMessagesWebhookEvent,
  MetaTemplateStatusWebhookEvent,
  MetaWebhookEventBatchProcessor,
} from "./metaWebhookEventDispatcher.ts";
import {
  MetaWebhookProcessorError,
} from "./metaWebhookIngress.ts";
import type {
  InboundAutomationProcessor,
} from "../automation/inboundAutomationProcessor.ts";
import type {
  CampaignDeliveryStatusReconciler,
} from "../campaigns/campaignDeliveryStatusReconciler.ts";

export interface MetaWebhookBusinessRepositories {
  conversations: ConversationRepository;
  templates: MessageTemplateRepository;
  inboundRuntime?:
    InboundAutomationProcessor;
  campaignStatuses?:
    CampaignDeliveryStatusReconciler;
}

function processorError(code: string): never {
  throw new MetaWebhookProcessorError(code);
}

export function createMetaWebhookBusinessBatchProcessor(
  repositories: MetaWebhookBusinessRepositories,
): MetaWebhookEventBatchProcessor {
  const processMessage =
    createMetaMessageWebhookEventProcessor(
      repositories.conversations,
      repositories.inboundRuntime,
      repositories.campaignStatuses,
    );
  const processTemplate =
    createMessageTemplateStatusEventProcessor(
      repositories.templates,
    );

  return async (batch) => {
    if (
      batch.events.length === 0 ||
      batch.connection.tenantId !== batch.tenantId ||
      batch.connection.status !== "connected"
    ) {
      return processorError("INVALID_BUSINESS_EVENT_BATCH");
    }

    for (const event of batch.events) {
      if (
        event.kind === "inbound_messages" ||
        event.kind === "delivery_statuses"
      ) {
        preflightMetaMessageWebhookEvent(
          event,
          batch.connection.phoneNumberId,
        );
        continue;
      }

      if (event.kind === "template_status") {
        parseMetaTemplateStatusEvent(event);
        continue;
      }

      return processorError("PROCESSOR_NOT_CONFIGURED");
    }

    for (const event of batch.events) {
      if (event.kind === "template_status") {
        await processTemplate(
          event as MetaTemplateStatusWebhookEvent,
          batch.tenantId,
        );
        continue;
      }

      await processMessage(
        event as
          | MetaInboundMessagesWebhookEvent
          | MetaDeliveryStatusesWebhookEvent,
        batch,
      );
    }
  };
}
