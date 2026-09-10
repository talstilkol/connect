import {
  botFlowConditionFacts,
  botFlowConditionOperators,
  botFlowHandoffReasons,
  botFlowKeywordMatchModes,
  type BotFlowBlock,
  type BotFlowButtonOption,
  type BotFlowConditionBlock,
  type ValidatedBotFlowDefinition,
} from "../domain/botFlow.ts";
import {
  persistedConversationStatuses,
} from "../domain/conversation.ts";

const BOT_FLOW_NAME_MAXIMUM_LENGTH = 160;
const BOT_FLOW_BLOCK_MAXIMUM_COUNT = 100;
const BOT_FLOW_KEYWORD_MAXIMUM_COUNT = 20;
const BOT_FLOW_KEYWORD_MAXIMUM_LENGTH = 80;
const BOT_FLOW_TEXT_MAXIMUM_LENGTH = 4_096;
const BOT_FLOW_BUTTON_MAXIMUM_COUNT = 10;
const BOT_FLOW_BUTTON_LABEL_MAXIMUM_LENGTH = 80;
const BOT_BLOCK_KEY_PATTERN =
  /^bot_block_v1_[0-9a-f]{64}$/;
const BOT_OPTION_KEY_PATTERN =
  /^bot_option_v1_[0-9a-f]{64}$/;
const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export type BotFlowDefinitionIssue =
  | "invalid-input"
  | "invalid-name"
  | "invalid-block-count"
  | "invalid-block"
  | "duplicate-block-key"
  | "invalid-trigger"
  | "invalid-reference"
  | "disconnected-block"
  | "cycle-detected"
  | "whatsapp-button-count-exceeded"
  | "whatsapp-button-label-too-long";

export type BotFlowDefinitionValidation =
  | {
      success: true;
      value: ValidatedBotFlowDefinition;
    }
  | {
      success: false;
      issues: readonly BotFlowDefinitionIssue[];
    };

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOnlyKeys(
  input: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const allowedKeys = new Set(keys);

  return Object.keys(input).every((key) =>
    allowedKeys.has(key),
  );
}

function normalizeText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/\r\n?/g, "\n")
    .trim();

  if (
    normalized.length === 0 ||
    normalized.length > maximumLength ||
    UNSAFE_CONTROL_CHARACTERS.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

function normalizeSingleLineText(
  value: unknown,
  maximumLength: number,
): string | null {
  const normalized = normalizeText(
    value,
    maximumLength,
  );

  return normalized &&
    !/[\n\r\t]/.test(normalized)
    ? normalized
    : null;
}

function compareCanonical(
  first: string,
  second: string,
): number {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
}

export function normalizeBotFlowName(
  value: unknown,
): string | null {
  return normalizeSingleLineText(
    value,
    BOT_FLOW_NAME_MAXIMUM_LENGTH,
  );
}

function isBlockKey(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    BOT_BLOCK_KEY_PATTERN.test(value)
  );
}

function isOptionKey(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    BOT_OPTION_KEY_PATTERN.test(value)
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

function parseKeywords(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length >
      BOT_FLOW_KEYWORD_MAXIMUM_COUNT
  ) {
    return null;
  }

  const keywords: string[] = [];
  const identities = new Set<string>();

  for (const candidate of value) {
    const keyword = normalizeSingleLineText(
      candidate,
      BOT_FLOW_KEYWORD_MAXIMUM_LENGTH,
    );
    const identity = keyword?.toLowerCase();

    if (
      keyword === null ||
      identity === undefined ||
      identities.has(identity)
    ) {
      return null;
    }

    identities.add(identity);
    keywords.push(keyword);
  }

  return keywords.sort(compareCanonical);
}

function parseButtonOptions(
  value: unknown,
): readonly BotFlowButtonOption[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length >
      BOT_FLOW_BUTTON_MAXIMUM_COUNT
  ) {
    return null;
  }

  const options: BotFlowButtonOption[] = [];
  const optionKeys = new Set<string>();
  const labels = new Set<string>();

  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasOnlyKeys(candidate, [
        "optionKey",
        "label",
        "nextBlockKey",
      ]) ||
      !isOptionKey(candidate.optionKey) ||
      !isBlockKey(candidate.nextBlockKey)
    ) {
      return null;
    }

    const label = normalizeSingleLineText(
      candidate.label,
      BOT_FLOW_BUTTON_LABEL_MAXIMUM_LENGTH,
    );
    const labelIdentity = label?.toLowerCase();

    if (
      label === null ||
      labelIdentity === undefined ||
      optionKeys.has(candidate.optionKey) ||
      labels.has(labelIdentity)
    ) {
      return null;
    }

    optionKeys.add(candidate.optionKey);
    labels.add(labelIdentity);
    options.push({
      optionKey: candidate.optionKey,
      label,
      nextBlockKey: candidate.nextBlockKey,
    });
  }

  return options;
}

