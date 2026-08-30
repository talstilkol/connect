import assert from "node:assert/strict";
import test from "node:test";

import {
  betterStackAlertRequirements,
  betterStackMetricRequirements,
  betterStackServiceRequirements,
  betterStackTraceRequirements,
  deriveBetterStackStagingEvidenceDigest,
  inspectBetterStackStagingEvidence,
} from "../server/operations/betterStackStagingEvidence.ts";
import {
  inspectProductionReadiness,
} from "../server/operations/productionReadiness.ts";

const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const now = new Date("2026-08-21T14:00:00.000Z");

function fingerprint(character) {
  return `sha256:${character.repeat(64)}`;
}

function withDigest(value) {
  const evidence = { ...value };
  delete evidence.evidenceDigest;
  return {
    ...evidence,
    evidenceDigest: deriveBetterStackStagingEvidenceDigest(evidence),
  };
}

function validEvidence() {
  const evidence = {
    schemaVersion: 1,
    policyVersion: 1,
    environment: "staging",
    provider: "better-stack",
    protocol: "otlp-http",
    verifiedAt: "2026-08-21T13:00:00.000Z",
    expiresAt: "2026-08-22T13:00:00.000Z",
    releaseId,
    commitSha,
    artifactDigest,
    sourceFingerprint: fingerprint("d"),
    services: betterStackServiceRequirements.map((item) => ({ ...item })),
    traces: betterStackTraceRequirements.map((item, index) => ({
      ...item,
      status: "passed",
      traceFingerprint: fingerprint("ef012"[index]),
    })),
    metrics: betterStackMetricRequirements.map((metricName) => ({
      metricName,
      sampleCount: 12,
      seriesCount: 3,
    })),
    redaction: {
      testedFieldCount: 16,
      findings: 0,
    },
    alerts: betterStackAlertRequirements.map((scenario, index) => ({
      scenario,
      status: "delivered",
      triggeredAt: `2026-08-21T12:${index}0:00.000Z`,
      deliveredAt: `2026-08-21T12:${index}1:00.000Z`,
      deliveryFingerprint: fingerprint("34"[index]),
    })),
    retentionPolicyDigest: fingerprint("5"),
    costPolicyDigest: fingerprint("6"),
    outageRehearsal: {
      status: "passed",
      startedAt: "2026-08-21T12:30:00.000Z",
      completedAt: "2026-08-21T12:40:00.000Z",
      businessImpact: "none",
    },
  };
  return withDigest(evidence);
}

function inspect(value, environmentOverrides = {}, clock = now) {
  return inspectBetterStackStagingEvidence({
    APP_DEPLOYED_COMMIT_SHA: commitSha,
    APP_RELEASE_ID: releaseId,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: artifactDigest,
    BETTER_STACK_STAGING_EVIDENCE_JSON: JSON.stringify(value),
    ...environmentOverrides,
  }, clock);
}

test("verifies one closed release-bound Better Stack staging evidence", () => {
  const report = inspect(validEvidence());

  assert.deepEqual(report, {
    status: "configured",
    code: "BETTER_STACK_STAGING_EVIDENCE_VERIFIED",
    releaseId,
    commitSha,
    artifactDigest,
    verifiedAt: "2026-08-21T13:00:00.000Z",
    expiresAt: "2026-08-22T13:00:00.000Z",
    serviceCount: 3,
    traceScenarioCount: 5,
    metricCount: 6,
    alertTestCount: 2,
  });
  assert.ok(Object.isFrozen(report));
  assert.doesNotMatch(
    JSON.stringify(report),
    /endpoint|token|tenant|traceId|sourceId/i,
  );
});

