import {
  botFlowConditionFacts,
  botFlowConditionOperators,
  type BotFlowConditionFact,
  type BotFlowConditionOperator,
} from "./botFlow.ts";
import {
  BOT_FLOW_GRAPH_DRAFT_MAXIMUM_NODE_COUNT,
  BOT_FLOW_GRAPH_DRAFT_MAXIMUM_OPTION_COUNT,
  createBotFlowGraphDraftNodeKey,
  createBotFlowGraphDraftOptionKey,
  isBotFlowGraphDraftNodeKey,
  isBotFlowGraphDraftOptionKey,
  type BotFlowGraphDraftNode,
  type BotFlowGraphDraftNodeType,
  type BotFlowGraphDraftButtonsNode,
  type BotFlowGraphDraftButtonOption,
  type KeywordGraphBotFlowComposerDraft,
} from "./botFlowGraphDraft.ts";
import {
  persistedConversationStatuses,
} from "./conversation.ts";

export const botFlowGraphEditorNodeTypes = [
  "text",
  "buttons",
  "condition",
  "handoff",
  "end",
] as const satisfies readonly BotFlowGraphDraftNodeType[];

export type BotFlowGraphEditorNodeType =
  (typeof botFlowGraphEditorNodeTypes)[number];

export interface BotFlowGraphEditorDraft {
  entryDraftNodeKey: string;
  nodes: readonly BotFlowGraphDraftNode[];
}

export type BotFlowGraphNodeMoveDirection =
  | "up"
  | "down";
export type BotFlowGraphOptionMoveDirection =
  | "up"
  | "down";

function cloneNode(
  node: BotFlowGraphDraftNode,
): BotFlowGraphDraftNode {
  return node.type === "buttons"
    ? {
        ...node,
        options: node.options.map(
          (option) => ({ ...option }),
        ),
      }
    : { ...node };
}

export function createBotFlowGraphEditorDraft(
  source?: Pick<
    KeywordGraphBotFlowComposerDraft,
    "entryDraftNodeKey" | "nodes"
  >,
): BotFlowGraphEditorDraft {
  if (source) {
    return {
      entryDraftNodeKey: source.entryDraftNodeKey,
      nodes: source.nodes.map(cloneNode),
    };
  }

  const textKey = createBotFlowGraphDraftNodeKey(1);
  const endKey = createBotFlowGraphDraftNodeKey(2);

  return {
    entryDraftNodeKey: textKey,
    nodes: [
      {
        draftNodeKey: textKey,
        type: "text",
        text: "",
        nextDraftNodeKey: endKey,
      },
      {
        draftNodeKey: endKey,
        type: "end",
      },
    ],
  };
}

function numericSuffix(value: string): number {
  const suffix = value.split("_").at(-1);
  const parsed = Number(suffix);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : 0;
}

function nextNodeOrdinal(
  nodes: readonly BotFlowGraphDraftNode[],
): number {
  return (
    nodes.reduce(
      (maximum, node) =>
        Math.max(
          maximum,
          numericSuffix(node.draftNodeKey),
        ),
      0,
    ) + 1
  );
}

function defaultTarget(
  draft: BotFlowGraphEditorDraft,
): string {
  return (
    draft.nodes.find((node) => node.type === "end")
      ?.draftNodeKey ?? draft.entryDraftNodeKey
  );
}

export function appendBotFlowGraphNode(
  draft: BotFlowGraphEditorDraft,
  type: BotFlowGraphEditorNodeType,
): BotFlowGraphEditorDraft {
  if (
    draft.nodes.length >=
      BOT_FLOW_GRAPH_DRAFT_MAXIMUM_NODE_COUNT ||
    !botFlowGraphEditorNodeTypes.some(
      (candidate) => candidate === type,
    )
  ) {
    return draft;
  }

  const ordinal = nextNodeOrdinal(draft.nodes);
  const draftNodeKey =
    createBotFlowGraphDraftNodeKey(ordinal);
  const target = defaultTarget(draft);
  let node: BotFlowGraphDraftNode;

  if (type === "text") {
    node = {
      draftNodeKey,
      type,
      text: "",
      nextDraftNodeKey: target,
    };
  } else if (type === "buttons") {
    node = {
      draftNodeKey,
      type,
      text: "",
      options: [
        {
          draftOptionKey:
            createBotFlowGraphDraftOptionKey(
              ordinal,
              1,
            ),
          label: "",
          nextDraftNodeKey: target,
        },
      ],
    };
  } else if (type === "condition") {
    node = {
      draftNodeKey,
      type,
      fact: "last-inbound-text",
      operator: "equals",
      value: "",
      matchedDraftNodeKey: target,
      unmatchedDraftNodeKey: target,
    };
  } else if (type === "handoff") {
    node = {
      draftNodeKey,
      type,
      reason: "flow-rule",
    };
  } else {
    node = {
      draftNodeKey,
      type: "end",
    };
  }

  return {
    ...draft,
    nodes: [...draft.nodes, node],
  };
}

