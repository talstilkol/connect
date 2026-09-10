import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";
import { createHash, createHmac } from "node:crypto";
import { createNodePostgresTransactionManager, createNodePostgresQueryExecutor } from "../../server/platform/nodePostgresAdapter.ts";
import { createPostgresMetaMessageEchoRepository, postgresMetaMessageEchoSql } from "../../server/platform/postgresMetaMessageEchoRepository.ts";
import { createPostgresConversationRepository } from "../../server/platform/postgresConversationRepository.ts";
import { createPostgresMetaRepository, postgresMetaSql } from "../../server/platform/postgresMetaRepository.ts";
import { createPostgresMetaCredentialRepository } from "../../server/platform/postgresMetaCredentialRepository.ts";
import { createPostgresMetaContactSyncRepository, postgresMetaContactSyncSql } from "../../server/platform/postgresMetaContactSyncRepository.ts";
import { createPostgresContactReadRepository } from "../../server/platform/postgresContactReadRepository.ts";
import { createMetaWebhookIngress } from "../../server/meta/metaWebhookIngress.ts";
import { createMetaWebhookEventDispatcher } from "../../server/meta/metaWebhookEventDispatcher.ts";
import { createMetaWebhookBusinessBatchProcessor } from "../../server/meta/metaWebhookBusinessProcessor.ts";
import { toInboxConversationView } from "../../server/conversations/conversationView.ts";
import { toContactRecord } from "../../server/contacts/contactRecordMapper.ts";
import { parseRailwayContactRecord } from "../../server/contacts/railwayContactDirectoryHandler.ts";
import { contactDisplayName } from "../../shared/domain/contactDisplayName.ts";

// Explicit, isolated live test. Never runs against DATABASE_URL or production.
const connectionString = process.env.CONNECT_META_ECHO_TEST_URL;
if (connectionString !== "postgresql://connect_echo_test@127.0.0.1:55439/connect_meta_echo_integration") {
  throw new Error("A dedicated local Meta echo test database is required");
}
const pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 2000,
  statement_timeout: 5000, lock_timeout: 3000 });
const transactions = createNodePostgresTransactionManager(pool);
const repository = createPostgresMetaMessageEchoRepository(transactions);
const conversations = createPostgresConversationRepository({ transactions, queries: createNodePostgresQueryExecutor(pool) });
const meta = createPostgresMetaRepository({ transactions, queries: createNodePostgresQueryExecutor(pool) });
const credentials = createPostgresMetaCredentialRepository(createNodePostgresQueryExecutor(pool));
const contactSync = createPostgresMetaContactSyncRepository(transactions);
const contactReads = createPostgresContactReadRepository(createNodePostgresQueryExecutor(pool));
const scope = { tenantId: 7, wabaId: "200002", phoneNumberId: "300003", connectionVersion: 2 };
const message = { recipientPhoneNumber: "+16505551234", providerMessageId: "wamid.echo-live-1",
  contentKind: "text", textContent: "שלום מהטלפון", occurredAt: "2026-09-09T08:00:00.000Z" };

before(async () => {
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  assert.equal(tables.rowCount, 0, "Refusing to change a non-empty database");
  const directory = new URL("../../postgres/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort()) {
    const sql = await readFile(new URL(file, directory), "utf8");
    if (file === "0074_meta_message_echo_captions.sql") {
      // Rehearse an upgrade over real pre-0074 revision state, then roll back
      // this isolated rehearsal before the ordinary empty-database migration.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("INSERT INTO tenants (id,display_name,status) VALUES (7,'Echo integration','active')");
        await client.query(`INSERT INTO meta_message_echo_states
          (tenant_id,provider_message_id,waba_id,phone_number_id,recipient_phone,content_state,edit_at,edit_text)
          VALUES (7,$1,$2,$3,$4,'edited',$5,$6)`, [message.providerMessageId, scope.wabaId, scope.phoneNumberId, message.recipientPhoneNumber, message.occurredAt, " ".repeat(16_384) + message.textContent]);
        // The old SQL constraint measured trimmed length. This upgrade must
        // preserve even that boundary without silently tightening legacy data.
        await client.query("INSERT INTO meta_message_echo_events (tenant_id,event_key,request_digest,provider_message_id) VALUES (7,$1,$1,$2)", ["a".repeat(64), message.providerMessageId]);
        const before = (await client.query("SELECT * FROM meta_message_echo_states")).rows[0];
        const receipts = (await client.query("SELECT * FROM meta_message_echo_events")).rows;
        await client.query(sql);
        const after = (await client.query("SELECT * FROM meta_message_echo_states")).rows[0];
        assert.deepEqual(after, { ...before, edit_kind: "text" });
        assert.deepEqual((await client.query("SELECT * FROM meta_message_echo_events")).rows, receipts);
      } finally { await client.query("ROLLBACK"); client.release(); }
    }
    if (file === "0075_meta_message_echo_original_captions.sql") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("INSERT INTO tenants (id,display_name,status) VALUES (7,'Echo integration','active')");
        await client.query(`INSERT INTO meta_message_echo_states
          (tenant_id,provider_message_id,waba_id,phone_number_id,recipient_phone,original_digest)
          VALUES (7,$1,$2,$3,$4,$5)`, [message.providerMessageId, scope.wabaId, scope.phoneNumberId, message.recipientPhoneNumber, "a".repeat(64)]);
        await client.query("INSERT INTO meta_message_echo_events (tenant_id,event_key,request_digest,provider_message_id) VALUES (7,$1,$1,$2)", ["a".repeat(64), message.providerMessageId]);
        const before = (await client.query("SELECT * FROM meta_message_echo_states")).rows[0];
        const receipts = (await client.query("SELECT * FROM meta_message_echo_events")).rows;
        await client.query(sql);
        assert.deepEqual((await client.query("SELECT * FROM meta_message_echo_states")).rows[0], { ...before, original_caption_digest: null });
        assert.deepEqual((await client.query("SELECT * FROM meta_message_echo_events")).rows, receipts);
        await client.query("UPDATE meta_message_echo_states SET original_caption_digest=$1", ["b".repeat(64)]);
        for (const statement of ["UPDATE meta_message_echo_states SET original_caption_digest='invalid'",
          "UPDATE meta_message_echo_states SET original_digest=NULL"]) {
          await client.query("SAVEPOINT invalid_caption_identity");
          await assert.rejects(client.query(statement), e => e.code === "23514");
          await client.query("ROLLBACK TO SAVEPOINT invalid_caption_identity");
        }
      } finally { await client.query("ROLLBACK"); client.release(); }
    }
    await pool.query(sql);
  }
  await pool.query("INSERT INTO tenants (id, display_name, status) VALUES (7, 'Echo integration', 'active'), (8, 'Other integration', 'active')");
  await pool.query(`INSERT INTO meta_connections (tenant_id, business_portfolio_id, waba_id, phone_number_id, status, version, webhook_subscribed_at, connected_at)
    VALUES (7, '100001', '200002', '300003', 'connected', 2, date_trunc('milliseconds', CURRENT_TIMESTAMP), date_trunc('milliseconds', CURRENT_TIMESTAMP))`);
});
after(async () => { await pool.end(); });

