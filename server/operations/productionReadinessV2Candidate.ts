import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../../shared/domain/productionReadinessRegistryV2.ts";
import {
  PRODUCTION_READINESS_V2_REGISTRY_VERSION,
  productionReadinessV2CheckIds,
  productionReadinessV2Issuers,
  type ProductionReadinessV2Definition,
  type ProductionReadinessV2EvidenceEnvelope,
  type ProductionReadinessV2Issuer,
} from "../../shared/domain/productionReadinessV2.ts";
import {
  deriveProductionReadinessRegistryV2Digest,
  deriveProductionReadinessV2ReleaseManifestDigest,
  evaluateProductionReadinessV2,
  parseProductionReadinessV2Evidence,
} from "./productionReadinessV2.ts";

export const productionReadinessV2CandidateVersion =
  "connect-production-readiness-candidate-v2" as const;

const maximumEvidenceSetBytes = 49_159;
const candidateDigestPattern =
  /^production_readiness_candidate_v2_[a-f0-9]{64}$/;
const registryDigestPattern =
  /^production_readiness_registry_v2_[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const sha256Pattern = /^sha256:[a-f0-9]{64}$/;
const environmentPattern =
  /^(?:development|preview|production|staging)$/;
const identityKeys = Object.freeze([
  "commitSha",
  "environment",
  "registryDigest",
  "registryVersion",
  "releaseId",
  "releaseManifestDigest",
  "serviceArtifactDigests",
]);
const inputKeys = Object.freeze(["evidence", "identity"]);
const candidateKeys = Object.freeze([
  "candidateDigest",
  "evidenceSetJson",
  "identity",
  "validUntil",
]);

export interface ProductionReadinessV2ReleaseIdentity {
  readonly environment: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly registryVersion:
    typeof PRODUCTION_READINESS_V2_REGISTRY_VERSION;
  readonly registryDigest: string;
  readonly releaseManifestDigest: string;
  readonly serviceArtifactDigests: Readonly<
    Record<ProductionReadinessV2Issuer, string>
  >;
}

export interface ProductionReadinessV2CandidateInput {
  readonly identity: Readonly<ProductionReadinessV2ReleaseIdentity>;
  readonly evidence: readonly string[];
}

export interface ProductionReadinessV2Candidate {
  readonly identity: Readonly<ProductionReadinessV2ReleaseIdentity>;
  readonly candidateDigest: string;
  readonly evidenceSetJson: string;
  readonly validUntil: string;
}

interface ProductionReadinessV2CandidateClock {
  readonly now: () => Date;
}

export type ProductionReadinessV2CandidateErrorCode =
  | "input-invalid"
  | "not-ready";

export class ProductionReadinessV2CandidateError extends Error {
  readonly code: ProductionReadinessV2CandidateErrorCode;

  constructor(code: ProductionReadinessV2CandidateErrorCode) {
    super(`Production readiness v2 candidate failed: ${code}`);
    this.name = "ProductionReadinessV2CandidateError";
    this.code = code;
  }
}

const systemClock = Object.freeze({
  now() {
    return new Date();
  },
});

function exactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.byteLength === rightBytes.byteLength &&
    timingSafeEqual(leftBytes, rightBytes);
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function isServiceArtifactDigests(
  value: unknown,
): value is Readonly<Record<ProductionReadinessV2Issuer, string>> {
  return exactRecord(value, productionReadinessV2Issuers) &&
    productionReadinessV2Issuers.every(
      (issuer) =>
        typeof value[issuer] === "string" &&
        sha256Pattern.test(value[issuer]),
    );
}

export function inspectProductionReadinessV2ReleaseIdentity(
  value: unknown,
  registry: readonly ProductionReadinessV2Definition[] =
    PRODUCTION_READINESS_REGISTRY_V2,
): Readonly<ProductionReadinessV2ReleaseIdentity> {
  if (
    !exactRecord(value, identityKeys) ||
    typeof value.environment !== "string" ||
    !environmentPattern.test(value.environment) ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha) ||
    value.registryVersion !== PRODUCTION_READINESS_V2_REGISTRY_VERSION ||
    typeof value.registryDigest !== "string" ||
    !registryDigestPattern.test(value.registryDigest) ||
    typeof value.releaseManifestDigest !== "string" ||
    !sha256Pattern.test(value.releaseManifestDigest) ||
    !isServiceArtifactDigests(value.serviceArtifactDigests)
  ) {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  const serviceArtifactDigests = Object.freeze({
    "railway-api": value.serviceArtifactDigests["railway-api"],
    "railway-worker":
      value.serviceArtifactDigests["railway-worker"],
    "vercel-web": value.serviceArtifactDigests["vercel-web"],
  });
  const identity = Object.freeze({
    environment: value.environment,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    registryVersion: PRODUCTION_READINESS_V2_REGISTRY_VERSION,
    registryDigest: value.registryDigest,
    releaseManifestDigest: value.releaseManifestDigest,
    serviceArtifactDigests,
  });
  const expectedRegistryDigest =
    deriveProductionReadinessRegistryV2Digest(registry);
  const expectedManifestDigest =
    deriveProductionReadinessV2ReleaseManifestDigest({
      environment: identity.environment,
      releaseId: identity.releaseId,
      commitSha: identity.commitSha,
      serviceArtifactDigests: identity.serviceArtifactDigests,
    });
  if (
    !safeEqual(identity.registryDigest, expectedRegistryDigest) ||
    !safeEqual(identity.releaseManifestDigest, expectedManifestDigest)
  ) {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  return identity;
}

function canonicalCandidateSource(
  identity: Readonly<ProductionReadinessV2ReleaseIdentity>,
  evidence: readonly ProductionReadinessV2EvidenceEnvelope[],
): string {
  return JSON.stringify({
    environment: identity.environment,
    releaseId: identity.releaseId,
    commitSha: identity.commitSha,
    registryVersion: identity.registryVersion,
    registryDigest: identity.registryDigest,
    releaseManifestDigest: identity.releaseManifestDigest,
    serviceArtifactDigests: {
      "railway-api": identity.serviceArtifactDigests["railway-api"],
      "railway-worker": identity.serviceArtifactDigests["railway-worker"],
      "vercel-web": identity.serviceArtifactDigests["vercel-web"],
    },
    evidence,
  });
}

function candidateDigest(
  identity: Readonly<ProductionReadinessV2ReleaseIdentity>,
  evidence: readonly ProductionReadinessV2EvidenceEnvelope[],
): string {
  return `production_readiness_candidate_v2_${createHash("sha256")
    .update(canonicalCandidateSource(identity, evidence))
    .digest("hex")}`;
}

/**
 * Builds a byte-canonical activation candidate. The digest proves structural
 * integrity only. Issuer authentication and M2M authorization remain separate
 * deployment requirements.
 */
export function createProductionReadinessV2Candidate(
  input: Readonly<ProductionReadinessV2CandidateInput>,
  registry: readonly ProductionReadinessV2Definition[] =
    PRODUCTION_READINESS_REGISTRY_V2,
  clock: Readonly<ProductionReadinessV2CandidateClock> = systemClock,
): Readonly<ProductionReadinessV2Candidate> {
  if (
    !exactRecord(input, inputKeys) ||
    !Array.isArray(input.evidence) ||
    input.evidence.length !== productionReadinessV2CheckIds.length ||
    input.evidence.some((value) => typeof value !== "string") ||
    typeof clock?.now !== "function"
  ) {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  const identity = inspectProductionReadinessV2ReleaseIdentity(
    input.identity,
    registry,
  );
  let evidence: readonly ProductionReadinessV2EvidenceEnvelope[];
  try {
    evidence = Object.freeze(
      input.evidence.map(parseProductionReadinessV2Evidence).sort(
        (left, right) => left.checkId.localeCompare(right.checkId),
      ),
    );
  } catch {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  if (
    evidence.some(
      (envelope, index) =>
        envelope.checkId !== productionReadinessV2CheckIds[index],
    )
  ) {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  const canonicalEvidence = evidence.map((envelope) =>
    JSON.stringify(envelope)
  );
  let report;
  try {
    report = evaluateProductionReadinessV2({
      environment: identity.environment,
      releaseId: identity.releaseId,
      commitSha: identity.commitSha,
      releaseManifestDigest: identity.releaseManifestDigest,
      serviceArtifactDigests: identity.serviceArtifactDigests,
      evidence: canonicalEvidence,
    }, registry, clock);
  } catch {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  if (!report.readyForEnvironment) {
    throw new ProductionReadinessV2CandidateError("not-ready");
  }
  const evidenceSetJson = JSON.stringify(evidence);
  if (Buffer.byteLength(evidenceSetJson, "utf8") > maximumEvidenceSetBytes) {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  const validUntil = evidence.reduce(
    (earliest, envelope) =>
      Date.parse(envelope.expiresAt) < Date.parse(earliest)
        ? envelope.expiresAt
        : earliest,
    evidence[0]!.expiresAt,
  );
  return Object.freeze({
    identity,
    candidateDigest: candidateDigest(identity, evidence),
    evidenceSetJson,
    validUntil,
  });
}

export function inspectProductionReadinessV2Candidate(
  value: unknown,
  registry: readonly ProductionReadinessV2Definition[] =
    PRODUCTION_READINESS_REGISTRY_V2,
  clock: Readonly<ProductionReadinessV2CandidateClock> = systemClock,
): Readonly<ProductionReadinessV2Candidate> {
  if (
    !exactRecord(value, candidateKeys) ||
    typeof value.candidateDigest !== "string" ||
    !candidateDigestPattern.test(value.candidateDigest) ||
    typeof value.evidenceSetJson !== "string" ||
    Buffer.byteLength(value.evidenceSetJson, "utf8") >
      maximumEvidenceSetBytes ||
    !isCanonicalTimestamp(value.validUntil)
  ) {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.evidenceSetJson);
  } catch {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== productionReadinessV2CheckIds.length
  ) {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  const recreated = createProductionReadinessV2Candidate({
    identity: value.identity as ProductionReadinessV2ReleaseIdentity,
    evidence: parsed.map((envelope) => JSON.stringify(envelope)),
  }, registry, clock);
  if (
    !safeEqual(recreated.candidateDigest, value.candidateDigest) ||
    !safeEqual(recreated.evidenceSetJson, value.evidenceSetJson) ||
    !safeEqual(recreated.validUntil, value.validUntil)
  ) {
    throw new ProductionReadinessV2CandidateError("input-invalid");
  }
  return recreated;
}
