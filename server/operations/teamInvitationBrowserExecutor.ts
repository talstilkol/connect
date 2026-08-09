import type {
  TeamInvitationBrowserDatabaseProof,
} from "../../db/teamInvitationBrowserProofReader.ts";
import {
  requireTeamExternalUserId,
} from "../team/teamMembershipValidation.ts";
import {
  requireTeamInvitationKey,
} from "../team/teamInvitationValidation.ts";
import {
  buildTeamInvitationBrowserDatabaseAssertion,
  TeamInvitationBrowserDatabaseAssertionError,
} from "./teamInvitationBrowserDatabaseAssertion.ts";
import {
  buildTeamInvitationBrowserRunnerReceipt,
  TeamInvitationBrowserRunnerAdapterError,
  type TeamInvitationBrowserRunnerReceipt,
} from "./teamInvitationBrowserRunnerAdapter.ts";
import {
  resolvePublicOrigin,
} from "./publicOrigin.ts";
import {
  teamInvitationBrowserScenarioRegistry,
  type TeamInvitationBrowserScenarioName,
} from "./teamInvitationBrowserScenarioRegistry.ts";
import {
  buildTeamInvitationBrowserUiAssertion,
  TeamInvitationBrowserUiAssertionError,
} from "./teamInvitationBrowserUiAssertion.ts";

const maximumScenarioTimeoutMilliseconds =
  5 * 60 * 1_000;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const commitPattern =
  /^[a-f0-9]{40}$/;
const maximumMembershipCount = 10_000;

type TeamInvitationBrowserProofScope =
  | Readonly<{
      kind: "tenant-total";
    }>
  | Readonly<{
      kind: "external-user";
      externalUserId: string;
    }>;

interface TeamInvitationBrowserScenarioCase {
  invitationKey: string;
  proofScope:
    TeamInvitationBrowserProofScope | null;
}

export interface TeamInvitationBrowserExecutorPorts {
  resolveScenarioCase(
    input: Readonly<{
      scenarioName:
        TeamInvitationBrowserScenarioName;
    }>,
    signal: AbortSignal,
  ): Promise<unknown>;
  executeBrowserScenario(
    input: Readonly<{
      scenarioName:
        TeamInvitationBrowserScenarioName;
      invitationKey: string;
    }>,
    signal: AbortSignal,
  ): Promise<unknown>;
  readDatabaseProof(
    input: Readonly<{
      invitationKey: string;
      scope:
        TeamInvitationBrowserProofScope;
    }>,
    signal: AbortSignal,
  ): Promise<TeamInvitationBrowserDatabaseProof>;
}

export type TeamInvitationBrowserExecutorErrorCode =
  | "INVALID_INPUT"
  | "CASE_UNAVAILABLE"
  | "CASE_INVALID"
  | "BROWSER_UNAVAILABLE"
  | "BROWSER_RESULT_INVALID"
  | "DATABASE_UNAVAILABLE"
  | "DATABASE_PROOF_INVALID"
  | "ASSERTION_FAILED"
  | "TIMEOUT";

export class TeamInvitationBrowserExecutorError
  extends Error {
  readonly code:
    TeamInvitationBrowserExecutorErrorCode;

  constructor(
    code:
      TeamInvitationBrowserExecutorErrorCode,
  ) {
    super(code);
    this.name =
      "TeamInvitationBrowserExecutorError";
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

function isStagingOrigin(
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const origin = resolvePublicOrigin({
    APP_PUBLIC_ORIGIN: value,
    NODE_ENV: "production",
  });

  if (origin !== value) {
    return false;
  }

  const hostname = new URL(origin).hostname;

  return ![
    "localhost",
    "127.0.0.1",
    "[::1]",
  ].includes(hostname);
}

function parseCount(
  value: unknown,
  maximum: number,
): number | null {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= maximum
  )
    ? value
    : null;
}

function parseDatabaseProof(
  value: unknown,
): TeamInvitationBrowserDatabaseProof {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "invitationCount",
      "membershipCount",
      "activeMembershipCount",
      "acceptanceAuditCount",
    ])
  ) {
    throw new TeamInvitationBrowserExecutorError(
      "DATABASE_PROOF_INVALID",
    );
  }

  const invitationCount =
    parseCount(value.invitationCount, 1);
  const membershipCount =
    parseCount(
      value.membershipCount,
      maximumMembershipCount,
    );
  const activeMembershipCount =
    parseCount(
      value.activeMembershipCount,
      maximumMembershipCount,
    );
  const acceptanceAuditCount =
    parseCount(
      value.acceptanceAuditCount,
      1,
    );

  if (
    invitationCount === null ||
    membershipCount === null ||
    activeMembershipCount === null ||
    acceptanceAuditCount === null ||
    activeMembershipCount > membershipCount
  ) {
    throw new TeamInvitationBrowserExecutorError(
      "DATABASE_PROOF_INVALID",
    );
  }

  return Object.freeze({
    invitationCount,
    membershipCount,
    activeMembershipCount,
    acceptanceAuditCount,
  });
}

