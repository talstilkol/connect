import { bindPaidFixture } from '../fixtures/paid-access-postgres.mjs';
import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { readdir,readFile } from 'node:fs/promises';
import pg from 'pg';
import { knowledgeFixture } from '../fixtures/knowledge-ingestion.mjs';
import { createNodePostgresQueryExecutor,createNodePostgresTransactionManager } from '../../server/platform/nodePostgresAdapter.ts';
import { createPostgresKnowledgeIngestionRepository } from '../../server/platform/postgresKnowledgeIngestionRepository.ts';
import { createKnowledgeIngestionWorker } from '../../server/ai/knowledgeIngestionWorker.ts';
import { KNOWLEDGE_UPLOAD_OPERATION } from '../../server/ai/knowledgeUploadRequest.ts';
import { deriveRailwayApiDeterministicIdempotencyKey,deriveRailwayApiMutationRequestDigest } from '../../server/platform/railwayApiMutationExecutor.ts';
import {createKnowledgeObjectRetention} from '../../server/operations/knowledgeObjectRetention.ts';
import {RETENTION_DATA_CLASSES,RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS} from '../../server/operations/retentionPolicy.ts';
import {createHash} from 'node:crypto';
import {runKnowledgeObjectRetention} from '../../scripts/knowledge-object-retention.mjs';
import {mkdir,writeFile,unlink,chmod} from 'node:fs/promises';
const connectionString=process.env.CONNECT_KNOWLEDGE_TEST_URL;
if(connectionString!=='postgresql://connect_knowledge_test@127.0.0.1:55447/connect_knowledge_integration')throw Error('Dedicated loopback Knowledge database required');
const pool=new pg.Pool({connectionString,max:8,statement_timeout:10000,lock_timeout:5000});
const queries=createNodePostgresQueryExecutor(pool),transactions=createNodePostgresTransactionManager(pool);
const jobs=createPostgresKnowledgeIngestionRepository({queries,transactions});let sequence=7;
before(async t=>{
  t.diagnostic(`PostgreSQL ${(await pool.query('SHOW server_version')).rows[0].server_version}`);
  assert.deepEqual((await pool.query('SELECT current_database() AS database,current_user AS role')).rows[0],{database:'connect_knowledge_integration',role:'connect_knowledge_test'});
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount,0);
  const directory=new URL('../../postgres/migrations/',import.meta.url);
  for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort())await pool.query(await readFile(new URL(name,directory),'utf8'));
});
after(()=>pool.end());
async function fixture(){
  const f=await knowledgeFixture(++sequence);const tenant=f.intent.tenantId;
  const session={tenantId:tenant,externalUserId:'user_knowledge_owner',role:'owner',status:'active',displayName:'צוות שירות'};
  await pool.query("INSERT INTO tenants(id,display_name,status) VALUES($1,$2,'active')",[tenant,session.displayName]);
  await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'owner','active'),($1,'template-submission-integration-owner','owner','active')",[tenant,session.externalUserId]);
  const key=await deriveRailwayApiDeterministicIdempotencyKey(KNOWLEDGE_UPLOAD_OPERATION,f.payload),digest=await deriveRailwayApiMutationRequestDigest(KNOWLEDGE_UPLOAD_OPERATION,f.payload);
  return {...f,session,enqueue:()=>jobs.enqueue(session,f.payload,f.config,key,digest)};
}
const row=async f=>(await pool.query('SELECT * FROM knowledge_ingestion_jobs WHERE tenant_id=$1',[f.intent.tenantId])).rows[0];
const source=async f=>(await pool.query('SELECT * FROM knowledge_sources WHERE tenant_id=$1',[f.intent.tenantId])).rows[0];
async function due(f){await pool.query("UPDATE knowledge_ingestion_jobs SET next_attempt_at=statement_timestamp()-interval '1 second',claim_expires_at=NULL WHERE tenant_id=$1",[f.intent.tenantId]);}
function storage(f,overrides={}){let puts=0,reads=0;return{async put(){puts++;return's3-integration-version-1'},async inspect(){return{versionId:'s3-integration-version-1',verdict:'NO_THREATS_FOUND'}},async read(){reads++;return f.bytes.slice()},close(){},...overrides,get puts(){return puts},get reads(){return reads}};}
async function finishPending(f){const s=storage(f);await due(f);await createKnowledgeIngestionWorker(jobs,s).run();}
test('concurrent authenticated upload replay creates one tenant source, job and request receipt',async()=>{
  const f=await fixture(),results=await Promise.all([f.enqueue(),f.enqueue()]);assert.deepEqual(results.map(r=>r.outcome).sort(),['processing','unchanged']);
  assert.equal((await pool.query('SELECT * FROM railway_api_mutation_receipts WHERE tenant_id=$1',[f.intent.tenantId])).rowCount,1);
  assert.equal((await row(f)).pending_bytes.length,f.bytes.length);await finishPending(f);
});
test('worker binds exact S3 version, stores real extracted content, clears relay bytes and records audit',async()=>{
  const f=await fixture();await f.enqueue();const s=storage(f);await createKnowledgeIngestionWorker(jobs,s).run();
  assert.equal(s.puts,1);assert.equal(s.reads,1);assert.equal((await row(f)).state,'ready');assert.equal((await row(f)).version_id,'s3-integration-version-1');
  assert.equal((await row(f)).pending_bytes,null);assert.equal((await source(f)).status,'ready');
  assert.equal((await pool.query('SELECT content FROM knowledge_passages WHERE tenant_id=$1',[f.intent.tenantId])).rows[0].content,new TextDecoder().decode(f.bytes));
  assert.ok((await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 AND action='ai.knowledge.ingestion'",[f.intent.tenantId])).rowCount>=4);
});
test('lost PUT acknowledgement is inspected after restart without a second PUT',async()=>{
  const f=await fixture();await f.enqueue();let puts=0;const s=storage(f,{async put(){puts++;throw Error('uncertain')}});
  await assert.rejects(createKnowledgeIngestionWorker(jobs,s).run());assert.equal((await row(f)).state,'unknown');await due(f);
  await createKnowledgeIngestionWorker(jobs,s).run();assert.equal(puts,1);assert.equal((await row(f)).state,'ready');
});
test('lost seal acknowledgement causes zero PUT and missing remote inventory stays unknown',async()=>{
  const f=await fixture();await f.enqueue();const s=storage(f,{async inspect(){return null}});
  const uncertain={...jobs,async seal(c){await jobs.seal(c);throw Error('commit ack lost')}};
  await assert.rejects(createKnowledgeIngestionWorker(uncertain,s).run());await due(f);await createKnowledgeIngestionWorker(jobs,s).run();
  assert.equal(s.puts,0);assert.equal((await row(f)).state,'unknown');await finishPending(f);
});
test('missing scan tag never retrieves content or publishes passages',async()=>{
  const f=await fixture();await f.enqueue();const s=storage(f,{async inspect(){return{versionId:'s3-integration-version-1',verdict:'PENDING'}}});
  await createKnowledgeIngestionWorker(jobs,s).run();assert.equal(s.reads,0);assert.equal((await row(f)).state,'quarantined');assert.equal((await source(f)).status,'scanning');await finishPending(f);
});
test('each non-clean GuardDuty result rejects without reading bytes or keeping relay data',async()=>{
  for(const verdict of ['THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED']){
    const f=await fixture();await f.enqueue();const s=storage(f,{async inspect(){return{versionId:'s3-integration-version-1',verdict}}});
    await createKnowledgeIngestionWorker(jobs,s).run();assert.equal(s.reads,0);assert.equal((await row(f)).state,'rejected');assert.equal((await row(f)).pending_bytes,null);
    assert.equal((await source(f)).last_error_code,`KNOWLEDGE_SCAN_${verdict}`);
  }
});
test('revocation before worker claim blocks upload and revocation after read prevents readiness',async()=>{
  for(const duringRead of [false,true]){
    const f=await fixture();await f.enqueue();const revoke=()=>pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.intent.tenantId,f.session.externalUserId]);
    if(!duringRead)await revoke();const s=storage(f,duringRead?{async read(){await revoke();return f.bytes.slice()}}:{});
    await createKnowledgeIngestionWorker(jobs,s).run();assert.equal((await row(f)).state,'rejected');assert.notEqual((await source(f)).status,'ready');if(!duringRead)assert.equal(s.puts,0);
  }
});
test('concurrent claims and expired preparation leases permit only the current claim to dispatch',async()=>{
  const f=await fixture();await f.enqueue();const claims=await Promise.all([jobs.claim(),jobs.claim()]);assert.equal(claims.filter(Boolean).length,1);
  const old=claims.find(Boolean);await due(f);const current=await jobs.claim();assert.equal(current.claimVersion,old.claimVersion+1);
  await assert.rejects(jobs.seal(old),{code:'CONFLICT'});await jobs.seal(current);await jobs.defer(current);await finishPending(f);
});
test('database guards reject premature readiness, body replacement and changing a recorded S3 version',async()=>{
  const f=await fixture();await f.enqueue();
  await assert.rejects(pool.query("UPDATE knowledge_sources SET status='ready',ready_at=date_trunc('milliseconds',statement_timestamp()) WHERE tenant_id=$1",[f.intent.tenantId]),/requires verified ingestion/);
  await assert.rejects(pool.query("UPDATE knowledge_ingestion_jobs SET pending_bytes=decode(repeat('ff',size_bytes),'hex') WHERE tenant_id=$1",[f.intent.tenantId]),/identity or transition/);
  const c=await jobs.claim();await jobs.seal(c);await jobs.receipt(c,'s3-integration-version-1');
  await assert.rejects(jobs.receipt(c,'foreign-version'),{code:'CONFLICT'});await jobs.defer(c);await finishPending(f);
});
test('same content in two businesses has distinct keys and tenant-bound worker source records',async()=>{
  const a=await fixture(),b=await fixture();const ra=await a.enqueue(),rb=await b.enqueue();assert.notEqual(ra.source.sourceKey,rb.source.sourceKey);
  await createKnowledgeIngestionWorker(jobs,storage(a)).run();await createKnowledgeIngestionWorker(jobs,storage(b)).run();assert.equal((await source(a)).status,'ready');assert.equal((await source(b)).status,'ready');
});

