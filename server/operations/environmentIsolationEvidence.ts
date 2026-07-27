import {
  createHash,
} from "node:crypto";

const environmentNames = Object.freeze([
  "development",
  "preview",
  "staging",
  "production",
] as const);
const resourceClasses = Object.freeze([
  "d1",
  "r2",
  "metaWebhookQueue",
  "metaWebhookDeadLetterQueue",
  "campaignDeliveryQueue",
  "campaignDeliveryDeadLetterQueue",
  "metaWebhookRateLimiter",
  "tenantMutationRateLimiter",
  "systemAdminMutationRateLimiter",
  "secretSet",
  "scheduler",
] as const);
const maximumEvidenceLength = 20_000;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^environment_isolation_evidence_v1_[a-f0-9]{64}$/;

type EnvironmentName =
  (typeof environmentNames)[number];
type ResourceClass =
  (typeof resourceClasses)[number];

interface EnvironmentResourceEvidence {
  name: EnvironmentName;
  dataBoundary:
    | "non-production-only"
    | "production-only";
  resources: Record<
    ResourceClass,
    string
  >;
}

interface EnvironmentIsolationEvidence {
  schemaVersion: 1;
  verifiedAt: string;
  expiresAt: string;
  environments:
    readonly EnvironmentResourceEvidence[];
  evidenceDigest: string;
}

export interface EnvironmentIsolationEvidenceEnvironment {
  ENVIRONMENT_ISOLATION_EVIDENCE_JSON?: string;
}

export type EnvironmentIsolationEvidenceReport =
  Readonly<
    | {
        status: "configured";
        code:
          "ENVIRONMENT_ISOLATION_EVIDENCE_VERIFIED";
        environmentCount: 4;
        resourceFingerprintCount: 44;
      }
    | {
        status:
          | "disabled"
          | "invalid"
          | "expired";
        code:
          | "ENVIRONMENT_ISOLATION_EVIDENCE_REQUIRED"
          | "ENVIRONMENT_ISOLATION_EVIDENCE_INVALID"
          | "ENVIRONMENT_ISOLATION_EVIDENCE_EXPIRED";
        environmentCount: 0;
        resourceFingerprintCount: 0;
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
    EnvironmentIsolationEvidence,
    "evidenceDigest"
  >,
): string {
  const environments = [
    ...evidence.environments,
  ]
    .sort(
      (left, right) =>
        environmentNames.indexOf(left.name) -
        environmentNames.indexOf(right.name),
    )
    .map((environment) => ({
      name: environment.name,
      dataBoundary:
        environment.dataBoundary,
      resources: Object.fromEntries(
        resourceClasses.map(
          (resourceClass) => [
            resourceClass,
            environment.resources[
              resourceClass
            ],
          ],
        ),
      ),
    }));

  return JSON.stringify({
    schemaVersion:
      evidence.schemaVersion,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    environments,
  });
}

export function deriveEnvironmentIsolationEvidenceDigest(
  evidence: Omit<
    EnvironmentIsolationEvidence,
    "evidenceDigest"
  >,
): string {
  return `environment_isolation_evidence_v1_${sha256(
    canonicalEvidenceIdentity(evidence),
  )}`;
}

function parseResourceEvidence(
  value: unknown,
): Record<ResourceClass, string> | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(
      value,
      resourceClasses,
    )
  ) {
    return null;
  }

  for (const resourceClass of resourceClasses) {
    if (
      typeof value[resourceClass] !==
        "string" ||
      !fingerprintPattern.test(
        value[resourceClass],
      )
    ) {
      return null;
    }
  }

  return value as Record<
    ResourceClass,
    string
  >;
}

