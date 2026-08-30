import type {
  MetaCampaignDeliveryRetryEvidenceSource,
} from "../campaigns/metaCampaignDeliveryRetryPolicy.ts";
import {
  createProviderResponseMetaCampaignDeliveryRetryEvidenceSource,
} from "../campaigns/providerResponseMetaCampaignDeliveryRetryEvidenceSource.ts";
import {
  createClerkRailwayTeamInvitationProviderFactory,
} from "./clerkRailwayTeamInvitationProvider.ts";
import {
  inspectPostgresClerkInvitationRateLimitConfiguration,
  type PostgresRateLimitEnvironment,
} from "./postgresMutationRateLimitConfiguration.ts";
import {
  inspectRailwayApiIdentityConfiguration,
  type RailwayApiIdentityEnvironment,
} from "./railwayApiIdentityConfiguration.ts";
import {
  startRailwayBullMqWorkerExecutable,
  type RailwayBullMqWorkerEnvironment,
} from "./railwayBullMqWorkerExecutable.ts";
import {
  createRailwayWorkerOperationalTelemetrySink,
  createRailwayWorkerQueueTelemetry,
  recordRailwayWorkerSignal,
} from "./railwayWorkerTelemetry.ts";
import {
  createRailwayBetterStackTelemetryRuntime,
  inspectRailwayBetterStackTelemetryConfiguration,
  type RailwayBetterStackTelemetryEnvironment,
  type RailwayWorkerTelemetryRuntime,
} from "./railwayBetterStackTelemetry.ts";
import type {
  RailwayWorkerProcessController,
} from "./railwayWorkerProcess.ts";
export type RailwayBullMqWorkerMainEnvironment =
  RailwayBullMqWorkerEnvironment &
    RailwayApiIdentityEnvironment &
    PostgresRateLimitEnvironment &
    RailwayBetterStackTelemetryEnvironment;

interface RailwayBullMqWorkerMainDependencies {
  readonly startWorker: typeof startRailwayBullMqWorkerExecutable;
  readonly readEnvironment: () => RailwayBullMqWorkerMainEnvironment;
  readonly createInvitationProviderFactory:
    typeof createClerkRailwayTeamInvitationProviderFactory;
  readonly retryEvidenceSource: MetaCampaignDeliveryRetryEvidenceSource;
  readonly createTelemetryRuntime:
    typeof createRailwayBetterStackTelemetryRuntime;
}

