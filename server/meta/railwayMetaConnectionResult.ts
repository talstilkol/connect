import { parseMetaDataSyncView } from "../../shared/domain/metaDataSyncView.ts";
import { persistedMetaConnectionStatuses } from "../../shared/domain/metaConnection.ts";
import type { MetaConnectionView } from "../../shared/domain/metaConnectionView.ts";

export const RAILWAY_META_CONNECTION_READ_OPERATION = "meta.connection.read" as const;

export function parseRailwayMetaConnectionView(value: unknown): MetaConnectionView | null {
  if (
    typeof value !== "object" || value === null || Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== (Object.hasOwn(value, "dataSync") ? "dataSync,status" : "status") ||
    !("status" in value) || typeof value.status !== "string" ||
    ![...persistedMetaConnectionStatuses, "disconnected"].some(
      (status) => status === value.status,
    )
  ) {
    return null;
  }
  const dataSync = Object.hasOwn(value, "dataSync") ? parseMetaDataSyncView((value as Record<string, unknown>).dataSync) : undefined;
  if (dataSync === null) return null;
  return Object.freeze({ status: value.status as MetaConnectionView["status"], ...(dataSync === undefined ? {} : { dataSync }) });
}
