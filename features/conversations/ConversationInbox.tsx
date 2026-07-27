"use client";

import {
  useEffect,
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
  loadAiReplyApprovalsAction,
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
  conversationStatusLabels,
  formatInboxTimestamp,
  inboxDirectoryFailureMessages,
  messageBody,
  messageStatusLabels,
  replaceInboxConversation,
} from "./conversationPresentation.ts";

type Feedback = {
  tone: "success" | "warning";
  message: string;
} | null;

type RefreshState =
  | "idle"
  | "refreshing"
  | "stale";

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

const assignmentLabels: Record<
  InboxConversationView["assignment"],
  string
> = {
  unassigned: "ללא שיוך",
  "current-user": "משויכת אליי",
  "other-user": "משויכת לנציג אחר",
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

function hasActiveFilters(
  filters: InboxFilters,
): boolean {
  return (
    filters.searchTerm !== "" ||
    filters.status !== "all" ||
    filters.assignment !== "all"
  );
}

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
    useState<RefreshState>("idle");
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

  useEffect(() => {
    if (
      !authEnabled ||
      initialStatus !== "ready"
    ) {
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
      if (document.visibilityState === "visible") {
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
    authEnabled,
    filters,
    initialStatus,
    selectedConversationKey,
  ]);

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
    !hasActiveFilters(filters)
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
      <section
        className="conversation-list"
        aria-label="רשימת שיחות"
      >
        <header className="conversation-list-header">
          <div>
            <span className="card-kicker">
              D1 source of truth
            </span>
            <h2>שיחות אחרונות</h2>
          </div>
          <span className="status-pill">
            {conversations.length}
          </span>
        </header>

        <form
          className="inbox-filters"
          onSubmit={submitFilters}
        >
          <label>
            <span>חיפוש</span>
            <input
              type="search"
              maxLength={80}
              value={filterDraft.searchTerm}
              placeholder="שם או מספר טלפון"
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  searchTerm: event.target.value,
                }))
              }
            />
          </label>
          <div className="inbox-filter-row">
            <label>
              <span>מצב</span>
              <select
                value={filterDraft.status}
                onChange={(event) =>
                  setFilterDraft((current) => ({
                    ...current,
                    status: event.target
                      .value as InboxFilters["status"],
                  }))
                }
              >
                <option value="all">כל המצבים</option>
                {Object.entries(
                  conversationStatusLabels,
                ).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>שיוך</span>
              <select
                value={filterDraft.assignment}
                onChange={(event) =>
                  setFilterDraft((current) => ({
                    ...current,
                    assignment: event.target
                      .value as InboxFilters["assignment"],
                  }))
                }
              >
                <option value="all">כל השיחות</option>
                <option value="unassigned">
                  ללא שיוך
                </option>
                <option value="mine">שלי</option>
              </select>
            </label>
          </div>
          <div className="inbox-filter-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={isBusy}
            >
              {refreshState === "refreshing"
                ? "טוען…"
                : "החל מסננים"}
            </button>
            <button
              className="text-button"
              type="button"
              disabled={
                isBusy ||
                (!hasActiveFilters(filters) &&
                  !hasActiveFilters(filterDraft))
              }
              onClick={resetFilters}
            >
              ניקוי
            </button>
          </div>
          <small
            className={`inbox-refresh-state ${refreshState}`}
            aria-live="polite"
          >
            {refreshState === "refreshing"
              ? "מרענן מהשרת…"
              : refreshState === "stale"
                ? "הרענון האחרון נכשל"
                : "רענון מאובטח כל 15 שניות"}
          </small>
        </form>

        <div className="conversation-records">
          {conversations.length === 0 ? (
            <div className="conversation-list-empty">
              <strong>לא נמצאו שיחות</strong>
              <p>
                אפשר לשנות את החיפוש או לנקות את
                המסננים.
              </p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const isSelected =
                selectedConversation?.conversationKey ===
                conversation.conversationKey;
              const isLoading =
                pendingConversationKey ===
                conversation.conversationKey;

              return (
                <button
                  type="button"
                  className={`conversation-record ${
                    isSelected ? "selected" : ""
                  }`}
                  key={conversation.conversationKey}
                  aria-pressed={isSelected}
                  disabled={isBusy}
                  onClick={() =>
                    loadThread(conversation)
                  }
                >
                  <span
                    className="conversation-avatar"
                    aria-hidden="true"
                  >
                    {conversation.contact.displayName
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                  <span className="conversation-record-copy">
                    <span className="conversation-record-topline">
                      <strong>
                        {
                          conversation.contact
                            .displayName
                        }
                      </strong>
                      <time
                        dateTime={
                          conversation.lastMessage
                            ?.occurredAt
                        }
                      >
                        {conversation.lastMessage
                          ? formatInboxTimestamp(
                              conversation.lastMessage
                                .occurredAt,
                            )
                          : "ללא הודעות"}
                      </time>
                    </span>
                    <span className="conversation-preview">
                      {isLoading
                        ? "טוען שיחה…"
                        : conversation.lastMessage
                          ? conversation.lastMessage
                              .contentKind === "text"
                            ? conversation.lastMessage
                                .textContent
                            : "הודעה ללא תוכן טקסט"
                          : "אין תצוגה מקדימה"}
                    </span>
                    <span className="conversation-record-meta">
                      <span className="conversation-record-labels">
                        <small>
                          {
                            conversationStatusLabels[
                              conversation.status
                            ]
                          }
                        </small>
                        <small>
                          {
                            assignmentLabels[
                              conversation.assignment
                            ]
                          }
                        </small>
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <b
                          aria-label={`${conversation.unreadCount} הודעות שלא נקראו`}
                        >
                          {conversation.unreadCount}
                        </b>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section
        className="conversation-stage"
        aria-label="תוכן השיחה"
      >
        {selectedThread ? (
          <>
            <header className="conversation-stage-header">
              <div>
                <span className="card-kicker">
                  שיחה מאובטחת
                </span>
                <h2>
                  {
                    selectedThread.conversation.contact
                      .displayName
                  }
                </h2>
                <p>
                  {
                    conversationStatusLabels[
                      selectedThread.conversation.status
                    ]
                  }
                  {" · "}
                  {
                    assignmentLabels[
                      selectedThread.conversation
                        .assignment
                    ]
                  }
                </p>
              </div>
              <div className="conversation-stage-actions">
                {canReply ? (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={
                      isBusy ||
                      selectedThread.conversation
                        .assignment === "other-user"
                    }
                    onClick={changeSelectedAssignment}
                  >
                    {pendingConversationKey ===
                    selectedThread.conversation
                      .conversationKey
                      ? "מעדכן…"
                      : selectedThread.conversation
                            .assignment ===
                          "current-user"
                        ? "הסר שיוך שלי"
                        : selectedThread.conversation
                              .assignment ===
                            "other-user"
                          ? "משויכת לנציג אחר"
                          : "שייך אליי"}
                  </button>
                ) : null}
                {selectedThread.conversation
                  .unreadCount > 0 ? (
                  canReply ? (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={isBusy}
                      onClick={markSelectedRead}
                    >
                      {pendingConversationKey ===
                      selectedThread.conversation
                        .conversationKey
                        ? "מעדכן…"
                        : "סימון כנקראה"}
                    </button>
                  ) : (
                    <span className="status-pill warning">
                      {
                        selectedThread.conversation
                          .unreadCount
                      }{" "}
                      לא נקראו
                    </span>
                  )
                ) : (
                  <span className="status-pill success">
                    נקראה
                  </span>
                )}
              </div>
            </header>

            {!canReply ? (
              <div className="inline-notice warning">
                <span aria-hidden="true">i</span>
                <p>
                  לתפקיד הנוכחי יש הרשאת צפייה בלבד.
                </p>
              </div>
            ) : null}

            {feedback ? (
              <div
                className={`inline-notice ${feedback.tone}`}
                role="status"
              >
                <span aria-hidden="true">
                  {feedback.tone === "success"
                    ? "✓"
                    : "!"}
                </span>
                <p>{feedback.message}</p>
              </div>
            ) : null}

            {aiApprovalStatus !== "ready" ? (
              <div className="inline-notice warning">
                <span aria-hidden="true">!</span>
                <p>
                  רשימת אישורי ה־AI אינה זמינה כרגע.
                  השיחות עצמן נשארות זמינות לצפייה.
                </p>
              </div>
            ) : null}

            {selectedAiApprovals.map(
              (approval) => (
                <article
                  className="ai-approval-card"
                  key={approval.outboxKey}
                >
                  <header>
                    <div>
                      <span className="card-kicker">
                        AI · ממתין להחלטה
                      </span>
                      <h3>תשובה מוצעת</h3>
                    </div>
                    <span className="status-pill warning">
                      אישור נציג
                    </span>
                  </header>
                  <p>{approval.replyText}</p>
                  <dl>
                    <div>
                      <dt>Grounding</dt>
                      <dd>
                        {Math.floor(
                          approval.groundingScoreBasisPoints /
                            100,
                        )}
                        %
                      </dd>
                    </div>
                    <div>
                      <dt>מקורות מאושרים</dt>
                      <dd>
                        {
                          approval.groundedSourceCount
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>נוצרה</dt>
                      <dd>
                        {formatInboxTimestamp(
                          approval.createdAt,
                        )}
                      </dd>
                    </div>
                  </dl>
                  <footer>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={
                        !canDecideAi || isBusy
                      }
                      onClick={() =>
                        decideAiApproval(
                          approval,
                          "approve",
                        )
                      }
                    >
                      {pendingApprovalKey ===
                      approval.outboxKey
                        ? "שומר החלטה…"
                        : "אישור התשובה"}
                    </button>
                    <button
                      className="secondary-button danger-text-button"
                      type="button"
                      disabled={
                        !canDecideAi || isBusy
                      }
                      onClick={() =>
                        decideAiApproval(
                          approval,
                          "reject",
                        )
                      }
                    >
                      דחייה
                    </button>
                  </footer>
                  {!canDecideAi ? (
                    <small>
                      לתפקיד הנוכחי יש הרשאת צפייה
                      בלבד.
                    </small>
                  ) : null}
                </article>
              ),
            )}

            <div
              className="message-stream"
              aria-live="polite"
              aria-busy={isBusy}
            >
              {selectedThread.messages.length === 0 ? (
                <div className="conversation-thread-empty">
                  <strong>אין הודעות בשיחה</strong>
                  <p>
                    ה־Conversation קיימת, אך לא הוחזרו
                    הודעות מה־Repository.
                  </p>
                </div>
              ) : (
                selectedThread.messages.map((message) => (
                  <article
                    className={`message-bubble ${message.direction}`}
                    key={message.messageKey}
                  >
                    <p>{messageBody(message)}</p>
                    <footer>
                      <time
                        dateTime={message.occurredAt}
                      >
                        {formatInboxTimestamp(
                          message.occurredAt,
                        )}
                      </time>
                      <span>
                        {
                          messageStatusLabels[
                            message.status
                          ]
                        }
                      </span>
                    </footer>
                  </article>
                ))
              )}
            </div>

            <footer className="outbound-boundary">
              <span aria-hidden="true">i</span>
              <p>
                צפייה, שיוך ואישור תשובות AI פעילים.
                אישור שומר את התשובה למסירה עתידית
                בלבד; שליחה נשארת חסומה עד חיבור
                Adapter מאושר.
              </p>
            </footer>
          </>
        ) : (
          <div className="conversation-stage-empty">
            <div
              className="empty-orbit"
              aria-hidden="true"
            >
              <span>◌</span>
            </div>
            <h2>
              {conversations.length === 0
                ? "אין תוצאות"
                : "בחרו שיחה"}
            </h2>
            <p>
              {conversations.length === 0
                ? "שנו את המסננים כדי להציג שיחות."
                : "ההודעות ופרטי איש הקשר יוצגו כאן לאחר טעינה מאומתת מהשרת."}
            </p>
          </div>
        )}
      </section>

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
                    assignmentLabels[
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
