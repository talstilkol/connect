import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { createPostgresMetaAccountLifecycleRepository } from '../../server/platform/postgresMetaAccountLifecycleRepository.ts';
import { createPostgresMetaHistorySyncRepository } from '../../server/platform/postgresMetaHistorySyncRepository.ts';
import { createPostgresMetaContactSyncRepository } from '../../server/platform/postgresMetaContactSyncRepository.ts';
import { createPostgresMetaHistoryInboxProjector } from '../../server/platform/postgresMetaHistoryInboxProjector.ts';
import { parseMetaHistorySync } from '../../server/meta/metaHistorySync.ts';
import { value as historyValue } from '../fixtures/meta-history.mjs';
import { createRailwayApiHttpHandler } from '../../server/platform/railwayApiHttpHandler.ts';
import { createRailwayApiClient } from '../../server/platform/railwayApiClient.ts';
import { createRailwayMetaSignupOperations } from '../../server/platform/railwayMetaSignupOperations.ts';
import { createRailwayMetaConnectionReadOperation } from '../../server/platform/railwayMetaConnectionReadOperation.ts';
import { createRailwayMetaSignupHandler } from '../../server/meta/railwayMetaSignupHandler.ts';
import { createRailwayMetaSignupApiRuntime } from '../../server/platform/railwayMetaSignupRuntime.ts';
import { createPostgresMetaDataSyncLifecycle } from '../../server/platform/postgresMetaDataSyncLifecycle.ts';
import { resolveTenantSessionFromMemberships } from '../../server/auth/tenantSession.ts';
import { deriveRailwayApiDeterministicIdempotencyKey } from '../../server/platform/railwayApiMutationExecutor.ts';
import { createRailwayPostgresWorkerService } from '../../server/platform/railwayPostgresWorkerService.ts';
import { createHash } from 'node:crypto';
import { createPostgresMetaCoexistenceSyncJobRepository, postgresMetaCoexistenceJobSql } from '../../server/platform/postgresMetaCoexistenceSyncJobRepository.ts';
import { createPostgresTenantMembershipRepository } from '../../server/platform/postgresTenantMembershipRepository.ts';
import { createRailwayMetaCoexistenceMaintenance } from '../../server/platform/railwayMetaCoexistenceMaintenance.ts';
import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { readdir, readFile, writeFile, mkdir, chmod, rm } from 'node:fs/promises';
import { runMetaSyncAttribution } from '../../scripts/meta-sync-attribution.mjs';
import pg from 'pg';
import { createNodePostgresTransactionManager, createNodePostgresQueryExecutor } from '../../server/platform/nodePostgresAdapter.ts';
import { createPostgresMetaRepository } from '../../server/platform/postgresMetaRepository.ts';
import { createMetaConnectionService } from '../../server/meta/metaConnectionService.ts';
import { createPostgresMetaCredentialRepository } from '../../server/platform/postgresMetaCredentialRepository.ts';
import { createPostgresMetaSignupLaunchRepository } from '../../server/platform/postgresMetaSignupLaunchRepository.ts';
import { createPostgresMetaSignupAttemptRepository, postgresMetaSignupAttemptSql } from '../../server/platform/postgresMetaSignupAttemptRepository.ts';
import { createPostgresMetaDataSyncRepository, postgresMetaDataSyncSql } from '../../server/platform/postgresMetaDataSyncRepository.ts';
import { createRailwayMetaCoexistenceSignupRuntime, createRailwayMetaSignupRuntime } from '../../server/platform/railwayMetaSignupRuntime.ts';

const connectionString = process.env.CONNECT_META_COEXISTENCE_TEST_URL;
if (connectionString !== 'postgresql://connect_echo_test@127.0.0.1:55439/connect_meta_coexistence_integration') throw new Error('An empty isolated loopback Coexistence database is required');
const pool = new pg.Pool({ connectionString,max:6,connectionTimeoutMillis:2000,statement_timeout:5000,lock_timeout:3000 });
const transactions = createNodePostgresTransactionManager(pool), queries = createNodePostgresQueryExecutor(pool);
const meta = createPostgresMetaRepository({ transactions,queries }), connections = createMetaConnectionService(meta);
const credentials = createPostgresMetaCredentialRepository(queries);
const launches = createPostgresMetaSignupLaunchRepository(transactions), attempts = createPostgresMetaSignupAttemptRepository(transactions);
const requests = createPostgresMetaDataSyncRepository(transactions);
const environment = { META_APP_ID:'100001',META_EMBEDDED_SIGNUP_CONFIGURATION_ID:'500005',META_GRAPH_API_VERSION:'v23.0',
  META_APP_SECRET:'local-coexistence-app-secret',META_CREDENTIAL_ENCRYPTION_KEY_V1:Buffer.from(Array.from({ length:32 },(_,i) => i+1)).toString('base64') };
let tenantCounter = 700, upgradeCase, upgradeRows, upgradeHistoryRows;
async function retainedRequests(f) {return (await pool.query('SELECT * FROM meta_data_sync_requests WHERE tenant_id=$1 ORDER BY sync_type',[f.session.tenantId])).rows;}
before(async () => {
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount,0,'Refusing to change a non-empty database');
  const directory = new URL('../../postgres/migrations/',import.meta.url);
  for (const file of (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort()) {
    if(file.startsWith('0091_')) {
      upgradeCase=await fixture();await complete(upgradeCase,await begin(upgradeCase));upgradeRows=await retainedRequests(upgradeCase);
    }
    if(file.startsWith('0093_')) upgradeHistoryRows=await seedLegacyHistoryUpgrade(upgradeCase);
    await pool.query(await readFile(new URL(file,directory),'utf8'));
  }
});
beforeEach(async () => {
  await pool.query("UPDATE meta_coexistence_sync_jobs SET status='recovery-required',version=version+1,lease_expires_at=NULL WHERE status IN ('pending','running')");
});
after(async () => { await pool.end(); });

async function fixture(options = {}) {
  const tenantId = ++tenantCounter;
  await pool.query("INSERT INTO tenants (id,display_name,status) VALUES ($1,'Coexistence integration','active')",[tenantId]);
  const session = { tenantId,externalUserId:`coexistence-owner-${tenantId}`,role:'owner',status:'active',displayName:'Coexistence integration' };
  await pool.query("INSERT INTO tenant_memberships (tenant_id,external_user_id,role,status) VALUES ($1,$2,'owner','active')",[tenantId,session.externalUserId]);
  await pool.query("INSERT INTO tenant_memberships (tenant_id,external_user_id,role,status) VALUES ($1,$2,'owner','active')",[tenantId,`coexistence-backup-${tenantId}`]);
  const assets = { tenantId,businessPortfolioId:`1000${tenantId}`,wabaId:`2000${tenantId}`,phoneNumberId:`3000${tenantId}` };
  const input = { flow:'business-app',wabaId:assets.wabaId,authorizationCode:`coexistence-code-${tenantId}` };
  const calls = [], syncTypes = [];
  const token = `local-coexistence-token-${tenantId}`;
  async function fetchImplementation(rawUrl,init) {
    const url = new URL(rawUrl); assert.equal(url.hostname,'graph.facebook.com');
    const path = url.pathname.split('/').slice(2).join('/'); calls.push(`${init.method} ${path}`);
    const json = (body,status=200) => new Response(JSON.stringify(body),{ status });
    if (path==='oauth/access_token') {
      if (options.exchange) await options.exchange();
      return json({ access_token:token });
    }
    assert.equal(init.headers.authorization,`Bearer ${token}`);
    if (path===assets.wabaId) return json({ id:assets.wabaId,owner_business_info:{ id:assets.businessPortfolioId } });
    if (path===`${assets.wabaId}/phone_numbers`) return json({ data:options.ambiguous ? [{ id:assets.phoneNumberId },{ id:'999999' }] : [{ id:assets.phoneNumberId }] });
    if (path===assets.phoneNumberId) {
      if (options.phone) await options.phone(calls.filter((call) => call===`GET ${assets.phoneNumberId}`).length);
      return json({ id:assets.phoneNumberId,is_on_biz_app:options.businessApp ?? true,platform_type:'CLOUD_API' });
    }
    if (path===`${assets.wabaId}/subscribed_apps`) return json({ success:options.subscription ?? true });
    if (path===`${assets.phoneNumberId}/smb_app_data`) {
      const body = JSON.parse(init.body); assert.deepEqual(Object.keys(body).sort(),['messaging_product','sync_type']);
      assert.equal(body.messaging_product,'whatsapp'); syncTypes.push(body.sync_type);
      const evidence = (await pool.query(`SELECT launch.status,receipt.status AS receipt_status FROM meta_signup_launches AS launch
        JOIN railway_api_mutation_receipts AS receipt ON receipt.tenant_id=launch.tenant_id AND receipt.idempotency_key=launch.claim_key
        WHERE launch.tenant_id=$1`,[tenantId])).rows;
      assert.ok(evidence.some((row) => row.status==='finished' && row.receipt_status==='completed'));
      assert.equal((await pool.query('SELECT * FROM meta_data_sync_requests WHERE tenant_id=$1 AND connection_version=(SELECT version FROM meta_connections WHERE tenant_id=$1)',[tenantId])).rowCount,2);
      if (body.sync_type==='history') assert.equal((await requests.read(tenantId,'smb_app_state_sync')).status,'accepted');
      if (options.post) return options.post(body.sync_type,json);
      return json({ messaging_product:'whatsapp',request_id:`request-${tenantId}-${body.sync_type}` });
    }
    throw new Error(`Unexpected test provider path: ${path}`);
  }
  const dependencies = { environment,webhookEnvironment:{ META_APP_SECRET:environment.META_APP_SECRET },connections,credentials,launches,
    attempts:options.attempts ?? attempts,requests:options.requests ?? requests,transportOptions:{ fetchImplementation,requestTimeoutMs:2000 } };
  const create = (overrides={}) => createRailwayMetaCoexistenceSignupRuntime({ ...dependencies,...overrides });
  const service = create();
  return { session,assets,input,calls,syncTypes,service,create,dependencies,token };
}
async function begin(f) { const launch = await f.service.begin(f.session); assert.equal(launch.status,'ready'); return launch; }
const complete = (f,launch) => f.service.complete(f.session,{ ...f.input,launchId:launch.launchId });
const exchangeCount = (f) => f.calls.filter((call) => call==='GET oauth/access_token').length;
const countSyncRows = async (f) => (await pool.query('SELECT * FROM meta_data_sync_requests WHERE tenant_id=$1',[f.session.tenantId])).rowCount;

