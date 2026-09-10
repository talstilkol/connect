import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { createHash, createHmac } from 'node:crypto';
import pg from 'pg';
import { createNodePostgresTransactionManager, createNodePostgresQueryExecutor } from '../../server/platform/nodePostgresAdapter.ts';
import { createPostgresMetaAccountLifecycleRepository, postgresMetaAccountLifecycleSql as sql } from '../../server/platform/postgresMetaAccountLifecycleRepository.ts';
import { createPostgresMetaRepository, postgresMetaSql } from '../../server/platform/postgresMetaRepository.ts';
import { createPostgresMetaCredentialRepository } from '../../server/platform/postgresMetaCredentialRepository.ts';
import { createMetaWebhookIngress } from '../../server/meta/metaWebhookIngress.ts';
import { createMetaWebhookEventDispatcher } from '../../server/meta/metaWebhookEventDispatcher.ts';
import { createMetaWebhookBusinessBatchProcessor } from '../../server/meta/metaWebhookBusinessProcessor.ts';

const connectionString = process.env.CONNECT_META_ACCOUNT_LIFECYCLE_TEST_URL;
if (connectionString !== 'postgresql://connect_echo_test@127.0.0.1:55439/connect_meta_account_lifecycle_integration') throw new Error('A dedicated empty loopback account lifecycle database is required');
const pool = new pg.Pool({ connectionString, max: 6, connectionTimeoutMillis: 2000, statement_timeout: 5000, lock_timeout: 3000 });
const transactions = createNodePostgresTransactionManager(pool), queries = createNodePostgresQueryExecutor(pool);
const meta = createPostgresMetaRepository({ transactions, queries });
const credentials = createPostgresMetaCredentialRepository(queries);
const evidence = createPostgresMetaAccountLifecycleRepository(transactions);
let tenantCounter = 400, receiptCounter = 0;
before(async () => {
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount, 0, 'Refusing a non-empty database');
  const dir = new URL('../../postgres/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort()) {
    if (file.startsWith('0063_')) {
      await pool.query("INSERT INTO tenants (id,display_name,status) VALUES (400,'Legacy lifecycle integration','active')");
      await pool.query("INSERT INTO meta_connections (tenant_id,business_portfolio_id,waba_id,phone_number_id,status,version) VALUES (400,'1000400','2000400','3000400','error',2)");
    }
    await pool.query(await readFile(new URL(file, dir), 'utf8'));
  }
});
after(async () => { await pool.end(); });
async function newCase({ pendingOnly = false } = {}) {
  const tenantId = ++tenantCounter;
  await pool.query("INSERT INTO tenants (id,display_name,status) VALUES ($1,'Account lifecycle integration','active')", [tenantId]);
  const assets = { tenantId, businessPortfolioId: `1000${tenantId}`, wabaId: `2000${tenantId}`, phoneNumberId: `3000${tenantId}` };
  const pending = await meta.saveAssetSnapshot(assets);
  await credentials.store({ tenantId, expectedConnectionVersion: pending.version, keyVersion: 'v1', initializationVector: 'AQIDBAUGBwgJCgsM', ciphertext: 'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcY' });
  const connection = pendingOnly ? pending : await meta.markConnectionConnected(tenantId, pending.version);
  const epoch = (await pool.query('SELECT snapshot_started_at FROM meta_connections WHERE tenant_id=$1', [tenantId])).rows[0].snapshot_started_at;
  return { assets, connection, second: Math.floor(epoch.getTime() / 1000) };
}
const observation = (f, changes = {}) => ({ event: 'ACCOUNT_OFFBOARDED', occurredAt: new Date(f.second * 1000).toISOString(), ownerBusinessId: null, reportedPhoneNumber: null, reason: null, initiatedBy: null, ...changes });
async function command(f, events = [observation(f)], connection = f.connection) {
  const eventKey = createHash('sha256').update(`account-lifecycle-receipt-${++receiptCounter}`).digest('hex');
  const claimed = await meta.claimWebhookReceipt({ tenantId: f.assets.tenantId, wabaId: f.assets.wabaId, eventKey, objectType: 'whatsapp_business_account' });
  assert.equal(claimed.claimed, true);
  return { ...f.assets, receiptId: claimed.receipt.id, eventKey, connectionVersion: connection.version, events };
}
const rows = async (f) => (await pool.query('SELECT * FROM meta_account_lifecycle_events WHERE tenant_id=$1 ORDER BY recorded_at,event_digest', [f.assets.tenantId])).rows;
const current = (f) => meta.findConnectionByTenantId(f.assets.tenantId);
function ingress(repository = evidence) {
  return createMetaWebhookIngress(meta, createMetaWebhookEventDispatcher(createMetaWebhookBusinessBatchProcessor({ conversations: { async resolveInboundContact() { assert.fail('No business writes'); } }, templates: {}, accountLifecycle: repository,
    inboundRuntime: { async process() { assert.fail('No Bot'); } } })), 'local-lifecycle-integration-secret');
}
async function receive(f, value, { second = f.second, pretty = false, target = ingress() } = {}) {
  const body = new TextEncoder().encode(JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: f.assets.wabaId, time: second, changes: [{ field: 'account_update', value }] }] }, null, pretty ? 2 : undefined));
  const signature = `sha256=${createHmac('sha256', 'local-lifecycle-integration-secret').update(body).digest('hex')}`;
  return target.receive(body, signature);
}

