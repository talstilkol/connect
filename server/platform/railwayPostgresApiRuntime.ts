import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import type {
  NodePostgresPoolEnvironment,
  NodePostgresPoolTelemetry,
} from "./nodePostgresPoolConfiguration.ts";
import type {
  PostgresReadinessProbe,
} from "./postgresReadinessProbe.ts";
import {
  createRailwayApiRuntime,
} from "./railwayApiRuntime.ts";
import type {
  RailwayApiIdentityAdapterDependencies,
} from "./railwayApiIdentityAdapters.ts";
import type {
  RailwayApiIdentityEnvironment,
} from "./railwayApiIdentityConfiguration.ts";
import type {
  RailwayApiHttpHandler,
} from "./railwayApiHttpHandler.ts";
import {
  createRailwayPostgresFoundation,
} from "./railwayPostgresFoundation.ts";

export interface RailwayPostgresApiRuntimeOptions {
  readonly identityEnvironment?: RailwayApiIdentityEnvironment;
  readonly postgresEnvironment?: NodePostgresPoolEnvironment;
  readonly identityDependencies?: Readonly<
    RailwayApiIdentityAdapterDependencies
  >;
  readonly postgresTelemetry: NodePostgresPoolTelemetry;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly maximumBodyBytes?: number;
  readonly maximumResponseBytes?: number;
}

export interface RailwayPostgresApiRuntime {
  readonly handler: RailwayApiHttpHandler;
  readonly readiness: Readonly<PostgresReadinessProbe>;
  readonly close: () => Promise<void>;
}

const optionKeys = Object.freeze([
  "identityDependencies",
  "identityEnvironment",
  "maximumBodyBytes",
  "maximumResponseBytes",
  "mutationRateLimit",
  "postgresEnvironment",
  "postgresTelemetry",
]);

function requireOptions(
  options: Readonly<RailwayPostgresApiRuntimeOptions>,
): void {
  if (!options || typeof options !== "object") {
    throw new Error("Railway PostgreSQL API runtime options are invalid");
  }

  const keys = Object.keys(options).sort();

  if (
    keys.some((key) => !optionKeys.includes(key)) ||
    typeof options.postgresTelemetry?.recordIdleClientError !== "function" ||
    typeof options.mutationRateLimit?.consume !== "function"
  ) {
    throw new Error("Railway PostgreSQL API runtime options are invalid");
  }
}

/**
 * Owns the PostgreSQL pool and exposes only the authenticated API handler plus
 * one idempotent shutdown boundary. Identity and database configuration remain
 * separate so credentials cannot be forwarded to the wrong adapter.
 */
export async function createRailwayPostgresApiRuntime(
  options: Readonly<RailwayPostgresApiRuntimeOptions>,
): Promise<Readonly<RailwayPostgresApiRuntime>> {
  requireOptions(options);
  const foundation = createRailwayPostgresFoundation({
    environment: options.postgresEnvironment,
    telemetry: options.postgresTelemetry,
  });

  try {
    const handler = createRailwayApiRuntime({
      environment: options.identityEnvironment,
      identityDependencies: options.identityDependencies,
      memberships: foundation.memberships,
      selections: foundation.selections,
      contacts: foundation.contacts,
      reports: foundation.reports,
      mutationRateLimit: options.mutationRateLimit,
      mutations: foundation.railwayApiMutations,
      maximumBodyBytes: options.maximumBodyBytes,
      maximumResponseBytes: options.maximumResponseBytes,
    });

    return Object.freeze({
      handler,
      readiness: foundation.readiness,
      close: foundation.close,
    });
  } catch (error) {
    await foundation.close();
    throw error;
  }
}
