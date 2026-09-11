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
