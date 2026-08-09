import assert from "node:assert/strict";
import {
  access,
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import {
  tmpdir,
} from "node:os";
import {
  join,
} from "node:path";
import test from "node:test";

import {
  removeTeamInvitationBrowserSecretFiles,
  TeamInvitationBrowserSecretFileRemovalError,
} from "../scripts/remove-team-invitation-browser-secret-files.mjs";

const releaseManifest = Object.freeze({
  schemaVersion: 1,
  releaseId:
    `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
});
const testRoot = join(
  tmpdir(),
  "connect-team-invitation-secret-removal-tests",
  String(process.pid),
);
let testOrdinal = 0;

function verificationResult() {
  return {
    origin:
      "https://staging.connect.test",
    releaseId: releaseManifest.releaseId,
    profileCount: 6,
    scenarioCount: 7,
  };
}

async function createFiles() {
  testOrdinal += 1;
  const directory = join(
    testRoot,
    String(testOrdinal),
  );
  const authenticationStatePath = join(
    directory,
    "team-invitation-browser-auth-states.json",
  );
  const caseInventoryPath = join(
    directory,
    "team-invitation-browser-case-inventory.json",
  );

  await mkdir(directory, {
    recursive: true,
  });
  await writeFile(
    authenticationStatePath,
    "auth-secret",
    { mode: 0o600 },
  );
  await writeFile(
    caseInventoryPath,
    "case-secret",
    { mode: 0o600 },
  );

  return {
    directory,
    authenticationStatePath,
    caseInventoryPath,
  };
}

function dependencies(verifySecretFiles) {
  return {
    verifySecretFiles,
    mkdir,
    lstat,
    rename,
    unlink,
    rmdir,
  };
}

function configuration(
  files,
  dependencyOverrides,
  overrides = {},
) {
  return {
    confirmation:
      "secret-store-transfer-confirmed",
    environment: {},
    releaseManifest,
    clock: () =>
      new Date(
        "2026-08-09T12:00:00.000Z",
      ),
    authenticationStatePath:
      files.authenticationStatePath,
    caseInventoryPath:
      files.caseInventoryPath,
    dependencies: dependencyOverrides,
    ...overrides,
  };
}

function expectsError(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserSecretFileRemovalError &&
    error.code === code &&
    error.message === code;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test.after(async () => {
  await rm(testRoot, {
    recursive: true,
    force: true,
  });
});

test("quarantines, re-verifies, and unlinks both local secret files", async () => {
  const files = await createFiles();
  const verifiedPaths = [];

  const result =
    await removeTeamInvitationBrowserSecretFiles(
      configuration(
        files,
        dependencies(async (value) => {
          verifiedPaths.push([
            value.authenticationStatePath,
            value.caseInventoryPath,
          ]);
          return verificationResult();
        }),
      ),
    );

  assert.equal(verifiedPaths.length, 2);
  assert.deepEqual(
    verifiedPaths[0],
    [
      files.authenticationStatePath,
      files.caseInventoryPath,
    ],
  );
  assert.notEqual(
    verifiedPaths[1][0],
    files.authenticationStatePath,
  );
  assert.equal(
    await exists(files.authenticationStatePath),
    false,
  );
  assert.equal(
    await exists(files.caseInventoryPath),
    false,
  );
  assert.deepEqual(result, {
    removedFileCount: 2,
    releaseId: releaseManifest.releaseId,
  });
  assert.ok(Object.isFrozen(result));
});

test("requires explicit transfer confirmation before verification or mutation", async () => {
  const files = await createFiles();
  let verificationCalls = 0;

  await assert.rejects(
    () =>
      removeTeamInvitationBrowserSecretFiles(
        configuration(
          files,
          dependencies(async () => {
            verificationCalls += 1;
          }),
          { confirmation: "missing" },
        ),
      ),
    expectsError(
      "SECRET_FILE_REMOVAL_NOT_CONFIRMED",
    ),
  );

  assert.equal(verificationCalls, 0);
  assert.equal(
    await readFile(
      files.authenticationStatePath,
      "utf8",
    ),
    "auth-secret",
  );
  assert.equal(
    await readFile(
      files.caseInventoryPath,
      "utf8",
    ),
    "case-secret",
  );
});

test("does not move files when initial verification fails", async () => {
  const files = await createFiles();

  await assert.rejects(
    () =>
      removeTeamInvitationBrowserSecretFiles(
        configuration(
          files,
          dependencies(async () => {
            throw new Error("invalid-secret-set");
          }),
        ),
      ),
    expectsError(
      "SECRET_FILE_REMOVAL_VERIFICATION_FAILED",
    ),
  );

  assert.equal(
    await exists(files.authenticationStatePath),
    true,
  );
  assert.equal(
    await exists(files.caseInventoryPath),
    true,
  );
});

test("restores both files when quarantine verification fails", async () => {
  const files = await createFiles();
  let verificationCalls = 0;

  await assert.rejects(
    () =>
      removeTeamInvitationBrowserSecretFiles(
        configuration(
          files,
          dependencies(async () => {
            verificationCalls += 1;

            if (verificationCalls === 2) {
              throw new Error(
                "quarantine-verification-failed",
              );
            }

            return verificationResult();
          }),
        ),
      ),
    expectsError("SECRET_FILE_REMOVAL_FAILED"),
  );

  assert.equal(verificationCalls, 2);
  assert.equal(
    await readFile(
      files.authenticationStatePath,
      "utf8",
    ),
    "auth-secret",
  );
  assert.equal(
    await readFile(
      files.caseInventoryPath,
      "utf8",
    ),
    "case-secret",
  );
});

test("does not overwrite a path recreated during restore", async () => {
  const files = await createFiles();
  let verificationCalls = 0;

  await assert.rejects(
    () =>
      removeTeamInvitationBrowserSecretFiles(
        configuration(
          files,
          dependencies(async () => {
            verificationCalls += 1;

            if (verificationCalls === 2) {
              await writeFile(
                files.authenticationStatePath,
                "unrelated-file",
                { mode: 0o600 },
              );
              throw new Error(
                "quarantine-verification-failed",
              );
            }

            return verificationResult();
          }),
        ),
      ),
    expectsError(
      "SECRET_FILE_REMOVAL_RESTORE_FAILED",
    ),
  );

  assert.equal(
    await readFile(
      files.authenticationStatePath,
      "utf8",
    ),
    "unrelated-file",
  );
});
