import { lockMetaSyncAttribution, retainUnattributedMetaSync } from './postgresMetaSyncUnattributed.ts';
import { normalizeMetaHistorySync, type MetaHistoryScope, type MetaHistoryItem, type MetaHistorySyncRepository } from "../meta/metaHistorySync.ts";
import { MetaWebhookProcessorError } from "../meta/metaWebhookIngress.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { postgresMetaContactSyncSql } from "./postgresMetaContactSyncRepository.ts";
import { parsePostgresPositiveInteger, parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";

export const postgresMetaHistorySyncSql = Object.freeze({
  connection: postgresMetaContactSyncSql.lockConnection,
  request: `SELECT started_at AS "startedAt" FROM meta_data_sync_requests WHERE tenant_id = $1 AND waba_id = $2
    AND phone_number_id = $3 AND connection_version = $4 AND sync_type = 'history'
    AND (status IN ('dispatching', 'accepted', 'unknown') OR ($5 = 'declined' AND dispatched_at IS NOT NULL)) FOR SHARE`,
  session: `INSERT INTO meta_history_sync_sessions (tenant_id, waba_id, phone_number_id, connection_version, started_at)
    VALUES ($1, $2, $3, $4, $5::timestamptz) ON CONFLICT DO NOTHING RETURNING tenant_id AS "tenantId"`,
  lock: `SELECT waba_id AS "wabaId", phone_number_id AS "phoneNumberId", connection_version AS "connectionVersion",
    started_at AS "startedAt", sharing_state AS "sharingState", max_progress AS "maxProgress", has_conflict AS "hasConflict"
    FROM meta_history_sync_sessions WHERE tenant_id = $1 FOR UPDATE`,
  receipt: `INSERT INTO meta_history_sync_events (tenant_id, event_digest, kind) VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING RETURNING event_digest AS digest`,
  update: `UPDATE meta_history_sync_sessions SET sharing_state = $2, max_progress = $3, has_conflict = $4
    WHERE tenant_id = $1 RETURNING tenant_id AS "tenantId"`,
  chunk: `SELECT content_digest AS digest, conflicted FROM meta_history_sync_chunks WHERE tenant_id = $1 AND phase = $2 AND chunk_order = $3`,
  media: `SELECT content_digest AS digest, conflicted FROM meta_history_sync_media WHERE tenant_id = $1 AND provider_message_id = $2`,
  insertChunk: `INSERT INTO meta_history_sync_chunks (tenant_id, phase, chunk_order, progress, content_digest, payload)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING content_digest AS digest`,
  insertMedia: `INSERT INTO meta_history_sync_media (tenant_id, provider_message_id, content_digest, payload)
    VALUES ($1, $2, $3, $4::jsonb) RETURNING content_digest AS digest`,
  conflictChunk: `UPDATE meta_history_sync_chunks SET payload = NULL, conflicted = TRUE WHERE tenant_id = $1 AND phase = $2 AND chunk_order = $3
    RETURNING content_digest AS digest`,
  conflictMedia: `UPDATE meta_history_sync_media SET payload = NULL, conflicted = TRUE WHERE tenant_id = $1 AND provider_message_id = $2
    RETURNING content_digest AS digest`,
  clearChunks: `UPDATE meta_history_sync_chunks SET payload = NULL WHERE tenant_id = $1 AND payload IS NOT NULL`,
  clearMedia: `UPDATE meta_history_sync_media SET payload = NULL WHERE tenant_id = $1 AND payload IS NOT NULL`,
  audit: `INSERT INTO audit_logs (tenant_id, actor_external_user_id, action, target_type, target_id, metadata_json)
    VALUES ($1, NULL, 'meta.history.captured', 'meta_history', $2, $3::jsonb) RETURNING id`,
});
async function one(tx: PostgresTransaction, sql: string, parameters: readonly PostgresParameter[]) {
  return requirePostgresRows(await tx.query(sql, parameters), 1)[0] ?? null;
}
function fail(code = "HISTORY_SYNC_STORAGE_FAILED"): never { throw new MetaWebhookProcessorError(code); }
function key(value: unknown, name: string, expected: string | number) {
  const row = requireExactPostgresRow(value, [name]);
  if ((typeof expected === "number" ? parsePostgresPositiveInteger(row[name]) : row[name]) !== expected) return fail();
}

export function createPostgresMetaHistorySyncRepository(transactions: PostgresTransactionManager): MetaHistorySyncRepository {
  return Object.freeze({
    async record(rawScope: MetaHistoryScope, rawItem: MetaHistoryItem) {
      const { scope, item } = normalizeMetaHistorySync(rawScope, rawItem);
      const digest = await sha256Hex(new TextEncoder().encode(JSON.stringify({ namespace: "whatsapp_history_capture_v1", scope, item })));
      const binding = [scope.tenantId, scope.wabaId, scope.phoneNumberId, scope.connectionVersion] as const;
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await lockMetaSyncAttribution(tx,scope.tenantId);
        const connection = await one(tx, postgresMetaHistorySyncSql.connection, binding);
        if (connection === null) return fail("HISTORY_SYNC_CONNECTION_CHANGED");
        key(connection, "tenantId", scope.tenantId);
        if (await retainUnattributedMetaSync(tx, scope, item.kind, item)) return { outcome: 'unattributed' as const };
        // Webhooks may precede the POST response or follow a lost response.
        // A prepared/rejected request never authorizes data capture. Refusal
        // may still redact data captured before a late POST rejection arrived.
        const request = await one(tx, postgresMetaHistorySyncSql.request, [...binding, item.kind]);
        if (request === null) return fail("HISTORY_SYNC_REQUEST_NOT_DISPATCHED");
        const startedAt = parsePostgresTimestamp(requireExactPostgresRow(request, ["startedAt"]).startedAt);
        const inserted = await one(tx, postgresMetaHistorySyncSql.session, [...binding, startedAt]);
        if (inserted !== null) key(inserted, "tenantId", scope.tenantId);
        const state = requireExactPostgresRow(await one(tx, postgresMetaHistorySyncSql.lock, [scope.tenantId]),
          ["wabaId", "phoneNumberId", "connectionVersion", "startedAt", "sharingState", "maxProgress", "hasConflict"]);
        if (state.wabaId !== scope.wabaId || state.phoneNumberId !== scope.phoneNumberId ||
          parsePostgresPositiveInteger(state.connectionVersion) !== scope.connectionVersion || parsePostgresTimestamp(state.startedAt) !== startedAt ||
          !["pending", "data_received", "declined"].includes(String(state.sharingState)) || typeof state.hasConflict !== "boolean" ||
          (state.maxProgress !== null && (typeof state.maxProgress !== "number" || !Number.isInteger(state.maxProgress) || state.maxProgress < 0 || state.maxProgress > 100))) return fail();
        const receipt = await one(tx, postgresMetaHistorySyncSql.receipt, [scope.tenantId, digest, item.kind]);
        if (receipt === null) return { outcome: "duplicate" as const };
        key(receipt, "digest", digest);
        let sharingState = state.sharingState as string, hasConflict = state.hasConflict;
        let maxProgress = state.maxProgress as number | null;
        let outcome: "stored" | "conflicted" | "discarded" | "declined";
        if (item.kind === "declined") {
          sharingState = "declined";
          await tx.query(postgresMetaHistorySyncSql.clearChunks, [scope.tenantId]);
          await tx.query(postgresMetaHistorySyncSql.clearMedia, [scope.tenantId]);
          outcome = "declined";
        } else {
          const chunk = item.kind === "chunk";
          const identity = chunk ? [scope.tenantId, item.phase, item.chunkOrder] : [scope.tenantId, item.providerMessageId];
          const previous = await one(tx, chunk ? postgresMetaHistorySyncSql.chunk : postgresMetaHistorySyncSql.media, identity);
          const payload = sharingState === "declined" ? null : JSON.stringify(item);
          outcome = sharingState === "declined" ? "discarded" : "stored";
          if (previous === null) {
            key(await one(tx, chunk ? postgresMetaHistorySyncSql.insertChunk : postgresMetaHistorySyncSql.insertMedia,
              chunk ? [...identity, item.progress, digest, payload] : [...identity, digest, payload]), "digest", digest);
          } else {
            const stored = requireExactPostgresRow(previous, ["digest", "conflicted"]);
            if (typeof stored.digest !== "string" || !/^[0-9a-f]{64}$/.test(stored.digest) || typeof stored.conflicted !== "boolean") return fail();
            if (stored.digest !== digest) {
              key(await one(tx, chunk ? postgresMetaHistorySyncSql.conflictChunk : postgresMetaHistorySyncSql.conflictMedia, identity), "digest", stored.digest);
              hasConflict = true;
              outcome = sharingState === "declined" ? "discarded" : "conflicted";
            }
          }
          if (sharingState !== "declined") sharingState = "data_received";
          if (chunk) maxProgress = maxProgress === null ? item.progress : Math.max(maxProgress, item.progress);
        }
        key(await one(tx, postgresMetaHistorySyncSql.update, [scope.tenantId, sharingState, maxProgress, hasConflict]), "tenantId", scope.tenantId);
        const audited = requireExactPostgresRow(await one(tx, postgresMetaHistorySyncSql.audit,
          [scope.tenantId, digest, JSON.stringify({ kind: item.kind, outcome })]), ["id"]);
        parsePostgresPositiveInteger(audited.id);
        return { outcome };
      });
    },
  });
}
