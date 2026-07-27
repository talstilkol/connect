import assert from "node:assert/strict";
import test from "node:test";

import {
  validateAiAgentDefinition,
} from "../shared/validation/aiAgentDefinition.ts";

const sourceKey = (character) =>
  `knowledge_source_v1_${character.repeat(64)}`;

function validDraft(overrides = {}) {
  return {
    name: "  מענה מבוסס ידע  ",
    systemPrompt:
      "  יש לענות רק על בסיס מקורות הידע המאושרים.\r\nאין להמציא מידע.  ",
    handoffMessage:
      "  לא נמצא מידע מאושר ולכן השיחה עוברת לנציג.  ",
    responseMode: null,
    minimumGroundingScoreBasisPoints: null,
    monthlyCostLimitMinorUnits: null,
    billingCurrency: null,
    knowledgeSourceKeys: [
      sourceKey("b"),
      sourceKey("a"),
    ],
    ...overrides,
  };
}

test("normalizes one provider-neutral AI agent draft canonically", () => {
  const result = validateAiAgentDefinition(
    validDraft(),
  );

  assert.equal(result.success, true);
  assert.equal(
    result.value.name,
    "מענה מבוסס ידע",
  );
  assert.equal(
    result.value.systemPrompt,
    "יש לענות רק על בסיס מקורות הידע המאושרים.\nאין להמציא מידע.",
  );
  assert.deepEqual(
    result.value.knowledgeSourceKeys,
    [sourceKey("a"), sourceKey("b")],
  );
  assert.deepEqual(
    validateAiAgentDefinition(result.value),
    result,
  );
});

test("accepts explicit activation policy without provider secrets", () => {
  const result = validateAiAgentDefinition(
    validDraft({
      responseMode: "agent-approval",
      minimumGroundingScoreBasisPoints: 8_000,
      monthlyCostLimitMinorUnits: 50_000,
      billingCurrency: "ILS",
    }),
  );

  assert.equal(result.success, true);
  assert.equal(
    result.value.responseMode,
    "agent-approval",
  );
  assert.equal(
    result.value.minimumGroundingScoreBasisPoints,
    8_000,
  );
});

test("rejects unknown fields, including tenant and provider credentials", () => {
  assert.deepEqual(
    validateAiAgentDefinition({
      ...validDraft(),
      tenantId: 7,
      providerApiKey: "must-not-enter-domain",
    }),
    {
      success: false,
      issues: ["invalid-input"],
    },
  );
});

test("rejects unsupported response modes and invalid bounded policy values", () => {
  const result = validateAiAgentDefinition(
    validDraft({
      responseMode: "unreviewed-mode",
      minimumGroundingScoreBasisPoints: 10_001,
      monthlyCostLimitMinorUnits: 0,
      billingCurrency: "ils",
    }),
  );

  assert.deepEqual(result, {
    success: false,
    issues: [
      "invalid-response-mode",
      "invalid-grounding-threshold",
      "invalid-cost-limit",
      "invalid-billing-currency",
    ],
  });
});

test("requires the cost amount and ISO currency to be selected together", () => {
  assert.deepEqual(
    validateAiAgentDefinition(
      validDraft({
        monthlyCostLimitMinorUnits: 50_000,
      }),
    ),
    {
      success: false,
      issues: [
        "invalid-cost-limit",
        "invalid-billing-currency",
      ],
    },
  );
});

test("rejects malformed or duplicate knowledge source identities", () => {
  assert.deepEqual(
    validateAiAgentDefinition(
      validDraft({
        knowledgeSourceKeys: [
          sourceKey("a"),
          sourceKey("a"),
        ],
      }),
    ),
    {
      success: false,
      issues: ["invalid-knowledge-sources"],
    },
  );
});
