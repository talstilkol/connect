import assert from "node:assert/strict";
import test from "node:test";

import {
  toContactRecord,
} from "../server/contacts/contactRecordMapper.ts";

test("removes tenant and evidence internals from the client contact DTO", () => {
  const record = toContactRecord({
    id: 23,
    tenantId: 7,
    phoneNumber: "+972501234567",
    firstName: null,
    lastName: null,
    email: null,
    company: null,
    mailingStatus: "unsubscribed",
    consentStatus: "unknown",
    consentSource: null,
    consentRecordedAt: null,
    consentWithdrawnAt: null,
    consentEvidenceReference: "evidence-reference",
    version: 1,
    createdAt: "created-at",
    updatedAt: "updated-at",
  });

  assert.equal("tenantId" in record, false);
  assert.equal("consentEvidenceReference" in record, false);
  assert.equal("createdAt" in record, false);
  assert.deepEqual(record, {
    id: 23,
    phoneNumber: "+972501234567",
    firstName: null,
    lastName: null,
    email: null,
    company: null,
    mailingStatus: "unsubscribed",
    consentStatus: "unknown",
    consentSource: null,
    consentRecordedAt: null,
    consentWithdrawnAt: null,
    version: 1,
  });
});
