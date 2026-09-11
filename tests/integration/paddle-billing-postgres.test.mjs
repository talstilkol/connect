import { createPostgresPaidAccess, paidAccessTenantSql, paidAccessTenantBarrier } from "../../server/platform/postgresPaidAccess.ts";
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
    await pool.query(await readFile(new URL(name,directory),'utf8'));
  }
});
after(()=>pool.end());
async function fixture(){const f=paddleFixture(++sequence);await pool.query("INSERT INTO tenants(id,display_name,status) VALUES($1,$2,'active')",[f.session.tenantId,f.session.displayName]);
  await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'owner','active'),($1,'template-submission-integration-owner','owner','active')",[f.session.tenantId,f.session.externalUserId]);return f;}
const row=async f=>(await pool.query('SELECT * FROM paddle_checkout_intents WHERE tenant_id=$1 ORDER BY generation DESC',[f.session.tenantId])).rows[0];
const account=async f=>(await pool.query('SELECT * FROM paddle_accounts WHERE tenant_id=$1',[f.session.tenantId])).rows[0];
async function confirmed(f){await journal.enqueue(f.session,f.config);const work=await journal.claimCreation('sandbox');assert.equal(work.tenantId,f.session.tenantId);await journal.confirmCreation(work,f.receipt);return work;}
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

// Extend the existing protocol fixture; database time anchors the paid period.
async function productionAccount(overrides={}) {
  const f=await fixture();f.config={...f.config,environment:'production'};
  const period=(await pool.query("SELECT clock_timestamp()-interval '1 hour' AS starts, clock_timestamp()+interval '1 hour' AS ends")).rows[0];
  f.subscription={...f.subscription,startsAt:period.starts.toISOString(),endsAt:period.ends.toISOString(),...overrides};
  await journal.enqueue(f.session,f.config);const creation=await journal.claimCreation('production');assert.equal(creation.tenantId,f.session.tenantId);
  await journal.confirmCreation(creation,f.receipt);const work=await journal.claimReconciliation('production');
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
  await journal.confirmCreation(work,receipt);
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
  const unknown=await fixture();await journal.enqueue(unknown.session,unknown.config);const work=await journal.claimCreation('sandbox');await journal.creationUnknown(work);
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
