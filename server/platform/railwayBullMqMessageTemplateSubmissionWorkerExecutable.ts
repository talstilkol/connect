import type {
  CampaignDeliveryQueueBinding,
} from "../campaigns/campaignScheduler.ts";
import type {
  MetaCredentialVaultOptions,
} from "../meta/metaCredentialVault.ts";
import type {
  MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";
import type {
  OperationalTelemetrySink,
} from "../operations/operationalTelemetry.ts";
import {
  createRailwayBullMqMessageTemplateSubmissionQueueRuntime,
  type RailwayBullMqMessageTemplateSubmissionQueueTelemetry,
} from "./railwayBullMqMessageTemplateSubmissionQueue.ts";
import type {
  RailwayBullMqEnvironment,
} from "./railwayBullMqConfiguration.ts";
import {
  startRailwayWorkerExecutable,
  type RailwayWorkerExecutableEnvironment,
} from "./railwayWorkerExecutable.ts";
import type {
  RailwayWorkerMainTelemetry,
} from "./railwayWorkerMain.ts";
import type {
  RailwayWorkerProcessController,
} from "./railwayWorkerProcess.ts";
import type {
  RailwayWorkerSchedulerServiceClock,
} from "./railwayWorkerSchedulerService.ts";

export type RailwayBullMqMessageTemplateSubmissionWorkerEnvironment =
  RailwayWorkerExecutableEnvironment & RailwayBullMqEnvironment;

export interface RailwayBullMqMessageTemplateSubmissionWorkerExecutableOptions {
  readonly environment:
    RailwayBullMqMessageTemplateSubmissionWorkerEnvironment;
  readonly campaignQueue: CampaignDeliveryQueueBinding;
  readonly telemetry: RailwayWorkerMainTelemetry;
  readonly clock?: RailwayWorkerSchedulerServiceClock;
  readonly messageTemplateSubmissions: Readonly<{
    telemetrySink: OperationalTelemetrySink;
    queueTelemetry:
      RailwayBullMqMessageTemplateSubmissionQueueTelemetry;
    transportOptions?: MetaGraphTransportOptions;
    credentialVaultOptions?: MetaCredentialVaultOptions;
    notFoundGraceSeconds?: number;
    batchSize?: number;
    pendingMinimumAgeSeconds?: number;
    ambiguousMinimumAgeSeconds?: number;
  }>;
}

interface RailwayBullMqMessageTemplateSubmissionWorkerExecutableDependencies {
  readonly startExecutable: typeof startRailwayWorkerExecutable;
  readonly createQueueRuntime:
    typeof createRailwayBullMqMessageTemplateSubmissionQueueRuntime;
}

const defaultDependencies = Object.freeze({
  startExecutable: startRailwayWorkerExecutable,
  createQueueRuntime:
    createRailwayBullMqMessageTemplateSubmissionQueueRuntime,
});

const optionKeys = Object.freeze([
  "campaignQueue",
  "clock",
  "environment",
  "messageTemplateSubmissions",
  "telemetry",
]);

const messageTemplateSubmissionOptionKeys = Object.freeze([
  "ambiguousMinimumAgeSeconds",
  "batchSize",
  "credentialVaultOptions",
  "notFoundGraceSeconds",
  "pendingMinimumAgeSeconds",
  "queueTelemetry",
  "telemetrySink",
  "transportOptions",
]);

const queueTelemetryKeys = Object.freeze([
  "recordConnectionFailure",
  "recordDeadLetter",
  "recordDeadLetterCleanup",
  "recordPublisherFailure",
  "recordWorkerFailure",
  "recordWorkerRuntimeFailure",
] as const);

export type RailwayBullMqMessageTemplateSubmissionWorkerExecutableErrorCode =
  | "options-invalid"
  | "dependencies-invalid"
  | "startup-failed";

export class RailwayBullMqMessageTemplateSubmissionWorkerExecutableError
  extends Error {
  readonly code:
    RailwayBullMqMessageTemplateSubmissionWorkerExecutableErrorCode;

  constructor(
    code: RailwayBullMqMessageTemplateSubmissionWorkerExecutableErrorCode,
  ) {
    super(`Railway BullMQ template worker executable failed: ${code}`);
    this.name =
      "RailwayBullMqMessageTemplateSubmissionWorkerExecutableError";
    this.code = code;
  }
}

function requireOptions(
  options: Readonly<
    RailwayBullMqMessageTemplateSubmissionWorkerExecutableOptions
  >,
  dependencies: Readonly<
    RailwayBullMqMessageTemplateSubmissionWorkerExecutableDependencies
  >,
): void {
  const dependenciesInvalid =
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createQueueRuntime,startExecutable" ||
    typeof dependencies.startExecutable !== "function" ||
    typeof dependencies.createQueueRuntime !== "function";

  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    !options.environment || typeof options.environment !== "object" ||
    typeof options.campaignQueue?.sendBatch !== "function" ||
    !options.telemetry || typeof options.telemetry !== "object" ||
    typeof options.telemetry.recordPostgresIdleClientError !== "function" ||
    typeof options.telemetry.recordSchedulerRunFailure !== "function" ||
    typeof options.telemetry.recordSchedulerTimerFailure !== "function" ||
    typeof options.telemetry.recordSchedulerOverlapSuppressed !== "function" ||
    (options.clock !== undefined && typeof options.clock.now !== "function") ||
    !options.messageTemplateSubmissions ||
    typeof options.messageTemplateSubmissions !== "object" ||
    Object.keys(options.messageTemplateSubmissions).some(
      (key) => !messageTemplateSubmissionOptionKeys.includes(key),
    ) ||
    typeof options.messageTemplateSubmissions.telemetrySink?.record !==
      "function" ||
    !options.messageTemplateSubmissions.queueTelemetry ||
    typeof options.messageTemplateSubmissions.queueTelemetry !== "object" ||
    Object.keys(options.messageTemplateSubmissions.queueTelemetry).sort()
      .join(",") !== [...queueTelemetryKeys].sort().join(",") ||
    queueTelemetryKeys.some(
      (key) =>
        typeof options.messageTemplateSubmissions.queueTelemetry[key] !==
          "function",
    ) ||
    dependenciesInvalid
  ) {
    throw new RailwayBullMqMessageTemplateSubmissionWorkerExecutableError(
      dependenciesInvalid
        ? "dependencies-invalid"
        : "options-invalid",
    );
  }
}

