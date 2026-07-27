import assert from "node:assert/strict";
import test from "node:test";

import {
  validatePersistedContact,
} from "../shared/validation/persistedContact.ts";

test("normalizes an explicit international contact profile", () => {
  assert.deepEqual(
    validatePersistedContact({
      phoneNumber: "  +972501234567  ",
      firstName: "  first-name  ",
      lastName: " ",
      email: "  address@example.test  ",
      company: null,
    }),
    {
      success: true,
      value: {
        phoneNumber: "+972501234567",
        firstName: "first-name",
        lastName: null,
        email: "address@example.test",
        company: null,
      },
      issues: [],
    },
  );
});

test("does not infer a country prefix from a local phone number", () => {
  const result = validatePersistedContact({
    phoneNumber: "0501234567",
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    { field: "phoneNumber", code: "unsupported" },
  ]);
});

test("rejects extra symbols and more than fifteen digits", () => {
  for (const phoneNumber of [
    "+972-50-1234567",
    "+972+501234567",
    "+1234567890123456",
  ]) {
    const result = validatePersistedContact({ phoneNumber });

    assert.equal(result.success, false);
    assert.deepEqual(result.issues, [
      { field: "phoneNumber", code: "unsupported" },
    ]);
  }
});

test("requires a phone number", () => {
  const result = validatePersistedContact({});

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    { field: "phoneNumber", code: "required" },
  ]);
});