function parseScope(
  value: unknown,
): TeamInvitationBrowserProofScope | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (
    hasExactKeys(value, ["kind"]) &&
    value.kind === "tenant-total"
  ) {
    return Object.freeze({
      kind: "tenant-total" as const,
    });
  }

  if (
    !hasExactKeys(value, [
      "kind",
      "externalUserId",
    ]) ||
    value.kind !== "external-user"
  ) {
    return null;
  }

  try {
    return Object.freeze({
      kind: "external-user" as const,
      externalUserId:
        requireTeamExternalUserId(
          value.externalUserId,
        ),
    });
  } catch {
    return null;
  }
}

function parseScenarioCase(
  value: unknown,
  requiresDatabaseProof: boolean,
): TeamInvitationBrowserScenarioCase {
  if (!isPlainObject(value)) {
    throw new TeamInvitationBrowserExecutorError(
      "CASE_INVALID",
    );
  }

  const expectedKeys = requiresDatabaseProof
    ? ["invitationKey", "proofScope"]
    : ["invitationKey"];

  if (!hasExactKeys(value, expectedKeys)) {
    throw new TeamInvitationBrowserExecutorError(
      "CASE_INVALID",
    );
  }

  let invitationKey: string;

  try {
    invitationKey =
      requireTeamInvitationKey(
        value.invitationKey,
      );
  } catch {
    throw new TeamInvitationBrowserExecutorError(
      "CASE_INVALID",
    );
  }

  if (!requiresDatabaseProof) {
    return {
      invitationKey,
      proofScope: null,
    };
  }

  const proofScope =
    parseScope(value.proofScope);

  if (proofScope === null) {
    throw new TeamInvitationBrowserExecutorError(
      "CASE_INVALID",
    );
  }

  return {
    invitationKey,
    proofScope,
  };
}

interface ParsedBrowserScenarioResult {
  completedAt: string;
  runFingerprint: string;
  observations:
    readonly Readonly<{
      name: string;
      observation: unknown;
    }>[];
}

interface TeamInvitationBrowserExecutionScenario {
  name: TeamInvitationBrowserScenarioName;
  completedAt: string;
  runFingerprint: string;
  assertions: readonly unknown[];
}

function parseBrowserResult(
  value: unknown,
  expectedAssertions:
    readonly Readonly<{
      name: string;
      source: "browser" | "database";
    }>[],
): ParsedBrowserScenarioResult {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "completedAt",
      "runFingerprint",
      "observations",
    ]) ||
    !isCanonicalTimestamp(value.completedAt) ||
    typeof value.runFingerprint !== "string" ||
    !fingerprintPattern.test(
      value.runFingerprint,
    ) ||
    !Array.isArray(value.observations)
  ) {
    throw new TeamInvitationBrowserExecutorError(
      "BROWSER_RESULT_INVALID",
    );
  }

  const browserAssertions =
    expectedAssertions.filter(
      (assertion) =>
        assertion.source === "browser",
    );

  if (
    value.observations.length !==
    browserAssertions.length
  ) {
    throw new TeamInvitationBrowserExecutorError(
      "BROWSER_RESULT_INVALID",
    );
  }

  const observations =
    value.observations.map(
      (observation, index) => {
        const expected =
          browserAssertions[index];

        if (
          expected === undefined ||
          !isPlainObject(observation) ||
          !hasExactKeys(observation, [
            "name",
            "observation",
          ]) ||
          observation.name !== expected.name
        ) {
          throw new TeamInvitationBrowserExecutorError(
            "BROWSER_RESULT_INVALID",
          );
        }

        return Object.freeze({
          name: expected.name,
          observation:
            observation.observation,
        });
      },
    );

  return {
    completedAt: value.completedAt,
    runFingerprint:
      value.runFingerprint,
    observations:
      Object.freeze(observations),
  };
}

