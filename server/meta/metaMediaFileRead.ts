import { rolePermissions } from "../../shared/domain/model.ts";
import { requireTenantPermission, type TenantSession } from "../auth/tenantSession.ts";
import { sha256Hex } from "./metaWebhookSecurity.ts";
import { MetaMediaQuarantineError } from "./metaMediaQuarantine.ts";
import { validateMetaMediaScanObservation, type MetaMediaScanObservation, type MetaMediaScanRepository } from "./metaMediaInspection.ts";
import { deriveMetaMediaUploadJobKey, mediaUploadReceiptMatches, validateMetaMediaUploadIntent,
  type MetaMediaUploadIntent, type MetaMediaUploadJob } from "./metaMediaUploadJournal.ts";

export class MetaMediaFileReadError extends Error {
  readonly code: "INVALID_INPUT" | "ACCESS_DENIED" | "NOT_READY" | "CONTENT_MISMATCH" | "DEPENDENCY_UNAVAILABLE" | "IN_PROGRESS" | "RATE_LIMITED";
  constructor(code: MetaMediaFileReadError["code"]) {
    super(`Media file read failed: ${code}`); this.name = "MetaMediaFileReadError"; this.code = code;
  }
}
export interface MetaMediaFileAuthorization {
  // Current conversation reader and source, not the historical upload actor.
  authorize(session: TenantSession, messageKey: string): Promise<Readonly<MetaMediaUploadJob>>;
}
export interface MetaMediaFileReader {
  read(intent: MetaMediaUploadIntent, versionId: string, authorize: () => Promise<void>,
    observe: (observation: MetaMediaScanObservation) => Promise<void>, signal?: AbortSignal): Promise<Uint8Array<ArrayBuffer>>;
}
export interface MetaMediaFileReadControl {
  readonly signal?: AbortSignal;
  readonly authorizeRequest?: () => Promise<void>;
}
export interface AuthorizedMetaMediaFile {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly sizeBytes: number;
  readonly contentType: "application/octet-stream";
  readonly contentDisposition: "attachment";
  readonly cacheControl: "private, no-store";
}
export function requireMetaMediaFileReadSession(raw: TenantSession, messageKey: string): Readonly<TenantSession> {
  if (typeof messageKey !== "string" || !/^message_v1_[0-9a-f]{64}$/.test(messageKey)) throw new MetaMediaFileReadError("INVALID_INPUT");
  if (!raw || !Number.isSafeInteger(raw.tenantId) || raw.tenantId <= 0 || typeof raw.externalUserId !== "string" ||
    !raw.externalUserId || raw.externalUserId.length > 512 || raw.externalUserId.trim() !== raw.externalUserId ||
    /[\u0000-\u001f\u007f]/.test(raw.externalUserId) || !Object.hasOwn(rolePermissions, raw.role)) throw new MetaMediaFileReadError("ACCESS_DENIED");
  const session = Object.freeze({ ...raw });
  try { requireTenantPermission(session, "conversations.read"); }
  catch { throw new MetaMediaFileReadError("ACCESS_DENIED"); }
  return session;
}
function sanitize(error: unknown): MetaMediaFileReadError {
  if (error instanceof MetaMediaFileReadError) return error;
  if (error instanceof MetaMediaQuarantineError) {
    if (error.code === "CONTENT_MISMATCH") return new MetaMediaFileReadError("CONTENT_MISMATCH");
    if (error.code === "AUTHORIZATION_CHANGED") return new MetaMediaFileReadError("ACCESS_DENIED");
    if (error.code === "IN_PROGRESS") return new MetaMediaFileReadError("IN_PROGRESS");
  }
  return new MetaMediaFileReadError("DEPENDENCY_UNAVAILABLE");
}
async function snapshot(raw: MetaMediaUploadJob, session: TenantSession, messageKey: string) {
  const intent = validateMetaMediaUploadIntent(raw.intent);
  if (raw.jobKey !== await deriveMetaMediaUploadJobKey(intent) || intent.tenantId !== session.tenantId || intent.messageKey !== messageKey ||
    raw.status !== "quarantined" || !raw.receipt || !mediaUploadReceiptMatches(raw.receipt, intent) ||
    !Number.isSafeInteger(raw.version) || !Number.isSafeInteger(raw.claimVersion) || raw.claimVersion === null || raw.claimVersion < 2 || raw.claimVersion > raw.version) {
    throw new MetaMediaFileReadError("NOT_READY");
  }
  return Object.freeze({ ...raw, intent, receipt: Object.freeze({ ...raw.receipt }) });
}
function sameJob(left: MetaMediaUploadJob, right: MetaMediaUploadJob) {
  return left.jobKey === right.jobKey && left.status === right.status && left.version === right.version && left.claimVersion === right.claimVersion &&
    left.receipt?.versionId === right.receipt?.versionId && Object.keys(left.intent).every((key) =>
      left.intent[key as keyof MetaMediaUploadIntent] === right.intent[key as keyof MetaMediaUploadIntent]);
}

