import { bindPaidFixture } from '../fixtures/paid-access-postgres.mjs';
import { createPostgresWhatsappCampaignDeliveryPolicyRepository } from "../../server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts";
import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { applyPostgresMigrations, requireLocalStartupRehearsalUrl } from "../../scripts/verify-railway-api-startup.mjs";
import { createNodePostgresQueryExecutor, createNodePostgresTransactionManager } from "../../server/platform/nodePostgresAdapter.ts";
import { createPostgresManualReplyRepository, ManualReplyError, postgresManualReplySql } from "../../server/platform/postgresManualReplyRepository.ts";
import { postgresRailwayConversationMutationSql } from "../../server/platform/postgresRailwayConversationMutationExecutor.ts";
import { createPostgresConversationRepository } from "../../server/platform/postgresConversationRepository.ts";
import { deriveRailwayApiDeterministicIdempotencyKey, deriveRailwayApiMutationRequestDigest } from "../../server/platform/railwayApiMutationExecutor.ts";

test("manual reply outbox enforces atomic intent and fenced provider claims on real PostgreSQL", async (t) => {
  const pool = new pg.Pool({ connectionString: requireLocalStartupRehearsalUrl(process.env.CONNECT_POSTGRES_STARTUP_REHEARSAL_URL),
    max: 6, connectionTimeoutMillis: 2_000, statement_timeout: 15_000, query_timeout: 20_000, lock_timeout: 5_000 });
  t.after(() => pool.end());
  const migrations = await applyPostgresMigrations(pool);
  const queries = createNodePostgresQueryExecutor(pool); const transactions = createNodePostgresTransactionManager(pool);
  const replies = createPostgresManualReplyRepository({ queries, transactions });
  const policies = createPostgresWhatsappCampaignDeliveryPolicyRepository({ queries, transactions });
  const conversations = createPostgresConversationRepository({ queries, transactions });
  // Reuse the driver conversation, connection and credential fixtures. Time comes from this isolated database.
  const displayName = "Driver integration tenant"; const externalUserId = "driver-integration-owner";
  const tenantId = Number((await pool.query("INSERT INTO tenants (display_name, status) VALUES ($1, 'active') RETURNING id", [displayName])).rows[0].id);
  const session = { tenantId, externalUserId, displayName, status: "active", role: "owner" };
  const mutate = (sql, values = []) => transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
    await tx.query(postgresManualReplySql.barrier, [tenantId]); return tx.query(sql, values);
  });
  await pool.query("INSERT INTO tenant_memberships (tenant_id, external_user_id, role, status) VALUES ($1, $2, 'owner', 'active'), ($1, 'template-submission-integration-owner', 'owner', 'active')", [tenantId, externalUserId]);
  await pool.query(`INSERT INTO meta_connections (tenant_id, business_portfolio_id, waba_id, phone_number_id, status, webhook_subscribed_at, connected_at)
    VALUES ($1, '100001', '200002', '300003', 'connected', date_trunc('milliseconds', statement_timestamp()), date_trunc('milliseconds', statement_timestamp()))`, [tenantId]);
  await mutate("INSERT INTO meta_credential_envelopes (tenant_id, key_version, initialization_vector, ciphertext) VALUES ($1, 'v1', 'AQIDBAUGBwgJCgsM', 'AQIDBAUGBwgJCgsMDQ4PEA==')", [tenantId]);
  const contact = await conversations.resolveInboundContact(tenantId, "+972509876541");
  const conversationKey = `conversation_v1_${"1".repeat(64)}`; const inboundMessageKey = `message_v1_${"2".repeat(64)}`;
  const inboundOccurredAt = (await pool.query("SELECT date_trunc('milliseconds', statement_timestamp()) AS now")).rows[0].now.toISOString();
  await conversations.recordInboundMessage({ tenantId, conversationKey, messageKey: inboundMessageKey, contactId: contact.contactId,
    providerMessageId: "driver-conversation-inbound-1", contentKind: "text", textContent: "PostgreSQL conversation lifecycle", occurredAt: inboundOccurredAt });
  const reservationKey = `whatsapp_rate_reservation_v1_${"9".repeat(64)}`;
  const providerMessageId = "wamid.bot-reply-provider-17"; // Existing meta-bot-reply fixture.
  const read = async () => (await pool.query("SELECT * FROM manual_reply_outbox ORDER BY delivery_key")).rows;
  const state = async () => ({ replies: await read(), conversations: (await pool.query("SELECT * FROM conversations ORDER BY conversation_key")).rows,
    messages: (await pool.query("SELECT * FROM messages ORDER BY message_key")).rows,
    receipts: (await pool.query("SELECT * FROM railway_api_mutation_receipts ORDER BY idempotency_key")).rows,
    audits: (await pool.query("SELECT * FROM audit_logs ORDER BY id")).rows });
  async function command(overrides = {}) {
    const payload = { conversationKey, expectedVersion: 1, text: "קיבלנו את פנייתך.", ...overrides };
    return { session, payload, idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey("conversations.reply.send", payload),
      requestDigest: await deriveRailwayApiMutationRequestDigest("conversations.reply.send", payload) };
  }
  async function recordPolicy(deliveryState = "enabled") {
    const latest = await policies.findLatestPolicyEvent(tenantId);
    const connectionVersion = (await pool.query("SELECT version FROM meta_connections WHERE tenant_id = $1", [tenantId])).rows[0].version;
    const recordedAt = (await pool.query("SELECT date_trunc('milliseconds', statement_timestamp()) AS now")).rows[0].now.toISOString();
    // Policy values reused from verify-node-postgres-integration.mjs, never presented as live account limits.
    const result = await policies.recordPolicyEvent({ tenantId, connectionVersion, expectedPolicyVersion: latest?.policyVersion ?? 0, deliveryState,
      portfolioLimitKind: "bounded", portfolioLimitValue: 250, phoneThroughputMessagesPerSecond: 20,
      maximumOutboundMessagesPerSecond: 2, reservationDurationSeconds: 300, metaGraphApiVersion: "v21.0", evidenceDigest: "b".repeat(64),
      evidenceCheckedAt: new Date(Date.parse(recordedAt) - 60_000).toISOString(), evidenceExpiresAt: new Date(Date.parse(recordedAt) + 86_400_000).toISOString(),
      actorExternalUserId: "tal-rate-limit-research", recordedAt,
      ...(deliveryState === "disabled" ? { evidenceCheckedAt: latest.evidenceCheckedAt, evidenceExpiresAt: latest.evidenceExpiresAt } : {}) });
    assert.notEqual(result.outcome, "conflict"); return result;
  }
  async function reset() {
    await pool.query("DELETE FROM manual_reply_outbox"); await pool.query("DELETE FROM railway_api_mutation_receipts"); await pool.query("DELETE FROM audit_logs");
    await pool.query("DELETE FROM messages");
    await conversations.recordInboundMessage({ tenantId, conversationKey, messageKey: inboundMessageKey, contactId: contact.contactId,
      providerMessageId: "driver-conversation-inbound-1", contentKind: "text", textContent: "PostgreSQL conversation lifecycle", occurredAt: inboundOccurredAt });
    await pool.query("UPDATE tenant_memberships SET status = 'active', role = 'owner', version = version + 1 WHERE tenant_id = $1 AND (status <> 'active' OR role <> 'owner')", [tenantId]);
    await mutate("UPDATE meta_connections SET status = 'connected' WHERE tenant_id = $1", [tenantId]);
    await pool.query("UPDATE contacts SET consent_status = 'unknown', mailing_status = 'unsubscribed', consent_source = NULL, consent_recorded_at = NULL, consent_withdrawn_at = NULL, version = 1 WHERE tenant_id = $1", [tenantId]);
    await pool.query("UPDATE conversations SET version = 1, status = 'agent_active', assigned_external_user_id = $2, last_message_key = $3, last_message_at = $4 WHERE tenant_id = $1", [tenantId, externalUserId, inboundMessageKey, inboundOccurredAt]);
    await pool.query("UPDATE messages SET occurred_at = $2, status_updated_at = $2 WHERE tenant_id = $1", [tenantId, inboundOccurredAt]);
    await recordPolicy();
  }
  await t.test("concurrent requests save exactly one intent, receipt and audit; a later version cannot bypass pending protection", async () => {
    await reset(); const input = await command(); const results = await Promise.all([replies.enqueue(input), replies.enqueue(input)]);
    assert.deepEqual(results.map((result) => result.replayed).sort(), [false, true]); assert.deepEqual(results[0].submission, results[1].submission);
    const saved = await state(); assert.equal(saved.replies.length, 1); assert.equal(saved.receipts.length, 1); assert.equal(saved.audits.filter((audit) => audit.action === "conversations.reply.send").length, 1);
    assert.equal(saved.conversations[0].version, 2); assert.equal(saved.messages.length, 1); assert.equal(saved.replies[0].provider_message_id, null);
    await assert.rejects(() => command({ expectedVersion: 2 }).then((input) => replies.enqueue(input)), { code: "CONFLICT" });
    assert.deepEqual(await state(), saved);
  });
  await t.test("audit failure rolls back the outbox, conversation version and replay receipt together", async () => {
    await reset(); const before = await state(); let injected = false;
    const failing = createPostgresManualReplyRepository({ queries, transactions: { transaction: (options, run) => transactions.transaction(options,
      (tx) => run({ query: (sql, values) => { if (sql === postgresRailwayConversationMutationSql.insertAudit) { injected = true; return tx.query("SELECT 1 / 0", []); } return tx.query(sql, values); } })) } });
    await assert.rejects(() => command().then((input) => failing.enqueue(input))); assert.equal(injected, true); assert.deepEqual(await state(), before);
  });
  await t.test("assignment, withdrawn consent, stale versions and the closed service window fail before saving", async () => {
    for (const [sql, code] of [
      ["UPDATE conversations SET assigned_external_user_id = NULL", "ASSIGNMENT_REQUIRED"],
      ["UPDATE conversations SET version = 2", "CONFLICT"],
      ["UPDATE contacts SET consent_status = 'withdrawn', consent_source = 'driver-integration', consent_recorded_at = CURRENT_TIMESTAMP, consent_withdrawn_at = CURRENT_TIMESTAMP", "CONTACT_BLOCKED"],
      ["DELETE FROM messages WHERE direction = 'inbound'", "SERVICE_WINDOW_CLOSED"],
    ]) { await reset(); await mutate(sql); const before = await state(); await assert.rejects(() => command().then((input) => replies.enqueue(input)), { code }); assert.deepEqual(await state(), before); }
  });
  await t.test("a revoked actor cannot replay or seal an already saved reply", async () => {
    await reset(); const input = await command(); await replies.enqueue(input); const claim = await replies.claim();
    await pool.query("UPDATE tenant_memberships SET status = 'suspended', version = version + 1 WHERE tenant_id = $1 AND external_user_id = $2", [tenantId, externalUserId]);
    await assert.rejects(() => replies.enqueue(input), { code: "AUTHORIZATION_DENIED" });
    await assert.rejects(() => replies.seal(claim, reservationKey), { code: "AUTHORIZATION_DENIED" });
    assert.equal((await read())[0].state, "preparing");
  });
  await t.test("assignment, contact and connection changes after claim prevent the provider seal", async () => {
    for (const sql of ["UPDATE conversations SET assigned_external_user_id = NULL", "UPDATE contacts SET version = version + 1", "UPDATE meta_connections SET version = version + 1"]) {
      await reset(); await replies.enqueue(await command()); const claim = await replies.claim(); await mutate(sql);
      await assert.rejects(() => replies.seal(claim, reservationKey), ManualReplyError); assert.equal((await read())[0].state, "preparing");
    }
  });
  await t.test("policy disablement or replacement after admission prevents sealing an old reply", async () => {
    for (const state of ["disabled", "enabled"]) {
      await reset(); await replies.enqueue(await command()); const claim = await replies.claim(); if (state === "enabled") await recordPolicy("disabled"); await recordPolicy(state);
      await assert.rejects(() => replies.seal(claim, reservationKey), { code: "DELIVERY_UNAVAILABLE" });
      assert.equal((await read())[0].provider_started_at, null);
    }
  });
  await t.test("expired preparing leases can be reclaimed with a new generation, fencing the old worker", async () => {
    await reset(); await replies.enqueue(await command()); const first = await replies.claim();
    assert.equal(await replies.claim(), null);
    await pool.query("UPDATE manual_reply_outbox SET claim_expires_at = date_trunc('milliseconds', statement_timestamp()) - interval '1 second'");
    const next = await replies.claim(); assert.equal(next.deliveryKey, first.deliveryKey); assert.equal(next.claimVersion, first.claimVersion + 1);
    assert.equal(await replies.seal(first, reservationKey), false); assert.equal(await replies.seal(next, reservationKey), true);
    assert.equal(await replies.claim(), null);
  });
  await t.test("a service window that expires after queue admission still blocks the final seal", async () => {
    await reset(); await replies.enqueue(await command());
    await pool.query("UPDATE manual_reply_outbox SET service_window_expires_at = date_trunc('milliseconds', statement_timestamp()) - interval '1 millisecond'");
    const claim = await replies.claim(); await assert.rejects(() => replies.seal(claim, reservationKey), { code: "SERVICE_WINDOW_CLOSED" });
    assert.equal((await read())[0].provider_started_at, null);
  });
  await t.test("a concurrent membership revocation commits before a waiting send seal and prevents it", async () => {
    await reset(); await replies.enqueue(await command()); const claim = await replies.claim();
    let release; let held;
    const released = new Promise((resolve) => { release = resolve; }); const locked = new Promise((resolve) => { held = resolve; });
    const revoking = transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
      await tx.query("UPDATE tenant_memberships SET status = 'suspended', version = version + 1 WHERE tenant_id = $1 AND external_user_id = $2", [tenantId, externalUserId]);
      held(); await released;
    });
    await locked;
    const sealing = replies.seal(claim, reservationKey);
    let blocked = false;
    try {
      const deadline = Date.now() + 2_000;
      while (Date.now() < deadline) {
        const waiting = await pool.query("SELECT count(*)::integer AS count FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND position('SELECT role FROM tenant_memberships' in query) > 0");
        if (waiting.rows[0].count > 0) { blocked = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally { release(); }
    await revoking; await assert.rejects(() => sealing, { code: "AUTHORIZATION_DENIED" }); assert.equal(blocked, true);
    assert.equal((await read())[0].state, "preparing");
  });
  await t.test("crash after seal becomes unknown, blocks a second intent and is never automatically reclaimed", async () => {
    await reset(); await replies.enqueue(await command()); const claim = await replies.claim(); assert.equal(await replies.seal(claim, reservationKey), true);
    await pool.query("UPDATE manual_reply_outbox SET provider_started_at = date_trunc('milliseconds', statement_timestamp()) - interval '3 minutes'");
    await replies.recover(); assert.equal((await read())[0].state, "unknown"); assert.equal(await replies.claim(), null);
    await assert.rejects(() => command({ expectedVersion: 2 }).then((input) => replies.enqueue(input)), { code: "CONFLICT" });
    assert.equal((await replies.list(tenantId, conversationKey))[0].state, "unknown");
  });
  await t.test("accepted provider truth is projected once, remains writable after revocation and receives delivery status", async () => {
    await reset(); await replies.enqueue(await command()); const claim = await replies.claim(); assert.equal(await replies.seal(claim, reservationKey), true);
    await pool.query("UPDATE tenant_memberships SET status = 'suspended', version = version + 1 WHERE tenant_id = $1 AND external_user_id = $2", [tenantId, externalUserId]);
    await replies.accepted(claim, providerMessageId); const saved = await state(); await replies.accepted(claim, providerMessageId); assert.deepEqual(await state(), saved);
    assert.equal(saved.replies[0].state, "sent"); assert.equal(saved.messages.length, 2); assert.equal(saved.replies[0].provider_message_id, providerMessageId);
    assert.deepEqual(await replies.list(tenantId, conversationKey), []);
    const event = { tenantId, providerMessageId, status: "delivered", statusEventKey: "b".repeat(64), statusEventAt: new Date(Date.now() + 1_000).toISOString() };
    assert.equal((await conversations.applyDeliveryStatus(event)).outcome, "applied");
    assert.equal((await conversations.applyDeliveryStatus(event)).outcome, "duplicate");
    assert.equal((await pool.query("SELECT status FROM messages WHERE provider_message_id = $1", [providerMessageId])).rows[0].status, "delivered");
  });
  await t.test("tenant scope and request digest cannot be supplied by message content", async () => {
    await reset(); const input = await command(); const before = await state();
    await assert.rejects(() => replies.enqueue({ ...input, payload: { ...input.payload, tenantId } }), { code: "INVALID_REQUEST" });
    await assert.rejects(() => replies.enqueue({ ...input, payload: { ...input.payload, text: input.payload.text + "\n" } }), { code: "INVALID_REQUEST" });
    assert.deepEqual(await state(), before);
  });
  await t.test("canceled paid access blocks a queued reply at sealing and billing facts remain readable", async()=>{
    await reset();const paid=await bindPaidFixture(pool,tenantId,externalUserId);const input=await command();await replies.enqueue(input);const claim=await replies.claim();assert.ok(claim);
    await paid.cancel();await assert.rejects(replies.seal(claim,reservationKey),{code:"AUTHORIZATION_DENIED"});
    await assert.rejects(pool.query(postgresManualReplySql.seal,[tenantId,claim.deliveryKey,claim.claimVersion,reservationKey]),{code:"42501"});
    assert.equal((await read())[0].state,"preparing");assert.equal((await read())[0].provider_message_id,null);
    assert.equal((await paid.journal.read(session,'production')).subscription.status,'canceled');
    await assert.rejects(replies.enqueue(input),{code:"AUTHORIZATION_DENIED"});
  });
  assert.equal(pool.totalCount, pool.idleCount);
  t.diagnostic(`Applied ${migrations} migrations on isolated PostgreSQL; existing fixtures only; no provider requests.`);
});
