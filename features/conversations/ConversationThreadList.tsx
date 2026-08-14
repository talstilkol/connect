"use client";

import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";
import type {
  InboxConversationView,
  InboxFilters,
} from "../../shared/domain/conversationView.ts";
import {
  conversationAssignmentLabels,
  conversationStatusLabels,
  formatInboxTimestamp,
  hasActiveInboxFilters,
} from "./conversationPresentation.ts";
import type {
  InboxRefreshState,
} from "./useInboxPolling.ts";

export function ConversationThreadList({
  conversations,
  selectedConversation,
  pendingConversationKey,
  filters,
  filterDraft,
  refreshState,
  isBusy,
  setFilterDraft,
  submitFilters,
  resetFilters,
  loadThread,
}: {
  conversations: readonly InboxConversationView[];
  selectedConversation: InboxConversationView | null;
  pendingConversationKey: string | null;
  filters: InboxFilters;
  filterDraft: InboxFilters;
  refreshState: InboxRefreshState;
  isBusy: boolean;
  setFilterDraft:
    Dispatch<SetStateAction<InboxFilters>>;
  submitFilters:
    (event: FormEvent<HTMLFormElement>) => void;
  resetFilters: () => void;
  loadThread:
    (conversation: InboxConversationView) => void;
}) {
  return (
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
                (!hasActiveInboxFilters(filters) &&
                  !hasActiveInboxFilters(filterDraft))
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
                            conversationAssignmentLabels[
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
  );
}
