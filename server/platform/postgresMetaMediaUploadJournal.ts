import { MetaMediaUploadJournalError, deriveMetaMediaUploadJobKey, validateMetaMediaUploadIntent, mediaUploadReceiptMatches,
  type MetaMediaUploadIntent, type MetaMediaUploadJob, type MetaMediaUploadClaim, type MetaMediaUploadJournal, type MetaMediaUploadStatus } from "../meta/metaMediaUploadJournal.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { readPostgresBoundMetaHistoryMedia } from "./postgresMetaHistoryMediaRepository.ts";
import { parsePostgresPositiveInteger, requirePostgresRows, requireExactPostgresRow } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";

export const META_MEDIA_UPLOAD_LEASE_MS = 5 * 60 * 1000;
const columns = `job_key AS "jobKey",tenant_id AS "tenantId",actor_external_user_id AS actor,message_key AS "messageKey",
  connection_version AS "connectionVersion",source_sha256 AS "sourceSha256",content_sha256 AS "contentSha256",media_type AS "mediaType",
  size_bytes AS "sizeBytes",bucket,object_key AS "objectKey",kms_key_arn AS "kmsKeyArn",status,version,claim_version AS "claimVersion",
  COALESCE(lease_expires_at<=clock_timestamp(),FALSE) AS expired,object_version_id AS "objectVersionId"`;
