import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import pg from "pg";
import { createNodePostgresTransactionManager, createNodePostgresQueryExecutor } from "../../server/platform/nodePostgresAdapter.ts";
import { createPostgresMetaHistorySyncRepository, postgresMetaHistorySyncSql } from "../../server/platform/postgresMetaHistorySyncRepository.ts";
import { createPostgresMetaDataSyncRepository } from "../../server/platform/postgresMetaDataSyncRepository.ts";
import { createPostgresMetaRepository, postgresMetaSql } from "../../server/platform/postgresMetaRepository.ts";
import { parseMetaHistorySync } from "../../server/meta/metaHistorySync.ts";
import { createMetaWebhookIngress } from "../../server/meta/metaWebhookIngress.ts";
import { createMetaWebhookEventDispatcher } from "../../server/meta/metaWebhookEventDispatcher.ts";
import { createMetaWebhookBusinessBatchProcessor } from "../../server/meta/metaWebhookBusinessProcessor.ts";
import { createMetaWebhookQueueConsumer } from "../../server/meta/metaWebhookQueueConsumer.ts";
import { createMetaWebhookQueueMessage, MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES } from "../../server/meta/metaWebhookQueueMessage.ts";
import { customerPhone, message, chunk, value, mediaValue, declinedValue, payload } from "../fixtures/meta-history.mjs";

const connectionString = process.env.CONNECT_META_HISTORY_TEST_URL;
if (connectionString !== "postgresql://connect_echo_test@127.0.0.1:55439/connect_meta_history_integration") {
  throw new Error("A dedicated local history database is required; DATABASE_URL is never used");
}
const pool = new pg.Pool({ connectionString, max: 6, connectionTimeoutMillis: 2000, statement_timeout: 5000, lock_timeout: 3000 });
const transactions = createNodePostgresTransactionManager(pool);
const meta = createPostgresMetaRepository({ transactions, queries: createNodePostgresQueryExecutor(pool) });
const requests = createPostgresMetaDataSyncRepository(transactions);
const repository = createPostgresMetaHistorySyncRepository(transactions);
const secret = "history-postgres-test-secret";
let tenantIdCounter = 30;
before(async () => {
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname = 'public'")).rowCount, 0, "Refusing to change a non-empty database");
  const directory = new URL("../../postgres/migrations/", import.meta.url);
  for (const filename of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) await pool.query(await readFile(new URL(filename, directory), "utf8"));
});
after(async () => { await pool.end(); });
async function newCase({ dispatch = true } = {}) {
  const tenantId = ++tenantIdCounter;
  const session = { tenantId, externalUserId: `history-test-${tenantId}`, role: "owner", status: "active", displayName: "History integration" };
  await pool.query("INSERT INTO tenants (id, display_name, status) VALUES ($1, 'History integration', 'active')", [tenantId]);
  await requests.begin(session);
  const assets = { tenantId, businessPortfolioId: `1000${tenantId}`, wabaId: `2000${tenantId}`, phoneNumberId: `3000${tenantId}` };
  const pending = await meta.saveAssetSnapshot(assets);
  const connection = await meta.markConnectionConnected(tenantId, pending.version);
  await requests.prepare(session, connection.version);
  const contactClaim = await requests.claim(await requests.read(tenantId, "smb_app_state_sync"));
  await requests.finish(contactClaim.request, { status: "accepted", requestId: `contacts-${tenantId}` });
  if (dispatch) await requests.claim(await requests.read(tenantId, "history"));
  return { session, scope: { tenantId, wabaId: assets.wabaId, phoneNumberId: assets.phoneNumberId, connectionVersion: connection.version }, connection };
}
function parts(f, v = value()) {
  const copy = structuredClone(v); copy.metadata.phone_number_id = f.scope.phoneNumberId;
  return parseMetaHistorySync({ kind: "history", value: copy }, f.scope.phoneNumberId);
}
async function capture(f, v = value(), selected = repository) {
  const result = [];
  for (const item of parts(f, v)) result.push(await selected.record(f.scope, item));
  return result;
}
async function state(f) { return (await pool.query("SELECT * FROM meta_history_sync_sessions WHERE tenant_id = $1", [f.scope.tenantId])).rows[0]; }
async function counts(f) {
  return (await pool.query(`SELECT
    (SELECT count(*) FROM meta_history_sync_sessions WHERE tenant_id=$1) AS sessions,
    (SELECT count(*) FROM meta_history_sync_events WHERE tenant_id=$1) AS events,
    (SELECT count(*) FROM meta_history_sync_chunks WHERE tenant_id=$1) AS chunks,
    (SELECT count(*) FROM meta_history_sync_media WHERE tenant_id=$1) AS media,
    (SELECT count(*) FROM contacts WHERE tenant_id=$1) AS contacts,
    (SELECT count(*) FROM conversations WHERE tenant_id=$1) AS conversations,
    (SELECT count(*) FROM messages WHERE tenant_id=$1) AS messages,
    (SELECT count(*) FROM contact_consent_events WHERE tenant_id=$1) AS consent`, [f.scope.tenantId])).rows[0];
}
function ingress(selected = repository) {
  return createMetaWebhookIngress(meta, createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({
    conversations: {}, templates: {}, accounts: meta, historySync: selected,
    inboundRuntime: { async process() { assert.fail("History must not invoke automation"); } },
  })), secret);
}
async function signed(f, v, selected = repository) {
  const copy = structuredClone(v); copy.metadata.phone_number_id = f.scope.phoneNumberId;
  const raw = new TextEncoder().encode(JSON.stringify(payload(copy, f.scope.wabaId)));
  return ingress(selected).receive(raw, `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`);
}

