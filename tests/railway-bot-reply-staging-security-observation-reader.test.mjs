import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import {
  createMetaCredentialVault,
} from "../server/meta/metaCredentialVault.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";
import {
  betterStackAlertRequirements,
  betterStackMetricRequirements,
  betterStackServiceRequirements,
  betterStackTraceRequirements,
  deriveBetterStackStagingEvidenceDigest,
} from "../server/operations/betterStackStagingEvidence.ts";
import {
  createRailwayBotReplyStagingSecurityObservationReader,
  RailwayBotReplyStagingSecurityObservationError,
} from "../server/platform/railwayBotReplyStagingSecurityObservationReader.ts";

const encryptionKey =
  "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const accessTokenValue = "fixture-system-user-access-token";
const runKey = `bot_reply_staging_run_v1_${"a".repeat(64)}`;
const operationKey = `bot_reply_staging_step_v1_${"b".repeat(64)}`;
const releaseId = `connect_release_v1_${"c".repeat(64)}`;
const commitSha = "d".repeat(40);
const artifactDigest = `sha256:${"e".repeat(64)}`;

const deterministicCrypto = Object.freeze({
  subtle: webcrypto.subtle,
  getRandomValues(array) {
    array.fill(7);
    return array;
  },
});

function fingerprint(character) {
  return `sha256:${character.repeat(64)}`;
}

function context(overrides = {}) {
  return {
    run: {
      runKey,
      targetTenantId: 7,
      expectedConnectionVersion: 3,
      expectedPolicyVersion: 4,
      releaseId,
      commitSha,
      artifactDigest,
      graphApiVersion: "v24.0",
      requestedAt: "2026-08-24T10:00:00.000Z",
      recipientFingerprint: fingerprint("f"),
      rateLimitMethodFingerprint: fingerprint("1"),
      actorExternalUserId: "system-admin-primary",
      ...overrides.run,
    },
    claim: {
      runKey,
      auditKey: `bot_reply_staging_audit_v1_${"2".repeat(64)}`,
      claimVersion: 2,
      leaseExpiresAt: "2026-08-24T10:10:00.000Z",
      ...overrides.claim,
    },
    operationKey,
    deliveryKey: `bot_reply_delivery_v1_${"3".repeat(64)}`,
    ...overrides.step,
  };
}

function withDigest(value) {
  return {
    ...value,
    evidenceDigest: deriveBetterStackStagingEvidenceDigest(value),
  };
}

function validTelemetryEvidence(overrides = {}) {
  return withDigest({
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
    retentionPolicyDigest: fingerprint("c"),
    costPolicyDigest: fingerprint("d"),
    outageRehearsal: {
      status: "passed",
      startedAt: "2026-08-24T09:30:00.000Z",
      completedAt: "2026-08-24T09:40:00.000Z",
      businessImpact: "none",
    },
    ...overrides,
  });
}

function credentialRepository() {
  let envelope = null;
  return {
    async store(input) {
      envelope = {
        ...structuredClone(input),
        createdAt: "2026-08-24T09:00:00.000Z",
        updatedAt: "2026-08-24T09:00:00.000Z",
      };
    },
    async findByTenantId(tenantId) {
      return envelope?.tenantId === tenantId
        ? structuredClone(envelope)
        : null;
    },
    replace(value) {
      envelope = value;
    },
    current() {
      return structuredClone(envelope);
    },
  };
}

async function fixture({
  evidence = validTelemetryEvidence(),
  now = "2026-08-24T10:05:00.000Z",
  environmentOverrides = {},
} = {}) {
  const credentials = credentialRepository();
  const environment = {
    META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    APP_RELEASE_ID: releaseId,
    APP_DEPLOYED_COMMIT_SHA: commitSha,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: artifactDigest,
    BETTER_STACK_STAGING_EVIDENCE_JSON: JSON.stringify(evidence),
    ...environmentOverrides,
  };
  const vault = createMetaCredentialVault(
    credentials,
    environment,
    { crypto: deterministicCrypto },
  );
  await vault.storeAccessToken(
    7,
    toSensitiveMetaAccessToken(accessTokenValue),
  );
  const reader = createRailwayBotReplyStagingSecurityObservationReader({
    environment,
    credentials,
    clock: { now: () => new Date(now) },
    credentialVaultOptions: { crypto: deterministicCrypto },
  });
  return { credentials, environment, reader };
}

