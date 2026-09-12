import assert from 'node:assert/strict';
import { before,after,beforeEach,test } from 'node:test';
import { readdir,readFile } from 'node:fs/promises';
import pg from 'pg';
import { openAiFixture } from '../fixtures/openai-responses.mjs';
import { knowledgeFixture } from '../fixtures/knowledge-ingestion.mjs';
import { bindPaidFixture } from '../fixtures/paid-access-postgres.mjs';
import { createNodePostgresQueryExecutor,createNodePostgresTransactionManager } from '../../server/platform/nodePostgresAdapter.ts';
import { createPostgresKnowledgeIngestionRepository } from '../../server/platform/postgresKnowledgeIngestionRepository.ts';
import { createKnowledgeIngestionWorker } from '../../server/ai/knowledgeIngestionWorker.ts';
import { createPostgresAiOperationalReadiness,createPostgresAiWorkerHealth } from '../../server/platform/postgresAiOperationalReadiness.ts';
import { createPostgresRailwayAiAgentMutationExecutor,postgresRailwayAiAgentMutationSql } from '../../server/platform/postgresRailwayAiAgentMutationExecutor.ts';
import { postgresAiAgentSql } from '../../server/platform/postgresAiAgentRepository.ts';
import { createRailwayPostgresWorkerService } from '../../server/platform/railwayPostgresWorkerService.ts';
import { createRailwayPostgresFoundation } from '../../server/platform/railwayPostgresFoundation.ts';
import { createAiAgentService } from '../../server/ai/aiAgentService.ts';
import { deriveRailwayApiDeterministicIdempotencyKey,deriveRailwayApiMutationRequestDigest } from '../../server/platform/railwayApiMutationExecutor.ts';

const connectionString=process.env.CONNECT_AI_PUBLICATION_TEST_URL;
if(connectionString!=='postgresql://connect_ai_test@127.0.0.1:55446/connect_ai_publication_integration') throw Error('Dedicated empty loopback AI publication database required');
const pool=new pg.Pool({connectionString,max:8,statement_timeout:10000,lock_timeout:5000});
const queries=createNodePostgresQueryExecutor(pool),transactions=createNodePostgresTransactionManager(pool);
const jobs=createPostgresKnowledgeIngestionRepository({queries,transactions}),health=createPostgresAiWorkerHealth(queries);
const ownerKey=`scheduler_owner_v1_${'a'.repeat(64)}`,otherOwner=`scheduler_owner_v1_${'b'.repeat(64)}`;
let sequence=7,foundation;
before(async t=>{
  t.diagnostic(`PostgreSQL ${(await pool.query('SHOW server_version')).rows[0].server_version}`);
  assert.deepEqual((await pool.query('SELECT current_database() AS database,current_user AS role')).rows[0],{database:'connect_ai_publication_integration',role:'connect_ai_test'});
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount,0,'Refusing a nonempty database');
  const directory=new URL('../../postgres/migrations/',import.meta.url);
  const files=(await readdir(directory)).filter(name=>name.endsWith('.sql')).sort();
  for(const name of files) await pool.query(await readFile(new URL(name,directory),'utf8'));
  t.diagnostic(`Applied ${files.length} migrations; existing AI/Knowledge fixtures; no provider requests.`);
  foundation=createRailwayPostgresFoundation({environment:{APP_RUNTIME_ENVIRONMENT:'test',DATABASE_URL:connectionString,POSTGRES_TLS_MODE:'disabled',POSTGRES_APPLICATION_NAME:'ai-publication-integration',POSTGRES_MAX_CONNECTIONS:'4',POSTGRES_CONNECTION_TIMEOUT_MS:'2000',POSTGRES_IDLE_TIMEOUT_MS:'2000',POSTGRES_STATEMENT_TIMEOUT_MS:'15000',POSTGRES_QUERY_TIMEOUT_MS:'20000',POSTGRES_LOCK_TIMEOUT_MS:'5000',POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS:'10000',POSTGRES_MAX_LIFETIME_SECONDS:'1800'},telemetry:{recordIdleClientError(){}}});
});
after(async()=>{if(foundation) await foundation.close();await pool.end();});
beforeEach(()=>pool.query('DELETE FROM ai_runtime_worker_health'));
async function command(session,operation,payload){return{session,operation,payload,idempotencyKey:await deriveRailwayApiDeterministicIdempotencyKey(operation,payload),requestDigest:await deriveRailwayApiMutationRequestDigest(operation,payload)}}
async function fixture(overrides={}){
  const knowledge=await knowledgeFixture(++sequence),tenantId=knowledge.intent.tenantId;
  const f=await openAiFixture({tenantId});
  const session={tenantId,externalUserId:'user_knowledge_owner',role:'owner',status:'active',displayName:f.runtime.input.agent.name};
  await pool.query("INSERT INTO tenants(id,display_name,status) VALUES($1,$2,'active')",[tenantId,session.displayName]);
  await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'owner','active')",[tenantId,session.externalUserId]);
  const upload=await command(session,'ai.knowledge.upload',knowledge.payload);
  await jobs.enqueue(session,knowledge.payload,knowledge.config,upload.idempotencyKey,upload.requestDigest);
  await createKnowledgeIngestionWorker(jobs,{async put(){return's3-integration-version-1'},async inspect(){return{versionId:'s3-integration-version-1',verdict:'NO_THREATS_FOUND'}},async read(){return knowledge.bytes.slice()}}).run();
  const definition={...f.runtime.input.version.definition,knowledgeSourceKeys:[knowledge.intent.sourceKey],...overrides};
  const draft=await foundation.railwayAiAgentMutations.execute(await command(session,'ai.agents.draft.save',{definition,expectedAgentVersion:null}));
  assert.equal(draft.outcome,'committed');
  const publish=await command(session,'ai.agents.publish',{aiAgentKey:draft.state.agent.aiAgentKey,aiAgentVersionKey:draft.state.draftVersion.aiAgentVersionKey,expectedAgentVersion:draft.state.agent.version});
  const environment={...f.environment,OPENAI_RATE_CARD_JSON:JSON.stringify({...JSON.parse(f.environment.OPENAI_RATE_CARD_JSON),validUntil:new Date(Date.now()+3600000).toISOString()})};
  return{session,definition,publish,environment,knowledge};
}
const publish=f=>foundation.railwayAiAgentMutations.execute(f.publish);
const ready=f=>health.report(ownerKey,f.environment,true);
async function publicationState(f){return(await pool.query(`SELECT a.status,
  (SELECT count(*)::integer FROM railway_api_mutation_receipts WHERE tenant_id=$1 AND operation='ai.agents.publish') AS receipts,
  (SELECT count(*)::integer FROM audit_logs WHERE tenant_id=$1 AND action='ai.agents.publish') AS audits
  FROM ai_agents a WHERE a.tenant_id=$1`,[f.session.tenantId])).rows[0]}