function parseEnvironmentEvidence(
  value: unknown,
): EnvironmentResourceEvidence | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "name",
      "dataBoundary",
      "resources",
    ]) ||
    typeof value.name !== "string" ||
    !environmentNames.includes(
      value.name as EnvironmentName,
    )
  ) {
    return null;
  }

  const name =
    value.name as EnvironmentName;
  const expectedDataBoundary =
    name === "production"
      ? "production-only"
      : "non-production-only";
  const resources =
    parseResourceEvidence(
      value.resources,
    );

  if (
    value.dataBoundary !==
      expectedDataBoundary ||
    !resources
  ) {
    return null;
  }

  return {
    name,
    dataBoundary:
      expectedDataBoundary,
    resources,
  };
}

function parseEvidence(
  rawValue: string,
): EnvironmentIsolationEvidence | null {
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
      "environments",
      "evidenceDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    !isCanonicalTimestamp(
      value.verifiedAt,
    ) ||
    !isCanonicalTimestamp(
      value.expiresAt,
    ) ||
    !Array.isArray(
      value.environments,
    ) ||
    value.environments.length !==
      environmentNames.length ||
    typeof value.evidenceDigest !==
      "string" ||
    !evidenceDigestPattern.test(
      value.evidenceDigest,
    )
  ) {
    return null;
  }

  const environments =
    value.environments.map(
      parseEnvironmentEvidence,
    );

  if (
    environments.some(
      (environment) =>
        environment === null,
    )
  ) {
    return null;
  }

  const parsedEnvironments =
    environments as EnvironmentResourceEvidence[];
  const actualEnvironmentNames =
    parsedEnvironments.map(
      (environment) => environment.name,
    );

  if (
    new Set(actualEnvironmentNames)
      .size !== environmentNames.length ||
    environmentNames.some(
      (name) =>
        !actualEnvironmentNames.includes(
          name,
        ),
    )
  ) {
    return null;
  }

  const fingerprints =
    parsedEnvironments.flatMap(
      (environment) =>
        resourceClasses.map(
          (resourceClass) =>
            environment.resources[
              resourceClass
            ],
        ),
    );

  if (
    new Set(fingerprints).size !==
    fingerprints.length
  ) {
    return null;
  }

  const evidence = {
    schemaVersion: 1 as const,
    verifiedAt: value.verifiedAt,
    expiresAt: value.expiresAt,
    environments:
      parsedEnvironments,
  };

  if (
    deriveEnvironmentIsolationEvidenceDigest(
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

export function inspectEnvironmentIsolationEvidence(
  environment:
    EnvironmentIsolationEvidenceEnvironment,
  now: Date = new Date(),
): EnvironmentIsolationEvidenceReport {
  const rawValue =
    environment
      .ENVIRONMENT_ISOLATION_EVIDENCE_JSON;

  if (
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0
  ) {
    return {
      status: "disabled",
      code:
        "ENVIRONMENT_ISOLATION_EVIDENCE_REQUIRED",
      environmentCount: 0,
      resourceFingerprintCount: 0,
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
        "ENVIRONMENT_ISOLATION_EVIDENCE_INVALID",
      environmentCount: 0,
      resourceFingerprintCount: 0,
    };
  }

  const evidence =
    parseEvidence(rawValue);

  if (
    !evidence ||
    Date.parse(evidence.verifiedAt) >
      now.getTime() ||
    Date.parse(evidence.expiresAt) <=
      Date.parse(evidence.verifiedAt)
  ) {
    return {
      status: "invalid",
      code:
        "ENVIRONMENT_ISOLATION_EVIDENCE_INVALID",
      environmentCount: 0,
      resourceFingerprintCount: 0,
    };
  }

  if (
    Date.parse(evidence.expiresAt) <=
    now.getTime()
  ) {
    return {
      status: "expired",
      code:
        "ENVIRONMENT_ISOLATION_EVIDENCE_EXPIRED",
      environmentCount: 0,
      resourceFingerprintCount: 0,
    };
  }

  return {
    status: "configured",
    code:
      "ENVIRONMENT_ISOLATION_EVIDENCE_VERIFIED",
    environmentCount: 4,
    resourceFingerprintCount: 44,
  };
}
