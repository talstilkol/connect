import {
  createHash,
} from "node:crypto";

import {
  inspectTeamInvitationPolicy,
  type TeamInvitationPolicy,
} from "../team/teamInvitationPolicy.ts";
import {
  resolvePublicOrigin,
} from "./publicOrigin.ts";

const maximumEvidenceLength =
  24_000;
const maximumEvidenceLifetimeMilliseconds =
  24 * 60 * 60 * 1_000;
const maximumScenarioAgeMilliseconds =
  24 * 60 * 60 * 1_000;
const commitPattern =
  /^[a-f0-9]{40}$/;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const policyDigestPattern =
  /^team_invitation_policy_v1_[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^team_invitation_browser_evidence_v1_[a-f0-9]{64}$/;

export const requiredTeamInvitationBrowserScenarios =
  Object.freeze([
    "unauthenticated-user-rejected",
    "unverified-primary-email-rejected",
    "verified-matching-email-accepts",
    "mismatched-email-remains-private",
    "expired-invitation-rejected",
    "identical-retry-idempotent",
    "keyboard-and-focus-accessible",
  ] as const);

type TeamInvitationBrowserScenarioName =
  (typeof requiredTeamInvitationBrowserScenarios)[number];

interface TeamInvitationBrowserScenarioEvidence {
  name:
    TeamInvitationBrowserScenarioName;
  status: "passed";
  completedAt: string;
  runFingerprint: string;
  outputDigest: string;
}

interface TeamInvitationBrowserEvidence {
  schemaVersion: 1;
  verifiedAt: string;
  expiresAt: string;
  environment: "staging";
  origin: string;
  releaseId: string;
  commitSha: string;
  artifactDigest: string;
  policyDigest: string;
  scenarios:
    readonly TeamInvitationBrowserScenarioEvidence[];
  evidenceDigest: string;
}

export interface TeamInvitationBrowserEvidenceEnvironment {
  APP_DEPLOYED_COMMIT_SHA?: string;
  APP_RELEASE_ID?: string;
  APP_DEPLOYMENT_ARTIFACT_DIGEST?: string;
  TEAM_INVITATION_TTL_HOURS?: string;
  TEAM_INVITATION_REREQUEST_POLICY?: string;
  TEAM_INVITATION_BROWSER_E2E_ORIGIN?: string;
  TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON?: string;
}

export type TeamInvitationBrowserEvidenceReport =
  Readonly<
    | {
        status: "configured";
        code:
          "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_VERIFIED";
        verifiedScenarioCount: 7;
      }
    | {
        status:
          | "disabled"
          | "invalid"
          | "expired"
          | "mismatch";
        code:
          | "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_REQUIRED"
          | "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_INVALID"
          | "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_EXPIRED"
          | "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_MISMATCH";
        verifiedScenarioCount: 0;
      }
  >;

function sha256(
  value: string,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
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
  const actual =
    Object.keys(value).sort();
  const expected =
    [...keys].sort();

  return (
    actual.length ===
      expected.length &&
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

  const milliseconds =
    Date.parse(value);

  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds)
      .toISOString() === value
  );
}

function requireStagingOrigin(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const origin =
    resolvePublicOrigin({
      APP_PUBLIC_ORIGIN: value,
      NODE_ENV: "production",
    });

  if (origin !== value) {
    return null;
  }

  const hostname =
    new URL(origin).hostname;

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  )
    ? null
    : origin;
}

export function deriveTeamInvitationPolicyDigest(
  policy: TeamInvitationPolicy,
): string {
  return `team_invitation_policy_v1_${sha256(
    JSON.stringify({
      ttlHours: policy.ttlHours,
      reRequest:
        policy.reRequest,
    }),
  )}`;
}

