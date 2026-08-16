import type {
  BotFlowButtonOption,
  BotFlowTerminalEffect,
  ValidatedBotFlowDefinition,
} from "../../shared/domain/botFlow.ts";
import {
  persistedConversationStatuses,
} from "../../shared/domain/conversation.ts";
import type {
  ConversationStatus,
} from "../../shared/domain/model.ts";
import {
  validateBotFlowDefinition,
} from "../../shared/validation/botFlowDefinition.ts";
import {
  resolveBotFlowTerminalEffect,
} from "./botFlowLifecycle.ts";

const INBOUND_TEXT_MAXIMUM_LENGTH = 4_096;
const BOT_FLOW_BLOCK_KEY_PATTERN =
  /^bot_block_v1_[0-9a-f]{64}$/;
const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export type BotFlowRuntimeErrorCode =
  | "INVALID_DEFINITION"
  | "INVALID_INPUT"
  | "INVALID_GRAPH_STATE";

export class BotFlowRuntimeError extends Error {
  readonly code: BotFlowRuntimeErrorCode;

  constructor(code: BotFlowRuntimeErrorCode) {
    super("Bot flow runtime failed");
    this.name = "BotFlowRuntimeError";
    this.code = code;
  }
}

export type BotFlowReply =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "buttons";
      text: string;
      options: readonly BotFlowButtonOption[];
    };

export type BotFlowExecutionPlan =
  | {
      outcome: "completed";
      replies: readonly BotFlowReply[];
      terminalEffect: Extract<
        BotFlowTerminalEffect,
        { outcome: "end" }
      >;
    }
  | {
      outcome: "handoff";
      replies: readonly BotFlowReply[];
      terminalEffect: Extract<
        BotFlowTerminalEffect,
        { outcome: "handoff" }
      >;
    }
  | {
      outcome: "awaiting-input";
      replies: readonly BotFlowReply[];
      awaitingBlockKey: string;
    };

export interface BotFlowTurnInput {
  lastInboundText: string | null;
  conversationStatus: ConversationStatus;
  resumeFromBlockKey?: string | null;
}

function normalizeComparableText(
  value: string,
): string {
  return value.trim().toLowerCase();
}

function parseTurnInput(
  input: unknown,
): BotFlowTurnInput {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    throw new BotFlowRuntimeError(
      "INVALID_INPUT",
    );
  }

  const record =
    input as Record<string, unknown>;
  const keys = Object.keys(record);
  const hasResumeFromBlockKey =
    Object.hasOwn(
      record,
      "resumeFromBlockKey",
    );

  if (
    (keys.length !== 2 && keys.length !== 3) ||
    !Object.hasOwn(record, "lastInboundText") ||
    !Object.hasOwn(
      record,
      "conversationStatus",
    ) ||
    !persistedConversationStatuses.some(
      (status) =>
        status === record.conversationStatus,
    ) ||
    (keys.length === 3 &&
      !hasResumeFromBlockKey) ||
    (hasResumeFromBlockKey &&
      record.resumeFromBlockKey !== null &&
      (typeof record.resumeFromBlockKey !==
        "string" ||
        !BOT_FLOW_BLOCK_KEY_PATTERN.test(
          record.resumeFromBlockKey,
        ))) ||
    (record.lastInboundText !== null &&
      (typeof record.lastInboundText !==
        "string" ||
        record.lastInboundText.trim().length ===
          0 ||
        record.lastInboundText.length >
          INBOUND_TEXT_MAXIMUM_LENGTH ||
        UNSAFE_CONTROL_CHARACTERS.test(
          record.lastInboundText,
        )))
  ) {
    throw new BotFlowRuntimeError(
      "INVALID_INPUT",
    );
  }

  return {
    lastInboundText:
      record.lastInboundText === null
        ? null
        : record.lastInboundText.trim(),
    conversationStatus:
      record.conversationStatus as ConversationStatus,
    ...(hasResumeFromBlockKey
      ? {
          resumeFromBlockKey:
            record.resumeFromBlockKey as
              | string
              | null,
        }
      : {}),
  };
}

function textMatches(
  actual: string | null,
  expected: string,
  operator: "equals" | "contains",
): boolean {
  if (actual === null) {
    return false;
  }

  const normalizedActual =
    normalizeComparableText(actual);
  const normalizedExpected =
    normalizeComparableText(expected);

  return operator === "equals"
    ? normalizedActual === normalizedExpected
    : normalizedActual.includes(
        normalizedExpected,
      );
}

export function executeBotFlowTurn(
  definitionInput: unknown,
  inputValue: unknown,
): BotFlowExecutionPlan {
  const validation =
    validateBotFlowDefinition(
      definitionInput,
    );

  if (!validation.success) {
    throw new BotFlowRuntimeError(
      "INVALID_DEFINITION",
    );
  }

  const definition: ValidatedBotFlowDefinition =
    validation.value;
  const input = parseTurnInput(inputValue);
  const blocksByKey = new Map(
    definition.blocks.map((block) => [
      block.blockKey,
      block,
    ]),
  );
  const replies: BotFlowReply[] = [];
  const visited = new Set<string>();
  let currentBlockKey =
    input.resumeFromBlockKey ??
    definition.entryBlockKey;

  while (true) {
    if (visited.has(currentBlockKey)) {
      throw new BotFlowRuntimeError(
        "INVALID_GRAPH_STATE",
      );
    }

    visited.add(currentBlockKey);
    const block =
      blocksByKey.get(currentBlockKey);

    if (!block) {
      throw new BotFlowRuntimeError(
        "INVALID_GRAPH_STATE",
      );
    }

    if (block.type === "trigger") {
      currentBlockKey = block.nextBlockKey;
      continue;
    }

    if (block.type === "keyword") {
      const matched =
        block.keywords.some((keyword) =>
          textMatches(
            input.lastInboundText,
            keyword,
            block.matchMode === "exact"
              ? "equals"
              : "contains",
          ),
        );
      currentBlockKey = matched
        ? block.matchedBlockKey
        : block.unmatchedBlockKey;
      continue;
    }

    if (block.type === "condition") {
      const matched =
        block.fact === "conversation-status"
          ? input.conversationStatus ===
            block.value
          : textMatches(
              input.lastInboundText,
              block.value,
              block.operator,
            );
      currentBlockKey = matched
        ? block.matchedBlockKey
        : block.unmatchedBlockKey;
      continue;
    }

    if (block.type === "text") {
      replies.push({
        kind: "text",
        text: block.text,
      });
      currentBlockKey = block.nextBlockKey;
      continue;
    }

    if (block.type === "buttons") {
      const matchingOption =
        input.lastInboundText === null
          ? undefined
          : block.options.find((option) =>
              textMatches(
                input.lastInboundText,
                option.label,
                "equals",
              ),
            );

      if (matchingOption) {
        currentBlockKey =
          matchingOption.nextBlockKey;
        continue;
      }

      replies.push({
        kind: "buttons",
        text: block.text,
        options: block.options,
      });

      return {
        outcome: "awaiting-input",
        replies,
        awaitingBlockKey: block.blockKey,
      };
    }

    if (block.type === "handoff") {
      return {
        outcome: "handoff",
        replies,
        terminalEffect:
          resolveBotFlowTerminalEffect(block),
      };
    }

    return {
      outcome: "completed",
      replies,
      terminalEffect:
        resolveBotFlowTerminalEffect(block),
    };
  }
}
