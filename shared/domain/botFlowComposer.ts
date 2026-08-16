import type {
  BotFlowConditionFact,
  BotFlowConditionOperator,
  BotFlowKeywordMatchMode,
  ValidatedBotFlowDefinition,
} from "./botFlow.ts";

export interface KeywordBotFlowComposerDraft {
  name: string;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  replyText: string;
}

export interface SaveKeywordBotFlowComposerDraftInput
  extends KeywordBotFlowComposerDraft {
  expectedFlowVersion: number | null;
}

export const KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT = 96;
export const KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT = 10;
export const KEYWORD_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT =
  95;
export const KEYWORD_CONDITION_MAXIMUM_INTRO_COUNT = 93;

export interface KeywordSequenceBotFlowComposerDraft {
  name: string;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  replyTexts: readonly string[];
}

export interface SaveKeywordSequenceBotFlowComposerDraftInput
  extends KeywordSequenceBotFlowComposerDraft {
  expectedFlowVersion: number | null;
}

export interface KeywordButtonMenuOptionDraft {
  label: string;
  replyText: string;
}

export interface KeywordButtonMenuBotFlowComposerDraft {
  name: string;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  introTexts: readonly string[];
  buttonText: string;
  options: readonly KeywordButtonMenuOptionDraft[];
}

export interface SaveKeywordButtonMenuBotFlowComposerDraftInput
  extends KeywordButtonMenuBotFlowComposerDraft {
  expectedFlowVersion: number | null;
}

export interface KeywordConditionDraft {
  fact: BotFlowConditionFact;
  operator: BotFlowConditionOperator;
  value: string;
  matchedReplyText: string;
  unmatchedReplyText: string;
}

export interface KeywordConditionBotFlowComposerDraft {
  name: string;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  introTexts: readonly string[];
  condition: KeywordConditionDraft;
}

export interface SaveKeywordConditionBotFlowComposerDraftInput
  extends KeywordConditionBotFlowComposerDraft {
  expectedFlowVersion: number | null;
}

export function readKeywordSequenceBotFlowComposerDraft(
  definition: ValidatedBotFlowDefinition,
): KeywordSequenceBotFlowComposerDraft | null {
  if (
    definition.blocks.length < 5 ||
    definition.blocks.length > 100
  ) {
    return null;
  }

  const blocksByKey = new Map(
    definition.blocks.map((block) => [
      block.blockKey,
      block,
    ]),
  );
  const trigger = blocksByKey.get(
    definition.entryBlockKey,
  );

  if (trigger?.type !== "trigger") {
    return null;
  }

  const keyword = blocksByKey.get(
    trigger.nextBlockKey,
  );

  if (keyword?.type !== "keyword") {
    return null;
  }

  const unmatched = blocksByKey.get(
    keyword.unmatchedBlockKey,
  );

  if (
    unmatched?.type !== "handoff" ||
    unmatched.reason !== "no-match"
  ) {
    return null;
  }

  const expectedKeys = new Set([
    trigger.blockKey,
    keyword.blockKey,
    unmatched.blockKey,
  ]);
  const replyTexts: string[] = [];
  let nextBlockKey = keyword.matchedBlockKey;

  while (true) {
    if (expectedKeys.has(nextBlockKey)) {
      return null;
    }

    const block = blocksByKey.get(nextBlockKey);

    if (block?.type === "text") {
      expectedKeys.add(block.blockKey);
      replyTexts.push(block.text);

      if (
        replyTexts.length >
        KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT
      ) {
        return null;
      }

      nextBlockKey = block.nextBlockKey;
      continue;
    }

    if (
      block?.type !== "end" ||
      replyTexts.length === 0
    ) {
      return null;
    }

    expectedKeys.add(block.blockKey);
    break;
  }

  if (
    definition.blocks.some(
      (block) => !expectedKeys.has(block.blockKey),
    )
  ) {
    return null;
  }

  return {
    name: definition.name,
    keywords: [...keyword.keywords],
    matchMode: keyword.matchMode,
    replyTexts,
  };
}

export function readKeywordButtonMenuBotFlowComposerDraft(
  definition: ValidatedBotFlowDefinition,
): KeywordButtonMenuBotFlowComposerDraft | null {
  const blocksByKey = new Map(
    definition.blocks.map((block) => [
      block.blockKey,
      block,
    ]),
  );
  const trigger = blocksByKey.get(
    definition.entryBlockKey,
  );

  if (trigger?.type !== "trigger") {
    return null;
  }

  const keyword = blocksByKey.get(
    trigger.nextBlockKey,
  );

  if (keyword?.type !== "keyword") {
    return null;
  }

  const unmatched = blocksByKey.get(
    keyword.unmatchedBlockKey,
  );

  if (
    unmatched?.type !== "handoff" ||
    unmatched.reason !== "no-match"
  ) {
    return null;
  }

  const expectedKeys = new Set([
    trigger.blockKey,
    keyword.blockKey,
    unmatched.blockKey,
  ]);
  const introTexts: string[] = [];
  let nextBlockKey = keyword.matchedBlockKey;
  let buttonsBlock:
    | Extract<
        (typeof definition.blocks)[number],
        { type: "buttons" }
      >
    | null = null;

  while (true) {
    if (expectedKeys.has(nextBlockKey)) {
      return null;
    }

    const block = blocksByKey.get(nextBlockKey);

    if (block?.type === "text") {
      expectedKeys.add(block.blockKey);
      introTexts.push(block.text);
      nextBlockKey = block.nextBlockKey;
      continue;
    }

    if (block?.type === "buttons") {
      buttonsBlock = block;
    }

    break;
  }

  if (
    !buttonsBlock ||
    introTexts.length === 0 ||
    buttonsBlock.options.length === 0 ||
    buttonsBlock.options.length >
      KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT ||
    introTexts.length + buttonsBlock.options.length >
      KEYWORD_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT
  ) {
    return null;
  }

  expectedKeys.add(buttonsBlock.blockKey);
  const responseKeys = new Set<string>();
  const options: KeywordButtonMenuOptionDraft[] = [];
  let endBlockKey: string | null = null;

  for (const option of buttonsBlock.options) {
    if (
      expectedKeys.has(option.nextBlockKey) ||
      responseKeys.has(option.nextBlockKey)
    ) {
      return null;
    }

    const response = blocksByKey.get(
      option.nextBlockKey,
    );

    if (response?.type !== "text") {
      return null;
    }

    if (
      endBlockKey !== null &&
      endBlockKey !== response.nextBlockKey
    ) {
      return null;
    }

    endBlockKey = response.nextBlockKey;
    responseKeys.add(response.blockKey);
    expectedKeys.add(response.blockKey);
    options.push({
      label: option.label,
      replyText: response.text,
    });
  }

  if (
    endBlockKey === null ||
    expectedKeys.has(endBlockKey) ||
    blocksByKey.get(endBlockKey)?.type !== "end"
  ) {
    return null;
  }

  expectedKeys.add(endBlockKey);

  if (
    definition.blocks.some(
      (block) => !expectedKeys.has(block.blockKey),
    )
  ) {
    return null;
  }

  return {
    name: definition.name,
    keywords: [...keyword.keywords],
    matchMode: keyword.matchMode,
    introTexts,
    buttonText: buttonsBlock.text,
    options,
  };
}

