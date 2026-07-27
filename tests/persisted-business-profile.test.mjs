import assert from "node:assert/strict";
import test from "node:test";

import {
  validatePersistedBusinessProfile,
} from "../shared/validation/persistedBusinessProfile.ts";

test("normalizes a valid persisted business profile", () => {
  assert.deepEqual(
    validatePersistedBusinessProfile({
      businessName: "  business-name  ",
      timezone: "  Asia/Jerusalem  ",
      interfaceLanguage: "he",
    }),
    {
      success: true,
      value: {
        businessName: "business-name",
        timezone: "Asia/Jerusalem",
        interfaceLanguage: "he",
      },
      issues: [],
    },
  );
});

test("rejects unsupported timezones and interface languages", () => {
  const result = validatePersistedBusinessProfile({
    businessName: "business-name",
    timezone: "not-a-timezone",
    interfaceLanguage: "fr",
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    { field: "timezone", code: "unsupported" },
    { field: "interfaceLanguage", code: "unsupported" },
  ]);
});

test("reports all required fields for a non-object payload", () => {
  const result = validatePersistedBusinessProfile(null);

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    { field: "businessName", code: "required" },
    { field: "timezone", code: "required" },
    { field: "interfaceLanguage", code: "required" },
  ]);
});
