import {
  lstat,
  mkdir,
  rename,
  rmdir,
  unlink,
} from "node:fs/promises";
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
  verifyTeamInvitationBrowserSecretFiles,
  teamInvitationBrowserSecretFileVerificationDependencies,
} from "./verify-team-invitation-browser-secret-files.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const authenticationFileName =
  "team-invitation-browser-auth-states.json";
const caseInventoryFileName =
  "team-invitation-browser-case-inventory.json";
const authenticationStatePath = join(
  projectRoot,
  ".artifacts",
  authenticationFileName,
);
const caseInventoryPath = join(
  projectRoot,
  ".artifacts",
  caseInventoryFileName,
);
const confirmationValue =
  "secret-store-transfer-confirmed";

export class TeamInvitationBrowserSecretFileRemovalError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      "TeamInvitationBrowserSecretFileRemovalError";
    this.code = code;
  }
}

function fail(code) {
  throw new TeamInvitationBrowserSecretFileRemovalError(
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
      "confirmation",
      "environment",
      "releaseManifest",
      "clock",
      "authenticationStatePath",
      "caseInventoryPath",
      "dependencies",
    ])
  ) {
    fail("SECRET_FILE_REMOVAL_CONFIGURATION_INVALID");
  }

  if (value.confirmation !== confirmationValue) {
    fail("SECRET_FILE_REMOVAL_NOT_CONFIRMED");
  }

  if (
    !isObject(value.environment) ||
    !isObject(value.releaseManifest) ||
    typeof value.clock !== "function" ||
    typeof value.authenticationStatePath !==
      "string" ||
    typeof value.caseInventoryPath !== "string" ||
    !isAbsolute(value.authenticationStatePath) ||
    !isAbsolute(value.caseInventoryPath) ||
    basename(value.authenticationStatePath) !==
      authenticationFileName ||
    basename(value.caseInventoryPath) !==
      caseInventoryFileName ||
    dirname(value.authenticationStatePath) !==
      dirname(value.caseInventoryPath) ||
    dirname(value.authenticationStatePath) === "/" ||
    !isObject(value.dependencies) ||
    !hasExactKeys(value.dependencies, [
      "verifySecretFiles",
      "mkdir",
      "lstat",
      "rename",
      "unlink",
      "rmdir",
    ]) ||
    Object.values(value.dependencies).some(
      (dependency) =>
        typeof dependency !== "function",
    ) ||
    typeof process.getuid !== "function"
  ) {
    fail("SECRET_FILE_REMOVAL_CONFIGURATION_INVALID");
  }

  return value;
}

function requireVerificationResult(value) {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "origin",
      "releaseId",
      "profileCount",
      "scenarioCount",
    ]) ||
    typeof value.origin !== "string" ||
    typeof value.releaseId !== "string" ||
    value.profileCount !== 6 ||
    value.scenarioCount !== 7
  ) {
    fail("SECRET_FILE_REMOVAL_VERIFICATION_FAILED");
  }

  return value;
}

function requireMatchingVerification(
  before,
  after,
) {
  if (
    ![
      "origin",
      "releaseId",
      "profileCount",
      "scenarioCount",
    ].every((key) => before[key] === after[key])
  ) {
    fail("SECRET_FILE_REMOVAL_VERIFICATION_FAILED");
  }
}

async function requirePrivateDirectory(
  path,
  dependencies,
) {
  const metadata = await dependencies.lstat(
    path,
  );

  if (
    !metadata.isDirectory() ||
    metadata.uid !== process.getuid() ||
    (metadata.mode & 0o777) !== 0o700
  ) {
    fail("SECRET_FILE_REMOVAL_QUARANTINE_INVALID");
  }
}

async function restoreMovedFiles(
  movedFiles,
  quarantineDirectory,
  dependencies,
) {
  let restored = true;

  for (
    const file of [...movedFiles].reverse()
  ) {
    try {
      await dependencies.lstat(
        file.originalPath,
      );
      restored = false;
      continue;
    } catch (error) {
      if (
        !isObject(error) ||
        error.code !== "ENOENT"
      ) {
        restored = false;
        continue;
      }
    }

    try {
      await dependencies.rename(
        file.quarantinePath,
        file.originalPath,
      );
    } catch {
      restored = false;
    }
  }

  try {
    await dependencies.rmdir(
      quarantineDirectory,
    );
  } catch {
    restored = false;
  }

  if (!restored) {
    fail("SECRET_FILE_REMOVAL_RESTORE_FAILED");
  }
}

