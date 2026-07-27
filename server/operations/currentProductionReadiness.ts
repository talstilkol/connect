import hostingConfiguration from "../../.openai/hosting.json";
import type {
  ProductionReadinessReport,
} from "../../shared/domain/productionReadiness.ts";
import {
  inspectCurrentProductionReadiness,
  type ProductionReadinessEnvironment,
} from "./productionReadiness.ts";

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
