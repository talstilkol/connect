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
  MessageTemplateSubmissionQueuePublisher,
} from "../templates/messageTemplateSubmissionMaintenanceRunner.ts";
import type {
  MessageTemplateSubmissionEnvironment,
} from "../templates/messageTemplateSubmissionReadiness.ts";
import type {
  MetaWebhookEnvironment,
} from "../meta/metaWebhookConfiguration.ts";
import type {
  OperationalTelemetrySink,
} from "../operations/operationalTelemetry.ts";
import type {
  MetaCampaignDeliveryRetryEvidenceSource,
} from "../campaigns/metaCampaignDeliveryRetryPolicy.ts";
import type {
  NodePostgresPoolEnvironment,
} from "./nodePostgresPoolConfiguration.ts";
import {
  startRailwayWorkerBootstrap,
  type RailwayWorkerMainEnvironment,
  type RailwayWorkerMainTelemetry,
} from "./railwayWorkerMain.ts";
import {
  createRailwayPostgresWorkerService,
  type RailwayCampaignDeliveryQueueRuntimeFactory,
  type RailwayMetaWebhookQueueRuntimeFactory,
  type RailwayMessageTemplateSubmissionQueueRuntimeFactory,
  type RailwayTeamInvitationQueueRuntimeFactory,
} from "./railwayPostgresWorkerService.ts";
import type {
  RailwayTeamInvitationProviderFactory,
} from "./railwayTeamInvitationProviderFactory.ts";
import type {
  RailwayCampaignDeliveryEnvironment,
} from "./railwayCampaignDeliveryConsumerRuntime.ts";
import {
  createRailwayWorkerProcess,
  type RailwayWorkerProcessController,
} from "./railwayWorkerProcess.ts";
import type {
  RailwayWorkerSchedulerServiceClock,
} from "./railwayWorkerSchedulerService.ts";

export type RailwayWorkerExecutableEnvironment =
  NodePostgresPoolEnvironment &
    MessageTemplateSubmissionEnvironment &
    MetaWebhookEnvironment &
    RailwayCampaignDeliveryEnvironment &
    RailwayWorkerMainEnvironment;

export interface RailwayWorkerExecutableOptions {
  readonly environment: RailwayWorkerExecutableEnvironment;
  readonly campaignQueue?: CampaignDeliveryQueueBinding;
  readonly campaignDeliveries?: Readonly<{
    createQueueRuntime: RailwayCampaignDeliveryQueueRuntimeFactory;
    retryEvidenceSource: MetaCampaignDeliveryRetryEvidenceSource;
    telemetrySink: OperationalTelemetrySink;
    transportOptions?: MetaGraphTransportOptions;
    credentialVaultOptions?: MetaCredentialVaultOptions;
  }>;
  readonly telemetry: RailwayWorkerMainTelemetry;
  readonly clock?: RailwayWorkerSchedulerServiceClock;
  readonly metaWebhooks?: Readonly<{
    createQueueRuntime: RailwayMetaWebhookQueueRuntimeFactory;
    telemetrySink: OperationalTelemetrySink;
  }>;
  readonly teamInvitations?: Readonly<{
    createProvider: RailwayTeamInvitationProviderFactory;
    createQueueRuntime: RailwayTeamInvitationQueueRuntimeFactory;
    telemetrySink: OperationalTelemetrySink;
  }>;
  readonly messageTemplateSubmissions?: Readonly<{
    publisher?: MessageTemplateSubmissionQueuePublisher;
    createQueueRuntime?: RailwayMessageTemplateSubmissionQueueRuntimeFactory;
    telemetrySink: OperationalTelemetrySink;
    transportOptions?: MetaGraphTransportOptions;
    credentialVaultOptions?: MetaCredentialVaultOptions;
    notFoundGraceSeconds?: number;
    batchSize?: number;
    pendingMinimumAgeSeconds?: number;
    ambiguousMinimumAgeSeconds?: number;
  }>;
}

interface RailwayWorkerExecutableDependencies {
  readonly startBootstrap: typeof startRailwayWorkerBootstrap;
  readonly createService: typeof createRailwayPostgresWorkerService;
  readonly createProcess: typeof createRailwayWorkerProcess;
}

const defaultDependencies = Object.freeze({
  startBootstrap: startRailwayWorkerBootstrap,
  createService: createRailwayPostgresWorkerService,
  createProcess: createRailwayWorkerProcess,
});

const optionKeys = Object.freeze([
  "campaignDeliveries",
  "campaignQueue",
  "clock",
  "environment",
  "messageTemplateSubmissions",
  "metaWebhooks",
  "telemetry",
  "teamInvitations",
]);

const campaignDeliveryOptionKeys = Object.freeze([
  "createQueueRuntime",
  "credentialVaultOptions",
  "retryEvidenceSource",
  "telemetrySink",
  "transportOptions",
]);

const messageTemplateSubmissionOptionKeys = Object.freeze([
  "ambiguousMinimumAgeSeconds",
  "batchSize",
  "createQueueRuntime",
  "credentialVaultOptions",
  "notFoundGraceSeconds",
  "pendingMinimumAgeSeconds",
  "publisher",
  "telemetrySink",
  "transportOptions",
]);

const metaWebhookOptionKeys = Object.freeze([
  "createQueueRuntime",
  "telemetrySink",
]);

const teamInvitationOptionKeys = Object.freeze([
  "createProvider",
  "createQueueRuntime",
  "telemetrySink",
]);

