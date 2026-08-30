import {
  createRateLimitGuard,
} from "../security/rateLimit.ts";
import {
  createContactConsentService,
} from "../contacts/contactService.ts";
import {
  createConversationService,
} from "../conversations/conversationService.ts";
import {
  createBotFlowService,
} from "../bot/botFlowService.ts";
import {
  createCampaignSnapshotService,
} from "../campaigns/campaignSnapshotService.ts";
import { createAiReplyApprovalService } from
  "../ai/aiReplyApprovalService.ts";
import { createAiAgentService } from "../ai/aiAgentService.ts";
import { unavailableAiOperationalReadinessProvider } from
  "../ai/aiOperationalReadiness.ts";
import { createMessageTemplateService } from "../templates/messageTemplateService.ts";
import {
  inspectSystemAdminConfiguration,
  type SystemAdminEnvironment,
} from "../auth/systemAdminConfiguration.ts";
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
import {
  inspectRailwayApiIdentityConfiguration,
  type RailwayApiIdentityEnvironment,
} from "./railwayApiIdentityConfiguration.ts";
import type {
  RailwayApiHttpHandler,
  RailwayApiRequestTelemetry,
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
  inspectPostgresSystemAdminMutationRateLimitConfiguration,
  type PostgresSystemAdminMutationRateLimitEnvironment,
  type PostgresTenantMutationRateLimitEnvironment,
} from "./postgresMutationRateLimitConfiguration.ts";
import {
  requireMetaGraphConfiguration,
  type MetaGraphEnvironment,
} from "../meta/metaGraphConfiguration.ts";
import type {
  RailwayMessageTemplateSubmissionMutationExecutor,
} from "./railwayMessageTemplateSubmissionMutationExecutor.ts";
import {
  requireTeamInvitationPolicy,
  type TeamInvitationPolicyEnvironment,
} from "../team/teamInvitationPolicy.ts";
import type {
  TeamInvitationPublisher,
} from "../team/teamInvitationRequestService.ts";
import type {
  TeamInvitationAcceptanceIdentityResolver,
} from "../team/teamInvitationAcceptanceIdentityResolver.ts";
import {
  createClerkRailwayTeamInvitationIdentityResolver,
} from "./clerkRailwayTeamInvitationIdentityResolver.ts";
import {
  inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration,
  type RailwayBotReplyStagingReleaseEvidenceStorageEnvironment,
} from "./railwayBotReplyStagingReleaseEvidenceStorageConfiguration.ts";
import type {
  RailwayBotReplyStagingCrossServiceEvidenceClock,
} from "./railwayBotReplyStagingCrossServiceEvidence.ts";

export interface RailwayBotReplyStagingReleaseEvidenceRuntimeEnvironment
  extends RailwayBotReplyStagingReleaseEvidenceStorageEnvironment {
  readonly APP_RELEASE_ID?: string;
  readonly APP_DEPLOYED_COMMIT_SHA?: string;
  readonly APP_DEPLOYMENT_ARTIFACT_DIGEST?: string;
}

export type RailwaySystemAdminEnvironment =
  SystemAdminEnvironment &
    PostgresSystemAdminMutationRateLimitEnvironment;

export interface RailwayPostgresApiRuntimeOptions {
  readonly identityEnvironment?: RailwayApiIdentityEnvironment;
  readonly postgresEnvironment?: NodePostgresPoolEnvironment;
  readonly identityDependencies?: Readonly<
    RailwayApiIdentityAdapterDependencies
  >;
  readonly postgresTelemetry: NodePostgresPoolTelemetry;
  readonly mutationRateLimitEnvironment?:
    PostgresTenantMutationRateLimitEnvironment;
  readonly systemAdminEnvironment?:
    RailwaySystemAdminEnvironment;
  readonly metaWebhook?: Readonly<{
    environment: RailwayMetaWebhookRuntimeEnvironment;
    queue: MetaWebhookQueuePort;
    maximumBodyBytes?: number;
  }>;
  readonly messageTemplateSubmissionEnvironment?: MetaGraphEnvironment;
  readonly campaignDeliveryConfigured?: () => boolean;
  readonly teamInvitationPolicyEnvironment?: TeamInvitationPolicyEnvironment;
  readonly teamInvitationPublisher?: TeamInvitationPublisher;
  readonly teamInvitationAcceptanceIdentityResolver?:
    TeamInvitationAcceptanceIdentityResolver;
  readonly botReplyStagingReleaseEvidence?: Readonly<{
    environment:
      Readonly<RailwayBotReplyStagingReleaseEvidenceRuntimeEnvironment>;
    clock?: Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>;
  }>;
  readonly maximumBodyBytes?: number;
  readonly maximumResponseBytes?: number;
  readonly requestTelemetry?: RailwayApiRequestTelemetry;
}

