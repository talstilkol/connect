import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createRailwayApiFailureEnvelope,
  createRailwayApiSuccessEnvelope,
  parseRailwayApiRequestEnvelope,
  parseRailwayApiResponseEnvelope,
  RAILWAY_API_CONTRACT_VERSION,
  RailwayApiContractError,
} from "../server/platform/railwayApiContract.ts";

const mutationKey = `connect_idempotency_v1_${"a".repeat(64)}`;

function queryEnvelope(payload = {}) {
  return {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    operation: "contacts.list",
    requestKind: "query",
    idempotencyKey: null,
    payload,
  };
}

test("normalizes one exact query envelope without accepting caller identities", () => {
  const source = queryEnvelope({
    search: "contact",
    filter: {
      mailingStatus: "subscribed",
    },
  });
  const result = parseRailwayApiRequestEnvelope(source);

  assert.deepEqual(result, source);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.payload));
  assert.ok(Object.isFrozen(result.payload.filter));
});

test("requires a deterministic idempotency key only for mutations", () => {
  const mutation = parseRailwayApiRequestEnvelope({
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    operation: "campaigns.activate",
    requestKind: "mutation",
    idempotencyKey: mutationKey,
    payload: {
      campaignKey: "campaign_key_v1_123",
      expectedVersion: 4,
    },
  });

  assert.equal(mutation.idempotencyKey, mutationKey);

  for (const invalid of [
    { ...queryEnvelope(), idempotencyKey: mutationKey },
    {
      ...queryEnvelope(),
      requestKind: "mutation",
      idempotencyKey: null,
    },
    {
      ...queryEnvelope(),
      requestKind: "mutation",
      idempotencyKey: "caller-chosen-key",
    },
  ]) {
    assert.throws(
      () => parseRailwayApiRequestEnvelope(invalid),
      RailwayApiContractError,
    );
  }
});

test("rejects unknown envelope fields and unsafe operation names", () => {
  for (const invalid of [
    { ...queryEnvelope(), tenant: 7 },
    { ...queryEnvelope(), contractVersion: "v2" },
    { ...queryEnvelope(), operation: "contacts" },
    { ...queryEnvelope(), operation: "Contacts.List" },
    { ...queryEnvelope(), operation: "contacts/list" },
    { ...queryEnvelope(), requestKind: "command" },
  ]) {
    assert.throws(
      () => parseRailwayApiRequestEnvelope(invalid),
      RailwayApiContractError,
    );
  }
});

test("rejects tenant, identity, credential, and prototype fields at every depth", () => {
  for (const payload of [
    { tenantId: 7 },
    { nested: { external_user_id: "user" } },
    { nested: [{ accessToken: "not-a-token" }] },
    { nested: { databaseURL: "not-a-url" } },
    { nested: { session_id: "session" } },
    { nested: { WABA_ID: "waba" } },
    JSON.parse('{"__proto__":{"polluted":true}}'),
  ]) {
    assert.throws(
      () => parseRailwayApiRequestEnvelope(queryEnvelope(payload)),
      RailwayApiContractError,
    );
  }

  assert.equal({}.polluted, undefined);
});

test("rejects non-JSON, cyclic, oversized, and deeply nested payloads", () => {
  const cyclic = {};
  cyclic.self = cyclic;
  const symbolKeyed = { value: "accepted" };
  symbolKeyed[Symbol("hidden")] = "hidden";
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() {
      throw new Error("getter must not execute");
    },
  });
  let deeplyNested = {};

  for (let depth = 0; depth < 14; depth += 1) {
    deeplyNested = { value: deeplyNested };
  }

  for (const payload of [
    { value: undefined },
    { value: Number.POSITIVE_INFINITY },
    { value: new Date("2026-08-17T00:00:00Z") },
    { value: "x".repeat(16_385) },
    { value: new Array(1_001).fill(null) },
    { value: new Array(1) },
    symbolKeyed,
    accessor,
    cyclic,
    deeplyNested,
  ]) {
    assert.throws(
      () => parseRailwayApiRequestEnvelope(queryEnvelope(payload)),
      RailwayApiContractError,
    );
  }
});

test("creates and parses only bounded response envelopes", () => {
  const success = createRailwayApiSuccessEnvelope({
    items: [{ key: "contact_key_v1_123" }],
  });
  const failure = createRailwayApiFailureEnvelope("CONFLICT");

  assert.deepEqual(parseRailwayApiResponseEnvelope(success), success);
  assert.deepEqual(parseRailwayApiResponseEnvelope(failure), failure);

  for (const invalid of [
    { ...success, extra: true },
    { ...failure, code: "PRIVATE_INTERNAL_FAILURE" },
    createRailwayApiSuccessEnvelope({ value: "accepted" }),
  ]) {
    if (invalid === success || invalid === failure) {
      continue;
    }

    if (invalid.outcome === "ok" && invalid.data.value === "accepted") {
      assert.deepEqual(
        parseRailwayApiResponseEnvelope(invalid),
        invalid,
      );
      continue;
    }

    assert.throws(
      () => parseRailwayApiResponseEnvelope(invalid),
      RailwayApiContractError,
    );
  }

  assert.throws(
    () => createRailwayApiSuccessEnvelope({ tenantId: 7 }),
    RailwayApiContractError,
  );
});

test("normalizes negative zero without changing serialized meaning", () => {
  const result = parseRailwayApiRequestEnvelope(
    queryEnvelope({ offset: -0 }),
  );

  assert.equal(result.payload.offset, 0);
  assert.equal(Object.is(result.payload.offset, -0), false);
});

test("keeps the service contract deterministic and randomness-free", () => {
  const source = readFileSync(
    new URL(
      "../server/platform/railwayApiContract.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(source, /\bMath\.random\s*\(/);
  assert.doesNotMatch(source, /\bcrypto\.randomUUID\s*\(/);
  assert.doesNotMatch(source, /\bDate\.now\s*\(/);
});
