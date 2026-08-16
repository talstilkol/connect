"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  BotFlowButtonMenuEditorDraft,
  BotFlowButtonOptionField,
  BotFlowButtonOptionMoveDirection,
} from "../../shared/domain/botFlowButtonMenuEditor";

export function BotFlowButtonMenuEditor({
  draft,
  disabled,
  focusOnMount,
  maximumOptionCount,
  onButtonTextChange,
  onOptionChange,
  onMoveOption,
  onMoveOptionToPosition,
  onRemoveOption,
  onAddOption,
  onRemoveMenu,
}: {
  draft: BotFlowButtonMenuEditorDraft;
  disabled: boolean;
  focusOnMount: boolean;
  maximumOptionCount: number;
  onButtonTextChange(value: string): void;
  onOptionChange(
    draftOptionKey: string,
    field: BotFlowButtonOptionField,
    value: string,
  ): void;
  onMoveOption(
    draftOptionKey: string,
    direction: BotFlowButtonOptionMoveDirection,
  ): void;
  onMoveOptionToPosition(
    draftOptionKey: string,
    targetIndex: number,
  ): void;
  onRemoveOption(draftOptionKey: string): void;
  onAddOption(): void;
  onRemoveMenu(): void;
}) {
  const fieldsetRef =
    useRef<HTMLFieldSetElement>(null);
  const promptRef =
    useRef<HTMLTextAreaElement>(null);
  const pendingFocusPositionRef =
    useRef<number | null>(null);
  const draggedOptionKeyRef = useRef<string | null>(
    null,
  );
  const [draggedOptionKey, setDraggedOptionKey] =
    useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] =
    useState<number | null>(null);

  const finishDragging = () => {
    draggedOptionKeyRef.current = null;
    setDraggedOptionKey(null);
    setDropTargetIndex(null);
  };

  useEffect(() => {
    if (focusOnMount) {
      promptRef.current?.focus();
    }
  }, [focusOnMount]);

  useEffect(() => {
    const position = pendingFocusPositionRef.current;

    if (position === null) {
      return;
    }

    pendingFocusPositionRef.current = null;
    fieldsetRef.current
      ?.querySelector<HTMLInputElement>(
        `input[data-option-position="${position}"]`,
      )
      ?.focus();
  }, [draft.options]);

  return (
    <fieldset
      ref={fieldsetRef}
      className="bot-flow-button-menu"
    >
      <legend>שאלת כפתורים</legend>
      <p id="bot-flow-button-menu-help">
        כל אפשרות מנתבת לתשובת טקסט ייעודית.
        אפשר לגרור אפשרויות למיקום חדש או להשתמש
        בכפתורי למעלה ולמטה. המפתחות נשמרים
        ונגזרים רק בצד השרת.
      </p>
      <label>
        <span>טקסט השאלה</span>
        <textarea
          ref={promptRef}
          rows={4}
          value={draft.buttonText}
          onChange={(event) =>
            onButtonTextChange(event.target.value)
          }
          disabled={disabled}
          maxLength={4096}
          aria-describedby="bot-flow-button-menu-help"
          required
        />
      </label>
      <ol>
        {draft.options.map((option, index) => {
          const position = index + 1;
          const labelId =
            `bot-flow-option-label-${option.draftOptionKey}`;
          const replyId =
            `bot-flow-option-reply-${option.draftOptionKey}`;

          return (
            <li
              key={option.draftOptionKey}
              className={[
                draggedOptionKey ===
                option.draftOptionKey
                  ? "is-dragging"
                  : "",
                dropTargetIndex === index &&
                draggedOptionKey !==
                  option.draftOptionKey
                  ? "is-drop-target"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => {
                if (
                  disabled ||
                  draggedOptionKeyRef.current === null ||
                  draggedOptionKeyRef.current ===
                    option.draftOptionKey
                ) {
                  return;
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceKey =
                  draggedOptionKeyRef.current;
                finishDragging();

                if (
                  sourceKey &&
                  sourceKey !== option.draftOptionKey
                ) {
                  onMoveOptionToPosition(
                    sourceKey,
                    index,
                  );
                }
              }}
            >
              <span
                className="bot-flow-drag-handle"
                draggable={
                  !disabled && draft.options.length > 1
                }
                onDragStart={(event) => {
                  draggedOptionKeyRef.current =
                    option.draftOptionKey;
                  setDraggedOptionKey(
                    option.draftOptionKey,
                  );
                  event.dataTransfer.effectAllowed =
                    "move";
                  event.dataTransfer.setData(
                    "text/plain",
                    option.draftOptionKey,
                  );
                }}
                onDragEnd={finishDragging}
                title={`גרירת אפשרות ${position} למיקום חדש`}
                aria-hidden="true"
              >
                ⠿
              </span>
              <strong>אפשרות {position}</strong>
              <label htmlFor={labelId}>
                תווית הכפתור
              </label>
              <input
                id={labelId}
                value={option.label}
                onChange={(event) =>
                  onOptionChange(
                    option.draftOptionKey,
                    "label",
                    event.target.value,
                  )
                }
                disabled={disabled}
                maxLength={80}
                data-option-position={position}
                required
              />
              <label htmlFor={replyId}>
                תשובה לאחר בחירה
              </label>
              <textarea
                id={replyId}
                rows={4}
                value={option.replyText}
                onChange={(event) =>
                  onOptionChange(
                    option.draftOptionKey,
                    "replyText",
                    event.target.value,
                  )
                }
                disabled={disabled}
                maxLength={4096}
                required
              />
              <div className="bot-flow-step-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    onMoveOption(
                      option.draftOptionKey,
                      "up",
                    )
                  }
                  disabled={disabled || index === 0}
                  aria-label={`העבר את אפשרות ${position} למעלה`}
                >
                  ↑ למעלה
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    onMoveOption(
                      option.draftOptionKey,
                      "down",
                    )
                  }
                  disabled={
                    disabled ||
                    index === draft.options.length - 1
                  }
                  aria-label={`העבר את אפשרות ${position} למטה`}
                >
                  ↓ למטה
                </button>
                <button
                  type="button"
                  className="danger-text-button"
                  onClick={() => {
                    pendingFocusPositionRef.current =
                      Math.min(
                        position,
                        draft.options.length - 1,
                      );
                    onRemoveOption(
                      option.draftOptionKey,
                    );
                  }}
                  disabled={
                    disabled ||
                    draft.options.length === 1
                  }
                  aria-label={`מחק את אפשרות ${position}`}
                >
                  מחיקה
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="bot-flow-button-menu-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            pendingFocusPositionRef.current =
              draft.options.length + 1;
            onAddOption();
          }}
          disabled={
            disabled ||
            draft.options.length >= maximumOptionCount
          }
        >
          הוספת אפשרות
        </button>
        <button
          type="button"
          className="danger-text-button"
          onClick={onRemoveMenu}
          disabled={disabled}
        >
          הסרת שאלת הכפתורים
        </button>
      </div>
    </fieldset>
  );
}
