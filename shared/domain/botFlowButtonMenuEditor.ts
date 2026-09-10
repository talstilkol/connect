import {
  KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT,
  type KeywordButtonMenuOptionDraft,
} from "./botFlowComposer.ts";

const DRAFT_BUTTON_OPTION_KEY_PREFIX =
  "bot_button_option_draft_v1_";
const DRAFT_BUTTON_OPTION_KEY_PATTERN =
  /^bot_button_option_draft_v1_([1-9][0-9]*)$/;

export interface BotFlowButtonOptionEditorDraft
  extends KeywordButtonMenuOptionDraft {
  draftOptionKey: string;
}

export interface BotFlowButtonMenuEditorDraft {
  buttonText: string;
  options: readonly BotFlowButtonOptionEditorDraft[];
}

export type BotFlowButtonOptionField =
  | "label"
  | "replyText";

export type BotFlowButtonOptionMoveDirection =
  | "up"
  | "down";

function optionKey(ordinal: number): string {
  return `${DRAFT_BUTTON_OPTION_KEY_PREFIX}${ordinal}`;
}

function nextOptionOrdinal(
  options: readonly BotFlowButtonOptionEditorDraft[],
): number {
  return (
    options.reduce((maximum, option) => {
      const match =
        DRAFT_BUTTON_OPTION_KEY_PATTERN.exec(
          option.draftOptionKey,
        );
      const ordinal = match
        ? Number.parseInt(match[1], 10)
        : 0;

      return Math.max(maximum, ordinal);
    }, 0) + 1
  );
}

export function createBotFlowButtonMenuDraft(
  buttonText: string,
  options: readonly KeywordButtonMenuOptionDraft[],
): BotFlowButtonMenuEditorDraft {
  if (
    options.length >
    KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT
  ) {
    throw new Error("Bot flow button menu is too large");
  }

  const initialOptions =
    options.length === 0
      ? [{ label: "", replyText: "" }]
      : options;

  return {
    buttonText,
    options: initialOptions.map((option, index) => ({
      draftOptionKey: optionKey(index + 1),
      label: option.label,
      replyText: option.replyText,
    })),
  };
}

export function updateBotFlowButtonText(
  draft: BotFlowButtonMenuEditorDraft,
  buttonText: string,
): BotFlowButtonMenuEditorDraft {
  return { ...draft, buttonText };
}

export function appendBotFlowButtonOption(
  draft: BotFlowButtonMenuEditorDraft,
  maximumOptionCount: number,
): BotFlowButtonMenuEditorDraft {
  if (
    !Number.isSafeInteger(maximumOptionCount) ||
    maximumOptionCount < 1 ||
    maximumOptionCount >
      KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT ||
    draft.options.length >= maximumOptionCount
  ) {
    return draft;
  }

  return {
    ...draft,
    options: [
      ...draft.options,
      {
        draftOptionKey: optionKey(
          nextOptionOrdinal(draft.options),
        ),
        label: "",
        replyText: "",
      },
    ],
  };
}

export function updateBotFlowButtonOption(
  draft: BotFlowButtonMenuEditorDraft,
  draftOptionKeyValue: string,
  field: BotFlowButtonOptionField,
  value: string,
): BotFlowButtonMenuEditorDraft {
  return {
    ...draft,
    options: draft.options.map((option) =>
      option.draftOptionKey === draftOptionKeyValue
        ? { ...option, [field]: value }
        : option,
    ),
  };
}

export function moveBotFlowButtonOption(
  draft: BotFlowButtonMenuEditorDraft,
  draftOptionKeyValue: string,
  direction: BotFlowButtonOptionMoveDirection,
): BotFlowButtonMenuEditorDraft {
  const sourceIndex = draft.options.findIndex(
    (option) =>
      option.draftOptionKey === draftOptionKeyValue,
  );
  const targetIndex =
    direction === "up"
      ? sourceIndex - 1
      : sourceIndex + 1;

  return moveBotFlowButtonOptionToPosition(
    draft,
    draftOptionKeyValue,
    targetIndex,
  );
}

export function moveBotFlowButtonOptionToPosition(
  draft: BotFlowButtonMenuEditorDraft,
  draftOptionKeyValue: string,
  targetIndex: number,
): BotFlowButtonMenuEditorDraft {
  const sourceIndex = draft.options.findIndex(
    (option) =>
      option.draftOptionKey === draftOptionKeyValue,
  );

  if (
    sourceIndex < 0 ||
    !Number.isSafeInteger(targetIndex) ||
    targetIndex < 0 ||
    targetIndex >= draft.options.length ||
    targetIndex === sourceIndex
  ) {
    return draft;
  }

  const options = [...draft.options];
  const [source] = options.splice(sourceIndex, 1);

  if (!source) {
    return draft;
  }

  options.splice(targetIndex, 0, source);
  return { ...draft, options };
}

export function removeBotFlowButtonOption(
  draft: BotFlowButtonMenuEditorDraft,
  draftOptionKeyValue: string,
): BotFlowButtonMenuEditorDraft {
  if (draft.options.length <= 1) {
    return draft;
  }

  const options = draft.options.filter(
    (option) =>
      option.draftOptionKey !== draftOptionKeyValue,
  );

  return options.length === draft.options.length
    ? draft
    : { ...draft, options };
}

export function readBotFlowButtonOptions(
  draft: BotFlowButtonMenuEditorDraft,
): readonly KeywordButtonMenuOptionDraft[] {
  return draft.options.map((option) => ({
    label: option.label,
    replyText: option.replyText,
  }));
}
