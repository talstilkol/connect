import { parseMetaSignupAttemptResult } from '../meta/metaSignupAttempt.ts';
import type { MetaConnectionRecord } from "../../shared/domain/metaConnection.ts";
import { parseMetaDataSyncView, type MetaDataSyncView, type MetaDataSyncViewStage } from "../../shared/domain/metaDataSyncView.ts";
import { MetaDataSyncError, requireMetaDataSyncTenant } from "../meta/metaDataSync.ts";
import { postgresMetaDataSyncSql } from "./postgresMetaDataSyncRepository.ts";
import { parsePostgresPositiveInteger, parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresQueryExecutor, PostgresTransactionManager } from "./postgresTransaction.ts";

export interface MetaDataSyncLifecycleReader {
  readView(tenantId: number, connection: MetaConnectionRecord | null): Promise<Readonly<MetaDataSyncView> | null>;
}
export const postgresMetaDataSyncLifecycleSql = Object.freeze({
  // Before preparation, the completed signup job is the only sync evidence.
  // Exclude an onboarding that appeared after the first read; never invent a
  // fresh "awaiting" state over already prepared requests.
  jobView: `SELECT job.status,clock_timestamp()>=job.started_at+INTERVAL '24 hours' AS expired,
    receipt.response_json AS result,connection.status AS "connectionStatus",connection.version AS "connectionVersion",
    connection.waba_id AS "wabaId",connection.phone_number_id AS "phoneNumberId",connection.business_portfolio_id AS "businessPortfolioId"
    FROM meta_coexistence_sync_jobs AS job
    JOIN tenants AS tenant ON tenant.id=job.tenant_id
    JOIN meta_signup_launches AS launch ON launch.id=job.launch_id AND launch.tenant_id=job.tenant_id
    JOIN railway_api_mutation_receipts AS receipt ON receipt.tenant_id=launch.tenant_id AND receipt.operation=launch.operation
      AND receipt.idempotency_key=launch.claim_key AND receipt.request_digest=launch.request_digest AND receipt.actor_external_user_id=launch.actor_external_user_id
    LEFT JOIN meta_connections AS connection ON connection.tenant_id=job.tenant_id
    WHERE job.tenant_id=$1 AND tenant.status IN ('active','trial','payment_failed')
      AND NOT EXISTS (SELECT 1 FROM meta_data_sync_onboardings WHERE tenant_id=job.tenant_id)
    ORDER BY job.launch_id DESC LIMIT 1`,
  // Selection only; all eligibility is recomputed after locking below.
  candidate: `SELECT DISTINCT request.tenant_id AS "tenantId" FROM meta_data_sync_requests AS request
    JOIN tenants AS tenant ON tenant.id = request.tenant_id
    LEFT JOIN meta_connections AS connection ON connection.tenant_id = request.tenant_id
    LEFT JOIN meta_data_sync_requests AS contacts ON contacts.tenant_id = request.tenant_id AND contacts.sync_type = 'smb_app_state_sync'
    WHERE request.status = 'prepared' AND (
      tenant.status NOT IN ('active', 'trial', 'payment_failed') OR connection.status IS DISTINCT FROM 'connected'
      OR connection.waba_id IS DISTINCT FROM request.waba_id OR connection.phone_number_id IS DISTINCT FROM request.phone_number_id
      OR connection.version IS DISTINCT FROM request.connection_version OR clock_timestamp() >= request.started_at + INTERVAL '24 hours'
      OR (request.sync_type = 'history' AND contacts.status IN ('unknown', 'rejected', 'expired', 'cancelled')))
    ORDER BY request.tenant_id LIMIT 1`,
  tenant: `SELECT status FROM tenants WHERE id = $1 FOR SHARE`,
  requests: `SELECT sync_type AS "syncType", status, waba_id AS "wabaId", phone_number_id AS "phoneNumberId",
    connection_version AS version, started_at AS "startedAt" FROM meta_data_sync_requests
    WHERE tenant_id = $1 ORDER BY sync_type FOR UPDATE`,
  view: `SELECT onboarding.started_at AS "startedAt", onboarding.baseline_connection_version AS "baselineVersion",
    connection.status AS "connectionStatus", connection.version AS "connectionVersion",
    connection.waba_id AS "wabaId", connection.phone_number_id AS "phoneNumberId", connection.business_portfolio_id AS "businessPortfolioId",
    COALESCE(contacts.status, 'not-prepared') AS contacts, COALESCE(history.status, 'not-prepared') AS history,
    (contacts.tenant_id IS NULL OR (contacts.waba_id = connection.waba_id AND contacts.phone_number_id = connection.phone_number_id
      AND contacts.connection_version = connection.version AND contacts.started_at = onboarding.started_at)) AND
    (history.tenant_id IS NULL OR (history.waba_id = connection.waba_id AND history.phone_number_id = connection.phone_number_id
      AND history.connection_version = connection.version AND history.started_at = onboarding.started_at)) AS "sameBinding",
    clock_timestamp() >= onboarding.started_at + INTERVAL '24 hours' AS expired,
    session.sharing_state AS "sharingState", session.has_conflict AS "hasConflict", session.max_progress AS "providerProgress",
    (SELECT count(*) FROM meta_history_sync_chunks AS chunk WHERE chunk.tenant_id = session.tenant_id AND NOT chunk.conflicted AND chunk.payload IS NOT NULL) AS "receivedChunks",
    (SELECT count(*) FROM meta_history_sync_chunks AS chunk JOIN meta_history_inbox_cursors AS cursor
      ON cursor.tenant_id = chunk.tenant_id AND cursor.phase = chunk.phase AND cursor.chunk_order = chunk.chunk_order AND cursor.content_digest = chunk.content_digest
      WHERE chunk.tenant_id = session.tenant_id AND NOT chunk.conflicted AND chunk.payload IS NOT NULL
        AND cursor.next_index = jsonb_array_length(chunk.payload->'messages')) AS "processedChunks",
    (SELECT count(*) FROM meta_history_inbox_messages AS message WHERE message.tenant_id = session.tenant_id AND NOT message.conflicted) AS "projectedMessages"
    FROM tenants AS tenant JOIN meta_data_sync_onboardings AS onboarding ON onboarding.tenant_id = tenant.id
    LEFT JOIN meta_connections AS connection ON connection.tenant_id = tenant.id
    LEFT JOIN meta_data_sync_requests AS contacts ON contacts.tenant_id = tenant.id AND contacts.sync_type = 'smb_app_state_sync'
    LEFT JOIN meta_data_sync_requests AS history ON history.tenant_id = tenant.id AND history.sync_type = 'history'
    LEFT JOIN meta_history_sync_sessions AS session ON session.tenant_id = tenant.id AND session.started_at = onboarding.started_at
      AND session.waba_id = connection.waba_id AND session.phone_number_id = connection.phone_number_id AND session.connection_version = connection.version
    WHERE tenant.id = $1 AND tenant.status IN ('active', 'trial', 'payment_failed')`,
});
const terminalFailures = new Set(["unknown", "rejected", "expired", "cancelled"]);
function fail(): never { throw new MetaDataSyncError("SYNC_LIFECYCLE_UNAVAILABLE"); }
function count(value: unknown): number {
  if (value === 0 || value === "0") return 0;
  return parsePostgresPositiveInteger(value);
}
export function createPostgresMetaDataSyncLifecycle(dependencies: Readonly<{
  queries: PostgresQueryExecutor; transactions: PostgresTransactionManager;
}>) {
  async function readJobView(tenantId: number, expected: MetaConnectionRecord | null): Promise<Readonly<MetaDataSyncView> | null> {
    const raw = requirePostgresRows(await dependencies.queries.query(postgresMetaDataSyncLifecycleSql.jobView,[tenantId]),1)[0];
    if (raw===undefined) return null;
    const row = requireExactPostgresRow(raw,['status','expired','result','connectionStatus','connectionVersion','wabaId','phoneNumberId','businessPortfolioId']);
    if (typeof row.expired!=='boolean' || !['pending','running','requests-accepted','cancelled','recovery-required'].includes(String(row.status))) return fail();
    const result = parseMetaSignupAttemptResult(row.result);
    if (result?.status!=='connected') return fail();
    if (expected===null ? row.connectionVersion!==null : row.connectionVersion===null ||
      parsePostgresPositiveInteger(row.connectionVersion)!==expected.version || row.connectionStatus!==expected.status ||
      row.wabaId!==expected.wabaId || row.phoneNumberId!==expected.phoneNumberId || row.businessPortfolioId!==expected.businessPortfolioId) return fail();
    const changed = row.connectionStatus!=='connected' || row.connectionVersion===null || parsePostgresPositiveInteger(row.connectionVersion)!==result.connectionVersion;
    if (row.status==='requests-accepted' && !changed) return fail();
    return Object.freeze({ stage:changed ? 'connection-changed' : row.expired || row.status==='cancelled' || row.status==='recovery-required' ? 'recovery-required' : 'awaiting-worker',
      contacts:'not-prepared',history:'not-prepared',providerProgress:null,receivedChunks:0,processedChunks:0,projectedMessages:0 });
  }
  return Object.freeze({
    async readView(rawTenantId: number, expected: MetaConnectionRecord | null): Promise<Readonly<MetaDataSyncView> | null> {
      const tenantId = requireMetaDataSyncTenant(rawTenantId);
      if (expected !== null && expected.tenantId !== tenantId) return fail();
      const value = requirePostgresRows(await dependencies.queries.query(postgresMetaDataSyncLifecycleSql.view, [tenantId]), 1)[0];
      if (value === undefined) return readJobView(tenantId,expected);
      const row = requireExactPostgresRow(value, ["startedAt", "baselineVersion", "connectionStatus", "connectionVersion", "wabaId", "phoneNumberId", "businessPortfolioId",
        "contacts", "history", "sameBinding", "expired", "sharingState", "hasConflict", "providerProgress", "receivedChunks", "processedChunks", "projectedMessages"]);
      parsePostgresTimestamp(row.startedAt);
      // A connection changing between the existing read and this snapshot must
      // not attach another authorization generation's sync state to that read.
      if (expected === null ? row.connectionVersion !== null :
        row.connectionVersion === null || parsePostgresPositiveInteger(row.connectionVersion) !== expected.version || row.connectionStatus !== expected.status ||
        row.wabaId !== expected.wabaId || row.phoneNumberId !== expected.phoneNumberId || row.businessPortfolioId !== expected.businessPortfolioId) return fail();
      if (typeof row.expired !== "boolean" || (row.sameBinding !== null && typeof row.sameBinding !== "boolean") ||
        (row.hasConflict !== null && typeof row.hasConflict !== "boolean")) return fail();
      let stage: MetaDataSyncViewStage;
      const prepared = row.contacts === "not-prepared" && row.history === "not-prepared";
      if (prepared) stage = row.expired ? "recovery-required" : "awaiting-registration";
      else if (row.connectionStatus !== "connected" || row.sameBinding !== true) stage = "connection-changed";
      else if (row.sharingState === "declined") stage = "sharing-declined";
      else if (row.hasConflict === true) stage = "conflicted";
      else if (terminalFailures.has(String(row.contacts)) || terminalFailures.has(String(row.history)) ||
        (row.expired && [row.contacts, row.history].some((status) => status === "prepared" || status === "dispatching" || status === "not-prepared"))) stage = "recovery-required";
      else if (row.contacts === "prepared") stage = "ready-to-request";
      else if (row.contacts !== "accepted") stage = "requesting-contacts";
      else if (row.sharingState !== "data_received") stage = "requesting-history";
      else if (count(row.processedChunks) < count(row.receivedChunks)) stage = "projecting-history";
      else stage = row.providerProgress === 100 && count(row.receivedChunks) > 0 ? "awaiting-verification" : "receiving-history";
      const hide = prepared || ["connection-changed", "sharing-declined", "conflicted"].includes(stage);
      const view = parseMetaDataSyncView({ stage, contacts: row.contacts, history: row.history,
        providerProgress: hide ? null : row.providerProgress, receivedChunks: hide ? 0 : count(row.receivedChunks),
        processedChunks: hide ? 0 : count(row.processedChunks), projectedMessages: hide ? 0 : count(row.projectedMessages) });
      if (view === null) return fail();
      return view;
    },
    async reconcileNext(): Promise<"idle" | "reconciled"> {
      return dependencies.transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        const one = async (sql: string, parameters: readonly (string | number | null)[]) => requirePostgresRows(await tx.query(sql, parameters), 1)[0] ?? null;
        const candidate = await one(postgresMetaDataSyncLifecycleSql.candidate, []);
        if (candidate === null) return "idle";
        const tenantId = parsePostgresPositiveInteger(requireExactPostgresRow(candidate, ["tenantId"]).tenantId);
        // Match claim's lock order. Lock both requests after onboarding so a
        // concurrent accepted contacts response is observed before cancellation.
        const tenant = requireExactPostgresRow(await one(postgresMetaDataSyncLifecycleSql.tenant, [tenantId]), ["status"]);
        const onboarding = requireExactPostgresRow(await one(postgresMetaDataSyncSql.onboarding, [tenantId]), ["startedAt", "baselineVersion"]);
        const requests = requirePostgresRows(await tx.query(postgresMetaDataSyncLifecycleSql.requests, [tenantId]), 2).map((row) =>
          requireExactPostgresRow(row, ["syncType", "status", "wabaId", "phoneNumberId", "version", "startedAt"]));
        const rawConnection = await one(postgresMetaDataSyncSql.connection, [tenantId]);
        const connection = rawConnection === null ? null : requireExactPostgresRow(rawConnection, ["wabaId", "phoneNumberId", "version", "status", "connectedAt"]);
        const time = parsePostgresTimestamp(requireExactPostgresRow(await one(postgresMetaDataSyncSql.clock, []), ["now"]).now);
        const contacts = requests.find((request) => request.syncType === "smb_app_state_sync");
        for (const request of requests) {
          if (request.status !== "prepared") continue;
          const start = parsePostgresTimestamp(request.startedAt);
          if (start !== parsePostgresTimestamp(onboarding.startedAt)) return fail();
          const changed = !["active", "trial", "payment_failed"].includes(String(tenant.status)) || connection === null || connection.status !== "connected" ||
            connection.wabaId !== request.wabaId || connection.phoneNumberId !== request.phoneNumberId || parsePostgresPositiveInteger(connection.version) !== parsePostgresPositiveInteger(request.version);
          const expired = Date.parse(time) >= Date.parse(start) + 24 * 60 * 60 * 1000;
          const dependencyFailed = request.syncType === "history" && contacts !== undefined && terminalFailures.has(String(contacts.status));
          if (!changed && !expired && !dependencyFailed) continue;
          const status = changed ? "cancelled" : expired ? "expired" : "cancelled";
          const stopped = await one(postgresMetaDataSyncSql.stop, [tenantId, String(request.syncType), status]);
          if (stopped === null || (stopped as Record<string, unknown>).status !== status) return fail();
          const reason = changed ? "authorization-changed" : expired ? "deadline-expired" : "contacts-failed";
          const audit = await one(postgresMetaDataSyncSql.audit, [tenantId, null, "meta.data-sync.reconciled", String(request.syncType), JSON.stringify({ status, reason })]);
          parsePostgresPositiveInteger(requireExactPostgresRow(audit, ["id"]).id);
        }
        return "reconciled";
      });
    },
  });
}
