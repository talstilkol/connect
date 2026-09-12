/** Public buyer sign-in only: never accept a customer session token or deep link. */
export function isPaddleCustomerPortalUrl(value: unknown, environment: unknown): value is string {
  if (typeof value !== "string" || !["sandbox", "production"].includes(String(environment))) return false;
  const host = environment === "sandbox" ? "sandbox-customer-portal.paddle.com" : "customer-portal.paddle.com";
  return new RegExp(`^https://${host.replaceAll(".", "\\.")}/cpl_[a-z0-9]{26}$`).test(value);
}
export function isPaddleCheckoutAttempt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 2147483647;
}
