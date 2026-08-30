import assert from "node:assert/strict";
import test from "node:test";

import {
  RAILWAY_API_CONTRACT_VERSION,
  VERCEL_OIDC_HEADER,
} from "../server/platform/railwayApiContract.ts";
import {
  createRailwayApiRuntime,
} from "../server/platform/railwayApiRuntime.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  deriveTeamMemberKey,
} from "../server/team/teamMemberKey.ts";
import {
  botReplyStagingLiveDriverConfirmation,
  botReplyStagingLiveDriverVersion,
} from "../server/operations/botReplyStagingLiveDriver.ts";
import {
  deriveBotReplyStagingAuthorizationEventKey,
} from "../server/platform/postgresBotReplyStagingSafetyRepository.ts";
import {
  botReplyStagingAuthorizationConfirmations,
} from "../server/platform/railwaySystemAdminBotReplyStagingAuthorizationOperation.ts";
import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";
import {
  createRailwayBotReplyStagingCrossServiceEvidence,
} from "../server/platform/railwayBotReplyStagingCrossServiceEvidence.ts";

const compactJwt = "header.payload.signature";
const idempotencyKey =
  `connect_idempotency_v1_${"b".repeat(64)}`;
const conversationKey =
  `conversation_v1_${"c".repeat(64)}`;
const messageKey = `message_v1_${"d".repeat(64)}`;
const botFlowKey = `bot_flow_v1_${"a".repeat(64)}`;
const botFlowVersionKey = `bot_flow_version_v1_${"b".repeat(64)}`;
const botTriggerKey = `bot_block_v1_${"e".repeat(64)}`;
const botEndKey = `bot_block_v1_${"f".repeat(64)}`;
const aiReplyOutboxKey = `ai_reply_outbox_v1_${"1".repeat(64)}`;
const environment = {
  APP_PUBLIC_ORIGIN: "https://connect.example.com",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    "publishable-key-for-runtime-test",
  CLERK_SECRET_KEY: "secret-key-for-runtime-test",
  VERCEL_OIDC_TEAM_SLUG: "connect-team",
  VERCEL_OIDC_PROJECT_NAME: "connect-web",
  VERCEL_OIDC_ENVIRONMENT: "production",
  NODE_ENV: "production",
};

function membership(tenantId, role) {
  return {
    tenantId,
    tenantDisplayName: `workspace-${tenantId}`,
    tenantStatus: "active",
    externalUserId: "verified-user",
    role,
    version: 1,
  };
}

function persistedConversation(session) {
  return {
    conversationKey,
    tenantId: session.tenantId,
    contactId: 31,
    status: "waiting_for_agent",
    assignedExternalUserId: session.externalUserId,
    unreadCount: 1,
    lastMessageKey: messageKey,
    lastMessageAt: "2026-08-21T10:00:00.000Z",
    version: 2,
    createdAt: "2026-08-21T09:59:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
    contact: {
      phoneNumber: "+972501234567",
      firstName: "Tal",
      lastName: null,
    },
    lastMessage: {
      direction: "inbound",
      contentKind: "text",
      textContent: "Help",
    },
  };
}

function botFlowDefinition() {
  return {
    name: "מענה ראשוני",
    entryBlockKey: botTriggerKey,
    blocks: [
      {
        blockKey: botTriggerKey,
        type: "trigger",
        nextBlockKey: botEndKey,
      },
      { blockKey: botEndKey, type: "end" },
    ],
  };
}

function persistedBotFlow(session) {
  return {
    botFlowKey,
    tenantId: session.tenantId,
    name: "מענה ראשוני",
    status: "draft",
    latestVersionKey: botFlowVersionKey,
    latestVersionNumber: 1,
    activeVersionKey: null,
    version: 1,
    createdAt: "2026-08-21T08:00:00.000Z",
    updatedAt: "2026-08-21T08:00:00.000Z",
  };
}

