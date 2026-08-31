import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveRailwayApiDeterministicIdempotencyKey,
  deriveRailwayApiMutationRequestDigest,
  RAILWAY_API_DETERMINISTIC_IDEMPOTENCY_KEY_PREFIX,
  RAILWAY_API_MUTATION_REQUEST_DIGEST_PREFIX,
} from "../server/platform/railwayApiMutationExecutor.ts";

test("derives the same mutation digest for equivalent object key order", async () => {
  const first = await deriveRailwayApiMutationRequestDigest(
    "contacts.save",
    {
      phoneNumber: "+972501234567",
      firstName: "Tal",
      company: "Connect",
    },
  );
  const reordered = await deriveRailwayApiMutationRequestDigest(
    "contacts.save",
    {
      company: "Connect",
      firstName: "Tal",
      phoneNumber: "+972501234567",
    },
  );

  assert.equal(first, reordered);
  assert.match(
    first,
    new RegExp(
      `^${RAILWAY_API_MUTATION_REQUEST_DIGEST_PREFIX}[0-9a-f]{64}$`,
    ),
  );
});

test("binds the mutation digest to operation and normalized payload", async () => {
  const original = await deriveRailwayApiMutationRequestDigest(
    "contacts.save",
    { phoneNumber: "+972501234567" },
  );
  const changedPayload = await deriveRailwayApiMutationRequestDigest(
    "contacts.save",
    { phoneNumber: "+972501234568" },
  );
  const changedOperation = await deriveRailwayApiMutationRequestDigest(
    "contacts.update",
    { phoneNumber: "+972501234567" },
  );

  assert.notEqual(original, changedPayload);
  assert.notEqual(original, changedOperation);
});

test("derives a deterministic idempotency key from the canonical request", async () => {
  const first = await deriveRailwayApiDeterministicIdempotencyKey(
    "system-admin.business-profile.update",
    {
      targetTenantId: 7,
      expectedVersion: 1,
      businessName: "Connect",
    },
  );
  const reordered = await deriveRailwayApiDeterministicIdempotencyKey(
    "system-admin.business-profile.update",
    {
      businessName: "Connect",
      expectedVersion: 1,
      targetTenantId: 7,
    },
  );
  const changed = await deriveRailwayApiDeterministicIdempotencyKey(
    "system-admin.business-profile.update",
    {
      targetTenantId: 7,
      expectedVersion: 2,
      businessName: "Connect",
    },
  );

  assert.equal(first, reordered);
  assert.notEqual(first, changed);
  assert.match(
    first,
    new RegExp(
      `^${RAILWAY_API_DETERMINISTIC_IDEMPOTENCY_KEY_PREFIX}[0-9a-f]{64}$`,
    ),
  );
});

test("rejects invalid mutation digest input and missing crypto", async () => {
  await assert.rejects(
    deriveRailwayApiMutationRequestDigest("", {}),
    /request is invalid/,
  );
  await assert.rejects(
    deriveRailwayApiMutationRequestDigest(
      "contacts.save",
      {},
      {},
    ),
    /digest is unavailable/,
  );
});