async function blocked(f,issue='provider-required'){
  const result=await publish(f);assert.equal(result.outcome,'activation-blocked');assert.ok(result.issues.includes(issue));
  assert.deepEqual(await publicationState(f),{status:'draft',receipts:0,audits:0});
}

test('missing worker health blocks publication and leaves no receipt or audit',async()=>{const f=await fixture();await blocked(f)});
test('current worker enables actual foundation details and one atomic concurrent publication',async()=>{
  const f=await fixture();await ready(f);
  const service=createAiAgentService({agents:foundation.aiAgents,knowledgeSources:foundation.knowledgeSources,operationalReadiness:foundation.aiOperationalReadiness});
  const details=await service.readDetails(f.session,f.publish.payload.aiAgentKey);assert.equal(details.activationReadiness.ready,true);
  const results=await Promise.all([publish(f),publish(f)]);assert.deepEqual(results.map(r=>r.outcome).sort(),['committed','replayed']);
  assert.deepEqual(await publicationState(f),{status:'active',receipts:1,audits:1});
  const rows=await pool.query('SELECT * FROM ai_runtime_worker_health');assert.deepEqual(Object.keys(rows.rows[0]).sort(),['observed_at','owner_key','rate_card_valid_until','ready']);
  assert.equal(JSON.stringify(rows.rows).includes(f.environment.OPENAI_API_KEY),false);
});
test('expired health, future health and expired rate card fail closed',async()=>{
  for(const sql of ["observed_at=clock_timestamp()-interval '91 seconds'","observed_at=clock_timestamp()+interval '1 minute'","rate_card_valid_until=clock_timestamp()-interval '1 second'"]){
    const f=await fixture();await ready(f);await pool.query(`UPDATE ai_runtime_worker_health SET ${sql} WHERE owner_key=$1`,[ownerKey]);await blocked(f);
  }
});
test('missing delivery or handoff configuration and invalid provider configuration remain blocked',async()=>{
  const f=await fixture();await health.report(ownerKey,f.environment,false);await blocked(f);
  await health.report(ownerKey,{...f.environment,OPENAI_MODEL:''},true);await blocked(f);
  await health.report(ownerKey,{...f.environment,AI_RESPONSES_ENABLED:'false'},true);await blocked(f);
});
test('conflicting live worker health blocks publication until the unready worker is removed',async()=>{
  const f=await fixture();await ready(f);await health.report(otherOwner,f.environment,false);await blocked(f);
  await health.clear(otherOwner);assert.equal((await publish(f)).outcome,'committed');await health.clear(ownerKey);
  assert.equal((await pool.query('SELECT public.ai_runtime_workers_ready_v1() AS ready')).rows[0].ready,false);
});
test('only USD budgets and human approval mode can be published',async()=>{
  const currency=await fixture({billingCurrency:'ILS'});await ready(currency);await blocked(currency,'billing-policy-required');
  const automatic=await fixture({responseMode:'automatic'});await ready(automatic);await blocked(automatic,'handoff-policy-required');
});
test('revoked actors and canceled paid access cannot publish with stale sessions',async()=>{
  const revoked=await fixture();await ready(revoked);await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,'template-submission-integration-owner','owner','active')",[revoked.session.tenantId]);await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[revoked.session.tenantId,revoked.session.externalUserId]);
  assert.equal((await publish(revoked)).outcome,'unavailable');assert.deepEqual(await publicationState(revoked),{status:'draft',receipts:0,audits:0});
  const canceled=await fixture();await ready(canceled);const paid=await bindPaidFixture(pool,canceled.session.tenantId,canceled.session.externalUserId);await paid.cancel();
  assert.equal((await publish(canceled)).outcome,'unavailable');assert.deepEqual(await publicationState(canceled),{status:'draft',receipts:0,audits:0});
});
test('unready knowledge prevents publication despite a live worker',async()=>{
  const f=await fixture();await ready(f);await pool.query("UPDATE knowledge_sources SET status='archived',version=version+1 WHERE tenant_id=$1",[f.session.tenantId]);await blocked(f,'knowledge-source-not-ready');
});
test('worker health lost while awaiting the agent lock rolls back an attempted publication',async()=>{
  const f=await fixture();await ready(f);let signal,release;
  const reached=new Promise(resolve=>{signal=resolve}),resume=new Promise(resolve=>{release=resolve});
  const manager={transaction:(options,run)=>transactions.transaction(options,tx=>run({query:async(sql,parameters)=>{
    if(sql===postgresAiAgentSql.findAgentByKeyForUpdate){signal();await resume;}
    return tx.query(sql,parameters);
  }}))};
  const running=createPostgresRailwayAiAgentMutationExecutor(manager,createPostgresAiOperationalReadiness).execute(f.publish);
  await reached;await health.report(ownerKey,f.environment,false);release();const result=await running;
  assert.equal(result.outcome,'activation-blocked');assert.ok(result.issues.includes('provider-required'));
  assert.deepEqual(await publicationState(f),{status:'draft',receipts:0,audits:0});
  assert.equal((await pool.query('SELECT status FROM ai_agent_versions WHERE tenant_id=$1',[f.session.tenantId])).rows[0].status,'draft');
});
test('audit failure rolls back the active version, publication and replay receipt',async()=>{
  const f=await fixture();await ready(f);
  const manager={transaction:(options,run)=>transactions.transaction(options,tx=>run({query:async(sql,parameters)=>{
    if(sql===postgresRailwayAiAgentMutationSql.insertAudit) throw Error('Injected audit storage failure');
    return tx.query(sql,parameters);
  }}))};
  const result=await createPostgresRailwayAiAgentMutationExecutor(manager,createPostgresAiOperationalReadiness).execute(f.publish);
  assert.equal(result.outcome,'unavailable');assert.deepEqual(await publicationState(f),{status:'draft',receipts:0,audits:0});
});

