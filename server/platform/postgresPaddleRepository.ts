import type { TenantSession } from "../auth/tenantSession.ts";
import { PaddleError, paddleDigest, type PaddleCheckoutIntent, type PaddleEnvironment, type PaddleNotice, type PaddlePlan, type PaddleSubscription, type PaddleTransaction } from "../billing/paddleProtocol.ts";
import type { PostgresQueryExecutor, PostgresTransactionManager } from "./postgresTransaction.ts";

interface CheckoutRow {
  intent_key: string; tenant_id: string | number; environment: PaddleEnvironment; actor_external_user_id: string;
  price_id: string; product_id: string; checkout_base_url: string; state: string;
  transaction_id: string | null; checkout_url: string | null; reconcile_revision: string | number;
}
export interface PaddleReconciliation extends PaddleCheckoutIntent { readonly transactionId: string; readonly revision: string; }
export const paddleTenantBarrier = "SELECT pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1($1))";
function intent(row: CheckoutRow): PaddleCheckoutIntent {
  return { intentKey: row.intent_key, tenantId: Number(row.tenant_id), environment: row.environment, actorExternalUserId: row.actor_external_user_id,
    priceId: row.price_id, productId: row.product_id, checkoutBaseUrl: row.checkout_base_url };
}
async function currentOwner(tx: PostgresQueryExecutor, tenantId: number, actor: string): Promise<boolean> {
  const tenant = await tx.query("SELECT id FROM tenants WHERE id=$1 AND status IN ('trial','active','payment_failed') FOR SHARE", [tenantId]);
  if (tenant.rowCount !== 1) return false;
  const membership = await tx.query("SELECT role FROM tenant_memberships WHERE tenant_id=$1 AND external_user_id=$2 AND role='owner' AND status='active' FOR SHARE", [tenantId, actor]);
  return membership.rowCount === 1;
}
export function createPostgresPaddleRepository({ queries, transactions }: { queries: PostgresQueryExecutor; transactions: PostgresTransactionManager }) {
  const transaction = <T>(body: (tx: PostgresQueryExecutor) => Promise<T>) => transactions.transaction({ isolationLevel: "read-committed" }, body);
  async function lock(tx: PostgresQueryExecutor, candidate: PaddleCheckoutIntent): Promise<CheckoutRow> {
    await tx.query(paddleTenantBarrier, [candidate.tenantId]);
    const row = (await tx.query<CheckoutRow>("SELECT * FROM paddle_checkout_intents WHERE intent_key=$1 AND tenant_id=$2 AND environment=$3 FOR UPDATE", [candidate.intentKey, candidate.tenantId, candidate.environment])).rows[0];
    if (!row || paddleDigest(intent(row)) !== paddleDigest(candidate)) throw new PaddleError("CONFLICT"); return row;
  }
  return {
    async enqueue(session: TenantSession, plan: PaddlePlan): Promise<void> {
      if (session.role !== "owner") throw new PaddleError("AUTHORIZATION_DENIED");
      const key = `paddle_checkout_v1_${paddleDigest({ tenantId: session.tenantId, environment: plan.environment, generation: 1 })}`;
      await transaction(async tx => {
        await tx.query(paddleTenantBarrier, [session.tenantId]);
        if (!await currentOwner(tx, session.tenantId, session.externalUserId)) throw new PaddleError("AUTHORIZATION_DENIED");
        // Repeated clicks, new browser requests and config rotation all return the same attempt.
        await tx.query(`INSERT INTO paddle_checkout_intents(intent_key,tenant_id,environment,actor_external_user_id,price_id,product_id,checkout_base_url)
          VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(tenant_id,environment) DO NOTHING`,
        [key, session.tenantId, plan.environment, session.externalUserId, plan.priceId, plan.productId, plan.checkoutBaseUrl]);
      });
    },
    async read(session: TenantSession, environment: PaddleEnvironment) {
      if (!["owner", "manager", "viewer"].includes(session.role)) throw new PaddleError("AUTHORIZATION_DENIED");
      const authority = (await queries.query<{ role: string }>(`SELECT m.role FROM tenant_memberships m JOIN tenants t ON t.id=m.tenant_id
        WHERE m.tenant_id=$1 AND m.external_user_id=$2 AND m.status='active' AND m.role IN ('owner','manager','viewer') AND t.status IN ('trial','active','payment_failed')`, [session.tenantId, session.externalUserId])).rows[0];
      if (!authority || authority.role !== session.role) throw new PaddleError("AUTHORIZATION_DENIED");
      const rows = await queries.query<CheckoutRow & { provider_status: string | null; period_ends_at: Date | string | null; needs_review: boolean | null }>(
        `SELECT c.*,a.provider_status,a.period_ends_at,a.needs_review FROM paddle_checkout_intents c
          LEFT JOIN paddle_accounts a USING(tenant_id,environment) WHERE c.tenant_id=$1 AND c.environment=$2
          AND EXISTS(SELECT 1 FROM tenant_memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.tenant_id=c.tenant_id AND m.external_user_id=$3
            AND m.status='active' AND m.role=$4 AND t.status IN ('trial','active','payment_failed'))`, [session.tenantId, environment, session.externalUserId, session.role]);
      const row = rows.rows[0];
      return { canManage: session.role === "owner", environment, checkout: row ? { state: row.state, transactionId: session.role === "owner" && row.state === "ready" ? row.transaction_id : null,
        url: session.role === "owner" && row.state === "ready" ? row.checkout_url : null } : null,
        subscription: row?.provider_status ? { status: row.provider_status, endsAt: row.period_ends_at ? new Date(row.period_ends_at).toISOString() : null, needsReview: row.needs_review } : null };
    },
    async claimCreation(environment: PaddleEnvironment): Promise<PaddleCheckoutIntent | null> {
      const candidate = (await queries.query<CheckoutRow>("SELECT * FROM paddle_checkout_intents WHERE environment=$1 AND state='queued' ORDER BY created_at,intent_key LIMIT 1", [environment])).rows[0];
      if (!candidate) return null;
      return transaction(async tx => {
        const work = intent(candidate), row = await lock(tx, work); if (row.state !== "queued") return null;
        if (!await currentOwner(tx, work.tenantId, work.actorExternalUserId)) {
          await tx.query("UPDATE paddle_checkout_intents SET state='rejected',error_code='AUTHORIZATION_DENIED',updated_at=statement_timestamp() WHERE intent_key=$1", [work.intentKey]); return null;
        }
        // The commit acknowledgment is required before returning work to the provider caller.
        await tx.query("UPDATE paddle_checkout_intents SET state='creating',updated_at=statement_timestamp() WHERE intent_key=$1", [work.intentKey]); return work;
      });
    },
    async authorizeCreation(work: PaddleCheckoutIntent): Promise<boolean> {
      return transaction(async tx => { const row = await lock(tx, work); return row.state === "creating" && await currentOwner(tx, work.tenantId, work.actorExternalUserId); });
    },
    async creationUnknown(work: PaddleCheckoutIntent): Promise<void> {
      await transaction(async tx => { const row = await lock(tx, work); if (row.state !== "creating") return;
        await tx.query("UPDATE paddle_checkout_intents SET state='unknown',error_code='PROVIDER_OUTCOME_UNKNOWN',updated_at=statement_timestamp() WHERE intent_key=$1", [work.intentKey]); });
    },
    async confirmCreation(work: PaddleCheckoutIntent, receipt: PaddleTransaction): Promise<void> {
      if (!["draft", "ready"].includes(receipt.status) || receipt.priceId !== work.priceId || receipt.productId !== work.productId || receipt.subscriptionId !== null || !receipt.checkoutUrl) throw new PaddleError("CONFLICT");
      const expected = new URL(work.checkoutBaseUrl); expected.searchParams.set("_ptxn", receipt.id);
      if (receipt.checkoutUrl !== expected.href) throw new PaddleError("CONFLICT");
      await transaction(async tx => { const row = await lock(tx, work);
        if (row.transaction_id === receipt.id && row.checkout_url === receipt.checkoutUrl) return;
        if (!["creating", "unknown"].includes(row.state)) throw new PaddleError("CONFLICT");
        // Retain provider acceptance even if the owner was revoked during the request.
        await tx.query("UPDATE paddle_checkout_intents SET state='ready',transaction_id=$2,checkout_url=$3,error_code=NULL,next_reconcile_at=statement_timestamp(),updated_at=statement_timestamp() WHERE intent_key=$1", [work.intentKey, receipt.id, receipt.checkoutUrl]);
      });
    },
    async recordNotice(environment: PaddleEnvironment, notice: PaddleNotice): Promise<void> {
      await transaction(async tx => {
        // All receipts commit before 200. No customer data, signature or raw body is persisted.
        const inserted = await tx.query(`INSERT INTO paddle_webhook_receipts(environment,event_id,event_type,entity_id,occurred_at,event_digest)
          VALUES($1,$2,$3,$4,$5::timestamptz,$6) ON CONFLICT DO NOTHING`, [environment, notice.eventId, notice.eventType, notice.entityId, notice.occurredAt, notice.digest]);
        if (inserted.rowCount === 0) {
          const previous = (await tx.query<{ event_digest: string }>("SELECT event_digest FROM paddle_webhook_receipts WHERE environment=$1 AND event_id=$2", [environment, notice.eventId])).rows[0];
          if (previous?.event_digest !== notice.digest) throw new PaddleError("CONFLICT"); return;
        }
        const candidate = (await tx.query<CheckoutRow>(`SELECT c.* FROM paddle_checkout_intents c LEFT JOIN paddle_accounts a USING(tenant_id,environment)
          WHERE c.environment=$1 AND (c.transaction_id=$2 OR a.subscription_id=$2)`, [environment, notice.entityId])).rows[0];
        if (candidate) {
          await lock(tx, intent(candidate));
          await tx.query("UPDATE paddle_checkout_intents SET reconcile_revision=reconcile_revision+1,next_reconcile_at=statement_timestamp() WHERE intent_key=$1", [candidate.intent_key]);
        }
      });
    },
    async claimReconciliation(environment: PaddleEnvironment): Promise<PaddleReconciliation | null> {
      // A crash after sealing creation cannot authorize another creation attempt.
      await queries.query("UPDATE paddle_checkout_intents SET state='unknown',error_code='PROVIDER_OUTCOME_UNKNOWN',updated_at=statement_timestamp() WHERE environment=$1 AND state='creating' AND updated_at<statement_timestamp()-interval '1 minute'", [environment]);
      const candidate = (await queries.query<CheckoutRow>("SELECT * FROM paddle_checkout_intents WHERE environment=$1 AND state IN ('ready','completed') AND next_reconcile_at<=statement_timestamp() ORDER BY next_reconcile_at,intent_key LIMIT 1", [environment])).rows[0];
      if (!candidate) return null;
      return transaction(async tx => {
        const work = intent(candidate), row = await lock(tx, work);
        const result = await tx.query<{ revision: string }>("UPDATE paddle_checkout_intents SET reconcile_revision=reconcile_revision+1,next_reconcile_at=statement_timestamp()+interval '5 minutes' WHERE intent_key=$1 AND next_reconcile_at<=statement_timestamp() RETURNING reconcile_revision::text AS revision", [work.intentKey]);
        return result.rows[0] && row.transaction_id ? { ...work, transactionId: row.transaction_id, revision: result.rows[0].revision } : null;
      });
    },
    async applyReconciliation(work: PaddleReconciliation, payment: PaddleTransaction, subscription: PaddleSubscription): Promise<"applied" | "stale" | "review"> {
      if (payment.id !== work.transactionId || payment.status !== "completed" || payment.subscriptionId !== subscription.id || payment.customerId !== subscription.customerId ||
        payment.priceId !== work.priceId || subscription.priceId !== work.priceId || payment.productId !== work.productId || subscription.productId !== work.productId) throw new PaddleError("CONFLICT");
      return transaction(async tx => {
        const row = await lock(tx, { intentKey: work.intentKey, tenantId: work.tenantId, environment: work.environment, actorExternalUserId: work.actorExternalUserId,
          priceId: work.priceId, productId: work.productId, checkoutBaseUrl: work.checkoutBaseUrl });
        if (String(row.reconcile_revision) !== work.revision || row.transaction_id !== payment.id) return "stale";
        const hash = paddleDigest(subscription);
        const old = (await tx.query<{ projection_digest: string; version_order: number; customer_id: string; subscription_id: string }>(
          `SELECT projection_digest,customer_id,subscription_id,CASE WHEN provider_updated_at>$3::timestamptz THEN 1 WHEN provider_updated_at=$3::timestamptz THEN 0 ELSE -1 END AS version_order
            FROM paddle_accounts WHERE tenant_id=$1 AND environment=$2 FOR UPDATE`, [work.tenantId, work.environment, subscription.updatedAt])).rows[0];
        if (old && (old.customer_id !== subscription.customerId || old.subscription_id !== subscription.id)) throw new PaddleError("CONFLICT");
        if (old && old.version_order > 0) return "stale";
        if (old && old.version_order === 0 && old.projection_digest !== hash) {
          await tx.query("UPDATE paddle_accounts SET needs_review=TRUE WHERE tenant_id=$1 AND environment=$2", [work.tenantId, work.environment]); return "review";
        }
        await tx.query(`INSERT INTO paddle_accounts(tenant_id,environment,intent_key,customer_id,subscription_id,provider_updated_at,projection_digest,provider_status,period_starts_at,period_ends_at,scheduled_action,scheduled_effective_at)
          VALUES($1,$2,$3,$4,$5,$6::timestamptz,$7,$8,$9::timestamptz,$10::timestamptz,$11,$12::timestamptz)
          ON CONFLICT(tenant_id,environment) DO UPDATE SET provider_updated_at=EXCLUDED.provider_updated_at,projection_digest=EXCLUDED.projection_digest,
            provider_status=EXCLUDED.provider_status,period_starts_at=EXCLUDED.period_starts_at,period_ends_at=EXCLUDED.period_ends_at,
            scheduled_action=EXCLUDED.scheduled_action,scheduled_effective_at=EXCLUDED.scheduled_effective_at,verified_at=statement_timestamp()`,
        [work.tenantId, work.environment, work.intentKey, subscription.customerId, subscription.id, subscription.updatedAt, hash, subscription.status,
          subscription.startsAt, subscription.endsAt, subscription.scheduledChange?.action ?? null, subscription.scheduledChange?.effectiveAt ?? null]);
        await tx.query("UPDATE paddle_checkout_intents SET state='completed',updated_at=statement_timestamp() WHERE intent_key=$1", [work.intentKey]); return "applied";
      });
    },
  };
}
export type PostgresPaddleRepository = ReturnType<typeof createPostgresPaddleRepository>;
