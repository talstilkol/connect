import { isMetaHistoryMediaCompatible, type BoundMetaHistoryMedia } from "../meta/metaHistoryMediaBinding.ts";
import { normalizeMetaHistorySync, type MetaHistoryItem, type MetaHistoryScope } from "../meta/metaHistorySync.ts";
import { MetaWebhookProcessorError } from "../meta/metaWebhookIngress.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { postgresMetaHistorySyncSql } from "./postgresMetaHistorySyncRepository.ts";
import { parsePostgresPositiveInteger, parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";

// Every candidate/read is scoped through the original session and current
// connection. An immutable binding alone must never grant access to content.
type MediaSourcePurpose = "binding" | "acquisition" | "file-read";
function eligibleMediaSources(purpose: MediaSourcePurpose) {
  const captionState = purpose === "binding" ? "IN ('edited', 'conflicted')" : "= 'edited'";
  const allowedContent = purpose !== "acquisition"
    ? `(echo.content_state = 'original' OR (echo.content_state ${captionState}
        AND echo.edit_kind IN ('image', 'video', 'document') AND echo.edit_kind = media.payload->>'contentKind'))`
    : `echo.content_state = 'original'`;
  return `FROM meta_history_inbox_messages AS message
  JOIN meta_history_sync_sessions AS session ON session.tenant_id = message.tenant_id
    AND session.sharing_state = 'data_received' AND NOT session.has_conflict
  JOIN tenants AS tenant ON tenant.id = session.tenant_id AND tenant.status IN ('active', 'trial', 'payment_failed')
  JOIN meta_connections AS connection ON connection.tenant_id = session.tenant_id AND connection.waba_id = session.waba_id
    AND connection.phone_number_id = session.phone_number_id AND connection.version = session.connection_version AND connection.status = 'connected'
  JOIN meta_data_sync_requests AS request ON request.tenant_id = session.tenant_id AND request.sync_type = 'history'
    AND request.waba_id = session.waba_id AND request.phone_number_id = session.phone_number_id
    AND request.connection_version = session.connection_version AND request.started_at = session.started_at
    AND request.status IN ('dispatching', 'accepted', 'unknown')
  JOIN meta_history_sync_chunks AS chunk ON chunk.tenant_id = message.tenant_id AND chunk.phase = message.phase
    AND chunk.chunk_order = message.chunk_order AND chunk.content_digest = message.content_digest AND NOT chunk.conflicted AND chunk.payload IS NOT NULL
  JOIN meta_history_sync_media AS media ON media.tenant_id = message.tenant_id AND media.provider_message_id = message.provider_message_id
    AND NOT media.conflicted AND media.payload IS NOT NULL
  JOIN conversations AS conversation ON conversation.tenant_id = message.tenant_id AND conversation.conversation_key = message.conversation_key
  JOIN contacts AS contact ON contact.tenant_id = conversation.tenant_id AND contact.id = conversation.contact_id
    AND contact.phone_e164 = chunk.payload->'messages'->message.message_index->>'threadPhoneNumber'
  WHERE NOT message.conflicted
    AND NOT EXISTS (SELECT 1 FROM messages AS live WHERE live.tenant_id = message.tenant_id AND live.provider_message_id = message.provider_message_id)
    AND NOT EXISTS (SELECT 1 FROM meta_message_echo_states AS echo WHERE echo.tenant_id = message.tenant_id
      AND echo.provider_message_id = message.provider_message_id AND chunk.payload->'messages'->message.message_index->>'direction' = 'outbound'
      AND ((${allowedContent}) IS NOT TRUE OR echo.waba_id <> session.waba_id OR echo.phone_number_id <> session.phone_number_id
        OR echo.recipient_phone <> contact.phone_e164))`;
}

// Caption edits never reopen acquisition. A non-conflicting matching edit may
// allow a file reader to revalidate the original source of an existing upload.
export const metaHistoryEligibleMediaSources = eligibleMediaSources("acquisition");
const metaHistoryBindingSources = eligibleMediaSources("binding");
const metaHistoryFileSources = eligibleMediaSources("file-read");
function selectMediaIdentity(eligibility: string) {
  return `SELECT session.tenant_id AS "tenantId", session.waba_id AS "wabaId", session.phone_number_id AS "phoneNumberId",
    session.connection_version AS "connectionVersion", message.provider_message_id AS "providerMessageId" ${eligibility}
    AND message.tenant_id = $1 AND message.message_key = $2`;
}
function selectMediaSources(eligibility: string) {
  return `SELECT message.message_key AS "messageKey", message.message_digest AS "messageDigest", message.message_index AS "messageIndex",
    message.phase, message.chunk_order AS "chunkOrder", chunk.content_digest AS "chunkDigest", chunk.payload AS chunk,
    media.content_digest AS "mediaDigest", media.payload AS media ${eligibility}
    AND session.tenant_id = $1 AND session.waba_id = $2 AND session.phone_number_id = $3
    AND session.connection_version = $4 AND message.provider_message_id = $5`;
}

export const postgresMetaHistoryMediaSql = Object.freeze({
  candidate: `SELECT session.tenant_id AS "tenantId", session.waba_id AS "wabaId", session.phone_number_id AS "phoneNumberId",
    session.connection_version AS "connectionVersion", message.provider_message_id AS "providerMessageId" ${metaHistoryBindingSources}
    AND NOT EXISTS (SELECT 1 FROM meta_history_media_bindings AS binding
      WHERE binding.tenant_id = message.tenant_id AND binding.provider_message_id = message.provider_message_id)
    ORDER BY session.tenant_id, message.provider_message_id LIMIT 1`,
  identity: selectMediaIdentity(metaHistoryEligibleMediaSources),
  fileIdentity: selectMediaIdentity(metaHistoryFileSources),
  sources: selectMediaSources(metaHistoryEligibleMediaSources),
  fileSources: selectMediaSources(metaHistoryFileSources),
  bindingSources: selectMediaSources(metaHistoryBindingSources),
  binding: `SELECT message_digest AS "messageDigest", media_digest AS "mediaDigest" FROM meta_history_media_bindings
    WHERE tenant_id = $1 AND provider_message_id = $2`,
  insert: `INSERT INTO meta_history_media_bindings (tenant_id, provider_message_id, message_digest, media_digest)
    VALUES ($1, $2, $3, $4) RETURNING provider_message_id AS "providerMessageId"`,
  conflict: `UPDATE meta_history_sync_sessions SET has_conflict = TRUE WHERE tenant_id = $1 RETURNING tenant_id AS "tenantId"`,
  audit: `INSERT INTO audit_logs (tenant_id, actor_external_user_id, action, target_type, target_id, metadata_json)
    VALUES ($1, NULL, 'meta.history.media-bound', 'meta_history_message', $2, $3::jsonb) RETURNING id`,
});
function fail(): never { throw new MetaWebhookProcessorError("HISTORY_MEDIA_BINDING_FAILED"); }
async function one(tx: PostgresTransaction, sql: string, parameters: readonly PostgresParameter[]) {
  return requirePostgresRows(await tx.query(sql, parameters), 1)[0] ?? null;
}
function hash(value: unknown) { return sha256Hex(new TextEncoder().encode(JSON.stringify(value))); }
function identity(raw: unknown) {
  const row = requireExactPostgresRow(raw, ["tenantId", "wabaId", "phoneNumberId", "connectionVersion", "providerMessageId"]);
  const scope: MetaHistoryScope = { tenantId: parsePostgresPositiveInteger(row.tenantId), wabaId: row.wabaId as string,
    phoneNumberId: row.phoneNumberId as string, connectionVersion: parsePostgresPositiveInteger(row.connectionVersion) };
  normalizeMetaHistorySync(scope, { kind: "declined" });
  if (typeof row.providerMessageId !== "string" || row.providerMessageId.length === 0 || row.providerMessageId.length > 255) return fail();
  return { scope, providerMessageId: row.providerMessageId };
}

async function readLocked(tx: PostgresTransaction, scope: MetaHistoryScope, providerMessageId: string, purpose: MediaSourcePurpose) {
  const binding = [scope.tenantId, scope.wabaId, scope.phoneNumberId, scope.connectionVersion] as const;
  const connection = await one(tx, postgresMetaHistorySyncSql.connection, binding);
  if (connection === null) return null;
  if (parsePostgresPositiveInteger(requireExactPostgresRow(connection, ["tenantId"]).tenantId) !== scope.tenantId) return fail();
  const request = await one(tx, postgresMetaHistorySyncSql.request, [...binding, "media"]);
  if (request === null) return null;
  const startedAt = parsePostgresTimestamp(requireExactPostgresRow(request, ["startedAt"]).startedAt);
  const session = requireExactPostgresRow(await one(tx, postgresMetaHistorySyncSql.lock, [scope.tenantId]),
    ["wabaId", "phoneNumberId", "connectionVersion", "startedAt", "sharingState", "maxProgress", "hasConflict"]);
  if (session.wabaId !== scope.wabaId || session.phoneNumberId !== scope.phoneNumberId ||
    parsePostgresPositiveInteger(session.connectionVersion) !== scope.connectionVersion || parsePostgresTimestamp(session.startedAt) !== startedAt) return fail();
  if (session.sharingState !== "data_received" || session.hasConflict !== false) return null;
  const sourceSql = purpose === "binding" ? postgresMetaHistoryMediaSql.bindingSources
    : purpose === "file-read" ? postgresMetaHistoryMediaSql.fileSources : postgresMetaHistoryMediaSql.sources;
  const raw = await one(tx, sourceSql,
    [...binding, providerMessageId]);
  if (raw === null) return null;
  const row = requireExactPostgresRow(raw, ["messageKey", "messageDigest", "messageIndex", "phase", "chunkOrder", "chunkDigest", "chunk", "mediaDigest", "media"]);
  const chunk = normalizeMetaHistorySync(scope, row.chunk as MetaHistoryItem).item;
  const media = normalizeMetaHistorySync(scope, row.media as MetaHistoryItem).item;
  if (chunk.kind !== "chunk" || media.kind !== "media" || chunk.phase !== row.phase || chunk.chunkOrder !== row.chunkOrder ||
    typeof row.messageIndex !== "number" || !Number.isInteger(row.messageIndex) || row.messageIndex < 0 || row.messageIndex >= chunk.messages.length ||
    row.chunkDigest !== await hash({ namespace: "whatsapp_history_capture_v1", scope, item: chunk }) ||
    row.mediaDigest !== await hash({ namespace: "whatsapp_history_capture_v1", scope, item: media })) return fail();
  const message = chunk.messages[row.messageIndex];
  if (message.providerMessageId !== providerMessageId || media.providerMessageId !== providerMessageId || row.messageDigest !== await hash(message) ||
    typeof row.messageKey !== "string" || !/^message_v1_[0-9a-f]{64}$/.test(row.messageKey)) return fail();
  return { message, media, messageKey: row.messageKey, messageDigest: row.messageDigest as string, mediaDigest: row.mediaDigest as string };
}
function matchesBinding(raw: unknown, sources: { messageDigest: string; mediaDigest: string }): boolean {
  const row = requireExactPostgresRow(raw, ["messageDigest", "mediaDigest"]);
  if (row.messageDigest !== sources.messageDigest || row.mediaDigest !== sources.mediaDigest) return fail();
  return true;
}

export function createPostgresMetaHistoryMediaRepository(transactions: PostgresTransactionManager) {
  return Object.freeze({
    async bindNext(): Promise<"idle" | "blocked" | "bound" | "duplicate" | "conflicted"> {
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        const raw = await one(tx, postgresMetaHistoryMediaSql.candidate, []);
        if (raw === null) return "idle";
        const { scope, providerMessageId } = identity(raw);
        const sources = await readLocked(tx, scope, providerMessageId, "binding");
        if (sources === null) return "blocked";
        const previous = await one(tx, postgresMetaHistoryMediaSql.binding, [scope.tenantId, providerMessageId]);
        if (previous !== null && matchesBinding(previous, sources)) return "duplicate";
        const compatible = isMetaHistoryMediaCompatible(sources.message, sources.media);
        if (compatible) {
          const saved = requireExactPostgresRow(await one(tx, postgresMetaHistoryMediaSql.insert,
            [scope.tenantId, providerMessageId, sources.messageDigest, sources.mediaDigest]), ["providerMessageId"]);
          if (saved.providerMessageId !== providerMessageId) return fail();
        } else {
          if (parsePostgresPositiveInteger(requireExactPostgresRow(await one(tx, postgresMetaHistoryMediaSql.conflict, [scope.tenantId]), ["tenantId"]).tenantId) !== scope.tenantId) return fail();
        }
        parsePostgresPositiveInteger(requireExactPostgresRow(await one(tx, postgresMetaHistoryMediaSql.audit,
          [scope.tenantId, sources.messageKey, JSON.stringify({ outcome: compatible ? "bound" : "conflicted" })]), ["id"]).id);
        return compatible ? "bound" : "conflicted";
      });
    },
    // Internal metadata read for the acquisition path. This is a current
    // snapshot, not a reusable authorization to fetch or serve a binary.
    async readBoundMedia(tenantId: number, messageKey: string): Promise<Readonly<BoundMetaHistoryMedia> | null> {
      if (!Number.isSafeInteger(tenantId) || tenantId <= 0 || typeof messageKey !== "string" || !/^message_v1_[0-9a-f]{64}$/.test(messageKey)) return fail();
      return transactions.transaction({ isolationLevel: "read-committed" }, (tx) => readPostgresBoundMetaHistoryMedia(tx, tenantId, messageKey));
    },
  });
}


