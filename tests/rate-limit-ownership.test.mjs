import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (relativePath) =>
  readFileSync(
    new URL(`../${relativePath}`, import.meta.url),
    "utf8",
  );

const agents = readProjectFile("AGENTS.md");
const externalDecisions = readProjectFile(
  "docs/external-decisions-recommendations.md",
);
const releaseChecklist = readProjectFile(
  "docs/release-checklist.md",
);
const teamPlan = readProjectFile(
  "docs/team-operating-plan.md",
);
const whatsappLimits = readProjectFile(
  "docs/whatsapp-rate-limits.md",
);

test("keeps Tal's rate-limit RACI consistent across release documents", () => {
  assert.match(
    externalDecisions,
    /טל Responsible למחקר ולאימות עובדות/,
  );
  assert.match(
    teamPlan,
    /טל מאמת את העובדות; דוד/,
  );
  assert.match(
    whatsappLimits,
    /טל אחראי למחקר ולאימות העובדות/,
  );
  assert.match(
    releaseChecklist,
    /טל ביצע Factual sign-off/,
  );
});

test("keeps the user-facing Low-to-Ultra footer contract explicit", () => {
  assert.match(
    agents,
    /רמה להודעה הבאה: \*\*<Low\|Medium\|High\|XHigh\|Max\|Ultra>\*\*/,
  );

  for (const level of [
    "Low",
    "Medium",
    "High",
    "XHigh",
    "Max",
    "Ultra",
  ]) {
    assert.ok(
      agents.includes(`\`${level}\``),
    );
  }
});

test("separates live Meta limits from Connect engineering quotas", () => {
  assert.doesNotMatch(
    externalDecisions,
    /1,500 אירועים לדקה/,
  );
  assert.match(
    externalDecisions,
    /אין תקרה קבועה מראש/,
  );
  assert.match(
    whatsappLimits,
    /META_GRAPH_API_VERSION`: ‏`unknown\/unavailable`/,
  );
  assert.match(
    whatsappLimits,
    /Baseline מחקרי, לא Production evidence/,
  );
});