function fixture(selectedRole = "owner", runtimeOverrides = {}) {
  const calls = {
    memberships: 0,
    conversationLists: [],
    conversationThreads: [],
    conversationMutations: [],
    botFlowReads: [],
    botFlowMutations: [],
    aiAgentReads: [],
    aiAgentMutations: [],
    aiReplyApprovalReads: [],
    aiReplyApprovalMutations: [],
    campaignReads: [],
    campaignMutations: [],
    contacts: [],
    contactConsents: [],
    contactOrganizations: [],
    contactImports: [],
    messageTemplateReads: [],
    messageTemplateDrafts: [],
    messageTemplateSubmissions: [],
    reports: [],
    mutationSubjects: [],
    mutationCommands: [],
    onboardingProfileReads: [],
    onboardingProfileMutations: [],
    tenantSelectionMutations: [],
    teamDirectoryReads: [],
    teamMembershipMutations: [],
    teamInvitationRequests: [],
    teamInvitationPublications: [],
    teamInvitationAcceptances: [],
    systemAdminMutationSubjects: [],
    systemAdminProfileInputs: [],
    systemAdminSubscriptionInputs: [],
    systemAdminProductionDecisionLists: 0,
    systemAdminProductionDecisionInputs: [],
    systemAdminTenantDirectoryQueries: [],
    systemAdminWhatsappPolicyConnectionReads: [],
    systemAdminWhatsappPolicyReads: [],
    systemAdminWhatsappPolicyMutations: [],
    systemAdminBotReplyStagingRuns: [],
    systemAdminBotReplyStagingAuthorizations: [],
  };
  const handler = createRailwayApiRuntime({
    environment,
    identityDependencies: {
      vercelOidc: {
        createRemoteKeySet() {
          return async () => {};
        },
        async verifyJwt() {},
      },
      clerk: {
        create() {
          return {
            async authenticateRequest() {
              return {
                isAuthenticated: true,
                toAuth() {
                  return {
                    isAuthenticated: true,
                    tokenType: "session_token",
                    userId: "verified-user",
                    orgId: "org_verified",
                  };
                },
              };
            },
          };
        },
      },
    },
    memberships: {
      async findActiveByExternalUserId() {
        calls.memberships += 1;
        return [
          membership(7, "owner"),
          membership(11, selectedRole),
        ];
      },
      async findActiveByTenantId(tenantId) {
        calls.teamDirectoryReads.push(tenantId);
        return [
          membership(tenantId, selectedRole),
          {
            ...membership(tenantId, "agent"),
            externalUserId: "other-user",
          },
        ];
      },
    },
    identityOrganizations: {
      async findByTenantId(tenantId) {
        return {
          tenantId,
          externalOrganizationId: "org_verified",
        };
      },
    },
    membershipMutations: {
      async listByTenantId(tenantId) {
        calls.teamMembershipMutations.push({ operation: "list", tenantId });
        return [
          {
            tenantId,
            externalUserId: "verified-user",
            role: selectedRole,
            status: "active",
            version: 1,
          },
          {
            tenantId,
            externalUserId: "other-user",
            role: "agent",
            status: "active",
            version: 2,
          },
        ];
      },
      async changeRole(command) {
        calls.teamMembershipMutations.push({ operation: "change-role", command });
        return {
          outcome: "updated",
          membership: {
            tenantId: command.tenantId,
            externalUserId: command.targetExternalUserId,
            role: command.toRole,
            status: "active",
            version: command.expectedVersion + 1,
          },
        };
      },
      async changeStatus(command) {
        calls.teamMembershipMutations.push({ operation: "change-status", command });
        return {
          outcome: "updated",
          membership: {
            tenantId: command.tenantId,
            externalUserId: command.targetExternalUserId,
            role: "agent",
            status: command.toStatus,
            version: command.expectedVersion + 1,
          },
        };
      },
      async transferOwner(command) {
        calls.teamMembershipMutations.push({ operation: "transfer-owner", command });
        return {
          outcome: "updated",
          formerOwner: {
            tenantId: command.tenantId,
            externalUserId: command.formerOwnerExternalUserId,
            role: command.formerOwnerRole,
            status: "active",
            version: command.formerOwnerExpectedVersion + 1,
          },
          newOwner: {
            tenantId: command.tenantId,
            externalUserId: command.newOwnerExternalUserId,
            role: "owner",
            status: "active",
            version: command.newOwnerExpectedVersion + 1,
          },
        };
      },
    },
    teamInvitations: {
      acceptances: {
        async accept(command) {
          calls.teamInvitationAcceptances.push(command);
          return {
            outcome: "created",
            acceptanceKey:
              `team_invitation_acceptance_v1_${"b".repeat(64)}`,
            membership: {
              tenantId: 11,
              externalUserId: command.externalUserId,
              role: "agent",
              status: "active",
              version: 1,
            },
          };
        },
      },
      acceptanceIdentity: {
        async resolve() {
          return {
            status: "verified",
            verifiedEmail: "invitee@example.com",
          };
        },
      },
      invitations: {
        async find(tenantId, invitationKey) {
          calls.teamInvitationRequests.push({
            operation: "find",
            tenantId,
            invitationKey,
          });
          return null;
        },
        async request(command) {
          calls.teamInvitationRequests.push({
            operation: "request",
            command,
          });
          return {
            outcome: "created",
            invitation: {
              invitationKey:
                `team_invitation_v1_${"a".repeat(64)}`,
              tenantId: command.tenantId,
              normalizedEmail: command.email,
              role: command.role,
              status: "pending",
              version: 1,
              invitedByExternalUserId: command.actorExternalUserId,
              lastActor: {
                kind: "user",
                id: command.actorExternalUserId,
              },
              requestedAt: command.requestedAt,
              expiresAt: command.expiresAt,
              updatedAt: command.requestedAt,
            },
          };
        },
        async transition(command) {
          calls.teamInvitationRequests.push({
            operation: "transition",
            command,
          });
          return { outcome: "conflict", invitation: null };
        },
      },
      publisher: {
        async publish(tenantId, deliveryKey) {
          calls.teamInvitationPublications.push({ tenantId, deliveryKey });
          return { outcome: "queued" };
        },
      },
      policyProvider() {
        return { ttlHours: 72, reRequest: "after-terminal" };
      },
    },
    selections: {
      async findByExternalUserId() {
        return { tenantId: 11, version: 2 };
      },
      async save() {
        throw new Error("unused selection method");
      },
    },
    conversations: {
      async list(session, filters) {
        calls.conversationLists.push({ session, filters });
        return [persistedConversation(session)];
      },
      async readThread(session, requestedConversationKey) {
        calls.conversationThreads.push({
          session,
          conversationKey: requestedConversationKey,
        });
        return {
          conversation: persistedConversation(session),
          messages: [{
            messageKey,
            conversationKey: requestedConversationKey,
            tenantId: session.tenantId,
            providerMessageId: "wamid.private-id",
            direction: "inbound",
            contentKind: "text",
            status: "received",
            textContent: "Help",
            occurredAt: "2026-08-21T10:00:00.000Z",
            statusUpdatedAt: "2026-08-21T10:00:00.000Z",
            lastStatusEventKey: null,
            lastStatusEventAt: null,
            createdAt: "2026-08-21T10:00:00.000Z",
            updatedAt: "2026-08-21T10:00:00.000Z",
          }],
        };
      },
    },
    conversationMutations: {
      async execute(command) {
        calls.conversationMutations.push(command);
        return {
          outcome: "committed",
          tenantId: command.session.tenantId,
          state: command.operation === "conversations.mark-read"
            ? {
                conversationKey: command.payload.conversationKey,
                unreadCount: 0,
                version: command.payload.expectedVersion + 1,
              }
            : {
                conversationKey: command.payload.conversationKey,
                assignment: command.payload.action === "assign-self"
                  ? "current-user"
                  : "unassigned",
                version: command.payload.expectedVersion + 1,
              },
        };
      },
    },
    botFlows: {
      async list(session) {
        calls.botFlowReads.push({ operation: "list", session });
        return [persistedBotFlow(session)];
      },
      async readDetails(session, botFlowKey) {
        calls.botFlowReads.push({ operation: "details", session, botFlowKey });
        return {
          flow: persistedBotFlow(session),
          versions: [{
            botFlowVersionKey,
            botFlowKey,
            tenantId: session.tenantId,
            versionNumber: 1,
            status: "draft",
            definition: botFlowDefinition(),
            publishedAt: null,
            createdAt: "2026-08-21T08:00:00.000Z",
          }],
        };
      },
    },
    botFlowMutations: {
      async execute(command) {
        calls.botFlowMutations.push(command);
        if (command.operation === "bot.flows.draft.save") {
          return {
            outcome: "committed",
            tenantId: command.session.tenantId,
            state: {
              outcome: "created",
              flow: {
                botFlowKey,
                name: command.payload.definition.name,
                status: "draft",
                latestVersionKey: botFlowVersionKey,
                latestVersionNumber: 1,
                activeVersionKey: null,
                version: 1,
                createdAt: "2026-08-21T08:00:00.000Z",
                updatedAt: "2026-08-21T08:00:00.000Z",
              },
              draftVersion: {
                botFlowVersionKey,
                versionNumber: 1,
                status: "draft",
                definition: command.payload.definition,
                publishedAt: null,
                createdAt: "2026-08-21T08:00:00.000Z",
              },
            },
          };
        }
        return {
          outcome: "committed",
          tenantId: command.session.tenantId,
          state: {
            outcome: "updated",
            flow: {
              botFlowKey: command.payload.botFlowKey,
              name: "מענה ראשוני",
              status: "active",
              latestVersionKey: command.payload.botFlowVersionKey,
              latestVersionNumber: 1,
              activeVersionKey: command.payload.botFlowVersionKey,
              version: command.payload.expectedFlowVersion + 1,
              createdAt: "2026-08-21T08:00:00.000Z",
              updatedAt: "2026-08-21T08:01:00.000Z",
            },
            publishedVersion: {
              botFlowVersionKey: command.payload.botFlowVersionKey,
              versionNumber: 1,
              status: "published",
              definition: botFlowDefinition(),
              publishedAt: "2026-08-21T08:01:00.000Z",
              createdAt: "2026-08-21T08:00:00.000Z",
            },
          },
        };
      },
    },
    aiAgents: {
      async list(session) {
        calls.aiAgentReads.push({ operation: "list", session });
        return [];
      },
      async listKnowledgeSources(session) {
        calls.aiAgentReads.push({ operation: "list-knowledge-sources", session });
        return [];
      },
      async readDetails(session, aiAgentKey) {
        calls.aiAgentReads.push({ operation: "details", session, aiAgentKey });
        throw new Error("unused AI agent fixture");
      },
    },
    aiAgentMutations: {
      async execute(command) {
        calls.aiAgentMutations.push(command);
        return { outcome: "unavailable", tenantId: null, state: null };
      },
    },
    aiReplyApprovals: {
      async listAwaiting(session) {
        calls.aiReplyApprovalReads.push(session);
        return [{
          outboxKey: aiReplyOutboxKey,
          conversationKey,
          replyText: "Grounded reply",
          groundedSourceKeys: [`knowledge_source_v1_${"2".repeat(64)}`],
          groundingScoreBasisPoints: 9_200,
          status: "awaiting-approval",
          version: 1,
          createdAt: "2026-08-21T10:02:00.000Z",
        }];
      },
    },
    aiReplyApprovalMutations: {
      async execute(command) {
        calls.aiReplyApprovalMutations.push(command);
        return {
          outcome: "committed",
          tenantId: command.session.tenantId,
          state: {
            outcome: "updated",
            approval: {
              outboxKey: command.payload.outboxKey,
              status: command.payload.decision === "approve"
                ? "ready-for-delivery"
                : "rejected",
              version: command.payload.expectedVersion + 1,
            },
          },
        };
      },
    },
    campaigns: {
      async list(session) {
        calls.campaignReads.push(session);
        return [];
      },
    },
    campaignMutations: {
      async execute(command) {
        calls.campaignMutations.push(command);
        return command.operation === "campaigns.snapshot.save"
          ? {
              outcome: "committed",
              tenantId: command.session.tenantId,
              state: {
                outcome: "saved",
                campaign: {
                  campaignKey: `campaign_v1_${"1".repeat(64)}`,
                  name: command.payload.name,
                  status: "draft",
                  deliveryMode: command.payload.deliveryMode,
                  scheduledAt: command.payload.scheduledAt,
                  timezone: "UTC",
                  templateName: "campaign_template",
                  templateLanguage: "he",
                  recipientCount: 1,
                  version: 1,
                  activatedAt: null,
                  startedAt: null,
                  completedAt: null,
                  updatedAt: "2026-08-21T10:00:00.000Z",
                },
              },
            }
          : {
              outcome: "committed",
              tenantId: command.session.tenantId,
              state: {
                outcome: "activated",
                campaign: {
                  campaignKey: command.payload.campaignKey,
                  status: "scheduled",
                  version: command.payload.expectedVersion + 1,
                  activatedAt: "2026-08-21T10:01:00.000Z",
                  startedAt: null,
                },
              },
            };
      },
    },
    campaignDeliveryConfigured() {
      return true;
    },
    contacts: {
      async list(session, beforeContactId) {
        calls.contacts.push({ session, beforeContactId });
        return {
          contacts: [],
          nextCursor: null,
        };
      },
    },
    contactConsent: {
      async grantConsent(session, contactId, input) {
        calls.contactConsents.push({
          action: "grant",
          session,
          contactId,
          input,
        });
        return {
          id: contactId,
          tenantId: session.tenantId,
          phoneNumber: "+972501234567",
          firstName: "Tal",
          lastName: null,
          email: null,
          company: "Connect",
          mailingStatus: "subscribed",
          consentStatus: "granted",
          consentSource: input.source,
          consentRecordedAt: input.occurredAt,
          consentWithdrawnAt: null,
          consentEvidenceReference: input.evidenceReference,
          version: 2,
          createdAt: "2026-08-20T20:00:00.000Z",
          updatedAt: input.occurredAt,
        };
      },
      async unsubscribe(session, contactId, input) {
        calls.contactConsents.push({
          action: "unsubscribe",
          session,
          contactId,
          input,
        });
        return {
          id: contactId,
          tenantId: session.tenantId,
          phoneNumber: "+972501234567",
          firstName: "Tal",
          lastName: null,
          email: null,
          company: "Connect",
          mailingStatus: "unsubscribed",
          consentStatus: "withdrawn",
          consentSource: input.source,
          consentRecordedAt: "2026-08-20T20:00:00.000Z",
          consentWithdrawnAt: input.occurredAt,
          consentEvidenceReference: input.evidenceReference,
          version: 3,
          createdAt: "2026-08-20T20:00:00.000Z",
          updatedAt: input.occurredAt,
        };
      },
    },
    contactOrganization: {
      async read(session, contactIds) {
        calls.contactOrganizations.push({ session, contactIds });
        return {
          scopeContactIds: contactIds,
          tags: [],
          lists: [],
          tagAssignments: [],
          listMemberships: [],
        };
      },
    },
    contactOrganizationMutations: {
      async execute(command) {
        calls.contactOrganizations.push({ mutation: command });
        const contactIds = "contactId" in command.payload
          ? [command.payload.contactId]
          : [];

        return {
          outcome: "committed",
          tenantId: command.session.tenantId,
          organization: {
            scopeContactIds: contactIds,
            tags: [],
            lists: [],
            tagAssignments: [],
            listMemberships: [],
          },
        };
      },
    },
    contactImportMutations: {
      async execute(command) {
        calls.contactImports.push(command);
        return {
          outcome: "committed",
          tenantId: command.session.tenantId,
          result: {
            job: {
              id: 41,
              fileName: "contacts.csv",
              totalRows: 1,
              processedRows: 0,
              createdRows: 0,
              updatedRows: 0,
              unchangedRows: 0,
              rejectedRows: 0,
              duplicateRows: 0,
              status: "processing",
            },
            contacts: [],
          },
        };
      },
    },
    messageTemplates: {
      async list(session) {
        calls.messageTemplateReads.push(session);
        return [];
      },
    },
    messageTemplateDraftMutations: {
      async execute(command) {
        calls.messageTemplateDrafts.push(command);

        return {
          outcome: "committed",
          tenantId: command.session.tenantId,
          template: {
            templateKey: `template_v1_${"e".repeat(64)}`,
            ...command.payload,
            status: "draft",
            submittedAt: null,
            reviewedAt: null,
            updatedAt: "2026-08-21T08:00:00.000Z",
          },
        };
      },
    },
    messageTemplateSubmissionMutations: {
      async execute(command) {
        calls.messageTemplateSubmissions.push(command);
        return {
          outcome: "committed",
          tenantId: command.session.tenantId,
          queueMessage: {
            version: 1,
            tenantId: command.session.tenantId,
            submissionKey: `template_submission_v1_${"f".repeat(64)}`,
          },
        };
      },
    },
    reports: {
      async read(session, input) {
        calls.reports.push({ session, input });
        return {
          period: input,
          snapshot: {
            window: {
              startAt: `${input.startDate}T00:00:00.000Z`,
              endAt: "2026-08-18T00:00:00.000Z",
            },
            generatedAt: "2026-08-17T12:00:00.000Z",
            campaigns: {
              total: 0,
              recipientCount: 0,
              draft: 0,
              scheduled: 0,
              running: 0,
              paused: 0,
              completed: 0,
              cancelled: 0,
              failed: 0,
            },
            messages: {
              total: 0,
              inbound: 0,
              outbound: 0,
              received: 0,
              sent: 0,
              delivered: 0,
              read: 0,
              failed: 0,
            },
            conversations: {
              active: 0,
              unreadCount: 0,
              new: 0,
              botActive: 0,
              waitingForAgent: 0,
              agentActive: 0,
              waitingForContact: 0,
              closed: 0,
            },
            bot: {
              total: 0,
              pending: 0,
              sending: 0,
              accepted: 0,
              rejected: 0,
              ambiguous: 0,
            },
            ai: {
              totalTurns: 0,
              replyPlanned: 0,
              handoff: 0,
            },
            aiUsage: [],
          },
        };
      },
    },
    mutationRateLimit: {
      async consume(subject) {
        calls.mutationSubjects.push(subject);
        return { outcome: "allowed" };
      },
    },
    mutations: {
      async saveContact(command) {
        calls.mutationCommands.push(command);
        return {
          outcome: "committed",
          tenantId: command.session.tenantId,
          contact: {
            id: 31,
            ...command.profile,
            mailingStatus: "subscribed",
            consentStatus: "unknown",
            consentSource: null,
            consentRecordedAt: null,
            consentWithdrawnAt: null,
            version: 1,
          },
        };
      },
    },
    onboarding: {
      businessProfiles: {
        async findByTenantId(tenantId) {
          calls.onboardingProfileReads.push(tenantId);
          return {
            tenantId,
            businessName: "Connect",
            timezone: "Asia/Jerusalem",
            interfaceLanguage: "he",
            version: 2,
            createdAt: "2026-08-21T08:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z",
          };
        },
      },
      mutations: {
        async execute(command) {
          calls.onboardingProfileMutations.push(command);
          return {
            outcome: "committed",
            tenantId: command.session?.tenantId ?? 19,
            state: {
              createdTenant: command.session === null,
              profile: { ...command.payload, version: 3 },
            },
          };
        },
      },
    },
    tenantSelection: {
      mutations: {
        async execute(command) {
          calls.tenantSelectionMutations.push(command);
          return {
            outcome: "committed",
            tenantId: command.input.tenantId,
            state: {
              repositoryOutcome: "saved",
              selection: {
                tenantId: command.input.tenantId,
                version: command.input.expectedVersion + 1,
              },
            },
          };
        },
      },
    },
    systemAdmin: {
      allowedExternalUserIds: ["verified-user"],
      clock() {
        return "2026-08-21T05:00:00.000Z";
      },
      mutationRateLimit: {
        async consume(subject) {
          calls.systemAdminMutationSubjects.push(subject);
          return { outcome: "allowed" };
        },
      },
      businessProfiles: {
        async update(input) {
          calls.systemAdminProfileInputs.push(input);
          return {
            outcome: "updated",
            profile: {
              tenantId: input.tenantId,
              businessName: input.businessName,
              timezone: input.timezone,
              interfaceLanguage: input.interfaceLanguage,
              version: input.expectedVersion + 1,
              createdAt: "2026-08-01T09:00:00.000Z",
              updatedAt: input.occurredAt,
            },
          };
        },
      },
      subscriptions: {
        async create(input) {
          calls.systemAdminSubscriptionInputs.push({
            operation: "create",
            input,
          });
          return {
            outcome: "created",
            subscription: {
              tenantId: input.tenantId,
              status: input.status,
              startsAt: input.startsAt,
              endsAt: input.endsAt,
              cancelledAt: null,
              version: 1,
              createdAt: input.occurredAt,
              updatedAt: input.occurredAt,
            },
          };
        },
        async extend(input) {
          calls.systemAdminSubscriptionInputs.push({
            operation: "extend",
            input,
          });
          return {
            outcome: "updated",
            subscription: {
              tenantId: input.tenantId,
              status: "active",
              startsAt: "2026-08-01T00:00:00.000Z",
              endsAt: input.newEndsAt,
              cancelledAt: null,
              version: input.expectedVersion + 1,
              createdAt: "2026-08-01T00:00:00.000Z",
              updatedAt: input.occurredAt,
            },
          };
        },
        async changeStatus(input) {
          calls.systemAdminSubscriptionInputs.push({
            operation: "changeStatus",
            input,
          });
          return {
            outcome: "updated",
            subscription: {
              tenantId: input.tenantId,
              status: input.status,
              startsAt: "2026-08-01T00:00:00.000Z",
              endsAt: "2026-10-01T00:00:00.000Z",
              cancelledAt: null,
              version: input.expectedVersion + 1,
              createdAt: "2026-08-01T00:00:00.000Z",
              updatedAt: input.occurredAt,
            },
          };
        },
        async cancel(input) {
          calls.systemAdminSubscriptionInputs.push({
            operation: "cancel",
            input,
          });
          return {
            outcome: "updated",
            subscription: {
              tenantId: input.tenantId,
              status: "cancelled",
              startsAt: "2026-08-01T00:00:00.000Z",
              endsAt: "2026-10-01T00:00:00.000Z",
              cancelledAt: input.occurredAt,
              version: input.expectedVersion + 1,
              createdAt: "2026-08-01T00:00:00.000Z",
              updatedAt: input.occurredAt,
            },
          };
        },
      },
      productionDecisions: {
        async list() {
          calls.systemAdminProductionDecisionLists += 1;
          return [
            {
              checkId: "ai.provider",
              selection: "Provider choice approved",
              rationale:
                "The decision passed product and security review.",
              version: 1,
              lastEventKey:
                `production_decision_event_v1_${"a".repeat(64)}`,
              decidedByExternalUserId: "verified-user",
              decidedAt: "2026-08-20T09:00:00.000Z",
              updatedAt: "2026-08-20T09:00:00.000Z",
            },
          ];
        },
        async save(input) {
          calls.systemAdminProductionDecisionInputs.push(input);
          return {
            outcome: input.expectedVersion === 0 ? "created" : "updated",
            record: {
              checkId: input.checkId,
              selection: input.selection,
              rationale: input.rationale,
              version: input.expectedVersion + 1,
              lastEventKey:
                `production_decision_event_v1_${"b".repeat(64)}`,
              decidedByExternalUserId: input.actorExternalUserId,
              decidedAt: input.occurredAt,
              updatedAt: input.occurredAt,
            },
          };
        },
      },
      tenantDirectory: {
        async listPage(query) {
          calls.systemAdminTenantDirectoryQueries.push(query);
          return {
            tenants: [{
              tenantId: 19,
              displayName: "Connect Support",
              tenantStatus: "active",
              businessProfile: {
                businessName: "Connect Support",
                timezone: "Asia/Jerusalem",
                interfaceLanguage: "he",
                version: 2,
                createdAt: "2026-08-01T09:00:00.000Z",
                updatedAt: "2026-08-20T09:00:00.000Z",
              },
              subscription: {
                status: "active",
                startsAt: "2026-08-01T00:00:00.000Z",
                endsAt: "2026-10-01T00:00:00.000Z",
                cancelledAt: null,
                version: 2,
                createdAt: "2026-08-01T00:00:00.000Z",
                updatedAt: "2026-08-20T09:00:00.000Z",
              },
            }],
            nextCursor: null,
          };
        },
      },
      metaConnections: {
        async findConnectionByTenantId(tenantId) {
          calls.systemAdminWhatsappPolicyConnectionReads.push(tenantId);
          return tenantId === 19
            ? {
                tenantId,
                businessPortfolioId: "portfolio-19",
                wabaId: "waba-19",
                phoneNumberId: "phone-19",
                status: "connected",
                version: 2,
              }
            : null;
        },
      },
      policies: {
        async findLatestPolicyEvent(tenantId) {
          calls.systemAdminWhatsappPolicyReads.push(tenantId);
          return tenantId === 19
            ? {
                eventKey:
                  `whatsapp_delivery_policy_event_v1_${"c".repeat(64)}`,
                tenantId,
                connectionVersion: 2,
                policyVersion: 1,
                deliveryState: "enabled",
                portfolioCapacity: {
                  kind: "bounded",
                  maximumUniqueRecipients: 2000,
                },
                phoneThroughput: {
                  maximumMessagesPerSecond: 80,
                  maximumOutboundMessagesPerSecond: 70,
                },
                reservationDurationSeconds: 60,
                metaGraphApiVersion: "v23.0",
                evidenceDigest: "d".repeat(64),
                evidenceCheckedAt: "2026-08-21T08:00:00.000Z",
                evidenceExpiresAt: "2026-08-22T08:00:00.000Z",
                actorExternalUserId: "verified-user",
                recordedAt: "2026-08-21T09:00:00.000Z",
              }
            : null;
        },
        async recordPolicyEvent(command) {
          calls.systemAdminWhatsappPolicyMutations.push(command);
          return {
            outcome: command.expectedPolicyVersion === 0
              ? "created"
              : "updated",
            record: {
              eventKey:
                `whatsapp_delivery_policy_event_v1_${"e".repeat(64)}`,
              tenantId: command.tenantId,
              connectionVersion: command.connectionVersion,
              policyVersion: command.expectedPolicyVersion + 1,
              deliveryState: command.deliveryState,
              portfolioCapacity:
                command.portfolioLimitKind === "bounded"
                  ? {
                      kind: "bounded",
                      maximumUniqueRecipients: command.portfolioLimitValue,
                    }
                  : { kind: "unlimited" },
              phoneThroughput:
                command.phoneThroughputMessagesPerSecond === null
                  ? null
                  : {
                      maximumMessagesPerSecond:
                        command.phoneThroughputMessagesPerSecond,
                      maximumOutboundMessagesPerSecond:
                        command.maximumOutboundMessagesPerSecond,
                    },
              reservationDurationSeconds:
                command.reservationDurationSeconds,
              metaGraphApiVersion: command.metaGraphApiVersion,
              evidenceDigest: command.evidenceDigest,
              evidenceCheckedAt: command.evidenceCheckedAt,
              evidenceExpiresAt: command.evidenceExpiresAt,
              actorExternalUserId: command.actorExternalUserId,
              recordedAt: command.recordedAt,
            },
          };
        },
      },
      botReplyStaging: {
        talExternalUserId: "verified-user",
        authorizations: {
          async findLatest() {
            return null;
          },
          async record(command) {
            calls.systemAdminBotReplyStagingAuthorizations.push(command);
            return {
              ...command,
              eventKey: deriveBotReplyStagingAuthorizationEventKey(command),
              environment: "staging",
              connectionMode: "approved-staging-waba",
              recipientOptInRecorded: true,
              rateLimitApprovedBy: "tal",
              createdAt: command.recordedAt,
            };
          },
        },
        driver: {
          async run(input, context) {
            calls.systemAdminBotReplyStagingRuns.push({
              input,
              context,
            });
            return {
              outcome: "completed",
              runKey:
                `bot_reply_staging_run_v1_${"6".repeat(64)}`,
              auditKey:
                `bot_reply_staging_audit_v1_${"7".repeat(64)}`,
              verifiedAt: "2026-08-21T13:00:00.000Z",
              expiresAt: "2026-08-22T13:00:00.000Z",
              evidenceDigest:
                `bot_reply_staging_evidence_v1_${"8".repeat(64)}`,
            };
          },
        },
      },
    },
    ...runtimeOverrides,
  });

  return { calls, handler };
}

