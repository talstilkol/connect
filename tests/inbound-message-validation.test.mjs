import assert from "node:assert/strict";
import test from "node:test";

import {
  validateInboundMessage,
} from "../shared/validation/inboundMessage.ts";

function inboundMessage(overrides = {}) {
  return {
    contactId: 17,
    providerMessageId: "wamid.message-17",
    contentKind: "text",
    textContent: "שלום, אשמח לקבל פרטים",
    occurredAt: "2026-07-26T08:30:00.000Z",
    ...overrides,
  };
}

test("normalizes the provider identity and preserves valid inbound text", () => {
  const result = validateInboundMessage(
    inboundMessage({
      providerMessageId: "  wamid.message-17  ",
    }),
  );

  assert.equal(result.success, true);
  assert.equal(
    result.value.providerMessageId,
    "wamid.message-17",
  );
  assert.equal(
    result.value.textContent,
    "שלום, אשמח לקבל פרטים",
  );
});

test("accepts a non-text message only without invented text content", () => {
  const accepted = validateInboundMessage(
    inboundMessage({
      contentKind: "image",
      textContent: null,
    }),
  );
  const rejected = validateInboundMessage(
    inboundMessage({
      contentKind: "image",
      textContent: "image caption",
    }),
  );

  assert.equal(accepted.success, true);
  assert.equal(accepted.value.textContent, null);
  assert.equal(rejected.success, false);
  assert.ok(rejected.issues.includes("invalid-content"));
});

test("rejects blank text, unsupported internal kinds, and non-canonical time", () => {
  const result = validateInboundMessage(
    inboundMessage({
      contentKind: "provider-private-kind",
      textContent: " ",
      occurredAt: "2026-07-26 08:30:00",
    }),
  );

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    "invalid-content",
    "invalid-timestamp",
  ]);
});

test("rejects invalid contact and provider identities", () => {
  const result = validateInboundMessage(
    inboundMessage({
      contactId: 0,
      providerMessageId: " ",
    }),
  );

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    "invalid-contact",
    "invalid-provider-message-id",
  ]);
});