export function updateBotFlowGraphEntry(
  draft: BotFlowGraphEditorDraft,
  entryDraftNodeKey: string,
): BotFlowGraphEditorDraft {
  return draft.nodes.some(
    (node) =>
      node.draftNodeKey === entryDraftNodeKey,
  )
    ? { ...draft, entryDraftNodeKey }
    : draft;
}

export function updateBotFlowGraphNode(
  draft: BotFlowGraphEditorDraft,
  nextNode: BotFlowGraphDraftNode,
): BotFlowGraphEditorDraft {
  if (
    !draft.nodes.some(
      (node) =>
        node.draftNodeKey ===
        nextNode.draftNodeKey,
    )
  ) {
    return draft;
  }

  return {
    ...draft,
    nodes: draft.nodes.map((node) =>
      node.draftNodeKey === nextNode.draftNodeKey
        ? cloneNode(nextNode)
        : node,
    ),
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

export function countBotFlowGraphNodeReferences(
  draft: BotFlowGraphEditorDraft,
  draftNodeKey: string,
): number {
  return draft.nodes.reduce(
    (count, node) =>
      count +
      referencedDraftNodeKeys(node).filter(
        (target) => target === draftNodeKey,
      ).length,
    0,
  );
}

export function removeBotFlowGraphNode(
  draft: BotFlowGraphEditorDraft,
  draftNodeKey: string,
): BotFlowGraphEditorDraft {
  if (
    draft.nodes.length <= 1 ||
    draft.entryDraftNodeKey === draftNodeKey ||
    countBotFlowGraphNodeReferences(
      draft,
      draftNodeKey,
    ) > 0
  ) {
    return draft;
  }

  return {
    ...draft,
    nodes: draft.nodes.filter(
      (node) => node.draftNodeKey !== draftNodeKey,
    ),
  };
}

export function moveBotFlowGraphNode(
  draft: BotFlowGraphEditorDraft,
  draftNodeKey: string,
  direction: BotFlowGraphNodeMoveDirection,
): BotFlowGraphEditorDraft {
  const sourceIndex = draft.nodes.findIndex(
    (node) => node.draftNodeKey === draftNodeKey,
  );
  const targetIndex =
    direction === "up"
      ? sourceIndex - 1
      : sourceIndex + 1;

  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= draft.nodes.length
  ) {
    return draft;
  }

  const nodes = [...draft.nodes];
  const [node] = nodes.splice(sourceIndex, 1);
  nodes.splice(targetIndex, 0, node);

  return { ...draft, nodes };
}

export function moveBotFlowGraphNodeToPosition(
  draft: BotFlowGraphEditorDraft,
  draftNodeKey: string,
  targetIndex: number,
): BotFlowGraphEditorDraft {
  const sourceIndex = draft.nodes.findIndex(
    (node) => node.draftNodeKey === draftNodeKey,
  );

  if (
    sourceIndex < 0 ||
    !Number.isSafeInteger(targetIndex) ||
    targetIndex < 0 ||
    targetIndex >= draft.nodes.length ||
    targetIndex === sourceIndex
  ) {
    return draft;
  }

  const nodes = [...draft.nodes];
  const [node] = nodes.splice(sourceIndex, 1);
  nodes.splice(targetIndex, 0, node);

  return { ...draft, nodes };
}

function buttonNodeOrdinal(
  node: BotFlowGraphDraftButtonsNode,
): number {
  return numericSuffix(node.draftNodeKey);
}

export function appendBotFlowGraphButtonOption(
  node: BotFlowGraphDraftButtonsNode,
  fallbackTarget: string,
): BotFlowGraphDraftButtonsNode {
  if (
    node.options.length >=
    BOT_FLOW_GRAPH_DRAFT_MAXIMUM_OPTION_COUNT
  ) {
    return node;
  }

  const optionOrdinal =
    node.options.reduce(
      (maximum, option) =>
        Math.max(
          maximum,
          numericSuffix(option.draftOptionKey),
        ),
      0,
    ) + 1;

  return {
    ...node,
    options: [
      ...node.options,
      {
        draftOptionKey:
          createBotFlowGraphDraftOptionKey(
            buttonNodeOrdinal(node),
            optionOrdinal,
          ),
        label: "",
        nextDraftNodeKey: fallbackTarget,
      },
    ],
  };
}

export function updateBotFlowGraphButtonOption(
  node: BotFlowGraphDraftButtonsNode,
  nextOption: BotFlowGraphDraftButtonOption,
): BotFlowGraphDraftButtonsNode {
  return node.options.some(
    (option) =>
      option.draftOptionKey ===
      nextOption.draftOptionKey,
  )
    ? {
        ...node,
        options: node.options.map((option) =>
          option.draftOptionKey ===
          nextOption.draftOptionKey
            ? { ...nextOption }
            : option,
        ),
      }
    : node;
}

export function removeBotFlowGraphButtonOption(
  node: BotFlowGraphDraftButtonsNode,
  draftOptionKey: string,
): BotFlowGraphDraftButtonsNode {
  return node.options.length <= 1
    ? node
    : {
        ...node,
        options: node.options.filter(
          (option) =>
            option.draftOptionKey !==
            draftOptionKey,
        ),
      };
}

export function moveBotFlowGraphButtonOption(
  node: BotFlowGraphDraftButtonsNode,
  draftOptionKey: string,
  direction: BotFlowGraphOptionMoveDirection,
): BotFlowGraphDraftButtonsNode {
  const sourceIndex = node.options.findIndex(
    (option) =>
      option.draftOptionKey === draftOptionKey,
  );
  const targetIndex =
    direction === "up"
      ? sourceIndex - 1
      : sourceIndex + 1;

  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= node.options.length
  ) {
    return node;
  }

  const options = [...node.options];
  const [option] = options.splice(sourceIndex, 1);
  options.splice(targetIndex, 0, option);

  return { ...node, options };
}

