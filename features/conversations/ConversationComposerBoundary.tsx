"use client";
import { useState, type FormEvent } from "react";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft.ts";
import type { InboxConversationThreadView } from "../../shared/domain/conversationView.ts";
import { MANUAL_REPLY_TEXT_MAX_LENGTH, isManualReplyText, type ManualReplyRequest } from "../../shared/domain/manualReply.ts";
import { sendManualReplyAction } from "../../server/conversations/conversationActions.ts";
import { readManualReplyMessages } from "./manualReplyMessages.ts";

interface Draft { text: string; request: ManualReplyRequest | null; busy: boolean; feedback: "queued" | "uncertain" | "rejected" | "windowClosed" | "blocked" | null }
const empty: Draft = { text: "", request: null, busy: false, feedback: null };
export function ConversationComposerBoundary({ language, thread, canReply = false, isBusy = false, onSubmitted }: {
  language: InterfaceLanguage; thread?: InboxConversationThreadView; canReply?: boolean; isBusy?: boolean; onSubmitted?: (conversationKey: string) => void;
}) {
  const messages = readManualReplyMessages(language);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const key = thread?.conversation.conversationKey ?? "";
  const draft = drafts[key] ?? empty;
  const update = (conversationKey: string, changes: Partial<Draft>) => setDrafts((current) => ({ ...current,
    [conversationKey]: { ...(current[conversationKey] ?? empty), ...changes } }));
  const pending = thread?.manualReplies?.some((reply) => !["sent", "failed"].includes(reply.state)) === true;
  const assigned = thread?.conversation.assignment === "current-user" && thread.conversation.status !== "closed";
  const available = canReply && thread?.manualReplyEnabled === true;
  const disabled = isBusy || draft.busy || !available || !assigned || (pending && draft.request === null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || !thread || !isManualReplyText(draft.text)) return;
    const request = draft.request ?? { conversationKey: key, expectedVersion: thread.conversation.version, text: draft.text };
    update(key, { request, busy: true, feedback: null });
    let result;
    try { result = await sendManualReplyAction(request); } catch { result = { status: "server-error" as const }; }
    if (result.status === "queued") {
      update(key, { text: "", request: null, busy: false, feedback: "queued" });
      onSubmitted?.(key);
    } else if (result.status === "server-error" || draft.request !== null) update(key, { busy: false, feedback: "uncertain" });
    else update(key, { busy: false, request: null, feedback: result.status === "window-closed" ? "windowClosed" :
      result.status === "contact-blocked" ? "blocked" : "rejected" });
  }
  return (
    <footer className="manual-reply-composer">
      {thread?.manualReplies?.map((reply) => <article className={`manual-reply-pending ${reply.state}`} key={reply.deliveryKey}>
        <p dir="auto">{reply.text}</p><small>{messages.states[reply.state]}</small>
      </article>)}
      <form onSubmit={submit}>
        <label><span>{messages.label}</span><textarea aria-label={messages.label} maxLength={MANUAL_REPLY_TEXT_MAX_LENGTH}
          dir="auto" rows={3} value={draft.text} disabled={disabled || draft.request !== null}
          onChange={(event) => update(key, { text: event.target.value, feedback: null })} /></label>
        <button className="primary-button" type="submit" disabled={disabled || !isManualReplyText(draft.text)}>
          {draft.busy ? messages.busy : draft.request !== null ? messages.retry : messages.send}
        </button>
        <small>{draft.text.length} / {MANUAL_REPLY_TEXT_MAX_LENGTH}</small>
      </form>
      <p>{!available ? messages.unavailable : !assigned ? messages.assignment : pending ? messages.pending : messages.window}</p>
      {draft.feedback !== null ? <p role="status" aria-live="polite">{messages[draft.feedback]}</p> : null}
    </footer>
  );
}
