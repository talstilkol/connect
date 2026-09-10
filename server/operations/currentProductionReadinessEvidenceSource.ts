import type {
  ProductionReadinessEnvironment,
} from "./productionReadiness.ts";
import {
  inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration,
  type RailwayBotReplyStagingReleaseEvidenceStorageEnvironment,
} from "../platform/railwayBotReplyStagingReleaseEvidenceStorageConfiguration.ts";
import type {
  RailwayBotReplyStagingReleaseEvidenceReadState,
} from "./railwayBotReplyStagingReleaseEvidenceReadHandler.ts";

export interface CurrentProductionReadinessDependencies {
  readonly readReleaseEvidence: () => Promise<
    RailwayBotReplyStagingReleaseEvidenceReadState
  >;
}

export type CurrentProductionReadinessEnvironment =
  ProductionReadinessEnvironment &
    RailwayBotReplyStagingReleaseEvidenceStorageEnvironment;

function requireDependencies(
  dependencies: Readonly<CurrentProductionReadinessDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "readReleaseEvidence" ||
    typeof dependencies.readReleaseEvidence !== "function"
  ) {
    throw new Error("Current production readiness dependencies are invalid");
  }
}

export async function resolveCurrentBotReplyStagingCrossServiceEvidenceJson(
  environment: Readonly<CurrentProductionReadinessEnvironment>,
  dependencies: Readonly<CurrentProductionReadinessDependencies>,
): Promise<string | undefined> {
  requireDependencies(dependencies);
  const storage =
    inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration(
      environment,
    );

  if (storage.status !== "configured") {
    return undefined;
  }

  let repositoryEvidence:
    RailwayBotReplyStagingReleaseEvidenceReadState | null = null;
  try {
    repositoryEvidence = await dependencies.readReleaseEvidence();
  } catch {
    repositoryEvidence = null;
  }

  return repositoryEvidence?.status === "ready"
    ? repositoryEvidence.evidenceJson
    : undefined;
}
