import assert from "node:assert/strict";
import test from "node:test";

import {
  createProductionReadinessPayload,
  readProductionReadinessCliMode,
  renderProductionReadinessHuman,
  renderProductionReadinessJson,
} from "../scripts/verify-production-readiness.mjs";

function blockedReport() {
  return {
    readyForProduction: false,
    checks: [
      {
        id: "storage.d1-binding",
        status: "ready",
        code: "D1_BINDING_DECLARED",
        secretValue: "must-not-appear",
      },
      {
        id: "identity.clerk",
        status: "blocked",
        code: "CLERK_CONFIGURATION_REQUIRED",
        environmentValue: "must-not-appear",
      },
      {
        id: "billing.provider",
        status: "decision-required",
        code: "BILLING_PROVIDER_DECISION_REQUIRED",
        tenantId: "must-not-appear",
      },
    ],
    counts: {
      ready: 1,
      blocked: 1,
      decisionRequired: 1,
    },
    extra: "must-not-appear",
  };
}

test("accepts only human or json CLI modes", () => {
  assert.equal(
    readProductionReadinessCliMode([]),
    "human",
  );
  assert.equal(
    readProductionReadinessCliMode([
      "--json",
    ]),
    "json",
  );
  assert.throws(
    () =>
      readProductionReadinessCliMode([
        "--json",
        "extra",
      ]),
    {
      message:
        "PRODUCTION_READINESS_ARGUMENTS_INVALID",
    },
  );
  assert.throws(
    () =>
      readProductionReadinessCliMode([
        "--output=report.json",
      ]),
    {
      message:
        "PRODUCTION_READINESS_ARGUMENTS_INVALID",
    },
  );
});

test("projects a versioned bounded payload without source fields", () => {
  const payload =
    createProductionReadinessPayload(
      blockedReport(),
    );

  assert.deepEqual(payload, {
    schemaVersion: 1,
    status: "blocked",
    counts: {
      ready: 1,
      blocked: 1,
      decisionRequired: 1,
    },
    checks: [
      {
        id: "storage.d1-binding",
        status: "ready",
        code: "D1_BINDING_DECLARED",
      },
      {
        id: "identity.clerk",
        status: "blocked",
        code: "CLERK_CONFIGURATION_REQUIRED",
      },
      {
        id: "billing.provider",
        status: "decision-required",
        code: "BILLING_PROVIDER_DECISION_REQUIRED",
      },
    ],
  });
  assert.doesNotMatch(
    JSON.stringify(payload),
    /must-not-appear|secretValue|environmentValue|tenantId|extra/,
  );
});

test("renders stable human and machine-readable reports", () => {
  const report = blockedReport();
  const human =
    renderProductionReadinessHuman(report);
  const json =
    renderProductionReadinessJson(report);

  assert.match(
    human,
    /^Production readiness: BLOCKED\n/,
  );
  assert.match(
    human,
    /Checks: 1 ready, 1 blocked, 1 decision-required/,
  );
  assert.deepEqual(
    JSON.parse(json),
    createProductionReadinessPayload(report),
  );
  assert.doesNotMatch(
    `${human}\n${json}`,
    /must-not-appear/,
  );
});

test("fails closed for inconsistent, duplicate, or unsafe reports", () => {
  const inconsistent = blockedReport();
  inconsistent.counts.ready = 2;

  assert.throws(
    () =>
      createProductionReadinessPayload(
        inconsistent,
      ),
    {
      message:
        "PRODUCTION_READINESS_REPORT_INVALID",
    },
  );

  const duplicate = blockedReport();
  duplicate.checks[1].id =
    duplicate.checks[0].id;

  assert.throws(
    () =>
      createProductionReadinessPayload(
        duplicate,
      ),
    {
      message:
        "PRODUCTION_READINESS_REPORT_INVALID",
    },
  );

  const unsafe = blockedReport();
  unsafe.checks[0].code =
    "unsafe secret value";

  assert.throws(
    () =>
      createProductionReadinessPayload(
        unsafe,
      ),
    {
      message:
        "PRODUCTION_READINESS_REPORT_INVALID",
    },
  );

  assert.throws(
    () =>
      createProductionReadinessPayload({
        readyForProduction: true,
        checks: [],
        counts: {
          ready: 0,
          blocked: 0,
          decisionRequired: 0,
        },
      }),
    {
      message:
        "PRODUCTION_READINESS_REPORT_INVALID",
    },
  );
});
