import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveContactImportJobKey,
  deriveContactPhoneFingerprint,
} from "../server/contacts/contactImportKey.ts";

const mapping = {
  phoneNumber: 0,
  firstName: 1,
  lastName: null,
  email: 2,
  company: null,
};

test("derives stable import keys from tenant, source digest, and mapping", () => {
  const input = {
    tenantId: 7,
    sourceDigest: "a".repeat(64),
    mapping,
  };
  const first = deriveContactImportJobKey(input);
  const second = deriveContactImportJobKey(input);

  assert.equal(first, second);
  assert.match(first, /^contact_import_v1_[0-9a-f]{64}$/);
  assert.notEqual(
    first,
    deriveContactImportJobKey({
      ...input,
      tenantId: 8,
    }),
  );
  assert.notEqual(
    first,
    deriveContactImportJobKey({
      ...input,
      mapping: {
        ...mapping,
        email: 3,
      },
    }),
  );
});

test("derives a stable non-plain-text phone fingerprint", () => {
  const phoneNumber = "+972501234567";
  const fingerprint = deriveContactPhoneFingerprint(phoneNumber);

  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(fingerprint, /972501234567/);
  assert.equal(
    fingerprint,
    deriveContactPhoneFingerprint(phoneNumber),
  );
});
