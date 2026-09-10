import type { MetaHistoryWebhookEvent } from "./metaWebhookEventDispatcher.ts";
import { MetaWebhookProcessorError } from "./metaWebhookIngress.ts";
import type { MetaContactSyncScope } from "./metaContactSync.ts";

export type MetaHistoryScope = MetaContactSyncScope;
type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export const metaHistoryMessageTypes = ["text", "image", "audio", "video", "document", "sticker", "location", "contacts", "interactive", "media_placeholder"] as const;
export const metaHistoryDeliveryStates = ["DELIVERED", "ERROR", "PENDING", "PLAYED", "READ", "SENT"] as const;
export interface MetaHistoryMessage {
  readonly threadPhoneNumber: string;
  readonly providerMessageId: string;
  readonly direction: "inbound" | "outbound";
  readonly occurredAt: string;
  readonly contentKind: (typeof metaHistoryMessageTypes)[number];
  readonly content: Json;
  readonly deliveryState: (typeof metaHistoryDeliveryStates)[number];
}
export type MetaHistoryItem = Readonly<
  { kind: "declined" } |
  { kind: "chunk"; phase: number; chunkOrder: number; progress: number; messages: readonly MetaHistoryMessage[] } |
  { kind: "media"; providerMessageId: string; reportedSender: string; reportedAt: string;
    contentKind: "image" | "audio" | "video" | "document" | "sticker"; content: Json }
>;
export interface MetaHistorySyncRepository {
  record(scope: MetaHistoryScope, item: MetaHistoryItem): Promise<{ outcome: "stored" | "duplicate" | "conflicted" | "discarded" | "declined" }>;
}

function fail(): never { throw new MetaWebhookProcessorError("INVALID_HISTORY_SYNC"); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function phone(value: unknown): string {
  if (typeof value !== "string" || !/^\+?[1-9][0-9]{0,14}$/.test(value)) return fail();
  return value.startsWith("+") ? value : `+${value}`;
}
function id(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 255 || value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)) return fail();
  return value;
}
function integer(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > maximum) return fail();
  return value;
}
function timestamp(value: unknown): string {
  const seconds = typeof value === "string" && /^[0-9]{1,12}$/.test(value) ? Number(value) : value;
  return new Date(integer(seconds, 1, 253_402_300_799) * 1_000).toISOString();
}
function iso(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) || Date.parse(value) <= 0 || new Date(value).toISOString() !== value) return fail();
  return value;
}
// Local admission limits, not Meta quotas. Canonical, frozen content preserves
// provider fields without projecting media, delivery state or automation.
function json(value: unknown, budget: { nodes: number }, depth = 0): Json {
  if (++budget.nodes > 100_000 || depth > 12) return fail();
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) return fail(); return value; }
  if (typeof value === "string") { if (value.length > 16_384 || value.includes("\u0000")) return fail(); return value; }
  if (Array.isArray(value)) return Object.freeze(value.map((item) => json(item, budget, depth + 1)));
  if (!record(value)) return fail();
  return Object.freeze(Object.fromEntries(Object.keys(value).sort().map((key) => {
    if (key.length > 255 || /[\u0000-\u001f\u007f]/.test(key)) return fail();
    return [key, json(value[key], budget, depth + 1)];
  })));
}
function content(kind: unknown, value: unknown, budget: { nodes: number }): Json {
  if (!metaHistoryMessageTypes.includes(kind as MetaHistoryMessage["contentKind"])) return fail();
  if (kind === "media_placeholder") { if (value !== undefined && value !== null) return fail(); return null; }
  if (kind === "contacts" ? !Array.isArray(value) || value.length === 0 : !record(value)) return fail();
  if (kind === "text" && (!record(value) || typeof value.body !== "string" || value.body.trim().length === 0)) return fail();
  return json(value, budget);
}
function sortMessages(messages: MetaHistoryMessage[]) {
  const seen = new Set<string>();
  for (const message of messages) { if (seen.has(message.providerMessageId)) return fail(); seen.add(message.providerMessageId); }
  return Object.freeze(messages.sort((a, b) => a.providerMessageId < b.providerMessageId ? -1 : a.providerMessageId > b.providerMessageId ? 1 : 0));
}

