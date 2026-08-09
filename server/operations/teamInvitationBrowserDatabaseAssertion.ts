import {
  createHash,
} from "node:crypto";

import type {
  TeamInvitationBrowserDatabaseProof,
} from "../../db/teamInvitationBrowserProofReader.ts";
import {
  findTeamInvitationBrowserScenario,
  type TeamInvitationBrowserAssertionResult,
} from "./teamInvitationBrowserScenarioRegistry.ts";

const maximumMembershipCount = 10_000;

export type TeamInvitationBrowserDatabaseAssertionErrorCode =
  | "INVALID_INPUT"
  | "ASSERTION_FAILED";

export class TeamInvitationBrowserDatabaseAssertionError
  extends Error {
  readonly code:
    TeamInvitationBrowserDatabaseAssertionErrorCode;

  constructor(
    code:
      TeamInvitationBrowserDatabaseAssertionErrorCode,
  ) {
    super(code);
    this.name =
      "TeamInvitationBrowserDatabaseAssertionError";
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

function parseProof(
  value: unknown,
): TeamInvitationBrowserDatabaseProof | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "invitationCount",
      "membershipCount",
      "activeMembershipCount",
      "acceptanceAuditCount",
    ])
  ) {
    return null;
  }

  const invitationCount =
    parseCount(
      value.invitationCount,
      1,
    );
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
    return null;
  }

  return {
    invitationCount,
    membershipCount,
    activeMembershipCount,
    acceptanceAuditCount,
  };
}

function hasStableInvitation(
  before: TeamInvitationBrowserDatabaseProof,
  after: TeamInvitationBrowserDatabaseProof,
): boolean {
  return (
    before.invitationCount === 1 &&
    after.invitationCount === 1
  );
}

function assertionPassed(
  name: string,
  before: TeamInvitationBrowserDatabaseProof,
  after: TeamInvitationBrowserDatabaseProof,
): boolean {
  if (!hasStableInvitation(before, after)) {
    return false;
  }

  switch (name) {
    case "membership-count-unchanged":
      return (
        before.membershipCount ===
          after.membershipCount &&
        before.activeMembershipCount ===
          after.activeMembershipCount &&
        before.acceptanceAuditCount ===
          after.acceptanceAuditCount
      );
    case "membership-created-once":
      return (
        before.membershipCount === 0 &&
        before.activeMembershipCount === 0 &&
        after.membershipCount === 1 &&
        after.activeMembershipCount === 1
      );
    case "acceptance-audit-created-once":
      return (
        before.acceptanceAuditCount === 0 &&
        after.acceptanceAuditCount === 1
      );
    case "acceptance-audit-count-unchanged":
      return (
        before.acceptanceAuditCount === 1 &&
        after.acceptanceAuditCount === 1
      );
    default:
      return false;
  }
}

function digest(
  scenarioName: string,
  assertionName: string,
  before: TeamInvitationBrowserDatabaseProof,
  after: TeamInvitationBrowserDatabaseProof,
): string {
  return `sha256:${createHash("sha256")
    .update(
      JSON.stringify({
        scenarioName,
        assertionName,
        before,
        after,
      }),
    )
    .digest("hex")}`;
}

export function buildTeamInvitationBrowserDatabaseAssertion(
  input: unknown,
): TeamInvitationBrowserAssertionResult {
  if (
    !isPlainObject(input) ||
    !hasExactKeys(input, [
      "scenarioName",
      "assertionName",
      "before",
      "after",
    ]) ||
    typeof input.scenarioName !==
      "string" ||
    typeof input.assertionName !==
      "string"
  ) {
    throw new TeamInvitationBrowserDatabaseAssertionError(
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
  const before =
    parseProof(input.before);
  const after =
    parseProof(input.after);

  if (
    scenario === null ||
    assertion === undefined ||
    assertion.source !== "database" ||
    before === null ||
    after === null
  ) {
    throw new TeamInvitationBrowserDatabaseAssertionError(
      "INVALID_INPUT",
    );
  }

  if (
    !assertionPassed(
      assertion.name,
      before,
      after,
    )
  ) {
    throw new TeamInvitationBrowserDatabaseAssertionError(
      "ASSERTION_FAILED",
    );
  }

  return Object.freeze({
    name: assertion.name,
    source: "database",
    status: "passed",
    outputDigest: digest(
      scenario.name,
      assertion.name,
      before,
      after,
    ),
  });
}
