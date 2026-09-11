import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readdir,readFile} from 'node:fs/promises';
import pg from 'pg';
import {paddleFixture,billingId,billingTime} from '../fixtures/paddle-billing.mjs';
import {paddleDigest} from '../../server/billing/paddleProtocol.ts';
import {createNodePostgresQueryExecutor,createNodePostgresTransactionManager} from '../../server/platform/nodePostgresAdapter.ts';
import {createPostgresPaddleRepository} from '../../server/platform/postgresPaddleRepository.ts';
import {createPaddleWorker} from '../../server/billing/paddleWorker.ts';
const connectionString=process.env.CONNECT_PADDLE_TEST_URL;
if(connectionString!=='postgresql://connect_paddle_test@127.0.0.1:55448/connect_paddle_integration')throw Error('Dedicated loopback Paddle database required');
const pool=new pg.Pool({connectionString,max:8,statement_timeout:10000,lock_timeout:5000});
const journal=createPostgresPaddleRepository({queries:createNodePostgresQueryExecutor(pool),transactions:createNodePostgresTransactionManager(pool)});let sequence=7;
before(async t=>{t.diagnostic(`PostgreSQL ${(await pool.query('SHOW server_version')).rows[0].server_version}`);
  assert.deepEqual((await pool.query('SELECT current_database() AS database,current_user AS role')).rows[0],{database:'connect_paddle_integration',role:'connect_paddle_test'});
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount,0);
  const directory=new URL('../../postgres/migrations/',import.meta.url);for(const name of(await readdir(directory)).filter(n=>n.endsWith('.sql')).sort())await pool.query(await readFile(new URL(name,directory),'utf8'));
});
after(()=>pool.end());
async function fixture(){const f=paddleFixture(++sequence);await pool.query("INSERT INTO tenants(id,display_name,status) VALUES($1,$2,'active')",[f.session.tenantId,f.session.displayName]);
  await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'owner','active'),($1,'template-submission-integration-owner','owner','active')",[f.session.tenantId,f.session.externalUserId]);return f;}
