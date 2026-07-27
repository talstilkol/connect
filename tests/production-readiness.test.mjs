import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectCurrentProductionReadiness,
  inspectProductionReadiness,
} from "../server/operations/productionReadiness.ts";

const readyImplementation = Object.freeze({
  metaWebhookQueue: true,
  campaignDeliveryQueue: true,
  campaignScheduler: true,
  campaignDeliveryAdapter: true,
  botReplyDeliveryAdapter: true,
  aiProvider: true,
  billingProvider: true,
  rateLimitPolicy: true,
  dependencyAudit: true,
  fileScanner: true,
  monitoringAndAlerting: true,
  backupAndRestore: true,
  sloMeasurement: true,
  dataRetentionPolicy: true,
});

test("reports ready only when every production dependency is ready", () => {
  const report = inspectProductionReadiness({
    clerk: "configured",
    systemAdmin: "configured",
    metaEmbeddedSignup: "configured",
    metaWebhook: "configured",
    knowledgeUploadPolicy: "configured",
    knowledgeScanRecovery: "configured",
    sloAlertPolicy: "configured",
    backupRestorePolicy: "configured",
    retentionPolicy: "configured",
    hosting: {
      d1: "DB",
      r2: "FILES",
    },
    implementation: readyImplementation,
  });

  assert.equal(report.readyForProduction, true);
  assert.deepEqual(report.counts, {
    ready: 25,
    blocked: 0,
    decisionRequired: 0,
  });
  assert.equal(
    report.checks.every(
      (check) => check.status === "ready",
    ),
    true,
  );
});

test("fails closed for absent environment and unresolved implementation", () => {
  const report = inspectCurrentProductionReadiness(
    {},
    {
      d1: "DB",
      r2: "FILES",
    },
  );

  assert.equal(report.readyForProduction, false);
  assert.deepEqual(report.counts, {
    ready: 5,
    blocked: 10,
    decisionRequired: 10,
  });
  assert.equal(
    report.checks.find(
      (check) => check.id === "identity.clerk",
    )?.code,
    "CLERK_CONFIGURATION_REQUIRED",
  );
  assert.equal(
    report.checks.find(
      (check) => check.id === "billing.provider",
    )?.status,
    "decision-required",
  );
});

test("rejects renamed or absent hosting bindings", () => {
  const report = inspectProductionReadiness({
    clerk: "configured",
    systemAdmin: "configured",
    metaEmbeddedSignup: "configured",
    metaWebhook: "configured",
    knowledgeUploadPolicy: "configured",
    knowledgeScanRecovery: "configured",
    sloAlertPolicy: "configured",
    backupRestorePolicy: "configured",
    retentionPolicy: "configured",
    hosting: {
      d1: "DATABASE",
    },
    implementation: readyImplementation,
  });

  assert.equal(report.readyForProduction, false);
  assert.equal(
    report.checks.find(
      (check) => check.id === "storage.d1-binding",
    )?.code,
    "D1_BINDING_INVALID",
  );
  assert.equal(
    report.checks.find(
      (check) => check.id === "storage.r2-binding",
    )?.code,
    "R2_BINDING_INVALID",
  );
});

test("uses stable, unique identifiers and safe fixed result codes", () => {
  const report = inspectCurrentProductionReadiness({}, {});
  const ids = report.checks.map((check) => check.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(
    report.checks.every(
      (check) =>
        /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(check.id) &&
        /^[A-Z][A-Z0-9_]+$/.test(check.code),
    ),
    true,
  );
  assert.deepEqual(Object.keys(report), [
    "readyForProduction",
    "checks",
    "counts",
  ]);
});
