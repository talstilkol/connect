import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlaywrightTeamInvitationBrowserSessionDriver,
} from "../scripts/team-invitation-playwright-session-driver.mjs";

const invitationUrl =
  `https://staging.connect.test/invite/team_invitation_v1_${"a".repeat(64)}`;
const clock = () =>
  new Date("2026-08-09T12:00:00.000Z");

function createBrowserHarness({
  outcome = "accepted",
  landedUrl = invitationUrl,
  liveRegion = "polite",
  referer,
  privateFieldCount = 0,
  invitationDetailCount = 0,
} = {}) {
  const calls = {
    contextOptions: [],
    closed: 0,
    clicks: 0,
    keyPresses: [],
  };
  const focusOrder = [
    "skip-link",
    "brand-link",
    "accept-button",
    "home-link",
  ];
  let focusIndex = -1;
  let currentOutcome = "ready";

  const statusLocator = {
    async getAttribute(name) {
      if (name === "aria-live") {
        return liveRegion;
      }

      if (name === "data-invitation-status") {
        return currentOutcome;
      }

      return null;
    },
    async waitFor() {
      assert.notEqual(currentOutcome, "ready");
    },
  };
  const page = {
    keyboard: {
      async press(key) {
        calls.keyPresses.push(key);

        if (key === "Tab") {
          focusIndex += 1;
        } else if (key === "Shift+Tab") {
          focusIndex -= 1;
        } else if (key === "Enter") {
          assert.equal(
            focusOrder[focusIndex],
            "accept-button",
          );
          currentOutcome = outcome;
        }
      },
    },
    async goto(url, options) {
      assert.equal(url, invitationUrl);
      assert.deepEqual(options, {
        waitUntil: "domcontentloaded",
      });

      return {
        request() {
          return {
            headers() {
              return referer === undefined
                ? {}
                : { referer };
            },
          };
        },
      };
    },
    locator(selector) {
      if (
        selector.includes(
          "data-invitation-status",
        )
      ) {
        return statusLocator;
      }

      if (selector === ":focus") {
        return {
          async getAttribute(name) {
            assert.equal(
              name,
              "data-e2e-focus-ref",
            );
            return focusOrder[focusIndex] ?? null;
          },
        };
      }

      if (selector === ":focus-visible") {
        return {
          async count() {
            return focusIndex >= 0 ? 1 : 0;
          },
        };
      }

      if (
        selector ===
        '[data-e2e-focus-ref="accept-button"]'
      ) {
        return {
          async click() {
            calls.clicks += 1;
            currentOutcome = outcome;
          },
        };
      }

      if (
        selector ===
        "[data-invitation-private-detail]"
      ) {
        return {
          async count() {
            return invitationDetailCount;
          },
        };
      }

      return {
        async count() {
          return privateFieldCount;
        },
      };
    },
    url() {
      return landedUrl;
    },
  };
  const context = {
    async newPage() {
      return page;
    },
    async close() {
      calls.closed += 1;
    },
  };
  const browser = {
    async newContext(options) {
      calls.contextOptions.push(options);
      return context;
    },
  };

  return { browser, calls };
}

function inputFor(overrides = {}) {
  return {
    scenarioName:
      "verified-matching-email-accepts",
    invitationUrl,
    sessionProfile:
      "verified-matching-email",
    interaction: "submit",
    ...overrides,
  };
}

function createDriver(
  browser,
  resolveStorageState = async () => ({
    cookies: [],
    origins: [],
  }),
) {
  return createPlaywrightTeamInvitationBrowserSessionDriver({
    browser,
    clock,
    resolveStorageState,
  });
}

test("runs an authenticated scenario in one closed isolated context", async () => {
  const { browser, calls } =
    createBrowserHarness({
      privateFieldCount: 2,
      invitationDetailCount: 1,
    });
  let storageStateCalls = 0;
  const driver = createDriver(
    browser,
    async (profile, signal) => {
      storageStateCalls += 1;
      assert.equal(
        profile,
        "verified-matching-email",
      );
      assert.equal(signal.aborted, false);
      return {
        cookies: [],
        origins: [],
      };
    },
  );
  const transcript =
    await driver.runIsolatedScenario(
      inputFor(),
      new AbortController().signal,
    );

  assert.equal(storageStateCalls, 1);
  assert.equal(calls.closed, 1);
  assert.equal(calls.clicks, 1);
  assert.deepEqual(calls.keyPresses, []);
  assert.equal(
    transcript.sessionIsolation,
    "isolated-and-closed",
  );
  assert.equal(transcript.outcome, "accepted");
  assert.equal(
    transcript.exposedPrivateFieldCount,
    2,
  );
  assert.equal(
    transcript.exposedInvitationDetailCount,
    1,
  );
  assert.equal(transcript.accessibility, null);
  assert.match(
    transcript.runFingerprint,
    /^sha256:[a-f0-9]{64}$/,
  );
  assert.doesNotMatch(
    JSON.stringify(transcript),
    /invitationUrl|invitationKey|cookies|origins/,
  );
});

