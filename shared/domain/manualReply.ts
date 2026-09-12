export const MANUAL_REPLY_TEXT_MAX_LENGTH = 4096;
export const manualReplyStates = ["queued", "preparing", "sending", "sent", "failed", "unknown"] as const;
export type ManualReplyState = typeof manualReplyStates[number];
export interface ManualReplyRequest {
  readonly conversationKey: string;
  readonly expectedVersion: number;
  readonly text: string;
}
export interface ManualReplySubmission {
  readonly conversationKey: string;
  readonly deliveryKey: string;
  readonly version: number;
}
export interface ManualReplyView {
  readonly deliveryKey: string;
  readonly text: string;
  readonly state: ManualReplyState;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export function isManualReplyText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MANUAL_REPLY_TEXT_MAX_LENGTH &&
    value.trim().length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) &&
    value.isWellFormed();
}
export function parseManualReplyRequest(value: unknown): Readonly<ManualReplyRequest> | null {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "conversationKey,expectedVersion,text") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.conversationKey !== "string" || !/^conversation_v1_[a-f0-9]{64}$/.test(input.conversationKey) ||
      !Number.isSafeInteger(input.expectedVersion) || Number(input.expectedVersion) < 1 ||
      Number(input.expectedVersion) >= 2147483647 || !isManualReplyText(input.text)) return null;
  return Object.freeze({ conversationKey: input.conversationKey, expectedVersion: Number(input.expectedVersion), text: input.text });
}
export function parseManualReplySubmission(value: unknown, request: Readonly<ManualReplyRequest>): Readonly<ManualReplySubmission> | null {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "conversationKey,deliveryKey,version") return null;
  const state = value as Record<string, unknown>;
  return state.conversationKey === request.conversationKey && state.version === request.expectedVersion + 1 &&
    typeof state.deliveryKey === "string" && /^manual_reply_delivery_v1_[a-f0-9]{64}$/.test(state.deliveryKey)
    ? Object.freeze({ conversationKey: request.conversationKey, deliveryKey: state.deliveryKey, version: Number(state.version) }) : null;
}
export function parseManualReplyViews(value: unknown): readonly ManualReplyView[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        Object.keys(row).sort().join(",") !== "createdAt,deliveryKey,state,text,updatedAt" ||
        typeof row.deliveryKey !== "string" || !/^(?:manual_reply|ai_reply)_delivery_v1_[a-f0-9]{64}$/.test(row.deliveryKey) ||
        seen.has(row.deliveryKey) || !isManualReplyText(row.text) || !manualReplyStates.includes(row.state) ||
        ![row.createdAt, row.updatedAt].every((at) => typeof at === "string" && Number.isFinite(Date.parse(at)) && new Date(at).toISOString() === at) ||
        row.updatedAt < row.createdAt) return null;
    seen.add(row.deliveryKey);
  }
  return Object.freeze(value.map((row) => Object.freeze({ ...row })));
}