// Internal binary boundary. No URL, cacheable permission or availability DTO.
// The trusted consumer must finish using the bytes before its promise settles;
// the owned buffer is zeroed on both success and failure. It must not serialize
// this object into the JSON API or retain it for another user's request.
export function createMetaMediaFileReadService(dependencies: Readonly<{
  authorization: MetaMediaFileAuthorization; reader: MetaMediaFileReader; scans: MetaMediaScanRepository;
}>) {
  let active = false;
  return Object.freeze({
    async withFile<T>(rawSession: TenantSession, messageKey: string, consume: (file: AuthorizedMetaMediaFile) => Promise<T>, control: MetaMediaFileReadControl = {}): Promise<T> {
      if (active) throw new MetaMediaFileReadError("IN_PROGRESS");
      active = true;
      let bytes: Uint8Array<ArrayBuffer> | undefined;
      try {
        const session = requireMetaMediaFileReadSession(rawSession, messageKey);
        if (typeof consume !== "function") throw new MetaMediaFileReadError("INVALID_INPUT");
        const checkRequest = async () => {
          if (control.signal?.aborted) throw new MetaMediaFileReadError("DEPENDENCY_UNAVAILABLE");
          await control.authorizeRequest?.();
          if (control.signal?.aborted) throw new MetaMediaFileReadError("DEPENDENCY_UNAVAILABLE");
        };
        await checkRequest();
        const job = await snapshot(await dependencies.authorization.authorize(session, messageKey), session, messageKey);
        let observedCurrentClean = false;
        const authorize = async () => {
          await checkRequest();
          const current = await snapshot(await dependencies.authorization.authorize(session, messageKey), session, messageKey);
          if (!sameJob(current, job)) throw new MetaMediaFileReadError("ACCESS_DENIED");
          await checkRequest();
        };
        const observe = async (raw: MetaMediaScanObservation) => {
          observedCurrentClean = false;
          const observation = validateMetaMediaScanObservation(raw, job.intent);
          if (observation.versionId !== job.receipt.versionId) throw new MetaMediaFileReadError("CONTENT_MISMATCH");
          // Preserve a received provider fact even when the viewer was revoked
          // while S3 answered. A fact cannot restore viewer access.
          const state = await dependencies.scans.record(job, observation);
          if (observation.result !== "NO_THREATS_FOUND" || state !== "clean-observed") throw new MetaMediaFileReadError("NOT_READY");
          observedCurrentClean = true;
        };
        bytes = await dependencies.reader.read(job.intent, job.receipt.versionId, authorize, observe, control.signal);
        if (!observedCurrentClean) throw new MetaMediaFileReadError("NOT_READY");
        if (!(bytes instanceof Uint8Array) || bytes.byteLength !== job.intent.sizeBytes || await sha256Hex(bytes) !== job.intent.contentSha256) {
          throw new MetaMediaFileReadError("CONTENT_MISMATCH");
        }
        await authorize();
        return await consume(Object.freeze({ bytes, sizeBytes: bytes.byteLength, contentType: "application/octet-stream",
          contentDisposition: "attachment", cacheControl: "private, no-store" }));
      } catch (error) { throw sanitize(error); }
      finally { if (bytes instanceof Uint8Array) bytes.fill(0); active = false; }
    },
  });
}