function request(
  operation,
  payload,
  requestKind = "query",
  mutationIdempotencyKey = idempotencyKey,
) {
  return new Request("https://railway.example.com/v1/connect", {
    method: "POST",
    headers: {
      authorization: `Bearer ${compactJwt}`,
      "content-type": "application/json",
      [VERCEL_OIDC_HEADER]: compactJwt,
    },
    body: JSON.stringify({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation,
      requestKind,
      idempotencyKey:
        requestKind === "mutation"
          ? mutationIdempotencyKey
          : null,
      payload,
    }),
  });
}

test("runs a system-admin profile mutation without resolving tenant membership", async () => {
  const testFixture = fixture("agent");
  const adminPayload = {
    targetTenantId: 19,
    expectedVersion: 2,
    businessName: "Connect Support",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  };
  const adminIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      "system-admin.business-profile.update",
      adminPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      "system-admin.business-profile.update",
      adminPayload,
      "mutation",
      adminIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.outcome, "updated");
  assert.equal(body.data.profile.businessName, "Connect Support");
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(
    testFixture.calls.systemAdminMutationSubjects,
    [
      "verified-user:system-admin.business-profile.update",
    ],
  );
  assert.equal(testFixture.calls.systemAdminProfileInputs.length, 1);
  assert.equal(
    testFixture.calls.systemAdminProfileInputs[0].tenantId,
    19,
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user/,
  );
});

