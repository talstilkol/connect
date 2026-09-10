import { createPostgresMetaMediaCleanupRepository,postgresMetaMediaCleanupSql } from '../../server/platform/postgresMetaMediaCleanupRepository.ts';
import { createMetaMediaCleanupWorker,metaMediaCleanupKey } from '../../server/meta/metaMediaCleanup.ts';
import { createS3MetaMediaCleanupStorage } from '../../server/platform/s3MetaMediaCleanupStorage.ts';
import { createRailwayMetaMediaCleanupRuntime } from '../../server/platform/railwayMetaMediaCleanupRuntime.ts';
import { createRailwayMetaMediaCleanupOperation } from '../../server/platform/railwayMetaMediaCleanupOperation.ts';
import { createPostgresMetaMediaInspectionRetryRepository, postgresMetaMediaInspectionRetrySql } from '../../server/platform/postgresMetaMediaInspectionRetryRepository.ts';
import { metaMediaInspectionRetryKey } from '../../server/meta/metaMediaInspectionRetry.ts';
import { createRailwayMetaMediaInspectionRetryOperation } from '../../server/platform/railwayMetaMediaInspectionRetryOperation.ts';
import { createPostgresMetaMediaFileAuthorization, postgresMetaMediaFileAuthorizationSql } from '../../server/platform/postgresMetaMediaFileAuthorization.ts';
import { createRailwayMetaMediaFileReadRuntime } from '../../server/platform/railwayMetaMediaFileReadRuntime.ts';
import { mediaFileReply } from '../fixtures/meta-media-file-read.mjs';
import { createPostgresMetaMediaTaskReader } from "../../server/platform/postgresMetaMediaTaskReader.ts";
import { createRailwayMetaMediaTaskReadOperation } from "../../server/platform/railwayMetaMediaTaskReadOperation.ts";
import { createRailwayApiHttpHandler } from "../../server/platform/railwayApiHttpHandler.ts";
import {createPostgresMetaMediaTaskRepository,postgresMetaMediaTaskSql} from "../../server/platform/postgresMetaMediaTaskRepository.ts";
import {createRailwayMetaMediaWorkerRuntime} from "../../server/platform/railwayMetaMediaWorkerRuntime.ts";
import { metaMediaUploadObjectKey } from "../../server/meta/metaMediaUploadJournal.ts";
import { createPostgresMetaMediaScanRepository, postgresMetaMediaScanSql } from "../../server/platform/postgresMetaMediaScanRepository.ts";
import { createRailwayMetaMediaInspectionRuntime } from "../../server/platform/railwayMetaMediaInspectionRuntime.ts";
import { inspectionReply } from "../fixtures/meta-media-inspection.mjs";
import { quarantineConfig } from "../fixtures/meta-media-quarantine.mjs";
import { createPostgresMetaMediaUploadJournal, postgresMetaMediaUploadSql } from "../../server/platform/postgresMetaMediaUploadJournal.ts";
import { quarantineEnvironment, s3Reply } from "../fixtures/meta-media-quarantine.mjs";
import assert from "node:assert/strict";
import { before, after, afterEach, test } from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { createHmac, createHash } from "node:crypto";
import pg from "pg";
import { createNodePostgresTransactionManager, createNodePostgresQueryExecutor } from "../../server/platform/nodePostgresAdapter.ts";
import { createPostgresMetaHistorySyncRepository, postgresMetaHistorySyncSql } from "../../server/platform/postgresMetaHistorySyncRepository.ts";
import { createPostgresMetaDataSyncRepository } from "../../server/platform/postgresMetaDataSyncRepository.ts";
import { createPostgresMetaRepository, postgresMetaSql } from "../../server/platform/postgresMetaRepository.ts";
import { parseMetaHistorySync } from "../../server/meta/metaHistorySync.ts";
import { createMetaWebhookIngress } from "../../server/meta/metaWebhookIngress.ts";
import { createMetaWebhookEventDispatcher } from "../../server/meta/metaWebhookEventDispatcher.ts";
import { createMetaWebhookBusinessBatchProcessor } from "../../server/meta/metaWebhookBusinessProcessor.ts";
import { createPostgresMetaHistoryInboxProjector, postgresMetaHistoryInboxSql } from "../../server/platform/postgresMetaHistoryInboxProjector.ts";
import { createPostgresMetaHistoryMediaRepository, postgresMetaHistoryMediaSql } from "../../server/platform/postgresMetaHistoryMediaRepository.ts";
import { createRailwayPostgresWorkerService } from "../../server/platform/railwayPostgresWorkerService.ts";
import { createRailwayMetaHistoryMediaRuntime, createRailwayMetaHistoryMediaQuarantineRuntime } from "../../server/platform/railwayMetaHistoryMediaRuntime.ts";
import { createPostgresMetaCredentialRepository } from "../../server/platform/postgresMetaCredentialRepository.ts";
import { createPostgresTenantMembershipRepository } from "../../server/platform/postgresTenantMembershipRepository.ts";
import { createMetaCredentialVault } from "../../server/meta/metaCredentialVault.ts";
import { createPostgresConversationRepository } from "../../server/platform/postgresConversationRepository.ts";
import { createPostgresMetaMessageEchoRepository } from "../../server/platform/postgresMetaMessageEchoRepository.ts";
import { createPostgresBotReplyStagingServiceWindowSource } from "../../server/platform/postgresBotReplyStagingServiceWindowSource.ts";
import { deriveConversationKey, deriveInboundMessageKey } from "../../server/conversations/conversationKey.ts";
import { toInboxConversationThreadView } from "../../server/conversations/conversationView.ts";
import { parseRailwayConversationThread } from "../../server/conversations/railwayConversationResult.ts";
import { customerPhone, message, chunk, value, mediaValue, declinedValue, payload } from "../fixtures/meta-history.mjs";
import { mediaBytes, mediaSha256, mediaId, metadataResponse, binaryResponse } from "../fixtures/meta-media.mjs";

const connectionString = process.env.CONNECT_META_HISTORY_INBOX_TEST_URL;
if (connectionString !== "postgresql://connect_echo_test@127.0.0.1:55439/connect_meta_inbox_integration") {
  throw new Error("A dedicated local history database is required; DATABASE_URL is never used");
}
const poolOptions = { connectionString, max: 6, connectionTimeoutMillis: 2000, statement_timeout: 5000, lock_timeout: 3000 };
let activePool = new pg.Pool(poolOptions);
const pool = {
  query: (...args) => activePool.query(...args),
  connect: () => activePool.connect(),
  end: () => activePool.end(),
};
const fixtureAdmin = new pg.Client({
  connectionString: "postgresql://connect_echo_test@127.0.0.1:55439/postgres",
  connectionTimeoutMillis: 2000, statement_timeout: 15000,
});
let fixtureTemplateCreated = false;
const transactions = createNodePostgresTransactionManager(pool);
const meta = createPostgresMetaRepository({ transactions, queries: createNodePostgresQueryExecutor(pool) });
const requests = createPostgresMetaDataSyncRepository(transactions);
const repository = createPostgresMetaHistorySyncRepository(transactions);
const projector = createPostgresMetaHistoryInboxProjector(transactions);
const mediaBindings = createPostgresMetaHistoryMediaRepository(transactions);
const uploadJournal = createPostgresMetaMediaUploadJournal(transactions);
const queries = createNodePostgresQueryExecutor(pool);
const mediaCredentials = createPostgresMetaCredentialRepository(queries);
const mediaMemberships = createPostgresTenantMembershipRepository(queries);
const mediaEnvironment = { META_GRAPH_API_VERSION: 'v23.0', META_CREDENTIAL_ENCRYPTION_KEY_V1: Buffer.from(Array.from({ length: 32 }, (_, i) => i + 1)).toString('base64') };
const mediaVault = createMetaCredentialVault(mediaCredentials, mediaEnvironment);
const conversations = createPostgresConversationRepository({ transactions, queries });
const echoes = createPostgresMetaMessageEchoRepository(transactions);
const windows = createPostgresBotReplyStagingServiceWindowSource(queries);
const secret = "history-postgres-test-secret";
let tenantIdCounter = 100;
before(async () => {
  const identity = (await pool.query("SELECT current_database() AS database, current_user AS role")).rows[0];
  assert.deepEqual(identity, { database: "connect_meta_inbox_integration", role: "connect_echo_test" });
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname = 'public'")).rowCount, 0, "Refusing to change a non-empty database");
  await fixtureAdmin.connect();
  assert.equal((await fixtureAdmin.query("SELECT datname FROM pg_database WHERE datname='connect_meta_inbox_fixture_template'")).rowCount, 0, "Refusing to replace an existing fixture template");
  const directory = new URL("../../postgres/migrations/", import.meta.url);
  for (const filename of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) await pool.query(await readFile(new URL(filename, directory), "utf8"));
  await pool.end();
  await fixtureAdmin.query("CREATE DATABASE connect_meta_inbox_fixture_template TEMPLATE connect_meta_inbox_integration");
  fixtureTemplateCreated = true;
  activePool = new pg.Pool(poolOptions);
});
afterEach(async () => {
  // Due-only draining leaves future retries able to enter a later test. Replace
  // this initially empty, dedicated fixture database with its migrated template.
  // All production guards and migration seed rows remain intact; no TRUNCATE or
  // trigger disabling, and no forced disconnection of an unexpected client.
  if (!fixtureTemplateCreated) return;
  await pool.end();
  await fixtureAdmin.query("DROP DATABASE connect_meta_inbox_integration");
  await fixtureAdmin.query("CREATE DATABASE connect_meta_inbox_integration TEMPLATE connect_meta_inbox_fixture_template");
  activePool = new pg.Pool(poolOptions);
});
after(async () => {
  await pool.end();
  try { if (fixtureTemplateCreated) await fixtureAdmin.query("DROP DATABASE connect_meta_inbox_fixture_template"); }
  finally { await fixtureAdmin.end(); }
});
async function newCase({ dispatch = true, withCredential = false } = {}) {
  const tenantId = ++tenantIdCounter;
  const session = { tenantId, externalUserId: `history-test-${tenantId}`, role: "owner", status: "active", displayName: "History integration" };
  await pool.query("INSERT INTO tenants (id, display_name, status) VALUES ($1, 'History integration', 'active')", [tenantId]);
  if (withCredential) await pool.query("INSERT INTO tenant_memberships (tenant_id, external_user_id, role, status) VALUES ($1,$2,'owner','active')", [tenantId, session.externalUserId]);
  await requests.begin(session);
  const assets = { tenantId, businessPortfolioId: `1000${tenantId}`, wabaId: `2000${tenantId}`, phoneNumberId: `3000${tenantId}` };
  const pending = await meta.saveAssetSnapshot(assets);
  if (withCredential) await mediaVault.storeAccessToken(tenantId, `media-token-${tenantId}`, pending.version);
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

async function thread(f) {
  const list = await conversations.listByTenant(f.scope.tenantId, 50);
  assert.equal(list.length, 1);
  const rows = await conversations.listMessagesByConversation(f.scope.tenantId, list[0].conversationKey, 100);
  const view = toInboxConversationThreadView(list[0], rows, f.session.externalUserId);
  assert.deepEqual(parseRailwayConversationThread(view, view.conversation.conversationKey), view);
  return { rows, view, conversation: list[0] };
}
function withMessages(messages, order = 1) {
  return value([chunk({ metadata: { phase: 0, chunk_order: order, progress: 55 }, threads: [{ id: customerPhone, messages }] })]);
}
function original(f, overrides = {}) {
  return { recipientPhoneNumber: `+${customerPhone}`, providerMessageId: 'wamid.history-text', contentKind: 'text',
    textContent: 'history fixture', occurredAt: '2025-02-11T00:00:00.000Z', ...overrides };
}
function edit(f, id = 'wamid.history-edit', body = 'edited history') {
  return { ...original(f), providerMessageId: id, textContent: body, occurredAt: '2026-09-09T09:00:00.000Z',
    mutation: { kind: 'edit', originalProviderMessageId: 'wamid.history-text' } };
}
function revoke(f) {
  return { ...edit(f, 'wamid.history-delete'), contentKind: 'unsupported', textContent: null,
    mutation: { kind: 'revoke', originalProviderMessageId: 'wamid.history-text' } };
}
async function liveInbound(f, providerMessageId, timestamp = '2026-09-09T08:00:00.000Z') {
  const contact = await conversations.resolveInboundContact(f.scope.tenantId, `+${customerPhone}`);
  const conversationKey = await deriveConversationKey(f.scope.tenantId, contact.contactId);
  const { messageKey } = await deriveInboundMessageKey(f.scope.tenantId, { contactId: contact.contactId,
    providerMessageId, contentKind: 'text', textContent: 'live inbound', occurredAt: timestamp });
  await conversations.recordInboundMessage({ tenantId: f.scope.tenantId, contactId: contact.contactId, conversationKey, messageKey,
    providerMessageId, contentKind: 'text', textContent: 'live inbound', occurredAt: timestamp });
  return messageKey;
}
async function drain() {
  for (let i = 0; i < 20; i++) { const next = await projector.projectNext(); if (next.outcome === 'idle') return; }
  assert.fail('Projection did not finish within test bound');
}

test('signed capture projects historical text and media without live messages, consent, unread or service window', async () => {
  const f = await newCase();
  await signed(f, withMessages([message({ from: customerPhone, id: 'wamid.history-inbound' }),
    message({ id: 'wamid.history-media', type: 'media_placeholder', text: undefined, history_context: { status: 'PLAYED' } })]));
  assert.deepEqual(await projector.projectNext(), { outcome: 'projected', processed: 2 });
  const result = await thread(f);
  assert.equal(result.rows.length, 2);
  assert.ok(result.rows.every((m) => m.source === 'history' && m.status === null && m.statusUpdatedAt === null));
  assert.equal(result.rows.find((m) => m.contentKind === 'media_placeholder').historyDeliveryState, 'PLAYED');
  assert.equal(result.conversation.unreadCount, 0); assert.equal(result.conversation.status, 'new');
  const c = await counts(f); assert.equal(c.messages, '0'); assert.equal(c.consent, '0');
  const saved = (await pool.query('SELECT * FROM conversations WHERE tenant_id=$1', [f.scope.tenantId])).rows[0];
  assert.equal(saved.last_message_key, null); assert.equal(saved.last_message_at, null); assert.equal(saved.version, 1);
  await assert.rejects(windows.read({ targetTenantId: f.scope.tenantId, inboundMessageKey: result.rows.find((m) => m.direction === 'inbound').messageKey }), /unavailable/);
  assert.deepEqual(await projector.projectNext(), { outcome: 'idle', processed: 0 });
});

test('durable cursor bounds each transaction to 100 messages and survives concurrent workers and restart', async () => {
  const f = await newCase();
  await capture(f, withMessages(Array.from({ length: 205 }, (_, i) => message({ id: `wamid.history-${String(i).padStart(3, '0')}`, timestamp: String(1739230955 + i) }))));
  assert.deepEqual(await projector.projectNext(), { outcome: 'projected', processed: 100 });
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => createPostgresMetaHistoryInboxProjector(transactions).projectNext()));
  assert.equal(concurrent.reduce((n, r) => n + r.processed, 0), 105);
  assert.equal((await pool.query('SELECT * FROM meta_history_inbox_messages WHERE tenant_id=$1', [f.scope.tenantId])).rowCount, 205);
  assert.equal((await pool.query('SELECT next_index FROM meta_history_inbox_cursors WHERE tenant_id=$1', [f.scope.tenantId])).rows[0].next_index, 205);
  const t = await thread(f); assert.equal(t.rows.length, 100); assert.equal(t.rows[0].providerMessageId, 'wamid.history-105');
  assert.equal(t.rows.at(-1).providerMessageId, 'wamid.history-204');
  assert.deepEqual(await projector.projectNext(), { outcome: 'idle', processed: 0 });
});

test('mixed live/history preserves assignment, unread, consent and live service-window input', async () => {
  const f = await newCase(); const key = await liveInbound(f, 'wamid.live-newer');
  await pool.query("UPDATE conversations SET status='agent_active', assigned_external_user_id='agent-test' WHERE tenant_id=$1", [f.scope.tenantId]);
  const before = (await pool.query('SELECT * FROM conversations WHERE tenant_id=$1', [f.scope.tenantId])).rows[0];
  await capture(f); await drain();
  assert.deepEqual((await pool.query('SELECT * FROM conversations WHERE tenant_id=$1', [f.scope.tenantId])).rows[0], before);
  const t = await thread(f); assert.equal(t.rows.length, 2); assert.equal(t.rows.at(-1).messageKey, key);
  assert.equal(t.view.conversation.lastMessage.textContent, 'live inbound');
  assert.equal((await windows.read({ targetTenantId: f.scope.tenantId, inboundMessageKey: key })).serviceWindowOpenedAt, '2026-09-09T08:00:00.000Z');
  assert.equal((await counts(f)).consent, '0');
});

test('live messages take precedence for the same provider ID before and after history projection', async () => {
  for (const before of [true, false]) {
    const f = await newCase();
    if (before) await echoes.record(f.scope, original(f, { textContent: 'authoritative live copy' }));
    await capture(f); await drain();
    if (!before) await echoes.record(f.scope, original(f, { textContent: 'authoritative live copy' }));
    const t = await thread(f); assert.equal(t.rows.length, 1); assert.equal(t.rows[0].source, undefined);
    assert.equal(t.rows[0].textContent, 'authoritative live copy');
  }
  const f = await newCase(); await capture(f, withMessages([message({ from: customerPhone })])); await drain();
  const key = await liveInbound(f, 'wamid.history-text');
  const t = await thread(f); assert.equal(t.rows.length, 1); assert.equal(t.rows[0].messageKey, key); assert.equal(t.rows[0].status, 'received');
});

test('deferred edits and revokes affect historical content before and after projection and survive original arrival', async () => {
  for (const before of [true, false]) {
    const f = await newCase();
    if (before) await echoes.record(f.scope, edit(f));
    await capture(f); await drain();
    if (!before) await echoes.record(f.scope, edit(f));
    const edited = await thread(f); assert.equal(edited.rows[0].contentState, 'edited'); assert.equal(edited.rows[0].textContent, 'edited history');
    const timestamp = edited.rows[0].occurredAt;
    await echoes.record(f.scope, revoke(f));
    const deleted = await thread(f); assert.equal(deleted.rows[0].contentState, 'deleted'); assert.equal(deleted.rows[0].textContent, null);
    assert.equal(deleted.rows[0].occurredAt, timestamp); assert.equal(deleted.view.conversation.lastMessage.textContent, null);
    await echoes.record(f.scope, original(f));
    const final = await thread(f); assert.equal(final.rows.length, 1); assert.equal(final.rows[0].source, undefined);
    assert.equal(final.rows[0].contentState, 'deleted'); assert.equal(final.rows[0].textContent, null);
  }
});

test('same-time incompatible edits redact historical text and cannot choose an arbitrary winner', async () => {
  const f = await newCase(); await capture(f); await drain();
  await echoes.record(f.scope, edit(f)); await echoes.record(f.scope, edit(f, 'wamid.edit-conflict', 'incompatible'));
  const t = await thread(f); assert.equal(t.rows[0].contentState, 'conflicted'); assert.equal(t.rows[0].textContent, null);
});

test('media caption revisions are visible in historical threads without granting attachment access', async () => {
  for (const beforeProjection of [true, false]) {
    const f = await newCase();
    const caption = { ...edit(f), contentKind: 'image' };
    if (beforeProjection) await echoes.record(f.scope, caption);
    await signed(f, withMessages([message({ type: 'image', text: undefined, image: { caption: 'history fixture' } })]));
    await drain();
    if (!beforeProjection) await echoes.record(f.scope, caption);
    const result = await thread(f);
    assert.equal(result.rows[0].contentKind, 'image'); assert.equal(result.rows[0].contentState, 'edited');
    assert.equal(result.rows[0].textContent, caption.textContent);
    assert.equal(result.conversation.lastMessage.textContent, caption.textContent);
    assert.equal(result.conversation.unreadCount, 0);
    assert.equal(await mediaBindings.readBoundMedia(f.scope.tenantId, result.rows[0].messageKey), null);
    await echoes.record(f.scope, { ...caption, providerMessageId: 'wamid.history-edit-clear', textContent: null, occurredAt: '2026-09-09T09:01:00.000Z' });
    assert.equal((await thread(f)).rows[0].textContent, null);
    await echoes.record(f.scope, revoke(f));
    const removed = (await thread(f)).rows[0];
    assert.equal(removed.contentState, 'deleted'); assert.equal(removed.contentKind, 'unsupported'); assert.equal(removed.textContent, null);
  }
});