export class RailwayWorkerExecutableError extends Error {
  constructor() {
    super("Railway worker executable composition is invalid");
    this.name = "RailwayWorkerExecutableError";
  }
}

function requireOptions(
  options: Readonly<RailwayWorkerExecutableOptions>,
  dependencies: Readonly<RailwayWorkerExecutableDependencies>,
): void {
  const messageTemplatePublisherSelected =
    typeof options?.messageTemplateSubmissions?.publisher?.publish ===
      "function";
  const messageTemplateQueueRuntimeSelected =
    typeof options?.messageTemplateSubmissions?.createQueueRuntime ===
      "function";
  const externalCampaignQueueSelected =
    typeof options?.campaignQueue?.sendBatch === "function";
  const campaignQueueRuntimeSelected =
    typeof options?.campaignDeliveries?.createQueueRuntime === "function";

  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    !options.environment || typeof options.environment !== "object" ||
    externalCampaignQueueSelected === campaignQueueRuntimeSelected ||
    !options.telemetry || typeof options.telemetry !== "object" ||
    typeof options.telemetry.recordPostgresIdleClientError !== "function" ||
    typeof options.telemetry.recordSchedulerRunFailure !== "function" ||
    typeof options.telemetry.recordSchedulerTimerFailure !== "function" ||
    typeof options.telemetry.recordSchedulerOverlapSuppressed !== "function" ||
    (options.clock !== undefined && typeof options.clock.now !== "function") ||
    (options.campaignDeliveries !== undefined && (
      !options.campaignDeliveries ||
      typeof options.campaignDeliveries !== "object" ||
      Object.keys(options.campaignDeliveries).some(
        (key) => !campaignDeliveryOptionKeys.includes(key),
      ) ||
      typeof options.campaignDeliveries.retryEvidenceSource
        ?.isConfigured !== "function" ||
      typeof options.campaignDeliveries.retryEvidenceSource?.load !==
        "function" ||
      typeof options.campaignDeliveries.telemetrySink?.record !== "function"
    )) ||
    (options.messageTemplateSubmissions !== undefined && (
      !options.messageTemplateSubmissions ||
      typeof options.messageTemplateSubmissions !== "object" ||
      Object.keys(options.messageTemplateSubmissions).some(
        (key) => !messageTemplateSubmissionOptionKeys.includes(key),
      ) ||
      messageTemplatePublisherSelected === messageTemplateQueueRuntimeSelected ||
      typeof options.messageTemplateSubmissions.telemetrySink?.record !==
        "function"
    )) ||
    (options.metaWebhooks !== undefined && (
      !options.metaWebhooks ||
      typeof options.metaWebhooks !== "object" ||
      Object.keys(options.metaWebhooks).some(
        (key) => !metaWebhookOptionKeys.includes(key),
      ) ||
      typeof options.metaWebhooks.createQueueRuntime !== "function" ||
      typeof options.metaWebhooks.telemetrySink?.record !== "function"
    )) ||
    (options.teamInvitations !== undefined && (
      !options.teamInvitations ||
      typeof options.teamInvitations !== "object" ||
      Object.keys(options.teamInvitations).some(
        (key) => !teamInvitationOptionKeys.includes(key),
      ) ||
      typeof options.teamInvitations.createProvider !== "function" ||
      typeof options.teamInvitations.createQueueRuntime !== "function" ||
      typeof options.teamInvitations.telemetrySink?.record !== "function"
    )) ||
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createProcess,createService,startBootstrap" ||
    typeof dependencies.startBootstrap !== "function" ||
    typeof dependencies.createService !== "function" ||
    typeof dependencies.createProcess !== "function"
  ) {
    throw new RailwayWorkerExecutableError();
  }
}

/**
 * Final provider-neutral composition root. A provider-bound entry module must
 * supply real queue adapters and telemetry; this layer never creates fallbacks.
 */
export async function startRailwayWorkerExecutable(
  options: Readonly<RailwayWorkerExecutableOptions>,
  dependencies: Readonly<RailwayWorkerExecutableDependencies> =
    defaultDependencies,
): Promise<Readonly<RailwayWorkerProcessController>> {
  requireOptions(options, dependencies);

  return dependencies.startBootstrap({
    readEnvironment() {
      return {
        RAILWAY_WORKER_SCHEDULER_OWNER_KEY:
          options.environment.RAILWAY_WORKER_SCHEDULER_OWNER_KEY,
      };
    },
    async createService({
      ownerKey,
      postgresTelemetry,
      schedulerTelemetry,
    }) {
      const messageTemplateSubmissions =
        options.messageTemplateSubmissions === undefined
          ? undefined
          : {
              ...options.messageTemplateSubmissions,
              environment: options.environment,
            };
      const campaignDeliveries = options.campaignDeliveries === undefined
        ? undefined
        : {
            ...options.campaignDeliveries,
            environment: options.environment,
          };
      const metaWebhooks = options.metaWebhooks === undefined
        ? undefined
        : {
            ...options.metaWebhooks,
            environment: options.environment,
          };
      const teamInvitations = options.teamInvitations === undefined
        ? undefined
        : { ...options.teamInvitations };

      return dependencies.createService({
        environment: options.environment,
        ownerKey,
        campaignQueue: options.campaignQueue,
        campaignDeliveries,
        postgresTelemetry,
        schedulerTelemetry,
        clock: options.clock,
        messageTemplateSubmissions,
        metaWebhooks,
        teamInvitations,
      });
    },
    createProcess({ service }) {
      return dependencies.createProcess({ service });
    },
    telemetry: options.telemetry,
  });
}