test("runs a system-admin subscription mutation without resolving tenant membership", async () => {
  const testFixture = fixture("agent");
  const operationId = "system-admin.subscription.cancel";
  const adminPayload = {
    targetTenantId: 19,
    expectedVersion: 2,
  };
  const adminIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      adminPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      operationId,
      adminPayload,
      "mutation",
      adminIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.outcome, "updated");
  assert.equal(body.data.subscription.status, "cancelled");
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(
    testFixture.calls.systemAdminMutationSubjects,
    [`verified-user:${operationId}`],
  );
  assert.equal(testFixture.calls.systemAdminSubscriptionInputs.length, 1);
  assert.equal(
    testFixture.calls.systemAdminSubscriptionInputs[0].input.tenantId,
    19,
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user/,
  );
});

test("lists system-admin production decisions without tenant membership or mutation quota", async () => {
  const testFixture = fixture("agent");
  const response = await testFixture.handler.handle(
    request(
      "system-admin.production-decisions.list",
      {},
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.records.length, 1);
  assert.equal(body.data.records[0].checkId, "ai.provider");
  assert.equal(testFixture.calls.memberships, 0);
  assert.equal(testFixture.calls.systemAdminProductionDecisionLists, 1);
  assert.deepEqual(testFixture.calls.systemAdminMutationSubjects, []);
  assert.doesNotMatch(
    JSON.stringify(body),
    /externalUserId|lastEventKey|verified-user/,
  );
});

test("lists the system-admin tenant directory without tenant membership or mutation quota", async () => {
  const testFixture = fixture("agent");
  const payload = {
    afterTenantId: null,
    search: "connect",
    tenantStatus: "active",
    subscription: "with-subscription",
  };
  const response = await testFixture.handler.handle(
    request(
      "system-admin.tenant-directory.list",
      payload,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.directory.tenants.length, 1);
  assert.equal(
    body.data.directory.tenants[0].targetTenantId,
    19,
  );
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(
    testFixture.calls.systemAdminTenantDirectoryQueries,
    [payload],
  );
  assert.deepEqual(testFixture.calls.systemAdminMutationSubjects, []);
  assert.doesNotMatch(
    JSON.stringify(body),
    /"tenantId"|externalUserId|verified-user/,
  );
});

test("saves a system-admin production decision through the isolated mutation boundary", async () => {
  const testFixture = fixture("agent");
  const operationId = "system-admin.production-decisions.save";
  const adminPayload = {
    checkId: "ai.provider",
    expectedVersion: 0,
    selection: "Provider choice approved",
    rationale:
      "The decision passed product and security review.",
  };
  const adminIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      adminPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      operationId,
      adminPayload,
      "mutation",
      adminIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.outcome, "created");
  assert.equal(body.data.record.version, 1);
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(
    testFixture.calls.systemAdminMutationSubjects,
    [`verified-user:${operationId}`],
  );
  assert.equal(testFixture.calls.systemAdminProductionDecisionInputs.length, 1);
  assert.equal(
    testFixture.calls.systemAdminProductionDecisionInputs[0]
      .actorExternalUserId,
    "verified-user",
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /externalUserId|lastEventKey|verified-user/,
  );
});

test("reads and approves WhatsApp delivery policy through the isolated system-admin boundary", async () => {
  const testFixture = fixture("agent");
  const readResponse = await testFixture.handler.handle(
    request(
      "system-admin.whatsapp-delivery-policy.read",
      { targetTenantId: 19 },
    ),
  );
  const readBody = await readResponse.json();

  assert.equal(readResponse.status, 200);
  assert.equal(readBody.data.connection.status, "connected");
  assert.equal(readBody.data.record.policyVersion, 1);
  assert.deepEqual(
    testFixture.calls.systemAdminWhatsappPolicyConnectionReads,
    [19],
  );
  assert.deepEqual(
    testFixture.calls.systemAdminWhatsappPolicyReads,
    [19],
  );
  assert.deepEqual(testFixture.calls.systemAdminMutationSubjects, []);

  const operationId =
    "system-admin.whatsapp-delivery-policy.approve";
  const approvalPayload = {
    targetTenantId: 19,
    expectedConnectionVersion: 2,
    expectedPolicyVersion: 1,
    expectedBusinessPortfolioIdentifier: "portfolio-19",
    expectedWabaIdentifier: "waba-19",
    expectedPhoneNumberIdentifier: "phone-19",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 2000,
    phoneThroughputMessagesPerSecond: 80,
    maximumOutboundMessagesPerSecond: 65,
    reservationDurationSeconds: 60,
    metaGraphApiVersion: "v23.0",
    evidenceDigest: "f".repeat(64),
    evidenceCheckedAt: "2026-08-21T04:00:00.000Z",
    evidenceExpiresAt: "2026-08-22T08:00:00.000Z",
  };
  const approvalIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      approvalPayload,
    );
  const approvalResponse = await testFixture.handler.handle(
    request(
      operationId,
      approvalPayload,
      "mutation",
      approvalIdempotencyKey,
    ),
  );
  const approvalBody = await approvalResponse.json();

  assert.equal(approvalResponse.status, 200);
  assert.equal(approvalBody.data.outcome, "updated");
  assert.equal(approvalBody.data.record.deliveryState, "enabled");
  assert.equal(approvalBody.data.record.policyVersion, 2);
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(
    testFixture.calls.systemAdminMutationSubjects,
    [`verified-user:${operationId}`],
  );
  assert.equal(
    testFixture.calls.systemAdminWhatsappPolicyMutations.length,
    1,
  );
  assert.equal(
    testFixture.calls.systemAdminWhatsappPolicyMutations[0]
      .actorExternalUserId,
    "verified-user",
  );
  assert.doesNotMatch(
    JSON.stringify(approvalBody),
    /actorExternalUserId|verified-user/,
  );
});

