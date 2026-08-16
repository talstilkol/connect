import {
  createHash,
} from "node:crypto";

export const requiredPullRequestStatusChecks =
  Object.freeze([
  "source-guardrails",
  "secret-hygiene",
  "interface-guardrails",
  "dependency-lock",
  "migrations",
  "typecheck",
  "lint",
  "tests-and-build",
  "dependency-audit",
] as const);
const controlNames = Object.freeze([
  "repositoryPrivate",
  "branchProtection",
  "codeOwnerReview",
  "dismissStaleApprovals",
  "conversationResolution",
  "forcePushBlocked",
  "branchDeletionBlocked",
  "secretScanning",
  "pushProtection",
] as const);
const maximumEvidenceLength = 12_000;
const maximumEvidenceLifetimeMilliseconds =
  24 * 60 * 60 * 1_000;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const commitPattern = /^[a-f0-9]{40}$/;
const evidenceDigestPattern =
  /^source_control_governance_evidence_v3_[a-f0-9]{64}$/;

type GovernanceControl =
  (typeof controlNames)[number];

export interface SourceControlGovernanceEvidence {
  schemaVersion: 3;
  verifiedAt: string;
  expiresAt: string;
  repositoryFingerprint: string;
  defaultBranchFingerprint: string;
  releaseCommitSha: string;
  requiredReviewCount: number;
  requiredStatusChecks:
    readonly string[];
  controls: Record<
    GovernanceControl,
    true
  >;
  evidenceDigest: string;
}

export interface SourceControlGovernanceSnapshot {
  verifiedAt: string;
  repositoryIdentity: string;
  defaultBranchIdentity: string;
  releaseCommitSha: string;
  requiredReviewCount: number;
  requiredStatusChecks:
    readonly string[];
  controls: Record<
    GovernanceControl,
    boolean
  >;
}

export interface SourceControlGovernanceEnvironment {
  APP_DEPLOYED_COMMIT_SHA?: string;
  SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON?: string;
}

export type SourceControlGovernanceReport =
  Readonly<
    | {
        status: "configured";
        code:
          "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_VERIFIED";
        requiredStatusCheckCount: 9;
        controlCount: 9;
      }
    | {
        status:
          | "disabled"
          | "invalid"
          | "expired"
          | "commit-mismatch";
        code:
          | "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_REQUIRED"
          | "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_INVALID"
          | "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_EXPIRED"
          | "SOURCE_CONTROL_RELEASE_COMMIT_MISMATCH";
        requiredStatusCheckCount: 0;
        controlCount: 0;
      }
  >;

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
  const actualKeys =
    Object.keys(value).sort();
  const expectedKeys =
    [...keys].sort();

  return (
    actualKeys.length ===
      expectedKeys.length &&
    actualKeys.every(
      (key, index) =>
        key === expectedKeys[index],
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
    new Date(milliseconds).toISOString() ===
      value
  );
}

