import assert from "node:assert/strict";
import test from "node:test";

import {
  parseTeamInvitationBrowserLauncherConfiguration,
  preflightTeamInvitationBrowserLauncher,
  runTeamInvitationBrowserLauncher,
  TeamInvitationBrowserLauncherError,
} from "../scripts/run-team-invitation-browser-e2e.mjs";

const releaseManifest = Object.freeze({
  schemaVersion: 1,
  releaseId:
    `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
});
const authenticatedProfiles = [
  "unverified-primary-email",
  "verified-matching-email",
  "verified-mismatched-email",
  "verified-expired-invitation",
  "verified-accepted-invitation",
  "verified-accessibility",
];
const launcherNow = new Date(
  "2026-08-09T10:00:00.000Z",
);

function authenticationStates() {
  return Object.fromEntries(
    authenticatedProfiles.map((profile) => [
      profile,
      {
        cookies: [
          {
            name: "__session",
            value: `session-${profile}`,
            domain:
              "staging.connect.example",
            path: "/",
            expires:
              Date.parse(
                "2026-08-10T10:00:00.000Z",
              ) / 1_000,
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
          },
        ],
        origins: [],
      },
    ]),
  );
}

function environment(overrides = {}) {
  return {
    TEAM_INVITATION_BROWSER_E2E_ORIGIN:
      "https://staging.connect.example",
    APP_DEPLOYMENT_ARTIFACT_DIGEST:
      `sha256:${"c".repeat(64)}`,
    TEAM_INVITATION_TTL_HOURS: "72",
    TEAM_INVITATION_REREQUEST_POLICY:
      "after-terminal",
    TEAM_INVITATION_BROWSER_E2E_CASES_JSON:
      "contract-inventory",
    TEAM_INVITATION_BROWSER_AUTH_STATES_JSON:
      JSON.stringify(authenticationStates()),
    TEAM_INVITATION_BROWSER_CLOUDFLARE_ACCOUNT_ID:
      "d".repeat(32),
    TEAM_INVITATION_BROWSER_CLOUDFLARE_DATABASE_ID:
      "11111111-2222-4333-8444-555555555555",
    TEAM_INVITATION_BROWSER_CLOUDFLARE_D1_READ_TOKEN:
      "TEST_ONLY_D1_READ_CREDENTIAL_VALUE",
    ...overrides,
  };
}

function expectsLauncherCode(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserLauncherError &&
    error.code === code &&
    error.message === code;
}

test("parses only a release-bound staging launcher configuration", () => {
  const configuration =
    parseTeamInvitationBrowserLauncherConfiguration({
      environment: environment(),
      releaseManifest,
      now: launcherNow,
    });

  assert.equal(
    configuration.releaseId,
    releaseManifest.releaseId,
  );
  assert.equal(
    configuration.commitSha,
    releaseManifest.commitSha,
  );
  assert.deepEqual(configuration.policy, {
    ttlHours: 72,
    reRequest: "after-terminal",
  });
  assert.deepEqual(
    Object.keys(
      configuration.authenticationStates,
    ).sort(),
    [...authenticatedProfiles].sort(),
  );
});

test("rejects an incomplete authentication-state inventory before browser startup", () => {
  const incomplete = authenticationStates();
  delete incomplete["verified-accessibility"];

  assert.throws(
    () =>
      parseTeamInvitationBrowserLauncherConfiguration({
        environment: environment({
          TEAM_INVITATION_BROWSER_AUTH_STATES_JSON:
            JSON.stringify(incomplete),
        }),
        releaseManifest,
        now: launcherNow,
      }),
    expectsLauncherCode(
      "CONFIGURATION_INVALID",
    ),
  );
});

test("rejects a local or non-canonical browser origin before browser startup", () => {
  for (const origin of [
    "http://localhost:3000",
    "https://staging.connect.example/",
  ]) {
    assert.throws(
      () =>
        parseTeamInvitationBrowserLauncherConfiguration({
          environment: environment({
            TEAM_INVITATION_BROWSER_E2E_ORIGIN:
              origin,
          }),
          releaseManifest,
          now: launcherNow,
        }),
      expectsLauncherCode(
        "CONFIGURATION_INVALID",
      ),
    );
  }
});

test("preflights release, inventory, auth, and D1 configuration without browser or receipt access", async () => {
  const events = [];
  const dependencies = {
    createReleaseManifest: async () => {
      events.push("release");
      return releaseManifest;
    },
    createCaseResolver: () => {
      events.push("inventory");
      return {
        resolveScenarioCase: async () => ({}),
      };
    },
    createD1Port: () => {
      events.push("d1-configuration");
      return {
        readDatabaseProof: async () => ({}),
      };
    },
    openBrowserSession: async () => {
      events.push("browser");
      throw new Error("BROWSER_MUST_NOT_OPEN");
    },
    createBrowserPort: () => {
      events.push("browser-port");
      return {};
    },
    executeRun: async () => {
      events.push("execution");
      return {};
    },
    writeReceipt: async () => {
      events.push("receipt");
    },
  };

  const result =
    await preflightTeamInvitationBrowserLauncher({
      environment: environment(),
      clock: () =>
        launcherNow,
      dependencies,
    });

  assert.deepEqual(result, {
    releaseId: releaseManifest.releaseId,
    scenarioCount: 7,
  });
  assert.deepEqual(events, [
    "release",
    "inventory",
    "d1-configuration",
  ]);
});

test("composes case, browser, and D1 ports and writes only after browser closure", async () => {
  const events = [];
  let storageStateResolver;
  const receipt = Object.freeze({
    schemaVersion: 1,
    releaseId: releaseManifest.releaseId,
  });
  const casePort = Object.freeze({
    resolveScenarioCase: async () => ({
      invitationKey:
        `team_invitation_v1_${"e".repeat(64)}`,
    }),
  });
  const browserPort = Object.freeze({
    executeBrowserScenario: async () => ({
      status: "passed",
    }),
  });
  const d1Port = Object.freeze({
    readDatabaseProof: async () => ({
      invitationCount: 1,
    }),
  });
  const driver = Object.freeze({
    runIsolatedScenario: async () => ({
      status: "passed",
    }),
  });
  const dependencies = {
    createReleaseManifest: async () =>
      releaseManifest,
    createCaseResolver: (
      rawInventory,
      expected,
      now,
    ) => {
      assert.equal(
        rawInventory,
        "contract-inventory",
      );
      assert.equal(
        expected.minimumRemainingLifetimeMilliseconds,
        480_000,
      );
      assert.equal(
        now.toISOString(),
        "2026-08-09T10:00:00.000Z",
      );
      return casePort;
    },
    createD1Port: (configuration) => {
      assert.equal(
        configuration.accountId,
        "d".repeat(32),
      );
      assert.equal(
        typeof configuration.fetchImpl,
        "function",
      );
      return d1Port;
    },
    openBrowserSession: async (
      configuration,
    ) => {
      storageStateResolver =
        configuration.resolveStorageState;
      events.push("opened");
      return {
        driver,
        async close() {
          events.push("closed");
        },
      };
    },
    createBrowserPort: (
      configuration,
      suppliedDriver,
    ) => {
      assert.deepEqual(configuration, {
        origin:
          "https://staging.connect.example",
      });
      assert.equal(suppliedDriver, driver);
      return browserPort;
    },
    executeRun: async (input, ports) => {
      events.push("executed");
      assert.equal(
        input.scenarioTimeoutMilliseconds,
        60_000,
      );
      assert.equal(
        ports.resolveScenarioCase,
        casePort.resolveScenarioCase,
      );
      assert.equal(
        ports.executeBrowserScenario,
        browserPort.executeBrowserScenario,
      );
      assert.equal(
        ports.readDatabaseProof,
        d1Port.readDatabaseProof,
      );
      return receipt;
    },
    writeReceipt: async (value) => {
      events.push("written");
      assert.equal(value, receipt);
    },
  };

  const result =
    await runTeamInvitationBrowserLauncher({
      environment: environment(),
      clock: () =>
        launcherNow,
      dependencies,
    });

  assert.deepEqual(events, [
    "opened",
    "executed",
    "closed",
    "written",
  ]);
  assert.equal(
    result.releaseId,
    releaseManifest.releaseId,
  );
  assert.deepEqual(
    await storageStateResolver(
      "verified-matching-email",
      new AbortController().signal,
    ),
    authenticationStates()[
      "verified-matching-email"
    ],
  );
});

test("closes the browser and never writes a receipt after execution failure", async () => {
  const events = [];
  const dependencies = {
    createReleaseManifest: async () =>
      releaseManifest,
    createCaseResolver: () => ({
      resolveScenarioCase: async () => ({}),
    }),
    createD1Port: () => ({
      readDatabaseProof: async () => ({}),
    }),
    openBrowserSession: async () => ({
      driver: {},
      async close() {
        events.push("closed");
      },
    }),
    createBrowserPort: () => ({
      executeBrowserScenario: async () => ({}),
    }),
    executeRun: async () => {
      events.push("failed");
      throw new Error("ASSERTION_FAILED");
    },
    writeReceipt: async () => {
      events.push("written");
    },
  };

  await assert.rejects(
    runTeamInvitationBrowserLauncher({
      environment: environment(),
      clock: () =>
        launcherNow,
      dependencies,
    }),
    /ASSERTION_FAILED/,
  );
  assert.deepEqual(events, [
    "failed",
    "closed",
  ]);
});