const defaultDependencies = Object.freeze({
  startWorker: startRailwayBullMqWorkerExecutable,
  readEnvironment() {
    return {
      APP_RUNTIME_ENVIRONMENT: process.env.APP_RUNTIME_ENVIRONMENT,
      APP_RELEASE_ID: process.env.APP_RELEASE_ID,
      APP_DEPLOYED_COMMIT_SHA: process.env.APP_DEPLOYED_COMMIT_SHA,
      APP_DEPLOYMENT_ARTIFACT_DIGEST:
        process.env.APP_DEPLOYMENT_ARTIFACT_DIGEST,
      APP_RELEASE_SHA: process.env.APP_RELEASE_SHA,
      BETTER_STACK_OTLP_LOGS_ENDPOINT:
        process.env.BETTER_STACK_OTLP_LOGS_ENDPOINT,
      BETTER_STACK_SOURCE_TOKEN: process.env.BETTER_STACK_SOURCE_TOKEN,
      BETTER_STACK_STAGING_EVIDENCE_JSON:
        process.env.BETTER_STACK_STAGING_EVIDENCE_JSON,
      DATABASE_URL: process.env.DATABASE_URL,
      POSTGRES_APPLICATION_NAME: process.env.POSTGRES_APPLICATION_NAME,
      POSTGRES_MAX_CONNECTIONS: process.env.POSTGRES_MAX_CONNECTIONS,
      POSTGRES_CONNECTION_TIMEOUT_MS:
        process.env.POSTGRES_CONNECTION_TIMEOUT_MS,
      POSTGRES_IDLE_TIMEOUT_MS: process.env.POSTGRES_IDLE_TIMEOUT_MS,
      POSTGRES_STATEMENT_TIMEOUT_MS:
        process.env.POSTGRES_STATEMENT_TIMEOUT_MS,
      POSTGRES_QUERY_TIMEOUT_MS: process.env.POSTGRES_QUERY_TIMEOUT_MS,
      POSTGRES_LOCK_TIMEOUT_MS: process.env.POSTGRES_LOCK_TIMEOUT_MS,
      POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS:
        process.env.POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS,
      POSTGRES_MAX_LIFETIME_SECONDS:
        process.env.POSTGRES_MAX_LIFETIME_SECONDS,
      POSTGRES_TLS_MODE: process.env.POSTGRES_TLS_MODE,
      POSTGRES_TLS_CA_PEM: process.env.POSTGRES_TLS_CA_PEM,
      REDIS_URL: process.env.REDIS_URL,
      BULLMQ_COMPLETED_RETENTION_SECONDS:
        process.env.BULLMQ_COMPLETED_RETENTION_SECONDS,
      BULLMQ_COMPLETED_RETENTION_COUNT:
        process.env.BULLMQ_COMPLETED_RETENTION_COUNT,
      BULLMQ_FAILED_RETENTION_SECONDS:
        process.env.BULLMQ_FAILED_RETENTION_SECONDS,
      BULLMQ_FAILED_RETENTION_COUNT:
        process.env.BULLMQ_FAILED_RETENTION_COUNT,
      BULLMQ_DLQ_RETENTION_SECONDS:
        process.env.BULLMQ_DLQ_RETENTION_SECONDS,
      BULLMQ_DLQ_CLEAN_BATCH_SIZE:
        process.env.BULLMQ_DLQ_CLEAN_BATCH_SIZE,
      RAILWAY_WORKER_SCHEDULER_OWNER_KEY:
        process.env.RAILWAY_WORKER_SCHEDULER_OWNER_KEY,
      META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
      META_APP_ID: process.env.META_APP_ID,
      META_CREDENTIAL_ENCRYPTION_KEY_V1:
        process.env.META_CREDENTIAL_ENCRYPTION_KEY_V1,
      META_APP_SECRET: process.env.META_APP_SECRET,
      META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN,
      WHATSAPP_RATE_LIMIT_HMAC_KEY_V1:
        process.env.WHATSAPP_RATE_LIMIT_HMAC_KEY_V1,
      APP_PUBLIC_ORIGIN: process.env.APP_PUBLIC_ORIGIN,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      VERCEL_OIDC_TEAM_SLUG: process.env.VERCEL_OIDC_TEAM_SLUG,
      VERCEL_OIDC_PROJECT_NAME: process.env.VERCEL_OIDC_PROJECT_NAME,
      VERCEL_OIDC_ENVIRONMENT: process.env.VERCEL_OIDC_ENVIRONMENT,
      CLERK_INVITATION_RATE_LIMIT_POLICY_VERSION:
        process.env.CLERK_INVITATION_RATE_LIMIT_POLICY_VERSION,
      CLERK_INVITATION_RATE_LIMIT_CAPACITY:
        process.env.CLERK_INVITATION_RATE_LIMIT_CAPACITY,
      CLERK_INVITATION_RATE_LIMIT_REFILL_PERIOD_SECONDS:
        process.env.CLERK_INVITATION_RATE_LIMIT_REFILL_PERIOD_SECONDS,
      NODE_ENV: process.env.NODE_ENV,
    };
  },
  createInvitationProviderFactory:
    createClerkRailwayTeamInvitationProviderFactory,
  retryEvidenceSource:
    createProviderResponseMetaCampaignDeliveryRetryEvidenceSource(),
  createTelemetryRuntime: createRailwayBetterStackTelemetryRuntime,
}) satisfies RailwayBullMqWorkerMainDependencies;

export type RailwayBullMqWorkerMainErrorCode =
  | "dependencies-invalid"
  | "identity-configuration-required"
  | "rate-limit-configuration-required"
  | "telemetry-configuration-required"
  | "startup-failed";

export class RailwayBullMqWorkerMainError extends Error {
  readonly code: RailwayBullMqWorkerMainErrorCode;

  constructor(code: RailwayBullMqWorkerMainErrorCode) {
    super(`Railway BullMQ worker main failed: ${code}`);
    this.name = "RailwayBullMqWorkerMainError";
    this.code = code;
  }
}

function requireDependencies(
  dependencies: Readonly<RailwayBullMqWorkerMainDependencies>,
): void {
  let valid = false;
  try {
    valid =
      Boolean(dependencies) &&
      typeof dependencies === "object" &&
      Object.keys(dependencies).sort().join(",") ===
        "createInvitationProviderFactory,createTelemetryRuntime,readEnvironment,retryEvidenceSource,startWorker" &&
      typeof dependencies.startWorker === "function" &&
      typeof dependencies.readEnvironment === "function" &&
      typeof dependencies.createInvitationProviderFactory === "function" &&
      typeof dependencies.retryEvidenceSource?.isConfigured === "function" &&
      typeof dependencies.retryEvidenceSource?.load === "function" &&
      dependencies.retryEvidenceSource.isConfigured() === true &&
      typeof dependencies.createTelemetryRuntime === "function";
  } catch {
    valid = false;
  }

  if (!valid) {
    throw new RailwayBullMqWorkerMainError("dependencies-invalid");
  }
}

