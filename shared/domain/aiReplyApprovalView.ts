export type AiReplyApprovalDirectoryStatus =
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "ready"
  | "server-error";

export interface AiReplyApprovalView {
  outboxKey: string;
  conversationKey: string;
  replyText: string;
  groundedSourceCount: number;
  groundingScoreBasisPoints: number;
  version: number;
  createdAt: string;
}

export interface AiReplyApprovalDirectoryView {
  approvals:
    readonly AiReplyApprovalView[];
  canDecide: boolean;
}

export interface AiReplyApprovalDecisionView {
  outboxKey: string;
  status: "ready-for-delivery" | "rejected";
  version: number;
}

