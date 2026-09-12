import { postgresMetaSyncGenerationConnectionSql } from './postgresMetaSyncAttributionImporter.ts';
import { lockMetaSyncAttribution } from './postgresMetaSyncUnattributed.ts';
import { normalizeMetaHistorySync, type MetaHistoryScope, type MetaHistoryItem } from "../meta/metaHistorySync.ts";
import { MetaWebhookProcessorError } from "../meta/metaWebhookIngress.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { deriveConversationKey } from "../conversations/conversationKey.ts";
import { postgresMetaHistorySyncSql } from "./postgresMetaHistorySyncRepository.ts";
import { postgresConversationSql } from "./postgresConversationRepository.ts";
import { parsePostgresPositiveInteger, parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";

export const postgresMetaHistoryInboxSql = Object.freeze({
  candidate: `SELECT session.tenant_id AS "tenantId", session.waba_id AS "wabaId", session.phone_number_id AS "phoneNumberId",
    session.connection_version AS "connectionVersion", chunk.phase, chunk.chunk_order AS "chunkOrder"
    FROM meta_history_sync_sessions AS session
    JOIN meta_history_read_authorizations AS read_access ON read_access.tenant_id=session.tenant_id
      AND read_access.source_connection_version=session.connection_version
    JOIN meta_connections AS connection ON connection.tenant_id = session.tenant_id AND connection.waba_id = session.waba_id
      AND connection.phone_number_id = session.phone_number_id AND connection.version = read_access.current_connection_version AND connection.status = 'connected'
    JOIN tenants AS tenant ON tenant.id = session.tenant_id AND tenant.status IN ('active', 'trial', 'payment_failed')
    JOIN meta_data_sync_requests AS request ON request.tenant_id = session.tenant_id AND request.sync_type = 'history'
      AND request.started_at = session.started_at AND request.status IN ('dispatching', 'accepted', 'unknown')
    JOIN meta_history_sync_chunks AS chunk ON chunk.tenant_id = session.tenant_id AND chunk.connection_version = session.connection_version AND NOT chunk.conflicted AND chunk.payload IS NOT NULL
    LEFT JOIN meta_history_inbox_cursors AS cursor ON cursor.tenant_id = chunk.tenant_id AND cursor.connection_version = chunk.connection_version AND cursor.phase = chunk.phase AND cursor.chunk_order = chunk.chunk_order
    WHERE session.sharing_state = 'data_received' AND NOT session.has_conflict
      AND (cursor.tenant_id IS NULL OR cursor.next_index < jsonb_array_length(chunk.payload->'messages'))
    ORDER BY session.tenant_id, chunk.phase, chunk.chunk_order LIMIT 1`,
  chunk: `SELECT content_digest AS digest, payload, conflicted FROM meta_history_sync_chunks
    WHERE tenant_id = $1 AND phase = $2 AND chunk_order = $3 AND connection_version = $4`,
  createCursor: `INSERT INTO meta_history_inbox_cursors (tenant_id, phase, chunk_order, content_digest, connection_version)
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING next_index AS "nextIndex"`,
  cursor: `SELECT content_digest AS digest, next_index AS "nextIndex" FROM meta_history_inbox_cursors
    WHERE tenant_id = $1 AND phase = $2 AND chunk_order = $3 AND connection_version = $4 FOR UPDATE`,
  updateCursor: `UPDATE meta_history_inbox_cursors SET next_index = $4 WHERE tenant_id = $1 AND phase = $2 AND chunk_order = $3 AND connection_version = $5 RETURNING next_index AS "nextIndex"`,
  existing: `SELECT message.message_digest AS digest, message.conflicted, message.connection_version AS "connectionVersion",
    ((chunk.payload->'messages'->message.message_index) - 'deliveryState' = $3::jsonb - 'deliveryState') AS "sameContent"
    FROM meta_history_inbox_messages AS message JOIN meta_history_sync_chunks AS chunk
      ON chunk.tenant_id=message.tenant_id AND chunk.connection_version=message.connection_version
      AND chunk.phase=message.phase AND chunk.chunk_order=message.chunk_order AND chunk.content_digest=message.content_digest
    WHERE message.tenant_id = $1 AND message.provider_message_id = $2`,
  insert: `INSERT INTO meta_history_inbox_messages (tenant_id, provider_message_id, message_key, conversation_key,
    phase, chunk_order, content_digest, message_index, message_digest, occurred_at, connection_version)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz, $11) RETURNING message_key AS "messageKey"`,
  conflict: `UPDATE meta_history_inbox_messages SET conflicted = TRUE WHERE tenant_id = $1 AND provider_message_id = $2 RETURNING message_key AS "messageKey"`,
  sessionConflict: `UPDATE meta_history_sync_sessions SET has_conflict = TRUE WHERE tenant_id = $1 AND connection_version = $2 RETURNING tenant_id AS "tenantId"`,
  audit: `INSERT INTO audit_logs (tenant_id, actor_external_user_id, action, target_type, target_id, metadata_json)
    VALUES ($1, NULL, 'meta.history.projected', 'meta_history_chunk', $2, $3::jsonb) RETURNING id`,
});
async function one(tx: PostgresTransaction, sql: string, values: readonly PostgresParameter[]) {
  return requirePostgresRows(await tx.query(sql, values), 1)[0] ?? null;
}
function fail(): never { throw new MetaWebhookProcessorError("HISTORY_PROJECTION_FAILED"); }
function count(value: unknown, max = 10_000): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max) return fail(); return value;
}
function digest(value: unknown) { return sha256Hex(new TextEncoder().encode(JSON.stringify(value))); }
function key(value: unknown, field: string, expected: string) {
  if (requireExactPostgresRow(value, [field])[field] !== expected) return fail();
}

