import type {
  BotFlowConditionFact,
  BotFlowConditionOperator,
  BotFlowHandoffReason,
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
export const KEYWORD_TWO_STEP_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT =
  95;
export const KEYWORD_CONDITION_MAXIMUM_INTRO_COUNT = 93;
export const keywordHandoffReasons = [
  "customer-request",
  "flow-rule",
] as const satisfies readonly BotFlowHandoffReason[];

export type KeywordHandoffReason =
  (typeof keywordHandoffReasons)[number];

export function isKeywordHandoffReason(
  value: BotFlowHandoffReason,
): value is KeywordHandoffReason {
  return keywordHandoffReasons.some(
    (reason) => reason === value,
  );
}

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

export interface KeywordTwoStepButtonBranchDraft {
  label: string;
  buttonText: string;
  options: readonly KeywordButtonMenuOptionDraft[];
}

export interface KeywordTwoStepButtonMenuBotFlowComposerDraft {
  name: string;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  introTexts: readonly string[];
  firstButtonText: string;
  branches: readonly KeywordTwoStepButtonBranchDraft[];
}

export interface SaveKeywordTwoStepButtonMenuBotFlowComposerDraftInput
  extends KeywordTwoStepButtonMenuBotFlowComposerDraft {
  expectedFlowVersion: number | null;
}

export interface KeywordConditionDraft {
  fact: BotFlowConditionFact;
  operator: BotFlowConditionOperator;
  value: string;
  matchedReplyText: string;
  unmatchedReplyText: string;
  matchedHandoffReason?: KeywordHandoffReason | "" | null;
  unmatchedHandoffReason?: KeywordHandoffReason | "" | null;
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

export interface KeywordHandoffBotFlowComposerDraft {
  name: string;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  handoffReason: KeywordHandoffReason;
}

export interface SaveKeywordHandoffBotFlowComposerDraftInput
  extends KeywordHandoffBotFlowComposerDraft {
  expectedFlowVersion: number | null;
}

export function readKeywordHandoffBotFlowComposerDraft(
  definition: ValidatedBotFlowDefinition,
): KeywordHandoffBotFlowComposerDraft | null {
  if (definition.blocks.length !== 4) {
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

  const matched = blocksByKey.get(
    keyword.matchedBlockKey,
  );
  const unmatched = blocksByKey.get(
    keyword.unmatchedBlockKey,
  );

  if (
    matched?.type !== "handoff" ||
    !isKeywordHandoffReason(matched.reason) ||
    unmatched?.type !== "end" ||
    new Set([
      trigger.blockKey,
      keyword.blockKey,
      matched.blockKey,
      unmatched.blockKey,
    ]).size !== 4
  ) {
    return null;
  }

  return {
    name: definition.name,
    keywords: [...keyword.keywords],
    matchMode: keyword.matchMode,
    handoffReason: matched.reason,
  };
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

export function readKeywordTwoStepButtonMenuBotFlowComposerDraft(
  definition: ValidatedBotFlowDefinition,
): KeywordTwoStepButtonMenuBotFlowComposerDraft | null {
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
  let firstButtons:
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
      firstButtons = block;
    }

    break;
  }

  if (
    !firstButtons ||
    introTexts.length === 0 ||
    firstButtons.options.length === 0 ||
    firstButtons.options.length >
      KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT
  ) {
    return null;
  }

  expectedKeys.add(firstButtons.blockKey);
  const branches: KeywordTwoStepButtonBranchDraft[] = [];
  let endBlockKey: string | null = null;
  let nestedOptionCount = 0;

  for (const firstOption of firstButtons.options) {
    if (expectedKeys.has(firstOption.nextBlockKey)) {
      return null;
    }

    const followup = blocksByKey.get(
      firstOption.nextBlockKey,
    );

    if (
      followup?.type !== "buttons" ||
      followup.options.length === 0 ||
      followup.options.length >
        KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT
    ) {
      return null;
    }

    expectedKeys.add(followup.blockKey);
    const options: KeywordButtonMenuOptionDraft[] = [];

    for (const followupOption of followup.options) {
      if (
        expectedKeys.has(
          followupOption.nextBlockKey,
        )
      ) {
        return null;
      }

      const response = blocksByKey.get(
        followupOption.nextBlockKey,
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
      expectedKeys.add(response.blockKey);
      nestedOptionCount += 1;
      options.push({
        label: followupOption.label,
        replyText: response.text,
      });
    }

    branches.push({
      label: firstOption.label,
      buttonText: followup.text,
      options,
    });
  }

  if (
    introTexts.length +
      branches.length +
      nestedOptionCount >
      KEYWORD_TWO_STEP_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT ||
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
    firstButtonText: firstButtons.text,
    branches,
  };
}

export function readKeywordConditionBotFlowComposerDraft(
  definition: ValidatedBotFlowDefinition,
): KeywordConditionBotFlowComposerDraft | null {
  if (
    definition.blocks.length < 6 ||
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

  if (!conditionBlock) {
    return null;
  }

  expectedKeys.add(conditionBlock.blockKey);
  const matchedBranch = blocksByKey.get(
    conditionBlock.matchedBlockKey,
  );
  const unmatchedBranch = blocksByKey.get(
    conditionBlock.unmatchedBlockKey,
  );

  if (
    conditionBlock.matchedBlockKey ===
      conditionBlock.unmatchedBlockKey ||
    !matchedBranch ||
    !unmatchedBranch ||
    expectedKeys.has(matchedBranch.blockKey) ||
    expectedKeys.has(unmatchedBranch.blockKey) ||
    (matchedBranch.type !== "text" &&
      (matchedBranch.type !== "handoff" ||
        !isKeywordHandoffReason(
          matchedBranch.reason,
        ))) ||
    (unmatchedBranch.type !== "text" &&
      (unmatchedBranch.type !== "handoff" ||
        !isKeywordHandoffReason(
          unmatchedBranch.reason,
        ))) ||
    ((matchedBranch.type === "handoff" ||
      unmatchedBranch.type === "handoff") &&
      introTexts.length > 0)
  ) {
    return null;
  }

  expectedKeys.add(matchedBranch.blockKey);
  expectedKeys.add(unmatchedBranch.blockKey);
  const branchEndKeys = [
    matchedBranch,
    unmatchedBranch,
  ].flatMap((branch) =>
    branch.type === "text"
      ? [branch.nextBlockKey]
      : [],
  );
  const uniqueEndKeys = new Set(branchEndKeys);

  if (
    uniqueEndKeys.size > 1 ||
    (uniqueEndKeys.size === 0 &&
      (matchedBranch.type !== "handoff" ||
        unmatchedBranch.type !== "handoff"))
  ) {
    return null;
  }

  if (uniqueEndKeys.size === 1) {
    const [endKey] = uniqueEndKeys;
    const end = endKey
      ? blocksByKey.get(endKey)
      : undefined;

    if (
      end?.type !== "end" ||
      expectedKeys.has(end.blockKey)
    ) {
      return null;
    }

    expectedKeys.add(end.blockKey);
  }

  if (
    definition.blocks.some(
      (block) => !expectedKeys.has(block.blockKey),
    )
  ) {
    return null;
  }

  const condition: KeywordConditionDraft = {
    fact: conditionBlock.fact,
    operator: conditionBlock.operator,
    value: conditionBlock.value,
    matchedReplyText:
      matchedBranch.type === "text"
        ? matchedBranch.text
        : "",
    unmatchedReplyText:
      unmatchedBranch.type === "text"
        ? unmatchedBranch.text
        : "",
  };

  if (
    matchedBranch.type === "handoff" ||
    unmatchedBranch.type === "handoff"
  ) {
    condition.matchedHandoffReason =
      matchedBranch.type === "handoff" &&
      isKeywordHandoffReason(matchedBranch.reason)
        ? matchedBranch.reason
        : null;
    condition.unmatchedHandoffReason =
      unmatchedBranch.type === "handoff" &&
      isKeywordHandoffReason(
        unmatchedBranch.reason,
      )
        ? unmatchedBranch.reason
        : null;
  }

  return {
    name: definition.name,
    keywords: [...keyword.keywords],
    matchMode: keyword.matchMode,
    introTexts,
    condition,
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
