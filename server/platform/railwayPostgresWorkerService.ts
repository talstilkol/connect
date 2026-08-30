import type {
  CampaignDeliveryQueueBinding,
} from "../campaigns/campaignScheduler.ts";
import {
  createActiveAiRuntimeAgentLoader,
} from "../ai/activeAiRuntimeAgent.ts";
import {
  createAiInboundRuntimeProcessor,
} from "../ai/aiInboundRuntimeProcessor.ts";
import {
  createAiRuntimeService,
} from "../ai/aiRuntimeService.ts";
import {
  unavailableAiKnowledgeRetriever,
  unavailableAiResponseProvider,
} from "../ai/unavailableAiRuntimeDependencies.ts";
import {
  createInboundAutomationProcessor,
} from "../automation/inboundAutomationProcessor.ts";
import {
  createBotInboundRuntimeProcessor,
} from "../bot/botInboundRuntimeProcessor.ts";
import {
  createBotReplyDeliveryStatusReconciler,
} from "../bot/botReplyDeliveryStatusReconciler.ts";
import type {
  BotReplyDeliveryWorker,
} from "../bot/botReplyDeliveryWorker.ts";
import type {
  BotReplyDeliveryRepository,
} from "../../db/botReplyDeliveryRepository.ts";
import {
  createBotRuntimeService,
} from "../bot/botRuntimeService.ts";
import {
  createUnavailableBotReplyProcessor,
} from "../bot/unavailableBotReplyProcessor.ts";
import {
  createTeamInvitationDispatchProcessor,
} from "../team/teamInvitationDispatchProcessor.ts";
import type {
  TeamInvitationProvider,
} from "../team/teamInvitationProvider.ts";
import {
  createTeamInvitationQueueConsumer,
  type TeamInvitationQueueBatch,
} from "../team/teamInvitationQueueConsumer.ts";
import {
  createCampaignDeliveryStatusReconciler,
} from "../campaigns/campaignDeliveryStatusReconciler.ts";
import {
  requireMetaWebhookConfiguration,
  type MetaWebhookEnvironment,
} from "../meta/metaWebhookConfiguration.ts";
import {
  createMetaWebhookBusinessBatchProcessor,
} from "../meta/metaWebhookBusinessProcessor.ts";
import {
  createMetaWebhookEventDispatcher,
} from "../meta/metaWebhookEventDispatcher.ts";
import {
  createMetaWebhookIngress,
} from "../meta/metaWebhookIngress.ts";
import {
  createMetaWebhookQueueConsumer,
  type MetaWebhookQueueBatch,
} from "../meta/metaWebhookQueueConsumer.ts";
import {
  observeMetaWebhookQueueHandler,
} from "../operations/queueTelemetry.ts";
import {
  observeTeamInvitationDispatchProcessor,
} from "../operations/teamInvitationDeliveryTelemetry.ts";
import type {
  BotReplyStagingScenarioDriver,
} from "../operations/botReplyStagingScenarioExecutor.ts";
import type {
  createMetaGraphBotReplyStagingObservationReader,
} from "../meta/metaGraphBotReplyStagingObservationReader.ts";
import type {
  createRailwayBotReplyStagingSecurityObservationReader,
} from "./railwayBotReplyStagingSecurityObservationReader.ts";
import type {
  createRailwayBotReplyStagingKillSwitch,
} from "./railwayBotReplyStagingKillSwitch.ts";
import {
  workerSchedulerOwnerKeyPattern,
} from "../../shared/domain/workerScheduler.ts";
import {
  createNodePostgresPool,
  inspectNodePostgresPoolConfiguration,
  type NodePostgresPoolEnvironment,
  type NodePostgresPoolTelemetry,
} from "./nodePostgresPoolConfiguration.ts";
import {
  createNodePostgresQueryExecutor,
  createNodePostgresTransactionManager,
} from "./nodePostgresAdapter.ts";
import {
  createPostgresAiAgentRepository,
} from "./postgresAiAgentRepository.ts";
import {
  createPostgresAiReplyOutboxRepository,
} from "./postgresAiReplyOutboxRepository.ts";
import {
  createPostgresAiRuntimePersistence,
} from "./postgresAiRuntimeRepository.ts";
import {
  createPostgresBotFlowRepository,
} from "./postgresBotFlowRepository.ts";
import {
  createPostgresBotRuntimeRepository,
} from "./postgresBotRuntimeRepository.ts";
import {
  createPostgresBotReplyDeliveryRepository,
} from "./postgresBotReplyDeliveryRepository.ts";
import {
  createPostgresBotReplyDeliveryProviderRepository,
} from "./postgresBotReplyDeliveryProviderRepository.ts";
import {
  createPostgresCampaignDispatchRepository,
} from "./postgresCampaignDispatchRepository.ts";
import {
  createPostgresCampaignDeliveryProviderRepository,
} from "./postgresCampaignDeliveryProviderRepository.ts";
import {
  createPostgresCampaignRepository,
} from "./postgresCampaignRepository.ts";
import {
  createPostgresClerkOrganizationBindingRepository,
} from "./postgresClerkOrganizationBindingRepository.ts";
import {
  createPostgresConversationRepository,
} from "./postgresConversationRepository.ts";
import {
  createPostgresMessageTemplateRepository,
} from "./postgresMessageTemplateRepository.ts";
import {
  createPostgresMessageTemplateSubmissionOutboxRepository,
} from "./postgresMessageTemplateSubmissionOutboxRepository.ts";
import {
  createPostgresMetaCredentialRepository,
} from "./postgresMetaCredentialRepository.ts";
import {
  createPostgresMetaRepository,
} from "./postgresMetaRepository.ts";
import {
  createPostgresMutationRateLimitBinding,
} from "./postgresMutationRateLimitBinding.ts";
import {
  createPostgresTeamInvitationDeliveryRepository,
} from "./postgresTeamInvitationDeliveryRepository.ts";
import {
  createPostgresTeamInvitationExpirationRepository,
} from "./postgresTeamInvitationExpirationRepository.ts";
import {
  createPostgresTeamInvitationRepository,
} from "./postgresTeamInvitationRepository.ts";
import {
  createPostgresWhatsappCampaignDeliveryPolicyRepository,
} from "./postgresWhatsappCampaignDeliveryPolicyRepository.ts";
import {
  createPostgresWhatsappRateLimitRepository,
} from "./postgresWhatsappRateLimitRepository.ts";
import {
  createPostgresWorkerSchedulerLeaseRepository,
} from "./postgresWorkerSchedulerLeaseRepository.ts";
import type {
  MetaCredentialVaultOptions,
} from "../meta/metaCredentialVault.ts";
import type {
  MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";
import type {
  MessageTemplateSubmissionQueuePublisher,
} from "../templates/messageTemplateSubmissionMaintenanceRunner.ts";
import {
  createMessageTemplateSubmissionQueueConsumer,
  type MessageTemplateSubmissionQueueBatch,
} from "../templates/messageTemplateSubmissionQueueConsumer.ts";
import type {
  MessageTemplateSubmissionEnvironment,
} from "../templates/messageTemplateSubmissionReadiness.ts";
import {
  observeMessageTemplateSubmissionMaintenance,
} from "../operations/messageTemplateSubmissionMaintenanceTelemetry.ts";
import {
  createProviderRequestTelemetryScope,
} from "../operations/providerRequestTelemetry.ts";
import type {
  OperationalTelemetrySink,
} from "../operations/operationalTelemetry.ts";
import type {
  MetaCampaignDeliveryRetryEvidenceSource,
} from "../campaigns/metaCampaignDeliveryRetryPolicy.ts";
import type {
  RailwayCampaignDeliveryEnvironment,
} from "./railwayCampaignDeliveryConsumerRuntime.ts";
import {
  createRailwayCampaignDeliveryConsumerRuntime,
} from "./railwayCampaignDeliveryConsumerRuntime.ts";
import type {
  RailwayPostgresFoundation,
} from "./railwayPostgresFoundation.ts";
import {
  createRailwayMessageTemplateSubmissionMaintenanceRuntime,
} from "./railwayMessageTemplateSubmissionMaintenanceRuntime.ts";
import {
  createRailwayMessageTemplateSubmissionWorkerRuntime,
} from "./railwayMessageTemplateSubmissionWorkerRuntime.ts";
import {
  createRailwayWorkerRuntime,
} from "./railwayWorkerRuntime.ts";
import type {
  RailwayTeamInvitationProviderFactory,
} from "./railwayTeamInvitationProviderFactory.ts";
import {
  createRailwayWorkerSchedulerService,
  type RailwayWorkerSchedulerService,
  type RailwayWorkerSchedulerServiceClock,
  type RailwayWorkerSchedulerServiceTelemetry,
} from "./railwayWorkerSchedulerService.ts";

export interface RailwayPostgresWorkerServiceOptions {
  readonly environment?: NodePostgresPoolEnvironment;
  readonly ownerKey: string;
  readonly campaignQueue?: CampaignDeliveryQueueBinding;
  readonly campaignDeliveries?: Readonly<{
    environment: RailwayCampaignDeliveryEnvironment;
    createQueueRuntime: RailwayCampaignDeliveryQueueRuntimeFactory;
    retryEvidenceSource: MetaCampaignDeliveryRetryEvidenceSource;
    telemetrySink: OperationalTelemetrySink;
    transportOptions?: MetaGraphTransportOptions;
    credentialVaultOptions?: MetaCredentialVaultOptions;
  }>;
  readonly metaWebhooks?: Readonly<{
    environment: MetaWebhookEnvironment;
    createQueueRuntime: RailwayMetaWebhookQueueRuntimeFactory;
    telemetrySink: OperationalTelemetrySink;
  }>;
  readonly teamInvitations?: Readonly<{
    createProvider: RailwayTeamInvitationProviderFactory;
    createQueueRuntime: RailwayTeamInvitationQueueRuntimeFactory;
    telemetrySink: OperationalTelemetrySink;
  }>;
  readonly postgresTelemetry: NodePostgresPoolTelemetry;
  readonly schedulerTelemetry: RailwayWorkerSchedulerServiceTelemetry;
  readonly clock?: RailwayWorkerSchedulerServiceClock;
  readonly messageTemplateSubmissions?: Readonly<{
    environment: MessageTemplateSubmissionEnvironment;
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

interface RailwayMessageTemplateSubmissionQueueConsumer {
  readonly handle: (
    batch: MessageTemplateSubmissionQueueBatch,
  ) => Promise<unknown>;
}

export interface RailwayMessageTemplateSubmissionQueueRuntime {
  readonly publisher: MessageTemplateSubmissionQueuePublisher;
  readonly start: () => Promise<void>;
  readonly cleanExpiredDeadLetters: () => Promise<number>;
  readonly close: () => Promise<void>;
}

export type RailwayMessageTemplateSubmissionQueueRuntimeFactory = (
  options: Readonly<{
    consumer: RailwayMessageTemplateSubmissionQueueConsumer;
  }>,
) => Readonly<RailwayMessageTemplateSubmissionQueueRuntime>;

interface RailwayCampaignDeliveryQueueConsumer {
  readonly handle: (
    batch: import("../campaigns/campaignDeliveryQueueConsumer.ts")
      .CampaignDeliveryQueueBatch,
  ) => Promise<unknown>;
}

export interface RailwayCampaignDeliveryQueueRuntime {
  readonly queue: CampaignDeliveryQueueBinding;
  readonly start: () => Promise<void>;
  readonly cleanExpiredDeadLetters: () => Promise<number>;
  readonly close: () => Promise<void>;
}

export type RailwayCampaignDeliveryQueueRuntimeFactory = (
  options: Readonly<{
    consumer: RailwayCampaignDeliveryQueueConsumer;
  }>,
) => Readonly<RailwayCampaignDeliveryQueueRuntime>;

interface RailwayMetaWebhookQueueConsumer {
  readonly handle: (
    batch: MetaWebhookQueueBatch,
  ) => Promise<unknown>;
}

export interface RailwayMetaWebhookQueueRuntime {
  readonly start: () => Promise<void>;
  readonly cleanExpiredDeadLetters: () => Promise<number>;
  readonly close: () => Promise<void>;
}

export type RailwayMetaWebhookQueueRuntimeFactory = (
  options: Readonly<{
    consumer: RailwayMetaWebhookQueueConsumer;
  }>,
) => Readonly<RailwayMetaWebhookQueueRuntime>;

interface RailwayTeamInvitationQueueConsumer {
  readonly handle: (
    batch: TeamInvitationQueueBatch,
  ) => Promise<unknown>;
}

export interface RailwayTeamInvitationQueueRuntime {
  readonly start: () => Promise<void>;
  readonly cleanExpiredDeadLetters: () => Promise<number>;
  readonly close: () => Promise<void>;
}

export type RailwayTeamInvitationQueueRuntimeFactory = (
  options: Readonly<{
    consumer: RailwayTeamInvitationQueueConsumer;
  }>,
) => Readonly<RailwayTeamInvitationQueueRuntime>;

interface RailwayBotReplyStagingQueueConsumer {
  readonly handle: (message: unknown) => Promise<unknown>;
}

export interface RailwayBotReplyStagingQueueRuntime {
  readonly start: () => Promise<void>;
  readonly cleanExpiredDeadLetters: () => Promise<number>;
  readonly close: () => Promise<void>;
}

export type RailwayBotReplyStagingQueueRuntimeFactory = (
  options: Readonly<{
    consumer: RailwayBotReplyStagingQueueConsumer;
  }>,
) => Readonly<RailwayBotReplyStagingQueueRuntime>;

export type RailwayBotReplyStagingScenarioDriverFactory = (
  dependencies: Readonly<{
    deliveryWorker: BotReplyDeliveryWorker;
    deliveries: Pick<BotReplyDeliveryRepository, "stage">;
    graphObservations: ReturnType<
      typeof createMetaGraphBotReplyStagingObservationReader
    >;
    securityObservations: ReturnType<
      typeof createRailwayBotReplyStagingSecurityObservationReader
    >;
    durableObservations: RailwayPostgresFoundation[
      "botReplyStagingObservations"
    ];
    webhookObservations: RailwayPostgresFoundation[
      "botReplyStagingWebhookObservations"
    ];
    providerDeferralObservations: RailwayPostgresFoundation[
      "botReplyStagingProviderDeferralObservations"
    ];
    sendObservations: RailwayPostgresFoundation[
      "botReplyStagingSendObservations"
    ];
    killSwitch: ReturnType<typeof createRailwayBotReplyStagingKillSwitch>;
    serviceWindows: RailwayPostgresFoundation[
      "botReplyStagingServiceWindows"
    ];
    clock: RailwayWorkerSchedulerServiceClock;
  }>,
) => Readonly<BotReplyStagingScenarioDriver>;

const optionKeys = Object.freeze([
  "campaignDeliveries",
  "campaignQueue",
  "clock",
  "environment",
  "messageTemplateSubmissions",
  "metaWebhooks",
  "ownerKey",
  "postgresTelemetry",
  "schedulerTelemetry",
  "teamInvitations",
]);

const campaignDeliveryOptionKeys = Object.freeze([
  "createQueueRuntime",
  "credentialVaultOptions",
  "environment",
  "retryEvidenceSource",
  "telemetrySink",
  "transportOptions",
]);

const messageTemplateSubmissionOptionKeys = Object.freeze([
  "ambiguousMinimumAgeSeconds",
  "batchSize",
  "createQueueRuntime",
  "credentialVaultOptions",
  "environment",
  "notFoundGraceSeconds",
  "pendingMinimumAgeSeconds",
  "publisher",
  "telemetrySink",
  "transportOptions",
]);

const metaWebhookOptionKeys = Object.freeze([
  "createQueueRuntime",
  "environment",
  "telemetrySink",
]);

const teamInvitationOptionKeys = Object.freeze([
  "createProvider",
  "createQueueRuntime",
  "telemetrySink",
]);

const systemClock = Object.freeze({
  now() {
    return new Date();
  },
});

function requireOptions(
  options: Readonly<RailwayPostgresWorkerServiceOptions>,
): RailwayWorkerSchedulerServiceClock {
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
    !options ||
    typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    typeof options.ownerKey !== "string" ||
    !workerSchedulerOwnerKeyPattern.test(options.ownerKey) ||
    externalCampaignQueueSelected === campaignQueueRuntimeSelected ||
    typeof options.postgresTelemetry?.recordIdleClientError !== "function" ||
    typeof options.schedulerTelemetry?.recordRunFailure !== "function" ||
    typeof options.schedulerTelemetry?.recordTimerFailure !== "function" ||
    typeof options.schedulerTelemetry?.recordOverlapSuppressed !== "function" ||
    (options.campaignDeliveries !== undefined && (
      !options.campaignDeliveries ||
      typeof options.campaignDeliveries !== "object" ||
      Object.keys(options.campaignDeliveries).some(
        (key) => !campaignDeliveryOptionKeys.includes(key),
      ) ||
      !options.campaignDeliveries.environment ||
      typeof options.campaignDeliveries.environment !== "object" ||
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
      !options.messageTemplateSubmissions.environment ||
      typeof options.messageTemplateSubmissions.environment !== "object" ||
      messageTemplatePublisherSelected === messageTemplateQueueRuntimeSelected ||
      typeof options.messageTemplateSubmissions.telemetrySink?.record !== "function"
    )) ||
    (options.metaWebhooks !== undefined && (
      !options.metaWebhooks ||
      typeof options.metaWebhooks !== "object" ||
      Object.keys(options.metaWebhooks).some(
        (key) => !metaWebhookOptionKeys.includes(key),
      ) ||
      !options.metaWebhooks.environment ||
      typeof options.metaWebhooks.environment !== "object" ||
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
    ))
  ) {
    throw new Error("Railway PostgreSQL worker service options are invalid");
  }

  const clock = options.clock ?? systemClock;
  if (typeof clock.now !== "function") {
    throw new Error("Railway PostgreSQL worker service options are invalid");
  }

  return clock;
}

function requireTeamInvitationProvider(
  value: Readonly<TeamInvitationProvider>,
): Readonly<TeamInvitationProvider> {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).sort().join(",") !== "invite,isConfigured,lookup" ||
    typeof value.isConfigured !== "function" ||
    typeof value.invite !== "function" ||
    typeof value.lookup !== "function"
  ) {
    throw new Error("Railway PostgreSQL invitation provider is invalid");
  }

  return value;
}

