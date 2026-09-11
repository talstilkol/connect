import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
import { createHash } from 'node:crypto';
import { createNodePostgresTransactionManager, createNodePostgresQueryExecutor } from '../../server/platform/nodePostgresAdapter.ts';
import { createPostgresMetaRepository, postgresMetaSql } from '../../server/platform/postgresMetaRepository.ts';
import { createPostgresMetaSignupLaunchRepository, postgresMetaSignupLaunchSql as launchSql } from '../../server/platform/postgresMetaSignupLaunchRepository.ts';
import { createPostgresMetaSignupAttemptRepository, postgresMetaSignupAttemptSql } from '../../server/platform/postgresMetaSignupAttemptRepository.ts';
import { createMetaSignupService } from '../../server/meta/metaSignupService.ts';
import { createMetaConnectionService } from '../../server/meta/metaConnectionService.ts';
import { createMetaConnectionOrchestrator } from '../../server/meta/metaConnectionOrchestrator.ts';
import { toSensitiveMetaAccessToken } from '../../server/meta/metaPorts.ts';
import { createPostgresMetaDataSyncRepository, postgresMetaDataSyncSql as syncSql } from '../../server/platform/postgresMetaDataSyncRepository.ts';

const connectionString = process.env.CONNECT_META_SIGNUP_LAUNCH_TEST_URL;
if (connectionString !== 'postgresql://connect_echo_test@127.0.0.1:55439/connect_meta_signup_launch_integration') throw new Error('An empty isolated loopback signup-launch database is required');
const pool = new pg.Pool({ connectionString, max: 6, connectionTimeoutMillis: 2000, statement_timeout: 5000, lock_timeout: 3000 });
const transactions = createNodePostgresTransactionManager(pool), queries = createNodePostgresQueryExecutor(pool);
const meta = createPostgresMetaRepository({ transactions, queries });
const connections = createMetaConnectionService(meta);
const launches = createPostgresMetaSignupLaunchRepository(transactions);
const attempts = createPostgresMetaSignupAttemptRepository(transactions);
const syncRequests = createPostgresMetaDataSyncRepository(transactions);
const configuration = { status: 'configured', appId: '100001', configurationId: '500005', apiVersion: 'v23.0' };
let tenantCounter = 500;
before(async () => {
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount, 0, 'Refusing to change a non-empty database');
  const dir = new URL('../../postgres/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort()) await pool.query(await readFile(new URL(file,dir),'utf8'));
});
after(async () => { await pool.end(); });
async function fixture(options = {}) {
  const tenantId = ++tenantCounter;
  await pool.query("INSERT INTO tenants (id,display_name,status) VALUES ($1,'Signup launch integration','active')", [tenantId]);
  const session = { tenantId, externalUserId: `launch-owner-${tenantId}`, displayName: 'Launch integration', role: 'owner', status: 'active' };
  const assets = { tenantId, businessPortfolioId: `1000${tenantId}`, wabaId: `2000${tenantId}`, phoneNumberId: `3000${tenantId}` };
  let calls = 0;
  const repository = options.transactions ? createPostgresMetaSignupAttemptRepository(options.transactions) : attempts;
  const orchestrator = createMetaConnectionOrchestrator({ connectionService: connections,
    authorizationCodeExchanger: { async exchangeAuthorizationCode() { calls++; if (options.exchange) await options.exchange(); return toSensitiveMetaAccessToken('local-integration-credential'); } },
    assetVerifier: { async verifyAssets() { if (options.verify) await options.verify(); const snapshot = { ...assets }; delete snapshot.tenantId; return snapshot; } },
    credentialVault: { async storeAccessToken() { if (options.credential) await options.credential(); } },
    wabaSubscriber: { async subscribeWaba() {} },
  });
  const service = createMetaSignupService({ configuration, attempts: repository, launches, connections, orchestrator });
  const input = { authorizationCode: `launch-code-${tenantId}`, businessPortfolioId: assets.businessPortfolioId, wabaId: assets.wabaId, phoneNumberId: assets.phoneNumberId };
  return { assets,session,service,input,calls: () => calls };
}
const stored = async (f) => (await pool.query('SELECT * FROM meta_signup_launches WHERE tenant_id=$1 ORDER BY id',[f.session.tenantId])).rows;
const current = (f) => meta.findConnectionByTenantId(f.session.tenantId);
async function begin(f) { const result = await f.service.begin(f.session); assert.equal(result.status,'ready'); return result; }
const complete = (f, launch, input = f.input) => f.service.complete(f.session,{ ...input,launchId:launch.launchId });

