import {
  botFlowConditionFacts,
  botFlowConditionOperators,
  type BotFlowBlock,
} from "../../shared/domain/botFlow.ts";
import {
  BOT_FLOW_GRAPH_DRAFT_MAXIMUM_NODE_COUNT,
  BOT_FLOW_GRAPH_DRAFT_MAXIMUM_OPTION_COUNT,
  type BotFlowGraphDraftNode,
  type SaveKeywordGraphBotFlowComposerDraftInput,
} from "../../shared/domain/botFlowGraphDraft.ts";
import {
  keywordHandoffReasons,
} from "../../shared/domain/botFlowComposer.ts";
import {
  normalizeBotFlowName,
  validateBotFlowDefinition,
} from "../../shared/validation/botFlowDefinition.ts";
import type {
  CompileKeywordBotFlowComposerResult,
} from "./botFlowComposer.ts";
import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
  deriveBotFlowOptionKey,
} from "./botFlowKey.ts";

const DRAFT_NODE_KEY_PATTERN =
  /^draft_node_v1_[1-9][0-9]{0,2}$/;
const DRAFT_OPTION_KEY_PATTERN =
  /^draft_option_v1_[1-9][0-9]{0,2}_[1-9][0-9]?$/;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  input: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const inputKeys = Object.keys(input);

  return (
    inputKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(input, key))
  );
}

function isExpectedFlowVersion(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value > 0)
  );
}

function isDraftNodeKey(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    DRAFT_NODE_KEY_PATTERN.test(value)
  );
}

function isDraftOptionKey(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    DRAFT_OPTION_KEY_PATTERN.test(value)
  );
}

function isOneOf<TValue extends string>(
  value: unknown,
  values: readonly TValue[],
): value is TValue {
  return values.some(
    (candidate) => candidate === value,
  );
}

function parseGraphDraftNode(
  value: unknown,
): BotFlowGraphDraftNode | null {
  if (
    !isRecord(value) ||
    !isDraftNodeKey(value.draftNodeKey)
  ) {
    return null;
  }

  if (
    value.type === "text" &&
    hasExactKeys(value, [
      "draftNodeKey",
      "type",
      "text",
      "nextDraftNodeKey",
    ]) &&
    typeof value.text === "string" &&
    isDraftNodeKey(value.nextDraftNodeKey)
  ) {
    return {
      draftNodeKey: value.draftNodeKey,
      type: "text",
      text: value.text,
      nextDraftNodeKey: value.nextDraftNodeKey,
    };
  }

  if (
    value.type === "buttons" &&
    hasExactKeys(value, [
      "draftNodeKey",
      "type",
      "text",
      "options",
    ]) &&
    typeof value.text === "string" &&
    Array.isArray(value.options) &&
    value.options.length > 0 &&
    value.options.length <=
      BOT_FLOW_GRAPH_DRAFT_MAXIMUM_OPTION_COUNT
  ) {
    const options = [];

    for (const candidate of value.options) {
      if (
        !isRecord(candidate) ||
        !hasExactKeys(candidate, [
          "draftOptionKey",
          "label",
          "nextDraftNodeKey",
        ]) ||
        !isDraftOptionKey(
          candidate.draftOptionKey,
        ) ||
        typeof candidate.label !== "string" ||
        !isDraftNodeKey(
          candidate.nextDraftNodeKey,
        )
      ) {
        return null;
      }

      options.push({
        draftOptionKey: candidate.draftOptionKey,
        label: candidate.label,
        nextDraftNodeKey:
          candidate.nextDraftNodeKey,
      });
    }

    return {
      draftNodeKey: value.draftNodeKey,
      type: "buttons",
      text: value.text,
      options,
    };
  }

  if (
    value.type === "condition" &&
    hasExactKeys(value, [
      "draftNodeKey",
      "type",
      "fact",
      "operator",
      "value",
      "matchedDraftNodeKey",
      "unmatchedDraftNodeKey",
    ]) &&
    isOneOf(value.fact, botFlowConditionFacts) &&
    isOneOf(
      value.operator,
      botFlowConditionOperators,
    ) &&
    typeof value.value === "string" &&
    isDraftNodeKey(value.matchedDraftNodeKey) &&
    isDraftNodeKey(value.unmatchedDraftNodeKey)
  ) {
    return {
      draftNodeKey: value.draftNodeKey,
      type: "condition",
      fact: value.fact,
      operator: value.operator,
      value: value.value,
      matchedDraftNodeKey:
        value.matchedDraftNodeKey,
      unmatchedDraftNodeKey:
        value.unmatchedDraftNodeKey,
    };
  }

  if (
    value.type === "handoff" &&
    hasExactKeys(value, [
      "draftNodeKey",
      "type",
      "reason",
    ]) &&
    isOneOf(value.reason, keywordHandoffReasons)
  ) {
    return {
      draftNodeKey: value.draftNodeKey,
      type: "handoff",
      reason: value.reason,
    };
  }

  if (
    value.type === "end" &&
    hasExactKeys(value, [
      "draftNodeKey",
      "type",
    ])
  ) {
    return {
      draftNodeKey: value.draftNodeKey,
      type: "end",
    };
  }

  return null;
}

