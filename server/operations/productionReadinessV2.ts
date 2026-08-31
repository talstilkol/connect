import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../../shared/domain/productionReadinessRegistryV2.ts";
import {
  PRODUCTION_READINESS_V2_REGISTRY_VERSION,
  PRODUCTION_READINESS_V2_SCHEMA_VERSION,
  productionReadinessV2CheckIds,
  productionReadinessV2EvidenceKinds,
  productionReadinessV2Issuers,
  productionReadinessV2Owners,
  type ProductionReadinessV2Check,
  type ProductionReadinessV2CheckId,
  type ProductionReadinessV2Counts,
  type ProductionReadinessV2Definition,
  type ProductionReadinessV2EvidenceEnvelope,
  type ProductionReadinessV2EvidenceKind,
  type ProductionReadinessV2Issuer,
  type ProductionReadinessV2Report,
  type ProductionReadinessV2Status,
} from "../../shared/domain/productionReadinessV2.ts";

const maximumEvidenceBytes = 8_192;
const registryDigestPattern =
  /^production_readiness_registry_v2_[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^production_readiness_evidence_v2_[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const sha256Pattern = /^sha256:[a-f0-9]{64}$/;
const environmentPattern =
  /^(?:development|preview|production|staging)$/;
const resultCodePattern = /^[A-Z][A-Z0-9_]+$/;

const definitionKeys = Object.freeze([
  "allowedIssuer",
  "category",
  "codes",
  "criticality",
  "decisionId",
  "dependencies",
  "id",
  "maximumAgeSeconds",
  "owner",
  "releaseBound",
  "requiredEvidence",
]);
const codeKeys = Object.freeze([
  "blocked",
  "decisionRequired",
  "ready",
  "stale",
  "unavailable",
]);
const unsignedEvidenceKeys = Object.freeze([
  "artifactDigest",
  "checkId",
  "commitSha",
  "environment",
  "evidence",
  "expiresAt",
  "issuer",
  "observedAt",
  "outcome",
  "registryDigest",
  "registryVersion",
  "releaseId",
  "releaseManifestDigest",
  "schemaVersion",
]);
const evidenceKeys = Object.freeze([
  ...unsignedEvidenceKeys,
  "evidenceDigest",
].sort());
const evaluationInputKeys = Object.freeze([
  "commitSha",
  "environment",
  "evidence",
  "releaseId",
  "releaseManifestDigest",
  "serviceArtifactDigests",
]);
const releaseManifestInputKeys = Object.freeze([
  "commitSha",
  "environment",
  "releaseId",
  "serviceArtifactDigests",
]);

export type ProductionReadinessV2ContractErrorCode =
  | "registry-invalid"
  | "evidence-invalid"
  | "evaluation-invalid";

export class ProductionReadinessV2ContractError extends Error {
  readonly code: ProductionReadinessV2ContractErrorCode;

  constructor(code: ProductionReadinessV2ContractErrorCode) {
    super(`Production readiness v2 contract failed: ${code}`);
    this.name = "ProductionReadinessV2ContractError";
    this.code = code;
  }
}

export interface ProductionReadinessV2EvidenceInput {
  readonly checkId: ProductionReadinessV2CheckId;
  readonly environment: string;
  readonly issuer: ProductionReadinessV2Issuer;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly releaseManifestDigest: string;
  readonly observedAt: string;
  readonly expiresAt: string;
  readonly outcome: "passed" | "failed";
  readonly evidence: readonly ProductionReadinessV2EvidenceKind[];
}

export interface ProductionReadinessV2EvaluationInput {
  readonly environment: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly releaseManifestDigest: string;
  readonly serviceArtifactDigests: Readonly<
    Record<ProductionReadinessV2Issuer, string>
  >;
  readonly evidence: readonly string[];
}

export interface ProductionReadinessV2ReleaseManifestInput {
  readonly environment: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly serviceArtifactDigests: Readonly<
    Record<ProductionReadinessV2Issuer, string>
  >;
}

interface ProductionReadinessV2Clock {
  readonly now: () => Date;
}

type UnsignedEvidence = Omit<
  ProductionReadinessV2EvidenceEnvelope,
  "evidenceDigest"
>;

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
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every(
      (key, index) => key === sortedExpectedKeys[index],
    );
}

function hasExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
): boolean {
  return exactRecord(value, expectedKeys);
}