export function createPostgresMetaHistoryInboxProjector(transactions: PostgresTransactionManager) {
  return Object.freeze({
    async projectNext(): Promise<{ outcome: "idle" | "blocked" | "projected" | "conflicted"; processed: number }> {
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        const raw = await one(tx, postgresMetaHistoryInboxSql.candidate, []);
        if (raw === null) return { outcome: "idle", processed: 0 };
        const candidate = requireExactPostgresRow(raw, ["tenantId", "wabaId", "phoneNumberId", "connectionVersion", "phase", "chunkOrder"]);
        const scope: MetaHistoryScope = { tenantId: parsePostgresPositiveInteger(candidate.tenantId), wabaId: candidate.wabaId as string,
          phoneNumberId: candidate.phoneNumberId as string, connectionVersion: parsePostgresPositiveInteger(candidate.connectionVersion) };
        const binding = [scope.tenantId, scope.wabaId, scope.phoneNumberId, scope.connectionVersion] as const;
        await lockMetaSyncAttribution(tx, scope.tenantId);
        // Same lock order as capture: connection/tenant, request, then session.
        if (await one(tx, postgresMetaSyncGenerationConnectionSql, [...binding, "history"]) === null) return { outcome: "blocked", processed: 0 };
        const request = await one(tx, postgresMetaHistorySyncSql.request, [...binding, "chunk"]);
        if (request === null) return { outcome: "blocked", processed: 0 };
        const startedAt = parsePostgresTimestamp(requireExactPostgresRow(request, ["startedAt"]).startedAt);
        const state = requireExactPostgresRow(await one(tx, postgresMetaHistorySyncSql.lock, [scope.tenantId, scope.connectionVersion]),
          ["wabaId", "phoneNumberId", "connectionVersion", "startedAt", "sharingState", "maxProgress", "hasConflict"]);
        if (state.wabaId !== scope.wabaId || state.phoneNumberId !== scope.phoneNumberId ||
          parsePostgresPositiveInteger(state.connectionVersion) !== scope.connectionVersion || parsePostgresTimestamp(state.startedAt) !== startedAt) return fail();
        if (state.sharingState !== "data_received" || state.hasConflict !== false) return { outcome: "blocked", processed: 0 };
        const phase = count(candidate.phase, 2), chunkOrder = count(candidate.chunkOrder, 2_147_483_647);
        const identity = [scope.tenantId, phase, chunkOrder] as const;
        const stored = requireExactPostgresRow(await one(tx, postgresMetaHistoryInboxSql.chunk, [...identity, scope.connectionVersion]), ["digest", "payload", "conflicted"]);
        if (stored.payload === null || stored.conflicted !== false) return { outcome: "blocked", processed: 0 };
        const { item } = normalizeMetaHistorySync(scope, stored.payload as MetaHistoryItem);
        if (item.kind !== "chunk" || item.phase !== phase || item.chunkOrder !== chunkOrder ||
          stored.digest !== await digest({ namespace: "whatsapp_history_capture_v1", scope, item })) return fail();
        await one(tx, postgresMetaHistoryInboxSql.createCursor, [...identity, stored.digest as string, scope.connectionVersion]);
        const cursor = requireExactPostgresRow(await one(tx, postgresMetaHistoryInboxSql.cursor, [...identity, scope.connectionVersion]), ["digest", "nextIndex"]);
        if (cursor.digest !== stored.digest) return fail();
        const start = count(cursor.nextIndex);
        if (start > item.messages.length) return fail();
        const end = Math.min(start + 100, item.messages.length);
        let conflict = false;
        for (let index = start; index < end; index++) {
          const message = item.messages[index];
          const messageDigest = await digest(message);
          const existing = await one(tx, postgresMetaHistoryInboxSql.existing, [scope.tenantId, message.providerMessageId, JSON.stringify(message)]);
          if (existing !== null) {
            const previous = requireExactPostgresRow(existing, ["digest", "conflicted", "connectionVersion", "sameContent"]);
            if (parsePostgresPositiveInteger(previous.connectionVersion) !== scope.connectionVersion) {
              // Keep the first source immutable. Conflicting content blocks only
              // the new cycle; delivery-state snapshots may legitimately differ.
              if (previous.conflicted !== false || previous.sameContent !== true) conflict = true;
              continue;
            }
            if (previous.digest !== messageDigest || previous.conflicted !== false) {
              if (await one(tx, postgresMetaHistoryInboxSql.conflict, [scope.tenantId, message.providerMessageId]) === null) return fail();
              conflict = true;
            }
            continue;
          }
          const contact = requireExactPostgresRow(await one(tx, postgresConversationSql.resolveInboundContact,
            [scope.tenantId, message.threadPhoneNumber]), ["contactId", "tenantId", "phoneNumber"]);
          const contactId = parsePostgresPositiveInteger(contact.contactId);
          if (parsePostgresPositiveInteger(contact.tenantId) !== scope.tenantId || contact.phoneNumber !== message.threadPhoneNumber) return fail();
          const conversationKey = await deriveConversationKey(scope.tenantId, contactId);
          const inserted = await one(tx, postgresConversationSql.insertConversation, [conversationKey, scope.tenantId, contactId]);
          if (inserted !== null) key(inserted, "conversationKey", conversationKey);
          const namespace = message.direction === "inbound" ? "message_v1" : "whatsapp_business_app_message_v1";
          const messageKey = `message_v1_${await digest({ namespace, tenantId: scope.tenantId, providerMessageId: message.providerMessageId })}`;
          key(await one(tx, postgresMetaHistoryInboxSql.insert, [scope.tenantId, message.providerMessageId, messageKey, conversationKey,
            phase, chunkOrder, stored.digest as string, index, messageDigest, message.occurredAt, scope.connectionVersion]), "messageKey", messageKey);
        }
        if (conflict && parsePostgresPositiveInteger(requireExactPostgresRow(await one(tx, postgresMetaHistoryInboxSql.sessionConflict, [scope.tenantId, scope.connectionVersion]), ["tenantId"]).tenantId) !== scope.tenantId) return fail();
        if (count(requireExactPostgresRow(await one(tx, postgresMetaHistoryInboxSql.updateCursor, [...identity, end, scope.connectionVersion]), ["nextIndex"]).nextIndex) !== end) return fail();
        parsePostgresPositiveInteger(requireExactPostgresRow(await one(tx, postgresMetaHistoryInboxSql.audit,
          [scope.tenantId, stored.digest as string, JSON.stringify({ from: start, to: end, conflict })]), ["id"]).id);
        return { outcome: conflict ? "conflicted" : "projected", processed: end - start };
      });
    },
  });
}