function withTelemetryLifecycle(
  controller: Readonly<RailwayWorkerProcessController>,
  telemetryRuntime: Readonly<RailwayWorkerTelemetryRuntime>,
): Readonly<RailwayWorkerProcessController> {
  let closing: Promise<void> | null = null;
  return Object.freeze({
    start: () => controller.start(),
    async close() {
      if (closing === null) {
        closing = (async () => {
          try {
            await controller.close();
          } finally {
            await telemetryRuntime.forceFlush();
            await telemetryRuntime.shutdown();
          }
        })();
      }
      await closing;
    },
  });
}

export async function startRailwayBullMqWorkerMain(
  dependencies: Readonly<RailwayBullMqWorkerMainDependencies> =
    defaultDependencies,
) {
  requireDependencies(dependencies);

  let environment: RailwayBullMqWorkerMainEnvironment;
  try {
    const candidate = dependencies.readEnvironment();
    if (!candidate || typeof candidate !== "object") {
      throw new Error("environment-invalid");
    }
    environment = candidate;
  } catch {
    throw new RailwayBullMqWorkerMainError("startup-failed");
  }

  let identity: ReturnType<typeof inspectRailwayApiIdentityConfiguration>;
  let rateLimit: ReturnType<
    typeof inspectPostgresClerkInvitationRateLimitConfiguration
  >;
  try {
    identity = inspectRailwayApiIdentityConfiguration(environment);
    rateLimit =
      inspectPostgresClerkInvitationRateLimitConfiguration(environment);
  } catch {
    throw new RailwayBullMqWorkerMainError("startup-failed");
  }

  if (identity.status !== "configured") {
    throw new RailwayBullMqWorkerMainError(
      "identity-configuration-required",
    );
  }

  if (rateLimit.status !== "configured") {
    throw new RailwayBullMqWorkerMainError(
      "rate-limit-configuration-required",
    );
  }

  const telemetryConfiguration =
    inspectRailwayBetterStackTelemetryConfiguration(environment);
  if (
    telemetryConfiguration.status === "configuration-required" ||
    telemetryConfiguration.status === "invalid"
  ) {
    throw new RailwayBullMqWorkerMainError(
      "telemetry-configuration-required",
    );
  }

  let telemetryRuntime: Readonly<RailwayWorkerTelemetryRuntime>;
  try {
    telemetryRuntime = dependencies.createTelemetryRuntime(
      telemetryConfiguration,
    );
  } catch {
    throw new RailwayBullMqWorkerMainError("startup-failed");
  }
  const logger = telemetryRuntime.logger;
  const telemetrySink = createRailwayWorkerOperationalTelemetrySink(logger);

  try {
    const createProvider = dependencies.createInvitationProviderFactory(
      identity.configuration,
      rateLimit.policy,
    );

    const controller = await dependencies.startWorker({
      environment,
      telemetry: Object.freeze({
        recordPostgresIdleClientError() {
          recordRailwayWorkerSignal(logger, "postgres-idle-client-failure");
        },
        recordSchedulerRunFailure() {
          recordRailwayWorkerSignal(logger, "scheduler-run-failure");
        },
        recordSchedulerTimerFailure() {
          recordRailwayWorkerSignal(logger, "scheduler-timer-failure");
        },
        recordSchedulerOverlapSuppressed() {
          recordRailwayWorkerSignal(logger, "scheduler-overlap-suppressed");
        },
      }),
      campaignDeliveries: Object.freeze({
        retryEvidenceSource: dependencies.retryEvidenceSource,
        telemetrySink,
        queueTelemetry: createRailwayWorkerQueueTelemetry(
          logger,
          "campaign-delivery",
        ),
      }),
      messageTemplateSubmissions: Object.freeze({
        telemetrySink,
        queueTelemetry: createRailwayWorkerQueueTelemetry(
          logger,
          "message-template-submission",
        ),
      }),
      metaWebhooks: Object.freeze({
        telemetrySink,
        queueTelemetry: createRailwayWorkerQueueTelemetry(
          logger,
          "meta-webhook",
        ),
      }),
      teamInvitations: Object.freeze({
        createProvider,
        telemetrySink,
        queueTelemetry: createRailwayWorkerQueueTelemetry(
          logger,
          "team-invitation",
        ),
      }),
    });
    return withTelemetryLifecycle(controller, telemetryRuntime);
  } catch {
    await telemetryRuntime.shutdown();
    throw new RailwayBullMqWorkerMainError("startup-failed");
  }
}
