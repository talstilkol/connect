import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";
import {
  verifyTeamInvitationBrowserAuthenticationStateFile,
  TeamInvitationBrowserAuthenticationStateFileError,
} from "./verify-team-invitation-browser-auth-state-file.mjs";
import {
  verifyTeamInvitationBrowserCaseInventoryFile,
  TeamInvitationBrowserCaseInventoryFileError,
} from "./verify-team-invitation-browser-case-inventory-file.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const authenticationStatePath = join(
  projectRoot,
  ".artifacts",
  "team-invitation-browser-auth-states.json",
);
const caseInventoryPath = join(
  projectRoot,
  ".artifacts",
  "team-invitation-browser-case-inventory.json",
);
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;

export class TeamInvitationBrowserSecretFilesError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      "TeamInvitationBrowserSecretFilesError";
    this.code = code;
  }
}

function fail(code) {
  throw new TeamInvitationBrowserSecretFilesError(
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
      "environment",
      "releaseManifest",
      "clock",
      "authenticationStatePath",
      "caseInventoryPath",
      "dependencies",
    ]) ||
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
    typeof value.authenticationStatePath !==
      "string" ||
    typeof value.caseInventoryPath !== "string" ||
    !isObject(value.dependencies) ||
    !hasExactKeys(value.dependencies, [
      "verifyAuthenticationStateFile",
      "verifyCaseInventoryFile",
    ]) ||
    typeof value.dependencies
      .verifyAuthenticationStateFile !==
      "function" ||
    typeof value.dependencies
      .verifyCaseInventoryFile !== "function"
  ) {
    fail(
      "SECRET_FILES_CONFIGURATION_INVALID",
    );
  }

  return value;
}

function requireAuthenticationResult(value) {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "origin",
      "profileCount",
    ]) ||
    typeof value.origin !== "string" ||
    value.profileCount !== 6
  ) {
    fail("SECRET_FILES_RESULT_INVALID");
  }

  return value;
}

function requireCaseResult(value) {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "origin",
      "releaseId",
      "scenarioCount",
    ]) ||
    typeof value.origin !== "string" ||
    typeof value.releaseId !== "string" ||
    value.scenarioCount !== 7
  ) {
    fail("SECRET_FILES_RESULT_INVALID");
  }

  return value;
}

function mapAuthenticationError(error) {
  fail(
    error instanceof
      TeamInvitationBrowserAuthenticationStateFileError
      ? "SECRET_FILES_AUTHENTICATION_INVALID"
      : "SECRET_FILES_VERIFICATION_FAILED",
  );
}

function mapCaseError(error) {
  fail(
    error instanceof
      TeamInvitationBrowserCaseInventoryFileError
      ? "SECRET_FILES_CASE_INVENTORY_INVALID"
      : "SECRET_FILES_VERIFICATION_FAILED",
  );
}

const productionDependencies = Object.freeze({
  verifyAuthenticationStateFile:
    verifyTeamInvitationBrowserAuthenticationStateFile,
  verifyCaseInventoryFile:
    verifyTeamInvitationBrowserCaseInventoryFile,
});

export async function verifyTeamInvitationBrowserSecretFiles(
  rawConfiguration,
) {
  const configuration =
    requireConfiguration(rawConfiguration);
  const now = configuration.clock();

  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    fail(
      "SECRET_FILES_CONFIGURATION_INVALID",
    );
  }

  const stableClock = () =>
    new Date(now.getTime());
  let authenticationResult;

  try {
    authenticationResult =
      requireAuthenticationResult(
        await configuration.dependencies
          .verifyAuthenticationStateFile({
            filePath:
              configuration
                .authenticationStatePath,
            origin:
              configuration.environment
                .TEAM_INVITATION_BROWSER_E2E_ORIGIN,
            clock: stableClock,
          }),
      );
  } catch (error) {
    if (
      error instanceof
        TeamInvitationBrowserSecretFilesError
    ) {
      throw error;
    }

    mapAuthenticationError(error);
  }

  let caseResult;

  try {
    caseResult = requireCaseResult(
      await configuration.dependencies
        .verifyCaseInventoryFile({
          filePath:
            configuration.caseInventoryPath,
          environment:
            configuration.environment,
          releaseManifest:
            configuration.releaseManifest,
          clock: stableClock,
        }),
    );
  } catch (error) {
    if (
      error instanceof
        TeamInvitationBrowserSecretFilesError
    ) {
      throw error;
    }

    mapCaseError(error);
  }

  if (
    authenticationResult.origin !==
      caseResult.origin ||
    caseResult.releaseId !==
      configuration.releaseManifest.releaseId
  ) {
    fail("SECRET_FILES_MISMATCH");
  }

  return Object.freeze({
    origin: caseResult.origin,
    releaseId: caseResult.releaseId,
    profileCount:
      authenticationResult.profileCount,
    scenarioCount: caseResult.scenarioCount,
  });
}

async function runCli() {
  if (process.argv.length !== 2) {
    fail("SECRET_FILES_INVALID_ARGUMENTS");
  }

  const releaseManifest =
    await createCurrentReleaseManifest();
  const result =
    await verifyTeamInvitationBrowserSecretFiles({
      environment: process.env,
      releaseManifest,
      clock: () => new Date(),
      authenticationStatePath,
      caseInventoryPath,
      dependencies: productionDependencies,
    });

  console.log(
    `Team invitation browser secret files: PASS (${result.releaseId}, ${result.profileCount} profiles, ${result.scenarioCount} scenarios, ${result.origin})`,
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
        : "SECRET_FILES_VERIFICATION_FAILED";

    console.error(
      `Team invitation browser secret files: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
