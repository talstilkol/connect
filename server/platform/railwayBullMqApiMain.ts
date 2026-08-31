import {
  startRailwayApiExecutable,
  type RailwayApiMainDependencies,
} from "./railwayApiMain.ts";
import {
  createRailwayBullMqPostgresApiRuntime,
} from "./railwayBullMqPostgresApiRuntime.ts";
import {
  railwayBullMqEnvironmentKeys,
  type RailwayBullMqEnvironment,
} from "./railwayBullMqConfiguration.ts";
import {
  createRailwayNodeProcess,
  type RailwayNodeProcessEnvironment,
} from "./railwayNodeProcess.ts";
import type {
  RailwayMetaWebhookRuntimeEnvironment,
} from "./railwayMetaWebhookRuntime.ts";
import {
  createRailwayBetterStackApiTelemetryRuntime,
  inspectRailwayBetterStackTelemetryConfiguration,
  type RailwayApiSignalLogEvent,
  type RailwayApiTelemetryRuntime,
  type RailwayBetterStackTelemetryEnvironment,
} from "./railwayBetterStackTelemetry.ts";
import type {
  RailwayNodeProcessController,
} from "./railwayNodeProcess.ts";
import {
  inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration,
} from "./railwayBotReplyStagingReleaseEvidenceStorageConfiguration.ts";
import type {
  RailwayBotReplyStagingReleaseEvidenceRuntimeEnvironment,
} from "./railwayPostgresApiRuntime.ts";

interface RailwayBullMqApiMainDependencies {
  readonly startApi: typeof startRailwayApiExecutable;
  readonly createRuntime: typeof createRailwayBullMqPostgresApiRuntime;
  readonly createProcess: RailwayApiMainDependencies["createProcess"];
  readonly readNodeEnvironment: () => RailwayNodeProcessEnvironment;
  readonly readBullMqEnvironment: () => RailwayBullMqEnvironment;
  readonly readMetaWebhookEnvironment:
    () => RailwayMetaWebhookRuntimeEnvironment;
  readonly readTelemetryEnvironment:
    () => RailwayBetterStackTelemetryEnvironment;
  readonly readReleaseEvidenceEnvironment:
    () => RailwayBotReplyStagingReleaseEvidenceRuntimeEnvironment;
  readonly createTelemetryRuntime:
    typeof createRailwayBetterStackApiTelemetryRuntime;
}

const defaultDependencies = Object.freeze({
  startApi: startRailwayApiExecutable,
  createRuntime: createRailwayBullMqPostgresApiRuntime,
  createProcess: createRailwayNodeProcess,
  readNodeEnvironment() {
    return { PORT: process.env.PORT };
  },
  readBullMqEnvironment() {
    return Object.fromEntries(
      railwayBullMqEnvironmentKeys.map((key) => [key, process.env[key]]),
    ) as RailwayBullMqEnvironment;
  },
  readMetaWebhookEnvironment() {
    return {
      META_APP_SECRET: process.env.META_APP_SECRET,
      META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN,
      META_WEBHOOK_RATE_LIMIT_POLICY_VERSION:
        process.env.META_WEBHOOK_RATE_LIMIT_POLICY_VERSION,
      META_WEBHOOK_RATE_LIMIT_CAPACITY:
        process.env.META_WEBHOOK_RATE_LIMIT_CAPACITY,
      META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS:
        process.env.META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS,
    };
  },
  readTelemetryEnvironment() {
    return {
      APP_RUNTIME_ENVIRONMENT: process.env.APP_RUNTIME_ENVIRONMENT,
      APP_RELEASE_SHA: process.env.APP_RELEASE_SHA,
      BETTER_STACK_OTLP_LOGS_ENDPOINT:
        process.env.BETTER_STACK_OTLP_LOGS_ENDPOINT,
      BETTER_STACK_SOURCE_TOKEN: process.env.BETTER_STACK_SOURCE_TOKEN,
    };
  },
  readReleaseEvidenceEnvironment() {
    return {
      APP_RELEASE_ID: process.env.APP_RELEASE_ID,
      APP_DEPLOYED_COMMIT_SHA:
        process.env.APP_DEPLOYED_COMMIT_SHA,
      APP_DEPLOYMENT_ARTIFACT_DIGEST:
        process.env.APP_DEPLOYMENT_ARTIFACT_DIGEST,
      BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE:
        process.env.BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE,
    };
  },
  createTelemetryRuntime: createRailwayBetterStackApiTelemetryRuntime,
}) satisfies RailwayBullMqApiMainDependencies;

export type RailwayBullMqApiMainErrorCode =
  | "dependencies-invalid"
  | "release-evidence-configuration-required"
  | "telemetry-configuration-required"
  | "startup-failed";

export class RailwayBullMqApiMainError extends Error {
  readonly code: RailwayBullMqApiMainErrorCode;

  constructor(code: RailwayBullMqApiMainErrorCode) {
    super(`Railway BullMQ API executable failed: ${code}`);
    this.name = "RailwayBullMqApiMainError";
    this.code = code;
  }
}

const dependencyKeys = Object.freeze([
  "createProcess",
  "createRuntime",
  "readBullMqEnvironment",
  "readMetaWebhookEnvironment",
  "readNodeEnvironment",
  "readReleaseEvidenceEnvironment",
  "readTelemetryEnvironment",
  "createTelemetryRuntime",
  "startApi",
] as const);