test("uses an empty isolated state for the signed-out scenario", async () => {
  const { browser, calls } =
    createBrowserHarness({
      outcome: "sign-in-required",
    });
  const driver = createDriver(
    browser,
    async () => {
      throw new Error(
        "SIGNED_OUT_MUST_NOT_RESOLVE_SECRET_STATE",
      );
    },
  );

  const transcript =
    await driver.runIsolatedScenario(
      inputFor({
        scenarioName:
          "unauthenticated-user-rejected",
        sessionProfile: "signed-out",
      }),
      new AbortController().signal,
    );

  assert.equal(
    transcript.outcome,
    "sign-in-required",
  );
  assert.deepEqual(
    calls.contextOptions,
    [
      {
        storageState: {
          cookies: [],
          origins: [],
        },
      },
    ],
  );
});

test("collects exact keyboard, focus, and live-region evidence", async () => {
  const { browser, calls } =
    createBrowserHarness({
      outcome: "already-accepted",
    });
  const driver = createDriver(browser);

  const transcript =
    await driver.runIsolatedScenario(
      inputFor({
        scenarioName:
          "keyboard-and-focus-accessible",
        sessionProfile:
          "verified-accessibility",
        interaction: "keyboard-submit",
      }),
      new AbortController().signal,
    );

  assert.deepEqual(calls.keyPresses, [
    "Tab",
    "Tab",
    "Tab",
    "Tab",
    "Shift+Tab",
    "Enter",
  ]);
  assert.deepEqual(transcript.accessibility, {
    focusOrder: [
      "skip-link",
      "brand-link",
      "accept-button",
      "home-link",
    ],
    submittedWith: "keyboard",
    statusLiveRegion: "polite",
    announcementObserved: true,
    focusIndicatorVisible: true,
  });
});

test("closes the context and rejects referrer or cross-origin navigation", async () => {
  for (const harnessOptions of [
    {
      referer: "https://source.connect.test/",
    },
    {
      landedUrl:
        "https://identity.connect.test/sign-in",
    },
  ]) {
    const { browser, calls } =
      createBrowserHarness(harnessOptions);
    const driver = createDriver(browser);

    await assert.rejects(
      driver.runIsolatedScenario(
        inputFor(),
        new AbortController().signal,
      ),
      /REFERRER_POLICY_FAILED|CROSS_ORIGIN_NAVIGATION/,
    );
    assert.equal(calls.closed, 1);
  }
});

test("fails closed for an invalid auth state, live region, or aborted signal", async () => {
  const invalidStateHarness =
    createBrowserHarness();
  const invalidStateDriver = createDriver(
    invalidStateHarness.browser,
    async () => "state-file.json",
  );

  await assert.rejects(
    invalidStateDriver.runIsolatedScenario(
      inputFor(),
      new AbortController().signal,
    ),
    /STORAGE_STATE_INVALID/,
  );
  assert.equal(
    invalidStateHarness.calls.closed,
    0,
  );

  const liveRegionHarness =
    createBrowserHarness({
      outcome: "already-accepted",
      liveRegion: null,
    });
  const liveRegionDriver = createDriver(
    liveRegionHarness.browser,
  );

  await assert.rejects(
    liveRegionDriver.runIsolatedScenario(
      inputFor({
        scenarioName:
          "keyboard-and-focus-accessible",
        sessionProfile:
          "verified-accessibility",
        interaction: "keyboard-submit",
      }),
      new AbortController().signal,
    ),
    /LIVE_REGION_INVALID/,
  );
  assert.equal(
    liveRegionHarness.calls.closed,
    1,
  );

  const abortedHarness = createBrowserHarness();
  const abortedDriver = createDriver(
    abortedHarness.browser,
  );
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    abortedDriver.runIsolatedScenario(
      inputFor(),
      controller.signal,
    ),
    /ABORTED/,
  );
  assert.equal(abortedHarness.calls.closed, 0);
});