test("signed history is captured before POST result persistence without modifying inbox, consent or contacts", async () => {
  const f = await newCase();
  assert.equal((await requests.read(f.scope.tenantId, "history")).status, "dispatching");
  await signed(f, value());
  const c = await counts(f);
  assert.deepEqual(c, { sessions: "1", events: "1", chunks: "1", media: "0", contacts: "0", conversations: "0", messages: "0", consent: "0" });
  const current = await state(f);
  assert.equal(current.sharing_state, "data_received"); assert.equal(current.max_progress, 55);
  assert.equal(Object.hasOwn(current, "completed"), false);
  assert.equal((await pool.query("SELECT status FROM meta_webhook_receipts WHERE tenant_id = $1", [f.scope.tenantId])).rows[0].status, "processed");
});

test("concurrent replay and out-of-order phases retain one chunk and monotonic progress across restart", async () => {
  const f = await newCase();
  const final = value([chunk({ metadata: { phase: 2, chunk_order: 5, progress: 100 } })]);
  const item = parts(f, final)[0];
  const results = await Promise.all(Array.from({ length: 5 }, () => repository.record(f.scope, item)));
  assert.equal(results.filter((r) => r.outcome === "stored").length, 1);
  assert.equal(results.filter((r) => r.outcome === "duplicate").length, 4);
  await capture(f);
  assert.equal((await state(f)).max_progress, 100);
  assert.equal((await counts(f)).chunks, "2");
  assert.deepEqual(await createPostgresMetaHistorySyncRepository(transactions).record(f.scope, item), { outcome: "duplicate" });
  assert.equal((await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 AND action='meta.history.captured'", [f.scope.tenantId])).rowCount, 2);
});

test("same chunk with conflicting content is recorded as a conflict and cannot restore its previous payload", async () => {
  const f = await newCase(); await capture(f);
  const changed = value([chunk({ threads: [{ id: customerPhone, messages: [message({ text: { body: "conflicting text" } })] }] })]);
  assert.deepEqual(await capture(f, changed), [{ outcome: "conflicted" }]);
  const stored = (await pool.query("SELECT * FROM meta_history_sync_chunks WHERE tenant_id=$1", [f.scope.tenantId])).rows[0];
  assert.equal(stored.payload, null); assert.equal(stored.conflicted, true); assert.equal((await state(f)).has_conflict, true);
  assert.deepEqual(await capture(f), [{ outcome: "duplicate" }]);
  assert.equal((await pool.query("SELECT payload FROM meta_history_sync_chunks WHERE tenant_id=$1", [f.scope.tenantId])).rows[0].payload, null);
  await assert.rejects(pool.query("UPDATE meta_history_sync_chunks SET payload='{}', conflicted=FALSE WHERE tenant_id=$1", [f.scope.tenantId]));
});

test("media can precede its chunk while preserving the separate reported sender and device timestamp", async () => {
  const f = await newCase(); await signed(f, mediaValue());
  const placeholder = message({ id: "wamid.history-media", type: "media_placeholder", text: undefined, history_context: { status: "PLAYED" } });
  await signed(f, value([chunk({ threads: [{ id: customerPhone, messages: [placeholder] }] })]));
  const media = (await pool.query("SELECT payload FROM meta_history_sync_media WHERE tenant_id=$1", [f.scope.tenantId])).rows[0].payload;
  const history = (await pool.query("SELECT payload FROM meta_history_sync_chunks WHERE tenant_id=$1", [f.scope.tenantId])).rows[0].payload;
  assert.equal(history.messages[0].content, null); assert.equal(history.messages[0].direction, "outbound");
  assert.equal(media.reportedSender, `+${customerPhone}`); assert.notEqual(media.reportedAt, history.messages[0].occurredAt);
  assert.equal(media.content.id, "24230790383178626"); assert.equal((await counts(f)).messages, "0");
});

test("conflicting media references are quarantined without downloading or replacing content", async () => {
  const f = await newCase(); await capture(f, mediaValue());
  const changed = mediaValue(); changed.messages[0].image.id = "24230790383178627";
  assert.deepEqual(await capture(f, changed), [{ outcome: "conflicted" }]);
  const media = (await pool.query("SELECT * FROM meta_history_sync_media WHERE tenant_id=$1", [f.scope.tenantId])).rows[0];
  assert.equal(media.payload, null); assert.equal(media.conflicted, true); assert.equal((await state(f)).has_conflict, true);
});

test("refusal before data is terminal and later chunks/media keep no payload", async () => {
  const f = await newCase(); await signed(f, declinedValue());
  assert.deepEqual(await capture(f), [{ outcome: "discarded" }]);
  assert.deepEqual(await capture(f, mediaValue()), [{ outcome: "discarded" }]);
  assert.equal((await state(f)).sharing_state, "declined");
  assert.equal((await pool.query("SELECT * FROM meta_history_sync_chunks WHERE tenant_id=$1 AND payload IS NOT NULL", [f.scope.tenantId])).rowCount, 0);
  assert.equal((await pool.query("SELECT * FROM meta_history_sync_media WHERE tenant_id=$1 AND payload IS NOT NULL", [f.scope.tenantId])).rowCount, 0);
  await assert.rejects(pool.query("UPDATE meta_history_sync_sessions SET sharing_state='data_received' WHERE tenant_id=$1", [f.scope.tenantId]));
});

test("refusal after data redacts all captured content atomically and replay cannot resurrect it", async () => {
  const f = await newCase(); await capture(f); await capture(f, mediaValue());
  await signed(f, declinedValue());
  const contents = (await pool.query("SELECT payload FROM meta_history_sync_chunks WHERE tenant_id=$1 UNION ALL SELECT payload FROM meta_history_sync_media WHERE tenant_id=$1", [f.scope.tenantId])).rows;
  assert.ok(contents.every((row) => row.payload === null));
  assert.deepEqual(await capture(f), [{ outcome: "duplicate" }]);
  const audits = (await pool.query("SELECT metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.history.captured'", [f.scope.tenantId])).rows;
  assert.doesNotMatch(JSON.stringify(audits), /history fixture|16505551234|24230790383178626|provider history sharing refusal/);
  assert.equal((await counts(f)).consent, "0");
});

test("failed audit rolls back session, receipt, payload and progress before retry", async () => {
  const f = await newCase();
  const failing = createPostgresMetaHistorySyncRepository({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(sql, params) {
    if (sql === postgresMetaHistorySyncSql.audit) throw new Error("audit unavailable");
    return tx.query(sql, params);
  } })) });
  await assert.rejects(capture(f, value(), failing));
  assert.equal((await counts(f)).sessions, "0"); assert.equal((await counts(f)).events, "0");
  assert.deepEqual(await capture(f), [{ outcome: "stored" }]);
  await assert.rejects(capture(f, declinedValue(), failing));
  assert.equal((await state(f)).sharing_state, "data_received");
  assert.notEqual((await pool.query("SELECT payload FROM meta_history_sync_chunks WHERE tenant_id=$1", [f.scope.tenantId])).rows[0].payload, null);
});

