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
  botReplyStagingEvidencePolicyVersion,
  botReplyStagingScenarioRequirements,
  deriveBotReplyStagingEvidenceDigest,
} from "../server/operations/botReplyStagingEvidence.ts";
import {
  BotReplyStagingEvidenceFileError,
  botReplyStagingEvidenceVerificationDependencies,
  verifyBotReplyStagingEvidenceFile,
} from "../scripts/verify-bot-reply-staging-evidence.mjs";

const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const testRoot = join(
  tmpdir(),
  "connect-bot-reply-staging-evidence-file-tests",
  String(process.pid),
);
let ordinal = 0;

function fingerprint(character) {
  return `sha256:${character.repeat(64)}`;
}

function evidence(overrides = {}) {
  const value = {
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
    ...overrides,
  };

  return {
    ...value,
    evidenceDigest: deriveBotReplyStagingEvidenceDigest(value),
  };
}

async function createRawEvidenceFile(text) {
  ordinal += 1;
  const directory = join(testRoot, String(ordinal));
  const filePath = join(
    directory,
    "bot-reply-staging-evidence.json",
  );
  await mkdir(directory, { recursive: true });
  await writeFile(filePath, text, { mode: 0o644 });
  return { directory, filePath, text };
}

async function createEvidenceFile(value = evidence()) {
  return createRawEvidenceFile(`${JSON.stringify(value)}\n`);
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
    runtimeEvidenceJson: file.text,
    clock: () => new Date("2026-08-21T14:00:00.000Z"),
    dependencies: botReplyStagingEvidenceVerificationDependencies,
    ...overrides,
  };
}

function expectsError(code) {
  return (error) =>
    error instanceof BotReplyStagingEvidenceFileError &&
    error.code === code && error.message === code;
}

test.after(async () => {
  await rm(testRoot, { recursive: true, force: true });
});

test("verifies one trusted current-release Bot reply evidence file", async () => {
  const file = await createEvidenceFile();
  const result = await verifyBotReplyStagingEvidenceFile(
    configuration(file),
  );

  assert.equal(result.releaseId, releaseId);
  assert.equal(result.commitSha, commitSha);
  assert.equal(result.artifactDigest, artifactDigest);
  assert.equal(result.graphApiVersion, "v24.0");
  assert.equal(result.scenarioCount, 7);
  assert.equal(result.messagesPerSecond, 80);
  assert.match(result.evidenceFileDigest, /^sha256:[a-f0-9]{64}$/);
  assert.doesNotMatch(
    JSON.stringify(result),
    /token|tenant|waba|phoneNumber|payload/i,
  );
  assert.ok(Object.isFrozen(result));
});

test("rejects symbolic links and group-writable evidence", async () => {
  const writable = await createEvidenceFile();
  await chmod(writable.filePath, 0o664);
  await assert.rejects(
    verifyBotReplyStagingEvidenceFile(configuration(writable)),
    expectsError("BOT_REPLY_STAGING_EVIDENCE_FILE_INVALID"),
  );

  const linked = await createEvidenceFile();
  const linkPath = join(linked.directory, "linked-evidence.json");
  await symlink(linked.filePath, linkPath);
  await assert.rejects(
    verifyBotReplyStagingEvidenceFile(configuration({
      ...linked,
      filePath: linkPath,
    })),
    expectsError("BOT_REPLY_STAGING_EVIDENCE_FILE_INVALID"),
  );
});

test("requires byte-identical runtime and trusted-file evidence", async () => {
  const file = await createEvidenceFile();
  await assert.rejects(
    verifyBotReplyStagingEvidenceFile(configuration(file, {
      runtimeEvidenceJson: file.text.trimEnd(),
    })),
    expectsError("BOT_REPLY_STAGING_EVIDENCE_RUNTIME_MISMATCH"),
  );
});

test("separates release, artifact, future and expiry failures", async () => {
  const file = await createEvidenceFile();
  const cases = [
    [
      {
        releaseManifest: {
          schemaVersion: 1,
          releaseId: `connect_release_v1_${"d".repeat(64)}`,
          commitSha,
        },
      },
      "BOT_REPLY_STAGING_EVIDENCE_RELEASE_MISMATCH",
    ],
    [
      { artifactDigest: fingerprint("d") },
      "BOT_REPLY_STAGING_EVIDENCE_ARTIFACT_MISMATCH",
    ],
    [
      { clock: () => new Date("2026-08-21T12:59:59.999Z") },
      "BOT_REPLY_STAGING_EVIDENCE_NOT_YET_VALID",
    ],
    [
      { clock: () => new Date("2026-08-22T13:00:00.000Z") },
      "BOT_REPLY_STAGING_EVIDENCE_EXPIRED",
    ],
  ];

  for (const [overrides, code] of cases) {
    await assert.rejects(
      verifyBotReplyStagingEvidenceFile(
        configuration(file, overrides),
      ),
      expectsError(code),
    );
  }
});

test("rejects malformed, oversized and structurally invalid evidence", async () => {
  const malformed = await createRawEvidenceFile("{broken\n");
  await assert.rejects(
    verifyBotReplyStagingEvidenceFile(configuration(malformed)),
    expectsError("BOT_REPLY_STAGING_EVIDENCE_INVALID"),
  );

  const invalid = await createEvidenceFile(evidence({
    environment: "production",
  }));
  await assert.rejects(
    verifyBotReplyStagingEvidenceFile(configuration(invalid)),
    expectsError("BOT_REPLY_STAGING_EVIDENCE_INVALID"),
  );

  const oversized = await createRawEvidenceFile("x".repeat(48_001));
  await assert.rejects(
    verifyBotReplyStagingEvidenceFile(configuration(oversized)),
    expectsError("BOT_REPLY_STAGING_EVIDENCE_CONFIGURATION_INVALID"),
  );
});

test("rejects invalid configuration before reading a file", async () => {
  let reads = 0;
  await assert.rejects(
    verifyBotReplyStagingEvidenceFile({
      filePath: "relative.json",
      releaseManifest: { schemaVersion: 1, releaseId, commitSha },
      artifactDigest,
      runtimeEvidenceJson: "{}",
      clock: () => new Date(),
      dependencies: {
        async readTrustedEvidenceFile() {
          reads += 1;
        },
      },
    }),
    expectsError("BOT_REPLY_STAGING_EVIDENCE_CONFIGURATION_INVALID"),
  );
  assert.equal(reads, 0);
});
