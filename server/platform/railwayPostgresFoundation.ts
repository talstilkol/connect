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
  createContactListService,
} from "../contacts/contactService.ts";
import {
  createContactImportService,
} from "../contacts/contactImportService.ts";
import {
  createContactOrganizationService,
} from "../contacts/contactOrganizationService.ts";
import {
  createOperationalReportService,
} from "../reports/operationalReportService.ts";
import {
  createMetaConnectionService,
} from "../meta/metaConnectionService.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import {
  createPostgresBusinessProfileRepository,
} from "./postgresBusinessProfileRepository.ts";
import {
  createPostgresClerkOrganizationBindingRepository,
} from "./postgresClerkOrganizationBindingRepository.ts";
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
  createPostgresBotReplyStagingRunRepository,
} from "./postgresBotReplyStagingRunRepository.ts";
import {
  createPostgresBotReplyStagingSafetyRepository,
} from "./postgresBotReplyStagingSafetyRepository.ts";
import {
  createPostgresBotReplyStagingReleaseEvidenceRepository,
} from "./postgresBotReplyStagingReleaseEvidenceRepository.ts";
import type {
  RailwayBotReplyStagingCrossServiceEvidenceClock,
} from "./railwayBotReplyStagingCrossServiceEvidence.ts";
import type {
  RailwayBotReplyStagingReleaseIdentity,
} from "./railwayBotReplyStagingReleaseEvidenceIssuer.ts";
import {
  createPostgresBotReplyStagingServiceWindowSource,
} from "./postgresBotReplyStagingServiceWindowSource.ts";
import {
  createPostgresBotReplyStagingDurableObservationReader,
} from "./postgresBotReplyStagingDurableObservationReader.ts";
import {
  createPostgresBotReplyStagingDurableObservationWriter,
} from "./postgresBotReplyStagingDurableObservationWriter.ts";
import {
  createPostgresBotReplyStagingWebhookObservationProducer,
} from "./postgresBotReplyStagingWebhookObservationProducer.ts";
import {
  createPostgresBotReplyStagingProviderDeferralObservationProducer,
} from "./postgresBotReplyStagingProviderDeferralObservationProducer.ts";
import {
  createPostgresBotReplyStagingSendObservationProducer,
} from "./postgresBotReplyStagingSendObservationProducer.ts";
import {
  createPostgresCampaignDispatchRepository,
} from "./postgresCampaignDispatchRepository.ts";
import {
  createPostgresCampaignDeliveryProviderRepository,
} from "./postgresCampaignDeliveryProviderRepository.ts";
import {
  createPostgresCampaignAudienceRepository,
} from "./postgresCampaignAudienceRepository.ts";
import {
  createPostgresCampaignRepository,
} from "./postgresCampaignRepository.ts";
import {
  createPostgresContactReadRepository,
} from "./postgresContactReadRepository.ts";
import {
  createPostgresContactConsentRepository,
} from "./postgresContactConsentRepository.ts";
import {
  createPostgresConversationRepository,
} from "./postgresConversationRepository.ts";
import {
  createPostgresContactImportRepository,
} from "./postgresContactImportRepository.ts";
import {
  createPostgresContactOrganizationRepository,
} from "./postgresContactOrganizationRepository.ts";
import {
  createPostgresOperationalReportRepository,
} from "./postgresOperationalReportRepository.ts";
import {
  createPostgresMetaCredentialRepository,
} from "./postgresMetaCredentialRepository.ts";
import {
  createPostgresMessageTemplateRepository,
} from "./postgresMessageTemplateRepository.ts";
import {
  createPostgresMessageTemplateSubmissionOutboxRepository,
} from "./postgresMessageTemplateSubmissionOutboxRepository.ts";
import {
  createPostgresKnowledgePassageRepository,
} from "./postgresKnowledgePassageRepository.ts";
import {
  createPostgresKnowledgeSourceRepository,
} from "./postgresKnowledgeSourceRepository.ts";
import {
  createPostgresMetaRepository,
} from "./postgresMetaRepository.ts";
import {
  createPostgresWhatsappCampaignDeliveryPolicyRepository,
} from "./postgresWhatsappCampaignDeliveryPolicyRepository.ts";
import {
  createPostgresWhatsappRateLimitRepository,
} from "./postgresWhatsappRateLimitRepository.ts";
import {
  createPostgresWorkerSchedulerLeaseRepository,
} from "./postgresWorkerSchedulerLeaseRepository.ts";
import {
  createPostgresReadinessProbe,
} from "./postgresReadinessProbe.ts";
import {
  createPostgresRailwayApiMutationExecutor,
} from "./postgresRailwayApiMutationExecutor.ts";
import {
  createPostgresRailwayContactOrganizationMutationExecutor,
} from "./postgresRailwayContactOrganizationMutationExecutor.ts";
import {
  createPostgresRailwayContactImportMutationExecutor,
} from "./postgresRailwayContactImportMutationExecutor.ts";
import {
  createPostgresRailwayConversationMutationExecutor,
} from "./postgresRailwayConversationMutationExecutor.ts";
import {
  createPostgresRailwayAiAgentMutationExecutor,
} from "./postgresRailwayAiAgentMutationExecutor.ts";
import {
  createPostgresRailwayBotFlowMutationExecutor,
} from "./postgresRailwayBotFlowMutationExecutor.ts";
import {
  createPostgresRailwayCampaignMutationExecutor,
} from "./postgresRailwayCampaignMutationExecutor.ts";
import {
  createPostgresRailwayAiReplyApprovalMutationExecutor,
} from "./postgresRailwayAiReplyApprovalMutationExecutor.ts";
import {
  createPostgresRailwayMessageTemplateDraftMutationExecutor,
} from "./postgresRailwayMessageTemplateDraftMutationExecutor.ts";
import {
  createPostgresRailwayMessageTemplateSubmissionMutationExecutor,
} from "./postgresRailwayMessageTemplateSubmissionMutationExecutor.ts";
import {
  createPostgresRailwayOnboardingBusinessProfileMutationExecutor,
} from "./postgresRailwayOnboardingBusinessProfileMutationExecutor.ts";
import {
  createPostgresRailwayTenantSelectionMutationExecutor,
} from "./postgresRailwayTenantSelectionMutationExecutor.ts";
import {
  createPostgresTeamInvitationAcceptanceRepository,
} from "./postgresTeamInvitationAcceptanceRepository.ts";
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
  createPostgresTenantMembershipMutationRepository,
} from "./postgresTenantMembershipMutationRepository.ts";
import {
  createPostgresTenantMembershipRepository,
} from "./postgresTenantMembershipRepository.ts";
import {
  createPostgresTenantSelectionRepository,
} from "./postgresTenantSelectionRepository.ts";
import {
  createPostgresTenantSubscriptionRepository,
} from "./postgresTenantSubscriptionRepository.ts";
import {
  createPostgresTenantProvisioningRepository,
} from "./postgresTenantProvisioningRepository.ts";
import {
  createPostgresProductionDecisionRepository,
} from "./postgresProductionDecisionRepository.ts";
import {
  createPostgresSystemAdminBusinessProfileRepository,
} from "./postgresSystemAdminBusinessProfileRepository.ts";
import {
  createPostgresSystemAdminTenantDirectoryRepository,
} from "./postgresSystemAdminTenantDirectoryRepository.ts";
import {
  createPostgresMutationRateLimitBinding,
  type PostgresMutationRateLimitPolicy,
} from "./postgresMutationRateLimitBinding.ts";

