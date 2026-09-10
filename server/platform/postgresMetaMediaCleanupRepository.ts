import { requireTenantPermission,TenantSessionError,type TenantSession } from '../auth/tenantSession.ts';
import { parseMetaMediaCleanupInput } from '../../shared/domain/metaMediaCleanup.ts';
import { MetaMediaCleanupError,metaMediaCleanupKey,validateMetaMediaCleanupTask,type MetaMediaCleanupTask,type MetaMediaCleanupRepository } from '../meta/metaMediaCleanup.ts';
import { parsePostgresMetaMediaUploadJob,postgresMetaMediaUploadSql } from './postgresMetaMediaUploadJournal.ts';
import { requireExactPostgresRow,requirePostgresRows,parsePostgresPositiveInteger } from './postgresResultValidation.ts';
import type { PostgresParameter,PostgresTransaction,PostgresTransactionManager } from './postgresTransaction.ts';
const claimColumns=`j.tenant_id AS "tenantId",j.job_key AS "jobKey",j.actor_external_user_id AS actor,j.object_version_id AS "versionId",j.version,j.attempts,(j.status='recovery-required') AS exhausted`;
const exact=`tenant_id=$1 AND job_key=$2 AND actor_external_user_id=$3 AND object_version_id=$4 AND version=$5 AND attempts=$6 AND status='running' AND lease_expires_at>clock_timestamp()`;
export const postgresMetaMediaCleanupSql=Object.freeze({
  tenant:`SELECT id FROM tenants WHERE id=$1 AND status IN ('active','trial','payment_failed') FOR SHARE`,
  owner:`SELECT external_user_id AS actor FROM tenant_memberships WHERE tenant_id=$1 AND external_user_id=$2 AND role='owner' AND status='active' FOR SHARE`,
  existing:`SELECT actor_external_user_id AS actor,idempotency_key AS key,requested_task_version AS version FROM meta_media_cleanup_jobs WHERE tenant_id=$1 AND job_key=$2`,
  tasks:`SELECT kind,status,version FROM meta_media_tasks WHERE tenant_id=$1 AND job_key=$2 ORDER BY kind COLLATE "C" FOR UPDATE`,
  conflicting:`SELECT EXISTS(SELECT 1 FROM meta_media_scan_observations WHERE tenant_id=$1 AND job_key=$2 AND object_version_id<>$3) AS conflict`,
  insert:`INSERT INTO meta_media_cleanup_jobs(tenant_id,job_key,actor_external_user_id,requested_task_version,object_version_id,idempotency_key)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING job_key AS "jobKey"`,
  claim:`WITH candidate AS (SELECT job_key FROM meta_media_cleanup_jobs WHERE
    (status='pending' AND next_attempt_at<=clock_timestamp()) OR (status='running' AND lease_expires_at<=clock_timestamp())
    ORDER BY next_attempt_at,job_key LIMIT 1 FOR UPDATE SKIP LOCKED)
    UPDATE meta_media_cleanup_jobs j SET version=version+1,status=CASE WHEN attempts=3 THEN 'recovery-required' ELSE 'running' END,
      attempts=LEAST(attempts+1,3),lease_expires_at=CASE WHEN attempts=3 THEN NULL ELSE clock_timestamp()+($1::integer*INTERVAL '1 millisecond') END
    FROM candidate WHERE j.job_key=candidate.job_key RETURNING ${claimColumns}`,
  check:`SELECT job_key AS "jobKey" FROM meta_media_cleanup_jobs WHERE ${exact} FOR SHARE`,
  finish:`UPDATE meta_media_cleanup_jobs SET version=version+1,lease_expires_at=NULL,
    status=CASE WHEN $7='retry' THEN CASE WHEN attempts=3 THEN 'recovery-required' ELSE 'pending' END ELSE $7 END,
    next_attempt_at=clock_timestamp()+($8::integer*INTERVAL '1 millisecond') WHERE ${exact} RETURNING status,version,attempts`,
  audit:`INSERT INTO audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,idempotency_key,metadata_json)
    VALUES($1,$2,'meta.history.media-cleanup','meta_media_upload_job',$3,$4,$5::jsonb) RETURNING id`,
});
const fail=(code:MetaMediaCleanupError['code']):never=>{throw new MetaMediaCleanupError(code);};
const parameters=(t:MetaMediaCleanupTask):PostgresParameter[]=>[t.tenantId,t.jobKey,t.actor,t.versionId,t.version,t.attempts];
async function one(tx:PostgresTransaction,sql:string,p:readonly PostgresParameter[]){return requirePostgresRows(await tx.query(sql,p),1)[0]??null;}
async function owner(tx:PostgresTransaction,tenantId:number,actor:string){
  if(!await one(tx,postgresMetaMediaCleanupSql.tenant,[tenantId])||!await one(tx,postgresMetaMediaCleanupSql.owner,[tenantId,actor]))return fail('PERMISSION_DENIED');
}
async function audit(tx:PostgresTransaction,tenantId:number,actor:string,jobKey:string,key:string|null,state:{status:string;version:number;attempts:number}){
  parsePostgresPositiveInteger(requireExactPostgresRow(await one(tx,postgresMetaMediaCleanupSql.audit,[tenantId,actor,jobKey,key,JSON.stringify(state)]),['id']).id);
}
export function createPostgresMetaMediaCleanupRepository(transactions:PostgresTransactionManager,timing:Readonly<{leaseMs?:number;retryBaseMs?:number}>={}):MetaMediaCleanupRepository{
  const lease=timing.leaseMs??600_000,delay=timing.retryBaseMs??60_000;
  if(Object.keys(timing).some(k=>!['leaseMs','retryBaseMs'].includes(k))||!Number.isSafeInteger(lease)||lease<250||lease>600_000||!Number.isSafeInteger(delay)||delay<50||delay>60_000)return fail('INVALID_REQUEST');
  async function transaction<T>(work:(tx:PostgresTransaction)=>Promise<T>){try{return await transactions.transaction({isolationLevel:'read-committed'},work);}catch(e){if(e instanceof MetaMediaCleanupError)throw e;if(e instanceof TenantSessionError)return fail('PERMISSION_DENIED');return fail('DEPENDENCY_UNAVAILABLE');}}
  return Object.freeze({
    async request(rawSession,rawInput,key){
      const session=Object.freeze({...rawSession}),input=parseMetaMediaCleanupInput(rawInput);
      if(!input||key!==await metaMediaCleanupKey(input))return fail('INVALID_REQUEST');
      try{requireTenantPermission(session,'workspace.manage');}catch{return fail('PERMISSION_DENIED');}
      validateSession(session);
      return transaction(async tx=>{
        await owner(tx,session.tenantId,session.externalUserId);
        const raw=await one(tx,postgresMetaMediaUploadSql.lock,[session.tenantId,input.jobKey]);if(!raw)return fail('CONFLICT');
        const job=await parsePostgresMetaMediaUploadJob(raw);
        const existing=await one(tx,postgresMetaMediaCleanupSql.existing,[session.tenantId,input.jobKey]);
        if(existing){const e=requireExactPostgresRow(existing,['actor','key','version']);if(e.actor===session.externalUserId&&e.key===key&&e.version===input.expectedVersion)return 'already-requested';return fail('CONFLICT');}
        if(job.status!=='quarantined'||!job.receipt)return fail('CONFLICT');
        const tasks=requirePostgresRows(await tx.query(postgresMetaMediaCleanupSql.tasks,[session.tenantId,input.jobKey]),2).map(t=>requireExactPostgresRow(t,['kind','status','version']));
        if(tasks.some(t=>['pending','running'].includes(String(t.status)))||!tasks.some(t=>t.kind==='inspect'&&t.version===input.expectedVersion&&['blocked','recovery-required'].includes(String(t.status))))return fail('CONFLICT');
        const evidence=requireExactPostgresRow(await one(tx,postgresMetaMediaCleanupSql.conflicting,[session.tenantId,input.jobKey,job.receipt.versionId]),['conflict']);if(evidence.conflict!==false)return fail('CONFLICT');
        const inserted=requireExactPostgresRow(await one(tx,postgresMetaMediaCleanupSql.insert,[session.tenantId,input.jobKey,session.externalUserId,input.expectedVersion,job.receipt.versionId,key]),['jobKey']);if(inserted.jobKey!==input.jobKey)return fail('DEPENDENCY_UNAVAILABLE');
        await audit(tx,session.tenantId,session.externalUserId,input.jobKey,key,{status:'pending',version:1,attempts:0});return 'queued';
      });
    },
    async claimNext(){return transaction(async tx=>{
      const raw=await one(tx,postgresMetaMediaCleanupSql.claim,[lease]);if(!raw)return null;
      const row=requireExactPostgresRow(raw,['tenantId','jobKey','actor','versionId','version','attempts','exhausted']);
      const task=validateMetaMediaCleanupTask({...row,tenantId:parsePostgresPositiveInteger(row.tenantId)} as unknown as MetaMediaCleanupTask);
      await audit(tx,task.tenantId,task.actor,task.jobKey,null,{status:task.exhausted?'recovery-required':'running',version:task.version,attempts:task.attempts});return task;
    });},
    async authorize(raw){const task=validateMetaMediaCleanupTask(raw);return transaction(async tx=>{
      await owner(tx,task.tenantId,task.actor);
      const rawJob=await one(tx,postgresMetaMediaUploadSql.lock,[task.tenantId,task.jobKey]);if(!rawJob)return fail('CONFLICT');
      const job=await parsePostgresMetaMediaUploadJob(rawJob);
      if(job.status!=='quarantined'||job.receipt?.versionId!==task.versionId)return fail('CONFLICT');
      if(!await one(tx,postgresMetaMediaCleanupSql.check,parameters(task)))return fail('STALE_CLAIM');return job;
    });},
    async finish(raw,outcome){const task=validateMetaMediaCleanupTask(raw);if(!['removed','retry','recovery-required','cancelled'].includes(outcome))return fail('INVALID_REQUEST');return transaction(async tx=>{
      const rawRow=await one(tx,postgresMetaMediaCleanupSql.finish,[...parameters(task),outcome,delay*2**(task.attempts-1)]);if(!rawRow)return false;
      const row=requireExactPostgresRow(rawRow,['status','version','attempts']);
      await audit(tx,task.tenantId,task.actor,task.jobKey,null,{status:String(row.status),version:parsePostgresPositiveInteger(row.version),attempts:parsePostgresPositiveInteger(row.attempts)});return true;
    });},
  } satisfies MetaMediaCleanupRepository);
}
function validateSession(s:TenantSession){if(!Number.isSafeInteger(s.tenantId)||s.tenantId<1||typeof s.externalUserId!=='string'||!s.externalUserId||s.externalUserId.length>512||s.externalUserId.trim()!==s.externalUserId||/[\u0000-\u001f\u007f]/.test(s.externalUserId))return fail('PERMISSION_DENIED');}
