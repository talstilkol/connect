import type {
  MetaWebhookProcessingEvent,
  MetaWebhookProcessor,
} from "./metaWebhookIngress.ts";
import {
  MetaWebhookProcessorError,
} from "./metaWebhookIngress.ts";
import type {
  MetaConnectionRecord,
} from "../../shared/domain/metaConnection.ts";

export type MetaWebhookEventKind =
  | "inbound_messages"
  | "delivery_statuses"
  | "template_status"
  | "account_update";

interface MetaWebhookDispatchedEventBase {
  dispatchKey: string;
  kind: MetaWebhookEventKind;
  entryIndex: number;
  changeIndex: number;
  occurredAt: number;
  value: Readonly<Record<string, unknown>>;
}

export interface MetaInboundMessagesWebhookEvent
  extends MetaWebhookDispatchedEventBase {
  kind: "inbound_messages";
  messages: readonly unknown[];
}

export interface MetaDeliveryStatusesWebhookEvent
  extends MetaWebhookDispatchedEventBase {
  kind: "delivery_statuses";
  statuses: readonly unknown[];
}

export interface MetaTemplateStatusWebhookEvent
  extends MetaWebhookDispatchedEventBase {
  kind: "template_status";
}

export interface MetaAccountUpdateWebhookEvent
  extends MetaWebhookDispatchedEventBase {
  kind: "account_update";
}

export type MetaWebhookDispatchedEvent =
  | MetaInboundMessagesWebhookEvent
  | MetaDeliveryStatusesWebhookEvent
  | MetaTemplateStatusWebhookEvent
  | MetaAccountUpdateWebhookEvent;

export interface MetaWebhookDispatchBatch {
  tenantId: number;
  receiptId: number;
  eventKey: string;
  connection: MetaConnectionRecord;
  events: readonly MetaWebhookDispatchedEvent[];
}

export type MetaWebhookEventBatchProcessor = (
  batch: MetaWebhookDispatchBatch,
) => Promise<void>;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function dispatchKey(
  eventKey: string,
  entryIndex: number,
  changeIndex: number,
  kind: MetaWebhookEventKind,
): string {
  return `${eventKey}:${entryIndex}:${changeIndex}:${kind}`;
}

function requireEntryTimestamp(
  entry: Readonly<Record<string, unknown>>,
): number {
  const value = entry.time;

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 253_402_300_799
  ) {
    throw new MetaWebhookProcessorError(
      "INVALID_WEBHOOK_TIMESTAMP",
    );
  }

  return value;
}

function classifyMessagesChange(
  eventKey: string,
  entryIndex: number,
  changeIndex: number,
  occurredAt: number,
  value: Readonly<Record<string, unknown>>,
): MetaWebhookDispatchedEvent[] {
  const events: MetaWebhookDispatchedEvent[] = [];

  if (
    Array.isArray(value.messages) &&
    value.messages.length > 0
  ) {
    events.push({
      dispatchKey: dispatchKey(
        eventKey,
        entryIndex,
        changeIndex,
        "inbound_messages",
      ),
      kind: "inbound_messages",
      entryIndex,
      changeIndex,
      occurredAt,
      value,
      messages: value.messages,
    });
  }

  if (
    Array.isArray(value.statuses) &&
    value.statuses.length > 0
  ) {
    events.push({
      dispatchKey: dispatchKey(
        eventKey,
        entryIndex,
        changeIndex,
        "delivery_statuses",
      ),
      kind: "delivery_statuses",
      entryIndex,
      changeIndex,
      occurredAt,
      value,
      statuses: value.statuses,
    });
  }

  if (events.length === 0) {
    throw new MetaWebhookProcessorError(
      "UNSUPPORTED_MESSAGES_CHANGE",
    );
  }

  return events;
}

function classifyChange(
  eventKey: string,
  entryIndex: number,
  changeIndex: number,
  occurredAt: number,
  change: unknown,
): MetaWebhookDispatchedEvent[] {
  if (
    !isRecord(change) ||
    typeof change.field !== "string" ||
    !isRecord(change.value)
  ) {
    throw new MetaWebhookProcessorError(
      "INVALID_WEBHOOK_CHANGE",
    );
  }

  if (change.field === "messages") {
    return classifyMessagesChange(
      eventKey,
      entryIndex,
      changeIndex,
      occurredAt,
      change.value,
    );
  }

  if (change.field === "message_template_status_update") {
    return [
      {
        dispatchKey: dispatchKey(
          eventKey,
          entryIndex,
          changeIndex,
          "template_status",
        ),
        kind: "template_status",
        entryIndex,
        changeIndex,
        occurredAt,
        value: change.value,
      },
    ];
  }

  if (change.field === "account_update") {
    return [
      {
        dispatchKey: dispatchKey(
          eventKey,
          entryIndex,
          changeIndex,
          "account_update",
        ),
        kind: "account_update",
        entryIndex,
        changeIndex,
        occurredAt,
        value: change.value,
      },
    ];
  }

  throw new MetaWebhookProcessorError(
    "UNSUPPORTED_WEBHOOK_FIELD",
  );
}

export function classifyMetaWebhookEvents(
  event: MetaWebhookProcessingEvent,
): readonly MetaWebhookDispatchedEvent[] {
  const entries = event.envelope.payload.entry;

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new MetaWebhookProcessorError(
      "INVALID_WEBHOOK_ENTRIES",
    );
  }

  const events: MetaWebhookDispatchedEvent[] = [];

  for (
    let entryIndex = 0;
    entryIndex < entries.length;
    entryIndex += 1
  ) {
    const entry = entries[entryIndex];

    if (
      !isRecord(entry) ||
      !Array.isArray(entry.changes) ||
      entry.changes.length === 0
    ) {
      throw new MetaWebhookProcessorError(
        "INVALID_WEBHOOK_CHANGES",
      );
    }
    const occurredAt = requireEntryTimestamp(entry);

    for (
      let changeIndex = 0;
      changeIndex < entry.changes.length;
      changeIndex += 1
    ) {
      events.push(
        ...classifyChange(
          event.eventKey,
          entryIndex,
          changeIndex,
          occurredAt,
          entry.changes[changeIndex],
        ),
      );
    }
  }

  return events;
}

export function createMetaWebhookEventDispatcher(
  processBatch: MetaWebhookEventBatchProcessor,
): MetaWebhookProcessor {
  if (typeof processBatch !== "function") {
    throw new Error(
      "Meta webhook event batch processor is required",
    );
  }

  return async (event) => {
    const events = classifyMetaWebhookEvents(event);

    await processBatch({
      tenantId: event.tenantId,
      receiptId: event.receiptId,
      eventKey: event.eventKey,
      connection: event.connection,
      events,
    });
  };
}
