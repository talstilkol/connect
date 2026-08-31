import type {
  MetaCampaignDeliveryRetryEvidenceSource,
} from "../campaigns/metaCampaignDeliveryRetryPolicy.ts";
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
  createRailwayBullMqCampaignDeliveryQueueRuntime,
  type RailwayBullMqCampaignDeliveryQueueTelemetry,
} from "./railwayBullMqCampaignDeliveryQueue.ts";
import {
  createRailwayBullMqMetaWebhookWorkerRuntime,
  type RailwayBullMqMetaWebhookQueueTelemetry,
} from "./railwayBullMqMetaWebhookQueue.ts";
import {
  railwayBullMqEnvironmentKeys,
  type RailwayBullMqEnvironment,
} from "./railwayBullMqConfiguration.ts";
import {
  createRailwayBullMqMessageTemplateSubmissionQueueRuntime,
  type RailwayBullMqMessageTemplateSubmissionQueueTelemetry,
} from "./railwayBullMqMessageTemplateSubmissionQueue.ts";
import {
  createRailwayBullMqTeamInvitationWorkerRuntime,
  type RailwayBullMqTeamInvitationQueueTelemetry,
} from "./railwayBullMqTeamInvitationQueue.ts";
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
import type {
  RailwayTeamInvitationProviderFactory,
} from "./railwayTeamInvitationProviderFactory.ts";

export type RailwayBullMqWorkerEnvironment =
  RailwayWorkerExecutableEnvironment & RailwayBullMqEnvironment;

export interface RailwayBullMqWorkerExecutableOptions {
  readonly environment: RailwayBullMqWorkerEnvironment;
  readonly telemetry: RailwayWorkerMainTelemetry;
  readonly clock?: RailwayWorkerSchedulerServiceClock;
  readonly campaignDeliveries: Readonly<{
    retryEvidenceSource: MetaCampaignDeliveryRetryEvidenceSource;
    telemetrySink: OperationalTelemetrySink;
    queueTelemetry: RailwayBullMqCampaignDeliveryQueueTelemetry;
    transportOptions?: MetaGraphTransportOptions;
    credentialVaultOptions?: MetaCredentialVaultOptions;
  }>;
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
  readonly metaWebhooks: Readonly<{
    telemetrySink: OperationalTelemetrySink;
    queueTelemetry: RailwayBullMqMetaWebhookQueueTelemetry;
  }>;
  readonly teamInvitations: Readonly<{
    createProvider: RailwayTeamInvitationProviderFactory;
    telemetrySink: OperationalTelemetrySink;
    queueTelemetry: RailwayBullMqTeamInvitationQueueTelemetry;
  }>;
}

interface RailwayBullMqWorkerExecutableDependencies {
  readonly startExecutable: typeof startRailwayWorkerExecutable;
  readonly createCampaignQueueRuntime:
    typeof createRailwayBullMqCampaignDeliveryQueueRuntime;
  readonly createTemplateQueueRuntime:
    typeof createRailwayBullMqMessageTemplateSubmissionQueueRuntime;
  readonly createMetaWebhookQueueRuntime:
    typeof createRailwayBullMqMetaWebhookWorkerRuntime;
  readonly createTeamInvitationQueueRuntime:
    typeof createRailwayBullMqTeamInvitationWorkerRuntime;
}

const defaultDependencies = Object.freeze({
  startExecutable: startRailwayWorkerExecutable,
  createCampaignQueueRuntime:
    createRailwayBullMqCampaignDeliveryQueueRuntime,
  createTemplateQueueRuntime:
    createRailwayBullMqMessageTemplateSubmissionQueueRuntime,
  createMetaWebhookQueueRuntime:
    createRailwayBullMqMetaWebhookWorkerRuntime,
  createTeamInvitationQueueRuntime:
    createRailwayBullMqTeamInvitationWorkerRuntime,
});

const optionKeys = Object.freeze([
  "campaignDeliveries",
  "clock",
  "environment",
  "messageTemplateSubmissions",
  "metaWebhooks",
  "telemetry",
  "teamInvitations",
]);

