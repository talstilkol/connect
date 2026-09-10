import { sha256Hex } from "./metaWebhookSecurity.ts";
import { MetaMediaQuarantineError, type MetaMediaQuarantineInput, type MetaMediaQuarantineStorage, type StoredMetaMediaQuarantine } from "./metaMediaQuarantine.ts";

export class MetaMediaUploadJournalError extends Error {
  readonly code: "INVALID_INPUT" | "AUTHORIZATION_CHANGED" | "CONFLICT" | "DEPENDENCY_UNAVAILABLE" | "RECOVERY_REQUIRED" | "IN_PROGRESS" | "STALE_CLAIM";
  constructor(code: MetaMediaUploadJournalError["code"]) { super(`Media upload journal failed: ${code}`); this.name = "MetaMediaUploadJournalError"; this.code = code; }
}
export interface MetaMediaUploadIntent extends Omit<MetaMediaQuarantineInput, "bytes"> {
  readonly actor: string;
  readonly bucket: string;
  readonly objectKey: string;
  readonly kmsKeyArn: string;
}
export type MetaMediaUploadStatus = "prepared" | "claimed" | "dispatching" | "quarantined" | "reconciliation-required" | "rejected";
export interface MetaMediaUploadJob {
  readonly jobKey: string;
  readonly intent: Readonly<MetaMediaUploadIntent>;
  readonly status: MetaMediaUploadStatus;
  readonly version: number;
  readonly claimVersion: number | null;
  readonly expired: boolean;
  readonly receipt: Readonly<StoredMetaMediaQuarantine> | null;
}
export interface MetaMediaUploadClaim { readonly jobKey: string; readonly tenantId: number; readonly actor: string; readonly claimVersion: number }
export interface MetaMediaUploadJournal {
  lookup(jobKey: string, tenantId: number, actor: string): Promise<Readonly<MetaMediaUploadJob> | null>;
  prepare(intent: MetaMediaUploadIntent): Promise<Readonly<MetaMediaUploadJob>>;
  claim(jobKey: string, tenantId: number, actor: string): Promise<Readonly<MetaMediaUploadClaim> | null>;
  dispatch(claim: MetaMediaUploadClaim): Promise<boolean>;
  checkDispatched(claim: MetaMediaUploadClaim): Promise<boolean>;
  finish(claim: MetaMediaUploadClaim, outcome: { receipt: StoredMetaMediaQuarantine } | { errorCode: "WRITE_REJECTED" | "RECONCILIATION_REQUIRED" }): Promise<boolean>;
}
export function metaMediaUploadObjectKey(input: Pick<MetaMediaUploadIntent, "tenantId" | "connectionVersion" | "messageKey" | "sourceSha256" | "contentSha256">) {
  return `quarantine/meta-history/v1/${input.tenantId}/${input.connectionVersion}/${input.messageKey}/${input.sourceSha256}/${input.contentSha256}`;
}
export async function deriveMetaMediaUploadJobKey(input: Pick<MetaMediaUploadIntent, "tenantId" | "connectionVersion" | "messageKey" | "sourceSha256">) {
  return `media_upload_v1_${await sha256Hex(new TextEncoder().encode(JSON.stringify({ namespace: "meta_media_upload_v1", tenantId: input.tenantId,
    connectionVersion: input.connectionVersion, messageKey: input.messageKey, sourceSha256: input.sourceSha256 })))}`;
}
export function validateMetaMediaUploadIntent(raw: MetaMediaUploadIntent): Readonly<MetaMediaUploadIntent> {
  const fail = (): never => { throw new MetaMediaUploadJournalError("INVALID_INPUT"); };
  if (!raw || typeof raw !== "object" || Object.keys(raw).sort().join(",") !== "actor,bucket,connectionVersion,contentSha256,kmsKeyArn,mediaType,messageKey,objectKey,sizeBytes,sourceSha256,tenantId") return fail();
  const input = Object.freeze({ ...raw });
  if (!Number.isSafeInteger(input.tenantId) || input.tenantId <= 0 || !Number.isSafeInteger(input.connectionVersion) || input.connectionVersion <= 0 ||
    typeof input.actor !== "string" || input.actor.length === 0 || input.actor.length > 512 || input.actor.trim() !== input.actor || /[\u0000-\u001f\u007f]/.test(input.actor) ||
    typeof input.messageKey !== "string" || !/^message_v1_[0-9a-f]{64}$/.test(input.messageKey) ||
    typeof input.sourceSha256 !== "string" || !/^[0-9a-f]{64}$/.test(input.sourceSha256) || typeof input.contentSha256 !== "string" || !/^[0-9a-f]{64}$/.test(input.contentSha256) ||
    !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > 100 * 1024 * 1024 ||
    typeof input.mediaType !== "string" || input.mediaType.length > 255 || !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*(?:; codecs=opus)?$/.test(input.mediaType) ||
    typeof input.bucket !== "string" || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(input.bucket) ||
    typeof input.kmsKeyArn !== "string" || !/^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key\/(?:[0-9a-f-]{36}|mrk-[0-9a-f]{32})$/.test(input.kmsKeyArn) ||
    input.objectKey !== metaMediaUploadObjectKey(input)) return fail();
  return input;
}
export function mediaUploadReceiptMatches(receipt: StoredMetaMediaQuarantine, intent: MetaMediaUploadIntent): boolean {
  return !!receipt && Object.keys(receipt).sort().join(",") === "bucket,connectionVersion,contentSha256,mediaType,messageKey,objectKey,sizeBytes,sourceSha256,state,tenantId,versionId" &&
    receipt.tenantId === intent.tenantId && receipt.connectionVersion === intent.connectionVersion && receipt.messageKey === intent.messageKey &&
    receipt.sourceSha256 === intent.sourceSha256 && receipt.contentSha256 === intent.contentSha256 && receipt.mediaType === intent.mediaType &&
    receipt.sizeBytes === intent.sizeBytes && receipt.bucket === intent.bucket && receipt.objectKey === intent.objectKey && receipt.state === "quarantined" &&
    typeof receipt.versionId === "string" && receipt.versionId !== "null" && receipt.versionId.length > 0 && receipt.versionId.length <= 1024 && !/[\u0000-\u0020\u007f]/.test(receipt.versionId);
}