function requireQueueRuntime(
  value: Readonly<RailwayMessageTemplateSubmissionQueueRuntime>,
): Readonly<RailwayMessageTemplateSubmissionQueueRuntime> {
  if (
    !value || typeof value !== "object" ||
    Object.keys(value).sort().join(",") !==
      "cleanExpiredDeadLetters,close,publisher,start" ||
    typeof value.publisher?.publish !== "function" ||
    typeof value.start !== "function" ||
    typeof value.cleanExpiredDeadLetters !== "function" ||
    typeof value.close !== "function"
  ) {
    throw new Error("Railway PostgreSQL worker queue runtime is invalid");
  }

  return value;
}

function requireCampaignQueueRuntime(
  value: Readonly<RailwayCampaignDeliveryQueueRuntime>,
): Readonly<RailwayCampaignDeliveryQueueRuntime> {
  if (
    !value || typeof value !== "object" ||
    Object.keys(value).sort().join(",") !==
      "cleanExpiredDeadLetters,close,queue,start" ||
    typeof value.queue?.sendBatch !== "function" ||
    typeof value.start !== "function" ||
    typeof value.cleanExpiredDeadLetters !== "function" ||
    typeof value.close !== "function"
  ) {
    throw new Error(
      "Railway PostgreSQL campaign queue runtime is invalid",
    );
  }

  return value;
}

