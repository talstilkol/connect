import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  readFile,
  rm,
  stat,
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
  buildBotReplyStagingEvidenceFromReceipt,
  botReplyStagingRunnerVersion,
  BotReplyStagingEvidenceBuilderError,
} from "../server/operations/botReplyStagingEvidenceBuilder.ts";
import {
  botReplyStagingScenarioRequirements,
  inspectBotReplyStagingEvidence,
} from "../server/operations/botReplyStagingEvidence.ts";
import {
  botReplyStagingEvidenceGeneratorDependencies,
  BotReplyStagingEvidenceGeneratorError,
  createBotReplyStagingEvidenceFile,
} from "../scripts/create-bot-reply-staging-evidence.mjs";

const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const now = new Date("2026-08-21T13:30:00.000Z");
const testRoot = join(
  tmpdir(),
  "connect-bot-reply-staging-evidence-builder-tests",
  String(process.pid),
);
let ordinal = 0;

function proof(label) {
  return `${label}:verified-staging-observation`;
}

function receipt(overrides = {}) {
  return {
    schemaVersion: 1,
    runnerVersion: botReplyStagingRunnerVersion,
    environment: "staging",
    provider: "meta-whatsapp-cloud-api",
    connectionMode: "approved-staging-waba",
    graphApiVersion: "v24.0",
    verifiedAt: "2026-08-21T13:00:00.000Z",
    releaseId,
    commitSha,
    artifactDigest,
    assetProofs: {
      app: proof("app"),
      waba: proof("waba"),
      phoneNumber: proof("phone-number"),
    },
    scenarios: botReplyStagingScenarioRequirements.map(
      (requirement, index) => ({
        ...requirement,
        status: "passed",
        observedAt: "2026-08-21T12:30:00.000Z",
        evidenceProof: proof(`scenario-${index}`),
      }),
    ),
    rateLimits: {
      throughput: {
        messagesPerSecond: 80,
        source: "graph-api",
        observedAt: "2026-08-21T12:31:00.000Z",
        evidenceProof: proof("throughput"),
      },
      providerRetry: {
        status: "passed",
        providerErrorCode: 130429,
        retryAfterSeconds: 12,
        cooldownScope: "sender",
        observedAt: "2026-08-21T12:32:00.000Z",
        evidenceProof: proof("provider-retry"),
      },
      pairLimit: {
        status: "passed",
        providerErrorCode: 131056,
        cooldownScope: "pair",
        backoffPolicy: "meta-4-power-x",
        observedAt: "2026-08-21T12:33:00.000Z",
        evidenceProof: proof("pair-limit"),
      },
    },
    killSwitch: {
      status: "passed",
      providerRequestCount: 0,
      observedAt: "2026-08-21T12:34:00.000Z",
      evidenceProof: proof("kill-switch"),
    },
    duplicateSafety: {
      status: "passed",
      queueDeliveryCount: 2,
      providerRequestCount: 1,
      observedAt: "2026-08-21T12:35:00.000Z",
      evidenceProof: proof("duplicate-safety"),
    },
    credentialBoundary: {
      source: "encrypted-vault",
      plaintextExposureFindings: 0,
      observedAt: "2026-08-21T12:36:00.000Z",
      evidenceProof: proof("credential-boundary"),
    },
    redaction: {
      testedFieldCount: 16,
      findings: 0,
      observedAt: "2026-08-21T12:37:00.000Z",
      evidenceProof: proof("redaction"),
    },
    ...overrides,
  };
}

function manifest(overrides = {}) {
  return {
    schemaVersion: 1,
    releaseId,
    commitSha,
    ...overrides,
  };
}

function build(value = receipt(), overrides = {}) {
  return buildBotReplyStagingEvidenceFromReceipt({
    receipt: value,
    releaseManifest: manifest(),
    artifactDigest,
    now,
    ...overrides,
  });
}

function expectsBuilderError(code) {
  return (error) =>
    error instanceof BotReplyStagingEvidenceBuilderError &&
    error.code === code && error.message === code;
}

