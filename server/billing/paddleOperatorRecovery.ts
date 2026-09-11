import { PaddleError, paddleDigest, paddleId, paddleRecord, type PaddleEnvironment, type PaddleCheckoutIntent, type PaddleProvider, type PaddleSubscription, type PaddleTransaction } from "./paddleProtocol.ts";
import { paddleTenantBarrier } from "../platform/postgresPaddleRepository.ts";
import type { PostgresQueryExecutor, PostgresTransactionManager } from "../platform/postgresTransaction.ts";

export type PaddleRecoveryAction = "bind-transaction" | "close-absent" | "resolve-review";
export interface PaddleRecoveryRequest {
  readonly tenantId: number;
  readonly environment: PaddleEnvironment;
  readonly intentKey: string;
  readonly action: PaddleRecoveryAction;
  readonly transactionId: string | null;
}
export interface PaddleRecoveryProposal extends PaddleRecoveryRequest {
  readonly schemaVersion: 1;
  readonly operatorRole: string;
  readonly snapshotDigest: string;
  readonly providerDigest: string | null;
  readonly preparedAt: string;
}
type JsonRow = Record<string, unknown>;
interface Snapshot { checkout: JsonRow; account: JsonRow | null; observation: JsonRow | null; }
interface Observed { snapshot: Snapshot; operatorRole: string; observedAt: string; }
type Facts = { payment: PaddleTransaction; subscription: PaddleSubscription | null } | null;
const requestKeys = ["tenantId", "environment", "intentKey", "action", "transactionId"];
const proposalKeys = [...requestKeys, "schemaVersion", "operatorRole", "snapshotDigest", "providerDigest", "preparedAt"];
function exact(value: unknown, keys: readonly string[]): JsonRow {
  const object = paddleRecord(value);
  if (Object.keys(object).length !== keys.length || keys.some(key => !Object.hasOwn(object, key))) throw new PaddleError("INVALID_REQUEST");
  return object;
}
function validateRequest(value: JsonRow): PaddleRecoveryRequest {
  if (!Number.isSafeInteger(value.tenantId) || Number(value.tenantId) <= 0 || !["sandbox", "production"].includes(String(value.environment)) ||
    typeof value.intentKey !== "string" || !/^paddle_checkout_v1_[a-f0-9]{64}$/.test(value.intentKey) ||
    !["bind-transaction", "close-absent", "resolve-review"].includes(String(value.action))) throw new PaddleError("INVALID_REQUEST");
  if (value.action === "close-absent") { if (value.transactionId !== null) throw new PaddleError("INVALID_REQUEST"); }
  else paddleId(value.transactionId, "txn");
  return { tenantId: Number(value.tenantId), environment: value.environment as PaddleEnvironment, intentKey: value.intentKey,
    action: value.action as PaddleRecoveryAction, transactionId: value.transactionId as string | null };
}
export function parsePaddleRecoveryProposal(value: unknown): PaddleRecoveryProposal {
  const row = exact(value, proposalKeys), request = validateRequest(row);
  if (row.schemaVersion !== 1 || typeof row.operatorRole !== "string" || row.operatorRole.length < 1 || row.operatorRole.length > 63 ||
    typeof row.snapshotDigest !== "string" || !/^[a-f0-9]{64}$/.test(row.snapshotDigest) ||
    (request.action === "close-absent" ? row.providerDigest !== null : typeof row.providerDigest !== "string" || !/^[a-f0-9]{64}$/.test(row.providerDigest)) ||
    typeof row.preparedAt !== "string" || !Number.isFinite(Date.parse(row.preparedAt)) || new Date(row.preparedAt).toISOString() !== row.preparedAt) throw new PaddleError("INVALID_REQUEST");
  return { ...request, schemaVersion: 1, operatorRole: row.operatorRole, snapshotDigest: row.snapshotDigest,
    providerDigest: row.providerDigest as string | null, preparedAt: row.preparedAt };
}
function plan(snapshot: Snapshot): PaddleCheckoutIntent {
  const c = snapshot.checkout;
  return { tenantId: Number(c.tenant_id), environment: c.environment as PaddleEnvironment, intentKey: String(c.intent_key),
    actorExternalUserId: String(c.actor_external_user_id), priceId: String(c.price_id), productId: String(c.product_id), checkoutBaseUrl: String(c.checkout_base_url) };
}
function eligible(request: PaddleRecoveryRequest, snapshot: Snapshot): void {
  const c = snapshot.checkout;
  if (request.action === "resolve-review") {
    if (c.state !== "completed" || c.transaction_id !== request.transactionId || snapshot.account?.needs_review !== true) throw new PaddleError("CONFLICT");
  } else if (c.state !== "unknown" || c.dispatch_sealed !== true || c.transaction_id !== null || snapshot.observation?.transaction_id) throw new PaddleError("CONFLICT");
}

