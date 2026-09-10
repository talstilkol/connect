import { requireTenantPermission, type TenantSession } from "../auth/tenantSession.ts";
import { MetaDataSyncError, requireMetaDataSyncTenant, requireMetaDataSyncType, validateMetaDataSyncRequest,
  validateMetaDataSyncResult, type MetaDataSyncRepository, type MetaDataSyncRequest, type MetaDataSyncResult, type MetaDataSyncType } from "../meta/metaDataSync.ts";
import { parsePostgresPositiveInteger, parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";
import { parseMetaSignupAttemptResult } from '../meta/metaSignupAttempt.ts';
import { lockMetaSignupLaunchTenant } from './postgresMetaSignupLaunchRepository.ts';

const columns = `tenant_id AS "tenantId", waba_id AS "wabaId", phone_number_id AS "phoneNumberId",
  connection_version AS "connectionVersion", sync_type AS "syncType", started_at AS "startedAt", status, request_id AS "requestId"`;
const keys = ["tenantId", "wabaId", "phoneNumberId", "connectionVersion", "syncType", "startedAt", "status", "requestId"];
export const postgresMetaDataSyncSql = Object.freeze({
  continuationActor: `SELECT job.actor_external_user_id AS actor,job.status FROM meta_data_sync_onboardings AS onboarding
    JOIN meta_coexistence_sync_jobs AS job ON job.tenant_id=onboarding.tenant_id AND job.launch_id=onboarding.signup_launch_id
    WHERE onboarding.tenant_id=$1 FOR SHARE OF job`,
  currentOwner: `SELECT id FROM tenant_memberships WHERE tenant_id=$1 AND external_user_id=$2
    AND status='active' AND role='owner' FOR SHARE`,
  tenant: `SELECT id FROM tenants WHERE id = $1 AND status IN ('active', 'trial', 'payment_failed') FOR SHARE`,
  begin: `INSERT INTO meta_data_sync_onboardings (tenant_id, actor_external_user_id, baseline_connection_version)
    VALUES ($1, $2, (SELECT version FROM meta_connections WHERE tenant_id = $1)) ON CONFLICT DO NOTHING RETURNING tenant_id AS "tenantId"`,
  onboarding: `SELECT started_at AS "startedAt", baseline_connection_version AS "baselineVersion"
    FROM meta_data_sync_onboardings WHERE tenant_id = $1 FOR UPDATE`,
  signup: `SELECT launch.id,launch.started_at AS "startedAt",launch.baseline_connection_version AS "baselineVersion",
    receipt.response_json AS result,connection.version,connection.waba_id AS "wabaId",connection.phone_number_id AS "phoneNumberId"
    FROM meta_signup_launches AS launch JOIN railway_api_mutation_receipts AS receipt
      ON receipt.tenant_id=launch.tenant_id AND receipt.operation=launch.operation AND receipt.idempotency_key=launch.claim_key
      AND receipt.request_digest=launch.request_digest AND receipt.actor_external_user_id=launch.actor_external_user_id
    JOIN meta_connections AS connection ON connection.tenant_id=launch.tenant_id
    WHERE launch.tenant_id=$1 AND launch.id=$2 AND launch.actor_external_user_id=$3 AND launch.status='finished'
      AND receipt.status='completed' AND connection.status='connected' AND ($4::text IS NULL OR launch.configuration_key=$4)
    FOR SHARE OF launch,receipt,connection`,
  bindSignup: `INSERT INTO meta_data_sync_onboardings
    (tenant_id,actor_external_user_id,baseline_connection_version,started_at,signup_launch_id,signup_connection_version)
    VALUES ($1,$2,$3,$4::timestamptz,$5,$6) ON CONFLICT DO NOTHING RETURNING tenant_id AS "tenantId"`,
  signupBinding: `SELECT signup_launch_id AS "launchId",signup_connection_version AS version,actor_external_user_id AS actor
    FROM meta_data_sync_onboardings WHERE tenant_id=$1 FOR UPDATE`,
  clock: `SELECT date_trunc('milliseconds', clock_timestamp()) AS "now"`,
  connection: `SELECT waba_id AS "wabaId", phone_number_id AS "phoneNumberId", version, status, connected_at AS "connectedAt"
    FROM meta_connections WHERE tenant_id = $1 FOR SHARE`,
  prepare: `INSERT INTO meta_data_sync_requests (tenant_id, waba_id, phone_number_id, connection_version, sync_type, started_at)
    VALUES ($1, $2, $3, $4, $5, $6::timestamptz) ON CONFLICT DO NOTHING RETURNING ${columns}`,
  read: `SELECT ${columns} FROM meta_data_sync_requests WHERE tenant_id = $1 AND sync_type = $2`,
  lock: `SELECT ${columns} FROM meta_data_sync_requests WHERE tenant_id = $1 AND sync_type = $2 FOR UPDATE`,
  dispatch: `UPDATE meta_data_sync_requests SET status = 'dispatching', dispatched_at = date_trunc('milliseconds', clock_timestamp())
    WHERE tenant_id = $1 AND sync_type = $2 AND status = 'prepared' AND clock_timestamp() < started_at + INTERVAL '24 hours'
    RETURNING ${columns}`,
  stop: `UPDATE meta_data_sync_requests SET status = $3, finished_at = date_trunc('milliseconds', clock_timestamp())
    WHERE tenant_id = $1 AND sync_type = $2 AND status = 'prepared' RETURNING ${columns}`,
  finish: `UPDATE meta_data_sync_requests SET status = $3, request_id = $4, finished_at = date_trunc('milliseconds', clock_timestamp())
    WHERE tenant_id = $1 AND sync_type = $2 AND status = 'dispatching' RETURNING ${columns}`,
  audit: `INSERT INTO audit_logs (tenant_id, actor_external_user_id, action, target_type, target_id, metadata_json)
    VALUES ($1, $2, $3, 'meta_data_sync', $4, $5::jsonb) RETURNING id`,
});
async function one(tx: PostgresTransaction, sql: string, values: readonly PostgresParameter[]) {
  return requirePostgresRows(await tx.query(sql, values), 1)[0] ?? null;
}
function fail(code = "SYNC_STORAGE_FAILED"): never { throw new MetaDataSyncError(code); }
function parseRequest(value: unknown): MetaDataSyncRequest {
  const row = requireExactPostgresRow(value, keys);
  return validateMetaDataSyncRequest({ tenantId: parsePostgresPositiveInteger(row.tenantId), wabaId: row.wabaId as string,
    phoneNumberId: row.phoneNumberId as string, connectionVersion: parsePostgresPositiveInteger(row.connectionVersion),
    syncType: requireMetaDataSyncType(row.syncType), startedAt: parsePostgresTimestamp(row.startedAt),
    status: row.status as MetaDataSyncRequest["status"], requestId: row.requestId as string | null });
}
function sessionScope(session: TenantSession) {
  requireTenantPermission(session, "workspace.manage");
  const tenantId = requireMetaDataSyncTenant(session.tenantId);
  const actor = session.externalUserId;
  if (typeof actor !== "string" || actor.length === 0 || actor.length > 512 || actor.trim() !== actor || /[\u0000-\u001f\u007f]/.test(actor)) return fail("INVALID_SYNC_ACTOR");
  return { tenantId, actor };
}
async function tenant(tx: PostgresTransaction, tenantId: number) {
  const value = await one(tx, postgresMetaDataSyncSql.tenant, [tenantId]);
  if (value === null || parsePostgresPositiveInteger(requireExactPostgresRow(value, ["id"]).id) !== tenantId) return fail("SYNC_TENANT_UNAVAILABLE");
}
async function onboarding(tx: PostgresTransaction, tenantId: number) {
  const value = await one(tx, postgresMetaDataSyncSql.onboarding, [tenantId]);
  if (value === null) return fail("SYNC_ONBOARDING_NOT_STARTED");
  const row = requireExactPostgresRow(value, ["startedAt", "baselineVersion"]);
  return { startedAt: parsePostgresTimestamp(row.startedAt), baselineVersion: row.baselineVersion === null ? null : parsePostgresPositiveInteger(row.baselineVersion) };
}
async function now(tx: PostgresTransaction) {
  return parsePostgresTimestamp(requireExactPostgresRow(await one(tx, postgresMetaDataSyncSql.clock, []), ["now"]).now);
}
function expired(startedAt: string, time: string) { return Date.parse(time) >= Date.parse(startedAt) + 24 * 60 * 60 * 1000; }
function sameScope(a: MetaDataSyncRequest, b: MetaDataSyncRequest) {
  if (a.tenantId !== b.tenantId || a.wabaId !== b.wabaId || a.phoneNumberId !== b.phoneNumberId || a.connectionVersion !== b.connectionVersion ||
    a.syncType !== b.syncType || a.startedAt !== b.startedAt) return fail("SYNC_SCOPE_CHANGED");
}
async function audit(tx: PostgresTransaction, tenantId: number, actor: string | null, phase: string, target: string, metadata: object) {
  const value = await one(tx, postgresMetaDataSyncSql.audit, [tenantId, actor, `meta.data-sync.${phase}`, target, JSON.stringify(metadata)]);
  parsePostgresPositiveInteger(requireExactPostgresRow(value, ["id"]).id);
}

async function prepareRequests(tx: PostgresTransaction, tenantId: number, actor: string, version: number, startedAt: string,
  connection: { wabaId: string; phoneNumberId: string }) {
  for (const syncType of ["smb_app_state_sync", "history"] as const) {
    const expected = validateMetaDataSyncRequest({ tenantId, ...connection, connectionVersion: version, startedAt, syncType, status: "prepared", requestId: null });
    const inserted = await one(tx, postgresMetaDataSyncSql.prepare, [tenantId, expected.wabaId, expected.phoneNumberId, version, syncType, startedAt]);
    const stored = inserted ?? await one(tx, postgresMetaDataSyncSql.lock, [tenantId, syncType]);
    if (stored === null) return fail("SYNC_REQUEST_ALREADY_BOUND");
    sameScope(parseRequest(stored), expected);
    if (inserted !== null) await audit(tx, tenantId, actor, "prepared", syncType, { connectionVersion: version });
  }
}

export function createPostgresMetaDataSyncRepository(transactions: PostgresTransactionManager): MetaDataSyncRepository {
  return Object.freeze({
    async prepareFromSignupLaunch(session: TenantSession, rawLaunchId: number, configurationKey?: string) {
      const { tenantId, actor } = sessionScope(session);
      const launchId = requireMetaDataSyncTenant(rawLaunchId);
      if (configurationKey !== undefined && (typeof configurationKey !== 'string' || !/^[0-9a-f]{64}$/.test(configurationKey))) return fail('INVALID_SYNC_CONFIGURATION');
      return transactions.transaction({ isolationLevel: 'read-committed' }, async (tx) => {
        await lockMetaSignupLaunchTenant(tx, session);
        const value = await one(tx, postgresMetaDataSyncSql.signup, [tenantId, launchId, actor, configurationKey ?? null]);
        if (value === null) return fail('SYNC_SIGNUP_NOT_COMPLETED');
        const row = requireExactPostgresRow(value, ['id','startedAt','baselineVersion','result','version','wabaId','phoneNumberId']);
        const result = parseMetaSignupAttemptResult(row.result);
        const version = parsePostgresPositiveInteger(row.version);
        const startedAt = parsePostgresTimestamp(row.startedAt);
        const baselineVersion = row.baselineVersion === null ? null : parsePostgresPositiveInteger(row.baselineVersion);
        if (parsePostgresPositiveInteger(row.id) !== launchId || result?.status !== 'connected' || result.connectionVersion !== version ||
          (baselineVersion !== null && version <= baselineVersion)) return fail('SYNC_SIGNUP_CONNECTION_CHANGED');
        if (expired(startedAt, await now(tx))) return fail('SYNC_DEADLINE_EXPIRED');
        const inserted = await one(tx, postgresMetaDataSyncSql.bindSignup, [tenantId,actor,baselineVersion,startedAt,launchId,version]);
        const binding = requireExactPostgresRow(await one(tx, postgresMetaDataSyncSql.signupBinding, [tenantId]), ['launchId','version','actor']);
        const start = await onboarding(tx, tenantId);
        if (binding.launchId === null || parsePostgresPositiveInteger(binding.launchId) !== launchId || binding.actor !== actor ||
          parsePostgresPositiveInteger(binding.version) !== version || start.startedAt !== startedAt || start.baselineVersion !== baselineVersion) return fail('SYNC_REQUEST_ALREADY_BOUND');
        if (inserted !== null) {
          if (parsePostgresPositiveInteger(requireExactPostgresRow(inserted, ['tenantId']).tenantId) !== tenantId) return fail();
          await audit(tx, tenantId, actor, 'signup-bound', String(launchId), { connectionVersion: version });
        }
        await prepareRequests(tx, tenantId, actor, version, startedAt, { wabaId: row.wabaId as string, phoneNumberId: row.phoneNumberId as string });
        return { startedAt, connectionVersion: version };
      });
    },
    async begin(session: TenantSession) {
      const { tenantId, actor } = sessionScope(session);
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await tenant(tx, tenantId);
        const inserted = await one(tx, postgresMetaDataSyncSql.begin, [tenantId, actor]);
        const start = await onboarding(tx, tenantId);
        if (inserted !== null) {
          if (parsePostgresPositiveInteger(requireExactPostgresRow(inserted, ["tenantId"]).tenantId) !== tenantId) return fail();
          await audit(tx, tenantId, actor, "onboarding-started", String(tenantId), {});
        }
        return { startedAt: start.startedAt };
      });
    },
    async prepare(session: TenantSession, rawVersion: number) {
      const { tenantId, actor } = sessionScope(session);
      const version = requireMetaDataSyncTenant(rawVersion);
      await transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await tenant(tx, tenantId);
        const start = await onboarding(tx, tenantId);
        const binding = requireExactPostgresRow(await one(tx, postgresMetaDataSyncSql.signupBinding, [tenantId]), ['launchId','version','actor']);
        if (binding.launchId !== null) return fail('SYNC_SIGNUP_PREPARATION_REQUIRED');
        const raw = await one(tx, postgresMetaDataSyncSql.connection, [tenantId]);
        if (raw === null) return fail("SYNC_CONNECTION_CHANGED");
        const connection = requireExactPostgresRow(raw, ["wabaId", "phoneNumberId", "version", "status", "connectedAt"]);
        if (connection.status !== "connected" || parsePostgresPositiveInteger(connection.version) !== version || connection.connectedAt === null ||
          parsePostgresTimestamp(connection.connectedAt) < start.startedAt || (start.baselineVersion !== null && version <= start.baselineVersion)) return fail("SYNC_CONNECTION_CHANGED");
        if (expired(start.startedAt, await now(tx))) return fail("SYNC_DEADLINE_EXPIRED");
        await prepareRequests(tx, tenantId, actor, version, start.startedAt, { wabaId: connection.wabaId as string, phoneNumberId: connection.phoneNumberId as string });
      });
    },
    async read(rawTenantId: number, rawType: MetaDataSyncType) {
      const tenantId = requireMetaDataSyncTenant(rawTenantId), syncType = requireMetaDataSyncType(rawType);
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await tenant(tx, tenantId);
        const value = await one(tx, postgresMetaDataSyncSql.read, [tenantId, syncType]);
        if (value === null) return null;
        const request = parseRequest(value);
        if (request.tenantId !== tenantId || request.syncType !== syncType) return fail("SYNC_SCOPE_CHANGED");
        return request;
      });
    },
    async claim(rawRequest: MetaDataSyncRequest, session?: TenantSession) {
      const expected = validateMetaDataSyncRequest(rawRequest);
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await tenant(tx, expected.tenantId);
        const start = await onboarding(tx, expected.tenantId);
        const request = parseRequest(await one(tx, postgresMetaDataSyncSql.lock, [expected.tenantId, expected.syncType]));
        sameScope(request, expected);
        if (start.startedAt !== request.startedAt) return fail("SYNC_SCOPE_CHANGED");
        if (request.status !== "prepared") return { outcome: "not-claimed" as const, request };
        // Job-backed Business App work rechecks the original actor after the
        // asynchronous Graph GET, at the durable authorization point for POST.
        const continuation = await one(tx,postgresMetaDataSyncSql.continuationActor,[request.tenantId]);
        if (continuation !== null) {
          const { actor,status } = requireExactPostgresRow(continuation,['actor','status']);
          if ((status!=='pending' && status!=='running') || session?.tenantId !== request.tenantId || session.externalUserId !== actor ||
            await one(tx,postgresMetaDataSyncSql.currentOwner,[request.tenantId,session.externalUserId]) === null) {
            const stopped = parseRequest(await one(tx,postgresMetaDataSyncSql.stop,[request.tenantId,request.syncType,'cancelled']));
            await audit(tx,request.tenantId,null,'cancelled',request.syncType,{ reason:'signup-actor-no-longer-authorized' });
            return { outcome:'not-claimed' as const,request:stopped };
          }
        }
        const raw = await one(tx, postgresMetaDataSyncSql.connection, [request.tenantId]);
        const connection = raw === null ? null : requireExactPostgresRow(raw, ["wabaId", "phoneNumberId", "version", "status", "connectedAt"]);
        const changed = connection === null || connection.status !== "connected" || connection.wabaId !== request.wabaId ||
          connection.phoneNumberId !== request.phoneNumberId || parsePostgresPositiveInteger(connection.version) !== request.connectionVersion;
        const pastDeadline = expired(request.startedAt, await now(tx));
        if (changed || pastDeadline) {
          const stopped = parseRequest(await one(tx, postgresMetaDataSyncSql.stop, [request.tenantId, request.syncType, changed ? "cancelled" : "expired"]));
          await audit(tx, request.tenantId, null, stopped.status, request.syncType, {});
          return { outcome: "not-claimed" as const, request: stopped };
        }
        if (request.syncType === "history") {
          const contacts = parseRequest(await one(tx, postgresMetaDataSyncSql.read, [request.tenantId, "smb_app_state_sync"]));
          sameScope({ ...contacts, syncType: "history" }, request);
          if (contacts.status !== "accepted") return { outcome: "waiting-for-contacts" as const, request };
        }
        const dispatched = await one(tx, postgresMetaDataSyncSql.dispatch, [request.tenantId, request.syncType]);
        if (dispatched === null) return fail("SYNC_DEADLINE_EXPIRED");
        const claimed = parseRequest(dispatched);
        sameScope(claimed, request);
        await audit(tx, request.tenantId, null, "dispatch-started", request.syncType, { connectionVersion: request.connectionVersion });
        return { outcome: "claimed" as const, request: claimed };
      });
    },
    async finish(rawRequest: MetaDataSyncRequest, rawResult: MetaDataSyncResult) {
      const expected = validateMetaDataSyncRequest(rawRequest), result = validateMetaDataSyncResult(rawResult);
      if (expected.status !== "dispatching") return fail("INVALID_SYNC_CLAIM");
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        // The original request's outcome survives tenant suspension or Meta
        // revocation. Only new provider work requires current authorization.
        const stored = parseRequest(await one(tx, postgresMetaDataSyncSql.lock, [expected.tenantId, expected.syncType]));
        sameScope(stored, expected);
        if (stored.status !== "dispatching") {
          if (stored.status === result.status && stored.requestId === result.requestId) return stored;
          return fail("SYNC_RESULT_CONFLICT");
        }
        const finished = parseRequest(await one(tx, postgresMetaDataSyncSql.finish, [stored.tenantId, stored.syncType, result.status, result.requestId]));
        sameScope(finished, stored);
        await audit(tx, stored.tenantId, null, "finished", stored.syncType, { status: result.status });
        return finished;
      });
    },
  });
}
