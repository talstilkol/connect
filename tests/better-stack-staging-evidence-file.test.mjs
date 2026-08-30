import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import {
  tmpdir,
} from "node:os";
import {
  join,
} from "node:path";
import test from "node:test";

import {
  betterStackAlertRequirements,
  betterStackMetricRequirements,
  betterStackServiceRequirements,
  betterStackTraceRequirements,
  deriveBetterStackStagingEvidenceDigest,
} from "../server/operations/betterStackStagingEvidence.ts";
import {
  BetterStackStagingEvidenceFileError,
  betterStackStagingEvidenceVerificationDependencies,
  verifyBetterStackStagingEvidenceFile,
} from "../scripts/verify-better-stack-staging-evidence.mjs";

const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const testRoot = join(
  tmpdir(),
  "connect-better-stack-staging-evidence-tests",
  String(process.pid),
);
let ordinal = 0;

function fingerprint(character) {
  return `sha256:${character.repeat(64)}`;
}

function evidence(overrides = {}) {
  const value = {
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
      sampleCount: 10,
      seriesCount: 2,
    })),
    redaction: { testedFieldCount: 12, findings: 0 },
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
    ...overrides,
  };
  return {
    ...value,
    evidenceDigest: deriveBetterStackStagingEvidenceDigest(value),
  };
}

async function createEvidenceFile(value = evidence()) {
  ordinal += 1;
  const directory = join(testRoot, String(ordinal));
  const filePath = join(directory, "better-stack-staging-evidence.json");
  const text = `${JSON.stringify(value)}\n`;
  await mkdir(directory, { recursive: true });
  await writeFile(filePath, text, { mode: 0o644 });
  return { directory, filePath, text };
}

function configuration(file, overrides = {}) {
  return {
    filePath: file.filePath,
    releaseManifest: {
      schemaVersion: 1,
      releaseId,
      commitSha,
    },
    artifactDigest,
    clock: () => new Date("2026-08-21T14:00:00.000Z"),
    dependencies: betterStackStagingEvidenceVerificationDependencies,
    ...overrides,
  };
}

function expectsError(code) {
  return (error) =>
    error instanceof BetterStackStagingEvidenceFileError &&
    error.code === code && error.message === code;
}

test.after(async () => {
  await rm(testRoot, { recursive: true, force: true });
});

test("verifies one trusted current-release Better Stack evidence file", async () => {
  const file = await createEvidenceFile();
  const result = await verifyBetterStackStagingEvidenceFile(
    configuration(file),
  );

  assert.equal(result.releaseId, releaseId);
  assert.equal(result.commitSha, commitSha);
  assert.equal(result.artifactDigest, artifactDigest);
  assert.equal(result.serviceCount, 3);
  assert.equal(result.traceScenarioCount, 5);
  assert.equal(result.metricCount, 6);
  assert.equal(result.alertTestCount, 2);
  assert.match(result.evidenceFileDigest, /^sha256:[a-f0-9]{64}$/);
  assert.doesNotMatch(
    JSON.stringify(result),
    /endpoint|token|tenant|traceId|sourceId/i,
  );
  assert.ok(Object.isFrozen(result));
});

test("rejects symbolic links and group-writable evidence", async () => {
  const writable = await createEvidenceFile();
  await chmod(writable.filePath, 0o664);
  await assert.rejects(
    verifyBetterStackStagingEvidenceFile(configuration(writable)),
    expectsError("BETTER_STACK_STAGING_EVIDENCE_FILE_INVALID"),
  );

  const linked = await createEvidenceFile();
  const linkPath = join(linked.directory, "linked-evidence.json");
  await symlink(linked.filePath, linkPath);
  await assert.rejects(
    verifyBetterStackStagingEvidenceFile(configuration({
      ...linked,
      filePath: linkPath,
    })),
    expectsError("BETTER_STACK_STAGING_EVIDENCE_FILE_INVALID"),
  );
});

test("separates release, artifact, future and expiry failures", async () => {
  const file = await createEvidenceFile();
  const cases = [
    [
      {
        releaseManifest: {
          schemaVersion: 1,
          releaseId: `connect_release_v1_${"e".repeat(64)}`,
          commitSha,
        },
      },
      "BETTER_STACK_STAGING_EVIDENCE_RELEASE_MISMATCH",
    ],
    [
      { artifactDigest: fingerprint("f") },
      "BETTER_STACK_STAGING_EVIDENCE_ARTIFACT_MISMATCH",
    ],
    [
      { clock: () => new Date("2026-08-21T12:59:59.999Z") },
      "BETTER_STACK_STAGING_EVIDENCE_NOT_YET_VALID",
    ],
    [
      { clock: () => new Date("2026-08-22T13:00:00.000Z") },
      "BETTER_STACK_STAGING_EVIDENCE_EXPIRED",
    ],
  ];

  for (const [overrides, code] of cases) {
    await assert.rejects(
      verifyBetterStackStagingEvidenceFile(configuration(file, overrides)),
      expectsError(code),
    );
  }
});

test("rejects malformed, oversized and structurally invalid evidence", async () => {
  const malformed = await createEvidenceFile();
  await writeFile(malformed.filePath, "{broken\n", { mode: 0o644 });
  await assert.rejects(
    verifyBetterStackStagingEvidenceFile(configuration(malformed)),
    expectsError("BETTER_STACK_STAGING_EVIDENCE_INVALID"),
  );

  const invalid = await createEvidenceFile(evidence({ environment: "production" }));
  await assert.rejects(
    verifyBetterStackStagingEvidenceFile(configuration(invalid)),
    expectsError("BETTER_STACK_STAGING_EVIDENCE_INVALID"),
  );

  const oversized = await createEvidenceFile();
  await writeFile(oversized.filePath, "x".repeat(48_001), { mode: 0o644 });
  await assert.rejects(
    verifyBetterStackStagingEvidenceFile(configuration(oversized)),
    expectsError("BETTER_STACK_STAGING_EVIDENCE_FILE_INVALID"),
  );
});

test("rejects invalid configuration before reading a file", async () => {
  let reads = 0;
  await assert.rejects(
    verifyBetterStackStagingEvidenceFile({
      filePath: "relative.json",
      releaseManifest: { schemaVersion: 1, releaseId, commitSha },
      artifactDigest,
      clock: () => new Date(),
      dependencies: {
        async readTrustedEvidenceFile() {
          reads += 1;
        },
      },
    }),
    expectsError("BETTER_STACK_STAGING_EVIDENCE_CONFIGURATION_INVALID"),
  );
  assert.equal(reads, 0);
});
