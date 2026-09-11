import { paidAccessTenantSql } from "./postgresPaidAccess.ts";
import { hasPermission, type TenantRole } from "../../shared/domain/model.ts";
import { parseManualReplyRequest, parseManualReplySubmission, parseManualReplyViews, type ManualReplyRequest, type ManualReplySubmission, type ManualReplyView } from "../../shared/domain/manualReply.ts";
import { requireTenantPermission, type TenantSession } from "../auth/tenantSession.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { deriveRailwayApiDeterministicIdempotencyKey, deriveRailwayApiMutationRequestDigest } from "./railwayApiMutationExecutor.ts";
import { postgresRailwayConversationMutationSql as receipts } from "./postgresRailwayConversationMutationExecutor.ts";
import { parsePostgresPositiveInteger as integer, parsePostgresTimestamp as timestamp, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresQueryExecutor, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";

const operation = "conversations.reply.send";
const nowSql = "date_trunc('milliseconds', statement_timestamp())";
export type ManualReplyFailureCode = "INVALID_REQUEST" | "AUTHORIZATION_DENIED" | "CONFLICT" | "ASSIGNMENT_REQUIRED" | "SERVICE_WINDOW_CLOSED" | "DELIVERY_UNAVAILABLE" | "CONTACT_BLOCKED";
export class ManualReplyError extends Error {
  readonly code: ManualReplyFailureCode;
  constructor(code: ManualReplyFailureCode) { super(code); this.code = code; this.name = "ManualReplyError"; }
}
export interface ManualReplyClaim {
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly claimVersion: number;
  readonly businessPortfolioId: string;
  readonly wabaId: string;
  readonly phoneNumberId: string;
  readonly recipientPhoneNumber: string;
  readonly text: string;
  readonly serviceWindowExpiresAt: string;
}
export interface ManualReplyCommand {
  readonly session: Readonly<TenantSession>;
  readonly payload: Readonly<ManualReplyRequest>;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
}

export const postgresManualReplySql = Object.freeze({
  barrier: "SELECT pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1($1))",
  tenant: paidAccessTenantSql,
  membership: "SELECT role FROM tenant_memberships WHERE tenant_id = $1 AND external_user_id = $2 AND status = 'active' FOR SHARE",
  connection: `SELECT business_portfolio_id, waba_id, phone_number_id, version FROM meta_connections WHERE tenant_id = $1 AND status = 'connected' FOR SHARE`,
  credential: "SELECT credential_revision, envelope_digest FROM meta_credential_envelopes WHERE tenant_id = $1 FOR SHARE",
  policy: `SELECT event_key FROM whatsapp_campaign_delivery_policy_events WHERE tenant_id = $1 AND connection_version = $2
    AND policy_version = (SELECT max(policy_version) FROM whatsapp_campaign_delivery_policy_events WHERE tenant_id = $1)
    AND delivery_state = 'enabled' AND evidence_checked_at <= ${nowSql} AND recorded_at <= ${nowSql} AND evidence_expires_at > ${nowSql}`,

  conversation: "SELECT contact_id, assigned_external_user_id, status, version FROM conversations WHERE tenant_id = $1 AND conversation_key = $2 FOR UPDATE",
  contact: "SELECT phone_e164, version, consent_status FROM contacts WHERE tenant_id = $1 AND id = $2 FOR SHARE",
  window: `SELECT max(occurred_at) + interval '24 hours' AS expires_at FROM messages WHERE tenant_id = $1 AND conversation_key = $2 AND direction = 'inbound' AND occurred_at <= ${nowSql}`,
  time: `SELECT ${nowSql} AS now`,
  receipt: "SELECT actor_external_user_id, request_digest, status, response_json FROM railway_api_mutation_receipts WHERE tenant_id = $1 AND operation = $2 AND idempotency_key = $3 FOR UPDATE",
  insert: `INSERT INTO manual_reply_outbox (delivery_key, tenant_id, conversation_key, actor_external_user_id, actor_role, expected_version,
    contact_id, contact_version, recipient_phone_number, text_content, business_portfolio_id, waba_id, phone_number_id,
    connection_version, credential_revision, envelope_digest, service_window_expires_at, policy_event_key)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING delivery_key`,
  advanceConversation: `UPDATE conversations SET version = version + 1, status = 'agent_active', updated_at = ${nowSql}
    WHERE tenant_id = $1 AND conversation_key = $2 AND version = $3 RETURNING version`,
  list: `SELECT * FROM (
    SELECT delivery_key, text_content, state, created_at, updated_at FROM manual_reply_outbox
      WHERE tenant_id = $1 AND conversation_key = $2 AND state <> 'sent'
    UNION ALL SELECT d.delivery_key, o.reply_text AS text_content, d.state, d.created_at, d.updated_at
      FROM ai_reply_deliveries d JOIN ai_reply_outbox o ON o.tenant_id = d.tenant_id AND o.outbox_key = d.outbox_key
      WHERE d.tenant_id = $1 AND d.conversation_key = $2 AND d.state <> 'sent'
    ) pending ORDER BY created_at DESC, delivery_key DESC LIMIT 100`,
  claim: `WITH candidate AS (SELECT delivery_key FROM manual_reply_outbox
    WHERE (state = 'queued' AND next_attempt_at <= ${nowSql}) OR (state = 'preparing' AND claim_expires_at <= ${nowSql})
    ORDER BY next_attempt_at, created_at, delivery_key FOR UPDATE SKIP LOCKED LIMIT 1)
    UPDATE manual_reply_outbox AS reply SET state = 'preparing', claim_version = claim_version + 1,
      claim_expires_at = ${nowSql} + interval '60 seconds', reservation_key = NULL, updated_at = ${nowSql}
    FROM candidate WHERE reply.delivery_key = candidate.delivery_key RETURNING reply.*`,
  lock: "SELECT * FROM manual_reply_outbox WHERE tenant_id = $1 AND delivery_key = $2 FOR UPDATE",
  read: "SELECT * FROM manual_reply_outbox WHERE tenant_id = $1 AND delivery_key = $2",
  seal: `UPDATE manual_reply_outbox SET state = 'sending', claim_expires_at = NULL, reservation_key = $4,
    provider_started_at = ${nowSql}, error_code = NULL, updated_at = ${nowSql}
    WHERE tenant_id = $1 AND delivery_key = $2 AND claim_version = $3 AND state = 'preparing'
      AND claim_expires_at > ${nowSql} AND service_window_expires_at > ${nowSql} RETURNING delivery_key`,
  defer: `UPDATE manual_reply_outbox SET state = CASE WHEN service_window_expires_at <= GREATEST($4::timestamptz, ${nowSql}) THEN 'failed' ELSE 'queued' END,
    claim_expires_at = NULL, next_attempt_at = GREATEST($4::timestamptz, ${nowSql}), error_code = $5, updated_at = ${nowSql}
    WHERE tenant_id = $1 AND delivery_key = $2 AND claim_version = $3 AND state = 'preparing' RETURNING delivery_key`,
  fail: `UPDATE manual_reply_outbox SET state = 'failed', claim_expires_at = NULL, error_code = $4, updated_at = ${nowSql}
    WHERE tenant_id = $1 AND delivery_key = $2 AND claim_version = $3 AND state = 'preparing' RETURNING delivery_key`,
  unknown: `UPDATE manual_reply_outbox SET state = 'unknown', error_code = 'PROVIDER_OUTCOME_UNKNOWN', updated_at = ${nowSql}
    WHERE tenant_id = $1 AND delivery_key = $2 AND claim_version = $3 AND state = 'sending' RETURNING delivery_key`,
  expiredSending: `WITH stale AS (SELECT delivery_key FROM manual_reply_outbox
      WHERE state = 'sending' AND provider_started_at <= ${nowSql} - interval '2 minutes'
      ORDER BY provider_started_at, delivery_key FOR UPDATE SKIP LOCKED LIMIT 100)
    UPDATE manual_reply_outbox AS reply SET state = 'unknown', error_code = 'PROVIDER_OUTCOME_UNKNOWN', updated_at = ${nowSql}
    FROM stale WHERE reply.delivery_key = stale.delivery_key`,
  reject: `UPDATE manual_reply_outbox SET state = 'failed', error_code = $4, updated_at = ${nowSql}
    WHERE tenant_id = $1 AND delivery_key = $2 AND claim_version = $3 AND state IN ('sending', 'unknown') RETURNING delivery_key`,
  sent: `UPDATE manual_reply_outbox SET state = 'sent', provider_message_id = $4, error_code = NULL, updated_at = ${nowSql}
    WHERE tenant_id = $1 AND delivery_key = $2 AND claim_version = $3 AND state IN ('sending', 'unknown') RETURNING delivery_key`,
  message: `INSERT INTO messages (message_key, conversation_key, tenant_id, provider_message_id, direction, content_kind, status, text_content, occurred_at, status_updated_at)
    VALUES ($1, $2, $3, $4, 'outbound', 'text', 'sent', $5, $6, $6) ON CONFLICT (tenant_id, provider_message_id) DO NOTHING RETURNING message_key`,
  existingMessage: `SELECT message_key, conversation_key, direction, content_kind, text_content FROM messages WHERE tenant_id = $1 AND provider_message_id = $2 FOR UPDATE`,
  project: `UPDATE conversations SET status = CASE WHEN assigned_external_user_id = $5 AND status = 'agent_active'
      AND (last_message_at IS NULL OR last_message_at <= $4) THEN 'waiting_for_contact' ELSE status END,
    last_message_key = CASE WHEN last_message_at IS NULL OR last_message_at <= $4 THEN $3 ELSE last_message_key END,
    last_message_at = GREATEST(last_message_at, $4), version = version + 1, updated_at = ${nowSql}
    WHERE tenant_id = $1 AND conversation_key = $2 RETURNING version`,
});

type Row = Record<string, unknown>;
async function one(q: PostgresQueryExecutor, sql: string, parameters: readonly unknown[]): Promise<Row | null> {
  const safe = parameters.map((value) => {
    if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
    throw new Error("Manual reply query parameter is invalid");
  });
  return requirePostgresRows(await q.query<Row>(sql, safe), 1)[0] ?? null;
}
async function required(q: PostgresQueryExecutor, sql: string, parameters: readonly unknown[]): Promise<Row> {
  const row = await one(q, sql, parameters);
  if (!row) throw new Error("Manual reply database state is unavailable");
  return row;
}
function text(row: Row, key: string): string {
  if (typeof row[key] !== "string" || row[key].length === 0) throw new Error("Manual reply database text is invalid");
  return row[key];
}
function claimParameters(claim: ManualReplyClaim) { return [claim.tenantId, claim.deliveryKey, claim.claimVersion]; }
async function authorize(tx: PostgresTransaction, tenantId: number, actor: string, role: TenantRole): Promise<void> {
  if (!Number.isSafeInteger(tenantId) || tenantId < 1 || typeof actor !== "string" ||
      !hasPermission(role, "conversations.reply")) throw new ManualReplyError("AUTHORIZATION_DENIED");
  await tx.query(postgresManualReplySql.barrier, [tenantId]);
  if (!await one(tx, postgresManualReplySql.tenant, [tenantId])) throw new ManualReplyError("AUTHORIZATION_DENIED");
  const membership = await one(tx, postgresManualReplySql.membership, [tenantId, actor]);
  if (!membership || membership.role !== role) throw new ManualReplyError("AUTHORIZATION_DENIED");
}
async function binding(tx: PostgresTransaction, tenantId: number) {
  const connection = await one(tx, postgresManualReplySql.connection, [tenantId]);
  const credential = await one(tx, postgresManualReplySql.credential, [tenantId]);
  if (!connection || !credential) throw new ManualReplyError("DELIVERY_UNAVAILABLE");
  const policy = await one(tx, postgresManualReplySql.policy, [tenantId, integer(connection.version)]);
  if (!policy) throw new ManualReplyError("DELIVERY_UNAVAILABLE");
  return { connection, credential, policy };
}
async function target(tx: PostgresTransaction, tenantId: number, conversationKey: string, actor: string) {
  const conversation = await one(tx, postgresManualReplySql.conversation, [tenantId, conversationKey]);
  if (!conversation) throw new ManualReplyError("CONFLICT");
  if (conversation.assigned_external_user_id !== actor || conversation.status === "closed") throw new ManualReplyError("ASSIGNMENT_REQUIRED");
  const contact = await required(tx, postgresManualReplySql.contact, [tenantId, integer(conversation.contact_id)]);
  if (contact.consent_status === "withdrawn") throw new ManualReplyError("CONTACT_BLOCKED");
  const window = await required(tx, postgresManualReplySql.window, [tenantId, conversationKey]);
  const now = timestamp((await required(tx, postgresManualReplySql.time, [])).now);
  if (window.expires_at === null || timestamp(window.expires_at) <= now) throw new ManualReplyError("SERVICE_WINDOW_CLOSED");
  return { conversation, contact, expiresAt: timestamp(window.expires_at), now };
}

export function createPostgresManualReplyRepository(dependencies: Readonly<{ queries: PostgresQueryExecutor; transactions: PostgresTransactionManager }>) {
  const { queries, transactions } = dependencies;
  return Object.freeze({
    async enqueue(command: Readonly<ManualReplyCommand>): Promise<Readonly<{ replayed: boolean; submission: ManualReplySubmission }>> {
      const { session } = command;
      requireTenantPermission(session, "conversations.reply");
      const payload = parseManualReplyRequest(command.payload);
      if (!payload || command.idempotencyKey !== await deriveRailwayApiDeterministicIdempotencyKey(operation, payload) ||
          command.requestDigest !== await deriveRailwayApiMutationRequestDigest(operation, payload)) throw new ManualReplyError("INVALID_REQUEST");
      const deliveryKey = `manual_reply_delivery_v1_${await sha256Hex(new TextEncoder().encode(JSON.stringify([operation, session.tenantId, session.externalUserId, command.idempotencyKey])))}`;
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await authorize(tx, session.tenantId, session.externalUserId, session.role);
        const previous = await one(tx, postgresManualReplySql.receipt, [session.tenantId, operation, command.idempotencyKey]);
        if (previous) {
          if (previous.actor_external_user_id !== session.externalUserId || previous.request_digest !== command.requestDigest || previous.status !== "completed") throw new ManualReplyError("CONFLICT");
          const submission = parseManualReplySubmission(previous.response_json, payload);
          if (!submission || submission.deliveryKey !== deliveryKey) throw new Error("Manual reply receipt is invalid");
          return { replayed: true, submission };
        }
        const { connection, credential, policy } = await binding(tx, session.tenantId);
        const { conversation, contact, expiresAt } = await target(tx, session.tenantId, payload.conversationKey, session.externalUserId);
        if (integer(conversation.version) !== payload.expectedVersion) throw new ManualReplyError("CONFLICT");
        if (await one(tx, "SELECT delivery_key FROM manual_reply_outbox WHERE tenant_id = $1 AND conversation_key = $2 AND state IN ('queued', 'preparing', 'sending', 'unknown') LIMIT 1", [session.tenantId, payload.conversationKey])) throw new ManualReplyError("CONFLICT");
        if (await one(tx, "SELECT delivery_key FROM ai_reply_deliveries WHERE tenant_id = $1 AND conversation_key = $2 AND state IN ('sending', 'unknown') LIMIT 1",
          [session.tenantId, payload.conversationKey])) throw new ManualReplyError("CONFLICT");
        await required(tx, receipts.claimReceipt, [session.tenantId, operation, command.idempotencyKey, command.requestDigest, session.externalUserId]);
        await required(tx, postgresManualReplySql.insert, [deliveryKey, session.tenantId, payload.conversationKey, session.externalUserId, session.role, payload.expectedVersion,
          integer(conversation.contact_id), integer(contact.version), text(contact, "phone_e164"), payload.text,
          text(connection, "business_portfolio_id"), text(connection, "waba_id"), text(connection, "phone_number_id"), integer(connection.version),
          integer(credential.credential_revision), text(credential, "envelope_digest"), expiresAt, text(policy, "event_key")]);
        const changed = await required(tx, postgresManualReplySql.advanceConversation, [session.tenantId, payload.conversationKey, payload.expectedVersion]);
        const submission = { deliveryKey, conversationKey: payload.conversationKey, version: integer(changed.version) };
        await required(tx, receipts.insertAudit, [session.tenantId, session.externalUserId, operation, payload.conversationKey, command.idempotencyKey,
          JSON.stringify({ deliveryKey, expectedVersion: payload.expectedVersion, resultingVersion: submission.version })]);
        await required(tx, receipts.completeReceipt, [session.tenantId, operation, command.idempotencyKey, command.requestDigest, JSON.stringify(submission)]);
        return { replayed: false, submission: Object.freeze(submission) };
      });
    },
    async list(tenantId: number, conversationKey: string): Promise<readonly ManualReplyView[]> {
      if (!Number.isSafeInteger(tenantId) || tenantId < 1 || !/^conversation_v1_[a-f0-9]{64}$/.test(conversationKey)) throw new Error("Manual reply scope is invalid");
      const rows = requirePostgresRows(await queries.query<Row>(postgresManualReplySql.list, [tenantId, conversationKey]), 100);
      const result = parseManualReplyViews(rows.map((row) => ({ deliveryKey: row.delivery_key, text: row.text_content, state: row.state,
        createdAt: timestamp(row.created_at), updatedAt: timestamp(row.updated_at) })).reverse());
      if (!result) throw new Error("Manual reply view is invalid");
      return result;
    },
    async claim(): Promise<ManualReplyClaim | null> {
      const row = await one(queries, postgresManualReplySql.claim, []);
      if (!row) return null;
      return Object.freeze({ deliveryKey: text(row, "delivery_key"), tenantId: integer(row.tenant_id), claimVersion: integer(row.claim_version),
        businessPortfolioId: text(row, "business_portfolio_id"), wabaId: text(row, "waba_id"), phoneNumberId: text(row, "phone_number_id"),
        recipientPhoneNumber: text(row, "recipient_phone_number"), text: text(row, "text_content"), serviceWindowExpiresAt: timestamp(row.service_window_expires_at) });
    },
    async seal(claim: ManualReplyClaim, reservationKey: string): Promise<boolean> {
      if (!/^whatsapp_rate_reservation_v1_[a-f0-9]{64}$/.test(reservationKey)) throw new Error("Manual reply reservation is invalid");
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        // Read identity without locking the outbox first: all authorization locks precede the outbox lock.
        const initial = await one(tx, postgresManualReplySql.read, claimParameters(claim).slice(0, 2));
        if (!initial) return false;
        await authorize(tx, claim.tenantId, text(initial, "actor_external_user_id"), text(initial, "actor_role") as TenantRole);
        const { connection, credential, policy } = await binding(tx, claim.tenantId);
        const current = await target(tx, claim.tenantId, text(initial, "conversation_key"), text(initial, "actor_external_user_id"));
        const row = await required(tx, postgresManualReplySql.lock, claimParameters(claim).slice(0, 2));
        if (row.state !== "preparing" || integer(row.claim_version) !== claim.claimVersion) return false;
        if (row.text_content !== claim.text || row.recipient_phone_number !== claim.recipientPhoneNumber ||
            row.phone_number_id !== claim.phoneNumberId || row.waba_id !== claim.wabaId || row.business_portfolio_id !== claim.businessPortfolioId ||
            timestamp(row.service_window_expires_at) !== claim.serviceWindowExpiresAt) throw new ManualReplyError("CONFLICT");
        if (timestamp(row.service_window_expires_at) <= current.now) throw new ManualReplyError("SERVICE_WINDOW_CLOSED");
        if (policy.event_key !== row.policy_event_key) throw new ManualReplyError("DELIVERY_UNAVAILABLE");
        if (integer(connection.version) !== integer(row.connection_version) || connection.business_portfolio_id !== row.business_portfolio_id ||
            connection.waba_id !== row.waba_id || connection.phone_number_id !== row.phone_number_id ||
            integer(credential.credential_revision) !== integer(row.credential_revision) || credential.envelope_digest !== row.envelope_digest) throw new ManualReplyError("DELIVERY_UNAVAILABLE");
        if (integer(current.conversation.contact_id) !== integer(row.contact_id) || current.contact.phone_e164 !== row.recipient_phone_number ||
            integer(current.contact.version) !== integer(row.contact_version)) throw new ManualReplyError("CONTACT_BLOCKED");
        return await one(tx, postgresManualReplySql.seal, [...claimParameters(claim), reservationKey]) !== null;
      });
    },
    async defer(claim: ManualReplyClaim, retryAt: string, errorCode: string): Promise<void> {
      if (!/^[A-Z0-9_]{1,100}$/.test(errorCode) || timestamp(retryAt) !== retryAt) throw new Error("Manual reply deferral is invalid");
      await one(queries, postgresManualReplySql.defer, [...claimParameters(claim), retryAt, errorCode]);
    },
    async fail(claim: ManualReplyClaim, code: string): Promise<void> {
      if (!/^[A-Z0-9_]{1,100}$/.test(code)) throw new Error("Manual reply failure is invalid");
      await one(queries, postgresManualReplySql.fail, [...claimParameters(claim), code]);
    },
    async unknown(claim: ManualReplyClaim): Promise<void> { await one(queries, postgresManualReplySql.unknown, claimParameters(claim)); },
    async recover(): Promise<void> { await queries.query(postgresManualReplySql.expiredSending, []); },
    async reject(claim: ManualReplyClaim, code: string): Promise<void> {
      if (!/^[A-Z0-9_]{1,100}$/.test(code)) throw new Error("Manual reply rejection is invalid");
      await one(queries, postgresManualReplySql.reject, [...claimParameters(claim), code]);
    },
    async accepted(claim: ManualReplyClaim, providerMessageId: string): Promise<void> {
      if (!/^[^\u0000-\u001f\u007f]{1,255}$/.test(providerMessageId) || providerMessageId.trim() !== providerMessageId) throw new Error("Manual reply provider identity is invalid");
      const messageKey = `message_v1_${await sha256Hex(new TextEncoder().encode(JSON.stringify({ namespace: "whatsapp_manual_reply_v1", tenantId: claim.tenantId, providerMessageId })))}`;
      await transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        const initial = await required(tx, postgresManualReplySql.read, claimParameters(claim).slice(0, 2));
        // Accepted side effects must be recorded even if the actor or connection was revoked after seal.
        await required(tx, postgresManualReplySql.conversation, [claim.tenantId, initial.conversation_key]);
        const row = await required(tx, postgresManualReplySql.lock, claimParameters(claim).slice(0, 2));
        if (integer(row.claim_version) !== claim.claimVersion) throw new Error("Manual reply claim changed");
        if (row.state === "sent" && row.provider_message_id === providerMessageId) return;
        if (row.state !== "sending" && row.state !== "unknown") throw new Error("Manual reply was not sealed");
        const at = timestamp(row.provider_started_at);
        let actualMessageKey = messageKey;
        const inserted = await one(tx, postgresManualReplySql.message, [messageKey, row.conversation_key, claim.tenantId, providerMessageId, row.text_content, at]);
        if (!inserted) {
          const existing = await required(tx, postgresManualReplySql.existingMessage, [claim.tenantId, providerMessageId]);
          if (existing.conversation_key !== row.conversation_key || existing.direction !== "outbound" || existing.content_kind !== "text" || existing.text_content !== row.text_content) throw new Error("Manual reply provider identity conflicts");
          actualMessageKey = text(existing, "message_key");
        }
        await required(tx, postgresManualReplySql.project, [claim.tenantId, row.conversation_key, actualMessageKey, at, row.actor_external_user_id]);
        await required(tx, postgresManualReplySql.sent, [...claimParameters(claim), providerMessageId]);
      });
    },
  });
}
export type PostgresManualReplyRepository = ReturnType<typeof createPostgresManualReplyRepository>;