test("requires evidence and rejects malformed or oversized JSON", () => {
  assert.equal(
    inspectBetterStackStagingEvidence({}).code,
    "BETTER_STACK_STAGING_EVIDENCE_REQUIRED",
  );
  assert.equal(
    inspectBetterStackStagingEvidence({
      BETTER_STACK_STAGING_EVIDENCE_JSON: "{broken",
    }).code,
    "BETTER_STACK_STAGING_EVIDENCE_INVALID",
  );
  assert.equal(
    inspectBetterStackStagingEvidence({
      BETTER_STACK_STAGING_EVIDENCE_JSON: "x".repeat(48_001),
    }).code,
    "BETTER_STACK_STAGING_EVIDENCE_INVALID",
  );
});

test("rejects extra fields that could carry endpoints, tokens or raw identities", () => {
  for (const forbiddenField of ["endpoint", "token", "traceId", "tenantId"]) {
    const evidence = validEvidence();
    evidence[forbiddenField] = "forbidden";
    assert.equal(
      inspect(evidence).code,
      "BETTER_STACK_STAGING_EVIDENCE_INVALID",
    );
  }
});

test("requires exact service, trace, metric and alert coverage", () => {
  const cases = [];

  const service = validEvidence();
  service.services[0].metrics = true;
  cases.push(service);

  const trace = validEvidence();
  trace.traces[1].spanCount = 3;
  cases.push(withDigest(trace));

  const duplicateTrace = validEvidence();
  duplicateTrace.traces[1].scenario = duplicateTrace.traces[0].scenario;
  cases.push(withDigest(duplicateTrace));

  const metric = validEvidence();
  metric.metrics[0].seriesCount = 129;
  cases.push(withDigest(metric));

  const alert = validEvidence();
  alert.alerts[0].status = "accepted";
  cases.push(withDigest(alert));

  for (const evidence of cases) {
    assert.equal(
      inspect(evidence).code,
      "BETTER_STACK_STAGING_EVIDENCE_INVALID",
    );
  }
});

test("rejects failed redaction, unapproved policy evidence and failed outage rehearsal", () => {
  const redaction = validEvidence();
  redaction.redaction.findings = 1;

  const policy = validEvidence();
  policy.costPolicyDigest = "not-a-digest";

  const duplicatePolicies = validEvidence();
  duplicatePolicies.costPolicyDigest = duplicatePolicies.retentionPolicyDigest;

  const outage = validEvidence();
  outage.outageRehearsal.businessImpact = "customer-visible";

  for (const evidence of [redaction, policy, duplicatePolicies, outage]) {
    assert.equal(
      inspect(withDigest(evidence)).code,
      "BETTER_STACK_STAGING_EVIDENCE_INVALID",
    );
  }
});

test("rejects stale observations, invalid alert ordering and long exercises", () => {
  const alertOrdering = validEvidence();
  alertOrdering.alerts[0].deliveredAt = "2026-08-21T11:59:59.999Z";

  const longOutage = validEvidence();
  longOutage.outageRehearsal.startedAt = "2026-08-21T10:00:00.000Z";

  const staleAlert = validEvidence();
  staleAlert.alerts[0].triggeredAt = "2026-08-20T11:00:00.000Z";
  staleAlert.alerts[0].deliveredAt = "2026-08-20T11:01:00.000Z";

  for (const evidence of [alertOrdering, longOutage, staleAlert]) {
    assert.equal(
      inspect(withDigest(evidence)).code,
      "BETTER_STACK_STAGING_EVIDENCE_INVALID",
    );
  }
});

test("separates future, expired, overlong and release mismatch failures", () => {
  assert.equal(
    inspect(
      validEvidence(),
      {},
      new Date("2026-08-21T12:59:59.999Z"),
    ).code,
    "BETTER_STACK_STAGING_EVIDENCE_NOT_YET_VALID",
  );
  assert.equal(
    inspect(
      validEvidence(),
      {},
      new Date("2026-08-22T13:00:00.000Z"),
    ).code,
    "BETTER_STACK_STAGING_EVIDENCE_EXPIRED",
  );

  const overlong = validEvidence();
  overlong.expiresAt = "2026-08-22T13:00:00.001Z";
  assert.equal(
    inspect(withDigest(overlong)).code,
    "BETTER_STACK_STAGING_EVIDENCE_INVALID",
  );

  for (const environmentOverrides of [
    { APP_DEPLOYED_COMMIT_SHA: "f".repeat(40) },
    { APP_RELEASE_ID: `connect_release_v1_${"f".repeat(64)}` },
    { APP_DEPLOYMENT_ARTIFACT_DIGEST: fingerprint("f") },
  ]) {
    assert.equal(
      inspect(validEvidence(), environmentOverrides).code,
      "BETTER_STACK_STAGING_EVIDENCE_MISMATCH",
    );
  }
});

