import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  createTeamInvitationBrowserScenarioCaseResolver,
  TeamInvitationBrowserScenarioCaseInventoryError,
} from "../server/operations/teamInvitationBrowserScenarioCaseInventory.ts";
import {
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";
import {
  requireTeamInvitationPolicy,
} from "../server/team/teamInvitationPolicy.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";
import {
  readPrivateSecretFile,
  PrivateSecretFileError,
} from "./private-secret-file.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const inventoryPath = join(
  projectRoot,
  ".artifacts",
  "team-invitation-browser-case-inventory.json",
);
const maximumInventoryBytes = 24_000;
const minimumRemainingLifetimeMilliseconds =
  8 * 60 * 1_000;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern =
  /^sha256:[a-f0-9]{64}$/;

export class TeamInvitationBrowserCaseInventoryFileError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      "TeamInvitationBrowserCaseInventoryFileError";
    this.code = code;
  }
}

function fail(code) {
  throw new TeamInvitationBrowserCaseInventoryFileError(
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

function requireEnvironmentValue(
  environment,
  name,
  maximumLength,
) {
  const value = environment[name];

  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value ||
    value.includes("\0")
  ) {
    fail(
      "CASE_INVENTORY_FILE_CONFIGURATION_INVALID",
    );
  }

  return value;
}

function requireConfiguration(value) {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "filePath",
      "environment",
      "releaseManifest",
      "clock",
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
    typeof value.clock !== "function"
  ) {
    fail(
      "CASE_INVENTORY_FILE_CONFIGURATION_INVALID",
    );
  }

  const artifactDigest =
    requireEnvironmentValue(
      value.environment,
      "APP_DEPLOYMENT_ARTIFACT_DIGEST",
      71,
    );

  if (
    !artifactDigestPattern.test(
      artifactDigest,
    )
  ) {
    fail(
      "CASE_INVENTORY_FILE_CONFIGURATION_INVALID",
    );
  }

  let policy;

  try {
    policy = requireTeamInvitationPolicy({
      TEAM_INVITATION_TTL_HOURS:
        value.environment
          .TEAM_INVITATION_TTL_HOURS,
      TEAM_INVITATION_REREQUEST_POLICY:
        value.environment
          .TEAM_INVITATION_REREQUEST_POLICY,
    });
  } catch {
    fail(
      "CASE_INVENTORY_FILE_CONFIGURATION_INVALID",
    );
  }

  return Object.freeze({
    filePath: value.filePath,
    origin: requireEnvironmentValue(
      value.environment,
      "TEAM_INVITATION_BROWSER_E2E_ORIGIN",
      2_048,
    ),
    artifactDigest,
    policy: Object.freeze(policy),
    releaseId:
      value.releaseManifest.releaseId,
    commitSha:
      value.releaseManifest.commitSha,
    clock: value.clock,
  });
}

function mapInventoryError(error) {
  if (
    error instanceof
      TeamInvitationBrowserScenarioCaseInventoryError
  ) {
    if (error.code === "INVENTORY_EXPIRED") {
      fail("CASE_INVENTORY_FILE_EXPIRED");
    }

    if (error.code === "INVENTORY_MISMATCH") {
      fail("CASE_INVENTORY_FILE_MISMATCH");
    }
  }

  fail("CASE_INVENTORY_FILE_INVALID");
}

export async function verifyTeamInvitationBrowserCaseInventoryFile(
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
      "CASE_INVENTORY_FILE_CONFIGURATION_INVALID",
    );
  }

  let rawValue;

  try {
    rawValue = await readPrivateSecretFile({
      filePath: configuration.filePath,
      maximumFileBytes:
        maximumInventoryBytes,
    });
  } catch (error) {
    fail(
      error instanceof PrivateSecretFileError &&
        error.code ===
          "PRIVATE_SECRET_FILE_CONFIGURATION_INVALID"
        ? "CASE_INVENTORY_FILE_CONFIGURATION_INVALID"
        : "CASE_INVENTORY_FILE_INVALID",
    );
  }

  try {
    createTeamInvitationBrowserScenarioCaseResolver(
      rawValue,
      {
        origin: configuration.origin,
        releaseId: configuration.releaseId,
        commitSha: configuration.commitSha,
        artifactDigest:
          configuration.artifactDigest,
        policy: configuration.policy,
        minimumRemainingLifetimeMilliseconds,
      },
      now,
    );
  } catch (error) {
    mapInventoryError(error);
  }

  return Object.freeze({
    origin: configuration.origin,
    releaseId: configuration.releaseId,
    scenarioCount:
      teamInvitationBrowserScenarioRegistry.length,
  });
}

async function runCli() {
  if (process.argv.length !== 2) {
    fail("CASE_INVENTORY_FILE_INVALID_ARGUMENTS");
  }

  const releaseManifest =
    await createCurrentReleaseManifest();
  const result =
    await verifyTeamInvitationBrowserCaseInventoryFile({
      filePath: inventoryPath,
      environment: process.env,
      releaseManifest,
      clock: () => new Date(),
    });

  console.log(
    `Team invitation browser case inventory file: PASS (${result.releaseId}, ${result.scenarioCount} scenarios, ${result.origin})`,
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
        : "CASE_INVENTORY_FILE_VERIFICATION_FAILED";

    console.error(
      `Team invitation browser case inventory file: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
