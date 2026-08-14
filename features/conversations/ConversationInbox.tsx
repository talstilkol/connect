"use client";

import {
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import type {
  ConversationActionFailure,
} from "../../server/conversations/conversationActionResult.ts";
import type {
  AiReplyApprovalActionFailure,
} from "../../server/ai/aiReplyApprovalActionResult.ts";
import {
  decideAiReplyApprovalAction,
} from "../../server/ai/aiReplyApprovalActions.ts";
import {
  changeConversationAssignmentAction,
  loadConversationThreadAction,
  markConversationReadAction,
  refreshInboxAction,
} from "../../server/conversations/conversationActions.ts";
import {
  defaultInboxFilters,
  type InboxConversationThreadView,
  type InboxConversationView,
  type InboxDirectoryStatus,
  type InboxFilters,
  type InboxView,
} from "../../shared/domain/conversationView.ts";
import type {
  AiReplyApprovalDirectoryStatus,
  AiReplyApprovalDirectoryView,
  AiReplyApprovalView,
} from "../../shared/domain/aiReplyApprovalView.ts";
import {
  canMarkConversationRead,
  conversationAssignmentLabels,
  conversationStatusLabels,
  hasActiveInboxFilters,
  inboxDirectoryFailureMessages,
  replaceInboxConversation,
} from "./conversationPresentation.ts";
import {
  canEnableInboxPolling,
  useInboxPolling,
  type InboxRefreshState,
} from "./useInboxPolling.ts";
import {
  ConversationThreadList,
} from "./ConversationThreadList.tsx";
import {
  ConversationMessageView,
} from "./ConversationMessageView.tsx";

type Feedback = {
  tone: "success" | "warning";
  message: string;
} | null;

const actionFailureMessages: Record<
  ConversationActionFailure["status"],
  string
> = {
  "configuration-required":
    "הפעולה דורשת Clerk ו־D1 מוגדרים.",
  unauthenticated:
    "נדרשת התחברות מחדש לפני ביצוע הפעולה.",
  "onboarding-required":
    "נדרש להשלים יצירת סביבת עבודה.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה.",
  "permission-denied":
    "אין הרשאה לבצע את הפעולה.",
  "invalid-input":
    "זהות השיחה, הגרסה או המסננים אינם תקינים.",
  "not-found":
    "השיחה אינה קיימת עוד ב־Tenant הפעיל.",
  "state-conflict":
    "השיחה השתנתה במקביל. יש לטעון אותה מחדש.",
  "assignment-conflict":
    "השיחה כבר משויכת לנציג אחר ולכן לא שונתה.",
  "server-error":
    "הפעולה נכשלה בלי לחשוף פרטי שרת.",
};

const aiApprovalFailureMessages: Record<
  AiReplyApprovalActionFailure["status"],
  string
> = {
  "configuration-required":
    "אישורי AI דורשים Clerk ו־D1 מוגדרים.",
  unauthenticated:
    "נדרשת התחברות מחדש לפני החלטה.",
  "onboarding-required":
    "נדרש להשלים יצירת סביבת עבודה.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה.",
  "permission-denied":
    "אין הרשאה לאשר או לדחות תשובת AI.",
  "invalid-input":
    "זהות האישור או הגרסה אינן תקינות.",
  "not-found":
    "טיוטת ה־AI אינה קיימת עוד.",
  "state-conflict":
    "טיוטת ה־AI כבר השתנתה או הוכרעה.",
  "invalid-state":
    "נכנסה הודעה חדשה או שהשיחה אינה מאפשרת עוד את האישור.",
  "server-error":
    "פעולת אישור ה־AI נכשלה בלי לחשוף פרטי שרת.",
};

function failureState(
  status: Exclude<InboxDirectoryStatus, "ready">,
) {
  return (
    <section className="card inbox-state">
      <span aria-hidden="true">!</span>
      <strong>תיבת השיחות אינה זמינה</strong>
      <p>{inboxDirectoryFailureMessages[status]}</p>
    </section>
  );
}

export function ConversationInbox({
  authEnabled,
  initialInbox,
  initialStatus,
  initialAiReplyApprovals,
  initialAiReplyApprovalStatus,
}: {
  authEnabled: boolean;
  initialInbox: InboxView;
  initialStatus: InboxDirectoryStatus;
  initialAiReplyApprovals:
    AiReplyApprovalDirectoryView;
  initialAiReplyApprovalStatus:
    AiReplyApprovalDirectoryStatus;
}) {
  const [conversations, setConversations] =
    useState<readonly InboxConversationView[]>(
      initialInbox.conversations,
    );
  const [selectedThread, setSelectedThread] =
    useState<InboxConversationThreadView | null>(
      initialInbox.selectedThread,
    );
  const [canReply, setCanReply] = useState(
    initialInbox.canReply,
  );
  const [aiApprovals, setAiApprovals] =
    useState<readonly AiReplyApprovalView[]>(
      initialAiReplyApprovals.approvals,
    );
  const [canDecideAi, setCanDecideAi] =
    useState(
      initialAiReplyApprovals.canDecide,
    );
  const [
    aiApprovalStatus,
    setAiApprovalStatus,
  ] = useState<AiReplyApprovalDirectoryStatus>(
    initialAiReplyApprovalStatus,
  );
  const [filters, setFilters] =
    useState<InboxFilters>(initialInbox.filters);
  const [filterDraft, setFilterDraft] =
    useState<InboxFilters>(initialInbox.filters);
  const [feedback, setFeedback] =
    useState<Feedback>(null);
  const [refreshState, setRefreshState] =
    useState<InboxRefreshState>("idle");
  const [pendingConversationKey, setPendingConversationKey] =
    useState<string | null>(null);
  const [pendingApprovalKey, setPendingApprovalKey] =
    useState<string | null>(null);
  const [isPending, startTransition] =
    useTransition();
  const refreshInFlight = useRef(false);
  const selectedConversationKey =
    selectedThread?.conversation.conversationKey ??
    null;

  useInboxPolling({
    enabled: canEnableInboxPolling(
      authEnabled,
      initialStatus,
    ),
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
  });

  if (
    !authEnabled ||
    initialStatus === "configuration-required"
  ) {
    return failureState("configuration-required");
  }

  if (initialStatus !== "ready") {
    return failureState(initialStatus);
  }

  const applyInboxView = (
    inbox: InboxView,
    updateDraft: boolean,
  ) => {
    setConversations(inbox.conversations);
    setSelectedThread(inbox.selectedThread);
    setCanReply(inbox.canReply);
    setFilters(inbox.filters);

    if (updateDraft) {
      setFilterDraft(inbox.filters);
    }
  };

  const requestFilteredInbox = (
    nextFilters: InboxFilters,
  ) => {
    if (isPending || refreshInFlight.current) {
      setFeedback({
        tone: "warning",
        message:
          "מתבצע רענון כעת. אפשר לנסות שוב מיד בסיומו.",
      });
      return;
    }

    setFeedback(null);
    refreshInFlight.current = true;
    setRefreshState("refreshing");

    startTransition(async () => {
      try {
        const result = await refreshInboxAction({
          filters: nextFilters,
          selectedConversationKey,
        });

        if (result.status !== "refreshed") {
          setFeedback({
            tone: "warning",
            message:
              actionFailureMessages[result.status],
          });
          setRefreshState("stale");
          return;
        }

        applyInboxView(result.inbox, true);
        setRefreshState("idle");
      } catch {
        setFeedback({
          tone: "warning",
          message:
            actionFailureMessages["server-error"],
        });
        setRefreshState("stale");
      } finally {
        refreshInFlight.current = false;
      }
    });
  };

  const submitFilters = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    requestFilteredInbox(filterDraft);
  };

  const resetFilters = () => {
    const clearedFilters = {
      ...defaultInboxFilters,
    };

    setFilterDraft(clearedFilters);
    requestFilteredInbox(clearedFilters);
  };

  const loadThread = (
    conversation: InboxConversationView,
  ) => {
    if (isPending || refreshInFlight.current) {
      return;
    }

    setFeedback(null);
    setPendingConversationKey(
      conversation.conversationKey,
    );

    startTransition(async () => {
      try {
        const result =
          await loadConversationThreadAction(
            conversation.conversationKey,
          );

        if (result.status !== "loaded") {
          setFeedback({
            tone: "warning",
            message:
              actionFailureMessages[result.status],
          });
          return;
        }

        setSelectedThread(result.thread);
        setConversations((current) =>
          replaceInboxConversation(
            current,
            result.thread.conversation,
          ),
        );
      } catch {
        setFeedback({
          tone: "warning",
          message:
            actionFailureMessages["server-error"],
        });
      } finally {
        setPendingConversationKey(null);
      }
    });
  };

  const markSelectedRead = () => {
    if (
      !canMarkConversationRead(
        selectedThread,
        canReply,
        isPending || refreshInFlight.current,
      )
    ) {
      return;
    }

    const selectedConversation =
      selectedThread.conversation;
    setFeedback(null);
    setPendingConversationKey(
      selectedConversation.conversationKey,
    );

    startTransition(async () => {
      try {
        const result =
          await markConversationReadAction({
            conversationKey:
              selectedConversation.conversationKey,
            expectedVersion:
              selectedConversation.version,
          });

        if (result.status !== "marked-read") {
          setFeedback({
            tone: "warning",
            message:
              actionFailureMessages[result.status],
          });
          return;
        }

        const updatedConversation = {
          ...selectedConversation,
          unreadCount:
            result.conversation.unreadCount,
          version: result.conversation.version,
        };

        setConversations((current) =>
          replaceInboxConversation(
            current,
            updatedConversation,
          ),
        );
        setSelectedThread((current) =>
          current &&
          current.conversation.conversationKey ===
            result.conversation.conversationKey
            ? {
                ...current,
                conversation: updatedConversation,
              }
            : current,
        );
        setFeedback({
          tone: "success",
          message: "השיחה סומנה כנקראה.",
        });
      } catch {
        setFeedback({
          tone: "warning",
          message:
            actionFailureMessages["server-error"],
        });
      } finally {
        setPendingConversationKey(null);
      }
    });
  };

  const changeSelectedAssignment = () => {
    const selectedConversation =
      selectedThread?.conversation;

    if (
      !selectedConversation ||
      !canReply ||
      selectedConversation.assignment ===
        "other-user" ||
      isPending ||
      refreshInFlight.current
    ) {
      return;
    }

    const action =
      selectedConversation.assignment ===
      "current-user"
        ? "unassign-self"
        : "assign-self";

    setFeedback(null);
    setPendingConversationKey(
      selectedConversation.conversationKey,
    );

    startTransition(async () => {
      try {
        const result =
          await changeConversationAssignmentAction({
            conversationKey:
              selectedConversation.conversationKey,
            expectedVersion:
              selectedConversation.version,
            action,
          });

        if (
          result.status !==
          "assignment-updated"
        ) {
          setFeedback({
            tone: "warning",
            message:
              actionFailureMessages[result.status],
          });
          return;
        }

        const updatedConversation = {
          ...selectedConversation,
          assignment:
            result.conversation.assignment,
          version: result.conversation.version,
        };

        setConversations((current) =>
          replaceInboxConversation(
            current,
            updatedConversation,
          ),
        );
        setSelectedThread((current) =>
          current &&
          current.conversation.conversationKey ===
            result.conversation.conversationKey
            ? {
                ...current,
                conversation: updatedConversation,
              }
            : current,
        );
        setFeedback({
          tone: "success",
          message:
            result.conversation.assignment ===
            "current-user"
              ? "השיחה שויכה אליך."
              : "השיוך שלך הוסר מהשיחה.",
        });
      } catch {
        setFeedback({
          tone: "warning",
          message:
            actionFailureMessages["server-error"],
        });
      } finally {
        setPendingConversationKey(null);
      }
    });
  };

  const decideAiApproval = (
    approval: AiReplyApprovalView,
    decision: "approve" | "reject",
  ) => {
    if (
      !canDecideAi ||
      isPending ||
      refreshInFlight.current
    ) {
      return;
    }

    setFeedback(null);
    setPendingApprovalKey(
      approval.outboxKey,
    );

    startTransition(async () => {
      try {
        const result =
          await decideAiReplyApprovalAction({
            outboxKey: approval.outboxKey,
            expectedVersion: approval.version,
            decision,
          });

        if (result.status !== "decided") {
          setFeedback({
            tone: "warning",
            message:
              aiApprovalFailureMessages[
                result.status
              ],
          });
          return;
        }

        setAiApprovals((current) =>
          current.filter(
            (candidate) =>
              candidate.outboxKey !==
              result.approval.outboxKey,
          ),
        );
        setFeedback({
          tone: "success",
          message:
            result.approval.status ===
            "ready-for-delivery"
              ? "תשובת ה־AI אושרה ונשמרה למסירה עתידית. היא עדיין לא נשלחה."
              : "תשובת ה־AI נדחתה ולא תימסר.",
        });
      } catch {
        setFeedback({
          tone: "warning",
          message:
            aiApprovalFailureMessages[
              "server-error"
            ],
        });
      } finally {
        setPendingApprovalKey(null);
      }
    });
  };

  if (
    conversations.length === 0 &&
    !hasActiveInboxFilters(filters)
  ) {
    return (
      <section className="card inbox-state empty">
        <span aria-hidden="true">◌</span>
        <strong>אין שיחות בתיבה</strong>
        <p>
          שיחה תופיע כאן רק לאחר קבלת הודעה מאומתת
          דרך Webhook של Meta ושמירתה ב־D1.
        </p>
        <small
          className={`inbox-refresh-state ${refreshState}`}
          aria-live="polite"
        >
          {refreshState === "refreshing"
            ? "בודק הודעות חדשות…"
            : refreshState === "stale"
              ? "הרענון האחרון נכשל"
              : "בדיקה אוטומטית כל 15 שניות"}
        </small>
      </section>
    );
  }

  const selectedConversation =
    selectedThread?.conversation ?? null;
  const selectedAiApprovals =
    selectedConversation
      ? aiApprovals.filter(
          (approval) =>
            approval.conversationKey ===
            selectedConversation.conversationKey,
        )
      : [];
  const isBusy =
    isPending || refreshState === "refreshing";

  return (
    <div className="inbox-shell card">
      <ConversationThreadList
        conversations={conversations}
        selectedConversation={selectedConversation}
        pendingConversationKey={pendingConversationKey}
        filters={filters}
        filterDraft={filterDraft}
        refreshState={refreshState}
        isBusy={isBusy}
        setFilterDraft={setFilterDraft}
        submitFilters={submitFilters}
        resetFilters={resetFilters}
        loadThread={loadThread}
      />

      <ConversationMessageView
        selectedThread={selectedThread}
        conversations={conversations}
        selectedAiApprovals={selectedAiApprovals}
        canReply={canReply}
        canDecideAi={canDecideAi}
        aiApprovalStatus={aiApprovalStatus}
        feedback={feedback}
        isBusy={isBusy}
        pendingConversationKey={pendingConversationKey}
        pendingApprovalKey={pendingApprovalKey}
        changeSelectedAssignment={
          changeSelectedAssignment
        }
        markSelectedRead={markSelectedRead}
        decideAiApproval={decideAiApproval}
      />

      <aside className="contact-panel">
        <span className="panel-label">
          פרטי איש קשר
        </span>
        {selectedConversation ? (
          <div className="contact-panel-content">
            <span
              className="contact-panel-avatar"
              aria-hidden="true"
            >
              {selectedConversation.contact.displayName
                .slice(0, 1)
                .toUpperCase()}
            </span>
            <h2>
              {selectedConversation.contact.displayName}
            </h2>
            <a
              href={`tel:${selectedConversation.contact.phoneNumber}`}
              dir="ltr"
            >
              {selectedConversation.contact.phoneNumber}
            </a>
            <dl>
              <div>
                <dt>מצב שיחה</dt>
                <dd>
                  {
                    conversationStatusLabels[
                      selectedConversation.status
                    ]
                  }
                </dd>
              </div>
              <div>
                <dt>שיוך</dt>
                <dd>
                  {
                    conversationAssignmentLabels[
                      selectedConversation.assignment
                    ]
                  }
                </dd>
              </div>
              <div>
                <dt>לא נקראו</dt>
                <dd>
                  {selectedConversation.unreadCount}
                </dd>
              </div>
              <div>
                <dt>גרסה</dt>
                <dd>{selectedConversation.version}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="contact-panel-empty">
            יש לבחור שיחה להצגת הפרטים.
          </p>
        )}
      </aside>
    </div>
  );
}
