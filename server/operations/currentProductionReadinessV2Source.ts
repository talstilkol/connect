import type {
  ProductionReadinessV2Report,
} from "../../shared/domain/productionReadinessV2.ts";
import {
  deriveProductionReadinessRegistryV2Digest,
  deriveProductionReadinessV2ReleaseManifestDigest,
  type ProductionReadinessV2ReleaseManifestInput,
} from "./productionReadinessV2.ts";
import {
  inspectProductionReadinessV2ReleaseIdentity,
  type ProductionReadinessV2ReleaseIdentity,
} from "./productionReadinessV2Candidate.ts";
import type {
  ProductionReadinessV2ActiveReportResult,
} from "./productionReadinessV2Activation.ts";

export const currentProductionReadinessV2SourceVersion =
  "connect-current-production-readiness-v2-source-v1" as const;

const configuredSource = "postgresql" as const;

export interface CurrentProductionReadinessV2Environment {
  readonly PRODUCTION_READINESS_V2_SOURCE?: string;
  readonly APP_RUNTIME_ENVIRONMENT?: string;
  readonly APP_RELEASE_ID?: string;
  readonly APP_DEPLOYED_COMMIT_SHA?: string;
  readonly PRODUCTION_READINESS_V2_RAILWAY_API_ARTIFACT_DIGEST?: string;
  readonly PRODUCTION_READINESS_V2_RAILWAY_WORKER_ARTIFACT_DIGEST?: string;
  readonly PRODUCTION_READINESS_V2_VERCEL_WEB_ARTIFACT_DIGEST?: string;
}

export type CurrentProductionReadinessV2ConfigurationState = Readonly<
  | {
      status: "disabled" | "invalid";
      source: null;
      identity: null;
    }
  | {
      status: "configured";
      source: typeof configuredSource;
      identity: Readonly<ProductionReadinessV2ReleaseIdentity>;
    }
>;

export type CurrentProductionReadinessV2State = Readonly<
  | {
      schemaVersion: 2;
      sourceVersion: typeof currentProductionReadinessV2SourceVersion;
      status: "blocked";
      code:
        | "PRODUCTION_READINESS_V2_SOURCE_REQUIRED"
        | "PRODUCTION_READINESS_V2_SOURCE_INVALID";
      source: null;
      sourceStatus: "disabled" | "invalid";
      activeVersion: null;
      candidateDigest: null;
      report: null;
    }
  | {
      schemaVersion: 2;
      sourceVersion: typeof currentProductionReadinessV2SourceVersion;
      status: "blocked";
      code: "PRODUCTION_READINESS_V2_ACTIVE_EVIDENCE_REQUIRED";
      source: typeof configuredSource;
      sourceStatus: "configured";
      activeVersion: null;
      candidateDigest: null;
      report: null;
    }
  | {
      schemaVersion: 2;
      sourceVersion: typeof currentProductionReadinessV2SourceVersion;
      status: "active";
      code: "PRODUCTION_READINESS_V2_ACTIVE_EVIDENCE_VERIFIED";
      source: typeof configuredSource;
      sourceStatus: "configured";
      activeVersion: number;
      candidateDigest: string;
      report: Readonly<ProductionReadinessV2Report>;
    }
>;

export interface CurrentProductionReadinessV2Dependencies {
  readonly readActive: (
    identity: Readonly<ProductionReadinessV2ReleaseIdentity>,
  ) => Promise<
    | ProductionReadinessV2ActiveReportResult
    | Readonly<{ status: "source-invalid" }>
  >;
}

function unavailableConfiguration(
  status: "disabled" | "invalid",
): CurrentProductionReadinessV2ConfigurationState {
  return Object.freeze({
    status,
    source: null,
    identity: null,
  });
}