function canonicalEvidenceIdentity(
  evidence: Omit<
    TeamInvitationBrowserEvidence,
    "evidenceDigest"
  >,
): string {
  const scenarios =
    requiredTeamInvitationBrowserScenarios.map(
      (name) => {
        const scenario =
          evidence.scenarios.find(
            (candidate) =>
              candidate.name ===
              name,
          );

        return {
          name,
          status:
            scenario?.status,
          completedAt:
            scenario
              ?.completedAt,
          runFingerprint:
            scenario
              ?.runFingerprint,
          outputDigest:
            scenario
              ?.outputDigest,
        };
      },
    );

  return JSON.stringify({
    schemaVersion:
      evidence.schemaVersion,
    verifiedAt:
      evidence.verifiedAt,
    expiresAt:
      evidence.expiresAt,
    environment:
      evidence.environment,
    origin: evidence.origin,
    releaseId:
      evidence.releaseId,
    commitSha:
      evidence.commitSha,
    artifactDigest:
      evidence.artifactDigest,
    policyDigest:
      evidence.policyDigest,
    scenarios,
  });
}

export function deriveTeamInvitationBrowserEvidenceDigest(
  evidence: Omit<
    TeamInvitationBrowserEvidence,
    "evidenceDigest"
  >,
): string {
  return `team_invitation_browser_evidence_v1_${sha256(
    canonicalEvidenceIdentity(
      evidence,
    ),
  )}`;
}

function parseScenario(
  value: unknown,
): TeamInvitationBrowserScenarioEvidence | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "name",
      "status",
      "completedAt",
      "runFingerprint",
      "outputDigest",
    ]) ||
    typeof value.name !==
      "string" ||
    !requiredTeamInvitationBrowserScenarios.includes(
      value.name as
        TeamInvitationBrowserScenarioName,
    ) ||
    value.status !== "passed" ||
    !isCanonicalTimestamp(
      value.completedAt,
    ) ||
    typeof value.runFingerprint !==
      "string" ||
    !fingerprintPattern.test(
      value.runFingerprint,
    ) ||
    typeof value.outputDigest !==
      "string" ||
    !fingerprintPattern.test(
      value.outputDigest,
    ) ||
    value.runFingerprint ===
      value.outputDigest
  ) {
    return null;
  }

  return {
    name:
      value.name as
        TeamInvitationBrowserScenarioName,
    status: "passed",
    completedAt:
      value.completedAt,
    runFingerprint:
      value.runFingerprint,
    outputDigest:
      value.outputDigest,
  };
}

function parseEvidence(
  rawValue: string,
): TeamInvitationBrowserEvidence | null {
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
      "verifiedAt",
      "expiresAt",
      "environment",
      "origin",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "policyDigest",
      "scenarios",
      "evidenceDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    !isCanonicalTimestamp(
      value.verifiedAt,
    ) ||
    !isCanonicalTimestamp(
      value.expiresAt,
    ) ||
    value.environment !==
      "staging" ||
    typeof value.origin !==
      "string" ||
    requireStagingOrigin(
      value.origin,
    ) === null ||
    typeof value.releaseId !==
      "string" ||
    !releaseIdPattern.test(
      value.releaseId,
    ) ||
    typeof value.commitSha !==
      "string" ||
    !commitPattern.test(
      value.commitSha,
    ) ||
    typeof value.artifactDigest !==
      "string" ||
    !fingerprintPattern.test(
      value.artifactDigest,
    ) ||
    typeof value.policyDigest !==
      "string" ||
    !policyDigestPattern.test(
      value.policyDigest,
    ) ||
    !Array.isArray(
      value.scenarios,
    ) ||
    value.scenarios.length !==
      requiredTeamInvitationBrowserScenarios.length ||
    typeof value.evidenceDigest !==
      "string" ||
    !evidenceDigestPattern.test(
      value.evidenceDigest,
    )
  ) {
    return null;
  }

  const scenarios =
    value.scenarios.map(
      parseScenario,
    );

  if (
    scenarios.some(
      (scenario) =>
        scenario === null,
    )
  ) {
    return null;
  }

  const parsedScenarios =
    scenarios as
      TeamInvitationBrowserScenarioEvidence[];
  const names =
    parsedScenarios.map(
      (scenario) =>
        scenario.name,
    );
  const runFingerprints =
    parsedScenarios.map(
      (scenario) =>
        scenario.runFingerprint,
    );

  if (
    new Set(names).size !==
      requiredTeamInvitationBrowserScenarios.length ||
    requiredTeamInvitationBrowserScenarios.some(
      (name) =>
        !names.includes(name),
    ) ||
    new Set(runFingerprints).size !==
      requiredTeamInvitationBrowserScenarios.length
  ) {
    return null;
  }

  const evidence = {
    schemaVersion: 1 as const,
    verifiedAt:
      value.verifiedAt,
    expiresAt:
      value.expiresAt,
    environment:
      "staging" as const,
    origin: value.origin,
    releaseId:
      value.releaseId,
    commitSha:
      value.commitSha,
    artifactDigest:
      value.artifactDigest,
    policyDigest:
      value.policyDigest,
    scenarios:
      parsedScenarios,
  };

  if (
    deriveTeamInvitationBrowserEvidenceDigest(
      evidence,
    ) !== value.evidenceDigest
  ) {
    return null;
  }

  return {
    ...evidence,
    evidenceDigest:
      value.evidenceDigest,
  };
}

