import { requireTenantPermission, TenantSessionError, type TenantSession } from "../auth/tenantSession.ts";
import { MetaMediaQuarantineError, type StoredMetaMediaQuarantine } from "./metaMediaQuarantine.ts";
import { MetaMediaUploadJournalError, mediaUploadReceiptMatches, validateMetaMediaUploadIntent,
  type MetaMediaUploadIntent, type MetaMediaUploadJob, type MetaMediaUploadJournal } from "./metaMediaUploadJournal.ts";

export const META_MEDIA_SCAN_RESULTS = ["PENDING", "NO_THREATS_FOUND", "THREATS_FOUND", "UNSUPPORTED", "ACCESS_DENIED", "FAILED"] as const;
export type MetaMediaScanResult = typeof META_MEDIA_SCAN_RESULTS[number];
export type MetaMediaScanState = "pending" | "clean-observed" | "blocked" | "conflict";
export interface MetaMediaScanObservation {
  readonly versionId: string;
  readonly result: MetaMediaScanResult;
  readonly receipt: Readonly<StoredMetaMediaQuarantine> | null;
}
export interface MetaMediaInspector {
  inspect(intent: MetaMediaUploadIntent, versionId: string | null, authorize: () => Promise<void>):
    Promise<Readonly<MetaMediaScanObservation> | null>;
}
export interface MetaMediaScanRepository {
  record(job: MetaMediaUploadJob, observation: MetaMediaScanObservation): Promise<MetaMediaScanState>;
}
export function validMetaMediaObjectVersion(value: unknown): value is string {
  return typeof value === "string" && value !== "null" && value.length > 0 && value.length <= 1024 && !/[\u0000-\u0020\u007f]/.test(value);
}
export function validateMetaMediaScanObservation(raw: MetaMediaScanObservation, intent: MetaMediaUploadIntent): Readonly<MetaMediaScanObservation> {
  if (!raw || typeof raw !== "object" || Object.keys(raw).sort().join(",") !== "receipt,result,versionId" ||
    !validMetaMediaObjectVersion(raw.versionId) || !META_MEDIA_SCAN_RESULTS.includes(raw.result)) throw new MetaMediaUploadJournalError("INVALID_INPUT");
  const receipt = raw.receipt === null ? null : Object.freeze({ ...raw.receipt });
  if (raw.result === "NO_THREATS_FOUND" ? !receipt || !mediaUploadReceiptMatches(receipt, intent) || receipt.versionId !== raw.versionId : receipt !== null) {
    throw new MetaMediaUploadJournalError("CONFLICT");
  }
  return Object.freeze({ versionId: raw.versionId, result: raw.result, receipt });
}

// Internal reconciliation only. Observed clean metadata is not a file-serving
// permission, and a missing object never authorizes a replacement PUT.
export function createMetaMediaInspectionService(dependencies: Readonly<{
  journal: MetaMediaUploadJournal; scans: MetaMediaScanRepository; inspector: MetaMediaInspector;
  authorizeWork?: () => Promise<void>;
}>) {
  let active = false;
  return Object.freeze({
    async inspect(rawSession: TenantSession, jobKey: string): Promise<MetaMediaScanState | "missing"> {
      if (active) throw new MetaMediaUploadJournalError("IN_PROGRESS");
      active = true;
      try {
        const session = Object.freeze({ ...rawSession });
        requireTenantPermission(session, "workspace.manage");
        await dependencies.authorizeWork?.();
        const job = await dependencies.journal.lookup(jobKey, session.tenantId, session.externalUserId);
        if (!job || job.jobKey !== jobKey || job.intent.tenantId !== session.tenantId || job.intent.actor !== session.externalUserId) {
          throw new MetaMediaUploadJournalError("AUTHORIZATION_CHANGED");
        }
        const intent = validateMetaMediaUploadIntent(job.intent);
        if (!["dispatching", "reconciliation-required", "quarantined"].includes(job.status) ||
          (job.status === "dispatching" && !job.expired)) throw new MetaMediaUploadJournalError("IN_PROGRESS");
        const authorize = async () => {
          await dependencies.authorizeWork?.();
          const current = await dependencies.journal.lookup(jobKey, session.tenantId, session.externalUserId);
          if (!current || current.claimVersion !== job.claimVersion || JSON.stringify(current.intent) !== JSON.stringify(intent)) {
            throw new MetaMediaUploadJournalError("AUTHORIZATION_CHANGED");
          }
        };
        const observation = await dependencies.inspector.inspect(intent, job.receipt?.versionId ?? null, authorize);
        // Preserve the historical provider fact before checking permission to
        // return it. The repository binds it to this exact dispatched claim.
        const result = observation === null ? "missing" : await dependencies.scans.record(job, observation);
        await authorize();
        return result;
      } catch (error) {
        if (error instanceof TenantSessionError) throw new MetaMediaUploadJournalError("AUTHORIZATION_CHANGED");
        if (error instanceof MetaMediaUploadJournalError || error instanceof MetaMediaQuarantineError) throw error;
        throw new MetaMediaUploadJournalError("DEPENDENCY_UNAVAILABLE");
      } finally { active = false; }
    },
  });
}