test('signed offboarding atomically records receipt-bound evidence, audit and revocation, disabling credentials', async () => {
  const f = await newCase(); assert.ok(await credentials.findByTenantId(f.assets.tenantId));
  const receipt = await receive(f, { event: 'ACCOUNT_OFFBOARDED' });
  const [row] = await rows(f); assert.equal(row.outcome, 'revoked'); assert.equal(row.timing, 'same-second');
  assert.equal(Number(row.receipt_id), receipt.receiptId); assert.equal(row.event_key, receipt.eventKey);
  assert.equal(row.result_version, f.connection.version + 1); assert.equal((await current(f)).status, 'revoked');
  assert.equal(await credentials.findByTenantId(f.assets.tenantId), null);
  const audit = (await pool.query("SELECT metadata_json FROM audit_logs WHERE tenant_id=$1 AND action='meta.account-lifecycle.observed'", [f.assets.tenantId])).rows;
  assert.equal(audit.length, 1); assert.doesNotMatch(JSON.stringify(audit), /phone|owner|reason|token/);
  assert.equal((await pool.query('SELECT * FROM messages')).rowCount, 0);
});

test('canonical redelivery after a fresh connection does not revoke it despite changed JSON and phone formatting', async () => {
  const f = await newCase();
  await receive(f, { event: 'PARTNER_REMOVED', phone_number: '15550783881' });
  const pending = await meta.saveAssetSnapshot(f.assets); const renewed = await meta.markConnectionConnected(f.assets.tenantId, pending.version);
  await receive(f, { phone_number: '+15550783881', event: 'PARTNER_REMOVED' }, { pretty: true });
  assert.deepEqual(await current(f), renewed); assert.equal((await rows(f)).length, 1);
  assert.equal((await pool.query('SELECT * FROM meta_webhook_receipts WHERE tenant_id=$1', [f.assets.tenantId])).rowCount, 2);
});

test('unseen earlier removals are not discarded using local snapshot time', async () => {
  const f = await newCase(); await evidence.recordBatch(await command(f, [observation(f, { occurredAt: new Date((f.second - 100) * 1000).toISOString() })]));
  const [row] = await rows(f); assert.equal(row.timing, 'before-snapshot'); assert.equal(row.outcome, 'revoked');
});

test('same-second and later offboarding revoke pending snapshots and block their completion', async () => {
  for (const delta of [0, 1]) {
    const f = await newCase({ pendingOnly: true }); await receive(f, { event: 'ACCOUNT_OFFBOARDED' }, { second: f.second + delta });
    assert.equal((await current(f)).status, 'revoked'); assert.equal((await rows(f))[0].timing, delta === 0 ? 'same-second' : 'after-snapshot');
    await assert.rejects(meta.markConnectionConnected(f.assets.tenantId, f.connection.version), /changed before confirmation/);
  }
});

