import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PRODUCTION_DECISION_REGISTRY } from
  "../shared/domain/productionDecisionRegistry.ts";

const document = readFileSync(
  new URL("../docs/connect-all-remaining-decisions.html", import.meta.url),
  "utf8",
);

test("covers thirty uniquely numbered decision groups with recommendations", () => {
  const ids = [...document.matchAll(/data-decision-id="(D\d{2})"/g)]
    .map((match) => match[1]);
  const recommendations = [
    ...document.matchAll(/<input\b[^>]*\bdata-recommended\b/g),
  ];

  assert.equal(ids.length, 30);
  assert.equal(new Set(ids).size, 30);
  assert.deepEqual(ids, Array.from({ length: 30 }, (_, index) =>
    `D${String(index + 1).padStart(2, "0")}`));
  assert.equal(recommendations.length, 30);
});

test("keeps every production registry decision visible exactly once", () => {
  for (const decision of PRODUCTION_DECISION_REGISTRY) {
    assert.equal(
      document.match(new RegExp(decision.checkId.replaceAll(".", "\\."), "g"))?.length,
      1,
      decision.checkId,
    );
  }
});

test("explains the complete roadmap horizon and export safety", () => {
  assert.match(document, /<strong>15<\/strong>שלבים מרכזיים קדימה/);
  assert.match(document, /120–260/);
  assert.match(document, /1,840–3,560/);
  assert.match(document, /אין לכלול Secrets או מידע אישי/);
  assert.match(document, /connect-decisions-answers\.json/);
  assert.doesNotMatch(document, /Math\.random|crypto\.randomUUID/);
});
