import assert from "node:assert/strict";
import test from "node:test";
import {
  assertExactKeys,
  assertRfc3339,
  assertSafeRelativePath,
  canonicalJson,
  createEnvelope,
  domainDigest,
  verifyEnvelope,
} from "../scripts/planning-discovery-cutoff-lib.mjs";

test("canonical JSON sorts object keys and preserves array order", () => {
  assert.equal(
    canonicalJson({
      z: [3, 2, 1],
      a: { d: true, b: null },
    }),
    '{"a":{"b":null,"d":true},"z":[3,2,1]}',
  );
});

test("domain-separated envelope detects a payload mutation", () => {
  const envelope = createEnvelope({
    schema: "TEST-ENVELOPE-V1",
    domain: "CONNECT.TEST-ENVELOPE.V1",
    payload: {
      owner: "Tal",
      state: "CANDIDATE",
    },
  });
  assert.equal(
    verifyEnvelope({
      envelope,
      schema: "TEST-ENVELOPE-V1",
      domain: "CONNECT.TEST-ENVELOPE.V1",
    }),
    true,
  );

  const mutation = structuredClone(envelope);
  mutation.payload.state = "CHANGED";
  assert.throws(() =>
    verifyEnvelope({
      envelope: mutation,
      schema: "TEST-ENVELOPE-V1",
      domain: "CONNECT.TEST-ENVELOPE.V1",
    }),
  );
});

test("digest domains prevent cross-protocol reuse", () => {
  const payload = { owner: "Tal" };
  assert.notEqual(
    domainDigest(
      "CONNECT.DOMAIN-A.V1",
      payload,
    ),
    domainDigest(
      "CONNECT.DOMAIN-B.V1",
      payload,
    ),
  );
});

test("output paths must remain repository relative", () => {
  assert.equal(
    assertSafeRelativePath(
      "docs/planning/output.json",
    ),
    "docs/planning/output.json",
  );
  for (const unsafePath of [
    "../outside",
    "/absolute/outside",
    "file:outside",
    "docs\\outside",
  ]) {
    assert.throws(() =>
      assertSafeRelativePath(unsafePath),
    );
  }
});

test("closed key sets reject unknown fields", () => {
  assert.doesNotThrow(() =>
    assertExactKeys(
      { owner: "Tal", state: "ACTIVE" },
      ["owner", "state"],
      "test value",
    ),
  );
  assert.throws(() =>
    assertExactKeys(
      {
        owner: "Tal",
        state: "ACTIVE",
        unexpected: true,
      },
      ["owner", "state"],
      "test value",
    ),
  );
});

test("observation time must be explicit UTC RFC3339", () => {
  assert.equal(
    assertRfc3339(
      "2026-08-30T18:30:00Z",
      "observedAt",
    ),
    "2026-08-30T18:30:00Z",
  );
  for (const invalidTime of [
    "2026-08-30",
    "2026-08-30T18:30:00+03:00",
    "not-a-time",
  ]) {
    assert.throws(() =>
      assertRfc3339(
        invalidTime,
        "observedAt",
      ),
    );
  }
});
