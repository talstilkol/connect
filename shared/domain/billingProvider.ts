export const billingProviderEventTypes = [
  "subscription-activated",
  "subscription-renewed",
  "subscription-cancelled",
  "subscription-expired",
  "payment-failed",
] as const;

export type BillingProviderEventType =
  (typeof billingProviderEventTypes)[number];

interface BillingProviderEventBase {
  providerKey: string;
  providerEventId: string;
  providerCustomerReference: string;
  providerSubscriptionReference: string;
  occurredAt: string;
}

export interface BillingSubscriptionPeriodEvent
  extends BillingProviderEventBase {
  type:
    | "subscription-activated"
    | "subscription-renewed";
  periodStartAt: string;
  periodEndAt: string;
}

export interface BillingSubscriptionEffectiveEvent
  extends BillingProviderEventBase {
  type:
    | "subscription-cancelled"
    | "subscription-expired"
    | "payment-failed";
  effectiveAt: string;
}

export type BillingProviderEvent =
  | BillingSubscriptionPeriodEvent
  | BillingSubscriptionEffectiveEvent;