test("an ambiguous commit remains deduplicated when the repository restarts", async () => {
  const f = await newCase();
  const ambiguous = createPostgresMetaHistorySyncRepository({ async transaction(options, work) {
    await transactions.transaction(options, work); throw new Error("connection lost after commit");
  } });
  await assert.rejects(capture(f, value(), ambiguous));
  assert.deepEqual(await capture(f), [{ outcome: "duplicate" }]);
  assert.equal((await counts(f)).events, "1");
});

test("prepared/rejected requests, changed versions and foreign tenants/assets cannot capture data", async () => {
  const f = await newCase({ dispatch: false });
  await assert.rejects(capture(f), (e) => e.safeCode === "HISTORY_SYNC_REQUEST_NOT_DISPATCHED");
  const claim = await requests.claim(await requests.read(f.scope.tenantId, "history"));
  await requests.finish(claim.request, { status: "rejected", requestId: null });
  await assert.rejects(capture(f), (e) => e.safeCode === "HISTORY_SYNC_REQUEST_NOT_DISPATCHED");
  const allowed = await newCase(); const item = parts(allowed)[0];
  for (const scope of [{ ...allowed.scope, tenantId: f.scope.tenantId }, { ...allowed.scope, connectionVersion: 1 }, { ...allowed.scope, phoneNumberId: "foreign" }]) {
    await assert.rejects(repository.record(scope, item), (e) => e.safeCode === "HISTORY_SYNC_CONNECTION_CHANGED");
  }
  await meta.revokeConnection(allowed.scope.tenantId, allowed.scope.wabaId, allowed.scope.connectionVersion);
  await assert.rejects(capture(allowed), (e) => e.safeCode === "HISTORY_SYNC_CONNECTION_CHANGED");
});

