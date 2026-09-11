import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile,mkdir,chmod,rm} from 'node:fs/promises';
import pg from 'pg';
import {requireLocalStartupRehearsalUrl} from '../../scripts/verify-railway-api-startup.mjs';
import {createNodePostgresQueryExecutor,createNodePostgresTransactionManager} from '../../server/platform/nodePostgresAdapter.ts';
import {createPostgresManualReplyRepository,postgresManualReplySql} from '../../server/platform/postgresManualReplyRepository.ts';
import {createPostgresConversationRepository} from '../../server/platform/postgresConversationRepository.ts';
import {createPostgresWhatsappCampaignDeliveryPolicyRepository} from '../../server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts';
import {deriveRailwayApiDeterministicIdempotencyKey,deriveRailwayApiMutationRequestDigest} from '../../server/platform/railwayApiMutationExecutor.ts';
import {createManualDeliveryRecovery} from '../../server/operations/manualDeliveryRecovery.ts';
import {runManualDeliveryRecovery} from '../../scripts/manual-delivery-recovery.mjs';

const connectionString=requireLocalStartupRehearsalUrl(process.env.CONNECT_POSTGRES_STARTUP_REHEARSAL_URL);
const pool=new pg.Pool({connectionString,max:6,statement_timeout:10000,lock_timeout:5000});
const queries=createNodePostgresQueryExecutor(pool),transactions=createNodePostgresTransactionManager(pool);
const replies=createPostgresManualReplyRepository({queries,transactions}),conversations=createPostgresConversationRepository({queries,transactions});
const policy=createPostgresWhatsappCampaignDeliveryPolicyRepository({queries,transactions});
const recovery=createManualDeliveryRecovery(transactions),evidence='b'.repeat(64);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
let upgraded;
before(async t=>{
  t.diagnostic(`PostgreSQL ${(await pool.query('SHOW server_version')).rows[0].server_version}`);
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount,0);
  const directory=new URL('../../postgres/migrations/',import.meta.url);
  for(const file of(await readdir(directory)).filter(n=>n.endsWith('.sql')).sort()){
    if(file==='0089_manual_delivery_reconciliation.sql')upgraded=await fixture();
    await pool.query(await readFile(new URL(file,directory),'utf8'));
  }
});
after(()=>pool.end());
async function fixture(){
  // All names, content, Meta identities and policy values reuse the manual-reply driver fixture.
  const displayName='Driver integration tenant',externalUserId='driver-integration-owner';
  const tenantId=Number((await pool.query("INSERT INTO tenants(display_name,status) VALUES($1,'active') RETURNING id",[displayName])).rows[0].id);
  const session={tenantId,externalUserId,displayName,status:'active',role:'owner'};
  await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'owner','active'),($1,'template-submission-integration-owner','owner','active')",[tenantId,externalUserId]);
  // Reuse the AI delivery fixture's deterministic per-tenant Meta identities.
  await pool.query("INSERT INTO meta_connections(tenant_id,business_portfolio_id,waba_id,phone_number_id,status,webhook_subscribed_at,connected_at) VALUES($1,$2,$3,$4,'connected',date_trunc('milliseconds',statement_timestamp()),date_trunc('milliseconds',statement_timestamp()))",[tenantId,String(100001+tenantId),String(200002+tenantId),String(300003+tenantId)]);
  await transactions.transaction({isolationLevel:'read-committed'},async q=>{await q.query(postgresManualReplySql.barrier,[tenantId]);await q.query("INSERT INTO meta_credential_envelopes(tenant_id,key_version,initialization_vector,ciphertext) VALUES($1,'v1','AQIDBAUGBwgJCgsM','AQIDBAUGBwgJCgsMDQ4PEA==')",[tenantId]);});
  const contact=await conversations.resolveInboundContact(tenantId,'+972509876541');
  const conversationKey='conversation_v1_'+hash(['manual-recovery-conversation',tenantId]);
  const messageKey='message_v1_'+hash(['manual-recovery-inbound',tenantId]);
  const now=(await pool.query("SELECT date_trunc('milliseconds',clock_timestamp()) AS now")).rows[0].now.toISOString();
  await conversations.recordInboundMessage({tenantId,conversationKey,messageKey,contactId:contact.contactId,providerMessageId:'driver-conversation-inbound-1',contentKind:'text',textContent:'PostgreSQL conversation lifecycle',occurredAt:now});
  await pool.query("UPDATE conversations SET version=1,status='agent_active',assigned_external_user_id=$2 WHERE tenant_id=$1",[tenantId,externalUserId]);
  await policy.recordPolicyEvent({tenantId,connectionVersion:1,expectedPolicyVersion:0,deliveryState:'enabled',portfolioLimitKind:'bounded',portfolioLimitValue:250,phoneThroughputMessagesPerSecond:20,maximumOutboundMessagesPerSecond:2,reservationDurationSeconds:300,metaGraphApiVersion:'v21.0',evidenceDigest:evidence,evidenceCheckedAt:new Date(Date.parse(now)-60000).toISOString(),evidenceExpiresAt:new Date(Date.parse(now)+86400000).toISOString(),actorExternalUserId:'tal-rate-limit-research',recordedAt:now});
  async function command(){const version=(await pool.query('SELECT version FROM conversations WHERE tenant_id=$1',[tenantId])).rows[0].version;
    const payload={conversationKey,expectedVersion:version,text:'קיבלנו את פנייתך.'};return{session,payload,idempotencyKey:await deriveRailwayApiDeterministicIdempotencyKey('conversations.reply.send',payload),requestDigest:await deriveRailwayApiMutationRequestDigest('conversations.reply.send',payload)};}
  await replies.enqueue(await command());const claim=await replies.claim();assert.equal(claim.tenantId,tenantId);
  await replies.seal(claim,'whatsapp_rate_reservation_v1_'+'9'.repeat(64));await replies.unknown(claim);
  return{tenantId,session,claim,conversationKey,command,request:{tenantId,deliveryKey:claim.deliveryKey,action:'accepted',providerMessageId:'wamid.bot-reply-provider-17'}};
}
async function grant(f,role='connect_ai_test'){await pool.query("INSERT INTO manual_recovery_authorizations(database_role,tenant_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 hour') ON CONFLICT(database_role,tenant_id) DO UPDATE SET expires_at=excluded.expires_at",[role,f.tenantId]);}
const row=async f=>(await pool.query('SELECT * FROM manual_reply_outbox WHERE delivery_key=$1',[f.claim.deliveryKey])).rows[0];

