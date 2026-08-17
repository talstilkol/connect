"use client";

import {
  useEffect,
  useRef,
} from "react";
import type {
  KeywordHandoffReason,
} from "../../shared/domain/botFlowComposer";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import { readBotFlowMessages } from "./botFlowMessages";

export function BotFlowHandoffEditor({
  language,
  handoffReason,
  disabled,
  focusOnMount,
  onReasonChange,
  onRemoveHandoff,
}: {
  language: InterfaceLanguage;
  handoffReason: KeywordHandoffReason | "";
  disabled: boolean;
  focusOnMount: boolean;
  onReasonChange(value: KeywordHandoffReason): void;
  onRemoveHandoff(): void;
}) {
  const messages = readBotFlowMessages(language).handoff;
  const reasonRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      reasonRef.current?.focus();
    }
  }, [focusOnMount]);

  return (
    <fieldset className="bot-flow-handoff">
      <legend>{messages.legend}</legend>
      <p id="bot-flow-handoff-help">
        {messages.help}
      </p>

      <label>
        <span>{messages.reason}</span>
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

      <button
        type="button"
        className="danger-text-button bot-flow-remove-handoff"
        onClick={onRemoveHandoff}
        disabled={disabled}
      >
        {messages.remove}
      </button>
    </fieldset>
  );
}
