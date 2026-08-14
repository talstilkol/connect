"use client";

import type {
  InboxConversationThreadView,
  InboxConversationView,
} from "../../shared/domain/conversationView.ts";
import type {
  AiReplyApprovalDirectoryStatus,
  AiReplyApprovalView,
} from "../../shared/domain/aiReplyApprovalView.ts";
import {
  conversationAssignmentLabels,
  conversationStatusLabels,
  formatInboxTimestamp,
  messageBody,
  messageStatusLabels,
} from "./conversationPresentation.ts";
import {
  ConversationAssignmentControls,
} from "./ConversationAssignmentControls.tsx";
import {
  ConversationComposerBoundary,
} from "./ConversationComposerBoundary.tsx";

type ConversationMessageViewProps = {
  selectedThread: InboxConversationThreadView | null;
  conversations: readonly InboxConversationView[];
  selectedAiApprovals: readonly AiReplyApprovalView[];
  canReply: boolean;
  canDecideAi: boolean;
  aiApprovalStatus: AiReplyApprovalDirectoryStatus;
  feedback: {
    tone: "success" | "warning";
    message: string;
  } | null;
  isBusy: boolean;
  pendingConversationKey: string | null;
  pendingApprovalKey: string | null;
  changeSelectedAssignment: () => void;
  markSelectedRead: () => void;
  decideAiApproval: (
    approval: AiReplyApprovalView,
    decision: "approve" | "reject",
  ) => void;
};

export function ConversationMessageView({
  selectedThread,
  conversations,
  selectedAiApprovals,
  canReply,
  canDecideAi,
  aiApprovalStatus,
  feedback,
  isBusy,
  pendingConversationKey,
  pendingApprovalKey,
  changeSelectedAssignment,
  markSelectedRead,
  decideAiApproval,
}: ConversationMessageViewProps) {
  return (
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
                    conversationAssignmentLabels[
                      selectedThread.conversation
                        .assignment
                    ]
                  }
                </p>
              </div>
              <ConversationAssignmentControls
                conversation={selectedThread.conversation}
                canReply={canReply}
                isBusy={isBusy}
                pendingConversationKey={
                  pendingConversationKey
                }
                changeSelectedAssignment={
                  changeSelectedAssignment
                }
                markSelectedRead={markSelectedRead}
              />
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

            <ConversationComposerBoundary />
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
  );
}
