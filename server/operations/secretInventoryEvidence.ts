import {
  createHash,
} from "node:crypto";

const environmentNames = Object.freeze([
  "development",
  "preview",
  "staging",
  "production",
] as const);
const secretNames = Object.freeze([
  "CLERK_SECRET_KEY",
  "CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "META_CREDENTIAL_ENCRYPTION_KEY_V1",
  "WHATSAPP_RATE_LIMIT_HMAC_KEY_V1",
] as const);
const maximumEvidenceLength = 20_000;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^secret_inventory_evidence_v1_[a-f0-9]{64}$/;

type EnvironmentName =
  (typeof environmentNames)[number];
type SecretName =
  (typeof secretNames)[number];

interface SecretInventoryEntry {
  environment: EnvironmentName;
  name: SecretName;
  secretFingerprint: string;
  ownerFingerprint: string;
  lastRotatedAt: string;
  nextRotationAt: string;
}

interface SecretInventoryEvidence {
  schemaVersion: 1;
  verifiedAt: string;
  expiresAt: string;
  secrets: readonly SecretInventoryEntry[];
  evidenceDigest: string;
}

export interface SecretInventoryEvidenceEnvironment {
  SECRET_INVENTORY_EVIDENCE_JSON?: string;
}

export type SecretInventoryEvidenceReport =
  Readonly<
    | {
        status: "configured";
        code:
          "SECRET_INVENTORY_EVIDENCE_VERIFIED";
        environmentCount: 4;
        secretCount: 24;
      }
    | {
        status:
          | "disabled"
          | "invalid"
          | "expired"
          | "rotation-overdue";
        code:
          | "SECRET_INVENTORY_EVIDENCE_REQUIRED"
          | "SECRET_INVENTORY_EVIDENCE_INVALID"
          | "SECRET_INVENTORY_EVIDENCE_EXPIRED"
          | "SECRET_ROTATION_OVERDUE";
        environmentCount: 0;
        secretCount: 0;
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

function canonicalEvidenceIdentity(
  evidence: Omit<
    SecretInventoryEvidence,
    "evidenceDigest"
  >,
): string {
  const secrets = [...evidence.secrets]
    .sort((left, right) => {
      const environmentOrder =
        environmentNames.indexOf(
          left.environment,
        ) -
        environmentNames.indexOf(
          right.environment,
        );

      return environmentOrder !== 0
        ? environmentOrder
        : secretNames.indexOf(left.name) -
            secretNames.indexOf(
              right.name,
            );
    })
    .map((entry) => ({
      environment: entry.environment,
      name: entry.name,
      secretFingerprint:
        entry.secretFingerprint,
      ownerFingerprint:
        entry.ownerFingerprint,
      lastRotatedAt:
        entry.lastRotatedAt,
      nextRotationAt:
        entry.nextRotationAt,
    }));

  return JSON.stringify({
    schemaVersion:
      evidence.schemaVersion,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    secrets,
  });
}

export function deriveSecretInventoryEvidenceDigest(
  evidence: Omit<
    SecretInventoryEvidence,
    "evidenceDigest"
  >,
): string {
  return `secret_inventory_evidence_v1_${sha256(
    canonicalEvidenceIdentity(evidence),
  )}`;
}

function parseSecretEntry(
  value: unknown,
): SecretInventoryEntry | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "environment",
      "name",
      "secretFingerprint",
      "ownerFingerprint",
      "lastRotatedAt",
      "nextRotationAt",
    ]) ||
    typeof value.environment !==
      "string" ||
    !environmentNames.includes(
      value.environment as EnvironmentName,
    ) ||
    typeof value.name !== "string" ||
    !secretNames.includes(
      value.name as SecretName,
    ) ||
    typeof value.secretFingerprint !==
      "string" ||
    !fingerprintPattern.test(
      value.secretFingerprint,
    ) ||
    typeof value.ownerFingerprint !==
      "string" ||
    !fingerprintPattern.test(
      value.ownerFingerprint,
    ) ||
    !isCanonicalTimestamp(
      value.lastRotatedAt,
    ) ||
    !isCanonicalTimestamp(
      value.nextRotationAt,
    ) ||
    Date.parse(value.nextRotationAt) <=
      Date.parse(value.lastRotatedAt)
  ) {
    return null;
  }

  return {
    environment:
      value.environment as EnvironmentName,
    name: value.name as SecretName,
    secretFingerprint:
      value.secretFingerprint,
    ownerFingerprint:
      value.ownerFingerprint,
    lastRotatedAt:
      value.lastRotatedAt,
    nextRotationAt:
      value.nextRotationAt,
  };
}

