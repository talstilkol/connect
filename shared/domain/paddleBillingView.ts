import { isPaddleCustomerPortalUrl, isPaddleCheckoutAttempt } from "./paddleCustomerPortal.ts";
export const paidAccessReasons = ["manual-pilot", "paid-active", "tenant-inactive", "payment-pending", "review-required", "subscription-inactive", "period-inactive", "scheduled-stop", "verification-stale"] as const;
export interface PaddleBillingView {
  readonly environment: "sandbox" | "production";
  readonly clientToken: string;
  readonly customerPortalUrl: string;
  readonly canManage: boolean;
  readonly attempt: number;
  readonly canCreateCheckout: boolean;
  readonly paidAccessReason: typeof paidAccessReasons[number];
  readonly checkout: Readonly<{ state: "queued" | "creating" | "unknown" | "ready" | "rejected" | "completed" | "closed"; transactionId: string | null; url: string | null }> | null;
  readonly subscription: Readonly<{ id: string; status: "active" | "trialing" | "past_due" | "paused" | "canceled"; endsAt: string | null; needsReview: boolean; scheduledChange: Readonly<{ action: "cancel" | "pause" | "resume"; effectiveAt: string }> | null }> | null;
}
export type PaddleBillingResult = Readonly<{ status: "ready"; billing: PaddleBillingView }> | Readonly<{ status: "configuration-required" | "permission-denied" | "server-error" | "unauthenticated" }>;
export function parsePaddleBillingView(value: unknown): PaddleBillingView | null {
  const record = (input: unknown): input is Record<string, unknown> => !!input && typeof input === "object" && !Array.isArray(input);
  const exact = (input: Record<string, unknown>, keys: string[]) => Object.keys(input).sort().join(",") === keys.sort().join(",");
  const timestamp = (input: unknown) => typeof input === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input) && Number.isFinite(Date.parse(input)) && new Date(input).toISOString() === input;
  if (!record(value) || !exact(value, ["environment", "clientToken", "customerPortalUrl", "canManage", "checkout", "subscription", "paidAccessReason", "attempt", "canCreateCheckout"]) ||
    !paidAccessReasons.includes(value.paidAccessReason as typeof paidAccessReasons[number]) ||
    !["sandbox", "production"].includes(String(value.environment)) || typeof value.canManage !== "boolean" ||
    !isPaddleCustomerPortalUrl(value.customerPortalUrl, value.environment) || !isPaddleCheckoutAttempt(value.attempt) ||
    typeof value.canCreateCheckout !== "boolean" || value.canCreateCheckout && !value.canManage ||
    typeof value.clientToken !== "string" || !new RegExp(`^${value.environment === "sandbox" ? "test" : "live"}_[a-zA-Z0-9]{27}$`).test(value.clientToken)) return null;
  const checkout = value.checkout;
  if ((checkout === null) !== (value.attempt === 0)) return null;
  if (checkout !== null) {
    if (!record(checkout) || !exact(checkout, ["state", "transactionId", "url"]) || !["queued", "creating", "unknown", "ready", "rejected", "completed", "closed"].includes(String(checkout.state))) return null;
    if (checkout.state !== "ready" || !value.canManage) { if (checkout.transactionId !== null || checkout.url !== null) return null; }
    else {
      if (typeof checkout.transactionId !== "string" || !/^txn_[a-z0-9]{26}$/.test(checkout.transactionId) || typeof checkout.url !== "string" || checkout.url.length > 2048) return null;
      try { const url = new URL(checkout.url); if (url.protocol !== "https:" || url.username || url.password || url.hash || [...url.searchParams.keys()].join(",") !== "_ptxn" || url.searchParams.get("_ptxn") !== checkout.transactionId) return null; } catch { return null; }
    }
  }
  const subscription = value.subscription;
  if (subscription !== null) {
    if (!record(subscription) || !record(checkout) || checkout.state !== "completed" || !exact(subscription, ["id", "status", "endsAt", "needsReview", "scheduledChange"]) ||
      typeof subscription.id !== "string" || !/^sub_[a-z0-9]{26}$/.test(subscription.id) ||
      !["active", "trialing", "past_due", "paused", "canceled"].includes(String(subscription.status)) || typeof subscription.needsReview !== "boolean" ||
      !(subscription.endsAt === null || timestamp(subscription.endsAt))) return null;
    const scheduled = subscription.scheduledChange;
    if (scheduled !== null && (!record(scheduled) || !exact(scheduled, ["action", "effectiveAt"]) || !["cancel", "pause", "resume"].includes(String(scheduled.action)) || !timestamp(scheduled.effectiveAt))) return null;
  }
  if (value.canCreateCheckout && checkout !== null && (checkout as Record<string, unknown>).state !== "closed" && (!record(subscription) || subscription.status !== "canceled" || subscription.needsReview)) return null;
  return value as unknown as PaddleBillingView;
}