function requireMetaWebhookQueueRuntime(
  value: Readonly<RailwayMetaWebhookQueueRuntime>,
): Readonly<RailwayMetaWebhookQueueRuntime> {
  if (
    !value || typeof value !== "object" ||
    Object.keys(value).sort().join(",") !==
      "cleanExpiredDeadLetters,close,start" ||
    typeof value.start !== "function" ||
    typeof value.cleanExpiredDeadLetters !== "function" ||
    typeof value.close !== "function"
  ) {
    throw new Error(
      "Railway PostgreSQL Meta webhook queue runtime is invalid",
    );
  }

  return value;
}

function requireTeamInvitationQueueRuntime(
  value: Readonly<RailwayTeamInvitationQueueRuntime>,
): Readonly<RailwayTeamInvitationQueueRuntime> {
  if (
    !value || typeof value !== "object" ||
    Object.keys(value).sort().join(",") !==
      "cleanExpiredDeadLetters,close,start" ||
    typeof value.start !== "function" ||
    typeof value.cleanExpiredDeadLetters !== "function" ||
    typeof value.close !== "function"
  ) {
    throw new Error(
      "Railway PostgreSQL team invitation queue runtime is invalid",
    );
  }

  return value;
}

interface QueueRuntimeLifecycle {
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
}