test("binds encrypted credential and verified redaction evidence to one staging run", async () => {
  const { credentials, reader } = await fixture();
  const credential = await reader.readCredentialBoundary(context());
  const redaction = await reader.readRedaction(context());

  assert.equal(reader.isConfigured(), true);
  assert.deepEqual(credential, {
    schemaVersion: 1,
    runKey,
    operationKey,
    targetTenantId: 7,
    connectionVersion: 3,
    policyVersion: 4,
    releaseId,
    commitSha,
    artifactDigest,
    graphApiVersion: "v24.0",
    observedAt: "2026-08-24T10:05:00.000Z",
    source: "encrypted-vault-audit",
    plaintextExposureFindings: 0,
    recordDigest: credential.recordDigest,
  });
  assert.match(credential.recordDigest, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(redaction, {
    schemaVersion: 1,
    runKey,
    operationKey,
    targetTenantId: 7,
    connectionVersion: 3,
    policyVersion: 4,
    releaseId,
    commitSha,
    artifactDigest,
    graphApiVersion: "v24.0",
    observedAt: "2026-08-24T10:02:00.000Z",
    source: "durable-telemetry-audit",
    testedFieldCount: 16,
    findings: 0,
    recordDigest: redaction.recordDigest,
  });
  assert.match(redaction.recordDigest, /^sha256:[a-f0-9]{64}$/);
  const serialized = JSON.stringify({ credential, redaction });
  assert.equal(serialized.includes(accessTokenValue), false);
  assert.equal(serialized.includes(credentials.current().ciphertext), false);
  assert.equal(serialized.includes("BETTER_STACK_STAGING_EVIDENCE_JSON"), false);
});

test("rejects missing, extended, cross-tenant, and future credential envelopes", async () => {
  for (const mutate of [
    () => null,
    (value) => ({ ...value, accessToken: accessTokenValue }),
    (value) => ({ ...value, tenantId: 8 }),
    (value) => ({ ...value, updatedAt: "2026-08-24T10:06:00.000Z" }),
  ]) {
    const { credentials, reader } = await fixture();
    credentials.replace(mutate(credentials.current()));
    await assert.rejects(
      reader.readCredentialBoundary(context()),
      (error) =>
        error instanceof RailwayBotReplyStagingSecurityObservationError &&
        error.code === "BOT_REPLY_STAGING_SECURITY_CREDENTIAL_INVALID" &&
        !error.message.includes(accessTokenValue),
    );
  }
});

test("fails closed for missing, expired, mismatched, or pre-run telemetry evidence", async () => {
  const missing = await fixture({
    environmentOverrides: { BETTER_STACK_STAGING_EVIDENCE_JSON: "" },
  });
  assert.equal(missing.reader.isConfigured(), false);
  await assert.rejects(
    missing.reader.readRedaction(context()),
    (error) =>
      error instanceof RailwayBotReplyStagingSecurityObservationError &&
      error.code === "BOT_REPLY_STAGING_SECURITY_TELEMETRY_INVALID",
  );

  const expired = await fixture({ now: "2026-08-25T10:02:00.000Z" });
  assert.equal(expired.reader.isConfigured(), false);

  const mismatch = await fixture({
    environmentOverrides: {
      APP_DEPLOYED_COMMIT_SHA: "e".repeat(40),
    },
  });
  assert.equal(mismatch.reader.isConfigured(), false);
  await assert.rejects(
    mismatch.reader.readRedaction(context()),
    (error) =>
      error instanceof RailwayBotReplyStagingSecurityObservationError &&
      error.code === "BOT_REPLY_STAGING_SECURITY_CONTEXT_INVALID",
  );

  const beforeRun = validTelemetryEvidence({
    verifiedAt: "2026-08-24T09:59:59.999Z",
    expiresAt: "2026-08-25T09:59:59.999Z",
  });
  const stale = await fixture({ evidence: beforeRun });
  await assert.rejects(
    stale.reader.readRedaction(context()),
    (error) =>
      error instanceof RailwayBotReplyStagingSecurityObservationError &&
      error.code === "BOT_REPLY_STAGING_SECURITY_TELEMETRY_INVALID",
  );
});

test("rejects a context outside the lease and invalid encryption configuration", async () => {
  const { reader } = await fixture({ now: "2026-08-24T10:10:00.001Z" });
  await assert.rejects(
    reader.readCredentialBoundary(context()),
    (error) =>
      error instanceof RailwayBotReplyStagingSecurityObservationError &&
      error.code === "BOT_REPLY_STAGING_SECURITY_CONTEXT_INVALID",
  );

  const configured = await fixture();
  assert.throws(
    () => createRailwayBotReplyStagingSecurityObservationReader({
      environment: {
        ...configured.environment,
        META_CREDENTIAL_ENCRYPTION_KEY_V1: "invalid",
      },
      credentials: configured.credentials,
      clock: { now: () => new Date("2026-08-24T10:05:00.000Z") },
      credentialVaultOptions: { crypto: deterministicCrypto },
    }),
    (error) =>
      error instanceof RailwayBotReplyStagingSecurityObservationError &&
      error.code === "BOT_REPLY_STAGING_SECURITY_CONFIGURATION_INVALID",
  );
});
