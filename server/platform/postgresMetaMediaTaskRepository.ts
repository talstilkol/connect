import { META_MEDIA_TASK_POLICY, MetaMediaTaskError, requireMetaMediaTaskKind, validateMetaMediaTask,
  type MetaMediaTask, type MetaMediaTaskKind, type MetaMediaTaskRepository } from "../meta/metaMediaTasks.ts";
import { deriveMetaMediaUploadJobKey } from "../meta/metaMediaUploadJournal.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { metaHistoryEligibleMediaSources, readPostgresBoundMetaHistoryMedia } from "./postgresMetaHistoryMediaRepository.ts";
import { requireExactPostgresRow, requirePostgresRows, parsePostgresPositiveInteger } from "./postgresResultValidation.ts";
import type { PostgresTransaction, PostgresTransactionManager, PostgresParameter } from "./postgresTransaction.ts";

const columns = `job.job_key AS "jobKey",job.kind,job.tenant_id AS "tenantId",job.actor_external_user_id AS actor,
  job.message_key AS "messageKey",job.connection_version AS "connectionVersion",job.source_sha256 AS "sourceSha256",
  job.version,job.attempts,(job.status='recovery-required') AS exhausted`;
const exactClaim = `job_key=$1 AND kind=$2 AND tenant_id=$3 AND actor_external_user_id=$4 AND message_key=$5
  AND connection_version=$6 AND source_sha256=$7 AND version=$8 AND status='running' AND lease_expires_at>clock_timestamp()`;