test('WABA-only completion resolves real provider fields, encrypts credentials and requests contacts before history', async () => {
  const f = await fixture(), launch = await begin(f); assert.equal(f.calls.length,0);
  const result = await complete(f,launch);
  assert.deepEqual(result,{ registration:{ status:'connected',connection:{ status:'connected' } },synchronization:{ status:'requests-accepted' } });
  assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']); assert.equal(exchangeCount(f),1);
  assert.equal(f.calls.filter((call) => call===`POST ${f.assets.wabaId}/subscribed_apps`).length,1);
  assert.equal((await jobFor(f)).status,'pending');
  assert.ok(f.calls.every((call) => !call.includes('/register')));
  const envelope = (await pool.query('SELECT ciphertext FROM meta_credential_envelopes WHERE tenant_id=$1',[f.session.tenantId])).rows[0];
  assert.ok(envelope); assert.ok(!envelope.ciphertext.includes(f.token)); assert.doesNotMatch(JSON.stringify(result),/request_id|token|phone|waba/);
  const launchRow = (await pool.query('SELECT started_at FROM meta_signup_launches WHERE id=$1',[launch.launchId])).rows[0];
  assert.equal((await requests.read(f.session.tenantId,'history')).startedAt,launchRow.started_at.toISOString());
});

test('completion replay and code-free resume do not repeat code exchange, subscription or synchronization POST', async () => {
  const f = await fixture(), launch = await begin(f); const result = await complete(f,launch); const before = [...f.calls];
  assert.deepEqual(await complete(f,launch),result);
  assert.deepEqual(await f.create().resume(f.session,launch.launchId),{ status:'requests-accepted' });
  assert.deepEqual(f.calls,before);
});

test('mutation of caller input while Meta responds cannot change the launch resumed after registration', async () => {
  let entered, release; const reached = new Promise((resolve) => { entered=resolve; }); const hold = new Promise((resolve) => { release=resolve; });
  const f = await fixture({ exchange:async () => { entered(); await hold; } }), launch = await begin(f);
  const input = { ...f.input,launchId:launch.launchId }; const result = f.service.complete(f.session,input); await reached;
  input.launchId=Number.MAX_SAFE_INTEGER; input.wabaId='999999'; release();
  assert.equal((await result).synchronization.status,'requests-accepted'); assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']);
});

test('unknown and rejected contacts responses never authorize history or a second contacts POST', async () => {
  for (const status of [503,400]) {
    const f = await fixture({ post:(_type,json) => json({ error:{ code:1,message:'private-provider-error' } },status) }); const launch = await begin(f);
    assert.equal((await complete(f,launch)).synchronization.status,'recovery-required');
    assert.equal((await f.create().resume(f.session,launch.launchId)).status,'recovery-required');
    assert.deepEqual(f.syncTypes,['smb_app_state_sync']); assert.equal(exchangeCount(f),1);
  }
});

test('history failure does not repeat accepted contacts or repeat history', async () => {
  const f = await fixture({ post:(type,json) => type==='history' ? json({ error:{ code:1 } },503) : json({ messaging_product:'whatsapp',request_id:'accepted-contacts' }) }); const launch = await begin(f);
  assert.equal((await complete(f,launch)).synchronization.status,'recovery-required');
  await f.service.resume(f.session,launch.launchId); assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']);
});

test('an interruption after contacts acceptance resumes history from durable state without an authorization code', async () => {
  let failHistory = true;
  const f = await fixture({ phone:async (read) => { if (read===3 && failHistory) throw new Error('network interruption before history'); } }); const launch = await begin(f);
  assert.equal((await complete(f,launch)).synchronization.status,'server-error'); assert.deepEqual(f.syncTypes,['smb_app_state_sync']);
  failHistory=false;
  assert.deepEqual(await f.create().resume(f.session,launch.launchId),{ status:'requests-accepted' });
  assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']); assert.equal(exchangeCount(f),1);
});

test('concurrent resume waits for a dispatching contacts request instead of sending history early', async () => {
  let release, entered; const hold = new Promise((resolve) => { release=resolve; }); const reached = new Promise((resolve) => { entered=resolve; });
  const f = await fixture({ post:async (type,json) => { if (type==='smb_app_state_sync') { entered(); await hold; } return json({ messaging_product:'whatsapp',request_id:`accepted-${type}` }); } });
  const launch = await begin(f); const first = complete(f,launch); await reached;
  assert.deepEqual(await f.create().resume(f.session,launch.launchId),{ status:'in-progress' }); assert.deepEqual(f.syncTypes,['smb_app_state_sync']);
  release(); assert.equal((await first).synchronization.status,'requests-accepted'); assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']);
});

test('preparation failure occurs after the signup receipt and can resume without consuming its code again', async () => {
  let fail = true;
  const wrapped = createPostgresMetaDataSyncRepository({ transaction:(options,work) => transactions.transaction(options,(tx) => work({ query(sql,params) {
    if (fail && sql===postgresMetaDataSyncSql.audit) throw new Error('preparation audit unavailable'); return tx.query(sql,params);
  } })) });
  const f = await fixture({ requests:wrapped }), launch = await begin(f);
  assert.equal((await complete(f,launch)).synchronization.status,'server-error'); assert.equal(await countSyncRows(f),0); assert.deepEqual(f.syncTypes,[]);
  fail=false; assert.equal((await f.service.resume(f.session,launch.launchId)).status,'requests-accepted'); assert.equal(exchangeCount(f),1);
});

test('a lost contacts result acknowledgement retries only storage and then permits history', async () => {
  let fail = true;
  const f = await fixture({ requests:{ ...requests,async finish(request,result) {
    const stored = await requests.finish(request,result);
    if (fail) { fail=false; throw new Error('lost result acknowledgement'); } return stored;
  } } }), launch = await begin(f);
  assert.equal((await complete(f,launch)).synchronization.status,'requests-accepted');
  await f.service.resume(f.session,launch.launchId); assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']);
});

test('failure of both contacts result writes leaves dispatching and resume does not resend or request history', async () => {
  const f = await fixture({ requests:{ ...requests,async finish() { throw new Error('result storage unavailable'); } } }), launch = await begin(f);
  assert.equal((await complete(f,launch)).synchronization.status,'server-error');
  assert.equal((await f.create().resume(f.session,launch.launchId)).status,'in-progress');
  assert.deepEqual(f.syncTypes,['smb_app_state_sync']); assert.equal((await requests.read(f.session.tenantId,'smb_app_state_sync')).status,'dispatching');
});

test('ambiguous signup completion commit can resume the committed receipt without re-exchanging its code', async () => {
  const f = await fixture({ attempts:{ ...attempts,async complete(command,result) { await attempts.complete(command,result); throw new Error('lost completion acknowledgement'); } } }); const launch = await begin(f);
  await assert.rejects(complete(f,launch),/lost completion/); assert.equal(await countSyncRows(f),0); assert.deepEqual(f.syncTypes,[]);
  assert.equal((await f.create({ attempts }).resume(f.session,launch.launchId)).status,'requests-accepted'); assert.equal(exchangeCount(f),1);
});

test('an uncommitted signup result cannot start synchronization despite a connected snapshot', async () => {
  const broken = createPostgresMetaSignupAttemptRepository({ transaction:(options,work) => transactions.transaction(options,(tx) => work({ query(sql,params) {
    if (sql===postgresMetaSignupAttemptSql.audit && params[2]==='meta.embedded-signup.finished') throw new Error('result audit unavailable'); return tx.query(sql,params);
  } })) });
  const f = await fixture({ attempts:broken }), launch = await begin(f); await assert.rejects(complete(f,launch),/result audit/);
  assert.equal((await connections.read(f.session)).status,'connected');
  assert.equal(await jobFor(f),undefined);
  assert.equal((await f.create({ attempts }).resume(f.session,launch.launchId)).status,'recovery-required'); assert.deepEqual(f.syncTypes,[]);
});

test('ambiguous or inactive Business App assets and subscription failure cannot prepare or request sync', async () => {
  for (const options of [{ ambiguous:true },{ businessApp:false },{ subscription:false }]) {
    const f = await fixture(options), launch = await begin(f); const result = await complete(f,launch);
    assert.notEqual(result.registration.status,'connected'); assert.equal(await jobFor(f),undefined); assert.equal(result.synchronization,null); assert.deepEqual(f.syncTypes,[]); assert.equal(await countSyncRows(f),0);
  }
});

test('a delayed asset response cannot overwrite a newer connection or start synchronization', async () => {
  let release, entered; const hold = new Promise((resolve) => { release=resolve; }); const reached = new Promise((resolve) => { entered=resolve; });
  const f = await fixture({ phone:async (read) => { if (read===1) { entered(); await hold; } } }), launch = await begin(f);
  const completing = complete(f,launch); await reached; const changed = await meta.saveAssetSnapshot(f.assets); release();
  assert.equal((await completing).registration.status,'server-error'); assert.deepEqual(await connections.read(f.session),changed); assert.deepEqual(f.syncTypes,[]);
});

test('a foreign actor, revoked authorization and changed configuration cannot resume provider work', async () => {
  const f = await fixture(), launch = await begin(f); await complete(f,launch); const before = [...f.calls];
  assert.equal((await f.service.resume({ ...f.session,externalUserId:'foreign-owner' },launch.launchId)).status,'recovery-required');
  await assert.rejects(f.service.resume({ ...f.session,role:'agent' },launch.launchId));
  assert.equal((await f.create({ environment:{ ...environment,META_EMBEDDED_SIGNUP_CONFIGURATION_ID:'600006' } }).resume(f.session,launch.launchId)).status,'recovery-required');
  const connection = await connections.read(f.session); await meta.revokeConnection(f.session.tenantId,f.assets.wabaId,connection.version);
  assert.equal((await f.service.resume(f.session,launch.launchId)).status,'recovery-required'); assert.deepEqual(f.calls,before);
});

