import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
import { createNodePostgresTransactionManager, createNodePostgresQueryExecutor } from '../../server/platform/nodePostgresAdapter.ts';
import { createPostgresMetaDataSyncRepository, postgresMetaDataSyncSql } from '../../server/platform/postgresMetaDataSyncRepository.ts';
import { createPostgresMetaDataSyncLifecycle, postgresMetaDataSyncLifecycleSql } from '../../server/platform/postgresMetaDataSyncLifecycle.ts';
import { createPostgresMetaRepository } from '../../server/platform/postgresMetaRepository.ts';
import { createPostgresMetaHistorySyncRepository } from '../../server/platform/postgresMetaHistorySyncRepository.ts';
import { createPostgresMetaHistoryInboxProjector } from '../../server/platform/postgresMetaHistoryInboxProjector.ts';
import { createMetaDataSyncService } from '../../server/meta/metaDataSync.ts';
import { parseMetaHistorySync } from '../../server/meta/metaHistorySync.ts';
import { value, chunk, declinedValue, message, customerPhone } from '../fixtures/meta-history.mjs';

const connectionString = process.env.CONNECT_META_SYNC_LIFECYCLE_TEST_URL;
if (connectionString !== 'postgresql://connect_echo_test@127.0.0.1:55439/connect_meta_sync_lifecycle_integration') throw new Error('A dedicated empty loopback lifecycle database is required; DATABASE_URL is never used');
const pool = new pg.Pool({ connectionString, max: 6, connectionTimeoutMillis: 2000, statement_timeout: 5000, lock_timeout: 3000 });
const transactions = createNodePostgresTransactionManager(pool), queries = createNodePostgresQueryExecutor(pool);
const requests = createPostgresMetaDataSyncRepository(transactions);
const lifecycle = createPostgresMetaDataSyncLifecycle({ transactions, queries });
const meta = createPostgresMetaRepository({ transactions, queries });
const history = createPostgresMetaHistorySyncRepository(transactions);
const projector = createPostgresMetaHistoryInboxProjector(transactions);
let tenantCounter = 200;
before(async () => {
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount, 0, 'Refusing to modify a non-empty database');
  const dir = new URL('../../postgres/migrations/', import.meta.url);
  for (const filename of (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort()) await pool.query(await readFile(new URL(filename, dir), 'utf8'));
});
after(async () => { await pool.end(); });
async function newCase({ expired = false, prepared = true, connected = true, begun = true } = {}) {
  const tenantId = ++tenantCounter;
  const session = { tenantId, externalUserId: `lifecycle-test-${tenantId}`, role: 'owner', status: 'active', displayName: 'Lifecycle integration' };
  await pool.query("INSERT INTO tenants (id, display_name, status) VALUES ($1,'Lifecycle integration','active')", [tenantId]);
  if (begun) {
    if (expired) await pool.query("INSERT INTO meta_data_sync_onboardings (tenant_id,actor_external_user_id,started_at) VALUES ($1,$2,date_trunc('milliseconds',clock_timestamp())-INTERVAL '25 hours')", [tenantId, session.externalUserId]);
    else await requests.begin(session);
  }
  const assets = { tenantId, businessPortfolioId: `1000${tenantId}`, wabaId: `2000${tenantId}`, phoneNumberId: `3000${tenantId}` };
  let connection = null;
  if (connected) { const pending = await meta.saveAssetSnapshot(assets); connection = await meta.markConnectionConnected(tenantId, pending.version); }
  if (prepared) {
    if (expired) for (const type of ['smb_app_state_sync', 'history']) await pool.query(`INSERT INTO meta_data_sync_requests
      (tenant_id,waba_id,phone_number_id,connection_version,sync_type,started_at) SELECT $1,$2,$3,$4,$5,started_at FROM meta_data_sync_onboardings WHERE tenant_id=$1`,
      [tenantId, assets.wabaId, assets.phoneNumberId, connection.version, type]);
    else await requests.prepare(session, connection.version);
  }
  return { session, assets, connection, scope: { tenantId, wabaId: assets.wabaId, phoneNumberId: assets.phoneNumberId, connectionVersion: connection?.version } };
}
const view = (f, connection = f.connection) => lifecycle.readView(f.session.tenantId, connection);
async function contacts(f, status = 'accepted') {
  const claim = await requests.claim(await requests.read(f.session.tenantId, 'smb_app_state_sync'));
  return requests.finish(claim.request, { status, requestId: status === 'accepted' ? `contacts-${f.session.tenantId}` : null });
}
async function receive(f, input = value()) {
  const copy = structuredClone(input); copy.metadata.phone_number_id = f.assets.phoneNumberId;
  for (const item of parseMetaHistorySync({ kind: 'history', value: copy }, f.assets.phoneNumberId)) await history.record(f.scope, item);
}
async function drain() { for (let i = 0; i < 20; i++) if (await lifecycle.reconcileNext() === 'idle') return; assert.fail('Maintenance did not drain'); }