async function runWithTimeout<T>(
  timeoutMilliseconds: number,
  operation: (
    signal: AbortSignal,
  ) => Promise<T>,
): Promise<T> {
  const controller =
    new AbortController();
  let timeout:
    ReturnType<typeof setTimeout> | undefined;

  try {
    return await new Promise<T>(
      (resolve, reject) => {
        timeout = setTimeout(
          () => {
            controller.abort();
            reject(
              new TeamInvitationBrowserExecutorError(
                "TIMEOUT",
              ),
            );
          },
          timeoutMilliseconds,
        );

        Promise.resolve()
          .then(() =>
            operation(
              controller.signal,
            ),
          )
          .then(resolve, reject);
      },
    );
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

async function readProof(
  ports: TeamInvitationBrowserExecutorPorts,
  scenarioCase:
    TeamInvitationBrowserScenarioCase,
  signal: AbortSignal,
): Promise<TeamInvitationBrowserDatabaseProof> {
  if (scenarioCase.proofScope === null) {
    throw new TeamInvitationBrowserExecutorError(
      "CASE_INVALID",
    );
  }

  let rawProof: unknown;

  try {
    rawProof = await ports.readDatabaseProof(
      {
        invitationKey:
          scenarioCase.invitationKey,
        scope:
          scenarioCase.proofScope,
      },
      signal,
    );
  } catch {
    throw new TeamInvitationBrowserExecutorError(
      "DATABASE_UNAVAILABLE",
    );
  }

  return parseDatabaseProof(
    rawProof,
  );
}

async function executeScenario(
  definition:
    (typeof teamInvitationBrowserScenarioRegistry)[number],
  timeoutMilliseconds: number,
  ports: TeamInvitationBrowserExecutorPorts,
): Promise<TeamInvitationBrowserExecutionScenario> {
  return runWithTimeout(
    timeoutMilliseconds,
    async (signal) => {
      let rawScenarioCase: unknown;

      try {
        rawScenarioCase =
          await ports.resolveScenarioCase(
            {
              scenarioName:
                definition.name,
            },
            signal,
          );
      } catch {
        if (signal.aborted) {
          throw new TeamInvitationBrowserExecutorError(
            "TIMEOUT",
          );
        }

        throw new TeamInvitationBrowserExecutorError(
          "CASE_UNAVAILABLE",
        );
      }

      const requiresDatabaseProof =
        definition.assertions.some(
          (assertion) =>
            assertion.source === "database",
        );
      const scenarioCase =
        parseScenarioCase(
          rawScenarioCase,
          requiresDatabaseProof,
        );
      const before =
        requiresDatabaseProof
          ? await readProof(
              ports,
              scenarioCase,
              signal,
            )
          : null;
      let rawBrowserResult: unknown;

      try {
        rawBrowserResult =
          await ports.executeBrowserScenario(
            {
              scenarioName:
                definition.name,
              invitationKey:
                scenarioCase.invitationKey,
            },
            signal,
          );
      } catch {
        if (signal.aborted) {
          throw new TeamInvitationBrowserExecutorError(
            "TIMEOUT",
          );
        }

        throw new TeamInvitationBrowserExecutorError(
          "BROWSER_UNAVAILABLE",
        );
      }

      const browserResult =
        parseBrowserResult(
          rawBrowserResult,
          definition.assertions,
        );
      const after =
        requiresDatabaseProof
          ? await readProof(
              ports,
              scenarioCase,
              signal,
            )
          : null;
      let browserAssertionIndex = 0;
      const assertions =
        definition.assertions.map(
          (assertion) => {
            if (
              assertion.source === "browser"
            ) {
              const observation =
                browserResult.observations[
                  browserAssertionIndex
                ];
              browserAssertionIndex += 1;

              return {
                name: assertion.name,
                source:
                  "browser" as const,
                observation:
                  observation.observation,
              };
            }

            return {
              name: assertion.name,
              source:
                "database" as const,
              before,
              after,
            };
          },
        );

      try {
        for (
          const assertion of assertions
        ) {
          if (
            assertion.source === "browser"
          ) {
            buildTeamInvitationBrowserUiAssertion({
              scenarioName:
                definition.name,
              assertionName:
                assertion.name,
              observation:
                assertion.observation,
            });
          } else {
            buildTeamInvitationBrowserDatabaseAssertion({
              scenarioName:
                definition.name,
              assertionName:
                assertion.name,
              before: assertion.before,
              after: assertion.after,
            });
          }
        }
      } catch (error) {
        if (
          (
            error instanceof
              TeamInvitationBrowserUiAssertionError ||
            error instanceof
              TeamInvitationBrowserDatabaseAssertionError
          ) &&
          error.code === "ASSERTION_FAILED"
        ) {
          throw new TeamInvitationBrowserExecutorError(
            "ASSERTION_FAILED",
          );
        }

        throw new TeamInvitationBrowserExecutorError(
          "BROWSER_RESULT_INVALID",
        );
      }

      return {
        name: definition.name,
        completedAt:
          browserResult.completedAt,
        runFingerprint:
          browserResult.runFingerprint,
        assertions,
      };
    },
  );
}

function validatePorts(
  value: unknown,
): value is TeamInvitationBrowserExecutorPorts {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      "resolveScenarioCase",
      "executeBrowserScenario",
      "readDatabaseProof",
    ]) &&
    typeof value.resolveScenarioCase ===
      "function" &&
    typeof value.executeBrowserScenario ===
      "function" &&
    typeof value.readDatabaseProof ===
      "function"
  );
}