test('refusal after projection immediately removes thread body and preview without a second stored text copy', async () => {
  const f = await newCase(); await capture(f); await drain(); await signed(f, declinedValue());
  const t = await thread(f); assert.equal(t.rows.length, 0); assert.equal(t.view.conversation.lastMessage, null);
  const ref = (await pool.query('SELECT * FROM meta_history_inbox_messages WHERE tenant_id=$1', [f.scope.tenantId])).rows[0];
  assert.doesNotMatch(JSON.stringify(ref), /history fixture/);
  assert.equal((await pool.query('SELECT payload FROM meta_history_sync_chunks WHERE tenant_id=$1', [f.scope.tenantId])).rows[0].payload, null);
  await capture(f); await drain(); assert.equal((await thread(f)).rows.length, 0);
});

test('revoked authorization, changed version and inactive tenant hide already projected history', async () => {
  for (const kind of ['revoked', 'version', 'suspended']) {
    const f = await newCase(); await capture(f); await drain();
    if (kind === 'revoked') await meta.revokeConnection(f.scope.tenantId, f.scope.wabaId, f.scope.connectionVersion);
    if (kind === 'version') await meta.saveAssetSnapshot({ tenantId: f.scope.tenantId, businessPortfolioId: f.connection.businessPortfolioId, wabaId: f.scope.wabaId, phoneNumberId: f.scope.phoneNumberId });
    if (kind === 'suspended') await pool.query("UPDATE tenants SET status='suspended' WHERE id=$1", [f.scope.tenantId]);
    const t = await thread(f); assert.equal(t.rows.length, 0); assert.equal(t.view.conversation.lastMessage, null);
  }
});

test('conflicting captured chunk removes projected history; exact cross-chunk duplicates remain single', async () => {
  const f = await newCase(); await capture(f); await drain(); await capture(f, withMessages([message()], 2)); await drain();
  assert.equal((await thread(f)).rows.length, 1);
  await capture(f, withMessages([message({ text: { body: 'changed original chunk' } })]));
  assert.equal((await thread(f)).rows.length, 0);
});

test('cross-chunk provider identity conflict quarantines the session durably', async () => {
  const f = await newCase(); await capture(f); await drain();
  await capture(f, withMessages([message({ text: { body: 'changed later chunk' } })], 2));
  assert.deepEqual(await projector.projectNext(), { outcome: 'conflicted', processed: 1 });
  assert.equal((await state(f)).has_conflict, true); assert.equal((await thread(f)).rows.length, 0);
  assert.equal((await pool.query('SELECT conflicted FROM meta_history_inbox_messages WHERE tenant_id=$1', [f.scope.tenantId])).rows[0].conflicted, true);
});

test('audit failure rolls back reference, contact, conversation and cursor; retry completes once', async () => {
  const f = await newCase(); await capture(f);
  const broken = createPostgresMetaHistoryInboxProjector({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(sql, params) {
    if (sql === postgresMetaHistoryInboxSql.audit) throw new Error('audit unavailable'); return tx.query(sql, params);
  } })) });
  await assert.rejects(broken.projectNext(), /audit unavailable/);
  const c = await counts(f); assert.equal(c.contacts, '0'); assert.equal(c.conversations, '0');
  assert.equal((await pool.query('SELECT * FROM meta_history_inbox_cursors WHERE tenant_id=$1', [f.scope.tenantId])).rowCount, 0);
  assert.equal((await pool.query('SELECT * FROM meta_history_inbox_messages WHERE tenant_id=$1', [f.scope.tenantId])).rowCount, 0);
  await drain(); assert.equal((await thread(f)).rows.length, 1);
});

test('ambiguous projection commit resumes from the persisted cursor without another copy', async () => {
  const f = await newCase(); await capture(f);
  const ambiguous = createPostgresMetaHistoryInboxProjector({ async transaction(options, work) {
    await transactions.transaction(options, work); throw new Error('lost after commit');
  } });
  await assert.rejects(ambiguous.projectNext(), /lost after commit/); await drain();
  assert.equal((await thread(f)).rows.length, 1);
  assert.equal((await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 AND action='meta.history.projected'", [f.scope.tenantId])).rowCount, 1);
});

test('projection waiting behind revocation rechecks authorization before creating inbox rows', async () => {
  const f = await newCase(); await capture(f); const blocker = await pool.connect();
  try {
    await blocker.query('BEGIN'); await blocker.query(postgresMetaSql.revokeConnection, [f.scope.tenantId, f.scope.wabaId, f.scope.connectionVersion]);
    let reachedLock;
    const waitingAtLock = new Promise((resolve) => { reachedLock = resolve; });
    const observed = createPostgresMetaHistoryInboxProjector({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(sql, args) {
      const pendingQuery = tx.query(sql, args);
      if (sql === postgresMetaHistorySyncSql.connection) reachedLock();
      return pendingQuery;
    } })) });
    const pending = observed.projectNext(); await waitingAtLock; await blocker.query('COMMIT');
    assert.equal((await pending).outcome, 'blocked');
    assert.equal((await counts(f)).conversations, '0');
  } finally { await blocker.query('ROLLBACK'); blocker.release(); }
});

test('database guards reject resetting cursor, changing projection identity and attaching a message to another contact', async () => {
  const f = await newCase(); await capture(f); await drain();
  await assert.rejects(pool.query('UPDATE meta_history_inbox_cursors SET next_index=0 WHERE tenant_id=$1', [f.scope.tenantId]));
  await assert.rejects(pool.query('DELETE FROM meta_history_inbox_messages WHERE tenant_id=$1', [f.scope.tenantId]));
  await assert.rejects(pool.query("UPDATE meta_history_inbox_messages SET message_digest=$2 WHERE tenant_id=$1", [f.scope.tenantId, 'a'.repeat(64)]));
  const other = await conversations.resolveInboundContact(f.scope.tenantId, '+16505559999');
  const otherKey = await deriveConversationKey(f.scope.tenantId, other.contactId);
  await pool.query('INSERT INTO conversations (tenant_id, contact_id, conversation_key) VALUES ($1,$2,$3)', [f.scope.tenantId, other.contactId, otherKey]);
  const source = (await pool.query('SELECT * FROM meta_history_inbox_messages WHERE tenant_id=$1', [f.scope.tenantId])).rows[0];
  await assert.rejects(pool.query(postgresMetaHistoryInboxSql.insert, [f.scope.tenantId, 'wamid.wrong-binding', `message_v1_${'a'.repeat(64)}`,
    otherKey, source.phase, source.chunk_order, source.content_digest, 0, source.message_digest, source.occurred_at]));
});

function mediaPlaceholder(overrides = {}) {
  return message({ id: 'wamid.history-media', type: 'media_placeholder', text: undefined, history_context: { status: 'PLAYED' }, ...overrides });
}
async function mediaCase({ mediaFirst = false, original = mediaPlaceholder(), media = mediaValue(), withCredential = false } = {}) {
  const f = await newCase({ withCredential });
  if (mediaFirst) await signed(f, media);
  await signed(f, withMessages([original])); await drain();
  if (!mediaFirst) await signed(f, media);
  const key = (await thread(f)).rows[0].messageKey;
  return { ...f, key };
}
async function bindingRows(f) {
  return (await pool.query('SELECT * FROM meta_history_media_bindings WHERE tenant_id=$1', [f.scope.tenantId])).rows;
}

test('signed media binds before or after projection, keeps original context and leaves binary availability unclaimed', async () => {
  for (const mediaFirst of [true, false]) {
    const f = await mediaCase({ mediaFirst }); const before = await thread(f);
    assert.equal(await mediaBindings.readBoundMedia(f.scope.tenantId, f.key), null);
    assert.equal(await mediaBindings.bindNext(), 'bound');
    const bound = await mediaBindings.readBoundMedia(f.scope.tenantId, f.key);
    assert.deepEqual(bound.scope, f.scope);
    assert.equal(bound.message.direction, 'outbound'); assert.equal(bound.message.deliveryState, 'PLAYED');
    assert.notEqual(bound.message.occurredAt, bound.media.reportedAt);
    assert.equal(bound.media.content.id, mediaValue().messages[0].image.id);
    assert.deepEqual(await thread(f), before);
    assert.equal(before.rows[0].contentKind, 'media_placeholder');
    const rows = await bindingRows(f); assert.equal(rows.length, 1);
    assert.doesNotMatch(JSON.stringify(rows), /mime_type|caption|reportedSender|download|24230790383178626/);
    assert.equal((await counts(f)).messages, '0'); assert.equal((await counts(f)).consent, '0');
    assert.equal(await mediaBindings.bindNext(), 'idle');
  }
});

test('orphan media waits durably for the exact original message and does not create a conversation', async () => {
  const f = await newCase(); await signed(f, mediaValue());
  assert.equal(await mediaBindings.bindNext(), 'idle'); assert.equal((await counts(f)).conversations, '0');
  await capture(f, withMessages([mediaPlaceholder({ id: 'wamid.different' })])); await drain();
  assert.equal(await mediaBindings.bindNext(), 'idle'); assert.equal((await bindingRows(f)).length, 0);
  await capture(f, withMessages([mediaPlaceholder()], 2)); await drain();
  assert.equal(await mediaBindings.bindNext(), 'bound'); assert.equal((await bindingRows(f)).length, 1);
});

test('concurrent media binders and replay create one immutable association and one audit record', async () => {
  const f = await mediaCase();
  const results = await Promise.all(Array.from({ length: 5 }, () => createPostgresMetaHistoryMediaRepository(transactions).bindNext()));
  assert.equal(results.filter((outcome) => outcome === 'bound').length, 1);
  assert.ok(results.every((outcome) => ['bound', 'duplicate', 'idle'].includes(outcome)));
  await signed(f, mediaValue()); assert.equal(await mediaBindings.bindNext(), 'idle');
  assert.equal((await bindingRows(f)).length, 1);
  const audits = (await pool.query("SELECT metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.history.media-bound'", [f.scope.tenantId])).rows;
  assert.deepEqual(audits, [{ metadata_json: { outcome: 'bound' } }]);
});

test('same message IDs in separate tenants retain different scopes and cannot be read with a foreign key', async () => {
  const a = await mediaCase(), b = await mediaCase();
  assert.equal(await mediaBindings.bindNext(), 'bound'); assert.equal(await mediaBindings.bindNext(), 'bound');
  assert.notEqual(a.key, b.key);
  assert.equal(await mediaBindings.readBoundMedia(a.scope.tenantId, b.key), null);
  assert.equal(await mediaBindings.readBoundMedia(b.scope.tenantId, a.key), null);
  assert.deepEqual((await mediaBindings.readBoundMedia(a.scope.tenantId, a.key)).scope, a.scope);
  assert.deepEqual((await mediaBindings.readBoundMedia(b.scope.tenantId, b.key)).scope, b.scope);
});

test('media type or descriptor contradiction quarantines the session instead of replacing original content', async () => {
  for (const original of [message({ id: 'wamid.history-media' }), mediaPlaceholder({ type: 'audio', audio: {} }),
    mediaPlaceholder({ type: 'image', image: { id: 'incompatible-media-id' } })]) {
    const f = await mediaCase({ original });
    assert.equal(await mediaBindings.bindNext(), 'conflicted');
    assert.equal((await state(f)).has_conflict, true); assert.equal((await bindingRows(f)).length, 0);
    assert.equal((await thread(f)).rows.length, 0); assert.equal(await mediaBindings.readBoundMedia(f.scope.tenantId, f.key), null);
  }
});

test('typed original media is enriched without overwriting its original descriptor', async () => {
  const f = await mediaCase({ original: mediaPlaceholder({ type: 'image', image: { caption: 'original caption' } }) });
  assert.equal(await mediaBindings.bindNext(), 'bound');
  const bound = await mediaBindings.readBoundMedia(f.scope.tenantId, f.key);
  assert.equal(bound.message.content.caption, 'original caption');
  assert.equal(bound.media.content.id, mediaValue().messages[0].image.id);
});

test('refusal after binding redacts media and original sources while retaining content-free association evidence', async () => {
  const f = await mediaCase(); await mediaBindings.bindNext(); await signed(f, declinedValue());
  assert.equal(await mediaBindings.readBoundMedia(f.scope.tenantId, f.key), null);
  assert.equal((await bindingRows(f)).length, 1);
  assert.equal((await pool.query('SELECT payload FROM meta_history_sync_media WHERE tenant_id=$1', [f.scope.tenantId])).rows[0].payload, null);
  assert.equal((await thread(f)).rows.length, 0);
  await signed(f, mediaValue()); assert.equal(await mediaBindings.bindNext(), 'idle');
});

test('revocation, changed connection, inactive tenant and late request rejection disable a saved binding immediately', async () => {
  for (const kind of ['revoked', 'version', 'suspended', 'rejected']) {
    const f = await mediaCase(); await mediaBindings.bindNext();
    if (kind === 'revoked') await meta.revokeConnection(f.scope.tenantId, f.scope.wabaId, f.scope.connectionVersion);
    if (kind === 'version') await meta.saveAssetSnapshot({ tenantId: f.scope.tenantId, businessPortfolioId: f.connection.businessPortfolioId, wabaId: f.scope.wabaId, phoneNumberId: f.scope.phoneNumberId });
    if (kind === 'suspended') await pool.query("UPDATE tenants SET status='suspended' WHERE id=$1", [f.scope.tenantId]);
    if (kind === 'rejected') await requests.finish(await requests.read(f.scope.tenantId, 'history'), { status: 'rejected', requestId: null });
    assert.equal(await mediaBindings.readBoundMedia(f.scope.tenantId, f.key), null);
    assert.equal((await bindingRows(f)).length, 1);
  }
});

test('late conflicting media or original chunks invalidate a previously bound descriptor', async () => {
  for (const kind of ['media', 'chunk']) {
    const f = await mediaCase(); await mediaBindings.bindNext();
    if (kind === 'media') { const changed = mediaValue(); changed.messages[0].image.id = 'changed-media-id'; await signed(f, changed); }
    else await capture(f, withMessages([mediaPlaceholder({ history_context: { status: 'READ' } })]));
    assert.equal(await mediaBindings.readBoundMedia(f.scope.tenantId, f.key), null);
    assert.equal((await bindingRows(f)).length, 1);
  }
});

test('an authoritative live copy suppresses historical media before or after association', async () => {
  for (const before of [true, false]) {
    const f = await mediaCase({ original: mediaPlaceholder({ from: customerPhone }) });
    if (!before) await mediaBindings.bindNext();
    await liveInbound(f, 'wamid.history-media');
    if (before) assert.equal(await mediaBindings.bindNext(), 'idle');
    assert.equal(await mediaBindings.readBoundMedia(f.scope.tenantId, f.key), null);
    assert.equal((await thread(f)).rows[0].textContent, 'live inbound');
  }
});

test('outbound deletion before or after media binding suppresses acquisition without changing occurrence time', async () => {
  for (const before of [true, false]) {
    const f = await mediaCase();
    if (!before) await mediaBindings.bindNext();
    await echoes.record(f.scope, { ...revoke(f), mutation: { kind: 'revoke', originalProviderMessageId: 'wamid.history-media' } });
    if (before) assert.equal(await mediaBindings.bindNext(), 'idle');
    assert.equal(await mediaBindings.readBoundMedia(f.scope.tenantId, f.key), null);
    assert.equal((await thread(f)).rows[0].contentState, 'deleted');
  }
});

test('binding and conflict audit failure roll back together, then retry deterministically', async () => {
  for (const conflict of [false, true]) {
    const f = await mediaCase({ original: conflict ? message({ id: 'wamid.history-media' }) : mediaPlaceholder() });
    const broken = createPostgresMetaHistoryMediaRepository({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(sql, params) {
      if (sql === postgresMetaHistoryMediaSql.audit) throw new Error('binding audit unavailable'); return tx.query(sql, params);
    } })) });
    await assert.rejects(broken.bindNext(), /binding audit unavailable/);
    assert.equal((await bindingRows(f)).length, 0); assert.equal((await state(f)).has_conflict, false);
    assert.equal(await mediaBindings.bindNext(), conflict ? 'conflicted' : 'bound');
  }
});

test('lost binding commit acknowledgement is recovered without another binding or audit', async () => {
  const f = await mediaCase();
  const ambiguous = createPostgresMetaHistoryMediaRepository({ async transaction(options, work) {
    await transactions.transaction(options, work); throw new Error('binding commit acknowledgement lost');
  } });
  await assert.rejects(ambiguous.bindNext(), /acknowledgement lost/);
  assert.equal(await mediaBindings.bindNext(), 'idle');
  assert.ok(await mediaBindings.readBoundMedia(f.scope.tenantId, f.key)); assert.equal((await bindingRows(f)).length, 1);
});

test('binder and metadata read recheck authorization after waiting behind a concurrent revocation', async () => {
  for (const read of [false, true]) {
    const f = await mediaCase(); if (read) await mediaBindings.bindNext();
    const blocker = await pool.connect();
    try {
      await blocker.query('BEGIN'); await blocker.query(postgresMetaSql.revokeConnection, [f.scope.tenantId, f.scope.wabaId, f.scope.connectionVersion]);
      let reached; const atLock = new Promise((resolve) => { reached = resolve; });
      const observed = createPostgresMetaHistoryMediaRepository({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(sql, params) {
        const pending = tx.query(sql, params); if (sql === postgresMetaHistorySyncSql.connection) reached(); return pending;
      } })) });
      const pending = read ? observed.readBoundMedia(f.scope.tenantId, f.key) : observed.bindNext();
      await atLock; await blocker.query('COMMIT');
      assert.equal(await pending, read ? null : 'blocked');
      assert.equal((await bindingRows(f)).length, read ? 1 : 0);
    } finally { await blocker.query('ROLLBACK'); blocker.release(); }
  }
});

test('database constraints reject rebinding, deletion, foreign digests and incompatible source types', async () => {
  const a = await mediaCase(), b = await mediaCase();
  await mediaBindings.bindNext(); await mediaBindings.bindNext();
  const row = (await bindingRows(a))[0];
  await assert.rejects(pool.query('DELETE FROM meta_history_media_bindings WHERE tenant_id=$1', [a.scope.tenantId]));
  await assert.rejects(pool.query('UPDATE meta_history_media_bindings SET media_digest=$2 WHERE tenant_id=$1', [a.scope.tenantId, (await bindingRows(b))[0].media_digest]));
  const f = await mediaCase({ original: message({ id: 'wamid.history-media' }) });
  const ref = (await pool.query('SELECT message_digest FROM meta_history_inbox_messages WHERE tenant_id=$1', [f.scope.tenantId])).rows[0];
  const media = (await pool.query('SELECT content_digest FROM meta_history_sync_media WHERE tenant_id=$1', [f.scope.tenantId])).rows[0];
  await assert.rejects(pool.query(postgresMetaHistoryMediaSql.insert, [f.scope.tenantId, row.provider_message_id, row.message_digest, media.content_digest]));
  await assert.rejects(pool.query(postgresMetaHistoryMediaSql.insert, [f.scope.tenantId, row.provider_message_id, ref.message_digest, media.content_digest]));
  assert.equal(await mediaBindings.bindNext(), 'conflicted');
});

test('binding and metadata reads waiting behind a sharing refusal recheck session state', async () => {
  for (const read of [false, true]) {
    const f = await mediaCase(); if (read) await mediaBindings.bindNext();
    const blocker = await pool.connect();
    try {
      await blocker.query('BEGIN'); await blocker.query("UPDATE meta_history_sync_sessions SET sharing_state='declined' WHERE tenant_id=$1", [f.scope.tenantId]);
      let reached; const atLock = new Promise((resolve) => { reached = resolve; });
      const observed = createPostgresMetaHistoryMediaRepository({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(sql, params) {
        const pending = tx.query(sql, params); if (sql === postgresMetaHistorySyncSql.lock) reached(); return pending;
      } })) });
      const pending = read ? observed.readBoundMedia(f.scope.tenantId, f.key) : observed.bindNext();
      await atLock; await blocker.query('COMMIT'); assert.equal(await pending, read ? null : 'blocked');
    } finally { await blocker.query('ROLLBACK'); blocker.release(); }
  }
});

test('acquisition read revalidates source digests and rejects a corrupted database snapshot', async () => {
  const f = await mediaCase(); await mediaBindings.bindNext();
  const corrupted = createPostgresMetaHistoryMediaRepository({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ async query(sql, params) {
    const result = await tx.query(sql, params);
    if (sql === postgresMetaHistoryMediaSql.sources && result.rows.length > 0) return { ...result, rows: result.rows.map((row) => ({ ...row, media: { ...row.media, content: { ...row.media.content, id: 'corrupted' } } })) };
    return result;
  } })) });
  await assert.rejects(corrupted.readBoundMedia(f.scope.tenantId, f.key), (error) => error.safeCode === 'HISTORY_MEDIA_BINDING_FAILED');
  assert.ok(await mediaBindings.readBoundMedia(f.scope.tenantId, f.key));
});

