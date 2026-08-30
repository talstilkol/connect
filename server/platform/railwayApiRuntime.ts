import type {
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import type {
  TenantMembershipMutationRepository,
} from "../../db/tenantMembershipMutationRepository.ts";
import type {
  TenantSelectionRepository,
} from "../../db/tenantSelectionRepository.ts";
import type {
  ClerkOrganizationBindingRepository,
} from "../../db/clerkOrganizationBindingRepository.ts";
import type {
  ContactService,
} from "../contacts/contactService.ts";
import type {
  ContactOrganizationService,
} from "../contacts/contactOrganizationService.ts";
import type {
  OperationalReportService,
} from "../reports/operationalReportService.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import {
  createRailwayApiIdentityAdapters,
  type RailwayApiIdentityAdapterDependencies,
} from "./railwayApiIdentityAdapters.ts";
import type {
  RailwayApiIdentityEnvironment,
} from "./railwayApiIdentityConfiguration.ts";
import {
  createRailwayApiHttpHandler,
  type RailwayApiHttpHandler,
  type RailwayApiRequestTelemetry,
} from "./railwayApiHttpHandler.ts";
import {
  createRailwayApiOperationRegistry,
} from "./railwayApiOperationRegistry.ts";
import type {
  RailwayApiMutationExecutor,
} from "./railwayApiMutationExecutor.ts";
import type {
  RailwayContactOrganizationMutationExecutor,
} from "./railwayContactOrganizationMutationExecutor.ts";
import type {
  RailwayContactImportMutationExecutor,
} from "./railwayContactImportMutationExecutor.ts";
import type {
  RailwayConversationMutationExecutor,
} from "./railwayConversationMutationExecutor.ts";
import type {
  RailwayMessageTemplateDraftMutationExecutor,
} from "./railwayMessageTemplateDraftMutationExecutor.ts";
import type {
  RailwayMessageTemplateSubmissionMutationExecutor,
} from "./railwayMessageTemplateSubmissionMutationExecutor.ts";
import type { MessageTemplateService } from "../templates/messageTemplateService.ts";
import type { ConversationService } from "../conversations/conversationService.ts";
import type { BotFlowService } from "../bot/botFlowService.ts";
import type {
  RailwayBotFlowMutationExecutor,
} from "./railwayBotFlowMutationExecutor.ts";
import type {
  CampaignSnapshotService,
} from "../campaigns/campaignSnapshotService.ts";
import type {
  RailwayCampaignMutationExecutor,
} from "./railwayCampaignMutationExecutor.ts";
import type { AiReplyApprovalService } from
  "../ai/aiReplyApprovalService.ts";
import type { RailwayAiReplyApprovalMutationExecutor } from
  "./railwayAiReplyApprovalMutationExecutor.ts";
import type { AiAgentService } from "../ai/aiAgentService.ts";
import type { RailwayAiAgentMutationExecutor } from
  "./railwayAiAgentMutationExecutor.ts";
import {
  createRailwaySystemAdminBusinessProfileOperation,
  type RailwaySystemAdminBusinessProfileOperationDependencies,
} from "./railwaySystemAdminBusinessProfileOperation.ts";
import {
  createRailwaySystemAdminSubscriptionOperations,
  type RailwaySystemAdminSubscriptionOperationDependencies,
} from "./railwaySystemAdminSubscriptionOperations.ts";
import {
  createRailwaySystemAdminProductionDecisionOperations,
  type RailwaySystemAdminProductionDecisionOperationDependencies,
} from "./railwaySystemAdminProductionDecisionOperations.ts";
import {
  createRailwaySystemAdminTenantDirectoryOperation,
  type RailwaySystemAdminTenantDirectoryOperationDependencies,
} from "./railwaySystemAdminTenantDirectoryOperation.ts";
import {
  createRailwaySystemAdminWhatsappDeliveryPolicyOperations,
  type RailwaySystemAdminWhatsappDeliveryPolicyOperationDependencies,
} from "./railwaySystemAdminWhatsappDeliveryPolicyOperations.ts";
import {
  createRailwayTenantSessionResolver,
} from "./railwayTenantSessionResolver.ts";
import {
  createRailwayOnboardingBusinessProfileOperations,
} from "./railwayOnboardingBusinessProfileOperations.ts";
import type {
  RailwayOnboardingBusinessProfileMutationExecutor,
} from "./railwayOnboardingBusinessProfileMutationExecutor.ts";
import type {
  BusinessProfileRepository,
} from "../../db/businessProfileRepository.ts";
import {
  createRailwayTenantSelectionOperations,
} from "./railwayTenantSelectionOperations.ts";
import type {
  RailwayTenantSelectionMutationExecutor,
} from "./railwayTenantSelectionMutationExecutor.ts";
import {
  createRailwayTeamDirectoryOperation,
} from "./railwayTeamDirectoryOperation.ts";
import {
  createRailwayTeamMembershipOperations,
} from "./railwayTeamMembershipOperations.ts";
import type {
  TeamInvitationRepository,
} from "../../db/teamInvitationRepository.ts";
import type {
  TeamInvitationAcceptanceRepository,
} from "../../db/teamInvitationAcceptanceRepository.ts";
import type {
  TeamInvitationPolicy,
} from "../team/teamInvitationPolicy.ts";
import type {
  TeamInvitationPublisher,
} from "../team/teamInvitationRequestService.ts";
import {
  createRailwayTeamInvitationRequestOperation,
} from "./railwayTeamInvitationRequestOperation.ts";
import type {
  TeamInvitationAcceptanceIdentityResolver,
} from "../team/teamInvitationAcceptanceIdentityResolver.ts";
import {
  createRailwayTeamInvitationAcceptanceOperation,
} from "./railwayTeamInvitationAcceptanceOperation.ts";
import {
  createRailwayBotReplyStagingReleaseEvidenceReadOperation,
  type RailwayBotReplyStagingReleaseEvidenceReadDependencies,
} from "./railwayBotReplyStagingReleaseEvidenceReadOperation.ts";

