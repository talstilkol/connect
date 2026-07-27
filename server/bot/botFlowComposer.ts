import type {
  BotFlowDefinitionIssue,
} from "../../shared/validation/botFlowDefinition.ts";
import {
  normalizeBotFlowName,
  validateBotFlowDefinition,
} from "../../shared/validation/botFlowDefinition.ts";
import type {
  SaveKeywordBotFlowComposerDraftInput,
} from "../../shared/domain/botFlowComposer.ts";
import type {
  ValidatedBotFlowDefinition,
} from "../../shared/domain/botFlow.ts";
import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
} from "./botFlowKey.ts";

export type CompileKeywordBotFlowComposerResult =
  | {
      success: true;
      definition: ValidatedBotFlowDefinition;
      expectedFlowVersion: number | null;
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

function hasExactKeys(
  input: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const inputKeys = Object.keys(input);

  return (
    inputKeys.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(input, key),
    )
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

function isComposerInput(
  input: Record<string, unknown>,
): input is Record<
  keyof SaveKeywordBotFlowComposerDraftInput,
  unknown
> {
  return hasExactKeys(input, [
    "name",
    "keywords",
    "matchMode",
    "replyText",
    "expectedFlowVersion",
  ]);
}

export async function compileKeywordBotFlowComposerDraft(
  tenantId: number,
  input: unknown,
): Promise<CompileKeywordBotFlowComposerResult> {
  if (
    !isRecord(input) ||
    !isComposerInput(input) ||
    !isExpectedFlowVersion(
      input.expectedFlowVersion,
    )
  ) {
    return {
      success: false,
      issues: ["invalid-input"],
    };
  }

  const name = normalizeBotFlowName(input.name);

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
  const [
    triggerKey,
    keywordKey,
    textKey,
    endKey,
    handoffKey,
  ] = await Promise.all(
    [1, 2, 3, 4, 5].map((ordinal) =>
      deriveBotFlowBlockKey(
        botFlowKey,
        ordinal,
      ),
    ),
  );
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
        keywords: input.keywords,
        matchMode: input.matchMode,
        matchedBlockKey: textKey,
        unmatchedBlockKey: handoffKey,
      },
      {
        blockKey: textKey,
        type: "text",
        text: input.replyText,
        nextBlockKey: endKey,
      },
      {
        blockKey: endKey,
        type: "end",
      },
      {
        blockKey: handoffKey,
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
      input.expectedFlowVersion,
  };
}