test('begin commits before provider use and duplicate preparation preserves the same deadline', async () => {
  const f = await fixture(); const launch = await begin(f); assert.deepEqual(await begin(f),launch); assert.equal(f.calls(),0);
  const [row] = await stored(f); assert.equal(row.status,'ready'); assert.equal(row.baseline_connection_version,null); assert.equal(row.expires_at-row.started_at,20*60*1000);
  assert.equal((await pool.query('SELECT * FROM meta_data_sync_onboardings')).rowCount,0);
  assert.doesNotMatch(JSON.stringify(launch),/tenant|actor|configuration|baseline|credential/);
});

test('successful signup finishes the launch and duplicate completion never re-exchanges its code', async () => {
  const f = await fixture(); const launch = await begin(f);
  assert.equal((await complete(f,launch)).status,'connected'); assert.equal((await complete(f,launch)).status,'connected'); assert.equal(f.calls(),1);
  const [row] = await stored(f); assert.equal(row.status,'finished'); assert.ok(row.claimed_at >= row.started_at); assert.ok(row.closed_at >= row.claimed_at);
  assert.doesNotMatch(JSON.stringify(row),/launch-code-|local-integration-credential/);
  await assert.rejects(pool.query('DELETE FROM railway_api_mutation_receipts WHERE tenant_id=$1',[f.session.tenantId]), /foreign key/);
});

test('missing, foreign, expired and wrong-actor launches cannot call Meta', async () => {
  const f = await fixture(), foreign = await fixture(); const launch = await begin(f), other = await begin(foreign);
  assert.equal((await f.service.complete(f.session,f.input)).status,'validation-error');
  await assert.rejects(complete(f,other));
  await assert.rejects(f.service.complete({ ...f.session,externalUserId:'different-owner' },{ ...f.input,launchId:launch.launchId }));
  assert.equal(f.calls(),0); assert.equal((await stored(f))[0].status,'ready');
});

test('a newly committed connection invalidates an old ready launch before code exchange', async () => {
  const f = await fixture(); const old = await begin(f); const newer = await meta.saveAssetSnapshot(f.assets);
  await assert.rejects(complete(f,old)); assert.equal(f.calls(),0); assert.deepEqual(await current(f),newer);
  const replacement = await begin(f); assert.notEqual(replacement.launchId,old.launchId);
  assert.deepEqual((await stored(f)).map((row) => row.status),['abandoned','ready']);
});

test('a connection changed while Meta responds cannot be overwritten by the old launch', async () => {
  let release, entered; const hold = new Promise((resolve) => { release=resolve; }); const reached = new Promise((resolve) => { entered=resolve; });
  const f = await fixture({ verify: async () => { entered(); await hold; } }); const launch = await begin(f);
  const completion = complete(f,launch); await reached; const replacement = await meta.saveAssetSnapshot(f.assets); release();
  assert.equal((await completion).status,'server-error'); assert.deepEqual(await current(f),replacement);
  assert.equal((await stored(f))[0].status,'finished'); assert.equal(f.calls(),1);
});

test('matching non-null baseline permits a fresh authorization and advances its version', async () => {
  const f = await fixture(); const previous = await meta.saveAssetSnapshot(f.assets); const launch = await begin(f);
  assert.equal((await stored(f))[0].baseline_connection_version,previous.version);
  assert.equal((await complete(f,launch)).status,'connected'); assert.ok((await current(f)).version>previous.version);
});

