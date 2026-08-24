export const PRODUCTION_READINESS_V2_SCHEMA_VERSION = 2 as const;
export const PRODUCTION_READINESS_V2_REGISTRY_VERSION = 2 as const;

export const productionReadinessV2CheckIds = Object.freeze([
  "queue.redis-bullmq",
  "runtime.railway-api",
  "runtime.railway-worker",
  "runtime.vercel-web",
  "storage.object",
  "storage.postgresql",
] as const);

export type ProductionReadinessV2CheckId =
  typeof productionReadinessV2CheckIds[number];

export type ProductionReadinessV2Category =
  | "queue"
  | "runtime"
  | "storage";

export type ProductionReadinessV2Criticality =
  "production-blocking";

export type ProductionReadinessV2DecisionId = "D14" | null;

export const productionReadinessV2Owners = Object.freeze([
  "backend-deployment",
  "backend-operations",
  "frontend-deployment",
  "security-operations",
] as const);

export type ProductionReadinessV2Owner =
  typeof productionReadinessV2Owners[number];

export const productionReadinessV2Issuers = Object.freeze([
  "railway-api",
  "railway-worker",
  "vercel-web",
] as const);

export type ProductionReadinessV2Issuer =
  typeof productionReadinessV2Issuers[number];

export const productionReadinessV2EvidenceKinds = Object.freeze([
  "object-canary-integrity",
  "object-provider-policy",
  "postgres-connectivity",
  "postgres-schema",
  "railway-api-release",
  "railway-worker-heartbeat",
  "redis-connectivity",
  "redis-durability",
  "vercel-deployment-provenance",
  "vercel-railway-auth",
] as const);

export type ProductionReadinessV2EvidenceKind =
  typeof productionReadinessV2EvidenceKinds[number];

export type ProductionReadinessV2Status =
  | "ready"
  | "blocked"
  | "decision-required"
  | "unavailable"
  | "stale";

export interface ProductionReadinessV2Codes {
  readonly ready: string;
  readonly blocked: string;
  readonly decisionRequired: string;
  readonly unavailable: string;
  readonly stale: string;
}

export interface ProductionReadinessV2Definition {
  readonly id: ProductionReadinessV2CheckId;
  readonly category: ProductionReadinessV2Category;
  readonly criticality: ProductionReadinessV2Criticality;
  readonly owner: ProductionReadinessV2Owner;
  readonly decisionId: ProductionReadinessV2DecisionId;
  readonly dependencies: readonly ProductionReadinessV2CheckId[];
  readonly requiredEvidence: readonly ProductionReadinessV2EvidenceKind[];
  readonly allowedIssuer: readonly ProductionReadinessV2Issuer[];
  readonly maximumAgeSeconds: number;
  readonly releaseBound: boolean;
  readonly codes: Readonly<ProductionReadinessV2Codes>;
}

export interface ProductionReadinessV2EvidenceEnvelope {
  readonly schemaVersion: typeof PRODUCTION_READINESS_V2_SCHEMA_VERSION;
  readonly registryVersion:
    typeof PRODUCTION_READINESS_V2_REGISTRY_VERSION;
  readonly registryDigest: string;
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
  readonly evidenceDigest: string;
}

export interface ProductionReadinessV2EvidenceSummary {
  readonly issuer: ProductionReadinessV2Issuer;
  readonly evidenceDigest: string;
  readonly observedAt: string;
  readonly expiresAt: string;
}

export interface ProductionReadinessV2Check {
  readonly id: ProductionReadinessV2CheckId;
  readonly category: ProductionReadinessV2Category;
  readonly criticality: ProductionReadinessV2Criticality;
  readonly owner: ProductionReadinessV2Owner;
  readonly decisionId: ProductionReadinessV2DecisionId;
  readonly status: ProductionReadinessV2Status;
  readonly code: string;
  readonly evidence: ProductionReadinessV2EvidenceSummary | null;
}

export interface ProductionReadinessV2Counts {
  readonly ready: number;
  readonly blocked: number;
  readonly decisionRequired: number;
  readonly unavailable: number;
  readonly stale: number;
}

export interface ProductionReadinessV2Report {
  readonly schemaVersion: typeof PRODUCTION_READINESS_V2_SCHEMA_VERSION;
  readonly registryVersion:
    typeof PRODUCTION_READINESS_V2_REGISTRY_VERSION;
  readonly registryDigest: string;
  readonly environment: string;
  readonly releaseId: string;
  readonly releaseManifestDigest: string;
  readonly readyForEnvironment: boolean;
  readonly readyForProduction: boolean;
  readonly checks: readonly ProductionReadinessV2Check[];
  readonly counts: Readonly<ProductionReadinessV2Counts>;
}
