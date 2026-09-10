import { rolePermissions, type TenantRole } from "../../shared/domain/model.ts";
import { MetaMediaFileReadError, requireMetaMediaFileReadSession, type MetaMediaFileAuthorization } from "../meta/metaMediaFileRead.ts";
import { deriveMetaMediaUploadJobKey } from "../meta/metaMediaUploadJournal.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { readPostgresBoundMetaHistoryMedia } from "./postgresMetaHistoryMediaRepository.ts";
import { parsePostgresMetaMediaUploadJob, postgresMetaMediaUploadSql } from "./postgresMetaMediaUploadJournal.ts";
import { parsePostgresPositiveInteger, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresTransactionManager } from "./postgresTransaction.ts";

export const postgresMetaMediaFileAuthorizationSql = Object.freeze({
  member: `SELECT tenant_id AS "tenantId", role FROM tenant_memberships
    WHERE tenant_id=$1 AND external_user_id=$2 AND status='active' FOR SHARE`,
  scan: `SELECT COALESCE(COUNT(DISTINCT object_version_id)=1 AND bool_and(object_version_id=$3)
    AND bool_or(result='NO_THREATS_FOUND' AND content_verified)
    AND NOT bool_or(result IN ('THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED')),FALSE)
    AND NOT EXISTS(SELECT 1 FROM meta_media_cleanup_jobs WHERE tenant_id=$1 AND job_key=$2) AS eligible
    FROM meta_media_scan_observations WHERE tenant_id=$1 AND job_key=$2`,
});
// Locks last only for the database check, never across S3 I/O. Ordering follows
// acquisition: tenant/connection, request/history session, member, upload job.
// The upload-row lock serializes the scan snapshot with scan observation writes.
export function createPostgresMetaMediaFileAuthorization(transactions: PostgresTransactionManager): MetaMediaFileAuthorization {
  return Object.freeze({
    async authorize(rawSession, messageKey) {
      const session = requireMetaMediaFileReadSession(rawSession, messageKey);
      try {
        return await transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
          const bound = await readPostgresBoundMetaHistoryMedia(tx, session.tenantId, messageKey);
          if (!bound) throw new MetaMediaFileReadError("ACCESS_DENIED");
          const membership = requirePostgresRows(await tx.query(postgresMetaMediaFileAuthorizationSql.member,
            [session.tenantId, session.externalUserId]), 1)[0];
          if (!membership) throw new MetaMediaFileReadError("ACCESS_DENIED");
          const member = requireExactPostgresRow(membership, ["tenantId", "role"]);
          if (parsePostgresPositiveInteger(member.tenantId) !== session.tenantId || typeof member.role !== "string" ||
            !Object.hasOwn(rolePermissions, member.role) || !rolePermissions[member.role as TenantRole].includes("conversations.read")) {
            throw new MetaMediaFileReadError("ACCESS_DENIED");
          }
          const sourceSha256 = await sha256Hex(new TextEncoder().encode(JSON.stringify(bound)));
          const jobKey = await deriveMetaMediaUploadJobKey({ tenantId: session.tenantId, messageKey,
            connectionVersion: bound.scope.connectionVersion, sourceSha256 });
          const row = requirePostgresRows(await tx.query(postgresMetaMediaUploadSql.lock, [session.tenantId, jobKey]), 1)[0];
          if (!row) throw new MetaMediaFileReadError("NOT_READY");
          const job = await parsePostgresMetaMediaUploadJob(row);
          if (job.intent.sourceSha256 !== sourceSha256 || job.intent.messageKey !== messageKey || job.intent.tenantId !== session.tenantId ||
            job.intent.connectionVersion !== bound.scope.connectionVersion || job.status !== "quarantined" || !job.receipt) {
            throw new MetaMediaFileReadError("NOT_READY");
          }
          const scan = requireExactPostgresRow(requirePostgresRows(await tx.query(postgresMetaMediaFileAuthorizationSql.scan,
            [session.tenantId, jobKey, job.receipt.versionId]), 1)[0], ["eligible"]);
          if (typeof scan.eligible !== "boolean") throw new MetaMediaFileReadError("DEPENDENCY_UNAVAILABLE");
          if (!scan.eligible) throw new MetaMediaFileReadError("NOT_READY");
          // Echo edits/revocations do not take the history-session lock. Read
          // the source again after waits for member/job locks, so a committed
          // deletion cannot be hidden by our earlier source snapshot.
          const current = await readPostgresBoundMetaHistoryMedia(tx, session.tenantId, messageKey);
          if (!current || await sha256Hex(new TextEncoder().encode(JSON.stringify(current))) !== sourceSha256) {
            throw new MetaMediaFileReadError("ACCESS_DENIED");
          }
          return job;
        });
      } catch (error) {
        if (error instanceof MetaMediaFileReadError) throw error;
        throw new MetaMediaFileReadError("DEPENDENCY_UNAVAILABLE");
      }
    },
  } satisfies MetaMediaFileAuthorization);
}
