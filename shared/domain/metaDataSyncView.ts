export const metaDataSyncViewStages = [
  "awaiting-worker", "awaiting-registration", "ready-to-request", "requesting-contacts", "requesting-history",
  "receiving-history", "projecting-history", "awaiting-verification", "sharing-declined",
  "recovery-required", "connection-changed", "conflicted", "import-review-required",
] as const;
export type MetaDataSyncViewStage = (typeof metaDataSyncViewStages)[number];
export const metaDataSyncViewRequestStatuses = ["not-prepared", "prepared", "dispatching", "accepted", "unknown", "rejected", "expired", "cancelled"] as const;
export type MetaDataSyncViewRequestStatus = (typeof metaDataSyncViewRequestStatuses)[number];
export interface MetaDataSyncView {
  stage: MetaDataSyncViewStage;
  contacts: MetaDataSyncViewRequestStatus;
  history: MetaDataSyncViewRequestStatus;
  providerProgress: number | null;
  receivedChunks: number;
  processedChunks: number;
  projectedMessages: number;
}
export function parseMetaDataSyncView(value: unknown): Readonly<MetaDataSyncView> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join(",") !== "contacts,history,processedChunks,projectedMessages,providerProgress,receivedChunks,stage" ||
    !metaDataSyncViewStages.some((stage) => stage === row.stage) ||
    !metaDataSyncViewRequestStatuses.some((status) => status === row.contacts) ||
    !metaDataSyncViewRequestStatuses.some((status) => status === row.history) ||
    (row.providerProgress !== null && (typeof row.providerProgress !== "number" || !Number.isInteger(row.providerProgress) || row.providerProgress < 0 || row.providerProgress > 100)) ||
    ![row.receivedChunks, row.processedChunks, row.projectedMessages].every((count) => typeof count === "number" && Number.isSafeInteger(count) && count >= 0) ||
    Number(row.processedChunks) > Number(row.receivedChunks)) return null;
  if (["awaiting-worker", "awaiting-registration", "connection-changed", "sharing-declined", "conflicted", "import-review-required"].includes(String(row.stage)) &&
    (row.providerProgress !== null || row.receivedChunks !== 0 || row.processedChunks !== 0 || row.projectedMessages !== 0)) return null;
  if (row.stage === "awaiting-worker" && (row.contacts!=="not-prepared" || row.history!=="not-prepared")) return null;
  if (row.stage === "awaiting-verification" && (row.providerProgress !== 100 || row.receivedChunks === 0 || row.processedChunks !== row.receivedChunks)) return null;
  return Object.freeze({ stage: row.stage as MetaDataSyncViewStage, contacts: row.contacts as MetaDataSyncViewRequestStatus,
    history: row.history as MetaDataSyncViewRequestStatus, providerProgress: row.providerProgress as number | null,
    receivedChunks: Number(row.receivedChunks), processedChunks: Number(row.processedChunks), projectedMessages: Number(row.projectedMessages) });
}
