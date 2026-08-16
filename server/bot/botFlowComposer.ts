import type {
  BotFlowDefinitionIssue,
} from "../../shared/validation/botFlowDefinition.ts";
import {
  normalizeBotFlowName,
  validateBotFlowDefinition,
} from "../../shared/validation/botFlowDefinition.ts";
import type {
  SaveKeywordButtonMenuBotFlowComposerDraftInput,
  SaveKeywordBotFlowComposerDraftInput,
  SaveKeywordSequenceBotFlowComposerDraftInput,
} from "../../shared/domain/botFlowComposer.ts";
import {
  KEYWORD_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT,
  KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT,
  KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT,
} from "../../shared/domain/botFlowComposer.ts";
import type {
  ValidatedBotFlowDefinition,
} from "../../shared/domain/botFlow.ts";
import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
  deriveBotFlowOptionKey,
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

function isSequenceComposerInput(
  input: Record<string, unknown>,
): input is Record<
  keyof SaveKeywordSequenceBotFlowComposerDraftInput,
  unknown
> {
  return hasExactKeys(input, [
    "name",
    "keywords",
    "matchMode",
    "replyTexts",
    "expectedFlowVersion",
  ]);
}

function isButtonMenuComposerInput(
  input: Record<string, unknown>,
): input is Record<
  keyof SaveKeywordButtonMenuBotFlowComposerDraftInput,
  unknown
> {
  return hasExactKeys(input, [
    "name",
    "keywords",
    "matchMode",
    "introTexts",
    "buttonText",
    "options",
    "expectedFlowVersion",
  ]);
}

function parseButtonMenuOptions(
  value: unknown,
): readonly Record<
  "label" | "replyText",
  unknown
>[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length >
      KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT
  ) {
    return null;
  }

  const options: Record<
    "label" | "replyText",
    unknown
  >[] = [];

  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, [
        "label",
        "replyText",
      ])
    ) {
      return null;
    }

    options.push({
      label: candidate.label,
      replyText: candidate.replyText,
    });
  }

  return options;
}

async function compileKeywordSequence(
  tenantId: number,
  input: Record<
    keyof SaveKeywordSequenceBotFlowComposerDraftInput,
    unknown
  >,
): Promise<CompileKeywordBotFlowComposerResult> {
  if (
    !isExpectedFlowVersion(
      input.expectedFlowVersion,
    ) ||
    !Array.isArray(input.replyTexts) ||
    input.replyTexts.length === 0 ||
    input.replyTexts.length >
      KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT
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
  const blockKeys = await Promise.all(
    Array.from(
      { length: input.replyTexts.length + 4 },
      (_, index) =>
        deriveBotFlowBlockKey(
          botFlowKey,
          index + 1,
        ),
    ),
  );
  const triggerKey = blockKeys[0];
  const keywordKey = blockKeys[1];
  const replyKeys = blockKeys.slice(
    2,
    2 + input.replyTexts.length,
  );
  const endKey = blockKeys[
    2 + input.replyTexts.length
  ];
  const handoffKey = blockKeys[
    3 + input.replyTexts.length
  ];
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
        matchedBlockKey: replyKeys[0],
        unmatchedBlockKey: handoffKey,
      },
      ...input.replyTexts.map((text, index) => ({
        blockKey: replyKeys[index],
        type: "text",
        text,
        nextBlockKey:
          replyKeys[index + 1] ?? endKey,
      })),
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

async function compileKeywordButtonMenu(
  tenantId: number,
  input: Record<
    keyof SaveKeywordButtonMenuBotFlowComposerDraftInput,
    unknown
  >,
): Promise<CompileKeywordBotFlowComposerResult> {
  const options = parseButtonMenuOptions(
    input.options,
  );

  if (
    !isExpectedFlowVersion(
      input.expectedFlowVersion,
    ) ||
    !Array.isArray(input.introTexts) ||
    input.introTexts.length === 0 ||
    !options ||
    input.introTexts.length + options.length >
      KEYWORD_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT
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
  const blockKeys = await Promise.all(
    Array.from(
      {
        length:
          input.introTexts.length +
          options.length +
          5,
      },
      (_, index) =>
        deriveBotFlowBlockKey(
          botFlowKey,
          index + 1,
        ),
    ),
  );
  const triggerKey = blockKeys[0];
  const keywordKey = blockKeys[1];
  const introKeys = blockKeys.slice(
    2,
    2 + input.introTexts.length,
  );
  const buttonKey = blockKeys[
    2 + input.introTexts.length
  ];
  const responseKeys = blockKeys.slice(
    3 + input.introTexts.length,
    3 + input.introTexts.length + options.length,
  );
  const endKey = blockKeys[
    3 + input.introTexts.length + options.length
  ];
  const handoffKey = blockKeys[
    4 + input.introTexts.length + options.length
  ];
  const optionKeys = await Promise.all(
    options.map((_, index) =>
      deriveBotFlowOptionKey(
        buttonKey,
        index + 1,
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
        matchedBlockKey: introKeys[0],
        unmatchedBlockKey: handoffKey,
      },
      ...input.introTexts.map((text, index) => ({
        blockKey: introKeys[index],
        type: "text",
        text,
        nextBlockKey:
          introKeys[index + 1] ?? buttonKey,
      })),
      {
        blockKey: buttonKey,
        type: "buttons",
        text: input.buttonText,
        options: options.map((option, index) => ({
          optionKey: optionKeys[index],
          label: option.label,
          nextBlockKey: responseKeys[index],
        })),
      },
      ...options.map((option, index) => ({
        blockKey: responseKeys[index],
        type: "text",
        text: option.replyText,
        nextBlockKey: endKey,
      })),
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

export async function compileKeywordButtonMenuBotFlowComposerDraft(
  tenantId: number,
  input: unknown,
): Promise<CompileKeywordBotFlowComposerResult> {
  if (
    !isRecord(input) ||
    !isButtonMenuComposerInput(input)
  ) {
    return {
      success: false,
      issues: ["invalid-input"],
    };
  }

  return compileKeywordButtonMenu(tenantId, input);
}

export async function compileKeywordSequenceBotFlowComposerDraft(
  tenantId: number,
  input: unknown,
): Promise<CompileKeywordBotFlowComposerResult> {
  if (
    !isRecord(input) ||
    !isSequenceComposerInput(input)
  ) {
    return {
      success: false,
      issues: ["invalid-input"],
    };
  }

  return compileKeywordSequence(tenantId, input);
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

  return compileKeywordSequence(tenantId, {
    name: input.name,
    keywords: input.keywords,
    matchMode: input.matchMode,
    replyTexts: [input.replyText],
    expectedFlowVersion:
      input.expectedFlowVersion,
  });
}