test('no onboarding preserves the legacy connection view and a begun attempt exposes no private identity', async () => {
  const absent = await newCase({ begun: false, prepared: false }); assert.equal(await view(absent), null);
  const f = await newCase({ prepared: false, connected: false });
  assert.deepEqual(await view(f), { stage: 'awaiting-registration', contacts: 'not-prepared', history: 'not-prepared', providerProgress: null, receivedChunks: 0, processedChunks: 0, projectedMessages: 0 });
  assert.doesNotMatch(JSON.stringify(await view(f)), /tenantId|waba|phone|requestId|startedAt|version|actor/);
});

test('an expired attempt without prepared requests requires recovery instead of pretending it can launch', async () => {
  const f = await newCase({ expired: true, prepared: false }); assert.equal((await view(f)).stage, 'recovery-required');
  await assert.rejects(requests.prepare(f.session, f.connection.version), (error) => error.code === 'SYNC_DEADLINE_EXPIRED');
});

test('database-clock expiry closes both unclaimed requests atomically and never invokes provider work', async () => {
  const f = await newCase({ expired: true }); assert.equal((await view(f)).stage, 'recovery-required');
  assert.equal(await lifecycle.reconcileNext(), 'reconciled');
  const snapshot = await view(f); assert.equal(snapshot.contacts, 'expired'); assert.equal(snapshot.history, 'expired');
  const runner = createMetaDataSyncService({ repository: requests, credentials: { async withAccessToken() { assert.fail('Credentials must not load'); } },
    provider: { async verifyPhone() { assert.fail('No provider preflight'); }, async request() { assert.fail('No provider POST'); } } });
  assert.deepEqual(await runner.execute(f.session, 'smb_app_state_sync'), { status: 'expired', requestId: null });
  const audits = (await pool.query("SELECT metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.data-sync.reconciled'", [f.session.tenantId])).rows;
  assert.equal(audits.length, 2); assert.ok(audits.every((a) => a.metadata_json.reason === 'deadline-expired'));
});

test('unknown or rejected contacts cancels only an unclaimed history request and cannot reset a one-time call', async () => {
  for (const status of ['unknown', 'rejected']) {
    const f = await newCase(); await contacts(f, status); assert.equal((await view(f)).stage, 'recovery-required'); await drain();
    const snapshot = await view(f); assert.equal(snapshot.contacts, status); assert.equal(snapshot.history, 'cancelled');
    await requests.prepare(f.session, f.connection.version); assert.equal((await requests.read(f.session.tenantId, 'history')).status, 'cancelled');
    await assert.rejects(pool.query("UPDATE meta_data_sync_requests SET status='prepared' WHERE tenant_id=$1", [f.session.tenantId]));
  }
});