test('provider failure is terminal for one code but a new launch retains the previous receipt', async () => {
  const f = await fixture({ exchange: async () => { throw new Error('private-provider-failure'); } }); const first = await begin(f);
  assert.equal((await complete(f,first)).status,'authorization-failed'); const second = await begin(f); assert.notEqual(second.launchId,first.launchId);
  assert.equal((await complete(f,second)).status,'server-error'); assert.equal(f.calls(),1);
  assert.equal((await complete(f,second,{ ...f.input,authorizationCode:'new-authorized-code' })).status,'authorization-failed'); assert.equal(f.calls(),2);
  assert.equal((await stored(f)).length,2); assert.equal((await pool.query('SELECT * FROM railway_api_mutation_receipts WHERE tenant_id=$1',[f.session.tenantId])).rowCount,2);
});

test('concurrent owners and repeated begin calls produce only one active launch', async () => {
  const f = await fixture(); const results = await Promise.all(Array.from({ length:5 },() => f.service.begin(f.session)));
  assert.ok(results.every((result) => result.launchId===results[0].launchId));
  assert.deepEqual(await f.service.begin({ ...f.session,externalUserId:'another-owner' }),{ status:'attempt-in-progress' });
  assert.equal((await stored(f)).length,1);
});

test('a claimed launch rejects another code and remains in progress until its known outcome commits', async () => {
  let release, entered; const hold = new Promise((resolve) => { release=resolve; }); const reached = new Promise((resolve) => { entered=resolve; });
  const f = await fixture({ exchange: async () => { entered(); await hold; } }); const launch = await begin(f);
  const first = complete(f,launch); await reached;
  assert.deepEqual(await f.service.begin(f.session),{ status:'attempt-in-progress' });
  await assert.rejects(complete(f,launch,{ ...f.input,authorizationCode:'different-concurrent-code' }));
  assert.equal((await complete(f,launch)).status,'server-error'); release(); assert.equal((await first).status,'connected'); assert.equal(f.calls(),1);
});

test('audit failure rolls back launch creation and retry creates one usable launch', async () => {
  const f = await fixture(); const broken = createPostgresMetaSignupLaunchRepository({ transaction: (options,work) => transactions.transaction(options,(tx) => work({ query(sql,params) {
    if (sql===launchSql.audit) throw new Error('audit unavailable'); return tx.query(sql,params);
  } })) });
  await assert.rejects(broken.begin(f.session,'a'.repeat(64)),/audit unavailable/); assert.equal((await stored(f)).length,0); await begin(f);
});

test('a lost claim acknowledgement leaves durable evidence and never authorizes another provider call', async () => {
  const f = await fixture({ transactions:{ async transaction(options,work) { await transactions.transaction(options,work); throw new Error('lost claim acknowledgement'); } } });
  const launch = await begin(f); await assert.rejects(complete(f,launch),/lost claim/); assert.equal(f.calls(),0);
  assert.equal((await stored(f))[0].status,'claimed'); assert.deepEqual(await f.service.begin(f.session),{ status:'attempt-in-progress' });
});

test('claim and completion audit failures roll back receipt and launch transitions together', async () => {
  for (const phase of ['started','finished']) {
    const f = await fixture({ transactions:{ transaction:(options,work) => transactions.transaction(options,(tx) => work({ query(sql,params) {
      if (sql===postgresMetaSignupAttemptSql.audit && params[2].endsWith(phase)) throw new Error('attempt audit unavailable'); return tx.query(sql,params);
    } })) } });
    const launch = await begin(f); await assert.rejects(complete(f,launch),/attempt audit/);
    const receipt = await pool.query('SELECT status FROM railway_api_mutation_receipts WHERE tenant_id=$1',[f.session.tenantId]);
    assert.equal(f.calls(),phase==='started'?0:1);
    assert.equal((await stored(f))[0].status,phase==='started'?'ready':'claimed');
    if (phase==='started') assert.equal(receipt.rowCount,0);
    else { assert.equal(receipt.rows[0].status,'processing'); assert.equal((await complete(f,launch)).status,'server-error'); assert.equal(f.calls(),1); }
  }
});

