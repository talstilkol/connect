import {
  createHash,
} from "node:crypto";

import {
  requiredPullRequestStatusChecks,
} from "./sourceControlGovernanceEvidence.ts";

const maximumEvidenceLength = 24_000;
const maximumEvidenceLifetimeMilliseconds =
  24 * 60 * 60 * 1_000;
const maximumCheckAgeMilliseconds =
  24 * 60 * 60 * 1_000;
const commitPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^ci_execution_evidence_v1_[a-f0-9]{64}$/;

type PullRequestStatusCheck =
  (typeof requiredPullRequestStatusChecks)[number];

interface CiCheckEvidence {
  name: PullRequestStatusCheck;
  status: "success";
  completedAt: string;
  runFingerprint: string;
  outputDigest: string;
}

interface CiExecutionEvidence {
  schemaVersion: 1;
  verifiedAt: string;
  expiresAt: string;
  releaseId: string;
  commitSha: string;
  checks: readonly CiCheckEvidence[];
  evidenceDigest: string;
}

export interface CiExecutionEnvironment {
  APP_DEPLOYED_COMMIT_SHA?: string;
  APP_RELEASE_ID?: string;
  CI_EXECUTION_EVIDENCE_JSON?: string;
}

export type CiExecutionReport =
  Readonly<
    | {
        status: "configured";
        code:
          "CI_EXECUTION_EVIDENCE_VERIFIED";
        verifiedStatusCheckCount: 9;
      }
    | {
        status:
          | "disabled"
          | "invalid"
          | "expired"
          | "mismatch";
        code:
          | "CI_EXECUTION_EVIDENCE_REQUIRED"
          | "CI_EXECUTION_EVIDENCE_INVALID"
          | "CI_EXECUTION_EVIDENCE_EXPIRED"
          | "CI_EXECUTION_EVIDENCE_MISMATCH";
        verifiedStatusCheckCount: 0;
      }
  >;

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

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
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

function canonicalEvidenceIdentity(
  evidence: Omit<
    CiExecutionEvidence,
    "evidenceDigest"
  >,
): string {
  const checks =
    requiredPullRequestStatusChecks.map(
      (name) => {
        const check =
          evidence.checks.find(
            (candidate) =>
              candidate.name === name,
          );

        return {
          name,
          status: check?.status,
          completedAt:
            check?.completedAt,
          runFingerprint:
            check?.runFingerprint,
          outputDigest:
            check?.outputDigest,
        };
      },
    );

  return JSON.stringify({
    schemaVersion:
      evidence.schemaVersion,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    releaseId: evidence.releaseId,
    commitSha: evidence.commitSha,
    checks,
  });
}

export function deriveCiExecutionEvidenceDigest(
  evidence: Omit<
    CiExecutionEvidence,
    "evidenceDigest"
  >,
): string {
  return `ci_execution_evidence_v1_${sha256(
    canonicalEvidenceIdentity(evidence),
  )}`;
}

function parseCheck(
  value: unknown,
): CiCheckEvidence | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "name",
      "status",
      "completedAt",
      "runFingerprint",
      "outputDigest",
    ]) ||
    typeof value.name !== "string" ||
    !requiredPullRequestStatusChecks.includes(
      value.name as PullRequestStatusCheck,
    ) ||
    value.status !== "success" ||
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
      value.name as PullRequestStatusCheck,
    status: "success",
    completedAt: value.completedAt,
    runFingerprint:
      value.runFingerprint,
    outputDigest: value.outputDigest,
  };
}

function parseEvidence(
  rawValue: string,
): CiExecutionEvidence | null {
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
      "releaseId",
      "commitSha",
      "checks",
      "evidenceDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    !isCanonicalTimestamp(
      value.verifiedAt,
    ) ||
    !isCanonicalTimestamp(
      value.expiresAt,
    ) ||
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
    !Array.isArray(value.checks) ||
    value.checks.length !==
      requiredPullRequestStatusChecks.length ||
    typeof value.evidenceDigest !==
      "string" ||
    !evidenceDigestPattern.test(
      value.evidenceDigest,
    )
  ) {
    return null;
  }

  const checks =
    value.checks.map(parseCheck);

  if (
    checks.some(
      (check) => check === null,
    )
  ) {
    return null;
  }

  const parsedChecks =
    checks as CiCheckEvidence[];
  const names = parsedChecks.map(
    (check) => check.name,
  );
  const runFingerprints =
    parsedChecks.map(
      (check) =>
        check.runFingerprint,
    );

  if (
    new Set(names).size !==
      requiredPullRequestStatusChecks.length ||
    requiredPullRequestStatusChecks.some(
      (name) => !names.includes(name),
    ) ||
    new Set(runFingerprints).size !==
      requiredPullRequestStatusChecks.length
  ) {
    return null;
  }

  const evidence = {
    schemaVersion: 1 as const,
    verifiedAt: value.verifiedAt,
    expiresAt: value.expiresAt,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    checks: parsedChecks,
  };

  if (
    deriveCiExecutionEvidenceDigest(
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

export function inspectCiExecutionEvidence(
  environment: CiExecutionEnvironment,
  now: Date = new Date(),
): CiExecutionReport {
  const rawValue =
    environment
      .CI_EXECUTION_EVIDENCE_JSON;

  if (
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0
  ) {
    return {
      status: "disabled",
      code:
        "CI_EXECUTION_EVIDENCE_REQUIRED",
      verifiedStatusCheckCount: 0,
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
        "CI_EXECUTION_EVIDENCE_INVALID",
      verifiedStatusCheckCount: 0,
    };
  }

  const evidence =
    parseEvidence(rawValue);

  if (evidence === null) {
    return {
      status: "invalid",
      code:
        "CI_EXECUTION_EVIDENCE_INVALID",
      verifiedStatusCheckCount: 0,
    };
  }

  const verifiedAt =
    Date.parse(evidence.verifiedAt);
  const expiresAt =
    Date.parse(evidence.expiresAt);

  if (
    verifiedAt > now.getTime() ||
    expiresAt <= verifiedAt ||
    expiresAt - verifiedAt >
      maximumEvidenceLifetimeMilliseconds ||
    evidence.checks.some(
      (check) => {
        const completedAt =
          Date.parse(check.completedAt);

        return (
          completedAt > verifiedAt ||
          verifiedAt - completedAt >
            maximumCheckAgeMilliseconds
        );
      },
    )
  ) {
    return {
      status: "invalid",
      code:
        "CI_EXECUTION_EVIDENCE_INVALID",
      verifiedStatusCheckCount: 0,
    };
  }

  if (expiresAt <= now.getTime()) {
    return {
      status: "expired",
      code:
        "CI_EXECUTION_EVIDENCE_EXPIRED",
      verifiedStatusCheckCount: 0,
    };
  }

  if (
    environment
      .APP_DEPLOYED_COMMIT_SHA !==
      evidence.commitSha ||
    environment.APP_RELEASE_ID !==
      evidence.releaseId
  ) {
    return {
      status: "mismatch",
      code:
        "CI_EXECUTION_EVIDENCE_MISMATCH",
      verifiedStatusCheckCount: 0,
    };
  }

  return {
    status: "configured",
    code:
      "CI_EXECUTION_EVIDENCE_VERIFIED",
    verifiedStatusCheckCount: 9,
  };
}
