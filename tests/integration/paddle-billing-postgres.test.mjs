import { createPostgresPaidAccess, paidAccessTenantSql, paidAccessTenantBarrier } from "../../server/platform/postgresPaidAccess.ts";
import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readdir,readFile} from 'node:fs/promises';
import pg from 'pg';
import {paddleFixture,billingId,billingTime} from '../fixtures/paddle-billing.mjs';
import {paddleDigest} from '../../server/billing/paddleProtocol.ts';
import {createNodePostgresQueryExecutor,createNodePostgresTransactionManager} from '../../server/platform/nodePostgresAdapter.ts';
import {createPostgresPaddleRepository} from '../../server/platform/postgresPaddleRepository.ts';
import {createPaddleProvider} from '../../server/billing/paddleProvider.ts';
import {createPaddleWorker} from '../../server/billing/paddleWorker.ts';
import {createPaddleOperatorRecovery} from '../../server/billing/paddleOperatorRecovery.ts';
import {runPaddleOperatorRecovery} from '../../scripts/paddle-operator-recovery.mjs';
import {writeFile,mkdir,chmod,unlink} from 'node:fs/promises';
const connectionString=process.env.CONNECT_PADDLE_TEST_URL;
if(connectionString!=='postgresql://connect_paddle_test@127.0.0.1:55448/connect_paddle_integration')throw Error('Dedicated loopback Paddle database required');
const pool=new pg.Pool({connectionString,max:8,statement_timeout:10000,lock_timeout:5000});
const journal=createPostgresPaddleRepository({queries:createNodePostgresQueryExecutor(pool),transactions:createNodePostgresTransactionManager(pool)});let sequence=7;
before(async t=>{t.diagnostic(`PostgreSQL ${(await pool.query('SHOW server_version')).rows[0].server_version}`);
  assert.deepEqual((await pool.query('SELECT current_database() AS database,current_user AS role')).rows[0],{database:'connect_paddle_integration',role:'connect_paddle_test'});
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount,0);
  const directory=new URL('../../postgres/migrations/',import.meta.url);for(const name of(await readdir(directory)).filter(n=>n.endsWith('.sql')).sort()){
    if(name==='0081_paddle_subscription_lifecycle.sql'){
      const f=paddleFixture(7);
      await pool.query("INSERT INTO tenants(id,display_name,status) VALUES($1,$2,'active')",[f.session.tenantId,f.session.displayName]);
      await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'owner','active')",[f.session.tenantId,f.session.externalUserId]);
      await pool.query(`INSERT INTO paddle_checkout_intents(intent_key,tenant_id,environment,actor_external_user_id,price_id,product_id,checkout_base_url) VALUES($1,$2,$3,$4,$5,$6,$7)`,[f.work.intentKey,7,'sandbox',f.session.externalUserId,f.config.priceId,f.config.productId,f.config.checkoutBaseUrl]);
      await pool.query("UPDATE paddle_checkout_intents SET state='creating' WHERE intent_key=$1",[f.work.intentKey]);
      await pool.query("UPDATE paddle_checkout_intents SET state='ready',transaction_id=$2,checkout_url=$3 WHERE intent_key=$1",[f.work.intentKey,f.receipt.id,f.receipt.checkoutUrl]);
      await pool.query(`INSERT INTO paddle_accounts(tenant_id,environment,intent_key,customer_id,subscription_id,provider_updated_at,projection_digest,provider_status,period_starts_at,period_ends_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[7,'sandbox',f.work.intentKey,f.subscription.customerId,f.subscription.id,f.subscription.updatedAt,paddleDigest(f.subscription),'active',f.subscription.startsAt,f.subscription.endsAt]);
      await pool.query("UPDATE paddle_checkout_intents SET state='completed',next_reconcile_at=clock_timestamp()+interval '1 hour' WHERE intent_key=$1",[f.work.intentKey]);
    }
    if(name==='0082_paddle_checkout_recovery.sql'){
      const f=paddleFixture(6);
      await pool.query("INSERT INTO tenants(id,display_name,status) VALUES($1,$2,'active')",[6,f.session.displayName]);
      await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'owner','active')",[6,f.session.externalUserId]);
      await pool.query('INSERT INTO paddle_checkout_intents(intent_key,tenant_id,environment,actor_external_user_id,price_id,product_id,checkout_base_url) VALUES($1,$2,$3,$4,$5,$6,$7)',[f.work.intentKey,6,'sandbox',f.session.externalUserId,f.config.priceId,f.config.productId,f.config.checkoutBaseUrl]);
      await pool.query("UPDATE paddle_checkout_intents SET state='creating' WHERE intent_key=$1",[f.work.intentKey]);
      await pool.query("UPDATE paddle_checkout_intents SET state='unknown' WHERE intent_key=$1",[f.work.intentKey]);
    }
    await pool.query(await readFile(new URL(name,directory),'utf8'));
  }
});
after(()=>pool.end());
async function fixture(){const f=paddleFixture(++sequence);await pool.query("INSERT INTO tenants(id,display_name,status) VALUES($1,$2,'active')",[f.session.tenantId,f.session.displayName]);
  await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'owner','active'),($1,'template-submission-integration-owner','owner','active')",[f.session.tenantId,f.session.externalUserId]);return f;}
const row=async f=>(await pool.query('SELECT * FROM paddle_checkout_intents WHERE tenant_id=$1 ORDER BY generation DESC',[f.session.tenantId])).rows[0];
const account=async f=>(await pool.query('SELECT * FROM paddle_accounts WHERE tenant_id=$1',[f.session.tenantId])).rows[0];
async function confirmed(f){await journal.enqueue(f.session,f.config);const work=await journal.claimCreation('sandbox');assert.equal(work.tenantId,f.session.tenantId);assert.equal(await journal.authorizeCreation(work),true);await journal.confirmCreation(work,f.receipt);return work;}
async function due(f){await pool.query("UPDATE paddle_checkout_intents SET next_reconcile_at=statement_timestamp()-interval '1 second' WHERE tenant_id=$1",[f.session.tenantId]);}
function provider(f,overrides={}){let posts=0;return{async createTransaction(work,authorize){assert.equal(await authorize(),true);posts++;return f.receipt},async getTransaction(){return f.payment},async getSubscription(){return f.subscription},get posts(){return posts},...overrides};}
const notice=(f,id='provider-event-001')=>({eventId:billingId('evt',`${id}:${f.session.tenantId}`),eventType:'transaction.completed',entityId:f.receipt.id,occurredAt:billingTime,digest:paddleDigest({id,tenant:f.session.tenantId})});
test('concurrent authenticated requests and claims create exactly one durable attempt and one provider call',async()=>{
  const f=await fixture();await Promise.all([journal.enqueue(f.session,f.config),journal.enqueue(f.session,f.config)]);
  assert.equal((await pool.query('SELECT * FROM paddle_checkout_intents WHERE tenant_id=$1 ORDER BY generation DESC',[f.session.tenantId])).rowCount,1);
  const p=provider(f);await Promise.all([createPaddleWorker(journal,p,'sandbox').run(),createPaddleWorker(journal,p,'sandbox').run()]);assert.equal(p.posts,1);
  assert.equal((await row(f)).state,'completed');assert.equal((await account(f)).subscription_id,f.subscription.id);
  assert.ok((await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 AND action LIKE 'billing.%'",[f.session.tenantId])).rowCount>=4);
});
test('lost creation response never repeats POST after restart or repeated owner clicks',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0;const p=provider(f,{async createTransaction(work,authorize){assert.equal(await authorize(),true);posts++;throw Error('reply lost')}});
  await assert.rejects(createPaddleWorker(journal,p,'sandbox').run());assert.equal((await row(f)).state,'unknown');await journal.enqueue(f.session,f.config);
  await createPaddleWorker(journal,p,'sandbox').run();assert.equal(posts,1);assert.equal(await account(f),undefined);
});
test('lost queue-claim acknowledgement before dispatch produces zero POST and closes only the provably unsent attempt',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);const p=provider(f),lost={...journal,async claimCreation(env){await journal.claimCreation(env);throw Error('commit acknowledgement lost')}};
  await assert.rejects(createPaddleWorker(lost,p,'sandbox').run());assert.equal(p.posts,0);
  await pool.query("UPDATE paddle_checkout_intents SET updated_at=statement_timestamp()-interval '2 minutes' WHERE tenant_id=$1",[f.session.tenantId]);
  await createPaddleWorker(journal,p,'sandbox').run();assert.equal(p.posts,0);assert.equal((await row(f)).state,'closed');
});
test('creation receipt survives a lost confirmation acknowledgement and late owner revocation',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0;
  const p=provider(f,{async createTransaction(work,authorize){assert.equal(await authorize(),true);posts++;await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.session.tenantId,f.session.externalUserId]);return f.receipt;}});
  const lost={...journal,async confirmCreation(work,receipt){await journal.confirmCreation(work,receipt);throw Error('commit reply lost')}};
  await assert.rejects(createPaddleWorker(lost,p,'sandbox').run());assert.equal((await row(f)).transaction_id,f.receipt.id);await createPaddleWorker(journal,p,'sandbox').run();assert.equal(posts,1);assert.equal((await account(f)).customer_id,f.subscription.customerId);
});
test('worker rechecks membership instead of accepting a stale owner session',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.session.tenantId,f.session.externalUserId]);
  const p=provider(f);await createPaddleWorker(journal,p,'sandbox').run();assert.equal(p.posts,0);assert.equal((await row(f)).state,'closed');
  await assert.rejects(journal.enqueue(f.session,f.config),{code:'AUTHORIZATION_DENIED'});
});
test('untrusted metadata or customer references in notices cannot create a tenant binding',async()=>{
  const f=await fixture();await journal.recordNotice('sandbox',{...notice(f),entityId:billingId('txn','foreign')});assert.equal(await account(f),undefined);assert.equal(await row(f),undefined);
  await journal.enqueue(f.session,f.config);const work=await journal.claimCreation('sandbox');assert.equal(await journal.authorizeCreation(work),true);await journal.creationUnknown(work);
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

// Extend the existing protocol fixture; database time anchors the paid period.
async function productionAccount(overrides={}) {
  const f=await fixture();f.config={...f.config,environment:'production'};
  const period=(await pool.query("SELECT clock_timestamp()-interval '1 hour' AS starts, clock_timestamp()+interval '1 hour' AS ends")).rows[0];
  f.subscription={...f.subscription,startsAt:period.starts.toISOString(),endsAt:period.ends.toISOString(),...overrides};
  await journal.enqueue(f.session,f.config);const creation=await journal.claimCreation('production');assert.equal(creation.tenantId,f.session.tenantId);
  assert.equal(await journal.authorizeCreation(creation),true);await journal.confirmCreation(creation,f.receipt);const work=await journal.claimReconciliation('production');
  assert.equal(await journal.applyReconciliation(work,f.payment,f.subscription),'applied');return f;
}
const access=createPostgresPaidAccess({transactions:createNodePostgresTransactionManager(pool)});
const reason=async f=>(await pool.query('SELECT public.tenant_paid_access_reason_v1($1) AS reason',[f.session.tenantId])).rows[0].reason;
test('manual pilots stay administrative, sandbox never grants paid production access, production checkout adopts it durably',async()=>{
  const f=await fixture();assert.equal(await reason(f),'manual-pilot');await confirmed(f);await createPaddleWorker(journal,provider(f),'sandbox').run();
  assert.equal(await reason(f),'manual-pilot');await journal.enqueue(f.session,{...f.config,environment:'production'});
  assert.equal(await reason(f),'payment-pending');assert.equal(await access.allowed(f.session.tenantId),false);
  await assert.rejects(pool.query("DELETE FROM paddle_checkout_intents WHERE tenant_id=$1 AND environment='production'",[f.session.tenantId]));
  // Retire the unsent attempt using current authority so subsequent tests do not claim it.
  await pool.query("UPDATE tenant_memberships SET status='suspended',version=version+1 WHERE tenant_id=$1 AND external_user_id=$2",[f.session.tenantId,f.session.externalUserId]);
  assert.equal(await journal.claimCreation('production'),null);
});
test('only active production subscriptions with a current period enable paid execution',async()=>{
  const f=await productionAccount();assert.equal(await reason(f),'paid-active');assert.equal(await access.allowed(f.session.tenantId),true);
  for(const status of ['trialing','past_due','paused','canceled']){
    const f=await productionAccount({status});assert.equal(await reason(f),'subscription-inactive');assert.equal(await access.allowed(f.session.tenantId),false);
    // Billing status still reads even when paid execution is denied.
    assert.equal((await journal.read(f.session,'production')).subscription.status,status);
  }
});
test('future/expired periods and scheduled cancel/pause boundaries stop paid execution using database time',async()=>{
  const times=(await pool.query("SELECT clock_timestamp()-interval '2 hours' AS past,clock_timestamp()-interval '1 hour' AS ended,clock_timestamp()+interval '2 hours' AS future,clock_timestamp()+interval '3 hours' AS later")).rows[0];
  assert.equal(await reason(await productionAccount({startsAt:times.past.toISOString(),endsAt:times.ended.toISOString()})),'period-inactive');
  assert.equal(await reason(await productionAccount({startsAt:times.future.toISOString(),endsAt:times.later.toISOString()})),'period-inactive');
  for(const action of ['cancel','pause']){
    assert.equal(await reason(await productionAccount({scheduledChange:{action,effectiveAt:times.ended.toISOString()}})),'scheduled-stop');
    assert.equal(await reason(await productionAccount({scheduledChange:{action,effectiveAt:times.future.toISOString()}})),'paid-active');
  }
});
test('stale, future-dated and conflicted verification cannot grant access; older projections cannot refresh it',async()=>{
  const f=await productionAccount();await pool.query("UPDATE paddle_accounts SET verified_at=clock_timestamp()-interval '16 minutes' WHERE tenant_id=$1",[f.session.tenantId]);
  assert.equal(await reason(f),'verification-stale');await due(f);const work=await journal.claimReconciliation('production');
  assert.equal(await journal.applyReconciliation(work,f.payment,{...f.subscription,updatedAt:'2026-07-25T09:00:00.000000Z'}),'stale');assert.equal(await reason(f),'verification-stale');
  await pool.query("UPDATE paddle_accounts SET verified_at=clock_timestamp()+interval '1 minute' WHERE tenant_id=$1",[f.session.tenantId]);assert.equal(await reason(f),'verification-stale');
  await pool.query("UPDATE paddle_accounts SET verified_at=clock_timestamp(),needs_review=TRUE WHERE tenant_id=$1",[f.session.tenantId]);assert.equal(await reason(f),'review-required');
  await assert.rejects(pool.query('DELETE FROM paddle_accounts WHERE tenant_id=$1',[f.session.tenantId]));
});
test('entitlement admission waits for the tenant barrier and reads the committed revocation, with billing still accessible',async()=>{
  const f=await productionAccount();const tx=await pool.connect();await tx.query('BEGIN');await tx.query(paidAccessTenantBarrier,[f.session.tenantId]);
  let settled=false;const pending=access.allowed(f.session.tenantId).then(x=>{settled=true;return x});
  await tx.query("UPDATE paddle_accounts SET needs_review=TRUE WHERE tenant_id=$1",[f.session.tenantId]);assert.equal(settled,false);
  await tx.query('COMMIT');tx.release();assert.equal(await pending,false);assert.equal((await journal.read(f.session,'production')).canManage,true);
  assert.equal((await pool.query(paidAccessTenantSql,[f.session.tenantId])).rowCount,0);
});

async function nextPurchase(f) {
  const attempt=(await journal.read(f.session,f.config.environment)).attempt;
  await Promise.all([journal.enqueue(f.session,f.config,attempt),journal.enqueue(f.session,f.config,attempt)]);
  const work=await journal.claimCreation(f.config.environment);assert.equal(work.tenantId,f.session.tenantId);
  const id=billingId('txn',work.intentKey),subscriptionId=billingId('sub',work.intentKey);
  const receipt={...f.receipt,id,checkoutUrl:`${f.config.checkoutBaseUrl}?_ptxn=${id}`};
  assert.equal(await journal.authorizeCreation(work),true);await journal.confirmCreation(work,receipt);
  return{work,payment:{...f.payment,id,subscriptionId,checkoutUrl:receipt.checkoutUrl},subscription:{...f.subscription,id:subscriptionId}};
}
test('repurchase is fenced by the observed attempt and admits exactly one new generation after verified cancellation',async()=>{
  const f=await productionAccount({status:'canceled',startsAt:null,endsAt:null});
  const before=await journal.read(f.session,'production');assert.equal(before.canCreateCheckout,true);assert.equal(before.attempt,1);
  await journal.enqueue(f.session,f.config,0);assert.equal((await row(f)).generation,1);
  const next=await nextPurchase(f);assert.equal((await row(f)).generation,2);assert.equal((await row(f)).previous_intent_key,`paddle_checkout_v1_${paddleDigest({tenantId:f.session.tenantId,environment:'production',generation:1})}`);
  assert.equal(await reason(f),'payment-pending');assert.equal((await journal.read(f.session,'production')).subscription,null);
  const period=(await pool.query("SELECT clock_timestamp()-interval '1 hour' AS starts,clock_timestamp()+interval '1 hour' AS ends")).rows[0];
  const current={...next.subscription,status:'active',startsAt:period.starts.toISOString(),endsAt:period.ends.toISOString()};
  let work=await journal.claimReconciliation('production');assert.equal(await journal.applyReconciliation(work,next.payment,current),'applied');
  assert.equal(await reason(f),'paid-active');assert.equal((await journal.read(f.session,'production')).subscription.id,current.id);
  assert.equal((await pool.query('SELECT * FROM paddle_accounts WHERE tenant_id=$1',[f.session.tenantId])).rowCount,2);
  const currentRow=await row(f);await pool.query("UPDATE paddle_checkout_intents SET next_reconcile_at=clock_timestamp() WHERE intent_key=$1",[currentRow.intent_key]);
  work=await journal.claimReconciliation('production');await journal.applyReconciliation(work,next.payment,{...current,status:'canceled',startsAt:null,endsAt:null,updatedAt:'2026-07-26T09:00:00.000001Z'});
  await journal.enqueue(f.session,f.config,1);assert.equal((await row(f)).generation,2); // lost response replay after a later cancellation
});
test('active, scheduled, paused, past-due, uncertain or stale billing never permits another purchase',async()=>{
  for(const status of ['active','paused','past_due']){
    const f=await productionAccount({status,scheduledChange:{action:'cancel',effectiveAt:'2026-08-26T00:00:00.000000Z'}});
    assert.equal((await journal.read(f.session,'production')).canCreateCheckout,false);await assert.rejects(journal.enqueue(f.session,f.config,1),{code:'CONFLICT'});
  }
  const f=await productionAccount({status:'canceled'});
  for(const sql of ["verified_at=clock_timestamp()-interval '16 minutes'","verified_at=clock_timestamp()+interval '1 minute'","verified_at=clock_timestamp(),needs_review=TRUE"]){
    await pool.query(`UPDATE paddle_accounts SET ${sql} WHERE tenant_id=$1`,[f.session.tenantId]);assert.equal((await journal.read(f.session,'production')).canCreateCheckout,false);await assert.rejects(journal.enqueue(f.session,f.config,1),{code:'CONFLICT'});
  }
  const unknown=await fixture();await journal.enqueue(unknown.session,unknown.config);const work=await journal.claimCreation('sandbox');assert.equal(await journal.authorizeCreation(work),true);await journal.creationUnknown(work);
  await assert.rejects(journal.enqueue(unknown.session,unknown.config,1),{code:'CONFLICT'});
  for(const expected of [-1,1.5,NaN,Infinity,'1',2147483647])await assert.rejects(journal.enqueue(unknown.session,unknown.config,expected),{code:'INVALID_REQUEST'});
  await assert.rejects(journal.enqueue(unknown.session,unknown.config,2),{code:'CONFLICT'});
});
test('one payer can own separate workspace subscriptions, but no subscription can bind two workspaces',async()=>{
  const a=await productionAccount(),b=await fixture();await confirmed(b);
  let work=await journal.claimReconciliation('sandbox');
  const customer=a.subscription.customerId;
  await journal.applyReconciliation(work,{...b.payment,customerId:customer},{...b.subscription,customerId:customer});
  const c=await fixture();await confirmed(c);work=await journal.claimReconciliation('sandbox');
  await journal.applyReconciliation(work,{...c.payment,customerId:customer},{...c.subscription,customerId:customer});
  assert.equal((await account(b)).customer_id,(await account(c)).customer_id);
  assert.notEqual((await journal.read(b.session,'sandbox')).subscription.id,(await journal.read(c.session,'sandbox')).subscription.id);
  const d=await fixture();await confirmed(d);work=await journal.claimReconciliation('sandbox');
  await assert.rejects(journal.applyReconciliation(work,{...d.payment,customerId:customer,subscriptionId:b.subscription.id},{...b.subscription,customerId:customer}),{code:'23505'});
  assert.equal(await account(d),undefined);
});
test('old subscription notices reconcile only their historical attempt and cannot revive canceled access',async()=>{
  const f=await productionAccount({status:'canceled',startsAt:null,endsAt:null});const old=await row(f);
  const next=await nextPurchase(f);const current=await row(f);
  await journal.applyReconciliation(await journal.claimReconciliation('production'),next.payment,next.subscription);
  await journal.recordNotice('production',{...notice(f,'historical-subscription'),entityId:f.subscription.id,eventType:'subscription.updated'});
  assert.equal(Number((await row(f)).reconcile_revision),Number(current.reconcile_revision)+1);
  const history=await journal.claimReconciliation('production');assert.equal(history.intentKey,old.intent_key);
  assert.equal(await journal.applyReconciliation(history,f.payment,{...f.subscription,status:'active',updatedAt:'2026-07-26T09:00:00.000002Z'}),'review');
  assert.equal((await journal.read(f.session,'production')).subscription.needsReview,false);
  assert.equal((await journal.read(f.session,'production')).subscription.id,next.subscription.id);
  await assert.rejects(pool.query("UPDATE paddle_accounts SET provider_status='active',provider_updated_at=provider_updated_at+interval '1 second',period_starts_at=clock_timestamp(),period_ends_at=clock_timestamp()+interval '1 hour' WHERE intent_key=$1",[old.intent_key]));
});
test('generation identity and predecessor are immutable and direct SQL cannot bypass cancellation',async()=>{
  const f=await productionAccount();const old=await row(f);
  await assert.rejects(pool.query('UPDATE paddle_checkout_intents SET generation=2 WHERE intent_key=$1',[old.intent_key]));
  await assert.rejects(pool.query(`INSERT INTO paddle_checkout_intents(intent_key,tenant_id,environment,actor_external_user_id,price_id,product_id,checkout_base_url,generation,previous_intent_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,2,$8)`,[`paddle_checkout_v1_${paddleDigest(old.intent_key)}`,f.session.tenantId,'production',f.session.externalUserId,f.config.priceId,f.config.productId,f.config.checkoutBaseUrl,old.intent_key]));
});
test('repurchase rechecks owner and fresh cancellation after waiting for the tenant barrier',async()=>{
  const f=await productionAccount({status:'canceled'});assert.equal((await journal.read(f.session,'production')).canCreateCheckout,true);
  const tx=await pool.connect();await tx.query('BEGIN');await tx.query(paidAccessTenantBarrier,[f.session.tenantId]);
  const pending=journal.enqueue(f.session,f.config,1);const rejected=assert.rejects(pending,{code:'CONFLICT'});
  await tx.query("UPDATE paddle_accounts SET needs_review=TRUE WHERE tenant_id=$1",[f.session.tenantId]);await tx.query('COMMIT');tx.release();await rejected;
  assert.equal((await row(f)).generation,1);
  await assert.rejects(journal.enqueue({...f.session,externalUserId:'revoked-owner'},f.config,1),{code:'AUTHORIZATION_DENIED'});
});

test('0081 upgrades existing 0080 checkout and subscription history without replacing identity',async()=>{
  const f=paddleFixture(7),checkout=await row(f),subscription=await account(f);
  assert.equal(checkout.generation,1);assert.equal(checkout.previous_intent_key,null);
  assert.equal(checkout.intent_key,f.work.intentKey);assert.equal(checkout.transaction_id,f.receipt.id);
  assert.equal(subscription.subscription_id,f.subscription.id);assert.equal(subscription.projection_digest,paddleDigest(f.subscription));
  assert.equal((await journal.read(f.session,'sandbox')).canCreateCheckout,false);
});

test('dispatch sealing is one-shot, and a lost seal acknowledgment stays uncertain without a second POST',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);const work=await journal.claimCreation('sandbox');
  assert.deepEqual((await Promise.all([journal.authorizeCreation(work),journal.authorizeCreation(work)])).sort(),[false,true]);
  await journal.creationUnknown(work);assert.equal((await row(f)).dispatch_sealed,true);assert.equal((await row(f)).state,'unknown');
  await assert.rejects(journal.enqueue(f.session,f.config,1),{code:'CONFLICT'});
  await assert.rejects(pool.query("UPDATE paddle_checkout_intents SET dispatch_sealed=FALSE WHERE intent_key=$1",[work.intentKey]));
  await assert.rejects(pool.query("INSERT INTO paddle_checkout_closures(intent_key,reason) VALUES($1,'not-dispatched')",[work.intentKey]));
});
test('a pre-dispatch authorization failure closes without POST and permits one explicit new attempt',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0;
  const p=createPaddleProvider(f.config,async()=>{posts++;return Response.json({data:f.transaction})});
  const worker=createPaddleWorker({...journal,async authorizeCreation(){return false}},p,'sandbox');
  await assert.rejects(worker.run());assert.equal(posts,0);assert.equal((await row(f)).state,'closed');
  await journal.enqueue(f.session,f.config,0);assert.equal((await row(f)).generation,1);
  await Promise.all([journal.enqueue(f.session,f.config,1),journal.enqueue(f.session,f.config,1)]);assert.equal((await row(f)).generation,2);
  const work=await journal.claimCreation('sandbox');await journal.creationUnknown(work); // safely retire the unsealed test attempt
});
test('provider-confirmed unpaid cancellation closes with immutable evidence and never changes a paid account',async()=>{
  const f=await fixture();await confirmed(f);
  const payment={...f.receipt,status:'canceled',checkoutUrl:null};
  const work=await journal.claimReconciliation('sandbox');assert.equal(await journal.closeCanceledTransaction(work,payment),true);
  assert.equal((await row(f)).state,'closed');assert.equal((await journal.read(f.session,'sandbox')).canCreateCheckout,true);
  const receipt=(await pool.query('SELECT * FROM paddle_checkout_closures WHERE intent_key=$1',[work.intentKey])).rows[0];
  assert.equal(receipt.transaction_id,payment.id);assert.equal(receipt.projection_digest,paddleDigest(payment));
  await assert.rejects(pool.query('DELETE FROM paddle_checkout_closures WHERE intent_key=$1',[work.intentKey]));
  await assert.rejects(pool.query("UPDATE paddle_checkout_intents SET state='ready' WHERE intent_key=$1",[work.intentKey]));
  const active=await productionAccount();await due(active);const paidWork=await journal.claimReconciliation('production');
  assert.equal(await journal.closeCanceledTransaction(paidWork,{...active.receipt,status:'canceled'}),false);assert.equal(await reason(active),'paid-active');
});
test('a notice racing cancellation verification fences closure until a fresh provider read',async()=>{
  const f=await fixture();await confirmed(f);const work=await journal.claimReconciliation('sandbox');await journal.recordNotice('sandbox',notice(f));
  assert.equal(await journal.closeCanceledTransaction(work,{...f.receipt,status:'canceled'}),false);
  assert.equal((await row(f)).state,'ready');
  await createPaddleWorker(journal,provider(f,{async getTransaction(){return{...f.receipt,status:'canceled'}}}),'sandbox').run();assert.equal((await row(f)).state,'closed');
});
test('durable original POST observation recovers a lost projection acknowledgment by GET only',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0,gets=0;
  const p=createPaddleProvider(f.config,async(url,options)=>{
    if(options.method==='POST'){posts++;return Response.json({data:f.transaction});}
    gets++;return Response.json({data:url.includes('/subscriptions/')?f.sub:f.paid});
  });
  await assert.rejects(createPaddleWorker({...journal,async confirmCreation(){throw Error('database response lost before projection')}},p,'sandbox').run());
  assert.equal((await row(f)).state,'unknown');assert.equal((await row(f)).transaction_id,null);
  assert.equal((await pool.query('SELECT transaction_id FROM paddle_creation_observations WHERE intent_key=$1',[(await row(f)).intent_key])).rows[0].transaction_id,f.receipt.id);
  await createPaddleWorker(journal,p,'sandbox').run();assert.equal(posts,1);assert.equal(gets,2);assert.equal((await row(f)).state,'completed');assert.equal((await account(f)).subscription_id,f.subscription.id);
});
test('observation commit acknowledgment loss recovers without another POST and evidence cannot be replaced',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0;
  const p=createPaddleProvider(f.config,async(url,options)=>{if(options.method==='POST'){posts++;return Response.json({data:f.transaction});}return Response.json({data:url.includes('/subscriptions/')?f.sub:f.paid});});
  await assert.rejects(createPaddleWorker({...journal,async observeCreation(work,evidence){await journal.observeCreation(work,evidence);throw Error('observation ack lost')}},p,'sandbox').run());
  await createPaddleWorker(journal,p,'sandbox').run();assert.equal(posts,1);assert.equal((await row(f)).state,'completed');
  const key=(await row(f)).intent_key;
  await assert.rejects(pool.query('UPDATE paddle_creation_observations SET transaction_id=$2 WHERE intent_key=$1',[key,billingId('txn','foreign')]));
  await assert.rejects(pool.query('DELETE FROM paddle_creation_observations WHERE intent_key=$1',[key]));
});
test('an error observation or lost entire response cannot bind a guessed transaction or authorize repurchase',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0;
  const p=createPaddleProvider(f.config,async()=>{posts++;return Response.json({error:{code:'invalid_request'},data:{id:f.receipt.id}},{status:400});});
  await assert.rejects(createPaddleWorker(journal,p,'sandbox').run());
  assert.equal((await pool.query('SELECT transaction_id FROM paddle_creation_observations WHERE intent_key=$1',[(await row(f)).intent_key])).rows[0].transaction_id,null);
  await createPaddleWorker(journal,p,'sandbox').run();assert.equal(posts,1);assert.equal((await row(f)).state,'unknown');await assert.rejects(journal.enqueue(f.session,f.config,1),{code:'CONFLICT'});
});

test('legacy unknown records are conservatively sealed during migration and cannot be closed as unsent',async()=>{
  const f=paddleFixture(6);assert.equal((await row(f)).dispatch_sealed,true);assert.equal((await row(f)).state,'unknown');
  await assert.rejects(journal.enqueue(f.session,f.config,1),{code:'CONFLICT'});
  await assert.rejects(pool.query("INSERT INTO paddle_checkout_closures(intent_key,reason) VALUES($1,'not-dispatched')",[f.work.intentKey]));
});
test('a malformed business projection keeps the original response identity for later GET validation',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0;
  const p=createPaddleProvider(f.config,async(url,options)=>{
    if(options.method==='POST'){posts++;return Response.json({data:{...f.transaction,items:[]}});}
    return Response.json({data:url.includes('/subscriptions/')?f.sub:f.paid});
  });
  await assert.rejects(createPaddleWorker(journal,p,'sandbox').run());assert.equal((await row(f)).state,'unknown');
  await createPaddleWorker(journal,p,'sandbox').run();assert.equal(posts,1);assert.equal((await row(f)).state,'completed');
});
test('recovered cancellation from the original response closes without a subscription or second POST',async()=>{
  const f=await fixture();await journal.enqueue(f.session,f.config);let posts=0;
  const p=createPaddleProvider(f.config,async(url,options)=>{if(options.method==='POST'){posts++;return Response.json({data:f.transaction});}return Response.json({data:{...f.transaction,status:'canceled',checkout:null}});});
  await assert.rejects(createPaddleWorker({...journal,async confirmCreation(){throw Error('projection failed')}},p,'sandbox').run());
  await createPaddleWorker(journal,p,'sandbox').run();assert.equal(posts,1);assert.equal((await row(f)).state,'closed');assert.equal(await account(f),undefined);
});

const recoveryEvidence=paddleDigest({source:'existing-paddle-protocol-fixture',purpose:'operator-recovery'});
const recoveryService=(f,overrides={},transactions=createNodePostgresTransactionManager(pool))=>createPaddleOperatorRecovery({transactions,provider:provider(f,overrides)});
async function unknownAttempt(){
  const f=await fixture();await journal.enqueue(f.session,f.config);f.work=await journal.claimCreation('sandbox');
  assert.equal(await journal.authorizeCreation(f.work),true);await journal.creationUnknown(f.work);return f;
}
const recoveryRequest=(f,action='bind-transaction')=>({tenantId:f.session.tenantId,environment:f.config.environment,intentKey:f.work.intentKey,action,transactionId:action==='close-absent'?null:f.payment.id});
async function authorizeRecovery(f){await pool.query("INSERT INTO paddle_recovery_authorizations(database_role,tenant_id,environment,expires_at) VALUES(current_user,$1,$2,clock_timestamp()+interval '1 hour')",[f.session.tenantId,f.config.environment]);}
test('operator authority is explicit, tenant/environment scoped, expiring and independent of workspace ownership',async()=>{
  const f=await unknownAttempt(),service=recoveryService(f);
  await assert.rejects(service.prepare(recoveryRequest(f)));await authorizeRecovery(f);
  await assert.rejects(service.prepare({...recoveryRequest(f),environment:'production'}));
  await assert.rejects(service.prepare({...recoveryRequest(f),tenantId:f.session.tenantId+1}));
  await assert.rejects(pool.query("INSERT INTO paddle_recovery_authorizations(database_role,tenant_id,environment,expires_at) VALUES('connect_api_runtime',$1,'sandbox',clock_timestamp()+interval '1 hour')",[f.session.tenantId]));
  const proposal=await service.prepare(recoveryRequest(f));
  await pool.query("UPDATE paddle_recovery_authorizations SET expires_at=clock_timestamp()-interval '1 second' WHERE tenant_id=$1",[f.session.tenantId]);
  await assert.rejects(service.apply(proposal,recoveryEvidence));assert.equal((await row(f)).state,'unknown');
});
test('operator support binding is atomic, concurrent/restart replay creates one receipt, and no provider POST is repeated',async()=>{
  const f=await unknownAttempt();await authorizeRecovery(f);let gets=0;
  const service=recoveryService(f,{async getTransaction(){gets++;return f.payment},async createTransaction(){assert.fail('recovery must never POST')}});
  const proposal=await service.prepare(recoveryRequest(f));
  const outcomes=await Promise.all([service.apply(proposal,recoveryEvidence),service.apply(proposal,recoveryEvidence)]);
  assert.deepEqual(outcomes.map(x=>x.outcome).sort(),['applied','replayed']);
  const before=gets;assert.equal((await recoveryService(f,{async getTransaction(){assert.fail('replay must not GET')}}).apply(proposal,recoveryEvidence)).outcome,'replayed');assert.equal(gets,before);
  assert.equal((await pool.query('SELECT * FROM paddle_operator_recoveries WHERE intent_key=$1',[f.work.intentKey])).rowCount,1);
  assert.equal((await row(f)).dispatch_sealed,true);assert.equal((await row(f)).state,'ready');assert.equal(await account(f),undefined);
  // The normal, existing worker must still establish the customer/subscription.
  const p=provider(f);await createPaddleWorker(journal,p,'sandbox').run();assert.equal(p.posts,0);assert.equal((await account(f)).subscription_id,f.subscription.id);
});
test('an unresolved checkout cannot bind an arbitrary transaction through the normal worker repository or raw SQL',async()=>{
  const f=await unknownAttempt();await assert.rejects(journal.confirmCreation(f.work,f.receipt));
  await assert.rejects(pool.query("UPDATE paddle_checkout_intents SET state='ready',transaction_id=$2,checkout_url=$3 WHERE intent_key=$1",[f.work.intentKey,f.receipt.id,f.receipt.checkoutUrl]));
  assert.equal((await row(f)).state,'unknown');
});
test('support-confirmed absence keeps the irreversible seal, creates a closure and only permits a new explicit generation',async()=>{
  const f=await unknownAttempt();await authorizeRecovery(f);
  const service=recoveryService(f,{async getTransaction(){assert.fail('GET failure cannot prove absence')}});
  const proposal=await service.prepare(recoveryRequest(f,'close-absent'));await service.apply(proposal,recoveryEvidence);
  assert.equal((await row(f)).state,'closed');assert.equal((await row(f)).dispatch_sealed,true);
  assert.equal((await pool.query('SELECT reason FROM paddle_checkout_closures WHERE intent_key=$1',[f.work.intentKey])).rows[0].reason,'support-confirmed-absent');
  await journal.enqueue(f.session,f.config,0);assert.equal((await row(f)).generation,1);
  await journal.enqueue(f.session,f.config,1);assert.equal((await row(f)).generation,2);
  const work=await journal.claimCreation('sandbox');assert.equal(work.tenantId,f.session.tenantId);await journal.creationUnknown(work);
});
test('current original response identity cannot be replaced by an operator absence claim or alternate identity',async()=>{
  const f=await unknownAttempt();await authorizeRecovery(f);
  await journal.observeCreation(f.work,{requestId:null,httpStatus:201,transactionId:f.receipt.id,responseDigest:paddleDigest(f.transaction)});
  for(const action of ['bind-transaction','close-absent'])await assert.rejects(recoveryService(f).prepare(recoveryRequest(f,action)),{code:'CONFLICT'});
});
test('operator proposals reject changed local state, changed provider facts, wrong actor and expired/future observations',async()=>{
  const f=await unknownAttempt();await authorizeRecovery(f);const service=recoveryService(f),proposal=await service.prepare(recoveryRequest(f));
  for(const preparedAt of [new Date(Date.parse(proposal.preparedAt)-301000).toISOString(),new Date(Date.parse(proposal.preparedAt)+60000).toISOString()]) await assert.rejects(service.apply({...proposal,preparedAt},recoveryEvidence),{code:'CONFLICT'});
  await assert.rejects(service.apply({...proposal,operatorRole:'connect_api_runtime'},recoveryEvidence),{code:'AUTHORIZATION_DENIED'});
  await assert.rejects(recoveryService(f,{async getTransaction(){return {...f.payment,updatedAt:'2026-07-27T09:00:00.000000Z'}}}).apply(proposal,recoveryEvidence),{code:'CONFLICT'});
  await pool.query('UPDATE paddle_checkout_intents SET reconcile_revision=reconcile_revision+1 WHERE intent_key=$1',[f.work.intentKey]);
  await assert.rejects(service.apply(proposal,recoveryEvidence),{code:'CONFLICT'});assert.equal((await row(f)).state,'unknown');
});
async function reviewedAccount(){
  await pool.query("UPDATE paddle_checkout_intents SET next_reconcile_at=clock_timestamp()+interval '1 hour' WHERE environment='production'");
  const f=await productionAccount();f.work={...f.work,...{intentKey:(await row(f)).intent_key}};await due(f);
  const work=await journal.claimReconciliation('production');assert.equal(await journal.applyReconciliation(work,f.payment,{...f.subscription,status:'past_due'}),'review');
  await authorizeRecovery(f);return f;
}
test('review resolution can choose the verified equal-version projection and restores paid access atomically',async()=>{
  const f=await reviewedAccount();assert.equal(await reason(f),'review-required');
  await assert.rejects(pool.query('UPDATE paddle_accounts SET needs_review=FALSE WHERE tenant_id=$1',[f.session.tenantId]));
  const service=recoveryService(f),proposal=await service.prepare(recoveryRequest(f,'resolve-review'));
  await service.apply(proposal,recoveryEvidence);assert.equal(await reason(f),'paid-active');assert.equal((await account(f)).needs_review,false);
  await pool.query('UPDATE paddle_accounts SET needs_review=TRUE WHERE tenant_id=$1',[f.session.tenantId]);
  // Replaying an old decision does not clear a later review episode.
  assert.equal((await service.apply(proposal,recoveryEvidence)).outcome,'replayed');assert.equal(await reason(f),'review-required');
  await assert.rejects(pool.query('UPDATE paddle_accounts SET needs_review=FALSE WHERE tenant_id=$1',[f.session.tenantId]));
});
test('an operator can select conflicting equal-version facts only with a matching new atomic review receipt',async()=>{
  const f=await reviewedAccount(),sub={...f.subscription,status:'past_due'};
  const service=recoveryService(f,{async getSubscription(){return sub}}),proposal=await service.prepare(recoveryRequest(f,'resolve-review'));
  await service.apply(proposal,recoveryEvidence);assert.equal((await account(f)).provider_status,'past_due');assert.equal((await account(f)).projection_digest,paddleDigest(sub));assert.equal(await reason(f),'subscription-inactive');
});
test('a notice arriving during the operator GET, a new review revision, or revoked authority cancels the entire resolution',async()=>{
  for(const mutate of [
    f=>journal.recordNotice('production',notice(f,'operator-race')),
    f=>pool.query('UPDATE paddle_accounts SET needs_review=TRUE WHERE tenant_id=$1',[f.session.tenantId]),
    f=>pool.query('DELETE FROM paddle_recovery_authorizations WHERE tenant_id=$1',[f.session.tenantId]),
  ]){
    const f=await reviewedAccount(),proposal=await recoveryService(f).prepare(recoveryRequest(f,'resolve-review'));
    const service=recoveryService(f,{async getSubscription(){await mutate(f);return f.subscription}});
    await assert.rejects(service.apply(proposal,recoveryEvidence));assert.equal((await account(f)).needs_review,true);
    assert.equal((await pool.query('SELECT * FROM paddle_operator_recoveries WHERE intent_key=$1',[f.work.intentKey])).rowCount,0);
  }
});
test('older facts and resurrection of a canceled subscription stay blocked even for authorized operators',async()=>{
  const f=await reviewedAccount();let service=recoveryService(f,{async getSubscription(){return {...f.subscription,updatedAt:'2026-07-24T09:00:00.000000Z'}}});
  const proposal=await service.prepare(recoveryRequest(f,'resolve-review'));await assert.rejects(service.apply(proposal,recoveryEvidence));assert.equal((await account(f)).needs_review,true);
  await pool.query("UPDATE paddle_accounts SET provider_status='canceled',provider_updated_at=provider_updated_at+interval '1 second' WHERE tenant_id=$1",[f.session.tenantId]);
  service=recoveryService(f);await assert.rejects(service.prepare(recoveryRequest(f,'resolve-review')),{code:'CONFLICT'});
  assert.equal((await pool.query('SELECT * FROM paddle_operator_recoveries WHERE intent_key=$1',[f.work.intentKey])).rowCount,0);
});
test('a failure after evidence insertion rolls back the evidence and business change; receipts reject update/delete/truncate',async()=>{
  const f=await unknownAttempt();await authorizeRecovery(f);const proposal=await recoveryService(f).prepare(recoveryRequest(f));
  const real=createNodePostgresTransactionManager(pool),transactions={transaction(options,body){return real.transaction(options,tx=>body({async query(sql,args){if(sql.startsWith("UPDATE paddle_checkout_intents SET state='ready'"))throw Error('injected business write failure');return tx.query(sql,args);}}));}};
  await assert.rejects(recoveryService(f,{},transactions).apply(proposal,recoveryEvidence));assert.equal((await row(f)).state,'unknown');
  assert.equal((await pool.query('SELECT * FROM paddle_operator_recoveries WHERE intent_key=$1',[f.work.intentKey])).rowCount,0);
  const result=await recoveryService(f).apply(proposal,recoveryEvidence);
  for(const sql of ['DELETE FROM paddle_operator_recoveries WHERE recovery_key=$1','UPDATE paddle_operator_recoveries SET evidence_digest=evidence_digest WHERE recovery_key=$1'])await assert.rejects(pool.query(sql,[result.recoveryKey]));
  await assert.rejects(pool.query('TRUNCATE paddle_operator_recoveries'));
});
test('the private CLI requires explicit evidence confirmation, private files and supports durable apply replay without provider access',async()=>{
  const f=await unknownAttempt();await authorizeRecovery(f);
  const directory='/private/tmp/connect-paddle-operator-cli';await mkdir(directory,{recursive:true,mode:0o700});
  const input=`${directory}/${f.session.tenantId}-request.json`,output=`${directory}/${f.session.tenantId}-proposal.json`,evidence=`${directory}/${f.session.tenantId}-evidence.txt`;
  await writeFile(input,JSON.stringify(recoveryRequest(f,'close-absent')),{mode:0o600});await writeFile(evidence,JSON.stringify(f.transaction),{mode:0o600});
  await unlink(output).catch(error=>{if(error.code!=='ENOENT')throw error});
  const env={PADDLE_RECOVERY_DATABASE_URL:connectionString};
  await assert.rejects(runPaddleOperatorRecovery(['prepare',input,output],{...env,PADDLE_RECOVERY_DATABASE_URL:`${connectionString}?sslmode=verify-full&sslmode=disable`}),{message:'DATABASE_CONFIGURATION_REQUIRED'});
  assert.deepEqual(await runPaddleOperatorRecovery(['prepare',input,output],env),{outcome:'prepared'});
  await assert.rejects(runPaddleOperatorRecovery(['apply',output,evidence,'YES'],env));
  await chmod(evidence,0o644);await assert.rejects(runPaddleOperatorRecovery(['apply',output,evidence,'CONFIRM_SUPPORT_TERMINAL_NO_TRANSACTION'],env));await chmod(evidence,0o600);
  const args=['apply',output,evidence,'CONFIRM_SUPPORT_TERMINAL_NO_TRANSACTION'];assert.equal((await runPaddleOperatorRecovery(args,env)).outcome,'applied');assert.equal((await runPaddleOperatorRecovery(args,env)).outcome,'replayed');
});
test('a real separate operator login can recover with limited grants but cannot authorize itself or impersonate another login',async()=>{
  await pool.query("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='connect_paddle_recovery_test') THEN CREATE ROLE connect_paddle_recovery_test LOGIN; END IF; END $$");
  await pool.query('GRANT USAGE ON SCHEMA public TO connect_paddle_recovery_test');
  await pool.query('GRANT SELECT,UPDATE ON paddle_checkout_intents,paddle_accounts TO connect_paddle_recovery_test');
  await pool.query('GRANT SELECT ON paddle_creation_observations TO connect_paddle_recovery_test');
  await pool.query('GRANT SELECT,INSERT ON paddle_operator_recoveries,paddle_checkout_closures,audit_logs TO connect_paddle_recovery_test');
  await pool.query('GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO connect_paddle_recovery_test');
  await pool.query('GRANT EXECUTE ON FUNCTION paddle_recovery_authorize_v1(BIGINT,TEXT),derive_bot_reply_staging_tenant_barrier_key_v1(BIGINT) TO connect_paddle_recovery_test');
  const operatorPool=new pg.Pool({connectionString:connectionString.replace('connect_paddle_test@','connect_paddle_recovery_test@'),max:1});
  try {
    const f=await unknownAttempt(),service=recoveryService(f,{},createNodePostgresTransactionManager(operatorPool));
    await assert.rejects(service.prepare(recoveryRequest(f,'close-absent')));
    await assert.rejects(operatorPool.query("INSERT INTO paddle_recovery_authorizations(database_role,tenant_id,environment,expires_at) VALUES(current_user,$1,'sandbox',clock_timestamp()+interval '1 hour')",[f.session.tenantId]));
    await pool.query("INSERT INTO paddle_recovery_authorizations(database_role,tenant_id,environment,expires_at) VALUES('connect_paddle_recovery_test',$1,'sandbox',clock_timestamp()+interval '1 hour')",[f.session.tenantId]);
    const proposal=await service.prepare(recoveryRequest(f,'close-absent'));assert.equal(proposal.operatorRole,'connect_paddle_recovery_test');
    await service.apply(proposal,recoveryEvidence);
    assert.equal((await pool.query('SELECT operator_role FROM paddle_operator_recoveries WHERE intent_key=$1',[f.work.intentKey])).rows[0].operator_role,'connect_paddle_recovery_test');
    await assert.rejects(operatorPool.query('SET ROLE connect_paddle_test'));
    await pool.query('DELETE FROM paddle_recovery_authorizations WHERE tenant_id=$1',[f.session.tenantId]);
    await assert.rejects(service.apply(proposal,recoveryEvidence));
  } finally { await operatorPool.end(); }
});
