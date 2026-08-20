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
import type {
  MetaWebhookHttpHandler,
} from "../meta/metaWebhookHttpHandler.ts";
import type {
  MetaWebhookQueuePort,
} from "../meta/metaWebhookQueuePort.ts";
import {
  createRailwayMetaWebhookRuntime,
  type RailwayMetaWebhookRuntimeEnvironment,
} from "./railwayMetaWebhookRuntime.ts";
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
  readonly metaWebhook?: Readonly<{
    environment: RailwayMetaWebhookRuntimeEnvironment;
    queue: MetaWebhookQueuePort;
    maximumBodyBytes?: number;
  }>;
  readonly maximumBodyBytes?: number;
  readonly maximumResponseBytes?: number;
}

export interface RailwayPostgresApiRuntime {
  readonly handler: RailwayApiHttpHandler;
  readonly metaWebhookHandler: MetaWebhookHttpHandler | null;
  readonly readiness: Readonly<PostgresReadinessProbe>;
  readonly close: () => Promise<void>;
}

const optionKeys = Object.freeze([
  "identityDependencies",
  "identityEnvironment",
  "maximumBodyBytes",
  "maximumResponseBytes",
  "metaWebhook",
  "mutationRateLimitEnvironment",
  "postgresEnvironment",
  "postgresTelemetry",
]);

function validMetaWebhookOptions(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(candidate);

  return (
    keys.every((key) =>
      ["environment", "maximumBodyBytes", "queue"].includes(key),
    ) &&
    typeof candidate.environment === "object" &&
    candidate.environment !== null &&
    typeof candidate.queue === "object" &&
    candidate.queue !== null &&
    "publish" in candidate.queue &&
    typeof candidate.queue.publish === "function"
  );
}

function requireOptions(
  options: Readonly<RailwayPostgresApiRuntimeOptions>,
): void {
  if (!options || typeof options !== "object") {
    throw new Error("Railway PostgreSQL API runtime options are invalid");
  }

  const keys = Object.keys(options).sort();

  if (
    keys.some((key) => !optionKeys.includes(key)) ||
    !validMetaWebhookOptions(options.metaWebhook) ||
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
    ...(options.postgresEnvironment === undefined
      ? {}
      : { environment: options.postgresEnvironment }),
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
    const metaWebhookHandler = options.metaWebhook === undefined
      ? null
      : createRailwayMetaWebhookRuntime({
          environment: options.metaWebhook.environment,
          connections: foundation.metaWebhooks,
          queue: options.metaWebhook.queue,
          createRateLimitBinding:
            foundation.createMutationRateLimitBinding,
          ...(options.metaWebhook.maximumBodyBytes === undefined
            ? {}
            : {
                maximumBodyBytes:
                  options.metaWebhook.maximumBodyBytes,
              }),
        });

    return Object.freeze({
      handler,
      metaWebhookHandler,
      readiness: foundation.readiness,
      close: foundation.close,
    });
  } catch (error) {
    await foundation.close();
    throw error;
  }
}
