import {
  join,
} from "node:path";
import {
  createHash,
} from "node:crypto";
import {
  fileURLToPath,
} from "node:url";

import {
  inspectTeamInvitationBrowserEvidence,
} from "../server/operations/teamInvitationBrowserEvidence.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";
import {
  readTrustedEvidenceFile,
  TrustedEvidenceFileError,
} from "./trusted-evidence-file.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const evidencePath = join(
  projectRoot,
  ".artifacts",
  "team-invitation-browser-evidence.json",
);
const maximumEvidenceBytes = 24_000;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;

export class TeamInvitationBrowserEvidenceFileError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      "TeamInvitationBrowserEvidenceFileError";
    this.code = code;
  }
}

function fail(code) {
  throw new TeamInvitationBrowserEvidenceFileError(
    code,
  );
}

function isObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) => key === expected[index],
    )
  );
}

function requireConfiguration(value) {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "filePath",
      "environment",
      "releaseManifest",
      "clock",
      "dependencies",
    ]) ||
    typeof value.filePath !== "string" ||
    !isObject(value.environment) ||
    !isObject(value.releaseManifest) ||
    value.releaseManifest.schemaVersion !== 1 ||
    typeof value.releaseManifest.releaseId !==
      "string" ||
    !releaseIdPattern.test(
      value.releaseManifest.releaseId,
    ) ||
    typeof value.releaseManifest.commitSha !==
      "string" ||
    !commitShaPattern.test(
      value.releaseManifest.commitSha,
    ) ||
    typeof value.clock !== "function" ||
    !isObject(value.dependencies) ||
    !hasExactKeys(value.dependencies, [
      "readTrustedEvidenceFile",
    ]) ||
    typeof value.dependencies
      .readTrustedEvidenceFile !== "function"
  ) {
    fail("BROWSER_EVIDENCE_FILE_CONFIGURATION_INVALID");
  }

  return value;
}

const productionDependencies = Object.freeze({
  readTrustedEvidenceFile,
});

export const teamInvitationBrowserEvidenceFileVerificationDependencies =
  productionDependencies;

export async function verifyTeamInvitationBrowserEvidenceFile(
  rawConfiguration,
) {
  const configuration =
    requireConfiguration(rawConfiguration);
  let rawEvidence;

  try {
    rawEvidence =
      await configuration.dependencies
        .readTrustedEvidenceFile({
          filePath: configuration.filePath,
          maximumFileBytes:
            maximumEvidenceBytes,
        });
  } catch (error) {
    fail(
      error instanceof TrustedEvidenceFileError &&
        error.code ===
          "TRUSTED_EVIDENCE_FILE_CONFIGURATION_INVALID"
        ? "BROWSER_EVIDENCE_FILE_CONFIGURATION_INVALID"
        : "BROWSER_EVIDENCE_FILE_INVALID",
    );
  }

  const now = configuration.clock();

  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    fail("BROWSER_EVIDENCE_FILE_CONFIGURATION_INVALID");
  }

  const report =
    inspectTeamInvitationBrowserEvidence(
      {
        ...configuration.environment,
        APP_DEPLOYED_COMMIT_SHA:
          configuration.releaseManifest.commitSha,
        APP_RELEASE_ID:
          configuration.releaseManifest.releaseId,
        TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON:
          rawEvidence,
      },
      now,
    );

  if (report.status !== "configured") {
    fail(
      report.status === "expired"
        ? "BROWSER_EVIDENCE_FILE_EXPIRED"
        : report.status === "mismatch"
          ? "BROWSER_EVIDENCE_FILE_MISMATCH"
          : "BROWSER_EVIDENCE_FILE_INVALID",
    );
  }

  return Object.freeze({
    releaseId:
      configuration.releaseManifest.releaseId,
    evidenceFileDigest:
      `sha256:${createHash("sha256")
        .update(rawEvidence)
        .digest("hex")}`,
    verifiedScenarioCount:
      report.verifiedScenarioCount,
  });
}

async function runCli() {
  if (process.argv.length !== 2) {
    fail("BROWSER_EVIDENCE_FILE_INVALID_ARGUMENTS");
  }

  const releaseManifest =
    await createCurrentReleaseManifest();
  const result =
    await verifyTeamInvitationBrowserEvidenceFile({
      filePath: evidencePath,
      environment: process.env,
      releaseManifest,
      clock: () => new Date(),
      dependencies: productionDependencies,
    });

  console.log(
    `Team invitation browser evidence file: PASS (${result.releaseId}, ${result.verifiedScenarioCount} scenarios)`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(`file://${process.argv[1]}`),
    )
) {
  try {
    await runCli();
  } catch (error) {
    const code =
      error instanceof Error &&
      /^[A-Z][A-Z0-9_]+$/.test(
        error.message,
      )
        ? error.message
        : "BROWSER_EVIDENCE_FILE_VERIFICATION_FAILED";

    console.error(
      `Team invitation browser evidence file: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