function requireDependencies(
  dependencies: Readonly<RailwayBullMqApiMainDependencies>,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      [...dependencyKeys].sort().join(",") ||
    dependencyKeys.some(
      (key) => typeof dependencies[key] !== "function",
    )
  ) {
    throw new RailwayBullMqApiMainError("dependencies-invalid");
  }
}

function recordApiSignal(
  telemetryRuntime: Readonly<RailwayApiTelemetryRuntime>,
  code: RailwayApiSignalLogEvent["code"],
): void {
  try {
    telemetryRuntime.logger.record(Object.freeze({
      version: 1,
      service: "connect-railway-api",
      kind: "api-signal",
      code,
    }));
  } catch {
    // Telemetry cannot control API admission or queue publication.
  }
}

function withTelemetryLifecycle(
  controller: Readonly<RailwayNodeProcessController>,
  telemetryRuntime: Readonly<RailwayApiTelemetryRuntime>,
): Readonly<RailwayNodeProcessController> {
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

/** Starts the fail-closed Railway API variant that owns its Redis publishers. */
export async function startRailwayBullMqApiExecutable(
  dependencies: Readonly<RailwayBullMqApiMainDependencies> =
    defaultDependencies,
) {
  requireDependencies(dependencies);

  let releaseEvidenceStorageConfiguration: ReturnType<
    typeof inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration
  >;
  let releaseEvidenceEnvironment:
    RailwayBotReplyStagingReleaseEvidenceRuntimeEnvironment;
  try {
    releaseEvidenceEnvironment =
      dependencies.readReleaseEvidenceEnvironment();
    releaseEvidenceStorageConfiguration =
      inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration(
        releaseEvidenceEnvironment,
      );
  } catch {
    throw new RailwayBullMqApiMainError(
      "release-evidence-configuration-required",
    );
  }
  if (releaseEvidenceStorageConfiguration.status === "invalid") {
    throw new RailwayBullMqApiMainError(
      "release-evidence-configuration-required",
    );
  }

  let telemetryEnvironment: RailwayBetterStackTelemetryEnvironment;
  try {
    telemetryEnvironment = dependencies.readTelemetryEnvironment();
  } catch {
    throw new RailwayBullMqApiMainError("startup-failed");
  }
  const telemetryConfiguration =
    inspectRailwayBetterStackTelemetryConfiguration(telemetryEnvironment);
  if (
    telemetryConfiguration.status === "configuration-required" ||
    telemetryConfiguration.status === "invalid"
  ) {
    throw new RailwayBullMqApiMainError(
      "telemetry-configuration-required",
    );
  }

  let telemetryRuntime: Readonly<RailwayApiTelemetryRuntime>;
  try {
    telemetryRuntime = dependencies.createTelemetryRuntime(
      telemetryConfiguration,
    );
  } catch {
    throw new RailwayBullMqApiMainError("startup-failed");
  }

  try {
    const controller = await dependencies.startApi({
      readEnvironment: dependencies.readNodeEnvironment,
      createProcess: dependencies.createProcess,
      recordIdleClientError() {
        recordApiSignal(
          telemetryRuntime,
          "postgres-idle-client-failure",
        );
      },
      async createRuntime({ postgresTelemetry }) {
        return dependencies.createRuntime({
          postgresTelemetry,
          requestTelemetry: telemetryRuntime.logger,
          bullMqEnvironment: dependencies.readBullMqEnvironment(),
          metaWebhookEnvironment:
            dependencies.readMetaWebhookEnvironment(),
          metaWebhookQueueTelemetry: Object.freeze({
            recordConnectionFailure() {
              recordApiSignal(
                telemetryRuntime,
                "meta-webhook-queue-connection-failure",
              );
            },
            recordPublisherFailure() {
              recordApiSignal(
                telemetryRuntime,
                "meta-webhook-queue-publisher-failure",
              );
            },
          }),
          teamInvitationQueueTelemetry: Object.freeze({
            recordConnectionFailure() {
              recordApiSignal(
                telemetryRuntime,
                "team-invitation-queue-connection-failure",
              );
            },
            recordPublisherFailure() {
              recordApiSignal(
                telemetryRuntime,
                "team-invitation-queue-publisher-failure",
              );
            },
          }),
          ...(releaseEvidenceStorageConfiguration.status !== "configured"
            ? {}
            : {
                botReplyStagingReleaseEvidence: {
                  environment: {
                    BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE:
                      releaseEvidenceEnvironment
                        .BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE,
                    APP_RELEASE_ID:
                      releaseEvidenceEnvironment.APP_RELEASE_ID,
                    APP_DEPLOYED_COMMIT_SHA:
                      releaseEvidenceEnvironment
                        .APP_DEPLOYED_COMMIT_SHA,
                    APP_DEPLOYMENT_ARTIFACT_DIGEST:
                      releaseEvidenceEnvironment
                        .APP_DEPLOYMENT_ARTIFACT_DIGEST,
                  },
                },
              }),
        });
      },
    });
    return withTelemetryLifecycle(controller, telemetryRuntime);
  } catch {
    await telemetryRuntime.shutdown();
    throw new RailwayBullMqApiMainError("startup-failed");
  }
}