test('expired preparation is retained and can be replaced by another permitted owner without resetting it', async () => {
  const f = await fixture(); await pool.query(`WITH stamp AS (SELECT date_trunc('milliseconds',clock_timestamp())-INTERVAL '21 minutes' AS started)
    INSERT INTO meta_signup_launches (tenant_id,actor_external_user_id,configuration_key,started_at,expires_at)
    SELECT $1,'previous-owner',$2,started,started+INTERVAL '20 minutes' FROM stamp`,[f.session.tenantId,createHash('sha256').update(JSON.stringify(configuration)).digest('hex')]);
  const [old] = await stored(f); await assert.rejects(f.service.complete({ ...f.session,externalUserId:'previous-owner' },{ ...f.input,launchId:Number(old.id) })); assert.equal(f.calls(),0);
  await begin(f); const rows = await stored(f); assert.equal(rows.length,2); assert.equal(rows[0].status,'abandoned'); assert.deepEqual(rows[0].started_at,old.started_at);
});

test('configuration changes invalidate an unclaimed launch; scope tampering cannot bypass the database', async () => {
  const f = await fixture(); const first = await launches.begin(f.session,'a'.repeat(64)); const second = await launches.begin(f.session,'b'.repeat(64));
  assert.notEqual(first.launchId,second.launchId);
  await assert.rejects(pool.query("UPDATE meta_signup_launches SET started_at=started_at-INTERVAL '1 second' WHERE tenant_id=$1",[f.session.tenantId]),/Invalid/);
  await assert.rejects(pool.query('DELETE FROM meta_signup_launches WHERE tenant_id=$1',[f.session.tenantId]),/cannot be removed/);
  await assert.rejects(complete(f,second)); assert.equal(f.calls(),0);
});

test('tenant suspension and insufficient role block preparation and completion before provider calls', async () => {
  const f = await fixture(); await assert.rejects(f.service.begin({ ...f.session,role:'agent' })); const launch = await begin(f);
  await pool.query("UPDATE tenants SET status='suspended' WHERE id=$1",[f.session.tenantId]);
  await assert.rejects(f.service.begin(f.session)); await assert.rejects(complete(f,launch)); assert.equal(f.calls(),0);
});

test('snapshot compare-and-set is protected by the same tenant barrier as competing writes', async () => {
  const f = await fixture(); let release, entered, attempted;
  const hold = new Promise((resolve) => { release=resolve; }); const locked = new Promise((resolve) => { entered=resolve; }); const atWrite = new Promise((resolve) => { attempted=resolve; });
  const guarded = createPostgresMetaRepository({ queries,transactions:{ transaction:(options,work) => transactions.transaction(options,(tx) => work({ async query(sql,params) {
    const result = await tx.query(sql,params); if (sql===postgresMetaSql.lockSnapshotBaseline) { entered(); await hold; } return result;
  } })) } });
  const competing = createPostgresMetaRepository({ queries,transactions:{ transaction:(options,work) => transactions.transaction(options,(tx) => work({ query(sql,params) {
    const pending = tx.query(sql,params); if (sql===postgresMetaSql.upsertAssetSnapshot) attempted(); return pending;
  } })) } });
  const first = guarded.saveAssetSnapshot({ ...f.assets,expectedConnectionVersion:null }); await locked;
  const next = competing.saveAssetSnapshot(f.assets); await atWrite; release();
  assert.equal((await first).version,1); assert.equal((await next).version,2);
  await assert.rejects(guarded.saveAssetSnapshot({ ...f.assets,expectedConnectionVersion:1 }),/changed since signup/);
});

// These cases exercise internal durable preparation with completed signup
// evidence. They do not activate the Business App API gate or call Meta sync.
async function signedUp() {
  const f = await fixture(), launch = await begin(f);
  assert.equal((await complete(f,launch)).status,'connected');
  return { ...f,launch };
}
const prepareSignup = (f, repository = syncRequests) => repository.prepareFromSignupLaunch(f.session,f.launch.launchId);
async function syncRows(f) {
  const params = [f.session.tenantId];
  return {
    starts: (await pool.query('SELECT * FROM meta_data_sync_onboardings WHERE tenant_id=$1',params)).rows,
    requests: (await pool.query('SELECT * FROM meta_data_sync_requests WHERE tenant_id=$1 ORDER BY sync_type',params)).rows,
    audits: (await pool.query("SELECT action,target_id,metadata_json FROM audit_logs WHERE tenant_id=$1 AND action LIKE 'meta.data-sync.%' ORDER BY id",params)).rows,
  };
}