test('a Cloud API launch cannot be repurposed for Business App completion or resume', async () => {
  const f = await fixture({ businessApp:false }); const cloud = createRailwayMetaSignupRuntime(f.dependencies); const launch = await cloud.begin(f.session);
  await assert.rejects(complete(f,launch)); assert.equal(f.calls.length,0);
  assert.equal((await cloud.complete(f.session,{ ...f.assets,tenantId:undefined,authorizationCode:f.input.authorizationCode,launchId:launch.launchId })).status,'validation-error');
  const cloudInput = { authorizationCode:f.input.authorizationCode,businessPortfolioId:f.assets.businessPortfolioId,wabaId:f.assets.wabaId,phoneNumberId:f.assets.phoneNumberId,launchId:launch.launchId };
  assert.equal((await cloud.complete(f.session,cloudInput)).status,'connected'); assert.equal(await jobFor(f),undefined); const before = [...f.calls];
  assert.equal((await f.service.resume(f.session,launch.launchId)).status,'recovery-required'); assert.deepEqual(f.calls,before);
});

test('the default public runtime remains gated and new composition is unavailable without server prerequisites', async () => {
  const f = await fixture(); const publicService = createRailwayMetaSignupRuntime(f.dependencies);
  assert.equal((await publicService.complete(f.session,{ ...f.input,launchId:1 })).status,'synchronization-required');
  const missing = f.create({ webhookEnvironment:null }); assert.equal((await missing.begin(f.session)).status,'configuration-required');
  assert.equal((await missing.complete(f.session,{ ...f.input,launchId:1 })).registration.status,'configuration-required');
  assert.deepEqual(f.calls,[]);
});

const jobs = createPostgresMetaCoexistenceSyncJobRepository(transactions);
const memberships = createPostgresTenantMembershipRepository(queries);
const jobFor = async (f) => (await pool.query('SELECT * FROM meta_coexistence_sync_jobs WHERE tenant_id=$1',[f.session.tenantId])).rows[0];
const workerFor = (f,overrides={}) => createRailwayMetaCoexistenceMaintenance({
  jobs,memberships,requests,credentials,environment,transportOptions:f.dependencies.transportOptions,...overrides,
});
async function registerWithoutContinuation(options={}) {
  const f = await fixture({ ...options,attempts:{ ...attempts,async complete(command,result) {
    await attempts.complete(command,result); throw new Error('process stopped after commit');
  } } });
  const launch = await begin(f); await assert.rejects(complete(f,launch),/process stopped/);
  return { f,launch };
}

test('a fresh worker resumes a committed signup after the original process stops', async () => {
  const { f,launch } = await registerWithoutContinuation();
  assert.equal((await jobFor(f)).status,'pending'); assert.equal(await countSyncRows(f),0);
  assert.equal(await workerFor(f).runNext(),'processed'); assert.equal((await jobFor(f)).status,'requests-accepted');
  assert.equal(await workerFor(f).runNext(),'idle'); assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']);
  assert.equal(exchangeCount(f),1); assert.equal(Number((await jobFor(f)).launch_id),launch.launchId);
  assert.doesNotMatch(JSON.stringify(await jobFor(f)),/coexistence-code|local-coexistence-token/);
});

test('enqueue failure rolls back completion receipt and launch without authorizing background work', async () => {
  const broken = createPostgresMetaSignupAttemptRepository({ transaction:(options,work) => transactions.transaction(options,(tx) => work({ query(sql,params) {
    if (sql===postgresMetaCoexistenceJobSql.enqueue) throw new Error('queue storage unavailable'); return tx.query(sql,params);
  } })) });
  const f = await fixture({ attempts:broken }), launch = await begin(f);
  await assert.rejects(complete(f,launch),/queue storage/);
  assert.equal(await jobFor(f),undefined); assert.equal(await workerFor(f).runNext(),'idle');
  assert.equal((await pool.query('SELECT status FROM railway_api_mutation_receipts WHERE tenant_id=$1',[f.session.tenantId])).rows[0].status,'processing');
  assert.equal((await pool.query('SELECT status FROM meta_signup_launches WHERE id=$1',[launch.launchId])).rows[0].status,'claimed');
  assert.deepEqual(f.syncTypes,[]);
});

test('two workers claim one durable continuation only once', async () => {
  const { f } = await registerWithoutContinuation();
  const claims = await Promise.all([jobs.claimNext(),jobs.claimNext()]);
  assert.equal(claims.filter(Boolean).length,1); assert.equal((await jobFor(f)).status,'running');
  assert.equal(await jobs.finish(claims.find(Boolean),'retry'),true);
  assert.equal(await jobs.claimNext(),null,'retry delay must prevent a busy loop');
});

test('a reclaimed lease fences late completion from the previous worker', async () => {
  const { f } = await registerWithoutContinuation(); const first = await jobs.claimNext();
  await pool.query("UPDATE meta_coexistence_sync_jobs SET lease_expires_at=clock_timestamp()-INTERVAL '1 second',version=version+1 WHERE tenant_id=$1",[f.session.tenantId]);
  const second = await jobs.claimNext(); assert.ok(second.version>first.version);
  assert.equal(await jobs.finish(first,'requests-accepted'),false);
  assert.equal((await jobFor(f)).status,'running'); assert.equal(await jobs.finish(second,'retry'),true);
  assert.equal((await jobFor(f)).status,'pending');
});

test('the worker continues history after an earlier contacts acceptance without repeating contacts', async () => {
  const f = await fixture({ phone:async (read) => { if (read===3) throw new Error('history preflight unavailable'); } });
  const launch = await begin(f); assert.equal((await complete(f,launch)).synchronization.status,'server-error');
  await workerFor(f).runNext(); assert.equal((await jobFor(f)).status,'requests-accepted');
  assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']); assert.equal(exchangeCount(f),1);
});

test('worker permission resolution rejects removed, suspended and demoted membership before any provider call', async () => {
  for (const mutation of [
    "DELETE FROM tenant_memberships WHERE tenant_id=$1 AND external_user_id LIKE 'coexistence-owner-%'",
    "UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id LIKE 'coexistence-owner-%'",
    "UPDATE tenant_memberships SET role='manager',version=version+1 WHERE tenant_id=$1 AND external_user_id LIKE 'coexistence-owner-%'",
    "UPDATE tenants SET status='suspended' WHERE id=$1",
  ]) {
    const { f } = await registerWithoutContinuation(); const before = [...f.calls];
    await pool.query(mutation,[f.session.tenantId]); await workerFor(f).runNext();
    assert.equal((await jobFor(f)).status,'cancelled'); assert.deepEqual(f.calls,before);
  }
});

test('membership revocation during Graph preflight cancels the durable POST claim', async () => {
  let subject;
  const { f } = await registerWithoutContinuation({ phone:async (read) => {
    if (read===2) await pool.query("UPDATE tenant_memberships SET role='agent',version=version+1 WHERE tenant_id=$1 AND external_user_id LIKE 'coexistence-owner-%'",[subject.session.tenantId]);
  } }); subject=f;
  await workerFor(f).runNext(); assert.deepEqual(f.syncTypes,[]);
  assert.equal((await jobFor(f)).status,'recovery-required');
  assert.equal((await requests.read(f.session.tenantId,'smb_app_state_sync')).status,'cancelled');
});

test('permission removal during contacts POST preserves its accepted result and blocks history POST', async () => {
  let subject;
  const { f } = await registerWithoutContinuation({ post:async (type,json) => {
    assert.equal(type,'smb_app_state_sync');
    await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id LIKE 'coexistence-owner-%'",[subject.session.tenantId]);
    return json({ messaging_product:'whatsapp',request_id:'accepted-before-revocation' });
  } }); subject=f;
  await workerFor(f).runNext(); assert.deepEqual(f.syncTypes,['smb_app_state_sync']);
  assert.equal((await requests.read(f.session.tenantId,'smb_app_state_sync')).status,'accepted');
  assert.equal((await requests.read(f.session.tenantId,'history')).status,'cancelled');
  assert.equal((await jobFor(f)).status,'recovery-required');
});

test('a missing Worker configuration retries locally without consuming the original synchronization window', async () => {
  const { f } = await registerWithoutContinuation(); const original = await jobFor(f), before = [...f.calls];
  await workerFor(f,{ environment:{} }).runNext(); const deferred = await jobFor(f);
  assert.equal(deferred.status,'pending'); assert.equal(deferred.started_at.toISOString(),original.started_at.toISOString());
  assert.ok(deferred.next_attempt_at>original.next_attempt_at); assert.deepEqual(f.calls,before);
});

test('a failed membership directory read retries rather than inventing authorization or cancelling permanently', async () => {
  const { f } = await registerWithoutContinuation(); const before = [...f.calls];
  await workerFor(f,{ memberships:{ async findActiveByExternalUserId() { throw new Error('database unavailable'); } } }).runNext();
  assert.equal((await jobFor(f)).status,'pending'); assert.deepEqual(f.calls,before);
});

test('worker replay after an unknown provider outcome never repeats contacts or sends history', async () => {
  const f = await fixture({ post:(_type,json) => json({ error:{ code:1 } },503) }), launch = await begin(f);
  await complete(f,launch); const before = [...f.calls]; await workerFor(f).runNext();
  assert.equal((await jobFor(f)).status,'recovery-required'); assert.deepEqual(f.calls,before);
  assert.deepEqual(f.syncTypes,['smb_app_state_sync']);
});

test('accepted durable results survive later membership suspension without new provider calls', async () => {
  const f = await fixture(), launch = await begin(f); await complete(f,launch); const before = [...f.calls];
  await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id LIKE 'coexistence-owner-%'",[f.session.tenantId]);
  await workerFor(f).runNext(); assert.equal((await jobFor(f)).status,'requests-accepted'); assert.deepEqual(f.calls,before);
});

test('job identity, source window and terminal state cannot be rewritten or deleted', async () => {
  const { f } = await registerWithoutContinuation();
  for (const sql of [
    "UPDATE meta_coexistence_sync_jobs SET actor_external_user_id='another-actor',version=version+1 WHERE tenant_id=$1",
    "UPDATE meta_coexistence_sync_jobs SET started_at=started_at+INTERVAL '1 minute',version=version+1 WHERE tenant_id=$1",
    "UPDATE meta_coexistence_sync_jobs SET status='requests-accepted',version=version+1 WHERE tenant_id=$1",
    "DELETE FROM meta_coexistence_sync_jobs WHERE tenant_id=$1",
  ]) await assert.rejects(pool.query(sql,[f.session.tenantId]));
  await workerFor(f).runNext();
  await assert.rejects(pool.query("UPDATE meta_coexistence_sync_jobs SET status='pending',version=version+1 WHERE tenant_id=$1",[f.session.tenantId]));
});

