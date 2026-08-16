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

const conversationStatusLabels = {
  new: "שיחה חדשה",
  bot_active: "הבוט פעיל",
  waiting_for_agent: "ממתינה לנציג",
  agent_active: "נציג פעיל",
  waiting_for_contact: "ממתינה ללקוח",
  closed: "סגורה",
} as const;

export function BotFlowConditionEditor({
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
      <legend>פיצול לפי תנאי</legend>
      <p id="bot-flow-condition-help">
        כל תוצאה יכולה לשלוח תשובת Text או להעביר
        לנציג. כאשר נבחר Handoff לא נשלחת לפניו
        הודעת Intro באותו Turn.
      </p>

      <label>
        <span>המידע שנבדק</span>
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
            טקסט ההודעה הנכנסת האחרונה
          </option>
          <option value="conversation-status">
            מצב השיחה
          </option>
        </select>
      </label>

      <label>
        <span>אופן הבדיקה</span>
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
          <option value="equals">שווה ל־</option>
          {!checksConversationStatus ? (
            <option value="contains">מכיל</option>
          ) : null}
        </select>
        {checksConversationStatus ? (
          <small>
            מצב שיחה תומך בבדיקת שוויון בלבד.
          </small>
        ) : null}
      </label>

      <label>
        <span>הערך להשוואה</span>
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
              בחירת מצב שיחה
            </option>
            {persistedConversationStatuses.map(
              (status) => (
                <option key={status} value={status}>
                  {conversationStatusLabels[status]}
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
        <legend>כאשר התנאי מתקיים</legend>
        <label>
          <span>פעולת הענף</span>
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
            <option value="reply">תשובת Text</option>
            <option value="handoff">
              העברה לנציג
            </option>
          </select>
        </label>
        {matchedHandoffReason === null ? (
          <label>
            <span>תשובת הענף</span>
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
            <span>סיבת ההעברה</span>
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
                בחירת סיבה
              </option>
              <option value="customer-request">
                בקשת הלקוח
              </option>
              <option value="flow-rule">
                כלל בתהליך
              </option>
            </select>
          </label>
        )}
      </fieldset>

      <fieldset className="bot-flow-condition-branch">
        <legend>כאשר התנאי אינו מתקיים</legend>
        <label>
          <span>פעולת הענף</span>
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
            <option value="reply">תשובת Text</option>
            <option value="handoff">
              העברה לנציג
            </option>
          </select>
        </label>
        {unmatchedHandoffReason === null ? (
          <label>
            <span>תשובת הענף</span>
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
            <span>סיבת ההעברה</span>
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
                בחירת סיבה
              </option>
              <option value="customer-request">
                בקשת הלקוח
              </option>
              <option value="flow-rule">
                כלל בתהליך
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
        הסרת התנאי
      </button>
    </fieldset>
  );
}
