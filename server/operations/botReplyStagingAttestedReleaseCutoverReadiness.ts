import { types as nodeUtilTypes } from "node:util";

import {
  railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
} from "../platform/railwayBotReplyStagingAttestedReleaseEvidence.ts";
import type {
  PostgresBotReplyStagingAttestedReleaseEvidenceReadResult,
} from "../platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";

export const botReplyStagingAttestedReleaseCutoverReadinessVersion =
  "connect-bot-reply-staging-attested-release-cutover-readiness-v1" as const;

export type BotReplyStagingAttestedReleaseReadResult =
  PostgresBotReplyStagingAttestedReleaseEvidenceReadResult;

export type BotReplyStagingAttestedReleaseCutoverReadiness = Readonly<
  | {
      schemaVersion: 1;
      readinessVersion:
        typeof botReplyStagingAttestedReleaseCutoverReadinessVersion;
      status: "blocked";
      code: "CAPABILITY_ROLES_REQUIRED";
      evidenceStatus: "verified";
      storageMode: "postgresql";
      releaseId: string;
      commitSha: string;
      artifactDigest: string;
      evidenceVersion: number;
      evidenceDigest: string;
      evidenceSchemaVersion: 2;
      evidencePolicyVersion:
        typeof railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion;
      verifiedAt: string;
      expiresAt: string;
      replayProtected: true;
      requiredDecisionId: "D31";
      requiredCapabilityRoleCount: 4;
      activationAllowed: false;
    }
  | {
      schemaVersion: 1;
      readinessVersion:
        typeof botReplyStagingAttestedReleaseCutoverReadinessVersion;
      status: "blocked";
      code: "EVIDENCE_REQUIRED";
      evidenceStatus: "unavailable";
      storageMode: "postgresql";
      releaseId: null;
      commitSha: null;
      artifactDigest: null;
      evidenceVersion: null;
      evidenceDigest: null;
      evidenceSchemaVersion: null;
      evidencePolicyVersion: null;
      verifiedAt: null;
      expiresAt: null;
      replayProtected: false;
      requiredDecisionId: "D31";
      requiredCapabilityRoleCount: 4;
      activationAllowed: false;
    }
>;

const maximumVersion = 2_147_483_647;
const minimumLifetimeMilliseconds = 60 * 1_000;
const maximumLifetimeMilliseconds = 15 * 60 * 1_000;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v2_[a-f0-9]{64}$/;
const readResultKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "evidenceDigest",
  "evidencePolicyVersion",
  "evidenceSchemaVersion",
  "evidenceVersion",
  "expiresAt",
  "releaseId",
  "replayProtected",
  "status",
  "storageMode",
  "verifiedAt",
] as const);

function snapshotExactRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" || value === null ||
    nodeUtilTypes.isProxy(value) || Array.isArray(value)
  ) {
    return null;
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== readResultKeys.length ||
      ownKeys.some((key) => typeof key !== "string")
    ) {
      return null;
    }
    const actualKeys = (ownKeys as string[]).sort();
    if (
      actualKeys.some((key, index) => key !== readResultKeys[index])
    ) {
      return null;
    }

    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of actualKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function canonicalTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.length > 64) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  try {
    return new Date(milliseconds).toISOString() === value
      ? milliseconds
      : null;
  } catch {
    return null;
  }
}