test('actual Worker scheduler projects originals and binds at most 100 media records per maintenance run', async () => {
  const f = await newCase(); const media = mediaValue(), originalMedia = media.messages[0];
  const originals = Array.from({ length: 101 }, (_, i) => mediaPlaceholder({ id: `wamid.worker-media-${String(i).padStart(3, '0')}` }));
  media.messages = originals.map((item) => ({ ...originalMedia, id: item.id }));
  await capture(f, withMessages(originals)); await signed(f, media);
  const failures = [], events = []; let service;
  const schedulerTime = new Date();
  try {
    service = await createRailwayPostgresWorkerService({
      environment: { APP_RUNTIME_ENVIRONMENT: 'test', DATABASE_URL: connectionString, POSTGRES_APPLICATION_NAME: 'connect-history-media-worker-test',
        POSTGRES_MAX_CONNECTIONS: '4', POSTGRES_CONNECTION_TIMEOUT_MS: '2000', POSTGRES_IDLE_TIMEOUT_MS: '2000',
        POSTGRES_STATEMENT_TIMEOUT_MS: '15000', POSTGRES_QUERY_TIMEOUT_MS: '20000', POSTGRES_LOCK_TIMEOUT_MS: '3000',
        POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS: '10000', POSTGRES_MAX_LIFETIME_SECONDS: '1800', POSTGRES_TLS_MODE: 'disabled' },
      ownerKey: 'scheduler_owner_v1_' + createHash('sha256').update('history-media-worker-integration').digest('hex'),
      clock: { now: () => new Date(schedulerTime) },
      campaignQueue: { async sendBatch() { assert.fail('No campaign delivery expected'); } },
      postgresTelemetry: { recordIdleClientError() { failures.push('postgres'); } },
      schedulerTelemetry: { recordRunFailure() { failures.push('run'); }, recordTimerFailure() { failures.push('timer'); }, recordOverlapSuppressed() { failures.push('overlap'); } },
      metaWebhooks: { environment: { META_APP_ID: '100001', META_APP_SECRET: 'local-media-worker-secret', META_WEBHOOK_VERIFY_TOKEN: 'local-media-worker-verify' },
        createQueueRuntime() { return { async start() { events.push('start'); }, async cleanExpiredDeadLetters() { events.push('clean'); return 0; }, async close() { events.push('close'); } }; },
        telemetrySink: { async record() { return { outcome: 'recorded' }; } },
      },
    });
    await service.start();
    for (let poll = 0; poll < 200 && (await bindingRows(f)).length < 100 && failures.length === 0; poll++) await new Promise((resolve) => setTimeout(resolve, 20));
  } finally { if (service) await service.close(); }
  assert.deepEqual(failures, []); assert.deepEqual(events, ['start', 'clean', 'close']);
  assert.equal((await bindingRows(f)).length, 100);
  assert.equal(await mediaBindings.bindNext(), 'bound'); assert.equal((await bindingRows(f)).length, 101);
  assert.equal(await mediaBindings.bindNext(), 'idle'); assert.equal((await counts(f)).messages, '0');
});

async function acquisitionCase() {
  const media = mediaValue(); Object.assign(media.messages[0].image, { mime_type: 'image/png', sha256: mediaSha256 });
  const f = await mediaCase({ withCredential: true, media });
  // Preserve the database's last-owner invariant while changing this actor.
  await pool.query("INSERT INTO tenant_memberships (tenant_id, external_user_id, role, status) VALUES ($1,$2,'owner','active')", [f.scope.tenantId, `remaining-owner-${f.scope.tenantId}`]);
  assert.equal(await mediaBindings.bindNext(), 'bound');
  return f;
}
function acquisitionRuntime(f, options = {}) {
  const calls = [], s3Calls = [];
  const factory = options.quarantine ? createRailwayMetaHistoryMediaQuarantineRuntime : createRailwayMetaHistoryMediaRuntime;
  const service = factory({ environment: mediaEnvironment, media: mediaBindings,
    ...(options.quarantine ? { uploadJournal: options.uploadJournal ?? uploadJournal, quarantineEnvironment, quarantineOptions: { client: { async send(command) {
      s3Calls.push(command.constructor.name);
      return options.s3 ? options.s3(command) : s3Reply(command);
    } } } } : {}),
    memberships: mediaMemberships, credentials: options.credentials ?? mediaCredentials,
    transportOptions: { requestTimeoutMs: 2000, async fetchImplementation(rawUrl, init) {
      const url = new URL(rawUrl); calls.push({ origin: url.origin, path: url.pathname });
      assert.equal(init.headers.authorization, `Bearer media-token-${f.scope.tenantId}`); assert.equal(init.method, 'GET');
      if (url.hostname === 'graph.facebook.com') {
        assert.equal(url.pathname, `/v23.0/${mediaId}`);
        assert.deepEqual([...url.searchParams], [['phone_number_id', f.scope.phoneNumberId]]);
        if (options.metadata) return options.metadata();
        return metadataResponse();
      }
      assert.equal(url.hostname, 'lookaside.fbsbx.com');
      if (options.binary) return options.binary();
      return binaryResponse();
    } },
  });
  return { service, calls, s3Calls };
}
const acquisitionRejected = (promise, code = 'AUTHORIZATION_CHANGED') => assert.rejects(promise, (error) => {
  assert.equal(error.code, code); assert.doesNotMatch(error.message, /media-token-|lookaside|private provider/); return true;
});

test('acquisition uses real PostgreSQL sources, current memberships and encrypted vault with a phone-bound media GET', async () => {
  const f = await acquisitionCase(), runtime = acquisitionRuntime(f);
  const before = await thread(f); const result = await runtime.service.download(f.session, f.key);
  assert.deepEqual(result.bytes, mediaBytes); assert.equal(result.contentSha256, mediaSha256);
  assert.equal(result.quarantineRequired, true); assert.deepEqual(result.scope, f.scope); assert.equal(result.messageKey, f.key);
  assert.equal(runtime.calls.length, 2); assert.deepEqual(await thread(f), before);
  assert.equal((await bindingRows(f)).length, 1); assert.equal((await counts(f)).messages, '0');
  assert.equal((await requests.read(f.scope.tenantId, 'history')).status, 'dispatching');
  const envelope = await mediaCredentials.findByTenantId(f.scope.tenantId);
  assert.doesNotMatch(JSON.stringify(envelope), /media-token-/);
});

test('current membership overrides a formerly valid owner session before acquisition', async () => {
  for (const update of ["role='manager'", "status='suspended'"]) {
    const f = await acquisitionCase(), runtime = acquisitionRuntime(f);
    await pool.query(`UPDATE tenant_memberships SET ${update},version=version+1 WHERE tenant_id=$1 AND external_user_id=$2`, [f.scope.tenantId, f.session.externalUserId]);
    await acquisitionRejected(runtime.service.download(f.session, f.key)); assert.equal(runtime.calls.length, 0);
  }
});

test('revocation or sharing refusal committed with the metadata response prevents the binary GET', async () => {
  for (const revoke of [true, false]) {
    const f = await acquisitionCase();
    const runtime = acquisitionRuntime(f, { async metadata() {
      if (revoke) await meta.revokeConnection(f.scope.tenantId, f.scope.wabaId, f.scope.connectionVersion);
      else await signed(f, declinedValue());
      return metadataResponse();
    } });
    await acquisitionRejected(runtime.service.download(f.session, f.key)); assert.equal(runtime.calls.length, 1);
  }
});

test('owner removal or outbound deletion after metadata blocks acquisition under unchanged connection assets', async () => {
  for (const change of ['owner', 'delete']) {
    const f = await acquisitionCase();
    const runtime = acquisitionRuntime(f, { async metadata() {
      if (change === 'owner') await pool.query("UPDATE tenant_memberships SET role='manager',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2", [f.scope.tenantId, f.session.externalUserId]);
      else await echoes.record(f.scope, { ...revoke(f), mutation: { kind: 'revoke', originalProviderMessageId: 'wamid.history-media' } });
      return metadataResponse();
    } });
    await acquisitionRejected(runtime.service.download(f.session, f.key)); assert.equal(runtime.calls.length, 1);
  }
});

test('authorization change during binary transfer discards a complete and hash-valid response', async () => {
  for (const change of ['connection', 'owner', 'sharing']) {
    const f = await acquisitionCase();
    const runtime = acquisitionRuntime(f, { async binary() {
      if (change === 'connection') await meta.revokeConnection(f.scope.tenantId, f.scope.wabaId, f.scope.connectionVersion);
      if (change === 'owner') await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2", [f.scope.tenantId, f.session.externalUserId]);
      if (change === 'sharing') await signed(f, declinedValue());
      return binaryResponse();
    } });
    await acquisitionRejected(runtime.service.download(f.session, f.key)); assert.equal(runtime.calls.length, 2);
  }
});

test('source is checked again after vault decryption even if its envelope read just returned an old valid snapshot', async () => {
  const f = await acquisitionCase(); let reads = 0;
  const runtime = acquisitionRuntime(f, { credentials: { ...mediaCredentials, async findByTenantId(tenantId) {
    const envelope = await mediaCredentials.findByTenantId(tenantId);
    if (++reads === 2) await signed(f, declinedValue());
    return envelope;
  } } });
  await acquisitionRejected(runtime.service.download(f.session, f.key)); assert.equal(reads, 2); assert.equal(runtime.calls.length, 0);
});

test('foreign message keys cannot cause a provider read under another tenant credential', async () => {
  const a = await acquisitionCase(), b = await acquisitionCase();
  const runtime = acquisitionRuntime(a);
  await acquisitionRejected(runtime.service.download(a.session, b.key)); assert.equal(runtime.calls.length, 0);
  const result = await runtime.service.download(a.session, a.key); assert.deepEqual(result.scope, a.scope);
});

test('mismatching provider bytes or metadata never change durable bindings or claim synchronization completion', async () => {
  for (const mismatch of ['bytes', 'metadata']) {
    const f = await acquisitionCase(); const before = await bindingRows(f);
    const changed = mediaBytes.slice(); changed[0] ^= 1;
    const runtime = acquisitionRuntime(f, mismatch === 'bytes' ? { binary: () => binaryResponse(changed) } : { metadata: () => metadataResponse({ sha256: '0'.repeat(64) }) });
    await acquisitionRejected(runtime.service.download(f.session, f.key), 'CONTENT_MISMATCH');
    assert.equal(runtime.calls.length, mismatch === 'bytes' ? 2 : 1); assert.deepEqual(await bindingRows(f), before);
    assert.equal((await state(f)).max_progress, 55); assert.equal((await thread(f)).rows[0].contentKind, 'media_placeholder');
  }
});

test('an in-flight runtime acquisition excludes another download and releases its slot on completion', async () => {
  const f = await acquisitionCase(); let reached, release;
  const waiting = new Promise((resolve) => { reached = resolve; }); let first = true;
  const runtime = acquisitionRuntime(f, { metadata() {
    if (!first) return metadataResponse(); first = false; reached(); return new Promise((resolve) => { release = resolve; });
  } });
  const pending = runtime.service.download(f.session, f.key); await waiting;
  await acquisitionRejected(runtime.service.download(f.session, f.key), 'IN_PROGRESS'); assert.equal(runtime.calls.length, 1);
  release(metadataResponse()); assert.deepEqual((await pending).bytes, mediaBytes);
  assert.deepEqual((await runtime.service.download(f.session, f.key)).bytes, mediaBytes); assert.equal(runtime.calls.length, 4);
});

test('missing or unreadable credential fails closed without leaking details or invoking Meta', async () => {
  const f = await acquisitionCase();
  for (const fail of [false, true]) {
    const runtime = acquisitionRuntime(f, { credentials: { ...mediaCredentials, async findByTenantId() {
      if (fail) throw new Error('private provider credential store'); return null;
    } } });
    await acquisitionRejected(runtime.service.download(f.session, f.key), fail ? 'DEPENDENCY_UNAVAILABLE' : 'AUTHORIZATION_CHANGED');
    assert.equal(runtime.calls.length, 0);
  }
});


test('PostgreSQL-backed acquisition composes private S3 quarantine without changing inbox or declaring complete', async () => {
  const f = await acquisitionCase(), runtime = acquisitionRuntime(f, { quarantine: true });
  const before = await thread(f), bindings = await bindingRows(f);
  try {
    const result = await runtime.service.downloadAndQuarantine(f.session, f.key);
    assert.equal(result.state, 'quarantined'); assert.equal(result.tenantId, f.scope.tenantId); assert.equal(result.connectionVersion, f.scope.connectionVersion);
    assert.equal(result.messageKey, f.key); assert.equal(result.contentSha256, mediaSha256); assert.equal(result.versionId, 's3-integration-version-1');
    assert.equal(runtime.calls.length, 2); assert.equal(runtime.s3Calls.filter((name) => name === 'PutObjectCommand').length, 1);
    assert.equal(Object.hasOwn(result, 'bytes'), false); assert.equal(Object.hasOwn(result, 'url'), false);
    assert.deepEqual(await thread(f), before); assert.deepEqual(await bindingRows(f), bindings); assert.equal((await state(f)).max_progress, 55);
  } finally { runtime.service.close(); }
});

test('committed source or actor revocation during S3 preflight blocks the subsequent PUT', async () => {
  for (const change of ['sharing', 'owner']) {
    const f = await acquisitionCase();
    const runtime = acquisitionRuntime(f, { quarantine: true, async s3(command) {
      if (command.constructor.name === 'GetBucketPolicyCommand') {
        if (change === 'sharing') await signed(f, declinedValue());
        else await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2", [f.scope.tenantId, f.session.externalUserId]);
      }
      return s3Reply(command);
    } });
    try { await acquisitionRejected(runtime.service.downloadAndQuarantine(f.session, f.key)); assert.equal(runtime.s3Calls.includes('PutObjectCommand'), false); }
    finally { runtime.service.close(); }
  }
});

test('connection revocation during S3 PUT preserves the durable receipt while denying its return', async () => {
  const f = await acquisitionCase();
  const runtime = acquisitionRuntime(f, { quarantine: true, async s3(command) {
    if (command.constructor.name === 'PutObjectCommand') await meta.revokeConnection(f.scope.tenantId, f.scope.wabaId, f.scope.connectionVersion);
    return s3Reply(command);
  } });
  try {
    await acquisitionRejected(runtime.service.downloadAndQuarantine(f.session, f.key));
    assert.equal(runtime.s3Calls.length, 7); assert.equal((await bindingRows(f)).length, 1);
    const saved = (await uploadRows(f))[0];
    assert.equal(saved.status, 'quarantined'); assert.equal(saved.object_version_id, 's3-integration-version-1');
    assert.deepEqual(await uploadAudits(f), ['prepared','claimed','dispatching','quarantined'].map((status) => ({ status })));
  } finally { runtime.service.close(); }
});

test('ambiguous S3 write or an existing object never becomes a successful saved-media claim', async () => {
  for (const [status, errorCode] of [[500, 'OUTCOME_UNKNOWN'], [412, 'OBJECT_EXISTS']]) {
    const f = await acquisitionCase(), before = await bindingRows(f);
    const runtime = acquisitionRuntime(f, { quarantine: true, async s3(command) {
      if (command.constructor.name === 'PutObjectCommand') throw Object.assign(new Error('private provider details'), { $metadata: { httpStatusCode: status } });
      return s3Reply(command);
    } });
    try {
      await acquisitionRejected(runtime.service.downloadAndQuarantine(f.session, f.key), errorCode);
      assert.equal(runtime.s3Calls.filter((name) => name === 'PutObjectCommand').length, 1); assert.deepEqual(await bindingRows(f), before);
      assert.equal((await state(f)).max_progress, 55);
    } finally { runtime.service.close(); }
  }
});


async function journalCase() {
  const f = await acquisitionCase(), bound = await mediaBindings.readBoundMedia(f.scope.tenantId, f.key);
  const descriptor = { tenantId:f.scope.tenantId,connectionVersion:f.scope.connectionVersion,messageKey:f.key,
    sourceSha256:createHash('sha256').update(JSON.stringify(bound)).digest('hex'),contentSha256:mediaSha256,mediaType:'image/png',sizeBytes:mediaBytes.byteLength };
  const intent = { ...descriptor,actor:f.session.externalUserId,bucket:quarantineConfig.bucket,kmsKeyArn:quarantineConfig.kmsKeyArn,objectKey:metaMediaUploadObjectKey(descriptor) };
  const receipt = { ...descriptor,bucket:intent.bucket,objectKey:intent.objectKey,versionId:'journal-integration-version-1',state:'quarantined' };
  return { ...f,intent,receipt };
}
async function uploadRows(f) { return (await pool.query('SELECT * FROM meta_media_upload_jobs WHERE tenant_id=$1',[f.scope.tenantId])).rows; }
async function uploadAudits(f) { return (await pool.query("SELECT metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.history.media-upload' ORDER BY id",[f.scope.tenantId])).rows.map((row)=>row.metadata_json); }
async function prepareAndClaim(f,journal=uploadJournal) {
  const job=await journal.prepare(f.intent),claim=await journal.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId);
  assert.ok(claim);return {job,claim};
}
function failingJournal(status, lostCommit=false) {
  let remaining=true;
  return createPostgresMetaMediaUploadJournal({ async transaction(options,work) {
    let hit=false;
    const result=await transactions.transaction(options,(tx)=>work({async query(sql,params) {
      if(remaining && sql===postgresMetaMediaUploadSql.audit && JSON.parse(params[3]).status===status) {
        hit=true;
        if(!lostCommit){remaining=false;throw new Error('private journal audit failure');}
      }
      return tx.query(sql,params);
    }}));
    if(remaining && hit && lostCommit){remaining=false;throw new Error('private journal commit acknowledgement lost');}
    return result;
  }});
}

test('journal persists immutable source-bound intent and rejects changed content, target, actor or source', async () => {
  const f=await journalCase(),job=await uploadJournal.prepare(f.intent);
  assert.equal(job.status,'prepared');assert.equal(job.version,1);assert.equal(job.claimVersion,null);assert.equal(job.receipt,null);
  assert.deepEqual(await uploadJournal.prepare({...f.intent}),job);assert.equal((await uploadRows(f)).length,1);assert.deepEqual(await uploadAudits(f),[{status:'prepared'}]);
  for(const changes of [{bucket:'another-private-bucket'},{kmsKeyArn:f.intent.kmsKeyArn.replace('12345678-','87654321-')},{actor:`remaining-owner-${f.scope.tenantId}`},
    {contentSha256:'1'.repeat(64)},{mediaType:'image/jpeg'},{sizeBytes:f.intent.sizeBytes+1}]) {
    const changed={...f.intent,...changes};changed.objectKey=metaMediaUploadObjectKey(changed);
    await acquisitionRejected(uploadJournal.prepare(changed),'CONFLICT');
  }
  await acquisitionRejected(uploadJournal.prepare({...f.intent,sourceSha256:'1'.repeat(64),objectKey:metaMediaUploadObjectKey({...f.intent,sourceSha256:'1'.repeat(64)})}));
});

test('concurrent prepare, claim, dispatch and repeated finish produce one row and one audit per transition', async () => {
  const f=await journalCase();
  const jobs=await Promise.all(Array.from({length:6},()=>uploadJournal.prepare(f.intent)));
  assert.equal(new Set(jobs.map((job)=>job.jobKey)).size,1);
  const claims=await Promise.all(jobs.map((job)=>uploadJournal.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId)));
  assert.equal(claims.filter(Boolean).length,1);const claim=claims.find(Boolean);
  const dispatches=await Promise.all(Array.from({length:6},()=>uploadJournal.dispatch(claim)));assert.equal(dispatches.filter(Boolean).length,1);
  assert.ok(await uploadJournal.checkDispatched(claim));
  assert.deepEqual(await Promise.all(Array.from({length:4},()=>uploadJournal.finish(claim,{receipt:f.receipt}))),[true,true,true,true]);
  assert.equal(await uploadJournal.checkDispatched(claim),false);
  assert.deepEqual(await uploadAudits(f),['prepared','claimed','dispatching','quarantined'].map((status)=>({status})));
  assert.deepEqual((await uploadJournal.prepare(f.intent)).receipt,f.receipt);
});

test('a restarted process can reclaim an expired pre-dispatch lease while the old worker stays fenced', async () => {
  const f=await journalCase(),short=createPostgresMetaMediaUploadJournal(transactions,{leaseDurationMs:250});
  const {job,claim:old}=await prepareAndClaim(f,short);
  assert.equal(await uploadJournal.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId),null);
  await new Promise((resolve)=>setTimeout(resolve,300));
  const restarted=createPostgresMetaMediaUploadJournal(transactions),fresh=await restarted.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId);
  assert.ok(fresh);assert.ok(fresh.claimVersion>old.claimVersion);
  assert.equal(await restarted.dispatch(old),false);assert.equal(await restarted.finish(old,{receipt:f.receipt}),false);
  assert.equal(await restarted.dispatch(fresh),true);assert.equal(await restarted.finish(fresh,{receipt:f.receipt}),true);
});

