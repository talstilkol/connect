"use client";

import {
  useEffect,
  useRef,
} from "react";
import type {
  BotFlowConditionFact,
  BotFlowConditionOperator,
} from "../../shared/domain/botFlow";
import type {
  KeywordConditionDraft,
  KeywordHandoffReason,
} from "../../shared/domain/botFlowComposer";
import {
  persistedConversationStatuses,
} from "../../shared/domain/conversation";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import { readBotFlowMessages } from "./botFlowMessages";

export function BotFlowConditionEditor({
  language,
  draft,
  disabled,
  focusOnMount,
  onFactChange,
  onOperatorChange,
  onValueChange,
  onMatchedReplyChange,
  onUnmatchedReplyChange,
  onMatchedBranchKindChange,
  onUnmatchedBranchKindChange,
  onMatchedHandoffReasonChange,
  onUnmatchedHandoffReasonChange,
  onRemoveCondition,
}: {
  language: InterfaceLanguage;
  draft: KeywordConditionDraft;
  disabled: boolean;
  focusOnMount: boolean;
  onFactChange(value: BotFlowConditionFact): void;
  onOperatorChange(
    value: BotFlowConditionOperator,
  ): void;
  onValueChange(value: string): void;
  onMatchedReplyChange(value: string): void;
  onUnmatchedReplyChange(value: string): void;
  onMatchedBranchKindChange(
    value: "reply" | "handoff",
  ): void;
  onUnmatchedBranchKindChange(
    value: "reply" | "handoff",
  ): void;
  onMatchedHandoffReasonChange(
    value: KeywordHandoffReason,
  ): void;
  onUnmatchedHandoffReasonChange(
    value: KeywordHandoffReason,
  ): void;
  onRemoveCondition(): void;
}) {
  const botMessages = readBotFlowMessages(language);
  const messages = botMessages.condition;
  const factRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      factRef.current?.focus();
    }
  }, [focusOnMount]);

  const checksConversationStatus =
    draft.fact === "conversation-status";
  const matchedHandoffReason =
    draft.matchedHandoffReason ?? null;
  const unmatchedHandoffReason =
    draft.unmatchedHandoffReason ?? null;

  return (
    <fieldset className="bot-flow-condition">
      <legend>{messages.legend}</legend>
      <p id="bot-flow-condition-help">
        {messages.help}
      </p>

      <label>
        <span>{messages.fact}</span>
        <select
          ref={factRef}
          value={draft.fact}
          onChange={(event) =>
            onFactChange(
              event.target
                .value as BotFlowConditionFact,
            )
          }
          disabled={disabled}
          aria-describedby="bot-flow-condition-help"
        >
          <option value="last-inbound-text">
            {messages.inboundText}
          </option>
          <option value="conversation-status">
            {messages.conversationStatus}
          </option>
        </select>
      </label>

      <label>
        <span>{messages.operator}</span>
        <select
          value={draft.operator}
          onChange={(event) =>
            onOperatorChange(
              event.target
                .value as BotFlowConditionOperator,
            )
          }
          disabled={disabled || checksConversationStatus}
        >
          <option value="equals">{messages.equals}</option>
          {!checksConversationStatus ? (
            <option value="contains">{messages.contains}</option>
          ) : null}
        </select>
        {checksConversationStatus ? (
          <small>
            {messages.statusEqualsOnly}
          </small>
        ) : null}
      </label>

      <label>
        <span>{messages.value}</span>
        {checksConversationStatus ? (
          <select
            value={draft.value}
            onChange={(event) =>
              onValueChange(event.target.value)
            }
            disabled={disabled}
            required
          >
            <option value="" disabled>
              {messages.chooseStatus}
            </option>
            {persistedConversationStatuses.map(
              (status) => (
                <option key={status} value={status}>
                  {botMessages.labels.conversationStatuses[status]}
                </option>
              ),
            )}
          </select>
        ) : (
          <input
            value={draft.value}
            onChange={(event) =>
              onValueChange(event.target.value)
            }
            disabled={disabled}
            maxLength={80}
            required
          />
        )}
      </label>

      <fieldset className="bot-flow-condition-branch">
        <legend>{messages.matched}</legend>
        <label>
          <span>{messages.branchAction}</span>
          <select
            value={
              matchedHandoffReason === null
                ? "reply"
                : "handoff"
            }
            onChange={(event) =>
              onMatchedBranchKindChange(
                event.target.value as
                  | "reply"
                  | "handoff",
              )
            }
            disabled={disabled}
          >
            <option value="reply">{messages.textReply}</option>
            <option value="handoff">
              {messages.handoff}
            </option>
          </select>
        </label>
        {matchedHandoffReason === null ? (
          <label>
            <span>{messages.branchReply}</span>
            <textarea
              rows={4}
              value={draft.matchedReplyText}
              onChange={(event) =>
                onMatchedReplyChange(
                  event.target.value,
                )
              }
              disabled={disabled}
              maxLength={4096}
              required
            />
          </label>
        ) : (
          <label>
            <span>{messages.handoffReason}</span>
            <select
              value={matchedHandoffReason}
              onChange={(event) =>
                onMatchedHandoffReasonChange(
                  event.target
                    .value as KeywordHandoffReason,
                )
              }
              disabled={disabled}
              required
            >
              <option value="" disabled>
                {messages.chooseReason}
              </option>
              <option value="customer-request">
                {messages.customerRequest}
              </option>
              <option value="flow-rule">
                {messages.flowRule}
              </option>
            </select>
          </label>
        )}
      </fieldset>

      <fieldset className="bot-flow-condition-branch">
        <legend>{messages.unmatched}</legend>
        <label>
          <span>{messages.branchAction}</span>
          <select
            value={
              unmatchedHandoffReason === null
                ? "reply"
                : "handoff"
            }
            onChange={(event) =>
              onUnmatchedBranchKindChange(
                event.target.value as
                  | "reply"
                  | "handoff",
              )
            }
            disabled={disabled}
          >
            <option value="reply">{messages.textReply}</option>
            <option value="handoff">
              {messages.handoff}
            </option>
          </select>
        </label>
        {unmatchedHandoffReason === null ? (
          <label>
            <span>{messages.branchReply}</span>
            <textarea
              rows={4}
              value={draft.unmatchedReplyText}
              onChange={(event) =>
                onUnmatchedReplyChange(
                  event.target.value,
                )
              }
              disabled={disabled}
              maxLength={4096}
              required
            />
          </label>
        ) : (
          <label>
            <span>{messages.handoffReason}</span>
            <select
              value={unmatchedHandoffReason}
              onChange={(event) =>
                onUnmatchedHandoffReasonChange(
                  event.target
                    .value as KeywordHandoffReason,
                )
              }
              disabled={disabled}
              required
            >
              <option value="" disabled>
                {messages.chooseReason}
              </option>
              <option value="customer-request">
                {messages.customerRequest}
              </option>
              <option value="flow-rule">
                {messages.flowRule}
              </option>
            </select>
          </label>
        )}
      </fieldset>

      <button
        type="button"
        className="danger-text-button bot-flow-remove-condition"
        onClick={onRemoveCondition}
        disabled={disabled}
      >
        {messages.remove}
      </button>
    </fieldset>
  );
}
