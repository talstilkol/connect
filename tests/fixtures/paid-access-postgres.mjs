// Reuses the established Paddle protocol fixture and existing tenant/owner.
// No network provider or fabricated product data enters the application.
import assert from 'node:assert/strict';
import { paddleFixture } from './paddle-billing.mjs';
import { createNodePostgresQueryExecutor, createNodePostgresTransactionManager } from '../../server/platform/nodePostgresAdapter.ts';
import { createPostgresPaddleRepository } from '../../server/platform/postgresPaddleRepository.ts';
export async function bindPaidFixture(pool, tenantId, externalUserId, status='active') {
  const f=paddleFixture(tenantId);const plan={...f.config,environment:'production'};
  const journal=createPostgresPaddleRepository({queries:createNodePostgresQueryExecutor(pool),transactions:createNodePostgresTransactionManager(pool)});
  await pool.query("INSERT INTO tenant_memberships(tenant_id,external_user_id,role,status) VALUES($1,$2,'owner','active') ON CONFLICT(tenant_id,external_user_id) DO NOTHING",[tenantId,externalUserId]);
  await journal.enqueue({...f.session,externalUserId},plan);const creation=await journal.claimCreation('production');assert.equal(creation.tenantId,tenantId);
  await journal.confirmCreation(creation,f.receipt);const work=await journal.claimReconciliation('production');assert.equal(work.tenantId,tenantId);
  const clock=(await pool.query("SELECT clock_timestamp()-interval '1 hour' AS starts,clock_timestamp()+interval '1 hour' AS ends")).rows[0];
  const subscription={...f.subscription,status,startsAt:clock.starts.toISOString(),endsAt:clock.ends.toISOString()};
  await journal.applyReconciliation(work,f.payment,subscription);
  return {journal,subscription,fixture:f,async cancel(){
    await pool.query("UPDATE paddle_checkout_intents SET next_reconcile_at=statement_timestamp()-interval '1 second' WHERE tenant_id=$1 AND environment='production'",[tenantId]);
    const work=await journal.claimReconciliation('production');assert.equal(work.tenantId,tenantId);
    await journal.applyReconciliation(work,f.payment,{...subscription,status:'canceled',startsAt:null,endsAt:null,updatedAt:'2026-07-26T09:00:00.000001Z'});
  }};
}
