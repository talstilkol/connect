"use client";
import type { FormEvent } from "react";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft.ts";
import type { InboxConversationThreadView } from "../../shared/domain/conversationView.ts";
import { MANUAL_REPLY_TEXT_MAX_LENGTH, isManualReplyText } from "../../shared/domain/manualReply.ts";
import { sendManualReplyAction } from "../../server/conversations/conversationActions.ts";
import { readManualReplyMessages } from "./manualReplyMessages.ts";
import { submitManualReplyDraft, type ManualReplyDraft, type UpdateManualReplyDraft } from "./manualReplyDraft.ts";
import type { InboxRequestGate } from "./inboxRequestGate.ts";

export function ConversationComposerBoundary({ language, thread, canReply = false, isBusy = false, onSubmitted, draft, updateDraft, requestGate }: {
  language: InterfaceLanguage; thread?: InboxConversationThreadView; canReply?: boolean; isBusy?: boolean;
  onSubmitted?: (conversationKey: string) => Promise<void>; draft: ManualReplyDraft;
  updateDraft: UpdateManualReplyDraft; requestGate: InboxRequestGate;
}) {
  const messages = readManualReplyMessages(language);
  const key = thread?.conversation.conversationKey ?? "";
  const pending = thread?.manualReplies?.some((reply) => !["sent", "failed"].includes(reply.state)) === true;
  const assigned = thread?.conversation.assignment === "current-user" && thread.conversation.status !== "closed";
  const available = canReply && thread?.manualReplyEnabled === true;
  const disabled = isBusy || draft.busy || !available || !assigned || (pending && draft.request === null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || !thread || !isManualReplyText(draft.text)) return;
    await submitManualReplyDraft({ conversationKey: key, expectedVersion: thread.conversation.version,
      draft, gate: requestGate, update: updateDraft, send: sendManualReplyAction, onSubmitted });
  }
  return (
    <footer className="manual-reply-composer">
      {thread?.manualReplies?.map((reply) => <article className={`manual-reply-pending ${reply.state}`} key={reply.deliveryKey}>
        <p dir="auto">{reply.text}</p><small>{messages.states[reply.state]}</small>
      </article>)}
      <form onSubmit={submit}>
        <label><span>{messages.label}</span><textarea aria-label={messages.label} maxLength={MANUAL_REPLY_TEXT_MAX_LENGTH}
          dir="auto" rows={3} value={draft.text} disabled={disabled || draft.request !== null}
          onChange={(event) => updateDraft(key, { text: event.target.value, feedback: null })} /></label>
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
