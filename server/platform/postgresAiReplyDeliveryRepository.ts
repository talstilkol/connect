import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { ManualReplyError, postgresManualReplySql as shared, type ManualReplyClaim } from "./postgresManualReplyRepository.ts";
import { aiDeliveryOne as one, aiDeliveryText as text, requireAiDeliveryAuthority, type AiDeliveryRow, type AiDeliveryBinding } from "./postgresAiReplyDeliveryAuthority.ts";
import { postgresAiReplyDeliverySql as sql } from "./postgresAiReplyDeliverySql.ts";
import { parsePostgresPositiveInteger as integer, parsePostgresTimestamp as timestamp } from "./postgresResultValidation.ts";
import type { PostgresQueryExecutor, PostgresTransactionManager } from "./postgresTransaction.ts";

function scope(claim: ManualReplyClaim): [number, string, number] {
  if (!Number.isSafeInteger(claim.tenantId) || claim.tenantId < 1 || !/^ai_reply_delivery_v1_[a-f0-9]{64}$/.test(claim.deliveryKey) ||
    !Number.isSafeInteger(claim.claimVersion) || claim.claimVersion < 1) throw new Error("AI delivery claim is invalid");
  return [claim.tenantId, claim.deliveryKey, claim.claimVersion];
}
function bindingMatches(current: AiDeliveryBinding, captured: unknown): boolean {
  if (!captured || typeof captured !== "object" || Array.isArray(captured)) return false;
  const record = captured as Record<string, unknown>;
  return Object.keys(record).length === Object.keys(current).length && Object.entries(current).every(([key, value]) => record[key] === value);
}
function claimFor(row: AiDeliveryRow, replyText: string): ManualReplyClaim {
  const b = row.binding_json as AiDeliveryBinding;
  return Object.freeze({ deliveryKey: text(row, "delivery_key"), tenantId: integer(row.tenant_id), claimVersion: integer(row.claim_version),
    businessPortfolioId: b.businessPortfolioId, wabaId: b.wabaId, phoneNumberId: b.phoneNumberId,
    recipientPhoneNumber: b.recipientPhoneNumber, text: replyText, serviceWindowExpiresAt: b.serviceWindowExpiresAt });
}
function code(value: string) { if (!/^[A-Z0-9_]{1,100}$/.test(value)) throw new Error("AI delivery failure is invalid"); return value; }

