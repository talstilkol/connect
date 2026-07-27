import type {
  PersistedAiAgent,
  PersistedAiAgentVersion,
  ValidatedAiAgentDefinition,
} from "../../shared/domain/aiAgent.ts";
import type {
  AiCostAuthorizationResult,
  AiCostGate,
  AiCostUsageResult,
  AiKnowledgePassage,
  AiKnowledgeRetrievalResult,
  AiKnowledgeRetriever,
  AiResponseGenerationResult,
  AiResponseProvider,
  AiRuntimeAuditEvent,
  AiRuntimeAuditSink,
  AiRuntimeTurnPlan,
  AiUsageRecord,
} from "../../shared/domain/aiRuntime.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
} from "./aiAgentKey.ts";
import {
  resolveAiAgentFallbackEffect,
} from "./aiAgentLifecycle.ts";
import {
  deriveAiProviderRequestKey,
  deriveAiRuntimeAuditKey,
} from "./aiRuntimeKey.ts";

const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;
const MESSAGE_KEY_PATTERN =
  /^message_v1_[0-9a-f]{64}$/;
const SOURCE_KEY_PATTERN =
  /^knowledge_source_v1_[0-9a-f]{64}$/;
const PASSAGE_KEY_PATTERN =
  /^knowledge_passage_v1_[0-9a-f]{64}$/;
const MAXIMUM_MESSAGE_LENGTH = 4_096;
const MAXIMUM_PASSAGES = 100;
const MAXIMUM_PASSAGE_LENGTH = 16_384;
const MAXIMUM_RESPONSE_LENGTH = 4_096;
const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export type AiRuntimeServiceErrorCode =
  | "INVALID_INPUT"
  | "AGENT_CONFIGURATION_INVALID"
  | "RETRIEVAL_INVALID"
  | "COST_GATE_INVALID"
  | "PROVIDER_INVALID"
  | "USAGE_RECORD_FAILED"
  | "AUDIT_FAILED";

export class AiRuntimeServiceError
  extends Error {
  readonly code: AiRuntimeServiceErrorCode;

  constructor(
    code: AiRuntimeServiceErrorCode,
  ) {
    super("AI runtime service failed");
    this.name = "AiRuntimeServiceError";
    this.code = code;
  }
}

export interface AiRuntimeTurnInput {
  tenantId: number;
  conversationKey: string;
  conversationVersion: number;
  inboundMessageKey: string;
  customerMessage: string;
  customerRequestedHuman: boolean;
  agent: PersistedAiAgent;
  version: PersistedAiAgentVersion;
}

export interface AiRuntimeService {
  process(
    input: AiRuntimeTurnInput,
  ): Promise<AiRuntimeTurnPlan>;
}

interface AiRuntimeDependencies {
  retriever: AiKnowledgeRetriever;
  costGate: AiCostGate;
  provider: AiResponseProvider;
  audit: AiRuntimeAuditSink;
}

function runtimeError(
  code: AiRuntimeServiceErrorCode,
): AiRuntimeServiceError {
  return new AiRuntimeServiceError(code);
}

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
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);

  return (
    actual.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(value, key),
    )
  );
}

function isBoundedText(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximumLength &&
    !UNSAFE_CONTROL_CHARACTERS.test(value)
  );
}

function parsePassages(
  value: unknown,
  allowedSourceKeys: readonly string[],
): readonly AiKnowledgePassage[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAXIMUM_PASSAGES
  ) {
    return null;
  }

  const allowedSources = new Set(
    allowedSourceKeys,
  );
  const passageKeys = new Set<string>();
  const passages: AiKnowledgePassage[] = [];

  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, [
        "passageKey",
        "sourceKey",
        "content",
      ]) ||
      typeof candidate.passageKey !==
        "string" ||
      !PASSAGE_KEY_PATTERN.test(
        candidate.passageKey,
      ) ||
      passageKeys.has(candidate.passageKey) ||
      typeof candidate.sourceKey !==
        "string" ||
      !SOURCE_KEY_PATTERN.test(
        candidate.sourceKey,
      ) ||
      !allowedSources.has(
        candidate.sourceKey,
      ) ||
      !isBoundedText(
        candidate.content,
        MAXIMUM_PASSAGE_LENGTH,
      )
    ) {
      return null;
    }

    passageKeys.add(candidate.passageKey);
    passages.push({
      passageKey: candidate.passageKey,
      sourceKey: candidate.sourceKey,
      content: candidate.content,
    });
  }

  return passages;
}