async function closeQueuesThenFoundation(
  queueRuntimes: readonly Readonly<QueueRuntimeLifecycle>[],
  closeFoundation: () => Promise<void>,
): Promise<void> {
  let failed = false;

  const queueResults = await Promise.allSettled(
    queueRuntimes.map((queueRuntime) => queueRuntime.close()),
  );
  if (queueResults.some((result) => result.status === "rejected")) {
    failed = true;
  }

  try {
    await closeFoundation();
  } catch {
    failed = true;
  }

  if (failed) {
    throw new Error("Railway PostgreSQL worker shutdown failed");
  }
}

type RailwayPostgresWorkerFoundationErrorCode =
  | "configuration-disabled"
  | "configuration-incomplete"
  | "configuration-invalid";

class RailwayPostgresWorkerFoundationError extends Error {
  readonly code: RailwayPostgresWorkerFoundationErrorCode;

  constructor(code: RailwayPostgresWorkerFoundationErrorCode) {
    super(`Railway PostgreSQL worker foundation failed: ${code}`);
    this.name = "RailwayPostgresWorkerFoundationError";
    this.code = code;
  }
}

/**
 * Worker-only PostgreSQL composition. Keeping this closure limited to the
 * four admitted queue families prevents dormant staging repositories and
 * provider-send adapters from becoming worker runtime dependencies.
 */
