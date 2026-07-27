import assert from "node:assert/strict";
import test from "node:test";

import {
  BillingProviderEventError,
  parseBillingProviderEvent,
} from "../server/billing/billingProviderEvent.ts";

function periodEvent(overrides = {}) {
  return {
    type: "subscription-renewed",
    providerKey: "configured_provider",
    providerEventId: "event-2026-07-26-001",
    providerCustomerReference: "customer-reference",
    providerSubscriptionReference:
      "subscription-reference",
    occurredAt: "2026-07-26T09:00:00.000Z",
    periodStartAt:
      "2026-07-26T00:00:00.000Z",
    periodEndAt:
      "2026-08-26T00:00:00.000Z",
    ...overrides,
  };
}

test("parses a normalized subscription period event into a detached value", () => {
  const source = periodEvent();
  const parsed =
    parseBillingProviderEvent(source);

  assert.deepEqual(parsed, source);
  assert.notEqual(parsed, source);
});

test("parses factual effective events without inferring subscription policy", () => {
  const parsed =
    parseBillingProviderEvent({
      type: "payment-failed",
      providerKey: "configured_provider",
      providerEventId:
        "event-2026-07-26-002",
      providerCustomerReference:
        "customer-reference",
      providerSubscriptionReference:
        "subscription-reference",
      occurredAt:
        "2026-07-26T09:00:00.000Z",
      effectiveAt:
        "2026-07-26T09:00:00.000Z",
    });

  assert.equal(parsed.type, "payment-failed");
  assert.equal(
    parsed.effectiveAt,
    "2026-07-26T09:00:00.000Z",
  );
  assert.equal(
    Object.hasOwn(parsed, "periodEndAt"),
    false,
  );
});

test("rejects unknown fields such as a client supplied tenantId", () => {
  assert.throws(
    () =>
      parseBillingProviderEvent(
        periodEvent({ tenantId: 7 }),
      ),
    BillingProviderEventError,
  );
});

test("rejects a non-canonical timestamp and an invalid period", () => {
  assert.throws(
    () =>
      parseBillingProviderEvent(
        periodEvent({
          occurredAt:
            "2026-07-26T09:00:00Z",
        }),
      ),
    BillingProviderEventError,
  );
  assert.throws(
    () =>
      parseBillingProviderEvent(
        periodEvent({
          periodEndAt:
            "2026-07-26T00:00:00.000Z",
        }),
      ),
    BillingProviderEventError,
  );
});

test("rejects identifiers with whitespace or control characters", () => {
  assert.throws(
    () =>
      parseBillingProviderEvent(
        periodEvent({
          providerEventId: " event-id",
        }),
      ),
    BillingProviderEventError,
  );
  assert.throws(
    () =>
      parseBillingProviderEvent(
        periodEvent({
          providerCustomerReference:
            "customer\nreference",
        }),
      ),
    BillingProviderEventError,
  );
});
