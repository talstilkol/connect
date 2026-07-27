import {
  createHash,
} from "node:crypto";

const maximumEvidenceLength = 12_000;
const maximumEvidenceLifetimeMilliseconds =
  24 * 60 * 60 * 1_000;
const gitObjectPattern =
  /^[a-f0-9]{40}$/;
const sha256Pattern =
  /^[a-f0-9]{64}$/;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^deployment_provenance_evidence_v1_[a-f0-9]{64}$/;

interface DeploymentProvenanceEvidence {
  schemaVersion: 1;
  verifiedAt: string;
  expiresAt: string;
  environment: "production";
  releaseId: string;
  commitSha: string;
  treeSha: string;
  packageLockSha256: string;
  migrationSetSha256: string;
  artifactDigest: string;
  deploymentFingerprint: string;
  evidenceDigest: string;
}

export interface DeploymentProvenanceEnvironment {
  APP_DEPLOYED_COMMIT_SHA?: string;
  APP_RELEASE_ID?: string;
  APP_DEPLOYMENT_ARTIFACT_DIGEST?: string;
  DEPLOYMENT_PROVENANCE_EVIDENCE_JSON?: string;
}

export type DeploymentProvenanceReport =
  Readonly<
    | {
        status: "configured";
        code:
          "DEPLOYMENT_PROVENANCE_EVIDENCE_VERIFIED";
        verifiedAssetCount: 6;
      }
    | {
        status:
          | "disabled"
          | "invalid"
          | "expired"
          | "mismatch";
        code:
          | "DEPLOYMENT_PROVENANCE_EVIDENCE_REQUIRED"
          | "DEPLOYMENT_PROVENANCE_EVIDENCE_INVALID"
          | "DEPLOYMENT_PROVENANCE_EVIDENCE_EXPIRED"
          | "DEPLOYMENT_PROVENANCE_EVIDENCE_MISMATCH";
        verifiedAssetCount: 0;
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

function deriveReleaseId(
  evidence: Pick<
    DeploymentProvenanceEvidence,
    | "schemaVersion"
    | "commitSha"
    | "treeSha"
    | "packageLockSha256"
    | "migrationSetSha256"
  >,
): string {
  return `connect_release_v1_${sha256(
    JSON.stringify({
      schemaVersion:
        evidence.schemaVersion,
      commitSha: evidence.commitSha,
      treeSha: evidence.treeSha,
      packageLockSha256:
        evidence.packageLockSha256,
      migrationSetSha256:
        evidence.migrationSetSha256,
    }),
  )}`;
}

function canonicalEvidenceIdentity(
  evidence: Omit<
    DeploymentProvenanceEvidence,
    "evidenceDigest"
  >,
): string {
  return JSON.stringify({
    schemaVersion:
      evidence.schemaVersion,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    environment: evidence.environment,
    releaseId: evidence.releaseId,
    commitSha: evidence.commitSha,
    treeSha: evidence.treeSha,
    packageLockSha256:
      evidence.packageLockSha256,
    migrationSetSha256:
      evidence.migrationSetSha256,
    artifactDigest:
      evidence.artifactDigest,
    deploymentFingerprint:
      evidence.deploymentFingerprint,
  });
}

export function deriveDeploymentProvenanceEvidenceDigest(
  evidence: Omit<
    DeploymentProvenanceEvidence,
    "evidenceDigest"
  >,
): string {
  return `deployment_provenance_evidence_v1_${sha256(
    canonicalEvidenceIdentity(evidence),
  )}`;
}

function parseEvidence(
  rawValue: string,
): DeploymentProvenanceEvidence | null {
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
      "releaseId",
      "commitSha",
      "treeSha",
      "packageLockSha256",
      "migrationSetSha256",
      "artifactDigest",
      "deploymentFingerprint",
      "evidenceDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    !isCanonicalTimestamp(
      value.verifiedAt,
    ) ||
    !isCanonicalTimestamp(
      value.expiresAt,
    ) ||
    value.environment !== "production" ||
    typeof value.releaseId !==
      "string" ||
    !releaseIdPattern.test(
      value.releaseId,
    ) ||
    typeof value.commitSha !==
      "string" ||
    !gitObjectPattern.test(
      value.commitSha,
    ) ||
    typeof value.treeSha !==
      "string" ||
    !gitObjectPattern.test(
      value.treeSha,
    ) ||
    typeof value.packageLockSha256 !==
      "string" ||
    !sha256Pattern.test(
      value.packageLockSha256,
    ) ||
    typeof value.migrationSetSha256 !==
      "string" ||
    !sha256Pattern.test(
      value.migrationSetSha256,
    ) ||
    typeof value.artifactDigest !==
      "string" ||
    !fingerprintPattern.test(
      value.artifactDigest,
    ) ||
    typeof value.deploymentFingerprint !==
      "string" ||
    !fingerprintPattern.test(
      value.deploymentFingerprint,
    ) ||
    value.artifactDigest ===
      value.deploymentFingerprint ||
    typeof value.evidenceDigest !==
      "string" ||
    !evidenceDigestPattern.test(
      value.evidenceDigest,
    )
  ) {
    return null;
  }

  const evidence = {
    schemaVersion: 1 as const,
    verifiedAt: value.verifiedAt,
    expiresAt: value.expiresAt,
    environment:
      "production" as const,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    treeSha: value.treeSha,
    packageLockSha256:
      value.packageLockSha256,
    migrationSetSha256:
      value.migrationSetSha256,
    artifactDigest:
      value.artifactDigest,
    deploymentFingerprint:
      value.deploymentFingerprint,
  };

  if (
    deriveReleaseId(evidence) !==
      evidence.releaseId ||
    deriveDeploymentProvenanceEvidenceDigest(
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

export function inspectDeploymentProvenanceEvidence(
  environment:
    DeploymentProvenanceEnvironment,
  now: Date = new Date(),
): DeploymentProvenanceReport {
  const rawValue =
    environment
      .DEPLOYMENT_PROVENANCE_EVIDENCE_JSON;

  if (
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0
  ) {
    return {
      status: "disabled",
      code:
        "DEPLOYMENT_PROVENANCE_EVIDENCE_REQUIRED",
      verifiedAssetCount: 0,
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
        "DEPLOYMENT_PROVENANCE_EVIDENCE_INVALID",
      verifiedAssetCount: 0,
    };
  }

  const evidence =
    parseEvidence(rawValue);

  if (evidence === null) {
    return {
      status: "invalid",
      code:
        "DEPLOYMENT_PROVENANCE_EVIDENCE_INVALID",
      verifiedAssetCount: 0,
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
      maximumEvidenceLifetimeMilliseconds
  ) {
    return {
      status: "invalid",
      code:
        "DEPLOYMENT_PROVENANCE_EVIDENCE_INVALID",
      verifiedAssetCount: 0,
    };
  }

  if (expiresAt <= now.getTime()) {
    return {
      status: "expired",
      code:
        "DEPLOYMENT_PROVENANCE_EVIDENCE_EXPIRED",
      verifiedAssetCount: 0,
    };
  }

  if (
    environment
      .APP_DEPLOYED_COMMIT_SHA !==
      evidence.commitSha ||
    environment.APP_RELEASE_ID !==
      evidence.releaseId ||
    environment
      .APP_DEPLOYMENT_ARTIFACT_DIGEST !==
      evidence.artifactDigest
  ) {
    return {
      status: "mismatch",
      code:
        "DEPLOYMENT_PROVENANCE_EVIDENCE_MISMATCH",
      verifiedAssetCount: 0,
    };
  }

  return {
    status: "configured",
    code:
      "DEPLOYMENT_PROVENANCE_EVIDENCE_VERIFIED",
    verifiedAssetCount: 6,
  };
}
