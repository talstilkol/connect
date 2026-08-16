"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  BotFlowReplyStepDraft,
  BotFlowReplyStepMoveDirection,
} from "../../shared/domain/botFlowSequenceEditor";

export function BotFlowReplySequenceEditor({
  steps,
  disabled,
  minimumSteps = 1,
  maximumSteps,
  onTextChange,
  onMove,
  onMoveToPosition,
  onRemove,
  onAdd,
}: {
  steps: readonly BotFlowReplyStepDraft[];
  disabled: boolean;
  minimumSteps?: 0 | 1;
  maximumSteps: number;
  onTextChange(
    draftStepKey: string,
    text: string,
  ): void;
  onMove(
    draftStepKey: string,
    direction: BotFlowReplyStepMoveDirection,
  ): void;
  onMoveToPosition(
    draftStepKey: string,
    targetIndex: number,
  ): void;
  onRemove(draftStepKey: string): void;
  onAdd(): void;
}) {
  const fieldsetRef =
    useRef<HTMLFieldSetElement>(null);
  const pendingFocusPositionRef =
    useRef<number | null>(null);
  const draggedStepKeyRef = useRef<string | null>(
    null,
  );
  const [draggedStepKey, setDraggedStepKey] =
    useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] =
    useState<number | null>(null);

  const finishDragging = () => {
    draggedStepKeyRef.current = null;
    setDraggedStepKey(null);
    setDropTargetIndex(null);
  };

  useEffect(() => {
    const position = pendingFocusPositionRef.current;

    if (position === null) {
      return;
    }

    pendingFocusPositionRef.current = null;
    fieldsetRef.current
      ?.querySelector<HTMLTextAreaElement>(
        `textarea[data-reply-position="${position}"]`,
      )
      ?.focus();
  }, [steps]);

  return (
    <fieldset
      ref={fieldsetRef}
      className="bot-flow-reply-sequence"
    >
      <legend>הודעות תשובה לפי סדר השליחה</legend>
      <p id="bot-flow-reply-sequence-help">
        אפשר להוסיף כמה הודעות טקסט, לגרור אותן
        למיקום חדש או לשנות את הסדר באמצעות
        הכפתורים. כל פעולות הסידור זמינות גם עם
        מקלדת.
      </p>
      <ol>
        {steps.map((step, index) => {
          const position = index + 1;
          const inputId =
            `bot-flow-reply-${step.draftStepKey}`;

          return (
            <li
              key={step.draftStepKey}
              className={[
                draggedStepKey === step.draftStepKey
                  ? "is-dragging"
                  : "",
                dropTargetIndex === index &&
                draggedStepKey !== step.draftStepKey
                  ? "is-drop-target"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => {
                if (
                  disabled ||
                  draggedStepKeyRef.current === null ||
                  draggedStepKeyRef.current ===
                    step.draftStepKey
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
                  draggedStepKeyRef.current;
                finishDragging();

                if (
                  sourceKey &&
                  sourceKey !== step.draftStepKey
                ) {
                  onMoveToPosition(sourceKey, index);
                }
              }}
            >
              <span
                className="bot-flow-drag-handle"
                draggable={
                  !disabled && steps.length > 1
                }
                onDragStart={(event) => {
                  draggedStepKeyRef.current =
                    step.draftStepKey;
                  setDraggedStepKey(
                    step.draftStepKey,
                  );
                  event.dataTransfer.effectAllowed =
                    "move";
                  event.dataTransfer.setData(
                    "text/plain",
                    step.draftStepKey,
                  );
                }}
                onDragEnd={finishDragging}
                title={`גרירת הודעת טקסט ${position} למיקום חדש`}
                aria-hidden="true"
              >
                ⠿
              </span>
              <label htmlFor={inputId}>
                הודעת טקסט {position}
              </label>
              <textarea
                id={inputId}
                rows={5}
                value={step.text}
                onChange={(event) =>
                  onTextChange(
                    step.draftStepKey,
                    event.target.value,
                  )
                }
                disabled={disabled}
                maxLength={4096}
                aria-describedby="bot-flow-reply-sequence-help"
                data-reply-position={position}
                required
              />
              <div className="bot-flow-step-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    onMove(step.draftStepKey, "up")
                  }
                  disabled={disabled || index === 0}
                  aria-label={`העבר את הודעת הטקסט ${position} למעלה`}
                >
                  ↑ למעלה
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    onMove(step.draftStepKey, "down")
                  }
                  disabled={
                    disabled || index === steps.length - 1
                  }
                  aria-label={`העבר את הודעת הטקסט ${position} למטה`}
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
                        steps.length - 1,
                      );
                    onRemove(step.draftStepKey);
                  }}
                  disabled={
                    disabled ||
                    steps.length <= minimumSteps
                  }
                  aria-label={`מחק את הודעת הטקסט ${position}`}
                >
                  מחיקה
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="secondary-button bot-flow-add-step"
        onClick={() => {
          pendingFocusPositionRef.current =
            steps.length + 1;
          onAdd();
        }}
        disabled={
          disabled ||
          steps.length >= maximumSteps
        }
      >
        הוספת הודעת טקסט
      </button>
    </fieldset>
  );
}
