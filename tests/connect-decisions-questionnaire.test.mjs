import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

import {
  PRODUCTION_DECISION_REGISTRY,
} from "../shared/domain/productionDecisionRegistry.ts";

const html = readFileSync(
  new URL(
    "../docs/connect-decisions-questionnaire.html",
    import.meta.url,
  ),
  "utf8",
);

function readQuestionnaireData() {
  const script = html.match(
    /<script>([\s\S]*?)<\/script>/,
  )?.[1];

  assert.ok(script, "questionnaire script is missing");

  const dataStart = script.indexOf(
    "const sections =",
  );
  const dataEnd = script.indexOf(
    "const elements =",
  );

  assert.notEqual(dataStart, -1);
  assert.ok(dataEnd > dataStart);

  const context = Object.create(null);
  runInNewContext(
    `${script.slice(dataStart, dataEnd)}\n` +
      "globalThis.questionnaire = { sections, decisions };",
    context,
    {
      timeout: 1_000,
      filename:
        "connect-decisions-questionnaire-data.js",
    },
  );

  return JSON.parse(
    JSON.stringify(context.questionnaire),
  );
}

const { sections, decisions } =
  readQuestionnaireData();

test("keeps the decision questionnaire self-contained and accessible in Hebrew", () => {
  assert.match(
    html,
    /<html[^>]*lang="he"[^>]*dir="rtl"/i,
  );
  assert.match(html, /<meta[^>]*name="viewport"/i);
  assert.equal(
    (html.match(/aria-live=/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(html, /\bMath\.random\s*\(/);
  assert.doesNotMatch(
    html,
    /\bcrypto\.randomUUID\s*\(/,
  );
  assert.doesNotMatch(html, /\.innerHTML\s*=/);
  assert.doesNotMatch(
    html,
    /\b(?:fetch|XMLHttpRequest|WebSocket)\b/,
  );
});

test("keeps every questionnaire decision structurally complete and deterministic", () => {
  assert.equal(sections.length, 9);
  assert.equal(decisions.length, 49);
  assert.equal(
    decisions.filter(({ status }) => status === "clear")
      .length,
    19,
  );
  assert.equal(
    decisions.filter(({ status }) => status === "hard")
      .length,
    30,
  );
  assert.equal(
    decisions.filter(({ phase }) => phase === "before")
      .length,
    40,
  );
  assert.equal(
    decisions.filter(({ phase }) => phase === "after")
      .length,
    9,
  );

  const sectionIds = new Set(
    sections.map(({ id }) => id),
  );
  const decisionCodes = new Set();

  for (const decision of decisions) {
    assert.ok(!decisionCodes.has(decision.code));
    decisionCodes.add(decision.code);
    assert.ok(sectionIds.has(decision.section));
    assert.ok(["before", "after"].includes(decision.phase));
    assert.ok(["clear", "hard"].includes(decision.status));

    for (const field of [
      "question",
      "beginner",
      "why",
      "owner",
      "blocker",
      "recommendation",
    ]) {
      assert.equal(typeof decision[field], "string");
      assert.ok(decision[field].trim().length > 0);
    }

    assert.ok(decision.sub.length >= 2);
    assert.ok(
      decision.options.length >= 2 &&
        decision.options.length <= 4,
    );
    assert.equal(
      decision.options.filter(
        ({ recommended }) => recommended === true,
      ).length,
      1,
    );
    assert.equal(
      new Set(
        decision.options.map(({ value }) => value),
      ).size,
      decision.options.length,
    );
  }
});

test("records Tal's closed platform, repository, approval, and hosting decisions", () => {
  const expectedDecisions = new Map([
    ["G01", "react-next"],
    ["G02", "personal-owner"],
    ["G03", "governed-pr"],
    ["R01", "full-migration"],
  ]);

  for (const [code, expectedValue] of expectedDecisions) {
    const decision = decisions.find(
      (candidate) => candidate.code === code,
    );
    assert.ok(decision);
    assert.equal(decision.status, "clear");
    assert.equal(decision.approved, true);
    assert.equal(
      decision.options.find(
        ({ recommended }) => recommended === true,
      )?.value,
      expectedValue,
    );
  }

  const legalOwner = decisions.find(
    ({ code }) => code === "R02A",
  );
  assert.ok(legalOwner);
  assert.equal(legalOwner.status, "hard");
  assert.equal(
    legalOwner.options.find(
      ({ recommended }) => recommended === true,
    )?.value,
    "wamit-legal-entity",
  );
});

test("covers every production decision registry blocker exactly once", () => {
  const registryIds = PRODUCTION_DECISION_REGISTRY.map(
    ({ checkId }) => checkId,
  ).sort();
  const questionnaireRegistryIds = decisions
    .map(({ registryCheckId }) => registryCheckId)
    .filter(Boolean)
    .sort();

  assert.equal(questionnaireRegistryIds.length, 11);
  assert.equal(
    new Set(questionnaireRegistryIds).size,
    questionnaireRegistryIds.length,
  );
  assert.deepEqual(
    questionnaireRegistryIds,
    registryIds,
  );
});

test("keeps hard decisions unselected and live WhatsApp limits explicitly unknown", () => {
  assert.match(
    html,
    /return decision\.status === "clear" && recommendation \? recommendation\.value : null;/,
  );

  const rateLimitDecision = decisions.find(
    ({ registryCheckId }) =>
      registryCheckId ===
      "security.rate-limit-policy",
  );

  assert.ok(rateLimitDecision);
  assert.equal(rateLimitDecision.status, "hard");
  assert.equal(
    rateLimitDecision.evidence?.checkedAt,
    "2026-08-16",
  );
  assert.match(
    rateLimitDecision.evidence?.liveStatus ?? "",
    /unknown\/unavailable/,
  );
  assert.equal(
    rateLimitDecision.evidence?.href,
    "whatsapp-rate-limits.md",
  );
});