test('sync preparation derives its exact start and connection from the completed signup and is idempotent', async () => {
  const f = await signedUp(), [launch] = await stored(f), connection = await current(f);
  const result = await prepareSignup(f); assert.deepEqual(result,{ startedAt:launch.started_at.toISOString(),connectionVersion:connection.version });
  assert.deepEqual(await prepareSignup(f),result);
  const rows = await syncRows(f); assert.equal(rows.starts.length,1); assert.equal(rows.requests.length,2); assert.equal(rows.audits.length,3);
  assert.equal(Number(rows.starts[0].signup_launch_id),f.launch.launchId); assert.equal(rows.starts[0].signup_connection_version,connection.version);
  assert.ok(rows.requests.every((row) => row.started_at.toISOString()===result.startedAt && row.status==='prepared' && row.request_id===null && row.connection_version===connection.version));
  assert.equal(f.calls(),1); assert.doesNotMatch(JSON.stringify(rows.audits),/launch-code-|local-integration-credential|waba|phone/);
});

test('ready, claimed and failed signup evidence cannot prepare data sync', async () => {
  const ready = await fixture(), launch = await begin(ready);
  await assert.rejects(syncRequests.prepareFromSignupLaunch(ready.session,launch.launchId),{ code:'SYNC_SIGNUP_NOT_COMPLETED' });
  let release, entered; const hold = new Promise((resolve) => { release=resolve; }); const reached = new Promise((resolve) => { entered=resolve; });
  const claimed = await fixture({ exchange: async () => { entered(); await hold; throw new Error('provider failure'); } });
  const claimLaunch = await begin(claimed); const completion = complete(claimed,claimLaunch); await reached;
  await assert.rejects(syncRequests.prepareFromSignupLaunch(claimed.session,claimLaunch.launchId),{ code:'SYNC_SIGNUP_NOT_COMPLETED' });
  release(); assert.equal((await completion).status,'authorization-failed');
  await assert.rejects(syncRequests.prepareFromSignupLaunch(claimed.session,claimLaunch.launchId),{ code:'SYNC_SIGNUP_NOT_COMPLETED' });
  assert.deepEqual(await syncRows(ready),{ starts:[],requests:[],audits:[] }); assert.deepEqual(await syncRows(claimed),{ starts:[],requests:[],audits:[] });
});

test('a failed signup with saved assets is not a successful sync authorization', async () => {
  const f = await fixture({ credential: async () => { throw new Error('credential unavailable'); } }); const launch = await begin(f);
  assert.equal((await complete(f,launch)).status,'server-error'); const pending = await current(f);
  await meta.markConnectionConnected(f.session.tenantId,pending.version);
  await assert.rejects(syncRequests.prepareFromSignupLaunch(f.session,launch.launchId),{ code:'SYNC_SIGNUP_CONNECTION_CHANGED' });
  assert.deepEqual(await syncRows(f),{ starts:[],requests:[],audits:[] });
});

test('sync preparation rejects another tenant, actor, insufficient permission and invalid launch IDs', async () => {
  const f = await signedUp(), foreign = await signedUp();
  for (const session of [{ ...f.session,externalUserId:'another-owner' },foreign.session])
    await assert.rejects(syncRequests.prepareFromSignupLaunch(session,f.launch.launchId),{ code:'SYNC_SIGNUP_NOT_COMPLETED' });
  await assert.rejects(syncRequests.prepareFromSignupLaunch({ ...f.session,role:'agent' },f.launch.launchId));
  for (const id of [undefined,null,0,-1,'1',1.2,Number.MAX_SAFE_INTEGER+1]) await assert.rejects(syncRequests.prepareFromSignupLaunch(f.session,id));
  assert.deepEqual(await syncRows(f),{ starts:[],requests:[],audits:[] });
});

