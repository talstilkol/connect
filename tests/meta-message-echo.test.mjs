import assert from "node:assert/strict";
import test from "node:test";
import { parseMetaWebhookEnvelope } from "../server/meta/metaWebhookEnvelope.ts";
import { classifyMetaWebhookEvents, createMetaWebhookEventDispatcher } from "../server/meta/metaWebhookEventDispatcher.ts";
import { createMetaWebhookBusinessBatchProcessor } from "../server/meta/metaWebhookBusinessProcessor.ts";
import { parseMetaMessageEchoes, normalizeMetaMessageEcho } from "../server/conversations/metaMessageEcho.ts";
import { createMetaWebhookIngress } from "../server/meta/metaWebhookIngress.ts";
import { createHmac } from "node:crypto";

const connection = { tenantId: 7, wabaId: "200002", phoneNumberId: "300003", businessPortfolioId: "100001", status: "connected", version: 2 };
const scope = { tenantId: 7, wabaId: "200002", phoneNumberId: "300003", connectionVersion: 2 };
function message(overrides = {}) {
  return { from: "15550783881", to: "16505551234", id: "wamid.echo-1", timestamp: "1739321024", type: "text", text: { body: "שלום" }, ...overrides };
}
function value(messages = [message()]) {
  return { messaging_product: "whatsapp", metadata: { display_phone_number: "15550783881", phone_number_id: "300003" }, message_echoes: messages };
}
function payload(echoValue = value(), entryOverrides = {}) {
  return { object: "whatsapp_business_account", entry: [{ id: "200002", changes: [{ field: "smb_message_echoes", value: echoValue }], ...entryOverrides }] };
}
function event(echoValue = value(), entryOverrides = {}) {
  return { tenantId: 7, receiptId: 1, eventKey: "a".repeat(64), connection,
    envelope: parseMetaWebhookEnvelope(JSON.stringify(payload(echoValue, entryOverrides))) };
}
function parsed(echoValue = value()) {
  return parseMetaMessageEchoes(classifyMetaWebhookEvents(event(echoValue))[0], "300003");
}

test("accepts the documented echo shape without entry.time and routes the recipient, not the sender", () => {
  const events = classifyMetaWebhookEvents(event());
  assert.equal(events[0].kind, "smb_message_echoes");
  assert.equal(events[0].occurredAt, null);
  assert.deepEqual(parsed(), [{ recipientPhoneNumber: "+16505551234", providerMessageId: "wamid.echo-1",
    contentKind: "text", textContent: "שלום", occurredAt: new Date(1739321024000).toISOString() }]);
  assert.equal(parsed(value([message({ to: "+16505551234", timestamp: 1739321024 })]))[0].recipientPhoneNumber, "+16505551234");
  assert.throws(() => classifyMetaWebhookEvents(event(value(), { time: null })));
  assert.throws(() => classifyMetaWebhookEvents(event(value(), { changes: [{ field: "messages", value: { messages: [message()] } }] })));
});

test("validates scope, sender, recipient, content and time before accepting an echo batch", () => {
  for (const bad of [
    { ...value(), messaging_product: "other" }, { ...value(), metadata: { ...value().metadata, phone_number_id: "wrong" } },
    value([message({ from: "16505551234" })]), value([message({ to: "15550783881" })]),
    value([message({ to: "abc" })]), value([message({ id: "wamid.\ninvalid" })]),
    value([message({ timestamp: 0 })]), value([message({ timestamp: "253402300800" })]),
    value([message({ text: { body: " " } })]), value([message({ type: "image", image: null })]),
    value([message({ type: "unknown" })]), value(Array.from({ length: 101 }, () => message())),
  ]) assert.throws(() => parsed(bad));
  for (const type of ["edit", "revoke"]) {
    assert.throws(() => parsed(value([message({ type })])), (error) => error.safeCode === "INVALID_MESSAGE_ECHO");
  }
  for (const type of ["image", "video", "audio", "document", "sticker", "location", "interactive", "contacts"]) {
    assert.equal(parsed(value([message({ type, [type]: type === "contacts" ? [{}] : {} })]))[0].textContent, null);
  }
});

