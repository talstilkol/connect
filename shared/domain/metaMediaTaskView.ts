import {metaMediaCleanupStates,type MetaMediaCleanupState} from './metaMediaCleanup.ts';
export const META_MEDIA_TASKS_READ_OPERATION = "meta.media-tasks.read" as const;
export const META_MEDIA_TASKS_PAGE_SIZE = 50;
export const metaMediaTaskStatuses = ["pending", "running", "done", "blocked", "recovery-required", "cancelled"] as const;
export const metaMediaDiagnosticScanResults = ["ACCESS_DENIED", "FAILED", "NO_THREATS_FOUND", "PENDING", "THREATS_FOUND", "UNSUPPORTED"] as const;
export type MetaMediaTaskCursor = Readonly<{ jobKey: string; kind: "upload" | "inspect" }>;
export interface MetaMediaTaskView extends MetaMediaTaskCursor {
  readonly status: typeof metaMediaTaskStatuses[number];
  readonly attempts: number;
  readonly version: number;
  readonly operatorRetries: number;
  readonly canCleanup: boolean;
  readonly cleanup: Readonly<{status:MetaMediaCleanupState;attempts:number}> | null;
  readonly updatedAt: string;
  readonly nextAttemptAt: string | null;
  readonly leaseExpiresAt: string | null;
  readonly leaseExpired: boolean;
  readonly scanResults: readonly typeof metaMediaDiagnosticScanResults[number][];
  readonly multipleScanVersions: boolean;
}
export interface MetaMediaTaskPage {
  readonly tasks: readonly Readonly<MetaMediaTaskView>[];
  readonly nextCursor: MetaMediaTaskCursor | null;
}
export type MetaMediaTaskReadStatus = "ready" | "configuration-required" | "onboarding-required" | "tenant-selection-required" | "permission-denied" | "invalid-request" | "server-error";
export type MetaMediaTaskReadResult = Readonly<{ status: "ready"; page: MetaMediaTaskPage } | { status: Exclude<MetaMediaTaskReadStatus, "ready">; page: null }>;
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const timestamp = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
export function parseMetaMediaTaskCursor(value: unknown): MetaMediaTaskCursor | null {
  if (!record(value) || Object.keys(value).sort().join(",") !== "jobKey,kind" || typeof value.jobKey !== "string" ||
    !/^media_upload_v1_[0-9a-f]{64}$/.test(value.jobKey) || (value.kind !== "upload" && value.kind !== "inspect")) return null;
  return Object.freeze({ jobKey: value.jobKey, kind: value.kind });
}
export function encodeMetaMediaTaskCursor(cursor: MetaMediaTaskCursor): string { return `${cursor.jobKey}.${cursor.kind}`; }
export function decodeMetaMediaTaskCursor(value: unknown): MetaMediaTaskCursor | null {
  if (typeof value !== "string" || value.length > 90) return null;
  const parts = value.split(".");
  return parts.length === 2 ? parseMetaMediaTaskCursor({ jobKey: parts[0], kind: parts[1] }) : null;
}
export function parseMetaMediaTaskView(value: unknown): Readonly<MetaMediaTaskView> | null {
  if (!record(value) || Object.keys(value).sort().join(",") !== "attempts,canCleanup,cleanup,jobKey,kind,leaseExpired,leaseExpiresAt,multipleScanVersions,nextAttemptAt,operatorRetries,scanResults,status,updatedAt,version") return null;
  const cursor = parseMetaMediaTaskCursor({ jobKey: value.jobKey, kind: value.kind });
  const cleanup=value.cleanup;
  if(typeof value.canCleanup!=='boolean'||(cleanup!==null&&(!record(cleanup)||Object.keys(cleanup).sort().join(',')!=='attempts,status'||
    !metaMediaCleanupStates.includes(cleanup.status as MetaMediaCleanupState)||!Number.isSafeInteger(cleanup.attempts)||Number(cleanup.attempts)<0||Number(cleanup.attempts)>3||
    (cleanup.status!=='pending'&&cleanup.attempts===0))))return null;
  if(value.canCleanup&&(cleanup!==null||cursor?.kind!=='inspect'||!['blocked','recovery-required'].includes(String(value.status))||value.multipleScanVersions===true))return null;
  if (!cursor || !metaMediaTaskStatuses.includes(value.status as MetaMediaTaskView["status"]) ||
    !Number.isSafeInteger(value.version) || Number(value.version) < 1 || Number(value.version) > 2_147_483_647 ||
    !Number.isSafeInteger(value.operatorRetries) || Number(value.operatorRetries) < 0 || Number(value.operatorRetries) > (cursor.kind === "inspect" ? 3 : 0) ||
    !Number.isSafeInteger(value.attempts) || Number(value.attempts) < 0 || Number(value.attempts) > (cursor.kind === "upload" ? 3 : 12 + Number(value.operatorRetries)) ||
    (value.status !== "pending" && value.attempts === 0) || !timestamp(value.updatedAt) ||
    (value.status === "pending" ? !timestamp(value.nextAttemptAt) : value.nextAttemptAt !== null) ||
    (value.status === "running" ? !timestamp(value.leaseExpiresAt) : value.leaseExpiresAt !== null) ||
    typeof value.leaseExpired !== "boolean" || (value.status !== "running" && value.leaseExpired) ||
    typeof value.multipleScanVersions !== "boolean" || !Array.isArray(value.scanResults) || value.scanResults.length > 6 ||
    value.scanResults.some((r) => !metaMediaDiagnosticScanResults.includes(r)) ||
    value.scanResults.some((r, i, all) => i > 0 && all[i - 1] >= r) ||
    (value.multipleScanVersions && value.scanResults.length === 0)) return null;
  return Object.freeze({ ...cursor, status: value.status as MetaMediaTaskView["status"], attempts: Number(value.attempts), version: Number(value.version), operatorRetries: Number(value.operatorRetries),
    canCleanup:value.canCleanup,cleanup:cleanup===null?null:Object.freeze({status:cleanup.status as MetaMediaCleanupState,attempts:Number(cleanup.attempts)}),
    updatedAt: value.updatedAt, nextAttemptAt: value.nextAttemptAt as string | null, leaseExpiresAt: value.leaseExpiresAt as string | null,
    leaseExpired: value.leaseExpired, scanResults: Object.freeze([...value.scanResults]), multipleScanVersions: value.multipleScanVersions });
}
export function compareMetaMediaTaskCursors(a: MetaMediaTaskCursor, b: MetaMediaTaskCursor): number {
  return a.jobKey < b.jobKey ? -1 : a.jobKey > b.jobKey ? 1 : a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0;
}
export function parseMetaMediaTaskPage(value: unknown): Readonly<MetaMediaTaskPage> | null {
  if (!record(value) || Object.keys(value).sort().join(",") !== "nextCursor,tasks" || !Array.isArray(value.tasks) || value.tasks.length > META_MEDIA_TASKS_PAGE_SIZE) return null;
  const tasks = value.tasks.map(parseMetaMediaTaskView);
  if (tasks.some(t => t === null)) return null;
  const rows = tasks as Readonly<MetaMediaTaskView>[];
  if (rows.some((t, i) => i > 0 && compareMetaMediaTaskCursors(rows[i - 1], t) >= 0)) return null;
  const cursor = value.nextCursor === null ? null : parseMetaMediaTaskCursor(value.nextCursor);
  if (value.nextCursor !== null && (!cursor || rows.length !== META_MEDIA_TASKS_PAGE_SIZE || compareMetaMediaTaskCursors(rows[rows.length - 1], cursor) !== 0)) return null;
  return Object.freeze({ tasks: Object.freeze(rows), nextCursor: cursor });
}
export function metaMediaTaskAttention(task: MetaMediaTaskView) {
  if (task.multipleScanVersions) return "scan-conflict";
  if (task.scanResults.some(r => ["ACCESS_DENIED", "FAILED", "THREATS_FOUND", "UNSUPPORTED"].includes(r))) return "scan-blocked";
  if (task.status === "recovery-required" && task.attempts === (task.kind === "upload" ? 3 : 12 + task.operatorRetries)) return "attempt-limit";
  if (task.status === "recovery-required" || task.status === "blocked") return "review-required";
  if (task.status === "cancelled") return "cancelled";
  if (task.leaseExpired) return "lease-expired";
  return "none";
}
export function canRequestMetaMediaInspectionRetry(task: MetaMediaTaskView): boolean {
  return task.cleanup === null && task.kind === "inspect" && task.operatorRetries < 3 && metaMediaTaskAttention(task) === "attempt-limit";
}
