import assert from "node:assert/strict";
import test from "node:test";

import {
  botReplyStagingEvidencePolicyVersion,
  botReplyStagingScenarioRequirements,
  deriveBotReplyStagingEvidenceDigest,
  inspectBotReplyStagingEvidence,
} from "../server/operations/botReplyStagingEvidence.ts";
import {
  inspectProductionReadiness,
} from "../server/operations/productionReadiness.ts";

const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const now = new Date("2026-08-21T13:30:00.000Z");

function fingerprint(character) {
  return `sha256:${character.repeat(64)}`;
}

function withDigest(value) {
  const evidence = { ...value };
  delete evidence.evidenceDigest;
  return {
    ...evidence,
    evidenceDigest: deriveBotReplyStagingEvidenceDigest(evidence),
  };
}

function validEvidence() {
  return withDigest({
    schemaVersion: 1,
    policyVersion: botReplyStagingEvidencePolicyVersion,
    environment: "staging",
    provider: "meta-whatsapp-cloud-api",
    connectionMode: "approved-staging-waba",
    graphApiVersion: "v24.0",
    verifiedAt: "2026-08-21T13:00:00.000Z",
    expiresAt: "2026-08-22T13:00:00.000Z",
    releaseId,
    commitSha,
    artifactDigest,
    appFingerprint: fingerprint("0"),
    wabaFingerprint: fingerprint("1"),
    phoneNumberFingerprint: fingerprint("2"),
    scenarios: botReplyStagingScenarioRequirements.map(
      (requirement, index) => ({
        ...requirement,
        status: "passed",
        observedAt: "2026-08-21T12:30:00.000Z",
        evidenceFingerprint: fingerprint(String(index + 3)),
      }),
    ),
    rateLimits: {
      throughput: {
        messagesPerSecond: 80,
        source: "graph-api",
        observedAt: "2026-08-21T12:31:00.000Z",
        evidenceFingerprint: fingerprint("a"),
      },
      providerRetry: {
        status: "passed",
        providerErrorCode: 130429,
        retryAfterSeconds: 12,
        cooldownScope: "sender",
        observedAt: "2026-08-21T12:32:00.000Z",
        evidenceFingerprint: fingerprint("b"),
      },
      pairLimit: {
        status: "passed",
        providerErrorCode: 131056,
        cooldownScope: "pair",
        backoffPolicy: "meta-4-power-x",
        observedAt: "2026-08-21T12:33:00.000Z",
        evidenceFingerprint: fingerprint("c"),
      },
    },
    killSwitch: {
      status: "passed",
      providerRequestCount: 0,
      observedAt: "2026-08-21T12:34:00.000Z",
      evidenceFingerprint: fingerprint("d"),
    },
    duplicateSafety: {
      status: "passed",
      queueDeliveryCount: 2,
      providerRequestCount: 1,
      observedAt: "2026-08-21T12:35:00.000Z",
      evidenceFingerprint: fingerprint("e"),
    },
    credentialBoundary: {
      source: "encrypted-vault",
      plaintextExposureFindings: 0,
      observedAt: "2026-08-21T12:36:00.000Z",
      evidenceFingerprint: fingerprint("f"),
    },
    redaction: {
      testedFieldCount: 16,
      findings: 0,
      observedAt: "2026-08-21T12:37:00.000Z",
      evidenceFingerprint: fingerprint("7"),
    },
  });
}

function inspect(value, overrides = {}, clock = now) {
  return inspectBotReplyStagingEvidence({
    APP_DEPLOYED_COMMIT_SHA: commitSha,
    APP_RELEASE_ID: releaseId,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: artifactDigest,
    BOT_REPLY_STAGING_EVIDENCE_JSON: JSON.stringify(value),
    ...overrides,
  }, clock);
}

function readyInput(overrides = {}) {
  return {
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
    botReplyStagingEvidence: "configured",
    botReplyStagingCrossServiceEvidence: "configured",
    betterStackIncidentAlerting: "configured",
    hosting: { d1: "DB", r2: "FILES" },
    implementation: {
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
      monitoringAndAlerting: true,
      backupAndRestore: true,
      sloMeasurement: true,
      dataRetentionPolicy: true,
    },
    ...overrides,
  };
}

test("verifies one release-bound Bot reply staging evidence", () => {
  const report = inspect(validEvidence());

  assert.deepEqual(report, {
    status: "configured",
    code: "BOT_REPLY_STAGING_EVIDENCE_VERIFIED",
    releaseId,
    commitSha,
    artifactDigest,
    verifiedAt: "2026-08-21T13:00:00.000Z",
    expiresAt: "2026-08-22T13:00:00.000Z",
    graphApiVersion: "v24.0",
    scenarioCount: 7,
    messagesPerSecond: 80,
  });
  assert.ok(Object.isFrozen(report));
  assert.doesNotMatch(
    JSON.stringify(report),
    /tenant|phoneNumber|waba|appFingerprint|token|payload/i,
  );
});

