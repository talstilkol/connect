import {
  execFile,
} from "node:child_process";
import {
  createHash,
} from "node:crypto";
import {
  promisify,
} from "node:util";
import {
  basename,
  dirname,
  isAbsolute,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";
import {
  readTrustedEvidenceFile,
} from "./trusted-evidence-file.mjs";

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const evidenceFileName =
  "team-invitation-browser-evidence.json";
const attestationFileName =
  "team-invitation-browser-evidence-attestation.json";
const evidencePath = join(
  projectRoot,
  ".artifacts",
  evidenceFileName,
);
const attestationBundlePath = join(
  projectRoot,
  ".artifacts",
  attestationFileName,
);
const workflowPath =
  ".github/workflows/team-invitation-browser-e2e.yml";
const commitShaPattern = /^[a-f0-9]{40}$/;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const repositoryPattern =
  /^(?![.-])[A-Za-z0-9](?:[A-Za-z0-9.-]{0,37}[A-Za-z0-9])?\/(?![.-])[A-Za-z0-9_.-]{1,100}$/;

function sha256(value) {
  return `sha256:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

export class TeamInvitationBrowserEvidenceAttestationError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      "TeamInvitationBrowserEvidenceAttestationError";
    this.code = code;
  }
}

function fail(code) {
  throw new TeamInvitationBrowserEvidenceAttestationError(
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
      "evidencePath",
      "attestationBundlePath",
      "repository",
      "releaseManifest",
      "runtimeEvidenceJson",
      "dependencies",
    ]) ||
    typeof value.evidencePath !== "string" ||
    typeof value.attestationBundlePath !==
      "string" ||
    !isAbsolute(value.evidencePath) ||
    !isAbsolute(value.attestationBundlePath) ||
    basename(value.evidencePath) !==
      evidenceFileName ||
    basename(value.attestationBundlePath) !==
      attestationFileName ||
    dirname(value.evidencePath) !==
      dirname(value.attestationBundlePath) ||
    dirname(value.evidencePath) === "/" ||
    typeof value.repository !== "string" ||
    !repositoryPattern.test(value.repository) ||
    value.repository.includes("..") ||
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
    typeof value.runtimeEvidenceJson !== "string" ||
    value.runtimeEvidenceJson.length === 0 ||
    value.runtimeEvidenceJson.length > 24_000 ||
    !isObject(value.dependencies) ||
    !hasExactKeys(value.dependencies, [
      "readTrustedEvidenceFile",
      "runGitHubCli",
    ]) ||
    typeof value.dependencies
      .readTrustedEvidenceFile !== "function" ||
    typeof value.dependencies.runGitHubCli !==
      "function"
  ) {
    fail(
      "BROWSER_EVIDENCE_ATTESTATION_CONFIGURATION_INVALID",
    );
  }

  return value;
}

function requireVerificationOutput(value) {
  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch {
    fail("BROWSER_EVIDENCE_ATTESTATION_INVALID");
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length < 1 ||
    parsed.length > 30 ||
    parsed.some(
      (entry) =>
        !isObject(entry) ||
        !isObject(entry.attestation) ||
        !isObject(entry.verificationResult),
    )
  ) {
    fail("BROWSER_EVIDENCE_ATTESTATION_INVALID");
  }

  return parsed.length;
}

const productionDependencies = Object.freeze({
  readTrustedEvidenceFile,
  runGitHubCli: (argumentsList) =>
    execFileAsync("gh", argumentsList, {
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1_048_576,
    }),
});

export const teamInvitationBrowserEvidenceAttestationDependencies =
  productionDependencies;

export async function verifyTeamInvitationBrowserEvidenceAttestation(
  rawConfiguration,
) {
  const configuration =
    requireConfiguration(rawConfiguration);

  let trustedFilesBefore;

  try {
    trustedFilesBefore = await Promise.all([
      configuration.dependencies
        .readTrustedEvidenceFile({
          filePath: configuration.evidencePath,
          maximumFileBytes: 24_000,
        }),
      configuration.dependencies
        .readTrustedEvidenceFile({
          filePath:
            configuration.attestationBundlePath,
          maximumFileBytes: 1_048_576,
        }),
    ]);
  } catch {
    fail("BROWSER_EVIDENCE_ATTESTATION_FILE_INVALID");
  }

  const signerWorkflow =
    `${configuration.repository}/${workflowPath}`;
  let result;

  try {
    result =
      await configuration.dependencies.runGitHubCli([
        "attestation",
        "verify",
        configuration.evidencePath,
        "--repo",
        configuration.repository,
        "--bundle",
        configuration.attestationBundlePath,
        "--signer-workflow",
        signerWorkflow,
        "--source-digest",
        configuration.releaseManifest.commitSha,
        "--deny-self-hosted-runners",
        "--format",
        "json",
      ]);
  } catch {
    fail("BROWSER_EVIDENCE_ATTESTATION_VERIFICATION_FAILED");
  }

  let trustedFilesAfter;

  try {
    trustedFilesAfter = await Promise.all([
      configuration.dependencies
        .readTrustedEvidenceFile({
          filePath: configuration.evidencePath,
          maximumFileBytes: 24_000,
        }),
      configuration.dependencies
        .readTrustedEvidenceFile({
          filePath:
            configuration.attestationBundlePath,
          maximumFileBytes: 1_048_576,
        }),
    ]);
  } catch {
    fail("BROWSER_EVIDENCE_ATTESTATION_FILE_INVALID");
  }

  if (
    trustedFilesBefore[0] !== trustedFilesAfter[0] ||
    trustedFilesBefore[1] !== trustedFilesAfter[1]
  ) {
    fail("BROWSER_EVIDENCE_ATTESTATION_FILE_CHANGED");
  }

  if (
    !isObject(result) ||
    typeof result.stdout !== "string"
  ) {
    fail("BROWSER_EVIDENCE_ATTESTATION_INVALID");
  }

  const verifiedAttestationCount =
    requireVerificationOutput(result.stdout);

  if (
    trustedFilesAfter[0] !==
      configuration.runtimeEvidenceJson
  ) {
    fail(
      "BROWSER_EVIDENCE_ATTESTATION_RUNTIME_MISMATCH",
    );
  }

  return Object.freeze({
    repository: configuration.repository,
    releaseId:
      configuration.releaseManifest.releaseId,
    evidenceFileDigest:
      sha256(trustedFilesBefore[0]),
    verifiedAttestationCount,
  });
}

export function resolveTeamInvitationBrowserAttestationRepository(
  argumentsList,
  environment,
) {
  const configuredRepository =
    environment
      .TEAM_INVITATION_BROWSER_ATTESTATION_REPOSITORY;

  if (argumentsList.length === 0) {
    if (
      typeof configuredRepository !== "string" ||
      configuredRepository.length === 0
    ) {
      fail(
        "BROWSER_EVIDENCE_ATTESTATION_ARGUMENTS_INVALID",
      );
    }

    return configuredRepository;
  }

  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== "--repo" ||
    typeof argumentsList[1] !== "string" ||
    (
      typeof configuredRepository === "string" &&
      configuredRepository.length > 0 &&
      configuredRepository !== argumentsList[1]
    )
  ) {
    fail("BROWSER_EVIDENCE_ATTESTATION_ARGUMENTS_INVALID");
  }

  return argumentsList[1];
}

async function runCli() {
  const repository =
    resolveTeamInvitationBrowserAttestationRepository(
      process.argv.slice(2),
      process.env,
    );
  const releaseManifest =
    await createCurrentReleaseManifest();
  const result =
    await verifyTeamInvitationBrowserEvidenceAttestation({
      evidencePath,
      attestationBundlePath,
      repository,
      releaseManifest,
      runtimeEvidenceJson:
        process.env
          .TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON,
      dependencies: productionDependencies,
    });

  console.log(
    `Team invitation browser evidence attestation: PASS (${result.releaseId}, ${result.repository}, ${result.verifiedAttestationCount} attestation)`,
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
        : "BROWSER_EVIDENCE_ATTESTATION_FAILED";

    console.error(
      `Team invitation browser evidence attestation: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
