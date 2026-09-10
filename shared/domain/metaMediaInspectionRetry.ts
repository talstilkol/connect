export const META_MEDIA_INSPECTION_RETRY_OPERATION = "meta.media-inspection.retry";
export const META_MEDIA_OPERATOR_RETRY_LIMIT = 3;
export interface MetaMediaInspectionRetryInput { readonly jobKey: string; readonly expectedVersion: number }
export type MetaMediaInspectionRetryStatus = "queued" | "already-requested" | "configuration-required" | "permission-denied" | "conflict" | "invalid-request" | "server-error";
export function parseMetaMediaInspectionRetryInput(value: unknown): Readonly<MetaMediaInspectionRetryInput> | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== "expectedVersion,jobKey") return null;
  const input = value as MetaMediaInspectionRetryInput;
  if (typeof input.jobKey !== "string" || !/^media_upload_v1_[0-9a-f]{64}$/.test(input.jobKey) ||
    !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1 || input.expectedVersion > 2_147_483_646) return null;
  return Object.freeze({ jobKey: input.jobKey, expectedVersion: input.expectedVersion });
}