test("Meta reconnect, credential writes and status transitions participate in the real tenant barrier", async () => {
  const pending = await meta.saveAssetSnapshot({ tenantId: 7, businessPortfolioId: "100001", wabaId: "200002", phoneNumberId: "300003" });
  await credentials.store({ tenantId: 7, expectedConnectionVersion: pending.version, keyVersion: "v1",
    initializationVector: "AQIDBAUGBwgJCgsM", ciphertext: "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcY" });
  const connected = await meta.markConnectionConnected(7, pending.version);
  assert.equal((await credentials.findByTenantId(7)).authorizationVersion, pending.version);
  await meta.markConnectionStatus(7, "restricted");
  const renewed = await meta.saveAssetSnapshot({ tenantId: 7, businessPortfolioId: "100001", wabaId: "200002", phoneNumberId: "300003" });
  assert.ok(renewed.version > connected.version);
  scope.connectionVersion = (await meta.markConnectionConnected(7, renewed.version)).version;
});

test("concurrent duplicates create one outbound message without unread, consent or inbound window data", async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => repository.record(scope, message)));
  assert.equal(results.filter((result) => result.outcome === "created").length, 1);
  assert.equal(results.filter((result) => result.outcome === "duplicate").length, 4);
  const stored = (await pool.query("SELECT * FROM messages")).rows;
  assert.equal(stored.length, 1);
  assert.equal(stored[0].direction, "outbound");
  assert.equal(stored[0].status, "sent");
  const conversation = (await pool.query("SELECT * FROM conversations")).rows[0];
  assert.equal(conversation.unread_count, 0);
  assert.equal(conversation.status, "new");
  assert.equal(conversation.version, 2);
  assert.equal((await pool.query("SELECT * FROM contact_consent_events")).rowCount, 0);
  assert.equal((await pool.query("SELECT * FROM messages WHERE direction = 'inbound'")).rowCount, 0);
  const inbox = await conversations.findByKey(7, conversation.conversation_key);
  assert.equal(inbox.lastMessage.direction, "outbound");
  assert.equal(inbox.lastMessage.textContent, message.textContent);
  assert.equal(inbox.contact.phoneNumber, message.recipientPhoneNumber);
});

test("late echoes cannot replace a newer preview or change assignment, status and unread count", async () => {
  await pool.query("UPDATE conversations SET unread_count = 3, status = 'agent_active', assigned_external_user_id = 'verified-agent'");
  const newer = { ...message, providerMessageId: "wamid.echo-newer", occurredAt: "2026-09-09T08:10:00.000Z", textContent: "חדש" };
  await repository.record(scope, newer);
  const beforeLate = (await pool.query("SELECT * FROM conversations")).rows[0];
  await repository.record(scope, { ...message, providerMessageId: "wamid.echo-older", occurredAt: "2026-09-09T07:50:00.000Z" });
  const afterLate = (await pool.query("SELECT * FROM conversations")).rows[0];
  assert.deepEqual(afterLate, beforeLate);
  assert.equal(afterLate.unread_count, 3);
  assert.equal(afterLate.status, "agent_active");
  assert.equal(afterLate.assigned_external_user_id, "verified-agent");
});

test("same timestamp resolves to the same preview irrespective of arrival order", async () => {
  const occurredAt = "2026-09-09T08:20:00.000Z";
  for (const id of ["wamid.tie-z", "wamid.tie-a"]) await repository.record(scope, { ...message, providerMessageId: id, occurredAt });
  const latest = (await pool.query("SELECT message_key FROM messages WHERE occurred_at = $1 ORDER BY message_key DESC LIMIT 1", [occurredAt])).rows[0].message_key;
  assert.equal((await pool.query("SELECT last_message_key FROM conversations")).rows[0].last_message_key, latest);
});

test("conflicting content or recipient rolls back contact and conversation creation", async () => {
  const beforeCounts = (await pool.query("SELECT (SELECT count(*) FROM contacts) AS contacts, (SELECT count(*) FROM conversations) AS conversations, (SELECT count(*) FROM messages) AS messages")).rows[0];
  for (const changed of [{ ...message, textContent: "changed" }, { ...message, recipientPhoneNumber: "+16505559999" }]) {
    await assert.rejects(repository.record(scope, changed), (error) => error.safeCode === "MESSAGE_ECHO_IDENTITY_CONFLICT");
  }
  assert.deepEqual((await pool.query("SELECT (SELECT count(*) FROM contacts) AS contacts, (SELECT count(*) FROM conversations) AS conversations, (SELECT count(*) FROM messages) AS messages")).rows[0], beforeCounts);
});

test("duplicate echoes preserve a delivery status that advanced after the original echo", async () => {
  await pool.query("UPDATE messages SET status = 'read' WHERE provider_message_id = $1", [message.providerMessageId]);
  assert.deepEqual(await repository.record(scope, message), { outcome: "duplicate" });
  assert.equal((await pool.query("SELECT status FROM messages WHERE provider_message_id = $1", [message.providerMessageId])).rows[0].status, "read");
});

test("changed connection version, foreign tenant and revoked connection fail before contact writes", async () => {
  const candidate = { ...message, providerMessageId: "wamid.blocked", recipientPhoneNumber: "+16505558888" };
  for (const changed of [{ ...scope, connectionVersion: 1 }, { ...scope, tenantId: 8 }, { ...scope, phoneNumberId: "foreign" }]) {
    await assert.rejects(repository.record(changed, candidate), (error) => error.safeCode === "MESSAGE_ECHO_CONNECTION_CHANGED");
  }
  assert.equal(await meta.revokeConnection(7, scope.wabaId, scope.connectionVersion), true);
  await assert.rejects(repository.record(scope, candidate), (error) => error.safeCode === "MESSAGE_ECHO_CONNECTION_CHANGED");
  const pending = await meta.saveAssetSnapshot({ tenantId: 7, businessPortfolioId: "100001", wabaId: "200002", phoneNumberId: "300003" });
  scope.connectionVersion = (await meta.markConnectionConnected(7, pending.version)).version;
  assert.equal((await pool.query("SELECT * FROM contacts WHERE phone_e164 = $1", [candidate.recipientPhoneNumber])).rowCount, 0);
});