test('a job whose original signup window expired becomes terminal without a provider call', async () => {
  const f = await fixture();
  const key = 'connect_idempotency_v1_'+createHash('sha256').update(f.input.authorizationCode).digest('hex');
  const digest = 'railway_mutation_request_v1_'+createHash('sha256').update(JSON.stringify(f.input)).digest('hex');
  const row = (await pool.query(`WITH stamp AS (SELECT date_trunc('milliseconds',clock_timestamp())-INTERVAL '25 hours' AS started)
    INSERT INTO meta_signup_launches (tenant_id,actor_external_user_id,configuration_key,started_at,expires_at)
    SELECT $1,$2,$3,started,started+INTERVAL '20 minutes' FROM stamp RETURNING id`,[f.session.tenantId,f.session.externalUserId,'a'.repeat(64)])).rows[0];
  await pool.query(postgresMetaSignupAttemptSql.claim,[f.session.tenantId,'meta.embedded-signup.complete',key,digest,f.session.externalUserId]);
  await pool.query("UPDATE meta_signup_launches SET status='claimed',claim_key=$2,request_digest=$3,claimed_at=started_at+INTERVAL '1 minute' WHERE id=$1",[row.id,key,digest]);
  const pending = await meta.saveAssetSnapshot(f.assets), connected = await meta.markConnectionConnected(f.session.tenantId,pending.version);
  await attempts.complete({ session:f.session,claimKey:key,requestDigest:digest,launchId:Number(row.id),launchConfigurationKey:'a'.repeat(64),synchronizeBusinessApp:true },{ status:'connected',connectionVersion:connected.version });
  await workerFor(f).runNext(); assert.equal((await jobFor(f)).status,'recovery-required');
  assert.deepEqual(f.calls,[]); assert.equal(await countSyncRows(f),0);
});

test('job finish failure after accepted provider results recovers from an expired lease without repeating a POST', async () => {
  const { f } = await registerWithoutContinuation();
  await assert.rejects(workerFor(f,{ jobs:{ ...jobs,async finish() { throw new Error('worker result write failed'); } } }).runNext(),/worker result write/);
  assert.equal((await jobFor(f)).status,'running'); const before = [...f.calls];
  await pool.query("UPDATE meta_coexistence_sync_jobs SET lease_expires_at=clock_timestamp()-INTERVAL '1 second',version=version+1 WHERE tenant_id=$1",[f.session.tenantId]);
  await workerFor(f).runNext(); assert.equal((await jobFor(f)).status,'requests-accepted'); assert.deepEqual(f.calls,before);
});

test('restoring an owner does not revive a cancelled continuation through the inline resume path', async () => {
  const { f,launch } = await registerWithoutContinuation();
  await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.session.tenantId,f.session.externalUserId]);
  await workerFor(f).runNext(); assert.equal((await jobFor(f)).status,'cancelled');
  await pool.query("UPDATE tenant_memberships SET status='active',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.session.tenantId,f.session.externalUserId]);
  assert.equal((await f.service.resume(f.session,launch.launchId)).status,'recovery-required');
  assert.deepEqual(f.syncTypes,[]); assert.equal((await jobFor(f)).status,'cancelled');
});

test('the actual PostgreSQL Worker scheduler runs the persisted Coexistence continuation', async () => {
  const { f } = await registerWithoutContinuation(); const previousFetch = globalThis.fetch;
  const events = [], failures = [];
  globalThis.fetch = f.dependencies.transportOptions.fetchImplementation;
  let service;
  try {
    service = await createRailwayPostgresWorkerService({
      environment:{ APP_RUNTIME_ENVIRONMENT:'test',DATABASE_URL:connectionString,POSTGRES_APPLICATION_NAME:'connect-coexistence-worker-test',
        POSTGRES_MAX_CONNECTIONS:'4',POSTGRES_CONNECTION_TIMEOUT_MS:'2000',POSTGRES_IDLE_TIMEOUT_MS:'2000',
        POSTGRES_STATEMENT_TIMEOUT_MS:'15000',POSTGRES_QUERY_TIMEOUT_MS:'20000',POSTGRES_LOCK_TIMEOUT_MS:'3000',
        POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS:'10000',POSTGRES_MAX_LIFETIME_SECONDS:'1800',POSTGRES_TLS_MODE:'disabled' },
      ownerKey:'scheduler_owner_v1_'+createHash('sha256').update('coexistence-worker-integration').digest('hex'),
      campaignQueue:{ async sendBatch() { throw new Error('No campaigns expected in the isolated database'); } },
      postgresTelemetry:{ recordIdleClientError() { failures.push('postgres'); } },
      schedulerTelemetry:{ recordRunFailure() { failures.push('run'); },recordTimerFailure() { failures.push('timer'); },recordOverlapSuppressed() { failures.push('overlap'); } },
      metaWebhooks:{ environment:{ ...environment,META_WEBHOOK_VERIFY_TOKEN:'local-coexistence-verify-token' },
        createQueueRuntime() { return {
          async start() { events.push('start'); }, async cleanExpiredDeadLetters() { events.push('clean'); return 0; }, async close() { events.push('close'); },
        }; }, telemetrySink:{ async record() { return { outcome:'recorded' }; } },
      },
    });
    await service.start();
    for (let poll=0; poll<100 && (await jobFor(f)).status!=='requests-accepted'; poll++) {
      await new Promise((resolve) => setTimeout(resolve,20));
    }
    assert.equal((await jobFor(f)).status,'requests-accepted');
    assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']); assert.equal(exchangeCount(f),1);
  } finally {
    if (service) await service.close(); globalThis.fetch=previousFetch;
  }
  assert.deepEqual(failures,[]); assert.deepEqual(events,['start','clean','close']);
});

test('a maintenance batch processes at most ten jobs and leaves the next job durable', async () => {
  const fixtures=[];
  for (let index=0; index<11; index++) fixtures.push((await registerWithoutContinuation()).f);
  const maintenance = workerFor(fixtures[0],{ transportOptions:{ requestTimeoutMs:2000,fetchImplementation(url,init) {
    const asset = new URL(url).pathname.split('/')[2];
    const f = fixtures.find((candidate) => candidate.assets.phoneNumberId===asset || candidate.assets.wabaId===asset);
    assert.ok(f,'The worker must only use assets from a registered test tenant');
    return f.dependencies.transportOptions.fetchImplementation(url,init);
  } } });
  await maintenance.run();
  for (const f of fixtures.slice(0,10)) {
    assert.equal((await jobFor(f)).status,'requests-accepted'); assert.deepEqual(f.syncTypes,['smb_app_state_sync','history']);
  }
  assert.equal((await jobFor(fixtures[10])).status,'pending'); assert.deepEqual(fixtures[10].syncTypes,[]);
  await maintenance.run(); assert.equal((await jobFor(fixtures[10])).status,'requests-accepted');
});