const row=async f=>(await pool.query('SELECT * FROM paddle_checkout_intents WHERE tenant_id=$1',[f.session.tenantId])).rows[0];
const account=async f=>(await pool.query('SELECT * FROM paddle_accounts WHERE tenant_id=$1',[f.session.tenantId])).rows[0];
async function confirmed(f){await journal.enqueue(f.session,f.config);const work=await journal.claimCreation('sandbox');assert.equal(work.tenantId,f.session.tenantId);await journal.confirmCreation(work,f.receipt);return work;}
async function due(f){await pool.query("UPDATE paddle_checkout_intents SET next_reconcile_at=statement_timestamp()-interval '1 second' WHERE tenant_id=$1",[f.session.tenantId]);}
function provider(f,overrides={}){let posts=0;return{async createTransaction(work,authorize){assert.equal(await authorize(),true);posts++;return f.receipt},async getTransaction(){return f.payment},async getSubscription(){return f.subscription},get posts(){return posts},...overrides};}
const notice=(f,id='provider-event-001')=>({eventId:billingId('evt',`${id}:${f.session.tenantId}`),eventType:'transaction.completed',entityId:f.receipt.id,occurredAt:billingTime,digest:paddleDigest({id,tenant:f.session.tenantId})});
test('concurrent authenticated requests and claims create exactly one durable attempt and one provider call',async()=>{
  const f=await fixture();await Promise.all([journal.enqueue(f.session,f.config),journal.enqueue(f.session,f.config)]);
  assert.equal((await pool.query('SELECT * FROM paddle_checkout_intents WHERE tenant_id=$1',[f.session.tenantId])).rowCount,1);
  const p=provider(f);await Promise.all([createPaddleWorker(journal,p,'sandbox').run(),createPaddleWorker(journal,p,'sandbox').run()]);assert.equal(p.posts,1);
  assert.equal((await row(f)).state,'completed');assert.equal((await account(f)).subscription_id,f.subscription.id);
  assert.ok((await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 AND action LIKE 'billing.%'",[f.session.tenantId])).rowCount>=4);
});
test('lost creation response never repeats POST after restart or repeated owner clicks',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0;const p=provider(f,{async createTransaction(){posts++;throw Error('reply lost')}});
  await assert.rejects(createPaddleWorker(journal,p,'sandbox').run());assert.equal((await row(f)).state,'unknown');await journal.enqueue(f.session,f.config);
  await createPaddleWorker(journal,p,'sandbox').run();assert.equal(posts,1);assert.equal(await account(f),undefined);
});
test('lost database commit acknowledgement before dispatch produces zero POST and does not reset the attempt',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);const p=provider(f),lost={...journal,async claimCreation(env){await journal.claimCreation(env);throw Error('commit acknowledgement lost')}};
  await assert.rejects(createPaddleWorker(lost,p,'sandbox').run());assert.equal(p.posts,0);
  await pool.query("UPDATE paddle_checkout_intents SET updated_at=statement_timestamp()-interval '2 minutes' WHERE tenant_id=$1",[f.session.tenantId]);
  await createPaddleWorker(journal,p,'sandbox').run();assert.equal(p.posts,0);assert.equal((await row(f)).state,'unknown');
});
test('creation receipt survives a lost confirmation acknowledgement and late owner revocation',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0;
  const p=provider(f,{async createTransaction(work,authorize){assert.equal(await authorize(),true);posts++;await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.session.tenantId,f.session.externalUserId]);return f.receipt;}});
  const lost={...journal,async confirmCreation(work,receipt){await journal.confirmCreation(work,receipt);throw Error('commit reply lost')}};
  await assert.rejects(createPaddleWorker(lost,p,'sandbox').run());assert.equal((await row(f)).transaction_id,f.receipt.id);await createPaddleWorker(journal,p,'sandbox').run();assert.equal(posts,1);assert.equal((await account(f)).customer_id,f.subscription.customerId);
});
test('worker rechecks membership instead of accepting a stale owner session',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.session.tenantId,f.session.externalUserId]);
  const p=provider(f);await createPaddleWorker(journal,p,'sandbox').run();assert.equal(p.posts,0);assert.equal((await row(f)).state,'rejected');
  await assert.rejects(journal.enqueue(f.session,f.config),{code:'AUTHORIZATION_DENIED'});
});
test('untrusted metadata or customer references in notices cannot create a tenant binding',async()=>{
  const f=await fixture();await journal.recordNotice('sandbox',{...notice(f),entityId:billingId('txn','foreign')});assert.equal(await account(f),undefined);assert.equal(await row(f),undefined);
  await journal.enqueue(f.session,f.config);const work=await journal.claimCreation('sandbox');await journal.creationUnknown(work);
  await journal.recordNotice('sandbox',notice(f,'later'));await createPaddleWorker(journal,provider(f),'sandbox').run();assert.equal(await account(f),undefined);
});
test('duplicate signed-event receipts are atomic; same ID with changed content rolls back',async()=>{
  const f=await fixture();await confirmed(f);const n=notice(f);await Promise.all([journal.recordNotice('sandbox',n),journal.recordNotice('sandbox',n)]);
  assert.equal((await pool.query('SELECT * FROM paddle_webhook_receipts WHERE event_id=$1',[n.eventId])).rowCount,1);assert.equal(Number((await row(f)).reconcile_revision),1);
  await assert.rejects(journal.recordNotice('sandbox',{...n,digest:paddleDigest('changed')}),{code:'CONFLICT'});
  await createPaddleWorker(journal,provider(f),'sandbox').run();assert.equal((await account(f)).provider_status,'active');
});
test('a webhook arriving during a GET fences the stale projection until the next reconciliation',async()=>{
  const f=await fixture();await confirmed(f);const work=await journal.claimReconciliation('sandbox');await journal.recordNotice('sandbox',notice(f));
  assert.equal(await journal.applyReconciliation(work,f.payment,f.subscription),'stale');assert.equal(await account(f),undefined);
  await createPaddleWorker(journal,provider(f),'sandbox').run();assert.equal((await account(f)).provider_status,'active');
});
test('older subscription versions do not overwrite cancellation, including microsecond ordering',async()=>{
  const f=await fixture();await confirmed(f);const active=await journal.claimReconciliation('sandbox');await journal.applyReconciliation(active,f.payment,f.subscription);await due(f);
  const canceled={...f.subscription,status:'canceled',startsAt:null,endsAt:null,updatedAt:'2026-07-26T09:00:00.000001Z'};
  const newer=await journal.claimReconciliation('sandbox');assert.equal(await journal.applyReconciliation(newer,f.payment,canceled),'applied');await due(f);
  const old=await journal.claimReconciliation('sandbox');assert.equal(await journal.applyReconciliation(old,f.payment,f.subscription),'stale');assert.equal((await account(f)).provider_status,'canceled');
});
test('equal-version conflicting projections require review and do not invent an event ordering',async()=>{
  const f=await fixture();await confirmed(f);let work=await journal.claimReconciliation('sandbox');await journal.applyReconciliation(work,f.payment,f.subscription);await due(f);
  work=await journal.claimReconciliation('sandbox');assert.equal(await journal.applyReconciliation(work,f.payment,{...f.subscription,status:'past_due'}),'review');assert.equal((await account(f)).needs_review,true);assert.equal((await account(f)).provider_status,'active');
});
test('database guards reject replacing transaction identity, replaying creation and mutating event receipts',async()=>{
  const f=await fixture();await confirmed(f);await assert.rejects(pool.query("UPDATE paddle_checkout_intents SET transaction_id=$2 WHERE tenant_id=$1",[f.session.tenantId,billingId('txn','foreign')]));
  await assert.rejects(pool.query("UPDATE paddle_checkout_intents SET state='queued',transaction_id=NULL,checkout_url=NULL WHERE tenant_id=$1",[f.session.tenantId]));
  await journal.recordNotice('sandbox',notice(f));await assert.rejects(pool.query('DELETE FROM paddle_webhook_receipts WHERE event_id=$1',[notice(f).eventId]));
  await createPaddleWorker(journal,provider(f),'sandbox').run();await assert.rejects(pool.query('UPDATE paddle_accounts SET customer_id=$2 WHERE tenant_id=$1',[f.session.tenantId,billingId('ctm','foreign')]));
});
test('a payment/subscription/customer mismatch cannot bind another tenant and tenant lifecycle stays administrative',async()=>{
  const f=await fixture();await confirmed(f);const work=await journal.claimReconciliation('sandbox');await assert.rejects(journal.applyReconciliation(work,f.payment,{...f.subscription,customerId:billingId('ctm','foreign')}),{code:'CONFLICT'});
  assert.equal(await account(f),undefined);assert.equal((await pool.query('SELECT status FROM tenants WHERE id=$1',[f.session.tenantId])).rows[0].status,'active');
  await assert.rejects(journal.enqueue({...f.session,role:'manager'},f.config),{code:'AUTHORIZATION_DENIED'});
});