const productionDependencies = Object.freeze({
  verifySecretFiles: (value) =>
    verifyTeamInvitationBrowserSecretFiles({
      ...value,
      dependencies:
        teamInvitationBrowserSecretFileVerificationDependencies,
    }),
  mkdir,
  lstat,
  rename,
  unlink,
  rmdir,
});

export async function removeTeamInvitationBrowserSecretFiles(
  rawConfiguration,
) {
  const configuration =
    requireConfiguration(rawConfiguration);
  const parentDirectory = dirname(
    configuration.authenticationStatePath,
  );
  const quarantineDirectory = join(
    parentDirectory,
    `.team-invitation-browser-secret-removal-${process.pid}`,
  );
  const quarantineAuthenticationPath = join(
    quarantineDirectory,
    authenticationFileName,
  );
  const quarantineCasePath = join(
    quarantineDirectory,
    caseInventoryFileName,
  );
  const verify = (
    authenticationPath,
    inventoryPath,
  ) =>
    configuration.dependencies.verifySecretFiles({
      environment: configuration.environment,
      releaseManifest:
        configuration.releaseManifest,
      clock: configuration.clock,
      authenticationStatePath:
        authenticationPath,
      caseInventoryPath: inventoryPath,
    });
  let before;

  try {
    before = requireVerificationResult(
      await verify(
        configuration.authenticationStatePath,
        configuration.caseInventoryPath,
      ),
    );
  } catch (error) {
    if (
      error instanceof
        TeamInvitationBrowserSecretFileRemovalError
    ) {
      throw error;
    }

    fail("SECRET_FILE_REMOVAL_VERIFICATION_FAILED");
  }

  const movedFiles = [];
  let quarantineCreated = false;
  let deletionStarted = false;

  try {
    await configuration.dependencies.mkdir(
      quarantineDirectory,
      { mode: 0o700 },
    );
    quarantineCreated = true;
    await requirePrivateDirectory(
      quarantineDirectory,
      configuration.dependencies,
    );

    await configuration.dependencies.rename(
      configuration.authenticationStatePath,
      quarantineAuthenticationPath,
    );
    movedFiles.push({
      originalPath:
        configuration.authenticationStatePath,
      quarantinePath:
        quarantineAuthenticationPath,
    });

    await configuration.dependencies.rename(
      configuration.caseInventoryPath,
      quarantineCasePath,
    );
    movedFiles.push({
      originalPath:
        configuration.caseInventoryPath,
      quarantinePath: quarantineCasePath,
    });

    const after = requireVerificationResult(
      await verify(
        quarantineAuthenticationPath,
        quarantineCasePath,
      ),
    );
    requireMatchingVerification(before, after);
    deletionStarted = true;

    await configuration.dependencies.unlink(
      quarantineAuthenticationPath,
    );
    await configuration.dependencies.unlink(
      quarantineCasePath,
    );
    await configuration.dependencies.rmdir(
      quarantineDirectory,
    );

    return Object.freeze({
      removedFileCount: 2,
      releaseId: before.releaseId,
    });
  } catch (error) {
    if (
      !deletionStarted &&
      quarantineCreated
    ) {
      try {
        await restoreMovedFiles(
          movedFiles,
          quarantineDirectory,
          configuration.dependencies,
        );
      } catch (restoreError) {
        if (
          restoreError instanceof
            TeamInvitationBrowserSecretFileRemovalError
        ) {
          throw restoreError;
        }
      }
    }

    if (
      error instanceof
        TeamInvitationBrowserSecretFileRemovalError
    ) {
      throw error;
    }

    fail(
      deletionStarted
        ? "SECRET_FILE_REMOVAL_INCOMPLETE"
        : "SECRET_FILE_REMOVAL_FAILED",
    );
  }
}

async function runCli() {
  const argumentsList = process.argv.slice(2);

  if (
    argumentsList.length !== 1 ||
    argumentsList[0] !==
      "--confirm-secret-store-transfer"
  ) {
    fail("SECRET_FILE_REMOVAL_NOT_CONFIRMED");
  }

  const releaseManifest =
    await createCurrentReleaseManifest();
  const result =
    await removeTeamInvitationBrowserSecretFiles({
      confirmation: confirmationValue,
      environment: process.env,
      releaseManifest,
      clock: () => new Date(),
      authenticationStatePath,
      caseInventoryPath,
      dependencies: productionDependencies,
    });

  console.log(
    `Team invitation browser secret file removal: PASS (${result.releaseId}, ${result.removedFileCount} local files unlinked)`,
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
        : "SECRET_FILE_REMOVAL_FAILED";

    console.error(
      `Team invitation browser secret file removal: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