test('a paid subscription canceled after enqueue prevents S3 upload and retains a rejected source',async()=>{
  const f=await fixture(),paid=await bindPaidFixture(pool,f.intent.tenantId,f.session.externalUserId);await f.enqueue();await paid.cancel();const s=storage(f);
  await createKnowledgeIngestionWorker(jobs,s).run();assert.equal(s.puts,0);assert.equal(s.reads,0);assert.equal((await row(f)).state,'rejected');assert.equal((await source(f)).status,'rejected');
  await assert.rejects(f.enqueue(),{code:'AUTHORIZATION_DENIED'});
});

// Reuse the existing retention-policy fixture (30 days for each class). These
// are test values only. Production has no default retention period.
const retentionEnvironment={RETENTION_POLICY_JSON:JSON.stringify({version:2,rules:RETENTION_DATA_CLASSES.map(dataClass=>({dataClass,trigger:RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS[dataClass],retainForDays:30}))})};
const retention=createKnowledgeObjectRetention({transactions,environment:retentionEnvironment});
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const retentionTarget=f=>({tenantId:f.intent.tenantId,sourceKey:f.intent.sourceKey});
const evidence=f=>digest({source:f.intent.sourceKey,purpose:'existing-retention-fixture'});
const deletion=async f=>(await pool.query('SELECT * FROM knowledge_retention_jobs WHERE source_key=$1',[f.intent.sourceKey])).rows[0];
let testClockInstalled=false;
async function resetRetentionClock(){
  if(!testClockInstalled){
    await pool.query('CREATE TABLE retention_test_clock(observed_at TIMESTAMPTZ NOT NULL)');
    await pool.query('INSERT INTO retention_test_clock VALUES(clock_timestamp())');
    // Only the server clock source is replaced; eligibility, authorization,
    // transitions and immutable-evidence guards remain the actual migration SQL.
    await pool.query("CREATE OR REPLACE FUNCTION knowledge_retention_now_v1() RETURNS TIMESTAMPTZ LANGUAGE SQL VOLATILE SET search_path=pg_catalog,pg_temp AS $$ SELECT observed_at FROM public.retention_test_clock $$");
    testClockInstalled=true;
  }
  await pool.query('UPDATE retention_test_clock SET observed_at=clock_timestamp()');
}
const advance=ms=>pool.query("UPDATE retention_test_clock SET observed_at=observed_at+($1::double precision*interval '1 millisecond')",[ms]);
async function retentionFixture(){
  const f=await fixture();await f.enqueue();await finishPending(f);await resetRetentionClock();
  await pool.query("INSERT INTO knowledge_retention_grants(database_role,tenant_id,expires_at) VALUES(current_user,$1,knowledge_retention_now_v1()+interval '365 days')",[f.intent.tenantId]);return f;
}
async function closeTenant(f){await pool.query("UPDATE tenants SET status='cancelled' WHERE id=$1",[f.intent.tenantId]);}
const review=(f,legalHold=false,expectedVersion=0)=>retention.review({tenantId:f.intent.tenantId,legalHold,expectedVersion},evidence(f));
async function eligibleFixture(){const f=await retentionFixture();await closeTenant(f);await review(f);await advance(31*86400000);return f;}
async function queuedFixture(){const f=await eligibleFixture();f.proposal=await retention.prepare(retentionTarget(f));await retention.enqueue(f.proposal,evidence(f));return f;}