export const postgresMetaMediaTaskSql = Object.freeze({
  uploadCandidate: `SELECT session.tenant_id AS "tenantId",message.message_key AS "messageKey" ${metaHistoryEligibleMediaSources}
    AND EXISTS (SELECT 1 FROM meta_history_media_bindings b WHERE b.tenant_id=message.tenant_id AND b.provider_message_id=message.provider_message_id)
    AND NOT EXISTS (SELECT 1 FROM meta_media_tasks task WHERE task.tenant_id=message.tenant_id AND task.message_key=message.message_key
      AND task.connection_version=session.connection_version AND task.kind='upload')
    AND NOT EXISTS(SELECT 1 FROM meta_media_withdrawals cleanup JOIN meta_media_upload_jobs j ON j.job_key=cleanup.job_key
      WHERE j.tenant_id=message.tenant_id AND j.message_key=message.message_key AND j.connection_version=session.connection_version) ORDER BY session.tenant_id,message.message_key LIMIT 1`,
  actor: `SELECT COALESCE((SELECT actor_external_user_id FROM meta_media_upload_jobs WHERE job_key=$2 AND tenant_id=$1),
    (SELECT actor_external_user_id FROM meta_data_sync_onboardings WHERE tenant_id=$1)) AS actor`,
  inspectionCandidate: `SELECT job.job_key AS "jobKey",job.tenant_id AS "tenantId",job.actor_external_user_id AS actor,
    job.message_key AS "messageKey",job.connection_version AS "connectionVersion",job.source_sha256 AS "sourceSha256"
    FROM meta_media_upload_jobs job WHERE job.status IN ('dispatching','reconciliation-required','quarantined')
    AND NOT EXISTS (SELECT 1 FROM meta_media_withdrawals w WHERE w.job_key=job.job_key)
    AND NOT EXISTS (SELECT 1 FROM meta_media_tasks task WHERE task.job_key=job.job_key AND task.kind='inspect') ORDER BY job.job_key LIMIT 1`,
  handoff: `SELECT job.job_key AS "jobKey",job.tenant_id AS "tenantId",job.actor_external_user_id AS actor,
    job.message_key AS "messageKey",job.connection_version AS "connectionVersion",job.source_sha256 AS "sourceSha256"
    FROM meta_media_upload_jobs job WHERE job.job_key=$1 AND job.tenant_id=$2 AND job.status IN ('dispatching','reconciliation-required','quarantined') FOR SHARE`,
  insert: `INSERT INTO meta_media_tasks(job_key,kind,tenant_id,actor_external_user_id,message_key,connection_version,source_sha256)
    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING job_key AS "jobKey"`,
  claim: `WITH candidate AS (SELECT job_key,kind FROM meta_media_tasks WHERE kind=$1
    AND NOT EXISTS(SELECT 1 FROM meta_media_withdrawals w WHERE w.job_key=meta_media_tasks.job_key)
    AND ((status='pending' AND next_attempt_at<=clock_timestamp()) OR (status='running' AND lease_expires_at<=clock_timestamp()))
    ORDER BY next_attempt_at,job_key LIMIT 1 FOR UPDATE SKIP LOCKED)
    UPDATE meta_media_tasks job SET version=version+1,
      status=CASE WHEN attempts>=CASE WHEN job.kind='upload' THEN 3 ELSE 12+job.operator_retry_count END THEN 'recovery-required' ELSE 'running' END,
      lease_expires_at=CASE WHEN attempts>=CASE WHEN job.kind='upload' THEN 3 ELSE 12+job.operator_retry_count END THEN NULL ELSE clock_timestamp()+($2::integer*INTERVAL '1 millisecond') END,
      attempts=LEAST(attempts+1,CASE WHEN job.kind='upload' THEN 3 ELSE 12+job.operator_retry_count END)
    FROM candidate WHERE job.job_key=candidate.job_key AND job.kind=candidate.kind RETURNING ${columns}`,
  check: `SELECT job_key AS "jobKey" FROM meta_media_tasks WHERE ${exactClaim}`,
  finish: `UPDATE meta_media_tasks SET status=CASE WHEN $9='retry' THEN
      CASE WHEN attempts>=CASE WHEN kind='upload' THEN 3 ELSE 12+operator_retry_count END THEN 'recovery-required' ELSE 'pending' END
      WHEN $9 IN ('inspection-ready','clean-observed') THEN 'done' ELSE $9 END,
    version=version+1,lease_expires_at=NULL,next_attempt_at=clock_timestamp()+($10::integer*INTERVAL '1 millisecond')
    WHERE ${exactClaim} RETURNING status`,
  audit: `INSERT INTO audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES($1,$2,'meta.history.media-task','meta_media_upload_job',$3,$4::jsonb) RETURNING id`,
});
type Identity = Pick<MetaMediaTask,"jobKey"|"kind"|"tenantId"|"actor"|"messageKey"|"connectionVersion"|"sourceSha256">;
const identityParameters = (v: Identity): PostgresParameter[] => [v.jobKey,v.kind,v.tenantId,v.actor,v.messageKey,v.connectionVersion,v.sourceSha256];
const claimParameters = (v: MetaMediaTask): PostgresParameter[] => [...identityParameters(v),v.version];
async function one(tx: PostgresTransaction, sql: string, parameters: readonly PostgresParameter[]) {
  return requirePostgresRows(await tx.query(sql,parameters),1)[0] ?? null;
}
async function audit(tx: PostgresTransaction, v: Identity, state: string) {
  parsePostgresPositiveInteger(requireExactPostgresRow(await one(tx,postgresMetaMediaTaskSql.audit,
    [v.tenantId,v.actor,v.jobKey,JSON.stringify({ kind:v.kind,status:state })]),["id"]).id);
}
async function enqueue(tx: PostgresTransaction, value: Identity) {
  validateMetaMediaTask({...value,version:2,attempts:1,exhausted:false});
  if (await deriveMetaMediaUploadJobKey(value)!==value.jobKey) throw new MetaMediaTaskError("INVALID_INPUT");
  const inserted=await one(tx,postgresMetaMediaTaskSql.insert,identityParameters(value));
  if (inserted!==null) await audit(tx,value,"pending");
  return inserted!==null;
}
function identityFromRow(raw: unknown, kind: MetaMediaTaskKind): Identity {
  const row=requireExactPostgresRow(raw,["jobKey","tenantId","actor","messageKey","connectionVersion","sourceSha256"]);
  return {jobKey:row.jobKey as string,tenantId:parsePostgresPositiveInteger(row.tenantId),actor:row.actor as string,
    messageKey:row.messageKey as string,connectionVersion:parsePostgresPositiveInteger(row.connectionVersion),sourceSha256:row.sourceSha256 as string,kind};
}
export function createPostgresMetaMediaTaskRepository(transactions: PostgresTransactionManager,
  timing: Readonly<{ leaseMs?: number; retryBaseMs?: number; retryMaximumMs?: number }> = {}): MetaMediaTaskRepository {
  const leaseMs=timing.leaseMs??META_MEDIA_TASK_POLICY.leaseMs, retryBaseMs=timing.retryBaseMs??META_MEDIA_TASK_POLICY.retryBaseMs,
    retryMaximumMs=timing.retryMaximumMs??META_MEDIA_TASK_POLICY.retryMaximumMs;
  if (!Number.isSafeInteger(leaseMs)||leaseMs<250||leaseMs>META_MEDIA_TASK_POLICY.leaseMs||
    !Number.isSafeInteger(retryBaseMs)||retryBaseMs<50||retryBaseMs>META_MEDIA_TASK_POLICY.retryBaseMs||
    !Number.isSafeInteger(retryMaximumMs)||retryMaximumMs<retryBaseMs||retryMaximumMs>META_MEDIA_TASK_POLICY.retryMaximumMs||
    Object.keys(timing).some(key=>!["leaseMs","retryBaseMs","retryMaximumMs"].includes(key))) throw new MetaMediaTaskError("INVALID_INPUT");
  const transaction=async<T>(work:(tx:PostgresTransaction)=>Promise<T>)=>{
    try{return await transactions.transaction({isolationLevel:"read-committed"},work);}
    catch(error){if(error instanceof MetaMediaTaskError)throw error;throw new MetaMediaTaskError("DEPENDENCY_UNAVAILABLE");}
  };
  return Object.freeze({
    async discoverNext(rawKind) {
      const kind=requireMetaMediaTaskKind(rawKind);
      return transaction(async(tx)=>{
        if(kind==="inspect"){
          const row=await one(tx,postgresMetaMediaTaskSql.inspectionCandidate,[]);if(row===null)return "idle";
          return await enqueue(tx,identityFromRow(row,kind))?"enqueued":"idle";
        }
        const candidate=await one(tx,postgresMetaMediaTaskSql.uploadCandidate,[]);if(candidate===null)return "idle";
        const row=requireExactPostgresRow(candidate,["tenantId","messageKey"]),tenantId=parsePostgresPositiveInteger(row.tenantId),messageKey=row.messageKey as string;
        const bound=await readPostgresBoundMetaHistoryMedia(tx,tenantId,messageKey);if(bound===null)return "idle";
        const sourceSha256=await sha256Hex(new TextEncoder().encode(JSON.stringify(bound)));
        const identity={tenantId,messageKey,connectionVersion:bound.scope.connectionVersion,sourceSha256};
        const jobKey=await deriveMetaMediaUploadJobKey(identity);
        const actor=requireExactPostgresRow(await one(tx,postgresMetaMediaTaskSql.actor,[tenantId,jobKey]),["actor"]).actor as string;
        return await enqueue(tx,{...identity,jobKey,kind,actor})?"enqueued":"idle";
      });
    },
    async claimNext(rawKind) {
      const kind=requireMetaMediaTaskKind(rawKind);
      return transaction(async(tx)=>{
        const raw=await one(tx,postgresMetaMediaTaskSql.claim,[kind,leaseMs]);if(raw===null)return null;
        const row=requireExactPostgresRow(raw,["jobKey","kind","tenantId","actor","messageKey","connectionVersion","sourceSha256","version","attempts","exhausted"]);
        const task=validateMetaMediaTask({...row,tenantId:parsePostgresPositiveInteger(row.tenantId),connectionVersion:parsePostgresPositiveInteger(row.connectionVersion),
          version:parsePostgresPositiveInteger(row.version),attempts:parsePostgresPositiveInteger(row.attempts)} as unknown as MetaMediaTask);
        if(task.kind!==kind||await deriveMetaMediaUploadJobKey(task)!==task.jobKey)throw new MetaMediaTaskError("DEPENDENCY_UNAVAILABLE");
        await audit(tx,task,task.exhausted?"recovery-required":"running");return task;
      });
    },
    async check(raw) {
      const task=validateMetaMediaTask(raw);
      return transaction(async(tx)=>await one(tx,postgresMetaMediaTaskSql.check,claimParameters(task))!==null);
    },
    async finish(raw,outcome) {
      const task=validateMetaMediaTask(raw);
      if(!["retry","inspection-ready","clean-observed","blocked","recovery-required","cancelled"].includes(outcome)||
        (outcome==="inspection-ready"&&task.kind!=="upload")||(outcome==="clean-observed"&&task.kind!=="inspect")) throw new MetaMediaTaskError("INVALID_INPUT");
      return transaction(async(tx)=>{
        const delay=Math.min(retryMaximumMs,retryBaseMs*2**(task.attempts-1));
        const row=await one(tx,postgresMetaMediaTaskSql.finish,[...claimParameters(task),outcome,delay]);if(row===null)return false;
        if(outcome==="inspection-ready"){
          const upload=await one(tx,postgresMetaMediaTaskSql.handoff,[task.jobKey,task.tenantId]);if(upload===null)throw new MetaMediaTaskError("DEPENDENCY_UNAVAILABLE");
          const identity=identityFromRow(upload,"inspect");
          if(identity.actor!==task.actor||identity.messageKey!==task.messageKey||identity.sourceSha256!==task.sourceSha256||identity.connectionVersion!==task.connectionVersion)throw new MetaMediaTaskError("INVALID_INPUT");
          await enqueue(tx,identity);
        }
        await audit(tx,task,requireExactPostgresRow(row,["status"]).status as string);return true;
      });
    },
  } satisfies MetaMediaTaskRepository);
}
