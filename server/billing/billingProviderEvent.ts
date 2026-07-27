import {
  billingProviderEventTypes,
  type BillingProviderEvent,
  type BillingProviderEventType,
} from "../../shared/domain/billingProvider.ts";
import {
  requireCanonicalTimestamp,
  requireSubscriptionWindow,
} from "./tenantSubscriptionValidation.ts";

const PROVIDER_KEY_PATTERN =
  /^[a-z][a-z0-9_-]{1,63}$/;
const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u001f\u007f]/;
const BASE_FIELDS = [
  "type",
  "providerKey",
  "providerEventId",
  "providerCustomerReference",
  "providerSubscriptionReference",
  "occurredAt",
] as const;
const PERIOD_FIELDS = [
  ...BASE_FIELDS,
  "periodStartAt",
  "periodEndAt",
] as const;
const EFFECTIVE_FIELDS = [
  ...BASE_FIELDS,
  "effectiveAt",
] as const;

export class BillingProviderEventError extends Error {
  constructor() {
    super("Billing provider event is invalid");
    this.name = "BillingProviderEventError";
  }
}

function invalidEvent(): never {
  throw new BillingProviderEventError();
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) ===
      Object.prototype
  );
}

function hasExactFields(
  value: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  const keys = Object.keys(value);

  return (
    keys.length === fields.length &&
    keys.every((key) => fields.includes(key))
  );
}

function requireBoundedReference(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 255 ||
    value.trim() !== value ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    return invalidEvent();
  }

  return value;
}

function requireProviderKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !PROVIDER_KEY_PATTERN.test(value)
  ) {
    return invalidEvent();
  }

  return value;
}

function requireEventType(
  value: unknown,
): BillingProviderEventType {
  if (
    typeof value !== "string" ||
    !billingProviderEventTypes.some(
      (type) => type === value,
    )
  ) {
    return invalidEvent();
  }

  return value as BillingProviderEventType;
}

function timestamp(value: unknown): string {
  if (typeof value !== "string") {
    return invalidEvent();
  }

  try {
    return requireCanonicalTimestamp(value);
  } catch {
    return invalidEvent();
  }
}

export function parseBillingProviderEvent(
  value: unknown,
): BillingProviderEvent {
  if (!isRecord(value)) {
    return invalidEvent();
  }

  const type = requireEventType(value.type);
  const providerKey =
    requireProviderKey(value.providerKey);
  const providerEventId =
    requireBoundedReference(
      value.providerEventId,
    );
  const providerCustomerReference =
    requireBoundedReference(
      value.providerCustomerReference,
    );
  const providerSubscriptionReference =
    requireBoundedReference(
      value.providerSubscriptionReference,
    );
  const occurredAt = timestamp(
    value.occurredAt,
  );

  if (
    type === "subscription-activated" ||
    type === "subscription-renewed"
  ) {
    if (!hasExactFields(value, PERIOD_FIELDS)) {
      return invalidEvent();
    }

    try {
      const period = requireSubscriptionWindow(
        timestamp(value.periodStartAt),
        timestamp(value.periodEndAt),
      );

      return {
        type,
        providerKey,
        providerEventId,
        providerCustomerReference,
        providerSubscriptionReference,
        occurredAt,
        periodStartAt: period.startsAt,
        periodEndAt: period.endsAt,
      };
    } catch {
      return invalidEvent();
    }
  }

  if (!hasExactFields(value, EFFECTIVE_FIELDS)) {
    return invalidEvent();
  }

  return {
    type,
    providerKey,
    providerEventId,
    providerCustomerReference,
    providerSubscriptionReference,
    occurredAt,
    effectiveAt: timestamp(
      value.effectiveAt,
    ),
  };
}
