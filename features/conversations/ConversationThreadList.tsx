"use client";

import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  InboxConversationView,
  InboxFilters,
} from "../../shared/domain/conversationView.ts";
import {
  formatInboxTimestamp,
  hasActiveInboxFilters,
} from "./conversationPresentation.ts";
import {
  readConversationMessages,
} from "./conversationMessages.ts";
import type {
  InboxRefreshState,
} from "./useInboxPolling.ts";

export function ConversationThreadList({
  conversations,
  language,
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
  language: InterfaceLanguage;
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
  const messages = readConversationMessages(language);
  const listMessages = messages.threadList;

  return (
      <section
        className="conversation-list"
        aria-label={listMessages.ariaLabel}
      >
        <header className="conversation-list-header">
          <div>
            <span className="card-kicker">
              D1 source of truth
            </span>
            <h2>{listMessages.title}</h2>
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
            <span>{listMessages.searchLabel}</span>
            <input
              type="search"
              maxLength={80}
              value={filterDraft.searchTerm}
              placeholder={
                listMessages.searchPlaceholder
              }
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
              <span>{listMessages.statusLabel}</span>
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
                <option value="all">
                  {listMessages.allStatuses}
                </option>
                {Object.entries(
                  messages.labels
                    .conversationStatuses,
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
              <span>
                {listMessages.assignmentLabel}
              </span>
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
                <option value="all">
                  {listMessages.allAssignments}
                </option>
                <option value="unassigned">
                  {listMessages.unassigned}
                </option>
                <option value="mine">
                  {listMessages.mine}
                </option>
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
                ? listMessages.loading
                : listMessages.applyFilters}
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
              {listMessages.clear}
            </button>
          </div>
          <small
            className={`inbox-refresh-state ${refreshState}`}
            aria-live="polite"
          >
            {refreshState === "refreshing"
              ? listMessages.refreshing
              : refreshState === "stale"
                ? listMessages.stale
                : listMessages.polling}
          </small>
        </form>

        <div className="conversation-records">
          {conversations.length === 0 ? (
            <div className="conversation-list-empty">
              <strong>{listMessages.emptyTitle}</strong>
              <p>{listMessages.emptyDescription}</p>
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
                              language,
                            )
                          : listMessages.noMessages}
                      </time>
                    </span>
                    <span className="conversation-preview">
                      {isLoading
                        ? listMessages.loadingThread
                        : conversation.lastMessage
                          ? conversation.lastMessage
                              .contentKind === "text"
                            ? conversation.lastMessage
                                .textContent
                            : listMessages.noTextContent
                          : listMessages.noPreview}
                    </span>
                    <span className="conversation-record-meta">
                      <span className="conversation-record-labels">
                        <small>
                          {
                            messages.labels
                              .conversationStatuses[
                              conversation.status
                            ]
                          }
                        </small>
                        <small>
                          {
                            messages.labels.assignments[
                              conversation.assignment
                            ]
                          }
                        </small>
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <b
                          aria-label={
                            listMessages.unreadLabel(
                              conversation.unreadCount,
                            )
                          }
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