export function readKeywordConditionBotFlowComposerDraft(
  definition: ValidatedBotFlowDefinition,
): KeywordConditionBotFlowComposerDraft | null {
  if (
    definition.blocks.length < 8 ||
    definition.blocks.length > 100
  ) {
    return null;
  }

  const blocksByKey = new Map(
    definition.blocks.map((block) => [
      block.blockKey,
      block,
    ]),
  );
  const trigger = blocksByKey.get(
    definition.entryBlockKey,
  );

  if (trigger?.type !== "trigger") {
    return null;
  }

  const keyword = blocksByKey.get(
    trigger.nextBlockKey,
  );

  if (keyword?.type !== "keyword") {
    return null;
  }

  const keywordUnmatched = blocksByKey.get(
    keyword.unmatchedBlockKey,
  );

  if (
    keywordUnmatched?.type !== "handoff" ||
    keywordUnmatched.reason !== "no-match"
  ) {
    return null;
  }

  const expectedKeys = new Set([
    trigger.blockKey,
    keyword.blockKey,
    keywordUnmatched.blockKey,
  ]);
  const introTexts: string[] = [];
  let nextBlockKey = keyword.matchedBlockKey;
  let conditionBlock:
    | Extract<
        (typeof definition.blocks)[number],
        { type: "condition" }
      >
    | null = null;

  while (true) {
    if (expectedKeys.has(nextBlockKey)) {
      return null;
    }

    const block = blocksByKey.get(nextBlockKey);

    if (block?.type === "text") {
      expectedKeys.add(block.blockKey);
      introTexts.push(block.text);

      if (
        introTexts.length >
        KEYWORD_CONDITION_MAXIMUM_INTRO_COUNT
      ) {
        return null;
      }

      nextBlockKey = block.nextBlockKey;
      continue;
    }

    if (block?.type === "condition") {
      conditionBlock = block;
    }

    break;
  }

  if (!conditionBlock || introTexts.length === 0) {
    return null;
  }

  expectedKeys.add(conditionBlock.blockKey);
  const matchedReply = blocksByKey.get(
    conditionBlock.matchedBlockKey,
  );
  const unmatchedReply = blocksByKey.get(
    conditionBlock.unmatchedBlockKey,
  );

  if (
    conditionBlock.matchedBlockKey ===
      conditionBlock.unmatchedBlockKey ||
    matchedReply?.type !== "text" ||
    unmatchedReply?.type !== "text" ||
    matchedReply.nextBlockKey !==
      unmatchedReply.nextBlockKey ||
    expectedKeys.has(matchedReply.blockKey) ||
    expectedKeys.has(unmatchedReply.blockKey)
  ) {
    return null;
  }

  expectedKeys.add(matchedReply.blockKey);
  expectedKeys.add(unmatchedReply.blockKey);
  const end = blocksByKey.get(
    matchedReply.nextBlockKey,
  );

  if (
    end?.type !== "end" ||
    expectedKeys.has(end.blockKey)
  ) {
    return null;
  }

  expectedKeys.add(end.blockKey);

  if (
    definition.blocks.some(
      (block) => !expectedKeys.has(block.blockKey),
    )
  ) {
    return null;
  }

  return {
    name: definition.name,
    keywords: [...keyword.keywords],
    matchMode: keyword.matchMode,
    introTexts,
    condition: {
      fact: conditionBlock.fact,
      operator: conditionBlock.operator,
      value: conditionBlock.value,
      matchedReplyText: matchedReply.text,
      unmatchedReplyText: unmatchedReply.text,
    },
  };
}

export function readKeywordBotFlowComposerDraft(
  definition: ValidatedBotFlowDefinition,
): KeywordBotFlowComposerDraft | null {
  const sequence =
    readKeywordSequenceBotFlowComposerDraft(
      definition,
    );

  if (!sequence || sequence.replyTexts.length !== 1) {
    return null;
  }

  return {
    name: sequence.name,
    keywords: sequence.keywords,
    matchMode: sequence.matchMode,
    replyText: sequence.replyTexts[0],
  };
}