function parseRetrievalResult(
  value: unknown,
  allowedSourceKeys: readonly string[],
): AiKnowledgeRetrievalResult | null {
  if (
    !isRecord(value) ||
    typeof value.outcome !== "string"
  ) {
    return null;
  }

  if (
    value.outcome ===
      "no-approved-knowledge" ||
    value.outcome === "unavailable"
  ) {
    return hasExactKeys(value, ["outcome"])
      ? { outcome: value.outcome }
      : null;
  }

  if (
    value.outcome !== "grounded" ||
    !hasExactKeys(value, [
      "outcome",
      "scoreBasisPoints",
      "passages",
    ]) ||
    typeof value.scoreBasisPoints !==
      "number" ||
    !Number.isSafeInteger(
      value.scoreBasisPoints,
    ) ||
    value.scoreBasisPoints < 0 ||
    value.scoreBasisPoints > 10_000
  ) {
    return null;
  }

  const passages = parsePassages(
    value.passages,
    allowedSourceKeys,
  );

  return passages
    ? {
        outcome: "grounded",
        scoreBasisPoints:
          value.scoreBasisPoints,
        passages,
      }
    : null;
}

function parseCostAuthorization(
  value: unknown,
): AiCostAuthorizationResult | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["outcome"]) ||
    (value.outcome !== "authorized" &&
      value.outcome !== "exhausted" &&
      value.outcome !== "unavailable")
  ) {
    return null;
  }

  return { outcome: value.outcome };
}

function parseUsage(
  value: unknown,
  expectedCurrency: string,
): AiUsageRecord | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "inputTokens",
      "outputTokens",
      "costMinorUnits",
      "currency",
    ]) ||
    typeof value.inputTokens !== "number" ||
    !Number.isSafeInteger(value.inputTokens) ||
    value.inputTokens < 0 ||
    typeof value.outputTokens !== "number" ||
    !Number.isSafeInteger(
      value.outputTokens,
    ) ||
    value.outputTokens <= 0 ||
    typeof value.costMinorUnits !==
      "number" ||
    !Number.isSafeInteger(
      value.costMinorUnits,
    ) ||
    value.costMinorUnits < 0 ||
    value.currency !== expectedCurrency
  ) {
    return null;
  }

  return {
    inputTokens: value.inputTokens,
    outputTokens: value.outputTokens,
    costMinorUnits: value.costMinorUnits,
    currency: expectedCurrency,
  };
}

function parseGenerationResult(
  value: unknown,
  retrieval: Extract<
    AiKnowledgeRetrievalResult,
    { outcome: "grounded" }
  >,
  expectedCurrency: string,
): AiResponseGenerationResult | null {
  if (
    !isRecord(value) ||
    typeof value.outcome !== "string"
  ) {
    return null;
  }

  if (
    value.outcome === "policy-violation" ||
    value.outcome === "unavailable"
  ) {
    return hasExactKeys(value, ["outcome"])
      ? { outcome: value.outcome }
      : null;
  }

  if (
    value.outcome !== "generated" ||
    !hasExactKeys(value, [
      "outcome",
      "text",
      "groundedPassageKeys",
      "usage",
    ]) ||
    !isBoundedText(
      value.text,
      MAXIMUM_RESPONSE_LENGTH,
    ) ||
    !Array.isArray(
      value.groundedPassageKeys,
    ) ||
    value.groundedPassageKeys.length === 0
  ) {
    return null;
  }

  const allowedPassageKeys = new Set(
    retrieval.passages.map(
      (passage) => passage.passageKey,
    ),
  );
  const groundedPassageKeys =
    value.groundedPassageKeys;
  const uniqueKeys = new Set<string>();

  for (const passageKey of groundedPassageKeys) {
    if (
      typeof passageKey !== "string" ||
      !allowedPassageKeys.has(passageKey) ||
      uniqueKeys.has(passageKey)
    ) {
      return null;
    }

    uniqueKeys.add(passageKey);
  }

  const usage = parseUsage(
    value.usage,
    expectedCurrency,
  );

  return usage
    ? {
        outcome: "generated",
        text: value.text,
        groundedPassageKeys: [
          ...groundedPassageKeys,
        ],
        usage,
      }
    : null;
}