function parseGraphDraftInput(
  input: unknown,
): SaveKeywordGraphBotFlowComposerDraftInput | null {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "name",
      "keywords",
      "matchMode",
      "entryDraftNodeKey",
      "nodes",
      "expectedFlowVersion",
    ]) ||
    typeof input.name !== "string" ||
    !Array.isArray(input.keywords) ||
    !isOneOf(
      input.matchMode,
      ["exact", "contains"] as const,
    ) ||
    !isDraftNodeKey(input.entryDraftNodeKey) ||
    !Array.isArray(input.nodes) ||
    input.nodes.length === 0 ||
    input.nodes.length >
      BOT_FLOW_GRAPH_DRAFT_MAXIMUM_NODE_COUNT ||
    !isExpectedFlowVersion(
      input.expectedFlowVersion,
    )
  ) {
    return null;
  }

  const nodes: BotFlowGraphDraftNode[] = [];
  const nodeKeys = new Set<string>();
  const optionKeys = new Set<string>();

  for (const candidate of input.nodes) {
    const node = parseGraphDraftNode(candidate);

    if (
      !node ||
      nodeKeys.has(node.draftNodeKey)
    ) {
      return null;
    }

    nodeKeys.add(node.draftNodeKey);

    if (node.type === "buttons") {
      for (const option of node.options) {
        if (optionKeys.has(option.draftOptionKey)) {
          return null;
        }

        optionKeys.add(option.draftOptionKey);
      }
    }

    nodes.push(node);
  }

  if (
    !nodeKeys.has(input.entryDraftNodeKey) ||
    nodes.some((node) => {
      if (node.type === "text") {
        return !nodeKeys.has(node.nextDraftNodeKey);
      }

      if (node.type === "buttons") {
        return node.options.some(
          (option) =>
            !nodeKeys.has(
              option.nextDraftNodeKey,
            ),
        );
      }

      if (node.type === "condition") {
        return (
          !nodeKeys.has(
            node.matchedDraftNodeKey,
          ) ||
          !nodeKeys.has(
            node.unmatchedDraftNodeKey,
          )
        );
      }

      return false;
    })
  ) {
    return null;
  }

  return {
    name: input.name,
    keywords: input.keywords,
    matchMode: input.matchMode,
    entryDraftNodeKey: input.entryDraftNodeKey,
    nodes,
    expectedFlowVersion:
      input.expectedFlowVersion,
  };
}

function referencedDraftNodeKeys(
  node: BotFlowGraphDraftNode,
): readonly string[] {
  if (node.type === "text") {
    return [node.nextDraftNodeKey];
  }

  if (node.type === "buttons") {
    return node.options.map(
      (option) => option.nextDraftNodeKey,
    );
  }

  if (node.type === "condition") {
    return [
      node.matchedDraftNodeKey,
      node.unmatchedDraftNodeKey,
    ];
  }

  return [];
}

function canonicalGraphNodes(
  draft: SaveKeywordGraphBotFlowComposerDraftInput,
): readonly BotFlowGraphDraftNode[] {
  const nodesByKey = new Map(
    draft.nodes.map((node) => [
      node.draftNodeKey,
      node,
    ]),
  );
  const ordered: BotFlowGraphDraftNode[] = [];
  const visited = new Set<string>();

  const visit = (draftNodeKey: string) => {
    if (visited.has(draftNodeKey)) {
      return;
    }

    const node = nodesByKey.get(draftNodeKey);

    if (!node) {
      return;
    }

    visited.add(draftNodeKey);
    ordered.push(node);
    referencedDraftNodeKeys(node).forEach(visit);
  };

  visit(draft.entryDraftNodeKey);

  [...draft.nodes]
    .sort((first, second) =>
      first.draftNodeKey < second.draftNodeKey
        ? -1
        : first.draftNodeKey > second.draftNodeKey
          ? 1
          : 0,
    )
    .forEach((node) => visit(node.draftNodeKey));

  return ordered;
}