test("rejects evidence whose digest no longer matches its content", () => {
  const evidence = validEvidence();
  evidence.metrics[0].sampleCount = 13;

  assert.equal(
    inspect(evidence).code,
    "BETTER_STACK_STAGING_EVIDENCE_INVALID",
  );
});

test("readiness needs both implemented monitoring and verified live evidence", () => {
  const base = {
    clerk: "configured",
    systemAdmin: "configured",
    teamInvitationPolicy: "configured",
    teamInvitationBrowserEvidence: "configured",
    teamInvitationAcceptanceActivation: "configured",
    metaEmbeddedSignup: "configured",
    metaWebhook: "configured",
    knowledgeUploadPolicy: "configured",
    knowledgeScanRecovery: "configured",
    sloAlertPolicy: "configured",
    backupRestorePolicy: "configured",
    retentionPolicy: "configured",
    environmentIsolation: "configured",
    secretInventory: "configured",
    sourceControlGovernance: "configured",
    deploymentProvenance: "configured",
    ciExecution: "configured",
    dependencyAudit: "configured",
    betterStackStagingEvidence: "configured",
    betterStackIncidentAlerting: "configured",
    hosting: { d1: "DB", r2: "FILES" },
  };
  const implementation = {
    metaWebhookQueue: true,
    campaignDeliveryQueue: true,
    targetQueueAdapter: true,
    campaignScheduler: true,
    campaignDeliveryAdapter: true,
    botReplyDeliveryAdapter: true,
    aiProvider: true,
    billingProvider: true,
    rateLimitPolicy: true,
    fileScanner: true,
    monitoringAndAlerting: false,
    backupAndRestore: true,
    sloMeasurement: false,
    dataRetentionPolicy: true,
  };

  const blocked = inspectProductionReadiness({ ...base, implementation });
  assert.equal(
    blocked.checks.find((item) => item.id === "operations.monitoring-alerting")
      ?.status,
    "blocked",
  );
  assert.equal(
    blocked.checks.find((item) => item.id === "operations.slo-measurement")
      ?.status,
    "decision-required",
  );

  const evidenceMissing = inspectProductionReadiness({
    ...base,
    betterStackStagingEvidence: "incomplete",
    implementation: {
      ...implementation,
      monitoringAndAlerting: true,
      sloMeasurement: true,
    },
  });
  assert.equal(
    evidenceMissing.checks.find(
      (item) => item.id === "operations.monitoring-alerting",
    )?.status,
    "blocked",
  );

  const incidentAlertingMissing = inspectProductionReadiness({
    ...base,
    betterStackIncidentAlerting: "incomplete",
    implementation: {
      ...implementation,
      monitoringAndAlerting: true,
      sloMeasurement: true,
    },
  });
  assert.equal(
    incidentAlertingMissing.checks.find(
      (item) => item.id === "operations.monitoring-alerting",
    )?.status,
    "blocked",
  );
  assert.equal(
    incidentAlertingMissing.checks.find(
      (item) => item.id === "operations.slo-alert-policy",
    )?.status,
    "decision-required",
  );

  const ready = inspectProductionReadiness({
    ...base,
    implementation: {
      ...implementation,
      monitoringAndAlerting: true,
      sloMeasurement: true,
    },
  });
  assert.equal(
    ready.checks.find((item) => item.id === "operations.monitoring-alerting")
      ?.status,
    "ready",
  );
  assert.equal(
    ready.checks.find((item) => item.id === "operations.slo-measurement")
      ?.status,
    "ready",
  );
});
