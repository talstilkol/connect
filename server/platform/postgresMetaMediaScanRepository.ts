import { MetaMediaUploadJournalError, validateMetaMediaUploadIntent, deriveMetaMediaUploadJobKey } from "../meta/metaMediaUploadJournal.ts";
import { validateMetaMediaScanObservation, type MetaMediaScanRepository, type MetaMediaScanState } from "../meta/metaMediaInspection.ts";
import { createPostgresMetaMediaUploadJournal, parsePostgresMetaMediaUploadJob, postgresMetaMediaUploadSql } from "./postgresMetaMediaUploadJournal.ts";
import { requirePostgresRows, requireExactPostgresRow, parsePostgresPositiveInteger } from "./postgresResultValidation.ts";
import type { PostgresTransactionManager } from "./postgresTransaction.ts";

export const postgresMetaMediaScanSql = Object.freeze({
  insert: `INSERT INTO meta_media_scan_observations(job_key,tenant_id,claim_version,object_version_id,result,content_verified)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING job_key AS "jobKey"`,
  state: `SELECT CASE WHEN COUNT(DISTINCT object_version_id)>1 THEN 'conflict'
    WHEN COALESCE(bool_or(result IN ('THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED')),FALSE) THEN 'blocked'
    WHEN COALESCE(bool_or(result='NO_THREATS_FOUND'),FALSE) THEN 'clean-observed' ELSE 'pending' END AS state
    FROM meta_media_scan_observations WHERE job_key=$1 AND tenant_id=$2`,
  audit: `INSERT INTO audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES($1,$2,'meta.history.media-scan','meta_media_upload_job',$3,$4::jsonb) RETURNING id`,
});

export function createPostgresMetaMediaScanRepository(transactions: PostgresTransactionManager): MetaMediaScanRepository {
  return Object.freeze({
    async record(rawJob, rawObservation) {
      try {
        const intent = validateMetaMediaUploadIntent(rawJob.intent);
        const suppliedJobKey = rawJob.jobKey, claimVersion = rawJob.claimVersion;
        const observation = validateMetaMediaScanObservation(rawObservation, intent);
        const jobKey = await deriveMetaMediaUploadJobKey(intent);
        if (suppliedJobKey !== jobKey || !Number.isSafeInteger(claimVersion) || claimVersion === null || claimVersion < 2) {
          throw new MetaMediaUploadJournalError("INVALID_INPUT");
        }
        return await transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
          const row = requirePostgresRows(await tx.query(postgresMetaMediaUploadSql.lock, [intent.tenantId, jobKey]), 1)[0];
          if (!row) throw new MetaMediaUploadJournalError("CONFLICT");
          const job = await parsePostgresMetaMediaUploadJob(row);
          if (job.claimVersion !== claimVersion || Object.keys(intent).some((key) => job.intent[key as keyof typeof intent] !== intent[key as keyof typeof intent]) ||
            !["dispatching", "reconciliation-required", "quarantined"].includes(job.status) ||
            (job.receipt !== null && job.receipt.versionId !== observation.versionId)) throw new MetaMediaUploadJournalError("CONFLICT");
          const inserted = requirePostgresRows(await tx.query(postgresMetaMediaScanSql.insert,
            [jobKey, intent.tenantId, claimVersion, observation.versionId, observation.result, observation.receipt !== null]), 1);
          const stateRows = requirePostgresRows(await tx.query(postgresMetaMediaScanSql.state, [jobKey, intent.tenantId]), 1);
          const state = requireExactPostgresRow(stateRows[0], ["state"]).state;
          if (!["pending", "clean-observed", "blocked", "conflict"].includes(state as string)) throw new MetaMediaUploadJournalError("DEPENDENCY_UNAVAILABLE");
          if (observation.receipt !== null && state !== "conflict") {
            // Reuse the upload transition inside this same transaction, so
            // receipt, observation and both audits commit or roll back together.
            const journal = createPostgresMetaMediaUploadJournal({ transaction: async (_options, work) => work(tx) });
            if (!await journal.finish({ jobKey, tenantId: intent.tenantId, actor: intent.actor, claimVersion }, { receipt: observation.receipt })) {
              throw new MetaMediaUploadJournalError("CONFLICT");
            }
          }
          if (inserted.length === 1) {
            const audit = requirePostgresRows(await tx.query(postgresMetaMediaScanSql.audit,
              [intent.tenantId, intent.actor, jobKey, JSON.stringify({ result: observation.result, state })]), 1);
            parsePostgresPositiveInteger(requireExactPostgresRow(audit[0], ["id"]).id);
          }
          // A previously observed clean tag is not proof that it is present
          // now. Keep the history, but report a current missing tag as pending.
          return state === "clean-observed" && observation.result === "PENDING" ? "pending" : state as MetaMediaScanState;
        });
      } catch (error) {
        if (error instanceof MetaMediaUploadJournalError) throw error;
        throw new MetaMediaUploadJournalError("DEPENDENCY_UNAVAILABLE");
      }
    },
  } satisfies MetaMediaScanRepository);
}