test("failure after message insert rolls back all new data and a retry can succeed", async () => {
  const broken = createPostgresMetaMessageEchoRepository({ transaction(options, execute) {
    return transactions.transaction(options, (tx) => execute({ query(sql, args) {
      if (sql === postgresMetaMessageEchoSql.updateConversation) throw new Error("injected preview failure");
      return tx.query(sql, args);
    } }));
  } });
  const candidate = { ...message, providerMessageId: "wamid.rollback", recipientPhoneNumber: "+16505557777" };
  await assert.rejects(broken.record(scope, candidate));
  assert.equal((await pool.query("SELECT * FROM contacts WHERE phone_e164 = $1", [candidate.recipientPhoneNumber])).rowCount, 0);
  assert.equal((await pool.query("SELECT * FROM messages WHERE provider_message_id = $1", [candidate.providerMessageId])).rowCount, 0);
  assert.deepEqual(await repository.record(scope, candidate), { outcome: "created" });
});

function edited(original, eventId, textContent = "תוכן ערוך", occurredAt = "2026-09-09T09:01:00.000Z") {
  const identity = { ...original }; delete identity.originalCaption;
  return { ...identity, providerMessageId: eventId, contentKind: "text", textContent, occurredAt,
    mutation: { kind: "edit", originalProviderMessageId: original.providerMessageId } };
}
function deleted(original, eventId) {
  const identity = { ...original }; delete identity.originalCaption;
  return { ...identity, providerMessageId: eventId, contentKind: "unsupported", textContent: null, occurredAt: "2026-09-09T09:02:00.000Z",
    mutation: { kind: "revoke", originalProviderMessageId: original.providerMessageId } };
}
async function storedMessage(providerId) {
  return (await pool.query("SELECT * FROM messages WHERE tenant_id = 7 AND provider_message_id = $1", [providerId])).rows[0];
}

test("text editing reaches thread and preview without changing message order, delivery state or unread", async () => {
  const original = { ...message, providerMessageId: "wamid.edit-existing", occurredAt: "2026-09-09T09:00:00.000Z" };
  await repository.record(scope, original);
  await pool.query("UPDATE messages SET status = 'read' WHERE provider_message_id = $1", [original.providerMessageId]);
  const before = await storedMessage(original.providerMessageId);
  const beforeConversation = (await pool.query("SELECT * FROM conversations WHERE conversation_key = $1", [before.conversation_key])).rows[0];
  assert.deepEqual(await repository.record(scope, edited(original, "wamid.edit-event-1")), { outcome: "updated" });
  const after = await storedMessage(original.providerMessageId);
  assert.equal(after.content_state, "edited");
  assert.equal(after.text_content, "תוכן ערוך");
  assert.equal(after.status, "read");
  assert.deepEqual(after.occurred_at, before.occurred_at);
  const view = await conversations.findByKey(7, after.conversation_key);
  assert.equal(view.lastMessage.contentState, "edited");
  assert.equal(view.lastMessage.textContent, "תוכן ערוך");
  assert.equal(view.unreadCount, beforeConversation.unread_count);
  assert.equal(view.assignedExternalUserId, beforeConversation.assigned_external_user_id);
  assert.equal(view.status, beforeConversation.status);
  const thread = await conversations.listMessagesByConversation(7, after.conversation_key, 100);
  assert.equal(thread.find((entry) => entry.providerMessageId === original.providerMessageId).contentState, "edited");
});

test("every ordering of original, edit and delete converges to a tombstone that no replay can restore", async () => {
  const orders = [[0,1,2], [0,2,1], [1,0,2], [1,2,0], [2,0,1], [2,1,0]];
  for (const [index, order] of orders.entries()) {
    const original = { ...message, providerMessageId: `wamid.permutation-${index}`, textContent: "original body that must disappear" };
    const events = [original, edited(original, `wamid.permutation-edit-${index}`), deleted(original, `wamid.permutation-delete-${index}`)];
    if (order[0] !== 0) {
      assert.deepEqual(await repository.record(scope, events[order[0]]), { outcome: "deferred" });
      assert.equal(await storedMessage(original.providerMessageId), undefined);
    } else await repository.record(scope, original);
    for (const position of order.slice(1)) await repository.record(scope, events[position]);
    assert.deepEqual(await repository.record(scope, original), { outcome: "duplicate" });
    await repository.record(scope, edited(original, `wamid.after-delete-${index}`, "must not return", "2026-09-09T10:00:00.000Z"));
    const row = await storedMessage(original.providerMessageId);
    assert.equal(row.content_state, "deleted");
    assert.equal(row.text_content, null);
    assert.equal(row.content_kind, "unsupported");
    assert.equal(row.occurred_at.toISOString(), original.occurredAt);
    const state = (await pool.query("SELECT * FROM meta_message_echo_states WHERE tenant_id = 7 AND provider_message_id = $1", [original.providerMessageId])).rows[0];
    assert.equal(state.edit_text, null);
    assert.match(state.original_digest, /^[0-9a-f]{64}$/);
    const receipts = (await pool.query("SELECT * FROM meta_message_echo_events WHERE tenant_id = 7 AND provider_message_id = $1", [original.providerMessageId])).rows;
    assert.doesNotMatch(JSON.stringify(receipts), /original body|תוכן ערוך|must not return/);
  }
});

test("an edit before its original survives a new repository instance and cannot be overwritten by original replay", async () => {
  const original = { ...message, providerMessageId: "wamid.edit-before-original" };
  const edit = edited(original, "wamid.edit-before-event");
  assert.deepEqual(await repository.record(scope, edit), { outcome: "deferred" });
  const restarted = createPostgresMetaMessageEchoRepository(transactions);
  await restarted.record(scope, original);
  assert.equal((await storedMessage(original.providerMessageId)).text_content, edit.textContent);
  assert.deepEqual(await restarted.record(scope, original), { outcome: "duplicate" });
  await assert.rejects(restarted.record(scope, { ...original, textContent: "forged original" }));
  await assert.rejects(restarted.record(scope, { ...edit, textContent: "same event with different data" }));
});

test("an existing echo without revision state is upgraded without replay restoring its original body", async () => {
  const original = { ...message, providerMessageId: "wamid.legacy-echo" };
  await repository.record(scope, original);
  // Reproduce a pre-0058 echo: its message exists, but no revision state or event receipts do.
  await pool.query("DELETE FROM meta_message_echo_states WHERE tenant_id = 7 AND provider_message_id = $1", [original.providerMessageId]);
  const restarted = createPostgresMetaMessageEchoRepository(transactions);
  const edit = edited(original, "wamid.legacy-edit");
  assert.deepEqual(await restarted.record(scope, edit), { outcome: "updated" });
  await assert.rejects(restarted.record(scope, { ...original, textContent: "changed original" }));
  assert.deepEqual(await restarted.record(scope, original), { outcome: "ignored" });
  assert.equal((await storedMessage(original.providerMessageId)).text_content, edit.textContent);
  assert.deepEqual(await restarted.record(scope, original), { outcome: "duplicate" });
  assert.deepEqual(await restarted.record(scope, deleted(original, "wamid.legacy-delete")), { outcome: "updated" });
  assert.deepEqual(await restarted.record(scope, original), { outcome: "duplicate" });
  assert.equal((await storedMessage(original.providerMessageId)).text_content, null);
});

