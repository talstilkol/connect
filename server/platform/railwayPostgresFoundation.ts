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
  createPostgresCampaignDispatchRepository,
} from "./postgresCampaignDispatchRepository.ts";
import {
  createPostgresCampaignRepository,
} from "./postgresCampaignRepository.ts";
import {
  createPostgresContactReadRepository,
} from "./postgresContactReadRepository.ts";
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
  readonly contacts: ReturnType<typeof createContactListService>;
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
  readonly metaCredentialEnvelopes: ReturnType<
    typeof createPostgresMetaCredentialRepository
  >;
  readonly messageTemplates: ReturnType<
    typeof createPostgresMessageTemplateRepository
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
  readonly campaignDispatch: ReturnType<
    typeof createPostgresCampaignDispatchRepository
  >;
  readonly campaigns: ReturnType<
    typeof createPostgresCampaignRepository
  >;
  readonly reports: ReturnType<typeof createOperationalReportService>;
  readonly memberships: ReturnType<
    typeof createPostgresTenantMembershipRepository
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
  readonly businessProfiles: ReturnType<
    typeof createPostgresBusinessProfileRepository
  >;
  readonly railwayApiMutations: ReturnType<
    typeof createPostgresRailwayApiMutationExecutor
  >;
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
    contacts: createContactListService({ contacts: contactReads }),
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
    metaCredentialEnvelopes:
      createPostgresMetaCredentialRepository(queries),
    messageTemplates: createPostgresMessageTemplateRepository({
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
    campaignDispatch:
      createPostgresCampaignDispatchRepository(queries),
    campaigns: createPostgresCampaignRepository({
      queries,
      transactions,
    }),
    reports: createOperationalReportService(
      createPostgresOperationalReportRepository(queries),
    ),
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
    businessProfiles: createPostgresBusinessProfileRepository({
      queries,
      transactions,
    }),
    railwayApiMutations:
      createPostgresRailwayApiMutationExecutor(transactions),
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
