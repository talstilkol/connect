import type { UserId, TenantId } from '../../shared/domain/model.ts';
import type { MetaSignupAttemptCommand } from '../meta/metaSignupAttempt.ts';
import type { PostgresTransaction, PostgresTransactionManager } from './postgresTransaction.ts';
import { parsePostgresPositiveInteger, requireExactPostgresRow, requirePostgresRows } from './postgresResultValidation.ts';

export interface MetaCoexistenceSyncJob {
  readonly launchId: number;
  readonly tenantId: TenantId;
  readonly actor: UserId;
  readonly version: number;
  readonly expired: boolean;
  readonly settled: boolean;
}
export type MetaCoexistenceJobOutcome = 'requests-accepted' | 'recovery-required' | 'cancelled' | 'retry';
export const postgresMetaCoexistenceJobSql = Object.freeze({
  enqueue: `INSERT INTO meta_coexistence_sync_jobs (launch_id,tenant_id,actor_external_user_id,configuration_key,started_at)
    SELECT id,tenant_id,actor_external_user_id,configuration_key,started_at FROM meta_signup_launches
    WHERE id=$1 AND tenant_id=$2 AND actor_external_user_id=$3 AND configuration_key=$4 AND claim_key=$5
    RETURNING launch_id`,
  claim: `WITH candidate AS (
    SELECT launch_id FROM meta_coexistence_sync_jobs
    WHERE (status='pending' AND next_attempt_at<=clock_timestamp())
      OR (status='running' AND lease_expires_at<=clock_timestamp())
    ORDER BY next_attempt_at,launch_id LIMIT 1 FOR UPDATE SKIP LOCKED
  ) UPDATE meta_coexistence_sync_jobs AS job SET status='running',version=version+1,
      lease_expires_at=clock_timestamp()+INTERVAL '2 minutes'
    FROM candidate WHERE job.launch_id=candidate.launch_id
    RETURNING job.launch_id AS "launchId",job.tenant_id AS "tenantId",job.actor_external_user_id AS actor,job.version,
      clock_timestamp()>=job.started_at+INTERVAL '24 hours' AS expired,
      EXISTS (SELECT 1 FROM meta_data_sync_onboardings AS onboarding
        WHERE onboarding.tenant_id=job.tenant_id AND onboarding.signup_launch_id=job.launch_id
          AND (SELECT count(*) FROM meta_data_sync_requests AS request
            WHERE request.tenant_id=job.tenant_id AND request.started_at=job.started_at
              AND request.connection_version=onboarding.signup_connection_version AND request.status='accepted')=2) AS settled`,
  finish: `UPDATE meta_coexistence_sync_jobs SET status=CASE
      WHEN $4='retry' THEN CASE WHEN clock_timestamp()>=started_at+INTERVAL '24 hours' THEN 'recovery-required' ELSE 'pending' END
      ELSE $4 END,version=version+1,lease_expires_at=NULL,next_attempt_at=clock_timestamp()+INTERVAL '1 minute'
    WHERE launch_id=$1 AND tenant_id=$2 AND version=$3 AND status='running' RETURNING launch_id`,
  audit: `INSERT INTO audit_logs (tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES ($1,$2,$3,'meta_coexistence_sync_job',$4,$5::jsonb) RETURNING id`,
});
async function audit(tx: PostgresTransaction, tenantId: number, actor: string, launchId: number, status: string) {
  if (requirePostgresRows(await tx.query(postgresMetaCoexistenceJobSql.audit,
    [tenantId,actor,'meta.coexistence.continuation',String(launchId),JSON.stringify({ status })]),1).length!==1) {
    throw new Error('Meta continuation audit is unavailable');
  }
}
export async function enqueueMetaCoexistenceSyncJob(tx: PostgresTransaction, command: MetaSignupAttemptCommand) {
  if (command.launchId===undefined || command.launchConfigurationKey===undefined || command.synchronizeBusinessApp!==true) {
    throw new Error('Meta continuation scope is invalid');
  }
  if (requirePostgresRows(await tx.query(postgresMetaCoexistenceJobSql.enqueue,
    [command.launchId,command.session.tenantId,command.session.externalUserId,command.launchConfigurationKey,command.claimKey]),1).length!==1) {
    throw new Error('Meta continuation was not persisted');
  }
  await audit(tx,command.session.tenantId,command.session.externalUserId,command.launchId,'pending');
}
export function createPostgresMetaCoexistenceSyncJobRepository(transactions: PostgresTransactionManager) {
  return Object.freeze({
    async claimNext(): Promise<MetaCoexistenceSyncJob | null> {
      return transactions.transaction({ isolationLevel:'read-committed' },async (tx) => {
        const rows = requirePostgresRows(await tx.query(postgresMetaCoexistenceJobSql.claim,[]),1);
        if (rows.length===0) return null;
        const row = requireExactPostgresRow(rows[0],['launchId','tenantId','actor','version','expired','settled']);
        if (typeof row.actor!=='string' || row.actor.length===0 || row.actor.length>512 || row.actor!==row.actor.trim() || /[\u0000-\u001f\u007f]/.test(row.actor) || typeof row.expired!=='boolean' || typeof row.settled!=='boolean') {
          throw new Error('Invalid Meta continuation');
        }
        const job = Object.freeze({ launchId:parsePostgresPositiveInteger(row.launchId),tenantId:parsePostgresPositiveInteger(row.tenantId) as TenantId,
          actor:row.actor as UserId,version:parsePostgresPositiveInteger(row.version),expired:row.expired,settled:row.settled });
        await audit(tx,job.tenantId,job.actor,job.launchId,'running');
        return job;
      });
    },
    async finish(job: MetaCoexistenceSyncJob, outcome: MetaCoexistenceJobOutcome): Promise<boolean> {
      if (!['requests-accepted','recovery-required','cancelled','retry'].includes(outcome)) throw new Error('Invalid Meta continuation outcome');
      return transactions.transaction({ isolationLevel:'read-committed' },async (tx) => {
        const rows = requirePostgresRows(await tx.query(postgresMetaCoexistenceJobSql.finish,[job.launchId,job.tenantId,job.version,outcome]),1);
        if (rows.length===0) return false;
        await audit(tx,job.tenantId,job.actor,job.launchId,outcome);
        return true;
      });
    },
  });
}
