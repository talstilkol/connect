import type { SendManualReplyActionResult } from "../../server/conversations/conversationActionResult.ts";
import { parseManualReplyRequest, parseManualReplySubmission, type ManualReplyRequest } from "../../shared/domain/manualReply.ts";
import { acquireInboxRequest, type InboxRequestGate } from "./inboxRequestGate.ts";

export interface ManualReplyDraft {
  readonly text: string;
  readonly request: ManualReplyRequest | null;
  readonly busy: boolean;
  readonly feedback: "queued" | "uncertain" | "rejected" | "windowClosed" | "blocked" | null;
}
export type ManualReplyDrafts = Readonly<Record<string, ManualReplyDraft>>;
export type UpdateManualReplyDraft = (conversationKey: string, changes: Partial<ManualReplyDraft>) => void;
export const emptyManualReplyDraft: ManualReplyDraft = Object.freeze({ text: "", request: null, busy: false, feedback: null });

export function updateManualReplyDrafts(current: ManualReplyDrafts, key: string, changes: Partial<ManualReplyDraft>): ManualReplyDrafts {
  return { ...current, [key]: { ...(current[key] ?? emptyManualReplyDraft), ...changes } };
}

/** The Inbox owns this state even while filters remove the composer from the tree. */
export async function submitManualReplyDraft(input: Readonly<{
  conversationKey: string;
  expectedVersion: number;
  draft: ManualReplyDraft;
  gate: InboxRequestGate;
  update: UpdateManualReplyDraft;
  send: (request: ManualReplyRequest) => Promise<SendManualReplyActionResult>;
  onSubmitted?: (conversationKey: string) => Promise<void>;
}>): Promise<void> {
  const { draft, update, conversationKey } = input;
  const request = parseManualReplyRequest(draft.request ?? {
    conversationKey, expectedVersion: input.expectedVersion, text: draft.text,
  });
  if (!request || request.conversationKey !== conversationKey || draft.busy) return;
  const release = acquireInboxRequest(input.gate);
  if (!release) return;
  update(conversationKey, { request, busy: true, feedback: null });
  try {
    let result: SendManualReplyActionResult;
    try { result = await input.send(request); } catch { result = { status: "server-error" }; }
    if (result.status === "queued" && parseManualReplySubmission(result.submission, request)) {
      update(conversationKey, { text: "", request: null, feedback: "queued" });
      // Keep polling and other mutations paused until the confirmation read finishes.
      // A read failure cannot turn an acknowledged mutation into an unknown one.
      try { await input.onSubmitted?.(conversationKey); } catch { /* The next poll retries only the read. */ }
    } else if (result.status === "server-error" || result.status === "queued" || draft.request !== null) {
      update(conversationKey, { feedback: "uncertain" });
    } else {
      update(conversationKey, { request: null, feedback: result.status === "window-closed" ? "windowClosed" :
        result.status === "contact-blocked" ? "blocked" : "rejected" });
    }
  } finally {
    update(conversationKey, { busy: false });
    release();
  }
}