function isSortedUnique(values: readonly string[]): boolean {
  return values.every(
    (value, index) => index === 0 || values[index - 1]! < value,
  );
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function digest(prefix: string, value: string): string {
  return `${prefix}${createHash("sha256").update(value).digest("hex")}`;
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.byteLength === rightBytes.byteLength &&
    timingSafeEqual(leftBytes, rightBytes);
}

function canonicalRegistry(
  registry: readonly ProductionReadinessV2Definition[],
): string {
  return JSON.stringify(
    registry.map((definition) => ({
      id: definition.id,
      category: definition.category,
      criticality: definition.criticality,
      owner: definition.owner,
      decisionId: definition.decisionId,
      dependencies: [...definition.dependencies],
      requiredEvidence: [...definition.requiredEvidence],
      allowedIssuer: [...definition.allowedIssuer],
      maximumAgeSeconds: definition.maximumAgeSeconds,
      releaseBound: definition.releaseBound,
      codes: {
        ready: definition.codes.ready,
        blocked: definition.codes.blocked,
        decisionRequired: definition.codes.decisionRequired,
        unavailable: definition.codes.unavailable,
        stale: definition.codes.stale,
      },
    })),
  );
}

function hasDependencyCycle(
  registry: readonly ProductionReadinessV2Definition[],
): boolean {
  const definitions = new Map(
    registry.map((definition) => [definition.id, definition]),
  );
  const complete = new Set<ProductionReadinessV2CheckId>();
  const active = new Set<ProductionReadinessV2CheckId>();

  function visit(id: ProductionReadinessV2CheckId): boolean {
    if (active.has(id)) return true;
    if (complete.has(id)) return false;
    active.add(id);
    const definition = definitions.get(id);
    if (
      !definition ||
      definition.dependencies.some((dependency) => visit(dependency))
    ) {
      return true;
    }
    active.delete(id);
    complete.add(id);
    return false;
  }

  return registry.some((definition) => visit(definition.id));
}

export function requireProductionReadinessRegistryV2(
  registry: readonly ProductionReadinessV2Definition[],
): void {
  const ids = new Set(productionReadinessV2CheckIds);
  const evidenceKinds = new Set(productionReadinessV2EvidenceKinds);
  const issuers = new Set(productionReadinessV2Issuers);
  if (
    !Array.isArray(registry) ||
    registry.length !== productionReadinessV2CheckIds.length ||
    registry.some((definition) =>
      !hasExactKeys(definition, definitionKeys) ||
      typeof definition.id !== "string" ||
      !ids.has(definition.id as ProductionReadinessV2CheckId) ||
      !["queue", "runtime", "storage"].includes(
        String(definition.category),
      ) ||
      definition.criticality !== "production-blocking" ||
      typeof definition.owner !== "string" ||
      !productionReadinessV2Owners.includes(definition.owner) ||
      !(definition.decisionId === null || definition.decisionId === "D14") ||
      !Array.isArray(definition.dependencies) ||
      !isSortedUnique(definition.dependencies) ||
      definition.dependencies.some(
        (dependency: ProductionReadinessV2CheckId) =>
          !ids.has(dependency) || dependency === definition.id,
      ) ||
      !Array.isArray(definition.requiredEvidence) ||
      definition.requiredEvidence.length < 1 ||
      !isSortedUnique(definition.requiredEvidence) ||
      definition.requiredEvidence.some(
        (kind: ProductionReadinessV2EvidenceKind) =>
          !evidenceKinds.has(kind),
      ) ||
      !Array.isArray(definition.allowedIssuer) ||
      definition.allowedIssuer.length < 1 ||
      !isSortedUnique(definition.allowedIssuer) ||
      definition.allowedIssuer.some(
        (issuer: ProductionReadinessV2Issuer) => !issuers.has(issuer),
      ) ||
      !Number.isSafeInteger(definition.maximumAgeSeconds) ||
      definition.maximumAgeSeconds < 30 ||
      definition.maximumAgeSeconds > 3_600 ||
      definition.releaseBound !== true ||
      !hasExactKeys(definition.codes, codeKeys) ||
      Object.values(definition.codes).some(
        (code) => typeof code !== "string" || !resultCodePattern.test(code),
      )
    ) ||
    !isSortedUnique(registry.map((definition) => definition.id)) ||
    new Set(registry.map((definition) => definition.id)).size !==
      productionReadinessV2CheckIds.length ||
    registry.some(
      (definition) =>
        definition.id !== "storage.object" && definition.decisionId !== null,
    ) ||
    hasDependencyCycle(registry)
  ) {
    throw new ProductionReadinessV2ContractError("registry-invalid");
  }
}

export function deriveProductionReadinessRegistryV2Digest(
  registry: readonly ProductionReadinessV2Definition[] =
    PRODUCTION_READINESS_REGISTRY_V2,
): string {
  requireProductionReadinessRegistryV2(registry);
  return digest(
    "production_readiness_registry_v2_",
    canonicalRegistry(registry),
  );
}

export const PRODUCTION_READINESS_REGISTRY_V2_DIGEST =
  deriveProductionReadinessRegistryV2Digest();

export function deriveProductionReadinessV2ReleaseManifestDigest(
  input: Readonly<ProductionReadinessV2ReleaseManifestInput>,
): string {
  if (
    !hasExactKeys(input, releaseManifestInputKeys) ||
    typeof input.environment !== "string" ||
    !environmentPattern.test(input.environment) ||
    typeof input.releaseId !== "string" ||
    !releaseIdPattern.test(input.releaseId) ||
    typeof input.commitSha !== "string" ||
    !commitShaPattern.test(input.commitSha) ||
    !exactRecord(input.serviceArtifactDigests, productionReadinessV2Issuers) ||
    productionReadinessV2Issuers.some(
      (issuer) =>
        typeof input.serviceArtifactDigests[issuer] !== "string" ||
        !sha256Pattern.test(input.serviceArtifactDigests[issuer]),
    )
  ) {
    throw new ProductionReadinessV2ContractError("evaluation-invalid");
  }
  return `sha256:${createHash("sha256").update(JSON.stringify({
    schemaVersion: PRODUCTION_READINESS_V2_SCHEMA_VERSION,
    environment: input.environment,
    releaseId: input.releaseId,
    commitSha: input.commitSha,
    serviceArtifactDigests: {
      "railway-api": input.serviceArtifactDigests["railway-api"],
      "railway-worker": input.serviceArtifactDigests["railway-worker"],
      "vercel-web": input.serviceArtifactDigests["vercel-web"],
    },
  })).digest("hex")}`;
}

function requireUnsignedEvidence(value: unknown): asserts value is UnsignedEvidence {
  if (
    !exactRecord(value, unsignedEvidenceKeys) ||
    value.schemaVersion !== PRODUCTION_READINESS_V2_SCHEMA_VERSION ||
    value.registryVersion !== PRODUCTION_READINESS_V2_REGISTRY_VERSION ||
    typeof value.registryDigest !== "string" ||
    !registryDigestPattern.test(value.registryDigest) ||
    typeof value.checkId !== "string" ||
    !productionReadinessV2CheckIds.includes(
      value.checkId as ProductionReadinessV2CheckId,
    ) ||
    typeof value.environment !== "string" ||
    !environmentPattern.test(value.environment) ||
    typeof value.issuer !== "string" ||
    !productionReadinessV2Issuers.includes(
      value.issuer as ProductionReadinessV2Issuer,
    ) ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !sha256Pattern.test(value.artifactDigest) ||
    typeof value.releaseManifestDigest !== "string" ||
    !sha256Pattern.test(value.releaseManifestDigest) ||
    !isCanonicalTimestamp(value.observedAt) ||
    !isCanonicalTimestamp(value.expiresAt) ||
    Date.parse(value.expiresAt) <= Date.parse(value.observedAt) ||
    !(value.outcome === "passed" || value.outcome === "failed") ||
    !Array.isArray(value.evidence) ||
    value.evidence.length < 1 ||
    !value.evidence.every(
      (kind): kind is ProductionReadinessV2EvidenceKind =>
        typeof kind === "string" &&
        productionReadinessV2EvidenceKinds.includes(
          kind as ProductionReadinessV2EvidenceKind,
        ),
    ) ||
    !isSortedUnique(value.evidence)
  ) {
    throw new ProductionReadinessV2ContractError("evidence-invalid");
  }
}

function canonicalEvidence(value: UnsignedEvidence): string {
  return JSON.stringify({
    schemaVersion: value.schemaVersion,
    registryVersion: value.registryVersion,
    registryDigest: value.registryDigest,
    checkId: value.checkId,
    environment: value.environment,
    issuer: value.issuer,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    artifactDigest: value.artifactDigest,
    releaseManifestDigest: value.releaseManifestDigest,
    observedAt: value.observedAt,
    expiresAt: value.expiresAt,
    outcome: value.outcome,
    evidence: [...value.evidence],
  });
}

export function deriveProductionReadinessV2EvidenceDigest(
  value: UnsignedEvidence,
): string {
  requireUnsignedEvidence(value);
  return digest(
    "production_readiness_evidence_v2_",
    canonicalEvidence(value),
  );
}

/**
 * Builds a structurally valid, deterministic envelope. The digest protects
 * canonical contract integrity only; it is not a signature and proves no
 * issuer authenticity. A later phase must bind creation to authenticated
 * runtime probes and candidate-to-confirmed persistence.
 */
export function createProductionReadinessV2Evidence(
  input: Readonly<ProductionReadinessV2EvidenceInput>,
  registry: readonly ProductionReadinessV2Definition[] =
    PRODUCTION_READINESS_REGISTRY_V2,
): Readonly<ProductionReadinessV2EvidenceEnvelope> {
  requireProductionReadinessRegistryV2(registry);
  const inputKeys = unsignedEvidenceKeys.filter(
    (key) => ![
      "registryDigest",
      "registryVersion",
      "schemaVersion",
    ].includes(key),
  );
  if (!exactRecord(input, inputKeys)) {
    throw new ProductionReadinessV2ContractError("evidence-invalid");
  }
  const unsigned = {
    schemaVersion: PRODUCTION_READINESS_V2_SCHEMA_VERSION,
    registryVersion: PRODUCTION_READINESS_V2_REGISTRY_VERSION,
    registryDigest: deriveProductionReadinessRegistryV2Digest(registry),
    checkId: input.checkId,
    environment: input.environment,
    issuer: input.issuer,
    releaseId: input.releaseId,
    commitSha: input.commitSha,
    artifactDigest: input.artifactDigest,
    releaseManifestDigest: input.releaseManifestDigest,
    observedAt: input.observedAt,
    expiresAt: input.expiresAt,
    outcome: input.outcome,
    evidence: Object.freeze([...input.evidence]),
  } satisfies UnsignedEvidence;
  requireUnsignedEvidence(unsigned);
  const result = Object.freeze({
    ...unsigned,
    evidenceDigest: deriveProductionReadinessV2EvidenceDigest(unsigned),
  });
  if (
    Buffer.byteLength(JSON.stringify(result), "utf8") > maximumEvidenceBytes
  ) {
    throw new ProductionReadinessV2ContractError("evidence-invalid");
  }
  return result;
}

/** Parses shape and digest only; transport identity is outside Phase 1. */
export function parseProductionReadinessV2Evidence(
  rawValue: string,
): Readonly<ProductionReadinessV2EvidenceEnvelope> {
  if (
    typeof rawValue !== "string" ||
    Buffer.byteLength(rawValue, "utf8") > maximumEvidenceBytes
  ) {
    throw new ProductionReadinessV2ContractError("evidence-invalid");
  }
  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    throw new ProductionReadinessV2ContractError("evidence-invalid");
  }
  if (
    !exactRecord(value, evidenceKeys) ||
    typeof value.evidenceDigest !== "string" ||
    !evidenceDigestPattern.test(value.evidenceDigest)
  ) {
    throw new ProductionReadinessV2ContractError("evidence-invalid");
  }
  const {
    evidenceDigest,
    ...unsigned
  } = value;
  requireUnsignedEvidence(unsigned);
  if (
    !safeEqual(
      evidenceDigest,
      deriveProductionReadinessV2EvidenceDigest(unsigned),
    )
  ) {
    throw new ProductionReadinessV2ContractError("evidence-invalid");
  }
  return Object.freeze({
    ...unsigned,
    evidence: Object.freeze([...unsigned.evidence]),
    evidenceDigest,
  });
}

