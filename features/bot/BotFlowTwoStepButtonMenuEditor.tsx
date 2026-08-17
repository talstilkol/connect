"use client";

import {
  useEffect,
  useRef,
} from "react";
import {
  appendBotFlowButtonOption,
  moveBotFlowButtonOption,
  moveBotFlowButtonOptionToPosition,
  removeBotFlowButtonOption,
  updateBotFlowButtonOption,
  updateBotFlowButtonText,
} from "../../shared/domain/botFlowButtonMenuEditor";
import {
  KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT,
} from "../../shared/domain/botFlowComposer";
import {
  appendBotFlowTwoStepBranch,
  moveBotFlowTwoStepBranch,
  removeBotFlowTwoStepBranch,
  updateBotFlowTwoStepBranchLabel,
  updateBotFlowTwoStepBranchMenu,
  updateBotFlowTwoStepFirstButtonText,
  type BotFlowTwoStepButtonMenuEditorDraft,
} from "../../shared/domain/botFlowTwoStepButtonMenuEditor";
import {
  BotFlowButtonMenuEditor,
} from "./BotFlowButtonMenuEditor";

export function BotFlowTwoStepButtonMenuEditor({
  draft,
  disabled,
  focusOnMount,
  maximumBranchBlockCount,
  onChange,
  onRemove,
}: {
  draft: BotFlowTwoStepButtonMenuEditorDraft;
  disabled: boolean;
  focusOnMount: boolean;
  maximumBranchBlockCount: number;
  onChange(
    nextDraft: BotFlowTwoStepButtonMenuEditorDraft,
  ): void;
  onRemove(): void;
}) {
  const fieldsetRef =
    useRef<HTMLFieldSetElement>(null);
  const firstQuestionRef =
    useRef<HTMLTextAreaElement>(null);
  const pendingFocusPositionRef =
    useRef<number | null>(null);
  const nestedOptionCount =
    draft.branches.reduce(
      (count, branch) =>
        count + branch.menu.options.length,
      0,
    );
  const usedBranchBlockCount =
    draft.branches.length + nestedOptionCount;
  const canAddBranch =
    draft.branches.length <
      KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT &&
    usedBranchBlockCount + 2 <=
      maximumBranchBlockCount;

  useEffect(() => {
    if (focusOnMount) {
      firstQuestionRef.current?.focus();
    }
  }, [focusOnMount]);

  useEffect(() => {
    const position =
      pendingFocusPositionRef.current;

    if (position === null) {
      return;
    }

    pendingFocusPositionRef.current = null;
    fieldsetRef.current
      ?.querySelector<HTMLInputElement>(
        `input[data-two-step-branch-position="${position}"]`,
      )
      ?.focus();
  }, [draft.branches]);

  return (
    <fieldset
      ref={fieldsetRef}
      className="bot-flow-two-step-menu"
    >
      <legend>שתי שאלות Buttons עוקבות</legend>
      <p id="bot-flow-two-step-menu-help">
        הבחירה בשאלה הראשונה פותחת שאלה שנייה
        ייעודית לאותו ענף. רק הבחירה השנייה
        שולחת תשובת Text ומסיימת את המסלול.
      </p>
      <label>
        <span>טקסט השאלה הראשונה</span>
        <textarea
          ref={firstQuestionRef}
          rows={4}
          value={draft.firstButtonText}
          onChange={(event) =>
            onChange(
              updateBotFlowTwoStepFirstButtonText(
                draft,
                event.target.value,
              ),
            )
          }
          disabled={disabled}
          maxLength={4096}
          aria-describedby="bot-flow-two-step-menu-help"
          required
        />
      </label>
      <ol className="bot-flow-two-step-branches">
        {draft.branches.map((branch, index) => {
          const position = index + 1;
          const labelId =
            `bot-flow-two-step-branch-${branch.draftBranchKey}`;
          const maximumOptionCount = Math.min(
            KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT,
            maximumBranchBlockCount -
              (usedBranchBlockCount -
                branch.menu.options.length),
          );
          const updateMenu = (
            menu: typeof branch.menu,
          ) =>
            onChange(
              updateBotFlowTwoStepBranchMenu(
                draft,
                branch.draftBranchKey,
                menu,
              ),
            );

          return (
            <li key={branch.draftBranchKey}>
              <div className="bot-flow-two-step-branch-header">
                <strong>ענף {position}</strong>
                <div className="bot-flow-step-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      onChange(
                        moveBotFlowTwoStepBranch(
                          draft,
                          branch.draftBranchKey,
                          "up",
                        ),
                      )
                    }
                    disabled={disabled || index === 0}
                    aria-label={`העבר את ענף ${position} למעלה`}
                  >
                    ↑ למעלה
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      onChange(
                        moveBotFlowTwoStepBranch(
                          draft,
                          branch.draftBranchKey,
                          "down",
                        ),
                      )
                    }
                    disabled={
                      disabled ||
                      index === draft.branches.length - 1
                    }
                    aria-label={`העבר את ענף ${position} למטה`}
                  >
                    ↓ למטה
                  </button>
                </div>
              </div>
              <label htmlFor={labelId}>
                תווית הבחירה בשאלה הראשונה
              </label>
              <input
                id={labelId}
                value={branch.label}
                onChange={(event) =>
                  onChange(
                    updateBotFlowTwoStepBranchLabel(
                      draft,
                      branch.draftBranchKey,
                      event.target.value,
                    ),
                  )
                }
                disabled={disabled}
                maxLength={80}
                data-two-step-branch-position={position}
                required
              />
              <BotFlowButtonMenuEditor
                draft={branch.menu}
                disabled={disabled}
                focusOnMount={false}
                maximumOptionCount={maximumOptionCount}
                onButtonTextChange={(value) =>
                  updateMenu(
                    updateBotFlowButtonText(
                      branch.menu,
                      value,
                    ),
                  )
                }
                onOptionChange={(
                  draftOptionKey,
                  field,
                  value,
                ) =>
                  updateMenu(
                    updateBotFlowButtonOption(
                      branch.menu,
                      draftOptionKey,
                      field,
                      value,
                    ),
                  )
                }
                onMoveOption={(
                  draftOptionKey,
                  direction,
                ) =>
                  updateMenu(
                    moveBotFlowButtonOption(
                      branch.menu,
                      draftOptionKey,
                      direction,
                    ),
                  )
                }
                onMoveOptionToPosition={(
                  draftOptionKey,
                  targetIndex,
                ) =>
                  updateMenu(
                    moveBotFlowButtonOptionToPosition(
                      branch.menu,
                      draftOptionKey,
                      targetIndex,
                    ),
                  )
                }
                onRemoveOption={(draftOptionKey) =>
                  updateMenu(
                    removeBotFlowButtonOption(
                      branch.menu,
                      draftOptionKey,
                    ),
                  )
                }
                onAddOption={() =>
                  updateMenu(
                    appendBotFlowButtonOption(
                      branch.menu,
                      maximumOptionCount,
                    ),
                  )
                }
                onRemoveMenu={() => {
                  pendingFocusPositionRef.current =
                    Math.min(
                      position,
                      draft.branches.length - 1,
                    );
                  onChange(
                    removeBotFlowTwoStepBranch(
                      draft,
                      branch.draftBranchKey,
                    ),
                  );
                }}
                removeLabel="הסרת הענף והשאלה השנייה"
                removeDisabled={
                  draft.branches.length === 1
                }
              />
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
              draft.branches.length + 1;
            onChange(
              appendBotFlowTwoStepBranch(draft),
            );
          }}
          disabled={disabled || !canAddBranch}
        >
          הוספת ענף לשאלה הראשונה
        </button>
        <button
          type="button"
          className="danger-text-button"
          onClick={onRemove}
          disabled={disabled}
        >
          הסרת שתי השאלות
        </button>
      </div>
    </fieldset>
  );
}