/**
 * Provider-bound composition for the first Railway Redis/BullMQ queue. The
 * PostgreSQL worker creates the durable consumer, while this boundary owns the
 * BullMQ publisher, worker, DLQ and their lifecycle.
 */
export async function startRailwayBullMqMessageTemplateSubmissionWorkerExecutable(
  options: Readonly<
    RailwayBullMqMessageTemplateSubmissionWorkerExecutableOptions
  >,
  dependencies: Readonly<
    RailwayBullMqMessageTemplateSubmissionWorkerExecutableDependencies
  > = defaultDependencies,
): Promise<Readonly<RailwayWorkerProcessController>> {
  requireOptions(options, dependencies);
  const {
    queueTelemetry,
    ...messageTemplateSubmissionOptions
  } = options.messageTemplateSubmissions;

  try {
    return await dependencies.startExecutable({
      environment: options.environment,
      campaignQueue: options.campaignQueue,
      telemetry: options.telemetry,
      clock: options.clock,
      messageTemplateSubmissions: {
        ...messageTemplateSubmissionOptions,
        createQueueRuntime({ consumer }) {
          return dependencies.createQueueRuntime({
            environment: options.environment,
            consumer,
            telemetry: queueTelemetry,
            clock: options.clock,
          });
        },
      },
    });
  } catch {
    throw new RailwayBullMqMessageTemplateSubmissionWorkerExecutableError(
      "startup-failed",
    );
  }
}