export interface RailwayPostgresApiRuntime {
  readonly handler: RailwayApiHttpHandler;
  readonly metaWebhookHandler: MetaWebhookHttpHandler | null;
  readonly readiness: Readonly<PostgresReadinessProbe>;
  readonly close: () => Promise<void>;
}

const optionKeys = Object.freeze([
  "botReplyStagingReleaseEvidence",
  "campaignDeliveryConfigured",
  "identityDependencies",
  "identityEnvironment",
  "maximumBodyBytes",
  "maximumResponseBytes",
  "metaWebhook",
  "messageTemplateSubmissionEnvironment",
  "mutationRateLimitEnvironment",
  "postgresEnvironment",
  "postgresTelemetry",
  "requestTelemetry",
  "systemAdminEnvironment",
  "teamInvitationPolicyEnvironment",
  "teamInvitationPublisher",
  "teamInvitationAcceptanceIdentityResolver",
]);

const releaseEvidenceOptionKeys = Object.freeze([
  "clock",
  "environment",
]);

const releaseEvidenceEnvironmentKeys = Object.freeze([
  "APP_DEPLOYED_COMMIT_SHA",
  "APP_DEPLOYMENT_ARTIFACT_DIGEST",
  "APP_RELEASE_ID",
  "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE",
]);

const systemClock = Object.freeze({
  now() {
    return new Date();
  },
});

