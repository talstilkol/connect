import { requireTenantPermission, type TenantSession } from "../auth/tenantSession.ts";
import type { MetaCredentialVault, SensitiveMetaAccessToken } from "./metaPorts.ts";

export const metaDataSyncTypes = ["smb_app_state_sync", "history"] as const;
export type MetaDataSyncType = (typeof metaDataSyncTypes)[number];
export const metaDataSyncStatuses = ["prepared", "dispatching", "accepted", "unknown", "rejected", "expired", "cancelled"] as const;
export type MetaDataSyncStatus = (typeof metaDataSyncStatuses)[number];
export class MetaDataSyncError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; this.name = "MetaDataSyncError"; }
}
export interface MetaDataSyncRequest {
  readonly tenantId: number;
  readonly wabaId: string;
  readonly phoneNumberId: string;
  readonly connectionVersion: number;
  readonly syncType: MetaDataSyncType;
  readonly startedAt: string;
  readonly status: MetaDataSyncStatus;
  readonly requestId: string | null;
}
export type MetaDataSyncResult = Readonly<{
  status: "accepted";
  requestId: string;
} | { status: "unknown" | "rejected"; requestId: null }>;
export interface MetaDataSyncRepository {
  // Internal preparation only: a successful signup receipt supplies the
  // connection and original server start. This never sends provider requests.
  prepareFromSignupLaunch(session: TenantSession, launchId: number, configurationKey?: string): Promise<{ startedAt: string; connectionVersion: number }>;
  begin(session: TenantSession): Promise<{ startedAt: string }>;
  prepare(session: TenantSession, connectionVersion: number): Promise<void>;
  read(tenantId: number, syncType: MetaDataSyncType): Promise<MetaDataSyncRequest | null>;
  claim(request: MetaDataSyncRequest, session?: TenantSession): Promise<{
    outcome: "claimed" | "not-claimed" | "waiting-for-contacts";
    request: MetaDataSyncRequest;
  }>;
  finish(request: MetaDataSyncRequest, result: MetaDataSyncResult): Promise<MetaDataSyncRequest>;
}
export interface MetaDataSyncProvider {
  verifyPhone(request: MetaDataSyncRequest, accessToken: SensitiveMetaAccessToken): Promise<void>;
  request(request: MetaDataSyncRequest, accessToken: SensitiveMetaAccessToken): Promise<MetaDataSyncResult>;
}

export function requireMetaDataSyncType(value: unknown): MetaDataSyncType {
  const type = metaDataSyncTypes.find((type) => type === value);
  if (!type) throw new MetaDataSyncError("INVALID_SYNC_TYPE");
  return type;
}
export function requireMetaDataSyncTenant(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new MetaDataSyncError("INVALID_SYNC_TENANT");
  return Number(value);
}
export function isMetaDataSyncRequestId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512 &&
    value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
}
export function validateMetaDataSyncRequest(request: MetaDataSyncRequest): Readonly<MetaDataSyncRequest> {
  requireMetaDataSyncTenant(request?.tenantId);
  requireMetaDataSyncTenant(request.connectionVersion);
  requireMetaDataSyncType(request.syncType);
  if (![request.wabaId, request.phoneNumberId].every((id) => typeof id === "string" && /^[1-9][0-9]{0,254}$/.test(id)) ||
    typeof request.startedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(request.startedAt) ||
    !Number.isFinite(Date.parse(request.startedAt)) || new Date(request.startedAt).toISOString() !== request.startedAt ||
    !metaDataSyncStatuses.includes(request.status) ||
    (request.status === "accepted" ? !isMetaDataSyncRequestId(request.requestId) : request.requestId !== null)) {
    throw new MetaDataSyncError("INVALID_SYNC_REQUEST");
  }
  return Object.freeze({ tenantId: request.tenantId, wabaId: request.wabaId, phoneNumberId: request.phoneNumberId,
    connectionVersion: request.connectionVersion, syncType: request.syncType, startedAt: request.startedAt,
    status: request.status, requestId: request.requestId });
}
export function validateMetaDataSyncResult(result: MetaDataSyncResult): Readonly<MetaDataSyncResult> {
  if (result?.status === "accepted" && isMetaDataSyncRequestId(result.requestId)) return Object.freeze({ status: "accepted", requestId: result.requestId });
  if ((result?.status === "unknown" || result?.status === "rejected") && result.requestId === null) return Object.freeze({ status: result.status, requestId: null });
  throw new MetaDataSyncError("INVALID_SYNC_RESULT");
}