test('a completed receipt cannot prepare a replacement, revoked or suspended connection', async () => {
  for (const state of ['replacement','revoked','suspended']) {
    const f = await signedUp(), connection = await current(f);
    if (state==='replacement') { const pending = await meta.saveAssetSnapshot(f.assets); await meta.markConnectionConnected(f.session.tenantId,pending.version); }
    if (state==='revoked') await meta.revokeConnection(f.session.tenantId,f.assets.wabaId,connection.version);
    if (state==='suspended') await pool.query("UPDATE tenants SET status='suspended' WHERE id=$1",[f.session.tenantId]);
    await assert.rejects(prepareSignup(f)); assert.deepEqual(await syncRows(f),{ starts:[],requests:[],audits:[] });
  }
});

test('failure at any preparation audit rolls back the binding and both requests', async () => {
  for (const failAt of [1,2,3]) {
    const f = await signedUp(); let audits = 0;
    const broken = createPostgresMetaDataSyncRepository({ transaction:(options,work) => transactions.transaction(options,(tx) => work({ query(sql,params) {
      if (sql===syncSql.audit && ++audits===failAt) throw new Error('sync audit unavailable'); return tx.query(sql,params);
    } })) });
    await assert.rejects(prepareSignup(f,broken),/sync audit/);
    assert.deepEqual(await syncRows(f),{ starts:[],requests:[],audits:[] }); await prepareSignup(f);
  }
});

test('a lost preparation commit acknowledgement retries local state without resetting or duplicate audit', async () => {
  const f = await signedUp();
  const ambiguous = createPostgresMetaDataSyncRepository({ async transaction(options,work) { await transactions.transaction(options,work); throw new Error('lost sync commit'); } });
  await assert.rejects(prepareSignup(f,ambiguous),/lost sync commit/); const before = await syncRows(f);
  await prepareSignup(f); assert.deepEqual(await syncRows(f),before); assert.equal(before.audits.length,3); assert.equal(f.calls(),1);
});

test('parallel preparations produce one binding and two immutable request identities', async () => {
  const f = await signedUp(); const results = await Promise.all(Array.from({ length:5 },() => prepareSignup(f)));
  assert.ok(results.every((result) => JSON.stringify(result)===JSON.stringify(results[0])));
  const rows = await syncRows(f); assert.equal(rows.starts.length,1); assert.equal(rows.requests.length,2); assert.equal(rows.audits.length,3);
});

test('legacy entry points cannot bypass signup binding and existing legacy starts cannot be relabelled', async () => {
  const f = await signedUp(); await assert.rejects(syncRequests.begin(f.session),/completed signup binding/);
  await prepareSignup(f); await assert.rejects(syncRequests.prepare(f.session,(await current(f)).version),{ code:'SYNC_SIGNUP_PREPARATION_REQUIRED' });
  const legacy = await fixture(); await syncRequests.begin(legacy.session); const previous = await syncRows(legacy);
  const launch = await begin(legacy); assert.equal((await complete(legacy,launch)).status,'connected');
  await syncRequests.prepareFromSignupLaunch(legacy.session,launch.launchId);
  await assert.rejects(syncRequests.prepare(legacy.session,(await current(legacy)).version),{code:'SYNC_SIGNUP_PREPARATION_REQUIRED'});
  const retained=await syncRows(legacy);assert.equal(retained.starts.length,2);assert.deepEqual(retained.starts[0],previous.starts[0]);
  assert.equal(retained.requests.length,2);
});

test('a fresh completed signup cannot reset old accepted synchronization requests', async () => {
  const f = await signedUp(); await prepareSignup(f);
  const request = await syncRequests.read(f.session.tenantId,'smb_app_state_sync'); const claimed = await syncRequests.claim(request);
  assert.equal(claimed.outcome,'claimed'); await syncRequests.finish(claimed.request,{ status:'accepted',requestId:'existing-provider-request' });
  const previous = await syncRows(f); const newer = await begin(f);
  assert.equal((await complete(f,newer,{ ...f.input,authorizationCode:'new-code-with-old-sync' })).status,'connected');
  await assert.rejects(syncRequests.prepareFromSignupLaunch(f.session,newer.launchId),{ code:'SYNC_OFFBOARDING_EVIDENCE_REQUIRED' });
  assert.deepEqual(await syncRows(f),previous);
});

