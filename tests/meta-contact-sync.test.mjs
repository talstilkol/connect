import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { parseMetaWebhookEnvelope } from "../server/meta/metaWebhookEnvelope.ts";
import { classifyMetaWebhookEvents, createMetaWebhookEventDispatcher } from "../server/meta/metaWebhookEventDispatcher.ts";
import { createMetaWebhookBusinessBatchProcessor } from "../server/meta/metaWebhookBusinessProcessor.ts";
import { createMetaWebhookIngress } from "../server/meta/metaWebhookIngress.ts";
import { parseMetaContactSync, normalizeMetaContactSync, reduceMetaContactSync } from "../server/meta/metaContactSync.ts";
import { contactDisplayName } from "../shared/domain/contactDisplayName.ts";
import { parseRailwayContactRecord } from "../server/contacts/railwayContactDirectoryHandler.ts";
import { toContactRecord } from "../server/contacts/contactRecordMapper.ts";

const connection = { tenantId: 7, wabaId: "200002", phoneNumberId: "300003", businessPortfolioId: "100001", status: "connected", version: 2 };
const scope = { tenantId: 7, wabaId: "200002", phoneNumberId: "300003", connectionVersion: 2 };
const add = { phoneNumber: "+16505551234", action: "add", fullName: "Pablo Morales", firstName: "Pablo", occurredAt: "2025-02-12T00:43:44.000Z" };
const remove = { ...add, action: "remove", fullName: null, firstName: null };
const entry = () => ({ type: "contact", action: "add", contact: { phone_number: "16505551234", full_name: "Pablo Morales", first_name: "Pablo" }, metadata: { timestamp: "1739321024" } });
const value = (entries = [entry()]) => ({ messaging_product: "whatsapp", metadata: { display_phone_number: "15550783881", phone_number_id: "300003" }, state_sync: entries });
const payload = (sync = value()) => ({ object: "whatsapp_business_account", entry: [{ id: "200002", changes: [{ field: "smb_app_state_sync", value: sync }] }] });
const event = (sync = value()) => ({ tenantId: 7, receiptId: 1, eventKey: "a".repeat(64), connection, envelope: parseMetaWebhookEnvelope(JSON.stringify(payload(sync))) });
const parse = (sync = value()) => parseMetaContactSync(classifyMetaWebhookEvents(event(sync))[0], "300003");

test("parses the documented address-book event without entry.time or an invented completion flag", () => {
  assert.equal(classifyMetaWebhookEvents(event())[0].occurredAt, null);
  const [parsed] = parse();
  assert.deepEqual(parsed, { ...add, occurredAt: new Date(1739321024_000).toISOString() });
  assert.deepEqual(Object.keys(parsed).sort(), ["action", "firstName", "fullName", "occurredAt", "phoneNumber"]);
  assert.equal(parse(value([{ ...entry(), metadata: { timestamp: 1739321024 } }]))[0].occurredAt, parsed.occurredAt);
  assert.equal(parse(value([{ ...entry(), contact: { phone_number: "16505551234" } }]))[0].fullName, null);
});

test("removals discard supplied names and normalization snapshots every admitted field", () => {
  const [removed] = parse(value([{ ...entry(), action: "remove" }]));
  assert.equal(removed.firstName, null);
  assert.equal(removed.fullName, null);
  const input = { ...add };
  const selectedScope = { ...scope };
  const normalized = normalizeMetaContactSync(selectedScope, input);
  input.fullName = "changed";
  selectedScope.tenantId = 8;
  assert.equal(normalized.change.fullName, add.fullName);
  assert.equal(normalized.scope.tenantId, 7);
  assert.ok(Object.isFrozen(normalized.change));
  for (const invalid of [{ ...remove, fullName: "retained" }, { ...add, fullName: "bad\nname" }, { ...add, occurredAt: "2026-09-09" }]) {
    assert.throws(() => normalizeMetaContactSync(scope, invalid));
  }
});

test("rejects foreign scope, bad times, malformed names and unrelated data in a contact field", () => {
  for (const invalid of [
    { ...value(), messaging_product: "other" }, { ...value(), metadata: { ...value().metadata, phone_number_id: "wrong" } },
    value([{ ...entry(), type: "message" }]), value([{ ...entry(), action: "unknown" }]),
    value([{ ...entry(), contact: { phone_number: "15550783881" } }]), value([{ ...entry(), contact: { phone_number: "not-a-phone" } }]),
    value([{ ...entry(), contact: { ...entry().contact, full_name: "x".repeat(513) } }]),
    value([{ ...entry(), contact: { ...entry().contact, first_name: 5 } }]),
    value([{ ...entry(), metadata: { timestamp: 0 } }]), value([{ ...entry(), metadata: { timestamp: "253402300800" } }]),
    value([]),
  ]) assert.throws(() => parse(invalid));
  for (const key of ["messages", "statuses", "history", "message_echoes"]) assert.throws(() => parse({ ...value(), [key]: [] }));
  assert.throws(() => normalizeMetaContactSync({ ...scope, connectionVersion: 0 }, add));
});

