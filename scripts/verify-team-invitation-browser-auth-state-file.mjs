import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  parseTeamInvitationBrowserAuthenticationStates,
  teamInvitationBrowserAuthenticatedProfiles,
} from "./team-invitation-browser-auth-state-bundle.mjs";
import {
  readPrivateSecretFile,
  PrivateSecretFileError,
} from "./private-secret-file.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const authenticationStatePath = join(
  projectRoot,
  ".artifacts",
  "team-invitation-browser-auth-states.json",
);
const maximumFileBytes = 262_144;
const minimumRemainingLifetimeMilliseconds =
  8 * 60 * 1_000;

export class TeamInvitationBrowserAuthenticationStateFileError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      "TeamInvitationBrowserAuthenticationStateFileError";
    this.code = code;
  }
}

function fail(code) {
  throw new TeamInvitationBrowserAuthenticationStateFileError(
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

function hasAllowedKeys(value, keys) {
  return Object.keys(value).every((key) =>
    keys.includes(key),
  );
}

function requireConfiguration(value) {
  if (
    !isObject(value) ||
    !hasAllowedKeys(value, [
      "filePath",
      "origin",
      "clock",
    ]) ||
    typeof value.filePath !== "string" ||
    value.filePath.length === 0 ||
    value.filePath.length > 4_096 ||
    value.filePath.includes("\0") ||
    typeof value.origin !== "string" ||
    typeof (value.clock ?? (() => new Date())) !==
      "function"
  ) {
    fail("AUTH_STATE_FILE_CONFIGURATION_INVALID");
  }

  let origin;

  try {
    origin = new URL(value.origin);
  } catch {
    fail("AUTH_STATE_FILE_CONFIGURATION_INVALID");
  }

  if (
    origin.origin !== value.origin ||
    origin.href !== `${value.origin}/` ||
    origin.protocol !== "https:" ||
    origin.username !== "" ||
    origin.password !== "" ||
    [
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(origin.hostname)
  ) {
    fail("AUTH_STATE_FILE_CONFIGURATION_INVALID");
  }

  return Object.freeze({
    filePath: value.filePath,
    origin: origin.origin,
    clock: value.clock ?? (() => new Date()),
  });
}

export async function verifyTeamInvitationBrowserAuthenticationStateFile(
  rawConfiguration,
) {
  const configuration =
    requireConfiguration(rawConfiguration);
  let rawValue;

  try {
    rawValue = await readPrivateSecretFile({
      filePath: configuration.filePath,
      maximumFileBytes,
    });
  } catch (error) {
    fail(
      error instanceof PrivateSecretFileError &&
        error.code ===
          "PRIVATE_SECRET_FILE_CONFIGURATION_INVALID"
        ? "AUTH_STATE_FILE_CONFIGURATION_INVALID"
        : "AUTH_STATE_FILE_INVALID",
    );
  }

  const now = configuration.clock();

  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    fail(
      "AUTH_STATE_FILE_CONFIGURATION_INVALID",
    );
  }

  try {
    parseTeamInvitationBrowserAuthenticationStates(
      rawValue,
      {
        origin: configuration.origin,
        now,
        minimumRemainingLifetimeMilliseconds,
      },
    );
  } catch {
    fail("AUTH_STATE_FILE_INVALID");
  }

  return Object.freeze({
    origin: configuration.origin,
    profileCount:
      teamInvitationBrowserAuthenticatedProfiles.length,
  });
}

async function runCli() {
  if (process.argv.length !== 2) {
    fail("AUTH_STATE_FILE_INVALID_ARGUMENTS");
  }

  const result =
    await verifyTeamInvitationBrowserAuthenticationStateFile({
      filePath: authenticationStatePath,
      origin:
        process.env
          .TEAM_INVITATION_BROWSER_E2E_ORIGIN,
    });

  console.log(
    `Team invitation browser auth file: PASS (${result.profileCount} profiles, ${result.origin})`,
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
        : "AUTH_STATE_FILE_VERIFICATION_FAILED";

    console.error(
      `Team invitation browser auth file: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
