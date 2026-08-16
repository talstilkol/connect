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

  return (
    <fieldset className="bot-flow-condition">
      <legend>פיצול לפי תנאי</legend>
      <p id="bot-flow-condition-help">
        התנאי נבדק אחרי הודעות הטקסט. כל תוצאה
        שולחת תשובה אחרת ואז מסיימת את התהליך.
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

      <label>
        <span>תשובה כאשר התנאי מתקיים</span>
        <textarea
          rows={4}
          value={draft.matchedReplyText}
          onChange={(event) =>
            onMatchedReplyChange(event.target.value)
          }
          disabled={disabled}
          maxLength={4096}
          required
        />
      </label>

      <label>
        <span>תשובה כאשר התנאי אינו מתקיים</span>
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
