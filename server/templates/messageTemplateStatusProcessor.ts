import {
  MessageTemplateIdentityConflictError,
  type ApplyMessageTemplateStatusEventResult,
  type MessageTemplateRepository,
  type MessageTemplateStatusEventStatus,
} from "../../db/messageTemplateRepository.ts";
import {
  persistedTemplateLanguages,
  type PersistedMessageTemplate,
} from "../../shared/domain/messageTemplate.ts";
import type {
  MetaTemplateStatusWebhookEvent,
  MetaWebhookDispatchBatch,
  MetaWebhookEventBatchProcessor,
} from "../meta/metaWebhookEventDispatcher.ts";
import {
  MetaWebhookProcessorError,
} from "../meta/metaWebhookIngress.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import {
  isMetaMessageTemplateProviderStatus,
  toMessageTemplateStatus,
  type MetaMessageTemplateProviderStatus,
} from "./metaMessageTemplateStatus.ts";

export interface ParsedMetaTemplateStatusEvent {
  providerEvent: MetaMessageTemplateProviderStatus;
  status: MessageTemplateStatusEventStatus;
  metaTemplateId: string;
  name: string;
  language: PersistedMessageTemplate["language"];
  statusEventAt: string;
}

export type MessageTemplateStatusProcessingResult =
  ApplyMessageTemplateStatusEventResult;

function processorError(code: string): never {
  throw new MetaWebhookProcessorError(code);
}

function readProviderEvent(
  value: unknown,
): MetaMessageTemplateProviderStatus {
  if (!isMetaMessageTemplateProviderStatus(value)) {
    processorError("UNSUPPORTED_TEMPLATE_STATUS_EVENT");
  }

  return value;
}

function readMetaTemplateId(value: unknown): string {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  ) {
    return String(value);
  }

  if (
    typeof value === "string" &&
    /^[0-9]{1,255}$/.test(value)
  ) {
    return value;
  }

  return processorError("INVALID_TEMPLATE_STATUS_EVENT");
}

function readTemplateName(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9_]{1,255}$/.test(value)
  ) {
    return processorError("INVALID_TEMPLATE_STATUS_EVENT");
  }

  return value;
}

function readTemplateLanguage(
  value: unknown,
): PersistedMessageTemplate["language"] {
  if (typeof value !== "string") {
    return processorError("INVALID_TEMPLATE_STATUS_EVENT");
  }

  const normalized = value.replace("-", "_");
  const language = persistedTemplateLanguages.find(
    (candidate) => candidate === normalized,
  );

  if (!language) {
    return processorError("UNSUPPORTED_TEMPLATE_LANGUAGE");
  }

  return language;
}

function toIsoTimestamp(value: number): string {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 253_402_300_799
  ) {
    return processorError("INVALID_TEMPLATE_STATUS_EVENT");
  }

  return new Date(value * 1_000).toISOString();
}

export function parseMetaTemplateStatusEvent(
  event: MetaTemplateStatusWebhookEvent,
): ParsedMetaTemplateStatusEvent {
  const providerEvent = readProviderEvent(
    event.value.event,
  );

  return {
    providerEvent,
    status: toMessageTemplateStatus(providerEvent),
    metaTemplateId: readMetaTemplateId(
      event.value.message_template_id,
    ),
    name: readTemplateName(
      event.value.message_template_name,
    ),
    language: readTemplateLanguage(
      event.value.message_template_language,
    ),
    statusEventAt: toIsoTimestamp(event.occurredAt),
  };
}

async function deriveStatusEventKey(
  dispatchKey: string,
): Promise<string> {
  return sha256Hex(new TextEncoder().encode(dispatchKey));
}

export function createMessageTemplateStatusEventProcessor(
  repository: MessageTemplateRepository,
): (
  event: MetaTemplateStatusWebhookEvent,
  tenantId: number,
) => Promise<MessageTemplateStatusProcessingResult> {
  return async (event, tenantId) => {
    const parsed = parseMetaTemplateStatusEvent(event);

    try {
      return await repository.applyStatusEvent({
        tenantId,
        metaTemplateId: parsed.metaTemplateId,
        name: parsed.name,
        language: parsed.language,
        status: parsed.status,
        statusEventKey: await deriveStatusEventKey(
          event.dispatchKey,
        ),
        statusEventAt: parsed.statusEventAt,
      });
    } catch (error) {
      if (
        error instanceof
        MessageTemplateIdentityConflictError
      ) {
        return processorError(
          "TEMPLATE_STATUS_IDENTITY_CONFLICT",
        );
      }

      return processorError(
        "TEMPLATE_STATUS_STORAGE_FAILED",
      );
    }
  };
}

function requireTemplateOnlyBatch(
  batch: MetaWebhookDispatchBatch,
): readonly MetaTemplateStatusWebhookEvent[] {
  if (
    batch.events.length === 0 ||
    batch.events.some(
      (event) => event.kind !== "template_status",
    )
  ) {
    return processorError("PROCESSOR_NOT_CONFIGURED");
  }

  return batch.events as readonly MetaTemplateStatusWebhookEvent[];
}

export function createMessageTemplateStatusBatchProcessor(
  repository: MessageTemplateRepository,
): MetaWebhookEventBatchProcessor {
  const processEvent =
    createMessageTemplateStatusEventProcessor(repository);

  return async (batch) => {
    const events = requireTemplateOnlyBatch(batch);

    for (const event of events) {
      await processEvent(event, batch.tenantId);
    }
  };
}
