import type {
  AiReplyApprovalDirectoryStatus,
  AiReplyApprovalDirectoryView,
} from "../../shared/domain/aiReplyApprovalView.ts";
import { createCurrentRailwayAiReplyApprovalHandler } from
  "./currentRailwayAiReplyApprovalHandler.ts";

export type CurrentAiReplyApprovalsResult =
  | {
      status: "ready";
      directory: AiReplyApprovalDirectoryView;
    }
  | {
      status: Exclude<AiReplyApprovalDirectoryStatus, "ready">;
      directory: {
        approvals: readonly [];
        canDecide: false;
      };
    };

const emptyDirectory = Object.freeze({
  approvals: [] as const,
  canDecide: false as const,
});

export async function readCurrentAiReplyApprovals():
Promise<CurrentAiReplyApprovalsResult> {
  try {
    const result = await createCurrentRailwayAiReplyApprovalHandler().load();
    if (result.status === "loaded") {
      return Object.freeze({
        status: "ready" as const,
        directory: result.directory,
      });
    }
    const status = result.status === "invalid-input" ||
        result.status === "not-found" ||
        result.status === "state-conflict" ||
        result.status === "invalid-state"
      ? "server-error"
      : result.status;
    return { status, directory: emptyDirectory };
  } catch {
    return { status: "server-error", directory: emptyDirectory };
  }
}