const campaignDeliveryOptionKeys = Object.freeze([
  "credentialVaultOptions",
  "queueTelemetry",
  "retryEvidenceSource",
  "telemetrySink",
  "transportOptions",
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

const metaWebhookOptionKeys = Object.freeze([
  "queueTelemetry",
  "telemetrySink",
]);

const teamInvitationOptionKeys = Object.freeze([
  "createProvider",
  "queueTelemetry",
  "telemetrySink",
]);

const queueTelemetryKeys = Object.freeze([
  "recordConnectionFailure",
  "recordDeadLetter",
  "recordDeadLetterCleanup",
  "recordPublisherFailure",
  "recordWorkerFailure",
  "recordWorkerRuntimeFailure",
] as const);

export type RailwayBullMqWorkerExecutableErrorCode =
  | "options-invalid"
  | "dependencies-invalid"
  | "startup-failed";

export class RailwayBullMqWorkerExecutableError extends Error {
  readonly code: RailwayBullMqWorkerExecutableErrorCode;

  constructor(code: RailwayBullMqWorkerExecutableErrorCode) {
    super(`Railway BullMQ worker executable failed: ${code}`);
    this.name = "RailwayBullMqWorkerExecutableError";
    this.code = code;
  }
}

function queueTelemetryIsValid(value: unknown): boolean {
  return Boolean(
    value && typeof value === "object" &&
    Object.keys(value).sort().join(",") ===
      [...queueTelemetryKeys].sort().join(",") &&
    queueTelemetryKeys.every(
      (key) =>
        typeof (value as Record<string, unknown>)[key] === "function",
    ),
  );
}

function requireOptions(
  options: Readonly<RailwayBullMqWorkerExecutableOptions>,
  dependencies: Readonly<
    RailwayBullMqWorkerExecutableDependencies
  >,
): void {
  const dependenciesInvalid =
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createCampaignQueueRuntime,createMetaWebhookQueueRuntime,createTeamInvitationQueueRuntime,createTemplateQueueRuntime,startExecutable" ||
    typeof dependencies.startExecutable !== "function" ||
    typeof dependencies.createCampaignQueueRuntime !== "function" ||
    typeof dependencies.createTemplateQueueRuntime !== "function" ||
    typeof dependencies.createMetaWebhookQueueRuntime !== "function" ||
    typeof dependencies.createTeamInvitationQueueRuntime !== "function";

  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    !options.environment || typeof options.environment !== "object" ||
    !options.telemetry || typeof options.telemetry !== "object" ||
    typeof options.telemetry.recordPostgresIdleClientError !== "function" ||
    typeof options.telemetry.recordSchedulerRunFailure !== "function" ||
    typeof options.telemetry.recordSchedulerTimerFailure !== "function" ||
    typeof options.telemetry.recordSchedulerOverlapSuppressed !== "function" ||
    (options.clock !== undefined && typeof options.clock.now !== "function") ||
    !options.campaignDeliveries ||
    typeof options.campaignDeliveries !== "object" ||
    Object.keys(options.campaignDeliveries).some(
      (key) => !campaignDeliveryOptionKeys.includes(key),
    ) ||
    typeof options.campaignDeliveries.retryEvidenceSource
      ?.isConfigured !== "function" ||
    typeof options.campaignDeliveries.retryEvidenceSource?.load !==
      "function" ||
    typeof options.campaignDeliveries.telemetrySink?.record !== "function" ||
    !queueTelemetryIsValid(
      options.campaignDeliveries.queueTelemetry,
    ) ||
    !options.messageTemplateSubmissions ||
    typeof options.messageTemplateSubmissions !== "object" ||
    Object.keys(options.messageTemplateSubmissions).some(
      (key) => !messageTemplateSubmissionOptionKeys.includes(key),
    ) ||
    typeof options.messageTemplateSubmissions.telemetrySink?.record !==
      "function" ||
    !queueTelemetryIsValid(
      options.messageTemplateSubmissions.queueTelemetry,
    ) ||
    !options.metaWebhooks ||
    typeof options.metaWebhooks !== "object" ||
    Object.keys(options.metaWebhooks).some(
      (key) => !metaWebhookOptionKeys.includes(key),
    ) ||
    typeof options.metaWebhooks.telemetrySink?.record !== "function" ||
    !queueTelemetryIsValid(options.metaWebhooks.queueTelemetry) ||
    !options.teamInvitations ||
    typeof options.teamInvitations !== "object" ||
    Object.keys(options.teamInvitations).some(
      (key) => !teamInvitationOptionKeys.includes(key),
    ) ||
    typeof options.teamInvitations.createProvider !== "function" ||
    typeof options.teamInvitations.telemetrySink?.record !== "function" ||
    !queueTelemetryIsValid(options.teamInvitations.queueTelemetry) ||
    dependenciesInvalid
  ) {
    throw new RailwayBullMqWorkerExecutableError(
      dependenciesInvalid
        ? "dependencies-invalid"
        : "options-invalid",
    );
  }
}

function selectBullMqEnvironment(
  environment: RailwayBullMqWorkerEnvironment,
): RailwayBullMqEnvironment {
  return Object.freeze(Object.fromEntries(
    railwayBullMqEnvironmentKeys.map((key) => [key, environment[key]]),
  )) as RailwayBullMqEnvironment;
}

/**
 * Provider-bound composition for the implemented Railway queues. One worker
 * process owns both BullMQ lifecycles, the PostgreSQL consumers and the
 * minute-aligned scheduler, preventing competing partial queue processes.
 */
export async function startRailwayBullMqWorkerExecutable(
  options: Readonly<RailwayBullMqWorkerExecutableOptions>,
  dependencies: Readonly<
    RailwayBullMqWorkerExecutableDependencies
  > = defaultDependencies,
): Promise<Readonly<RailwayWorkerProcessController>> {
  requireOptions(options, dependencies);
  const {
    queueTelemetry: campaignQueueTelemetry,
    ...campaignOptions
  } = options.campaignDeliveries;
  const {
    queueTelemetry: templateQueueTelemetry,
    ...templateOptions
  } = options.messageTemplateSubmissions;
  const {
    queueTelemetry: metaWebhookQueueTelemetry,
    ...metaWebhookOptions
  } = options.metaWebhooks;
  const {
    queueTelemetry: teamInvitationQueueTelemetry,
    ...teamInvitationOptions
  } = options.teamInvitations;
  const bullMqEnvironment = selectBullMqEnvironment(options.environment);

  try {
    return await dependencies.startExecutable({
      environment: options.environment,
      telemetry: options.telemetry,
      clock: options.clock,
      campaignDeliveries: {
        ...campaignOptions,
        createQueueRuntime({ consumer }) {
          return dependencies.createCampaignQueueRuntime({
            environment: bullMqEnvironment,
            consumer,
            telemetry: campaignQueueTelemetry,
            clock: options.clock,
          });
        },
      },
      messageTemplateSubmissions: {
        ...templateOptions,
        createQueueRuntime({ consumer }) {
          return dependencies.createTemplateQueueRuntime({
            environment: bullMqEnvironment,
            consumer,
            telemetry: templateQueueTelemetry,
            clock: options.clock,
          });
        },
      },
      metaWebhooks: {
        ...metaWebhookOptions,
        createQueueRuntime({ consumer }) {
          return dependencies.createMetaWebhookQueueRuntime({
            environment: bullMqEnvironment,
            consumer,
            telemetry: metaWebhookQueueTelemetry,
            clock: options.clock,
          });
        },
      },
      teamInvitations: {
        ...teamInvitationOptions,
        createQueueRuntime({ consumer }) {
          return dependencies.createTeamInvitationQueueRuntime({
            environment: bullMqEnvironment,
            consumer,
            telemetry: teamInvitationQueueTelemetry,
            clock: options.clock,
          });
        },
      },
    });
  } catch {
    throw new RailwayBullMqWorkerExecutableError(
      "startup-failed",
    );
  }
}