export function inspectTeamInvitationBrowserEvidence(
  environment:
    TeamInvitationBrowserEvidenceEnvironment,
  now: Date = new Date(),
): TeamInvitationBrowserEvidenceReport {
  const rawValue =
    environment
      .TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON;

  if (
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0
  ) {
    return {
      status: "disabled",
      code:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_REQUIRED",
      verifiedScenarioCount: 0,
    };
  }

  if (
    rawValue.length >
      maximumEvidenceLength ||
    !Number.isFinite(
      now.getTime(),
    )
  ) {
    return {
      status: "invalid",
      code:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_INVALID",
      verifiedScenarioCount: 0,
    };
  }

  const evidence =
    parseEvidence(rawValue);

  if (evidence === null) {
    return {
      status: "invalid",
      code:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_INVALID",
      verifiedScenarioCount: 0,
    };
  }

  const verifiedAt =
    Date.parse(
      evidence.verifiedAt,
    );
  const expiresAt =
    Date.parse(
      evidence.expiresAt,
    );

  if (
    verifiedAt > now.getTime() ||
    expiresAt <= verifiedAt ||
    expiresAt - verifiedAt >
      maximumEvidenceLifetimeMilliseconds ||
    evidence.scenarios.some(
      (scenario) => {
        const completedAt =
          Date.parse(
            scenario.completedAt,
          );

        return (
          completedAt > verifiedAt ||
          verifiedAt - completedAt >
            maximumScenarioAgeMilliseconds
        );
      },
    )
  ) {
    return {
      status: "invalid",
      code:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_INVALID",
      verifiedScenarioCount: 0,
    };
  }

  if (expiresAt <= now.getTime()) {
    return {
      status: "expired",
      code:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_EXPIRED",
      verifiedScenarioCount: 0,
    };
  }

  const policy =
    inspectTeamInvitationPolicy(
      environment,
    );
  const configuredOrigin =
    requireStagingOrigin(
      environment
        .TEAM_INVITATION_BROWSER_E2E_ORIGIN,
    );

  if (
    environment
      .APP_DEPLOYED_COMMIT_SHA !==
      evidence.commitSha ||
    environment.APP_RELEASE_ID !==
      evidence.releaseId ||
    environment
      .APP_DEPLOYMENT_ARTIFACT_DIGEST !==
      evidence.artifactDigest ||
    configuredOrigin !==
      evidence.origin ||
    policy.status !==
      "configured" ||
    deriveTeamInvitationPolicyDigest(
      policy.policy,
    ) !== evidence.policyDigest
  ) {
    return {
      status: "mismatch",
      code:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_MISMATCH",
      verifiedScenarioCount: 0,
    };
  }

  return {
    status: "configured",
    code:
      "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_VERIFIED",
    verifiedScenarioCount: 7,
  };
}
