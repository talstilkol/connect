import {
  mkdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  buildTeamInvitationBrowserScenarioCaseInventory,
} from "../server/operations/teamInvitationBrowserScenarioCaseInventory.ts";
import {
  requireTeamInvitationPolicy,
} from "../server/team/teamInvitationPolicy.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";

const maximumCaseInputLength = 16_384;
const generatedInventoryLifetimeMinutes = 60;
const artifactDigestPattern =
  /^sha256:[a-f0-9]{64}$/;
const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const outputPath = join(
  projectRoot,
  ".artifacts",
  "team-invitation-browser-case-inventory.json",
);

function isPlainObject(value) {
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

function requireValue(
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
    throw new Error(
      "TEAM_INVITATION_BROWSER_CASE_INVENTORY_CONFIGURATION_INVALID",
    );
  }

  return value;
}

function parseCaseInput(rawValue) {
  let value;

  try {
    value = JSON.parse(rawValue);
  } catch {
    throw new Error(
      "TEAM_INVITATION_BROWSER_CASE_INPUT_INVALID",
    );
  }

  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "cases",
    ]) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.cases)
  ) {
    throw new Error(
      "TEAM_INVITATION_BROWSER_CASE_INPUT_INVALID",
    );
  }

  return value.cases;
}

export function createTeamInvitationBrowserCaseInventory({
  environment,
  releaseManifest,
  now = new Date(),
}) {
  if (
    !isPlainObject(environment) ||
    !isPlainObject(releaseManifest) ||
    releaseManifest.schemaVersion !== 1 ||
    typeof releaseManifest.releaseId !==
      "string" ||
    typeof releaseManifest.commitSha !==
      "string"
  ) {
    throw new Error(
      "TEAM_INVITATION_BROWSER_CASE_INVENTORY_CONFIGURATION_INVALID",
    );
  }

  const artifactDigest = requireValue(
    environment,
    "APP_DEPLOYMENT_ARTIFACT_DIGEST",
    71,
  );

  if (
    !artifactDigestPattern.test(
      artifactDigest,
    )
  ) {
    throw new Error(
      "TEAM_INVITATION_BROWSER_CASE_INVENTORY_CONFIGURATION_INVALID",
    );
  }

  let policy;

  try {
    policy = requireTeamInvitationPolicy({
      TEAM_INVITATION_TTL_HOURS:
        environment
          .TEAM_INVITATION_TTL_HOURS,
      TEAM_INVITATION_REREQUEST_POLICY:
        environment
          .TEAM_INVITATION_REREQUEST_POLICY,
    });
  } catch {
    throw new Error(
      "TEAM_INVITATION_BROWSER_CASE_INVENTORY_CONFIGURATION_INVALID",
    );
  }

  return buildTeamInvitationBrowserScenarioCaseInventory(
    {
      origin: requireValue(
        environment,
        "TEAM_INVITATION_BROWSER_E2E_ORIGIN",
        2_048,
      ),
      releaseId: releaseManifest.releaseId,
      commitSha: releaseManifest.commitSha,
      artifactDigest,
      policy,
      cases: parseCaseInput(
        requireValue(
          environment,
          "TEAM_INVITATION_BROWSER_CASE_INPUT_JSON",
          maximumCaseInputLength,
        ),
      ),
      lifetimeMinutes:
        generatedInventoryLifetimeMinutes,
    },
    now,
  );
}

async function writeInventory(inventory) {
  const temporaryPath =
    `${outputPath}.tmp-${process.pid}`;

  await mkdir(dirname(outputPath), {
    recursive: true,
  });

  try {
    await writeFile(
      temporaryPath,
      JSON.stringify(inventory),
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      },
    );
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

async function runCli() {
  if (process.argv.length !== 2) {
    console.error(
      "Team invitation browser case inventory: FAIL (INVALID_ARGUMENTS)",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const releaseManifest =
      await createCurrentReleaseManifest();
    const inventory =
      createTeamInvitationBrowserCaseInventory({
        environment: process.env,
        releaseManifest,
      });

    await writeInventory(inventory);
    console.log(
      `Team invitation browser case inventory: PASS (${inventory.releaseId}, ${inventory.cases.length} scenarios, expires ${inventory.expiresAt})`,
    );
  } catch (error) {
    const code =
      error instanceof Error &&
      /^[A-Z][A-Z0-9_]+$/.test(
        error.message,
      )
        ? error.message
        : "TEAM_INVITATION_BROWSER_CASE_INVENTORY_GENERATION_FAILED";

    console.error(
      `Team invitation browser case inventory: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(`file://${process.argv[1]}`),
    )
) {
  await runCli();
}