test('database guards reject altered binding identity, baseline, receipt version and request assets', async () => {
  const f = await signedUp(), [launch] = await stored(f), connection = await current(f);
  const values = [f.session.tenantId,f.session.externalUserId,null,launch.started_at.toISOString(),f.launch.launchId,connection.version];
  for (const [index,value] of [[1,'foreign-owner'],[2,1],[3,new Date(launch.started_at.getTime()+1).toISOString()],[5,connection.version+1]]) {
    const changed = [...values]; changed[index]=value; await assert.rejects(pool.query(syncSql.bindSignup,changed));
  }
  await pool.query(syncSql.bindSignup,values);
  await assert.rejects(pool.query(syncSql.prepare,[f.session.tenantId,'999999',f.assets.phoneNumberId,connection.version,'history',values[3]]),/connection changed/);
  await assert.rejects(pool.query(syncSql.prepare,[f.session.tenantId,f.assets.wabaId,f.assets.phoneNumberId,connection.version+1,'history',values[3]]),/does not match signup/);
  await prepareSignup(f);
  await assert.rejects(pool.query('UPDATE meta_data_sync_onboardings SET signup_launch_id=NULL,signup_connection_version=NULL WHERE tenant_id=$1',[f.session.tenantId]),/immutable/);
  await assert.rejects(pool.query('DELETE FROM meta_data_sync_onboardings WHERE tenant_id=$1',[f.session.tenantId]),/immutable/);
});

test('a finished historic signup cannot create a fresh synchronization deadline', async () => {
  const f = await fixture(); const key = 'connect_idempotency_v1_'+createHash('sha256').update(f.input.authorizationCode).digest('hex');
  const digest = 'railway_mutation_request_v1_'+createHash('sha256').update(JSON.stringify(f.input)).digest('hex');
  const row = (await pool.query(`WITH stamp AS (SELECT date_trunc('milliseconds',clock_timestamp())-INTERVAL '25 hours' AS started)
    INSERT INTO meta_signup_launches (tenant_id,actor_external_user_id,configuration_key,started_at,expires_at)
    SELECT $1,$2,$3,started,started+INTERVAL '20 minutes' FROM stamp RETURNING id`,[f.session.tenantId,f.session.externalUserId,'a'.repeat(64)])).rows[0];
  await pool.query(postgresMetaSignupAttemptSql.claim,[f.session.tenantId,'meta.embedded-signup.complete',key,digest,f.session.externalUserId]);
  await pool.query("UPDATE meta_signup_launches SET status='claimed',claim_key=$2,request_digest=$3,claimed_at=started_at+INTERVAL '1 minute' WHERE id=$1",[row.id,key,digest]);
  const pending = await meta.saveAssetSnapshot(f.assets); const connected = await meta.markConnectionConnected(f.session.tenantId,pending.version);
  await attempts.complete({ session:f.session,claimKey:key,requestDigest:digest,launchId:Number(row.id),launchConfigurationKey:'a'.repeat(64) },{ status:'connected',connectionVersion:connected.version });
  await assert.rejects(syncRequests.prepareFromSignupLaunch(f.session,Number(row.id)),{ code:'SYNC_DEADLINE_EXPIRED' });
  assert.deepEqual(await syncRows(f),{ starts:[],requests:[],audits:[] });
});

test('connection revocation waits for atomic preparation and then prevents dispatch', async () => {
  const f = await signedUp(); let entered, release; const reached = new Promise((resolve) => { entered=resolve; }); const hold = new Promise((resolve) => { release=resolve; });
  const held = createPostgresMetaDataSyncRepository({ transaction:(options,work) => transactions.transaction(options,(tx) => work({ async query(sql,params) {
    const result = await tx.query(sql,params); if (sql===syncSql.signup) { entered(); await hold; } return result;
  } })) });
  const prepared = prepareSignup(f,held); await reached; const connection = await current(f);
  const revoked = meta.revokeConnection(f.session.tenantId,f.assets.wabaId,connection.version); release();
  await prepared; await revoked;
  const request = await syncRequests.read(f.session.tenantId,'smb_app_state_sync'); const result = await syncRequests.claim(request);
  assert.equal(result.outcome,'not-claimed'); assert.equal(result.request.status,'cancelled');
});
