import { requireTenantPermission, type TenantSession } from '../auth/tenantSession.ts';
import { isMetaSignupLaunchId, type MetaSignupLaunchRepository } from '../meta/metaSignupLaunch.ts';
import type { MetaSignupAttemptCommand } from '../meta/metaSignupAttempt.ts';
import { postgresMetaTenantBarrierCte } from './postgresMetaTenantBarrier.ts';
import { parsePostgresPositiveInteger, parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from './postgresResultValidation.ts';
import type { PostgresTransaction, PostgresTransactionManager, PostgresParameter } from './postgresTransaction.ts';

export const postgresMetaSignupLaunchSql = Object.freeze({
  barrier: `WITH ${postgresMetaTenantBarrierCte} SELECT 1 AS locked FROM tenant_barrier`,
  tenant: `SELECT id FROM tenants WHERE id=$1 AND status IN ('active','trial','payment_failed') FOR SHARE`,
  connection: `SELECT version FROM meta_connections WHERE tenant_id=$1 FOR SHARE`,
  active: `SELECT id,actor_external_user_id AS actor,configuration_key AS configuration,baseline_connection_version AS baseline,status,
    expires_at AS "expiresAt",clock_timestamp() >= expires_at AS expired FROM meta_signup_launches WHERE tenant_id=$1 AND status IN ('ready','claimed') FOR UPDATE`,
  create: `WITH stamp AS MATERIALIZED (SELECT date_trunc('milliseconds',clock_timestamp()) AS started)
    INSERT INTO meta_signup_launches (tenant_id,actor_external_user_id,configuration_key,baseline_connection_version,started_at,expires_at)
    SELECT $1,$2,$3,$4,started,started+INTERVAL '20 minutes' FROM stamp RETURNING id,expires_at AS "expiresAt"`,
  abandon: `UPDATE meta_signup_launches SET status='abandoned',closed_at=date_trunc('milliseconds',clock_timestamp()) WHERE tenant_id=$1 AND id=$2 AND status='ready' RETURNING id`,
  claim: `UPDATE meta_signup_launches SET status='claimed',claim_key=$5,request_digest=$6,claimed_at=date_trunc('milliseconds',clock_timestamp())
    WHERE tenant_id=$1 AND id=$2 AND actor_external_user_id=$3 AND configuration_key=$4 AND status='ready' AND clock_timestamp()<expires_at
      AND baseline_connection_version IS NOT DISTINCT FROM (SELECT version FROM meta_connections WHERE tenant_id=$1)
    RETURNING id,baseline_connection_version AS baseline`,
  finish: `UPDATE meta_signup_launches SET status='finished',closed_at=date_trunc('milliseconds',clock_timestamp())
    WHERE tenant_id=$1 AND id=$2 AND actor_external_user_id=$3 AND claim_key=$4 AND request_digest=$5 AND status='claimed' RETURNING id`,
  audit: `INSERT INTO audit_logs (tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES ($1,$2,$3,'meta_signup_launch',$4,'{}'::jsonb) RETURNING id`,
});
const fail = (): never => { throw new Error('Meta signup launch is unavailable'); };
async function one(tx: PostgresTransaction, sql: string, values: readonly PostgresParameter[]) { return requirePostgresRows(await tx.query(sql, values), 1)[0] ?? null; }
function id(row: unknown) { return parsePostgresPositiveInteger(requireExactPostgresRow(row, ['id']).id); }
export async function lockMetaSignupLaunchTenant(tx: PostgresTransaction, session: TenantSession) {
  await one(tx, postgresMetaSignupLaunchSql.barrier, [session.tenantId]);
  if (id(await one(tx, postgresMetaSignupLaunchSql.tenant, [session.tenantId])) !== session.tenantId) return fail();
}
export async function claimMetaSignupLaunch(tx: PostgresTransaction, command: MetaSignupAttemptCommand) {
  if (!isMetaSignupLaunchId(command.launchId) || !/^[0-9a-f]{64}$/.test(command.launchConfigurationKey ?? '')) return fail();
  const row = requireExactPostgresRow(await one(tx, postgresMetaSignupLaunchSql.claim, [command.session.tenantId,command.launchId,command.session.externalUserId,
    command.launchConfigurationKey!,command.claimKey,command.requestDigest]), ['id','baseline']);
  if (parsePostgresPositiveInteger(row.id) !== command.launchId) return fail();
  return row.baseline === null ? null : parsePostgresPositiveInteger(row.baseline);
}
export async function finishMetaSignupLaunch(tx: PostgresTransaction, command: MetaSignupAttemptCommand) {
  if (!isMetaSignupLaunchId(command.launchId)) return fail();
  if (id(await one(tx, postgresMetaSignupLaunchSql.finish, [command.session.tenantId,command.launchId,command.session.externalUserId,command.claimKey,command.requestDigest])) !== command.launchId) return fail();
}
export function createPostgresMetaSignupLaunchRepository(transactions: PostgresTransactionManager): MetaSignupLaunchRepository {
  return Object.freeze({
    async begin(session: TenantSession, configurationKey: string) {
      requireTenantPermission(session,'workspace.manage');
      if (!isMetaSignupLaunchId(session.tenantId) || typeof session.externalUserId !== 'string' || !session.externalUserId.length || session.externalUserId.length>512 ||
        session.externalUserId.trim()!==session.externalUserId || /[\u0000-\u001f\u007f]/.test(session.externalUserId) || !/^[0-9a-f]{64}$/.test(configurationKey)) return fail();
      return transactions.transaction({ isolationLevel: 'read-committed' }, async (tx) => {
        await lockMetaSignupLaunchTenant(tx,session);
        const connection = await one(tx,postgresMetaSignupLaunchSql.connection,[session.tenantId]);
        const baseline = connection === null ? null : parsePostgresPositiveInteger(requireExactPostgresRow(connection,['version']).version);
        const active = await one(tx,postgresMetaSignupLaunchSql.active,[session.tenantId]);
        if (active !== null) {
          const row = requireExactPostgresRow(active,['id','actor','configuration','baseline','status','expiresAt','expired']);
          const launchId = parsePostgresPositiveInteger(row.id);
          if (row.status==='claimed') return { status:'attempt-in-progress' as const };
          if (row.status!=='ready' || typeof row.expired!=='boolean') return fail();
          const sameBaseline = (row.baseline===null ? null : parsePostgresPositiveInteger(row.baseline))===baseline;
          if (!row.expired && sameBaseline && row.configuration===configurationKey) {
            if (row.actor!==session.externalUserId) return { status:'attempt-in-progress' as const };
            return { status:'ready' as const,launchId,expiresAt:parsePostgresTimestamp(row.expiresAt) };
          }
          if (id(await one(tx,postgresMetaSignupLaunchSql.abandon,[session.tenantId,launchId]))!==launchId) return fail();
          id(await one(tx,postgresMetaSignupLaunchSql.audit,[session.tenantId,session.externalUserId,'meta.embedded-signup.launch-abandoned',String(launchId)]));
        }
        const created = requireExactPostgresRow(await one(tx,postgresMetaSignupLaunchSql.create,[session.tenantId,session.externalUserId,configurationKey,baseline]),['id','expiresAt']);
        const launchId = parsePostgresPositiveInteger(created.id);
        id(await one(tx,postgresMetaSignupLaunchSql.audit,[session.tenantId,session.externalUserId,'meta.embedded-signup.launch-prepared',String(launchId)]));
        return { status:'ready' as const,launchId,expiresAt:parsePostgresTimestamp(created.expiresAt) };
      });
    },
  });
}