function recorded(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["outcome"]) &&
    value.outcome === "recorded"
  );
}

function parseCostUsageResult(
  value: unknown,
): AiCostUsageResult | null {
  if (
    !isRecord(value) ||
    typeof value.outcome !== "string"
  ) {
    return null;
  }

  if (value.outcome === "unavailable") {
    return hasExactKeys(value, ["outcome"])
      ? { outcome: "unavailable" }
      : null;
  }

  if (
    value.outcome !== "recorded" ||
    !hasExactKeys(value, [
      "outcome",
      "withinLimit",
    ]) ||
    typeof value.withinLimit !== "boolean"
  ) {
    return null;
  }

  return {
    outcome: "recorded",
    withinLimit: value.withinLimit,
  };
}

function definitionPoliciesReady(
  definition: ValidatedAiAgentDefinition,
): definition is ValidatedAiAgentDefinition & {
  responseMode: Exclude<
    ValidatedAiAgentDefinition["responseMode"],
    null
  >;
  minimumGroundingScoreBasisPoints: number;
  monthlyCostLimitMinorUnits: number;
  billingCurrency: string;
} {
  return (
    definition.responseMode !== null &&
    definition
      .minimumGroundingScoreBasisPoints !==
      null &&
    definition.monthlyCostLimitMinorUnits !==
      null &&
    definition.billingCurrency !== null &&
    definition.knowledgeSourceKeys.length > 0
  );
}

async function assertActiveAgent(
  input: AiRuntimeTurnInput,
): Promise<void> {
  let expectedAgentKey: string;
  let expectedVersionKey: string;

  try {
    expectedAgentKey =
      await deriveAiAgentKey(
        input.tenantId,
        input.version.definition.name,
      );
    expectedVersionKey =
      await deriveAiAgentVersionKey(
        input.tenantId,
        input.version.aiAgentKey,
        input.version.versionNumber,
        input.version.definition,
      );
  } catch {
    throw runtimeError(
      "AGENT_CONFIGURATION_INVALID",
    );
  }

  if (
    input.agent.tenantId !==
      input.tenantId ||
    input.version.tenantId !==
      input.tenantId ||
    input.agent.status !== "active" ||
    input.agent.activeVersionKey !==
      input.version.aiAgentVersionKey ||
    input.version.status !== "published" ||
    input.version.aiAgentKey !==
      input.agent.aiAgentKey ||
    input.agent.name !==
      input.version.definition.name ||
    expectedAgentKey !==
      input.agent.aiAgentKey ||
    expectedVersionKey !==
      input.version.aiAgentVersionKey ||
    !definitionPoliciesReady(
      input.version.definition,
    )
  ) {
    throw runtimeError(
      "AGENT_CONFIGURATION_INVALID",
    );
  }
}

function assertInput(
  input: AiRuntimeTurnInput,
): void {
  if (
    !Number.isSafeInteger(input.tenantId) ||
    input.tenantId <= 0 ||
    !CONVERSATION_KEY_PATTERN.test(
      input.conversationKey,
    ) ||
    !Number.isSafeInteger(
      input.conversationVersion,
    ) ||
    input.conversationVersion <= 0 ||
    !MESSAGE_KEY_PATTERN.test(
      input.inboundMessageKey,
    ) ||
    !isBoundedText(
      input.customerMessage,
      MAXIMUM_MESSAGE_LENGTH,
    ) ||
    typeof input.customerRequestedHuman !==
      "boolean"
  ) {
    throw runtimeError("INVALID_INPUT");
  }
}