test("unknown provider request results admit late history while no request outcome is rewritten", async () => {
  const f = await newCase();
  await requests.finish(await requests.read(f.scope.tenantId, "history"), { status: "unknown", requestId: null });
  await signed(f, value());
  assert.equal((await requests.read(f.scope.tenantId, "history")).status, "unknown");
  assert.equal((await state(f)).sharing_state, "data_received");
});

test("a large signed history batch crosses the Railway consumer boundary with no inbound effects", async () => {
  const f = await newCase();
  const messages = Array.from({ length: 1500 }, (_, index) => message({ id: `wamid.large.${index}` }));
  const raw = new TextEncoder().encode(JSON.stringify(payload(value([chunk({ threads: [{ id: customerPhone, messages }] })], f.scope.phoneNumberId), f.scope.wabaId)));
  assert.ok(raw.byteLength > 120000 && raw.byteLength < MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES);
  const signature = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const consumer = createMetaWebhookQueueConsumer(ingress(), MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES);
  let acked = false;
  const result = await consumer.handle({ messages: [{ body: createMetaWebhookQueueMessage(raw, signature), ack() { acked = true; }, retry() { assert.fail("history retried"); } }] });
  assert.equal(acked, true); assert.equal(result.processed, 1);
  const stored = (await pool.query("SELECT payload FROM meta_history_sync_chunks WHERE tenant_id=$1", [f.scope.tenantId])).rows[0].payload;
  assert.equal(stored.messages.length, 1500); assert.equal((await counts(f)).messages, "0");
});