function apiFor(f,options={}) {
  const oidc='oidc.local.signature',user='user.local.signature';
  const identity={teamSlug:'connect-team',projectName:'connect-web',environment:'production'};
  const service=createRailwayMetaSignupApiRuntime({...f.dependencies,environment:{...environment,META_COEXISTENCE_ONBOARDING_MODE:'controlled-pilot',...options.environment}});
  const tenantSessions={async resolve(actor) {
    return resolveTenantSessionFromMemberships(actor,await memberships.findActiveByExternalUserId(actor.externalUserId),f.session.tenantId);
  }};
  const dataSync=createPostgresMetaDataSyncLifecycle({queries,transactions});
  const api=createRailwayApiHttpHandler({expectedServiceIdentity:identity,
    oidcVerifier:{async verify(token) {return token===oidc?{provider:'vercel',...identity,subject:'owner:connect-team:project:connect-web:environment:production'}:null;}},
    endUserSessionVerifier:{async verify(token) {return token===user?{externalUserId:f.session.externalUserId,externalOrganizationId:'org_verified'}:null;}},
    operations:[...createRailwayMetaSignupOperations({tenantSessions,service,mutationRateLimit:{async consume(){return {outcome:options.rateLimit??'allowed'};}}}),
      createRailwayMetaConnectionReadOperation({tenantSessions,connections,dataSync})],
  });
  const handler=createRailwayMetaSignupHandler({applicationConfigured:()=>true,
    inspectConfiguration:()=>({status:'configured',configuration:{apiOrigin:'https://connect-api.invalid',deploymentEnvironment:'production'}}),
    resolveIdentity:async()=>({status:'authenticated',oidcToken:oidc,userSessionToken:user}),
    createClient(config){return createRailwayApiClient({apiOrigin:config.apiOrigin,deploymentEnvironment:config.deploymentEnvironment,
      oidcTokenProvider:{async getToken(){return config.oidcToken;}},userSessionTokenProvider:{async getToken(){return config.userSessionToken;}},
      traceparentProvider:{async getTraceparent(){return null;}},telemetry:{record(){return true;},scheduleFlush(){}},
      fetchImplementation:(url,init)=>api.handle(new Request(url,init)),
    });},
  });
  async function raw(operation,payload={},overrides={}) {
    const query=operation==='meta.connection.read'||operation==='meta.embedded-signup.configuration';
    return (await api.handle(new Request('https://connect-api.invalid/v1/connect',{
      method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${user}`,'x-vercel-oidc-token':oidc},
      body:JSON.stringify({contractVersion:'connect.railway-api.v1',operation,requestKind:query?'query':'mutation',idempotencyKey:query?null:await deriveRailwayApiDeterministicIdempotencyKey(operation,payload),payload,...overrides}),
    }))).json();
  }
  return {handler,raw,dataSync};
}

test('the authenticated API queues Business App synchronization and the read path shows its actual progress', async () => {
  const f=await fixture(), api=apiFor(f);
  assert.equal((await api.handler.readConfiguration()).businessAppEnabled,true);
  const launch=await api.handler.begin('business-app'); assert.equal(launch.status,'ready'); assert.deepEqual(f.calls,[]);
  const input={...f.input,launchId:launch.launchId};
  assert.deepEqual(await api.handler.complete(input),{status:'connected',connection:{status:'connected'},synchronization:'background'});
  assert.deepEqual(f.syncTypes,[]); assert.equal((await jobFor(f)).status,'pending'); assert.equal(await countSyncRows(f),0);
  const queued=await api.raw('meta.connection.read'); assert.equal(queued.outcome,'ok');
  assert.equal(queued.data.connection.dataSync.stage,'awaiting-worker');
  assert.equal(queued.data.connection.dataSync.contacts,'not-prepared');
  assert.doesNotMatch(JSON.stringify(queued),/waba|phoneNumberId|requestId|launchId|token|configurationKey/);
  await workerFor(f).runNext();
  const progressed=await api.raw('meta.connection.read'); assert.equal(progressed.data.connection.dataSync.stage,'requesting-history');
  assert.equal(progressed.data.connection.dataSync.contacts,'accepted'); assert.equal(progressed.data.connection.dataSync.history,'accepted');
  const calls=[...f.calls]; await api.handler.complete(input); assert.deepEqual(f.calls,calls); assert.equal(exchangeCount(f),1);
});

test('disabled pilot, rate limiting and invalid begin payloads cannot create a launch or call the provider', async () => {
  for(const options of [{environment:{META_COEXISTENCE_ONBOARDING_MODE:''}},{rateLimit:'limited'}]) {
    const f=await fixture(),api=apiFor(f,options); assert.notEqual((await api.handler.begin('business-app')).status,'ready');
    assert.equal((await pool.query('SELECT * FROM meta_signup_launches WHERE tenant_id=$1',[f.session.tenantId])).rowCount,0);assert.deepEqual(f.calls,[]);
  }
  const f=await fixture(),api=apiFor(f);
  for(const payload of [{flow:'personal'},{flow:'business-app',tenantId:99},{flow:'business-app',authorizationCode:'unexpected'},{flow:'business-app',launchId:1}]) {
    assert.equal((await api.raw('meta.embedded-signup.begin',payload)).code,'INVALID_REQUEST');
  }
  assert.deepEqual(f.calls,[]);
});

test('Cloud API and Business App launches remain separate even with the pilot enabled', async () => {
  const f=await fixture(),api=apiFor(f);
  const cloud=await api.handler.begin();
  assert.equal((await api.handler.complete({...f.input,launchId:cloud.launchId})).status,'server-error'); assert.deepEqual(f.calls,[]);
  const business=await api.handler.begin('business-app'); assert.notEqual(business.launchId,cloud.launchId);
  assert.equal((await api.handler.complete({...f.input,launchId:business.launchId})).status,'connected'); assert.deepEqual(f.syncTypes,[]);
});

test('the actual membership at API completion overrides an owner session that was valid when begin ran', async () => {
  const f=await fixture(),api=apiFor(f),launch=await api.handler.begin('business-app');
  await pool.query("UPDATE tenant_memberships SET role='viewer',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.session.tenantId,f.session.externalUserId]);
  assert.equal((await api.handler.complete({...f.input,launchId:launch.launchId})).status,'permission-denied');
  assert.deepEqual(f.calls,[]); assert.equal(await jobFor(f),undefined);
});

test('durable continuation cancellation is visible before request preparation and contains no fabricated progress', async () => {
  const f=await fixture(),api=apiFor(f),launch=await api.handler.begin('business-app');
  await api.handler.complete({...f.input,launchId:launch.launchId});
  const job=await jobs.claimNext(); await jobs.finish(job,'cancelled');
  const view=(await api.raw('meta.connection.read')).data.connection.dataSync;
  assert.deepEqual(view,{stage:'recovery-required',contacts:'not-prepared',history:'not-prepared',providerProgress:null,receivedChunks:0,processedChunks:0,projectedMessages:0});
});

test('queued synchronization read hides replaced connections and rejects mixed read snapshots', async () => {
  const f=await fixture(),api=apiFor(f),launch=await api.handler.begin('business-app');
  await api.handler.complete({...f.input,launchId:launch.launchId}); const previous=await connections.read(f.session);
  await meta.saveAssetSnapshot({...f.assets,phoneNumberId:'999888777'});
  assert.equal((await api.raw('meta.connection.read')).data.connection.dataSync.stage,'connection-changed');
  await assert.rejects(api.dataSync.readView(f.session.tenantId,previous),{code:'SYNC_LIFECYCLE_UNAVAILABLE'});
  await assert.rejects(api.dataSync.readView(f.session.tenantId,{...previous,tenantId:previous.tenantId+1}),{code:'SYNC_LIFECYCLE_UNAVAILABLE'});
});

// Reuse the existing provider/tenant fixture. These tests never contact Meta.
async function observedOffboarding(f) {
  const current=await meta.findConnectionByTenantId(f.session.tenantId);
  // Provider lifecycle time has second precision; ensure it follows this fixture's signup.
  await pool.query('SELECT pg_sleep(1.01)');
  const occurredAt=(await pool.query("SELECT date_trunc('second',clock_timestamp()) AS stamp")).rows[0].stamp.toISOString();
  const eventKey=createHash('sha256').update(`reconnect-${f.session.tenantId}-${current.version}`).digest('hex');
  const receipt=await meta.claimWebhookReceipt({tenantId:f.session.tenantId,wabaId:f.assets.wabaId,eventKey,objectType:'whatsapp_business_account'});
  await createPostgresMetaAccountLifecycleRepository(transactions).recordBatch({...f.assets,connectionVersion:current.version,
    receiptId:receipt.receipt.id,eventKey,events:[{event:'ACCOUNT_OFFBOARDED',occurredAt,ownerBusinessId:null,reportedPhoneNumber:null,reason:null,initiatedBy:null}]});
  return current;
}
const generationRows=f=>pool.query('SELECT * FROM meta_data_sync_requests WHERE tenant_id=$1 ORDER BY started_at,sync_type',[f.session.tenantId]);
async function newGeneration(f) {
  const launch=await begin(f);
  const result=await f.service.complete(f.session,{...f.input,authorizationCode:`${f.input.authorizationCode}-${launch.launchId}`,launchId:launch.launchId});
  return {launch,result};
}
const currentScope=async f=>({...f.assets,connectionVersion:(await meta.findConnectionByTenantId(f.session.tenantId)).version});

test('generation: completed offboarding and new signup preserve old requests and send each new POST once',async()=>{
  const f=await fixture();const first=await begin(f);await complete(f,first);const before=(await generationRows(f)).rows;
  await observedOffboarding(f);const {launch,result}=await newGeneration(f);
  assert.equal(result.synchronization.status,'requests-accepted');assert.equal((await generationRows(f)).rowCount,4);
  assert.deepEqual((await generationRows(f)).rows.slice(0,2),before);
  assert.deepEqual(f.syncTypes,['smb_app_state_sync','history','smb_app_state_sync','history']);
  await f.create().resume(f.session,launch.launchId);assert.equal(f.syncTypes.length,4);
  const starts=(await pool.query('SELECT * FROM meta_data_sync_onboardings WHERE tenant_id=$1 ORDER BY started_at',[f.session.tenantId])).rows;
  assert.equal(starts.length,2);assert.deepEqual(starts[1].previous_started_at,starts[0].started_at);assert.ok(starts[1].offboarding_event_digest);
  assert.equal((await f.service.resume(f.session,first.launchId)).status,'recovery-required');assert.equal(f.syncTypes.length,4);
});

test('generation: changing authorization without offboarding does not permit a repeat synchronization',async()=>{
  const f=await fixture();await complete(f,await begin(f));const before=(await generationRows(f)).rows;
  const {result}=await newGeneration(f);assert.equal(result.registration.status,'connected');assert.equal(result.synchronization.status,'recovery-required');
  assert.deepEqual((await generationRows(f)).rows,before);assert.equal(f.syncTypes.length,2);
});

test('generation: original delayed acknowledgement updates only its retained dispatching request',async()=>{
  let rejectFinish=true;
  const f=await fixture({requests:{...requests,async finish(request,result){if(rejectFinish)throw new Error('lost storage');return requests.finish(request,result);}}});
  const first=await begin(f);await complete(f,first);const old=await requests.read(f.session.tenantId,'smb_app_state_sync');assert.equal(old.status,'dispatching');
  await observedOffboarding(f);rejectFinish=false;const {result}=await newGeneration(f);assert.equal(result.synchronization.status,'requests-accepted');
  const latest=await requests.read(f.session.tenantId,'smb_app_state_sync');
  await requests.finish(old,{status:'accepted',requestId:'accepted-original-contacts'});
  assert.deepEqual(await requests.read(f.session.tenantId,'smb_app_state_sync'),latest);
  assert.equal((await generationRows(f)).rows.find(r=>r.connection_version===old.connectionVersion&&r.sync_type==='smb_app_state_sync').request_id,'accepted-original-contacts');
  assert.equal(f.syncTypes.length,3);
});

test('generation: repeated signup continuations serialize preparation and never duplicate the new contacts POST',async()=>{
  const f=await fixture();await complete(f,await begin(f));await observedOffboarding(f);
  const deferred=f.create({requests:{...requests,async prepareFromSignupLaunch(){throw new Error('interrupted before preparation');}}});
  const launch=await deferred.begin(f.session);await deferred.complete(f.session,{...f.input,authorizationCode:`${f.input.authorizationCode}-${launch.launchId}`,launchId:launch.launchId});
  const results=await Promise.all(Array.from({length:4},()=>f.create().resume(f.session,launch.launchId)));
  assert.ok(results.every(r=>['requests-accepted','in-progress'].includes(r.status)));assert.equal(f.syncTypes.length,4);assert.equal((await generationRows(f)).rowCount,4);
});

test('generation: ambiguous history and contacts are retained separately and refusal redacts only held payloads',async()=>{
  const f=await fixture();await complete(f,await begin(f));const history=createPostgresMetaHistorySyncRepository(transactions);
  const item=parseMetaHistorySync({kind:'history',value:historyValue(undefined,f.assets.phoneNumberId)},f.assets.phoneNumberId)[0];
  await history.record(await currentScope(f),item);await createPostgresMetaHistoryInboxProjector(transactions).projectNext();
  const previous=(await pool.query('SELECT * FROM meta_history_sync_chunks WHERE tenant_id=$1',[f.session.tenantId])).rows;
  await observedOffboarding(f);await newGeneration(f);const scope=await currentScope(f);
  assert.equal((await history.record(scope,item)).outcome,'unattributed');await history.record(scope,item);
  const contacts=createPostgresMetaContactSyncRepository(transactions);
  assert.equal((await contacts.record(scope,{phoneNumber:'+16505551234',action:'add',fullName:'Pablo Morales',firstName:null,occurredAt:'2026-09-09T08:00:00.000Z'})).outcome,'unattributed');
  assert.equal((await pool.query('SELECT * FROM meta_sync_unattributed_events WHERE tenant_id=$1',[f.session.tenantId])).rowCount,2);
  assert.equal((await pool.query('SELECT * FROM meta_contact_sync_states WHERE tenant_id=$1',[f.session.tenantId])).rowCount,0);
  assert.equal((await createPostgresMetaHistoryInboxProjector(transactions).projectNext()).outcome,'idle');
  const current=await meta.findConnectionByTenantId(f.session.tenantId);
  assert.equal((await createPostgresMetaDataSyncLifecycle({transactions,queries}).readView(f.session.tenantId,current)).stage,'import-review-required');
  await history.record(scope,{kind:'declined'});await history.record(scope,{...item,chunkOrder:item.chunkOrder+1});
  assert.equal((await createPostgresMetaDataSyncLifecycle({transactions,queries}).readView(f.session.tenantId,current)).stage,'sharing-declined');
  assert.equal((await pool.query('SELECT * FROM meta_sync_unattributed_events WHERE tenant_id=$1 AND payload IS NOT NULL',[f.session.tenantId])).rowCount,0);
  assert.deepEqual((await pool.query('SELECT * FROM meta_history_sync_chunks WHERE tenant_id=$1',[f.session.tenantId])).rows,previous);
  await assert.rejects(pool.query('DELETE FROM meta_sync_unattributed_events WHERE tenant_id=$1',[f.session.tenantId]),/cannot be erased/);
  await assert.rejects(pool.query("UPDATE meta_sync_unattributed_events SET payload='{}' WHERE tenant_id=$1",[f.session.tenantId]),/only be redacted/);
});

test('generation: superseded prepared requests are cancelled individually while current requests stay accepted',async()=>{
  let rejectFinish=true;
  const f=await fixture({requests:{...requests,async finish(request,result){if(rejectFinish)throw new Error('lost storage');return requests.finish(request,result);}}});
  await complete(f,await begin(f));await observedOffboarding(f);rejectFinish=false;await newGeneration(f);
  const lifecycle=createPostgresMetaDataSyncLifecycle({transactions,queries});
  for(let i=0;i<20;i++){if(await lifecycle.reconcileNext()==='idle')break;}
  const rows=(await generationRows(f)).rows;assert.equal(rows[0].status,'cancelled');assert.equal(rows[1].status,'dispatching');
  assert.equal(rows[2].status,'accepted');assert.equal(rows[3].status,'accepted');
});

test('generation: offboarding a newer authorization can recover after an earlier signup lacked removal evidence',async()=>{
  const f=await fixture();await complete(f,await begin(f));
  assert.equal((await newGeneration(f)).result.synchronization.status,'recovery-required');
  await observedOffboarding(f);assert.equal((await newGeneration(f)).result.synchronization.status,'requests-accepted');assert.equal(f.syncTypes.length,4);
});

test('generation: concurrent held ingestion and refusal converge without restoring content',async()=>{
  const f=await fixture();await complete(f,await begin(f));await observedOffboarding(f);await newGeneration(f);
  const scope=await currentScope(f),history=createPostgresMetaHistorySyncRepository(transactions);
  const item=parseMetaHistorySync({kind:'history',value:historyValue(undefined,f.assets.phoneNumberId)},f.assets.phoneNumberId)[0];
  const outcomes=await Promise.all([history.record(scope,item),history.record(scope,{kind:'declined'}),history.record(scope,{...item,chunkOrder:item.chunkOrder+1})]);
  assert.ok(outcomes.every(r=>r.outcome==='unattributed'));
  assert.equal((await pool.query('SELECT * FROM meta_sync_unattributed_events WHERE tenant_id=$1 AND payload IS NOT NULL',[f.session.tenantId])).rowCount,0);
});

test('generation: migration preserves accepted requests and the legacy cycle without inventing removal evidence',async()=>{
  assert.deepEqual(await retainedRequests(upgradeCase),upgradeRows);
  const row=(await pool.query('SELECT previous_started_at,offboarding_event_digest FROM meta_data_sync_onboardings WHERE tenant_id=$1',[upgradeCase.session.tenantId])).rows[0];
  assert.deepEqual(row,{previous_started_at:null,offboarding_event_digest:null});
});

test('generation: concurrent legacy SQL callers cannot bind the same phone to two tenants',async()=>{
  const a=await fixture(),b=await fixture();await requests.begin(a.session);await requests.begin(b.session);
  const insert=f=>pool.query(`INSERT INTO meta_data_sync_requests (tenant_id,waba_id,phone_number_id,connection_version,sync_type,started_at)
    SELECT $1,$2,$3,2,'history',started_at FROM meta_data_sync_onboardings WHERE tenant_id=$1`,[f.session.tenantId,f.assets.wabaId,a.assets.phoneNumberId]);
  const outcomes=await Promise.allSettled([insert(a),insert(b)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(outcomes.filter(r=>r.status==='rejected'&&/another tenant history/.test(r.reason.message)).length,1);
});

// Multi-generation import uses the same local provider fixture as signup above.
import { createMetaSyncAttribution } from '../../server/operations/metaSyncAttribution.ts';
import { createPostgresMetaSyncAttributionImporter } from '../../server/platform/postgresMetaSyncAttributionImporter.ts';
import { createPostgresConversationRepository,postgresConversationSql } from '../../server/platform/postgresConversationRepository.ts';
import { createPostgresMetaHistoryMediaRepository } from '../../server/platform/postgresMetaHistoryMediaRepository.ts';
import { deriveConversationKey } from '../../server/conversations/conversationKey.ts';
import { normalizeMetaHistorySync } from '../../server/meta/metaHistorySync.ts';
import { chunk as historyChunk,message as historyMessage,mediaValue as historyMediaValue } from '../fixtures/meta-history.mjs';
const importHistory=createPostgresMetaHistorySyncRepository(transactions);
const attribution=createMetaSyncAttribution(transactions),importer=createPostgresMetaSyncAttributionImporter(transactions);
const historyProjector=createPostgresMetaHistoryInboxProjector(transactions);
const inbox=createPostgresConversationRepository({transactions,queries});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const historicalItem=(f,messages=[historyMessage()],order=1)=>parseMetaHistorySync({kind:'history',value:historyValue([
  historyChunk({metadata:{phase:0,chunk_order:order,progress:55},threads:[{id:'16505551234',messages}]})
],f.assets.phoneNumberId)},f.assets.phoneNumberId)[0];
async function drainImports(){for(let i=0;i<30;i++)if(await importer.importNext()==='idle')return;assert.fail('Import bound exceeded');}
async function drainProjection(){for(let i=0;i<30;i++)if((await historyProjector.projectNext()).outcome==='idle')return;assert.fail('Projection bound exceeded');}
async function importedMessages(f){const list=await inbox.listByTenant(f.session.tenantId,100);return (await Promise.all(list.map(c=>inbox.listMessagesByConversation(f.session.tenantId,c.conversationKey,100)))).flat();}
async function sourceRows(f,version){
  const result={};for(const table of ['meta_history_sync_sessions','meta_history_sync_events','meta_history_sync_chunks','meta_history_sync_media','meta_history_inbox_cursors','meta_history_inbox_messages','meta_history_media_bindings'])
    result[table]=(await pool.query(`SELECT * FROM ${table} WHERE tenant_id=$1 AND connection_version=$2`,[f.session.tenantId,version])).rows;
  return result;
}
async function importFixture(){
  const f=await fixture();await complete(f,await begin(f));f.oldScope=await currentScope(f);
  await importHistory.record(f.oldScope,historicalItem(f));await drainProjection();f.original=await sourceRows(f,f.oldScope.connectionVersion);
  await observedOffboarding(f);await newGeneration(f);f.newScope=await currentScope(f);return f;
}
async function retainForImport(f,item,scope=f.newScope){
  assert.equal((await importHistory.record(scope,item)).outcome,'unattributed');
  const canonical=normalizeMetaHistorySync(scope,item),eventDigest=hash({namespace:'meta_sync_unattributed_v1',scope:canonical.scope,kind:item.kind,payload:canonical.item});
  assert.equal((await pool.query('SELECT * FROM meta_sync_unattributed_events WHERE tenant_id=$1 AND event_digest=$2',[f.session.tenantId,eventDigest])).rowCount,1);
  return eventDigest;
}
async function attributionGrant(f,role){await pool.query(`INSERT INTO meta_sync_attribution_grants(database_role,tenant_id,expires_at)
 VALUES(COALESCE($2::name,session_user),$1,clock_timestamp()+interval '1 hour') ON CONFLICT(database_role,tenant_id) DO UPDATE SET expires_at=EXCLUDED.expires_at`,[f.session.tenantId,role??null]);}
async function approveImport(f,eventDigest,version=f.newScope.connectionVersion,service=attribution){
  const input={tenantId:f.session.tenantId,eventDigest,connectionVersion:version};const proposal=await service.prepare(input);
  const evidence=hash({eventDigest,connectionVersion:version,providerRequestId:proposal.providerRequestId});
  assert.doesNotMatch(JSON.stringify(proposal),/history fixture|access_token|authorizationCode/);
  return {input,proposal,evidence,result:await service.apply(proposal,evidence)};
}

test('attribution: approved new chunks and media import separately, bind the correct cycle, and preserve every old row',async()=>{
  const f=await importFixture();await attributionGrant(f);
  const chunk=historicalItem(f,[historyMessage({id:'wamid.history-media',type:'media_placeholder',text:undefined})]);
  const media=parseMetaHistorySync({kind:'history',value:historyMediaValue(f.assets.phoneNumberId)},f.assets.phoneNumberId)[0];
  const e=await retainForImport(f,chunk),m=await retainForImport(f,media);assert.equal(await importer.importNext(),'idle');
  await approveImport(f,e);await approveImport(f,m);await drainImports();await drainProjection();
  const bindings=createPostgresMetaHistoryMediaRepository(transactions);assert.equal(await bindings.bindNext(),'bound');
  const messages=await importedMessages(f);assert.equal(messages.length,2);
  const key=messages.find(m=>m.providerMessageId==='wamid.history-media').messageKey;
  assert.equal((await bindings.readBoundMedia(f.session.tenantId,key)).scope.connectionVersion,f.newScope.connectionVersion);
  assert.deepEqual(await sourceRows(f,f.oldScope.connectionVersion),f.original);
  assert.equal((await pool.query('SELECT * FROM meta_history_sync_sessions WHERE tenant_id=$1',[f.session.tenantId])).rowCount,2);
  assert.equal((await pool.query('SELECT * FROM messages WHERE tenant_id=$1',[f.session.tenantId])).rowCount,0);
  assert.equal((await pool.query('SELECT * FROM contact_consent_events WHERE tenant_id=$1',[f.session.tenantId])).rowCount,0);
  const current=await meta.findConnectionByTenantId(f.session.tenantId);
  assert.equal((await createPostgresMetaDataSyncLifecycle({transactions,queries}).readView(f.session.tenantId,current)).stage,'receiving-history');
});
test('attribution: a confirmed late batch projects into its original cycle after reconnection',async()=>{
  const f=await importFixture();await attributionGrant(f);
  const e=await retainForImport(f,historicalItem(f,[historyMessage({id:'wamid.history-media'})],2));
  await approveImport(f,e,f.oldScope.connectionVersion);await drainImports();await drainProjection();
  const rows=await importedMessages(f);assert.equal(rows.length,2);
  assert.equal((await pool.query('SELECT connection_version FROM meta_history_inbox_messages WHERE tenant_id=$1 AND provider_message_id=$2',[f.session.tenantId,'wamid.history-media'])).rows[0].connection_version,f.oldScope.connectionVersion);
});
test('attribution: cross-cycle duplicate delivery snapshots keep one Inbox row and the original immutable source',async()=>{
  const f=await importFixture();await attributionGrant(f);
  const e=await retainForImport(f,historicalItem(f,[historyMessage({history_context:{status:'DELIVERED'}})]));
  await approveImport(f,e);await drainImports();await drainProjection();
  assert.equal((await importedMessages(f)).length,1);assert.deepEqual(await sourceRows(f,f.oldScope.connectionVersion),f.original);
  assert.equal((await pool.query('SELECT has_conflict FROM meta_history_sync_sessions WHERE tenant_id=$1 AND connection_version=$2',[f.session.tenantId,f.newScope.connectionVersion])).rows[0].has_conflict,false);
});
test('attribution: incompatible repeated message content blocks the new cycle without mutating the older message',async()=>{
  const f=await importFixture();await attributionGrant(f);
  const e=await retainForImport(f,historicalItem(f,[historyMessage({text:{body:'edited history'}})]));
  await approveImport(f,e);await drainImports();await drainProjection();
  assert.deepEqual(await sourceRows(f,f.oldScope.connectionVersion),f.original);assert.equal((await importedMessages(f))[0].textContent,'history fixture');
  assert.equal((await pool.query('SELECT has_conflict FROM meta_history_sync_sessions WHERE tenant_id=$1 AND connection_version=$2',[f.session.tenantId,f.newScope.connectionVersion])).rows[0].has_conflict,true);
});
test('attribution: concurrent identical attestations and imports produce one attribution, one import and no duplicate projection',async()=>{
  const f=await importFixture();await attributionGrant(f);const e=await retainForImport(f,historicalItem(f,[historyMessage({id:'wamid.history-media'})]));
  const p=await attribution.prepare({tenantId:f.session.tenantId,eventDigest:e,connectionVersion:f.newScope.connectionVersion}),proof=hash(p);
  const approved=await Promise.all(Array.from({length:4},()=>attribution.apply(p,proof)));assert.ok(approved.every(a=>a.attributionKey===approved[0].attributionKey));
  const imported=await Promise.all(Array.from({length:4},()=>importer.importNext()));assert.equal(imported.filter(x=>x==='imported').length,1);
  await Promise.all(Array.from({length:4},()=>historyProjector.projectNext()));assert.equal((await importedMessages(f)).length,2);
  assert.equal((await pool.query('SELECT * FROM meta_sync_attributions WHERE tenant_id=$1',[f.session.tenantId])).rowCount,1);
  assert.equal((await pool.query('SELECT * FROM meta_sync_attribution_imports WHERE tenant_id=$1',[f.session.tenantId])).rowCount,1);
});
test('attribution: refusal before approval, after approval and after import cannot be reset by a later signup',async()=>{
  for(const timing of ['before','queued','imported']){
    const f=await importFixture();await attributionGrant(f);const e=await retainForImport(f,historicalItem(f,[historyMessage({id:'wamid.history-media'})]));
    const p=await attribution.prepare({tenantId:f.session.tenantId,eventDigest:e,connectionVersion:f.newScope.connectionVersion});
    if(timing!=='before')await attribution.apply(p,hash(p));if(timing==='imported'){await drainImports();await drainProjection();}
    const stored=await sourceRows(f,f.oldScope.connectionVersion);await importHistory.record(f.newScope,{kind:'declined'});
    await assert.rejects(attribution.apply(p,hash(p)));await drainImports();await drainProjection();assert.equal((await importedMessages(f)).length,0);
    assert.deepEqual(await sourceRows(f,f.oldScope.connectionVersion),stored);
    if(timing==='queued')assert.equal((await pool.query('SELECT outcome FROM meta_sync_attribution_imports WHERE tenant_id=$1',[f.session.tenantId])).rows[0].outcome,'discarded');
    await observedOffboarding(f);await newGeneration(f);assert.equal((await importedMessages(f)).length,0);
  }
});
test('attribution: missing, expired or revoked private grants and forged operator/target/proof cannot authorize import',async()=>{
  const f=await importFixture(),e=await retainForImport(f,historicalItem(f));const input={tenantId:f.session.tenantId,eventDigest:e,connectionVersion:f.newScope.connectionVersion};
  await assert.rejects(attribution.prepare(input));await attributionGrant(f);const p=await attribution.prepare(input);
  for(const changed of [{operatorRole:'connect_api_runtime'},{connectionVersion:2147483647},{providerRequestId:'wrong-request'},{snapshotDigest:'a'.repeat(64)},{sourceWabaId:'999888777'},{kind:'contact'},
    {preparedAt:new Date(Date.parse(p.preparedAt)-360000).toISOString()}])await assert.rejects(attribution.apply({...p,...changed},hash(p)));
  await pool.query("UPDATE meta_sync_attribution_grants SET expires_at=clock_timestamp()-interval '1 second' WHERE tenant_id=$1",[f.session.tenantId]);
  await assert.rejects(attribution.apply(p,hash(p)));assert.equal(await importer.importNext(),'idle');
});
test('attribution: newer connection after prepare invalidates a proposal, and no worker work runs while disconnected',async()=>{
  const f=await importFixture();await attributionGrant(f);const e=await retainForImport(f,historicalItem(f));
  const p=await attribution.prepare({tenantId:f.session.tenantId,eventDigest:e,connectionVersion:f.newScope.connectionVersion});
  await observedOffboarding(f);assert.equal(await importer.importNext(),'idle');await newGeneration(f);
  await assert.rejects(attribution.apply(p,hash(p)),/stale/);
});
test('attribution: accepted provider request is required even when a history POST response was lost',async()=>{
  let historyCalls=0;const f=await fixture({post:(type,json)=>type==='history'&&++historyCalls===2?json({error:{code:1}},503):json({messaging_product:'whatsapp',request_id:'accepted-contacts'})});
  await complete(f,await begin(f));await observedOffboarding(f);await newGeneration(f);f.newScope=await currentScope(f);
  const e=await retainForImport(f,historicalItem(f));await attributionGrant(f);
  await assert.rejects(attribution.prepare({tenantId:f.session.tenantId,eventDigest:e,connectionVersion:f.newScope.connectionVersion}),/Accepted source request unavailable/);
});
test('attribution: import rollback retains the pending event; a lost commit acknowledgement replays without duplicate writes',async()=>{
  const f=await importFixture();await attributionGrant(f);const e=await retainForImport(f,historicalItem(f,[historyMessage({id:'wamid.history-media'})]));await approveImport(f,e);
  const rollback=createPostgresMetaSyncAttributionImporter({transaction(o,work){return transactions.transaction(o,async q=>{const result=await work(q);if(result==='imported')throw Error('rollback injection');return result;});}});
  await assert.rejects(rollback.importNext());assert.equal((await pool.query('SELECT * FROM meta_sync_attribution_imports WHERE tenant_id=$1',[f.session.tenantId])).rowCount,0);
  assert.equal((await pool.query('SELECT * FROM meta_history_sync_chunks WHERE tenant_id=$1 AND connection_version=$2',[f.session.tenantId,f.newScope.connectionVersion])).rowCount,0);
  const lost=createPostgresMetaSyncAttributionImporter({async transaction(o,work){const result=await transactions.transaction(o,work);if(result==='imported')throw Error('lost commit acknowledgement');return result;}});
  await assert.rejects(lost.importNext());assert.equal(await importer.importNext(),'idle');await drainProjection();assert.equal((await importedMessages(f)).length,2);
});
test('attribution: confirmed contact state imports with its accepted contacts request and respects later refusal',async()=>{
  const f=await importFixture();await attributionGrant(f);const contacts=createPostgresMetaContactSyncRepository(transactions);
  assert.equal((await contacts.record(f.newScope,{phoneNumber:'+16505551234',action:'add',fullName:'Pablo Morales',firstName:null,occurredAt:'2026-09-09T08:00:00.000Z'})).outcome,'unattributed');
  const e=(await pool.query("SELECT event_digest FROM meta_sync_unattributed_events WHERE tenant_id=$1 AND kind='contact'",[f.session.tenantId])).rows[0].event_digest;
  await approveImport(f,e);await drainImports();assert.equal((await pool.query('SELECT full_name FROM meta_contact_sync_states WHERE tenant_id=$1',[f.session.tenantId])).rows[0].full_name,'Pablo Morales');
  assert.equal((await inbox.listByTenant(f.session.tenantId,100))[0].contact.whatsappDisplayName,'Pablo Morales');
  await importHistory.record(f.newScope,{kind:'declined'});assert.notEqual((await inbox.listByTenant(f.session.tenantId,100))[0].contact.whatsappDisplayName,'Pablo Morales');
});
test('attribution: generation identities and evidence remain immutable and cannot bind a foreign cycle media source',async()=>{
  const f=await importFixture();await attributionGrant(f);const e=await retainForImport(f,historicalItem(f,[historyMessage({id:'wamid.history-media'})]));const a=await approveImport(f,e);await drainImports();await drainProjection();
  await assert.rejects(attribution.apply({...a.proposal,connectionVersion:f.oldScope.connectionVersion},a.evidence));
  for(const table of ['meta_sync_attributions','meta_sync_attribution_imports']){
    await assert.rejects(pool.query(`DELETE FROM ${table} WHERE tenant_id=$1`,[f.session.tenantId]));await assert.rejects(pool.query(`TRUNCATE ${table}`));
  }
  await assert.rejects(pool.query('UPDATE meta_history_inbox_messages SET connection_version=$2 WHERE tenant_id=$1',[f.session.tenantId,f.newScope.connectionVersion]));
  await assert.rejects(pool.query('UPDATE meta_history_sync_chunks SET connection_version=$2 WHERE tenant_id=$1',[f.session.tenantId,f.oldScope.connectionVersion]));
});

// Populate actual pre-0093 tables using the existing public fixture, without
// disabling any trigger. Every old value is compared after the real migration.
async function seedLegacyHistoryUpgrade(f){
  const scope=normalizeMetaHistorySync(await currentScope(f),{kind:'declined'}).scope;
  const item=historicalItem(f,[historyMessage(),historyMessage({id:'wamid.history-media',type:'media_placeholder',text:undefined})]);
  const media=parseMetaHistorySync({kind:'history',value:historyMediaValue(f.assets.phoneNumberId)},f.assets.phoneNumberId)[0];
  const request=await requests.read(f.session.tenantId,'history'),digest=hash({namespace:'whatsapp_history_capture_v1',scope,item});
  const mediaDigest=hash({namespace:'whatsapp_history_capture_v1',scope,item:media});
  await pool.query("INSERT INTO meta_history_sync_sessions(tenant_id,waba_id,phone_number_id,connection_version,started_at,sharing_state,max_progress) VALUES($1,$2,$3,$4,$5,'data_received',55)",[scope.tenantId,scope.wabaId,scope.phoneNumberId,scope.connectionVersion,request.startedAt]);
  await pool.query('INSERT INTO meta_history_sync_chunks(tenant_id,phase,chunk_order,progress,content_digest,payload) VALUES($1,0,1,55,$2,$3::jsonb)',[scope.tenantId,digest,JSON.stringify(item)]);
  await pool.query("INSERT INTO meta_history_sync_events(tenant_id,event_digest,kind) VALUES($1,$2,'chunk'),($1,$3,'media')",[scope.tenantId,digest,mediaDigest]);
  await pool.query('INSERT INTO meta_history_sync_media(tenant_id,provider_message_id,content_digest,payload) VALUES($1,$2,$3,$4::jsonb)',[scope.tenantId,media.providerMessageId,mediaDigest,JSON.stringify(media)]);
  for(const [index,message] of item.messages.entries()){
    const contact=(await pool.query(postgresConversationSql.resolveInboundContact,[scope.tenantId,message.threadPhoneNumber])).rows[0];
    const key=await deriveConversationKey(scope.tenantId,Number(contact.contactId));await pool.query(postgresConversationSql.insertConversation,[key,scope.tenantId,Number(contact.contactId)]);
    const messageKey='message_v1_'+hash({namespace:message.direction==='inbound'?'message_v1':'whatsapp_business_app_message_v1',tenantId:scope.tenantId,providerMessageId:message.providerMessageId});
    await pool.query('INSERT INTO meta_history_inbox_messages(tenant_id,provider_message_id,message_key,conversation_key,phase,chunk_order,content_digest,message_index,message_digest,occurred_at) VALUES($1,$2,$3,$4,0,1,$5,$6,$7,$8)',[scope.tenantId,message.providerMessageId,messageKey,key,digest,index,hash(message),message.occurredAt]);
    if(message.providerMessageId===media.providerMessageId)await pool.query('INSERT INTO meta_history_media_bindings(tenant_id,provider_message_id,message_digest,media_digest) VALUES($1,$2,$3,$4)',[scope.tenantId,message.providerMessageId,hash(message),mediaDigest]);
  }
  await pool.query('INSERT INTO meta_history_inbox_cursors(tenant_id,phase,chunk_order,content_digest,next_index) VALUES($1,0,1,$2,$3)',[scope.tenantId,digest,item.messages.length]);
  const result={};for(const table of ['meta_history_sync_sessions','meta_history_sync_events','meta_history_sync_chunks','meta_history_sync_media','meta_history_inbox_cursors','meta_history_inbox_messages','meta_history_media_bindings'])
    result[table]=(await pool.query(`SELECT * FROM ${table} WHERE tenant_id=$1`,[scope.tenantId])).rows;
  return result;
}
test('attribution: additive migration preserves every legacy capture, message, cursor and binding field',async()=>{
  const scope=await currentScope(upgradeCase),after=await sourceRows(upgradeCase,scope.connectionVersion);
  for(const [table,rows] of Object.entries(after)){
    if(table!=='meta_history_sync_sessions')for(const row of rows){assert.equal(row.connection_version,scope.connectionVersion);delete row.connection_version;}
    assert.deepEqual(rows,upgradeHistoryRows[table]);
  }
  assert.equal((await importedMessages(upgradeCase)).length,2);
  const key=(await importedMessages(upgradeCase)).find(m=>m.providerMessageId==='wamid.history-media').messageKey;
  assert.ok(await createPostgresMetaHistoryMediaRepository(transactions).readBoundMedia(scope.tenantId,key));
});
test('attribution: restricted login can attest only its granted tenant and cannot forge evidence rows or expose private payloads',async()=>{
  const f=await importFixture(),other=await importFixture();const e=await retainForImport(f,historicalItem(f));const otherEvent=await retainForImport(other,historicalItem(other));
  await pool.query("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='connect_sync_attribution_test') THEN CREATE ROLE connect_sync_attribution_test LOGIN; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='connect_sync_projection_test') THEN CREATE ROLE connect_sync_projection_test LOGIN; END IF; END $$");
  await pool.query('GRANT USAGE ON SCHEMA public TO connect_sync_attribution_test,connect_sync_projection_test');
  await pool.query('GRANT EXECUTE ON FUNCTION meta_sync_attribution_snapshot_v1(BIGINT,TEXT,INTEGER),apply_meta_sync_attribution_v1(BIGINT,TEXT,INTEGER,TEXT,TIMESTAMPTZ,TEXT,TEXT,TEXT) TO connect_sync_attribution_test');
  await pool.query('GRANT SELECT ON meta_sync_pending_imports,meta_history_read_authorizations,meta_sync_generation_authorizations TO connect_sync_projection_test');
  await attributionGrant(f,'connect_sync_attribution_test');
  const scopedPool=new pg.Pool({connectionString:connectionString.replace('connect_echo_test@','connect_sync_attribution_test@'),max:2});
  const reader=new pg.Client({connectionString:connectionString.replace('connect_echo_test@','connect_sync_projection_test@')});
  const service=createMetaSyncAttribution(createNodePostgresTransactionManager(scopedPool));
  const directory=join(tmpdir(),'connect-sync-attribution-cli-'+process.pid);await mkdir(directory,{mode:0o700});
  try{
    const requestPath=directory+'/request.json',proposalPath=directory+'/proposal.json',proofPath=directory+'/evidence.json';
    const env={META_SYNC_ATTRIBUTION_DATABASE_URL:connectionString.replace('connect_echo_test@','connect_sync_attribution_test@')};
    await writeFile(requestPath,JSON.stringify({tenantId:f.session.tenantId,eventDigest:e,connectionVersion:f.newScope.connectionVersion}),{mode:0o600});
    await assert.rejects(runMetaSyncAttribution(['prepare',requestPath,proposalPath],{...env,META_SYNC_ATTRIBUTION_DATABASE_URL:env.META_SYNC_ATTRIBUTION_DATABASE_URL+'?sslmode=verify-full&sslmode=disable'}));
    await runMetaSyncAttribution(['prepare',requestPath,proposalPath],env);
    await assert.rejects(runMetaSyncAttribution(['prepare',requestPath,proposalPath],env));
    const proposal=JSON.parse(await readFile(proposalPath,'utf8'));assert.equal(proposal.operatorRole,'connect_sync_attribution_test');
    const proof={schemaVersion:1,tenantId:proposal.tenantId,eventDigest:e,connectionVersion:proposal.connectionVersion,
      providerRequestId:proposal.providerRequestId,providerEvidenceReference:'existing-coexistence-fixture',
      statement:'Provider evidence identifies this exact retained event as belonging to this original sync request.'};
    await writeFile(proofPath,JSON.stringify({...proof,eventDigest:hash(proof)}),{mode:0o600});
    const args=['apply',proposalPath,proofPath,'CONFIRM_PROVIDER_EVENT_ATTRIBUTION'];
    await assert.rejects(runMetaSyncAttribution(args,env));
    await writeFile(proofPath,JSON.stringify(proof));
    await assert.rejects(runMetaSyncAttribution(['apply',proposalPath,proofPath,'YES'],env));
    await chmod(proofPath,0o644);await assert.rejects(runMetaSyncAttribution(args,env));await chmod(proofPath,0o600);
    const first=await runMetaSyncAttribution(args,env);assert.equal(first.outcome,'attributed');
    assert.deepEqual(await runMetaSyncAttribution(args,env),first);
    await assert.rejects(service.prepare({tenantId:other.session.tenantId,eventDigest:otherEvent,connectionVersion:other.newScope.connectionVersion}));
    await assert.rejects(scopedPool.query("INSERT INTO meta_sync_attribution_grants(database_role,tenant_id,expires_at) VALUES(session_user,$1,clock_timestamp()+interval '1 hour')",[other.session.tenantId]));
    for(const table of ['meta_sync_unattributed_events','meta_sync_attributions','meta_sync_attribution_imports'])await assert.rejects(scopedPool.query(`SELECT * FROM ${table}`));
    await reader.connect();assert.equal((await reader.query('SELECT * FROM meta_sync_pending_imports WHERE tenant_id=$1',[f.session.tenantId])).rowCount,1);
    await assert.rejects(reader.query('SELECT * FROM meta_sync_unattributed_events'));await assert.rejects(reader.query('SELECT meta_sync_attribution_snapshot_v1($1,$2,$3)',[f.session.tenantId,e,f.newScope.connectionVersion]));
    await drainImports();assert.equal((await reader.query('SELECT * FROM meta_sync_pending_imports WHERE tenant_id=$1',[f.session.tenantId])).rowCount,0);
  }finally{await scopedPool.end();await reader.end();await rm(directory,{recursive:true});}
});