test('retention requires cancelled tenant, real closure age, complete policy and an explicit post-closure hold review',async()=>{
  const f=await retentionFixture(),target=retentionTarget(f);await assert.rejects(retention.prepare(target),{code:'RETENTION_NOT_DUE'});
  await closeTenant(f);await assert.rejects(retention.prepare(target),{code:'RETENTION_NOT_DUE'});
  await advance(31*86400000);await assert.rejects(retention.prepare(target),{code:'CONFLICT'});
  await review(f,true);await assert.rejects(retention.prepare(target),{code:'CONFLICT'});
  await assert.rejects(review(f,false,0),{code:'CONFLICT'});
  await review(f,false,1);await retention.prepare(target);
  await assert.rejects(createKnowledgeObjectRetention({transactions,environment:{}}).prepare(target),{code:'CONFIGURATION_REQUIRED'});
  assert.equal((await source(f)).status,'ready');assert.equal(await deletion(f),undefined);
});
test('suspension, expiry and payment cancellation do not count as tenant closure; closing again restarts retention',async()=>{
  const f=await retentionFixture();for(const status of ['suspended','expired','payment_failed']){
    await pool.query('UPDATE tenants SET status=$2 WHERE id=$1',[f.intent.tenantId,status]);await assert.rejects(retention.prepare(retentionTarget(f)),{code:'RETENTION_NOT_DUE'});
  }
  await closeTenant(f);const first=(await retention.status(retentionTarget(f))).closedAt;
  await advance(31*86400000);await pool.query("UPDATE tenants SET status='active' WHERE id=$1",[f.intent.tenantId]);await closeTenant(f);
  assert.notEqual((await retention.status(retentionTarget(f))).closedAt,first);await review(f);
  await assert.rejects(retention.prepare(retentionTarget(f)),{code:'RETENTION_NOT_DUE'});
  await pool.query("UPDATE tenants SET knowledge_retention_closed_at=knowledge_retention_now_v1()-interval '60 days' WHERE id=$1",[f.intent.tenantId]);
  await assert.rejects(retention.prepare(retentionTarget(f)),{code:'RETENTION_NOT_DUE'});
});
test('prepare is read-only; concurrent enqueue retires the source once and exact acknowledgement replay cannot enqueue a second deletion',async()=>{
  const f=await eligibleFixture(),proposal=await retention.prepare(retentionTarget(f));assert.equal((await source(f)).status,'ready');
  assert.deepEqual(await Promise.all([retention.enqueue(proposal,evidence(f)),retention.enqueue(proposal,evidence(f))]),[{outcome:'queued'},{outcome:'queued'}]);
  assert.equal((await source(f)).status,'archived');assert.equal((await deletion(f)).attempts,0);
  assert.equal((await pool.query("SELECT * FROM knowledge_retention_events WHERE source_key=$1 AND event_type='pending'",[f.intent.sourceKey])).rowCount,1);
  await assert.rejects(pool.query("UPDATE knowledge_sources SET status='ready',version=version+1 WHERE source_key=$1",[f.intent.sourceKey]));
});
test('stale proposals, changed policy, review change, reopened tenant and wrong operator are rejected before queueing',async()=>{
  for(const change of [
    async(f,p)=>({...p,preparedAt:new Date(Date.parse(p.preparedAt)-300001).toISOString()}),
    async(f,p)=>({...p,preparedAt:new Date(Date.parse(p.preparedAt)+1).toISOString()}),
    async(f,p)=>({...p,actor:'connect_api_runtime'}),
    async(f,p)=>{await review(f,true,1);return p;},
    async(f,p)=>{await pool.query("UPDATE tenants SET status='active' WHERE id=$1",[f.intent.tenantId]);return p;},
  ]){const f=await eligibleFixture(),p=await change(f,await retention.prepare(retentionTarget(f)));await assert.rejects(retention.enqueue(p,evidence(f)));assert.equal(await deletion(f),undefined);}
  const f=await eligibleFixture(),p=await retention.prepare(retentionTarget(f));
  const altered=createKnowledgeObjectRetention({transactions,environment:{RETENTION_POLICY_JSON:retentionEnvironment.RETENTION_POLICY_JSON.replaceAll('30','31')}});
  await assert.rejects(altered.enqueue(p,evidence(f)),{code:'INVALID_INPUT'});
});
test('unknown S3 version and unfinished ingestion cannot become deletion targets',async()=>{
  const f=await fixture();await f.enqueue();await resetRetentionClock();
  await pool.query("INSERT INTO knowledge_retention_grants(database_role,tenant_id,expires_at) VALUES(current_user,$1,knowledge_retention_now_v1()+interval '365 days')",[f.intent.tenantId]);
  const claim=await jobs.claim();await jobs.seal(claim);await jobs.reject(claim,'KNOWLEDGE_PROCESSING_EXPIRED');await closeTenant(f);await review(f);await advance(31*86400000);
  await assert.rejects(retention.prepare(retentionTarget(f)),{code:'CONFLICT'});assert.equal(await deletion(f),undefined);
});
test('one current deletion claim reaches only the immutable version and retains ingestion receipts and passages',async()=>{
  const f=await queuedFixture();let deletes=0;
  const s={async remove(i,v,authorize){await authorize();assert.deepEqual(i,f.intent);assert.equal(v,'s3-integration-version-1');deletes++;},close(){}};
  const results=await Promise.all([retention.run(retentionTarget(f),s),retention.run(retentionTarget(f),s)]);assert.equal(deletes,1);
  assert.deepEqual(results.map(r=>r.outcome).sort(),['idle','removed']);assert.equal((await deletion(f)).state,'removed');
  assert.equal((await row(f)).version_id,'s3-integration-version-1');assert.equal((await row(f)).state,'ready');
  assert.ok((await pool.query('SELECT * FROM knowledge_passages WHERE source_key=$1',[f.intent.sourceKey])).rowCount>0);
  assert.equal((await retention.enqueue(f.proposal,evidence(f))).outcome,'already-removed');await retention.run(retentionTarget(f),s);assert.equal(deletes,1);
});
test('new hold or tenant reopening after queue admission stops DELETE and requires a new reviewed proposal',async()=>{
  for(const change of [f=>review(f,true,1),f=>pool.query("UPDATE tenants SET status='active' WHERE id=$1",[f.intent.tenantId])]){
    const f=await queuedFixture();await change(f);let calls=0;
    await retention.run(retentionTarget(f),{async remove(){calls++;},close(){}});assert.equal(calls,0);assert.equal((await deletion(f)).state,'blocked');
  }
});
test('authority and hold are rechecked at transport; an acknowledgement remains a fact after an in-flight hold',async()=>{
  const f=await queuedFixture();let calls=0;
  const denied={async remove(i,v,authorize){await review(f,true,1);await authorize();calls++;},close(){}};
  assert.equal((await retention.run(retentionTarget(f),denied)).outcome,'blocked');assert.equal(calls,0);
  const g=await queuedFixture();assert.equal((await retention.run(retentionTarget(g),{async remove(i,v,authorize){await authorize();await review(g,true,1);},close(){}})).outcome,'removed');
  assert.equal((await retention.status(retentionTarget(g))).legalHold,true);
});
test('unknown DELETE outcome retries only the same version, stops after three attempts, and needs fresh approval to resume',async()=>{
  const f=await queuedFixture(),versions=[];const uncertain={async remove(i,v,a){await a();versions.push(v);throw Error('lost S3 acknowledgement')},close(){}};
  for(let attempt=1;attempt<=3;attempt++){await retention.run(retentionTarget(f),uncertain);assert.equal((await deletion(f)).attempts,attempt);await advance(60001);}
  assert.equal((await deletion(f)).state,'blocked');await retention.run(retentionTarget(f),uncertain);assert.equal(versions.length,3);assert.equal(new Set(versions).size,1);
  const proposal=await retention.prepare(retentionTarget(f));await retention.enqueue(proposal,evidence(f));assert.equal((await deletion(f)).attempts,0);
  await retention.run(retentionTarget(f),{async remove(i,v,a){await a();assert.equal(v,versions[0]);},close(){}});assert.equal((await deletion(f)).state,'removed');
});
test('expired leases fence old callbacks while exact-version retry remains safe',async()=>{
  const f=await queuedFixture(),old=await retention.claim(retentionTarget(f));await advance(600001);const current=await retention.claim(retentionTarget(f));
  assert.notEqual(old.version,current.version);await assert.rejects(retention.authorize(old),{code:'CONFLICT'});assert.equal(await retention.finish(old,'removed'),false);
  await retention.authorize(current);assert.equal(await retention.finish(current,'removed'),true);
});
test('failure while queueing rolls back retirement and audit; lost completion acknowledgement replays without another DELETE',async()=>{
  const f=await eligibleFixture(),proposal=await retention.prepare(retentionTarget(f));
  const injected={transaction(options,body){return transactions.transaction(options,q=>body({async query(sql,args){if(sql.startsWith('INSERT INTO knowledge_retention_jobs'))throw Error('injected queue failure');return q.query(sql,args)}}));}};
  await assert.rejects(createKnowledgeObjectRetention({transactions:injected,environment:retentionEnvironment}).enqueue(proposal,evidence(f)));assert.equal((await source(f)).status,'ready');assert.equal(await deletion(f),undefined);
  await retention.enqueue(proposal,evidence(f));let deletes=0;const s={async remove(i,v,a){await a();deletes++;},close(){}};
  // Commit succeeds, only the client's response is lost.
  const lost={async transaction(options,body){let finish=false;const result=await transactions.transaction(options,q=>body({async query(sql,args){if(sql.startsWith('UPDATE knowledge_retention_jobs SET version=version+1,state=CASE'))finish=true;return q.query(sql,args)}}));if(finish)throw Error('commit acknowledgement lost');return result;}};
  await assert.rejects(createKnowledgeObjectRetention({transactions:lost,environment:retentionEnvironment}).run(retentionTarget(f),s));
  assert.equal((await deletion(f)).state,'removed');await retention.run(retentionTarget(f),s);assert.equal(deletes,1);
});
test('deletion audit and identity cannot be rewritten and a rejected DELETE never claims removal',async()=>{
  const f=await queuedFixture();await retention.run(retentionTarget(f),{async remove(){throw Object.assign(Error('object lock'),{code:'DELETE_REJECTED'})},close(){}});
  assert.equal((await deletion(f)).state,'blocked');
  for(const sql of ['DELETE FROM knowledge_retention_jobs WHERE source_key=$1','UPDATE knowledge_retention_jobs SET object_version_id=object_version_id,version=version+1 WHERE source_key=$1','DELETE FROM knowledge_retention_events WHERE source_key=$1','UPDATE knowledge_retention_events SET details=details WHERE source_key=$1'])await assert.rejects(pool.query(sql,[f.intent.sourceKey]));
  await assert.rejects(pool.query('DELETE FROM knowledge_retention_reviews WHERE tenant_id=$1',[f.intent.tenantId]));
  for(const table of ['knowledge_retention_jobs','knowledge_retention_events','knowledge_retention_reviews'])await assert.rejects(pool.query(`TRUNCATE ${table}`));
});
test('retention grants are scoped and revoked authority blocks claims while a received acknowledgement is still recorded',async()=>{
  const f=await queuedFixture(),claim=await retention.claim(retentionTarget(f));
  await pool.query('DELETE FROM knowledge_retention_grants WHERE tenant_id=$1',[f.intent.tenantId]);
  await assert.rejects(retention.authorize(claim),{code:'AUTHORIZATION_DENIED'});assert.equal(await retention.finish(claim,'removed'),true);
  await assert.rejects(retention.status(retentionTarget(f)),{code:'AUTHORIZATION_DENIED'});
  await assert.rejects(pool.query("INSERT INTO knowledge_retention_grants(database_role,tenant_id,expires_at) VALUES('connect_worker_runtime',$1,clock_timestamp()+interval '1 hour')",[f.intent.tenantId]));
});
test('private retention CLI uses real status/review/prepare/enqueue boundaries and rejects unconfirmed or nonprivate evidence',async()=>{
  const f=await retentionFixture();await closeTenant(f);const dir='/private/tmp/connect-knowledge-retention-cli';await mkdir(dir,{recursive:true,mode:0o700});
  const request=`${dir}/${f.intent.tenantId}-request.json`,reviewPath=`${dir}/${f.intent.tenantId}-review.json`,proof=`${dir}/${f.intent.tenantId}-evidence.json`,proposal=`${dir}/${f.intent.tenantId}-proposal.json`;
  await writeFile(request,JSON.stringify(retentionTarget(f)),{mode:0o600});await writeFile(reviewPath,JSON.stringify({tenantId:f.intent.tenantId,expectedVersion:0,legalHold:false}),{mode:0o600});await writeFile(proof,JSON.stringify(f.intent),{mode:0o600});await unlink(proposal).catch(e=>{if(e.code!=='ENOENT')throw e});
  const env={...retentionEnvironment,KNOWLEDGE_RETENTION_DATABASE_URL:connectionString};
  await assert.rejects(runKnowledgeObjectRetention(['status',request],{...env,KNOWLEDGE_RETENTION_DATABASE_URL:`${connectionString}?sslmode=verify-full&sslmode=disable`}),{message:'DATABASE_CONFIGURATION_REQUIRED'});
  await assert.rejects(runKnowledgeObjectRetention(['review',reviewPath,proof,'YES'],env));
  assert.equal((await runKnowledgeObjectRetention(['review',reviewPath,proof,'CONFIRM_NO_LEGAL_HOLD'],env)).version,'1');await advance(31*86400000);
  assert.equal((await runKnowledgeObjectRetention(['prepare',request,proposal],env)).outcome,'prepared');
  await chmod(proof,0o644);await assert.rejects(runKnowledgeObjectRetention(['enqueue',proposal,proof,'CONFIRM_EXACT_VERSION_DELETION'],env));await chmod(proof,0o600);
  assert.equal((await runKnowledgeObjectRetention(['enqueue',proposal,proof,'CONFIRM_EXACT_VERSION_DELETION'],env)).outcome,'queued');
  assert.equal((await runKnowledgeObjectRetention(['status',request],env)).deletionState,'pending');
  await assert.rejects(runKnowledgeObjectRetention(['run',request,'RUN_APPROVED_DELETION'],env));assert.equal((await deletion(f)).attempts,0);
});
test('a separate restricted retention login needs a scoped grant, cannot self-authorize, and can complete its own audited deletion',async()=>{
  const f=await retentionFixture();await closeTenant(f);
  await pool.query("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='connect_knowledge_retention_test') THEN CREATE ROLE connect_knowledge_retention_test LOGIN; END IF; END $$");
  await pool.query('GRANT USAGE ON SCHEMA public TO connect_knowledge_retention_test');
  await pool.query('GRANT SELECT,UPDATE ON tenants,knowledge_sources TO connect_knowledge_retention_test');
  await pool.query('GRANT SELECT ON knowledge_ingestion_jobs,knowledge_retention_events,retention_test_clock TO connect_knowledge_retention_test');
  await pool.query('GRANT SELECT,INSERT,UPDATE ON knowledge_retention_reviews,knowledge_retention_jobs TO connect_knowledge_retention_test');
  await pool.query('GRANT EXECUTE ON FUNCTION knowledge_retention_authorize_v1(BIGINT),derive_bot_reply_staging_tenant_barrier_key_v1(BIGINT) TO connect_knowledge_retention_test');
  const operatorPool=new pg.Pool({connectionString:connectionString.replace('connect_knowledge_test@','connect_knowledge_retention_test@'),max:1});
  try{
    const service=createKnowledgeObjectRetention({transactions:createNodePostgresTransactionManager(operatorPool),environment:retentionEnvironment});
    await assert.rejects(service.status(retentionTarget(f)),{code:'AUTHORIZATION_DENIED'});
    await assert.rejects(operatorPool.query('UPDATE knowledge_ingestion_jobs SET state=state WHERE source_key=$1',[f.intent.sourceKey]),{code:'42501'});
    await assert.rejects(operatorPool.query("INSERT INTO knowledge_retention_grants(database_role,tenant_id,expires_at) VALUES(current_user,$1,clock_timestamp()+interval '365 days')",[f.intent.tenantId]));
    await pool.query("INSERT INTO knowledge_retention_grants(database_role,tenant_id,expires_at) VALUES('connect_knowledge_retention_test',$1,knowledge_retention_now_v1()+interval '365 days')",[f.intent.tenantId]);
    await service.review({tenantId:f.intent.tenantId,expectedVersion:0,legalHold:false},evidence(f));await advance(31*86400000);
    const p=await service.prepare(retentionTarget(f));assert.equal(p.actor,'connect_knowledge_retention_test');await service.enqueue(p,evidence(f));
    let deleted=false;await service.run(retentionTarget(f),{async remove(i,v,a){await a();deleted=true;},close(){}});assert.equal(deleted,true);
    const events=(await pool.query('SELECT operator_role FROM knowledge_retention_events WHERE tenant_id=$1',[f.intent.tenantId])).rows;assert.ok(events.length>=4);assert.ok(events.every(e=>e.operator_role==='connect_knowledge_retention_test'));
    await assert.rejects(operatorPool.query('UPDATE knowledge_retention_events SET details=details WHERE tenant_id=$1',[f.intent.tenantId]));
    await assert.rejects(operatorPool.query('SET ROLE connect_knowledge_test'));
  }finally{await operatorPool.end();}
});
