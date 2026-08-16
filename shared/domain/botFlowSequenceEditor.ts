import {
  KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT,
} from "./botFlowComposer.ts";

const DRAFT_REPLY_STEP_KEY_PREFIX =
  "bot_reply_step_draft_v1_";
const DRAFT_REPLY_STEP_KEY_PATTERN =
  /^bot_reply_step_draft_v1_([1-9][0-9]*)$/;

export interface BotFlowReplyStepDraft {
  draftStepKey: string;
  text: string;
}

export type BotFlowReplyStepMoveDirection =
  | "up"
  | "down";

function draftStepKey(ordinal: number): string {
  return `${DRAFT_REPLY_STEP_KEY_PREFIX}${ordinal}`;
}

function nextDraftStepOrdinal(
  steps: readonly BotFlowReplyStepDraft[],
): number {
  return (
    steps.reduce((maximum, step) => {
      const match = DRAFT_REPLY_STEP_KEY_PATTERN.exec(
        step.draftStepKey,
      );
      const ordinal = match
        ? Number.parseInt(match[1], 10)
        : 0;

      return Math.max(maximum, ordinal);
    }, 0) + 1
  );
}

export function createBotFlowReplySteps(
  replyTexts: readonly string[],
): readonly BotFlowReplyStepDraft[] {
  if (
    replyTexts.length >
    KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT
  ) {
    throw new Error("Bot flow reply sequence is too large");
  }

  const texts =
    replyTexts.length === 0 ? [""] : replyTexts;

  return texts.map((text, index) => ({
    draftStepKey: draftStepKey(index + 1),
    text,
  }));
}

export function appendBotFlowReplyStep(
  steps: readonly BotFlowReplyStepDraft[],
  maximumStepCount =
    KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT,
): readonly BotFlowReplyStepDraft[] {
  if (
    !Number.isSafeInteger(maximumStepCount) ||
    maximumStepCount < 1 ||
    maximumStepCount >
      KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT ||
    steps.length >= maximumStepCount
  ) {
    return steps;
  }

  return [
    ...steps,
    {
      draftStepKey: draftStepKey(
        nextDraftStepOrdinal(steps),
      ),
      text: "",
    },
  ];
}

export function updateBotFlowReplyStep(
  steps: readonly BotFlowReplyStepDraft[],
  draftStepKeyValue: string,
  text: string,
): readonly BotFlowReplyStepDraft[] {
  return steps.map((step) =>
    step.draftStepKey === draftStepKeyValue
      ? { ...step, text }
      : step,
  );
}

export function moveBotFlowReplyStep(
  steps: readonly BotFlowReplyStepDraft[],
  draftStepKeyValue: string,
  direction: BotFlowReplyStepMoveDirection,
): readonly BotFlowReplyStepDraft[] {
  const sourceIndex = steps.findIndex(
    (step) =>
      step.draftStepKey === draftStepKeyValue,
  );
  const targetIndex =
    direction === "up"
      ? sourceIndex - 1
      : sourceIndex + 1;

  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= steps.length
  ) {
    return steps;
  }

  const reordered = [...steps];
  const source = reordered[sourceIndex];
  const target = reordered[targetIndex];

  if (!source || !target) {
    return steps;
  }

  reordered[sourceIndex] = target;
  reordered[targetIndex] = source;
  return reordered;
}

export function removeBotFlowReplyStep(
  steps: readonly BotFlowReplyStepDraft[],
  draftStepKeyValue: string,
): readonly BotFlowReplyStepDraft[] {
  if (steps.length <= 1) {
    return steps;
  }

  const filtered = steps.filter(
    (step) =>
      step.draftStepKey !== draftStepKeyValue,
  );

  return filtered.length === steps.length
    ? steps
    : filtered;
}

export function readBotFlowReplyTexts(
  steps: readonly BotFlowReplyStepDraft[],
): readonly string[] {
  return steps.map((step) => step.text);
}
