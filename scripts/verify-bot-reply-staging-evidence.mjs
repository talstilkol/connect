import {
  createHash,
} from "node:crypto";
import {
  isAbsolute,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  inspectBotReplyStagingEvidence,
} from "../server/operations/botReplyStagingEvidence.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";
import {
  readTrustedEvidenceFile,
  TrustedEvidenceFileError,
} from "./trusted-evidence-file.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const evidencePath = join(
  projectRoot,
  ".artifacts",
  "bot-reply-staging-evidence.json",
);
const maximumEvidenceBytes = 48_000;
const commitShaPattern = /^[a-f0-9]{40}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;

export class BotReplyStagingEvidenceFileError extends Error {
  constructor(code) {
    super(code);
    this.name = "BotReplyStagingEvidenceFileError";
    this.code = code;
  }
}

function fail(code) {
  throw new BotReplyStagingEvidenceFileError(code);
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
      "filePath",
      "releaseManifest",
      "artifactDigest",
      "runtimeEvidenceJson",
      "clock",
      "dependencies",
    ]) ||
    typeof value.filePath !== "string" ||
    !isAbsolute(value.filePath) ||
    !isObject(value.releaseManifest) ||
    value.releaseManifest.schemaVersion !== 1 ||
    typeof value.releaseManifest.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseManifest.releaseId) ||
    typeof value.releaseManifest.commitSha !== "string" ||
    !commitShaPattern.test(value.releaseManifest.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !artifactDigestPattern.test(value.artifactDigest) ||
    typeof value.runtimeEvidenceJson !== "string" ||
    value.runtimeEvidenceJson.length === 0 ||
    Buffer.byteLength(value.runtimeEvidenceJson, "utf8") >
      maximumEvidenceBytes ||
    typeof value.clock !== "function" ||
    !isObject(value.dependencies) ||
    !hasExactKeys(value.dependencies, ["readTrustedEvidenceFile"]) ||
    typeof value.dependencies.readTrustedEvidenceFile !== "function"
  ) {
    fail("BOT_REPLY_STAGING_EVIDENCE_CONFIGURATION_INVALID");
  }

  return value;
}

const productionDependencies = Object.freeze({
  readTrustedEvidenceFile,
});

export const botReplyStagingEvidenceVerificationDependencies =
  productionDependencies;

export async function verifyBotReplyStagingEvidenceFile(
  rawConfiguration,
) {
  const configuration = requireConfiguration(rawConfiguration);
  let rawEvidence;

  try {
    rawEvidence = await configuration.dependencies.readTrustedEvidenceFile({
      filePath: configuration.filePath,
      maximumFileBytes: maximumEvidenceBytes,
    });
  } catch (error) {
    fail(
      error instanceof TrustedEvidenceFileError &&
        error.code === "TRUSTED_EVIDENCE_FILE_CONFIGURATION_INVALID"
        ? "BOT_REPLY_STAGING_EVIDENCE_CONFIGURATION_INVALID"
        : "BOT_REPLY_STAGING_EVIDENCE_FILE_INVALID",
    );
  }

  if (
    typeof rawEvidence !== "string" ||
    rawEvidence.length === 0 ||
    Buffer.byteLength(rawEvidence, "utf8") > maximumEvidenceBytes
  ) {
    fail("BOT_REPLY_STAGING_EVIDENCE_INVALID");
  }
  if (configuration.runtimeEvidenceJson !== rawEvidence) {
    fail("BOT_REPLY_STAGING_EVIDENCE_RUNTIME_MISMATCH");
  }

  const current = configuration.clock();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    fail("BOT_REPLY_STAGING_EVIDENCE_CONFIGURATION_INVALID");
  }

  const report = inspectBotReplyStagingEvidence({
    APP_DEPLOYED_COMMIT_SHA: configuration.releaseManifest.commitSha,
    APP_RELEASE_ID: configuration.releaseManifest.releaseId,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: configuration.artifactDigest,
    BOT_REPLY_STAGING_EVIDENCE_JSON: rawEvidence,
  }, current);

  if (report.status !== "configured") {
    if (report.status === "mismatch") {
      let evidence;
      try {
        evidence = JSON.parse(rawEvidence);
      } catch {
        fail("BOT_REPLY_STAGING_EVIDENCE_INVALID");
      }
      if (
        !isObject(evidence) ||
        evidence.commitSha !== configuration.releaseManifest.commitSha ||
        evidence.releaseId !== configuration.releaseManifest.releaseId
      ) {
        fail("BOT_REPLY_STAGING_EVIDENCE_RELEASE_MISMATCH");
      }
      if (evidence.artifactDigest !== configuration.artifactDigest) {
        fail("BOT_REPLY_STAGING_EVIDENCE_ARTIFACT_MISMATCH");
      }
    }

    const codeByStatus = {
      disabled: "BOT_REPLY_STAGING_EVIDENCE_INVALID",
      invalid: "BOT_REPLY_STAGING_EVIDENCE_INVALID",
      "not-yet-valid": "BOT_REPLY_STAGING_EVIDENCE_NOT_YET_VALID",
      expired: "BOT_REPLY_STAGING_EVIDENCE_EXPIRED",
      mismatch: "BOT_REPLY_STAGING_EVIDENCE_INVALID",
    };
    fail(codeByStatus[report.status]);
  }

  return Object.freeze({
    releaseId: report.releaseId,
    commitSha: report.commitSha,
    artifactDigest: report.artifactDigest,
    evidenceFileDigest:
      `sha256:${createHash("sha256").update(rawEvidence).digest("hex")}`,
    graphApiVersion: report.graphApiVersion,
    scenarioCount: report.scenarioCount,
    messagesPerSecond: report.messagesPerSecond,
    verifiedAt: report.verifiedAt,
    expiresAt: report.expiresAt,
  });
}

async function runCli() {
  if (process.argv.length !== 2) {
    fail("BOT_REPLY_STAGING_EVIDENCE_INVALID_ARGUMENTS");
  }

  const releaseManifest = await createCurrentReleaseManifest();
  const result = await verifyBotReplyStagingEvidenceFile({
    filePath: evidencePath,
    releaseManifest,
    artifactDigest: process.env.APP_DEPLOYMENT_ARTIFACT_DIGEST,
    runtimeEvidenceJson: process.env.BOT_REPLY_STAGING_EVIDENCE_JSON,
    clock: () => new Date(),
    dependencies: productionDependencies,
  });

  console.log(
    `Bot reply staging evidence: PASS (${result.scenarioCount} scenarios, ${result.graphApiVersion}, ${result.messagesPerSecond} mps, ${result.evidenceFileDigest})`,
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
    const code = error instanceof BotReplyStagingEvidenceFileError
      ? error.code
      : "BOT_REPLY_STAGING_EVIDENCE_VERIFICATION_FAILED";
    console.error(`Bot reply staging evidence: FAIL (${code})`);
    process.exitCode = 1;
  }
}