test("quarantines the legacy bot reply staging run operation", async () => {
  const testFixture = fixture("agent");
  const operationId = "system-admin.bot-reply-staging.run";
  const stagingPayload = {
    schemaVersion: 1,
    driverVersion: botReplyStagingLiveDriverVersion,
    confirmation: botReplyStagingLiveDriverConfirmation,
    targetTenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    requestedAt: "2026-08-21T13:25:00.000Z",
    releaseId: `connect_release_v1_${"a".repeat(64)}`,
    commitSha: "b".repeat(40),
    artifactDigest: `sha256:${"c".repeat(64)}`,
  };
  const stagingIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      stagingPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      operationId,
      stagingPayload,
      "mutation",
      stagingIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, "INVALID_REQUEST");
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(testFixture.calls.systemAdminMutationSubjects, []);
  assert.deepEqual(testFixture.calls.systemAdminBotReplyStagingRuns, []);
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenant|phone|waba|token|receipt/i,
  );
});

test("quarantines the legacy bot reply staging authorization operation", async () => {
  const testFixture = fixture("agent");
  const operationId = "system-admin.bot-reply-staging.authorization";
  const authorizationPayload = {
    schemaVersion: 1,
    status: "approved",
    confirmation: botReplyStagingAuthorizationConfirmations.approved,
    targetTenantId: 7,
    authorizationVersion: 1,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    recipientFingerprint: `sha256:${"d".repeat(64)}`,
    recipientOptInRecordedAt: "2026-08-21T04:00:00.000Z",
    recipientExpiresAt: "2026-08-22T04:00:00.000Z",
    rateLimitApprovedAt: "2026-08-21T04:05:00.000Z",
    rateLimitExpiresAt: "2026-08-22T04:05:00.000Z",
    rateLimitMethodFingerprint: `sha256:${"e".repeat(64)}`,
    recordedAt: "2026-08-21T04:55:00.000Z",
  };
  const authorizationIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      authorizationPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      operationId,
      authorizationPayload,
      "mutation",
      authorizationIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, "INVALID_REQUEST");
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(testFixture.calls.systemAdminMutationSubjects, []);
  assert.deepEqual(
    testFixture.calls.systemAdminBotReplyStagingAuthorizations,
    [],
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /recipient|method|actor|phone|waba|token/i,
  );
});

