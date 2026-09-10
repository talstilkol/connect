import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { createMetaRepository } from "../db/metaRepository.ts";
import { createMetaCredentialRepository } from "../db/metaCredentialRepository.ts";
import { createMetaCredentialVault } from "../server/meta/metaCredentialVault.ts";
import { createMetaWebhookIngress } from "../server/meta/metaWebhookIngress.ts";
import { createMetaWebhookEventDispatcher } from "../server/meta/metaWebhookEventDispatcher.ts";
import { createMetaWebhookBusinessBatchProcessor } from "../server/meta/metaWebhookBusinessProcessor.ts";
import { createMetaWebhookQueuePublisher } from "../server/meta/metaWebhookQueuePublisher.ts";
import { createMetaWebhookSignature } from "../server/meta/metaWebhookSecurity.ts";

const appSecret = "meta-test-secret";
const assets = { tenantId: 7, businessPortfolioId: "business-id", wabaId: "waba-id", phoneNumberId: "phone-id" };
function payload(event, extraChanges = [], value = {}, wabaId = assets.wabaId) {
  return new TextEncoder().encode(JSON.stringify({ object: "whatsapp_business_account", entry: [{
    id: wabaId, time: 1785054600,
    changes: [{ field: "account_update", value: { event, ...value } }, ...extraChanges],
  }] }));
}
async function fixture(context, connected = true) {
  const database = new DatabaseSync(":memory:");
  context.after(() => database.close());
  for (const migration of ["0000_connect_foundation.sql", "0006_meta_connection_webhooks.sql", "0007_meta_credential_vault.sql"]) {
    database.exec(await readFile(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
  }
  database.prepare("INSERT INTO tenants (id, display_name) VALUES (?, ?)").run(7, "tenant-name");
  const binding = { prepare(sql) {
    const statement = database.prepare(sql);
    let values = [];
    return {
      bind(...input) { values = input; return this; },
      async run() { return { success: true, meta: { changes: Number(statement.run(...values).changes) } }; },
      async first() { return statement.get(...values) ?? null; },
    };
  } };
  const repository = createMetaRepository(binding);
  const pending = await repository.saveAssetSnapshot(assets);
  let nonce = 0;
  const vault = createMetaCredentialVault(createMetaCredentialRepository(binding), {
    META_CREDENTIAL_ENCRYPTION_KEY_V1: Buffer.alloc(32, 61).toString("base64"),
  }, { crypto: { subtle: crypto.subtle, getRandomValues(target) { target.fill(++nonce); return target; } } });
  await vault.storeAccessToken(7, "protected-token", pending.version);
  if (connected) await repository.markConnectionConnected(7, pending.version);
  const businessWrites = [];
  const accounts = { revokeConnection: (...args) => repository.revokeConnection(...args) };
  const processor = createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({
    accounts,
    conversations: { async resolveInboundContact() { businessWrites.push("contact"); throw new Error("unexpected business processing"); } },
    templates: { async applyStatusEvent() { businessWrites.push("template"); } },
  }));
  const ingress = createMetaWebhookIngress(repository, processor, appSecret);
  const queued = [];
  const publisher = createMetaWebhookQueuePublisher(repository, { async publish(message) { queued.push(message); } }, appSecret, { async consume() { return { outcome: "allowed" }; } });
  const receive = async (raw) => ingress.receive(raw, await createMetaWebhookSignature(raw, appSecret));
  return { database, repository, vault, accounts, ingress, publisher, queued, businessWrites, receive };
}

test("signed partner removal revokes credentials and duplicate delivery completes without reactivation", async (context) => {
  const f = await fixture(context);
  assert.equal(await f.vault.withAccessToken(7, async (token) => token), "protected-token");
  const raw = payload("PARTNER_REMOVED", [], { phone_number: "15550783881" });
  assert.equal((await f.receive(raw)).outcome, "processed");
  const revoked = await f.repository.findConnectionByTenantId(7);
  assert.equal(revoked.status, "revoked");
  assert.equal(revoked.version, 3);
  await assert.rejects(f.vault.withAccessToken(7, async () => assert.fail("revoked credential used")), { code: "CREDENTIAL_NOT_FOUND" });
  assert.equal((await f.receive(raw)).outcome, "duplicate");
  assert.equal((await f.repository.findConnectionByTenantId(7)).version, 3);
  assert.equal((await f.receive(payload("ACCOUNT_RECONNECTED"))).outcome, "processed");
  assert.equal((await f.repository.findConnectionByTenantId(7)).status, "revoked");
  assert.deepEqual(f.businessWrites, []);
});

test("pending offboarding is admitted by the publisher and prevents signup confirmation", async (context) => {
  const f = await fixture(context, false);
  const raw = payload("ACCOUNT_OFFBOARDED");
  const signature = await createMetaWebhookSignature(raw, appSecret);
  assert.equal((await f.publisher.receive(raw, signature)).outcome, "queued");
  assert.equal(f.queued.length, 1);
  await f.receive(raw);
  await assert.rejects(f.repository.markConnectionConnected(7, 1));
  await f.publisher.receive(raw, signature);
  assert.equal((await f.receive(raw)).outcome, "duplicate");
  const mixed = payload("ACCOUNT_RECONNECTED", [{ field: "messages", value: {} }]);
  const mixedSignature = await createMetaWebhookSignature(mixed, appSecret);
  await assert.rejects(f.publisher.receive(mixed, mixedSignature), { code: "CONNECTION_NOT_FOUND" });
  await assert.rejects(f.ingress.receive(mixed, mixedSignature), { code: "CONNECTION_NOT_FOUND" });
});

test("lifecycle revocation suppresses business work even when messages precede the lifecycle event", async (context) => {
  const f = await fixture(context);
  const body = JSON.parse(new TextDecoder().decode(payload("ACCOUNT_OFFBOARDED")));
  body.entry[0].changes.unshift({ field: "messages", value: { messages: [{ type: "text" }] } });
  await f.receive(new TextEncoder().encode(JSON.stringify(body)));
  assert.equal((await f.repository.findConnectionByTenantId(7)).status, "revoked");
  assert.deepEqual(f.businessWrites, []);
});

test("invalid signatures, foreign WABAs, mismatched owners and unknown account events cannot revoke", async (context) => {
  const f = await fixture(context);
  await assert.rejects(f.ingress.receive(payload("PARTNER_REMOVED"), "sha256=invalid"), { code: "INVALID_SIGNATURE" });
  await assert.rejects(f.publisher.receive(payload("PARTNER_REMOVED"), "sha256=invalid"), { code: "INVALID_SIGNATURE" });
  await assert.rejects(f.receive(payload("PARTNER_REMOVED", [], {}, "other-waba")), { code: "CONNECTION_NOT_FOUND" });
  await assert.rejects(f.receive(payload("PARTNER_REMOVED", [], { waba_info: { waba_id: "waba-id", owner_business_id: "other-owner" } })), { code: "PROCESSING_FAILED" });
  await assert.rejects(f.receive(payload("UNKNOWN_EVENT")), { code: "PROCESSING_FAILED" });
  assert.equal((await f.repository.findConnectionByTenantId(7)).status, "connected");
  assert.deepEqual(f.businessWrites, []);
});

test("a connection replaced during processing is not revoked by the old snapshot", async (context) => {
  const f = await fixture(context);
  f.accounts.revokeConnection = async (...args) => {
    await f.repository.saveAssetSnapshot(assets);
    return f.repository.revokeConnection(...args);
  };
  await f.receive(payload("ACCOUNT_OFFBOARDED"));
  const current = await f.repository.findConnectionByTenantId(7);
  assert.equal(current.status, "pending");
  assert.equal(current.version, 3);
});
