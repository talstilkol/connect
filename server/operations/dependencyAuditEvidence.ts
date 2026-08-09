import {
  createHash,
} from "node:crypto";

const officialNpmRegistry =
  "https://registry.npmjs.org/";
const maximumEvidenceLength = 12_000;
const maximumEvidenceLifetimeMilliseconds =
  24 * 60 * 60 * 1_000;
const gitObjectPattern = /^[a-f0-9]{40}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^dependency_audit_evidence_v1_[a-f0-9]{64}$/;
const severityNames = Object.freeze([
  "info",
  "low",
  "moderate",
  "high",
  "critical",
] as const);

type SeverityName =
  (typeof severityNames)[number];
type VulnerabilityCounts = Readonly<
  Record<SeverityName | "total", number>
>;

export interface DependencyAuditReleaseManifest {
  schemaVersion: 1;
  releaseId: string;
  commitSha: string;
  treeSha: string;
  packageLockSha256: string;
  migrationSetSha256: string;
}

export interface DependencyAuditEvidence {
  schemaVersion: 1;
  verifiedAt: string;
  expiresAt: string;
  scope: "production";
  registry: typeof officialNpmRegistry;
  releaseId: string;
  commitSha: string;
  treeSha: string;
  packageLockSha256: string;
  migrationSetSha256: string;
  auditReportVersion: 2;
  productionDependencyCount: number;
  vulnerabilities: VulnerabilityCounts;
  evidenceDigest: string;
}

export interface DependencyAuditEvidenceEnvironment {
  APP_DEPLOYED_COMMIT_SHA?: string;
  APP_RELEASE_ID?: string;
  DEPENDENCY_AUDIT_EVIDENCE_JSON?: string;
}

export type DependencyAuditEvidenceReport =
  Readonly<
    | {
        status: "configured";
        code: "DEPENDENCY_AUDIT_EVIDENCE_VERIFIED";
        auditedDependencyCount: number;
        vulnerabilityCount: 0;
      }
    | {
        status:
          | "disabled"
          | "invalid"
          | "expired"
          | "mismatch"
          | "vulnerable";
        code:
          | "DEPENDENCY_AUDIT_EVIDENCE_REQUIRED"
          | "DEPENDENCY_AUDIT_EVIDENCE_INVALID"
          | "DEPENDENCY_AUDIT_EVIDENCE_EXPIRED"
          | "DEPENDENCY_AUDIT_EVIDENCE_MISMATCH"
          | "DEPENDENCY_VULNERABILITIES_FOUND";
        auditedDependencyCount: 0;
        vulnerabilityCount: number;
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
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) => key === expected[index],
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

function sha256(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function deriveReleaseId(
  value: Pick<
    DependencyAuditEvidence,
    | "schemaVersion"
    | "commitSha"
    | "treeSha"
    | "packageLockSha256"
    | "migrationSetSha256"
  >,
): string {
  return `connect_release_v1_${sha256(
    JSON.stringify({
      schemaVersion: value.schemaVersion,
      commitSha: value.commitSha,
      treeSha: value.treeSha,
      packageLockSha256:
        value.packageLockSha256,
      migrationSetSha256:
        value.migrationSetSha256,
    }),
  )}`;
}

function canonicalEvidenceIdentity(
  evidence: Omit<
    DependencyAuditEvidence,
    "evidenceDigest"
  >,
): string {
  return JSON.stringify({
    schemaVersion: evidence.schemaVersion,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    scope: evidence.scope,
    registry: evidence.registry,
    releaseId: evidence.releaseId,
    commitSha: evidence.commitSha,
    treeSha: evidence.treeSha,
    packageLockSha256:
      evidence.packageLockSha256,
    migrationSetSha256:
      evidence.migrationSetSha256,
    auditReportVersion:
      evidence.auditReportVersion,
    productionDependencyCount:
      evidence.productionDependencyCount,
    vulnerabilities: severityNames.reduce(
      (counts, severity) => ({
        ...counts,
        [severity]:
          evidence.vulnerabilities[severity],
      }),
      {
        total:
          evidence.vulnerabilities.total,
      } as Record<string, number>,
    ),
  });
}

export function deriveDependencyAuditEvidenceDigest(
  evidence: Omit<
    DependencyAuditEvidence,
    "evidenceDigest"
  >,
): string {
  return `dependency_audit_evidence_v1_${sha256(
    canonicalEvidenceIdentity(evidence),
  )}`;
}

function parseCounts(
  value: unknown,
): VulnerabilityCounts | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      ...severityNames,
      "total",
    ]) ||
    [...severityNames, "total"].some(
      (name) =>
        !Number.isSafeInteger(value[name]) ||
        (value[name] as number) < 0,
    )
  ) {
    return null;
  }

  const total = severityNames.reduce(
    (sum, severity) =>
      sum + (value[severity] as number),
    0,
  );

  if (total !== value.total) {
    return null;
  }

  return Object.freeze({
    info: value.info as number,
    low: value.low as number,
    moderate: value.moderate as number,
    high: value.high as number,
    critical: value.critical as number,
    total,
  });
}

