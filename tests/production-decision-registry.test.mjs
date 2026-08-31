import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectCurrentProductionReadiness,
} from "../server/operations/productionReadiness.ts";
import {
  listProductionDecisions,
  PRODUCTION_DECISION_REGISTRY,
} from "../shared/domain/productionDecisionRegistry.ts";

test("derives every UI decision from the production readiness registry", () => {
  const report =
    inspectCurrentProductionReadiness(
      {},
      {
        d1: "DB",
        r2: "FILES",
      },
    );
  const decisions =
    listProductionDecisions(report);
  const readinessDecisionIds = report.checks
    .filter(
      (check) =>
        check.status ===
        "decision-required",
    )
    .map((check) => check.id)
    .sort();

  assert.deepEqual(
    decisions
      .filter(
        (decision) =>
          decision.status ===
          "decision-required",
      )
      .map((decision) => decision.checkId)
      .sort(),
    readinessDecisionIds,
  );
  assert.equal(
    decisions.length,
    PRODUCTION_DECISION_REGISTRY.length,
  );
});

test("fails closed when the readiness report omits a registered decision", () => {
  assert.throws(
    () =>
      listProductionDecisions({
        readyForProduction: false,
        checks: [],
        counts: {
          ready: 0,
          blocked: 0,
          decisionRequired: 0,
        },
      }),
    /Production readiness check is missing/,
  );
});

test("assigns WhatsApp and Connect rate-limit research to Tal", () => {
  const decision =
    PRODUCTION_DECISION_REGISTRY.find(
      ({ checkId }) =>
        checkId ===
        "security.rate-limit-policy",
    );

  assert.ok(decision);
  assert.match(
    decision.owner,
    /טל \(מחקר ופיתוח\)/,
  );
  assert.match(decision.detail, /Meta/);
  assert.match(decision.detail, /Backoff/);
  assert.match(decision.detail, /Kill switch/);
});