test('expired dispatches are never reclaimed and can still record a late version receipt', async () => {
  const f=await journalCase(),short=createPostgresMetaMediaUploadJournal(transactions,{leaseDurationMs:250});
  const {job,claim}=await prepareAndClaim(f,short);assert.ok(await short.dispatch(claim));
  await new Promise((resolve)=>setTimeout(resolve,300));
  assert.equal(await uploadJournal.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId),null);
  assert.equal(await uploadJournal.dispatch(claim),false);assert.equal(await uploadJournal.checkDispatched(claim),false);
  assert.equal(await uploadJournal.finish(claim,{receipt:f.receipt}),true);assert.equal((await uploadRows(f))[0].object_version_id,f.receipt.versionId);
});

test('claim checks lease expiry again after waiting behind a locked job row', async () => {
  const f=await journalCase(),short=createPostgresMetaMediaUploadJournal(transactions,{leaseDurationMs:250});
  const {claim}=await prepareAndClaim(f,short);assert.ok(await short.dispatch(claim));
  const blocker=await pool.connect();await blocker.query('BEGIN');await blocker.query('SELECT job_key FROM meta_media_upload_jobs WHERE tenant_id=$1 FOR UPDATE',[f.scope.tenantId]);
  const pending=uploadJournal.checkDispatched(claim);
  await new Promise((resolve)=>setTimeout(resolve,300));
  await blocker.query('COMMIT');blocker.release();assert.equal(await pending,false);
});

test('current owner and source authorization are required at prepare, claim, dispatch and permit boundaries', async () => {
  for(const phase of ['prepare','claim','dispatch','permit']) {
    const f=await journalCase();let job,claim;
    if(phase!=='prepare')job=await uploadJournal.prepare(f.intent);
    if(['dispatch','permit'].includes(phase))claim=await uploadJournal.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId);
    if(phase==='permit')assert.ok(await uploadJournal.dispatch(claim));
    await pool.query("UPDATE tenant_memberships SET role='manager',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
    const action=phase==='prepare'?uploadJournal.prepare(f.intent):phase==='claim'?uploadJournal.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId):phase==='dispatch'?uploadJournal.dispatch(claim):uploadJournal.checkDispatched(claim);
    await acquisitionRejected(action);if(phase==='prepare')assert.deepEqual(await uploadRows(f),[]);
  }
});

test('sharing refusal or deleted original prevents dispatch but does not erase recorded intent', async () => {
  for(const change of ['sharing','delete']) {
    const f=await journalCase(),{claim}=await prepareAndClaim(f);
    if(change==='sharing')await signed(f,declinedValue());
    else await echoes.record(f.scope,{...revoke(f),mutation:{kind:'revoke',originalProviderMessageId:'wamid.history-media'}});
    await acquisitionRejected(uploadJournal.dispatch(claim));assert.equal((await uploadRows(f))[0].status,'claimed');
  }
});

test('remote truth is retained after actor and connection revocation, but replay remains unauthorized', async () => {
  const f=await journalCase(),{claim}=await prepareAndClaim(f);assert.ok(await uploadJournal.dispatch(claim));
  await meta.revokeConnection(f.scope.tenantId,f.scope.wabaId,f.scope.connectionVersion);
  await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  assert.equal(await uploadJournal.finish(claim,{receipt:f.receipt}),true);assert.equal((await uploadRows(f))[0].status,'quarantined');
  await acquisitionRejected(uploadJournal.prepare(f.intent));await acquisitionRejected(uploadJournal.checkDispatched(claim));
});

test('foreign claims and conflicting receipts cannot publish or overwrite an upload outcome', async () => {
  const f=await journalCase(),other=await journalCase(),{job,claim}=await prepareAndClaim(f);assert.ok(await uploadJournal.dispatch(claim));
  assert.equal(await uploadJournal.claim(job.jobKey,other.scope.tenantId,other.session.externalUserId),null);
  assert.equal(await uploadJournal.finish({...claim,tenantId:other.scope.tenantId},{receipt:f.receipt}),false);
  assert.equal(await uploadJournal.finish({...claim,actor:other.session.externalUserId},{receipt:f.receipt}),false);
  for(const change of [{bucket:'foreign-bucket'},{tenantId:other.scope.tenantId},{sourceSha256:'0'.repeat(64)},{versionId:'null'},{state:'available'}])await acquisitionRejected(uploadJournal.finish(claim,{receipt:{...f.receipt,...change}}),'CONFLICT');
  assert.ok(await uploadJournal.finish(claim,{receipt:f.receipt}));
  assert.equal(await uploadJournal.finish(claim,{receipt:{...f.receipt,versionId:'different-version'}}),false);
  assert.equal(await uploadJournal.finish(claim,{errorCode:'RECONCILIATION_REQUIRED'}),false);
});

test('reconciliation states block new PUT claims and accept only late receipt evidence from the same claim', async () => {
  const f=await journalCase(),{job,claim}=await prepareAndClaim(f);assert.ok(await uploadJournal.dispatch(claim));
  assert.ok(await uploadJournal.finish(claim,{errorCode:'RECONCILIATION_REQUIRED'}));
  assert.equal(await uploadJournal.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId),null);
  assert.equal(await uploadJournal.checkDispatched(claim),false);
  assert.equal(await uploadJournal.finish({...claim,claimVersion:claim.claimVersion+1},{receipt:f.receipt}),false);
  assert.ok(await uploadJournal.finish(claim,{receipt:f.receipt}));assert.equal((await uploadRows(f))[0].object_version_id,f.receipt.versionId);
});

test('audit failure rolls back intent, claim, dispatch and receipt independently', async () => {
  for(const status of ['prepared','claimed','dispatching','quarantined']) {
    const f=await journalCase(),fault=failingJournal(status);let job,claim;
    if(status!=='prepared')job=await uploadJournal.prepare(f.intent);
    if(['dispatching','quarantined'].includes(status))claim=await uploadJournal.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId);
    if(status==='quarantined')assert.ok(await uploadJournal.dispatch(claim));
    const before=await uploadRows(f),audits=await uploadAudits(f);
    const action=status==='prepared'?()=>fault.prepare(f.intent):status==='claimed'?()=>fault.claim(job.jobKey,f.scope.tenantId,f.session.externalUserId):status==='dispatching'?()=>fault.dispatch(claim):()=>fault.finish(claim,{receipt:f.receipt});
    await acquisitionRejected(action(),'DEPENDENCY_UNAVAILABLE');assert.deepEqual(await uploadRows(f),before);assert.deepEqual(await uploadAudits(f),audits);
    assert.ok(await action());assert.equal((await uploadAudits(f)).length,audits.length+1);
  }
});

test('lost prepare acknowledgement resumes from the committed intent without duplicate audit', async () => {
  const f=await journalCase(),fault=failingJournal('prepared',true);
  await acquisitionRejected(fault.prepare(f.intent),'DEPENDENCY_UNAVAILABLE');const job=await fault.prepare(f.intent);
  assert.equal(job.status,'prepared');assert.deepEqual(await uploadAudits(f),[{status:'prepared'}]);
});

test('lost dispatch commit acknowledgement never invokes storage or permits a second dispatch', async () => {
  const f=await acquisitionCase(),runtime=acquisitionRuntime(f,{quarantine:true,uploadJournal:failingJournal('dispatching',true)});
  try {
    await acquisitionRejected(runtime.service.downloadAndQuarantine(f.session,f.key),'DEPENDENCY_UNAVAILABLE');
    assert.deepEqual(runtime.s3Calls,[]);assert.equal((await uploadRows(f))[0].status,'dispatching');
    await acquisitionRejected(runtime.service.downloadAndQuarantine(f.session,f.key),'IN_PROGRESS');assert.deepEqual(runtime.s3Calls,[]);
  }finally{runtime.service.close();}
});

test('lost finish acknowledgement recovers the stored receipt and does not invoke S3 again', async () => {
  const f=await acquisitionCase(),runtime=acquisitionRuntime(f,{quarantine:true,uploadJournal:failingJournal('quarantined',true)});
  try {
    await acquisitionRejected(runtime.service.downloadAndQuarantine(f.session,f.key),'OUTCOME_UNKNOWN');
    assert.equal(runtime.s3Calls.filter((name)=>name==='PutObjectCommand').length,1);
    const result=await runtime.service.downloadAndQuarantine(f.session,f.key);
    assert.equal(result.state,'quarantined');assert.equal(runtime.s3Calls.filter((name)=>name==='PutObjectCommand').length,1);
    assert.equal(runtime.calls.length,2,'Receipt recovery must not contact Meta again');
    assert.deepEqual(await uploadAudits(f),['prepared','claimed','dispatching','quarantined'].map((status)=>({status})));
  }finally{runtime.service.close();}
});

test('database transition guard prevents deletion, retargeting, early reclaim and fabricated success', async () => {
  const f=await journalCase(),{claim}=await prepareAndClaim(f);
  for(const sql of ["DELETE FROM meta_media_upload_jobs WHERE tenant_id=$1", "UPDATE meta_media_upload_jobs SET bucket='changed-bucket',version=version+1 WHERE tenant_id=$1",
    "UPDATE meta_media_upload_jobs SET status='claimed',version=version+1,claim_version=version+1,lease_expires_at=clock_timestamp()+INTERVAL '1 minute' WHERE tenant_id=$1",
    "UPDATE meta_media_upload_jobs SET status='quarantined',version=version+1,lease_expires_at=NULL,dispatched_at=clock_timestamp(),object_version_id='fake-version' WHERE tenant_id=$1"]) await assert.rejects(pool.query(sql,[f.scope.tenantId]));
  assert.ok(await uploadJournal.dispatch(claim));assert.ok(await uploadJournal.finish(claim,{receipt:f.receipt}));
  await assert.rejects(pool.query("UPDATE meta_media_upload_jobs SET object_version_id='changed',version=version+1 WHERE tenant_id=$1",[f.scope.tenantId]));
});