function parseEvidence(
  rawValue: string,
): SecretInventoryEvidence | null {
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
      "secrets",
      "evidenceDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    !isCanonicalTimestamp(
      value.verifiedAt,
    ) ||
    !isCanonicalTimestamp(
      value.expiresAt,
    ) ||
    !Array.isArray(value.secrets) ||
    value.secrets.length !==
      environmentNames.length *
        secretNames.length ||
    typeof value.evidenceDigest !==
      "string" ||
    !evidenceDigestPattern.test(
      value.evidenceDigest,
    )
  ) {
    return null;
  }

  const secrets =
    value.secrets.map(
      parseSecretEntry,
    );

  if (
    secrets.some(
      (entry) => entry === null,
    )
  ) {
    return null;
  }

  const parsedSecrets =
    secrets as SecretInventoryEntry[];
  const scopeKeys =
    parsedSecrets.map(
      (entry) =>
        `${entry.environment}:${entry.name}`,
    );
  const secretFingerprints =
    parsedSecrets.map(
      (entry) =>
        entry.secretFingerprint,
    );

  if (
    new Set(scopeKeys).size !==
      scopeKeys.length ||
    new Set(secretFingerprints).size !==
      secretFingerprints.length ||
    environmentNames.some(
      (environmentName) =>
        secretNames.some(
          (secretName) =>
            !scopeKeys.includes(
              `${environmentName}:${secretName}`,
            ),
        ),
    )
  ) {
    return null;
  }

  const evidence = {
    schemaVersion: 1 as const,
    verifiedAt: value.verifiedAt,
    expiresAt: value.expiresAt,
    secrets: parsedSecrets,
  };

  if (
    deriveSecretInventoryEvidenceDigest(
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

export function inspectSecretInventoryEvidence(
  environment:
    SecretInventoryEvidenceEnvironment,
  now: Date = new Date(),
): SecretInventoryEvidenceReport {
  const rawValue =
    environment
      .SECRET_INVENTORY_EVIDENCE_JSON;

  if (
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0
  ) {
    return {
      status: "disabled",
      code:
        "SECRET_INVENTORY_EVIDENCE_REQUIRED",
      environmentCount: 0,
      secretCount: 0,
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
        "SECRET_INVENTORY_EVIDENCE_INVALID",
      environmentCount: 0,
      secretCount: 0,
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
    evidence.secrets.some(
      (entry) =>
        Date.parse(entry.lastRotatedAt) >
        Date.parse(
          evidence.verifiedAt,
        ),
    )
  ) {
    return {
      status: "invalid",
      code:
        "SECRET_INVENTORY_EVIDENCE_INVALID",
      environmentCount: 0,
      secretCount: 0,
    };
  }

  if (
    Date.parse(evidence.expiresAt) <=
    now.getTime()
  ) {
    return {
      status: "expired",
      code:
        "SECRET_INVENTORY_EVIDENCE_EXPIRED",
      environmentCount: 0,
      secretCount: 0,
    };
  }

  if (
    evidence.secrets.some(
      (entry) =>
        Date.parse(entry.nextRotationAt) <=
        now.getTime(),
    )
  ) {
    return {
      status: "rotation-overdue",
      code:
        "SECRET_ROTATION_OVERDUE",
      environmentCount: 0,
      secretCount: 0,
    };
  }

  return {
    status: "configured",
    code:
      "SECRET_INVENTORY_EVIDENCE_VERIFIED",
    environmentCount: 4,
    secretCount: 24,
  };
}
