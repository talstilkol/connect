import { requireTenantPermission, TenantSessionError } from "../auth/tenantSession.ts";
import { parseMetaMediaInspectionRetryInput } from "../../shared/domain/metaMediaInspectionRetry.ts";
import { MetaMediaInspectionRetryError, metaMediaInspectionRetryKey, type MetaMediaInspectionRetryRepository } from "../meta/metaMediaInspectionRetry.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { readPostgresBoundMetaHistoryMedia } from "./postgresMetaHistoryMediaRepository.ts";
import { parsePostgresMetaMediaUploadJob, postgresMetaMediaUploadSql } from "./postgresMetaMediaUploadJournal.ts";
import { requireExactPostgresRow, requirePostgresRows, parsePostgresPositiveInteger } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";

export const postgresMetaMediaInspectionRetrySql = Object.freeze({
  owners: `SELECT external_user_id AS actor FROM tenant_memberships WHERE tenant_id=$1 AND external_user_id IN ($2,$3)
    AND status='active' AND role='owner' ORDER BY external_user_id COLLATE "C" FOR SHARE`,
  existing: `SELECT job_key AS "jobKey",requested_task_version AS "expectedVersion" FROM meta_media_inspection_retry_requests
    WHERE tenant_id=$1 AND actor_external_user_id=$2 AND idempotency_key=$3`,
  task: `SELECT version,attempts,operator_retry_count AS "operatorRetries",status FROM meta_media_tasks
    WHERE tenant_id=$1 AND job_key=$2 AND kind='inspect'
      AND NOT EXISTS(SELECT 1 FROM meta_media_withdrawals WHERE tenant_id=$1 AND job_key=$2) FOR UPDATE`,
  evidence: `SELECT COUNT(DISTINCT object_version_id)>1 OR COALESCE(bool_or(result IN ('THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED')),FALSE) AS blocked
    FROM meta_media_scan_observations WHERE tenant_id=$1 AND job_key=$2`,
  insert: `INSERT INTO meta_media_inspection_retry_requests(tenant_id,job_key,requested_task_version,actor_external_user_id,retry_number,idempotency_key)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING retry_number AS "retryNumber"`,
  enqueue: `UPDATE meta_media_tasks SET version=version+1,operator_retry_count=operator_retry_count+1,status='pending',next_attempt_at=clock_timestamp()
    WHERE tenant_id=$1 AND job_key=$2 AND kind='inspect' AND version=$3 AND status='recovery-required' RETURNING version`,
  audit: `INSERT INTO audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,idempotency_key,metadata_json)
    VALUES($1,$2,'meta.history.media-inspection-retry','meta_media_upload_job',$3,$4,$5::jsonb) RETURNING id`,
});
const fail = (code: MetaMediaInspectionRetryError["code"]): never => { throw new MetaMediaInspectionRetryError(code); };
async function one(tx: PostgresTransaction, sql: string, parameters: readonly PostgresParameter[]) {
  return requirePostgresRows(await tx.query(sql, parameters), 1)[0] ?? null;
}
// Same lock order as acquisition/inspection: source, memberships, upload, task.
// This operation records intent only; the existing inspection Worker performs
// its own current source/actor/claim checks before any read-only S3 operation.
export function createPostgresMetaMediaInspectionRetryRepository(transactions: PostgresTransactionManager): MetaMediaInspectionRetryRepository {
  return Object.freeze({
    async request(rawSession, rawInput, idempotencyKey) {
      const session = Object.freeze({ ...rawSession }), input = parseMetaMediaInspectionRetryInput(rawInput);
      if (!input || idempotencyKey !== await metaMediaInspectionRetryKey(input)) return fail("INVALID_REQUEST");
      try {
        requireTenantPermission(session, "workspace.manage");
        if (!Number.isSafeInteger(session.tenantId) || session.tenantId < 1 || typeof session.externalUserId !== "string" ||
          !session.externalUserId || session.externalUserId.length > 512 || session.externalUserId.trim() !== session.externalUserId ||
          /[\u0000-\u001f\u007f]/.test(session.externalUserId)) return fail("PERMISSION_DENIED");
        return await transactions.transaction({ isolationLevel: "read-committed" }, async tx => {
          const scope = [session.tenantId, input.jobKey];
          const rawJob = await one(tx, postgresMetaMediaUploadSql.read, scope);
          if (!rawJob) return fail("CONFLICT");
          const initial = await parsePostgresMetaMediaUploadJob(rawJob);
          const bound = await readPostgresBoundMetaHistoryMedia(tx, session.tenantId, initial.intent.messageKey);
          if (!bound || await sha256Hex(new TextEncoder().encode(JSON.stringify(bound))) !== initial.intent.sourceSha256) return fail("CONFLICT");
          const owners = requirePostgresRows(await tx.query(postgresMetaMediaInspectionRetrySql.owners,
            [session.tenantId, session.externalUserId, initial.intent.actor]), 2).map(row => requireExactPostgresRow(row, ["actor"]).actor);
          if (!owners.includes(session.externalUserId) || !owners.includes(initial.intent.actor)) return fail("PERMISSION_DENIED");
          const locked = await one(tx, postgresMetaMediaUploadSql.lock, scope);
          if (!locked) return fail("CONFLICT");
          const job = await parsePostgresMetaMediaUploadJob(locked);
          if (JSON.stringify(job.intent) !== JSON.stringify(initial.intent)) return fail("CONFLICT");
          const previous = await one(tx, postgresMetaMediaInspectionRetrySql.existing, [session.tenantId, session.externalUserId, idempotencyKey]);
          if (previous) {
            const value = requireExactPostgresRow(previous, ["jobKey", "expectedVersion"]);
            if (value.jobKey !== input.jobKey || parsePostgresPositiveInteger(value.expectedVersion) !== input.expectedVersion) return fail("CONFLICT");
            return "already-requested";
          }
          if (!["dispatching", "reconciliation-required", "quarantined"].includes(job.status) || (job.status === "dispatching" && !job.expired)) return fail("CONFLICT");
          const rawTask = await one(tx, postgresMetaMediaInspectionRetrySql.task, scope);
          if (!rawTask) return fail("CONFLICT");
          const task = requireExactPostgresRow(rawTask, ["version", "attempts", "operatorRetries", "status"]);
          if (!Number.isSafeInteger(task.operatorRetries) || Number(task.operatorRetries) < 0 || Number(task.operatorRetries) >= 3 ||
            task.status !== "recovery-required" || task.version !== input.expectedVersion || task.attempts !== 12 + Number(task.operatorRetries)) return fail("CONFLICT");
          const evidence = requireExactPostgresRow(await one(tx, postgresMetaMediaInspectionRetrySql.evidence, scope), ["blocked"]);
          if (evidence.blocked !== false) return fail("CONFLICT");
          const current = await readPostgresBoundMetaHistoryMedia(tx, session.tenantId, initial.intent.messageKey);
          if (!current || await sha256Hex(new TextEncoder().encode(JSON.stringify(current))) !== initial.intent.sourceSha256) return fail("CONFLICT");
          const retryNumber = Number(task.operatorRetries) + 1;
          const inserted = requireExactPostgresRow(await one(tx, postgresMetaMediaInspectionRetrySql.insert,
            [session.tenantId, input.jobKey, input.expectedVersion, session.externalUserId, retryNumber, idempotencyKey]), ["retryNumber"]);
          if (inserted.retryNumber !== retryNumber) return fail("DEPENDENCY_UNAVAILABLE");
          const queued = requireExactPostgresRow(await one(tx, postgresMetaMediaInspectionRetrySql.enqueue, [...scope, input.expectedVersion]), ["version"]);
          if (queued.version !== input.expectedVersion + 1) return fail("DEPENDENCY_UNAVAILABLE");
          parsePostgresPositiveInteger(requireExactPostgresRow(await one(tx, postgresMetaMediaInspectionRetrySql.audit,
            [session.tenantId, session.externalUserId, input.jobKey, idempotencyKey, JSON.stringify({ requestedTaskVersion: input.expectedVersion, retryNumber })]), ["id"]).id);
          return "queued";
        });
      } catch (error) {
        if (error instanceof MetaMediaInspectionRetryError) throw error;
        if (error instanceof TenantSessionError) return fail("PERMISSION_DENIED");
        return fail("DEPENDENCY_UNAVAILABLE");
      }
    },
  } satisfies MetaMediaInspectionRetryRepository);
}