// Used by internal signup continuation and its durable Worker job. Public
// Business App activation remains gated on the client/read path and evidence.
export function createMetaDataSyncService(dependencies: Readonly<{
  repository: MetaDataSyncRepository;
  credentials: Pick<MetaCredentialVault, "withAccessToken">;
  provider: MetaDataSyncProvider;
}>) {
  return Object.freeze({
    async execute(session: TenantSession, rawType: unknown) {
      requireTenantPermission(session, "workspace.manage");
      const tenantId = requireMetaDataSyncTenant(session.tenantId);
      const syncType = requireMetaDataSyncType(rawType);
      const stored = await dependencies.repository.read(tenantId, syncType);
      if (stored === null) return { status: "not-prepared" as const };
      const request = validateMetaDataSyncRequest(stored);
      if (request.tenantId !== tenantId || request.syncType !== syncType) throw new MetaDataSyncError("SYNC_SCOPE_CHANGED");
      if (request.status !== "prepared") return { status: request.status, requestId: request.requestId };
      if (syncType === "history") {
        const contacts = await dependencies.repository.read(tenantId, "smb_app_state_sync");
        if (contacts === null) return { status: "waiting-for-contacts" as const };
        const checked = validateMetaDataSyncRequest(contacts);
        if (checked.tenantId !== tenantId || checked.syncType !== "smb_app_state_sync" || checked.phoneNumberId !== request.phoneNumberId ||
          checked.wabaId !== request.wabaId || checked.connectionVersion !== request.connectionVersion || checked.startedAt !== request.startedAt) {
          throw new MetaDataSyncError("SYNC_SCOPE_CHANGED");
        }
        if (checked.status !== "accepted") return { status: "waiting-for-contacts" as const };
      }
      return dependencies.credentials.withAccessToken(tenantId, async (token) => {
        // Read-only provider preflight can be repeated. The durable claim and
        // final DB-clock/connection checks follow this asynchronous work.
        await dependencies.provider.verifyPhone(request, token);
        const claim = await dependencies.repository.claim(request, session);
        const current = validateMetaDataSyncRequest(claim.request);
        if (current.tenantId !== request.tenantId || current.wabaId !== request.wabaId || current.phoneNumberId !== request.phoneNumberId ||
          current.connectionVersion !== request.connectionVersion || current.syncType !== request.syncType || current.startedAt !== request.startedAt) {
          throw new MetaDataSyncError("SYNC_SCOPE_CHANGED");
        }
        if (claim.outcome === "waiting-for-contacts") return { status: "waiting-for-contacts" as const };
        if (claim.outcome === "not-claimed") return { status: current.status, requestId: current.requestId };
        if (claim.outcome !== "claimed" || current.status !== "dispatching") throw new MetaDataSyncError("INVALID_SYNC_CLAIM");
        let result: MetaDataSyncResult;
        try { result = validateMetaDataSyncResult(await dependencies.provider.request(current, token)); }
        catch { result = { status: "unknown", requestId: null }; }
        // Persist returned provider truth even if local authorization changed
        // during the request. This never authorizes a second request.
        let persisted: MetaDataSyncRequest;
        try { persisted = await dependencies.repository.finish(current, result); }
        catch {
          // One retry of an idempotent local write preserves a known request_id
          // after an ambiguous commit. The provider POST is never repeated.
          persisted = await dependencies.repository.finish(current, result);
        }
        const finished = validateMetaDataSyncRequest(persisted);
        if (finished.tenantId !== current.tenantId || finished.wabaId !== current.wabaId || finished.phoneNumberId !== current.phoneNumberId ||
          finished.connectionVersion !== current.connectionVersion || finished.syncType !== current.syncType || finished.startedAt !== current.startedAt ||
          finished.status !== result.status || finished.requestId !== result.requestId) throw new MetaDataSyncError("INVALID_SYNC_COMPLETION");
        return { status: finished.status, requestId: finished.requestId };
      });
    },
  });
}
