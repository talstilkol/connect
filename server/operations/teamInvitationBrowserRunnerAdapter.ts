import type {
  TeamInvitationPolicy,
} from "../team/teamInvitationPolicy.ts";
import {
  buildTeamInvitationBrowserDatabaseAssertion,
  TeamInvitationBrowserDatabaseAssertionError,
} from "./teamInvitationBrowserDatabaseAssertion.ts";
import {
  buildTeamInvitationBrowserEvidence,
} from "./teamInvitationBrowserEvidence.ts";
import {
  deriveTeamInvitationBrowserScenarioOutputDigest,
  teamInvitationBrowserScenarioRegistry,
  type TeamInvitationBrowserAssertionResult,
  type TeamInvitationBrowserScenarioName,
} from "./teamInvitationBrowserScenarioRegistry.ts";
import {
  buildTeamInvitationBrowserUiAssertion,
  TeamInvitationBrowserUiAssertionError,
} from "./teamInvitationBrowserUiAssertion.ts";

const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;

export type TeamInvitationBrowserRunnerAdapterErrorCode =
  | "INVALID_INPUT"
  | "ASSERTION_FAILED";

export class TeamInvitationBrowserRunnerAdapterError
  extends Error {
  readonly code:
    TeamInvitationBrowserRunnerAdapterErrorCode;

  constructor(
    code:
      TeamInvitationBrowserRunnerAdapterErrorCode,
  ) {
    super(code);
    this.name =
      "TeamInvitationBrowserRunnerAdapterError";
    this.code = code;
  }
}

export interface TeamInvitationBrowserRunnerReceiptScenario {
  name: TeamInvitationBrowserScenarioName;
  status: "passed";
  completedAt: string;
  runFingerprint: string;
  outputDigest: string;
  assertions:
    readonly TeamInvitationBrowserAssertionResult[];
}

export interface TeamInvitationBrowserRunnerReceipt {
  schemaVersion: 1;
  verifiedAt: string;
  environment: "staging";
  origin: string;
  releaseId: string;
  commitSha: string;
  artifactDigest: string;
  policy: TeamInvitationPolicy;
  scenarios:
    readonly TeamInvitationBrowserRunnerReceiptScenario[];
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

function isCanonicalTimestamp(
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const milliseconds = Date.parse(value);

  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value
  );
}

function buildAssertion(
  scenarioName: TeamInvitationBrowserScenarioName,
  expected: Readonly<{
    name: string;
    source: "browser" | "database";
  }>,
  value: unknown,
): TeamInvitationBrowserAssertionResult {
  if (!isPlainObject(value)) {
    throw new TeamInvitationBrowserRunnerAdapterError(
      "INVALID_INPUT",
    );
  }

  try {
    if (expected.source === "browser") {
      if (
        !hasExactKeys(value, [
          "name",
          "source",
          "observation",
        ]) ||
        value.name !== expected.name ||
        value.source !== "browser"
      ) {
        throw new TeamInvitationBrowserRunnerAdapterError(
          "INVALID_INPUT",
        );
      }

      return buildTeamInvitationBrowserUiAssertion({
        scenarioName,
        assertionName: expected.name,
        observation: value.observation,
      });
    }

    if (
      !hasExactKeys(value, [
        "name",
        "source",
        "before",
        "after",
      ]) ||
      value.name !== expected.name ||
      value.source !== "database"
    ) {
      throw new TeamInvitationBrowserRunnerAdapterError(
        "INVALID_INPUT",
      );
    }

    return buildTeamInvitationBrowserDatabaseAssertion({
      scenarioName,
      assertionName: expected.name,
      before: value.before,
      after: value.after,
    });
  } catch (error) {
    if (
      error instanceof
        TeamInvitationBrowserRunnerAdapterError
    ) {
      throw error;
    }

    if (
      (
        error instanceof
          TeamInvitationBrowserUiAssertionError ||
        error instanceof
          TeamInvitationBrowserDatabaseAssertionError
      ) &&
      error.code === "ASSERTION_FAILED"
    ) {
      throw new TeamInvitationBrowserRunnerAdapterError(
        "ASSERTION_FAILED",
      );
    }

    throw new TeamInvitationBrowserRunnerAdapterError(
      "INVALID_INPUT",
    );
  }
}

function buildScenario(
  value: unknown,
  index: number,
): TeamInvitationBrowserRunnerReceiptScenario {
  const definition =
    teamInvitationBrowserScenarioRegistry[index];

  if (
    definition === undefined ||
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "name",
      "completedAt",
      "runFingerprint",
      "assertions",
    ]) ||
    value.name !== definition.name ||
    !isCanonicalTimestamp(value.completedAt) ||
    typeof value.runFingerprint !== "string" ||
    !fingerprintPattern.test(
      value.runFingerprint,
    ) ||
    !Array.isArray(value.assertions) ||
    value.assertions.length !==
      definition.assertions.length
  ) {
    throw new TeamInvitationBrowserRunnerAdapterError(
      "INVALID_INPUT",
    );
  }

  const assertionInputs =
    value.assertions;
  const assertions =
    definition.assertions.map(
      (expected, assertionIndex) =>
        buildAssertion(
          definition.name,
          expected,
          assertionInputs[assertionIndex],
        ),
    );

  return Object.freeze({
    name: definition.name,
    status: "passed",
    completedAt: value.completedAt,
    runFingerprint: value.runFingerprint,
    outputDigest:
      deriveTeamInvitationBrowserScenarioOutputDigest(
        definition.name,
        assertions,
      ),
    assertions: Object.freeze(assertions),
  });
}

export function buildTeamInvitationBrowserRunnerReceipt(
  input: unknown,
): TeamInvitationBrowserRunnerReceipt {
  if (
    !isPlainObject(input) ||
    !hasExactKeys(input, [
      "origin",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "policy",
      "scenarios",
    ]) ||
    !Array.isArray(input.scenarios) ||
    input.scenarios.length !==
      teamInvitationBrowserScenarioRegistry.length ||
    !isPlainObject(input.policy) ||
    !hasExactKeys(input.policy, [
      "ttlHours",
      "reRequest",
    ])
  ) {
    throw new TeamInvitationBrowserRunnerAdapterError(
      "INVALID_INPUT",
    );
  }

  const scenarios = input.scenarios.map(
    buildScenario,
  );
  const verifiedAt = scenarios.reduce(
    (latest, scenario) =>
      Date.parse(scenario.completedAt) >
      Date.parse(latest)
        ? scenario.completedAt
        : latest,
    scenarios[0].completedAt,
  );
  const receipt = {
    schemaVersion: 1 as const,
    verifiedAt,
    environment: "staging" as const,
    origin: input.origin,
    releaseId: input.releaseId,
    commitSha: input.commitSha,
    artifactDigest: input.artifactDigest,
    policy: Object.freeze({
      ttlHours: input.policy.ttlHours,
      reRequest: input.policy.reRequest,
    }),
    scenarios: Object.freeze(scenarios),
  };

  try {
    buildTeamInvitationBrowserEvidence(
      receipt,
      new Date(verifiedAt),
    );
  } catch {
    throw new TeamInvitationBrowserRunnerAdapterError(
      "INVALID_INPUT",
    );
  }

  return Object.freeze(
    receipt,
  ) as TeamInvitationBrowserRunnerReceipt;
}