test("requires bounded exact evidence without raw provider identity", () => {
  assert.equal(
    inspectBotReplyStagingEvidence({}).code,
    "BOT_REPLY_STAGING_EVIDENCE_REQUIRED",
  );
  assert.equal(
    inspectBotReplyStagingEvidence({
      BOT_REPLY_STAGING_EVIDENCE_JSON: "{broken",
    }).code,
    "BOT_REPLY_STAGING_EVIDENCE_INVALID",
  );
  assert.equal(
    inspectBotReplyStagingEvidence({
      BOT_REPLY_STAGING_EVIDENCE_JSON: "x".repeat(48_001),
    }).code,
    "BOT_REPLY_STAGING_EVIDENCE_INVALID",
  );

  for (const forbiddenField of [
    "accessToken",
    "phoneNumberId",
    "wabaId",
    "tenantId",
    "payload",
  ]) {
    const evidence = validEvidence();
    evidence[forbiddenField] = "forbidden";
    assert.equal(
      inspect(evidence).code,
      "BOT_REPLY_STAGING_EVIDENCE_INVALID",
    );
  }
});

test("requires every live provider scenario in deterministic order", () => {
  const missing = validEvidence();
  missing.scenarios.pop();

  const reordered = validEvidence();
  [reordered.scenarios[0], reordered.scenarios[1]] =
    [reordered.scenarios[1], reordered.scenarios[0]];

  const wrongError = validEvidence();
  wrongError.scenarios[6].providerErrorCode = null;

  for (const evidence of [missing, reordered, wrongError]) {
    assert.equal(
      inspect(withDigest(evidence)).code,
      "BOT_REPLY_STAGING_EVIDENCE_INVALID",
    );
  }
});

test("rejects invented or unsafe rate-limit and delivery proofs", () => {
  const invalidThroughput = validEvidence();
  invalidThroughput.rateLimits.throughput.messagesPerSecond = 100;

  const missingRetry = validEvidence();
  missingRetry.rateLimits.providerRetry.retryAfterSeconds = 0;

  const wrongPairScope = validEvidence();
  wrongPairScope.rateLimits.pairLimit.cooldownScope = "sender";

  const leakingKillSwitch = validEvidence();
  leakingKillSwitch.killSwitch.providerRequestCount = 1;

  const duplicateSubmit = validEvidence();
  duplicateSubmit.duplicateSafety.providerRequestCount = 2;

  const plaintextCredential = validEvidence();
  plaintextCredential.credentialBoundary.plaintextExposureFindings = 1;

  const failedRedaction = validEvidence();
  failedRedaction.redaction.findings = 1;

  for (const evidence of [
    invalidThroughput,
    missingRetry,
    wrongPairScope,
    leakingKillSwitch,
    duplicateSubmit,
    plaintextCredential,
    failedRedaction,
  ]) {
    assert.equal(
      inspect(withDigest(evidence)).code,
      "BOT_REPLY_STAGING_EVIDENCE_INVALID",
    );
  }
});

test("separates future, expiry, release mismatch and stale observations", () => {
  assert.equal(
    inspect(
      validEvidence(),
      {},
      new Date("2026-08-21T12:59:59.999Z"),
    ).code,
    "BOT_REPLY_STAGING_EVIDENCE_NOT_YET_VALID",
  );
  assert.equal(
    inspect(
      validEvidence(),
      {},
      new Date("2026-08-22T13:00:00.000Z"),
    ).code,
    "BOT_REPLY_STAGING_EVIDENCE_EXPIRED",
  );

  for (const overrides of [
    { APP_DEPLOYED_COMMIT_SHA: "d".repeat(40) },
    { APP_RELEASE_ID: `connect_release_v1_${"d".repeat(64)}` },
    { APP_DEPLOYMENT_ARTIFACT_DIGEST: fingerprint("d") },
  ]) {
    assert.equal(
      inspect(validEvidence(), overrides).code,
      "BOT_REPLY_STAGING_EVIDENCE_MISMATCH",
    );
  }

  const stale = validEvidence();
  stale.scenarios[0].observedAt = "2026-08-20T12:59:59.999Z";
  assert.equal(
    inspect(withDigest(stale)).code,
    "BOT_REPLY_STAGING_EVIDENCE_INVALID",
  );
});

test("rejects a changed evidence digest", () => {
  const evidence = validEvidence();
  evidence.rateLimits.providerRetry.retryAfterSeconds = 13;
  assert.equal(
    inspect(evidence).code,
    "BOT_REPLY_STAGING_EVIDENCE_INVALID",
  );
});

test("keeps the production gate closed unless code and live evidence agree", () => {
  const implementationOnly = inspectProductionReadiness(
    readyInput({ botReplyStagingEvidence: "incomplete" }),
  );
  assert.equal(
    implementationOnly.checks.find(
      (check) => check.id === "automation.bot-reply-adapter",
    )?.status,
    "blocked",
  );

  const evidenceOnlyInput = readyInput();
  evidenceOnlyInput.implementation = {
    ...evidenceOnlyInput.implementation,
    botReplyDeliveryAdapter: false,
  };
  const evidenceOnly = inspectProductionReadiness(evidenceOnlyInput);
  assert.equal(
    evidenceOnly.checks.find(
      (check) => check.id === "automation.bot-reply-adapter",
    )?.status,
    "blocked",
  );

  const crossServiceEvidenceMissing = inspectProductionReadiness(
    readyInput({ botReplyStagingCrossServiceEvidence: "incomplete" }),
  );
  assert.equal(
    crossServiceEvidenceMissing.checks.find(
      (check) => check.id === "automation.bot-reply-adapter",
    )?.status,
    "blocked",
  );

  const both = inspectProductionReadiness(readyInput());
  assert.equal(
    both.checks.find(
      (check) => check.id === "automation.bot-reply-adapter",
    )?.status,
    "ready",
  );
});