test('committed receipts replay while Meta is unavailable, but changed targets and revoked owners stay blocked', async () => {
  const f=await acquisitionCase();let providerReads=0;
  const runtime=acquisitionRuntime(f,{quarantine:true,metadata(){if(++providerReads>1)throw new Error('Meta no longer available');return metadataResponse();}});
  try{
    const first=await runtime.service.downloadAndQuarantine(f.session,f.key),again=await runtime.service.downloadAndQuarantine(f.session,f.key);
    assert.deepEqual(again,first);assert.equal(providerReads,1);assert.equal(runtime.s3Calls.length,7);
    const altered=createRailwayMetaHistoryMediaQuarantineRuntime({environment:mediaEnvironment,media:mediaBindings,memberships:mediaMemberships,credentials:mediaCredentials,uploadJournal,
      quarantineEnvironment:{...quarantineEnvironment,META_MEDIA_S3_BUCKET:'changed-media-destination'},quarantineOptions:{client:{async send(){assert.fail('No S3 call expected');}}},
      transportOptions:{async fetchImplementation(){assert.fail('No Meta call expected');}}});
    try{await acquisitionRejected(altered.downloadAndQuarantine(f.session,f.key),'CONFLICT');}finally{altered.close();}
    await pool.query("UPDATE tenant_memberships SET role='manager',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
    await acquisitionRejected(runtime.service.downloadAndQuarantine(f.session,f.key));assert.equal(providerReads,1);
  }finally{runtime.service.close();}
});

const scans = createPostgresMetaMediaScanRepository(transactions);
async function scanCase(status = 'reconciliation-required') {
  const f = await journalCase(), { job, claim } = await prepareAndClaim(f);
  await uploadJournal.dispatch(claim);
  if (status === 'reconciliation-required') await uploadJournal.finish(claim, { errorCode: 'RECONCILIATION_REQUIRED' });
  if (status === 'quarantined') await uploadJournal.finish(claim, { receipt: f.receipt });
  return { ...f, claim, job: await uploadJournal.lookup(job.jobKey, f.scope.tenantId, f.session.externalUserId) };
}
const scanObservation = (f, result = 'NO_THREATS_FOUND', versionId = f.receipt.versionId) => ({ versionId, result,
  receipt: result === 'NO_THREATS_FOUND' ? { ...f.receipt, versionId } : null });
async function scanRows(f) { return (await pool.query('SELECT * FROM meta_media_scan_observations WHERE tenant_id=$1 ORDER BY object_version_id,result', [f.scope.tenantId])).rows; }
async function scanAudits(f) { return (await pool.query("SELECT metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.history.media-scan' ORDER BY id", [f.scope.tenantId])).rows; }
function inspectionRuntime(f, options = {}) {
  const calls=[];
  const runtime=createRailwayMetaMediaInspectionRuntime({environment:quarantineEnvironment,transactions,inspectionOptions:{client:{async send(command){
    calls.push(command.constructor.name);
    return options.reply ? options.reply(command,calls) : inspectionReply(command,f.intent,options.result??'NO_THREATS_FOUND',f.receipt.versionId);
  }}}});
  return { calls, run:()=>runtime.inspect(f.session,f.job.jobKey), close:runtime.close };
}
function scanFaultTransactions(lostCommit = false) {
  let remaining=true;
  return {async transaction(options,work){let hit=false;
    const result=await transactions.transaction(options,(tx)=>work({async query(sql,parameters){
      if(remaining&&sql===postgresMetaMediaScanSql.audit){hit=true;if(!lostCommit){remaining=false;throw new Error('private scan audit failure');}}
      return tx.query(sql,parameters);
    }}));
    if(remaining&&hit&&lostCommit){remaining=false;throw new Error('private scan commit acknowledgement lost');}return result;
  }};
}

test('S3 reconciliation recovers an unknown upload receipt and scan atomically without Meta, PUT or Inbox changes', async () => {
  const f=await scanCase(),runtime=inspectionRuntime(f),before=await thread(f);
  try {
    assert.equal(await runtime.run(),'clean-observed');assert.equal((await uploadRows(f))[0].object_version_id,f.receipt.versionId);
    assert.equal((await scanRows(f))[0].result,'NO_THREATS_FOUND');assert.equal((await scanRows(f))[0].content_verified,true);
    assert.equal((await scanAudits(f)).length,1);assert.equal(runtime.calls.length,10);assert.equal(runtime.calls.includes('PutObjectCommand'),false);
    assert.deepEqual(await thread(f),before);assert.equal((await state(f)).max_progress,55);
    assert.equal(await runtime.run(),'clean-observed');assert.equal(runtime.calls.length,19);assert.equal((await scanRows(f)).length,1);assert.equal((await scanAudits(f)).length,1);
  }finally{runtime.close();}
});
test('pending and every failed scan remain quarantined without HEAD or recovered upload receipts', async () => {
  for(const result of ['PENDING','THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED']){
    const f=await scanCase(),runtime=inspectionRuntime(f,{result});
    try{assert.equal(await runtime.run(),result==='PENDING'?'pending':'blocked');assert.equal(runtime.calls.includes('HeadObjectCommand'),false);
      assert.equal((await uploadRows(f))[0].status,'reconciliation-required');assert.equal((await scanRows(f))[0].result,result);
    }finally{runtime.close();}
  }
});
test('known quarantined versions are scanned directly and negative evidence cannot be erased by clean or pending observations', async () => {
  const f=await scanCase('quarantined');
  for(const result of ['THREATS_FOUND','NO_THREATS_FOUND','PENDING','THREATS_FOUND']){
    const runtime=inspectionRuntime(f,{result});
    try{assert.equal(await runtime.run(),'blocked');assert.equal(runtime.calls.includes('ListObjectVersionsCommand'),false);}finally{runtime.close();}
  }
  assert.equal((await scanRows(f)).length,3);assert.equal((await scanAudits(f)).length,3);assert.equal((await uploadRows(f))[0].status,'quarantined');
});
test('scan observation and recovered upload receipt are exactly once under concurrent reconciliations', async () => {
  const f=await scanCase(),runtimes=Array.from({length:6},()=>inspectionRuntime(f));
  try{assert.deepEqual(await Promise.all(runtimes.map(r=>r.run())),Array(6).fill('clean-observed'));
    assert.equal((await scanRows(f)).length,1);assert.equal((await scanAudits(f)).length,1);
    assert.equal((await uploadAudits(f)).filter(row=>row.status==='quarantined').length,1);
  }finally{for(const r of runtimes)r.close();}
});
test('scan audit failure rolls back observation, receipt and upload audit together', async () => {
  const f=await scanCase(),fault=createPostgresMetaMediaScanRepository(scanFaultTransactions()),before=await uploadRows(f),audit=await uploadAudits(f);
  await acquisitionRejected(fault.record(f.job,scanObservation(f)),'DEPENDENCY_UNAVAILABLE');
  assert.deepEqual(await uploadRows(f),before);assert.deepEqual(await uploadAudits(f),audit);assert.deepEqual(await scanRows(f),[]);
  assert.equal(await fault.record(f.job,scanObservation(f)),'clean-observed');assert.equal((await scanAudits(f)).length,1);
});
test('lost scan commit acknowledgement recovers idempotently after repository restart', async () => {
  const f=await scanCase(),fault=createPostgresMetaMediaScanRepository(scanFaultTransactions(true));
  await acquisitionRejected(fault.record(f.job,scanObservation(f)),'DEPENDENCY_UNAVAILABLE');
  assert.equal((await uploadRows(f))[0].status,'quarantined');assert.equal((await scanRows(f)).length,1);
  assert.equal(await scans.record(f.job,scanObservation(f)),'clean-observed');assert.equal((await scanAudits(f)).length,1);
  assert.equal((await uploadAudits(f)).filter(row=>row.status==='quarantined').length,1);
});
test('revocation during the final S3 tag response preserves observed remote truth but denies its return', async () => {
  const f=await scanCase();let tags=0;
  const runtime=inspectionRuntime(f,{async reply(command){
    if(command.constructor.name==='GetObjectTaggingCommand'&&++tags===2)await meta.revokeConnection(f.scope.tenantId,f.scope.wabaId,f.scope.connectionVersion);
    return inspectionReply(command,f.intent,'NO_THREATS_FOUND',f.receipt.versionId);
  }});
  try{await acquisitionRejected(runtime.run(),'AUTHORIZATION_CHANGED');assert.equal((await scanRows(f))[0].result,'NO_THREATS_FOUND');
    assert.equal((await uploadRows(f))[0].status,'quarantined');const count=runtime.calls.length;
    await acquisitionRejected(runtime.run(),'AUTHORIZATION_CHANGED');assert.equal(runtime.calls.length,count);
  }finally{runtime.close();}
});
test('owner loss, sharing refusal and changed connection block inspection before any AWS call', async () => {
  for(const change of ['owner','sharing','connection']){
    const f=await scanCase(),runtime=inspectionRuntime(f);
    if(change==='owner')await pool.query("UPDATE tenant_memberships SET role='manager',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
    else if(change==='sharing')await signed(f,declinedValue());
    else await meta.revokeConnection(f.scope.tenantId,f.scope.wabaId,f.scope.connectionVersion);
    try{await acquisitionRejected(runtime.run(),'AUTHORIZATION_CHANGED');assert.deepEqual(runtime.calls,[]);assert.deepEqual(await scanRows(f),[]);}finally{runtime.close();}
  }
});
test('active dispatch cannot be inspected; an expired dispatch can recover without being reclaimed', async () => {
  const f=await scanCase('dispatching'),runtime=inspectionRuntime(f);
  try{await acquisitionRejected(runtime.run(),'IN_PROGRESS');assert.deepEqual(runtime.calls,[]);}finally{runtime.close();}
  const late=await journalCase(),short=createPostgresMetaMediaUploadJournal(transactions,{leaseDurationMs:250}),{job,claim}=await prepareAndClaim(late,short);
  await short.dispatch(claim);await new Promise(resolve=>setTimeout(resolve,300));
  const r=inspectionRuntime({...late,job});try{assert.equal(await r.run(),'clean-observed');assert.equal((await uploadRows(late))[0].claim_version,claim.claimVersion);}finally{r.close();}
});
test('missing and ambiguous remote inventory never reset the original upload or create scan evidence', async () => {
  for(const ambiguous of [false,true]){
    const f=await scanCase(),before=await uploadRows(f),runtime=inspectionRuntime(f,{reply(command){const r=inspectionReply(command,f.intent,'NO_THREATS_FOUND',f.receipt.versionId);
      if(command.constructor.name==='ListObjectVersionsCommand'){if(ambiguous)r.IsTruncated=true;else r.Versions=[];}return r;
    }});
    try{if(ambiguous)await acquisitionRejected(runtime.run(),'OUTCOME_UNKNOWN');else assert.equal(await runtime.run(),'missing');
      assert.deepEqual(await uploadRows(f),before);assert.deepEqual(await scanRows(f),[]);assert.equal(runtime.calls.includes('PutObjectCommand'),false);
    }finally{runtime.close();}
  }
});
test('conflicting observed object versions remain blocked and cannot bind an arbitrary recovery receipt', async () => {
  const f=await scanCase();assert.equal(await scans.record(f.job,scanObservation(f,'PENDING')),'pending');
  assert.equal(await scans.record(f.job,scanObservation(f,'NO_THREATS_FOUND','different-version')),'conflict');
  assert.equal(await scans.record(f.job,scanObservation(f)),'conflict');assert.equal((await uploadRows(f))[0].object_version_id,null);
  assert.equal((await scanRows(f)).length,3);
});
test('foreign tenants, sources, claims and mismatching stored versions cannot insert scan evidence', async () => {
  const f=await scanCase('quarantined');
  for(const [job,code] of [[{...f.job,claimVersion:f.job.claimVersion+1},'CONFLICT'],[{...f.job,intent:{...f.intent,tenantId:f.scope.tenantId+1}},'INVALID_INPUT'],
    [{...f.job,intent:{...f.intent,actor:'other-owner'}},'CONFLICT'],[{...f.job,intent:{...f.intent,contentSha256:'0'.repeat(64)}},'INVALID_INPUT']])await acquisitionRejected(scans.record(job,scanObservation(f)),code);
  await acquisitionRejected(scans.record(f.job,scanObservation(f,'PENDING','other-version')),'CONFLICT');assert.deepEqual(await scanRows(f),[]);
});
test('scan database guards reject pre-dispatch inserts, foreign claim association, mutation and deletion', async () => {
  const f=await journalCase(),{job,claim}=await prepareAndClaim(f);
  const insert=()=>pool.query(postgresMetaMediaScanSql.insert,[job.jobKey,f.scope.tenantId,claim.claimVersion,f.receipt.versionId,'PENDING',false]);
  await assert.rejects(insert());await uploadJournal.dispatch(claim);await insert();
  for(const sql of ["DELETE FROM meta_media_scan_observations WHERE tenant_id=$1", "UPDATE meta_media_scan_observations SET result='NO_THREATS_FOUND',content_verified=true WHERE tenant_id=$1",
    "UPDATE meta_media_scan_observations SET object_version_id='other-version' WHERE tenant_id=$1"])await assert.rejects(pool.query(sql,[f.scope.tenantId]));
  await assert.rejects(pool.query(postgresMetaMediaScanSql.insert,[job.jobKey,f.scope.tenantId,claim.claimVersion+1,f.receipt.versionId,'FAILED',false]));
  assert.equal((await scanRows(f)).length,1);
});
test('changed verdict after HEAD is retained as blocking evidence without finalizing an unknown upload', async () => {
  const f=await scanCase();let tags=0;const runtime=inspectionRuntime(f,{reply(command){
    const result=command.constructor.name==='GetObjectTaggingCommand'&&++tags===2?'THREATS_FOUND':'NO_THREATS_FOUND';
    return inspectionReply(command,f.intent,result,f.receipt.versionId);
  }});
  try{assert.equal(await runtime.run(),'blocked');assert.equal((await scanRows(f))[0].result,'THREATS_FOUND');assert.equal((await uploadRows(f))[0].status,'reconciliation-required');}
  finally{runtime.close();}
});

test('a currently missing scan tag reports pending even when a prior clean observation exists', async () => {
  const f=await scanCase();
  assert.equal(await scans.record(f.job,scanObservation(f,'PENDING')),'pending');
  assert.equal(await scans.record(f.job,scanObservation(f)),'clean-observed');
  assert.equal(await scans.record(f.job,scanObservation(f,'PENDING')),'pending');
  assert.equal((await scanRows(f)).length,2);assert.equal((await scanAudits(f)).length,2);
  assert.equal(await scans.record(f.job,scanObservation(f)),'clean-observed');
});
test('scan repository snapshots claim, target and receipt before asynchronous hashing', async () => {
  const f=await scanCase(),job={...f.job,intent:{...f.intent}},observation=scanObservation(f);
  const pending=scans.record(job,observation);
  job.claimVersion+=1;job.intent.actor='changed-after-call';observation.versionId='changed-after-call';observation.receipt.versionId='changed-after-call';
  assert.equal(await pending,'clean-observed');assert.equal((await uploadRows(f))[0].object_version_id,f.receipt.versionId);
  assert.equal((await scanRows(f))[0].object_version_id,f.receipt.versionId);
});

// Durable worker scheduling is exercised against the same real PostgreSQL
// schema and existing binary fixture; provider responses stay isolated.
const mediaTasks=createPostgresMetaMediaTaskRepository(transactions);
async function taskRows(f){return (await pool.query('SELECT * FROM meta_media_tasks WHERE tenant_id=$1 ORDER BY kind',[f.scope.tenantId])).rows;}
async function clearMediaTasks(){
  for(const kind of ['upload','inspect']){
    for(let i=0;i<1000;i++){if(await mediaTasks.discoverNext(kind)==='idle')break;if(i===999)assert.fail('discovery did not stop');}
    for(let i=0;i<1000;i++){const t=await mediaTasks.claimNext(kind);if(t===null)break;if(!t.exhausted)await mediaTasks.finish(t,'cancelled');if(i===999)assert.fail('claims did not stop');}
  }
}
async function taskCase({scan=false}={}){await clearMediaTasks();return scan?scanCase():journalCase();}
function taskFaultTransactions({lost=false,onlyStatus='pending'}={}){
  let armed=true;
  return {async transaction(options,work){let hit=false;const result=await transactions.transaction(options,tx=>work({async query(sql,p){
    if(armed&&sql===postgresMetaMediaTaskSql.audit&&JSON.parse(p[3]).status===onlyStatus){hit=true;if(!lost){armed=false;throw new Error('private task audit failure');}}
    return tx.query(sql,p);
  }}));if(hit&&armed&&lost){armed=false;throw new Error('private task commit acknowledgement lost');}return result;}};
}
function mediaWorkerRuntime(f,kind,options={}){
  const calls=[],timers=[];let failures=0;
  const runtime=createRailwayMetaMediaWorkerRuntime({environment:{...mediaEnvironment,...quarantineEnvironment,META_MEDIA_WORKER_MODE:kind},
    transactions:options.transactions??transactions,queries,recordFailure(){failures++;},
    timers:{schedule(work,delay){const t={work,delay};timers.push(t);return t;},cancel(t){const i=timers.indexOf(t);if(i>=0)timers.splice(i,1);}},
    transportOptions:{async fetchImplementation(rawUrl,init){calls.push(new URL(rawUrl).hostname);assert.equal(init.headers.authorization,`Bearer media-token-${f.scope.tenantId}`);
      return new URL(rawUrl).hostname==='graph.facebook.com'?metadataResponse():binaryResponse();}},
    quarantineOptions:{client:{async send(command){calls.push(command.constructor.name);return options.uploadReply?options.uploadReply(command):s3Reply(command);}}},
    inspectionOptions:{client:{async send(command){calls.push(command.constructor.name);return options.inspectReply?options.inspectReply(command):inspectionReply(command,f.intent,options.result??'NO_THREATS_FOUND',options.versionId??f.receipt.versionId);}}},
  });
  return {calls,timers,runtime,failures:()=>failures,async tick(){if(timers.length===0)await runtime.start();await timers.shift().work();}};
}

test('worker media discovery is deterministic and duplicate-safe across concurrent workers',async()=>{
  const f=await taskCase();const result=await Promise.all(Array.from({length:6},()=>mediaTasks.discoverNext('upload')));
  assert.equal(result.filter(x=>x==='enqueued').length,1);const [row]=await taskRows(f);
  assert.equal(row.actor_external_user_id,f.session.externalUserId);assert.equal(row.source_sha256,f.intent.sourceSha256);
  assert.equal(row.attempts,0);assert.equal((await taskRows(f)).length,1);
  const audit=await pool.query("SELECT metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.history.media-task'",[f.scope.tenantId]);assert.deepEqual(audit.rows,[{metadata_json:{kind:'upload',status:'pending'}}]);
});
test('worker media preserves an existing upload actor instead of silently replacing the owner',async()=>{
  const f=await taskCase();const actor=`remaining-owner-${f.scope.tenantId}`;await uploadJournal.prepare({...f.intent,actor});
  await mediaTasks.discoverNext('upload');assert.equal((await taskRows(f))[0].actor_external_user_id,actor);
});
test('worker media concurrent claims admit one worker and fence cross-tenant or stale completion',async()=>{
  const f=await taskCase();await mediaTasks.discoverNext('upload');
  const claims=await Promise.all(Array.from({length:6},()=>mediaTasks.claimNext('upload')));assert.equal(claims.filter(Boolean).length,1);
  const task=claims.find(Boolean);assert.equal(await mediaTasks.check(task),true);assert.equal(await mediaTasks.check({...task,tenantId:task.tenantId+1}),false);
  assert.equal(await mediaTasks.finish({...task,version:task.version+1},'cancelled'),false);
  assert.equal(await mediaTasks.finish(task,'retry'),true);assert.equal(await mediaTasks.check(task),false);assert.equal(await mediaTasks.claimNext('upload'),null);
  const [row]=await taskRows(f);assert.equal(row.status,'pending');const delay=Number((await pool.query('SELECT EXTRACT(EPOCH FROM(next_attempt_at-updated_at)) AS delay FROM meta_media_tasks WHERE job_key=$1',[task.jobKey])).rows[0].delay);
  assert.ok(delay>59&&delay<=60);
});
test('worker media expired lease is reclaimed without accepting the old worker',async()=>{
  const f=await taskCase(),short=createPostgresMetaMediaTaskRepository(transactions,{leaseMs:250});await short.discoverNext('upload');
  const old=await short.claimNext('upload');await pool.query('SELECT pg_sleep(0.3)');assert.equal(await short.check(old),false);
  const current=await mediaTasks.claimNext('upload');assert.equal(current.jobKey,old.jobKey);assert.equal(current.attempts,2);assert.equal(current.version,old.version+1);
  assert.equal(await mediaTasks.finish(old,'cancelled'),false);assert.equal(await mediaTasks.finish(current,'cancelled'),true);
  assert.equal((await taskRows(f))[0].status,'cancelled');
});
for(const [kind,maximum] of [['upload',3],['inspect',12]])test(`worker media ${kind} retries stop at the local attempt cap`,async()=>{
  const f=await taskCase({scan:kind==='inspect'}),short=createPostgresMetaMediaTaskRepository(transactions,{retryBaseMs:50,retryMaximumMs:50});await short.discoverNext(kind);
  for(let attempt=1;attempt<=maximum;attempt++){const task=await short.claimNext(kind);assert.equal(task.attempts,attempt);await short.finish(task,'retry');await pool.query('SELECT pg_sleep(0.06)');}
  assert.equal(await short.claimNext(kind),null);assert.equal((await taskRows(f))[0].status,'recovery-required');assert.equal(await short.discoverNext(kind),'idle');
});
test('worker media crash at the final claim yields exhausted recovery with no new attempt',async()=>{
  await taskCase();const short=createPostgresMetaMediaTaskRepository(transactions,{leaseMs:250});await short.discoverNext('upload');
  for(let i=1;i<=3;i++){const task=await short.claimNext('upload');assert.equal(task.attempts,i);await pool.query('SELECT pg_sleep(0.3)');}
  const task=await short.claimNext('upload');assert.equal(task.exhausted,true);assert.equal(task.attempts,3);assert.equal(await short.claimNext('upload'),null);
});
test('worker media discovery and claim roll back together with their audit',async()=>{
  const f=await taskCase(),broken=createPostgresMetaMediaTaskRepository(taskFaultTransactions());await assert.rejects(broken.discoverNext('upload'),{code:'DEPENDENCY_UNAVAILABLE'});assert.deepEqual(await taskRows(f),[]);
  await mediaTasks.discoverNext('upload');const before=await taskRows(f);
  const brokenClaim=createPostgresMetaMediaTaskRepository(taskFaultTransactions({onlyStatus:'running'}));await assert.rejects(brokenClaim.claimNext('upload'),{code:'DEPENDENCY_UNAVAILABLE'});assert.deepEqual(await taskRows(f),before);
});
test('worker media unknown discovery commit does not duplicate or reset the task',async()=>{
  const f=await taskCase(),lost=createPostgresMetaMediaTaskRepository(taskFaultTransactions({lost:true}));await assert.rejects(lost.discoverNext('upload'),{code:'DEPENDENCY_UNAVAILABLE'});
  assert.equal(await lost.discoverNext('upload'),'idle');assert.equal((await taskRows(f)).length,1);
});
test('worker media upload completion and inspection handoff are one transaction',async()=>{
  const f=await taskCase({scan:true});await mediaTasks.discoverNext('upload');const task=await mediaTasks.claimNext('upload');
  const before=await taskRows(f),broken=createPostgresMetaMediaTaskRepository(taskFaultTransactions());await assert.rejects(broken.finish(task,'inspection-ready'),{code:'DEPENDENCY_UNAVAILABLE'});assert.deepEqual(await taskRows(f),before);
  const lost=createPostgresMetaMediaTaskRepository(taskFaultTransactions({lost:true}));await assert.rejects(lost.finish(task,'inspection-ready'),{code:'DEPENDENCY_UNAVAILABLE'});
  assert.deepEqual((await taskRows(f)).map(r=>[r.kind,r.status]),[['inspect','pending'],['upload','done']]);assert.equal(await mediaTasks.finish(task,'inspection-ready'),false);
});
test('worker media terminal identity and status cannot be rewritten or deleted',async()=>{
  const f=await taskCase();await mediaTasks.discoverNext('upload');const task=await mediaTasks.claimNext('upload');await mediaTasks.finish(task,'cancelled');
  for(const sql of ["UPDATE meta_media_tasks SET status='pending',version=version+1 WHERE tenant_id=$1","UPDATE meta_media_tasks SET actor_external_user_id='other',version=version+1 WHERE tenant_id=$1","DELETE FROM meta_media_tasks WHERE tenant_id=$1"]){await assert.rejects(pool.query(sql,[f.scope.tenantId]));}
});
test('worker media runtime acquires then inspects the exact stored S3 version in separate loops',async()=>{
  const f=await taskCase(),upload=mediaWorkerRuntime(f,'upload');try{await upload.tick();assert.equal(upload.failures(),0);
    assert.deepEqual((await taskRows(f)).map(r=>[r.kind,r.status]),[['inspect','pending'],['upload','done']]);assert.equal(upload.calls.filter(x=>x==='PutObjectCommand').length,1);
    assert.deepEqual(upload.calls.slice(0,2),['graph.facebook.com','lookaside.fbsbx.com']);}finally{await upload.runtime.close();}
  const inspect=mediaWorkerRuntime(f,'inspect',{versionId:'s3-integration-version-1'});try{await inspect.tick();assert.equal(inspect.failures(),0);
    assert.deepEqual((await taskRows(f)).map(r=>[r.kind,r.status]),[['inspect','done'],['upload','done']]);assert.equal(inspect.calls.includes('PutObjectCommand'),false);assert.equal(inspect.calls.includes('ListObjectVersionsCommand'),false);
    assert.equal((await scanRows(f))[0].result,'NO_THREATS_FOUND');assert.equal((await state(f)).status==='complete',false);}finally{await inspect.runtime.close();}
});
test('worker media ambiguous PUT hands off inspection without downloading or uploading twice',async()=>{
  const f=await taskCase(),worker=mediaWorkerRuntime(f,'upload',{uploadReply(command){if(command.constructor.name==='PutObjectCommand')throw Object.assign(new Error('private ambiguous S3'),{$metadata:{httpStatusCode:503}});return s3Reply(command);}});
  try{await worker.tick();await worker.tick();assert.equal(worker.calls.filter(x=>x==='PutObjectCommand').length,1);assert.equal(worker.calls.filter(x=>x==='graph.facebook.com').length,1);
    assert.equal((await uploadRows(f))[0].status,'reconciliation-required');assert.deepEqual((await taskRows(f)).map(r=>[r.kind,r.status]),[['inspect','pending'],['upload','done']]);}finally{await worker.runtime.close();}
});
test('worker media recovers a committed upload after its queue acknowledgement is lost',async()=>{
  const f=await taskCase({scan:true}),worker=mediaWorkerRuntime(f,'upload');try{await worker.tick();assert.deepEqual(worker.calls,[]);assert.equal((await taskRows(f)).find(r=>r.kind==='upload').status,'done');}finally{await worker.runtime.close();}
});
for(const kind of ['upload','inspect'])test(`worker media ${kind} cancels a revoked original actor with zero provider calls`,async()=>{
  const f=await taskCase({scan:kind==='inspect'});await mediaTasks.discoverNext(kind);
  await pool.query("UPDATE tenant_memberships SET role='agent',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  const worker=mediaWorkerRuntime(f,kind);try{await worker.tick();assert.deepEqual(worker.calls,[]);assert.equal((await taskRows(f)).find(r=>r.kind===kind).status,'cancelled');}finally{await worker.runtime.close();}
});
test('worker media lost task lease before provider access is fenced without network traffic',async()=>{
  const f=await taskCase();const tx={transaction:(o,work)=>transactions.transaction(o,base=>work({query:(sql,p)=>sql===postgresMetaMediaTaskSql.check?Promise.resolve({rows:[],rowCount:0}):base.query(sql,p)}))};
  const worker=mediaWorkerRuntime(f,'upload',{transactions:tx});try{await worker.tick();assert.deepEqual(worker.calls,[]);assert.equal((await taskRows(f))[0].status,'pending');}finally{await worker.runtime.close();}
});
test('worker media shutdown preserves in-flight receipt and schedules inspection through crash discovery',async()=>{
  const f=await taskCase();let entered,release;const reached=new Promise(r=>{entered=r;});
  const worker=mediaWorkerRuntime(f,'upload',{async uploadReply(command){if(command.constructor.name==='PutObjectCommand'){entered();await new Promise(r=>{release=r;});}return s3Reply(command);}});
  const active=worker.tick();await reached;let closed=false;const close=worker.runtime.close().then(()=>{closed=true;});await Promise.resolve();assert.equal(closed,false);release();await Promise.all([active,close]);
  assert.equal((await uploadRows(f))[0].status,'quarantined');assert.equal((await taskRows(f))[0].status,'pending');
  assert.equal(await mediaTasks.discoverNext('inspect'),'enqueued');assert.equal(worker.calls.filter(x=>x==='PutObjectCommand').length,1);
});

test('worker media lost lease during parallel S3 preflight blocks all subsequent PUTs',async()=>{
  const f=await taskCase();let stale=false;
  const tx={transaction:(o,work)=>transactions.transaction(o,base=>work({query:(sql,p)=>stale&&sql===postgresMetaMediaTaskSql.check?Promise.resolve({rows:[],rowCount:0}):base.query(sql,p)}))};
  const worker=mediaWorkerRuntime(f,'upload',{transactions:tx,uploadReply(command){stale=true;return s3Reply(command);}});
  try{await worker.tick();assert.equal(worker.calls.includes('PutObjectCommand'),false);assert.equal(worker.calls.filter(x=>x.endsWith('Command')).length,6);
    assert.equal((await uploadRows(f))[0].status,'reconciliation-required');assert.equal((await taskRows(f))[0].status,'pending');}finally{await worker.runtime.close();}
});
test('worker media inspection stops between tagging and HEAD after losing its claim',async()=>{
  const f=await taskCase({scan:true});let stale=false;
  const tx={transaction:(o,work)=>transactions.transaction(o,base=>work({query:(sql,p)=>stale&&sql===postgresMetaMediaTaskSql.check?Promise.resolve({rows:[],rowCount:0}):base.query(sql,p)}))};
  const worker=mediaWorkerRuntime(f,'inspect',{transactions:tx,inspectReply(command){if(command.constructor.name==='GetObjectTaggingCommand')stale=true;return inspectionReply(command,f.intent,'NO_THREATS_FOUND',f.receipt.versionId);}});
  try{await worker.tick();assert.equal(worker.calls.includes('GetObjectTaggingCommand'),true);assert.equal(worker.calls.includes('HeadObjectCommand'),false);
    assert.deepEqual(await scanRows(f),[]);assert.equal((await taskRows(f))[0].status,'pending');}finally{await worker.runtime.close();}
});

test('worker media transient claim-check failure during S3 inspection remains retryable',async()=>{
  const f=await taskCase({scan:true});let unavailable=false;
  const tx={transaction:(o,work)=>transactions.transaction(o,base=>work({async query(sql,p){if(unavailable&&sql===postgresMetaMediaTaskSql.check)throw new Error('private database unavailable');return base.query(sql,p);}}))};
  const worker=mediaWorkerRuntime(f,'inspect',{transactions:tx,inspectReply(command){if(command.constructor.name==='GetObjectTaggingCommand')unavailable=true;return inspectionReply(command,f.intent,'NO_THREATS_FOUND',f.receipt.versionId);}});
  try{await worker.tick();assert.equal(worker.calls.includes('HeadObjectCommand'),false);assert.equal((await taskRows(f))[0].status,'pending');assert.deepEqual(await scanRows(f),[]);}finally{await worker.runtime.close();}
});

const mediaTaskReader=createPostgresMetaMediaTaskReader(queries);
async function diagnosticCase(options={}){const f=await taskCase(options);await mediaTasks.discoverNext(options.scan?'inspect':'upload');return f;}
test('diagnostic media owner reads a bounded safe task snapshot with no changes to journals or audit',async()=>{
  const f=await diagnosticCase(),before=await taskRows(f),auditBefore=(await pool.query('SELECT count(*) FROM audit_logs WHERE tenant_id=$1',[f.scope.tenantId])).rows;
  const result=await mediaTaskReader.read(f.session);assert.equal(result.tasks.length,1);assert.equal(result.tasks[0].status,'pending');assert.equal(result.tasks[0].attempts,0);
  assert.deepEqual(result.tasks[0].scanResults,[]);assert.equal(result.nextCursor,null);
  assert.doesNotMatch(JSON.stringify(result),/tenantId|actor|waba|phone|sourceSha256|objectKey|bucket|token|mime|content|24230790383178626/);
  assert.deepEqual(await taskRows(f),before);assert.deepEqual((await pool.query('SELECT count(*) FROM audit_logs WHERE tenant_id=$1',[f.scope.tenantId])).rows,auditBefore);
});
test('diagnostic media current owner can inspect jobs after provider revocation without granting media access',async()=>{
  const f=await diagnosticCase({scan:true});await meta.revokeConnection(f.scope.tenantId,f.scope.wabaId,f.scope.connectionVersion);
  const result=await mediaTaskReader.read(f.session);assert.equal(result.tasks.length,1);assert.equal(await mediaBindings.readBoundMedia(f.scope.tenantId,f.key),null);
});
test('diagnostic media retains the original job actor while allowing the current workspace owner to review it',async()=>{
  const f=await diagnosticCase();await pool.query("UPDATE tenant_memberships SET role='agent',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  await assert.rejects(mediaTaskReader.read(f.session),{code:'PERMISSION_DENIED'});
  const owner={...f.session,externalUserId:`remaining-owner-${f.scope.tenantId}`};assert.equal((await mediaTaskReader.read(owner)).tasks.length,1);
  assert.equal((await taskRows(f))[0].actor_external_user_id,f.session.externalUserId);
});
for(const change of ['membership','tenant'])test(`diagnostic media rejects stale session after ${change} becomes ineligible`,async()=>{
  const f=await diagnosticCase();if(change==='membership')await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  else await pool.query("UPDATE tenants SET status='blocked' WHERE id=$1",[f.scope.tenantId]);
  await assert.rejects(mediaTaskReader.read(f.session),{code:'PERMISSION_DENIED'});
});
test('diagnostic media cross-tenant and invented cursors have the same rejection',async()=>{
  const a=await diagnosticCase(),row=(await mediaTaskReader.read(a.session)).tasks[0],b=await diagnosticCase();
  for(const cursor of [{jobKey:row.jobKey,kind:row.kind},{jobKey:`media_upload_v1_${'0'.repeat(64)}`,kind:'upload'}])await assert.rejects(mediaTaskReader.read(b.session,cursor),{code:'INVALID_REQUEST'});
  await assert.rejects(mediaTaskReader.read({...a.session,tenantId:b.scope.tenantId}),{code:'PERMISSION_DENIED'});
});
test('diagnostic media exposes live and expired leases distinctly without reclaiming them',async()=>{
  const f=await diagnosticCase(),short=createPostgresMetaMediaTaskRepository(transactions,{leaseMs:250}),claimed=await short.claimNext('upload');
  const active=await mediaTaskReader.read(f.session);assert.equal(active.tasks[0].status,'running');assert.equal(active.tasks[0].leaseExpired,false);assert.equal(active.tasks[0].nextAttemptAt,null);
  await pool.query('SELECT pg_sleep(0.3)');const expired=await mediaTaskReader.read(f.session);assert.equal(expired.tasks[0].leaseExpired,true);assert.equal((await taskRows(f))[0].version,claimed.version);
  const next=await mediaTasks.claimNext('upload');await mediaTasks.finish(next,'cancelled');
});
test('diagnostic media preserves both blocking and clean historical scan evidence without declaring current safety',async()=>{
  const f=await diagnosticCase({scan:true});await scans.record(f.job,scanObservation(f,'THREATS_FOUND'));await scans.record(f.job,scanObservation(f));
  const result=await mediaTaskReader.read(f.session);assert.deepEqual(result.tasks[0].scanResults,['NO_THREATS_FOUND','THREATS_FOUND']);assert.equal(result.tasks[0].multipleScanVersions,false);
  assert.equal(result.tasks[0].status,'pending');assert.doesNotMatch(JSON.stringify(result),/safe|available|versionId|receipt/);
});
test('diagnostic media reports conflicting scan versions without exposing storage version identifiers',async()=>{
  const f=await diagnosticCase({scan:true});await scans.record(f.job,scanObservation(f,'PENDING','scan-version-a'));await scans.record(f.job,scanObservation(f,'PENDING','scan-version-b'));
  const result=await mediaTaskReader.read(f.session);assert.deepEqual(result.tasks[0].scanResults,['PENDING']);assert.equal(result.tasks[0].multipleScanVersions,true);assert.doesNotMatch(JSON.stringify(result),/scan-version/);
});
test('diagnostic media unknown cancellation cause is represented only by its recorded status',async()=>{
  const f=await diagnosticCase(),task=await mediaTasks.claimNext('upload');
  assert.equal(task.tenantId,f.scope.tenantId);assert.equal(await mediaTasks.finish(task,'cancelled'),true);
  const result=await mediaTaskReader.read(f.session);assert.equal(result.tasks[0].status,'cancelled');assert.equal(result.tasks[0].nextAttemptAt,null);assert.equal(result.tasks[0].leaseExpiresAt,null);
  assert.doesNotMatch(JSON.stringify(result),/owner-revoked|malware|unauthorized/);
});
test('diagnostic media empty authorized workspace returns an empty page',async()=>{
  const f=await newCase({withCredential:true});assert.deepEqual(await mediaTaskReader.read(f.session),{tasks:[],nextCursor:null});
});
test('diagnostic media task rows survive phase handoff and pagination distinguishes the two task kinds',async()=>{
  const f=await taskCase({scan:true});await mediaTasks.discoverNext('upload');const task=await mediaTasks.claimNext('upload');await mediaTasks.finish(task,'inspection-ready');
  const page=await mediaTaskReader.read(f.session);assert.deepEqual(page.tasks.map(t=>[t.kind,t.status]),[['inspect','pending'],['upload','done']]);
  assert.deepEqual((await mediaTaskReader.read(f.session,{jobKey:task.jobKey,kind:'inspect'})).tasks.map(t=>t.kind),['upload']);
});
test('diagnostic media HTTP read uses the resolved workspace and preserves current database authorization',async()=>{
  const f=await diagnosticCase();const serviceIdentity={teamSlug:'connect-team',projectName:'connect-web',environment:'production'};
  const handler=createRailwayApiHttpHandler({expectedServiceIdentity:serviceIdentity,oidcVerifier:{async verify(){return {provider:'vercel',...serviceIdentity,subject:'owner:connect-team:project:connect-web:environment:production'};}},
    endUserSessionVerifier:{async verify(){return {externalUserId:f.session.externalUserId,externalOrganizationId:'org_verified'};}},
    operations:[createRailwayMetaMediaTaskReadOperation({tenantSessions:{async resolve(){return f.session;}},mediaTasks:mediaTaskReader})]});
  const send=()=>handler.handle(new Request('https://connect-api.invalid/v1/connect',{method:'POST',headers:{'content-type':'application/json','x-vercel-oidc-token':'oidc.payload.signature',authorization:'Bearer user.payload.signature'},body:JSON.stringify({contractVersion:'connect.railway-api.v1',operation:'meta.media-tasks.read',requestKind:'query',idempotencyKey:null,payload:{}})}));
  const response=await send();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).data.page.tasks.length,1);
  await pool.query("UPDATE tenant_memberships SET role='agent',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  const denied=await send();assert.equal((await denied.json()).code,'PERMISSION_DENIED');
});
test('diagnostic media keyset pagination returns every task once even when its state changes',async()=>{
  await clearMediaTasks();const f=await newCase({withCredential:true});const ids=Array.from({length:55},(_,i)=>`wamid.diagnostic-page-${i}`);
  await signed(f,withMessages(ids.map(id=>mediaPlaceholder({id}))));await drain();
  const source=mediaValue();source.messages=ids.map(id=>({...source.messages[0],id}));await signed(f,source);
  for(let i=0;i<55;i++)assert.equal(await mediaBindings.bindNext(),'bound');
  for(let i=0;i<55;i++)assert.equal(await mediaTasks.discoverNext('upload'),'enqueued');
  const first=await mediaTaskReader.read(f.session);assert.equal(first.tasks.length,50);assert.ok(first.nextCursor);
  const claim=await mediaTasks.claimNext('upload');await mediaTasks.finish(claim,'cancelled');
  const second=await mediaTaskReader.read(f.session,first.nextCursor);assert.equal(second.tasks.length,5);assert.equal(second.nextCursor,null);
  assert.equal(new Set([...first.tasks,...second.tasks].map(t=>`${t.jobKey}.${t.kind}`)).size,55);
  const refreshed=await mediaTaskReader.read(f.session);assert.deepEqual(refreshed.tasks.map(t=>t.jobKey),first.tasks.map(t=>t.jobKey));
  assert.deepEqual((await mediaTaskReader.read(f.session,{jobKey:second.tasks[4].jobKey,kind:second.tasks[4].kind})).tasks,[]);
});

const fileAuthorization=createPostgresMetaMediaFileAuthorization(transactions);
async function readableFileCase({clean=true}={}) {
  const f=await scanCase('quarantined');
  if(clean)await scans.record(f.job,scanObservation(f));
  return f;
}
function fileReadRuntime(f,options={}) {
  const calls=[];
  const runtime=createRailwayMetaMediaFileReadRuntime({environment:quarantineEnvironment,transactions:options.transactions??transactions,
    readOptions:{client:{async send(command){calls.push(command.constructor.name);return options.reply?options.reply(command,calls):mediaFileReply(command,f.intent,f.receipt.versionId);}}}});
  return {calls,runtime,run:(session=f.session,consume=async file=>{assert.deepEqual(file.bytes,mediaBytes);return file.sizeBytes;})=>runtime.withFile(session,f.key,consume)};
}
test('file read PostgreSQL resolves current source and exact receipt, then delivers verified bytes without changing Inbox',async()=>{
  const f=await readableFileCase(),before=await thread(f),audits=await uploadAudits(f),r=fileReadRuntime(f);let buffer;
  try {
    assert.equal(await r.run(f.session,async file=>{buffer=file.bytes;assert.deepEqual(file.bytes,mediaBytes);return file.sizeBytes;}),mediaBytes.length);
    assert.ok(buffer.every(v=>v===0));assert.equal(r.calls.length,9);assert.deepEqual(await thread(f),before);assert.deepEqual(await uploadAudits(f),audits);
    assert.equal((await scanRows(f)).length,1);assert.equal((await scanAudits(f)).length,1);
  }finally{r.runtime.close();}
});
test('file read PostgreSQL authorizes each current Inbox role independently of the historical upload actor',async()=>{
  const f=await readableFileCase();
  await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  for(const role of ['owner','manager','agent','viewer']) {
    const viewer={...f.session,externalUserId:`file-reader-${role}-${f.scope.tenantId}`,role};
    await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,$3,'active')",[f.scope.tenantId,viewer.externalUserId,role]);
    const r=fileReadRuntime(f);try {assert.equal(await r.run(viewer),mediaBytes.length);}finally{r.runtime.close();}
  }
  assert.equal((await uploadRows(f))[0].actor_external_user_id,f.session.externalUserId);
});
for(const change of ['membership','tenant','connection','sharing','echo-delete'])test(`file read PostgreSQL rejects ${change} revocation before S3`,async()=>{
  const f=await readableFileCase();
  if(change==='membership')await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  if(change==='tenant')await pool.query("UPDATE tenants SET status='blocked' WHERE id=$1",[f.scope.tenantId]);
  if(change==='connection')await meta.revokeConnection(f.scope.tenantId,f.scope.wabaId,f.scope.connectionVersion);
  if(change==='sharing')await signed(f,declinedValue());
  if(change==='echo-delete')await echoes.record(f.scope,{...revoke(f),mutation:{kind:'revoke',originalProviderMessageId:'wamid.history-media'}});
  const r=fileReadRuntime(f);try {await assert.rejects(r.run(),{code:'ACCESS_DENIED'});assert.deepEqual(r.calls,[]);}finally{r.runtime.close();}
});
test('file read PostgreSQL cannot cross tenants using another message key or forged tenant session',async()=>{
  const a=await readableFileCase(),b=await readableFileCase(),r=fileReadRuntime(a);
  try {
    await assert.rejects(r.runtime.withFile(b.session,a.key,async()=>assert.fail('No content expected')),{code:'ACCESS_DENIED'});
    await assert.rejects(r.run({...a.session,tenantId:b.scope.tenantId}),{code:'ACCESS_DENIED'});assert.deepEqual(r.calls,[]);
  }finally{r.runtime.close();}
});
test('file read PostgreSQL requires a stored verified clean observation and retains every historical blocking result',async()=>{
  for(const result of ['PENDING','THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED']) {
    const f=await readableFileCase({clean:result!=='PENDING'});await scans.record(f.job,scanObservation(f,result));
    const r=fileReadRuntime(f);try {await assert.rejects(r.run(),{code:'NOT_READY'});assert.deepEqual(r.calls,[]);}finally{r.runtime.close();}
  }
});
test('file read PostgreSQL does not recover an unknown upload or choose between conflicting versions during a user read',async()=>{
  const f=await scanCase();await scans.record(f.job,scanObservation(f,'PENDING','scan-version-a'));await scans.record(f.job,scanObservation(f,'PENDING','scan-version-b'));
  const r=fileReadRuntime(f);try {await assert.rejects(r.run(),{code:'NOT_READY'});assert.deepEqual(r.calls,[]);assert.equal((await uploadRows(f))[0].status,'reconciliation-required');}finally{r.runtime.close();}
});
test('file read PostgreSQL initial blocking provider result commits evidence without retrieving a body',async()=>{
  const f=await readableFileCase(),r=fileReadRuntime(f,{reply:command=>mediaFileReply(command,f.intent,f.receipt.versionId,{scan:'THREATS_FOUND'})});
  try {await assert.rejects(r.run(),{code:'NOT_READY'});assert.equal(r.calls.length,7);assert.ok((await scanRows(f)).some(x=>x.result==='THREATS_FOUND'));}finally{r.runtime.close();}
});
test('file read PostgreSQL final blocking result survives a concurrent viewer revocation while bytes remain withheld',async()=>{
  const f=await readableFileCase(),r=fileReadRuntime(f,{async reply(command,calls){
    if(calls.length===9)await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
    return mediaFileReply(command,f.intent,f.receipt.versionId,{scan:calls.length===9?'THREATS_FOUND':'NO_THREATS_FOUND'});
  }});
  try {await assert.rejects(r.run(),{code:'NOT_READY'});assert.equal(r.calls.length,9);assert.ok((await scanRows(f)).some(x=>x.result==='THREATS_FOUND'));}finally{r.runtime.close();}
});
test('file read PostgreSQL releases database locks during body transfer and catches membership revocation before release',async()=>{
  const f=await readableFileCase();let pulls=0,consumed=false;
  const stream=new ReadableStream({async pull(controller){
    if(pulls++===0)controller.enqueue(mediaBytes.slice(0,1));
    else {await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);controller.enqueue(mediaBytes.slice(1));controller.close();}
  }},{highWaterMark:0});
  const r=fileReadRuntime(f,{reply:command=>mediaFileReply(command,f.intent,f.receipt.versionId,{stream})});
  try {await assert.rejects(r.run(f.session,async()=>{consumed=true;}),{code:'ACCESS_DENIED'});assert.equal(r.calls.length,8);assert.equal(consumed,false);}finally{r.runtime.close();}
});
test('file read PostgreSQL committed blocking scan during download prevents final tag read and content delivery',async()=>{
  const f=await readableFileCase(),r=fileReadRuntime(f,{async reply(command){
    if(command.constructor.name==='GetObjectCommand')await scans.record(f.job,scanObservation(f,'FAILED'));
    return mediaFileReply(command,f.intent,f.receipt.versionId);
  }});
  try {await assert.rejects(r.run(),{code:'NOT_READY'});assert.equal(r.calls.length,8);}finally{r.runtime.close();}
});
test('file read PostgreSQL catches an echo deletion committed while waiting for the upload row lock',async()=>{
  const f=await readableFileCase(),blocker=await pool.connect();let entered;
  const started=new Promise(resolve=>{entered=resolve;});
  const wrapped={transaction:(options,work)=>transactions.transaction(options,tx=>work({async query(sql,params){
    if(sql===postgresMetaMediaUploadSql.lock)entered();return tx.query(sql,params);
  }}))};
  const authorization=createPostgresMetaMediaFileAuthorization(wrapped);
  await blocker.query('BEGIN');await blocker.query('SELECT job_key FROM meta_media_upload_jobs WHERE tenant_id=$1 FOR UPDATE',[f.scope.tenantId]);
  const pending=authorization.authorize(f.session,f.key);const assertion=assert.rejects(pending,{code:'ACCESS_DENIED'});
  try {
    await started;await echoes.record(f.scope,{...revoke(f),mutation:{kind:'revoke',originalProviderMessageId:'wamid.history-media'}});
    await blocker.query('COMMIT');await assertion;
  }finally{await blocker.query('ROLLBACK');blocker.release();}
});
test('file read PostgreSQL serializes scan authorization behind a committed blocking observation',async()=>{
  const f=await readableFileCase(),blocker=await pool.connect();
  await blocker.query('BEGIN');await blocker.query('SELECT job_key FROM meta_media_upload_jobs WHERE tenant_id=$1 FOR UPDATE',[f.scope.tenantId]);
  const pending=fileAuthorization.authorize(f.session,f.key);const assertion=assert.rejects(pending,{code:'NOT_READY'});
  try {
    const tx={transaction:async(_options,work)=>work({query:async(sql,params)=>blocker.query(sql,params)})};
    await createPostgresMetaMediaScanRepository(tx).record(f.job,scanObservation(f,'FAILED'));
    await blocker.query('COMMIT');await assertion;
  }finally{await blocker.query('ROLLBACK');blocker.release();}
});
test('file read PostgreSQL audit rollback and lost scan commit acknowledgement both withhold the file',async()=>{
  for(const lostCommit of [false,true]) {
    const f=await readableFileCase(),r=fileReadRuntime(f,{transactions:scanFaultTransactions(lostCommit),reply:command=>mediaFileReply(command,f.intent,f.receipt.versionId,{scan:'THREATS_FOUND'})});
    try {await assert.rejects(r.run(),{code:'DEPENDENCY_UNAVAILABLE'});assert.equal(r.calls.length,7);assert.equal((await scanRows(f)).some(x=>x.result==='THREATS_FOUND'),lostCommit);}finally{r.runtime.close();}
  }
});
test('file read PostgreSQL malformed membership result and dependency errors cannot grant access',async()=>{
  const f=await readableFileCase();
  const broken=createPostgresMetaMediaFileAuthorization({transaction:(options,work)=>transactions.transaction(options,tx=>work({async query(sql,params){
    if(sql===postgresMetaMediaFileAuthorizationSql.member)throw new Error('private-database-details');return tx.query(sql,params);
  }}))});
  await assert.rejects(broken.authorize(f.session,f.key),error=>error.code==='DEPENDENCY_UNAVAILABLE'&&!error.message.includes('private-database-details'));
});
import { createServer as createNodeServer } from 'node:http';
import { createPostgresMetaMediaFileAdmission } from '../../server/platform/postgresMetaMediaFileAdmission.ts';
import { createRailwayMetaMediaFileHttpHandler } from '../../server/platform/railwayMetaMediaFileHttpHandler.ts';
import { createRailwayNodeHttpServer } from '../../server/platform/railwayNodeHttpServer.ts';
import { createRailwayTenantSessionResolver } from '../../server/platform/railwayTenantSessionResolver.ts';
import { createPostgresClerkOrganizationBindingRepository } from '../../server/platform/postgresClerkOrganizationBindingRepository.ts';
import { createPostgresTenantSelectionRepository } from '../../server/platform/postgresTenantSelectionRepository.ts';

const fileAdmission=createPostgresMetaMediaFileAdmission(transactions);
async function fileAccessAudits(f){return (await pool.query("SELECT actor_external_user_id,action,target_type,target_id,metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.media.file.read-admitted' ORDER BY id",[f.scope.tenantId])).rows;}
test('file admission PostgreSQL records an eligible attempt with current actor and opaque message key',async()=>{
  const f=await readableFileCase();await fileAdmission(f.session,f.key);
  assert.deepEqual(await fileAccessAudits(f),[{actor_external_user_id:f.session.externalUserId,action:'meta.media.file.read-admitted',target_type:'message',target_id:f.key,metadata_json:{phase:'read-admitted'}}]);
});
test('file admission PostgreSQL serializes quota across independent runtime instances',async()=>{
  const f=await readableFileCase();const results=await Promise.allSettled(Array.from({length:12},()=>createPostgresMetaMediaFileAdmission(transactions)(f.session,f.key)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,10);
  assert.ok(results.filter(r=>r.status==='rejected').every(r=>r.reason.code==='RATE_LIMITED'));assert.equal((await fileAccessAudits(f)).length,10);
});
test('file admission PostgreSQL isolates the quota by tenant and current viewer and expires it using database time',async()=>{
  const a=await readableFileCase(),b=await readableFileCase();
  for(let i=0;i<10;i++)await fileAdmission(a.session,a.key);
  await assert.rejects(fileAdmission(a.session,a.key),{code:'RATE_LIMITED'});await fileAdmission(b.session,b.key);
  const viewer={...a.session,externalUserId:`http-file-viewer-${a.scope.tenantId}`,role:'viewer'};
  await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'viewer','active')",[a.scope.tenantId,viewer.externalUserId]);
  await fileAdmission(viewer,a.key);
  await pool.query("UPDATE audit_logs SET created_at=clock_timestamp()-interval '61 seconds' WHERE tenant_id=$1 AND action='meta.media.file.read-admitted'",[a.scope.tenantId]);
  await fileAdmission(a.session,a.key);assert.equal((await fileAccessAudits(a)).length,12);
});
test('file admission PostgreSQL never audits a revoked viewer or a file without a verified scan',async()=>{
  const f=await readableFileCase({clean:false});await assert.rejects(fileAdmission(f.session,f.key),{code:'NOT_READY'});
  await scans.record(f.job,scanObservation(f));await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  await assert.rejects(fileAdmission(f.session,f.key),{code:'ACCESS_DENIED'});assert.deepEqual(await fileAccessAudits(f),[]);
});
test('file admission PostgreSQL rolls back an audit whose transaction fails',async()=>{
  const f=await readableFileCase();const fail=createPostgresMetaMediaFileAdmission({transaction:(options,execute)=>transactions.transaction(options,async tx=>{
    await execute(tx);throw new Error('private-database-failure');
  })});await assert.rejects(fail(f.session,f.key),{code:'DEPENDENCY_UNAVAILABLE'});assert.deepEqual(await fileAccessAudits(f),[]);
});
async function fileHttpCase(options={}){
  const f=await readableFileCase(),r=fileReadRuntime(f,options);const organization=`org_media_http_${f.scope.tenantId}`;
  await pool.query('UPDATE tenants SET clerk_organization_id=$2 WHERE id=$1',[f.scope.tenantId,organization]);
  const sessions=createRailwayTenantSessionResolver({memberships:mediaMemberships,selections:createPostgresTenantSelectionRepository({queries,transactions}),identityOrganizations:createPostgresClerkOrganizationBindingRepository(queries)});
  const handler=createRailwayMetaMediaFileHttpHandler({origin:'https://connect.example.com',files:r.runtime,sessions,
    verifier:{async verify(){return {externalUserId:f.session.externalUserId,externalOrganizationId:organization};}}});
  return {...f,r,handler,request:()=>new Request(`https://railway.example.com/v1/media-files/${f.key}`,{headers:{origin:'https://connect.example.com',authorization:'Bearer user.payload.signature'}})};
}
test('binary HTTP PostgreSQL resolves real membership and organization, audits admission and writes actual bytes through Node HTTP',async()=>{
  const f=await fileHttpCase();let node;
  const service=createRailwayNodeHttpServer({port:3001,runtime:{handler:{handle:async()=>new Response(null,{status:404})},readiness:{check:async()=>({status:'ready'})},mediaFileHandler:f.handler}},
    {createServer(options,listener){node=createNodeServer(options,listener);const listen=node.listen.bind(node);node.listen=()=>listen(0,'127.0.0.1');return node;}});
  try {
    await service.start();const request=f.request();const response=await fetch(`http://127.0.0.1:${node.address().port}/v1/media-files/${f.key}`,{headers:request.headers});
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/octet-stream');assert.equal(response.headers.get('content-disposition'),'attachment; filename="media.bin"');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()),mediaBytes);assert.equal((await fileAccessAudits(f)).length,1);assert.equal(f.r.calls.length,9);
  }finally{await service.close();await f.handler.close();}
});
test('binary HTTP PostgreSQL rejects changed organization bindings without S3 or audit',async()=>{
  const f=await fileHttpCase();try {
    await pool.query('UPDATE tenants SET clerk_organization_id=NULL WHERE id=$1',[f.scope.tenantId]);
    const response=await f.handler.handle(f.request(),async()=>assert.fail('no bytes'));assert.equal(response.status,503);assert.deepEqual(f.r.calls,[]);assert.deepEqual(await fileAccessAudits(f),[]);
  }finally{await f.handler.close();}
});
test('binary HTTP PostgreSQL retains admission when membership is revoked during GET and never delivers bytes',async()=>{
  let f;f=await fileHttpCase({reply:async(command)=>{
    if(command.constructor.name==='GetObjectCommand')await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
    return mediaFileReply(command,f.intent,f.receipt.versionId);
  }});try {
    const response=await f.handler.handle(f.request(),async()=>assert.fail('no bytes'));assert.ok([403,503].includes(response.status));assert.equal((await fileAccessAudits(f)).length,1);
    assert.equal((await pool.query('SELECT status FROM tenant_memberships WHERE tenant_id=$1 AND external_user_id=$2',[f.scope.tenantId,f.session.externalUserId])).rows[0].status,'suspended');
  }finally{await f.handler.close();}
});

// These protocol cases use the repository's real PNG fixture and a dedicated
// local PostgreSQL database. Provider transport responses are isolated fixtures.
const inspectionRetries=createPostgresMetaMediaInspectionRetryRepository(transactions);
async function claimCaseInspection(f,selected=mediaTasks) {
  // Earlier retry tests intentionally leave delayed jobs. A global queue can
  // make those due between two claims; finish them through the real API.
  for(let i=0;i<1000;i++) {
    const task=await selected.claimNext('inspect');
    if(!task||task.tenantId===f.scope.tenantId)return task;
    if(!task.exhausted)await selected.finish(task,'cancelled');
  }
  assert.fail('unrelated inspection claims did not drain');
}
async function exhaustedInspectionCase({ambiguous=false}={}) {
  await clearMediaTasks();const f=await scanCase(ambiguous?'reconciliation-required':'quarantined');
  const short=createPostgresMetaMediaTaskRepository(transactions,{retryBaseMs:50,retryMaximumMs:50});
  assert.equal(await short.discoverNext('inspect'),'enqueued');let lastClaim;
  for(let i=1;i<=12;i++) {lastClaim=await claimCaseInspection(f,short);assert.equal(lastClaim.attempts,i);await short.finish(lastClaim,'retry');if(i<12)await pool.query('SELECT pg_sleep(0.06)');}
  const task=(await taskRows(f)).find(t=>t.kind==='inspect');assert.equal(task.status,'recovery-required');
  return {...f,lastClaim,input:{jobKey:task.job_key,expectedVersion:task.version}};
}
async function requestInspection(f,repo=inspectionRetries,session=f.session,input=f.input) {return repo.request(session,input,await metaMediaInspectionRetryKey(input));}
async function inspectionRetryRows(f) {return (await pool.query('SELECT * FROM meta_media_inspection_retry_requests WHERE tenant_id=$1 ORDER BY retry_number',[f.scope.tenantId])).rows;}
async function inspectionRetryAudits(f) {return (await pool.query("SELECT actor_external_user_id,metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.history.media-inspection-retry' ORDER BY id",[f.scope.tenantId])).rows;}
function retryFaultTransactions({lost=false}={}) {
  let armed=true;
  return {async transaction(options,work) {let hit=false;const result=await transactions.transaction(options,tx=>work({async query(sql,p){
    if(armed&&sql===postgresMetaMediaInspectionRetrySql.audit){hit=true;if(!lost){armed=false;throw new Error('private retry audit failure');}}
    return tx.query(sql,p);
  }}));if(armed&&hit&&lost){armed=false;throw new Error('private retry commit acknowledgement lost');}return result;}};
}
test('inspection retry queues exactly one attempt and preserves the original upload and cumulative attempts',async()=>{
  const f=await exhaustedInspectionCase(),before=await uploadRows(f);assert.equal(await requestInspection(f),'queued');
  const task=(await taskRows(f)).find(t=>t.kind==='inspect');assert.equal(task.status,'pending');assert.equal(task.attempts,12);assert.equal(task.operator_retry_count,1);
  assert.equal(task.version,f.input.expectedVersion+1);assert.equal(task.actor_external_user_id,f.session.externalUserId);assert.deepEqual(await uploadRows(f),before);
  assert.equal((await inspectionRetryRows(f)).length,1);assert.deepEqual(await inspectionRetryAudits(f),[{actor_external_user_id:f.session.externalUserId,metadata_json:{requestedTaskVersion:f.input.expectedVersion,retryNumber:1}}]);
  const view=(await mediaTaskReader.read(f.session)).tasks.find(t=>t.kind==='inspect');assert.equal(view.operatorRetries,1);assert.equal(view.version,task.version);assert.equal(view.attempts,12);
});
test('inspection retry serializes concurrent identical requests without granting extra attempts',async()=>{
  const f=await exhaustedInspectionCase();const result=await Promise.all(Array.from({length:6},()=>requestInspection(f)));
  assert.equal(result.filter(x=>x==='queued').length,1);assert.equal(result.filter(x=>x==='already-requested').length,5);
  assert.equal((await inspectionRetryRows(f)).length,1);assert.equal((await inspectionRetryAudits(f)).length,1);assert.equal((await taskRows(f))[0].operator_retry_count,1);
});
test('inspection retry a second current owner can request without replacing the original actor',async()=>{
  const f=await exhaustedInspectionCase(),owner={...f.session,externalUserId:`remaining-owner-${f.scope.tenantId}`};
  assert.equal(await requestInspection(f,inspectionRetries,owner),'queued');assert.equal((await taskRows(f))[0].actor_external_user_id,f.session.externalUserId);
  assert.equal((await inspectionRetryAudits(f))[0].actor_external_user_id,owner.externalUserId);
  await assert.rejects(requestInspection(f),{code:'CONFLICT'});
});
test('inspection retry concurrent different owners cannot both consume the same task version',async()=>{
  const f=await exhaustedInspectionCase(),owner={...f.session,externalUserId:`remaining-owner-${f.scope.tenantId}`};
  const result=await Promise.allSettled([requestInspection(f),requestInspection(f,inspectionRetries,owner)]);
  assert.equal(result.filter(x=>x.status==='fulfilled'&&x.value==='queued').length,1);
  assert.equal(result.filter(x=>x.status==='rejected'&&x.reason.code==='CONFLICT').length,1);assert.equal((await inspectionRetryRows(f)).length,1);
});
test('inspection retry audit failure rolls back both the request and queue grant',async()=>{
  const f=await exhaustedInspectionCase(),before=await taskRows(f),broken=createPostgresMetaMediaInspectionRetryRepository(retryFaultTransactions());
  await assert.rejects(requestInspection(f,broken),{code:'DEPENDENCY_UNAVAILABLE'});assert.deepEqual(await taskRows(f),before);assert.deepEqual(await inspectionRetryRows(f),[]);
  assert.deepEqual(await inspectionRetryAudits(f),[]);assert.equal(await requestInspection(f),'queued');
});
test('inspection retry an unknown commit acknowledgement replays without resetting a later task',async()=>{
  const f=await exhaustedInspectionCase(),lost=createPostgresMetaMediaInspectionRetryRepository(retryFaultTransactions({lost:true}));
  await assert.rejects(requestInspection(f,lost),{code:'DEPENDENCY_UNAVAILABLE'});
  const task=await mediaTasks.claimNext('inspect');assert.equal(task.attempts,13);await mediaTasks.finish(task,'retry');const before=await taskRows(f);
  assert.equal(await requestInspection(f),'already-requested');assert.deepEqual(await taskRows(f),before);assert.equal((await inspectionRetryAudits(f)).length,1);
});
test('inspection retry at most three explicit requests grant one attempt each and stop at fifteen',async()=>{
  const f=await exhaustedInspectionCase();
  for(let i=1;i<=3;i++) {
    const row=(await taskRows(f))[0],input={...f.input,expectedVersion:row.version};assert.equal(await requestInspection(f,inspectionRetries,f.session,input),'queued');
    const task=await mediaTasks.claimNext('inspect');assert.equal(task.attempts,12+i);await mediaTasks.finish(task,'retry');
    assert.equal((await taskRows(f))[0].status,'recovery-required');assert.equal(await mediaTasks.claimNext('inspect'),null);
  }
  const row=(await taskRows(f))[0];assert.equal(row.operator_retry_count,3);assert.equal(row.attempts,15);
  await assert.rejects(requestInspection(f,inspectionRetries,f.session,{...f.input,expectedVersion:row.version}),{code:'CONFLICT'});
  assert.equal((await inspectionRetryRows(f)).length,3);assert.equal((await inspectionRetryAudits(f)).length,3);
});
test('inspection retry worker inspects the existing version without uploading or fetching media again',async()=>{
  const f=await exhaustedInspectionCase(),before=await uploadRows(f);await requestInspection(f);const worker=mediaWorkerRuntime(f,'inspect');
  try {await worker.tick();assert.equal(worker.failures(),0);assert.ok(worker.calls.includes('GetObjectTaggingCommand'));assert.ok(worker.calls.includes('HeadObjectCommand'));
    assert.equal(worker.calls.some(x=>['PutObjectCommand','GetObjectCommand','graph.facebook.com','lookaside.fbsbx.com'].includes(x)),false);
    const row=(await taskRows(f))[0];assert.equal(row.status,'done');assert.equal(row.attempts,13);assert.equal(row.operator_retry_count,1);
    assert.equal((await scanRows(f))[0].result,'NO_THREATS_FOUND');assert.deepEqual(await uploadRows(f),before);
  } finally {await worker.runtime.close();}
});
test('inspection retry worker rechecks original membership and cancels a grant after revocation with zero provider calls',async()=>{
  const f=await exhaustedInspectionCase();await requestInspection(f);
  await pool.query("UPDATE tenant_memberships SET role='agent',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  const worker=mediaWorkerRuntime(f,'inspect');try {await worker.tick();assert.deepEqual(worker.calls,[]);assert.equal((await taskRows(f))[0].status,'cancelled');}finally{await worker.runtime.close();}
});
test('inspection retry denies revoked requester and original actor even with a stale owner session',async()=>{
  for(const target of ['requester','original']) {
    const f=await exhaustedInspectionCase(),owner={...f.session,externalUserId:`remaining-owner-${f.scope.tenantId}`};
    await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,target==='requester'?owner.externalUserId:f.session.externalUserId]);
    await assert.rejects(requestInspection(f,inspectionRetries,owner),{code:'PERMISSION_DENIED'});assert.deepEqual(await inspectionRetryRows(f),[]);
  }
});
for(const change of ['tenant','connection','sharing','deleted-message'])test(`inspection retry rejects current source invalidation: ${change}`,async()=>{
  const f=await exhaustedInspectionCase();
  if(change==='tenant')await pool.query("UPDATE tenants SET status='blocked' WHERE id=$1",[f.scope.tenantId]);
  if(change==='connection')await meta.revokeConnection(f.scope.tenantId,f.scope.wabaId,f.scope.connectionVersion);
  if(change==='sharing')await signed(f,declinedValue());
  if(change==='deleted-message')await echoes.record(f.scope,{...revoke(f),mutation:{kind:'revoke',originalProviderMessageId:'wamid.history-media'}});
  await assert.rejects(requestInspection(f),{code:'CONFLICT'});assert.deepEqual(await inspectionRetryRows(f),[]);assert.equal((await taskRows(f))[0].operator_retry_count,0);
});
for(const result of ['THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED'])test(`inspection retry cannot bypass historical ${result} even after clean evidence`,async()=>{
  const f=await exhaustedInspectionCase();await scans.record(f.job,scanObservation(f,result));await scans.record(f.job,scanObservation(f));
  await assert.rejects(requestInspection(f),{code:'CONFLICT'});assert.deepEqual(await inspectionRetryRows(f),[]);assert.equal((await scanRows(f)).length,2);
});
test('inspection retry conflicting scan versions and early permanent failures remain terminal',async()=>{
  const f=await exhaustedInspectionCase({ambiguous:true});await scans.record(f.job,scanObservation(f,'PENDING','scan-version-a'));await scans.record(f.job,scanObservation(f,'PENDING','scan-version-b'));
  await assert.rejects(requestInspection(f),{code:'CONFLICT'});
  const g=await diagnosticCase({scan:true}),task=await mediaTasks.claimNext('inspect');await mediaTasks.finish(task,'recovery-required');
  const row=(await taskRows(g))[0];await assert.rejects(requestInspection({...g,input:{jobKey:row.job_key,expectedVersion:row.version}}),{code:'CONFLICT'});
});
test('inspection retry cross-tenant and unknown jobs are indistinguishable and old worker claims stay fenced',async()=>{
  const f=await exhaustedInspectionCase(),other=await newCase({withCredential:true});
  for(const input of [f.input,{...f.input,jobKey:`media_upload_v1_${'0'.repeat(64)}`}])await assert.rejects(requestInspection(f,inspectionRetries,other.session,input),{code:'CONFLICT'});
  await requestInspection(f);assert.equal(await mediaTasks.check(f.lastClaim),false);assert.equal(await mediaTasks.finish(f.lastClaim,'retry'),false);
});
test('inspection retry request history cannot commit without queue and audit or be deleted or rewritten',async()=>{
  const f=await exhaustedInspectionCase(),p=[f.scope.tenantId,f.input.jobKey,f.input.expectedVersion,f.session.externalUserId,1,await metaMediaInspectionRetryKey(f.input)];
  for(const enqueue of [false,true])await assert.rejects(transactions.transaction({isolationLevel:'read-committed'},async tx=>{
    await tx.query(postgresMetaMediaInspectionRetrySql.insert,p);if(enqueue)await tx.query(postgresMetaMediaInspectionRetrySql.enqueue,[f.scope.tenantId,f.input.jobKey,f.input.expectedVersion]);
  }));
  assert.deepEqual(await inspectionRetryRows(f),[]);assert.equal((await taskRows(f))[0].operator_retry_count,0);
  await assert.rejects(pool.query("UPDATE meta_media_tasks SET version=version+1,status='pending',operator_retry_count=1,next_attempt_at=clock_timestamp() WHERE tenant_id=$1",[f.scope.tenantId]));
  await requestInspection(f);
  for(const sql of ["DELETE FROM meta_media_inspection_retry_requests WHERE tenant_id=$1","UPDATE meta_media_inspection_retry_requests SET retry_number=2 WHERE tenant_id=$1","UPDATE meta_media_tasks SET version=version+1,operator_retry_count=0 WHERE tenant_id=$1","UPDATE meta_media_tasks SET version=version+1,attempts=0 WHERE tenant_id=$1"]){await assert.rejects(pool.query(sql,[f.scope.tenantId]));}
});
test('inspection retry rereads an echo deletion committed during upload lock contention',async()=>{
  const f=await exhaustedInspectionCase(),blocker=await pool.connect();let entered;const started=new Promise(r=>{entered=r;});
  const wrapped={transaction:(o,work)=>transactions.transaction(o,tx=>work({async query(sql,p){if(sql===postgresMetaMediaUploadSql.lock)entered();return tx.query(sql,p);}}))};
  await blocker.query('BEGIN');await blocker.query('SELECT job_key FROM meta_media_upload_jobs WHERE tenant_id=$1 FOR UPDATE',[f.scope.tenantId]);
  const pending=requestInspection(f,createPostgresMetaMediaInspectionRetryRepository(wrapped)),assertion=assert.rejects(pending,{code:'CONFLICT'});
  try {await started;await echoes.record(f.scope,{...revoke(f),mutation:{kind:'revoke',originalProviderMessageId:'wamid.history-media'}});await blocker.query('COMMIT');await assertion;assert.deepEqual(await inspectionRetryRows(f),[]);}
  finally{await blocker.query('ROLLBACK');blocker.release();}
});
test('inspection retry serializes behind a concurrent blocking scan observation',async()=>{
  const f=await exhaustedInspectionCase(),blocker=await pool.connect();
  await blocker.query('BEGIN');await blocker.query('SELECT job_key FROM meta_media_upload_jobs WHERE tenant_id=$1 FOR UPDATE',[f.scope.tenantId]);
  const pending=requestInspection(f),assertion=assert.rejects(pending,{code:'CONFLICT'});
  try {const tx={transaction:async(_o,work)=>work({query:(sql,p)=>blocker.query(sql,p)})};await createPostgresMetaMediaScanRepository(tx).record(f.job,scanObservation(f,'FAILED'));
    await blocker.query('COMMIT');await assertion;assert.deepEqual(await inspectionRetryRows(f),[]);
  }finally{await blocker.query('ROLLBACK');blocker.release();}
});
test('inspection retry HTTP uses the verified current tenant and returns the recorded idempotent result',async()=>{
  const f=await exhaustedInspectionCase(),serviceIdentity={teamSlug:'connect-team',projectName:'connect-web',environment:'production'};
  const handler=createRailwayApiHttpHandler({expectedServiceIdentity:serviceIdentity,oidcVerifier:{async verify(){return {provider:'vercel',...serviceIdentity,subject:'owner:connect-team:project:connect-web:environment:production'};}},
    endUserSessionVerifier:{async verify(){return {externalUserId:f.session.externalUserId,externalOrganizationId:'org_verified'};}},
    operations:[createRailwayMetaMediaInspectionRetryOperation({tenantSessions:{async resolve(){return f.session;}},retries:inspectionRetries})]});
  const send=async()=>handler.handle(new Request('https://connect-api.invalid/v1/connect',{method:'POST',headers:{'content-type':'application/json','x-vercel-oidc-token':'oidc.payload.signature',authorization:'Bearer user.payload.signature'},body:JSON.stringify({contractVersion:'connect.railway-api.v1',operation:'meta.media-inspection.retry',requestKind:'mutation',idempotencyKey:await metaMediaInspectionRetryKey(f.input),payload:f.input})}));
  for(const status of ['queued','already-requested']) {const response=await send();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual((await response.json()).data,{status});}
  assert.equal((await inspectionRetryRows(f)).length,1);
});

