export const paidAccessReasons = ["manual-pilot", "paid-active", "tenant-inactive", "payment-pending", "review-required", "subscription-inactive", "period-inactive", "scheduled-stop", "verification-stale"] as const;
export interface PaddleBillingView {
  readonly environment: "sandbox" | "production";
  readonly clientToken: string;
  readonly canManage: boolean;
  readonly paidAccessReason: typeof paidAccessReasons[number];
  readonly checkout: Readonly<{ state: "queued" | "creating" | "unknown" | "ready" | "rejected" | "completed"; transactionId: string | null; url: string | null }> | null;
  readonly subscription: Readonly<{ status: "active" | "trialing" | "past_due" | "paused" | "canceled"; endsAt: string | null; needsReview: boolean }> | null;
}
export type PaddleBillingResult = Readonly<{ status: "ready"; billing: PaddleBillingView }> | Readonly<{ status: "configuration-required" | "permission-denied" | "server-error" | "unauthenticated" }>;
export function parsePaddleBillingView(value: unknown): PaddleBillingView | null {
  const record = (input: unknown): input is Record<string, unknown> => !!input && typeof input === "object" && !Array.isArray(input);
  const exact = (input: Record<string, unknown>, keys: string[]) => Object.keys(input).sort().join(",") === keys.sort().join(",");
  if (!record(value) || !exact(value, ["environment", "clientToken", "canManage", "checkout", "subscription", "paidAccessReason"]) ||
    !paidAccessReasons.includes(value.paidAccessReason as typeof paidAccessReasons[number]) ||
    !["sandbox", "production"].includes(String(value.environment)) || typeof value.canManage !== "boolean" ||
    typeof value.clientToken !== "string" || !new RegExp(`^${value.environment === "sandbox" ? "test" : "live"}_[a-zA-Z0-9]{27}$`).test(value.clientToken)) return null;
  const checkout = value.checkout;
  if (checkout !== null) {
    if (!record(checkout) || !exact(checkout, ["state", "transactionId", "url"]) || !["queued", "creating", "unknown", "ready", "rejected", "completed"].includes(String(checkout.state))) return null;
    if (checkout.state !== "ready" || !value.canManage) { if (checkout.transactionId !== null || checkout.url !== null) return null; }
    else {
      if (typeof checkout.transactionId !== "string" || !/^txn_[a-z0-9]{26}$/.test(checkout.transactionId) || typeof checkout.url !== "string" || checkout.url.length > 2048) return null;
      try { const url = new URL(checkout.url); if (url.protocol !== "https:" || url.username || url.password || url.hash || [...url.searchParams.keys()].join(",") !== "_ptxn" || url.searchParams.get("_ptxn") !== checkout.transactionId) return null; } catch { return null; }
    }
  }
  const subscription = value.subscription;
  if (subscription !== null && (!record(subscription) || !exact(subscription, ["status", "endsAt", "needsReview"]) ||
    !["active", "trialing", "past_due", "paused", "canceled"].includes(String(subscription.status)) || typeof subscription.needsReview !== "boolean" ||
    !(subscription.endsAt === null || typeof subscription.endsAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(subscription.endsAt) && Number.isFinite(Date.parse(subscription.endsAt))))) return null;
  return value as unknown as PaddleBillingView;
}
