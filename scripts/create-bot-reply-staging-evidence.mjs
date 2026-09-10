import {
  lstat,
  mkdir,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  buildBotReplyStagingEvidenceFromReceipt,
  BotReplyStagingEvidenceBuilderError,
} from "../server/operations/botReplyStagingEvidenceBuilder.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";
import {
  readTrustedEvidenceFile,
  TrustedEvidenceFileError,
} from "./trusted-evidence-file.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputPath = join(
  projectRoot,
  ".artifacts",
  "bot-reply-staging-evidence.json",
);
const maximumReceiptBytes = 48_000;
const maximumEvidenceBytes = 48_000;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;

export class BotReplyStagingEvidenceGeneratorError extends Error {
  constructor(code) {
    super(code);
    this.name = "BotReplyStagingEvidenceGeneratorError";
    this.code = code;
  }
}

function fail(code) {
  throw new BotReplyStagingEvidenceGeneratorError(code);
}

function isObject(value) {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function requireConfiguration(value) {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "receiptPath",
      "outputPath",
      "releaseManifest",
      "artifactDigest",
      "clock",
      "dependencies",
    ]) ||
    typeof value.receiptPath !== "string" ||
    !isAbsolute(value.receiptPath) ||
    typeof value.outputPath !== "string" ||
    !isAbsolute(value.outputPath) ||
    value.outputPath === value.receiptPath ||
    !isObject(value.releaseManifest) ||
    value.releaseManifest.schemaVersion !== 1 ||
    typeof value.releaseManifest.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseManifest.releaseId) ||
    typeof value.releaseManifest.commitSha !== "string" ||
    !commitShaPattern.test(value.releaseManifest.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !artifactDigestPattern.test(value.artifactDigest) ||
    typeof value.clock !== "function" ||
    !isObject(value.dependencies) ||
    !hasExactKeys(value.dependencies, [
      "readTrustedEvidenceFile",
      "mkdir",
      "writeFile",
      "lstat",
    ]) ||
    typeof value.dependencies.readTrustedEvidenceFile !== "function" ||
    typeof value.dependencies.mkdir !== "function" ||
    typeof value.dependencies.writeFile !== "function" ||
    typeof value.dependencies.lstat !== "function"
  ) {
    fail("BOT_REPLY_STAGING_EVIDENCE_GENERATOR_CONFIGURATION_INVALID");
  }

  return value;
}

function parseReceipt(rawReceipt) {
  if (
    typeof rawReceipt !== "string" || rawReceipt.length === 0 ||
    Buffer.byteLength(rawReceipt, "utf8") > maximumReceiptBytes
  ) {
    fail("BOT_REPLY_STAGING_RECEIPT_INVALID");
  }

  try {
    const parsed = JSON.parse(rawReceipt);
    if (!isObject(parsed)) {
      fail("BOT_REPLY_STAGING_RECEIPT_INVALID");
    }
    return parsed;
  } catch (error) {
    if (error instanceof BotReplyStagingEvidenceGeneratorError) {
      throw error;
    }
    fail("BOT_REPLY_STAGING_RECEIPT_INVALID");
  }
}

function requireOutputDirectoryMetadata(metadata) {
  if (
    typeof process.getuid !== "function" ||
    !metadata.isDirectory() ||
    metadata.uid !== process.getuid() ||
    (metadata.mode & 0o022) !== 0
  ) {
    fail("BOT_REPLY_STAGING_EVIDENCE_OUTPUT_INVALID");
  }
}

function requireOutputFileMetadata(metadata, expectedBytes) {
  if (
    typeof process.getuid !== "function" ||
    !metadata.isFile() || metadata.isSymbolicLink() ||
    metadata.uid !== process.getuid() ||
    metadata.nlink !== 1 ||
    (metadata.mode & 0o077) !== 0 ||
    metadata.size !== expectedBytes
  ) {
    fail("BOT_REPLY_STAGING_EVIDENCE_OUTPUT_INVALID");
  }
}

const productionDependencies = Object.freeze({
  readTrustedEvidenceFile,
  mkdir,
  writeFile,
  lstat,
});

export const botReplyStagingEvidenceGeneratorDependencies =
  productionDependencies;