export interface RailwayApiRuntimeOptions {
  readonly environment?: RailwayApiIdentityEnvironment;
  readonly identityDependencies?: Readonly<RailwayApiIdentityAdapterDependencies>;
  readonly memberships: TenantMembershipRepository;
  readonly membershipMutations: TenantMembershipMutationRepository;
  readonly selections: TenantSelectionRepository;
  readonly identityOrganizations: Pick<
    ClerkOrganizationBindingRepository,
    "findByTenantId"
  >;
  readonly conversations: Pick<ConversationService, "list" | "readThread">;
  readonly conversationMutations: RailwayConversationMutationExecutor;
  readonly botFlows: Pick<BotFlowService, "list" | "readDetails">;
  readonly botFlowMutations: RailwayBotFlowMutationExecutor;
  readonly aiAgents: Pick<
    AiAgentService,
    "list" | "listKnowledgeSources" | "readDetails"
  >;
  readonly aiAgentMutations: RailwayAiAgentMutationExecutor;
  readonly aiReplyApprovals: Pick<AiReplyApprovalService, "listAwaiting">;
  readonly aiReplyApprovalMutations: RailwayAiReplyApprovalMutationExecutor;
  readonly campaigns: Pick<CampaignSnapshotService, "list">;
  readonly campaignMutations: RailwayCampaignMutationExecutor;
  readonly campaignDeliveryConfigured: () => boolean;
  readonly contacts: Pick<ContactService, "list">;
  readonly contactConsent: Pick<
    ContactService,
    "grantConsent" | "unsubscribe"
  >;
  readonly contactOrganization: Pick<ContactOrganizationService, "read">;
  readonly contactOrganizationMutations:
    RailwayContactOrganizationMutationExecutor;
  readonly contactImportMutations: RailwayContactImportMutationExecutor;
  readonly messageTemplates: Pick<MessageTemplateService, "list">;
  readonly messageTemplateDraftMutations:
    RailwayMessageTemplateDraftMutationExecutor;
  readonly messageTemplateSubmissionMutations:
    RailwayMessageTemplateSubmissionMutationExecutor;
  readonly reports: Pick<OperationalReportService, "read">;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly mutations: RailwayApiMutationExecutor;
  readonly onboarding: Readonly<{
    businessProfiles: Pick<BusinessProfileRepository, "findByTenantId">;
    mutations: RailwayOnboardingBusinessProfileMutationExecutor;
  }>;
  readonly tenantSelection: Readonly<{
    mutations: RailwayTenantSelectionMutationExecutor;
  }>;
  readonly teamInvitations?: Readonly<{
    invitations: TeamInvitationRepository;
    acceptances: TeamInvitationAcceptanceRepository;
    acceptanceIdentity: TeamInvitationAcceptanceIdentityResolver;
    publisher: TeamInvitationPublisher;
    policyProvider: () => TeamInvitationPolicy;
  }>;
  readonly systemAdmin?: Readonly<
    RailwaySystemAdminBusinessProfileOperationDependencies &
      RailwaySystemAdminSubscriptionOperationDependencies &
      RailwaySystemAdminProductionDecisionOperationDependencies &
      RailwaySystemAdminTenantDirectoryOperationDependencies &
      RailwaySystemAdminWhatsappDeliveryPolicyOperationDependencies
  >;
  readonly botReplyStagingReleaseEvidence?: Readonly<
    RailwayBotReplyStagingReleaseEvidenceReadDependencies
  >;
  readonly maximumBodyBytes?: number;
  readonly maximumResponseBytes?: number;
  readonly requestTelemetry?: RailwayApiRequestTelemetry;
}