test("same-second conflicting edits converge under concurrent arrival and require a later edit", async () => {
  for (const index of [0, 1]) {
    const original = { ...message, providerMessageId: `wamid.equal-time-${index}` };
    await repository.record(scope, original);
    const edits = [edited(original, `wamid.equal-a-${index}`, "A"), edited(original, `wamid.equal-b-${index}`, "B")];
    await Promise.all((index === 0 ? edits : edits.toReversed()).map((edit) => repository.record(scope, edit)));
    assert.equal((await storedMessage(original.providerMessageId)).content_state, "conflicted");
    assert.equal((await storedMessage(original.providerMessageId)).text_content, null);
    await repository.record(scope, edited(original, `wamid.stale-${index}`, "old", "2026-09-09T08:59:00.000Z"));
    assert.equal((await storedMessage(original.providerMessageId)).content_state, "conflicted");
    await repository.record(scope, edited(original, `wamid.newer-${index}`, "current", "2026-09-09T09:01:01.000Z"));
    assert.equal((await storedMessage(original.providerMessageId)).text_content, "current");
  }
});

test("an event id cannot target another message, recipient or tenant", async () => {
  const original = { ...message, providerMessageId: "wamid.scoped-edit" };
  await repository.record(scope, original);
  const edit = edited(original, "wamid.scoped-edit-event");
  await repository.record(scope, edit);
  await assert.rejects(repository.record(scope, { ...edit, mutation: { ...edit.mutation, originalProviderMessageId: "wamid.different-target" } }));
  await assert.rejects(repository.record(scope, { ...edit, recipientPhoneNumber: "+16505559999" }));
  await assert.rejects(repository.record({ ...scope, tenantId: 8 }, edit));
  assert.equal((await pool.query("SELECT * FROM meta_message_echo_states WHERE provider_message_id = 'wamid.different-target'")).rowCount, 0);
});

test("projection failure rolls back state and event receipt so retry applies exactly once", async () => {
  const original = { ...message, providerMessageId: "wamid.revision-rollback" };
  await repository.record(scope, original);
  const broken = createPostgresMetaMessageEchoRepository({ transaction(options, execute) {
    return transactions.transaction(options, (tx) => execute({ query(sql, args) {
      if (sql === postgresMetaMessageEchoSql.touchConversation) throw new Error("injected revision failure");
      return tx.query(sql, args);
    } }));
  } });
  const edit = edited(original, "wamid.revision-rollback-event");
  await assert.rejects(broken.record(scope, edit));
  assert.equal((await storedMessage(original.providerMessageId)).content_state, "original");
  assert.equal((await pool.query("SELECT * FROM meta_message_echo_events WHERE provider_message_id = $1", [original.providerMessageId])).rowCount, 1);
  assert.deepEqual(await repository.record(scope, edit), { outcome: "updated" });
  assert.deepEqual(await repository.record(scope, edit), { outcome: "duplicate" });
});

test("messages outside the Business App namespace cannot be edited or deleted", async () => {
  const original = { ...message, providerMessageId: "wamid.foreign-origin" };
  await repository.record(scope, original);
  // A foreign writer cannot acquire Business App provenance merely by sharing a provider id.
  await pool.query("UPDATE messages SET message_key = $1 WHERE provider_message_id = $2", [`message_v1_${"f".repeat(64)}`, original.providerMessageId]);
  for (const event of [edited(original, "wamid.foreign-edit"), deleted(original, "wamid.foreign-delete")]) {
    await assert.rejects(repository.record(scope, event), (error) => error.safeCode === "MESSAGE_ECHO_IDENTITY_CONFLICT");
  }
  assert.equal((await storedMessage(original.providerMessageId)).text_content, original.textContent);
});

test("the database rejects hidden plaintext in tombstones and edited states without text", async () => {
  await assert.rejects(pool.query("UPDATE messages SET content_state = 'deleted' WHERE provider_message_id = 'wamid.edit-existing'"));
  await assert.rejects(pool.query("UPDATE meta_message_echo_states SET content_state = 'edited', edit_at = CURRENT_TIMESTAMP, edit_text = NULL WHERE provider_message_id = 'wamid.edit-existing'"));
});

const syncedContact = { phoneNumber: "+16505551301", action: "add", fullName: "Pablo Morales", firstName: "Pablo", occurredAt: "2026-09-09T08:00:00.000Z" };
const removeContact = (contact, occurredAt = contact.occurredAt) => ({ ...contact, action: "remove", fullName: null, firstName: null, occurredAt });
async function contactState(phoneNumber) {
  return (await pool.query("SELECT * FROM meta_contact_sync_states WHERE tenant_id = 7 AND waba_id = $1 AND phone_number_id = $2 AND contact_phone = $3", [scope.wabaId, scope.phoneNumberId, phoneNumber])).rows[0];
}

test("a signed contact webhook reaches PostgreSQL and the contact DTO without creating conversations or consent", async () => {
  const beforeConversations = (await pool.query("SELECT count(*) FROM conversations")).rows[0].count;
  const beforeConsent = (await pool.query("SELECT count(*) FROM contact_consent_events")).rows[0].count;
  const ingress = createMetaWebhookIngress(meta, createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({
    conversations, templates: {}, contactSync,
    inboundRuntime: { async process() { assert.fail("contact sync must not invoke a bot"); } },
  })), "local-contact-integration-secret");
  const body = new TextEncoder().encode(JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: scope.wabaId, changes: [{
    field: "smb_app_state_sync", value: { messaging_product: "whatsapp", metadata: { phone_number_id: scope.phoneNumberId, display_phone_number: "15550783881" },
      state_sync: [{ type: "contact", action: "add", contact: { phone_number: syncedContact.phoneNumber, full_name: syncedContact.fullName, first_name: syncedContact.firstName },
        metadata: { timestamp: String(Date.parse(syncedContact.occurredAt) / 1000) } }] },
  }] }] }));
  const signature = `sha256=${createHmac("sha256", "local-contact-integration-secret").update(body).digest("hex")}`;
  await ingress.receive(body, signature);
  await ingress.receive(body, signature);
  const contact = await contactReads.findByTenantAndPhone(7, syncedContact.phoneNumber);
  assert.equal(contact.firstName, null);
  assert.equal(contact.whatsappDisplayName, syncedContact.fullName);
  assert.equal(contact.consentStatus, "unknown");
  assert.equal(contact.mailingStatus, "unsubscribed");
  assert.deepEqual(parseRailwayContactRecord(toContactRecord(contact)), toContactRecord(contact));
  assert.equal((await pool.query("SELECT count(*) FROM conversations")).rows[0].count, beforeConversations);
  assert.equal((await pool.query("SELECT count(*) FROM contact_consent_events")).rows[0].count, beforeConsent);
  assert.equal((await pool.query("SELECT * FROM meta_contact_sync_events WHERE contact_phone = $1", [syncedContact.phoneNumber])).rowCount, 1);
});