// No public API registers this service. Its authority comes from the actual
// PostgreSQL login plus an expiring administrator-issued tenant/environment grant.
export function createPaddleOperatorRecovery(dependencies: {
  transactions: PostgresTransactionManager;
  provider: Pick<PaddleProvider, "getTransaction" | "getSubscription">;
}) {
  const transaction = <T>(body: (tx: PostgresQueryExecutor) => Promise<T>) => dependencies.transactions.transaction({ isolationLevel: "read-committed" }, body);
  async function authorize(tx: PostgresQueryExecutor, request: PaddleRecoveryRequest): Promise<void> {
    await tx.query("SELECT public.paddle_recovery_authorize_v1($1,$2)", [request.tenantId, request.environment]);
  }
  async function observe(tx: PostgresQueryExecutor, request: PaddleRecoveryRequest): Promise<Observed> {
    await tx.query(paddleTenantBarrier, [request.tenantId]);
    // Lock order agrees with the worker. JSON preserves provider microseconds.
    const c = (await tx.query<{ value: JsonRow }>("SELECT to_jsonb(c)||jsonb_build_object('reconcile_revision',c.reconcile_revision::text) AS value FROM paddle_checkout_intents c WHERE tenant_id=$1 AND environment=$2 AND intent_key=$3 FOR UPDATE", [request.tenantId, request.environment, request.intentKey])).rows[0];
    if (!c) throw new PaddleError("CONFLICT");
    const a = (await tx.query<{ value: JsonRow }>("SELECT to_jsonb(a)||jsonb_build_object('review_revision',a.review_revision::text) AS value FROM paddle_accounts a WHERE intent_key=$1 FOR UPDATE", [request.intentKey])).rows[0];
    const o = (await tx.query<{ value: JsonRow }>("SELECT to_jsonb(o) AS value FROM paddle_creation_observations o WHERE intent_key=$1", [request.intentKey])).rows[0];
    const clock = (await tx.query<{ actor: string; at: Date }>("SELECT session_user AS actor,clock_timestamp() AS at", [])).rows[0];
    return { snapshot: { checkout: c.value, account: a?.value ?? null, observation: o?.value ?? null }, operatorRole: clock.actor, observedAt: new Date(clock.at).toISOString() };
  }
  async function facts(request: PaddleRecoveryRequest, snapshot: Snapshot): Promise<Facts> {
    if (request.action === "close-absent") return null;
    const work = plan(snapshot), payment = await dependencies.provider.getTransaction(request.transactionId!, work);
    if (payment.id !== request.transactionId || payment.priceId !== work.priceId || payment.productId !== work.productId) throw new PaddleError("CONFLICT");
    const url = new URL(work.checkoutBaseUrl); url.searchParams.set("_ptxn", payment.id);
    if (payment.checkoutUrl !== null && payment.checkoutUrl !== url.href) throw new PaddleError("CONFLICT");
    if (request.action === "bind-transaction") {
      if (!["draft", "ready", "completed", "canceled"].includes(payment.status) ||
        (payment.status === "completed" ? !payment.customerId || !payment.subscriptionId : payment.subscriptionId !== null)) throw new PaddleError("CONFLICT");
      return { payment, subscription: null };
    }
    const a = snapshot.account!;
    if (payment.status !== "completed" || payment.customerId !== a.customer_id || payment.subscriptionId !== a.subscription_id) throw new PaddleError("CONFLICT");
    const subscription = await dependencies.provider.getSubscription(String(a.subscription_id), work);
    if (subscription.id !== a.subscription_id || subscription.customerId !== a.customer_id || subscription.priceId !== work.priceId || subscription.productId !== work.productId ||
      a.provider_status === "canceled" && subscription.status !== "canceled") throw new PaddleError("CONFLICT");
    return { payment, subscription };
  }
  return {
    async prepare(input: unknown): Promise<PaddleRecoveryProposal> {
      const request = validateRequest(exact(input, requestKeys));
      const current = await transaction(async tx => { await authorize(tx, request); return observe(tx, request); });
      eligible(request, current.snapshot);
      const projection = await facts(request, current.snapshot);
      return { ...request, schemaVersion: 1, operatorRole: current.operatorRole, snapshotDigest: paddleDigest(current.snapshot),
        providerDigest: projection === null ? null : paddleDigest(projection), preparedAt: current.observedAt };
    },
    async apply(input: unknown, evidenceDigest: string): Promise<{ outcome: "applied" | "replayed"; recoveryKey: string }> {
      const proposal = parsePaddleRecoveryProposal(input);
      if (typeof evidenceDigest !== "string" || !/^[a-f0-9]{64}$/.test(evidenceDigest)) throw new PaddleError("INVALID_REQUEST");
      const recoveryKey = `paddle_recovery_v1_${paddleDigest({ proposal, evidenceDigest })}`;
      async function replay(tx: PostgresQueryExecutor): Promise<boolean> {
        const prior = (await tx.query<{ operator_role: string }>("SELECT operator_role FROM paddle_operator_recoveries WHERE recovery_key=$1", [recoveryKey])).rows[0];
        return prior?.operator_role === proposal.operatorRole;
      }
      function assertCurrent(current: Observed): void {
        if (current.operatorRole !== proposal.operatorRole) throw new PaddleError("AUTHORIZATION_DENIED");
        const age = Date.parse(current.observedAt) - Date.parse(proposal.preparedAt);
        if (age < 0 || age > 300_000 || paddleDigest(current.snapshot) !== proposal.snapshotDigest) throw new PaddleError("CONFLICT");
        eligible(proposal, current.snapshot);
      }
      const initial = await transaction(async tx => {
        await authorize(tx, proposal);
        const current = await observe(tx, proposal);
        if (current.operatorRole !== proposal.operatorRole) throw new PaddleError("AUTHORIZATION_DENIED");
        if (await replay(tx)) return null;
        assertCurrent(current); return current;
      });
      if (initial === null) return { outcome: "replayed", recoveryKey };
      const projection = await facts(proposal, initial.snapshot);
      if ((projection === null ? null : paddleDigest(projection)) !== proposal.providerDigest) throw new PaddleError("CONFLICT");
      return transaction(async tx => {
        await authorize(tx, proposal);
        const current = await observe(tx, proposal);
        if (current.operatorRole !== proposal.operatorRole) throw new PaddleError("AUTHORIZATION_DENIED");
        if (await replay(tx)) return { outcome: "replayed", recoveryKey };
        assertCurrent(current);
        const subscription = projection?.subscription;
        await tx.query(`INSERT INTO paddle_operator_recoveries(recovery_key,tenant_id,environment,intent_key,action,evidence_digest,snapshot_digest,transaction_id,
          prior_review_revision,subscription_digest,subscription_updated_at,provider_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12)`,
        [recoveryKey, proposal.tenantId, proposal.environment, proposal.intentKey, proposal.action, evidenceDigest, proposal.snapshotDigest, proposal.transactionId,
          subscription ? String(current.snapshot.account!.review_revision) : null, subscription ? paddleDigest(subscription) : null, subscription?.updatedAt ?? null, proposal.providerDigest]);
        if (proposal.action === "close-absent") {
          await tx.query("INSERT INTO paddle_checkout_closures(intent_key,reason) VALUES($1,'support-confirmed-absent')", [proposal.intentKey]);
          await tx.query("UPDATE paddle_checkout_intents SET state='closed',error_code='SUPPORT_CONFIRMED_ABSENT',reconcile_revision=reconcile_revision+1,updated_at=clock_timestamp() WHERE intent_key=$1", [proposal.intentKey]);
        } else if (proposal.action === "bind-transaction") {
          const url = new URL(String(current.snapshot.checkout.checkout_base_url)); url.searchParams.set("_ptxn", proposal.transactionId!);
          await tx.query("UPDATE paddle_checkout_intents SET state='ready',transaction_id=$2,checkout_url=$3,error_code=NULL,reconcile_revision=reconcile_revision+1,next_reconcile_at=clock_timestamp(),updated_at=clock_timestamp() WHERE intent_key=$1", [proposal.intentKey, proposal.transactionId, url.href]);
        } else {
          if (!subscription) throw new PaddleError("CONFLICT");
          await tx.query(`UPDATE paddle_accounts SET provider_updated_at=$2::timestamptz,projection_digest=$3,provider_status=$4,period_starts_at=$5::timestamptz,period_ends_at=$6::timestamptz,
            scheduled_action=$7,scheduled_effective_at=$8::timestamptz,needs_review=FALSE,verified_at=clock_timestamp() WHERE intent_key=$1`,
          [proposal.intentKey, subscription.updatedAt, paddleDigest(subscription), subscription.status, subscription.startsAt, subscription.endsAt, subscription.scheduledChange?.action ?? null, subscription.scheduledChange?.effectiveAt ?? null]);
          await tx.query("UPDATE paddle_checkout_intents SET reconcile_revision=reconcile_revision+1,next_reconcile_at=clock_timestamp() WHERE intent_key=$1", [proposal.intentKey]);
        }
        return { outcome: "applied", recoveryKey };
      });
    },
  };
}
