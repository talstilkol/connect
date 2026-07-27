import {
  aiResponseModes,
  type AiResponseMode,
  type ValidatedAiAgentDefinition,
} from "../domain/aiAgent.ts";

const AI_AGENT_NAME_MAXIMUM_LENGTH = 160;
const AI_AGENT_SYSTEM_PROMPT_MAXIMUM_LENGTH =
  16_384;
const AI_AGENT_HANDOFF_MESSAGE_MAXIMUM_LENGTH =
  4_096;
const AI_AGENT_KNOWLEDGE_SOURCE_MAXIMUM_COUNT =
  100;
const BASIS_POINTS_MAXIMUM = 10_000;
const KNOWLEDGE_SOURCE_KEY_PATTERN =
  /^knowledge_source_v1_[0-9a-f]{64}$/;
const BILLING_CURRENCY_PATTERN = /^[A-Z]{3}$/;
const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export type AiAgentDefinitionIssue =
  | "invalid-input"
  | "invalid-name"
  | "invalid-system-prompt"
  | "invalid-handoff-message"
  | "invalid-response-mode"
  | "invalid-grounding-threshold"
  | "invalid-cost-limit"
  | "invalid-billing-currency"
  | "invalid-knowledge-sources";

export type AiAgentDefinitionValidation =
  | {
      success: true;
      value: ValidatedAiAgentDefinition;
    }
  | {
      success: false;
      issues: readonly AiAgentDefinitionIssue[];
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

function isNullableResponseMode(
  value: unknown,
): value is AiResponseMode | null {
  return (
    value === null ||
    aiResponseModes.some(
      (candidate) => candidate === value,
    )
  );
}

function isNullablePositiveSafeInteger(
  value: unknown,
  maximum?: number,
): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value > 0 &&
      (maximum === undefined ||
        value <= maximum))
  );
}

function parseKnowledgeSourceKeys(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    value.length >
      AI_AGENT_KNOWLEDGE_SOURCE_MAXIMUM_COUNT
  ) {
    return null;
  }

  const sourceKeys: string[] = [];
  const identities = new Set<string>();

  for (const candidate of value) {
    if (
      typeof candidate !== "string" ||
      !KNOWLEDGE_SOURCE_KEY_PATTERN.test(
        candidate,
      ) ||
      identities.has(candidate)
    ) {
      return null;
    }

    identities.add(candidate);
    sourceKeys.push(candidate);
  }

  return sourceKeys.sort(compareCanonical);
}

function pushIssue(
  issues: AiAgentDefinitionIssue[],
  issue: AiAgentDefinitionIssue,
): void {
  if (!issues.includes(issue)) {
    issues.push(issue);
  }
}

export function normalizeAiAgentName(
  value: unknown,
): string | null {
  return normalizeSingleLineText(
    value,
    AI_AGENT_NAME_MAXIMUM_LENGTH,
  );
}

export function validateAiAgentDefinition(
  value: unknown,
): AiAgentDefinitionValidation {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "name",
      "systemPrompt",
      "handoffMessage",
      "responseMode",
      "minimumGroundingScoreBasisPoints",
      "monthlyCostLimitMinorUnits",
      "billingCurrency",
      "knowledgeSourceKeys",
    ])
  ) {
    return {
      success: false,
      issues: ["invalid-input"],
    };
  }

  const issues: AiAgentDefinitionIssue[] = [];
  const name = normalizeAiAgentName(value.name);
  const systemPrompt = normalizeText(
    value.systemPrompt,
    AI_AGENT_SYSTEM_PROMPT_MAXIMUM_LENGTH,
  );
  const handoffMessage = normalizeText(
    value.handoffMessage,
    AI_AGENT_HANDOFF_MESSAGE_MAXIMUM_LENGTH,
  );
  const responseMode = value.responseMode;
  const minimumGroundingScoreBasisPoints =
    value.minimumGroundingScoreBasisPoints;
  const monthlyCostLimitMinorUnits =
    value.monthlyCostLimitMinorUnits;
  const billingCurrency =
    value.billingCurrency;
  const knowledgeSourceKeys =
    parseKnowledgeSourceKeys(
      value.knowledgeSourceKeys,
    );

  if (!name) {
    pushIssue(issues, "invalid-name");
  }

  if (!systemPrompt) {
    pushIssue(
      issues,
      "invalid-system-prompt",
    );
  }

  if (!handoffMessage) {
    pushIssue(
      issues,
      "invalid-handoff-message",
    );
  }

  if (!isNullableResponseMode(responseMode)) {
    pushIssue(
      issues,
      "invalid-response-mode",
    );
  }

  if (
    !isNullablePositiveSafeInteger(
      minimumGroundingScoreBasisPoints,
      BASIS_POINTS_MAXIMUM,
    )
  ) {
    pushIssue(
      issues,
      "invalid-grounding-threshold",
    );
  }

  if (
    !isNullablePositiveSafeInteger(
      monthlyCostLimitMinorUnits,
    )
  ) {
    pushIssue(issues, "invalid-cost-limit");
  }

  if (
    billingCurrency !== null &&
    (typeof billingCurrency !== "string" ||
      !BILLING_CURRENCY_PATTERN.test(
        billingCurrency,
      ))
  ) {
    pushIssue(
      issues,
      "invalid-billing-currency",
    );
  }

  if (
    (monthlyCostLimitMinorUnits === null) !==
    (billingCurrency === null)
  ) {
    pushIssue(issues, "invalid-cost-limit");
    pushIssue(
      issues,
      "invalid-billing-currency",
    );
  }

  if (!knowledgeSourceKeys) {
    pushIssue(
      issues,
      "invalid-knowledge-sources",
    );
  }

  if (
    issues.length > 0 ||
    !name ||
    !systemPrompt ||
    !handoffMessage ||
    !isNullableResponseMode(responseMode) ||
    !isNullablePositiveSafeInteger(
      minimumGroundingScoreBasisPoints,
      BASIS_POINTS_MAXIMUM,
    ) ||
    !isNullablePositiveSafeInteger(
      monthlyCostLimitMinorUnits,
    ) ||
    knowledgeSourceKeys === null ||
    (billingCurrency !== null &&
      (typeof billingCurrency !== "string" ||
        !BILLING_CURRENCY_PATTERN.test(
          billingCurrency,
        )))
  ) {
    return {
      success: false,
      issues,
    };
  }

  return {
    success: true,
    value: {
      name,
      systemPrompt,
      handoffMessage,
      responseMode,
      minimumGroundingScoreBasisPoints,
      monthlyCostLimitMinorUnits,
      billingCurrency,
      knowledgeSourceKeys,
    },
  };
}