test("contact edits and removals preserve manual profile, consent and conversation state", async () => {
  await pool.query(`UPDATE contacts SET first_name = 'שם מקומי', last_name = 'קיים', company = 'Local company',
    mailing_status = 'subscribed', consent_status = 'granted', consent_source = 'test-authorized-opt-in',
    consent_recorded_at = '2026-09-09T07:00:00.000Z'::timestamptz WHERE tenant_id = 7 AND phone_e164 = $1`, [syncedContact.phoneNumber]);
  await repository.record(scope, { ...message, providerMessageId: "wamid.contact-profile", recipientPhoneNumber: syncedContact.phoneNumber });
  const before = (await pool.query("SELECT * FROM contacts WHERE tenant_id = 7 AND phone_e164 = $1", [syncedContact.phoneNumber])).rows[0];
  const beforeConversation = (await pool.query("SELECT * FROM conversations WHERE tenant_id = 7 AND contact_id = $1", [before.id])).rows[0];
  await contactSync.record(scope, { ...syncedContact, fullName: "Updated source", occurredAt: "2026-09-09T08:01:00.000Z" });
  const imported = await contactReads.findByTenantAndId(7, Number(before.id));
  assert.equal(imported.whatsappDisplayName, "Updated source");
  assert.equal(contactDisplayName(imported), "שם מקומי קיים");
  await contactSync.record(scope, removeContact(syncedContact, "2026-09-09T08:02:00.000Z"));
  const after = (await pool.query("SELECT * FROM contacts WHERE tenant_id = 7 AND id = $1", [before.id])).rows[0];
  assert.deepEqual(after, before);
  assert.deepEqual((await pool.query("SELECT * FROM conversations WHERE conversation_key = $1", [beforeConversation.conversation_key])).rows[0], beforeConversation);
  assert.equal((await contactReads.findByTenantAndId(7, Number(before.id))).whatsappDisplayName, undefined);
  assert.equal((await contactState(syncedContact.phoneNumber)).full_name, null);
  assert.doesNotMatch(JSON.stringify((await pool.query("SELECT * FROM meta_contact_sync_events WHERE contact_phone = $1", [syncedContact.phoneNumber])).rows), /Pablo|Updated source/);
});

test("contact duplicates and out-of-order additions converge without resurrecting removed source names", async () => {
  const contact = { ...syncedContact, phoneNumber: "+16505551302" };
  const results = await Promise.all(Array.from({ length: 5 }, () => contactSync.record(scope, contact)));
  assert.equal(results.filter((result) => result.outcome === "updated").length, 1);
  assert.equal(results.filter((result) => result.outcome === "duplicate").length, 4);
  const removal = removeContact(contact, "2026-09-09T09:00:00.000Z");
  await contactSync.record(scope, removal);
  await contactSync.record(scope, { ...contact, occurredAt: "2026-09-09T08:30:00.000Z", fullName: "Stale name" });
  assert.equal((await contactState(contact.phoneNumber)).status, "removed");
  assert.equal((await contactReads.findByTenantAndPhone(7, contact.phoneNumber)).whatsappDisplayName, undefined);
  const notYetKnown = { ...contact, phoneNumber: "+16505551303" };
  await contactSync.record(scope, removeContact(notYetKnown, removal.occurredAt));
  await contactSync.record(scope, notYetKnown);
  assert.equal(await contactReads.findByTenantAndPhone(7, notYetKnown.phoneNumber), null);
  const restarted = createPostgresMetaContactSyncRepository(transactions);
  await restarted.record(scope, { ...notYetKnown, occurredAt: "2026-09-09T09:00:01.000Z" });
  assert.equal((await contactReads.findByTenantAndPhone(7, notYetKnown.phoneNumber)).whatsappDisplayName, notYetKnown.fullName);
});

test("same-second contact conflicts hide source names and removal wins in both arrival orders", async () => {
  for (const index of [0, 1]) {
    const contact = { ...syncedContact, phoneNumber: `+1650555131${index}` };
    const edits = [contact, { ...contact, fullName: "Conflicting source" }];
    await Promise.all((index === 0 ? edits : edits.toReversed()).map((change) => contactSync.record(scope, change)));
    assert.equal((await contactState(contact.phoneNumber)).status, "conflicted");
    assert.equal((await contactReads.findByTenantAndPhone(7, contact.phoneNumber)).whatsappDisplayName, undefined);
    await contactSync.record(scope, { ...contact, occurredAt: "2026-09-09T08:00:01.000Z" });
    assert.equal((await contactReads.findByTenantAndPhone(7, contact.phoneNumber)).whatsappDisplayName, contact.fullName);
    const removed = { ...contact, phoneNumber: `+1650555132${index}` };
    for (const change of index === 0 ? [removed, removeContact(removed)] : [removeContact(removed), removed]) await contactSync.record(scope, change);
    assert.equal((await contactState(removed.phoneNumber)).status, "removed");
  }
});

test("contact sync rolls back the source state and receipt when contact creation fails", async () => {
  const contact = { ...syncedContact, phoneNumber: "+16505551330" };
  const failing = createPostgresMetaContactSyncRepository({
    transaction: (options, operation) => transactions.transaction(options, (tx) => operation({
      query(sql, parameters) {
        if (sql === postgresMetaContactSyncSql.ensureContact) throw new Error("injected contact creation failure");
        return tx.query(sql, parameters);
      },
    })),
  });
  await assert.rejects(failing.record(scope, contact));
  assert.equal(await contactState(contact.phoneNumber), undefined);
  assert.equal((await pool.query("SELECT * FROM meta_contact_sync_events WHERE contact_phone = $1", [contact.phoneNumber])).rowCount, 0);
  assert.deepEqual(await contactSync.record(scope, contact), { outcome: "updated" });
  assert.deepEqual(await contactSync.record(scope, contact), { outcome: "duplicate" });
});

