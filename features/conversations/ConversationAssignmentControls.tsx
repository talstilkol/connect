"use client";

import type {
  InboxConversationView,
} from "../../shared/domain/conversationView.ts";

type ConversationAssignmentControlsProps = {
  conversation: InboxConversationView;
  canReply: boolean;
  isBusy: boolean;
  pendingConversationKey: string | null;
  changeSelectedAssignment: () => void;
  markSelectedRead: () => void;
};

export function ConversationAssignmentControls({
  conversation,
  canReply,
  isBusy,
  pendingConversationKey,
  changeSelectedAssignment,
  markSelectedRead,
}: ConversationAssignmentControlsProps) {
  const isPending =
    pendingConversationKey === conversation.conversationKey;

  return (
    <div className="conversation-stage-actions">
      {canReply ? (
        <button
          className="secondary-button"
          type="button"
          disabled={
            isBusy ||
            conversation.assignment === "other-user"
          }
          onClick={changeSelectedAssignment}
        >
          {isPending
            ? "מעדכן…"
            : conversation.assignment === "current-user"
              ? "הסר שיוך שלי"
              : conversation.assignment === "other-user"
                ? "משויכת לנציג אחר"
                : "שייך אליי"}
        </button>
      ) : null}
      {conversation.unreadCount > 0 ? (
        canReply ? (
          <button
            className="secondary-button"
            type="button"
            disabled={isBusy}
            onClick={markSelectedRead}
          >
            {isPending ? "מעדכן…" : "סימון כנקראה"}
          </button>
        ) : (
          <span className="status-pill warning">
            {conversation.unreadCount} לא נקראו
          </span>
        )
      ) : (
        <span className="status-pill success">
          נקראה
        </span>
      )}
    </div>
  );
}
