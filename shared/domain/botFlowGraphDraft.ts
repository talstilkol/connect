import type {
  BotFlowBlock,
  BotFlowConditionFact,
  BotFlowConditionOperator,
  BotFlowHandoffReason,
  BotFlowKeywordMatchMode,
  ValidatedBotFlowDefinition,
} from "./botFlow.ts";

export const BOT_FLOW_GRAPH_DRAFT_MAXIMUM_NODE_COUNT = 97;
export const BOT_FLOW_GRAPH_DRAFT_MAXIMUM_OPTION_COUNT = 10;
const BOT_FLOW_GRAPH_DRAFT_NODE_KEY_PATTERN =
  /^draft_node_v1_[1-9][0-9]{0,2}$/;
const BOT_FLOW_GRAPH_DRAFT_OPTION_KEY_PATTERN =
  /^draft_option_v1_[1-9][0-9]{0,2}_[1-9][0-9]?$/;

export function isBotFlowGraphDraftNodeKey(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    BOT_FLOW_GRAPH_DRAFT_NODE_KEY_PATTERN.test(
      value,
    )
  );
}

export function isBotFlowGraphDraftOptionKey(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    BOT_FLOW_GRAPH_DRAFT_OPTION_KEY_PATTERN.test(
      value,
    )
  );
}

export function createBotFlowGraphDraftNodeKey(
  ordinal: number,
): string {
  if (
    !Number.isSafeInteger(ordinal) ||
    ordinal <= 0 ||
    ordinal > 999
  ) {
    throw new Error("draft node ordinal is invalid");
  }

  return `draft_node_v1_${ordinal}`;
}

export function createBotFlowGraphDraftOptionKey(
  nodeOrdinal: number,
  optionOrdinal: number,
): string {
  createBotFlowGraphDraftNodeKey(nodeOrdinal);

  if (
    !Number.isSafeInteger(optionOrdinal) ||
    optionOrdinal <= 0 ||
    optionOrdinal > 99
  ) {
    throw new Error("draft option ordinal is invalid");
  }

  return `draft_option_v1_${nodeOrdinal}_${optionOrdinal}`;
}

export type BotFlowGraphDraftNodeType = Exclude<
  BotFlowBlock["type"],
  "trigger" | "keyword"
>;

interface BotFlowGraphDraftNodeBase {
  draftNodeKey: string;
  type: BotFlowGraphDraftNodeType;
}

export interface BotFlowGraphDraftTextNode
  extends BotFlowGraphDraftNodeBase {
  type: "text";
  text: string;
  nextDraftNodeKey: string;
}

export interface BotFlowGraphDraftButtonOption {
  draftOptionKey: string;
  label: string;
  nextDraftNodeKey: string;
}

export interface BotFlowGraphDraftButtonsNode
  extends BotFlowGraphDraftNodeBase {
  type: "buttons";
  text: string;
  options: readonly BotFlowGraphDraftButtonOption[];
}

export interface BotFlowGraphDraftConditionNode
  extends BotFlowGraphDraftNodeBase {
  type: "condition";
  fact: BotFlowConditionFact;
  operator: BotFlowConditionOperator;
  value: string;
  matchedDraftNodeKey: string;
  unmatchedDraftNodeKey: string;
}

export interface BotFlowGraphDraftHandoffNode
  extends BotFlowGraphDraftNodeBase {
  type: "handoff";
  reason: Extract<
    BotFlowHandoffReason,
    "customer-request" | "flow-rule"
  >;
}

export interface BotFlowGraphDraftEndNode
  extends BotFlowGraphDraftNodeBase {
  type: "end";
}

export type BotFlowGraphDraftNode =
  | BotFlowGraphDraftTextNode
  | BotFlowGraphDraftButtonsNode
  | BotFlowGraphDraftConditionNode
  | BotFlowGraphDraftHandoffNode
  | BotFlowGraphDraftEndNode;

export interface KeywordGraphBotFlowComposerDraft {
  name: string;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  entryDraftNodeKey: string;
  nodes: readonly BotFlowGraphDraftNode[];
}

export interface SaveKeywordGraphBotFlowComposerDraftInput
  extends KeywordGraphBotFlowComposerDraft {
  expectedFlowVersion: number | null;
}

function referencedBlockKeys(
  block: BotFlowBlock,
): readonly string[] {
  if (block.type === "text") {
    return [block.nextBlockKey];
  }

  if (block.type === "buttons") {
    return block.options.map(
      (option) => option.nextBlockKey,
    );
  }

  if (block.type === "condition") {
    return [
      block.matchedBlockKey,
      block.unmatchedBlockKey,
    ];
  }

  return [];
}