test("contact synchronization is tenant, asset and connection-version scoped", async () => {
  const contact = { ...syncedContact, phoneNumber: "+16505551340" };
  for (const invalid of [{ ...scope, tenantId: 8 }, { ...scope, phoneNumberId: "999999" }, { ...scope, wabaId: "999999" }, { ...scope, connectionVersion: 1 }]) {
    await assert.rejects(contactSync.record(invalid, contact), (error) => error.safeCode === "CONTACT_SYNC_CONNECTION_CHANGED");
  }
  assert.equal(await contactState(contact.phoneNumber), undefined);
  await pool.query("INSERT INTO meta_contact_sync_states (tenant_id, waba_id, phone_number_id, contact_phone, occurred_at, status, full_name) VALUES (8, '800008', '900009', $1, '2026-09-09T08:00:00.000Z', 'present', 'Other tenant')", [contact.phoneNumber]);
  await contactSync.record(scope, contact);
  assert.equal((await contactReads.findByTenantAndPhone(7, contact.phoneNumber)).whatsappDisplayName, contact.fullName);
  assert.equal(await contactReads.findByTenantAndPhone(8, contact.phoneNumber), null);
});

test("synced names appear in inbox reads and search while disconnected assets supply no names", async () => {
  const contact = { ...syncedContact, phoneNumber: "+16505551350", fullName: "Unique synced name" };
  await contactSync.record(scope, contact);
  await repository.record(scope, { ...message, providerMessageId: "wamid.contact-inbox", recipientPhoneNumber: contact.phoneNumber });
  const row = await storedMessage("wamid.contact-inbox");
  const inbox = await conversations.findByKey(7, row.conversation_key);
  assert.equal(toInboxConversationView(inbox, "test-user").contact.displayName, contact.fullName);
  const found = await conversations.listFilteredByTenant(7, { searchTerm: "Unique synced", status: null, assignment: "all", currentExternalUserId: null }, 100);
  assert.equal(found.some((entry) => entry.conversationKey === row.conversation_key), true);
  const page = await contactReads.listPageByTenant(7, null, 100);
  assert.equal(page.find((entry) => entry.phoneNumber === contact.phoneNumber).whatsappDisplayName, contact.fullName);
  await meta.markConnectionStatus(7, "restricted");
  assert.equal((await contactReads.findByTenantAndPhone(7, contact.phoneNumber)).whatsappDisplayName, undefined);
  await assert.rejects(contactSync.record(scope, { ...contact, fullName: "blocked" }));
  const pending = await meta.saveAssetSnapshot({ tenantId: 7, businessPortfolioId: "100001", wabaId: "200002", phoneNumberId: "300003" });
  scope.connectionVersion = (await meta.markConnectionConnected(7, pending.version)).version;
});

test("contact schema rejects names in removed/conflicted state and foreign receipt bindings", async () => {
  await assert.rejects(pool.query("UPDATE meta_contact_sync_states SET status = 'removed' WHERE tenant_id = 7 AND full_name IS NOT NULL"));
  await assert.rejects(pool.query("UPDATE meta_contact_sync_states SET status = 'conflicted' WHERE tenant_id = 7 AND full_name IS NOT NULL"));
  await assert.rejects(pool.query("INSERT INTO meta_contact_sync_events (tenant_id, event_key, waba_id, phone_number_id, contact_phone) VALUES (8, $1, $2, $3, $4)", ["f".repeat(64), scope.wabaId, scope.phoneNumberId, syncedContact.phoneNumber]));
});

test("media caption edits reach thread and preview, clear content, and preserve delivery and ordering", async () => {
  for (const [index, kind] of ["image", "video", "document"].entries()) {
    const original = { ...message, providerMessageId: `${message.providerMessageId}-${kind}`, contentKind: kind, textContent: null, recipientPhoneNumber: "+16505558888", occurredAt: `2026-09-09T09:00:0${index}.000Z` };
    await repository.record(scope, original);
    await pool.query("UPDATE messages SET status='read' WHERE provider_message_id=$1", [original.providerMessageId]);
    const before = await storedMessage(original.providerMessageId);
    const change = { ...edited(original, `${original.providerMessageId}-edit`), contentKind: kind };
    assert.deepEqual(await repository.record(scope, change), { outcome: "updated" });
    assert.deepEqual(await repository.record(scope, change), { outcome: "duplicate" });
    const row = await storedMessage(original.providerMessageId);
    assert.equal(row.content_kind, kind); assert.equal(row.content_state, "edited"); assert.equal(row.text_content, change.textContent);
    assert.equal(row.status, "read"); assert.deepEqual(row.occurred_at, before.occurred_at);
    const preview = await conversations.findByKey(7, row.conversation_key);
    assert.equal(preview.lastMessage.contentKind, kind); assert.equal(preview.lastMessage.textContent, change.textContent);
    const entries = await conversations.listMessagesByConversation(7, row.conversation_key, 100);
    assert.equal(entries.find(m => m.providerMessageId === original.providerMessageId).textContent, change.textContent);
    await assert.rejects(repository.record(scope, { ...change, providerMessageId: `${original.providerMessageId}-wrong`, contentKind: "text" }));
    await repository.record(scope, { ...change, providerMessageId: `${original.providerMessageId}-clear`, textContent: null, occurredAt: "2026-09-09T09:01:01.000Z" });
    assert.equal((await storedMessage(original.providerMessageId)).text_content, null);
    assert.equal((await storedMessage(original.providerMessageId)).content_state, "edited");
  }
});

test("every ordering of media original, caption and revoke converges without restoring content", async () => {
  const orders = [[0,1,2], [0,2,1], [1,0,2], [1,2,0], [2,0,1], [2,1,0]];
  for (const [index, order] of orders.entries()) {
    const original = { ...message, providerMessageId: `${message.providerMessageId}-caption-order-${index}`, contentKind: "image", textContent: null };
    const change = { ...edited(original, `${original.providerMessageId}-edit`), contentKind: "image" };
    const events = [original, change, deleted(original, `${original.providerMessageId}-delete`)];
    for (const position of order) await createPostgresMetaMessageEchoRepository(transactions).record(scope, events[position]);
    await repository.record(scope, original);
    await repository.record(scope, { ...change, providerMessageId: `${original.providerMessageId}-late`, occurredAt: "2026-09-09T10:00:00.000Z" });
    const row = await storedMessage(original.providerMessageId);
    assert.equal(row.content_kind, "unsupported"); assert.equal(row.content_state, "deleted"); assert.equal(row.text_content, null);
  }
});