// Shared transaction boundary for current-source checks before durable upload
// transitions. Lock order remains tenant/connection, request, history session.
export async function readPostgresBoundMetaHistoryMedia(tx: PostgresTransaction, tenantId: number, messageKey: string): Promise<Readonly<BoundMetaHistoryMedia> | null> {
  return readBoundMedia(tx, tenantId, messageKey, "acquisition");
}

// Only the file authorization boundary uses this source check. It must still
// require the existing upload receipt, exact object version and clean scans.
export async function readPostgresBoundMetaHistoryMediaForFile(tx: PostgresTransaction, tenantId: number, messageKey: string): Promise<Readonly<BoundMetaHistoryMedia> | null> {
  return readBoundMedia(tx, tenantId, messageKey, "file-read");
}

async function readBoundMedia(tx: PostgresTransaction, tenantId: number, messageKey: string, purpose: "acquisition" | "file-read"): Promise<Readonly<BoundMetaHistoryMedia> | null> {
  const raw = await one(tx, purpose === "file-read" ? postgresMetaHistoryMediaSql.fileIdentity : postgresMetaHistoryMediaSql.identity, [tenantId, messageKey]);
  if (raw === null) return null;
  const { scope, providerMessageId } = identity(raw);
  if (scope.tenantId !== tenantId) return fail();
  const sources = await readLocked(tx, scope, providerMessageId, purpose);
  if (sources === null) return null;
  if (sources.messageKey !== messageKey || !isMetaHistoryMediaCompatible(sources.message, sources.media)) return fail();
  const saved = await one(tx, postgresMetaHistoryMediaSql.binding, [tenantId, providerMessageId]);
  if (saved === null) return null;
  matchesBinding(saved, sources);
  return Object.freeze({ scope: Object.freeze(scope), messageKey, message: sources.message, media: sources.media });
}