test('reconnected is an observation and never creates authorization or restores revoked credentials', async () => {
  const f = await newCase(); await receive(f, { event: 'ACCOUNT_OFFBOARDED' }); const revoked = await current(f);
  await receive(f, { event: 'ACCOUNT_RECONNECTED' }); assert.deepEqual(await current(f), revoked);
  assert.ok((await rows(f)).some((row) => row.outcome === 'reconnected-observed')); assert.equal(await credentials.findByTenantId(f.assets.tenantId), null);
});

test('one batch with removal, reconnection and another removal increments version only once', async () => {
  const f = await newCase(); await evidence.recordBatch(await command(f, [observation(f), observation(f, { event: 'ACCOUNT_RECONNECTED' }), observation(f, { event: 'PARTNER_REMOVED' })]));
  assert.equal((await current(f)).version, f.connection.version + 1);
  assert.deepEqual((await rows(f)).map((row) => row.outcome).sort(), ['already-revoked', 'reconnected-observed', 'revoked']);
});

test('an ingress snapshot replaced before processing records connection-changed and preserves the replacement', async () => {
  const f = await newCase(); const input = await command(f); const replacement = await meta.saveAssetSnapshot(f.assets);
  await evidence.recordBatch(input); assert.deepEqual(await current(f), replacement);
  const [row] = await rows(f); assert.equal(row.outcome, 'connection-changed'); assert.equal(row.connection_version, f.connection.version); assert.equal(row.resolved_version, replacement.version);
});

test('snapshot clock is diagnostic and stable under status changes; manual replacement is rejected', async () => {
  const f = await newCase(); const snapshot = async () => (await pool.query('SELECT snapshot_started_at FROM meta_connections WHERE tenant_id=$1', [f.assets.tenantId])).rows[0].snapshot_started_at;
  const before = await snapshot(); await meta.markConnectionStatus(f.assets.tenantId, 'restricted'); assert.deepEqual(await snapshot(), before);
  await assert.rejects(pool.query("WITH barrier AS MATERIALIZED (SELECT pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1($1))) UPDATE meta_connections SET snapshot_started_at=snapshot_started_at-INTERVAL '1 second' FROM barrier WHERE tenant_id=$1", [f.assets.tenantId]), /cannot be replaced/);
  await meta.saveAssetSnapshot(f.assets); assert.ok((await snapshot()) >= before);
});

test('operational status or pending confirmation after ingress does not suppress a valid removal', async () => {
  for (const pendingOnly of [false, true]) {
    const f = await newCase({ pendingOnly }); const input = await command(f);
    if (pendingOnly) await meta.markConnectionConnected(f.assets.tenantId, f.connection.version);
    else await meta.markConnectionStatus(f.assets.tenantId, 'restricted');
    const before = await current(f); await evidence.recordBatch(input);
    assert.equal((await current(f)).status, 'revoked'); assert.equal((await current(f)).version, before.version + 1);
    assert.equal((await rows(f))[0].outcome, 'revoked');
  }
});

test('legacy rows with unknown snapshot timing still revoke and record that uncertainty', async () => {
  const connection = await meta.findConnectionByTenantId(400); const f = { assets: { tenantId: 400, businessPortfolioId: connection.businessPortfolioId, wabaId: connection.wabaId, phoneNumberId: connection.phoneNumberId }, connection, second: 1788944400 };
  await meta.markConnectionStatus(400, 'restricted');
  await evidence.recordBatch(await command(f)); const [row] = await rows(f); assert.equal(row.snapshot_started_at, null); assert.equal(row.timing, 'unknown'); assert.equal(row.outcome, 'revoked');
});

test('foreign or unclaimed receipt identity and processed receipts cannot create evidence', async () => {
  const f = await newCase(), other = await newCase(); const input = await command(f), foreign = await command(other);
  for (const altered of [{ receiptId: foreign.receiptId }, { eventKey: foreign.eventKey }, { receiptId: input.receiptId + 10000 }, { wabaId: other.assets.wabaId }]) await assert.rejects(evidence.recordBatch({ ...input, ...altered }));
  await meta.completeWebhookReceipt(f.assets.tenantId, input.receiptId); await assert.rejects(evidence.recordBatch(input));
  assert.equal((await rows(f)).length, 0); assert.deepEqual(await current(f), f.connection);
});