test("a deferred media caption survives restart, rejects a different original kind and resolves equal-time conflicts", async () => {
  const original = { ...message, providerMessageId: `${message.providerMessageId}-caption-deferred`, contentKind: "image", textContent: null };
  const change = { ...edited(original, `${original.providerMessageId}-edit`), contentKind: "image" };
  assert.deepEqual(await repository.record(scope, change), { outcome: "deferred" });
  await assert.rejects(repository.record(scope, { ...original, contentKind: "video" }));
  await createPostgresMetaMessageEchoRepository(transactions).record(scope, original);
  assert.equal((await storedMessage(original.providerMessageId)).text_content, change.textContent);
  await Promise.all([repository.record(scope, { ...change, providerMessageId: `${original.providerMessageId}-a`, textContent: "A" }),
    repository.record(scope, { ...change, providerMessageId: `${original.providerMessageId}-b`, textContent: "B" })]);
  assert.equal((await storedMessage(original.providerMessageId)).content_state, "conflicted");
  await repository.record(scope, { ...change, providerMessageId: `${original.providerMessageId}-clear`, textContent: null, occurredAt: "2026-09-09T09:01:01.000Z" });
  const cleared = await storedMessage(original.providerMessageId);
  assert.equal(cleared.content_kind, "image"); assert.equal(cleared.content_state, "edited"); assert.equal(cleared.text_content, null);
});

function originalMedia(kind, suffix, originalCaption = message.textContent) {
  return { ...message, providerMessageId: `${message.providerMessageId}-original-${kind}-${suffix}`,
    contentKind: kind, textContent: null, originalCaption, recipientPhoneNumber: "+16505557777", occurredAt: "2026-09-09T11:00:00.000Z" };
}
function jsonDigest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function legacyEchoIdentity(original) {
  return { recipientPhoneNumber: original.recipientPhoneNumber, providerMessageId: original.providerMessageId,
    contentKind: original.contentKind, textContent: original.textContent, occurredAt: original.occurredAt };
}
async function echoState(original) {
  return (await pool.query("SELECT * FROM meta_message_echo_states WHERE tenant_id=7 AND provider_message_id=$1", [original.providerMessageId])).rows[0];
}
async function echoEvents(original) {
  return (await pool.query("SELECT * FROM meta_message_echo_events WHERE tenant_id=7 AND provider_message_id=$1 ORDER BY event_key", [original.providerMessageId])).rows;
}

test("original captions survive signed webhooks through live PostgreSQL thread and preview reads", async () => {
  const ingress = createMetaWebhookIngress(meta, createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({
    conversations, templates: {}, messageEchoes: repository,
    inboundRuntime: { async process() { assert.fail("outbound echoes must not invoke a bot"); } },
  })), "local-contact-integration-secret");
  const consentBefore = (await pool.query("SELECT * FROM contact_consent_events ORDER BY tenant_id,id")).rows;
  for (const [index, kind] of ["image", "video", "document"].entries()) {
    const original = { ...originalMedia(kind, "signed"), occurredAt: `2026-09-09T11:00:0${index}.000Z` };
    const body = new TextEncoder().encode(JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: scope.wabaId, changes: [{
      field: "smb_message_echoes", value: { messaging_product: "whatsapp", metadata: { phone_number_id: scope.phoneNumberId, display_phone_number: "15550783881" },
        message_echoes: [{ from: "15550783881", to: original.recipientPhoneNumber, id: original.providerMessageId,
          timestamp: String(Date.parse(original.occurredAt) / 1000), type: kind, [kind]: { caption: original.originalCaption } }] },
    }] }] }));
    const signature = `sha256=${createHmac("sha256", "local-contact-integration-secret").update(body).digest("hex")}`;
    await assert.rejects(ingress.receive(body, `sha256=${"0".repeat(64)}`));
    assert.equal(await storedMessage(original.providerMessageId), undefined);
    await ingress.receive(body, signature);
    const row = await storedMessage(original.providerMessageId);
    assert.equal(row.text_content, original.originalCaption); assert.equal(row.content_kind, kind);
    assert.equal(row.direction, "outbound"); assert.equal(row.content_state, "original"); assert.equal(row.status, "sent");
    const view = await conversations.findByKey(7, row.conversation_key);
    assert.equal(view.lastMessage.textContent, original.originalCaption); assert.equal(view.unreadCount, 0);
    const thread = await conversations.listMessagesByConversation(7, row.conversation_key, 100);
    assert.equal(thread.find(m => m.providerMessageId === original.providerMessageId).textContent, original.originalCaption);
    assert.equal(await conversations.findByKey(8, row.conversation_key), null);
    await pool.query("UPDATE messages SET status='read' WHERE message_key=$1", [row.message_key]);
    const before = await storedMessage(original.providerMessageId);
    await ingress.receive(body, signature);
    assert.deepEqual(await repository.record(scope, original), { outcome: "duplicate" });
    assert.deepEqual(await storedMessage(original.providerMessageId), before);
    const state = await echoState(original), events = await echoEvents(original);
    assert.equal(state.original_digest, jsonDigest(legacyEchoIdentity(original)));
    assert.equal(state.original_caption_digest, jsonDigest({ namespace: "message_echo_original_caption_v1", caption: original.originalCaption }));
    assert.equal(events.length, 1); assert.equal(events[0].request_digest, state.original_digest);
  }
  assert.deepEqual((await pool.query("SELECT * FROM contact_consent_events ORDER BY tenant_id,id")).rows, consentBefore);
});

test("original caption identity is serialized across duplicates, conflicts, clearing and restart", async () => {
  for (const caption of [message.textContent, null]) {
    const original = originalMedia("image", caption === null ? "empty" : "concurrent", caption);
    const results = await Promise.all(Array.from({ length: 5 }, () => repository.record(scope, original)));
    assert.equal(results.filter(r => r.outcome === "created").length, 1);
    assert.equal(results.filter(r => r.outcome === "duplicate").length, 4);
    const before = await storedMessage(original.providerMessageId), state = await echoState(original), events = await echoEvents(original);
    const missing = { ...original }; delete missing.originalCaption;
    for (const candidate of [missing, { ...original, originalCaption: caption === null ? message.textContent : null },
      { ...original, originalCaption: "changed" }, { ...original, recipientPhoneNumber: "+16505559999" }, { ...original, contentKind: "video" }]) {
      await assert.rejects(createPostgresMetaMessageEchoRepository(transactions).record(scope, candidate), e => e.safeCode === "MESSAGE_ECHO_IDENTITY_CONFLICT");
    }
    assert.deepEqual(await storedMessage(original.providerMessageId), before);
    assert.deepEqual(await echoState(original), state); assert.deepEqual(await echoEvents(original), events);
    const clear = { ...edited(original, `${original.providerMessageId}-clear`, null, "2026-09-09T11:01:00.000Z"), contentKind: "image" };
    await repository.record(scope, clear);
    await repository.record(scope, original);
    assert.equal((await storedMessage(original.providerMessageId)).text_content, null);
    assert.equal((await echoState(original)).original_caption_digest, state.original_caption_digest);
  }
});

