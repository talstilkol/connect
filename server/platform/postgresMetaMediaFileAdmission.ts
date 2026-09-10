import type { TenantSession } from "../auth/tenantSession.ts";
import { MetaMediaFileReadError } from "../meta/metaMediaFileRead.ts";
import { createPostgresMetaMediaFileAuthorization } from "./postgresMetaMediaFileAuthorization.ts";
import { parsePostgresPositiveInteger, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresTransactionManager } from "./postgresTransaction.ts";

// Connect pilot quota, not a Meta limit. The current source authorization holds
// the tenant's history-session lock, serializing admissions across API replicas.
export const postgresMetaMediaFileAdmissionSql = Object.freeze({
  recent: `SELECT id FROM audit_logs WHERE tenant_id=$1 AND actor_external_user_id=$2
    AND action='meta.media.file.read-admitted' AND created_at>(SELECT clock_timestamp()-interval '60 seconds')
    ORDER BY created_at DESC LIMIT 10`,
  insert: `INSERT INTO audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json,created_at)
    VALUES($1,$2,'meta.media.file.read-admitted','message',$3,'{"phase":"read-admitted"}'::jsonb,clock_timestamp()) RETURNING id`,
});
export function createPostgresMetaMediaFileAdmission(transactions: PostgresTransactionManager) {
  return async (session: TenantSession, messageKey: string): Promise<void> => {
    try {
      await transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        const authorization = createPostgresMetaMediaFileAuthorization({ transaction: async (_options, execute) => execute(tx) });
        await authorization.authorize(session, messageKey);
        const parameters = [session.tenantId, session.externalUserId];
        const recent = requirePostgresRows(await tx.query(postgresMetaMediaFileAdmissionSql.recent, parameters), 10);
        if (recent.length >= 10) throw new MetaMediaFileReadError("RATE_LIMITED");
        const row = requirePostgresRows(await tx.query(postgresMetaMediaFileAdmissionSql.insert, [...parameters, messageKey]), 1)[0];
        parsePostgresPositiveInteger(requireExactPostgresRow(row, ["id"]).id);
      });
    } catch (error) {
      if (error instanceof MetaMediaFileReadError) throw error;
      throw new MetaMediaFileReadError("DEPENDENCY_UNAVAILABLE");
    }
  };
}