const cleanupJobs=createPostgresMetaMediaCleanupRepository(transactions);
async function cleanupRows(f){return (await pool.query('SELECT * FROM meta_media_cleanup_jobs WHERE tenant_id=$1',[f.scope.tenantId])).rows;}
async function cleanupAudits(f){return (await pool.query("SELECT actor_external_user_id,metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.history.media-cleanup' ORDER BY id",[f.scope.tenantId])).rows;}
async function clearCleanup(){for(let i=0;i<1000;i++){const task=await cleanupJobs.claimNext();if(!task)return;if(!task.exhausted)await cleanupJobs.finish(task,'cancelled');}assert.fail('cleanup queue did not drain');}
async function cleanupCase({clean=false,ambiguous=false}={}){
  await clearCleanup();await clearMediaTasks();const f=await scanCase(ambiguous?'reconciliation-required':'quarantined');
  await mediaTasks.discoverNext('inspect');const task=await claimCaseInspection(f);await mediaTasks.finish(task,'blocked');
  await scans.record(f.job,scanObservation(f,clean?'NO_THREATS_FOUND':'THREATS_FOUND'));
  const row=(await taskRows(f)).find(t=>t.kind==='inspect');
  return {...f,cleanupInput:{jobKey:row.job_key,expectedVersion:row.version,confirm:'remove-quarantined-copy'}};
}
async function cleanupRequest(f,repo=cleanupJobs,session=f.session,input=f.cleanupInput){return repo.request(session,input,await metaMediaCleanupKey(input));}
function cleanupFaultTransactions({lost=false,when='pending'}={}){
  let armed=true;
  return {async transaction(o,work){let hit=false;const result=await transactions.transaction(o,tx=>work({async query(sql,p){
    if(armed&&sql===postgresMetaMediaCleanupSql.audit&&JSON.parse(p[4]).status===when){hit=true;if(!lost){armed=false;throw new Error('private cleanup audit failure');}}
    return tx.query(sql,p);
  }}));if(armed&&hit&&lost){armed=false;throw new Error('private cleanup commit acknowledgement lost');}return result;}};
}
function cleanupWorker(f,{repo=cleanupJobs,remove}={}){
  const calls=[];const storage=createS3MetaMediaCleanupStorage(quarantineEnvironment,{client:{async send(command){calls.push(command);if(command.constructor.name==='DeleteObjectCommand')return remove?remove(command):{$metadata:{httpStatusCode:204},VersionId:f.receipt.versionId};return s3Reply(command);}}});
  const worker=createMetaMediaCleanupWorker({jobs:repo,storage,stopping:()=>false});return{worker,calls,close:()=>storage.close()};
}
test('cleanup PostgreSQL owner request withdraws access and preserves upload, source, scan and message evidence',async()=>{
  const f=await cleanupCase({clean:true}),before={upload:await uploadRows(f),scan:await scanRows(f),tasks:await taskRows(f),counts:await counts(f)};
  assert.ok(await fileAuthorization.authorize(f.session,f.key));assert.equal((await mediaTaskReader.read(f.session)).tasks[0].canCleanup,true);
  assert.equal(await cleanupRequest(f),'queued');await assert.rejects(fileAuthorization.authorize(f.session,f.key),{code:'NOT_READY'});
  assert.deepEqual({upload:await uploadRows(f),scan:await scanRows(f),tasks:await taskRows(f),counts:await counts(f)},before);
  const view=(await mediaTaskReader.read(f.session)).tasks[0];assert.equal(view.canCleanup,false);assert.deepEqual(view.cleanup,{status:'pending',attempts:0});
  assert.doesNotMatch(JSON.stringify(view),/bucket|objectKey|objectVersion|kms|actor/);assert.equal((await cleanupAudits(f)).length,1);
});
test('cleanup PostgreSQL concurrent identical requests create one job and one audit',async()=>{
  const f=await cleanupCase(),results=await Promise.all(Array.from({length:6},()=>cleanupRequest(f)));
  assert.equal(results.filter(r=>r==='queued').length,1);assert.equal(results.filter(r=>r==='already-requested').length,5);assert.equal((await cleanupRows(f)).length,1);assert.equal((await cleanupAudits(f)).length,1);
});
test('cleanup PostgreSQL current owner can remove the copy after original actor and provider revocation',async()=>{
  const f=await cleanupCase(),owner={...f.session,externalUserId:`remaining-owner-${f.scope.tenantId}`};
  await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  await meta.revokeConnection(f.scope.tenantId,f.scope.wabaId,f.scope.connectionVersion);
  assert.equal(await cleanupRequest(f,cleanupJobs,owner),'queued');const w=cleanupWorker(f);try{await w.worker.run();assert.equal((await cleanupRows(f))[0].status,'removed');assert.equal((await cleanupAudits(f))[0].actor_external_user_id,owner.externalUserId);assert.equal((await uploadRows(f))[0].actor_external_user_id,f.session.externalUserId);}finally{w.close();}
});
test('cleanup PostgreSQL competing owners cannot replace the requested removal identity',async()=>{
  const f=await cleanupCase(),owner={...f.session,externalUserId:`remaining-owner-${f.scope.tenantId}`};
  const results=await Promise.allSettled([cleanupRequest(f),cleanupRequest(f,cleanupJobs,owner)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='CONFLICT').length,1);
  assert.equal((await cleanupRows(f)).length,1);
});
for(const target of ['owner','tenant'])test(`cleanup PostgreSQL current ${target} authorization is required despite a stale session`,async()=>{
  const f=await cleanupCase();if(target==='owner')await pool.query("UPDATE tenant_memberships SET role='agent',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);else await pool.query("UPDATE tenants SET status='blocked' WHERE id=$1",[f.scope.tenantId]);
  await assert.rejects(cleanupRequest(f),{code:'PERMISSION_DENIED'});assert.deepEqual(await cleanupRows(f),[]);
});
test('cleanup PostgreSQL cross-tenant, missing and stale-version targets cannot create a job',async()=>{
  const f=await cleanupCase(),other=await newCase({withCredential:true});
  for(const input of [f.cleanupInput,{...f.cleanupInput,jobKey:`media_upload_v1_${'0'.repeat(64)}`}])await assert.rejects(cleanupRequest(f,cleanupJobs,other.session,input),{code:'CONFLICT'});
  await assert.rejects(cleanupRequest(f,cleanupJobs,f.session,{...f.cleanupInput,expectedVersion:f.cleanupInput.expectedVersion+1}),{code:'CONFLICT'});assert.deepEqual(await cleanupRows(f),[]);
});
test('cleanup PostgreSQL pending work and an unknown upload version are ineligible',async()=>{
  const f=await cleanupCase({ambiguous:true});await assert.rejects(cleanupRequest(f),{code:'CONFLICT'});assert.equal((await mediaTaskReader.read(f.session)).tasks[0].canCleanup,false);
  const g=await cleanupCase();await mediaTasks.discoverNext('upload');await assert.rejects(cleanupRequest(g),{code:'CONFLICT'});assert.deepEqual(await cleanupRows(g),[]);
});
test('cleanup PostgreSQL atomic request rollback and unknown commit replay never duplicate intent',async()=>{
  const f=await cleanupCase();await assert.rejects(cleanupRequest(f,createPostgresMetaMediaCleanupRepository(cleanupFaultTransactions())),{code:'DEPENDENCY_UNAVAILABLE'});assert.deepEqual(await cleanupRows(f),[]);assert.deepEqual(await cleanupAudits(f),[]);
  const lost=createPostgresMetaMediaCleanupRepository(cleanupFaultTransactions({lost:true}));await assert.rejects(cleanupRequest(f,lost),{code:'DEPENDENCY_UNAVAILABLE'});assert.equal(await cleanupRequest(f),'already-requested');assert.equal((await cleanupAudits(f)).length,1);
});
test('cleanup PostgreSQL concurrent claims admit one worker and fence altered and stale identities',async()=>{
  const f=await cleanupCase();await cleanupRequest(f);const claims=await Promise.all(Array.from({length:6},()=>cleanupJobs.claimNext()));assert.equal(claims.filter(Boolean).length,1);const task=claims.find(Boolean);
  for(const change of [{tenantId:task.tenantId+1},{version:task.version+1},{versionId:'different-version'}])await assert.rejects(cleanupJobs.authorize({...task,...change}));
  assert.equal(await cleanupJobs.finish({...task,version:task.version+1},'removed'),false);assert.ok(await cleanupJobs.authorize(task));await cleanupJobs.finish(task,'cancelled');await assert.rejects(cleanupJobs.authorize(task),{code:'STALE_CLAIM'});
});
test('cleanup PostgreSQL request and every transition require audit at commit and retain immutable identity',async()=>{
  const f=await cleanupCase();
  // A valid direct INSERT still cannot commit without its audit.
  const key=await metaMediaCleanupKey(f.cleanupInput);await assert.rejects(transactions.transaction({isolationLevel:'read-committed'},tx=>tx.query(postgresMetaMediaCleanupSql.insert,[f.scope.tenantId,f.cleanupInput.jobKey,f.session.externalUserId,f.cleanupInput.expectedVersion,f.receipt.versionId,key])));
  await cleanupRequest(f);
  for(const sql of ["DELETE FROM meta_media_cleanup_jobs WHERE tenant_id=$1","UPDATE meta_media_cleanup_jobs SET version=version+1,object_version_id='different-version' WHERE tenant_id=$1","UPDATE meta_media_cleanup_jobs SET version=version+1,actor_external_user_id='another-owner' WHERE tenant_id=$1","UPDATE meta_media_cleanup_jobs SET version=version+1,status='running',attempts=1,lease_expires_at=clock_timestamp()+INTERVAL '1 minute' WHERE tenant_id=$1"]){await assert.rejects(pool.query(sql,[f.scope.tenantId]));}
  assert.equal((await cleanupRows(f))[0].status,'pending');assert.equal((await cleanupRows(f))[0].version,1);
});
test('cleanup PostgreSQL worker removes only the immutable stored version and retains all scan evidence',async()=>{
  const f=await cleanupCase(),before=await scanRows(f);await cleanupRequest(f);const w=cleanupWorker(f);
  try{await w.worker.run();assert.equal((await cleanupRows(f))[0].status,'removed');assert.equal(w.calls.length,7);assert.deepEqual(w.calls.at(-1).input,{Bucket:f.intent.bucket,Key:f.intent.objectKey,VersionId:f.receipt.versionId,ExpectedBucketOwner:quarantineConfig.accountId});assert.deepEqual(await scanRows(f),before);
    assert.equal(await cleanupRequest(f),'already-requested');await w.worker.run();assert.equal(w.calls.length,7);assert.deepEqual((await cleanupAudits(f)).map(a=>a.metadata_json.status),['pending','running','removed']);
  }finally{w.close();}
});
test('cleanup PostgreSQL owner revocation before worker access cancels with zero S3 calls and retains withdrawal',async()=>{
  const f=await cleanupCase({clean:true});await cleanupRequest(f);await pool.query("UPDATE tenant_memberships SET role='agent',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);
  const w=cleanupWorker(f);try{await w.worker.run();assert.deepEqual(w.calls,[]);assert.equal((await cleanupRows(f))[0].status,'cancelled');
    await assert.rejects(fileAuthorization.authorize({...f.session,externalUserId:`remaining-owner-${f.scope.tenantId}`},f.key),{code:'NOT_READY'});
  }finally{w.close();}
});
test('cleanup PostgreSQL a DELETE acknowledgement survives membership revocation during transport without holding DB locks',async()=>{
  const f=await cleanupCase();await cleanupRequest(f);const w=cleanupWorker(f,{async remove(){await pool.query("UPDATE tenant_memberships SET role='agent',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.scope.tenantId,f.session.externalUserId]);return{$metadata:{httpStatusCode:204},VersionId:f.receipt.versionId};}});
  try{await w.worker.run();assert.equal((await cleanupRows(f))[0].status,'removed');assert.equal((await cleanupAudits(f)).at(-1).metadata_json.status,'removed');}finally{w.close();}
});
test('cleanup PostgreSQL S3 Object Lock rejection stops automatic cleanup and preserves its evidence',async()=>{
  const f=await cleanupCase();await cleanupRequest(f);const w=cleanupWorker(f,{async remove(){throw Object.assign(new Error('Object Lock'),{$metadata:{httpStatusCode:403}});}});
  try{await w.worker.run();await w.worker.run();assert.equal(w.calls.length,7);assert.equal((await cleanupRows(f))[0].status,'recovery-required');assert.equal((await cleanupRows(f))[0].attempts,1);}finally{w.close();}
});
test('cleanup PostgreSQL unknown S3 outcomes retry the same version at most three times',async()=>{
  const f=await cleanupCase(),short=createPostgresMetaMediaCleanupRepository(transactions,{retryBaseMs:50});await cleanupRequest(f);const w=cleanupWorker(f,{repo:short,async remove(){throw Object.assign(new Error('unavailable'),{$metadata:{httpStatusCode:500}});}});
  try{for(let i=1;i<=3;i++){await w.worker.run();await pool.query('SELECT pg_sleep(0.22)');}await w.worker.run();assert.equal((await cleanupRows(f))[0].status,'recovery-required');assert.equal((await cleanupRows(f))[0].attempts,3);const deletes=w.calls.filter(c=>c.constructor.name==='DeleteObjectCommand');assert.equal(deletes.length,3);assert.ok(deletes.every(c=>c.input.VersionId===f.receipt.versionId));}finally{w.close();}
});
test('cleanup PostgreSQL an expired final lease is fenced and exhausted without a fourth delete',async()=>{
  const f=await cleanupCase(),short=createPostgresMetaMediaCleanupRepository(transactions,{leaseMs:250});await cleanupRequest(f);let old;
  for(let i=1;i<=3;i++){const task=await short.claimNext();assert.equal(task.attempts,i);if(old)assert.equal(await short.finish(old,'removed'),false);old=task;await pool.query('SELECT pg_sleep(0.3)');}
  const exhausted=await short.claimNext();assert.equal(exhausted.exhausted,true);assert.equal(exhausted.attempts,3);assert.equal(await short.claimNext(),null);
});
test('cleanup PostgreSQL lost completion acknowledgement retains removed state without another S3 call',async()=>{
  const f=await cleanupCase();await cleanupRequest(f);const lost=createPostgresMetaMediaCleanupRepository(cleanupFaultTransactions({lost:true,when:'removed'})),w=cleanupWorker(f,{repo:lost});
  try{await assert.rejects(w.worker.run(),{code:'DEPENDENCY_UNAVAILABLE'});assert.equal((await cleanupRows(f))[0].status,'removed');await w.worker.run();assert.equal(w.calls.length,7);assert.equal((await cleanupAudits(f)).length,3);}finally{w.close();}
});
test('cleanup PostgreSQL withdrawal prevents reinspection, upload receipt reuse and granted inspection retry',async()=>{
  const f=await exhaustedInspectionCase();f.cleanupInput={...f.input,confirm:'remove-quarantined-copy'};await cleanupRequest(f);
  await assert.rejects(requestInspection(f),{code:'CONFLICT'});await assert.rejects(uploadJournal.lookup(f.job.jobKey,f.scope.tenantId,f.session.externalUserId),{code:'AUTHORIZATION_CHANGED'});await assert.rejects(uploadJournal.prepare(f.intent),{code:'AUTHORIZATION_CHANGED'});
  const r=inspectionRuntime(f);try{await assert.rejects(r.run(),{code:'AUTHORIZATION_CHANGED'});assert.deepEqual(r.calls,[]);}finally{r.close();}
  assert.equal(await mediaTasks.discoverNext('upload'),'idle');assert.equal(await mediaTasks.discoverNext('inspect'),'idle');
});
test('cleanup PostgreSQL withdrawal committed during GET withholds the buffered file',async()=>{
  const f=await cleanupCase({clean:true}),r=fileReadRuntime(f,{async reply(command){if(command.constructor.name==='GetObjectCommand')await cleanupRequest(f);return mediaFileReply(command,f.intent,f.receipt.versionId);}});
  try{await assert.rejects(r.run(),{code:'NOT_READY'});assert.equal((await cleanupRows(f))[0].status,'pending');}finally{r.runtime.close();}
});
test('cleanup PostgreSQL runtime shutdown drains and records an in-flight acknowledged deletion',async()=>{
  const f=await cleanupCase();await cleanupRequest(f);let entered,release;const started=new Promise(r=>{entered=r;}),timers=[];
  const runtime=createRailwayMetaMediaCleanupRuntime({environment:quarantineEnvironment,transactions,recordFailure(){assert.fail('runtime failure');},
    timers:{schedule(work,delay){const t={work,delay};timers.push(t);return t;},cancel(t){const i=timers.indexOf(t);if(i>=0)timers.splice(i,1);}},
    storageOptions:{client:{async send(command){if(command.constructor.name==='DeleteObjectCommand'){entered();await new Promise(r=>{release=r;});return{$metadata:{httpStatusCode:204}};}return s3Reply(command);}}}});
  await runtime.start();const work=timers.shift().work();await started;let stopped=false;const stop=runtime.close().then(()=>{stopped=true;});await new Promise(r=>setImmediate(r));assert.equal(stopped,false);release();await work;await stop;assert.equal((await cleanupRows(f))[0].status,'removed');assert.deepEqual(timers,[]);
});
test('cleanup PostgreSQL HTTP resolves the verified owner and records explicit version-bound intent',async()=>{
  const f=await cleanupCase(),serviceIdentity={teamSlug:'connect-team',projectName:'connect-web',environment:'production'};
  const handler=createRailwayApiHttpHandler({expectedServiceIdentity:serviceIdentity,oidcVerifier:{async verify(){return {provider:'vercel',...serviceIdentity,subject:'owner:connect-team:project:connect-web:environment:production'};}},
    endUserSessionVerifier:{async verify(){return {externalUserId:f.session.externalUserId,externalOrganizationId:'org_verified'};}},
    operations:[createRailwayMetaMediaCleanupOperation({tenantSessions:{async resolve(){return f.session;}},cleanup:cleanupJobs})]});
  const response=await handler.handle(new Request('https://connect-api.invalid/v1/connect',{method:'POST',headers:{'content-type':'application/json','x-vercel-oidc-token':'oidc.payload.signature',authorization:'Bearer user.payload.signature'},body:JSON.stringify({contractVersion:'connect.railway-api.v1',operation:'meta.media-cleanup.request',requestKind:'mutation',idempotencyKey:await metaMediaCleanupKey(f.cleanupInput),payload:f.cleanupInput})}));
  assert.equal(response.status,200);assert.deepEqual((await response.json()).data,{status:'queued'});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await cleanupRows(f)).length,1);
});