test("reads verified PostgreSQL release evidence through the authenticated API", async () => {
  const release = Object.freeze({
    releaseId: `connect_release_v1_${"a".repeat(64)}`,
    commitSha: "b".repeat(40),
    artifactDigest: `sha256:${"c".repeat(64)}`,
  });
  const evidence = createRailwayBotReplyStagingCrossServiceEvidence({
    report: {
      schemaVersion: 1,
      activationVersion:
        railwayBotReplyStagingCrossServiceActivationVersion,
      status: "ready",
      code: "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED",
      passedCheckCount: 4,
      requiredCheckCount: 4,
      checks: railwayBotReplyStagingCrossServiceCheckIds.map((id) => ({
        id,
        status: "passed",
      })),
    },
    ...release,
    lifetimeSeconds: 600,
  }, {
    now: () => new Date("2026-08-24T12:00:00.000Z"),
  });
  const evidenceJson = JSON.stringify(evidence);
  const testFixture = fixture("agent", {
    botReplyStagingReleaseEvidence: {
      repository: {
        clock: {
          now: () => new Date("2026-08-24T12:05:00.000Z"),
        },
        async readCurrentEvidenceState() {
          return {
            release,
            version: 1,
            evidenceDigest: evidence.evidenceDigest,
            evidenceJson,
          };
        },
      },
    },
  });

  const response = await testFixture.handler.handle(
    request("runtime.bot-reply-release-evidence.read", {}),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    schemaVersion: 1,
    storageMode: "postgresql",
    evidenceVersion: 1,
    evidenceDigest: evidence.evidenceDigest,
    evidenceJson,
  });
  assert.equal(testFixture.calls.memberships, 0);
});

test("runs a selected-tenant contact query through the complete boundary", async () => {
  const testFixture = fixture("agent");
  const response = await testFixture.handler.handle(
    request("contacts.list", { beforeContactId: null }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "ok",
    data: {
      contacts: [],
      nextCursor: null,
      organization: {
        scopeContactIds: [],
        tags: [],
        lists: [],
        tagAssignments: [],
        listMemberships: [],
      },
    },
  });
  assert.equal(testFixture.calls.memberships, 1);
  assert.equal(testFixture.calls.contacts.length, 1);
  assert.equal(testFixture.calls.contactOrganizations.length, 1);
  assert.equal(testFixture.calls.contacts[0].session.tenantId, 11);
  assert.equal(
    testFixture.calls.contacts[0].session.externalUserId,
    "verified-user",
  );
});

test("returns only bounded workspace context through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const response = await testFixture.handler.handle(
    request("workspace.context.read", {}),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    displayName: "workspace-11",
    status: "active",
    role: "manager",
  });
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user/,
  );
});

test("returns an opaque team directory through the complete boundary", async () => {
  const testFixture = fixture("owner");
  const response = await testFixture.handler.handle(
    request("team.directory.read", {}),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.directory.identityStatus, "unavailable");
  assert.equal(body.data.directory.members.length, 2);
  assert.deepEqual(
    body.data.directory.members.map(({ role, currentUser }) => ({
      role,
      currentUser,
    })),
    [
      { role: "owner", currentUser: true },
      { role: "agent", currentUser: false },
    ],
  );
  assert.deepEqual(testFixture.calls.teamDirectoryReads, [11]);
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user|other-user/,
  );
});

test("changes a team role through identity, quota, and PostgreSQL boundaries", async () => {
  const testFixture = fixture("owner");
  const payload = {
    memberKey: deriveTeamMemberKey(11, "other-user"),
    expectedVersion: 2,
    role: "manager",
  };
  const response = await testFixture.handler.handle(
    request(
      "team.membership.role.change",
      payload,
      "mutation",
      await deriveRailwayApiDeterministicIdempotencyKey(
        "team.membership.role.change",
        payload,
      ),
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    outcome: "updated",
    membership: {
      memberKey: payload.memberKey,
      role: "manager",
      status: "active",
      version: 3,
    },
  });
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:team.membership.role.change",
  ]);
  assert.deepEqual(
    testFixture.calls.teamMembershipMutations.map(({ operation }) => operation),
    ["list", "change-role"],
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user|other-user|operationKey|eventKey/,
  );
});

test("requests a team invitation through identity, quota, persistence, and queue boundaries", async () => {
  const testFixture = fixture("owner");
  const payload = {
    email: "member@example.com",
    role: "agent",
  };
  const response = await testFixture.handler.handle(
    request(
      "team.invitation.request",
      payload,
      "mutation",
      await deriveRailwayApiDeterministicIdempotencyKey(
        "team.invitation.request",
        payload,
      ),
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, { status: "queued" });
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:team.invitation.request",
  ]);
  assert.deepEqual(
    testFixture.calls.teamInvitationRequests.map(({ operation }) => operation),
    ["find", "request"],
  );
  assert.equal(testFixture.calls.teamInvitationPublications.length, 1);
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user|email|invitationKey|deliveryKey/,
  );
});

test("accepts a team invitation through identity, quota, and PostgreSQL", async () => {
  const testFixture = fixture("agent");
  const payload = {
    invitationKey: `team_invitation_v1_${"a".repeat(64)}`,
  };
  const response = await testFixture.handler.handle(
    request(
      "team.invitation.accept",
      payload,
      "mutation",
      await deriveRailwayApiDeterministicIdempotencyKey(
        "team.invitation.accept",
        payload,
      ),
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, { status: "accepted" });
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "team-invitation-acceptance:verified-user",
  ]);
  assert.equal(testFixture.calls.teamInvitationAcceptances.length, 1);
  assert.equal(
    testFixture.calls.teamInvitationAcceptances[0].verifiedEmail,
    "invitee@example.com",
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user|verifiedEmail|invitationKey/,
  );
});