test('upgrade preserves an unknown original send; concurrent acceptance is recorded once without another intent',async()=>{
  const f=upgraded,original=await row(f);await grant(f);
  const proposal=await recovery.prepare(f.request);
  await pool.query("UPDATE conversations SET assigned_external_user_id='template-submission-integration-owner',version=version+1 WHERE tenant_id=$1",[f.tenantId]);
  const results=await Promise.all([recovery.apply(proposal,evidence),recovery.apply(proposal,evidence)]);assert.deepEqual(results[0],results[1]);
  const saved=await row(f);assert.equal(saved.state,'sent');assert.equal(saved.claim_version,original.claim_version);assert.equal(saved.provider_started_at.toISOString(),original.provider_started_at.toISOString());
  assert.equal((await pool.query('SELECT original_state FROM manual_delivery_reconciliations WHERE delivery_key=$1',[f.claim.deliveryKey])).rows[0].original_state.state,'unknown');
  assert.equal((await pool.query("SELECT count(*)::integer AS count FROM messages WHERE tenant_id=$1 AND direction='outbound'",[f.tenantId])).rows[0].count,1);
  assert.equal((await pool.query('SELECT assigned_external_user_id FROM conversations WHERE tenant_id=$1',[f.tenantId])).rows[0].assigned_external_user_id,'template-submission-integration-owner');
  await replies.accepted(f.claim,f.request.providerMessageId);assert.deepEqual(await row(f),saved);assert.equal(await replies.claim(),null);
  for(const sql of ["UPDATE manual_delivery_reconciliations SET action='not-accepted'",'DELETE FROM manual_delivery_reconciliations','TRUNCATE manual_delivery_reconciliations',"UPDATE manual_reply_outbox SET state='unknown',provider_message_id=NULL WHERE state='sent'"])await assert.rejects(pool.query(sql));
});
test('confirmed nonacceptance unblocks the conversation and exact late acceptance retains the original negative evidence',async()=>{
  const f=await fixture();await grant(f);const proposal=await recovery.prepare({...f.request,action:'not-accepted',providerMessageId:null});
  await recovery.apply(proposal,evidence);assert.equal((await row(f)).state,'failed');assert.equal(await replies.claim(),null);
  await assert.rejects(pool.query("UPDATE manual_reply_outbox SET state='sent',provider_message_id=$2,error_code=NULL WHERE delivery_key=$1",[f.claim.deliveryKey,f.request.providerMessageId]));
  await replies.enqueue(await f.command());
  await replies.accepted(f.claim,f.request.providerMessageId);await replies.accepted(f.claim,f.request.providerMessageId);
  assert.equal((await row(f)).state,'sent');assert.equal((await pool.query('SELECT count(*)::integer AS count FROM manual_delivery_late_acceptances WHERE tenant_id=$1',[f.tenantId])).rows[0].count,1);
  assert.equal((await pool.query('SELECT action FROM manual_delivery_reconciliations WHERE tenant_id=$1',[f.tenantId])).rows[0].action,'not-accepted');
  assert.equal((await pool.query("SELECT count(*)::integer AS count FROM manual_reply_outbox WHERE tenant_id=$1 AND state='queued'",[f.tenantId])).rows[0].count,1);
  const next=await replies.claim();await replies.fail(next,'DELIVERY_UNAVAILABLE');
});
test('stale, expired, foreign and revoked proposals fail; provider identity conflict rolls back evidence and projection',async()=>{
  const f=await fixture();await grant(f);const proposal=await recovery.prepare(f.request);
  await assert.rejects(recovery.apply({...proposal,tenantId:f.tenantId+1},evidence));
  await assert.rejects(recovery.apply({...proposal,preparedAt:new Date(Date.parse(proposal.preparedAt)-360000).toISOString()},evidence));
  await pool.query('DELETE FROM manual_recovery_authorizations WHERE tenant_id=$1',[f.tenantId]);await assert.rejects(recovery.apply(proposal,evidence));await grant(f);
  await pool.query("UPDATE manual_reply_outbox SET error_code='CHANGED' WHERE delivery_key=$1",[f.claim.deliveryKey]);await assert.rejects(recovery.apply(proposal,evidence));
  const conflict=await recovery.prepare({...f.request,providerMessageId:'driver-conversation-inbound-1'});const original=await row(f);
  await assert.rejects(recovery.apply(conflict,evidence));assert.deepEqual(await row(f),original);
  assert.equal((await pool.query('SELECT count(*)::integer AS count FROM manual_delivery_reconciliations WHERE tenant_id=$1',[f.tenantId])).rows[0].count,0);
});
test('private CLI runs as a scoped login, requires evidence confirmation and rejects public files and self-authorization',async()=>{
  const f=await fixture();await pool.query("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='connect_manual_recovery_test') THEN CREATE ROLE connect_manual_recovery_test LOGIN; END IF; END $$");
  await pool.query('GRANT USAGE ON SCHEMA public TO connect_manual_recovery_test');
  await pool.query('GRANT EXECUTE ON FUNCTION manual_delivery_recovery_snapshot_v1(BIGINT,TEXT),apply_manual_delivery_recovery_v1(BIGINT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT,TEXT,TEXT) TO connect_manual_recovery_test');await grant(f,'connect_manual_recovery_test');
  const url=new URL(connectionString);url.username='connect_manual_recovery_test';
  const op=new pg.Pool({connectionString:url.href});const directory='/private/tmp/connect-manual-recovery-cli-'+process.pid;await mkdir(directory,{mode:0o700});
  try{
    await assert.rejects(op.query('SELECT * FROM manual_reply_outbox'));await assert.rejects(op.query('DELETE FROM manual_recovery_authorizations'));await assert.rejects(op.query('SET ROLE connect_ai_test'));
    const input=directory+'/request.json',proposal=directory+'/proposal.json',proof=directory+'/evidence.json';
    await writeFile(input,JSON.stringify(f.request),{mode:0o600});await writeFile(proof,JSON.stringify({fixture:'manual-reply-driver',deliveryKey:f.claim.deliveryKey}),{mode:0o600});
    const env={MANUAL_RECOVERY_DATABASE_URL:url.href};await runManualDeliveryRecovery(['prepare',input,proposal],env);
    await assert.rejects(runManualDeliveryRecovery(['prepare',input,proposal],env));
    await assert.rejects(runManualDeliveryRecovery(['apply',proposal,proof,''],env));
    await chmod(proof,0o644);await assert.rejects(runManualDeliveryRecovery(['apply',proposal,proof,'CONFIRM_PROVIDER_ORIGINAL_ACCEPTANCE'],env));await chmod(proof,0o600);
    const first=await runManualDeliveryRecovery(['apply',proposal,proof,'CONFIRM_PROVIDER_ORIGINAL_ACCEPTANCE'],env);
    assert.deepEqual(await runManualDeliveryRecovery(['apply',proposal,proof,'CONFIRM_PROVIDER_ORIGINAL_ACCEPTANCE'],env),first);
    assert.equal((await row(f)).state,'sent');
  }finally{await op.end();await rm(directory,{recursive:true});}
});