function requireReleaseManifest(
  value: unknown,
): DependencyAuditReleaseManifest {
  if (
    !isPlainObject(value) ||
    value.schemaVersion !== 1 ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !gitObjectPattern.test(value.commitSha) ||
    typeof value.treeSha !== "string" ||
    !gitObjectPattern.test(value.treeSha) ||
    typeof value.packageLockSha256 !== "string" ||
    !sha256Pattern.test(value.packageLockSha256) ||
    typeof value.migrationSetSha256 !== "string" ||
    !sha256Pattern.test(value.migrationSetSha256)
  ) {
    throw new Error(
      "DEPENDENCY_AUDIT_RELEASE_INVALID",
    );
  }

  const manifest = {
    schemaVersion: 1 as const,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    treeSha: value.treeSha,
    packageLockSha256:
      value.packageLockSha256,
    migrationSetSha256:
      value.migrationSetSha256,
  };

  if (deriveReleaseId(manifest) !== manifest.releaseId) {
    throw new Error(
      "DEPENDENCY_AUDIT_RELEASE_INVALID",
    );
  }

  return manifest;
}

function requireAuditReport(
  value: unknown,
): {
  productionDependencyCount: number;
  vulnerabilities: VulnerabilityCounts;
} {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "auditReportVersion",
      "vulnerabilities",
      "metadata",
    ]) ||
    value.auditReportVersion !== 2 ||
    !isPlainObject(value.vulnerabilities) ||
    !isPlainObject(value.metadata) ||
    !hasExactKeys(value.metadata, [
      "vulnerabilities",
      "dependencies",
    ]) ||
    !isPlainObject(value.metadata.dependencies) ||
    !hasExactKeys(value.metadata.dependencies, [
      "prod",
      "dev",
      "optional",
      "peer",
      "peerOptional",
      "total",
    ]) ||
    !Number.isSafeInteger(
      value.metadata.dependencies.prod,
    ) ||
    (value.metadata.dependencies.prod as number) < 1
  ) {
    throw new Error(
      "DEPENDENCY_AUDIT_REPORT_INVALID",
    );
  }

  const counts = parseCounts(
    value.metadata.vulnerabilities,
  );

  if (
    counts === null ||
    Object.keys(value.vulnerabilities).length !==
      counts.total
  ) {
    throw new Error(
      "DEPENDENCY_AUDIT_REPORT_INVALID",
    );
  }

  return {
    productionDependencyCount:
      value.metadata.dependencies.prod as number,
    vulnerabilities: counts,
  };
}

export function buildDependencyAuditEvidence(
  rawAuditReport: unknown,
  rawReleaseManifest: unknown,
  now: Date = new Date(),
): DependencyAuditEvidence {
  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    throw new Error(
      "DEPENDENCY_AUDIT_CLOCK_INVALID",
    );
  }

  const releaseManifest =
    requireReleaseManifest(rawReleaseManifest);
  const auditReport =
    requireAuditReport(rawAuditReport);
  const evidenceWithoutDigest = {
    schemaVersion: 1 as const,
    verifiedAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() +
        maximumEvidenceLifetimeMilliseconds,
    ).toISOString(),
    scope: "production" as const,
    registry:
      officialNpmRegistry as typeof officialNpmRegistry,
    releaseId: releaseManifest.releaseId,
    commitSha: releaseManifest.commitSha,
    treeSha: releaseManifest.treeSha,
    packageLockSha256:
      releaseManifest.packageLockSha256,
    migrationSetSha256:
      releaseManifest.migrationSetSha256,
    auditReportVersion: 2 as const,
    productionDependencyCount:
      auditReport.productionDependencyCount,
    vulnerabilities:
      auditReport.vulnerabilities,
  };

  return Object.freeze({
    ...evidenceWithoutDigest,
    evidenceDigest:
      deriveDependencyAuditEvidenceDigest(
        evidenceWithoutDigest,
      ),
  });
}