test("lists and selects an opaque tenant through the complete boundary", async () => {
  const testFixture = fixture();
  const directoryResponse = await testFixture.handler.handle(
    request("tenant-selection.directory.read", {}),
  );
  const directoryBody = await directoryResponse.json();

  assert.equal(directoryResponse.status, 200);
  assert.equal(directoryBody.data.directory.version, 2);
  assert.equal(directoryBody.data.directory.selectionRequired, false);
  assert.equal(directoryBody.data.directory.options.length, 2);
  assert.doesNotMatch(
    JSON.stringify(directoryBody),
    /tenantId|externalUserId|verified-user/,
  );

  const target = directoryBody.data.directory.options.find(
    ({ displayName }) => displayName === "workspace-7",
  );
  assert.ok(target);
  const payload = {
    selectionKey: target.selectionKey,
    expectedVersion: directoryBody.data.directory.version,
  };
  const selectionResponse = await testFixture.handler.handle(
    request(
      "tenant-selection.save",
      payload,
      "mutation",
      await deriveRailwayApiDeterministicIdempotencyKey(
        "tenant-selection.save",
        payload,
      ),
    ),
  );
  assert.equal(selectionResponse.status, 200);
  assert.deepEqual((await selectionResponse.json()).data, {
    version: 3,
    unchanged: false,
    replayed: false,
  });
  assert.equal(testFixture.calls.tenantSelectionMutations.length, 1);
  assert.deepEqual(testFixture.calls.tenantSelectionMutations[0].input, {
    externalUserId: "verified-user",
    tenantId: 7,
    expectedVersion: 2,
  });
});

test("reads and saves onboarding business profile through the complete boundary", async () => {
  const testFixture = fixture("owner");
  const profilePayload = {
    businessName: "Connect Updated",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  };
  const mutationKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      "onboarding.business-profile.save",
      profilePayload,
    );
  const readResponse = await testFixture.handler.handle(
    request("onboarding.business-profile.read", {}),
  );
  const saveResponse = await testFixture.handler.handle(
    request(
      "onboarding.business-profile.save",
      profilePayload,
      "mutation",
      mutationKey,
    ),
  );
  const readBody = await readResponse.json();
  const saveBody = await saveResponse.json();

  assert.equal(readResponse.status, 200);
  assert.equal(saveResponse.status, 200);
  assert.deepEqual(readBody.data, {
    profile: {
      businessName: "Connect",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      version: 2,
    },
  });
  assert.deepEqual(saveBody.data, {
    replayed: false,
    createdTenant: false,
    profile: { ...profilePayload, version: 3 },
  });
  assert.deepEqual(testFixture.calls.onboardingProfileReads, [11]);
  assert.equal(testFixture.calls.onboardingProfileMutations.length, 1);
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "verified-user:onboarding.business-profile.save",
  ]);
  assert.doesNotMatch(
    JSON.stringify({ readBody, saveBody }),
    /tenantId|externalUserId|requestDigest|idempotencyKey/,
  );
});

test("reads bounded conversation list and thread through the complete boundary", async () => {
  const testFixture = fixture("agent");
  const listResponse = await testFixture.handler.handle(
    request("conversations.list", {
      searchTerm: "Tal",
      status: "waiting_for_agent",
      assignment: "mine",
    }),
  );
  const threadResponse = await testFixture.handler.handle(
    request("conversations.thread.read", { conversationKey }),
  );
  const listBody = await listResponse.json();
  const threadBody = await threadResponse.json();

  assert.equal(listResponse.status, 200);
  assert.equal(threadResponse.status, 200);
  assert.equal(listBody.data.canReply, true);
  assert.equal(listBody.data.conversations.length, 1);
  assert.equal(
    listBody.data.conversations[0].assignment,
    "current-user",
  );
  assert.equal(
    threadBody.data.thread.messages[0].messageKey,
    messageKey,
  );
  assert.equal(testFixture.calls.conversationLists.length, 1);
  assert.equal(testFixture.calls.conversationThreads.length, 1);
  assert.equal(
    testFixture.calls.conversationLists[0].session.tenantId,
    11,
  );
  assert.doesNotMatch(
    JSON.stringify({ listBody, threadBody }),
    /tenantId|contactId|assignedExternalUserId|providerMessageId|verified-user/,
  );
});

test("mutates a conversation through identity, tenant, quota, and receipt boundaries", async () => {
  const testFixture = fixture("agent");
  const payload = {
    conversationKey,
    expectedVersion: 2,
  };
  const mutationKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      "conversations.mark-read",
      payload,
    );
  const response = await testFixture.handler.handle(
    request(
      "conversations.mark-read",
      payload,
      "mutation",
      mutationKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    replayed: false,
    conversation: {
      conversationKey,
      unreadCount: 0,
      version: 3,
    },
  });
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:conversations.mark-read",
  ]);
  assert.equal(testFixture.calls.conversationMutations.length, 1);
  assert.equal(
    testFixture.calls.conversationMutations[0].session.tenantId,
    11,
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|providerMessageId|verified-user/,
  );
});

test("reads bounded bot flow list and details through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const listResponse = await testFixture.handler.handle(
    request("bot.flows.list", {}),
  );
  const detailsResponse = await testFixture.handler.handle(
    request("bot.flows.details.read", { botFlowKey }),
  );
  const listBody = await listResponse.json();
  const detailsBody = await detailsResponse.json();

  assert.equal(listResponse.status, 200);
  assert.equal(detailsResponse.status, 200);
  assert.equal(listBody.data.flows[0].botFlowKey, botFlowKey);
  assert.equal(
    detailsBody.data.botFlow.versions[0].botFlowVersionKey,
    botFlowVersionKey,
  );
  assert.deepEqual(
    testFixture.calls.botFlowReads.map(({ operation }) => operation),
    ["list", "details"],
  );
  assert.doesNotMatch(
    JSON.stringify({ listBody, detailsBody }),
    /tenantId|externalUserId|verified-user/,
  );
});

test("mutates bot flow draft and publication through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const draftPayload = {
    definition: botFlowDefinition(),
    expectedFlowVersion: null,
  };
  const publishPayload = {
    botFlowKey,
    botFlowVersionKey,
    expectedFlowVersion: 1,
  };
  const draftKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "bot.flows.draft.save",
    draftPayload,
  );
  const publishKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "bot.flows.publish",
    publishPayload,
  );
  const draftResponse = await testFixture.handler.handle(
    request("bot.flows.draft.save", draftPayload, "mutation", draftKey),
  );
  const publishResponse = await testFixture.handler.handle(
    request("bot.flows.publish", publishPayload, "mutation", publishKey),
  );
  const draftBody = await draftResponse.json();
  const publishBody = await publishResponse.json();

  assert.equal(draftResponse.status, 200);
  assert.equal(publishResponse.status, 200);
  assert.equal(draftBody.data.outcome, "created");
  assert.equal(publishBody.data.outcome, "updated");
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:bot.flows.draft.save",
    "11:verified-user:bot.flows.publish",
  ]);
  assert.equal(testFixture.calls.botFlowMutations.length, 2);
  assert.doesNotMatch(
    JSON.stringify({ draftBody, publishBody }),
    /tenantId|externalUserId|verified-user/,
  );
});

test("reads and decides AI reply approvals through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const listResponse = await testFixture.handler.handle(
    request("ai.reply-approvals.list", {}),
  );
  const listBody = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listBody.data.canDecide, true);
  assert.equal(listBody.data.approvals[0].outboxKey, aiReplyOutboxKey);

  const payload = {
    outboxKey: aiReplyOutboxKey,
    expectedVersion: 1,
    decision: "approve",
  };
  const mutationKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "ai.reply-approvals.decide",
    payload,
  );
  const response = await testFixture.handler.handle(
    request(
      "ai.reply-approvals.decide",
      payload,
      "mutation",
      mutationKey,
    ),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    replayed: false,
    outcome: "updated",
    approval: {
      outboxKey: aiReplyOutboxKey,
      status: "ready-for-delivery",
      version: 2,
    },
  });
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:ai.reply-approvals.decide",
  ]);
  assert.equal(testFixture.calls.aiReplyApprovalReads.length, 1);
  assert.equal(testFixture.calls.aiReplyApprovalMutations.length, 1);
  assert.doesNotMatch(
    JSON.stringify({ listBody, body }),
    /tenantId|externalUserId|recipientPhoneNumber|requestKey|auditKey/,
  );
});

