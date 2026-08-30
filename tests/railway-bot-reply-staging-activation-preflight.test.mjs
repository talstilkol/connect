import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  betterStackAlertRequirements,
  betterStackMetricRequirements,
  betterStackServiceRequirements,
  betterStackTraceRequirements,
  deriveBetterStackStagingEvidenceDigest,
} from "../server/operations/betterStackStagingEvidence.ts";
import {
  inspectRailwayBotReplyStagingActivation,
  railwayBotReplyStagingActivationPreflightVersion,
} from "../server/platform/railwayBotReplyStagingActivationPreflight.ts";

const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const hmacKey = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const graphApiVersion = "v24.0";
const now = "2026-08-24T10:05:00.000Z";
const caseRequirements = [
  ["text-send", "text-send"],
  ["button-send", "button-send"],
  ["button-reply", "button-send"],
  ["status-sent", "button-send"],
  ["status-delivered", "button-send"],
  ["status-read", "button-send"],
  ["customer-window-expired", "customer-window-expired"],
  ["provider-retry", "provider-retry"],
  ["pair-limit", "pair-limit"],
  ["duplicate-safety", "duplicate-safety"],
  ["kill-switch", "kill-switch"],
];

function fingerprint(character) {
  return `sha256:${character.repeat(64)}`;
}

function delivery(index, buttons = false) {
  const digit = ((index % 9) + 1).toString();
  return {
    conversationKey: `conversation_v1_${digit.repeat(64)}`,
    inboundMessageKey: `message_v1_${digit.repeat(64)}`,
    botFlowKey: `bot_flow_v1_${digit.repeat(64)}`,
    botFlowVersionKey: `bot_flow_version_v1_${digit.repeat(64)}`,
    replyIndex: index + 1,
    senderPhoneNumberId: "123456789",
    reply: buttons
      ? {
          kind: "buttons",
          text: "בדיקה מאושרת",
          options: [{
            optionKey: `bot_option_v1_${"f".repeat(64)}`,
            label: "אישור",
          }],
        }
      : { kind: "text", text: `בדיקה מאושרת ${index + 1}` },
  };
}

function privateCases() {
  const buttonDelivery = delivery(1, true);
  return caseRequirements.map(([caseName, subjectCaseName], index) => ({
    caseName,
    subjectCaseName,
    recipientPhoneNumber: "+972501111111",
    delivery: subjectCaseName === "button-send"
      ? structuredClone(buttonDelivery)
      : delivery(index),
  }));
}

function evidenceWithDigest(value) {
  return {
    ...value,
    evidenceDigest: deriveBetterStackStagingEvidenceDigest(value),
  };
}

function telemetryEvidence() {
  return evidenceWithDigest({
    schemaVersion: 1,
    policyVersion: 1,
    environment: "staging",
    provider: "better-stack",
    protocol: "otlp-http",
    verifiedAt: "2026-08-24T10:02:00.000Z",
    expiresAt: "2026-08-25T10:02:00.000Z",
    releaseId,
    commitSha,
    artifactDigest,
    sourceFingerprint: fingerprint("4"),
    services: betterStackServiceRequirements.map((item) => ({ ...item })),
    traces: betterStackTraceRequirements.map((item, index) => ({
      ...item,
      status: "passed",
      traceFingerprint: fingerprint("56789"[index]),
    })),
    metrics: betterStackMetricRequirements.map((metricName) => ({
      metricName,
      sampleCount: 12,
      seriesCount: 3,
    })),
    redaction: { testedFieldCount: 16, findings: 0 },
    alerts: betterStackAlertRequirements.map((scenario, index) => ({
      scenario,
      status: "delivered",
      triggeredAt: `2026-08-24T09:${index}0:00.000Z`,
      deliveredAt: `2026-08-24T09:${index}1:00.000Z`,
      deliveryFingerprint: fingerprint("ab"[index]),
    })),
    retentionPolicyDigest: fingerprint("e"),
    costPolicyDigest: fingerprint("d"),
    outageRehearsal: {
      status: "passed",
      startedAt: "2026-08-24T09:30:00.000Z",
      completedAt: "2026-08-24T09:40:00.000Z",
      businessImpact: "none",
    },
  });
}

