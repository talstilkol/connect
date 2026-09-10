export type MetaMediaTaskKind = "upload" | "inspect";
export type MetaMediaTaskOutcome = "retry" | "inspection-ready" | "clean-observed" | "blocked" | "recovery-required" | "cancelled";
export const META_MEDIA_TASK_POLICY = Object.freeze({ leaseMs: 600_000, retryBaseMs: 60_000, retryMaximumMs: 900_000,
  uploadAttempts: 3, inspectionAttempts: 12, operatorInspectionRequests: 3, discoveryBatch: 100, processingBatch: 5, pollMs: 60_000 });
export class MetaMediaTaskError extends Error {
  readonly code: "INVALID_INPUT" | "DEPENDENCY_UNAVAILABLE" | "STALE_CLAIM";
  constructor(code: MetaMediaTaskError["code"]) { super(`Media task failed: ${code}`); this.name = "MetaMediaTaskError"; this.code = code; }
}
export interface MetaMediaTask {
  readonly jobKey: string;
  readonly kind: MetaMediaTaskKind;
  readonly tenantId: number;
  readonly actor: string;
  readonly messageKey: string;
  readonly connectionVersion: number;
  readonly sourceSha256: string;
  readonly version: number;
  readonly attempts: number;
  readonly exhausted: boolean;
}
export interface MetaMediaTaskRepository {
  discoverNext(kind: MetaMediaTaskKind): Promise<"enqueued" | "idle">;
  claimNext(kind: MetaMediaTaskKind): Promise<Readonly<MetaMediaTask> | null>;
  check(task: MetaMediaTask): Promise<boolean>;
  finish(task: MetaMediaTask, outcome: MetaMediaTaskOutcome): Promise<boolean>;
}
export function requireMetaMediaTaskKind(value: unknown): MetaMediaTaskKind {
  if (value !== "upload" && value !== "inspect") throw new MetaMediaTaskError("INVALID_INPUT");
  return value;
}
export function validateMetaMediaTask(raw: MetaMediaTask): Readonly<MetaMediaTask> {
  if (!raw || typeof raw !== "object" || Object.keys(raw).sort().join(",") !==
    "actor,attempts,connectionVersion,exhausted,jobKey,kind,messageKey,sourceSha256,tenantId,version") throw new MetaMediaTaskError("INVALID_INPUT");
  const value = Object.freeze({ ...raw }); requireMetaMediaTaskKind(value.kind);
  if (!/^media_upload_v1_[0-9a-f]{64}$/.test(value.jobKey) || !/^message_v1_[0-9a-f]{64}$/.test(value.messageKey) ||
    !/^[0-9a-f]{64}$/.test(value.sourceSha256) || typeof value.actor !== "string" || value.actor.length < 1 || value.actor.length > 512 ||
    value.actor.trim() !== value.actor || /[\u0000-\u001f\u007f]/.test(value.actor) || typeof value.exhausted !== "boolean" ||
    [value.tenantId, value.connectionVersion, value.version, value.attempts].some((n) => !Number.isSafeInteger(n) || n <= 0) ||
    value.version < 2 || value.attempts > (value.kind === "upload" ? 3 : 15)) throw new MetaMediaTaskError("INVALID_INPUT");
  return value;
}