function parseCondition(
  input: Record<string, unknown>,
): Pick<
  BotFlowConditionBlock,
  "fact" | "operator" | "value"
> | null {
  if (
    !isOneOf(
      input.fact,
      botFlowConditionFacts,
    ) ||
    !isOneOf(
      input.operator,
      botFlowConditionOperators,
    )
  ) {
    return null;
  }

  const value = normalizeSingleLineText(
    input.value,
    input.fact === "conversation-status"
      ? 32
      : BOT_FLOW_KEYWORD_MAXIMUM_LENGTH,
  );

  if (
    value === null ||
    (input.fact === "conversation-status" &&
      (input.operator !== "equals" ||
        !persistedConversationStatuses.some(
          (status) => status === value,
        )))
  ) {
    return null;
  }

  return {
    fact: input.fact,
    operator: input.operator,
    value,
  };
}

function parseBlock(
  value: unknown,
): BotFlowBlock | null {
  if (
    !isRecord(value) ||
    !isBlockKey(value.blockKey)
  ) {
    return null;
  }

  if (
    value.type === "trigger" &&
    hasOnlyKeys(value, [
      "blockKey",
      "type",
      "nextBlockKey",
    ]) &&
    isBlockKey(value.nextBlockKey)
  ) {
    return {
      blockKey: value.blockKey,
      type: "trigger",
      nextBlockKey: value.nextBlockKey,
    };
  }

  if (
    value.type === "keyword" &&
    hasOnlyKeys(value, [
      "blockKey",
      "type",
      "keywords",
      "matchMode",
      "matchedBlockKey",
      "unmatchedBlockKey",
    ]) &&
    isOneOf(
      value.matchMode,
      botFlowKeywordMatchModes,
    ) &&
    isBlockKey(value.matchedBlockKey) &&
    isBlockKey(value.unmatchedBlockKey)
  ) {
    const keywords = parseKeywords(value.keywords);

    return keywords
      ? {
          blockKey: value.blockKey,
          type: "keyword",
          keywords,
          matchMode: value.matchMode,
          matchedBlockKey: value.matchedBlockKey,
          unmatchedBlockKey:
            value.unmatchedBlockKey,
        }
      : null;
  }

  if (
    value.type === "text" &&
    hasOnlyKeys(value, [
      "blockKey",
      "type",
      "text",
      "nextBlockKey",
    ]) &&
    isBlockKey(value.nextBlockKey)
  ) {
    const text = normalizeText(
      value.text,
      BOT_FLOW_TEXT_MAXIMUM_LENGTH,
    );

    return text
      ? {
          blockKey: value.blockKey,
          type: "text",
          text,
          nextBlockKey: value.nextBlockKey,
        }
      : null;
  }

  if (
    value.type === "buttons" &&
    hasOnlyKeys(value, [
      "blockKey",
      "type",
      "text",
      "options",
    ])
  ) {
    const text = normalizeText(
      value.text,
      BOT_FLOW_TEXT_MAXIMUM_LENGTH,
    );
    const options = parseButtonOptions(
      value.options,
    );

    return text && options
      ? {
          blockKey: value.blockKey,
          type: "buttons",
          text,
          options,
        }
      : null;
  }

  if (
    value.type === "condition" &&
    hasOnlyKeys(value, [
      "blockKey",
      "type",
      "fact",
      "operator",
      "value",
      "matchedBlockKey",
      "unmatchedBlockKey",
    ]) &&
    isBlockKey(value.matchedBlockKey) &&
    isBlockKey(value.unmatchedBlockKey)
  ) {
    const condition = parseCondition(value);

    return condition
      ? {
          blockKey: value.blockKey,
          type: "condition",
          ...condition,
          matchedBlockKey: value.matchedBlockKey,
          unmatchedBlockKey:
            value.unmatchedBlockKey,
        }
      : null;
  }

  if (
    value.type === "handoff" &&
    hasOnlyKeys(value, [
      "blockKey",
      "type",
      "reason",
    ]) &&
    isOneOf(
      value.reason,
      botFlowHandoffReasons,
    )
  ) {
    return {
      blockKey: value.blockKey,
      type: "handoff",
      reason: value.reason,
    };
  }

  if (
    value.type === "end" &&
    hasOnlyKeys(value, ["blockKey", "type"])
  ) {
    return {
      blockKey: value.blockKey,
      type: "end",
    };
  }

  return null;
}