export function inspectCurrentProductionReadinessV2Configuration(
  environment: Readonly<CurrentProductionReadinessV2Environment>,
): CurrentProductionReadinessV2ConfigurationState {
  const source = environment?.PRODUCTION_READINESS_V2_SOURCE;
  if (source === undefined || source === "") {
    return unavailableConfiguration("disabled");
  }
  if (source !== configuredSource) {
    return unavailableConfiguration("invalid");
  }

  const railwayApiArtifactDigest =
    environment.PRODUCTION_READINESS_V2_RAILWAY_API_ARTIFACT_DIGEST;
  const railwayWorkerArtifactDigest =
    environment.PRODUCTION_READINESS_V2_RAILWAY_WORKER_ARTIFACT_DIGEST;
  const vercelWebArtifactDigest =
    environment.PRODUCTION_READINESS_V2_VERCEL_WEB_ARTIFACT_DIGEST;
  if (
    typeof environment.APP_RUNTIME_ENVIRONMENT !== "string" ||
    typeof environment.APP_RELEASE_ID !== "string" ||
    typeof environment.APP_DEPLOYED_COMMIT_SHA !== "string" ||
    typeof railwayApiArtifactDigest !== "string" ||
    typeof railwayWorkerArtifactDigest !== "string" ||
    typeof vercelWebArtifactDigest !== "string"
  ) {
    return unavailableConfiguration("invalid");
  }
  const release: ProductionReadinessV2ReleaseManifestInput = {
    environment: environment.APP_RUNTIME_ENVIRONMENT,
    releaseId: environment.APP_RELEASE_ID,
    commitSha: environment.APP_DEPLOYED_COMMIT_SHA,
    serviceArtifactDigests: {
      "railway-api": railwayApiArtifactDigest,
      "railway-worker": railwayWorkerArtifactDigest,
      "vercel-web": vercelWebArtifactDigest,
    },
  };

  try {
    const identity = inspectProductionReadinessV2ReleaseIdentity({
      ...release,
      registryVersion: 2,
      registryDigest: deriveProductionReadinessRegistryV2Digest(),
      releaseManifestDigest:
        deriveProductionReadinessV2ReleaseManifestDigest(release),
    });
    return Object.freeze({
      status: "configured" as const,
      source: configuredSource,
      identity,
    });
  } catch {
    return unavailableConfiguration("invalid");
  }
}

function requireDependencies(
  dependencies: Readonly<CurrentProductionReadinessV2Dependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "readActive" ||
    typeof dependencies.readActive !== "function"
  ) {
    throw new Error(
      "Current production readiness v2 dependencies are invalid",
    );
  }
}

function blockedSource(
  status: "disabled" | "invalid",
): CurrentProductionReadinessV2State {
  return Object.freeze({
    schemaVersion: 2 as const,
    sourceVersion: currentProductionReadinessV2SourceVersion,
    status: "blocked" as const,
    code: status === "disabled"
      ? "PRODUCTION_READINESS_V2_SOURCE_REQUIRED" as const
      : "PRODUCTION_READINESS_V2_SOURCE_INVALID" as const,
    source: null,
    sourceStatus: status,
    activeVersion: null,
    candidateDigest: null,
    report: null,
  });
}

function activeEvidenceRequired(): CurrentProductionReadinessV2State {
  return Object.freeze({
    schemaVersion: 2 as const,
    sourceVersion: currentProductionReadinessV2SourceVersion,
    status: "blocked" as const,
    code: "PRODUCTION_READINESS_V2_ACTIVE_EVIDENCE_REQUIRED" as const,
    source: configuredSource,
    sourceStatus: "configured" as const,
    activeVersion: null,
    candidateDigest: null,
    report: null,
  });
}

export async function readProductionReadinessV2FromCurrentSource(
  environment: Readonly<CurrentProductionReadinessV2Environment>,
  dependencies: Readonly<CurrentProductionReadinessV2Dependencies>,
): Promise<CurrentProductionReadinessV2State> {
  requireDependencies(dependencies);
  const configuration =
    inspectCurrentProductionReadinessV2Configuration(environment);
  if (configuration.status !== "configured") {
    return blockedSource(configuration.status);
  }

  let active:
    | ProductionReadinessV2ActiveReportResult
    | Readonly<{ status: "source-invalid" }>;
  try {
    active = await dependencies.readActive(configuration.identity);
  } catch {
    return activeEvidenceRequired();
  }
  if (active.status === "source-invalid") {
    return blockedSource("invalid");
  }
  if (active.status !== "available") {
    return activeEvidenceRequired();
  }

  const report = active.report;
  if (
    report.environment !== configuration.identity.environment ||
    report.releaseId !== configuration.identity.releaseId ||
    report.registryDigest !== configuration.identity.registryDigest ||
    report.releaseManifestDigest !==
      configuration.identity.releaseManifestDigest ||
    report.schemaVersion !== 2 ||
    report.registryVersion !== 2 ||
    report.readyForEnvironment !== true ||
    !Number.isSafeInteger(active.activeVersion) ||
    active.activeVersion < 1 ||
    !/^production_readiness_candidate_v2_[a-f0-9]{64}$/.test(
      active.candidateDigest,
    )
  ) {
    return activeEvidenceRequired();
  }

  return Object.freeze({
    schemaVersion: 2 as const,
    sourceVersion: currentProductionReadinessV2SourceVersion,
    status: "active" as const,
    code: "PRODUCTION_READINESS_V2_ACTIVE_EVIDENCE_VERIFIED" as const,
    source: configuredSource,
    sourceStatus: "configured" as const,
    activeVersion: active.activeVersion,
    candidateDigest: active.candidateDigest,
    report,
  });
}
