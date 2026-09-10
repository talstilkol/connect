import {
  createHash,
} from "node:crypto";

export const environmentIsolationEnvironmentNames = Object.freeze([
  "development",
  "preview",
  "staging",
  "production",
] as const);
export const environmentIsolationResourceClasses = Object.freeze([
  "d1",
  "r2",
  "metaWebhookQueue",
  "metaWebhookDeadLetterQueue",
  "campaignDeliveryQueue",
  "campaignDeliveryDeadLetterQueue",
  "teamInvitationQueue",
  "teamInvitationDeadLetterQueue",
  "metaWebhookRateLimiter",
  "tenantMutationRateLimiter",
  "systemAdminMutationRateLimiter",
  "secretSet",
  "scheduler",
] as const);
const maximumEvidenceLength = 20_000;
const maximumEvidenceLifetimeMilliseconds =
  24 * 60 * 60 * 1_000;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^environment_isolation_evidence_v2_[a-f0-9]{64}$/;

type EnvironmentName =
  (typeof environmentIsolationEnvironmentNames)[number];
type ResourceClass =
  (typeof environmentIsolationResourceClasses)[number];

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
  schemaVersion: 2;
  verifiedAt: string;
  expiresAt: string;
  environments:
    readonly EnvironmentResourceEvidence[];
  evidenceDigest: string;
}

export interface EnvironmentIsolationResourceSnapshot {
  name: EnvironmentName;
  resources: Record<ResourceClass, string>;
}

export interface EnvironmentIsolationSnapshot {
  verifiedAt: string;
  environments:
    readonly EnvironmentIsolationResourceSnapshot[];
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
        resourceFingerprintCount: 52;
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

function fingerprint(
  scope: string,
  value: string,
): string {
  return `sha256:${sha256(
    `${scope}:${value}`,
  )}`;
}

function resourceIdentityScope(
  resourceClass: ResourceClass,
): string {
  if (
    resourceClass.endsWith("Queue") ||
    resourceClass.endsWith(
      "DeadLetterQueue",
    )
  ) {
    return "queue";
  }

  if (resourceClass.endsWith("RateLimiter")) {
    return "rate-limiter";
  }

  return resourceClass;
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
        environmentIsolationEnvironmentNames.indexOf(left.name) -
        environmentIsolationEnvironmentNames.indexOf(right.name),
    )
    .map((environment) => ({
      name: environment.name,
      dataBoundary:
        environment.dataBoundary,
      resources: Object.fromEntries(
        environmentIsolationResourceClasses.map(
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
  return `environment_isolation_evidence_v2_${sha256(
    canonicalEvidenceIdentity(evidence),
  )}`;
}

export function buildEnvironmentIsolationEvidence(
  rawSnapshot: unknown,
): Readonly<EnvironmentIsolationEvidence> {
  if (
    !isPlainObject(rawSnapshot) ||
    !hasExactKeys(rawSnapshot, [
      "verifiedAt",
      "environments",
    ]) ||
    !isCanonicalTimestamp(
      rawSnapshot.verifiedAt,
    ) ||
    !Array.isArray(
      rawSnapshot.environments,
    ) ||
    rawSnapshot.environments.length !==
      environmentIsolationEnvironmentNames.length
  ) {
    throw new Error(
      "ENVIRONMENT_ISOLATION_SNAPSHOT_INVALID",
    );
  }

  const names: string[] = [];
  const rawResourceIdentities: string[] = [];
  const environments =
    rawSnapshot.environments.map(
      (rawEnvironment) => {
        if (
          !isPlainObject(rawEnvironment) ||
          !hasExactKeys(rawEnvironment, [
            "name",
            "resources",
          ]) ||
          typeof rawEnvironment.name !==
            "string" ||
          !environmentIsolationEnvironmentNames.includes(
            rawEnvironment.name as EnvironmentName,
          ) ||
          !isPlainObject(
            rawEnvironment.resources,
          ) ||
          !hasExactKeys(
            rawEnvironment.resources,
            environmentIsolationResourceClasses,
          )
        ) {
          throw new Error(
            "ENVIRONMENT_ISOLATION_SNAPSHOT_INVALID",
          );
        }

        const name =
          rawEnvironment.name as EnvironmentName;
        const rawResources =
          rawEnvironment.resources as
            Record<string, unknown>;
        const resources = Object.fromEntries(
          environmentIsolationResourceClasses.map(
            (resourceClass) => {
              const identity =
                rawResources[
                  resourceClass
                ];

              if (
                typeof identity !== "string" ||
                identity.length < 1 ||
                identity.length > 2_048 ||
                /[\0\r\n]/.test(identity)
              ) {
                throw new Error(
                  "ENVIRONMENT_ISOLATION_SNAPSHOT_INVALID",
                );
              }

              const scopedIdentity =
                `${resourceIdentityScope(
                  resourceClass,
                )}:${identity}`;
              rawResourceIdentities.push(
                scopedIdentity,
              );

              return [
                resourceClass,
                fingerprint(
                  resourceIdentityScope(
                    resourceClass,
                  ),
                  identity,
                ),
              ];
            },
          ),
        ) as Record<ResourceClass, string>;

        names.push(name);

        return Object.freeze({
          name,
          dataBoundary:
            name === "production"
              ? "production-only" as const
              : "non-production-only" as const,
          resources: Object.freeze(resources),
        });
      },
    );

  if (
    new Set(names).size !==
      environmentIsolationEnvironmentNames.length ||
    environmentIsolationEnvironmentNames.some(
      (name) => !names.includes(name),
    ) ||
    new Set(rawResourceIdentities).size !==
      rawResourceIdentities.length
  ) {
    throw new Error(
      "ENVIRONMENT_ISOLATION_SNAPSHOT_INVALID",
    );
  }

  const verifiedAt =
    rawSnapshot.verifiedAt;
  const evidence = {
    schemaVersion: 2 as const,
    verifiedAt,
    expiresAt: new Date(
      Date.parse(verifiedAt) +
        maximumEvidenceLifetimeMilliseconds,
    ).toISOString(),
    environments: Object.freeze(
      environments,
    ),
  };

  return Object.freeze({
    ...evidence,
    evidenceDigest:
      deriveEnvironmentIsolationEvidenceDigest(
        evidence,
      ),
  });
}

function parseResourceEvidence(
  value: unknown,
): Record<ResourceClass, string> | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(
      value,
      environmentIsolationResourceClasses,
    )
  ) {
    return null;
  }

  for (const resourceClass of environmentIsolationResourceClasses) {
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
    !environmentIsolationEnvironmentNames.includes(
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
    value.schemaVersion !== 2 ||
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
      environmentIsolationEnvironmentNames.length ||
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
      .size !== environmentIsolationEnvironmentNames.length ||
    environmentIsolationEnvironmentNames.some(
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
        environmentIsolationResourceClasses.map(
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
    schemaVersion: 2 as const,
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
      Date.parse(evidence.verifiedAt) ||
    Date.parse(evidence.expiresAt) -
        Date.parse(evidence.verifiedAt) >
      maximumEvidenceLifetimeMilliseconds
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
    resourceFingerprintCount: 52,
  };
}
