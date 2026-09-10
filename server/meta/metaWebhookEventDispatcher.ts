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
  | "smb_message_echoes"
  | "smb_app_state_sync"
  | "history"
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

export interface MetaMessageEchoesWebhookEvent
  extends Omit<MetaWebhookDispatchedEventBase, "kind" | "occurredAt"> {
  kind: "smb_message_echoes";
  occurredAt: number | null;
  messageEchoes: readonly unknown[];
}

export interface MetaContactSyncWebhookEvent
  extends Omit<MetaWebhookDispatchedEventBase, "kind" | "occurredAt"> {
  kind: "smb_app_state_sync";
  occurredAt: number | null;
  stateSync: readonly unknown[];
}

export interface MetaHistoryWebhookEvent
  extends Omit<MetaWebhookDispatchedEventBase, "kind" | "occurredAt"> {
  kind: "history";
  occurredAt: number | null;
}

export type MetaWebhookDispatchedEvent =
  | MetaInboundMessagesWebhookEvent
  | MetaDeliveryStatusesWebhookEvent
  | MetaTemplateStatusWebhookEvent
  | MetaAccountUpdateWebhookEvent
  | MetaContactSyncWebhookEvent
  | MetaHistoryWebhookEvent
  | MetaMessageEchoesWebhookEvent;

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
  occurredAt: number | null,
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

  if (change.field === "history") {
    const value = change.value;
    if ((value.history === undefined) === (value.messages === undefined) ||
      ["statuses", "state_sync", "message_echoes"].some((key) => value[key] !== undefined)) {
      throw new MetaWebhookProcessorError("INVALID_HISTORY_SYNC_CHANGE");
    }
    return [{ dispatchKey: dispatchKey(eventKey, entryIndex, changeIndex, "history"),
      kind: "history", entryIndex, changeIndex, occurredAt, value }];
  }

  if (change.field === "smb_app_state_sync") {
    const value = change.value;
    if (!Array.isArray(value.state_sync) || value.state_sync.length === 0 ||
      ["messages", "statuses", "history", "message_echoes"].some((key) => value[key] !== undefined)) {
      throw new MetaWebhookProcessorError("INVALID_CONTACT_SYNC_CHANGE");
    }
    return [{ dispatchKey: dispatchKey(eventKey, entryIndex, changeIndex, "smb_app_state_sync"),
      kind: "smb_app_state_sync", entryIndex, changeIndex, occurredAt,
      value, stateSync: value.state_sync }];
  }

  if (change.field === "smb_message_echoes") {
    if (!Array.isArray(change.value.message_echoes) || change.value.message_echoes.length === 0 ||
      change.value.messages !== undefined || change.value.statuses !== undefined) {
      throw new MetaWebhookProcessorError("INVALID_MESSAGE_ECHOES_CHANGE");
    }
    return [{ dispatchKey: dispatchKey(eventKey, entryIndex, changeIndex, "smb_message_echoes"),
      kind: "smb_message_echoes", entryIndex, changeIndex, occurredAt,
      value: change.value, messageEchoes: change.value.message_echoes }];
  }

  if (occurredAt === null) throw new MetaWebhookProcessorError("INVALID_WEBHOOK_TIMESTAMP");

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
    // Meta's echo/contact/history examples omit entry.time. Message time is
    // validated per item; history progress/refusal does not invent a timestamp.
    const occurredAt = entry.time === undefined && entry.changes.every(
      (change) => isRecord(change) && ["smb_message_echoes", "smb_app_state_sync", "history"].includes(String(change.field)),
    ) ? null : requireEntryTimestamp(entry);

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