function createRailwayPostgresWorkerFoundation(
  environment: NodePostgresPoolEnvironment | undefined,
  telemetry: NodePostgresPoolTelemetry,
) {
  const configurationState = inspectNodePostgresPoolConfiguration(
    environment,
  );
  if (configurationState.status !== "configured") {
    throw new RailwayPostgresWorkerFoundationError(
      configurationState.status === "disabled"
        ? "configuration-disabled"
        : configurationState.status === "incomplete"
          ? "configuration-incomplete"
          : "configuration-invalid",
    );
  }

  const pool = createNodePostgresPool(
    configurationState.configuration,
    telemetry,
  );
  const queries = createNodePostgresQueryExecutor(pool);
  const transactions = createNodePostgresTransactionManager(pool);
  const meta = createPostgresMetaRepository({ queries, transactions });
  let closed = false;

  return Object.freeze({
    aiAgents: createPostgresAiAgentRepository({ queries, transactions }),
    aiReplyOutbox: createPostgresAiReplyOutboxRepository({
      queries,
      transactions,
    }),
    aiRuntime: createPostgresAiRuntimePersistence({ queries, transactions }),
    botFlows: createPostgresBotFlowRepository({ queries, transactions }),
    botRuntime: createPostgresBotRuntimeRepository({ queries, transactions }),
    botReplyDeliveries: createPostgresBotReplyDeliveryRepository({
      queries,
      transactions,
    }),
    botReplyProviderLinks:
      createPostgresBotReplyDeliveryProviderRepository({ transactions }),
    campaignDispatch: createPostgresCampaignDispatchRepository(queries),
    campaignProviderDeliveries:
      createPostgresCampaignDeliveryProviderRepository({ transactions }),
    campaigns: createPostgresCampaignRepository({ queries, transactions }),
    conversations: createPostgresConversationRepository({
      queries,
      transactions,
    }),
    identityOrganizations:
      createPostgresClerkOrganizationBindingRepository(queries),
    invitationDeliveries:
      createPostgresTeamInvitationDeliveryRepository({ queries }),
    invitationExpirations:
      createPostgresTeamInvitationExpirationRepository({ queries }),
    invitations: createPostgresTeamInvitationRepository({
      queries,
      transactions,
    }),
    messageTemplates: createPostgresMessageTemplateRepository({
      queries,
      transactions,
    }),
    messageTemplateSubmissionOutbox:
      createPostgresMessageTemplateSubmissionOutboxRepository({
        queries,
        transactions,
      }),
    metaCredentialEnvelopes:
      createPostgresMetaCredentialRepository(queries),
    metaWebhooks: Object.freeze({
      findConnectionByWabaId: meta.findConnectionByWabaId,
      claimWebhookReceipt: meta.claimWebhookReceipt,
      completeWebhookReceipt: meta.completeWebhookReceipt,
      failWebhookReceipt: meta.failWebhookReceipt,
    }),
    whatsappDeliveryPolicyMetaConnections: Object.freeze({
      findConnectionByTenantId: meta.findConnectionByTenantId,
    }),
    whatsappDeliveryPolicies:
      createPostgresWhatsappCampaignDeliveryPolicyRepository({
        queries,
        transactions,
      }),
    whatsappRateLimits: createPostgresWhatsappRateLimitRepository({
      queries,
      transactions,
    }),
    workerSchedulerLeases:
      createPostgresWorkerSchedulerLeaseRepository(queries),
    createMutationRateLimitBinding(
      policy: Parameters<typeof createPostgresMutationRateLimitBinding>[1],
    ) {
      return createPostgresMutationRateLimitBinding(transactions, policy);
    },
    async close() {
      if (closed) {
        return;
      }
      closed = true;
      await pool.end();
    },
  });
}