function referencedBlockKeys(
  block: BotFlowBlock,
): readonly string[] {
  if (
    block.type === "trigger" ||
    block.type === "text"
  ) {
    return [block.nextBlockKey];
  }

  if (
    block.type === "keyword" ||
    block.type === "condition"
  ) {
    return [
      block.matchedBlockKey,
      block.unmatchedBlockKey,
    ];
  }

  if (block.type === "buttons") {
    return block.options.map(
      (option) => option.nextBlockKey,
    );
  }

  return [];
}

function hasCycle(
  entryBlockKey: string,
  blocksByKey: ReadonlyMap<string, BotFlowBlock>,
): boolean {
  const states = new Map<
    string,
    "visiting" | "visited"
  >();

  const visit = (blockKey: string): boolean => {
    const state = states.get(blockKey);

    if (state === "visiting") {
      return true;
    }

    if (state === "visited") {
      return false;
    }

    states.set(blockKey, "visiting");
    const block = blocksByKey.get(blockKey);

    if (
      block &&
      referencedBlockKeys(block).some(visit)
    ) {
      return true;
    }

    states.set(blockKey, "visited");
    return false;
  };

  return visit(entryBlockKey);
}

function reachableBlockKeys(
  entryBlockKey: string,
  blocksByKey: ReadonlyMap<string, BotFlowBlock>,
): ReadonlySet<string> {
  const reachable = new Set<string>();
  const pending = [entryBlockKey];

  while (pending.length > 0) {
    const blockKey = pending.pop();

    if (!blockKey || reachable.has(blockKey)) {
      continue;
    }

    reachable.add(blockKey);
    const block = blocksByKey.get(blockKey);

    if (block) {
      pending.push(...referencedBlockKeys(block));
    }
  }

  return reachable;
}

export function validateBotFlowDefinition(
  input: unknown,
): BotFlowDefinitionValidation {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, [
      "name",
      "entryBlockKey",
      "blocks",
    ])
  ) {
    return {
      success: false,
      issues: ["invalid-input"],
    };
  }

  const issues: BotFlowDefinitionIssue[] = [];
  const name = normalizeBotFlowName(input.name);

  if (!name) {
    issues.push("invalid-name");
  }

  if (
    !Array.isArray(input.blocks) ||
    input.blocks.length < 2 ||
    input.blocks.length >
      BOT_FLOW_BLOCK_MAXIMUM_COUNT
  ) {
    issues.push("invalid-block-count");
  }

  if (issues.length > 0 || !Array.isArray(input.blocks)) {
    return { success: false, issues };
  }

  const blocks: BotFlowBlock[] = [];

  for (const candidate of input.blocks) {
    const block = parseBlock(candidate);

    if (!block) {
      issues.push("invalid-block");
      break;
    }

    blocks.push(block);
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  const blocksByKey = new Map(
    blocks.map((block) => [
      block.blockKey,
      block,
    ]),
  );

  if (blocksByKey.size !== blocks.length) {
    issues.push("duplicate-block-key");
  }

  const triggerBlocks = blocks.filter(
    (block): block is Extract<
      BotFlowBlock,
      { type: "trigger" }
    > => block.type === "trigger",
  );

  if (triggerBlocks.length !== 1) {
    issues.push("invalid-trigger");
  }

  if (
    input.entryBlockKey !== undefined &&
    triggerBlocks.length === 1 &&
    (!isBlockKey(input.entryBlockKey) ||
      input.entryBlockKey !==
        triggerBlocks[0].blockKey)
  ) {
    issues.push("invalid-trigger");
  }

  const hasInvalidReference = blocks.some((block) =>
    referencedBlockKeys(block).some(
      (blockKey) => !blocksByKey.has(blockKey),
    ),
  );

  if (hasInvalidReference) {
    issues.push("invalid-reference");
  }

  if (
    issues.length > 0 ||
    triggerBlocks.length !== 1
  ) {
    return { success: false, issues };
  }

  const entryBlockKey =
    triggerBlocks[0].blockKey;
  const reachable = reachableBlockKeys(
    entryBlockKey,
    blocksByKey,
  );

  if (reachable.size !== blocks.length) {
    issues.push("disconnected-block");
  }

  if (hasCycle(entryBlockKey, blocksByKey)) {
    issues.push("cycle-detected");
  }

  if (issues.length > 0 || !name) {
    return { success: false, issues };
  }

  return {
    success: true,
    value: {
      name,
      entryBlockKey,
      blocks: [...blocks].sort((first, second) =>
        compareCanonical(
          first.blockKey,
          second.blockKey,
        ),
      ),
    },
  };
}
