import hostingConfiguration from "../../.openai/hosting.json";
import type {
  ProductionReadinessReport,
} from "../../shared/domain/productionReadiness.ts";
import {
  inspectCurrentProductionReadiness,
  type ProductionReadinessEnvironment,
} from "./productionReadiness.ts";
import {
  readCurrentRailwayProductionReadinessV2,
} from "../platform/currentRailwayProductionReadinessV2.ts";
import type {
  CurrentProductionReadinessV2State,
} from "./currentProductionReadinessV2Source.ts";

export function readCurrentProductionReadiness():
  ProductionReadinessReport {
  return inspectCurrentProductionReadiness(
    process.env as ProductionReadinessEnvironment,
    {
      d1: hostingConfiguration.d1,
      r2: hostingConfiguration.r2,
    },
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
