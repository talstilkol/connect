import {
  createHash,
} from "node:crypto";

import {
  findTeamInvitationBrowserScenario,
  type TeamInvitationBrowserAssertionResult,
} from "./teamInvitationBrowserScenarioRegistry.ts";

export type TeamInvitationBrowserUiAssertionErrorCode =
  | "INVALID_INPUT"
  | "ASSERTION_FAILED";

export class TeamInvitationBrowserUiAssertionError
  extends Error {
  readonly code:
    TeamInvitationBrowserUiAssertionErrorCode;

  constructor(
    code:
      TeamInvitationBrowserUiAssertionErrorCode,
  ) {
    super(code);
    this.name =
      "TeamInvitationBrowserUiAssertionError";
    this.code = code;
  }
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) =>
        key === expected[index],
    )
  );
}

function observationPassed(
  assertionName: string,
  observation: unknown,
): observation is Record<string, unknown> {
  if (!isPlainObject(observation)) {
    return false;
  }

  switch (assertionName) {
    case "sign-in-required":
      return (
        hasExactKeys(observation, [
          "observed",
        ]) &&
        observation.observed ===
          "sign-in-required"
      );
    case "identity-verification-required":
      return (
        hasExactKeys(observation, [
          "observed",
        ]) &&
        observation.observed ===
          "identity-verification-required"
      );
    case "acceptance-confirmed":
      return (
        hasExactKeys(observation, [
          "observed",
        ]) &&
        observation.observed === "accepted"
      );
    case "generic-unavailable-result":
      return (
        hasExactKeys(observation, [
          "observed",
        ]) &&
        observation.observed ===
          "invitation-unavailable"
      );
    case "already-accepted-result":
      return (
        hasExactKeys(observation, [
          "observed",
        ]) &&
        observation.observed ===
          "already-accepted"
      );
    case "private-fields-absent":
      return (
        hasExactKeys(observation, [
          "exposedFieldCount",
        ]) &&
        observation.exposedFieldCount === 0
      );
    case "invitation-details-private":
      return (
        hasExactKeys(observation, [
          "exposedDetailCount",
        ]) &&
        observation.exposedDetailCount === 0
      );
    case "initial-focus-order-valid":
      return (
        hasExactKeys(observation, [
          "valid",
        ]) && observation.valid === true
      );
    case "submit-keyboard-operable":
      return (
        hasExactKeys(observation, [
          "submittedWith",
        ]) &&
        observation.submittedWith ===
          "keyboard"
      );
    case "status-announced":
      return (
        hasExactKeys(observation, [
          "politeStatusObserved",
        ]) &&
        observation.politeStatusObserved === true
      );
    case "focus-visible":
      return (
        hasExactKeys(observation, [
          "visible",
        ]) && observation.visible === true
      );
    default:
      return false;
  }
}

function digest(
  scenarioName: string,
  assertionName: string,
  observation: Record<string, unknown>,
): string {
  return `sha256:${createHash("sha256")
    .update(
      JSON.stringify({
        scenarioName,
        assertionName,
        observation,
      }),
    )
    .digest("hex")}`;
}

export function buildTeamInvitationBrowserUiAssertion(
  input: unknown,
): TeamInvitationBrowserAssertionResult {
  if (
    !isPlainObject(input) ||
    !hasExactKeys(input, [
      "scenarioName",
      "assertionName",
      "observation",
    ]) ||
    typeof input.scenarioName !== "string" ||
    typeof input.assertionName !== "string"
  ) {
    throw new TeamInvitationBrowserUiAssertionError(
      "INVALID_INPUT",
    );
  }

  const scenario =
    findTeamInvitationBrowserScenario(
      input.scenarioName,
    );
  const assertion =
    scenario?.assertions.find(
      (candidate) =>
        candidate.name ===
        input.assertionName,
    );

  if (
    scenario === null ||
    assertion === undefined ||
    assertion.source !== "browser"
  ) {
    throw new TeamInvitationBrowserUiAssertionError(
      "INVALID_INPUT",
    );
  }

  if (
    !observationPassed(
      assertion.name,
      input.observation,
    )
  ) {
    throw new TeamInvitationBrowserUiAssertionError(
      "ASSERTION_FAILED",
    );
  }

  return Object.freeze({
    name: assertion.name,
    source: "browser",
    status: "passed",
    outputDigest: digest(
      scenario.name,
      assertion.name,
      input.observation,
    ),
  });
}
