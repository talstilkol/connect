import type {
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