test("parses text edits and revocations with the original target, while media edits remain blocked", () => {
  const edit = parsed(value([message({ type: "edit", edit: { original_message_id: "wamid.original", message: { type: "text", text: { body: "תיקון" } } } })]))[0];
  assert.deepEqual(edit.mutation, { kind: "edit", originalProviderMessageId: "wamid.original" });
  assert.equal(edit.providerMessageId, "wamid.echo-1");
  assert.equal(edit.contentKind, "text");
  assert.equal(edit.textContent, "תיקון");
  const revoke = parsed(value([message({ type: "revoke", revoke: { original_message_id: "wamid.original" } })]))[0];
  assert.equal(revoke.textContent, null);
  assert.equal(revoke.contentKind, "unsupported");
  assert.equal(revoke.mutation.kind, "revoke");
  assert.deepEqual(normalizeMetaMessageEcho(scope, revoke).message, revoke);
  assert.throws(() => parsed(value([message({ type: "edit", edit: { original_message_id: "wamid.original", message: { type: "image", image: { caption: "תיקון" } } } })])),
    (error) => error.safeCode === "UNSUPPORTED_MESSAGE_ECHO_EDIT_CONTENT");
});

test("rejects malformed echo collections and an inbound/status mixture hidden inside the echo field", () => {
  for (const bad of [{ ...value(), message_echoes: [] }, { ...value(), message_echoes: {} },
    { ...value(), messages: [message()] }, { ...value(), statuses: [] }]) {
    assert.throws(() => classifyMetaWebhookEvents(event(bad)));
  }
});

test("signed echoes reach only the echo repository and invalid signatures never reach storage", async () => {
  const calls = [];
  const processor = createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({
    conversations: { async resolveInboundContact() { assert.fail("inbound contact called"); }, async recordInboundMessage() { assert.fail("inbound write called"); } },
    templates: {}, inboundRuntime: { async process() { assert.fail("bot called"); } },
    messageEchoes: { async record(selectedScope, echo) { calls.push({ scope: selectedScope, echo }); return { outcome: "created" }; } },
  }));
  const receipt = { async findConnectionByWabaId(wabaId) { assert.equal(wabaId, connection.wabaId); return connection; },
    async claimWebhookReceipt() { return { claimed: true, receipt: { id: 1 } }; }, async completeWebhookReceipt() { calls.push("completed"); },
    async failWebhookReceipt() { calls.push("failed"); } };
  const ingress = createMetaWebhookIngress(receipt, processor, "test-only-signing-secret");
  const raw = new TextEncoder().encode(JSON.stringify(payload()));
  await assert.rejects(ingress.receive(raw, `sha256=${"0".repeat(64)}`));
  assert.deepEqual(calls, []);
  await ingress.receive(raw, `sha256=${createHmac("sha256", "test-only-signing-secret").update(raw).digest("hex")}`);
  assert.deepEqual(calls, [{ scope, echo: parsed()[0] }, "completed"]);
});

test("preflights all echoes before writes and fails closed without the repository", async () => {
  let writes = 0;
  const repositories = { conversations: {}, templates: {}, messageEchoes: { async record() { writes++; } } };
  await assert.rejects(createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor(repositories))(
    event(value([message(), message({ type: "revoke" })]))));
  assert.equal(writes, 0);
  await assert.rejects(createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {} }))(event()),
    (error) => error.safeCode === "PROCESSOR_NOT_CONFIGURED");
});

test("storage failures cannot complete receipts and lifecycle events suppress echoes", async () => {
  const calls = [];
  const processor = createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {},
    messageEchoes: { async record() { throw new Error("private-storage-error"); } },
    accounts: { async revokeConnection(...args) { calls.push(args); } },
  });
  const events = classifyMetaWebhookEvents(event());
  const batch = { tenantId: 7, receiptId: 1, eventKey: "a".repeat(64), connection, events };
  await assert.rejects(processor(batch), (error) => error.safeCode === "MESSAGE_ECHO_STORAGE_FAILED" && !error.message.includes("private"));
  await processor({ ...batch, events: [...events, { kind: "account_update", value: { event: "PARTNER_REMOVED" } }] });
  assert.deepEqual(calls, [[7, "200002", 2]]);
  await assert.rejects(processor({ ...batch, connection: { ...connection, status: "revoked" } }));
});

test("the persistence input boundary snapshots data and rejects invalid scope or text", () => {
  const candidate = { ...parsed()[0] };
  const snapshot = normalizeMetaMessageEcho(scope, candidate);
  candidate.textContent = "changed";
  assert.equal(snapshot.message.textContent, "שלום");
  assert.ok(Object.isFrozen(snapshot.message));
  for (const bad of [{ ...scope, tenantId: 0 }, { ...scope, connectionVersion: 0 }, { ...scope, phoneNumberId: "wrong\n" }]) {
    assert.throws(() => normalizeMetaMessageEcho(bad, candidate));
  }
  assert.throws(() => normalizeMetaMessageEcho(scope, { ...candidate, occurredAt: "2026-09-09" }));
});
