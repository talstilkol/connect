import type {
  ConversationAssignmentStateView,
  ConversationReadStateView,
  InboxConversationThreadView,
  InboxView,
} from "../../shared/domain/conversationView.ts";

export type ConversationActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | { status: "invalid-input" }
  | { status: "not-found" }
  | { status: "state-conflict" }
  | { status: "assignment-conflict" }
  | { status: "server-error" };

export type LoadConversationThreadActionResult =
  | {
      status: "loaded";
      thread: InboxConversationThreadView;
    }
  | ConversationActionFailure;

export type MarkConversationReadActionResult =
  | {
      status: "marked-read";
      conversation: ConversationReadStateView;
    }
  | ConversationActionFailure;

export type ChangeConversationAssignmentActionResult =
  | {
      status: "assignment-updated";
      conversation:
        ConversationAssignmentStateView;
    }
  | ConversationActionFailure;

export type RefreshInboxActionResult =
  | {
      status: "refreshed";
      inbox: InboxView;
    }
  | ConversationActionFailure;