test("state reduction converges, removals win ties and only newer additions can restore a source name", () => {
  const lateRemove = { ...remove, occurredAt: "2026-09-09T08:00:01.000Z" };
  for (const changes of [[add, lateRemove], [lateRemove, add], [add, remove], [remove, add]]) {
    const state = changes.reduce(reduceMetaContactSync, null);
    assert.equal(state.status, "removed");
    assert.equal(state.fullName, null);
  }
  const other = { ...add, fullName: "another name" };
  for (const changes of [[add, other], [other, add]]) {
    const conflict = changes.reduce(reduceMetaContactSync, null);
    assert.equal(conflict.status, "conflicted");
    assert.equal(conflict.fullName, null);
    assert.equal(reduceMetaContactSync(conflict, add).status, "conflicted");
    assert.equal(reduceMetaContactSync(conflict, { ...add, occurredAt: "2026-09-09T08:00:02.000Z" }).status, "present");
  }
  assert.equal(reduceMetaContactSync(reduceMetaContactSync(null, lateRemove), { ...add, occurredAt: "2026-09-09T08:00:02.000Z" }).status, "present");
});

test("signature verification precedes contact writes and no contact event invokes inbound automation", async () => {
  const calls = [];
  const process = createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({
    conversations: { async resolveInboundContact() { assert.fail("inbound invoked"); } }, templates: {},
    inboundRuntime: { async process() { assert.fail("bot invoked"); } },
    contactSync: { async record(selectedScope, change) { calls.push({ scope: selectedScope, change }); return { outcome: "updated" }; } },
  }));
  const receipts = { async findConnectionByWabaId() { return connection; }, async claimWebhookReceipt() { return { claimed: true, receipt: { id: 1 } }; },
    async completeWebhookReceipt() { calls.push("completed"); }, async failWebhookReceipt() { calls.push("failed"); } };
  const ingress = createMetaWebhookIngress(receipts, process, "local-contact-signing-secret");
  const raw = new TextEncoder().encode(JSON.stringify(payload()));
  await assert.rejects(ingress.receive(raw, `sha256=${"0".repeat(64)}`));
  assert.deepEqual(calls, []);
  await ingress.receive(raw, `sha256=${createHmac("sha256", "local-contact-signing-secret").update(raw).digest("hex")}`);
  assert.deepEqual(calls, [{ scope, change: parse()[0] }, "completed"]);
});

test("preflights a complete batch, blocks missing storage and suppresses contacts during offboarding", async () => {
  const writes = [];
  const processor = createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {},
    accounts: { async revokeConnection() { writes.push("revoked"); } },
    contactSync: { async record() { writes.push("contact"); } } });
  const dispatcher = createMetaWebhookEventDispatcher(processor);
  await assert.rejects(dispatcher(event(value([entry(), { ...entry(), action: "bad" }]))));
  assert.deepEqual(writes, []);
  await assert.rejects(createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {} }))(event()));
  const batch = { tenantId: 7, connection, events: classifyMetaWebhookEvents(event()) };
  await processor({ ...batch, events: [...batch.events, { kind: "account_update", value: { event: "PARTNER_REMOVED" } }] });
  assert.deepEqual(writes, ["revoked"]);
  await assert.rejects(processor({ ...batch, connection: { ...connection, status: "revoked" } }));
  await assert.rejects(createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {},
    contactSync: { async record() { throw new Error("private details"); } } }))(event()),
    (error) => error.safeCode === "CONTACT_SYNC_STORAGE_FAILED" && !error.message.includes("private"));
});

test("contact DTO and display preserve source names without overwriting manually supplied names", () => {
  const contact = { id: 1, version: 1, phoneNumber: "+16505551234", firstName: null, lastName: null, email: null, company: null,
    mailingStatus: "unsubscribed", consentStatus: "unknown", consentSource: null, consentRecordedAt: null, consentWithdrawnAt: null };
  const imported = { ...contact, whatsappDisplayName: "Pablo Morales" };
  assert.deepEqual(parseRailwayContactRecord(contact), contact);
  assert.deepEqual(parseRailwayContactRecord(imported), imported);
  assert.equal(toContactRecord(imported).whatsappDisplayName, imported.whatsappDisplayName);
  assert.equal(contactDisplayName(imported), "Pablo Morales");
  assert.equal(contactDisplayName({ ...imported, firstName: "שם מקומי", lastName: "קיים" }), "שם מקומי קיים");
  assert.equal(contactDisplayName(contact), contact.phoneNumber);
  for (const whatsappDisplayName of [null, undefined, "", " name ", "bad\nname", "a".repeat(513)]) {
    assert.equal(parseRailwayContactRecord({ ...contact, whatsappDisplayName }), null);
  }
});