test("reads and mutates campaigns through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const directoryResponse = await testFixture.handler.handle(
    request("campaigns.directory.read", {}, "query", null),
  );
  const directoryBody = await directoryResponse.json();
  assert.equal(directoryResponse.status, 200);
  assert.deepEqual(directoryBody.data.campaigns, []);
  assert.equal(directoryBody.data.canWrite, true);
  assert.equal(directoryBody.data.deliveryStatus, "ready");

  const snapshotPayload = {
    name: "Campaign",
    deliveryMode: "immediate",
    scheduledAt: null,
    templateKey: `template_v1_${"2".repeat(64)}`,
    audienceSource: { kind: "all" },
    personalizationMapping: {},
  };
  const snapshotKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "campaigns.snapshot.save",
    snapshotPayload,
  );
  const snapshotResponse = await testFixture.handler.handle(
    request(
      "campaigns.snapshot.save",
      snapshotPayload,
      "mutation",
      snapshotKey,
    ),
  );
  const snapshotBody = await snapshotResponse.json();
  assert.equal(snapshotResponse.status, 200);
  assert.equal(snapshotBody.data.outcome, "saved");

  const activationPayload = {
    campaignKey: snapshotBody.data.campaign.campaignKey,
    expectedVersion: 1,
  };
  const activationKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "campaigns.activate",
    activationPayload,
  );
  const activationResponse = await testFixture.handler.handle(
    request(
      "campaigns.activate",
      activationPayload,
      "mutation",
      activationKey,
    ),
  );
  const activationBody = await activationResponse.json();
  assert.equal(activationResponse.status, 200);
  assert.equal(activationBody.data.campaign.status, "scheduled");
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:campaigns.snapshot.save",
    "11:verified-user:campaigns.activate",
  ]);
  assert.equal(testFixture.calls.campaignMutations.length, 2);
  assert.doesNotMatch(
    JSON.stringify({ directoryBody, snapshotBody, activationBody }),
    /tenantId|externalUserId|verified-user/,
  );
});

test("reads, saves, and stages message templates through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const listResponse = await testFixture.handler.handle(
    request("templates.list", {}),
  );
  const draftPayload = {
    name: "service_update",
    category: "UTILITY",
    language: "he",
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: { 1: "טל" },
    buttonMode: "none",
    quickReplies: [],
    urlButton: {
      enabled: false,
      mode: "static",
      text: "",
      value: "",
      example: "",
    },
    phoneButton: {
      enabled: false,
      text: "",
      value: "",
    },
  };
  const draftIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      "templates.draft.save",
      draftPayload,
    );
  const saveResponse = await testFixture.handler.handle(
    request(
      "templates.draft.save",
      draftPayload,
      "mutation",
      draftIdempotencyKey,
    ),
  );
  const submissionPayload = {
    templateKey: `template_v1_${"e".repeat(64)}`,
  };
  const submissionIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      "templates.submit",
      submissionPayload,
    );
  const submissionResponse = await testFixture.handler.handle(
    request(
      "templates.submit",
      submissionPayload,
      "mutation",
      submissionIdempotencyKey,
    ),
  );
  const listBody = await listResponse.json();
  const saveBody = await saveResponse.json();
  const submissionBody = await submissionResponse.json();

  assert.equal(listResponse.status, 200);
  assert.deepEqual(listBody.data, { templates: [], canWrite: true });
  assert.equal(saveResponse.status, 200);
  assert.equal(submissionResponse.status, 200);
  assert.equal(saveBody.data.template.status, "draft");
  assert.equal(testFixture.calls.messageTemplateReads.length, 1);
  assert.equal(testFixture.calls.messageTemplateDrafts.length, 1);
  assert.equal(testFixture.calls.messageTemplateSubmissions.length, 1);
  assert.equal(submissionBody.data.status, "pending");
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:templates.draft.save",
    "11:verified-user:templates.submit",
  ]);
  assert.doesNotMatch(
    JSON.stringify(saveBody),
    /tenantId|externalUserId|metaTemplateId|createdAt/,
  );
});

test("runs a tenant-scoped contact mutation through every security boundary", async () => {
  const testFixture = fixture("manager");
  const contactPayload = {
    phoneNumber: "+972501234567",
    firstName: "Tal",
    lastName: null,
    email: null,
    company: "Connect",
    submissionOccurredAt: "2026-08-20T20:00:00.000Z",
  };
  const contactIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      "contacts.save",
      contactPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      "contacts.save",
      contactPayload,
      "mutation",
      contactIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.replayed, false);
  assert.equal(body.data.contact.id, 31);
  assert.equal(body.data.contact.phoneNumber, "+972501234567");
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|createdAt|updatedAt/,
  );
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:contacts.save",
  ]);
  assert.equal(testFixture.calls.mutationCommands.length, 1);
  assert.equal(
    testFixture.calls.mutationCommands[0].idempotencyKey,
    contactIdempotencyKey,
  );
  assert.match(
    testFixture.calls.mutationCommands[0].requestDigest,
    /^railway_mutation_request_v1_[0-9a-f]{64}$/,
  );
});

test("records contact consent through identity, tenant, quota, and PostgreSQL service boundaries", async () => {
  const testFixture = fixture("manager");
  const operationId = "contacts.consent.grant";
  const payload = {
    contactId: 31,
    source: "website-form",
    occurredAt: "2026-08-20T20:05:00.000Z",
    evidenceReference: "consent-evidence-v1",
  };
  const consentIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      payload,
    );
  const response = await testFixture.handler.handle(
    request(
      operationId,
      payload,
      "mutation",
      consentIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.contact.id, 31);
  assert.equal(body.data.contact.consentStatus, "granted");
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:contacts.consent.grant",
  ]);
  assert.equal(testFixture.calls.contactConsents.length, 1);
  assert.equal(
    testFixture.calls.contactConsents[0].session.tenantId,
    11,
  );
  assert.deepEqual(testFixture.calls.contactConsents[0].input, {
    source: "website-form",
    occurredAt: "2026-08-20T20:05:00.000Z",
    evidenceReference: "consent-evidence-v1",
  });
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|consentEvidenceReference|createdAt|updatedAt/,
  );
});

test("sets contact organization membership through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const operationId = "contacts.organization.list-membership";
  const payload = {
    contactId: 31,
    groupId: 8,
    assigned: true,
  };
  const organizationIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      payload,
    );
  const response = await testFixture.handler.handle(
    request(
      operationId,
      payload,
      "mutation",
      organizationIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.replayed, false);
  assert.deepEqual(body.data.organization.scopeContactIds, [31]);
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:contacts.organization.list-membership",
  ]);
  const mutationCall = testFixture.calls.contactOrganizations.find(
    (entry) => "mutation" in entry,
  );
  assert.equal(mutationCall.mutation.session.tenantId, 11);
  assert.equal(mutationCall.mutation.operation, operationId);
  assert.equal(
    mutationCall.mutation.idempotencyKey,
    organizationIdempotencyKey,
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|requestDigest|idempotencyKey/,
  );
});

test("returns permission denied before an agent reaches reports", async () => {
  const testFixture = fixture("agent");
  const response = await testFixture.handler.handle(
    request("reports.read", {
      startDate: "2026-08-01",
      endDate: "2026-08-17",
    }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "error",
    code: "PERMISSION_DENIED",
  });
  assert.deepEqual(testFixture.calls.reports, []);
});

test("returns a bounded PostgreSQL operational report through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const input = {
    startDate: "2026-08-01",
    endDate: "2026-08-17",
  };
  const response = await testFixture.handler.handle(
    request("reports.read", input),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data.period, input);
  assert.equal(body.data.generatedAt, "2026-08-17T12:00:00.000Z");
  assert.equal(body.data.messages.total, 0);
  assert.equal(testFixture.calls.memberships, 1);
  assert.equal(testFixture.calls.reports.length, 1);
  assert.deepEqual(testFixture.calls.reports[0].input, input);
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|startAt|endAt|verified-user/,
  );
});

test("rejects invalid operation payload before tenant lookup", async () => {
  const testFixture = fixture();
  const response = await testFixture.handler.handle(
    request("contacts.list", {
      beforeContactId: null,
      tenantId: 11,
    }),
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_REQUEST");
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(testFixture.calls.contacts, []);
});
