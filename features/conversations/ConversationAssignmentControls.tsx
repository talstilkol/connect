"use client";

import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  InboxConversationView,
} from "../../shared/domain/conversationView.ts";
import {
  readConversationMessages,
} from "./conversationMessages.ts";

type ConversationAssignmentControlsProps = {
  conversation: InboxConversationView;
  language: InterfaceLanguage;
  canReply: boolean;
  isBusy: boolean;
  pendingConversationKey: string | null;
  changeSelectedAssignment: () => void;
  markSelectedRead: () => void;
};

export function ConversationAssignmentControls({
  conversation,
  language,
  canReply,
  isBusy,
  pendingConversationKey,
  changeSelectedAssignment,
  markSelectedRead,
}: ConversationAssignmentControlsProps) {
  const messages = readConversationMessages(
    language,
  ).assignmentControls;
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
            ? messages.updating
            : conversation.assignment === "current-user"
              ? messages.unassignSelf
              : conversation.assignment === "other-user"
                ? messages.assignedToOther
                : messages.assignSelf}
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
            {isPending
              ? messages.updating
              : messages.markRead}
          </button>
        ) : (
          <span className="status-pill warning">
            {messages.unread(
              conversation.unreadCount,
            )}
          </span>
        )
      ) : (
        <span className="status-pill success">
          {messages.read}
        </span>
      )}
    </div>
  );
}
