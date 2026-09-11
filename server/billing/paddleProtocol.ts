import { createHash } from "node:crypto";

export type PaddleEnvironment = "sandbox" | "production";
export type PaddleFailureCode = "INVALID_REQUEST" | "INVALID_SIGNATURE" | "CONFIGURATION_REQUIRED" | "AUTHORIZATION_DENIED" | "CONFLICT" | "DEPENDENCY_UNAVAILABLE";
export class PaddleError extends Error {
  readonly code: PaddleFailureCode;
  constructor(code: PaddleFailureCode) { super("Paddle operation failed"); this.name = "PaddleError"; this.code = code; }
}
export function paddleRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PaddleError("INVALID_REQUEST");
  return value as Record<string, unknown>;
}
export function paddleId(value: unknown, prefix: "txn" | "ctm" | "sub" | "pri" | "pro" | "evt"): string {
  if (typeof value !== "string" || !new RegExp(`^${prefix}_[a-z0-9]{26}$`).test(value)) throw new PaddleError("INVALID_REQUEST");
  return value;
}
// Keep all six fractional digits: Date alone loses ordering within a millisecond.
export function paddleTimestamp(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value)) throw new PaddleError("INVALID_REQUEST");
  const [whole, fraction = ""] = value.slice(0, -1).split(".");
  const date = new Date(`${whole}.${fraction.padEnd(3, "0").slice(0, 3)}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== whole) throw new PaddleError("INVALID_REQUEST");
  return `${whole}.${fraction.padEnd(6, "0")}Z`;
}
export function paddleDigest(value: unknown): string {
  function canonical(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === "object") return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
    return input;
  }
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
export interface PaddlePlan { readonly environment: PaddleEnvironment; readonly priceId: string; readonly productId: string; readonly checkoutBaseUrl: string; }
export interface PaddleCheckoutIntent extends PaddlePlan {
  readonly intentKey: string; readonly tenantId: number; readonly actorExternalUserId: string;
}
export interface PaddleTransaction {
  readonly id: string; readonly status: "draft" | "ready" | "billed" | "paid" | "completed" | "canceled" | "past_due";
  readonly customerId: string | null; readonly subscriptionId: string | null; readonly updatedAt: string;
  readonly priceId: string; readonly productId: string; readonly checkoutUrl: string | null;
}
export interface PaddleSubscription {
  readonly id: string; readonly customerId: string;
  readonly status: "active" | "trialing" | "past_due" | "paused" | "canceled";
  readonly updatedAt: string; readonly startsAt: string | null; readonly endsAt: string | null;
  readonly priceId: string; readonly productId: string;
  readonly scheduledChange: Readonly<{ action: "cancel" | "pause" | "resume"; effectiveAt: string }> | null;
}
export interface PaddleNotice {
  readonly eventId: string; readonly eventType: string; readonly occurredAt: string;
  readonly entityId: string | null; readonly digest: string;
}
export interface PaddleCreationObservation {
  readonly requestId: string | null;
  readonly httpStatus: number;
  readonly transactionId: string | null;
  readonly responseDigest: string;
}
export interface PaddleProvider {
  createTransaction(intent: PaddleCheckoutIntent, authorize: () => Promise<boolean>, observe?: (observation: PaddleCreationObservation) => Promise<void>): Promise<PaddleTransaction>;
  getTransaction(id: string, plan: PaddlePlan): Promise<PaddleTransaction>;
  getSubscription(id: string, plan: PaddlePlan): Promise<PaddleSubscription>;
}
export function requirePaddleItems(value: unknown, plan: PaddlePlan): void {
  if (!Array.isArray(value) || value.length !== 1) throw new PaddleError("CONFLICT");
  const item = paddleRecord(value[0]), price = paddleRecord(item.price), cycle = paddleRecord(price.billing_cycle);
  if (item.quantity !== 1 || price.id !== plan.priceId || price.product_id !== plan.productId || price.trial_period !== null ||
      !["day", "week", "month", "year"].includes(String(cycle.interval)) || !Number.isSafeInteger(cycle.frequency) || Number(cycle.frequency) < 1) throw new PaddleError("CONFLICT");
}
export function parsePaddleTransaction(value: unknown, plan: PaddlePlan): PaddleTransaction {
  const data = paddleRecord(value); requirePaddleItems(data.items, plan);
  if (data.collection_mode !== "automatic" || !["draft", "ready", "billed", "paid", "completed", "canceled", "past_due"].includes(String(data.status))) throw new PaddleError("CONFLICT");
  const id = paddleId(data.id, "txn"); let checkoutUrl: string | null = null;
  if (data.checkout !== null && data.checkout !== undefined) {
    const checkout = paddleRecord(data.checkout);
    if (checkout.url !== null) {
      if (typeof checkout.url !== "string" || checkout.url.length > 2048) throw new PaddleError("CONFLICT");
      const expected = new URL(plan.checkoutBaseUrl); expected.searchParams.set("_ptxn", id);
      if (checkout.url !== expected.href) throw new PaddleError("CONFLICT");
      checkoutUrl = checkout.url;
    }
  }
  return { id, status: data.status as PaddleTransaction["status"], customerId: data.customer_id === null ? null : paddleId(data.customer_id, "ctm"),
    subscriptionId: data.subscription_id === null ? null : paddleId(data.subscription_id, "sub"), updatedAt: paddleTimestamp(data.updated_at),
    priceId: plan.priceId, productId: plan.productId, checkoutUrl };
}
export function parsePaddleSubscription(value: unknown, plan: PaddlePlan): PaddleSubscription {
  const data = paddleRecord(value); requirePaddleItems(data.items, plan);
  if (data.collection_mode !== "automatic" || !["active", "trialing", "past_due", "paused", "canceled"].includes(String(data.status))) throw new PaddleError("CONFLICT");
  let startsAt = null, endsAt = null;
  if (data.current_billing_period !== null) {
    const period = paddleRecord(data.current_billing_period);
    startsAt = paddleTimestamp(period.starts_at); endsAt = paddleTimestamp(period.ends_at);
    if (startsAt >= endsAt) throw new PaddleError("INVALID_REQUEST");
  }
  if (["active", "trialing", "past_due"].includes(String(data.status)) && endsAt === null) throw new PaddleError("INVALID_REQUEST");
  let scheduledChange: PaddleSubscription["scheduledChange"] = null;
  if (data.scheduled_change !== null) {
    const change = paddleRecord(data.scheduled_change);
    if (!["cancel", "pause", "resume"].includes(String(change.action))) throw new PaddleError("INVALID_REQUEST");
    scheduledChange = { action: change.action as "cancel" | "pause" | "resume", effectiveAt: paddleTimestamp(change.effective_at) };
  }
  return { id: paddleId(data.id, "sub"), customerId: paddleId(data.customer_id, "ctm"), status: data.status as PaddleSubscription["status"],
    updatedAt: paddleTimestamp(data.updated_at), startsAt, endsAt, priceId: plan.priceId, productId: plan.productId, scheduledChange };
}
