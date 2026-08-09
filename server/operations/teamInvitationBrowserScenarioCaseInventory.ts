import {
  requireTeamExternalUserId,
} from "../team/teamMembershipValidation.ts";
import {
  requireTeamInvitationKey,
} from "../team/teamInvitationValidation.ts";
import type {
  TeamInvitationPolicy,
} from "../team/teamInvitationPolicy.ts";
import {
  deriveTeamInvitationPolicyDigest,
} from "./teamInvitationBrowserEvidence.ts";
import {
  teamInvitationBrowserScenarioRegistry,
  type TeamInvitationBrowserScenarioName,
} from "./teamInvitationBrowserScenarioRegistry.ts";
import {
  resolvePublicOrigin,
} from "./publicOrigin.ts";

const maximumInventoryLength = 24_000;
const maximumInventoryLifetimeMilliseconds =
  2 * 60 * 60 * 1_000;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const commitPattern =
  /^[a-f0-9]{40}$/;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const policyDigestPattern =
  /^team_invitation_policy_v1_[a-f0-9]{64}$/;

type ScenarioProofScope =
  | Readonly<{
      kind: "tenant-total";
    }>
  | Readonly<{
      kind: "external-user";
      externalUserId: string;
    }>;

interface ScenarioCase {
  name: TeamInvitationBrowserScenarioName;
  invitationKey: string;
  proofScope: ScenarioProofScope | null;
}

interface ScenarioCaseInventory {
  schemaVersion: 1;
  preparedAt: string;
  expiresAt: string;
  environment: "staging";
  origin: string;
  releaseId: string;
  commitSha: string;
  artifactDigest: string;
  policyDigest: string;
  cases: readonly ScenarioCase[];
}

export interface TeamInvitationBrowserScenarioCaseInventoryExpected {
  origin: string;
  releaseId: string;
  commitSha: string;
  artifactDigest: string;
  policy: TeamInvitationPolicy;
  minimumRemainingLifetimeMilliseconds:
    number;
}

export type TeamInvitationBrowserScenarioCaseInventoryErrorCode =
  | "INVENTORY_REQUIRED"
  | "INVENTORY_INVALID"
  | "INVENTORY_EXPIRED"
  | "INVENTORY_MISMATCH"
  | "SCENARIO_INVALID"
  | "ABORTED";

export class TeamInvitationBrowserScenarioCaseInventoryError
  extends Error {
  readonly code:
    TeamInvitationBrowserScenarioCaseInventoryErrorCode;

  constructor(
    code:
      TeamInvitationBrowserScenarioCaseInventoryErrorCode,
  ) {
    super(code);
    this.name =
      "TeamInvitationBrowserScenarioCaseInventoryError";
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

function isRemoteStagingOrigin(
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

function parsePolicy(
  value: unknown,
): TeamInvitationPolicy | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "ttlHours",
      "reRequest",
    ]) ||
    !Number.isSafeInteger(value.ttlHours) ||
    (value.ttlHours as number) < 1 ||
    (value.ttlHours as number) > 8_760 ||
    (
      value.reRequest !== "disabled" &&
      value.reRequest !== "after-terminal"
    )
  ) {
    return null;
  }

  return {
    ttlHours: value.ttlHours as number,
    reRequest: value.reRequest,
  };
}

function parseExpected(
  value: unknown,
): TeamInvitationBrowserScenarioCaseInventoryExpected | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "origin",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "policy",
      "minimumRemainingLifetimeMilliseconds",
    ]) ||
    !isRemoteStagingOrigin(value.origin) ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitPattern.test(value.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !fingerprintPattern.test(
      value.artifactDigest,
    ) ||
    !Number.isSafeInteger(
      value.minimumRemainingLifetimeMilliseconds,
    ) ||
    (
      value.minimumRemainingLifetimeMilliseconds as number
    ) < 1 ||
    (
      value.minimumRemainingLifetimeMilliseconds as number
    ) > maximumInventoryLifetimeMilliseconds
  ) {
    return null;
  }

  const policy = parsePolicy(value.policy);

  if (policy === null) {
    return null;
  }

  return {
    origin: value.origin,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    artifactDigest:
      value.artifactDigest,
    policy,
    minimumRemainingLifetimeMilliseconds:
      value.minimumRemainingLifetimeMilliseconds as number,
  };
}

function parseProofScope(
  value: unknown,
  scenarioName:
    TeamInvitationBrowserScenarioName,
): ScenarioProofScope | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (
    scenarioName ===
      "unauthenticated-user-rejected" &&
    hasExactKeys(value, ["kind"]) &&
    value.kind === "tenant-total"
  ) {
    return Object.freeze({
      kind: "tenant-total" as const,
    });
  }

  if (
    scenarioName ===
      "unauthenticated-user-rejected" ||
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
  index: number,
): ScenarioCase | null {
  const definition =
    teamInvitationBrowserScenarioRegistry[index];

  if (
    definition === undefined ||
    !isPlainObject(value)
  ) {
    return null;
  }

  const requiresDatabaseProof =
    definition.assertions.some(
      (assertion) =>
        assertion.source === "database",
    );
  const expectedKeys = requiresDatabaseProof
    ? ["name", "invitationKey", "proofScope"]
    : ["name", "invitationKey"];

  if (
    !hasExactKeys(value, expectedKeys) ||
    value.name !== definition.name
  ) {
    return null;
  }

  let invitationKey: string;

  try {
    invitationKey =
      requireTeamInvitationKey(
        value.invitationKey,
      );
  } catch {
    return null;
  }

  if (!requiresDatabaseProof) {
    return Object.freeze({
      name: definition.name,
      invitationKey,
      proofScope: null,
    });
  }

  const proofScope =
    parseProofScope(
      value.proofScope,
      definition.name,
    );

  if (proofScope === null) {
    return null;
  }

  return Object.freeze({
    name: definition.name,
    invitationKey,
    proofScope,
  });
}

