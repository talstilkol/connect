import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../../shared/domain/productionReadinessRegistryV2.ts";
import type {
  ProductionReadinessV2Report,
} from "../../shared/domain/productionReadinessV2.ts";
import type {
  PostgresProductionReadinessV2EvidenceRepository,
  ProductionReadinessV2ActiveReadResult,
} from "../platform/postgresProductionReadinessV2EvidenceRepository.ts";
import {
  createProductionReadinessV2Candidate,
  ProductionReadinessV2CandidateError,
  type ProductionReadinessV2Candidate,
  type ProductionReadinessV2CandidateInput,
} from "./productionReadinessV2Candidate.ts";
import {
  evaluateProductionReadinessV2,
} from "./productionReadinessV2.ts";

export const productionReadinessV2ActivationVersion =
  "connect-production-readiness-v2-activation-v1" as const;

interface ProductionReadinessV2ActivationClock {
  readonly now: () => Date;
}

export type ProductionReadinessV2ActivationAudit =
  | "verified"
  | "superseded"
  | "unavailable"
  | "mismatch";

export type ProductionReadinessV2ActivationResult = Readonly<
  | {
      schemaVersion: 2;
      activationVersion: typeof productionReadinessV2ActivationVersion;
      status: "activated";
      code:
        | "PRODUCTION_READINESS_V2_ACTIVATED"
        | "PRODUCTION_READINESS_V2_ALREADY_ACTIVE"
        | "PRODUCTION_READINESS_V2_ACTIVATION_RECONCILED";
      activeVersion: number;
      candidateDigest: string;
      replayed: boolean;
      audit: ProductionReadinessV2ActivationAudit;
    }
  | {
      schemaVersion: 2;
      activationVersion: typeof productionReadinessV2ActivationVersion;
      status: "blocked";
      code:
        | "PRODUCTION_READINESS_V2_NOT_READY"
        | "PRODUCTION_READINESS_V2_ACTIVATION_CONFLICT";
      activeVersion: null;
      candidateDigest: null;
      replayed: false;
      audit: null;
    }
  | {
      schemaVersion: 2;
      activationVersion: typeof productionReadinessV2ActivationVersion;
      status: "ambiguous";
      code: "PRODUCTION_READINESS_V2_ACTIVATION_OUTCOME_UNKNOWN";
      activeVersion: null;
      candidateDigest: string;
      replayed: false;
      audit: ProductionReadinessV2ActivationAudit;
    }
  | {
      schemaVersion: 2;
      activationVersion: typeof productionReadinessV2ActivationVersion;
      status: "unavailable";
      code: "PRODUCTION_READINESS_V2_DEPENDENCY_UNAVAILABLE";
      activeVersion: null;
      candidateDigest: string;
      replayed: false;
      audit: null;
    }
>;

export type ProductionReadinessV2ActiveReportResult = Readonly<
  | {
      status: "available";
      activeVersion: number;
      candidateDigest: string;
      report: Readonly<ProductionReadinessV2Report>;
    }
  | {
      status: "unavailable";
      activeVersion: null;
      candidateDigest: null;
      report: null;
    }
>;

export type ProductionReadinessV2ActivationErrorCode =
  | "input-invalid"
  | "dependencies-invalid";

export class ProductionReadinessV2ActivationError extends Error {
  readonly code: ProductionReadinessV2ActivationErrorCode;

  constructor(code: ProductionReadinessV2ActivationErrorCode) {
    super(`Production readiness v2 activation failed: ${code}`);
    this.name = "ProductionReadinessV2ActivationError";
    this.code = code;
  }
}

const systemClock = Object.freeze({
  now() {
    return new Date();
  },
});

