import { requireTenantPermission, TenantSessionError, type TenantSession } from "../auth/tenantSession.ts";
import { META_MEDIA_TASKS_PAGE_SIZE, parseMetaMediaTaskCursor, parseMetaMediaTaskPage, parseMetaMediaTaskView,
  type MetaMediaTaskCursor, type MetaMediaTaskPage } from "../../shared/domain/metaMediaTaskView.ts";
import { parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresQueryExecutor } from "./postgresTransaction.ts";
export class MetaMediaTaskReadError extends Error {
  readonly code: "INVALID_REQUEST" | "DEPENDENCY_UNAVAILABLE";
  constructor(code: MetaMediaTaskReadError["code"]) { super(`Media task read failed: ${code}`); this.name = "MetaMediaTaskReadError"; this.code = code; }
}
export interface MetaMediaTaskReader { read(session: TenantSession, after?: MetaMediaTaskCursor | null): Promise<Readonly<MetaMediaTaskPage>> }

// A single statement binds current owner authorization, cursor and rows to one
// snapshot. Diagnostics survive a disconnected provider without granting access
// to media contents or exposing the original actor/provider identifiers.
export const postgresMetaMediaTaskReadSql = `WITH authorized AS MATERIALIZED (
  SELECT tenant.id FROM tenants tenant JOIN tenant_memberships membership ON membership.tenant_id=tenant.id
  WHERE tenant.id=$1 AND tenant.status IN ('active','trial','payment_failed')
    AND membership.external_user_id=$2 AND membership.status='active' AND membership.role='owner'
), anchor AS MATERIALIZED (
  SELECT $3::text IS NULL OR EXISTS (SELECT 1 FROM meta_media_tasks WHERE tenant_id=$1 AND job_key=$3 AND kind=$4) AS valid
), page AS MATERIALIZED (
  SELECT task.job_key AS "jobKey",task.kind,task.status,task.attempts,task.version,task.operator_retry_count AS "operatorRetries",task.updated_at AS "updatedAt",
    CASE WHEN task.status='pending' THEN task.next_attempt_at ELSE NULL END AS "nextAttemptAt",
    task.lease_expires_at AS "leaseExpiresAt",COALESCE(task.lease_expires_at<=statement_timestamp(),FALSE) AS "leaseExpired"
  FROM meta_media_tasks task JOIN authorized ON authorized.id=task.tenant_id CROSS JOIN anchor
  WHERE anchor.valid AND ($3::text IS NULL OR (task.job_key COLLATE "C",task.kind COLLATE "C") > ($3::text COLLATE "C",$4::text COLLATE "C"))
  ORDER BY task.job_key COLLATE "C",task.kind COLLATE "C" LIMIT 51
)
SELECT EXISTS(SELECT 1 FROM authorized) AS authorized,(SELECT valid FROM anchor) AS "cursorValid",
  COALESCE((SELECT jsonb_agg(to_jsonb(entry) ORDER BY entry."jobKey" COLLATE "C",entry.kind COLLATE "C") FROM (
    SELECT page.*,
      CASE WHEN cleanup.job_key IS NULL THEN NULL ELSE jsonb_build_object('status',cleanup.status,'attempts',cleanup.attempts) END AS cleanup,
      (cleanup.job_key IS NULL AND page.kind='inspect' AND page.status IN ('blocked','recovery-required')
        AND EXISTS(SELECT 1 FROM meta_media_upload_jobs j WHERE j.tenant_id=$1 AND j.job_key=page."jobKey" AND j.status='quarantined' AND j.object_version_id IS NOT NULL
          AND NOT EXISTS(SELECT 1 FROM meta_media_scan_observations s WHERE s.job_key=j.job_key AND s.object_version_id<>j.object_version_id))
        AND NOT EXISTS(SELECT 1 FROM meta_media_tasks other WHERE other.job_key=page."jobKey" AND other.status IN ('pending','running'))) AS "canCleanup",
      COALESCE(evidence.results,ARRAY[]::text[]) AS "scanResults",evidence.versions>1 AS "multipleScanVersions"
    FROM page LEFT JOIN meta_media_cleanup_jobs cleanup ON cleanup.tenant_id=$1 AND cleanup.job_key=page."jobKey" LEFT JOIN LATERAL (SELECT array_agg(DISTINCT result COLLATE "C" ORDER BY result COLLATE "C") AS results,
      COUNT(DISTINCT object_version_id) AS versions FROM meta_media_scan_observations WHERE job_key=page."jobKey" AND tenant_id=$1) evidence ON TRUE
  ) entry),'[]'::jsonb) AS tasks`;

