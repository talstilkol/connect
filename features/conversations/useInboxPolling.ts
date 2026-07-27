"use client";

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  loadAiReplyApprovalsAction,
} from "../../server/ai/aiReplyApprovalActions.ts";
import {
  refreshInboxAction,
} from "../../server/conversations/conversationActions.ts";
import type {
  AiReplyApprovalActionFailure,
} from "../../server/ai/aiReplyApprovalActionResult.ts";
import type {
  AiReplyApprovalDirectoryStatus,
  AiReplyApprovalView,
} from "../../shared/domain/aiReplyApprovalView.ts";
import type {
  InboxConversationThreadView,
  InboxConversationView,
  InboxDirectoryStatus,
  InboxFilters,
} from "../../shared/domain/conversationView.ts";

export type InboxRefreshState =
  | "idle"
  | "refreshing"
  | "stale";

function toAiApprovalDirectoryStatus(
  failure:
    AiReplyApprovalActionFailure["status"],
): Exclude<
  AiReplyApprovalDirectoryStatus,
  "ready"
> {
  if (
    failure === "configuration-required" ||
    failure === "unauthenticated" ||
    failure === "onboarding-required" ||
    failure === "tenant-selection-required" ||
    failure === "permission-denied"
  ) {
    return failure;
  }

  return "server-error";
}

export function useInboxPolling({
  enabled,
  filters,
  selectedConversationKey,
  refreshInFlight,
  setConversations,
  setSelectedThread,
  setCanReply,
  setFilters,
  setAiApprovals,
  setCanDecideAi,
  setAiApprovalStatus,
  setRefreshState,
}: {
  enabled: boolean;
  filters: InboxFilters;
  selectedConversationKey: string | null;
  refreshInFlight: MutableRefObject<boolean>;
  setConversations: Dispatch<
    SetStateAction<
      readonly InboxConversationView[]
    >
  >;
  setSelectedThread: Dispatch<
    SetStateAction<
      InboxConversationThreadView | null
    >
  >;
  setCanReply: Dispatch<
    SetStateAction<boolean>
  >;
  setFilters: Dispatch<
    SetStateAction<InboxFilters>
  >;
  setAiApprovals: Dispatch<
    SetStateAction<
      readonly AiReplyApprovalView[]
    >
  >;
  setCanDecideAi: Dispatch<
    SetStateAction<boolean>
  >;
  setAiApprovalStatus: Dispatch<
    SetStateAction<AiReplyApprovalDirectoryStatus>
  >;
  setRefreshState: Dispatch<
    SetStateAction<InboxRefreshState>
  >;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;

    const refreshVisibleInbox = async () => {
      if (
        document.visibilityState !== "visible" ||
        refreshInFlight.current
      ) {
        return;
      }

      refreshInFlight.current = true;
      setRefreshState("refreshing");

      try {
        const [result, approvalResult] =
          await Promise.all([
            refreshInboxAction({
              filters,
              selectedConversationKey,
            }),
            loadAiReplyApprovalsAction(),
          ]);

        if (disposed) {
          return;
        }

        if (result.status !== "refreshed") {
          setRefreshState("stale");
          return;
        }

        setConversations(
          result.inbox.conversations,
        );
        setSelectedThread(
          result.inbox.selectedThread,
        );
        setCanReply(result.inbox.canReply);
        setFilters(result.inbox.filters);

        if (
          approvalResult.status === "loaded"
        ) {
          setAiApprovals(
            approvalResult.directory.approvals,
          );
          setCanDecideAi(
            approvalResult.directory.canDecide,
          );
          setAiApprovalStatus("ready");
          setRefreshState("idle");
        } else {
          setAiApprovalStatus(
            toAiApprovalDirectoryStatus(
              approvalResult.status,
            ),
          );
          setRefreshState("stale");
        }
      } catch {
        if (!disposed) {
          setRefreshState("stale");
        }
      } finally {
        refreshInFlight.current = false;
      }
    };

    const intervalId = window.setInterval(
      () => void refreshVisibleInbox(),
      15_000,
    );
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible"
      ) {
        void refreshVisibleInbox();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    enabled,
    filters,
    refreshInFlight,
    selectedConversationKey,
    setAiApprovalStatus,
    setAiApprovals,
    setCanDecideAi,
    setCanReply,
    setConversations,
    setFilters,
    setRefreshState,
    setSelectedThread,
  ]);
}

export function canEnableInboxPolling(
  authEnabled: boolean,
  initialStatus: InboxDirectoryStatus,
): boolean {
  return (
    authEnabled &&
    initialStatus === "ready"
  );
}
