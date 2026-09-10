import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { parseMetaWebhookEnvelope } from "../server/meta/metaWebhookEnvelope.ts";
import { classifyMetaWebhookEvents, createMetaWebhookEventDispatcher } from "../server/meta/metaWebhookEventDispatcher.ts";
import { createMetaWebhookBusinessBatchProcessor } from "../server/meta/metaWebhookBusinessProcessor.ts";
import { createMetaWebhookIngress } from "../server/meta/metaWebhookIngress.ts";
import { normalizeMetaHistorySync, parseMetaHistorySync } from "../server/meta/metaHistorySync.ts";
import { createMetaWebhookQueueConsumer } from "../server/meta/metaWebhookQueueConsumer.ts";
import { createMetaWebhookQueueMessage, parseMetaWebhookQueueMessage, MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES } from "../server/meta/metaWebhookQueueMessage.ts";
import { businessPhone, customerPhone, connection, scope, message, chunk, value, mediaValue, declinedValue, payload } from "./fixtures/meta-history.mjs";

const event = (v = value()) => ({ tenantId: 7, receiptId: 1, eventKey: "a".repeat(64), connection, envelope: parseMetaWebhookEnvelope(JSON.stringify(payload(v))) });
const parse = (v = value()) => parseMetaHistorySync(classifyMetaWebhookEvents(event(v))[0], "300003");

test("history without entry.time preserves phase, progress, device time and raw delivery state", () => {
  assert.equal(classifyMetaWebhookEvents(event())[0].occurredAt, null);
  const part = parse()[0];
  assert.equal(part.kind, "chunk");
  assert.equal(part.phase, 0); assert.equal(part.chunkOrder, 1); assert.equal(part.progress, 55);
  assert.deepEqual(part.messages[0], { threadPhoneNumber: `+${customerPhone}`, providerMessageId: message().id, direction: "outbound",
    occurredAt: new Date(1739230955_000).toISOString(), contentKind: "text", content: { body: "history fixture" }, deliveryState: "READ" });
  assert.equal(Object.hasOwn(part, "completed"), false);
});

test("direction comes from the business and thread phones; outgoing to can be absent", () => {
  const messages = [message({ to: customerPhone }), message({ id: "wamid.inbound", from: customerPhone, history_context: { status: "PENDING" } })];
  const part = parse(value([chunk({ threads: [{ id: customerPhone, messages }] })]))[0];
  assert.deepEqual(part.messages.map((m) => m.direction), ["outbound", "inbound"]);
  assert.equal(part.messages[1].deliveryState, "PENDING");
  for (const changed of [message({ from: "16505550000" }), message({ to: "16505550000" }), message({ from: customerPhone, to: businessPhone })]) {
    assert.throws(() => parse(value([chunk({ threads: [{ id: customerPhone, messages: [changed] }] })])));
  }
});

test("canonical message/content ordering and deep snapshots make repeated capture stable", () => {
  const m = message({ id: "wamid.b", text: { extra: { z: 1, a: 2 }, body: "body" } });
  const first = chunk({ threads: [{ id: customerPhone, messages: [m, message({ id: "wamid.a" })] }] });
  const other = structuredClone(first); other.threads[0].messages.reverse(); other.threads[0].messages[1].text = { body: "body", extra: { a: 2, z: 1 } };
  assert.deepEqual(parse(value([first])), parse(value([other])));
  const normalized = normalizeMetaHistorySync(scope, parse(value([first]))[0]);
  m.text.extra.z = 99;
  assert.equal(normalized.item.messages[1].content.extra.z, 1);
  assert.ok(Object.isFrozen(normalized.item.messages[1].content.extra));
});