function requireEvaluationInput(
  input: Readonly<ProductionReadinessV2EvaluationInput>,
  clock: Readonly<ProductionReadinessV2Clock>,
): Date {
  if (
    !exactRecord(input, evaluationInputKeys) ||
    typeof input.environment !== "string" ||
    !environmentPattern.test(input.environment) ||
    typeof input.releaseId !== "string" ||
    !releaseIdPattern.test(input.releaseId) ||
    typeof input.commitSha !== "string" ||
    !commitShaPattern.test(input.commitSha) ||
    typeof input.releaseManifestDigest !== "string" ||
    !sha256Pattern.test(input.releaseManifestDigest) ||
    !exactRecord(input.serviceArtifactDigests, productionReadinessV2Issuers) ||
    productionReadinessV2Issuers.some(
      (issuer) =>
        typeof input.serviceArtifactDigests[issuer] !== "string" ||
        !sha256Pattern.test(input.serviceArtifactDigests[issuer]),
    ) ||
    !Array.isArray(input.evidence) ||
    input.evidence.length > productionReadinessV2CheckIds.length ||
    input.evidence.some((value) => typeof value !== "string") ||
    typeof clock?.now !== "function"
  ) {
    throw new ProductionReadinessV2ContractError("evaluation-invalid");
  }
  const expectedManifestDigest =
    deriveProductionReadinessV2ReleaseManifestDigest({
      environment: input.environment,
      releaseId: input.releaseId,
      commitSha: input.commitSha,
      serviceArtifactDigests: input.serviceArtifactDigests,
    });
  if (!safeEqual(input.releaseManifestDigest, expectedManifestDigest)) {
    throw new ProductionReadinessV2ContractError("evaluation-invalid");
  }
  const now = clock.now();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new ProductionReadinessV2ContractError("evaluation-invalid");
  }
  return now;
}