/** Uses the shared text sender port; approval and automation authority remain specific to AI. */
export function createPostgresAiReplyDeliveryRepository(dependencies: Readonly<{ queries: PostgresQueryExecutor; transactions: PostgresTransactionManager }>) {
  const { queries, transactions } = dependencies;
  return Object.freeze({
    async recover(): Promise<void> {
      await queries.query(sql.expiredSending, []);
      await transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        const o = await one(tx, sql.stageCandidate, []);
        if (!o) return;
        const tenant = integer(o.tenant_id), version = integer(o.version);
        const deliveryKey = `ai_reply_delivery_v1_${await sha256Hex(new TextEncoder().encode(JSON.stringify(["ai_reply_delivery_v1", tenant, o.outbox_key, version])))}`;
        await one(tx, sql.insert, [deliveryKey, tenant, text(o, "outbox_key"), version, text(o, "conversation_key")]);
      });
    },
    async claim(): Promise<ManualReplyClaim | null> {
      // Do not hold a delivery lock while waiting for tenant/approval/conversation locks.
      const candidate = await one(queries, sql.candidate, []);
      if (!candidate) return null;
      const tenant = integer(candidate.tenant_id), key = text(candidate, "delivery_key");
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await tx.query(shared.barrier, [tenant]);
        let binding: AiDeliveryBinding | null = null;
        let invalid: ManualReplyError | null = null;
        try { binding = await requireAiDeliveryAuthority(tx, candidate); }
        catch (error) { if (!(error instanceof ManualReplyError)) throw error; invalid = error; }
        const row = await one(tx, sql.eligible, [tenant, key]);
        if (!row) return null;
        if (invalid) {
          await one(tx, invalid.code === "DELIVERY_UNAVAILABLE" ? sql.wait : sql.invalidate,
            invalid.code === "DELIVERY_UNAVAILABLE" ? [tenant, key] : [tenant, key, invalid.code]);
          return null;
        }
        if (!binding) throw new Error("AI delivery authority is unavailable");
        const prepared = await one(tx, sql.prepare, [tenant, key, JSON.stringify(binding)]);
        const o = await one(tx, sql.approval, [tenant, text(row, "outbox_key")]);
        if (!prepared || !o) throw new Error("AI delivery claim is unavailable");
        return claimFor(prepared, text(o, "reply_text"));
      });
    },
    async seal(claim: ManualReplyClaim, reservationKey: string): Promise<boolean> {
      const parameters = scope(claim);
      if (!/^whatsapp_rate_reservation_v1_[a-f0-9]{64}$/.test(reservationKey)) throw new Error("AI delivery reservation is invalid");
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await tx.query(shared.barrier, [claim.tenantId]);
        const identity = await one(tx, sql.read, parameters.slice(0, 2));
        if (!identity || identity.state !== "preparing" || integer(identity.claim_version) !== claim.claimVersion) return false;
        const current = await requireAiDeliveryAuthority(tx, identity);
        const row = await one(tx, sql.lock, parameters.slice(0, 2));
        if (!row || row.state !== "preparing" || integer(row.claim_version) !== claim.claimVersion) return false;
        const o = await one(tx, sql.approval, [claim.tenantId, text(row, "outbox_key")]);
        if (!o || !bindingMatches(current, row.binding_json)) throw new ManualReplyError("CONFLICT");
        const canonical = claimFor(row, text(o, "reply_text"));
        if (Object.keys(canonical).some((key) => canonical[key as keyof ManualReplyClaim] !== claim[key as keyof ManualReplyClaim])) throw new ManualReplyError("CONFLICT");
        return await one(tx, sql.seal, [...parameters, reservationKey]) !== null;
      });
    },
    async defer(claim: ManualReplyClaim, retryAt: string, errorCode: string): Promise<void> {
      if (timestamp(retryAt) !== retryAt) throw new Error("AI delivery deferral is invalid");
      await one(queries, sql.defer, [...scope(claim), retryAt, code(errorCode)]);
    },
    async fail(claim: ManualReplyClaim, errorCode: string): Promise<void> { await one(queries, sql.fail, [...scope(claim), code(errorCode)]); },
    async unknown(claim: ManualReplyClaim): Promise<void> { await one(queries, sql.unknown, scope(claim)); },
    async reject(claim: ManualReplyClaim, errorCode: string): Promise<void> { await one(queries, sql.reject, [...scope(claim), code(errorCode)]); },
    async accepted(claim: ManualReplyClaim, providerMessageId: string): Promise<void> {
      const parameters = scope(claim);
      if (!/^[^\u0000-\u001f\u007f]{1,255}$/.test(providerMessageId) || providerMessageId.trim() !== providerMessageId) throw new Error("AI delivery provider identity is invalid");
      const messageKey = `message_v1_${await sha256Hex(new TextEncoder().encode(JSON.stringify({ namespace: "whatsapp_ai_reply_v1", tenantId: claim.tenantId, providerMessageId })))}`;
      await transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await tx.query(shared.barrier, [claim.tenantId]);
        const identity = await one(tx, sql.read, parameters.slice(0, 2));
        if (!identity) throw new Error("AI delivery is unavailable");
        // Persist effects after seal even if authority was revoked or a newer inbound arrived.
        const o = await one(tx, sql.approval, [claim.tenantId, text(identity, "outbox_key")]);
        if (!o || !await one(tx, sql.conversation, [claim.tenantId, text(identity, "conversation_key")])) throw new Error("AI delivery conversation is unavailable");
        const row = await one(tx, sql.lock, parameters.slice(0, 2));
        if (!row || integer(row.claim_version) !== claim.claimVersion) throw new Error("AI delivery claim changed");
        if (row.state === "sent" && row.provider_message_id === providerMessageId) return;
        const late = row.state === "failed" && row.error_code === "OPERATOR_CONFIRMED_NOT_ACCEPTED";
        if (late) await tx.query("SELECT public.record_ai_delivery_late_acceptance_v1($1,$2,$3,$4)", [...parameters, providerMessageId]);
        if (row.state !== "sending" && row.state !== "unknown" && !late) throw new Error("AI delivery was not sealed");
        const at = timestamp(row.provider_started_at), conversation = text(row, "conversation_key"), body = text(o, "reply_text");
        let actualKey = messageKey;
        if (!await one(tx, shared.message, [messageKey, conversation, claim.tenantId, providerMessageId, body, at])) {
          const existing = await one(tx, shared.existingMessage, [claim.tenantId, providerMessageId]);
          if (!existing || existing.conversation_key !== conversation || existing.direction !== "outbound" || existing.content_kind !== "text" ||
            existing.text_content !== body) throw new Error("AI delivery provider identity conflicts");
          actualKey = text(existing, "message_key");
        }
        await one(tx, sql.project, [claim.tenantId, conversation, actualKey, at]);
        if (!await one(tx, sql.sent, [...parameters, providerMessageId])) throw new Error("AI delivery acceptance was not recorded");
      });
    },
  });
}