export async function storeMetaMediaWithJournal(dependencies: Readonly<{ journal: MetaMediaUploadJournal; storage: MetaMediaQuarantineStorage }>,
  rawIntent: MetaMediaUploadIntent, rawInput: MetaMediaQuarantineInput, authorize: () => Promise<void>): Promise<Readonly<StoredMetaMediaQuarantine>> {
  const intent = validateMetaMediaUploadIntent(rawIntent), input = Object.freeze({ ...rawInput });
  for (const key of ["tenantId","connectionVersion","messageKey","sourceSha256","contentSha256","mediaType","sizeBytes"] as const) {
    if (input[key] !== intent[key]) throw new MetaMediaUploadJournalError("CONFLICT");
  }
  await authorize();
  const job = await dependencies.journal.prepare(intent);
  if (job.jobKey !== await deriveMetaMediaUploadJobKey(intent) || Object.keys(intent).some((key) =>
    job.intent[key as keyof MetaMediaUploadIntent] !== intent[key as keyof MetaMediaUploadIntent])) throw new MetaMediaUploadJournalError("CONFLICT");
  if (job.status === "quarantined") {
    if (job.receipt === null || !mediaUploadReceiptMatches(job.receipt, intent)) throw new MetaMediaUploadJournalError("CONFLICT");
    await authorize(); return job.receipt;
  }
  if (job.status === "dispatching" && !job.expired) throw new MetaMediaUploadJournalError("IN_PROGRESS");
  if (["dispatching", "reconciliation-required", "rejected"].includes(job.status)) throw new MetaMediaUploadJournalError("RECOVERY_REQUIRED");
  const claim = await dependencies.journal.claim(job.jobKey, intent.tenantId, intent.actor);
  if (claim === null) throw new MetaMediaUploadJournalError("IN_PROGRESS");
  if (claim.jobKey !== job.jobKey || claim.tenantId !== intent.tenantId || claim.actor !== intent.actor) throw new MetaMediaUploadJournalError("CONFLICT");
  // A lost dispatch acknowledgement is deliberately not retried. Only the
  // process receiving this successful transition may invoke storage once.
  if (!await dependencies.journal.dispatch(claim)) throw new MetaMediaUploadJournalError("STALE_CLAIM");
  let receipt: Readonly<StoredMetaMediaQuarantine>;
  let receiptObserved = false, receiptRecorded = false;
  let recordedVersionId: string | null = null;
  const recordReceipt = async (result: Readonly<StoredMetaMediaQuarantine>) => {
    if (!mediaUploadReceiptMatches(result, intent)) throw new MetaMediaUploadJournalError("CONFLICT");
    receiptObserved = true;
    if (!await dependencies.journal.finish(claim, { receipt: result })) throw new MetaMediaUploadJournalError("STALE_CLAIM");
    receiptRecorded = true;
    recordedVersionId = result.versionId;
  };
  try {
    receipt = await dependencies.storage.store(input, async () => {
      await authorize();
      if (!receiptRecorded && !await dependencies.journal.checkDispatched(claim)) throw new MetaMediaUploadJournalError("STALE_CLAIM");
    }, recordReceipt);
    if (!mediaUploadReceiptMatches(receipt, intent)) throw new MetaMediaUploadJournalError("CONFLICT");
    if (recordedVersionId !== null && receipt.versionId !== recordedVersionId) throw new MetaMediaUploadJournalError("CONFLICT");
  } catch (error) {
    const errorCode = error instanceof MetaMediaQuarantineError && error.code === "WRITE_REJECTED" ? "WRITE_REJECTED" : "RECONCILIATION_REQUIRED";
    // A post-write revocation or lost receipt commit acknowledgement must
    // never overwrite success, or obscure the confirmed remote outcome.
    if (!receiptObserved) await dependencies.journal.finish(claim, { errorCode });
    throw error;
  }
  // Store remote truth before checking authorization for returning it. This
  // receipt grants no read access, even if the actor/connection was revoked.
  if (!receiptRecorded) await recordReceipt(receipt);
  await authorize();
  return receipt;
}
