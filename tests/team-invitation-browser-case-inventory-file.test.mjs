import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  chmod,
  mkdir,
  rm,
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
  buildTeamInvitationBrowserScenarioCaseInventory,
} from "../server/operations/teamInvitationBrowserScenarioCaseInventory.ts";
import {
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";
import {
  verifyTeamInvitationBrowserCaseInventoryFile,
  TeamInvitationBrowserCaseInventoryFileError,
} from "../scripts/verify-team-invitation-browser-case-inventory-file.mjs";

const now = new Date(
  "2026-08-09T12:00:00.000Z",
);
const origin =
  "https://staging.connect.test";
const releaseManifest = Object.freeze({
  schemaVersion: 1,
  releaseId:
    `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
});
const policy = Object.freeze({
  ttlHours: 72,
  reRequest: "after-terminal",
});
const testRoot = join(
  tmpdir(),
  "connect-team-invitation-case-file-tests",
  String(process.pid),
);
let testOrdinal = 0;

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function artifactDigest(value = "artifact") {
  return `sha256:${sha256(value)}`;
}

function cases() {
  return teamInvitationBrowserScenarioRegistry.map(
    (scenario) => {
      const base = {
        name: scenario.name,
        invitationKey:
          `team_invitation_v1_${sha256(
            `case:${scenario.name}`,
          )}`,
      };
      const requiresDatabase =
        scenario.assertions.some(
          (assertion) =>
            assertion.source === "database",
        );

      if (!requiresDatabase) {
        return base;
      }

      return {
        ...base,
        proofScope:
          scenario.name ===
          "unauthenticated-user-rejected"
            ? { kind: "tenant-total" }
            : {
                kind: "external-user",
                externalUserId:
                  `staging_identity_${sha256(
                    scenario.name,
                  )}`,
              },
      };
    },
  );
}

function inventory() {
  return buildTeamInvitationBrowserScenarioCaseInventory(
    {
      origin,
      releaseId:
        releaseManifest.releaseId,
      commitSha:
        releaseManifest.commitSha,
      artifactDigest: artifactDigest(),
      policy,
      cases: cases(),
      lifetimeMinutes: 60,
    },
    now,
  );
}

function environment(overrides = {}) {
  return {
    APP_DEPLOYMENT_ARTIFACT_DIGEST:
      artifactDigest(),
    TEAM_INVITATION_BROWSER_E2E_ORIGIN:
      origin,
    TEAM_INVITATION_TTL_HOURS: "72",
    TEAM_INVITATION_REREQUEST_POLICY:
      "after-terminal",
    ...overrides,
  };
}

async function createTestFile(
  value = inventory(),
) {
  testOrdinal += 1;
  const directory = join(
    testRoot,
    String(testOrdinal),
  );
  const filePath = join(
    directory,
    "case-inventory.json",
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

  return filePath;
}

function configuration(
  filePath,
  overrides = {},
) {
  return {
    filePath,
    environment: environment(),
    releaseManifest,
    clock: () => now,
    ...overrides,
  };
}

function expectsFileError(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserCaseInventoryFileError &&
    error.code === code &&
    error.message === code;
}

test.after(async () => {
  await rm(testRoot, {
    recursive: true,
    force: true,
  });
});

test("accepts one private inventory bound to the exact staging release", async () => {
  const filePath = await createTestFile();

  const result =
    await verifyTeamInvitationBrowserCaseInventoryFile(
      configuration(filePath),
    );

  assert.deepEqual(result, {
    origin,
    releaseId: releaseManifest.releaseId,
    scenarioCount: 7,
  });
  assert.ok(Object.isFrozen(result));
});

test("separates an expired inventory from malformed file state", async () => {
  const filePath = await createTestFile();

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserCaseInventoryFile(
        configuration(filePath, {
          clock: () =>
            new Date(
              "2026-08-09T13:01:00.000Z",
            ),
        }),
      ),
    expectsFileError(
      "CASE_INVENTORY_FILE_EXPIRED",
    ),
  );

  const malformedPath =
    await createTestFile({
      ...inventory(),
      extra: "forbidden",
    });

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserCaseInventoryFile(
        configuration(malformedPath),
      ),
    expectsFileError(
      "CASE_INVENTORY_FILE_INVALID",
    ),
  );
});

test("rejects release mismatch without exposing inventory contents", async () => {
  const filePath = await createTestFile();

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserCaseInventoryFile(
        configuration(filePath, {
          environment: environment({
            APP_DEPLOYMENT_ARTIFACT_DIGEST:
              artifactDigest(
                "different-artifact",
              ),
          }),
        }),
      ),
    expectsFileError(
      "CASE_INVENTORY_FILE_MISMATCH",
    ),
  );
});

test("rejects non-private files and invalid policy configuration", async () => {
  const filePath = await createTestFile();
  await chmod(filePath, 0o640);

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserCaseInventoryFile(
        configuration(filePath),
      ),
    expectsFileError(
      "CASE_INVENTORY_FILE_INVALID",
    ),
  );

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserCaseInventoryFile(
        configuration(filePath, {
          environment: environment({
            TEAM_INVITATION_TTL_HOURS:
              "unknown",
          }),
        }),
      ),
    expectsFileError(
      "CASE_INVENTORY_FILE_CONFIGURATION_INVALID",
    ),
  );
});
