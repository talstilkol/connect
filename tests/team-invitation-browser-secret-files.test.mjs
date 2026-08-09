import assert from "node:assert/strict";
import test from "node:test";

import {
  verifyTeamInvitationBrowserSecretFiles,
  TeamInvitationBrowserSecretFilesError,
} from "../scripts/verify-team-invitation-browser-secret-files.mjs";
import {
  TeamInvitationBrowserAuthenticationStateFileError,
} from "../scripts/verify-team-invitation-browser-auth-state-file.mjs";
import {
  TeamInvitationBrowserCaseInventoryFileError,
} from "../scripts/verify-team-invitation-browser-case-inventory-file.mjs";

const origin =
  "https://staging.connect.test";
const now = new Date(
  "2026-08-09T12:00:00.000Z",
);
const releaseManifest = Object.freeze({
  schemaVersion: 1,
  releaseId:
    `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
});

function configuration(
  dependencies,
  overrides = {},
) {
  return {
    environment: {
      TEAM_INVITATION_BROWSER_E2E_ORIGIN:
        origin,
    },
    releaseManifest,
    clock: () => now,
    authenticationStatePath:
      "/private/tmp/auth-states.json",
    caseInventoryPath:
      "/private/tmp/case-inventory.json",
    dependencies,
    ...overrides,
  };
}

function expectsError(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserSecretFilesError &&
    error.code === code &&
    error.message === code;
}

test("verifies both secret files against one immutable clock and release", async () => {
  const calls = [];
  let clockCalls = 0;
  const result =
    await verifyTeamInvitationBrowserSecretFiles(
      configuration({
        async verifyAuthenticationStateFile(
          value,
        ) {
          calls.push({
            kind: "authentication",
            value,
            now: value.clock().toISOString(),
          });
          return {
            origin,
            profileCount: 6,
          };
        },
        async verifyCaseInventoryFile(value) {
          calls.push({
            kind: "cases",
            value,
            now: value.clock().toISOString(),
          });
          return {
            origin,
            releaseId:
              releaseManifest.releaseId,
            scenarioCount: 7,
          };
        },
      }, {
        clock: () => {
          clockCalls += 1;
          return now;
        },
      }),
    );

  assert.equal(clockCalls, 1);
  assert.deepEqual(
    calls.map((call) => call.kind),
    ["authentication", "cases"],
  );
  assert.equal(calls[0].now, now.toISOString());
  assert.equal(calls[1].now, now.toISOString());
  assert.deepEqual(result, {
    origin,
    releaseId: releaseManifest.releaseId,
    profileCount: 6,
    scenarioCount: 7,
  });
  assert.ok(Object.isFrozen(result));
});

test("stops before case access when authentication state is invalid", async () => {
  let caseCalls = 0;

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserSecretFiles(
        configuration({
          async verifyAuthenticationStateFile() {
            throw new TeamInvitationBrowserAuthenticationStateFileError(
              "AUTH_STATE_FILE_INVALID",
            );
          },
          async verifyCaseInventoryFile() {
            caseCalls += 1;
          },
        }),
      ),
    expectsError(
      "SECRET_FILES_AUTHENTICATION_INVALID",
    ),
  );

  assert.equal(caseCalls, 0);
});

test("rejects an invalid release before either secret file is read", async () => {
  let verificationCalls = 0;
  const dependencies = {
    async verifyAuthenticationStateFile() {
      verificationCalls += 1;
    },
    async verifyCaseInventoryFile() {
      verificationCalls += 1;
    },
  };

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserSecretFiles(
        configuration(dependencies, {
          releaseManifest: {
            ...releaseManifest,
            commitSha: "invalid",
          },
        }),
      ),
    expectsError(
      "SECRET_FILES_CONFIGURATION_INVALID",
    ),
  );

  assert.equal(verificationCalls, 0);
});

test("maps case inventory failure without exposing its contents", async () => {
  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserSecretFiles(
        configuration({
          async verifyAuthenticationStateFile() {
            return {
              origin,
              profileCount: 6,
            };
          },
          async verifyCaseInventoryFile() {
            throw new TeamInvitationBrowserCaseInventoryFileError(
              "CASE_INVENTORY_FILE_EXPIRED",
            );
          },
        }),
      ),
    expectsError(
      "SECRET_FILES_CASE_INVENTORY_INVALID",
    ),
  );
});

test("rejects mismatched and extended verifier results", async () => {
  const cases = [
    {
      authentication: {
        origin,
        profileCount: 6,
        state: "forbidden",
      },
      caseResult: {
        origin,
        releaseId:
          releaseManifest.releaseId,
        scenarioCount: 7,
      },
      code: "SECRET_FILES_RESULT_INVALID",
    },
    {
      authentication: {
        origin,
        profileCount: 6,
      },
      caseResult: {
        origin:
          "https://other-staging.connect.test",
        releaseId:
          releaseManifest.releaseId,
        scenarioCount: 7,
      },
      code: "SECRET_FILES_MISMATCH",
    },
  ];

  for (const value of cases) {
    await assert.rejects(
      () =>
        verifyTeamInvitationBrowserSecretFiles(
          configuration({
            async verifyAuthenticationStateFile() {
              return value.authentication;
            },
            async verifyCaseInventoryFile() {
              return value.caseResult;
            },
          }),
        ),
      expectsError(value.code),
    );
  }
});
