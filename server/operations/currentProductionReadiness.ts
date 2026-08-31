import hostingConfiguration from "../../.openai/hosting.json";
import type {
  ProductionReadinessReport,
} from "../../shared/domain/productionReadiness.ts";
import {
  inspectCurrentProductionReadiness,
  type ProductionHostingBindings,
} from "./productionReadiness.ts";
import {
  createCurrentRailwayBotReplyStagingReleaseEvidenceReadHandler,
} from "./currentRailwayBotReplyStagingReleaseEvidenceReadHandler.ts";
import {
  resolveCurrentBotReplyStagingCrossServiceEvidenceJson,
  type CurrentProductionReadinessDependencies,
  type CurrentProductionReadinessEnvironment,
} from "./currentProductionReadinessEvidenceSource.ts";
import {
  readCurrentRailwayProductionReadinessV2,
} from "../platform/currentRailwayProductionReadinessV2.ts";
import type {
  CurrentProductionReadinessV2State,
} from "./currentProductionReadinessV2Source.ts";

const currentDependencies = Object.freeze({
  async readReleaseEvidence() {
    return createCurrentRailwayBotReplyStagingReleaseEvidenceReadHandler()
      .read();
  },
}) satisfies CurrentProductionReadinessDependencies;

export async function readProductionReadinessFromCurrentSources(
  environment: Readonly<CurrentProductionReadinessEnvironment>,
  hosting: Readonly<ProductionHostingBindings>,
  dependencies: Readonly<CurrentProductionReadinessDependencies>,
): Promise<ProductionReadinessReport> {
  const evidenceJson =
    await resolveCurrentBotReplyStagingCrossServiceEvidenceJson(
      environment,
      dependencies,
    );

  return inspectCurrentProductionReadiness(
    {
      ...environment,
      BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON: evidenceJson,
    },
    hosting,
  );
}

export async function readCurrentProductionReadiness():
  Promise<ProductionReadinessReport> {
  return readProductionReadinessFromCurrentSources(
    process.env as CurrentProductionReadinessEnvironment,
    {
      d1: hostingConfiguration.d1,
      r2: hostingConfiguration.r2,
    },
    currentDependencies,
  );
}

export interface CurrentProductionReadinessSnapshot {
  readonly registryV1: Readonly<ProductionReadinessReport>;
  readonly activeRegistryV2: Readonly<CurrentProductionReadinessV2State>;
}

/**
 * V2 is additive until its rollout policy is explicitly approved. Existing
 * V1 consumers remain on readCurrentProductionReadiness and cannot be
 * silently switched by merely configuring the PostgreSQL evidence source.
 */
export async function readCurrentProductionReadinessSnapshot(): Promise<
  Readonly<CurrentProductionReadinessSnapshot>
> {
  const [registryV1, activeRegistryV2] = await Promise.all([
    readCurrentProductionReadiness(),
    readCurrentRailwayProductionReadinessV2(),
  ]);
  return Object.freeze({ registryV1, activeRegistryV2 });
}
