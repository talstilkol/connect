import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveTenantSubscriptionEventKey,
} from "../server/billing/tenantSubscriptionKey.ts";

const identity = {
  eventType: "extended",
  expectedVersion: 2,
  toStatus: "active",
  newEndsAt:
    "2026-12-31T23:59:59.000Z",
  actorExternalUserId:
    "system-admin-external-id",
};

test("derives a deterministic tenant-scoped subscription event identity", async () => {
  const first =
    await deriveTenantSubscriptionEventKey(
      7,
      identity,
    );
  const repeated =
    await deriveTenantSubscriptionEventKey(
      7,
      { ...identity },
    );
  const anotherTenant =
    await deriveTenantSubscriptionEventKey(
      8,
      identity,
    );

  assert.match(
    first,
    /^tenant_subscription_event_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, repeated);
  assert.notEqual(first, anotherTenant);
});

test("separates subscription operations and expected versions", async () => {
  const extended =
    await deriveTenantSubscriptionEventKey(
      7,
      identity,
    );
  const cancelled =
    await deriveTenantSubscriptionEventKey(
      7,
      {
        ...identity,
        eventType: "cancelled",
        toStatus: "cancelled",
      },
    );
  const nextVersion =
    await deriveTenantSubscriptionEventKey(
      7,
      {
        ...identity,
        expectedVersion: 3,
      },
    );

  assert.notEqual(extended, cancelled);
  assert.notEqual(extended, nextVersion);
});

test("rejects invalid subscription event identity before hashing", async () => {
  await assert.rejects(
    deriveTenantSubscriptionEventKey(
      0,
      identity,
    ),
    /tenantId/,
  );
  await assert.rejects(
    deriveTenantSubscriptionEventKey(
      7,
      {
        ...identity,
        eventType: "unsupported",
      },
    ),
    /event type/,
  );
  await assert.rejects(
    deriveTenantSubscriptionEventKey(
      7,
      {
        ...identity,
        toStatus: "unknown",
      },
    ),
    /target status/,
  );
  await assert.rejects(
    deriveTenantSubscriptionEventKey(
      7,
      {
        ...identity,
        newEndsAt: "2026-12-31",
      },
    ),
    /timestamp/,
  );
});