function parseInventory(
  rawValue: string,
): ScenarioCaseInventory | null {
  let value: unknown;

  try {
    value = JSON.parse(rawValue);
  } catch {
    return null;
  }

  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "preparedAt",
      "expiresAt",
      "environment",
      "origin",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "policyDigest",
      "cases",
    ]) ||
    value.schemaVersion !== 1 ||
    !isCanonicalTimestamp(value.preparedAt) ||
    !isCanonicalTimestamp(value.expiresAt) ||
    value.environment !== "staging" ||
    !isRemoteStagingOrigin(value.origin) ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitPattern.test(value.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !fingerprintPattern.test(
      value.artifactDigest,
    ) ||
    typeof value.policyDigest !== "string" ||
    !policyDigestPattern.test(
      value.policyDigest,
    ) ||
    !Array.isArray(value.cases) ||
    value.cases.length !==
      teamInvitationBrowserScenarioRegistry.length
  ) {
    return null;
  }

  const cases = value.cases.map(
    parseScenarioCase,
  );

  if (
    cases.some(
      (scenarioCase) =>
        scenarioCase === null,
    )
  ) {
    return null;
  }

  const parsedCases =
    cases as ScenarioCase[];
  const invitationKeys =
    parsedCases.map(
      (scenarioCase) =>
        scenarioCase.invitationKey,
    );
  const externalUserIds =
    parsedCases.flatMap(
      (scenarioCase) =>
        scenarioCase.proofScope?.kind ===
        "external-user"
          ? [
              scenarioCase.proofScope
                .externalUserId,
            ]
          : [],
    );

  if (
    new Set(invitationKeys).size !==
      invitationKeys.length ||
    new Set(externalUserIds).size !==
      externalUserIds.length
  ) {
    return null;
  }

  return Object.freeze({
    schemaVersion: 1 as const,
    preparedAt: value.preparedAt,
    expiresAt: value.expiresAt,
    environment: "staging" as const,
    origin: value.origin,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    artifactDigest:
      value.artifactDigest,
    policyDigest:
      value.policyDigest,
    cases: Object.freeze(parsedCases),
  });
}

export function createTeamInvitationBrowserScenarioCaseResolver(
  rawValue: unknown,
  expectedValue: unknown,
  now: Date = new Date(),
) {
  if (
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0
  ) {
    throw new TeamInvitationBrowserScenarioCaseInventoryError(
      "INVENTORY_REQUIRED",
    );
  }

  const expected =
    parseExpected(expectedValue);

  if (
    rawValue.length > maximumInventoryLength ||
    expected === null ||
    !Number.isFinite(now.getTime())
  ) {
    throw new TeamInvitationBrowserScenarioCaseInventoryError(
      "INVENTORY_INVALID",
    );
  }

  const inventory =
    parseInventory(rawValue);

  if (inventory === null) {
    throw new TeamInvitationBrowserScenarioCaseInventoryError(
      "INVENTORY_INVALID",
    );
  }

  const preparedAt =
    Date.parse(inventory.preparedAt);
  const expiresAt =
    Date.parse(inventory.expiresAt);

  if (
    preparedAt > now.getTime() ||
    expiresAt <= preparedAt ||
    expiresAt - preparedAt >
      maximumInventoryLifetimeMilliseconds
  ) {
    throw new TeamInvitationBrowserScenarioCaseInventoryError(
      "INVENTORY_INVALID",
    );
  }

  if (
    expiresAt <= now.getTime() ||
    expiresAt - now.getTime() <
      expected.minimumRemainingLifetimeMilliseconds
  ) {
    throw new TeamInvitationBrowserScenarioCaseInventoryError(
      "INVENTORY_EXPIRED",
    );
  }

  if (
    inventory.origin !== expected.origin ||
    inventory.releaseId !== expected.releaseId ||
    inventory.commitSha !== expected.commitSha ||
    inventory.artifactDigest !==
      expected.artifactDigest ||
    inventory.policyDigest !==
      deriveTeamInvitationPolicyDigest(
        expected.policy,
      )
  ) {
    throw new TeamInvitationBrowserScenarioCaseInventoryError(
      "INVENTORY_MISMATCH",
    );
  }

  return Object.freeze({
    async resolveScenarioCase(
      input: unknown,
      signal: AbortSignal,
    ) {
      if (signal.aborted) {
        throw new TeamInvitationBrowserScenarioCaseInventoryError(
          "ABORTED",
        );
      }

      if (
        !isPlainObject(input) ||
        !hasExactKeys(input, [
          "scenarioName",
        ]) ||
        typeof input.scenarioName !== "string"
      ) {
        throw new TeamInvitationBrowserScenarioCaseInventoryError(
          "SCENARIO_INVALID",
        );
      }

      const scenarioCase =
        inventory.cases.find(
          (candidate) =>
            candidate.name ===
            input.scenarioName,
        );

      if (scenarioCase === undefined) {
        throw new TeamInvitationBrowserScenarioCaseInventoryError(
          "SCENARIO_INVALID",
        );
      }

      return scenarioCase.proofScope === null
        ? Object.freeze({
            invitationKey:
              scenarioCase.invitationKey,
          })
        : Object.freeze({
            invitationKey:
              scenarioCase.invitationKey,
            proofScope:
              scenarioCase.proofScope,
          });
    },
  });
}