function draftNodeKey(ordinal: number): string {
  return createBotFlowGraphDraftNodeKey(ordinal);
}

function draftOptionKey(
  nodeOrdinal: number,
  optionOrdinal: number,
): string {
  return createBotFlowGraphDraftOptionKey(
    nodeOrdinal,
    optionOrdinal,
  );
}

export function readKeywordGraphBotFlowComposerDraft(
  definition: ValidatedBotFlowDefinition,
): KeywordGraphBotFlowComposerDraft | null {
  if (
    definition.blocks.length < 4 ||
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
    unmatched.reason !== "no-match" ||
    keyword.matchedBlockKey === unmatched.blockKey
  ) {
    return null;
  }

  const reservedKeys = new Set([
    trigger.blockKey,
    keyword.blockKey,
    unmatched.blockKey,
  ]);
  const orderedBlocks: BotFlowBlock[] = [];
  const visited = new Set<string>();

  const visit = (blockKey: string): boolean => {
    if (
      reservedKeys.has(blockKey) ||
      visited.has(blockKey)
    ) {
      return visited.has(blockKey);
    }

    const block = blocksByKey.get(blockKey);

    if (
      !block ||
      block.type === "trigger" ||
      block.type === "keyword" ||
      (block.type === "handoff" &&
        block.reason === "no-match")
    ) {
      return false;
    }

    visited.add(blockKey);
    orderedBlocks.push(block);

    return referencedBlockKeys(block).every(visit);
  };

  if (
    !visit(keyword.matchedBlockKey) ||
    orderedBlocks.length !==
      definition.blocks.length - 3 ||
    orderedBlocks.length >
      BOT_FLOW_GRAPH_DRAFT_MAXIMUM_NODE_COUNT
  ) {
    return null;
  }

  const draftKeysByBlockKey = new Map(
    orderedBlocks.map((block, index) => [
      block.blockKey,
      draftNodeKey(index + 1),
    ]),
  );
  const target = (blockKey: string) =>
    draftKeysByBlockKey.get(blockKey);
  const nodes: BotFlowGraphDraftNode[] = [];

  for (
    let index = 0;
    index < orderedBlocks.length;
    index += 1
  ) {
    const block = orderedBlocks[index];
    const nodeKey = draftNodeKey(index + 1);

    if (block.type === "text") {
      const nextDraftNodeKey = target(
        block.nextBlockKey,
      );

      if (!nextDraftNodeKey) {
        return null;
      }

      nodes.push({
        draftNodeKey: nodeKey,
        type: "text",
        text: block.text,
        nextDraftNodeKey,
      });
      continue;
    }

    if (block.type === "buttons") {
      const options = block.options.map(
        (option, optionIndex) => ({
          draftOptionKey: draftOptionKey(
            index + 1,
            optionIndex + 1,
          ),
          label: option.label,
          nextDraftNodeKey: target(
            option.nextBlockKey,
          ),
        }),
      );

      if (
        options.some(
          (option) =>
            option.nextDraftNodeKey === undefined,
        )
      ) {
        return null;
      }

      nodes.push({
        draftNodeKey: nodeKey,
        type: "buttons",
        text: block.text,
        options: options as readonly BotFlowGraphDraftButtonOption[],
      });
      continue;
    }

    if (block.type === "condition") {
      const matchedDraftNodeKey = target(
        block.matchedBlockKey,
      );
      const unmatchedDraftNodeKey = target(
        block.unmatchedBlockKey,
      );

      if (
        !matchedDraftNodeKey ||
        !unmatchedDraftNodeKey
      ) {
        return null;
      }

      nodes.push({
        draftNodeKey: nodeKey,
        type: "condition",
        fact: block.fact,
        operator: block.operator,
        value: block.value,
        matchedDraftNodeKey,
        unmatchedDraftNodeKey,
      });
      continue;
    }

    if (block.type === "handoff") {
      if (block.reason === "no-match") {
        return null;
      }

      nodes.push({
        draftNodeKey: nodeKey,
        type: "handoff",
        reason: block.reason,
      });
      continue;
    }

    if (block.type === "end") {
      nodes.push({
        draftNodeKey: nodeKey,
        type: "end",
      });
      continue;
    }

    return null;
  }

  return {
    name: definition.name,
    keywords: [...keyword.keywords],
    matchMode: keyword.matchMode,
    entryDraftNodeKey:
      draftKeysByBlockKey.get(
        keyword.matchedBlockKey,
      ) ?? "",
    nodes,
  };
}
