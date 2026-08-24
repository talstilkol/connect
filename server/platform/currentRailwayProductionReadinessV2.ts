import {
  readActiveProductionReadinessV2Report,
  type ProductionReadinessV2ActiveReportResult,
} from "../operations/productionReadinessV2Activation.ts";
import {
  readProductionReadinessV2FromCurrentSource,
  type CurrentProductionReadinessV2Environment,
  type CurrentProductionReadinessV2State,
} from "../operations/currentProductionReadinessV2Source.ts";
import type {
  ProductionReadinessV2ReleaseIdentity,
} from "../operations/productionReadinessV2Candidate.ts";
import {
  createNodePostgresTransactionManager,
} from "./nodePostgresAdapter.ts";
import {
  createNodePostgresPool,
  inspectNodePostgresPoolConfiguration,
  type NodePostgresPoolEnvironment,
} from "./nodePostgresPoolConfiguration.ts";
import {
  createPostgresProductionReadinessV2EvidenceRepository,
} from "./postgresProductionReadinessV2EvidenceRepository.ts";

export type CurrentRailwayProductionReadinessV2Environment =
  CurrentProductionReadinessV2Environment & NodePostgresPoolEnvironment;

const unavailableActive = Object.freeze({
  status: "unavailable" as const,
  activeVersion: null,
  candidateDigest: null,
  report: null,
});
const invalidSource = Object.freeze({
  status: "source-invalid" as const,
});

async function readActiveFromRailwayPostgres(
  environment: Readonly<CurrentRailwayProductionReadinessV2Environment>,
  identity: Readonly<ProductionReadinessV2ReleaseIdentity>,
): Promise<
  ProductionReadinessV2ActiveReportResult | typeof invalidSource
> {
  const configuration = inspectNodePostgresPoolConfiguration(environment);
  if (configuration.status !== "configured") {
    return invalidSource;
  }

  let pool;
  try {
    pool = createNodePostgresPool(configuration.configuration, {
      recordIdleClientError() {
        // The readiness result remains fail-closed; no environment or
        // connection details are emitted from this bounded source.
      },
    });
  } catch {
    return unavailableActive;
  }

  let result: ProductionReadinessV2ActiveReportResult = unavailableActive;
  try {
    const transactions = createNodePostgresTransactionManager(pool);
    const repository =
      createPostgresProductionReadinessV2EvidenceRepository(
        transactions,
        identity,
      );
    result = await readActiveProductionReadinessV2Report(repository);
  } catch {
    result = unavailableActive;
  }

  try {
    await pool.end();
  } catch {
    return unavailableActive;
  }
  return result;
}

export function readCurrentRailwayProductionReadinessV2(
  environment: Readonly<CurrentRailwayProductionReadinessV2Environment> =
    process.env as CurrentRailwayProductionReadinessV2Environment,
): Promise<CurrentProductionReadinessV2State> {
  return readProductionReadinessV2FromCurrentSource(environment, {
    readActive: (identity) =>
      readActiveFromRailwayPostgres(environment, identity),
  });
}