export function createAiRuntimeService(
  dependencies: AiRuntimeDependencies,
): AiRuntimeService {
  return {
    async process(input) {
      assertInput(input);
      await assertActiveAgent(input);
      const definition =
        input.version.definition;

      if (!definitionPoliciesReady(definition)) {
        throw runtimeError(
          "AGENT_CONFIGURATION_INVALID",
        );
      }

      const identity = {
        conversationKey:
          input.conversationKey,
        inboundMessageKey:
          input.inboundMessageKey,
        aiAgentVersionKey:
          input.version.aiAgentVersionKey,
      };
      const [requestKey, auditKey] =
        await Promise.all([
          deriveAiProviderRequestKey(
            input.tenantId,
            identity,
          ),
          deriveAiRuntimeAuditKey(
            input.tenantId,
            identity,
          ),
        ]);

      const recordAudit = async (
        event: AiRuntimeAuditEvent,
      ): Promise<void> => {
        let result: unknown;

        try {
          result =
            await dependencies.audit.record(
              event,
            );
        } catch {
          throw runtimeError(
            "AUDIT_FAILED",
          );
        }

        if (!recorded(result)) {
          throw runtimeError(
            "AUDIT_FAILED",
          );
        }
      };

      const handoff = async (
        reason:
          AiRuntimeAuditEvent["reason"] &
            string,
        groundingScoreBasisPoints:
          number | null,
        usage: AiUsageRecord | null = null,
      ): Promise<AiRuntimeTurnPlan> => {
        await recordAudit({
          auditKey,
          requestKey,
          tenantId: input.tenantId,
          conversationKey:
            input.conversationKey,
          inboundMessageKey:
            input.inboundMessageKey,
          expectedConversationVersion:
            input.conversationVersion,
          aiAgentKey:
            input.agent.aiAgentKey,
          aiAgentVersionKey:
            input.version.aiAgentVersionKey,
          outcome: "handoff",
          reason,
          responseMode:
            definition.responseMode,
          groundingScoreBasisPoints,
          inputTokens:
            usage?.inputTokens ?? null,
          outputTokens:
            usage?.outputTokens ?? null,
          costMinorUnits:
            usage?.costMinorUnits ?? null,
          currency:
            definition.billingCurrency,
        });

        return {
          outcome: "handoff-planned",
          requestKey,
          auditKey,
          aiAgentKey:
            input.agent.aiAgentKey,
          aiAgentVersionKey:
            input.version.aiAgentVersionKey,
          effect:
            resolveAiAgentFallbackEffect(
              reason,
            ),
        };
      };

      if (input.customerRequestedHuman) {
        return handoff(
          "customer-request",
          null,
        );
      }

      let retrievalInput: unknown;

      try {
        retrievalInput =
          await dependencies.retriever.retrieve({
            requestKey,
            tenantId: input.tenantId,
            aiAgentVersionKey:
              input.version.aiAgentVersionKey,
            sourceKeys: [
              ...definition
                .knowledgeSourceKeys,
            ],
            query: input.customerMessage,
          });
      } catch {
        return handoff(
          "provider-unavailable",
          null,
        );
      }

      const retrieval =
        parseRetrievalResult(
          retrievalInput,
          definition.knowledgeSourceKeys,
        );

      if (!retrieval) {
        throw runtimeError(
          "RETRIEVAL_INVALID",
        );
      }

      if (
        retrieval.outcome ===
        "no-approved-knowledge"
      ) {
        return handoff(
          "no-approved-knowledge",
          null,
        );
      }

      if (retrieval.outcome === "unavailable") {
        return handoff(
          "provider-unavailable",
          null,
        );
      }

      if (
        retrieval.scoreBasisPoints <
        definition
          .minimumGroundingScoreBasisPoints
      ) {
        return handoff(
          "grounding-below-threshold",
          retrieval.scoreBasisPoints,
        );
      }

      let authorizationInput: unknown;

      try {
        authorizationInput =
          await dependencies.costGate.authorize({
            requestKey,
            tenantId: input.tenantId,
            aiAgentKey:
              input.agent.aiAgentKey,
            monthlyLimitMinorUnits:
              definition
                .monthlyCostLimitMinorUnits,
            currency:
              definition.billingCurrency,
          });
      } catch {
        return handoff(
          "policy-violation",
          retrieval.scoreBasisPoints,
        );
      }

      const authorization =
        parseCostAuthorization(
          authorizationInput,
        );

      if (!authorization) {
        throw runtimeError(
          "COST_GATE_INVALID",
        );
      }

      if (
        authorization.outcome ===
        "exhausted"
      ) {
        return handoff(
          "budget-exhausted",
          retrieval.scoreBasisPoints,
        );
      }

      if (
        authorization.outcome ===
        "unavailable"
      ) {
        return handoff(
          "policy-violation",
          retrieval.scoreBasisPoints,
        );
      }

      let generationInput: unknown;

      try {
        generationInput =
          await dependencies.provider.generate({
            requestKey,
            tenantId: input.tenantId,
            aiAgentVersionKey:
              input.version.aiAgentVersionKey,
            systemPrompt:
              definition.systemPrompt,
            customerMessage:
              input.customerMessage,
            passages: retrieval.passages,
          });
      } catch {
        return handoff(
          "provider-unavailable",
          retrieval.scoreBasisPoints,
        );
      }

      const generation =
        parseGenerationResult(
          generationInput,
          retrieval,
          definition.billingCurrency,
        );

      if (!generation) {
        throw runtimeError(
          "PROVIDER_INVALID",
        );
      }

      if (generation.outcome === "unavailable") {
        return handoff(
          "provider-unavailable",
          retrieval.scoreBasisPoints,
        );
      }

      if (
        generation.outcome ===
        "policy-violation"
      ) {
        return handoff(
          "policy-violation",
          retrieval.scoreBasisPoints,
        );
      }

      let usageResult: unknown;

      try {
        usageResult =
          await dependencies.costGate.recordUsage({
            requestKey,
            tenantId: input.tenantId,
            aiAgentKey:
              input.agent.aiAgentKey,
            usage: generation.usage,
          });
      } catch {
        throw runtimeError(
          "USAGE_RECORD_FAILED",
        );
      }

      const usageRecord =
        parseCostUsageResult(usageResult);

      if (
        !usageRecord ||
        usageRecord.outcome === "unavailable"
      ) {
        throw runtimeError(
          "USAGE_RECORD_FAILED",
        );
      }

      if (!usageRecord.withinLimit) {
        return handoff(
          "budget-exhausted",
          retrieval.scoreBasisPoints,
          generation.usage,
        );
      }

      const groundedSourceKeys = [
        ...new Set(
          generation.groundedPassageKeys.map(
            (passageKey) => {
              const passage =
                retrieval.passages.find(
                  (candidate) =>
                    candidate.passageKey ===
                    passageKey,
                );

              if (!passage) {
                throw runtimeError(
                  "PROVIDER_INVALID",
                );
              }

              return passage.sourceKey;
            },
          ),
        ),
      ].sort();

      await recordAudit({
        auditKey,
        requestKey,
        tenantId: input.tenantId,
        conversationKey:
          input.conversationKey,
        inboundMessageKey:
          input.inboundMessageKey,
        expectedConversationVersion:
          input.conversationVersion,
        aiAgentKey:
          input.agent.aiAgentKey,
        aiAgentVersionKey:
          input.version.aiAgentVersionKey,
        outcome: "reply-planned",
        reason: null,
        responseMode:
          definition.responseMode,
        groundingScoreBasisPoints:
          retrieval.scoreBasisPoints,
        inputTokens:
          generation.usage.inputTokens,
        outputTokens:
          generation.usage.outputTokens,
        costMinorUnits:
          generation.usage.costMinorUnits,
        currency:
          generation.usage.currency,
      });

      return {
        outcome: "reply-planned",
        requestKey,
        auditKey,
        aiAgentKey:
          input.agent.aiAgentKey,
        aiAgentVersionKey:
          input.version.aiAgentVersionKey,
        responseMode:
          definition.responseMode,
        approvalRequired:
          definition.responseMode ===
          "agent-approval",
        text: generation.text,
        groundedSourceKeys,
        groundingScoreBasisPoints:
          retrieval.scoreBasisPoints,
        usage: generation.usage,
        sendReply: false,
        auditRecorded: true,
      };
    },
  };
}