export function createRailwayApiRuntime(
  options: Readonly<RailwayApiRuntimeOptions>,
): RailwayApiHttpHandler {
  const identity = createRailwayApiIdentityAdapters(
    options.environment,
    options.identityDependencies,
  );
  const tenantSessions = createRailwayTenantSessionResolver({
    memberships: options.memberships,
    selections: options.selections,
    identityOrganizations: options.identityOrganizations,
  });
  const operations = createRailwayApiOperationRegistry({
    tenantSessions,
    conversations: options.conversations,
    conversationMutations: options.conversationMutations,
    botFlows: options.botFlows,
    botFlowMutations: options.botFlowMutations,
    aiAgents: options.aiAgents,
    aiAgentMutations: options.aiAgentMutations,
    aiReplyApprovals: options.aiReplyApprovals,
    aiReplyApprovalMutations: options.aiReplyApprovalMutations,
    campaigns: options.campaigns,
    campaignMutations: options.campaignMutations,
    campaignDeliveryConfigured: options.campaignDeliveryConfigured,
    contacts: options.contacts,
    contactConsent: options.contactConsent,
    contactOrganization: options.contactOrganization,
    contactOrganizationMutations: options.contactOrganizationMutations,
    contactImportMutations: options.contactImportMutations,
    messageTemplates: options.messageTemplates,
    messageTemplateDraftMutations: options.messageTemplateDraftMutations,
    messageTemplateSubmissionMutations:
      options.messageTemplateSubmissionMutations,
    reports: options.reports,
    mutationRateLimit: options.mutationRateLimit,
    mutations: options.mutations,
  });
  const onboardingOperations =
    createRailwayOnboardingBusinessProfileOperations({
      tenantSessions,
      businessProfiles: options.onboarding.businessProfiles,
      mutationRateLimit: options.mutationRateLimit,
      mutations: options.onboarding.mutations,
    });
  const tenantSelectionOperations = createRailwayTenantSelectionOperations({
    memberships: options.memberships,
    selections: options.selections,
    mutationRateLimit: options.mutationRateLimit,
    mutations: options.tenantSelection.mutations,
  });
  const teamDirectoryOperation = createRailwayTeamDirectoryOperation({
    tenantSessions,
    memberships: options.memberships,
  });
  const teamMembershipOperations = createRailwayTeamMembershipOperations({
    tenantSessions,
    membershipMutations: options.membershipMutations,
    mutationRateLimit: options.mutationRateLimit,
  });
  const teamInvitationOperations = options.teamInvitations === undefined
    ? []
    : [
        createRailwayTeamInvitationRequestOperation({
          tenantSessions,
          invitations: options.teamInvitations.invitations,
          publisher: options.teamInvitations.publisher,
          policyProvider: options.teamInvitations.policyProvider,
          mutationRateLimit: options.mutationRateLimit,
        }),
        createRailwayTeamInvitationAcceptanceOperation({
          acceptances: options.teamInvitations.acceptances,
          identity: options.teamInvitations.acceptanceIdentity,
          mutationRateLimit: options.mutationRateLimit,
        }),
      ];
  const systemAdminOperation =
    options.systemAdmin === undefined
      ? []
      : [
          createRailwaySystemAdminBusinessProfileOperation(
            {
              allowedExternalUserIds:
                options.systemAdmin.allowedExternalUserIds,
              mutationRateLimit:
                options.systemAdmin.mutationRateLimit,
              businessProfiles:
                options.systemAdmin.businessProfiles,
            },
          ),
          ...createRailwaySystemAdminSubscriptionOperations(
            {
              allowedExternalUserIds:
                options.systemAdmin.allowedExternalUserIds,
              mutationRateLimit:
                options.systemAdmin.mutationRateLimit,
              subscriptions:
                options.systemAdmin.subscriptions,
            },
          ),
          ...createRailwaySystemAdminProductionDecisionOperations(
            {
              allowedExternalUserIds:
                options.systemAdmin.allowedExternalUserIds,
              mutationRateLimit:
                options.systemAdmin.mutationRateLimit,
              productionDecisions:
                options.systemAdmin.productionDecisions,
            },
          ),
          createRailwaySystemAdminTenantDirectoryOperation({
            allowedExternalUserIds:
              options.systemAdmin.allowedExternalUserIds,
            tenantDirectory:
              options.systemAdmin.tenantDirectory,
          }),
          ...createRailwaySystemAdminWhatsappDeliveryPolicyOperations({
            allowedExternalUserIds:
              options.systemAdmin.allowedExternalUserIds,
            clock: options.systemAdmin.clock,
            mutationRateLimit:
              options.systemAdmin.mutationRateLimit,
            metaConnections:
              options.systemAdmin.metaConnections,
            policies: options.systemAdmin.policies,
          }),
        ];
  const releaseEvidenceOperations =
    options.botReplyStagingReleaseEvidence === undefined
      ? []
      : [
          createRailwayBotReplyStagingReleaseEvidenceReadOperation(
            options.botReplyStagingReleaseEvidence,
          ),
        ];

  return createRailwayApiHttpHandler({
    expectedServiceIdentity: identity.expectedServiceIdentity,
    oidcVerifier: identity.oidcVerifier,
    endUserSessionVerifier: identity.endUserSessionVerifier,
    operations: [
      ...tenantSelectionOperations,
      ...onboardingOperations,
      teamDirectoryOperation,
      ...teamMembershipOperations,
      ...teamInvitationOperations,
      ...releaseEvidenceOperations,
      ...operations.operations,
      ...systemAdminOperation,
    ],
    telemetry: options.requestTelemetry,
    maximumBodyBytes: options.maximumBodyBytes,
    maximumResponseBytes: options.maximumResponseBytes,
  });
}
