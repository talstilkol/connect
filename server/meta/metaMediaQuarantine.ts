import type { DownloadedMetaMedia } from "./metaMediaDownload.ts";

export type MetaMediaQuarantineErrorCode = "INVALID_INPUT" | "CONFIGURATION_INVALID" | "UNSAFE_BUCKET" |
  "DEPENDENCY_UNAVAILABLE" | "AUTHORIZATION_CHANGED" | "CONTENT_MISMATCH" | "OBJECT_EXISTS" | "WRITE_REJECTED" | "OUTCOME_UNKNOWN" | "IN_PROGRESS";
export class MetaMediaQuarantineError extends Error {
  readonly code: MetaMediaQuarantineErrorCode;
  constructor(code: MetaMediaQuarantineErrorCode) {
    super(`Meta media quarantine failed: ${code}`);
    this.name = "MetaMediaQuarantineError";
    this.code = code;
  }
}
export interface MetaMediaQuarantineIdentity {
  readonly tenantId: number;
  readonly connectionVersion: number;
  readonly messageKey: string;
  readonly sourceSha256: string;
}
export interface MetaMediaQuarantineInput extends MetaMediaQuarantineIdentity, DownloadedMetaMedia {}
export interface StoredMetaMediaQuarantine extends MetaMediaQuarantineIdentity {
  readonly bucket: string;
  readonly objectKey: string;
  readonly versionId: string;
  readonly contentSha256: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly state: "quarantined";
}
export interface MetaMediaQuarantineStorage {
  // When provided, record the validated remote receipt before the final
  // caller-authorization check. This callback grants no file-read access.
  // The caller owns the durable job and must recheck this exact source/actor.
  // A returned receipt is neither a scan verdict nor an authorization to read.
  store(input: MetaMediaQuarantineInput, authorize: () => Promise<void>,
    recordReceipt?: (receipt: Readonly<StoredMetaMediaQuarantine>) => Promise<void>): Promise<Readonly<StoredMetaMediaQuarantine>>;
}