test("media placeholders have no invented asset and separate media never invents a direction", () => {
  const placeholder = message({ type: "media_placeholder", text: undefined, id: "wamid.history-media", history_context: { status: "PLAYED" } });
  const part = parse(value([chunk({ threads: [{ id: customerPhone, messages: [placeholder] }] })]))[0];
  assert.equal(part.messages[0].content, null);
  assert.equal(part.messages[0].deliveryState, "PLAYED");
  const media = parse(mediaValue())[0];
  assert.equal(media.kind, "media"); assert.equal(media.reportedSender, `+${customerPhone}`);
  assert.equal(media.content.id, "24230790383178626"); assert.equal(Object.hasOwn(media, "direction"), false);
  assert.notEqual(media.reportedAt, part.messages[0].occurredAt);
});

test("documented history-sharing refusal keeps only its semantic result", () => {
  assert.deepEqual(parse(declinedValue()), [{ kind: "declined" }]);
  assert.throws(() => parse(value([{ errors: [{ code: 1 }] }])));
  assert.throws(() => parse(value([{ ...chunk(), errors: [{ code: 2593109 }] }])));
  assert.throws(() => parse(value([{ errors: [] }])));
});

test("rejects invalid identities, contents, duplicate IDs, progress and ambiguous fields before capture", () => {
  for (const invalid of [
    { ...value(), metadata: { ...value().metadata, phone_number_id: "foreign" } }, { ...value(), messaging_product: "other" },
    value([]), { ...value(), messages: [] }, { ...value(), statuses: [] }, { ...value(), state_sync: [] },
    value([chunk({ metadata: { phase: 3, chunk_order: 1, progress: 100 } })]),
    value([chunk({ metadata: { phase: 0, chunk_order: -1, progress: 0 } })]),
    value([chunk({ metadata: { phase: 0, chunk_order: 0, progress: 101 } })]),
    value([chunk({ threads: [{ id: businessPhone, messages: [message()] }] })]),
    value([chunk({ threads: [{ id: customerPhone, messages: [message(), message()] }] })]),
  ]) assert.throws(() => parse(invalid));
  for (const invalid of [message({ timestamp: 0 }), message({ timestamp: "253402300800" }), message({ id: "bad\nid" }),
    message({ type: "unknown" }), message({ type: "media_placeholder", media_placeholder: { id: "forged" } }),
    message({ text: { body: " " } }), message({ text: { body: "x".repeat(16385) } }), message({ text: { body: "bad\0content" } }),
    message({ history_context: { status: "UNKNOWN" } })]) {
    assert.throws(() => parse(value([chunk({ threads: [{ id: customerPhone, messages: [invalid] }] })])));
  }
  const badMedia = mediaValue(); badMedia.messages[0].image.id = ""; assert.throws(() => parse(badMedia));
  const textMedia = mediaValue(); textMedia.messages = [message()]; assert.throws(() => parse(textMedia));
});

test("normalization rechecks internal callers, bounds and timestamps", () => {
  const valid = parse()[0];
  for (const changed of [{ ...scope, tenantId: 0 }, { ...scope, connectionVersion: 0 }, { ...scope, wabaId: " bad" }]) {
    assert.throws(() => normalizeMetaHistorySync(changed, valid));
  }
  assert.throws(() => normalizeMetaHistorySync(scope, { ...valid, messages: [{ ...valid.messages[0], direction: "other" }] }));
  assert.throws(() => normalizeMetaHistorySync(scope, { ...valid, messages: [{ ...valid.messages[0], occurredAt: "2026-09-09" }] }));
  assert.throws(() => normalizeMetaHistorySync(scope, { ...valid, messages: Array.from({ length: 10001 }, () => valid.messages[0]) }));
  const huge = { ...valid, messages: Array.from({ length: 150 }, (_, i) => ({ ...valid.messages[0], providerMessageId: `wamid.${i}`, content: { body: "x".repeat(16384) } })) };
  assert.throws(() => normalizeMetaHistorySync(scope, huge));
  const circular = {}; circular.self = circular;
  assert.throws(() => normalizeMetaHistorySync(scope, { ...valid, messages: [{ ...valid.messages[0], content: { body: "x", circular } }] }));
});

