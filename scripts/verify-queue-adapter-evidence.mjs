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
  verifyQueueAdapterAcceptanceEvidence,
} from "../shared/domain/queueAdapterAcceptance.ts";
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
  "queue-adapter-acceptance-evidence.json",
);
const maximumEvidenceBytes = 48_000;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;

export class QueueAdapterEvidenceFileError extends Error {
  constructor(code) {
    super(code);
    this.name = "QueueAdapterEvidenceFileError";
    this.code = code;
  }
}

function fail(code) {
  throw new QueueAdapterEvidenceFileError(code);
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
      "clock",
      "dependencies",
    ]) ||
    typeof value.filePath !== "string" ||
    !isAbsolute(value.filePath) ||
    !isObject(value.releaseManifest) ||
    value.releaseManifest.schemaVersion !== 1 ||
    typeof value.releaseManifest.commitSha !== "string" ||
    !commitShaPattern.test(value.releaseManifest.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !artifactDigestPattern.test(value.artifactDigest) ||
    typeof value.clock !== "function" ||
    !isObject(value.dependencies) ||
    !hasExactKeys(value.dependencies, ["readTrustedEvidenceFile"]) ||
    typeof value.dependencies.readTrustedEvidenceFile !== "function"
  ) {
    fail("QUEUE_ADAPTER_EVIDENCE_CONFIGURATION_INVALID");
  }

  return value;
}

function parseEvidence(rawEvidence) {
  if (
    typeof rawEvidence !== "string" || rawEvidence.length === 0 ||
    Buffer.byteLength(rawEvidence, "utf8") > maximumEvidenceBytes
  ) {
    fail("QUEUE_ADAPTER_EVIDENCE_INVALID");
  }

  try {
    const parsed = JSON.parse(rawEvidence);
    if (!isObject(parsed)) {
      fail("QUEUE_ADAPTER_EVIDENCE_INVALID");
    }
    return parsed;
  } catch (error) {
    if (error instanceof QueueAdapterEvidenceFileError) {
      throw error;
    }
    fail("QUEUE_ADAPTER_EVIDENCE_INVALID");
  }
}

const productionDependencies = Object.freeze({
  readTrustedEvidenceFile,
});

export const queueAdapterEvidenceVerificationDependencies =
  productionDependencies;

export async function verifyQueueAdapterEvidenceFile(rawConfiguration) {
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
        ? "QUEUE_ADAPTER_EVIDENCE_CONFIGURATION_INVALID"
        : "QUEUE_ADAPTER_EVIDENCE_FILE_INVALID",
    );
  }

  const evidence = parseEvidence(rawEvidence);
  const intrinsicAcceptance = verifyQueueAdapterAcceptanceEvidence(
    evidence,
    evidence.verifiedAt,
  );
  if (intrinsicAcceptance.outcome !== "accepted") {
    fail("QUEUE_ADAPTER_EVIDENCE_INVALID");
  }

  if (evidence.commitSha !== configuration.releaseManifest.commitSha) {
    fail("QUEUE_ADAPTER_EVIDENCE_RELEASE_MISMATCH");
  }
  if (intrinsicAcceptance.artifactDigest !== configuration.artifactDigest) {
    fail("QUEUE_ADAPTER_EVIDENCE_ARTIFACT_MISMATCH");
  }

  const current = configuration.clock();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    fail("QUEUE_ADAPTER_EVIDENCE_CONFIGURATION_INVALID");
  }

  const acceptance = verifyQueueAdapterAcceptanceEvidence(
    evidence,
    current.toISOString(),
  );
  if (acceptance.outcome !== "accepted") {
    if (current.getTime() < Date.parse(intrinsicAcceptance.verifiedAt)) {
      fail("QUEUE_ADAPTER_EVIDENCE_NOT_YET_VALID");
    }
    if (current.getTime() >= Date.parse(intrinsicAcceptance.expiresAt)) {
      fail("QUEUE_ADAPTER_EVIDENCE_EXPIRED");
    }
    fail("QUEUE_ADAPTER_EVIDENCE_INVALID");
  }

  return Object.freeze({
    commitSha: configuration.releaseManifest.commitSha,
    artifactDigest: acceptance.artifactDigest,
    evidenceFileDigest:
      `sha256:${createHash("sha256").update(rawEvidence).digest("hex")}`,
    queueCount: acceptance.queueCount,
    verifiedAt: acceptance.verifiedAt,
    expiresAt: acceptance.expiresAt,
  });
}

async function runCli() {
  if (process.argv.length !== 2) {
    fail("QUEUE_ADAPTER_EVIDENCE_INVALID_ARGUMENTS");
  }

  const releaseManifest = await createCurrentReleaseManifest();
  const result = await verifyQueueAdapterEvidenceFile({
    filePath: evidencePath,
    releaseManifest,
    artifactDigest: process.env.APP_DEPLOYMENT_ARTIFACT_DIGEST,
    clock: () => new Date(),
    dependencies: productionDependencies,
  });

  console.log(
    `Queue adapter evidence: PASS (${result.queueCount} queues, ${result.evidenceFileDigest})`,
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
    const code = error instanceof QueueAdapterEvidenceFileError
      ? error.code
      : "QUEUE_ADAPTER_EVIDENCE_VERIFICATION_FAILED";
    console.error(`Queue adapter evidence: FAIL (${code})`);
    process.exitCode = 1;
  }
}
