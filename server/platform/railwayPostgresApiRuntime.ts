import {
  createRateLimitGuard,
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
import {
  inspectPostgresTenantMutationRateLimitConfiguration,
  type PostgresTenantMutationRateLimitEnvironment,
} from "./postgresMutationRateLimitConfiguration.ts";

export interface RailwayPostgresApiRuntimeOptions {
  readonly identityEnvironment?: RailwayApiIdentityEnvironment;
  readonly postgresEnvironment?: NodePostgresPoolEnvironment;
  readonly identityDependencies?: Readonly<
    RailwayApiIdentityAdapterDependencies
  >;
  readonly postgresTelemetry: NodePostgresPoolTelemetry;
  readonly mutationRateLimitEnvironment?:
    PostgresTenantMutationRateLimitEnvironment;
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
  "mutationRateLimitEnvironment",
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
    typeof options.postgresTelemetry?.recordIdleClientError !== "function"
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
  const mutationRateLimitConfiguration =
    inspectPostgresTenantMutationRateLimitConfiguration(
      options.mutationRateLimitEnvironment,
    );

  if (mutationRateLimitConfiguration.status !== "configured") {
    throw new Error(
      "Railway PostgreSQL mutation rate-limit configuration is unavailable",
    );
  }

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
      mutationRateLimit: createRateLimitGuard(
        foundation.createMutationRateLimitBinding(
          mutationRateLimitConfiguration.policy,
        ),
        "tenant-mutation",
      ),
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