test("legacy original receipts and pre-revision rows are never enriched by an unproven caption replay", async () => {
  for (const kind of ["image", "video", "document"]) for (const preRevision of [false, true]) {
    const original = originalMedia(kind, `legacy-${preRevision}`);
    const legacy = legacyEchoIdentity(original);
    await repository.record(scope, legacy);
    if (preRevision) {
      await pool.query("DELETE FROM meta_message_echo_events WHERE tenant_id=7 AND provider_message_id=$1", [original.providerMessageId]);
      await pool.query("DELETE FROM meta_message_echo_states WHERE tenant_id=7 AND provider_message_id=$1", [original.providerMessageId]);
    }
    const before = await storedMessage(original.providerMessageId), receipts = await echoEvents(original);
    assert.deepEqual(await repository.record(scope, original), { outcome: preRevision ? "ignored" : "duplicate" });
    assert.deepEqual(await storedMessage(original.providerMessageId), before);
    assert.equal((await echoState(original)).original_caption_digest, null);
    if (!preRevision) assert.deepEqual(await echoEvents(original), receipts);
    assert.equal((await echoEvents(original))[0].request_digest, jsonDigest(legacy));
    await repository.record(scope, { ...original, originalCaption: "changed" });
    assert.equal((await storedMessage(original.providerMessageId)).text_content, null);
  }
});

test("competing original captions commit one identity and reject the other without a partial receipt", async () => {
  const original = originalMedia("video", "competing");
  const candidates = [original, { ...original, originalCaption: "changed" }];
  const results = await Promise.allSettled(candidates.map(candidate => repository.record(scope, candidate)));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.filter(r => r.status === "rejected" && r.reason.safeCode === "MESSAGE_ECHO_IDENTITY_CONFLICT").length, 1);
  const accepted = candidates[results.findIndex(r => r.status === "fulfilled")];
  assert.equal((await storedMessage(original.providerMessageId)).text_content, accepted.originalCaption);
  assert.equal((await echoEvents(original)).length, 1);
  assert.deepEqual(await repository.record(scope, accepted), { outcome: "duplicate" });
});

test("caption migration does not widen inbound or unsupported media storage", async () => {
  const original = originalMedia("image", "storage-boundary");
  await repository.record(scope, original);
  const row = await storedMessage(original.providerMessageId);
  for (const update of ["direction='inbound', status='received'", "content_kind='audio'", "content_kind='sticker'",
    "text_content=''", "text_content=' '", "text_content=repeat('A',16385)", "content_state='deleted'"]) {
    await assert.rejects(pool.query(`UPDATE messages SET ${update} WHERE message_key=$1`, [row.message_key]), e => e.code === "23514");
  }
  assert.deepEqual(await storedMessage(original.providerMessageId), row);
});

test("all original-caption, edit and revoke orderings keep deletion final and preserve v1 receipts", async () => {
  const orders = [[0,1,2], [0,2,1], [1,0,2], [1,2,0], [2,0,1], [2,1,0]];
  for (const kind of ["image", "video", "document"]) for (const [index, order] of orders.entries()) {
    const original = originalMedia(kind, `order-${index}`);
    const change = { ...edited(original, `${original.providerMessageId}-edit`, "תוכן ערוך", "2026-09-09T11:01:00.000Z"), contentKind: kind };
    const events = [original, change, deleted(original, `${original.providerMessageId}-delete`)];
    for (const i of order) await createPostgresMetaMessageEchoRepository(transactions).record(scope, events[i]);
    await repository.record(scope, original);
    await repository.record(scope, { ...change, providerMessageId: `${original.providerMessageId}-late`, occurredAt: "2026-09-09T12:00:00.000Z" });
    const row = await storedMessage(original.providerMessageId), state = await echoState(original);
    assert.equal(row.content_kind, "unsupported"); assert.equal(row.content_state, "deleted"); assert.equal(row.text_content, null);
    assert.equal(state.edit_text, null); assert.equal(state.original_digest, jsonDigest(legacyEchoIdentity(original)));
    assert.match(state.original_caption_digest, /^[0-9a-f]{64}$/);
    await assert.rejects(repository.record(scope, { ...original, originalCaption: "changed" }), e => e.safeCode === "MESSAGE_ECHO_IDENTITY_CONFLICT");
  }
});

test("deferred edits, removal and same-time conflicts never expose the arriving original caption", async () => {
  for (const kind of ["image", "video", "document"]) for (const mode of ["edited", "clear", "conflicted"]) {
    const original = originalMedia(kind, `deferred-${mode}`);
    const change = { ...edited(original, `${original.providerMessageId}-edit`, mode === "clear" ? null : "תוכן ערוך", "2026-09-09T11:01:00.000Z"), contentKind: kind };
    await repository.record(scope, change);
    if (mode === "conflicted") await repository.record(scope, { ...change, providerMessageId: `${original.providerMessageId}-conflict`, textContent: "changed" });
    await repository.record(scope, original);
    const row = await storedMessage(original.providerMessageId);
    assert.equal(row.content_state, mode === "conflicted" ? "conflicted" : "edited");
    assert.equal(row.text_content, mode === "edited" ? change.textContent : null);
    assert.match((await echoState(original)).original_caption_digest, /^[0-9a-f]{64}$/);
  }
});

test("original caption writes roll back all state and receipts on projection failure", async () => {
  const original = originalMedia("document", "rollback");
  const broken = createPostgresMetaMessageEchoRepository({ transaction(options, body) {
    return transactions.transaction(options, tx => body({ async query(sql, parameters) {
      const result = await tx.query(sql, parameters);
      if (sql === postgresMetaMessageEchoSql.insertMessage) throw new Error("test-only projection failure");
      return result;
    } }));
  } });
  await assert.rejects(broken.record(scope, original));
  assert.equal(await storedMessage(original.providerMessageId), undefined);
  assert.equal(await echoState(original), undefined); assert.deepEqual(await echoEvents(original), []);
  assert.deepEqual(await repository.record(scope, original), { outcome: "created" });
  assert.equal((await storedMessage(original.providerMessageId)).text_content, original.originalCaption);
});

test("a concurrent revocation commits before waiting echo/contact writes and both are rejected", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(postgresMetaSql.revokeConnection, [7, scope.wabaId, scope.connectionVersion]);
    const echo = repository.record(scope, { ...message, providerMessageId: "wamid.revocation-race" });
    const rejected = assert.rejects(echo, (error) => error.safeCode === "MESSAGE_ECHO_CONNECTION_CHANGED");
    const contactRejected = assert.rejects(contactSync.record(scope, { ...syncedContact, phoneNumber: "+16505551360" }),
      (error) => error.safeCode === "CONTACT_SYNC_CONNECTION_CHANGED");
    await client.query("COMMIT");
    await rejected;
    await contactRejected;
    assert.equal(await contactState("+16505551360"), undefined);
    assert.equal((await pool.query("SELECT * FROM messages WHERE provider_message_id = 'wamid.revocation-race'")).rowCount, 0);
  } finally { client.release(); }
});