test('revoked connection and suspended tenant cancel prepared requests without provider actions', async () => {
  for (const suspended of [false, true]) {
    const f = await newCase();
    if (suspended) await pool.query("UPDATE tenants SET status='suspended' WHERE id=$1", [f.session.tenantId]);
    else await meta.revokeConnection(f.session.tenantId, f.assets.wabaId, f.connection.version);
    await drain();
    const rows = (await pool.query('SELECT status FROM meta_data_sync_requests WHERE tenant_id=$1', [f.session.tenantId])).rows;
    assert.ok(rows.every((row) => row.status === 'cancelled'));
    if (!suspended) assert.equal((await view(f, await meta.findConnectionByTenantId(f.session.tenantId))).stage, 'connection-changed');
  }
});

test('dispatched request remains finishable after revocation while prepared history is cancelled', async () => {
  const f = await newCase(); const claim = await requests.claim(await requests.read(f.session.tenantId, 'smb_app_state_sync'));
  await meta.revokeConnection(f.session.tenantId, f.assets.wabaId, f.connection.version); await drain();
  assert.equal((await requests.read(f.session.tenantId, 'smb_app_state_sync')).status, 'dispatching');
  const finished = await requests.finish(claim.request, { status: 'accepted', requestId: 'known-late-result' });
  assert.equal(finished.requestId, 'known-late-result'); assert.equal((await requests.read(f.session.tenantId, 'history')).status, 'cancelled');
});

test('fresh requests are not cancelled and contact/history dispatch remains visible without declaring completion', async () => {
  const f = await newCase(); assert.equal((await view(f)).stage, 'ready-to-request'); await drain();
  const claim = await requests.claim(await requests.read(f.session.tenantId, 'smb_app_state_sync'));
  assert.equal((await view(f)).stage, 'requesting-contacts');
  await requests.finish(claim.request, { status: 'accepted', requestId: 'accepted-contacts' });
  assert.equal((await view(f)).stage, 'requesting-history');
  await requests.claim(await requests.read(f.session.tenantId, 'history'));
  assert.equal((await view(f)).stage, 'requesting-history');
});

test('provider progress and durable cursor progress are distinct and 100 never means complete', async () => {
  const f = await newCase(); await contacts(f); await requests.claim(await requests.read(f.session.tenantId, 'history'));
  await receive(f, value([chunk({ metadata: { phase: 2, chunk_order: 1, progress: 100 } })]));
  const before = await view(f); assert.equal(before.stage, 'projecting-history'); assert.equal(before.providerProgress, 100); assert.equal(before.processedChunks, 0);
  await projector.projectNext();
  const after = await view(f); assert.equal(after.stage, 'awaiting-verification'); assert.equal(after.processedChunks, 1); assert.equal(after.projectedMessages, 1);
  assert.equal(Object.hasOwn(after, 'complete'), false);
});

test('refusal, conflict and changed generation hide progress and old projection counts', async () => {
  for (const kind of ['refused', 'conflict', 'connection']) {
    const f = await newCase(); await contacts(f); await requests.claim(await requests.read(f.session.tenantId, 'history')); await receive(f); await projector.projectNext();
    if (kind === 'refused') await receive(f, declinedValue());
    if (kind === 'conflict') await receive(f, value([chunk({ threads: [{ id: customerPhone, messages: [message({ text: { body: 'conflicting body' } })] }] })]));
    if (kind === 'connection') f.connection = await meta.saveAssetSnapshot(f.assets);
    const snapshot = await view(f); assert.equal(snapshot.stage, kind === 'refused' ? 'sharing-declined' : kind === 'conflict' ? 'conflicted' : 'connection-changed');
    assert.equal(snapshot.providerProgress, null); assert.equal(snapshot.projectedMessages, 0); assert.equal(snapshot.receivedChunks, 0); assert.equal(snapshot.processedChunks, 0);
  }
  await drain();
});

