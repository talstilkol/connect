import assert from "node:assert/strict";
import test from "node:test";

import {
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";
import {
  buildTeamInvitationBrowserUiAssertion,
  TeamInvitationBrowserUiAssertionError,
} from "../server/operations/teamInvitationBrowserUiAssertion.ts";

function observationFor(name) {
  switch (name) {
    case "sign-in-required":
      return {
        observed: "sign-in-required",
      };
    case "identity-verification-required":
      return {
        observed:
          "identity-verification-required",
      };
    case "acceptance-confirmed":
      return { observed: "accepted" };
    case "generic-unavailable-result":
      return {
        observed:
          "invitation-unavailable",
      };
    case "already-accepted-result":
      return {
        observed: "already-accepted",
      };
    case "private-fields-absent":
      return { exposedFieldCount: 0 };
    case "invitation-details-private":
      return { exposedDetailCount: 0 };
    case "initial-focus-order-valid":
      return { valid: true };
    case "submit-keyboard-operable":
      return { submittedWith: "keyboard" };
    case "status-announced":
      return {
        politeStatusObserved: true,
      };
    case "focus-visible":
      return { visible: true };
    default:
      throw new Error("UNKNOWN_ASSERTION");
  }
}

test("derives bounded results for every browser assertion from assertion-specific observations", () => {
  const results =
    teamInvitationBrowserScenarioRegistry.flatMap(
      (scenario) =>
        scenario.assertions
          .filter(
            (assertion) =>
              assertion.source === "browser",
          )
          .map((assertion) =>
            buildTeamInvitationBrowserUiAssertion({
              scenarioName: scenario.name,
              assertionName: assertion.name,
              observation: observationFor(
                assertion.name,
              ),
            }),
          ),
    );

  assert.equal(results.length, 14);

  for (const result of results) {
    assert.deepEqual(Object.keys(result), [
      "name",
      "source",
      "status",
      "outputDigest",
    ]);
    assert.equal(result.source, "browser");
    assert.equal(result.status, "passed");
    assert.match(
      result.outputDigest,
      /^sha256:[a-f0-9]{64}$/,
    );
    assert.doesNotMatch(
      JSON.stringify(result),
      /observed|FieldCount|DetailCount|email|invitationKey/i,
    );
  }
});

test("binds repeated browser assertions to their scenario", () => {
  const first =
    buildTeamInvitationBrowserUiAssertion({
      scenarioName:
        "unauthenticated-user-rejected",
      assertionName:
        "private-fields-absent",
      observation: {
        exposedFieldCount: 0,
      },
    });
  const second =
    buildTeamInvitationBrowserUiAssertion({
      scenarioName:
        "unverified-primary-email-rejected",
      assertionName:
        "private-fields-absent",
      observation: {
        exposedFieldCount: 0,
      },
    });

  assert.notEqual(
    first.outputDigest,
    second.outputDigest,
  );
});

test("rejects database assertions, unknown assertions, and extended input", () => {
  const inputs = [
    null,
    {
      scenarioName:
        "unauthenticated-user-rejected",
      assertionName:
        "membership-count-unchanged",
      observation: { valid: true },
    },
    {
      scenarioName:
        "unauthenticated-user-rejected",
      assertionName: "unknown",
      observation: { valid: true },
    },
    {
      scenarioName:
        "unauthenticated-user-rejected",
      assertionName: "sign-in-required",
      observation: {
        observed: "sign-in-required",
      },
      status: "passed",
    },
  ];

  for (const input of inputs) {
    assert.throws(
      () =>
        buildTeamInvitationBrowserUiAssertion(
          input,
        ),
      (error) =>
        error instanceof
          TeamInvitationBrowserUiAssertionError &&
        error.code === "INVALID_INPUT",
    );
  }
});

test("fails closed for wrong, false, or PII-extended observations", () => {
  const observations = [
    { observed: "accepted" },
    { observed: "sign-in-required", extra: 1 },
    {
      observed: "sign-in-required",
      privateValue: "forbidden",
    },
  ];

  for (const observation of observations) {
    assert.throws(
      () =>
        buildTeamInvitationBrowserUiAssertion({
          scenarioName:
            "unauthenticated-user-rejected",
          assertionName:
            "sign-in-required",
          observation,
        }),
      (error) =>
        error instanceof
          TeamInvitationBrowserUiAssertionError &&
        error.code === "ASSERTION_FAILED",
    );
  }
});