export function createPostgresMetaMediaTaskReader(queries: PostgresQueryExecutor): MetaMediaTaskReader {
  return Object.freeze({
    async read(rawSession, rawAfter = null) {
      const session = Object.freeze({ ...rawSession });
      requireTenantPermission(session, "workspace.manage");
      if (!Number.isSafeInteger(session.tenantId) || session.tenantId <= 0 || typeof session.externalUserId !== "string" ||
        session.externalUserId.length < 1 || session.externalUserId.length > 512 || session.externalUserId.trim() !== session.externalUserId || /[\u0000-\u001f\u007f]/.test(session.externalUserId)) throw new MetaMediaTaskReadError("INVALID_REQUEST");
      const after = rawAfter === null ? null : parseMetaMediaTaskCursor(rawAfter);
      if (rawAfter !== null && after === null) throw new MetaMediaTaskReadError("INVALID_REQUEST");
      try {
        const rows = requirePostgresRows(await queries.query(postgresMetaMediaTaskReadSql,
          [session.tenantId, session.externalUserId, after?.jobKey ?? null, after?.kind ?? null]), 1);
        const result = requireExactPostgresRow(rows[0], ["authorized", "cursorValid", "tasks"]);
        if (typeof result.authorized !== "boolean" || typeof result.cursorValid !== "boolean") throw new Error("Invalid authorization result");
        if (!result.authorized) throw new TenantSessionError("PERMISSION_DENIED", "Current workspace owner is required");
        if (!result.cursorValid) throw new MetaMediaTaskReadError("INVALID_REQUEST");
        if (!Array.isArray(result.tasks) || result.tasks.length > META_MEDIA_TASKS_PAGE_SIZE + 1) throw new Error("Invalid bounded page");
        const tasks = result.tasks.map((raw) => {
          const row = requireExactPostgresRow(raw, ["jobKey", "kind", "status", "attempts", "version", "operatorRetries", "canCleanup", "cleanup", "updatedAt", "nextAttemptAt", "leaseExpiresAt", "leaseExpired", "scanResults", "multipleScanVersions"]);
          const parsed = parseMetaMediaTaskView({ ...row, updatedAt: parsePostgresTimestamp(row.updatedAt),
            nextAttemptAt: row.nextAttemptAt === null ? null : parsePostgresTimestamp(row.nextAttemptAt),
            leaseExpiresAt: row.leaseExpiresAt === null ? null : parsePostgresTimestamp(row.leaseExpiresAt) });
          if (!parsed) throw new Error("Invalid media task row");
          return parsed;
        });
        const visible = tasks.slice(0, META_MEDIA_TASKS_PAGE_SIZE), last = visible[visible.length - 1];
        const page = parseMetaMediaTaskPage({ tasks: visible, nextCursor: tasks.length > META_MEDIA_TASKS_PAGE_SIZE ? { jobKey: last.jobKey, kind: last.kind } : null });
        if (!page || (after !== null && tasks.some(task => task.jobKey < after.jobKey || (task.jobKey === after.jobKey && task.kind <= after.kind)))) throw new Error("Invalid media task page");
        // Validate the look-ahead row as well; malformed adapter output must
        // never be hidden by trimming the public page.
        if (tasks.length > 1 && tasks.some((t, i) => i > 0 && (tasks[i-1].jobKey > t.jobKey || (tasks[i-1].jobKey === t.jobKey && tasks[i-1].kind >= t.kind)))) throw new Error("Invalid media task ordering");
        return page;
      } catch (error) {
        if (error instanceof TenantSessionError || error instanceof MetaMediaTaskReadError) throw error;
        throw new MetaMediaTaskReadError("DEPENDENCY_UNAVAILABLE");
      }
    },
  } satisfies MetaMediaTaskReader);
}
