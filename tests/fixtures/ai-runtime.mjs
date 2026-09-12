// Shared existing AI runtime test cases; never loaded by product code.
import { deriveAiAgentKey, deriveAiAgentVersionKey, deriveKnowledgeSourceKey } from "../../server/ai/aiAgentKey.ts";
import { createAiRuntimeService } from "../../server/ai/aiRuntimeService.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const inboundMessageKey =
  `message_v1_${"b".repeat(64)}`;
export const passageKey =
  `knowledge_passage_v1_${"c".repeat(64)}`;

export async function runtimeFixture(options = {}) {
  const tenantId = options.tenantId ?? 7;
  const contentSha256 = "d".repeat(64);
  const sourceKey =
    await deriveKnowledgeSourceKey(
      tenantId,
      contentSha256,
    );
  const definition = {
    name: "סוכן שירות מאושר",
    systemPrompt:
      "יש להשיב רק על בסיס מקורות הידע שסופקו.",
    handoffMessage:
      "השיחה עוברת לנציג אנושי.",
    responseMode: "automatic",
    minimumGroundingScoreBasisPoints:
      8_000,
    monthlyCostLimitMinorUnits: 50_000,
    billingCurrency: "ILS",
    knowledgeSourceKeys: [sourceKey],
    ...options.definition,
  };
  const aiAgentKey = await deriveAiAgentKey(
    tenantId,
    definition.name,
  );
  const aiAgentVersionKey =
    await deriveAiAgentVersionKey(
      tenantId,
      aiAgentKey,
      1,
      definition,
    );
  const agent = {
    aiAgentKey,
    tenantId,
    name: definition.name,
    status: "active",
    latestVersionKey: aiAgentVersionKey,
    latestVersionNumber: 1,
    activeVersionKey: aiAgentVersionKey,
    version: 2,
    createdAt: "2026-07-26 09:00:00",
    updatedAt: "2026-07-26 09:05:00",
    ...options.agent,
  };
  const version = {
    aiAgentVersionKey,
    aiAgentKey,
    tenantId,
    versionNumber: 1,
    status: "published",
    definition,
    publishedAt:
      "2026-07-26 09:05:00",
    createdAt: "2026-07-26 09:00:00",
    ...options.version,
  };
  const calls = [];
  const auditEvents = [];
  const retrievalResult =
    options.retrievalResultFactory
      ? options.retrievalResultFactory({
          sourceKey,
          passageKey,
        })
      : options.retrievalResult ?? {
      outcome: "grounded",
      scoreBasisPoints: 9_000,
      passages: [
        {
          passageKey,
          sourceKey,
          content:
            "תוכן מאושר מתוך מקור הידע.",
        },
      ],
    };
  const providerResult =
    options.providerResult ?? {
      outcome: "generated",
      text: "תשובה המבוססת על המקור המאושר.",
      groundedPassageKeys: [passageKey],
      usage: {
        inputTokens: 120,
        outputTokens: 24,
        costMinorUnits: 3,
        currency: definition.billingCurrency,
      },
    };
  const dependencies = {
    retriever: {
      async retrieve(request) {
        calls.push({
          dependency: "retriever",
          request,
        });

        if (options.retrievalThrows) {
          throw new Error(
            "private retrieval failure",
          );
        }

        return retrievalResult;
      },
    },
    costGate: {
      async authorize(request) {
        calls.push({
          dependency: "authorize",
          request,
        });
        return (
          options.authorizationResult ?? {
            outcome: "authorized",
          }
        );
      },
      async recordUsage(request) {
        calls.push({
          dependency: "record-usage",
          request,
        });

        if (options.usageThrows) {
          throw new Error(
            "private usage failure",
          );
        }

        return (
          options.usageResult ?? {
            outcome: "recorded",
            withinLimit: true,
          }
        );
      },
    },
    provider: {
      async generate(request) {
        calls.push({
          dependency: "provider",
          request,
        });
        if (options.providerThrows) throw options.providerThrows;
        return providerResult;
      },
    },
    audit: {
      async record(event) {
        calls.push({
          dependency: "audit",
          event,
        });
        auditEvents.push(event);

        if (options.auditThrows) {
          throw new Error(
            "private audit failure",
          );
        }

        return (
          options.auditResult ?? {
            outcome: "recorded",
          }
        );
      },
    },
  };
  const input = {
    tenantId,
    conversationKey,
    conversationVersion: 3,
    inboundMessageKey,
    customerMessage:
      "מה כוללת מדיניות השירות?",
    customerRequestedHuman: false,
    agent,
    version,
  };

  return {
    calls,
    auditEvents,
    input,
    sourceKey,
    service:
      createAiRuntimeService(
        dependencies,
      ),
  };
}