test("signed history uses the dedicated repository and never calls live message or automation paths", async () => {
  const calls = [];
  const processor = createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {},
    inboundRuntime: { async process() { assert.fail("automation invoked"); } },
    historySync: { async record(selectedScope, item) { calls.push([selectedScope, item]); return { outcome: "stored" }; } } }));
  const receipts = { async findConnectionByWabaId() { return connection; }, async claimWebhookReceipt() { return { claimed: true, receipt: { id: 1 } }; },
    async completeWebhookReceipt() { calls.push("complete"); }, async failWebhookReceipt() { calls.push("failed"); } };
  const ingress = createMetaWebhookIngress(receipts, processor, "history-signing-secret");
  const raw = new TextEncoder().encode(JSON.stringify(payload()));
  await assert.rejects(ingress.receive(raw, `sha256=${"0".repeat(64)}`)); assert.deepEqual(calls, []);
  await ingress.receive(raw, `sha256=${createHmac("sha256", "history-signing-secret").update(raw).digest("hex")}`);
  assert.deepEqual(calls, [[scope, parse()[0]], "complete"]);
});

test("preflight prevents partial writes, requires storage and gives lifecycle/refusal precedence", async () => {
  const calls = [];
  const process = createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {},
    accounts: { async revokeConnection() { calls.push("revoke"); } }, historySync: { async record(_scope, item) { calls.push(item.kind); } } });
  const dispatch = createMetaWebhookEventDispatcher(process);
  await assert.rejects(dispatch(event(value([chunk(), chunk({ metadata: { phase: 0, chunk_order: 2, progress: -1 } })]))));
  assert.deepEqual(calls, []);
  await assert.rejects(createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {} }))(event()));
  await dispatch(event(value([chunk(), { errors: [{ code: 2593109 }] }])));
  assert.deepEqual(calls, ["declined", "chunk"]); calls.length = 0;
  await process({ tenantId: 7, connection, events: [...classifyMetaWebhookEvents(event()), { kind: "account_update", value: { event: "PARTNER_REMOVED" } }] });
  assert.deepEqual(calls, ["revoke"]);
});

test("private storage errors are redacted and broker payload limits remain explicit", async () => {
  const process = createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {},
    historySync: { async record() { throw new Error("private body content"); } } }));
  await assert.rejects(process(event()), (error) => error.safeCode === "HISTORY_SYNC_STORAGE_FAILED" && !error.message.includes("private"));
  const body = createMetaWebhookQueueMessage(new Uint8Array(120001), `sha256=${"a".repeat(64)}`);
  assert.equal(parseMetaWebhookQueueMessage(body), null);
  assert.ok(parseMetaWebhookQueueMessage(body, MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES));
  assert.equal(parseMetaWebhookQueueMessage(body, Infinity), null);
  let received = 0, acknowledged = 0;
  const consumer = createMetaWebhookQueueConsumer({ async receive() { received++; } }, MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES);
  await consumer.handle({ messages: [{ body, ack() { acknowledged++; }, retry() { assert.fail(); } }] });
  assert.equal(received, 1); assert.equal(acknowledged, 1);
  const oversized = createMetaWebhookQueueMessage(new Uint8Array(MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES + 1), body.signatureHeader);
  assert.equal(parseMetaWebhookQueueMessage(oversized, MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES), null);
});

test("a refusal in a separate history change runs before earlier data, and failed refusal prevents capture", async () => {
  const calls = [];
  let deny = false;
  const processor = createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {}, historySync: { async record(_scope, item) {
    calls.push(item.kind); if (deny && item.kind === "declined") throw new Error("unavailable");
  } } });
  const batch = { tenantId: 7, connection, events: [...classifyMetaWebhookEvents(event()), ...classifyMetaWebhookEvents(event(declinedValue()))] };
  await processor(batch); assert.deepEqual(calls, ["declined", "chunk"]);
  calls.length = 0; deny = true;
  await assert.rejects(processor(batch)); assert.deepEqual(calls, ["declined"]);
});