export async function createRailwayPostgresWorkerService(
  options: Readonly<RailwayPostgresWorkerServiceOptions>,
): Promise<Readonly<RailwayWorkerSchedulerService>> {
  const clock = requireOptions(options);
  const foundation = createRailwayPostgresWorkerFoundation(
    options.environment,
    options.postgresTelemetry,
  );
  let messageTemplateSubmissionQueueRuntime:
    Readonly<RailwayMessageTemplateSubmissionQueueRuntime> | null = null;
  let campaignDeliveryQueueRuntime:
    Readonly<RailwayCampaignDeliveryQueueRuntime> | null = null;
  let metaWebhookQueueRuntime:
    Readonly<RailwayMetaWebhookQueueRuntime> | null = null;
  let teamInvitationQueueRuntime:
    Readonly<RailwayTeamInvitationQueueRuntime> | null = null;
  const queueRuntimes: QueueRuntimeLifecycle[] = [];
  const queueMaintenanceTasks: Array<Readonly<{
    run: () => Promise<unknown>;
  }>> = [];

  try {
    let campaignQueue = options.campaignQueue;
    if (options.campaignDeliveries !== undefined) {
      const {
        createQueueRuntime,
        environment,
        ...campaignOptions
      } = options.campaignDeliveries;
      const consumer = createRailwayCampaignDeliveryConsumerRuntime({
        ...campaignOptions,
        environment,
        dispatch: foundation.campaignDispatch,
        campaigns: foundation.campaigns,
        providerDeliveries: foundation.campaignProviderDeliveries,
        metaConnections:
          foundation.whatsappDeliveryPolicyMetaConnections,
        credentials: foundation.metaCredentialEnvelopes,
        deliveryPolicies: foundation.whatsappDeliveryPolicies,
        rateLimits: foundation.whatsappRateLimits,
        clock,
      });
      campaignDeliveryQueueRuntime = requireCampaignQueueRuntime(
        createQueueRuntime({ consumer }),
      );
      queueRuntimes.push(campaignDeliveryQueueRuntime);
      campaignQueue = campaignDeliveryQueueRuntime.queue;
      queueMaintenanceTasks.push(Object.freeze({
        run: () =>
          campaignDeliveryQueueRuntime!.cleanExpiredDeadLetters(),
      }));
    }

    const botReplyProcessor = createUnavailableBotReplyProcessor();

    if (options.metaWebhooks !== undefined) {
      const metaConfiguration = requireMetaWebhookConfiguration(
        options.metaWebhooks.environment,
      );
      const inboundRuntime = createInboundAutomationProcessor(
        createBotInboundRuntimeProcessor(
          createBotRuntimeService(
            foundation.botFlows,
            foundation.botRuntime,
          ),
          foundation.botReplyDeliveries,
          botReplyProcessor,
          clock,
        ),
        createAiInboundRuntimeProcessor(
          foundation.botRuntime,
          createActiveAiRuntimeAgentLoader(foundation.aiAgents),
          createAiRuntimeService({
            retriever: unavailableAiKnowledgeRetriever,
            costGate: foundation.aiRuntime.costGate,
            provider: unavailableAiResponseProvider,
            audit: foundation.aiRuntime.auditSink,
          }),
          foundation.aiReplyOutbox,
        ),
      );
      const processor = createMetaWebhookEventDispatcher(
        createMetaWebhookBusinessBatchProcessor({
          conversations: foundation.conversations,
          templates: foundation.messageTemplates,
          campaignStatuses: createCampaignDeliveryStatusReconciler(
            foundation.campaignProviderDeliveries,
            foundation.whatsappRateLimits,
            clock,
          ),
          botReplyStatuses: createBotReplyDeliveryStatusReconciler(
            foundation.botReplyProviderLinks,
            foundation.whatsappRateLimits,
            clock,
          ),
          inboundRuntime,
        }),
      );
      const consumer = observeMetaWebhookQueueHandler(
        createMetaWebhookQueueConsumer(
          createMetaWebhookIngress(
            foundation.metaWebhooks,
            processor,
            metaConfiguration.appSecret,
          ),
        ),
        options.metaWebhooks.telemetrySink,
        clock,
      );
      metaWebhookQueueRuntime = requireMetaWebhookQueueRuntime(
        options.metaWebhooks.createQueueRuntime({ consumer }),
      );
      queueRuntimes.push(metaWebhookQueueRuntime);
      queueMaintenanceTasks.push(Object.freeze({
        run: () => metaWebhookQueueRuntime!.cleanExpiredDeadLetters(),
      }));
    }

    if (options.teamInvitations !== undefined) {
      const providerRequestTelemetry =
        createProviderRequestTelemetryScope();
      const invitationProvider = requireTeamInvitationProvider(
        options.teamInvitations.createProvider({
          identityOrganizations: foundation.identityOrganizations,
          createMutationRateLimitBinding:
            foundation.createMutationRateLimitBinding,
          providerRequestTelemetry,
          telemetryClock: clock,
        }),
      );
      const invitationProcessor = observeTeamInvitationDispatchProcessor(
        createTeamInvitationDispatchProcessor(
          foundation.invitationDeliveries,
          invitationProvider,
          () => clock.now().toISOString(),
        ),
        options.teamInvitations.telemetrySink,
        clock,
        providerRequestTelemetry,
      );
      const consumer = createTeamInvitationQueueConsumer(
        invitationProcessor,
        invitationProvider,
      );
      teamInvitationQueueRuntime = requireTeamInvitationQueueRuntime(
        options.teamInvitations.createQueueRuntime({ consumer }),
      );
      queueRuntimes.push(teamInvitationQueueRuntime);
      queueMaintenanceTasks.push(Object.freeze({
        run: () =>
          teamInvitationQueueRuntime!.cleanExpiredDeadLetters(),
      }));
    }

    let messageTemplateSubmissions;
    if (options.messageTemplateSubmissions !== undefined) {
      const providerRequestTelemetry =
        createProviderRequestTelemetryScope();
      const {
        createQueueRuntime,
        publisher: selectedPublisher,
        telemetrySink,
        ...maintenanceOptions
      } = options.messageTemplateSubmissions;
      const publisher = createQueueRuntime === undefined
        ? selectedPublisher as MessageTemplateSubmissionQueuePublisher
        : (() => {
            const worker =
              createRailwayMessageTemplateSubmissionWorkerRuntime({
                environment: maintenanceOptions.environment,
                outbox: foundation.messageTemplateSubmissionOutbox,
                credentials: foundation.metaCredentialEnvelopes,
                transportOptions: maintenanceOptions.transportOptions,
                credentialVaultOptions:
                  maintenanceOptions.credentialVaultOptions,
                clock: () => clock.now().toISOString(),
                telemetrySink,
                telemetryClock: clock,
              });
            const consumer = createMessageTemplateSubmissionQueueConsumer(
              worker,
            );
            messageTemplateSubmissionQueueRuntime = requireQueueRuntime(
              createQueueRuntime({ consumer }),
            );
            queueRuntimes.push(messageTemplateSubmissionQueueRuntime);
            return messageTemplateSubmissionQueueRuntime.publisher;
          })();
      messageTemplateSubmissions =
        observeMessageTemplateSubmissionMaintenance(
          createRailwayMessageTemplateSubmissionMaintenanceRuntime({
            ...maintenanceOptions,
            publisher,
            outbox: foundation.messageTemplateSubmissionOutbox,
            templates: foundation.messageTemplates,
            credentials: foundation.metaCredentialEnvelopes,
            clock: () => clock.now().toISOString(),
            providerRequestTelemetry: {
              scope: providerRequestTelemetry,
              clock,
            },
          }),
          telemetrySink,
          clock,
          providerRequestTelemetry,
        );

      if (messageTemplateSubmissionQueueRuntime !== null) {
        const maintenance = messageTemplateSubmissions;
        const queueRuntime = messageTemplateSubmissionQueueRuntime;
        messageTemplateSubmissions = Object.freeze({
          async run() {
            const results = await Promise.allSettled([
              maintenance.run(),
              queueRuntime.cleanExpiredDeadLetters(),
            ]);
            if (results.some((result) => result.status === "rejected")) {
              throw new Error(
                "Railway template submission maintenance failed",
              );
            }
            return results[0].status === "fulfilled"
              ? results[0].value
              : undefined;
          },
        });
      }
    }
    const runtime = createRailwayWorkerRuntime({
      ownerKey: options.ownerKey,
      leases: foundation.workerSchedulerLeases,
      campaignDispatch: foundation.campaignDispatch,
      campaignQueue: campaignQueue!,
      campaignDeliveryMaintenance: queueMaintenanceTasks.length === 0
        ? undefined
        : Object.freeze({
            async run() {
              const results = await Promise.allSettled(
                queueMaintenanceTasks.map((task) => task.run()),
              );
              if (results.some((result) => result.status === "rejected")) {
                throw new Error("Railway queue maintenance failed");
              }
            },
          }),
      invitationExpirations: foundation.invitationExpirations,
      invitations: foundation.invitations,
      messageTemplateSubmissions,
      clock,
      close: () => closeQueuesThenFoundation(
        queueRuntimes,
        foundation.close,
      ),
    });

    const schedulerService = createRailwayWorkerSchedulerService({
      runtime,
      telemetry: options.schedulerTelemetry,
      clock,
    });

    if (queueRuntimes.length === 0) {
      return schedulerService;
    }

    const managedQueueRuntimes = Object.freeze([...queueRuntimes]);
    let started = false;
    let closed = false;
    let starting: Promise<void> | null = null;
    let closing: Promise<void> | null = null;

    return Object.freeze({
      async start() {
        if (closed) {
          throw new Error("Railway PostgreSQL worker is already closed");
        }
        if (started) {
          return;
        }
        if (starting === null) {
          starting = (async () => {
            try {
              await Promise.all(
                managedQueueRuntimes.map((runtime) => runtime.start()),
              );
              await schedulerService.start();
              started = true;
            } catch {
              try {
                await schedulerService.close();
              } catch {
                // Startup remains one bounded failure after cleanup.
              }
              closed = true;
              throw new Error("Railway PostgreSQL worker startup failed");
            }
          })();
        }

        try {
          await starting;
        } finally {
          starting = null;
        }
      },
      async close() {
        if (closed && closing === null) {
          return;
        }
        if (closing === null) {
          closing = (async () => {
            if (starting !== null) {
              try {
                await starting;
              } catch {
                // Failed startup already attempts the same cleanup.
              }
            }
            try {
              await schedulerService.close();
            } finally {
              started = false;
              closed = true;
            }
          })();
        }

        await closing;
      },
    });
  } catch (error) {
    try {
      await closeQueuesThenFoundation(
        queueRuntimes,
        foundation.close,
      );
    } catch {
      // Composition remains one bounded failure after cleanup is attempted.
    }
    throw error;
  }
}
