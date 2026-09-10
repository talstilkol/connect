import type { MessageContentKind } from "../../shared/domain/conversation.ts";
import type { MetaMessageEchoesWebhookEvent } from "../meta/metaWebhookEventDispatcher.ts";
import { MetaWebhookProcessorError } from "../meta/metaWebhookIngress.ts";

export interface MetaMessageEcho {
  readonly recipientPhoneNumber: string;
  readonly providerMessageId: string;
  readonly contentKind: MessageContentKind;
  readonly textContent: string | null;
  readonly occurredAt: string;
  readonly mutation?: Readonly<{ kind: "edit" | "revoke"; originalProviderMessageId: string }>;
}

export interface MetaMessageEchoScope {
  readonly tenantId: number;
  readonly wabaId: string;
  readonly phoneNumberId: string;
  readonly connectionVersion: number;
}

export interface MetaMessageEchoRepository {
  record(scope: MetaMessageEchoScope, message: MetaMessageEcho): Promise<{ outcome: "created" | "duplicate" | "updated" | "deferred" | "ignored" }>;
}

function fail(code = "INVALID_MESSAGE_ECHO"): never {
  throw new MetaWebhookProcessorError(code);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function phone(value: unknown): string {
  if (typeof value !== "string" || !/^\+?[1-9][0-9]{0,14}$/.test(value)) return fail();
  return value.startsWith("+") ? value : `+${value}`;
}

function providerId(value: unknown): string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 ||
    value.length > 255 || /[\u0000-\u001f\u007f]/.test(value)) return fail();
  return value;
}

const contentKinds = new Set<MessageContentKind>([
  "text", "image", "audio", "video", "document", "sticker", "location", "contacts", "interactive",
]);

export function parseMetaMessageEchoes(event: MetaMessageEchoesWebhookEvent, expectedPhoneNumberId: string): readonly MetaMessageEcho[] {
  const value = event.value;
  if (value.messaging_product !== "whatsapp" || !record(value.metadata) ||
    value.metadata.phone_number_id !== expectedPhoneNumberId ||
    !Array.isArray(event.messageEchoes) || event.messageEchoes.length === 0 || event.messageEchoes.length > 100) {
    return fail("INVALID_MESSAGE_ECHO_METADATA");
  }
  const sender = phone(value.metadata.display_phone_number);
  return event.messageEchoes.map((candidate) => {
    if (!record(candidate) || phone(candidate.from) !== sender) return fail();
    const recipientPhoneNumber = phone(candidate.to);
    if (recipientPhoneNumber === sender) return fail();
    let mutation: MetaMessageEcho["mutation"];
    let source = candidate;
    if (candidate.type === "edit" || candidate.type === "revoke") {
      const change = candidate[candidate.type];
      if (!record(change)) return fail();
      mutation = Object.freeze({ kind: candidate.type, originalProviderMessageId: providerId(change.original_message_id) });
      if (candidate.type === "edit") {
        if (!record(change.message) || change.message.type !== "text") return fail("UNSUPPORTED_MESSAGE_ECHO_EDIT_CONTENT");
        source = change.message;
      } else source = { type: "unsupported" };
    }
    if (typeof source.type !== "string" || (mutation?.kind !== "revoke" && !contentKinds.has(source.type as MessageContentKind))) {
      return fail("UNSUPPORTED_MESSAGE_ECHO_CONTENT");
    }
    const content = source[source.type];
    if (mutation?.kind !== "revoke" && (source.type === "contacts" ? !Array.isArray(content) || content.length === 0 : !record(content))) return fail();
    let textContent: string | null = null;
    if (source.type === "text") {
      if (!record(content) || typeof content.body !== "string" || content.body.trim().length === 0 || content.body.length > 16_384) return fail();
      textContent = content.body;
    }
    const seconds = typeof candidate.timestamp === "string" && /^[0-9]{1,12}$/.test(candidate.timestamp)
      ? Number(candidate.timestamp) : candidate.timestamp;
    if (typeof seconds !== "number" || !Number.isSafeInteger(seconds) || seconds <= 0 || seconds > 253_402_300_799) return fail();
    return Object.freeze({ recipientPhoneNumber, providerMessageId: providerId(candidate.id),
      occurredAt: new Date(seconds * 1_000).toISOString(), contentKind: source.type as MessageContentKind, textContent,
      ...(mutation === undefined ? {} : { mutation }) });
  });
}

// Validate again at the persistence boundary, including callers other than the
// webhook processor. This function also snapshots the data before any await.
export function normalizeMetaMessageEcho(scope: MetaMessageEchoScope, message: MetaMessageEcho) {
  if (!Number.isSafeInteger(scope?.tenantId) || scope.tenantId <= 0 ||
    !Number.isSafeInteger(scope.connectionVersion) || scope.connectionVersion <= 0 ||
    message == null || (message.mutation?.kind !== "revoke" && !contentKinds.has(message.contentKind)) ||
    (message.mutation !== undefined && (!record(message.mutation) ||
      !["edit", "revoke"].includes(message.mutation.kind) ||
      (message.mutation.kind === "edit" && message.contentKind !== "text") ||
      (message.mutation.kind === "revoke" && message.contentKind !== "unsupported"))) ||
    typeof message.occurredAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(message.occurredAt) || !Number.isFinite(Date.parse(message.occurredAt)) ||
    new Date(message.occurredAt).toISOString() !== message.occurredAt ||
    Date.parse(message.occurredAt) <= 0 ||
    (message.contentKind === "text"
      ? typeof message.textContent !== "string" || message.textContent.trim().length === 0 || message.textContent.length > 16_384
      : message.textContent !== null)) return fail();
  return Object.freeze({ scope: Object.freeze({ tenantId: scope.tenantId,
    wabaId: providerId(scope.wabaId), phoneNumberId: providerId(scope.phoneNumberId), connectionVersion: scope.connectionVersion }),
    message: Object.freeze({ recipientPhoneNumber: phone(message.recipientPhoneNumber), providerMessageId: providerId(message.providerMessageId),
      contentKind: message.contentKind, textContent: message.textContent, occurredAt: message.occurredAt,
      ...(message.mutation === undefined ? {} : { mutation: Object.freeze({ kind: message.mutation.kind,
        originalProviderMessageId: providerId(message.mutation.originalProviderMessageId) }) }) }) });
}