function hasValidNodeContent(
  node: BotFlowGraphDraftNode,
  nodeKeys: ReadonlySet<string>,
  optionKeys: Set<string>,
): boolean {
  if (node.type === "text") {
    return (
      node.text.trim().length > 0 &&
      node.text.trim().length <= 4_096 &&
      nodeKeys.has(node.nextDraftNodeKey)
    );
  }

  if (node.type === "buttons") {
    const labels = new Set<string>();

    return (
      node.text.trim().length > 0 &&
      node.text.trim().length <= 4_096 &&
      node.options.length > 0 &&
      node.options.length <=
        BOT_FLOW_GRAPH_DRAFT_MAXIMUM_OPTION_COUNT &&
      node.options.every((option) => {
        const label = option.label.trim();
        const identity = label.toLowerCase();
        const valid =
          isBotFlowGraphDraftOptionKey(
            option.draftOptionKey,
          ) &&
          !optionKeys.has(option.draftOptionKey) &&
          label.length > 0 &&
          label.length <= 80 &&
          !labels.has(identity) &&
          nodeKeys.has(option.nextDraftNodeKey);

        optionKeys.add(option.draftOptionKey);
        labels.add(identity);
        return valid;
      })
    );
  }

  if (node.type === "condition") {
    return (
      botFlowConditionFacts.some(
        (fact) => fact === node.fact,
      ) &&
      botFlowConditionOperators.some(
        (operator) => operator === node.operator,
      ) &&
      node.value.trim().length > 0 &&
      node.value.trim().length <= 80 &&
      nodeKeys.has(node.matchedDraftNodeKey) &&
      nodeKeys.has(node.unmatchedDraftNodeKey) &&
      (node.fact !== "conversation-status" ||
        (node.operator === "equals" &&
          persistedConversationStatuses.some(
            (status) => status === node.value,
          )))
    );
  }

  if (node.type === "handoff") {
    return (
      node.reason === "customer-request" ||
      node.reason === "flow-rule"
    );
  }

  return node.type === "end";
}

export function isBotFlowGraphEditorDraftComplete(
  draft: BotFlowGraphEditorDraft,
): boolean {
  if (
    draft.nodes.length === 0 ||
    draft.nodes.length >
      BOT_FLOW_GRAPH_DRAFT_MAXIMUM_NODE_COUNT
  ) {
    return false;
  }

  const nodeKeys = new Set<string>();

  for (const node of draft.nodes) {
    if (
      !isBotFlowGraphDraftNodeKey(
        node.draftNodeKey,
      ) ||
      nodeKeys.has(node.draftNodeKey)
    ) {
      return false;
    }

    nodeKeys.add(node.draftNodeKey);
  }

  if (!nodeKeys.has(draft.entryDraftNodeKey)) {
    return false;
  }

  const optionKeys = new Set<string>();

  if (
    !draft.nodes.every((node) =>
      hasValidNodeContent(
        node,
        nodeKeys,
        optionKeys,
      ),
    )
  ) {
    return false;
  }

  const nodesByKey = new Map(
    draft.nodes.map((node) => [
      node.draftNodeKey,
      node,
    ]),
  );
  const states = new Map<
    string,
    "visiting" | "visited"
  >();

  const visit = (draftNodeKey: string): boolean => {
    const state = states.get(draftNodeKey);

    if (state === "visiting") {
      return false;
    }

    if (state === "visited") {
      return true;
    }

    const node = nodesByKey.get(draftNodeKey);

    if (!node) {
      return false;
    }

    states.set(draftNodeKey, "visiting");

    if (
      !referencedDraftNodeKeys(node).every(visit)
    ) {
      return false;
    }

    states.set(draftNodeKey, "visited");
    return true;
  };

  return (
    visit(draft.entryDraftNodeKey) &&
    states.size === draft.nodes.length
  );
}

export function updateBotFlowGraphConditionFact(
  node: Extract<
    BotFlowGraphDraftNode,
    { type: "condition" }
  >,
  fact: BotFlowConditionFact,
): typeof node {
  return {
    ...node,
    fact,
    operator:
      fact === "conversation-status"
        ? "equals"
        : node.operator,
    value: "",
  };
}

export function updateBotFlowGraphConditionOperator(
  node: Extract<
    BotFlowGraphDraftNode,
    { type: "condition" }
  >,
  operator: BotFlowConditionOperator,
): typeof node {
  return { ...node, operator };
}