test('actual AI-disabled inbound worker vetoes publication before consuming and clears its health on shutdown', async () => {
  for (const enabled of [undefined, 'false']) {
    const f = await fixture(); await ready(f);
    let started = false;
    const service = await createRailwayPostgresWorkerService({
      environment: { APP_RUNTIME_ENVIRONMENT: 'test', DATABASE_URL: connectionString, POSTGRES_TLS_MODE: 'disabled', POSTGRES_APPLICATION_NAME: 'ai-publication-worker',
        POSTGRES_MAX_CONNECTIONS: "4", POSTGRES_CONNECTION_TIMEOUT_MS: "2000", POSTGRES_IDLE_TIMEOUT_MS: "2000", POSTGRES_STATEMENT_TIMEOUT_MS: "15000", POSTGRES_QUERY_TIMEOUT_MS: "20000", POSTGRES_LOCK_TIMEOUT_MS: "5000", POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS: "10000", POSTGRES_MAX_LIFETIME_SECONDS: "1800",
        ...(enabled === undefined ? {} : { AI_RESPONSES_ENABLED: enabled }) },
      ownerKey: otherOwner, campaignQueue: { async sendBatch() {} }, postgresTelemetry: { recordIdleClientError() {} },
      schedulerTelemetry: { recordRunFailure() {}, recordTimerFailure() {}, recordOverlapSuppressed() {} },
      metaWebhooks: {
        environment: { META_APP_SECRET: 'app-secret', META_WEBHOOK_VERIFY_TOKEN: 'verify-token' },
        telemetrySink: { async record() { return { outcome: 'recorded' }; } },
        createQueueRuntime() { return {
          async start() {
            assert.equal((await pool.query('SELECT ready FROM ai_runtime_worker_health WHERE owner_key=$1', [otherOwner])).rows[0].ready, false);
            await blocked(f); started = true;
          },
          async cleanExpiredDeadLetters() { return 0; }, async close() {},
        }; },
      },
    });
    try { await service.start(); assert.equal(started, true); await blocked(f); }
    finally { await service.close(); }
    assert.equal((await pool.query('SELECT * FROM ai_runtime_worker_health WHERE owner_key=$1', [otherOwner])).rowCount, 0);
    assert.equal((await publish(f)).outcome, 'committed');
  }
});