function validReleaseEvidenceOptions(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Readonly<Record<string, unknown>>;
  if (
    Object.keys(candidate).some(
      (key) => !releaseEvidenceOptionKeys.includes(key),
    ) ||
    typeof candidate.environment !== "object" ||
    candidate.environment === null ||
    Array.isArray(candidate.environment) ||
    Object.keys(candidate.environment).some(
      (key) => !releaseEvidenceEnvironmentKeys.includes(key),
    ) ||
    (candidate.clock !== undefined &&
      typeof (candidate.clock as { now?: unknown }).now !== "function")
  ) {
    return false;
  }
  return true;
}

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
    !validReleaseEvidenceOptions(
      options.botReplyStagingReleaseEvidence,
    ) ||
    !validMetaWebhookOptions(options.metaWebhook) ||
    (options.messageTemplateSubmissionEnvironment !== undefined &&
      (typeof options.messageTemplateSubmissionEnvironment !== "object" ||
        options.messageTemplateSubmissionEnvironment === null)) ||
    (options.campaignDeliveryConfigured !== undefined &&
      typeof options.campaignDeliveryConfigured !== "function") ||
    (options.teamInvitationPolicyEnvironment !== undefined &&
      (typeof options.teamInvitationPolicyEnvironment !== "object" ||
        options.teamInvitationPolicyEnvironment === null)) ||
    (options.teamInvitationPublisher !== undefined &&
      typeof options.teamInvitationPublisher?.publish !== "function") ||
    (options.teamInvitationAcceptanceIdentityResolver !== undefined &&
      typeof options.teamInvitationAcceptanceIdentityResolver?.resolve !==
        "function") ||
    typeof options.postgresTelemetry?.recordIdleClientError !== "function"
    || (options.requestTelemetry !== undefined &&
      typeof options.requestTelemetry?.record !== "function")
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
  const identityConfiguration = inspectRailwayApiIdentityConfiguration(
    options.identityEnvironment,
  );

  if (identityConfiguration.status !== "configured") {
    throw new Error("Railway API identity configuration is unavailable");
  }

  const teamInvitationAcceptanceIdentity =
    options.teamInvitationAcceptanceIdentityResolver ??
    createClerkRailwayTeamInvitationIdentityResolver(
      identityConfiguration.configuration,
    );
  const mutationRateLimitConfiguration =
    inspectPostgresTenantMutationRateLimitConfiguration(
      options.mutationRateLimitEnvironment,
    );

  if (mutationRateLimitConfiguration.status !== "configured") {
    throw new Error(
      "Railway PostgreSQL mutation rate-limit configuration is unavailable",
    );
  }
  const systemAdminConfiguration =
    inspectSystemAdminConfiguration(
      options.systemAdminEnvironment,
    );
  const systemAdminRateLimitConfiguration =
    inspectPostgresSystemAdminMutationRateLimitConfiguration(
      options.systemAdminEnvironment,
    );
  const systemAdminDisabled =
    systemAdminConfiguration.status === "disabled" &&
    systemAdminRateLimitConfiguration.status === "disabled";
  const systemAdminRuntimeConfiguration =
    systemAdminConfiguration.status === "configured" &&
    systemAdminRateLimitConfiguration.status === "configured"
      ? Object.freeze({
          externalUserIds:
            systemAdminConfiguration.externalUserIds,
          rateLimitPolicy:
            systemAdminRateLimitConfiguration.policy,
        })
      : null;

  if (
    !systemAdminDisabled &&
    systemAdminRuntimeConfiguration === null
  ) {
    throw new Error(
      "Railway PostgreSQL system-admin configuration is unavailable",
    );
  }
  const foundation = createRailwayPostgresFoundation({
    ...(options.postgresEnvironment === undefined
      ? {}
      : { environment: options.postgresEnvironment }),
    telemetry: options.postgresTelemetry,
  });

  try {
    const unavailableTeamInvitationPublisher: TeamInvitationPublisher =
      Object.freeze({
        async publish(): Promise<{ outcome: "queued" }> {
          throw new Error("Team invitation queue publisher is unavailable");
        },
      });
    let messageTemplateSubmissionMutations:
      RailwayMessageTemplateSubmissionMutationExecutor;

    const releaseEvidenceOptions =
      options.botReplyStagingReleaseEvidence;
    const releaseEvidenceRepository =
      releaseEvidenceOptions === undefined
        ? null
        : (() => {
            const storage =
              inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration(
                releaseEvidenceOptions.environment,
              );
            if (storage.status !== "configured") {
              throw new Error(
                "Railway PostgreSQL release evidence storage is unavailable",
              );
            }
            return foundation
              .createBotReplyStagingReleaseEvidenceRepository(
                {
                  releaseId:
                    releaseEvidenceOptions.environment.APP_RELEASE_ID ?? "",
                  commitSha:
                    releaseEvidenceOptions.environment
                      .APP_DEPLOYED_COMMIT_SHA ?? "",
                  artifactDigest:
                    releaseEvidenceOptions.environment
                      .APP_DEPLOYMENT_ARTIFACT_DIGEST ?? "",
                },
                releaseEvidenceOptions.clock ?? systemClock,
              );
          })();
    if (options.messageTemplateSubmissionEnvironment === undefined) {
      messageTemplateSubmissionMutations = Object.freeze({
        async execute() {
          return {
            outcome: "unavailable" as const,
            tenantId: null,
            queueMessage: null,
          };
        },
      });
    } else {
      const graphConfiguration = requireMetaGraphConfiguration(
        options.messageTemplateSubmissionEnvironment,
      );
      messageTemplateSubmissionMutations =
        foundation.createRailwayMessageTemplateSubmissionMutationExecutor(
          graphConfiguration.apiVersion,
        );
    }

    const handler = createRailwayApiRuntime({
      environment: options.identityEnvironment,
      identityDependencies: options.identityDependencies,
      memberships: foundation.memberships,
      identityOrganizations: foundation.identityOrganizations,
      membershipMutations: foundation.membershipMutations,
      selections: foundation.selections,
      conversations: createConversationService(
        foundation.conversations,
      ),
      conversationMutations: foundation.railwayConversationMutations,
      botFlows: createBotFlowService(foundation.botFlows),
      botFlowMutations: foundation.railwayBotFlowMutations,
      aiAgents: createAiAgentService({
        agents: foundation.aiAgents,
        knowledgeSources: foundation.knowledgeSources,
        operationalReadiness: unavailableAiOperationalReadinessProvider,
      }),
      aiAgentMutations: foundation.railwayAiAgentMutations,
      aiReplyApprovals: createAiReplyApprovalService(
        foundation.aiReplyOutbox,
      ),
      aiReplyApprovalMutations:
        foundation.railwayAiReplyApprovalMutations,
      campaigns: createCampaignSnapshotService({
        audiences: foundation.campaignAudiences,
        campaigns: foundation.campaigns,
        templates: foundation.messageTemplates,
        businessProfiles: foundation.businessProfiles,
      }),
      campaignMutations:
        foundation.createRailwayCampaignMutationExecutor(
          options.campaignDeliveryConfigured ?? (() => false),
        ),
      campaignDeliveryConfigured:
        options.campaignDeliveryConfigured ?? (() => false),
      contacts: foundation.contacts,
      contactConsent: createContactConsentService({
        consentEvents: foundation.contactConsents,
      }),
      contactOrganization: foundation.contactOrganization,
      contactOrganizationMutations:
        foundation.railwayContactOrganizationMutations,
      contactImportMutations:
        foundation.railwayContactImportMutations,
      messageTemplates: createMessageTemplateService(
        foundation.messageTemplates,
      ),
      messageTemplateDraftMutations:
        foundation.railwayMessageTemplateDraftMutations,
      messageTemplateSubmissionMutations,
      reports: foundation.reports,
      mutationRateLimit: createRateLimitGuard(
        foundation.createMutationRateLimitBinding(
          mutationRateLimitConfiguration.policy,
        ),
        "tenant-mutation",
      ),
      mutations: foundation.railwayApiMutations,
      onboarding: {
        businessProfiles: foundation.businessProfiles,
        mutations:
          foundation.railwayOnboardingBusinessProfileMutations,
      },
      tenantSelection: {
        mutations: foundation.railwayTenantSelectionMutations,
      },
      teamInvitations: {
        invitations: foundation.invitations,
        acceptances: foundation.invitationAcceptances,
        acceptanceIdentity: teamInvitationAcceptanceIdentity,
        publisher:
          options.teamInvitationPublisher ??
          unavailableTeamInvitationPublisher,
        policyProvider: () =>
          requireTeamInvitationPolicy(
            options.teamInvitationPolicyEnvironment,
          ),
      },
      ...(releaseEvidenceRepository === null
        ? {}
        : {
            botReplyStagingReleaseEvidence: {
              repository: releaseEvidenceRepository,
            },
          }),
      ...(systemAdminRuntimeConfiguration === null
        ? {}
        : {
            systemAdmin: {
              allowedExternalUserIds:
                systemAdminRuntimeConfiguration.externalUserIds,
              clock: () => systemClock.now().toISOString(),
              mutationRateLimit: createRateLimitGuard(
                foundation.createMutationRateLimitBinding(
                  systemAdminRuntimeConfiguration.rateLimitPolicy,
                ),
                "system-admin-mutation",
              ),
              businessProfiles:
                foundation.systemAdminBusinessProfiles,
              subscriptions:
                foundation.subscriptions,
              productionDecisions:
                foundation.productionDecisions,
              tenantDirectory:
                foundation.systemAdminTenantDirectory,
              metaConnections:
                foundation.whatsappDeliveryPolicyMetaConnections,
              policies:
                foundation.whatsappDeliveryPolicies,
            },
          }),
      maximumBodyBytes: options.maximumBodyBytes,
      maximumResponseBytes: options.maximumResponseBytes,
      requestTelemetry: options.requestTelemetry,
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
