import { parseMetaAccountLifecycleObservation, type MetaAccountLifecycleRepository } from "./metaAccountLifecycleRecord.ts";
import type { MetaRepository } from "../../db/metaRepository.ts";
import { parseMetaContactSync, type MetaContactSyncRepository } from "./metaContactSync.ts";
import { parseMetaHistorySync, type MetaHistorySyncRepository } from "./metaHistorySync.ts";
import { parseMetaMessageEchoes, type MetaMessageEchoRepository } from "../conversations/metaMessageEcho.ts";
import { isMetaAccountLifecycleEvent, isMetaAccountRevocationEvent } from "./metaAccountLifecycle.ts";
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
import type {
  BotReplyDeliveryStatusReconciler,
} from "../bot/botReplyDeliveryStatusReconciler.ts";

export interface MetaWebhookBusinessRepositories {
  conversations: ConversationRepository;
  messageEchoes?: MetaMessageEchoRepository;
  contactSync?: MetaContactSyncRepository;
  historySync?: MetaHistorySyncRepository;
  accounts?: Pick<MetaRepository, "revokeConnection">;
  accountLifecycle?: MetaAccountLifecycleRepository;
  templates: MessageTemplateRepository;
  inboundRuntime?:
    InboundAutomationProcessor;
  campaignStatuses?:
    CampaignDeliveryStatusReconciler;
  botReplyStatuses?:
    BotReplyDeliveryStatusReconciler;
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
      repositories.botReplyStatuses,
    );
  const processTemplate =
    createMessageTemplateStatusEventProcessor(
      repositories.templates,
    );

  return async (batch) => {
    if (
      batch.events.length === 0 ||
      batch.connection.tenantId !== batch.tenantId ||
      (batch.connection.status !== "connected" && !batch.events.every((event) =>
        event.kind === "account_update" && isMetaAccountLifecycleEvent(event.value.event)))
    ) {
      return processorError("INVALID_BUSINESS_EVENT_BATCH");
    }

    const accountEvents = batch.events.filter((event) => event.kind === "account_update");
    if (accountEvents.length > 0) {
      if (!repositories.accounts && !repositories.accountLifecycle) return processorError("PROCESSOR_NOT_CONFIGURED");
      for (const event of accountEvents) {
        if (!isMetaAccountLifecycleEvent(event.value.event)) {
          return processorError("UNSUPPORTED_ACCOUNT_UPDATE");
        }
        const info = event.value.waba_info;
        if (info !== undefined) {
          if (typeof info !== "object" || info === null || Array.isArray(info)) {
            return processorError("INVALID_ACCOUNT_UPDATE_SCOPE");
          }
          const scope = info as Record<string, unknown>;
          if (scope.waba_id !== batch.connection.wabaId ||
            (scope.owner_business_id !== undefined && scope.owner_business_id !== batch.connection.businessPortfolioId)) {
            return processorError("INVALID_ACCOUNT_UPDATE_SCOPE");
          }
        }
      }
      if (repositories.accountLifecycle) {
        const events = accountEvents.map((event) => parseMetaAccountLifecycleObservation(event, batch.connection.wabaId));
        await repositories.accountLifecycle.recordBatch({ tenantId: batch.tenantId, receiptId: batch.receiptId, eventKey: batch.eventKey,
          wabaId: batch.connection.wabaId, phoneNumberId: batch.connection.phoneNumberId, businessPortfolioId: batch.connection.businessPortfolioId,
          connectionVersion: batch.connection.version, events });
      } else if (repositories.accounts && accountEvents.some((event) => isMetaAccountRevocationEvent(event.value.event))) {
        await repositories.accounts.revokeConnection(
          batch.tenantId, batch.connection.wabaId, batch.connection.version,
        );
      }
      // A reconnection notification never authorizes local activation. Do not
      // execute messages/automation bundled with a lifecycle transition.
      return;
    }

    for (const event of batch.events) {
      if (event.kind === "history") {
        if (!repositories.historySync) return processorError("PROCESSOR_NOT_CONFIGURED");
        parseMetaHistorySync(event, batch.connection.phoneNumberId);
        continue;
      }
      if (event.kind === "smb_app_state_sync") {
        if (!repositories.contactSync) return processorError("PROCESSOR_NOT_CONFIGURED");
        parseMetaContactSync(event, batch.connection.phoneNumberId);
        continue;
      }
      if (event.kind === "smb_message_echoes") {
        if (!repositories.messageEchoes) return processorError("PROCESSOR_NOT_CONFIGURED");
        parseMetaMessageEchoes(event, batch.connection.phoneNumberId);
        continue;
      }
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

    // All history refusals in this batch precede any data writes, including
    // when Meta puts the refusal in a separate change or entry.
    for (const event of batch.events) {
      if (event.kind !== "history") continue;
      const scope = Object.freeze({ tenantId: batch.tenantId, wabaId: batch.connection.wabaId,
        phoneNumberId: batch.connection.phoneNumberId, connectionVersion: batch.connection.version });
      for (const item of parseMetaHistorySync(event, scope.phoneNumberId).filter((item) => item.kind === "declined")) {
        try { await repositories.historySync!.record(scope, item); }
        catch (error) {
          if (error instanceof MetaWebhookProcessorError) throw error;
          return processorError("HISTORY_SYNC_STORAGE_FAILED");
        }
      }
    }

    for (const event of batch.events) {
      if (event.kind === "history") {
        const scope = Object.freeze({ tenantId: batch.tenantId, wabaId: batch.connection.wabaId,
          phoneNumberId: batch.connection.phoneNumberId, connectionVersion: batch.connection.version });
        const items = parseMetaHistorySync(event, scope.phoneNumberId);
        for (const item of items.filter((item) => item.kind !== "declined")) {
          try { await repositories.historySync!.record(scope, item); }
          catch (error) {
            if (error instanceof MetaWebhookProcessorError) throw error;
            return processorError("HISTORY_SYNC_STORAGE_FAILED");
          }
        }
        continue;
      }
      if (event.kind === "smb_app_state_sync") {
        const scope = Object.freeze({ tenantId: batch.tenantId, wabaId: batch.connection.wabaId,
          phoneNumberId: batch.connection.phoneNumberId, connectionVersion: batch.connection.version });
        for (const change of parseMetaContactSync(event, scope.phoneNumberId)) {
          try { await repositories.contactSync!.record(scope, change); }
          catch (error) {
            if (error instanceof MetaWebhookProcessorError) throw error;
            return processorError("CONTACT_SYNC_STORAGE_FAILED");
          }
        }
        continue;
      }
      if (event.kind === "smb_message_echoes") {
        const scope = Object.freeze({ tenantId: batch.tenantId, wabaId: batch.connection.wabaId,
          phoneNumberId: batch.connection.phoneNumberId, connectionVersion: batch.connection.version });
        for (const message of parseMetaMessageEchoes(event, scope.phoneNumberId)) {
          try {
            await repositories.messageEchoes!.record(scope, message);
          } catch (error) {
            if (error instanceof MetaWebhookProcessorError) throw error;
            return processorError("MESSAGE_ECHO_STORAGE_FAILED");
          }
        }
        continue;
      }
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
