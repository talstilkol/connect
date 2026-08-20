import assert from "node:assert/strict";
import test from "node:test";

import {
  validateContactConsentTransition,
} from "../shared/validation/contactConsent.ts";

test("normalizes an explicit consent transition", () => {
  assert.deepEqual(
    validateContactConsentTransition({
      source: "  signed-form  ",
      occurredAt: "2026-07-25T12:34:56+03:00",
      evidenceReference: "  evidence-reference  ",
    }),
    {
      success: true,
      value: {
        source: "signed-form",
        occurredAt: "2026-07-25T09:34:56.000Z",
        evidenceReference: "evidence-reference",
      },
      issues: [],
    },
  );
});

test("requires a real source and timestamp", () => {
  const result = validateContactConsentTransition({
    source: " ",
    occurredAt: "not-a-date",
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    { field: "source", code: "required" },
    { field: "occurredAt", code: "unsupported" },
  ]);
});

test("rejects oversized or controlled consent evidence before persistence", () => {
  const result = validateContactConsentTransition({
    source: `source-${"a".repeat(250)}`,
    occurredAt: "2026-07-25T09:34:56.000Z",
    evidenceReference: "evidence\nreference",
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    { field: "source", code: "unsupported" },
    { field: "evidenceReference", code: "unsupported" },
  ]);
});