test('late invalid batch data fails before any evidence, audit or connection mutation', async () => {
  const f = await newCase(); const input = await command(f, [observation(f), observation(f, { ownerBusinessId: '999999' })]);
  await assert.rejects(evidence.recordBatch(input)); assert.equal((await rows(f)).length, 0); assert.deepEqual(await current(f), f.connection);
});

test('second audit failure rolls back all events and revocation; a retry commits once', async () => {
  const f = await newCase(); const input = await command(f, [observation(f), observation(f, { event: 'ACCOUNT_RECONNECTED' })]); let count = 0;
  const broken = createPostgresMetaAccountLifecycleRepository({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(statement, params) {
    if (statement === sql.audit && ++count === 2) throw new Error('audit unavailable'); return tx.query(statement, params);
  } })) });
  await assert.rejects(broken.recordBatch(input), /audit unavailable/); assert.deepEqual(await current(f), f.connection); assert.equal((await rows(f)).length, 0);
  await evidence.recordBatch(input); assert.equal((await rows(f)).length, 2); assert.equal((await current(f)).version, f.connection.version + 1);
});

test('lost acknowledgement after commit and restart cannot apply a second revocation', async () => {
  const f = await newCase(); const input = await command(f);
  const ambiguous = createPostgresMetaAccountLifecycleRepository({ async transaction(options, work) { await transactions.transaction(options, work); throw new Error('lost after commit'); } });
  await assert.rejects(ambiguous.recordBatch(input), /lost after commit/);
  const replacement = await meta.saveAssetSnapshot(f.assets); await createPostgresMetaAccountLifecycleRepository(transactions).recordBatch(input);
  assert.deepEqual(await current(f), replacement); assert.equal((await rows(f)).length, 1);
});

test('concurrent canonical duplicates serialize to one event, one audit and one revocation', async () => {
  const f = await newCase(); const commands = [];
  for (let i = 0; i < 5; i++) commands.push(await command(f));
  await Promise.all(commands.map((input) => evidence.recordBatch(input))); assert.equal((await rows(f)).length, 1);
  assert.equal((await current(f)).version, f.connection.version + 1);
  assert.equal((await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 AND action='meta.account-lifecycle.observed'", [f.assets.tenantId])).rowCount, 1);
});

test('a concurrent fresh snapshot waits for the atomic removal transaction', async () => {
  const f = await newCase(); const input = await command(f); let release, entered, reached;
  const hold = new Promise((resolve) => { release = resolve; }); const atAudit = new Promise((resolve) => { entered = resolve; }); const atWrite = new Promise((resolve) => { reached = resolve; });
  const held = createPostgresMetaAccountLifecycleRepository({ transaction: (options, work) => transactions.transaction(options, (tx) => work({ async query(statement, params) {
    if (statement === sql.audit) { entered(); await hold; } return tx.query(statement, params);
  } })) });
  const concurrentMeta = createPostgresMetaRepository({ queries, transactions: { transaction: (options, work) => transactions.transaction(options, (tx) => work({ query(statement, params) {
    const result = tx.query(statement, params); if (statement === postgresMetaSql.upsertAssetSnapshot) reached(); return result;
  } })) } });
  const removal = held.recordBatch(input); await atAudit; const replacement = concurrentMeta.saveAssetSnapshot(f.assets); await atWrite; release();
  await removal; const renewed = await replacement; assert.equal(renewed.status, 'pending'); assert.equal(renewed.version, f.connection.version + 2);
  assert.equal((await rows(f))[0].result_version, f.connection.version + 1);
});

test('immutable evidence blocks deletion, edits and receipt deletion after processing', async () => {
  const f = await newCase(); const input = await command(f); await evidence.recordBatch(input);
  await assert.rejects(pool.query("UPDATE meta_account_lifecycle_events SET outcome='already-revoked' WHERE tenant_id=$1", [f.assets.tenantId]), /immutable/);
  await assert.rejects(pool.query('DELETE FROM meta_account_lifecycle_events WHERE tenant_id=$1', [f.assets.tenantId]), /immutable/);
  await assert.rejects(pool.query('DELETE FROM meta_webhook_receipts WHERE id=$1', [input.receiptId]), /foreign key/);
});
