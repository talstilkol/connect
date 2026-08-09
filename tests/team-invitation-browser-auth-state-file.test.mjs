import assert from "node:assert/strict";
import {
  chmod,
  link,
  mkdir,
  rm,
  symlink,
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
  verifyTeamInvitationBrowserAuthenticationStateFile,
  TeamInvitationBrowserAuthenticationStateFileError,
} from "../scripts/verify-team-invitation-browser-auth-state-file.mjs";
import {
  teamInvitationBrowserAuthenticatedProfiles,
} from "../scripts/team-invitation-browser-auth-state-bundle.mjs";

const origin =
  "https://staging.connect.example";
const now = new Date(
  "2026-08-09T10:00:00.000Z",
);
const testRoot = join(
  tmpdir(),
  "connect-team-invitation-auth-file-tests",
  String(process.pid),
);
let testOrdinal = 0;

function bundle({
  expires =
    Date.parse(
      "2026-08-10T10:00:00.000Z",
    ) / 1_000,
} = {}) {
  return Object.fromEntries(
    teamInvitationBrowserAuthenticatedProfiles.map(
      (profile) => [
        profile,
        {
          cookies: [
            {
              name: "__session",
              value: `session-${profile}`,
              domain:
                "staging.connect.example",
              path: "/",
              expires,
              httpOnly: true,
              secure: true,
              sameSite: "Lax",
            },
          ],
          origins: [],
        },
      ],
    ),
  );
}

async function createTestFile(
  value = bundle(),
) {
  testOrdinal += 1;
  const directory = join(
    testRoot,
    String(testOrdinal),
  );
  const filePath = join(
    directory,
    "auth-states.json",
  );

  await mkdir(directory, {
    recursive: true,
  });
  await writeFile(
    filePath,
    JSON.stringify(value),
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );

  return { directory, filePath };
}

function configuration(filePath, overrides = {}) {
  return {
    filePath,
    origin,
    clock: () => now,
    ...overrides,
  };
}

function expectsFileError(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserAuthenticationStateFileError &&
    error.code === code &&
    error.message === code;
}

test.after(async () => {
  await rm(testRoot, {
    recursive: true,
    force: true,
  });
});

test("accepts one private, regular, staging-scoped auth file", async () => {
  const { filePath } =
    await createTestFile();

  const result =
    await verifyTeamInvitationBrowserAuthenticationStateFile(
      configuration(filePath),
    );

  assert.deepEqual(result, {
    origin,
    profileCount: 6,
  });
  assert.ok(Object.isFrozen(result));
});

test("rejects group-readable and world-readable auth files", async () => {
  for (const mode of [0o640, 0o604]) {
    const { filePath } =
      await createTestFile();
    await chmod(filePath, mode);

    await assert.rejects(
      () =>
        verifyTeamInvitationBrowserAuthenticationStateFile(
          configuration(filePath),
        ),
      expectsFileError(
        "AUTH_STATE_FILE_INVALID",
      ),
    );
  }
});

test("rejects symbolic links without following their target", async () => {
  const { directory, filePath } =
    await createTestFile();
  const linkPath = join(
    directory,
    "linked-auth-states.json",
  );
  await symlink(filePath, linkPath);

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserAuthenticationStateFile(
        configuration(linkPath),
      ),
    expectsFileError(
      "AUTH_STATE_FILE_INVALID",
    ),
  );
});

test("rejects files with an additional hard link", async () => {
  const { directory, filePath } =
    await createTestFile();
  const linkPath = join(
    directory,
    "hard-linked-auth-states.json",
  );
  await link(filePath, linkPath);

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserAuthenticationStateFile(
        configuration(filePath),
      ),
    expectsFileError(
      "AUTH_STATE_FILE_INVALID",
    ),
  );
});

test("rejects expired state and invalid validation configuration", async () => {
  const expired = await createTestFile(
    bundle({
      expires:
        Date.parse(
          "2026-08-09T10:07:59.000Z",
        ) / 1_000,
    }),
  );

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserAuthenticationStateFile(
        configuration(expired.filePath),
      ),
    expectsFileError(
      "AUTH_STATE_FILE_INVALID",
    ),
  );

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserAuthenticationStateFile(
        configuration(expired.filePath, {
          origin: "http://localhost:3000",
        }),
      ),
    expectsFileError(
      "AUTH_STATE_FILE_CONFIGURATION_INVALID",
    ),
  );
});
