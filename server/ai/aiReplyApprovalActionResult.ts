import type {
  AiReplyApprovalDecisionView,
  AiReplyApprovalDirectoryView,
} from "../../shared/domain/aiReplyApprovalView.ts";

export type AiReplyApprovalActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | { status: "invalid-input" }
  | { status: "not-found" }
  | { status: "state-conflict" }
  | { status: "invalid-state" }
  | { status: "server-error" };

export type LoadAiReplyApprovalsActionResult =
  | {
      status: "loaded";
      directory:
        AiReplyApprovalDirectoryView;
    }
  | AiReplyApprovalActionFailure;

export type DecideAiReplyApprovalActionResult =
  | {
      status: "decided";
      outcome: "updated" | "unchanged";
      approval:
        AiReplyApprovalDecisionView;
    }
  | AiReplyApprovalActionFailure;