function sha256(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function fingerprint(
  scope: string,
  value: string,
): string {
  return `sha256:${sha256(
    `${scope}:${value}`,
  )}`;
}

function canonicalEvidenceIdentity(
  evidence: Omit<
    SourceControlGovernanceEvidence,
    "evidenceDigest"
  >,
): string {
  return JSON.stringify({
    schemaVersion:
      evidence.schemaVersion,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    repositoryFingerprint:
      evidence.repositoryFingerprint,
    defaultBranchFingerprint:
      evidence.defaultBranchFingerprint,
    releaseCommitSha:
      evidence.releaseCommitSha,
    requiredReviewCount:
      evidence.requiredReviewCount,
    requiredStatusChecks:
      requiredPullRequestStatusChecks.map(
        (check) => check,
      ),
    controls: Object.fromEntries(
      controlNames.map((control) => [
        control,
        evidence.controls[control],
      ]),
    ),
  });
}

export function deriveSourceControlGovernanceEvidenceDigest(
  evidence: Omit<
    SourceControlGovernanceEvidence,
    "evidenceDigest"
  >,
): string {
  return `source_control_governance_evidence_v3_${sha256(
    canonicalEvidenceIdentity(evidence),
  )}`;
}

function parseEvidence(
  rawValue: string,
): SourceControlGovernanceEvidence | null {
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
      "repositoryFingerprint",
      "defaultBranchFingerprint",
      "releaseCommitSha",
      "requiredReviewCount",
      "requiredStatusChecks",
      "controls",
      "evidenceDigest",
    ]) ||
    value.schemaVersion !== 3 ||
    !isCanonicalTimestamp(
      value.verifiedAt,
    ) ||
    !isCanonicalTimestamp(
      value.expiresAt,
    ) ||
    typeof value.repositoryFingerprint !==
      "string" ||
    !fingerprintPattern.test(
      value.repositoryFingerprint,
    ) ||
    typeof value.defaultBranchFingerprint !==
      "string" ||
    !fingerprintPattern.test(
      value.defaultBranchFingerprint,
    ) ||
    value.repositoryFingerprint ===
      value.defaultBranchFingerprint ||
    typeof value.releaseCommitSha !==
      "string" ||
    !commitPattern.test(
      value.releaseCommitSha,
    ) ||
    !Number.isSafeInteger(
      value.requiredReviewCount,
    ) ||
    Number(value.requiredReviewCount) < 1 ||
    Number(value.requiredReviewCount) > 10 ||
    typeof value.evidenceDigest !==
      "string" ||
    !evidenceDigestPattern.test(
      value.evidenceDigest,
    )
  ) {
    return null;
  }

  const rawStatusChecks =
    value.requiredStatusChecks;
  if (
    !Array.isArray(rawStatusChecks) ||
    rawStatusChecks.length !==
      requiredPullRequestStatusChecks.length ||
    new Set(rawStatusChecks)
      .size !==
        requiredPullRequestStatusChecks.length ||
    requiredPullRequestStatusChecks.some(
      (check) =>
        !rawStatusChecks.includes(
          check,
        ),
    )
  ) {
    return null;
  }

  const rawControls = value.controls;
  if (
    !isPlainObject(rawControls) ||
    !hasExactKeys(
      rawControls,
      controlNames,
    ) ||
    controlNames.some(
      (control) =>
        rawControls[control] !== true,
    )
  ) {
    return null;
  }

  const evidence = {
    schemaVersion: 3 as const,
    verifiedAt: value.verifiedAt,
    expiresAt: value.expiresAt,
    repositoryFingerprint:
      value.repositoryFingerprint,
    defaultBranchFingerprint:
      value.defaultBranchFingerprint,
    releaseCommitSha:
      value.releaseCommitSha,
    requiredReviewCount:
      value.requiredReviewCount as number,
    requiredStatusChecks:
      requiredPullRequestStatusChecks.map(
        (check) => check,
      ),
    controls: Object.fromEntries(
      controlNames.map((control) => [
        control,
        true,
      ]),
    ) as Record<
      GovernanceControl,
      true
    >,
  };

  if (
    deriveSourceControlGovernanceEvidenceDigest(
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

export function buildSourceControlGovernanceEvidence(
  rawSnapshot: unknown,
): Readonly<SourceControlGovernanceEvidence> {
  if (
    !isPlainObject(rawSnapshot) ||
    !hasExactKeys(rawSnapshot, [
      "verifiedAt",
      "repositoryIdentity",
      "defaultBranchIdentity",
      "releaseCommitSha",
      "requiredReviewCount",
      "requiredStatusChecks",
      "controls",
    ]) ||
    !isCanonicalTimestamp(
      rawSnapshot.verifiedAt,
    ) ||
    typeof rawSnapshot.repositoryIdentity !==
      "string" ||
    rawSnapshot.repositoryIdentity.length < 1 ||
    rawSnapshot.repositoryIdentity.length > 512 ||
    typeof rawSnapshot.defaultBranchIdentity !==
      "string" ||
    rawSnapshot.defaultBranchIdentity.length < 1 ||
    rawSnapshot.defaultBranchIdentity.length > 512 ||
    rawSnapshot.repositoryIdentity ===
      rawSnapshot.defaultBranchIdentity ||
    typeof rawSnapshot.releaseCommitSha !==
      "string" ||
    !commitPattern.test(
      rawSnapshot.releaseCommitSha,
    ) ||
    !Number.isSafeInteger(
      rawSnapshot.requiredReviewCount,
    ) ||
    Number(rawSnapshot.requiredReviewCount) < 1 ||
    Number(rawSnapshot.requiredReviewCount) > 10 ||
    !Array.isArray(
      rawSnapshot.requiredStatusChecks,
    ) ||
    rawSnapshot.requiredStatusChecks.length !==
      requiredPullRequestStatusChecks.length ||
    new Set(
      rawSnapshot.requiredStatusChecks,
    ).size !==
      requiredPullRequestStatusChecks.length ||
    requiredPullRequestStatusChecks.some(
      (check) =>
        !(
          rawSnapshot.requiredStatusChecks as
            unknown[]
        ).includes(check),
    ) ||
    !isPlainObject(rawSnapshot.controls) ||
    !hasExactKeys(
      rawSnapshot.controls,
      controlNames,
    ) ||
    controlNames.some(
      (control) =>
        (
          rawSnapshot.controls as
            Record<string, unknown>
        )[control] !== true,
    )
  ) {
    throw new Error(
      "SOURCE_CONTROL_GOVERNANCE_SNAPSHOT_INVALID",
    );
  }

  const verifiedAt =
    rawSnapshot.verifiedAt;
  const expiresAt = new Date(
    Date.parse(verifiedAt) +
      maximumEvidenceLifetimeMilliseconds,
  ).toISOString();
  const evidence = {
    schemaVersion: 3 as const,
    verifiedAt,
    expiresAt,
    repositoryFingerprint: fingerprint(
      "repository",
      rawSnapshot.repositoryIdentity,
    ),
    defaultBranchFingerprint: fingerprint(
      "default-branch",
      rawSnapshot.defaultBranchIdentity,
    ),
    releaseCommitSha:
      rawSnapshot.releaseCommitSha,
    requiredReviewCount:
      rawSnapshot.requiredReviewCount as number,
    requiredStatusChecks:
      requiredPullRequestStatusChecks.map(
        (check) => check,
      ),
    controls: Object.fromEntries(
      controlNames.map((control) => [
        control,
        true,
      ]),
    ) as Record<
      GovernanceControl,
      true
    >,
  };
  const completeEvidence = {
    ...evidence,
    evidenceDigest:
      deriveSourceControlGovernanceEvidenceDigest(
        evidence,
      ),
  };
  const parsed = parseEvidence(
    JSON.stringify(completeEvidence),
  );

  if (parsed === null) {
    throw new Error(
      "SOURCE_CONTROL_GOVERNANCE_SNAPSHOT_INVALID",
    );
  }

  return Object.freeze({
    ...parsed,
    requiredStatusChecks: Object.freeze(
      [...parsed.requiredStatusChecks],
    ),
    controls: Object.freeze({
      ...parsed.controls,
    }),
  });
}

export function inspectSourceControlGovernanceEvidence(
  environment:
    SourceControlGovernanceEnvironment,
  now: Date = new Date(),
): SourceControlGovernanceReport {
  const rawValue =
    environment
      .SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON;

  if (
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0
  ) {
    return {
      status: "disabled",
      code:
        "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_REQUIRED",
      requiredStatusCheckCount: 0,
      controlCount: 0,
    };
  }

  if (
    rawValue.length >
      maximumEvidenceLength ||
    !Number.isFinite(now.getTime())
  ) {
    return {
      status: "invalid",
      code:
        "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_INVALID",
      requiredStatusCheckCount: 0,
      controlCount: 0,
    };
  }

  const evidence =
    parseEvidence(rawValue);

  if (
    !evidence ||
    Date.parse(evidence.verifiedAt) >
      now.getTime() ||
    Date.parse(evidence.expiresAt) <=
      Date.parse(evidence.verifiedAt) ||
    Date.parse(evidence.expiresAt) -
      Date.parse(evidence.verifiedAt) >
        maximumEvidenceLifetimeMilliseconds
  ) {
    return {
      status: "invalid",
      code:
        "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_INVALID",
      requiredStatusCheckCount: 0,
      controlCount: 0,
    };
  }

  if (
    Date.parse(evidence.expiresAt) <=
    now.getTime()
  ) {
    return {
      status: "expired",
      code:
        "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_EXPIRED",
      requiredStatusCheckCount: 0,
      controlCount: 0,
    };
  }

  if (
    typeof environment
      .APP_DEPLOYED_COMMIT_SHA !==
      "string" ||
    !commitPattern.test(
      environment
        .APP_DEPLOYED_COMMIT_SHA,
    ) ||
    environment.APP_DEPLOYED_COMMIT_SHA !==
      evidence.releaseCommitSha
  ) {
    return {
      status: "commit-mismatch",
      code:
        "SOURCE_CONTROL_RELEASE_COMMIT_MISMATCH",
      requiredStatusCheckCount: 0,
      controlCount: 0,
    };
  }

  return {
    status: "configured",
    code:
      "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_VERIFIED",
    requiredStatusCheckCount: 9,
    controlCount: 9,
  };
}