function verifiedResult(
  value: Readonly<Record<string, unknown>>,
): BotReplyStagingAttestedReleaseReadResult | null {
  const verifiedAt = canonicalTimestamp(value.verifiedAt);
  const expiresAt = canonicalTimestamp(value.expiresAt);
  if (
    value.status !== "verified" || value.storageMode !== "postgresql" ||
    value.replayProtected !== true ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !artifactDigestPattern.test(value.artifactDigest) ||
    !Number.isSafeInteger(value.evidenceVersion) ||
    Number(value.evidenceVersion) < 1 ||
    Number(value.evidenceVersion) > maximumVersion ||
    typeof value.evidenceDigest !== "string" ||
    !evidenceDigestPattern.test(value.evidenceDigest) ||
    value.evidenceSchemaVersion !== 2 ||
    value.evidencePolicyVersion !==
      railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion ||
    verifiedAt === null || expiresAt === null ||
    expiresAt - verifiedAt < minimumLifetimeMilliseconds ||
    expiresAt - verifiedAt > maximumLifetimeMilliseconds
  ) {
    return null;
  }

  return Object.freeze({
    status: "verified" as const,
    storageMode: "postgresql" as const,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    artifactDigest: value.artifactDigest,
    evidenceVersion: Number(value.evidenceVersion),
    evidenceDigest: value.evidenceDigest,
    evidenceSchemaVersion: 2 as const,
    evidencePolicyVersion:
      railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
    verifiedAt: value.verifiedAt as string,
    expiresAt: value.expiresAt as string,
    replayProtected: true as const,
  });
}

function unavailableResult(
  value: Readonly<Record<string, unknown>>,
): boolean {
  return value.status === "unavailable" &&
    value.storageMode === "postgresql" &&
    value.releaseId === null && value.commitSha === null &&
    value.artifactDigest === null && value.evidenceVersion === null &&
    value.evidenceDigest === null && value.verifiedAt === null &&
    value.evidenceSchemaVersion === null &&
    value.evidencePolicyVersion === null && value.expiresAt === null &&
    value.replayProtected === false;
}

function evidenceRequired(): BotReplyStagingAttestedReleaseCutoverReadiness {
  return Object.freeze({
    schemaVersion: 1 as const,
    readinessVersion:
      botReplyStagingAttestedReleaseCutoverReadinessVersion,
    status: "blocked" as const,
    code: "EVIDENCE_REQUIRED" as const,
    evidenceStatus: "unavailable" as const,
    storageMode: "postgresql" as const,
    releaseId: null,
    commitSha: null,
    artifactDigest: null,
    evidenceVersion: null,
    evidenceDigest: null,
    evidenceSchemaVersion: null,
    evidencePolicyVersion: null,
    verifiedAt: null,
    expiresAt: null,
    replayProtected: false as const,
    requiredDecisionId: "D31" as const,
    requiredCapabilityRoleCount: 4 as const,
    activationAllowed: false as const,
  });
}

/**
 * Converts a bounded PostgreSQL v2 verification result into a dormant cutover
 * decision. This slice has no approval input: even exact replay-protected
 * evidence cannot activate Bot reply staging before the separate D31 role and
 * approval proof exists.
 */
export function evaluateBotReplyStagingAttestedReleaseCutoverReadiness(
  input: unknown,
): BotReplyStagingAttestedReleaseCutoverReadiness {
  const snapshot = snapshotExactRecord(input);
  if (snapshot === null) return evidenceRequired();
  if (unavailableResult(snapshot)) return evidenceRequired();
  const evidence = verifiedResult(snapshot);
  if (evidence === null || evidence.status !== "verified") {
    return evidenceRequired();
  }

  return Object.freeze({
    schemaVersion: 1 as const,
    readinessVersion:
      botReplyStagingAttestedReleaseCutoverReadinessVersion,
    status: "blocked" as const,
    code: "CAPABILITY_ROLES_REQUIRED" as const,
    evidenceStatus: "verified" as const,
    storageMode: "postgresql" as const,
    releaseId: evidence.releaseId,
    commitSha: evidence.commitSha,
    artifactDigest: evidence.artifactDigest,
    evidenceVersion: evidence.evidenceVersion,
    evidenceDigest: evidence.evidenceDigest,
    evidenceSchemaVersion: evidence.evidenceSchemaVersion,
    evidencePolicyVersion: evidence.evidencePolicyVersion,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    replayProtected: true as const,
    requiredDecisionId: "D31" as const,
    requiredCapabilityRoleCount: 4 as const,
    activationAllowed: false as const,
  });
}
