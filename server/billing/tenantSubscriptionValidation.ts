import {
  tenantSubscriptionStatuses,
  type ManualSubscriptionInitialStatus,
  type ManualSubscriptionOperationalStatus,
  type TenantSubscriptionStatus,
} from "../../shared/domain/tenantSubscription.ts";

const CANONICAL_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function requirePositiveTenantId(
  tenantId: number,
): number {
  if (
    !Number.isSafeInteger(tenantId) ||
    tenantId <= 0
  ) {
    throw new Error(
      "tenantId must be a positive safe integer",
    );
  }

  return tenantId;
}

export function requirePositiveVersion(
  version: number,
): number {
  if (
    !Number.isSafeInteger(version) ||
    version <= 0
  ) {
    throw new Error(
      "subscription version is invalid",
    );
  }

  return version;
}

export function requireCanonicalTimestamp(
  value: string,
): string {
  if (
    typeof value !== "string" ||
    !CANONICAL_TIMESTAMP_PATTERN.test(
      value,
    )
  ) {
    throw new Error(
      "subscription timestamp is invalid",
    );
  }

  const milliseconds = Date.parse(value);

  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !==
      value
  ) {
    throw new Error(
      "subscription timestamp is invalid",
    );
  }

  return value;
}

export function requireSubscriptionWindow(
  startsAt: string,
  endsAt: string,
): {
  startsAt: string;
  endsAt: string;
} {
  const normalizedStartsAt =
    requireCanonicalTimestamp(startsAt);
  const normalizedEndsAt =
    requireCanonicalTimestamp(endsAt);

  if (
    Date.parse(normalizedStartsAt) >=
    Date.parse(normalizedEndsAt)
  ) {
    throw new Error(
      "subscription window is invalid",
    );
  }

  return {
    startsAt: normalizedStartsAt,
    endsAt: normalizedEndsAt,
  };
}

export function requireActorExternalUserId(
  actorExternalUserId: string,
): string {
  if (
    typeof actorExternalUserId !==
      "string" ||
    actorExternalUserId.trim().length ===
      0 ||
    actorExternalUserId.trim().length >
      255
  ) {
    throw new Error(
      "subscription actor is invalid",
    );
  }

  return actorExternalUserId.trim();
}

export function isSubscriptionStatus(
  value: string,
): value is TenantSubscriptionStatus {
  return tenantSubscriptionStatuses.some(
    (status) => status === value,
  );
}

export function requireManualInitialStatus(
  value: string,
): ManualSubscriptionInitialStatus {
  if (
    value !== "trial" &&
    value !== "active"
  ) {
    throw new Error(
      "manual subscription initial status is invalid",
    );
  }

  return value;
}

export function requireManualOperationalStatus(
  value: string,
): ManualSubscriptionOperationalStatus {
  if (
    value !== "active" &&
    value !== "suspended" &&
    value !== "blocked"
  ) {
    throw new Error(
      "manual subscription status is invalid",
    );
  }

  return value;
}

export function canExtendSubscription(
  status: TenantSubscriptionStatus,
): boolean {
  return (
    status === "trial" ||
    status === "active" ||
    status === "suspended" ||
    status === "blocked"
  );
}

export function canChangeManualStatus(
  fromStatus: TenantSubscriptionStatus,
  toStatus: ManualSubscriptionOperationalStatus,
): boolean {
  if (fromStatus === toStatus) {
    return true;
  }

  if (
    fromStatus === "cancelled" ||
    fromStatus === "expired" ||
    fromStatus === "payment_failed"
  ) {
    return false;
  }

  return true;
}

export function canCancelSubscription(
  status: TenantSubscriptionStatus,
): boolean {
  return (
    status !== "cancelled" &&
    status !== "expired"
  );
}