function environment(overrides = {}) {
  const inventory = {
    schemaVersion: 1,
    source: "private-staging-inventory",
    environment: "staging",
    releaseId,
    commitSha,
    artifactDigest,
    graphApiVersion,
    targetTenantId: 7,
    connectionVersion: 3,
    policyVersion: 4,
    preparedAt: "2026-08-24T09:30:00.000Z",
    expiresAt: "2026-08-24T11:00:00.000Z",
    cases: privateCases(),
  };
  return {
    BOT_REPLY_STAGING_ENABLED: "true",
    APP_RUNTIME_ENVIRONMENT: "staging",
    APP_RELEASE_ID: releaseId,
    APP_DEPLOYED_COMMIT_SHA: commitSha,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: artifactDigest,
    META_APP_ID: "123456789",
    META_APP_SECRET: "fixture-app-secret",
    META_GRAPH_API_VERSION: graphApiVersion,
    META_CREDENTIAL_ENCRYPTION_KEY_V1: hmacKey,
    BOT_REPLY_STAGING_TENANT_ID: "7",
    BOT_REPLY_STAGING_PRIVATE_CASES_JSON: JSON.stringify(inventory),
    BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1: hmacKey,
    BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1: hmacKey,
    BETTER_STACK_STAGING_EVIDENCE_JSON:
      JSON.stringify(telemetryEvidence()),
    ...overrides,
  };
}

const clock = Object.freeze({ now: () => new Date(now) });

test("quarantines legacy execution even when every diagnostic check passes", () => {
  const candidate = environment();
  const result = inspectRailwayBotReplyStagingActivation(candidate, clock);

  assert.deepEqual(result, {
    schemaVersion: 2,
    preflightVersion: railwayBotReplyStagingActivationPreflightVersion,
    activationAllowed: false,
    status: "quarantined",
    code: "BOT_REPLY_STAGING_LEGACY_EXECUTION_QUARANTINED",
    passedCheckCount: 7,
    requiredCheckCount: 7,
    checks: [
      { id: "runtime-environment", status: "passed" },
      { id: "private-case-inventory", status: "passed" },
      { id: "recipient-fingerprint", status: "passed" },
      { id: "observation-proof", status: "passed" },
      { id: "meta-graph", status: "passed" },
      { id: "credential-encryption", status: "passed" },
      { id: "telemetry-evidence", status: "passed" },
    ],
  });
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    candidate.META_APP_SECRET,
    candidate.BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1,
    "+972501111111",
    "123456789",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("reports only bounded check identities when activation is incomplete", () => {
  for (const [overrides, expectedCheck] of [
    [{ APP_RUNTIME_ENVIRONMENT: "production" }, "runtime-environment"],
    [{ BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1: "invalid" }, "observation-proof"],
    [{ META_APP_SECRET: "" }, "meta-graph"],
    [{ META_CREDENTIAL_ENCRYPTION_KEY_V1: "invalid" }, "credential-encryption"],
    [{ BETTER_STACK_STAGING_EVIDENCE_JSON: "" }, "telemetry-evidence"],
  ]) {
    const result = inspectRailwayBotReplyStagingActivation(
      environment(overrides),
      clock,
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.activationAllowed, false);
    assert.equal(result.code, "BOT_REPLY_STAGING_ACTIVATION_REQUIRED");
    assert.equal(
      result.checks.find((check) => check.id === expectedCheck)?.status,
      "blocked",
    );
  }
});

test("keeps disabled separate from an invalid opt-in", () => {
  for (const value of [undefined, "", "false"]) {
    const result = inspectRailwayBotReplyStagingActivation(
      environment({ BOT_REPLY_STAGING_ENABLED: value }),
      clock,
    );
    assert.equal(result.status, "disabled");
    assert.equal(result.activationAllowed, false);
    assert.equal(result.passedCheckCount, 0);
    assert.deepEqual(result.checks, []);
  }
  const invalid = inspectRailwayBotReplyStagingActivation(
    environment({ BOT_REPLY_STAGING_ENABLED: "yes" }),
    clock,
  );
  assert.equal(invalid.status, "blocked");
  assert.equal(invalid.activationAllowed, false);
  assert.equal(invalid.checks.length, 7);
});

test("CLI fails closed without printing environment or secret values", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/verify-bot-reply-staging-activation.mjs"],
    {
      cwd: new URL("../", import.meta.url),
      env: {},
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "disabled");
  assert.equal(report.activationAllowed, false);
  assert.equal(report.code, "BOT_REPLY_STAGING_ACTIVATION_DISABLED");
  assert.equal(result.stderr, "");
  assert.doesNotMatch(result.stdout, /token|secret|recipient|phone|payload/i);
});