export type RailwayPostgresFoundationErrorCode =
  | "configuration-disabled"
  | "configuration-incomplete"
  | "configuration-invalid"
  | "options-invalid";

export class RailwayPostgresFoundationError extends Error {
  readonly code: RailwayPostgresFoundationErrorCode;

  constructor(code: RailwayPostgresFoundationErrorCode) {
    super(`Railway PostgreSQL foundation failed: ${code}`);
    this.name = "RailwayPostgresFoundationError";
    this.code = code;
  }
}

export interface RailwayPostgresFoundationOptions {
  readonly environment?: NodePostgresPoolEnvironment;
  readonly telemetry: NodePostgresPoolTelemetry;
}

export interface RailwayPostgresFoundation {
  readonly readiness: ReturnType<typeof createPostgresReadinessProbe>;
  readonly aiAgents: ReturnType<typeof createPostgresAiAgentRepository>;
  readonly aiReplyOutbox: ReturnType<
    typeof createPostgresAiReplyOutboxRepository
  >;
  readonly aiRuntime: ReturnType<typeof createPostgresAiRuntimePersistence>;
  readonly botFlows: ReturnType<typeof createPostgresBotFlowRepository>;
  readonly botRuntime: ReturnType<typeof createPostgresBotRuntimeRepository>;
  readonly botReplyDeliveries: ReturnType<
    typeof createPostgresBotReplyDeliveryRepository
  >;
  readonly botReplyProviderLinks: ReturnType<
    typeof createPostgresBotReplyDeliveryProviderRepository
  >;
  readonly botReplyStagingRuns: ReturnType<
    typeof createPostgresBotReplyStagingRunRepository
  >;
  readonly botReplyStagingSafety: ReturnType<
    typeof createPostgresBotReplyStagingSafetyRepository
  >;
  readonly createBotReplyStagingReleaseEvidenceRepository: (
    release: Readonly<RailwayBotReplyStagingReleaseIdentity>,
    clock: Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>,
  ) => ReturnType<
    typeof createPostgresBotReplyStagingReleaseEvidenceRepository
  >;
  readonly botReplyStagingServiceWindows: ReturnType<
    typeof createPostgresBotReplyStagingServiceWindowSource
  >;
  readonly botReplyStagingObservations: ReturnType<
    typeof createPostgresBotReplyStagingDurableObservationReader
  >;
  readonly botReplyStagingObservationWriter: ReturnType<
    typeof createPostgresBotReplyStagingDurableObservationWriter
  >;
  readonly botReplyStagingWebhookObservations: ReturnType<
    typeof createPostgresBotReplyStagingWebhookObservationProducer
  >;
  readonly botReplyStagingProviderDeferralObservations: ReturnType<
    typeof createPostgresBotReplyStagingProviderDeferralObservationProducer
  >;
  readonly botReplyStagingSendObservations: ReturnType<
    typeof createPostgresBotReplyStagingSendObservationProducer
  >;
  readonly contacts: ReturnType<typeof createContactListService>;
  readonly contactConsents: ReturnType<
    typeof createPostgresContactConsentRepository
  >;
  readonly conversations: ReturnType<
    typeof createPostgresConversationRepository
  >;
  readonly contactOrganization: ReturnType<
    typeof createContactOrganizationService
  >;
  readonly contactImports: ReturnType<typeof createContactImportService>;
  readonly metaConnections: ReturnType<typeof createMetaConnectionService>;
  readonly metaWebhooks: Pick<
    MetaRepository,
    | "findConnectionByWabaId"
    | "claimWebhookReceipt"
    | "completeWebhookReceipt"
    | "failWebhookReceipt"
  >;
  readonly whatsappDeliveryPolicyMetaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  readonly metaCredentialEnvelopes: ReturnType<
    typeof createPostgresMetaCredentialRepository
  >;
  readonly messageTemplates: ReturnType<
    typeof createPostgresMessageTemplateRepository
  >;
  readonly messageTemplateSubmissionOutbox: ReturnType<
    typeof createPostgresMessageTemplateSubmissionOutboxRepository
  >;
  readonly knowledgePassages: ReturnType<
    typeof createPostgresKnowledgePassageRepository
  >;
  readonly knowledgeSources: ReturnType<
    typeof createPostgresKnowledgeSourceRepository
  >;
  readonly whatsappDeliveryPolicies: ReturnType<
    typeof createPostgresWhatsappCampaignDeliveryPolicyRepository
  >;
  readonly whatsappRateLimits: ReturnType<
    typeof createPostgresWhatsappRateLimitRepository
  >;
  readonly workerSchedulerLeases: ReturnType<
    typeof createPostgresWorkerSchedulerLeaseRepository
  >;
  readonly campaignAudiences: ReturnType<
    typeof createPostgresCampaignAudienceRepository
  >;
  readonly campaignDispatch: ReturnType<
    typeof createPostgresCampaignDispatchRepository
  >;
  readonly campaignProviderDeliveries: ReturnType<
    typeof createPostgresCampaignDeliveryProviderRepository
  >;
  readonly campaigns: ReturnType<
    typeof createPostgresCampaignRepository
  >;
  readonly reports: ReturnType<typeof createOperationalReportService>;
  readonly memberships: ReturnType<
    typeof createPostgresTenantMembershipRepository
  >;
  readonly identityOrganizations: ReturnType<
    typeof createPostgresClerkOrganizationBindingRepository
  >;
  readonly membershipMutations: ReturnType<
    typeof createPostgresTenantMembershipMutationRepository
  >;
  readonly selections: ReturnType<
    typeof createPostgresTenantSelectionRepository
  >;
  readonly subscriptions: ReturnType<
    typeof createPostgresTenantSubscriptionRepository
  >;
  readonly provisioning: ReturnType<
    typeof createPostgresTenantProvisioningRepository
  >;
  readonly productionDecisions: ReturnType<
    typeof createPostgresProductionDecisionRepository
  >;
  readonly systemAdminBusinessProfiles: ReturnType<
    typeof createPostgresSystemAdminBusinessProfileRepository
  >;
  readonly systemAdminTenantDirectory: ReturnType<
    typeof createPostgresSystemAdminTenantDirectoryRepository
  >;
  readonly businessProfiles: ReturnType<
    typeof createPostgresBusinessProfileRepository
  >;
  readonly railwayApiMutations: ReturnType<
    typeof createPostgresRailwayApiMutationExecutor
  >;
  readonly railwayContactOrganizationMutations: ReturnType<
    typeof createPostgresRailwayContactOrganizationMutationExecutor
  >;
  readonly railwayContactImportMutations: ReturnType<
    typeof createPostgresRailwayContactImportMutationExecutor
  >;
  readonly railwayConversationMutations: ReturnType<
    typeof createPostgresRailwayConversationMutationExecutor
  >;
  readonly railwayBotFlowMutations: ReturnType<
    typeof createPostgresRailwayBotFlowMutationExecutor
  >;
  readonly railwayAiAgentMutations: ReturnType<
    typeof createPostgresRailwayAiAgentMutationExecutor
  >;
  readonly railwayAiReplyApprovalMutations: ReturnType<
    typeof createPostgresRailwayAiReplyApprovalMutationExecutor
  >;
  readonly railwayOnboardingBusinessProfileMutations: ReturnType<
    typeof createPostgresRailwayOnboardingBusinessProfileMutationExecutor
  >;
  readonly railwayTenantSelectionMutations: ReturnType<
    typeof createPostgresRailwayTenantSelectionMutationExecutor
  >;
  readonly createRailwayCampaignMutationExecutor: (
    deliveryConfigured: () => boolean,
  ) => ReturnType<typeof createPostgresRailwayCampaignMutationExecutor>;
  readonly railwayMessageTemplateDraftMutations: ReturnType<
    typeof createPostgresRailwayMessageTemplateDraftMutationExecutor
  >;
  readonly createRailwayMessageTemplateSubmissionMutationExecutor: (
    graphApiVersion: string,
    clock?: () => string,
  ) => ReturnType<
    typeof createPostgresRailwayMessageTemplateSubmissionMutationExecutor
  >;
  readonly createMutationRateLimitBinding: (
    policy: Readonly<PostgresMutationRateLimitPolicy>,
  ) => ReturnType<typeof createPostgresMutationRateLimitBinding>;
  readonly invitations: ReturnType<
    typeof createPostgresTeamInvitationRepository
  >;
  readonly invitationExpirations: ReturnType<
    typeof createPostgresTeamInvitationExpirationRepository
  >;
  readonly invitationDeliveries: ReturnType<
    typeof createPostgresTeamInvitationDeliveryRepository
  >;
  readonly invitationAcceptances: ReturnType<
    typeof createPostgresTeamInvitationAcceptanceRepository
  >;
  readonly close: () => Promise<void>;
}

