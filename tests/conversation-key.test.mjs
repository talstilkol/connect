import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveConversationKey,
  deriveInboundMessageKey,
} from "../server/conversations/conversationKey.ts";

function inboundMessage(overrides = {}) {
  return {
    contactId: 17,
    providerMessageId: "wamid.message-17",
    contentKind: "text",
    textContent: "שלום",
    occurredAt: "2026-07-26T08:30:00.000Z",
    ...overrides,
  };
}

test("derives one deterministic conversation key per tenant and contact", async () => {
  const first = await deriveConversationKey(7, 17);
  const repeated = await deriveConversationKey(7, 17);
  const anotherContact = await deriveConversationKey(
    7,
    18,
  );
  const anotherTenant = await deriveConversationKey(
    8,
    17,
  );

  assert.match(
    first,
    /^conversation_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, repeated);
  assert.notEqual(first, anotherContact);
  assert.notEqual(first, anotherTenant);
});

test("uses the provider message identity for idempotent inbound retries", async () => {
  const first = await deriveInboundMessageKey(
    7,
    inboundMessage(),
  );
  const repeated = await deriveInboundMessageKey(
    7,
    inboundMessage({
      textContent: "תוכן שהשתנה ב-Retry",
    }),
  );
  const anotherTenant = await deriveInboundMessageKey(
    8,
    inboundMessage(),
  );

  assert.match(
    first.messageKey,
    /^message_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first.messageKey, repeated.messageKey);
  assert.notEqual(
    first.messageKey,
    anotherTenant.messageKey,
  );
});

test("returns the validated message together with its key", async () => {
  const result = await deriveInboundMessageKey(
    7,
    inboundMessage({
      providerMessageId: "  wamid.message-17  ",
    }),
  );

  assert.equal(
    result.message.providerMessageId,
    "wamid.message-17",
  );
  assert.equal(result.message.contactId, 17);
});

test("rejects invalid tenant, contact, and inbound message identities", async () => {
  await assert.rejects(
    deriveConversationKey(0, 17),
    /tenantId/,
  );
  await assert.rejects(
    deriveConversationKey(7, 0),
    /contactId/,
  );
  await assert.rejects(
    deriveInboundMessageKey(
      7,
      inboundMessage({
        providerMessageId: "",
      }),
    ),
    /inbound message is invalid/,
  );
});