function requireDependencies(
  repository: PostgresProductionReadinessV2EvidenceRepository,
  clock: Readonly<ProductionReadinessV2ActivationClock>,
) {
  if (
    typeof repository !== "object" || repository === null ||
    typeof repository.initializeRelease !== "function" ||
    typeof repository.stageCandidate !== "function" ||
    typeof repository.confirmCandidate !== "function" ||
    typeof repository.readActive !== "function" ||
    typeof clock?.now !== "function"
  ) {
    throw new ProductionReadinessV2ActivationError(
      "dependencies-invalid",
    );
  }
}

function blocked(
  code: Extract<
    ProductionReadinessV2ActivationResult,
    { status: "blocked" }
  >["code"],
): ProductionReadinessV2ActivationResult {
  return Object.freeze({
    schemaVersion: 2 as const,
    activationVersion: productionReadinessV2ActivationVersion,
    status: "blocked" as const,
    code,
    activeVersion: null,
    candidateDigest: null,
    replayed: false as const,
    audit: null,
  });
}

function unavailable(
  candidateDigest: string,
): ProductionReadinessV2ActivationResult {
  return Object.freeze({
    schemaVersion: 2 as const,
    activationVersion: productionReadinessV2ActivationVersion,
    status: "unavailable" as const,
    code: "PRODUCTION_READINESS_V2_DEPENDENCY_UNAVAILABLE" as const,
    activeVersion: null,
    candidateDigest,
    replayed: false as const,
    audit: null,
  });
}

function activated(
  code: Extract<
    ProductionReadinessV2ActivationResult,
    { status: "activated" }
  >["code"],
  activeVersion: number,
  candidateDigest: string,
  replayed: boolean,
  audit: ProductionReadinessV2ActivationAudit,
): ProductionReadinessV2ActivationResult {
  return Object.freeze({
    schemaVersion: 2 as const,
    activationVersion: productionReadinessV2ActivationVersion,
    status: "activated" as const,
    code,
    activeVersion,
    candidateDigest,
    replayed,
    audit,
  });
}

async function auditActivation(
  repository: PostgresProductionReadinessV2EvidenceRepository,
  activeVersion: number,
  candidateDigest: string,
): Promise<ProductionReadinessV2ActivationAudit> {
  let active: ProductionReadinessV2ActiveReadResult;
  try {
    active = await repository.readActive();
  } catch {
    return "unavailable";
  }
  if (active.status !== "available") return "unavailable";
  if (
    active.activeVersion === activeVersion &&
    active.candidate.candidateDigest === candidateDigest
  ) {
    return "verified";
  }
  if (active.activeVersion > activeVersion) return "superseded";
  return "mismatch";
}

/**
 * Candidate verification happens before the head CAS. A post-CAS read is
 * audit only: it can never turn a committed activation into a false failure.
 */
