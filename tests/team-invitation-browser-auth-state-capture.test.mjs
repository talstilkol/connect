import assert from "node:assert/strict";
import test from "node:test";

import {
  captureTeamInvitationBrowserAuthenticationStates,
  TeamInvitationBrowserAuthenticationCaptureError,
} from "../scripts/capture-team-invitation-browser-auth-states.mjs";
import {
  teamInvitationBrowserAuthenticatedProfiles,
} from "../scripts/team-invitation-browser-auth-state-bundle.mjs";

const origin =
  "https://staging.connect.example";
const now = new Date(
  "2026-08-09T10:00:00.000Z",
);

function stateFor(profile, overrides = {}) {
  return {
    cookies: [
      {
        name: "__session",
        value: `session-${profile}`,
        domain: "staging.connect.example",
        path: "/",
        expires:
          Date.parse(
            "2026-08-10T10:00:00.000Z",
          ) / 1_000,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "provider",
        value: "foreign-session",
        domain: "accounts.example.net",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        partitionKey: "https://example.net",
      },
    ],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: "session-profile",
            value: profile,
          },
        ],
      },
      {
        origin:
          "https://accounts.example.net",
        localStorage: [],
        indexedDB: [],
      },
    ],
    ...overrides,
  };
}

function createBrowser({
  finalUrl = `${origin}/workspace`,
  stateOverride,
} = {}) {
  const records = [];

  return {
    records,
    async newContext(options) {
      const profile =
        teamInvitationBrowserAuthenticatedProfiles[
          records.length
        ];
      const record = {
        options,
        profile,
        navigation: undefined,
        closed: false,
      };
      records.push(record);

      return {
        async newPage() {
          return {
            async goto(url, optionsValue) {
              record.navigation = {
                url,
                options: optionsValue,
              };
            },
            url() {
              return finalUrl;
            },
          };
        },
        async storageState() {
          const value = stateFor(profile);
          return stateOverride
            ? stateOverride(value, profile)
            : value;
        },
        async close() {
          record.closed = true;
        },
      };
    },
  };
}

function expectsCaptureError(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserAuthenticationCaptureError &&
    error.code === code &&
    error.message === code;
}

test("captures six isolated, staging-scoped, deeply frozen states", async () => {
  const browser = createBrowser();
  const promptedProfiles = [];

  const captured =
    await captureTeamInvitationBrowserAuthenticationStates({
      origin,
      browser,
      prompt: async (profile) => {
        promptedProfiles.push(profile);
      },
      clock: () => now,
    });

  assert.deepEqual(
    promptedProfiles,
    teamInvitationBrowserAuthenticatedProfiles,
  );
  assert.equal(browser.records.length, 6);
  assert.ok(
    browser.records.every(
      (record) => record.closed,
    ),
  );

  for (const record of browser.records) {
    assert.deepEqual(record.options, {
      storageState: {
        cookies: [],
        origins: [],
      },
    });
    assert.deepEqual(record.navigation, {
      url: `${origin}/login`,
      options: {
        waitUntil: "domcontentloaded",
      },
    });
  }

  for (const profile of promptedProfiles) {
    assert.equal(
      captured[profile].cookies.length,
      1,
    );
    assert.equal(
      captured[profile].origins.length,
      1,
    );
    assert.equal(
      captured[profile].origins[0].origin,
      origin,
    );
  }

  assert.ok(Object.isFrozen(captured));
  assert.ok(
    Object.isFrozen(
      captured["verified-accessibility"]
        .cookies[0],
    ),
  );
});

test("rejects a foreign final page and closes its isolated context", async () => {
  const browser = createBrowser({
    finalUrl:
      "https://accounts.example.net/session",
  });

  await assert.rejects(
    () =>
      captureTeamInvitationBrowserAuthenticationStates({
        origin,
        browser,
        prompt: async () => {},
        clock: () => now,
      }),
    expectsCaptureError(
      "AUTH_CAPTURE_NAVIGATION_INVALID",
    ),
  );

  assert.equal(browser.records.length, 1);
  assert.equal(browser.records[0].closed, true);
});

test("rejects extended staging cookies and closes the context", async () => {
  const browser = createBrowser({
    stateOverride(value) {
      value.cookies[0].partitionKey =
        "https://foreign.example";
      return value;
    },
  });

  await assert.rejects(
    () =>
      captureTeamInvitationBrowserAuthenticationStates({
        origin,
        browser,
        prompt: async () => {},
        clock: () => now,
      }),
    expectsCaptureError(
      "AUTH_CAPTURE_STATE_INVALID",
    ),
  );

  assert.equal(browser.records.length, 1);
  assert.equal(browser.records[0].closed, true);
});

test("rejects invalid runtime configuration before opening a context", async () => {
  const browser = createBrowser();

  await assert.rejects(
    () =>
      captureTeamInvitationBrowserAuthenticationStates({
        origin: "http://localhost:3000",
        browser,
        prompt: async () => {},
        clock: () => now,
      }),
    expectsCaptureError(
      "AUTH_CAPTURE_CONFIGURATION_INVALID",
    ),
  );
  await assert.rejects(
    () =>
      captureTeamInvitationBrowserAuthenticationStates({
        origin,
        browser,
        prompt: undefined,
        clock: () => now,
      }),
    expectsCaptureError(
      "AUTH_CAPTURE_CONFIGURATION_INVALID",
    ),
  );

  assert.equal(browser.records.length, 0);
});

test("closes an invalid context before rejecting it", async () => {
  let closed = false;
  const browser = {
    async newContext() {
      return {
        async close() {
          closed = true;
        },
      };
    },
  };

  await assert.rejects(
    () =>
      captureTeamInvitationBrowserAuthenticationStates({
        origin,
        browser,
        prompt: async () => {},
        clock: () => now,
      }),
    expectsCaptureError(
      "AUTH_CAPTURE_BROWSER_INVALID",
    ),
  );

  assert.equal(closed, true);
});

test("closes the current context when capture fails", async () => {
  const browser = createBrowser();

  await assert.rejects(
    () =>
      captureTeamInvitationBrowserAuthenticationStates({
        origin,
        browser,
        prompt: async () => {
          throw new Error("operator-aborted");
        },
        clock: () => now,
      }),
    /operator-aborted/,
  );

  assert.equal(browser.records.length, 1);
  assert.equal(browser.records[0].closed, true);
});