function sameValues(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function statusCode(
  definition: Readonly<ProductionReadinessV2Definition>,
  status: ProductionReadinessV2Status,
): string {
  if (status === "decision-required") {
    return definition.codes.decisionRequired;
  }
  return definition.codes[status];
}

function countChecks(
  checks: readonly ProductionReadinessV2Check[],
): Readonly<ProductionReadinessV2Counts> {
  return Object.freeze({
    ready: checks.filter((check) => check.status === "ready").length,
    blocked: checks.filter((check) => check.status === "blocked").length,
    decisionRequired: checks.filter(
      (check) => check.status === "decision-required",
    ).length,
    unavailable: checks.filter(
      (check) => check.status === "unavailable",
    ).length,
    stale: checks.filter((check) => check.status === "stale").length,
  });
}

export function evaluateProductionReadinessV2(
  input: Readonly<ProductionReadinessV2EvaluationInput>,
  registry: readonly ProductionReadinessV2Definition[] =
    PRODUCTION_READINESS_REGISTRY_V2,
  clock: Readonly<ProductionReadinessV2Clock> = systemClock,
): Readonly<ProductionReadinessV2Report> {
  requireProductionReadinessRegistryV2(registry);
  const now = requireEvaluationInput(input, clock);
  const registryDigest = deriveProductionReadinessRegistryV2Digest(registry);
  const definitions = new Map(
    registry.map((definition) => [definition.id, definition]),
  );
  const evidenceByCheckId = new Map<
    ProductionReadinessV2CheckId,
    Readonly<ProductionReadinessV2EvidenceEnvelope>
  >();

  for (const rawEvidence of input.evidence) {
    const evidence = parseProductionReadinessV2Evidence(rawEvidence);
    const definition = definitions.get(evidence.checkId);
    if (
      !definition ||
      evidenceByCheckId.has(evidence.checkId) ||
      evidence.registryVersion !== PRODUCTION_READINESS_V2_REGISTRY_VERSION ||
      !safeEqual(evidence.registryDigest, registryDigest) ||
      evidence.environment !== input.environment ||
      evidence.releaseId !== input.releaseId ||
      evidence.commitSha !== input.commitSha ||
      evidence.releaseManifestDigest !== input.releaseManifestDigest ||
      !definition.allowedIssuer.includes(evidence.issuer) ||
      evidence.artifactDigest !==
        input.serviceArtifactDigests[evidence.issuer] ||
      Date.parse(evidence.observedAt) > now.getTime() ||
      Date.parse(evidence.expiresAt) - Date.parse(evidence.observedAt) >
        definition.maximumAgeSeconds * 1_000
    ) {
      throw new ProductionReadinessV2ContractError("evidence-invalid");
    }
    evidenceByCheckId.set(evidence.checkId, evidence);
  }

  const provisional = new Map<
    ProductionReadinessV2CheckId,
    ProductionReadinessV2Status
  >();
  for (const definition of registry) {
    const evidence = evidenceByCheckId.get(definition.id);
    let status: ProductionReadinessV2Status;
    if (definition.decisionId !== null) {
      status = "decision-required";
    } else if (!evidence) {
      status = "unavailable";
    } else if (Date.parse(evidence.expiresAt) <= now.getTime()) {
      status = "stale";
    } else if (
      evidence.outcome !== "passed" ||
      !sameValues(evidence.evidence, definition.requiredEvidence)
    ) {
      status = "blocked";
    } else {
      status = "ready";
    }
    provisional.set(definition.id, status);
  }

  const resolved = new Map<
    ProductionReadinessV2CheckId,
    ProductionReadinessV2Status
  >();
  function resolveStatus(
    id: ProductionReadinessV2CheckId,
  ): ProductionReadinessV2Status {
    const existing = resolved.get(id);
    if (existing) return existing;
    const definition = definitions.get(id)!;
    const ownStatus = provisional.get(id)!;
    const status = ownStatus === "ready" &&
        definition.dependencies.some(
          (dependency) => resolveStatus(dependency) !== "ready",
        )
      ? "blocked"
      : ownStatus;
    resolved.set(id, status);
    return status;
  }

  const checks = Object.freeze(
    registry.map((definition) => {
      const evidence = evidenceByCheckId.get(definition.id);
      const status = resolveStatus(definition.id);
      return Object.freeze({
        id: definition.id,
        category: definition.category,
        criticality: definition.criticality,
        owner: definition.owner,
        decisionId: definition.decisionId,
        status,
        code: statusCode(definition, status),
        evidence: evidence
          ? Object.freeze({
              issuer: evidence.issuer,
              evidenceDigest: evidence.evidenceDigest,
              observedAt: evidence.observedAt,
              expiresAt: evidence.expiresAt,
            })
          : null,
      });
    }),
  );
  const counts = countChecks(checks);
  const readyForEnvironment = checks.every(
    (check) => check.status === "ready",
  );

  return Object.freeze({
    schemaVersion: PRODUCTION_READINESS_V2_SCHEMA_VERSION,
    registryVersion: PRODUCTION_READINESS_V2_REGISTRY_VERSION,
    registryDigest,
    environment: input.environment,
    releaseId: input.releaseId,
    releaseManifestDigest: input.releaseManifestDigest,
    readyForEnvironment,
    readyForProduction:
      input.environment === "production" && readyForEnvironment,
    checks,
    counts,
  });
}