function parseHistoryItems(event: MetaHistoryWebhookEvent, expectedPhoneNumberId: string): readonly MetaHistoryItem[] {
  const value = event.value;
  if (value.messaging_product !== "whatsapp" || !record(value.metadata) || value.metadata.phone_number_id !== expectedPhoneNumberId ||
    ["state_sync", "message_echoes", "statuses"].some((key) => value[key] !== undefined)) return fail();
  const businessPhone = phone(value.metadata.display_phone_number);
  const budget = { nodes: 0 };
  let messageCount = 0;
  if (value.messages !== undefined) {
    if (value.history !== undefined || !Array.isArray(value.messages) || value.messages.length === 0 || value.messages.length > 10_000) return fail();
    return Object.freeze(value.messages.map((candidate) => {
      if (!record(candidate) || !["image", "audio", "video", "document", "sticker"].includes(String(candidate.type))) return fail();
      const kind = candidate.type as Extract<MetaHistoryItem, { kind: "media" }>["contentKind"];
      const media = candidate[kind];
      if (!record(media)) return fail();
      id(media.id);
      if (media.sha256 !== undefined && (typeof media.sha256 !== "string" || !/^[0-9a-fA-F]{64}$/.test(media.sha256))) return fail();
      // A media webhook has no thread/direction context. Preserve its reported
      // sender/time, but never use them to overwrite the original message.
      return Object.freeze({ kind: "media" as const, providerMessageId: id(candidate.id), reportedSender: phone(candidate.from),
        reportedAt: timestamp(candidate.timestamp), contentKind: kind, content: content(kind, media, budget) });
    }));
  }
  if (!Array.isArray(value.history) || value.history.length === 0 || value.history.length > 100) return fail();
  return Object.freeze(value.history.map((part) => {
    if (!record(part)) return fail();
    if (part.errors !== undefined) {
      if (part.metadata !== undefined || part.threads !== undefined || !Array.isArray(part.errors) || part.errors.length === 0 ||
        !part.errors.every((error) => record(error) && error.code === 2593109)) return fail();
      return Object.freeze({ kind: "declined" as const });
    }
    if (!record(part.metadata) || !Array.isArray(part.threads) || part.threads.length > 10_000) return fail();
    const messages: MetaHistoryMessage[] = [];
    for (const thread of part.threads) {
      if (!record(thread) || !Array.isArray(thread.messages) || thread.messages.length === 0) return fail();
      const threadPhoneNumber = phone(thread.id);
      if (threadPhoneNumber === businessPhone) return fail();
      for (const candidate of thread.messages) {
        if (++messageCount > 10_000 || !record(candidate) || !record(candidate.history_context) ||
          !metaHistoryDeliveryStates.includes(candidate.history_context.status as MetaHistoryMessage["deliveryState"])) return fail();
        const sender = phone(candidate.from);
        if (sender !== businessPhone && sender !== threadPhoneNumber) return fail();
        const direction = sender === businessPhone ? "outbound" : "inbound";
        if (candidate.to !== undefined && (direction !== "outbound" || phone(candidate.to) !== threadPhoneNumber)) return fail();
        messages.push(Object.freeze({ threadPhoneNumber, providerMessageId: id(candidate.id), direction,
          occurredAt: timestamp(candidate.timestamp), contentKind: candidate.type as MetaHistoryMessage["contentKind"],
          content: content(candidate.type, candidate[String(candidate.type)], budget),
          deliveryState: candidate.history_context.status as MetaHistoryMessage["deliveryState"] }));
      }
    }
    return Object.freeze({ kind: "chunk" as const, phase: integer(part.metadata.phase, 0, 2),
      chunkOrder: integer(part.metadata.chunk_order, 0, 2_147_483_647), progress: integer(part.metadata.progress, 0, 100), messages: sortMessages(messages) });
  }));
}

function normalizeHistoryItem(rawItem: MetaHistoryItem): MetaHistoryItem {
  const budget = { nodes: 0 };
  let item: MetaHistoryItem;
  if (rawItem?.kind === "declined") item = Object.freeze({ kind: "declined" });
  else if (rawItem?.kind === "media") {
    if (!["image", "audio", "video", "document", "sticker"].includes(rawItem.contentKind) || !record(rawItem.content)) return fail();
    id(rawItem.content.id);
    if (rawItem.content.sha256 !== undefined && (typeof rawItem.content.sha256 !== "string" || !/^[0-9a-fA-F]{64}$/.test(rawItem.content.sha256))) return fail();
    item = Object.freeze({ kind: "media", providerMessageId: id(rawItem.providerMessageId), reportedSender: phone(rawItem.reportedSender),
      reportedAt: iso(rawItem.reportedAt), contentKind: rawItem.contentKind, content: content(rawItem.contentKind, rawItem.content, budget) });
  } else if (rawItem?.kind === "chunk") {
    if (!Array.isArray(rawItem.messages) || rawItem.messages.length > 10_000) return fail();
    const messages = rawItem.messages.map((message) => {
      if (!record(message) || (message.direction !== "inbound" && message.direction !== "outbound") ||
        !metaHistoryDeliveryStates.includes(message.deliveryState as MetaHistoryMessage["deliveryState"])) return fail();
      return Object.freeze({ threadPhoneNumber: phone(message.threadPhoneNumber), providerMessageId: id(message.providerMessageId),
        direction: message.direction, occurredAt: iso(message.occurredAt), contentKind: message.contentKind as MetaHistoryMessage["contentKind"],
        content: content(message.contentKind, message.content, budget), deliveryState: message.deliveryState as MetaHistoryMessage["deliveryState"] });
    });
    item = Object.freeze({ kind: "chunk", phase: integer(rawItem.phase, 0, 2), chunkOrder: integer(rawItem.chunkOrder, 0, 2_147_483_647),
      progress: integer(rawItem.progress, 0, 100), messages: sortMessages(messages) });
  } else return fail();
  if (new TextEncoder().encode(JSON.stringify(item)).byteLength > 2 * 1024 * 1024) return fail();
  return item;
}

export function parseMetaHistorySync(event: MetaHistoryWebhookEvent, expectedPhoneNumberId: string): readonly MetaHistoryItem[] {
  return Object.freeze(parseHistoryItems(event, expectedPhoneNumberId).map(normalizeHistoryItem));
}

export function normalizeMetaHistorySync(rawScope: MetaHistoryScope, rawItem: MetaHistoryItem) {
  const scope = Object.freeze({ tenantId: integer(rawScope?.tenantId, 1, Number.MAX_SAFE_INTEGER),
    wabaId: id(rawScope.wabaId), phoneNumberId: id(rawScope.phoneNumberId), connectionVersion: integer(rawScope.connectionVersion, 1, 2_147_483_647) });
  return Object.freeze({ scope, item: normalizeHistoryItem(rawItem) });
}
