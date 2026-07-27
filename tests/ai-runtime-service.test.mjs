import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  AiRuntimeServiceError,
  createAiRuntimeService,
} from "../server/ai/aiRuntimeService.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const inboundMessageKey =
  `message_v1_${"b".repeat(64)}`;
const passageKey =
  `knowledge_passage_v1_${"c".repeat(64)}`;

async function runtimeFixture(options = {}) {
  const tenantId = 7;
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

function dependencyNames(fixture) {
  return fixture.calls.map(
    (call) => call.dependency,
  );
}

test("plans an audited grounded reply without sending it", async () => {
  const fixture = await runtimeFixture();
  const result =
    await fixture.service.process(
      fixture.input,
    );

  assert.equal(
    result.outcome,
    "reply-planned",
  );
  assert.equal(result.sendReply, false);
  assert.equal(
    result.approvalRequired,
    false,
  );
  assert.deepEqual(
    result.groundedSourceKeys,
    [fixture.sourceKey],
  );
  assert.deepEqual(
    dependencyNames(fixture),
    [
      "retriever",
      "authorize",
      "provider",
      "record-usage",
      "audit",
    ],
  );
  assert.equal(
    fixture.auditEvents[0].outcome,
    "reply-planned",
  );
  assert.doesNotMatch(
    JSON.stringify(
      fixture.auditEvents[0],
    ),
    /מה כוללת|יש להשיב רק|תוכן מאושר|תשובה המבוססת/,
  );
});

test("keeps agent-approval replies staged for a human decision", async () => {
  const fixture = await runtimeFixture({
    definition: {
      responseMode: "agent-approval",
    },
  });
  const result =
    await fixture.service.process(
      fixture.input,
    );

  assert.equal(
    result.outcome,
    "reply-planned",
  );
  assert.equal(
    result.approvalRequired,
    true,
  );
  assert.equal(result.sendReply, false);
});

test("honors a customer handoff request before retrieval or generation", async () => {
  const fixture = await runtimeFixture();
  const result =
    await fixture.service.process({
      ...fixture.input,
      customerRequestedHuman: true,
    });

  assert.equal(
    result.outcome,
    "handoff-planned",
  );
  assert.equal(
    result.effect.reason,
    "customer-request",
  );
  assert.equal(
    result.effect.generateReply,
    false,
  );
  assert.equal(
    result.effect.sendReply,
    false,
  );
  assert.deepEqual(
    dependencyNames(fixture),
    ["audit"],
  );
});

test("fails over to handoff before provider access when knowledge or budget gates fail", async () => {
  const cases = [
    {
      options: {
        retrievalResult: {
          outcome:
            "no-approved-knowledge",
        },
      },
      reason: "no-approved-knowledge",
      calls: ["retriever", "audit"],
    },
    {
      options: {
        retrievalResultFactory: ({
          sourceKey,
        }) => ({
          outcome: "grounded",
          scoreBasisPoints: 7_999,
          passages: [
            {
              passageKey,
              sourceKey,
              content:
                "תוכן מאושר מתוך מקור הידע.",
            },
          ],
        }),
      },
      reason:
        "grounding-below-threshold",
      calls: ["retriever", "audit"],
    },
    {
      options: {
        authorizationResult: {
          outcome: "exhausted",
        },
      },
      reason: "budget-exhausted",
      calls: [
        "retriever",
        "authorize",
        "audit",
      ],
    },
  ];

  for (const scenario of cases) {
    const fixture =
      await runtimeFixture(
        scenario.options,
      );

    const result =
      await fixture.service.process(
        fixture.input,
      );

    assert.equal(
      result.outcome,
      "handoff-planned",
    );
    assert.equal(
      result.effect.reason,
      scenario.reason,
    );
    assert.deepEqual(
      dependencyNames(fixture),
      scenario.calls,
    );
  }
});

test("maps unavailable retrieval or provider dependencies to audited handoff", async () => {
  const retrievalFailure =
    await runtimeFixture({
      retrievalThrows: true,
    });
  const providerFailure =
    await runtimeFixture({
      providerResult: {
        outcome: "unavailable",
      },
    });
  const retrievalPlan =
    await retrievalFailure.service.process(
      retrievalFailure.input,
    );
  const providerPlan =
    await providerFailure.service.process(
      providerFailure.input,
    );

  assert.equal(
    retrievalPlan.effect.reason,
    "provider-unavailable",
  );
  assert.equal(
    providerPlan.effect.reason,
    "provider-unavailable",
  );
  assert.equal(
    providerPlan.effect.sendReply,
    false,
  );
});

test("rejects provider output that cites knowledge outside the retrieved evidence", async () => {
  const fixture = await runtimeFixture({
    providerResult: {
      outcome: "generated",
      text: "תשובה לא מאושרת.",
      groundedPassageKeys: [
        `knowledge_passage_v1_${"e".repeat(
          64,
        )}`,
      ],
      usage: {
        inputTokens: 120,
        outputTokens: 24,
        costMinorUnits: 3,
        currency: "ILS",
      },
    },
  });

  await assert.rejects(
    fixture.service.process(
      fixture.input,
    ),
    (error) =>
      error instanceof
        AiRuntimeServiceError &&
      error.code === "PROVIDER_INVALID",
  );
  assert.deepEqual(
    dependencyNames(fixture),
    ["retriever", "authorize", "provider"],
  );
});

test("does not release generated text when usage or audit persistence fails", async () => {
  const usageFailure =
    await runtimeFixture({
      usageResult: {
        outcome: "unavailable",
      },
    });
  const auditFailure =
    await runtimeFixture({
      auditResult: {
        outcome: "unavailable",
      },
    });

  await assert.rejects(
    usageFailure.service.process(
      usageFailure.input,
    ),
    (error) =>
      error instanceof
        AiRuntimeServiceError &&
      error.code ===
        "USAGE_RECORD_FAILED",
  );
  await assert.rejects(
    auditFailure.service.process(
      auditFailure.input,
    ),
    (error) =>
      error instanceof
        AiRuntimeServiceError &&
      error.code === "AUDIT_FAILED",
  );
});

test("records incurred usage but withholds the reply when the atomic cost ledger reports the limit was crossed", async () => {
  const fixture = await runtimeFixture({
    usageResult: {
      outcome: "recorded",
      withinLimit: false,
    },
  });
  const result =
    await fixture.service.process(
      fixture.input,
    );

  assert.equal(
    result.outcome,
    "handoff-planned",
  );
  assert.equal(
    result.effect.reason,
    "budget-exhausted",
  );
  assert.deepEqual(
    dependencyNames(fixture),
    [
      "retriever",
      "authorize",
      "provider",
      "record-usage",
      "audit",
    ],
  );
  assert.equal(
    fixture.auditEvents[0].costMinorUnits,
    3,
  );
});

test("rejects an inactive or mismatched agent before external dependency access", async () => {
  const fixture = await runtimeFixture({
    agent: {
      status: "draft",
      activeVersionKey: null,
    },
  });

  await assert.rejects(
    fixture.service.process(
      fixture.input,
    ),
    (error) =>
      error instanceof
        AiRuntimeServiceError &&
      error.code ===
        "AGENT_CONFIGURATION_INVALID",
  );
  assert.deepEqual(fixture.calls, []);
});
