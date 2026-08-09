import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  createTeamInvitationBrowserExecutorBrowserPort,
  TeamInvitationBrowserSessionDriverError,
} from "../server/operations/teamInvitationBrowserSessionDriver.ts";
import {
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";

const origin =
  "https://staging.connect.test";
const invitationKey =
  `team_invitation_v1_${"a".repeat(64)}`;

function fingerprint(value) {
  return `sha256:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

function outcomeFor(name) {
  switch (name) {
    case "unauthenticated-user-rejected":
      return "sign-in-required";
    case "unverified-primary-email-rejected":
      return "identity-verification-required";
    case "verified-matching-email-accepts":
      return "accepted";
    case "mismatched-email-remains-private":
    case "expired-invitation-rejected":
      return "invitation-unavailable";
    case "identical-retry-idempotent":
    case "keyboard-and-focus-accessible":
      return "already-accepted";
    default:
      throw new Error("UNKNOWN_SCENARIO");
  }
}

function transcriptFor(
  scenarioName,
  overrides = {},
) {
  const accessibility =
    scenarioName ===
    "keyboard-and-focus-accessible";

  return {
    completedAt:
      "2026-08-09T12:00:00.000Z",
    runFingerprint:
      fingerprint(`run:${scenarioName}`),
    sessionIsolation:
      "isolated-and-closed",
    navigatedOrigin: origin,
    outcome: outcomeFor(scenarioName),
    exposedPrivateFieldCount: 0,
    exposedInvitationDetailCount: 0,
    accessibility: accessibility
      ? {
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
        }
      : null,
    ...overrides,
  };
}

function createDriver(overrides = {}) {
  return {
    async runIsolatedScenario(input) {
      return transcriptFor(
        input.scenarioName,
        overrides,
      );
    },
  };
}

function createPort(driver = createDriver()) {
  return createTeamInvitationBrowserExecutorBrowserPort(
    { origin },
    driver,
  );
}

function expectsCode(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserSessionDriverError &&
    error.code === code &&
    error.message === code;
}

test("maps all seven canonical session profiles to bounded executor observations", async () => {
  const calls = [];
  const port = createPort({
    async runIsolatedScenario(input, signal) {
      assert.equal(signal.aborted, false);
      calls.push(input);
      return transcriptFor(
        input.scenarioName,
      );
    },
  });

  for (
    const scenario of
      teamInvitationBrowserScenarioRegistry
  ) {
    const result =
      await port.executeBrowserScenario(
        {
          scenarioName: scenario.name,
          invitationKey,
        },
        new AbortController().signal,
      );
    const browserAssertionCount =
      scenario.assertions.filter(
        (assertion) =>
          assertion.source === "browser",
      ).length;

    assert.deepEqual(Object.keys(result), [
      "completedAt",
      "runFingerprint",
      "observations",
    ]);
    assert.equal(
      result.observations.length,
      browserAssertionCount,
    );
    assert.doesNotMatch(
      JSON.stringify(result),
      /invitationKey|invitationUrl|sessionProfile|Cookie|Token/i,
    );
  }

  assert.deepEqual(
    calls.map((call) => call.sessionProfile),
    [
      "signed-out",
      "unverified-primary-email",
      "verified-matching-email",
      "verified-mismatched-email",
      "verified-expired-invitation",
      "verified-accepted-invitation",
      "verified-accessibility",
    ],
  );
  assert.ok(
    calls.every(
      (call) =>
        call.invitationUrl ===
        `${origin}/invite/${invitationKey}`,
    ),
  );
});

test("derives privacy observations from measured exposure counts", async () => {
  const result =
    await createPort(
      createDriver({
        exposedPrivateFieldCount: 2,
      }),
    ).executeBrowserScenario(
      {
        scenarioName:
          "unauthenticated-user-rejected",
        invitationKey,
      },
      new AbortController().signal,
    );

  assert.deepEqual(
    result.observations,
    [
      {
        name: "sign-in-required",
        observation: {
          observed: "sign-in-required",
        },
      },
      {
        name: "private-fields-absent",
        observation: {
          exposedFieldCount: 2,
        },
      },
    ],
  );
});

test("derives keyboard, focus, and polite status observations from one closed session", async () => {
  const result =
    await createPort().executeBrowserScenario(
      {
        scenarioName:
          "keyboard-and-focus-accessible",
        invitationKey,
      },
      new AbortController().signal,
    );

  assert.deepEqual(result.observations, [
    {
      name: "initial-focus-order-valid",
      observation: { valid: true },
    },
    {
      name: "submit-keyboard-operable",
      observation: {
        submittedWith: "keyboard",
      },
    },
    {
      name: "status-announced",
      observation: {
        politeStatusObserved: true,
      },
    },
    {
      name: "focus-visible",
      observation: { visible: true },
    },
  ]);
});

test("preserves a wrong focus order as a failing observation", async () => {
  const accessibility =
    transcriptFor(
      "keyboard-and-focus-accessible",
    ).accessibility;
  const result =
    await createPort(
      createDriver({
        accessibility: {
          ...accessibility,
          focusOrder: [
            "brand-link",
            "skip-link",
            "accept-button",
            "home-link",
          ],
        },
      }),
    ).executeBrowserScenario(
      {
        scenarioName:
          "keyboard-and-focus-accessible",
        invitationKey,
      },
      new AbortController().signal,
    );

  assert.deepEqual(
    result.observations[0],
    {
      name: "initial-focus-order-valid",
      observation: { valid: false },
    },
  );
});

test("rejects invalid configuration and browser input before driver access", async () => {
  let calls = 0;
  const driver = {
    async runIsolatedScenario() {
      calls += 1;
    },
  };

  assert.throws(
    () =>
      createTeamInvitationBrowserExecutorBrowserPort(
        { origin: "http://localhost:3000" },
        driver,
      ),
    expectsCode("INVALID_CONFIGURATION"),
  );
  assert.throws(
    () =>
      createTeamInvitationBrowserExecutorBrowserPort(
        { origin, extra: true },
        driver,
      ),
    expectsCode("INVALID_CONFIGURATION"),
  );

  const port = createPort(driver);

  for (const input of [
    null,
    {
      scenarioName: "unknown",
      invitationKey,
    },
    {
      scenarioName:
        "unauthenticated-user-rejected",
      invitationKey: "invalid",
    },
    {
      scenarioName:
        "unauthenticated-user-rejected",
      invitationKey,
      status: "passed",
    },
  ]) {
    await assert.rejects(
      port.executeBrowserScenario(
        input,
        new AbortController().signal,
      ),
      expectsCode("INVALID_INPUT"),
    );
  }

  assert.equal(calls, 0);
});

test("maps driver failure and abortion to bounded errors", async () => {
  const unavailable = createPort({
    async runIsolatedScenario() {
      throw new Error("provider detail");
    },
  });
  const controller =
    new AbortController();
  controller.abort();

  await assert.rejects(
    unavailable.executeBrowserScenario(
      {
        scenarioName:
          "unauthenticated-user-rejected",
        invitationKey,
      },
      new AbortController().signal,
    ),
    expectsCode("DRIVER_UNAVAILABLE"),
  );
  await assert.rejects(
    createPort().executeBrowserScenario(
      {
        scenarioName:
          "unauthenticated-user-rejected",
        invitationKey,
      },
      controller.signal,
    ),
    expectsCode("ABORTED"),
  );
});

test("rejects extended, foreign-origin, open-session, and malformed transcripts", async () => {
  const variants = [
    { rawText: "forbidden" },
    {
      navigatedOrigin:
        "https://foreign.connect.test",
    },
    { sessionIsolation: "isolated" },
    { completedAt: "not-a-time" },
    { exposedPrivateFieldCount: -1 },
  ];

  for (const overrides of variants) {
    await assert.rejects(
      createPort(
        createDriver(overrides),
      ).executeBrowserScenario(
        {
          scenarioName:
            "unauthenticated-user-rejected",
          invitationKey,
        },
        new AbortController().signal,
      ),
      expectsCode("DRIVER_RESULT_INVALID"),
    );
  }
});

test("requires accessibility evidence only for a terminal already-accepted case", async () => {
  await assert.rejects(
    createPort(
      createDriver({
        accessibility: {
          focusOrder: [],
          submittedWith: "keyboard",
          statusLiveRegion: "polite",
          announcementObserved: true,
          focusIndicatorVisible: true,
        },
      }),
    ).executeBrowserScenario(
      {
        scenarioName:
          "unauthenticated-user-rejected",
        invitationKey,
      },
      new AbortController().signal,
    ),
    expectsCode("DRIVER_RESULT_INVALID"),
  );
  await assert.rejects(
    createPort(
      createDriver({
        outcome: "accepted",
      }),
    ).executeBrowserScenario(
      {
        scenarioName:
          "keyboard-and-focus-accessible",
        invitationKey,
      },
      new AbortController().signal,
    ),
    expectsCode("DRIVER_RESULT_INVALID"),
  );
});