export const postgresMetaMediaUploadSql = Object.freeze({
  withdrawn: `SELECT job_key FROM meta_media_cleanup_jobs WHERE tenant_id=$1 AND job_key=$2`,
  read: `SELECT ${columns} FROM meta_media_upload_jobs WHERE tenant_id=$1 AND job_key=$2`,
  lock: `SELECT ${columns} FROM meta_media_upload_jobs WHERE tenant_id=$1 AND job_key=$2 FOR UPDATE`,
  member: `SELECT tenant_id AS "tenantId" FROM tenant_memberships WHERE tenant_id=$1 AND external_user_id=$2
    AND status='active' AND role='owner' FOR SHARE`,
  insert: `INSERT INTO meta_media_upload_jobs(job_key,tenant_id,actor_external_user_id,message_key,connection_version,source_sha256,
    content_sha256,media_type,size_bytes,bucket,object_key,kms_key_arn) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT DO NOTHING RETURNING job_key AS "jobKey"`,
  claim: `UPDATE meta_media_upload_jobs SET status='claimed',version=version+1,claim_version=version+1,
    lease_expires_at=clock_timestamp()+($4::integer*INTERVAL '1 millisecond')
    WHERE tenant_id=$1 AND job_key=$2 AND version=$3 AND (status='prepared' OR (status='claimed' AND lease_expires_at<=clock_timestamp())) RETURNING ${columns}`,
  dispatch: `UPDATE meta_media_upload_jobs SET status='dispatching',version=version+1,dispatched_at=clock_timestamp(),
    lease_expires_at=clock_timestamp()+($4::integer*INTERVAL '1 millisecond')
    WHERE tenant_id=$1 AND job_key=$2 AND claim_version=$3 AND status='claimed' AND lease_expires_at>clock_timestamp() RETURNING job_key AS "jobKey"`,
  permit: `SELECT job_key AS "jobKey" FROM meta_media_upload_jobs WHERE tenant_id=$1 AND job_key=$2 AND claim_version=$3
    AND status='dispatching' AND lease_expires_at>clock_timestamp()`,
  finish: `UPDATE meta_media_upload_jobs SET status=$4,version=version+1,lease_expires_at=NULL,object_version_id=$5,error_code=$6
    WHERE tenant_id=$1 AND job_key=$2 AND claim_version=$3 AND (status='dispatching' OR (status='reconciliation-required' AND $4='quarantined')) RETURNING job_key AS "jobKey"`,
  audit: `INSERT INTO audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES($1,$2,'meta.history.media-upload','meta_media_upload_job',$3,$4::jsonb) RETURNING id`,
});
const fail = (code: MetaMediaUploadJournalError["code"]): never => { throw new MetaMediaUploadJournalError(code); };
function validateLocator(jobKey: string, tenantId: number, actor: string) {
  if (typeof jobKey !== "string" || !/^media_upload_v1_[0-9a-f]{64}$/.test(jobKey) || !Number.isSafeInteger(tenantId) || tenantId <= 0 ||
    typeof actor !== "string" || actor.length === 0 || actor.length > 512 || actor.trim() !== actor || /[\u0000-\u001f\u007f]/.test(actor)) return fail("INVALID_INPUT");
}
function validateClaim(raw: MetaMediaUploadClaim): Readonly<MetaMediaUploadClaim> {
  if (!raw || typeof raw !== "object" || Object.keys(raw).sort().join(",") !== "actor,claimVersion,jobKey,tenantId") return fail("INVALID_INPUT");
  const claim = Object.freeze({ ...raw }); validateLocator(claim.jobKey, claim.tenantId, claim.actor);
  if (!Number.isSafeInteger(claim.claimVersion) || claim.claimVersion < 2) return fail("INVALID_INPUT");
  return claim;
}
async function one(tx: PostgresTransaction, sql: string, parameters: readonly PostgresParameter[]) {
  return requirePostgresRows(await tx.query(sql, parameters), 1)[0] ?? null;
}
export async function parsePostgresMetaMediaUploadJob(raw: unknown): Promise<Readonly<MetaMediaUploadJob>> {
  const row = requireExactPostgresRow(raw, ["jobKey","tenantId","actor","messageKey","connectionVersion","sourceSha256","contentSha256","mediaType",
    "sizeBytes","bucket","objectKey","kmsKeyArn","status","version","claimVersion","expired","objectVersionId"]);
  const intent = validateMetaMediaUploadIntent({ tenantId: parsePostgresPositiveInteger(row.tenantId), actor: row.actor as string,
    connectionVersion: parsePostgresPositiveInteger(row.connectionVersion), messageKey: row.messageKey as string, sourceSha256: row.sourceSha256 as string,
    contentSha256: row.contentSha256 as string, mediaType: row.mediaType as string, sizeBytes: parsePostgresPositiveInteger(row.sizeBytes),
    bucket: row.bucket as string, objectKey: row.objectKey as string, kmsKeyArn: row.kmsKeyArn as string });
  const jobKey = await deriveMetaMediaUploadJobKey(intent), version = parsePostgresPositiveInteger(row.version);
  if (row.jobKey !== jobKey || typeof row.expired !== "boolean" || !["prepared","claimed","dispatching","quarantined","reconciliation-required","rejected"].includes(row.status as string)) return fail("DEPENDENCY_UNAVAILABLE");
  const claimVersion = row.claimVersion === null ? null : parsePostgresPositiveInteger(row.claimVersion);
  if ((row.status === "prepared") !== (claimVersion === null) || (claimVersion !== null && (claimVersion < 2 || claimVersion > version))) return fail("DEPENDENCY_UNAVAILABLE");
  const descriptor = { tenantId: intent.tenantId, connectionVersion: intent.connectionVersion, messageKey: intent.messageKey,
    sourceSha256: intent.sourceSha256, contentSha256: intent.contentSha256, mediaType: intent.mediaType, sizeBytes: intent.sizeBytes,
    bucket: intent.bucket, objectKey: intent.objectKey };
  const receipt = row.status === "quarantined" ? Object.freeze({ ...descriptor, versionId: row.objectVersionId as string, state: "quarantined" as const }) : null;
  if (receipt !== null ? !mediaUploadReceiptMatches(receipt, intent) : row.objectVersionId !== null) return fail("DEPENDENCY_UNAVAILABLE");
  return Object.freeze({ jobKey, intent, status: row.status as MetaMediaUploadStatus, version, claimVersion, expired: row.expired, receipt });
}
async function current(tx: PostgresTransaction, intent: MetaMediaUploadIntent) {
  const bound = await readPostgresBoundMetaHistoryMedia(tx, intent.tenantId, intent.messageKey);
  if (bound === null || bound.scope.connectionVersion !== intent.connectionVersion ||
    await sha256Hex(new TextEncoder().encode(JSON.stringify(bound))) !== intent.sourceSha256) return fail("AUTHORIZATION_CHANGED");
  const member = await one(tx, postgresMetaMediaUploadSql.member, [intent.tenantId, intent.actor]);
  if (member === null) return fail("AUTHORIZATION_CHANGED");
  if (parsePostgresPositiveInteger(requireExactPostgresRow(member, ["tenantId"]).tenantId) !== intent.tenantId) return fail("DEPENDENCY_UNAVAILABLE");
}
async function audit(tx: PostgresTransaction, job: Pick<MetaMediaUploadJob, "jobKey" | "intent">, status: MetaMediaUploadStatus) {
  const result = await one(tx, postgresMetaMediaUploadSql.audit, [job.intent.tenantId, job.intent.actor, job.jobKey, JSON.stringify({ status })]);
  parsePostgresPositiveInteger(requireExactPostgresRow(result, ["id"]).id);
}
function sameIntent(left: MetaMediaUploadIntent, right: MetaMediaUploadIntent) {
  return Object.keys(left).every((key) => left[key as keyof MetaMediaUploadIntent] === right[key as keyof MetaMediaUploadIntent]);
}
export function createPostgresMetaMediaUploadJournal(transactions: PostgresTransactionManager,
  options: Readonly<{ leaseDurationMs?: number }> = {}): MetaMediaUploadJournal {
  const lease = options.leaseDurationMs ?? META_MEDIA_UPLOAD_LEASE_MS;
  if (!Number.isSafeInteger(lease) || lease < 250 || lease > META_MEDIA_UPLOAD_LEASE_MS || Object.keys(options).some((key) => key !== "leaseDurationMs")) return fail("INVALID_INPUT");
  const transaction = async <T>(work: (tx: PostgresTransaction) => Promise<T>): Promise<T> => {
    try { return await transactions.transaction({ isolationLevel: "read-committed" }, work); }
    catch (error) { if (error instanceof MetaMediaUploadJournalError) throw error; return fail("DEPENDENCY_UNAVAILABLE"); }
  };
  async function lockCurrent(tx: PostgresTransaction, jobKey: string, tenantId: number, actor: string) {
    const raw = await one(tx, postgresMetaMediaUploadSql.read, [tenantId, jobKey]);
    if (raw === null) return null;
    const snapshot = await parsePostgresMetaMediaUploadJob(raw);
    if (snapshot.intent.actor !== actor) return fail("AUTHORIZATION_CHANGED");
    await current(tx, snapshot.intent);
    const job = await parsePostgresMetaMediaUploadJob(await one(tx, postgresMetaMediaUploadSql.lock, [tenantId, jobKey]));
    if (await one(tx,postgresMetaMediaUploadSql.withdrawn,[tenantId,jobKey])) return fail("AUTHORIZATION_CHANGED");
    if (!sameIntent(job.intent, snapshot.intent)) return fail("CONFLICT");
    return job;
  }
  return Object.freeze({
    async lookup(jobKey, tenantId, actor) {
      validateLocator(jobKey, tenantId, actor);
      return transaction((tx) => lockCurrent(tx, jobKey, tenantId, actor));
    },
    async prepare(raw) {
      const intent = validateMetaMediaUploadIntent(raw), jobKey = await deriveMetaMediaUploadJobKey(intent);
      return transaction(async (tx) => {
        await current(tx, intent);
        const inserted = await one(tx, postgresMetaMediaUploadSql.insert, [jobKey,intent.tenantId,intent.actor,intent.messageKey,intent.connectionVersion,
          intent.sourceSha256,intent.contentSha256,intent.mediaType,intent.sizeBytes,intent.bucket,intent.objectKey,intent.kmsKeyArn]);
        const job = await parsePostgresMetaMediaUploadJob(await one(tx, postgresMetaMediaUploadSql.lock, [intent.tenantId,jobKey]));
        if (await one(tx,postgresMetaMediaUploadSql.withdrawn,[intent.tenantId,jobKey])) return fail("AUTHORIZATION_CHANGED");
        if (!sameIntent(job.intent, intent)) return fail("CONFLICT");
        if (inserted !== null) await audit(tx, job, "prepared");
        return job;
      });
    },
    async claim(jobKey, tenantId, actor) {
      validateLocator(jobKey, tenantId, actor);
      return transaction(async (tx) => {
        const job = await lockCurrent(tx, jobKey, tenantId, actor);
        if (job === null) return null;
        const updated = await one(tx, postgresMetaMediaUploadSql.claim, [tenantId,jobKey,job.version,lease]);
        if (updated === null) return null;
        const claimed = await parsePostgresMetaMediaUploadJob(updated); await audit(tx, claimed, "claimed");
        return Object.freeze({ jobKey, tenantId, actor, claimVersion: claimed.claimVersion! });
      });
    },
    async dispatch(raw) {
      const claim = validateClaim(raw);
      return transaction(async (tx) => {
        const job = await lockCurrent(tx, claim.jobKey, claim.tenantId, claim.actor);
        if (job === null || job.claimVersion !== claim.claimVersion) return false;
        const updated = await one(tx, postgresMetaMediaUploadSql.dispatch, [claim.tenantId,claim.jobKey,claim.claimVersion,lease]);
        if (updated === null) return false;
        await audit(tx,job,"dispatching"); return true;
      });
    },
    async checkDispatched(raw) {
      const claim = validateClaim(raw);
      return transaction(async (tx) => {
        const job = await lockCurrent(tx, claim.jobKey, claim.tenantId, claim.actor);
        if (job === null || job.status !== "dispatching" || job.claimVersion !== claim.claimVersion) return false;
        return await one(tx, postgresMetaMediaUploadSql.permit, [claim.tenantId,claim.jobKey,claim.claimVersion]) !== null;
      });
    },
    async finish(raw, rawOutcome) {
      const claim = validateClaim(raw);
      if (!rawOutcome || typeof rawOutcome !== "object" || !["receipt","errorCode"].includes(Object.keys(rawOutcome).join(","))) return fail("INVALID_INPUT");
      const outcome = "receipt" in rawOutcome ? { receipt: Object.freeze({ ...rawOutcome.receipt }) } : { errorCode: rawOutcome.errorCode };
      return transaction(async (tx) => {
        // Finishing records what happened under this historical dispatch;
        // current authorization cannot erase remote truth after a revocation.
        const record = await one(tx, postgresMetaMediaUploadSql.lock, [claim.tenantId,claim.jobKey]);
        if (record === null) return false;
        const job = await parsePostgresMetaMediaUploadJob(record);
        if (job.intent.actor !== claim.actor || job.claimVersion !== claim.claimVersion) return false;
        const receipt = "receipt" in outcome ? outcome.receipt ?? null : null;
        if (receipt ? !mediaUploadReceiptMatches(receipt,job.intent) : !["WRITE_REJECTED","RECONCILIATION_REQUIRED"].includes(outcome.errorCode!)) return fail("CONFLICT");
        const status = receipt ? "quarantined" : outcome.errorCode === "WRITE_REJECTED" ? "rejected" : "reconciliation-required";
        if (job.status === status) return receipt === null || job.receipt?.versionId === receipt.versionId;
        const updated = await one(tx, postgresMetaMediaUploadSql.finish,
          [claim.tenantId,claim.jobKey,claim.claimVersion,status,receipt?.versionId ?? null,receipt ? null : outcome.errorCode!]);
        if (updated === null) return false;
        await audit(tx,job,status); return true;
      });
    },
  } satisfies MetaMediaUploadJournal);
}