async function activateProductionReadinessV2Canonical(
  input: Readonly<ProductionReadinessV2CandidateInput>,
  repository: PostgresProductionReadinessV2EvidenceRepository,
  clock: Readonly<ProductionReadinessV2ActivationClock>,
): Promise<ProductionReadinessV2ActivationResult> {
  requireDependencies(repository, clock);
  let candidate: Readonly<ProductionReadinessV2Candidate>;
  try {
    candidate = createProductionReadinessV2Candidate(input, clock);
  } catch (error) {
    if (
      error instanceof ProductionReadinessV2CandidateError &&
      error.code === "not-ready"
    ) {
      return blocked("PRODUCTION_READINESS_V2_NOT_READY");
    }
    throw new ProductionReadinessV2ActivationError("input-invalid");
  }

  let head;
  try {
    head = await repository.initializeRelease();
    await repository.stageCandidate(candidate);
  } catch {
    return unavailable(candidate.candidateDigest);
  }

  if (head.activeCandidateDigest === candidate.candidateDigest) {
    return activated(
      "PRODUCTION_READINESS_V2_ALREADY_ACTIVE",
      head.activeVersion,
      candidate.candidateDigest,
      true,
      await auditActivation(
        repository,
        head.activeVersion,
        candidate.candidateDigest,
      ),
    );
  }

  let confirmation;
  try {
    confirmation = await repository.confirmCandidate({
      expectedActiveVersion: head.activeVersion,
      expectedActiveCandidateDigest: head.activeCandidateDigest,
      candidateDigest: candidate.candidateDigest,
    });
  } catch {
    const expectedVersion = head.activeVersion + 1;
    const audit = await auditActivation(
      repository,
      expectedVersion,
      candidate.candidateDigest,
    );
    if (audit === "verified") {
      return activated(
        "PRODUCTION_READINESS_V2_ACTIVATION_RECONCILED",
        expectedVersion,
        candidate.candidateDigest,
        false,
        audit,
      );
    }
    return Object.freeze({
      schemaVersion: 2 as const,
      activationVersion: productionReadinessV2ActivationVersion,
      status: "ambiguous" as const,
      code: "PRODUCTION_READINESS_V2_ACTIVATION_OUTCOME_UNKNOWN" as const,
      activeVersion: null,
      candidateDigest: candidate.candidateDigest,
      replayed: false as const,
      audit,
    });
  }

  if (confirmation.status !== "activated") {
    return blocked("PRODUCTION_READINESS_V2_ACTIVATION_CONFLICT");
  }
  return activated(
    "PRODUCTION_READINESS_V2_ACTIVATED",
    confirmation.activeVersion,
    candidate.candidateDigest,
    false,
    await auditActivation(
      repository,
      confirmation.activeVersion,
      candidate.candidateDigest,
    ),
  );
}

export function activateProductionReadinessV2(
  input: Readonly<ProductionReadinessV2CandidateInput>,
  repository: PostgresProductionReadinessV2EvidenceRepository,
  clock: Readonly<ProductionReadinessV2ActivationClock> = systemClock,
): Promise<ProductionReadinessV2ActivationResult> {
  return activateProductionReadinessV2Canonical(
    input,
    repository,
    clock,
  );
}

async function readActiveProductionReadinessV2ReportCanonical(
  repository: PostgresProductionReadinessV2EvidenceRepository,
  clock: Readonly<ProductionReadinessV2ActivationClock>,
): Promise<ProductionReadinessV2ActiveReportResult> {
  requireDependencies(repository, clock);
  let active: ProductionReadinessV2ActiveReadResult;
  try {
    active = await repository.readActive();
  } catch {
    return Object.freeze({
      status: "unavailable" as const,
      activeVersion: null,
      candidateDigest: null,
      report: null,
    });
  }
  if (active.status !== "available") {
    return Object.freeze({
      status: "unavailable" as const,
      activeVersion: null,
      candidateDigest: null,
      report: null,
    });
  }
  try {
    const evidence = JSON.parse(active.candidate.evidenceSetJson);
    if (!Array.isArray(evidence)) throw new Error("invalid evidence set");
    const identity = active.candidate.identity;
    const report = evaluateProductionReadinessV2({
      environment: identity.environment,
      releaseId: identity.releaseId,
      commitSha: identity.commitSha,
      releaseManifestDigest: identity.releaseManifestDigest,
      serviceArtifactDigests: identity.serviceArtifactDigests,
      evidence: evidence.map((envelope) => JSON.stringify(envelope)),
    }, PRODUCTION_READINESS_REGISTRY_V2, clock);
    if (!report.readyForEnvironment) throw new Error("report is not ready");
    return Object.freeze({
      status: "available" as const,
      activeVersion: active.activeVersion,
      candidateDigest: active.candidate.candidateDigest,
      report,
    });
  } catch {
    return Object.freeze({
      status: "unavailable" as const,
      activeVersion: null,
      candidateDigest: null,
      report: null,
    });
  }
}

export function readActiveProductionReadinessV2Report(
  repository: PostgresProductionReadinessV2EvidenceRepository,
  clock: Readonly<ProductionReadinessV2ActivationClock> = systemClock,
): Promise<ProductionReadinessV2ActiveReportResult> {
  return readActiveProductionReadinessV2ReportCanonical(
    repository,
    clock,
  );
}