export async function compileKeywordGraphBotFlowComposerDraft(
  tenantId: number,
  input: unknown,
): Promise<CompileKeywordBotFlowComposerResult> {
  const draft = parseGraphDraftInput(input);

  if (!draft) {
    return {
      success: false,
      issues: ["invalid-input"],
    };
  }

  const name = normalizeBotFlowName(draft.name);

  if (!name) {
    return {
      success: false,
      issues: ["invalid-name"],
    };
  }

  const botFlowKey = await deriveBotFlowKey(
    tenantId,
    name,
  );
  const nodes = canonicalGraphNodes(draft);
  const blockKeys = await Promise.all(
    Array.from(
      { length: nodes.length + 3 },
      (_, index) =>
        deriveBotFlowBlockKey(
          botFlowKey,
          index + 1,
        ),
    ),
  );
  const triggerKey = blockKeys[0];
  const keywordKey = blockKeys[1];
  const unmatchedHandoffKey =
    blockKeys[blockKeys.length - 1];
  const blockKeysByDraftNodeKey = new Map(
    nodes.map((node, index) => [
      node.draftNodeKey,
      blockKeys[index + 2],
    ]),
  );
  const target = (draftNodeKey: string) =>
    blockKeysByDraftNodeKey.get(draftNodeKey) ?? "";
  const compiledNodes: BotFlowBlock[] = [];

  for (
    let index = 0;
    index < nodes.length;
    index += 1
  ) {
    const node = nodes[index];
    const blockKey = blockKeys[index + 2];

    if (node.type === "text") {
      compiledNodes.push({
        blockKey,
        type: "text",
        text: node.text,
        nextBlockKey: target(
          node.nextDraftNodeKey,
        ),
      });
      continue;
    }

    if (node.type === "buttons") {
      const optionKeys = await Promise.all(
        node.options.map((_, optionIndex) =>
          deriveBotFlowOptionKey(
            blockKey,
            optionIndex + 1,
          ),
        ),
      );

      compiledNodes.push({
        blockKey,
        type: "buttons",
        text: node.text,
        options: node.options.map(
          (option, optionIndex) => ({
            optionKey: optionKeys[optionIndex],
            label: option.label,
            nextBlockKey: target(
              option.nextDraftNodeKey,
            ),
          }),
        ),
      });
      continue;
    }

    if (node.type === "condition") {
      compiledNodes.push({
        blockKey,
        type: "condition",
        fact: node.fact,
        operator: node.operator,
        value: node.value,
        matchedBlockKey: target(
          node.matchedDraftNodeKey,
        ),
        unmatchedBlockKey: target(
          node.unmatchedDraftNodeKey,
        ),
      });
      continue;
    }

    if (node.type === "handoff") {
      compiledNodes.push({
        blockKey,
        type: "handoff",
        reason: node.reason,
      });
      continue;
    }

    compiledNodes.push({
      blockKey,
      type: "end",
    });
  }

  const definition = {
    name,
    entryBlockKey: triggerKey,
    blocks: [
      {
        blockKey: triggerKey,
        type: "trigger",
        nextBlockKey: keywordKey,
      },
      {
        blockKey: keywordKey,
        type: "keyword",
        keywords: draft.keywords,
        matchMode: draft.matchMode,
        matchedBlockKey: target(
          draft.entryDraftNodeKey,
        ),
        unmatchedBlockKey: unmatchedHandoffKey,
      },
      ...compiledNodes,
      {
        blockKey: unmatchedHandoffKey,
        type: "handoff",
        reason: "no-match",
      },
    ],
  };
  const validation =
    validateBotFlowDefinition(definition);

  if (!validation.success) {
    return validation;
  }

  return {
    success: true,
    definition: validation.value,
    expectedFlowVersion:
      draft.expectedFlowVersion,
  };
}