function expectsGeneratorError(code) {
  return (error) =>
    error instanceof BotReplyStagingEvidenceGeneratorError &&
    error.code === code && error.message === code;
}

async function createReceiptFile(value = receipt()) {
  ordinal += 1;
  const directory = join(testRoot, String(ordinal));
  const receiptPath = join(directory, "bot-reply-staging-receipt.json");
  const outputPath = join(directory, "output", "evidence.json");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(
    receiptPath,
    `${JSON.stringify(value)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  return { directory, receiptPath, outputPath };
}

function generatorConfiguration(file, overrides = {}) {
  return {
    receiptPath: file.receiptPath,
    outputPath: file.outputPath,
    releaseManifest: manifest(),
    artifactDigest,
    clock: () => now,
    dependencies: botReplyStagingEvidenceGeneratorDependencies,
    ...overrides,
  };
}

test.after(async () => {
  await rm(testRoot, { recursive: true, force: true });
});

test("builds bounded release evidence without retaining receipt proofs", () => {
  const input = receipt();
  const evidence = build(input);
  const serialized = JSON.stringify(evidence);

  assert.equal(evidence.expiresAt, "2026-08-22T13:00:00.000Z");
  assert.match(evidence.appFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.doesNotMatch(serialized, /verified-staging-observation/);
  assert.equal(
    inspectBotReplyStagingEvidence({
      APP_DEPLOYED_COMMIT_SHA: commitSha,
      APP_RELEASE_ID: releaseId,
      APP_DEPLOYMENT_ARTIFACT_DIGEST: artifactDigest,
      BOT_REPLY_STAGING_EVIDENCE_JSON: serialized,
    }, now).status,
    "configured",
  );
  assert.ok(Object.isFrozen(evidence));
});

test("rejects receipt extensions, reordered scenarios and duplicate proofs", () => {
  const extended = receipt({ accessToken: "forbidden" });
  const reordered = receipt();
  [reordered.scenarios[0], reordered.scenarios[1]] =
    [reordered.scenarios[1], reordered.scenarios[0]];
  const duplicate = receipt();
  duplicate.assetProofs.waba = duplicate.assetProofs.app;

  for (const candidate of [extended, reordered, duplicate]) {
    assert.throws(
      () => build(candidate),
      expectsBuilderError(
        candidate === duplicate
          ? "BOT_REPLY_STAGING_EVIDENCE_INVALID"
          : "BOT_REPLY_STAGING_RECEIPT_INVALID",
      ),
    );
  }
});

test("rejects unsafe provider observations before evidence generation", () => {
  const retry = receipt();
  retry.rateLimits.providerRetry.retryAfterSeconds = 0;
  const killSwitch = receipt();
  killSwitch.killSwitch.providerRequestCount = 1;
  const duplicate = receipt();
  duplicate.duplicateSafety.providerRequestCount = 2;
  const credential = receipt();
  credential.credentialBoundary.plaintextExposureFindings = 1;

  for (const candidate of [retry, killSwitch, duplicate, credential]) {
    assert.throws(
      () => build(candidate),
      expectsBuilderError("BOT_REPLY_STAGING_RECEIPT_INVALID"),
    );
  }
});

test("separates release, artifact, future and stale receipt failures", () => {
  assert.throws(
    () => build(receipt(), {
      releaseManifest: manifest({
        releaseId: `connect_release_v1_${"d".repeat(64)}`,
      }),
    }),
    expectsBuilderError("BOT_REPLY_STAGING_EVIDENCE_RELEASE_MISMATCH"),
  );
  assert.throws(
    () => build(receipt(), {
      artifactDigest: `sha256:${"d".repeat(64)}`,
    }),
    expectsBuilderError("BOT_REPLY_STAGING_EVIDENCE_ARTIFACT_MISMATCH"),
  );
  assert.throws(
    () => build(receipt(), {
      now: new Date("2026-08-21T12:59:59.999Z"),
    }),
    expectsBuilderError("BOT_REPLY_STAGING_RECEIPT_NOT_YET_VALID"),
  );
  assert.throws(
    () => build(receipt(), {
      now: new Date("2026-08-21T14:00:00.001Z"),
    }),
    expectsBuilderError("BOT_REPLY_STAGING_RECEIPT_STALE"),
  );
});

test("writes a new owner-only evidence file from a trusted receipt", async () => {
  const file = await createReceiptFile();
  const result = await createBotReplyStagingEvidenceFile(
    generatorConfiguration(file),
  );
  const metadata = await stat(file.outputPath);
  const rawEvidence = await readFile(file.outputPath, "utf8");

  assert.equal(metadata.mode & 0o777, 0o600);
  assert.equal(metadata.nlink, 1);
  assert.equal(result.outputPath, file.outputPath);
  assert.equal(result.evidenceBytes, Buffer.byteLength(rawEvidence));
  assert.match(
    result.evidenceDigest,
    /^bot_reply_staging_evidence_v1_[a-f0-9]{64}$/,
  );
  assert.equal(
    inspectBotReplyStagingEvidence({
      APP_DEPLOYED_COMMIT_SHA: commitSha,
      APP_RELEASE_ID: releaseId,
      APP_DEPLOYMENT_ARTIFACT_DIGEST: artifactDigest,
      BOT_REPLY_STAGING_EVIDENCE_JSON: rawEvidence,
    }, now).status,
    "configured",
  );
});

test("never overwrites evidence and rejects untrusted receipt paths", async () => {
  const existing = await createReceiptFile();
  await createBotReplyStagingEvidenceFile(
    generatorConfiguration(existing),
  );
  await assert.rejects(
    createBotReplyStagingEvidenceFile(
      generatorConfiguration(existing),
    ),
    expectsGeneratorError("BOT_REPLY_STAGING_EVIDENCE_OUTPUT_EXISTS"),
  );

  const writable = await createReceiptFile();
  await chmod(writable.receiptPath, 0o660);
  await assert.rejects(
    createBotReplyStagingEvidenceFile(
      generatorConfiguration(writable),
    ),
    expectsGeneratorError("BOT_REPLY_STAGING_RECEIPT_FILE_INVALID"),
  );

  const linked = await createReceiptFile();
  const linkPath = join(linked.directory, "receipt-link.json");
  await symlink(linked.receiptPath, linkPath);
  await assert.rejects(
    createBotReplyStagingEvidenceFile(
      generatorConfiguration({
        ...linked,
        receiptPath: linkPath,
      }),
    ),
    expectsGeneratorError("BOT_REPLY_STAGING_RECEIPT_FILE_INVALID"),
  );
});

test("rejects an unsafe output directory and invalid configuration", async () => {
  const unsafe = await createReceiptFile();
  const unsafeDirectory = join(unsafe.directory, "unsafe-output");
  await mkdir(unsafeDirectory, { mode: 0o700 });
  await chmod(unsafeDirectory, 0o770);
  await assert.rejects(
    createBotReplyStagingEvidenceFile(
      generatorConfiguration(unsafe, {
        outputPath: join(unsafeDirectory, "evidence.json"),
      }),
    ),
    expectsGeneratorError("BOT_REPLY_STAGING_EVIDENCE_OUTPUT_INVALID"),
  );

  let reads = 0;
  await assert.rejects(
    createBotReplyStagingEvidenceFile({
      receiptPath: "relative.json",
      outputPath: unsafe.outputPath,
      releaseManifest: manifest(),
      artifactDigest,
      clock: () => now,
      dependencies: {
        ...botReplyStagingEvidenceGeneratorDependencies,
        async readTrustedEvidenceFile() {
          reads += 1;
        },
      },
    }),
    expectsGeneratorError(
      "BOT_REPLY_STAGING_EVIDENCE_GENERATOR_CONFIGURATION_INVALID",
    ),
  );
  assert.equal(reads, 0);
});
