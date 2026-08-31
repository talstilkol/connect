"use client";

import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  InboxConversationThreadView,
  InboxConversationView,
} from "../../shared/domain/conversationView.ts";
import type {
  AiReplyApprovalDirectoryStatus,
  AiReplyApprovalView,
} from "../../shared/domain/aiReplyApprovalView.ts";
import {
  formatInboxTimestamp,
  messageBody,
} from "./conversationPresentation.ts";
import {
  readConversationMessages,
} from "./conversationMessages.ts";
import {
  ConversationAssignmentControls,
} from "./ConversationAssignmentControls.tsx";
import {
  ConversationComposerBoundary,
} from "./ConversationComposerBoundary.tsx";

type ConversationMessageViewProps = {
  language: InterfaceLanguage;
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
  language,
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
  const messages = readConversationMessages(language);
  const viewMessages = messages.messageView;

  return (
      <section
        className="conversation-stage"
        aria-label={viewMessages.ariaLabel}
      >
        {selectedThread ? (
          <>
            <header className="conversation-stage-header">
              <div>
                <span className="card-kicker">
                  {viewMessages.secureConversation}
                </span>
                <h2>
                  {
                    selectedThread.conversation.contact
                      .displayName
                  }
                </h2>
                <p>
                  {
                    messages.labels
                      .conversationStatuses[
                      selectedThread.conversation.status
                    ]
                  }
                  {" · "}
                  {
                    messages.labels.assignments[
                      selectedThread.conversation
                        .assignment
                    ]
                  }
                </p>
              </div>
              <ConversationAssignmentControls
                language={language}
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
                  {viewMessages.readOnly}
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
                  {viewMessages.aiUnavailable}
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
                        {viewMessages.aiPending}
                      </span>
                      <h3>
                        {viewMessages.proposedReply}
                      </h3>
                    </div>
                    <span className="status-pill warning">
                      {viewMessages.agentApproval}
                    </span>
                  </header>
                  <p>{approval.replyText}</p>
                  <dl>
                    <div>
                      <dt>{viewMessages.grounding}</dt>
                      <dd>
                        {Math.floor(
                          approval.groundingScoreBasisPoints /
                            100,
                        )}
                        %
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {viewMessages.approvedSources}
                      </dt>
                      <dd>
                        {
                          approval.groundedSourceCount
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>{viewMessages.createdAt}</dt>
                      <dd>
                        {formatInboxTimestamp(
                          approval.createdAt,
                          language,
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
                        ? viewMessages.savingDecision
                        : viewMessages.approve}
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
                      {viewMessages.reject}
                    </button>
                  </footer>
                  {!canDecideAi ? (
                    <small>
                      {viewMessages.readOnly}
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
                  <strong>
                    {viewMessages.emptyThreadTitle}
                  </strong>
                  <p>
                    {viewMessages.emptyThreadDescription}
                  </p>
                </div>
              ) : (
                selectedThread.messages.map((message) => (
                  <article
                    className={`message-bubble ${message.direction}`}
                    key={message.messageKey}
                  >
                    <p>
                      {messageBody(message, language)}
                    </p>
                    <footer>
                      <time
                        dateTime={message.occurredAt}
                      >
                        {formatInboxTimestamp(
                          message.occurredAt,
                          language,
                        )}
                      </time>
                      <span>
                        {
                          messages.labels.messageStatuses[
                            message.status
                          ]
                        }
                      </span>
                    </footer>
                  </article>
                ))
              )}
            </div>

            <ConversationComposerBoundary
              language={language}
            />
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
                ? viewMessages.noResults
                : viewMessages.selectConversation}
            </h2>
            <p>
              {conversations.length === 0
                ? viewMessages.changeFilters
                : viewMessages.selectionDescription}
            </p>
          </div>
        )}
      </section>
  );
}
