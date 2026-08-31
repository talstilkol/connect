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
  QUEUE_ADAPTER_REQUIREMENTS,
  queueAdapterAcceptancePolicyVersion,
} from "../shared/domain/queueAdapterAcceptance.ts";
import {
  QueueAdapterEvidenceFileError,
  queueAdapterEvidenceVerificationDependencies,
  verifyQueueAdapterEvidenceFile,
} from "../scripts/verify-queue-adapter-evidence.mjs";

const commitSha = "c".repeat(40);
const artifactDigest = `sha256:${"d".repeat(64)}`;
const testRoot = join(
  tmpdir(),
  "connect-queue-adapter-evidence-tests",
  String(process.pid),
);
let ordinal = 0;

function queueProof(requirement) {
  return {
    queueId: requirement.queueId,
    provider: "approved-provider",
    adapterVersion: "1.0.0",
    deliverySemantics: "at-least-once",
    maximumBatchSize: requirement.maximumBatchSize,
    maximumRetries: requirement.maximumRetries,
    explicitAcknowledgement: true,
    deadLetterQueue: true,
    preservesMessageBody: true,
    delayedRetry: requirement.minimumDelayedRetrySeconds === 0
      ? { supported: false, maximumSeconds: null }
      : {
          supported: true,
          maximumSeconds: requirement.minimumDelayedRetrySeconds,
        },
    duplicateDeliveryTest: "passed",
    poisonMessageDeadLetterTest: "passed",
    outageRecoveryTest: "passed",
    payloadRoundTripTest: "passed",
    acknowledgementIsolationTest: "passed",
  };
}

function evidence(overrides = {}) {
  return {
    schemaVersion: 1,
    policyVersion: queueAdapterAcceptancePolicyVersion,
    environment: "staging",
    commitSha,
    verifiedAt: "2026-08-21T13:00:00.000Z",
    expiresAt: "2026-08-22T13:00:00.000Z",
    artifactDigest,
    queues: QUEUE_ADAPTER_REQUIREMENTS.map(queueProof),
    ...overrides,
  };
}

async function createEvidenceFile(value = evidence()) {
  ordinal += 1;
  const directory = join(testRoot, String(ordinal));
  const filePath = join(
    directory,
    "queue-adapter-acceptance-evidence.json",
  );
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
      commitSha,
    },
    artifactDigest,
    clock: () => new Date("2026-08-21T14:00:00.000Z"),
    dependencies: queueAdapterEvidenceVerificationDependencies,
    ...overrides,
  };
}

function expectsError(code) {
  return (error) =>
    error instanceof QueueAdapterEvidenceFileError &&
    error.code === code && error.message === code;
}

test.after(async () => {
  await rm(testRoot, { recursive: true, force: true });
});

test("verifies one trusted current-release staging evidence file", async () => {
  const file = await createEvidenceFile();
  const result = await verifyQueueAdapterEvidenceFile(configuration(file));

  assert.equal(result.commitSha, commitSha);
  assert.equal(result.artifactDigest, artifactDigest);
  assert.equal(result.queueCount, 4);
  assert.equal(result.verifiedAt, "2026-08-21T13:00:00.000Z");
  assert.equal(result.expiresAt, "2026-08-22T13:00:00.000Z");
  assert.match(result.evidenceFileDigest, /^sha256:[a-f0-9]{64}$/);
  assert.doesNotMatch(
    JSON.stringify(result),
    /provider|resource|account|queueId/i,
  );
  assert.ok(Object.isFrozen(result));
});

test("rejects symbolic links and group-writable evidence", async () => {
  const writable = await createEvidenceFile();
  await chmod(writable.filePath, 0o664);
  await assert.rejects(
    verifyQueueAdapterEvidenceFile(configuration(writable)),
    expectsError("QUEUE_ADAPTER_EVIDENCE_FILE_INVALID"),
  );

  const linked = await createEvidenceFile();
  const linkPath = join(linked.directory, "linked-evidence.json");
  await symlink(linked.filePath, linkPath);
  await assert.rejects(
    verifyQueueAdapterEvidenceFile(configuration({
      ...linked,
      filePath: linkPath,
    })),
    expectsError("QUEUE_ADAPTER_EVIDENCE_FILE_INVALID"),
  );
});

test("separates release, artifact, future and expiry failures", async () => {
  const file = await createEvidenceFile();
  const cases = [
    [
      { releaseManifest: { schemaVersion: 1, commitSha: "e".repeat(40) } },
      "QUEUE_ADAPTER_EVIDENCE_RELEASE_MISMATCH",
    ],
    [
      { artifactDigest: `sha256:${"f".repeat(64)}` },
      "QUEUE_ADAPTER_EVIDENCE_ARTIFACT_MISMATCH",
    ],
    [
      { clock: () => new Date("2026-08-21T12:59:59.999Z") },
      "QUEUE_ADAPTER_EVIDENCE_NOT_YET_VALID",
    ],
    [
      { clock: () => new Date("2026-08-22T13:00:00.000Z") },
      "QUEUE_ADAPTER_EVIDENCE_EXPIRED",
    ],
  ];

  for (const [overrides, code] of cases) {
    await assert.rejects(
      verifyQueueAdapterEvidenceFile(configuration(file, overrides)),
      expectsError(code),
    );
  }
});

test("rejects malformed, oversized and structurally invalid evidence", async () => {
  const malformed = await createEvidenceFile();
  await writeFile(malformed.filePath, "{broken\n", { mode: 0o644 });
  await assert.rejects(
    verifyQueueAdapterEvidenceFile(configuration(malformed)),
    expectsError("QUEUE_ADAPTER_EVIDENCE_INVALID"),
  );

  const invalid = await createEvidenceFile(evidence({ environment: "production" }));
  await assert.rejects(
    verifyQueueAdapterEvidenceFile(configuration(invalid)),
    expectsError("QUEUE_ADAPTER_EVIDENCE_INVALID"),
  );

  const oversized = await createEvidenceFile();
  await writeFile(oversized.filePath, "x".repeat(48_001), { mode: 0o644 });
  await assert.rejects(
    verifyQueueAdapterEvidenceFile(configuration(oversized)),
    expectsError("QUEUE_ADAPTER_EVIDENCE_FILE_INVALID"),
  );
});

test("does not misclassify structurally invalid evidence by its timestamps", async () => {
  for (const value of [
    evidence({
      environment: "production",
      verifiedAt: "2026-08-21T15:00:00.000Z",
      expiresAt: "2026-08-22T15:00:00.000Z",
    }),
    evidence({
      environment: "production",
      verifiedAt: "2026-08-19T13:00:00.000Z",
      expiresAt: "2026-08-20T13:00:00.000Z",
    }),
  ]) {
    const file = await createEvidenceFile(value);
    await assert.rejects(
      verifyQueueAdapterEvidenceFile(configuration(file)),
      expectsError("QUEUE_ADAPTER_EVIDENCE_INVALID"),
    );
  }
});

test("rejects invalid configuration before reading a file", async () => {
  let reads = 0;
  await assert.rejects(
    verifyQueueAdapterEvidenceFile({
      filePath: "relative.json",
      releaseManifest: { schemaVersion: 1, commitSha },
      artifactDigest,
      clock: () => new Date(),
      dependencies: {
        async readTrustedEvidenceFile() {
          reads += 1;
        },
      },
    }),
    expectsError("QUEUE_ADAPTER_EVIDENCE_CONFIGURATION_INVALID"),
  );
  assert.equal(reads, 0);
});
