import {
  createHash,
} from "node:crypto";

export type TeamInvitationBrowserAssertionSource =
  | "browser"
  | "database";

interface TeamInvitationBrowserAssertionDefinition {
  name: string;
  source:
    TeamInvitationBrowserAssertionSource;
}

interface TeamInvitationBrowserScenarioDefinitionBase<
  Name extends string = string,
> {
  name: Name;
  assertions:
    readonly TeamInvitationBrowserAssertionDefinition[];
}

function scenario<const Name extends string>(
  name: Name,
  assertions:
    readonly TeamInvitationBrowserAssertionDefinition[],
): TeamInvitationBrowserScenarioDefinitionBase<Name> {
  return Object.freeze({
    name,
    assertions: Object.freeze(
      assertions.map(
        (assertion) =>
          Object.freeze({
            ...assertion,
          }),
      ),
    ),
  });
}

export const teamInvitationBrowserScenarioRegistry =
  Object.freeze([
    scenario(
      "unauthenticated-user-rejected",
      [
        {
          name: "sign-in-required",
          source: "browser",
        },
        {
          name: "membership-count-unchanged",
          source: "database",
        },
        {
          name: "private-fields-absent",
          source: "browser",
        },
      ],
    ),
    scenario(
      "unverified-primary-email-rejected",
      [
        {
          name:
            "identity-verification-required",
          source: "browser",
        },
        {
          name: "membership-count-unchanged",
          source: "database",
        },
        {
          name: "private-fields-absent",
          source: "browser",
        },
      ],
    ),
    scenario(
      "verified-matching-email-accepts",
      [
        {
          name: "acceptance-confirmed",
          source: "browser",
        },
        {
          name: "membership-created-once",
          source: "database",
        },
        {
          name:
            "acceptance-audit-created-once",
          source: "database",
        },
      ],
    ),
    scenario(
      "mismatched-email-remains-private",
      [
        {
          name: "generic-unavailable-result",
          source: "browser",
        },
        {
          name: "membership-count-unchanged",
          source: "database",
        },
        {
          name: "invitation-details-private",
          source: "browser",
        },
      ],
    ),
    scenario(
      "expired-invitation-rejected",
      [
        {
          name: "generic-unavailable-result",
          source: "browser",
        },
        {
          name: "membership-count-unchanged",
          source: "database",
        },
        {
          name: "invitation-details-private",
          source: "browser",
        },
      ],
    ),
    scenario(
      "identical-retry-idempotent",
      [
        {
          name: "already-accepted-result",
          source: "browser",
        },
        {
          name: "membership-count-unchanged",
          source: "database",
        },
        {
          name:
            "acceptance-audit-count-unchanged",
          source: "database",
        },
      ],
    ),
    scenario(
      "keyboard-and-focus-accessible",
      [
        {
          name: "initial-focus-order-valid",
          source: "browser",
        },
        {
          name: "submit-keyboard-operable",
          source: "browser",
        },
        {
          name: "status-announced",
          source: "browser",
        },
        {
          name: "focus-visible",
          source: "browser",
        },
      ],
    ),
  ] as const);

export type TeamInvitationBrowserScenarioName =
  (typeof teamInvitationBrowserScenarioRegistry)[number]["name"];

export type TeamInvitationBrowserScenarioDefinition =
  (typeof teamInvitationBrowserScenarioRegistry)[number];

export type TeamInvitationBrowserAssertionResult =
  Readonly<{
    name: string;
    source:
      TeamInvitationBrowserAssertionSource;
    status: "passed";
    outputDigest: string;
  }>;

export const requiredTeamInvitationBrowserScenarios =
  Object.freeze(
    teamInvitationBrowserScenarioRegistry.map(
      (definition) =>
        definition.name,
    ),
  );

export function findTeamInvitationBrowserScenario(
  name: unknown,
): TeamInvitationBrowserScenarioDefinition | null {
  if (typeof name !== "string") {
    return null;
  }

  return (
    teamInvitationBrowserScenarioRegistry.find(
      (definition) =>
        definition.name === name,
    ) ?? null
  );
}

export function deriveTeamInvitationBrowserScenarioOutputDigest(
  name: TeamInvitationBrowserScenarioName,
  assertions:
    readonly TeamInvitationBrowserAssertionResult[],
): string {
  const identity = JSON.stringify({
    name,
    assertions: assertions.map(
      (assertion) => ({
        name: assertion.name,
        source: assertion.source,
        status: assertion.status,
        outputDigest:
          assertion.outputDigest,
      }),
    ),
  });

  return `sha256:${createHash("sha256")
    .update(identity)
    .digest("hex")}`;
}