test('connection changes between reads and foreign tenant identities fail closed', async () => {
  const f = await newCase(); await meta.saveAssetSnapshot(f.assets); await assert.rejects(view(f));
  await assert.rejects(lifecycle.readView(f.session.tenantId + 1, f.connection)); await drain();
});

test('concurrent reconcilers produce one terminal transition and audit per request', async () => {
  const f = await newCase({ expired: true });
  await Promise.all(Array.from({ length: 5 }, () => lifecycle.reconcileNext()));
  assert.equal((await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 AND action='meta.data-sync.reconciled'", [f.session.tenantId])).rowCount, 2);
});

test('audit failure rolls back both transitions and retry reconciles once', async () => {
  const f = await newCase({ expired: true });
  let audits = 0;
  const broken = createPostgresMetaDataSyncLifecycle({ queries, transactions: { transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(sql, params) {
    if (sql === postgresMetaDataSyncSql.audit && ++audits === 2) throw new Error('audit unavailable'); return tx.query(sql, params);
  } })) } });
  await assert.rejects(broken.reconcileNext(), /audit unavailable/);
  assert.equal((await requests.read(f.session.tenantId, 'history')).status, 'prepared');
  assert.equal((await requests.read(f.session.tenantId, 'smb_app_state_sync')).status, 'prepared'); await drain();
});

test('ambiguous reconciliation commit is idempotent after restart', async () => {
  const f = await newCase({ expired: true });
  const ambiguous = createPostgresMetaDataSyncLifecycle({ queries, transactions: { async transaction(options, work) { await transactions.transaction(options, work); throw new Error('lost after commit'); } } });
  await assert.rejects(ambiguous.reconcileNext(), /lost after commit/); await drain();
  assert.equal((await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 AND action='meta.data-sync.reconciled'", [f.session.tenantId])).rowCount, 2);
});

test('lifecycle reader uses one consistent query and does not expose raw request IDs', async () => {
  const f = await newCase(); await contacts(f); const calls = [];
  const observed = createPostgresMetaDataSyncLifecycle({ transactions, queries: { query(sql, params) { calls.push(sql); return queries.query(sql, params); } } });
  const snapshot = await observed.readView(f.session.tenantId, f.connection);
  assert.deepEqual(calls, [postgresMetaDataSyncLifecycleSql.view]); assert.doesNotMatch(JSON.stringify(snapshot), /contacts-\d|requestId|phoneNumberId|tenantId/);
});


test('maintenance observes a concurrently committed provider acceptance before cancelling only unsent history', async () => {
  const f = await newCase(); const claim = await requests.claim(await requests.read(f.session.tenantId, 'smb_app_state_sync'));
  await meta.revokeConnection(f.session.tenantId, f.assets.wabaId, f.connection.version);
  let release, entered, lockReached;
  const hold = new Promise((resolve) => { release = resolve; });
  const atAudit = new Promise((resolve) => { entered = resolve; });
  const atRequestLock = new Promise((resolve) => { lockReached = resolve; });
  const pendingRequests = createPostgresMetaDataSyncRepository({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ async query(sql, params) {
    if (sql === postgresMetaDataSyncSql.audit) { entered(); await hold; } return tx.query(sql, params);
  } })) });
  const observed = createPostgresMetaDataSyncLifecycle({ queries, transactions: { transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(sql, params) {
    const pending = tx.query(sql, params); if (sql === postgresMetaDataSyncLifecycleSql.requests) lockReached(); return pending;
  } })) } });
  const completion = pendingRequests.finish(claim.request, { status: 'accepted', requestId: 'concurrent-acceptance' });
  await atAudit; const maintenance = observed.reconcileNext(); await atRequestLock; release();
  assert.equal((await completion).status, 'accepted'); assert.equal(await maintenance, 'reconciled');
  assert.equal((await requests.read(f.session.tenantId, 'smb_app_state_sync')).requestId, 'concurrent-acceptance');
  assert.equal((await requests.read(f.session.tenantId, 'history')).status, 'cancelled');
});
