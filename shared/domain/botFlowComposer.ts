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

export function readKeywordBotFlowComposerDraft(
  definition: ValidatedBotFlowDefinition,
): KeywordBotFlowComposerDraft | null {
  if (definition.blocks.length !== 5) {
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
    matched?.type !== "text" ||
    unmatched?.type !== "handoff" ||
    unmatched.reason !== "no-match"
  ) {
    return null;
  }

  const end = blocksByKey.get(
    matched.nextBlockKey,
  );

  if (end?.type !== "end") {
    return null;
  }

  const expectedKeys = new Set([
    trigger.blockKey,
    keyword.blockKey,
    matched.blockKey,
    unmatched.blockKey,
    end.blockKey,
  ]);

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
    replyText: matched.text,
  };
}
