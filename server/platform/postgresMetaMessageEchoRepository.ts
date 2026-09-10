import { normalizeMetaMessageEcho, type MetaMessageEchoRepository, type MetaMessageEchoScope, type MetaMessageEcho } from "../conversations/metaMessageEcho.ts";
import { isEditedMessageTextValid, messageContentStates, type MessageContentState, type MessageContentKind } from "../../shared/domain/conversation.ts";
import { deriveConversationKey } from "../conversations/conversationKey.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { MetaWebhookProcessorError } from "../meta/metaWebhookIngress.ts";
import { postgresConversationSql } from "./postgresConversationRepository.ts";
import { parsePostgresPositiveInteger, parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";

export const postgresMetaMessageEchoSql = Object.freeze({
  lockConnection: `SELECT connection.tenant_id AS "tenantId" FROM meta_connections AS connection
    JOIN tenants AS tenant ON tenant.id = connection.tenant_id AND tenant.status IN ('active', 'trial', 'payment_failed')
    WHERE connection.tenant_id = $1 AND connection.waba_id = $2 AND connection.phone_number_id = $3
      AND connection.version = $4 AND connection.status = 'connected'
    FOR SHARE OF connection, tenant`,
  resolveContact: postgresConversationSql.resolveInboundContact,
  insertConversation: postgresConversationSql.insertConversation,
  lockConversation: `SELECT conversation_key AS "conversationKey" FROM conversations
    WHERE tenant_id = $1 AND conversation_key = $2 AND contact_id = $3 FOR UPDATE`,
  insertMessage: `INSERT INTO messages (message_key, conversation_key, tenant_id, provider_message_id,
      direction, content_kind, status, text_content, occurred_at, status_updated_at, content_state)
    VALUES ($1, $2, $3, $4, 'outbound', $5, 'sent', $6, $7::timestamptz, $7::timestamptz, $8)
    ON CONFLICT DO NOTHING RETURNING message_key AS "messageKey"`,
  insertState: `INSERT INTO meta_message_echo_states (tenant_id, provider_message_id, waba_id, phone_number_id, recipient_phone)
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING provider_message_id AS "providerMessageId"`,
  lockState: `SELECT waba_id AS "wabaId", phone_number_id AS "phoneNumberId", recipient_phone AS "recipientPhoneNumber",
      original_digest AS "originalDigest", original_caption_digest AS "originalCaptionDigest",
      content_state AS "contentState", edit_at AS "editAt", edit_text AS "editText", edit_kind AS "editKind"
    FROM meta_message_echo_states WHERE tenant_id = $1 AND provider_message_id = $2 FOR UPDATE`,
  updateState: `UPDATE meta_message_echo_states SET original_digest = $3, content_state = $4, edit_at = $5::timestamptz, edit_text = $6, edit_kind = $7,
      original_caption_digest = $8
    WHERE tenant_id = $1 AND provider_message_id = $2 RETURNING provider_message_id AS "providerMessageId"`,
  claimEvent: `INSERT INTO meta_message_echo_events (tenant_id, event_key, request_digest, provider_message_id)
    VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING event_key AS "eventKey"`,
  readEvent: `SELECT request_digest AS "requestDigest", provider_message_id AS "providerMessageId"
    FROM meta_message_echo_events WHERE tenant_id = $1 AND event_key = $2`,
  readTarget: `SELECT m.message_key AS "messageKey", m.conversation_key AS "conversationKey", m.direction,
      m.content_kind AS "contentKind", m.content_state AS "contentState", m.text_content AS "textContent", m.occurred_at AS "occurredAt",
      contact.phone_e164 AS "recipientPhoneNumber"
    FROM messages AS m JOIN conversations AS c ON c.tenant_id = m.tenant_id AND c.conversation_key = m.conversation_key
    JOIN contacts AS contact ON contact.tenant_id = c.tenant_id AND contact.id = c.contact_id
    WHERE m.tenant_id = $1 AND m.provider_message_id = $2`,
  lockTargetConversation: `SELECT conversation_key AS "conversationKey" FROM conversations
    WHERE tenant_id = $1 AND conversation_key = $2 FOR UPDATE`,
  project: `UPDATE messages SET content_kind = $3, text_content = $4, content_state = $5,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1 AND message_key = $2 AND direction = 'outbound'
    RETURNING message_key AS "messageKey"`,
  touchConversation: `UPDATE conversations SET version = version + 1, updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1 AND conversation_key = $2 RETURNING conversation_key AS "conversationKey"`,
  updateConversation: `UPDATE conversations SET last_message_key = $3, last_message_at = $4::timestamptz,
      version = version + 1, updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1 AND conversation_key = $2 AND
      (last_message_at IS NULL OR last_message_at < $4::timestamptz OR
        (last_message_at = $4::timestamptz AND last_message_key < $3))
    RETURNING conversation_key AS "conversationKey"`,
});

async function one(tx: PostgresTransaction, sql: string, parameters: readonly PostgresParameter[]) {
  return requirePostgresRows(await tx.query(sql, parameters), 1)[0] ?? null;
}

function requireKey(value: unknown, name: string, expected: string) {
  if (requireExactPostgresRow(value, [name])[name] !== expected) {
    throw new MetaWebhookProcessorError("MESSAGE_ECHO_STORAGE_FAILED");
  }
}

interface EchoState {
  originalDigest: string | null;
  originalCaptionDigest: string | null;
  contentState: MessageContentState;
  editAt: string | null;
  editText: string | null;
  editKind: MessageContentKind | null;
}

function digest(value: unknown) {
  return sha256Hex(new TextEncoder().encode(JSON.stringify(value)));
}

function conflict(): never {
  throw new MetaWebhookProcessorError("MESSAGE_ECHO_IDENTITY_CONFLICT");
}

function parseState(value: unknown, scope: MetaMessageEchoScope, recipient: string): EchoState {
  const row = requireExactPostgresRow(value, ["wabaId", "phoneNumberId", "recipientPhoneNumber", "originalDigest", "originalCaptionDigest", "contentState", "editAt", "editText", "editKind"]);
  if (row.wabaId !== scope.wabaId || row.phoneNumberId !== scope.phoneNumberId || row.recipientPhoneNumber !== recipient) return conflict();
  if (!messageContentStates.includes(row.contentState as MessageContentState) ||
    (row.originalDigest !== null && (typeof row.originalDigest !== "string" || !/^[0-9a-f]{64}$/.test(row.originalDigest))) ||
    (row.originalCaptionDigest !== null && (row.originalDigest === null || typeof row.originalCaptionDigest !== "string" || !/^[0-9a-f]{64}$/.test(row.originalCaptionDigest))) ||
    (row.editText !== null && (typeof row.editText !== "string" || row.editText.trim().length === 0 || row.editText.length > 16_384))) return conflict();
  const state = { originalDigest: row.originalDigest as string | null, originalCaptionDigest: row.originalCaptionDigest as string | null,
    contentState: row.contentState as MessageContentState,
    editAt: row.editAt === null ? null : parsePostgresTimestamp(row.editAt), editText: row.editText as string | null,
    editKind: row.editKind as MessageContentKind | null };
  if ((state.contentState === "edited" && (state.editAt === null || !isEditedMessageTextValid(state.editKind, state.editText))) ||
    (state.contentState === "conflicted" && (state.editAt === null || state.editText !== null || !["text", "image", "video", "document"].includes(String(state.editKind)))) ||
    (["original", "deleted"].includes(state.contentState) && (state.editAt !== null || state.editText !== null || state.editKind !== null))) return conflict();
  return state;
}

export function reduceMetaEchoMutation(state: Readonly<EchoState>, message: MetaMessageEcho): EchoState {
  if (state.contentState === "deleted" || message.mutation === undefined) return { ...state };
  if (message.mutation.kind === "revoke") return { ...state, contentState: "deleted", editAt: null, editText: null, editKind: null };
  // An edit changes content within a message type, never its attachment type.
  if (state.editKind !== null && state.editKind !== message.contentKind) return conflict();
  if (state.editAt !== null && state.editAt > message.occurredAt) return { ...state };
  if (state.editAt === message.occurredAt) {
    if (state.contentState === "conflicted" || state.editText === message.textContent) return { ...state };
    return { ...state, contentState: "conflicted", editText: null };
  }
  return { ...state, contentState: "edited", editAt: message.occurredAt, editText: message.textContent, editKind: message.contentKind };
}

function projection(state: EchoState, original: { contentKind: MessageContentKind; textContent: string | null }) {
  if (state.contentState === "original") return { ...original, contentState: "original" as const };
  if (state.contentState === "edited") return { contentKind: state.editKind!, textContent: state.editText, contentState: state.contentState };
  return { contentKind: "unsupported" as const, textContent: null, contentState: state.contentState };
}

export function createPostgresMetaMessageEchoRepository(transactions: PostgresTransactionManager): MetaMessageEchoRepository {
  return Object.freeze({
    async record(rawScope: MetaMessageEchoScope, rawMessage: MetaMessageEcho) {
      const { scope, message } = normalizeMetaMessageEcho(rawScope, rawMessage);
      const targetId = message.mutation?.originalProviderMessageId ?? message.providerMessageId;
      const messageKey = `message_v1_${await digest({ namespace: "whatsapp_business_app_message_v1", tenantId: scope.tenantId, providerMessageId: targetId })}`;
      const { originalCaption, ...legacyIdentity } = message;
      const requestDigest = await digest(legacyIdentity);
      const originalCaptionDigest = originalCaption === undefined ? null :
        await digest({ namespace: "message_echo_original_caption_v1", caption: originalCaption });
      const eventKey = await digest({ namespace: "message_echo_event_v1", kind: message.mutation?.kind ?? "original", providerMessageId: message.providerMessageId });
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        const connection = await one(tx, postgresMetaMessageEchoSql.lockConnection,
          [scope.tenantId, scope.wabaId, scope.phoneNumberId, scope.connectionVersion]);
        if (connection === null || parsePostgresPositiveInteger(requireExactPostgresRow(connection, ["tenantId"]).tenantId) !== scope.tenantId) {
          throw new MetaWebhookProcessorError("MESSAGE_ECHO_CONNECTION_CHANGED");
        }
        const insertedState = await one(tx, postgresMetaMessageEchoSql.insertState,
          [scope.tenantId, targetId, scope.wabaId, scope.phoneNumberId, message.recipientPhoneNumber]);
        if (insertedState !== null) requireKey(insertedState, "providerMessageId", targetId);
        let state = parseState(await one(tx, postgresMetaMessageEchoSql.lockState, [scope.tenantId, targetId]), scope, message.recipientPhoneNumber);
        // New originals bind caption identity separately, including an explicitly
        // absent caption. Legacy receipts did not observe it and stay unchanged.
        if (message.mutation === undefined && state.originalCaptionDigest !== null && state.originalCaptionDigest !== originalCaptionDigest) return conflict();
        const claimed = await one(tx, postgresMetaMessageEchoSql.claimEvent, [scope.tenantId, eventKey, requestDigest, targetId]);
        if (claimed === null) {
          const stored = requireExactPostgresRow(await one(tx, postgresMetaMessageEchoSql.readEvent, [scope.tenantId, eventKey]), ["requestDigest", "providerMessageId"]);
          if (stored.requestDigest !== requestDigest || stored.providerMessageId !== targetId) return conflict();
          return { outcome: "duplicate" as const };
        }
        requireKey(claimed, "eventKey", eventKey);
        let target = await one(tx, postgresMetaMessageEchoSql.readTarget, [scope.tenantId, targetId]);
        if (target !== null) {
          const first = requireExactPostgresRow(target, ["messageKey", "conversationKey", "direction", "contentKind", "contentState", "textContent", "occurredAt", "recipientPhoneNumber"]);
          if (first.messageKey !== messageKey || first.direction !== "outbound" || first.recipientPhoneNumber !== message.recipientPhoneNumber || typeof first.conversationKey !== "string") return conflict();
          requireKey(await one(tx, postgresMetaMessageEchoSql.lockTargetConversation, [scope.tenantId, first.conversationKey]), "conversationKey", first.conversationKey);
          target = await one(tx, postgresMetaMessageEchoSql.readTarget, [scope.tenantId, targetId]);
        }
        const stored = target === null ? null : requireExactPostgresRow(target,
          ["messageKey", "conversationKey", "direction", "contentKind", "contentState", "textContent", "occurredAt", "recipientPhoneNumber"]);
        if (stored !== null && state.originalDigest === null) {
          // Bootstrap only untouched echoes written before this migration.
          if (stored.contentState !== "original") return conflict();
          state.originalDigest = await digest({ recipientPhoneNumber: message.recipientPhoneNumber, providerMessageId: targetId,
            contentKind: stored.contentKind, textContent: stored.textContent, occurredAt: parsePostgresTimestamp(stored.occurredAt) });
        }
        if (message.mutation === undefined) {
          if (state.originalDigest !== null && state.originalDigest !== requestDigest) return conflict();
          if (state.originalDigest === null && stored === null) state.originalCaptionDigest = originalCaptionDigest;
          state.originalDigest = requestDigest;
          if ((state.contentState === "edited" || state.contentState === "conflicted") && message.contentKind !== state.editKind) return conflict();
        } else {
          if (message.mutation.kind === "edit" && stored !== null && state.contentState !== "deleted" &&
            stored.contentKind !== message.contentKind && stored.contentState !== "conflicted") return conflict();
          state = reduceMetaEchoMutation(state, message);
        }
        requireKey(await one(tx, postgresMetaMessageEchoSql.updateState, [scope.tenantId, targetId,
          state.originalDigest, state.contentState, state.editAt, state.editText, state.editKind, state.originalCaptionDigest]), "providerMessageId", targetId);
        if (stored === null && message.mutation !== undefined) return { outcome: "deferred" as const };
        if (stored !== null) {
          const projected = projection(state, { contentKind: stored.contentKind as MessageContentKind, textContent: stored.textContent as string | null });
          if (stored.contentKind === projected.contentKind && stored.textContent === projected.textContent && stored.contentState === projected.contentState) return { outcome: "ignored" as const };
          requireKey(await one(tx, postgresMetaMessageEchoSql.project, [scope.tenantId, messageKey, projected.contentKind, projected.textContent, projected.contentState]), "messageKey", messageKey);
          requireKey(await one(tx, postgresMetaMessageEchoSql.touchConversation, [scope.tenantId, String(stored.conversationKey)]), "conversationKey", String(stored.conversationKey));
          return { outcome: "updated" as const };
        }
        const contact = requireExactPostgresRow(await one(tx, postgresMetaMessageEchoSql.resolveContact,
          [scope.tenantId, message.recipientPhoneNumber]), ["contactId", "tenantId", "phoneNumber"]);
        const contactId = parsePostgresPositiveInteger(contact.contactId);
        if (parsePostgresPositiveInteger(contact.tenantId) !== scope.tenantId || contact.phoneNumber !== message.recipientPhoneNumber) return conflict();
        const conversationKey = await deriveConversationKey(scope.tenantId, contactId);
        const insertedConversation = await one(tx, postgresMetaMessageEchoSql.insertConversation, [conversationKey, scope.tenantId, contactId]);
        if (insertedConversation !== null) requireKey(insertedConversation, "conversationKey", conversationKey);
        requireKey(await one(tx, postgresMetaMessageEchoSql.lockConversation, [scope.tenantId, conversationKey, contactId]), "conversationKey", conversationKey);
        const projected = projection(state, { contentKind: message.contentKind, textContent: originalCaption ?? message.textContent });
        const inserted = await one(tx, postgresMetaMessageEchoSql.insertMessage, [messageKey, conversationKey, scope.tenantId,
          targetId, projected.contentKind, projected.textContent, message.occurredAt, projected.contentState]);
        if (inserted === null) return conflict();
        requireKey(inserted, "messageKey", messageKey);
        const updated = await one(tx, postgresMetaMessageEchoSql.updateConversation, [scope.tenantId, conversationKey, messageKey, message.occurredAt]);
        if (updated !== null) requireKey(updated, "conversationKey", conversationKey);
        return { outcome: "created" as const };
      });
    },
  });
}