export async function createBotReplyStagingEvidenceFile(
  rawConfiguration,
) {
  const configuration = requireConfiguration(rawConfiguration);
  let rawReceipt;

  try {
    rawReceipt = await configuration.dependencies.readTrustedEvidenceFile({
      filePath: configuration.receiptPath,
      maximumFileBytes: maximumReceiptBytes,
    });
  } catch (error) {
    fail(
      error instanceof TrustedEvidenceFileError &&
        error.code === "TRUSTED_EVIDENCE_FILE_CONFIGURATION_INVALID"
        ? "BOT_REPLY_STAGING_EVIDENCE_GENERATOR_CONFIGURATION_INVALID"
        : "BOT_REPLY_STAGING_RECEIPT_FILE_INVALID",
    );
  }

  const current = configuration.clock();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    fail("BOT_REPLY_STAGING_EVIDENCE_GENERATOR_CONFIGURATION_INVALID");
  }

  let evidence;
  try {
    evidence = buildBotReplyStagingEvidenceFromReceipt({
      receipt: parseReceipt(rawReceipt),
      releaseManifest: configuration.releaseManifest,
      artifactDigest: configuration.artifactDigest,
      now: current,
    });
  } catch (error) {
    if (error instanceof BotReplyStagingEvidenceBuilderError) {
      fail(error.code);
    }
    throw error;
  }

  const serializedEvidence = `${JSON.stringify(evidence)}\n`;
  const evidenceBytes = Buffer.byteLength(serializedEvidence, "utf8");
  if (evidenceBytes > maximumEvidenceBytes) {
    fail("BOT_REPLY_STAGING_EVIDENCE_INVALID");
  }

  const outputDirectory = dirname(configuration.outputPath);
  try {
    await configuration.dependencies.mkdir(outputDirectory, {
      recursive: true,
      mode: 0o700,
    });
    requireOutputDirectoryMetadata(
      await configuration.dependencies.lstat(outputDirectory),
    );
    await configuration.dependencies.writeFile(
      configuration.outputPath,
      serializedEvidence,
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      },
    );
    requireOutputFileMetadata(
      await configuration.dependencies.lstat(configuration.outputPath),
      evidenceBytes,
    );
  } catch (error) {
    if (error instanceof BotReplyStagingEvidenceGeneratorError) {
      throw error;
    }
    fail(
      isObject(error) && error.code === "EEXIST"
        ? "BOT_REPLY_STAGING_EVIDENCE_OUTPUT_EXISTS"
        : "BOT_REPLY_STAGING_EVIDENCE_OUTPUT_INVALID",
    );
  }

  return Object.freeze({
    outputPath: configuration.outputPath,
    evidenceDigest: evidence.evidenceDigest,
    evidenceBytes,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
  });
}

function parseArguments(argumentsList) {
  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== "--receipt" ||
    typeof argumentsList[1] !== "string" ||
    !isAbsolute(argumentsList[1]) ||
    argumentsList[1].length > 4_096 ||
    argumentsList[1].includes("\0")
  ) {
    fail("BOT_REPLY_STAGING_EVIDENCE_GENERATOR_ARGUMENTS_INVALID");
  }
  return argumentsList[1];
}

async function runCli() {
  const receiptPath = parseArguments(process.argv.slice(2));
  const releaseManifest = await createCurrentReleaseManifest();
  const result = await createBotReplyStagingEvidenceFile({
    receiptPath,
    outputPath,
    releaseManifest,
    artifactDigest: process.env.APP_DEPLOYMENT_ARTIFACT_DIGEST,
    clock: () => new Date(),
    dependencies: productionDependencies,
  });

  console.log(
    `Bot reply staging evidence generation: PASS (${result.evidenceDigest}, ${result.evidenceBytes} bytes)`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(new URL(`file://${process.argv[1]}`))
) {
  try {
    await runCli();
  } catch (error) {
    const code = error instanceof BotReplyStagingEvidenceGeneratorError
      ? error.code
      : "BOT_REPLY_STAGING_EVIDENCE_GENERATION_FAILED";
    console.error(`Bot reply staging evidence generation: FAIL (${code})`);
    process.exitCode = 1;
  }
}
