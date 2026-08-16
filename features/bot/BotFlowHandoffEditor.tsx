"use client";

import {
  useEffect,
  useRef,
} from "react";
import type {
  KeywordHandoffReason,
} from "../../shared/domain/botFlowComposer";

export function BotFlowHandoffEditor({
  handoffReason,
  disabled,
  focusOnMount,
  onReasonChange,
  onRemoveHandoff,
}: {
  handoffReason: KeywordHandoffReason | "";
  disabled: boolean;
  focusOnMount: boolean;
  onReasonChange(value: KeywordHandoffReason): void;
  onRemoveHandoff(): void;
}) {
  const reasonRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      reasonRef.current?.focus();
    }
  }, [focusOnMount]);

  return (
    <fieldset className="bot-flow-handoff">
      <legend>העברה לנציג לפי מילת מפתח</legend>
      <p id="bot-flow-handoff-help">
        רק הודעה שתואמת למילות המפתח תעביר את
        השיחה להמתנה לנציג. אי־התאמה תסתיים ללא
        שינוי, ובמצב זה לא תישלח הודעת Bot.
      </p>

      <label>
        <span>סיבת ההעברה לצורכי Audit</span>
        <select
          ref={reasonRef}
          value={handoffReason}
          onChange={(event) =>
            onReasonChange(
              event.target
                .value as KeywordHandoffReason,
            )
          }
          disabled={disabled}
          aria-describedby="bot-flow-handoff-help"
        >
          <option value="" disabled>
            בחירת סיבת העברה
          </option>
          <option value="customer-request">
            הלקוח ביקש נציג
          </option>
          <option value="flow-rule">
            כלל עסקי דורש נציג
          </option>
        </select>
      </label>

      <button
        type="button"
        className="danger-text-button bot-flow-remove-handoff"
        onClick={onRemoveHandoff}
        disabled={disabled}
      >
        הסרת מסלול ההעברה
      </button>
    </fieldset>
  );
}