export async function executeTeamInvitationBrowserRun(
  input: unknown,
  ports: TeamInvitationBrowserExecutorPorts,
): Promise<TeamInvitationBrowserRunnerReceipt> {
  if (
    !isPlainObject(input) ||
    !hasExactKeys(input, [
      "origin",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "policy",
      "scenarioTimeoutMilliseconds",
    ]) ||
    !Number.isSafeInteger(
      input.scenarioTimeoutMilliseconds,
    ) ||
    (input.scenarioTimeoutMilliseconds as number) < 1 ||
    (input.scenarioTimeoutMilliseconds as number) >
      maximumScenarioTimeoutMilliseconds ||
    !isStagingOrigin(input.origin) ||
    typeof input.releaseId !== "string" ||
    !releaseIdPattern.test(input.releaseId) ||
    typeof input.commitSha !== "string" ||
    !commitPattern.test(input.commitSha) ||
    typeof input.artifactDigest !== "string" ||
    !fingerprintPattern.test(
      input.artifactDigest,
    ) ||
    !isPlainObject(input.policy) ||
    !hasExactKeys(input.policy, [
      "ttlHours",
      "reRequest",
    ]) ||
    !Number.isSafeInteger(
      input.policy.ttlHours,
    ) ||
    (input.policy.ttlHours as number) < 1 ||
    (input.policy.ttlHours as number) > 8_760 ||
    (
      input.policy.reRequest !== "disabled" &&
      input.policy.reRequest !==
        "after-terminal"
    ) ||
    !validatePorts(ports)
  ) {
    throw new TeamInvitationBrowserExecutorError(
      "INVALID_INPUT",
    );
  }

  const scenarios:
    TeamInvitationBrowserExecutionScenario[] = [];
  const runFingerprints =
    new Set<string>();

  for (
    const definition of
      teamInvitationBrowserScenarioRegistry
  ) {
    const scenario =
      await executeScenario(
        definition,
        input.scenarioTimeoutMilliseconds as number,
        ports,
      );

    if (
      runFingerprints.has(
        scenario.runFingerprint,
      )
    ) {
      throw new TeamInvitationBrowserExecutorError(
        "BROWSER_RESULT_INVALID",
      );
    }

    runFingerprints.add(
      scenario.runFingerprint,
    );
    scenarios.push(scenario);
  }

  try {
    return buildTeamInvitationBrowserRunnerReceipt({
      origin: input.origin,
      releaseId: input.releaseId,
      commitSha: input.commitSha,
      artifactDigest:
        input.artifactDigest,
      policy: input.policy,
      scenarios,
    });
  } catch (error) {
    if (
      error instanceof
        TeamInvitationBrowserRunnerAdapterError &&
      error.code === "ASSERTION_FAILED"
    ) {
      throw new TeamInvitationBrowserExecutorError(
        "ASSERTION_FAILED",
      );
    }

    throw new TeamInvitationBrowserExecutorError(
      "BROWSER_RESULT_INVALID",
    );
  }
}
