import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectAiAgentActivationReadiness,
  resolveAiAgentFallbackEffect,
  resolveAiAgentStatusTransition,
} from "../server/ai/aiAgentLifecycle.ts";

const sourceKey =
  `knowledge_source_v1_${"a".repeat(64)}`;

function definition(overrides = {}) {
  return {
    name: "מענה מבוסס ידע",
    systemPrompt:
      "יש לענות רק על בסיס מקורות ידע מאושרים.",
    handoffMessage:
      "לא נמצא מידע מאושר. השיחה עוברת לנציג.",
    responseMode: "agent-approval",
    minimumGroundingScoreBasisPoints: 8_000,
    monthlyCostLimitMinorUnits: 50_000,
    billingCurrency: "ILS",
    knowledgeSourceKeys: [sourceKey],
    ...overrides,
  };
}

function activationContext(overrides = {}) {
  return {
    providerReady: true,
    billingPolicyApproved: true,
    handoffPolicyApproved: true,
    auditSinkReady: true,
    knowledgeSources: [
      {
        sourceKey,
        status: "ready",
      },
    ],
    ...overrides,
  };
}

test("allows activation only when every server-side dependency is ready", () => {
  const readiness =
    inspectAiAgentActivationReadiness(
      definition(),
      activationContext(),
    );

  assert.deepEqual(readiness, {
    ready: true,
    issues: [],
  });
  assert.equal(
    resolveAiAgentStatusTransition(
      "draft",
      "publish",
      readiness,
    ),
    "active",
  );
  assert.equal(
    resolveAiAgentStatusTransition(
      "inactive",
      "activate",
      readiness,
    ),
    "active",
  );
});

test("keeps activation fail-closed while product decisions are unavailable", () => {
  const readiness =
    inspectAiAgentActivationReadiness(
      definition({
        responseMode: null,
        minimumGroundingScoreBasisPoints:
          null,
        monthlyCostLimitMinorUnits: null,
        billingCurrency: null,
        knowledgeSourceKeys: [],
      }),
      activationContext({
        providerReady: false,
        billingPolicyApproved: false,
        handoffPolicyApproved: false,
        auditSinkReady: false,
        knowledgeSources: [],
      }),
    );

  assert.deepEqual(readiness, {
    ready: false,
    issues: [
      "provider-required",
      "billing-policy-required",
      "handoff-policy-required",
      "audit-sink-required",
      "response-mode-required",
      "grounding-threshold-required",
      "cost-limit-required",
      "knowledge-source-required",
    ],
  });
  assert.equal(
    resolveAiAgentStatusTransition(
      "draft",
      "publish",
      readiness,
    ),
    null,
  );
});

test("does not treat uploaded, scanning, rejected, or missing files as usable knowledge", () => {
  for (const status of [
    "pending-upload",
    "pending-validation",
    "pending-scan",
    "scanning",
    "rejected",
    "archived",
  ]) {
    const readiness =
      inspectAiAgentActivationReadiness(
        definition(),
        activationContext({
          knowledgeSources: [
            {
              sourceKey,
              status,
            },
          ],
        }),
      );

    assert.deepEqual(readiness, {
      ready: false,
      issues: [
        "knowledge-source-not-ready",
      ],
    });
  }

  assert.deepEqual(
    inspectAiAgentActivationReadiness(
      definition(),
      activationContext({
        knowledgeSources: [],
      }),
    ),
    {
      ready: false,
      issues: [
        "knowledge-source-not-ready",
      ],
    },
  );
});

test("allows deactivation without external provider availability", () => {
  const blockedReadiness =
    inspectAiAgentActivationReadiness(
      definition(),
      activationContext({
        providerReady: false,
      }),
    );

  assert.equal(
    resolveAiAgentStatusTransition(
      "active",
      "deactivate",
      blockedReadiness,
    ),
    "inactive",
  );
  assert.equal(
    resolveAiAgentStatusTransition(
      "draft",
      "deactivate",
      blockedReadiness,
    ),
    null,
  );
});

test("falls back without generating or sending content and without assigning an agent", () => {
  assert.deepEqual(
    resolveAiAgentFallbackEffect(
      "no-approved-knowledge",
    ),
    {
      outcome: "handoff",
      reason: "no-approved-knowledge",
      generateReply: false,
      sendReply: false,
      stopAiExecution: true,
      conversationStatus:
        "waiting_for_agent",
      assignmentAction: "none",
      auditRequired: true,
    },
  );
});