test("schema prevents cross-request binding and lowering progress, changing identity or resetting receipts", async () => {
  const f = await newCase(); await capture(f);
  await assert.rejects(pool.query("UPDATE meta_history_sync_sessions SET max_progress=1 WHERE tenant_id=$1", [f.scope.tenantId]));
  await assert.rejects(pool.query("UPDATE meta_history_sync_sessions SET connection_version=connection_version+1 WHERE tenant_id=$1", [f.scope.tenantId]));
  await assert.rejects(pool.query("DELETE FROM meta_history_sync_sessions WHERE tenant_id=$1", [f.scope.tenantId]));
  await assert.rejects(pool.query("DELETE FROM meta_history_sync_events WHERE tenant_id=$1", [f.scope.tenantId]));
  await assert.rejects(pool.query("UPDATE meta_history_sync_chunks SET phase=2 WHERE tenant_id=$1", [f.scope.tenantId]));
  const other = await newCase();
  await assert.rejects(pool.query("INSERT INTO meta_history_sync_sessions (tenant_id,waba_id,phone_number_id,connection_version,started_at) SELECT $1,waba_id,phone_number_id,connection_version,started_at FROM meta_history_sync_sessions WHERE tenant_id=$2", [other.scope.tenantId, f.scope.tenantId]));
});

test("revocation committed while a history write waits prevents all history persistence", async () => {
  const f = await newCase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(postgresMetaSql.revokeConnection, [f.scope.tenantId, f.scope.wabaId, f.scope.connectionVersion]);
    const rejected = assert.rejects(capture(f), (error) => error.safeCode === "HISTORY_SYNC_CONNECTION_CHANGED");
    await client.query("COMMIT"); await rejected;
    assert.equal((await counts(f)).sessions, "0"); assert.equal((await counts(f)).events, "0");
  } finally { client.release(); }
});

test("refusal racing with chunk capture converges to redacted data in either lock order", async () => {
  const f = await newCase();
  await Promise.all([capture(f), capture(f, declinedValue()), capture(f, mediaValue())]);
  assert.equal((await state(f)).sharing_state, "declined");
  assert.equal((await pool.query("SELECT * FROM meta_history_sync_chunks WHERE tenant_id=$1 AND payload IS NOT NULL", [f.scope.tenantId])).rowCount, 0);
  assert.equal((await pool.query("SELECT * FROM meta_history_sync_media WHERE tenant_id=$1 AND payload IS NOT NULL", [f.scope.tenantId])).rowCount, 0);
});

test("a late POST rejection prevents data but cannot block refusal redaction of previously captured content", async () => {
  const f = await newCase(); await capture(f);
  await requests.finish(await requests.read(f.scope.tenantId, "history"), { status: "rejected", requestId: null });
  await assert.rejects(capture(f, mediaValue()), (error) => error.safeCode === "HISTORY_SYNC_REQUEST_NOT_DISPATCHED");
  await signed(f, declinedValue());
  assert.equal((await state(f)).sharing_state, "declined");
  assert.equal((await pool.query("SELECT payload FROM meta_history_sync_chunks WHERE tenant_id=$1", [f.scope.tenantId])).rows[0].payload, null);
  assert.equal((await requests.read(f.scope.tenantId, "history")).status, "rejected");
});