function requireOptions(
  options: Readonly<RailwayPostgresFoundationOptions>,
): void {
  if (!options || typeof options !== "object") {
    throw new RailwayPostgresFoundationError("options-invalid");
  }

  const keys = Object.keys(options).sort();
  const expectedKeys = options.environment === undefined
    ? ["telemetry"]
    : ["environment", "telemetry"];

  if (
    JSON.stringify(keys) !== JSON.stringify(expectedKeys) ||
    !options.telemetry ||
    typeof options.telemetry.recordIdleClientError !== "function"
  ) {
    throw new RailwayPostgresFoundationError("options-invalid");
  }
}

function configurationError(
  status: "disabled" | "incomplete" | "invalid",
): RailwayPostgresFoundationError {
  return new RailwayPostgresFoundationError(
    status === "disabled"
      ? "configuration-disabled"
      : status === "incomplete"
        ? "configuration-incomplete"
        : "configuration-invalid",
  );
}

export function createRailwayPostgresFoundation(
  options: Readonly<RailwayPostgresFoundationOptions>,
): Readonly<RailwayPostgresFoundation> {
  requireOptions(options);
  const configurationState = inspectNodePostgresPoolConfiguration(
    options.environment,
  );

  if (configurationState.status !== "configured") {
    throw configurationError(configurationState.status);
  }

  const pool = createNodePostgresPool(
    configurationState.configuration,
    options.telemetry,
  );
  const queries = createNodePostgresQueryExecutor(pool);
  const transactions = createNodePostgresTransactionManager(pool);
  const contactReads = createPostgresContactReadRepository(queries);
  const contactOrganization = createPostgresContactOrganizationRepository(
    queries,
  );
  const contactImports = createPostgresContactImportRepository({
    queries,
    transactions,
  });
  const meta = createPostgresMetaRepository({ queries, transactions });
  const botReplyStagingObservationWriter =
    createPostgresBotReplyStagingDurableObservationWriter(transactions);
  const botReplyStagingWebhookObservations =
    createPostgresBotReplyStagingWebhookObservationProducer({
      queries,
      writer: botReplyStagingObservationWriter,
      clock: Object.freeze({ now: () => new Date() }),
    });
  const botReplyStagingProviderDeferralObservations =
    createPostgresBotReplyStagingProviderDeferralObservationProducer({
      queries,
      writer: botReplyStagingObservationWriter,
      clock: Object.freeze({ now: () => new Date() }),
    });
  const botReplyStagingSendObservations =
    createPostgresBotReplyStagingSendObservationProducer({
      queries,
      writer: botReplyStagingObservationWriter,
      clock: Object.freeze({ now: () => new Date() }),
    });
  let closed = false;

  return Object.freeze({
    readiness: createPostgresReadinessProbe(queries),
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
      createPostgresBotReplyDeliveryProviderRepository({
        transactions,
      }),
    botReplyStagingRuns:
      createPostgresBotReplyStagingRunRepository(transactions),
    botReplyStagingSafety:
      createPostgresBotReplyStagingSafetyRepository({ queries }),
    createBotReplyStagingReleaseEvidenceRepository(
      release: Readonly<RailwayBotReplyStagingReleaseIdentity>,
      clock: Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>,
    ) {
      return createPostgresBotReplyStagingReleaseEvidenceRepository(
        transactions,
        release,
        clock,
      );
    },
    botReplyStagingServiceWindows:
      createPostgresBotReplyStagingServiceWindowSource(queries),
    botReplyStagingObservations:
      createPostgresBotReplyStagingDurableObservationReader({ query: queries }),
    botReplyStagingObservationWriter,
    botReplyStagingWebhookObservations,
    botReplyStagingProviderDeferralObservations,
    botReplyStagingSendObservations,
    contacts: createContactListService({ contacts: contactReads }),
    contactConsents: createPostgresContactConsentRepository({
      transactions,
    }),
    conversations: createPostgresConversationRepository({
      queries,
      transactions,
    }),
    contactOrganization: createContactOrganizationService(
      contactOrganization,
    ),
    contactImports: createContactImportService({
      contacts: contactReads,
      imports: contactImports,
    }),
    metaConnections: createMetaConnectionService(meta),
    metaWebhooks: Object.freeze({
      findConnectionByWabaId: meta.findConnectionByWabaId,
      claimWebhookReceipt: meta.claimWebhookReceipt,
      completeWebhookReceipt: meta.completeWebhookReceipt,
      failWebhookReceipt: meta.failWebhookReceipt,
    }),
    whatsappDeliveryPolicyMetaConnections: Object.freeze({
      findConnectionByTenantId: meta.findConnectionByTenantId,
    }),
    metaCredentialEnvelopes:
      createPostgresMetaCredentialRepository(queries),
    messageTemplates: createPostgresMessageTemplateRepository({
      queries,
      transactions,
    }),
    messageTemplateSubmissionOutbox:
      createPostgresMessageTemplateSubmissionOutboxRepository({
        queries,
        transactions,
      }),
    knowledgePassages: createPostgresKnowledgePassageRepository({
      queries,
      transactions,
    }),
    knowledgeSources: createPostgresKnowledgeSourceRepository({
      queries,
      transactions,
    }),
    whatsappDeliveryPolicies:
      createPostgresWhatsappCampaignDeliveryPolicyRepository({
        queries,
        transactions,
      }),
    whatsappRateLimits:
      createPostgresWhatsappRateLimitRepository({
        queries,
        transactions,
      }),
    workerSchedulerLeases:
      createPostgresWorkerSchedulerLeaseRepository(queries),
    campaignAudiences:
      createPostgresCampaignAudienceRepository(queries),
    campaignDispatch:
      createPostgresCampaignDispatchRepository(queries),
    campaignProviderDeliveries:
      createPostgresCampaignDeliveryProviderRepository({ transactions }),
    campaigns: createPostgresCampaignRepository({
      queries,
      transactions,
    }),
    reports: createOperationalReportService(
      createPostgresOperationalReportRepository(queries),
    ),
    identityOrganizations:
      createPostgresClerkOrganizationBindingRepository(queries),
    memberships: createPostgresTenantMembershipRepository(queries),
    membershipMutations:
      createPostgresTenantMembershipMutationRepository({
        queries,
        transactions,
      }),
    selections: createPostgresTenantSelectionRepository({
      queries,
      transactions,
    }),
    subscriptions: createPostgresTenantSubscriptionRepository({
      queries,
      transactions,
    }),
    provisioning: createPostgresTenantProvisioningRepository({
      queries,
      transactions,
    }),
    productionDecisions: createPostgresProductionDecisionRepository({
      queries,
      transactions,
    }),
    systemAdminBusinessProfiles:
      createPostgresSystemAdminBusinessProfileRepository({
        queries,
        transactions,
      }),
    systemAdminTenantDirectory:
      createPostgresSystemAdminTenantDirectoryRepository(queries),
    businessProfiles: createPostgresBusinessProfileRepository({
      queries,
      transactions,
    }),
    railwayApiMutations:
      createPostgresRailwayApiMutationExecutor(transactions),
    railwayContactOrganizationMutations:
      createPostgresRailwayContactOrganizationMutationExecutor(
        transactions,
      ),
    railwayContactImportMutations:
      createPostgresRailwayContactImportMutationExecutor(transactions),
    railwayConversationMutations:
      createPostgresRailwayConversationMutationExecutor(transactions),
    railwayBotFlowMutations:
      createPostgresRailwayBotFlowMutationExecutor(transactions),
    railwayAiAgentMutations:
      createPostgresRailwayAiAgentMutationExecutor(transactions),
    railwayAiReplyApprovalMutations:
      createPostgresRailwayAiReplyApprovalMutationExecutor(transactions),
    railwayOnboardingBusinessProfileMutations:
      createPostgresRailwayOnboardingBusinessProfileMutationExecutor(
        transactions,
      ),
    railwayTenantSelectionMutations:
      createPostgresRailwayTenantSelectionMutationExecutor(transactions),
    createRailwayCampaignMutationExecutor(
      deliveryConfigured: () => boolean,
    ) {
      return createPostgresRailwayCampaignMutationExecutor(
        transactions,
        deliveryConfigured,
      );
    },
    railwayMessageTemplateDraftMutations:
      createPostgresRailwayMessageTemplateDraftMutationExecutor(
        transactions,
      ),
    createRailwayMessageTemplateSubmissionMutationExecutor(
      graphApiVersion: string,
      clock?: () => string,
    ) {
      return createPostgresRailwayMessageTemplateSubmissionMutationExecutor(
        transactions,
        graphApiVersion,
        clock,
      );
    },
    createMutationRateLimitBinding(
      policy: Readonly<PostgresMutationRateLimitPolicy>,
    ) {
      return createPostgresMutationRateLimitBinding(transactions, policy);
    },
    invitations: createPostgresTeamInvitationRepository({
      queries,
      transactions,
    }),
    invitationExpirations:
      createPostgresTeamInvitationExpirationRepository({ queries }),
    invitationDeliveries:
      createPostgresTeamInvitationDeliveryRepository({ queries }),
    invitationAcceptances:
      createPostgresTeamInvitationAcceptanceRepository({ transactions }),
    async close() {
      if (closed) {
        return;
      }

      closed = true;
      await pool.end();
    },
  });
}