function parseEvidence(
  rawValue: string,
): DependencyAuditEvidence | null {
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
      "scope",
      "registry",
      "releaseId",
      "commitSha",
      "treeSha",
      "packageLockSha256",
      "migrationSetSha256",
      "auditReportVersion",
      "productionDependencyCount",
      "vulnerabilities",
      "evidenceDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    !isCanonicalTimestamp(value.verifiedAt) ||
    !isCanonicalTimestamp(value.expiresAt) ||
    value.scope !== "production" ||
    value.registry !== officialNpmRegistry ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !gitObjectPattern.test(value.commitSha) ||
    typeof value.treeSha !== "string" ||
    !gitObjectPattern.test(value.treeSha) ||
    typeof value.packageLockSha256 !== "string" ||
    !sha256Pattern.test(value.packageLockSha256) ||
    typeof value.migrationSetSha256 !== "string" ||
    !sha256Pattern.test(value.migrationSetSha256) ||
    value.auditReportVersion !== 2 ||
    !Number.isSafeInteger(
      value.productionDependencyCount,
    ) ||
    (value.productionDependencyCount as number) < 1 ||
    typeof value.evidenceDigest !== "string" ||
    !evidenceDigestPattern.test(value.evidenceDigest)
  ) {
    return null;
  }

  const counts = parseCounts(value.vulnerabilities);

  if (counts === null) {
    return null;
  }

  const evidenceWithoutDigest = {
    schemaVersion: 1 as const,
    verifiedAt: value.verifiedAt,
    expiresAt: value.expiresAt,
    scope: "production" as const,
    registry:
      officialNpmRegistry as typeof officialNpmRegistry,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    treeSha: value.treeSha,
    packageLockSha256:
      value.packageLockSha256,
    migrationSetSha256:
      value.migrationSetSha256,
    auditReportVersion: 2 as const,
    productionDependencyCount:
      value.productionDependencyCount as number,
    vulnerabilities: counts,
  };

  if (
    deriveReleaseId(evidenceWithoutDigest) !==
      evidenceWithoutDigest.releaseId ||
    deriveDependencyAuditEvidenceDigest(
      evidenceWithoutDigest,
    ) !== value.evidenceDigest
  ) {
    return null;
  }

  return {
    ...evidenceWithoutDigest,
    evidenceDigest: value.evidenceDigest,
  };
}

export function inspectDependencyAuditEvidence(
  environment: DependencyAuditEvidenceEnvironment,
  now: Date = new Date(),
): DependencyAuditEvidenceReport {
  const rawValue =
    environment.DEPENDENCY_AUDIT_EVIDENCE_JSON;

  if (
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0
  ) {
    return {
      status: "disabled",
      code: "DEPENDENCY_AUDIT_EVIDENCE_REQUIRED",
      auditedDependencyCount: 0,
      vulnerabilityCount: 0,
    };
  }

  if (
    rawValue.length > maximumEvidenceLength ||
    !Number.isFinite(now.getTime())
  ) {
    return {
      status: "invalid",
      code: "DEPENDENCY_AUDIT_EVIDENCE_INVALID",
      auditedDependencyCount: 0,
      vulnerabilityCount: 0,
    };
  }

  const evidence = parseEvidence(rawValue);

  if (evidence === null) {
    return {
      status: "invalid",
      code: "DEPENDENCY_AUDIT_EVIDENCE_INVALID",
      auditedDependencyCount: 0,
      vulnerabilityCount: 0,
    };
  }

  const verifiedAt = Date.parse(evidence.verifiedAt);
  const expiresAt = Date.parse(evidence.expiresAt);

  if (
    verifiedAt > now.getTime() ||
    expiresAt <= verifiedAt ||
    expiresAt - verifiedAt >
      maximumEvidenceLifetimeMilliseconds
  ) {
    return {
      status: "invalid",
      code: "DEPENDENCY_AUDIT_EVIDENCE_INVALID",
      auditedDependencyCount: 0,
      vulnerabilityCount: 0,
    };
  }

  if (expiresAt <= now.getTime()) {
    return {
      status: "expired",
      code: "DEPENDENCY_AUDIT_EVIDENCE_EXPIRED",
      auditedDependencyCount: 0,
      vulnerabilityCount: 0,
    };
  }

  if (
    environment.APP_RELEASE_ID !== evidence.releaseId ||
    environment.APP_DEPLOYED_COMMIT_SHA !==
      evidence.commitSha
  ) {
    return {
      status: "mismatch",
      code: "DEPENDENCY_AUDIT_EVIDENCE_MISMATCH",
      auditedDependencyCount: 0,
      vulnerabilityCount: 0,
    };
  }

  if (evidence.vulnerabilities.total > 0) {
    return {
      status: "vulnerable",
      code: "DEPENDENCY_VULNERABILITIES_FOUND",
      auditedDependencyCount: 0,
      vulnerabilityCount:
        evidence.vulnerabilities.total,
    };
  }

  return {
    status: "configured",
    code: "DEPENDENCY_AUDIT_EVIDENCE_VERIFIED",
    auditedDependencyCount:
      evidence.productionDependencyCount,
    vulnerabilityCount: 0,
  };
}
