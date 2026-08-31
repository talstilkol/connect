import assert from "node:assert/strict";
import test from "node:test";

import {
  ContactNotFoundError,
} from "../db/contactConsentRepository.ts";

import {
  ContactCursorInputError,
} from "../server/contacts/contactService.ts";
import {
  ConversationServiceError,
} from "../server/conversations/conversationService.ts";
import {
  OperationalReportInputError,
} from "../server/reports/operationalReportService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";
import {
  createRailwayApiOperationRegistry,
  railwayApiOperationPolicies,
} from "../server/platform/railwayApiOperationRegistry.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

const dispatchContext = {
  serviceIdentity: {
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject:
      "owner:connect-team:project:connect-web:environment:production",
  },
  userIdentity: {
    externalUserId: "verified-user",
  },
};
const contactProfile = {
  phoneNumber: "+972501234567",
  firstName: "Tal",
  lastName: null,
  email: null,
  company: "Connect",
};
const contactSavePayload = {
  ...contactProfile,
  submissionOccurredAt: "2026-08-20T20:00:00.000Z",
};
const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const messageKey = `message_v1_${"b".repeat(64)}`;
const botFlowKey = `bot_flow_v1_${"c".repeat(64)}`;
const botFlowVersionKey = `bot_flow_version_v1_${"d".repeat(64)}`;
const botTriggerKey = `bot_block_v1_${"e".repeat(64)}`;
const botEndKey = `bot_block_v1_${"f".repeat(64)}`;
const idempotencyKey =
  await deriveRailwayApiDeterministicIdempotencyKey(
    "contacts.save",
    contactSavePayload,
  );
const contactConsentPayload = {
  contactId: 23,
  source: "website-form",
  occurredAt: "2026-08-20T20:05:00.000Z",
  evidenceReference: "consent-evidence-v1",
};
const messageTemplateDraftPayload = {
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

function mutationRequest(payload = contactSavePayload) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation: "contacts.save",
    requestKind: "mutation",
    idempotencyKey,
    payload,
  };
}

async function consentMutationRequest(
  operation,
  payload = contactConsentPayload,
) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation,
    requestKind: "mutation",
    idempotencyKey:
      await deriveRailwayApiDeterministicIdempotencyKey(
        operation,
        payload,
      ),
    payload,
  };
}

async function organizationMutationRequest(operation, payload) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation,
    requestKind: "mutation",
    idempotencyKey:
      await deriveRailwayApiDeterministicIdempotencyKey(
        operation,
        payload,
      ),
    payload,
  };
}

async function importMutationRequest(operation, payload) {
  return organizationMutationRequest(operation, payload);
}

function session(role = "owner") {
  return {
    externalUserId: "verified-user",
    tenantId: 7,
    displayName: "Verified workspace",
    status: "active",
    role,
  };
}

function persistedContact(overrides = {}) {
  return {
    id: 23,
    tenantId: 7,
    phoneNumber: "+972501234567",
    firstName: null,
    lastName: null,
    email: null,
    company: null,
    mailingStatus: "subscribed",
    consentStatus: "granted",
    consentSource: "verified-source",
    consentRecordedAt: "2026-08-17T00:00:00.000Z",
    consentWithdrawnAt: null,
    consentEvidenceReference: "private-evidence",
    version: 4,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

function contactRecord(overrides = {}) {
  const contact = persistedContact(overrides);

  return {
    id: contact.id,
    phoneNumber: contact.phoneNumber,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    company: contact.company,
    mailingStatus: contact.mailingStatus,
    consentStatus: contact.consentStatus,
    consentSource: contact.consentSource,
    consentRecordedAt: contact.consentRecordedAt,
    consentWithdrawnAt: contact.consentWithdrawnAt,
    version: contact.version,
  };
}

function persistedConversation(overrides = {}) {
  return {
    conversationKey,
    tenantId: 7,
    contactId: 23,
    status: "waiting_for_agent",
    assignedExternalUserId: "verified-user",
    unreadCount: 2,
    lastMessageKey: messageKey,
    lastMessageAt: "2026-08-21T09:00:00.000Z",
    version: 3,
    createdAt: "2026-08-21T08:55:00.000Z",
    updatedAt: "2026-08-21T09:00:00.000Z",
    contact: {
      phoneNumber: "+972501234567",
      firstName: "Tal",
      lastName: "Cohen",
    },
    lastMessage: {
      direction: "inbound",
      contentKind: "text",
      textContent: "Need help",
    },
    ...overrides,
  };
}

function persistedMessage(overrides = {}) {
  return {
    messageKey,
    conversationKey,
    tenantId: 7,
    providerMessageId: "wamid.private-provider-id",
    direction: "inbound",
    contentKind: "text",
    status: "received",
    textContent: "Need help",
    occurredAt: "2026-08-21T09:00:00.000Z",
    statusUpdatedAt: "2026-08-21T09:00:00.000Z",
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    createdAt: "2026-08-21T09:00:00.000Z",
    updatedAt: "2026-08-21T09:00:00.000Z",
    ...overrides,
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
      {
        blockKey: botEndKey,
        type: "end",
      },
    ],
  };
}

function persistedBotFlow(overrides = {}) {
  return {
    botFlowKey,
    tenantId: 7,
    name: "מענה ראשוני",
    status: "draft",
    latestVersionKey: botFlowVersionKey,
    latestVersionNumber: 1,
    activeVersionKey: null,
    version: 1,
    createdAt: "2026-08-21T08:00:00.000Z",
    updatedAt: "2026-08-21T08:00:00.000Z",
    ...overrides,
  };
}

function persistedBotFlowVersion(overrides = {}) {
  return {
    botFlowVersionKey,
    botFlowKey,
    tenantId: 7,
    versionNumber: 1,
    status: "draft",
    definition: botFlowDefinition(),
    publishedAt: null,
    createdAt: "2026-08-21T08:00:00.000Z",
    ...overrides,
  };
}

function botFlowSummary(overrides = {}) {
  const persisted = persistedBotFlow(overrides);
  return {
    botFlowKey: persisted.botFlowKey,
    name: persisted.name,
    status: persisted.status,
    latestVersionKey: persisted.latestVersionKey,
    latestVersionNumber: persisted.latestVersionNumber,
    activeVersionKey: persisted.activeVersionKey,
    version: persisted.version,
    createdAt: persisted.createdAt,
    updatedAt: persisted.updatedAt,
  };
}

const campaignKey = `campaign_v1_${"1".repeat(64)}`;
const campaignTemplateKey = `template_v1_${"2".repeat(64)}`;
const aiReplyOutboxKey = `ai_reply_outbox_v1_${"4".repeat(64)}`;

function persistedAiReplyApproval(overrides = {}) {
  return {
    outboxKey: aiReplyOutboxKey,
    requestKey: `ai_provider_request_v1_${"5".repeat(64)}`,
    auditKey: `ai_runtime_audit_v1_${"6".repeat(64)}`,
    tenantId: 7,
    conversationKey,
    inboundMessageKey: messageKey,
    aiAgentKey: `ai_agent_v1_${"7".repeat(64)}`,
    aiAgentVersionKey: `ai_agent_version_v1_${"8".repeat(64)}`,
    expectedConversationVersion: 3,
    recipientPhoneNumber: "+972501234567",
    responseMode: "agent-approval",
    replyText: "Approved grounded reply",
    groundedSourceKeys: [`knowledge_source_v1_${"9".repeat(64)}`],
    groundingScoreBasisPoints: 9_000,
    status: "awaiting-approval",
    decidedByExternalUserId: null,
    decidedAt: null,
    version: 1,
    createdAt: "2026-08-21T09:01:00.000Z",
    updatedAt: "2026-08-21T09:01:00.000Z",
    ...overrides,
  };
}

function persistedCampaign(overrides = {}) {
  return {
    campaignKey,
    tenantId: 7,
    name: "Campaign",
    status: "draft",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: {
      templateKey: campaignTemplateKey,
      metaTemplateId: "1234567890",
      name: "campaign_template",
      category: "UTILITY",
      language: "he",
      version: 1,
      header: "",
      body: "Update",
      footer: "",
      variableExamples: {},
      buttonMode: "none",
      quickReplies: [],
      urlButton: {
        enabled: false,
        mode: "static",
        text: "",
        value: "",
        example: "",
      },
      phoneButton: { enabled: false, text: "", value: "" },
    },
    audienceSnapshotKey: "3".repeat(64),
    recipientCount: 2,
    version: 1,
    activatedAt: null,
    startedAt: null,
    completedAt: null,
    lastErrorCode: null,
    createdAt: "2026-08-21T10:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
    ...overrides,
  };
}

function fixture({
  tenantSession = session(),
  tenantError = null,
  conversationListError = null,
  conversationThreadError = null,
  contactError = null,
  consentError = null,
  consentResult = undefined,
  organizationMutationError = null,
  organizationMutationOutcome = "committed",
  organizationMutationResult = undefined,
  reportError = null,
  rateLimitDecision = { outcome: "allowed" },
  rateLimitError = null,
  mutationOutcome = "committed",
  mutationError = null,
  mutationResult = undefined,
} = {}) {
  const calls = {
    tenantIdentities: [],
    conversationListInputs: [],
    conversationThreadInputs: [],
    conversationMutationCommands: [],
    botFlowListSessions: [],
    botFlowDetailsInputs: [],
    botFlowMutationCommands: [],
    aiAgentReads: [],
    aiAgentMutationCommands: [],
    aiReplyApprovalListSessions: [],
    aiReplyApprovalMutationCommands: [],
    campaignListSessions: [],
    campaignMutationCommands: [],
    contactInputs: [],
    consentInputs: [],
    organizationInputs: [],
    organizationMutationCommands: [],
    contactImportMutationCommands: [],
    messageTemplateListSessions: [],
    messageTemplateDraftMutationCommands: [],
    messageTemplateSubmissionMutationCommands: [],
    reportInputs: [],
    rateLimitSubjects: [],
    mutationCommands: [],
  };
  const registry = createRailwayApiOperationRegistry({
    tenantSessions: {
      async resolve(identity) {
        calls.tenantIdentities.push(identity);

        if (tenantError) {
          throw tenantError;
        }

        return tenantSession;
      },
    },
    conversations: {
      async list(receivedSession, filters) {
        calls.conversationListInputs.push({
          session: receivedSession,
          filters,
        });
        if (conversationListError) throw conversationListError;
        return [persistedConversation()];
      },
      async readThread(receivedSession, requestedConversationKey) {
        calls.conversationThreadInputs.push({
          session: receivedSession,
          conversationKey: requestedConversationKey,
        });
        if (conversationThreadError) throw conversationThreadError;
        return {
          conversation: persistedConversation({
            conversationKey: requestedConversationKey,
          }),
          messages: [persistedMessage({
            conversationKey: requestedConversationKey,
          })],
        };
      },
    },
    conversationMutations: {
      async execute(command) {
        calls.conversationMutationCommands.push(command);
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
      async list(receivedSession) {
        calls.botFlowListSessions.push(receivedSession);
        return [persistedBotFlow()];
      },
      async readDetails(receivedSession, requestedBotFlowKey) {
        calls.botFlowDetailsInputs.push({
          session: receivedSession,
          botFlowKey: requestedBotFlowKey,
        });
        return {
          flow: persistedBotFlow({ botFlowKey: requestedBotFlowKey }),
          versions: [persistedBotFlowVersion({
            botFlowKey: requestedBotFlowKey,
          })],
        };
      },
    },
    botFlowMutations: {
      async execute(command) {
        calls.botFlowMutationCommands.push(command);
        if (command.operation === "bot.flows.draft.save") {
          const flowVersion = command.payload.expectedFlowVersion === null
            ? 1
            : command.payload.expectedFlowVersion + 1;
          return {
            outcome: "committed",
            tenantId: command.session.tenantId,
            state: {
              outcome: command.payload.expectedFlowVersion === null
                ? "created"
                : "updated",
              flow: botFlowSummary({ version: flowVersion }),
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
      async list(receivedSession) {
        calls.aiAgentReads.push({ operation: "list", session: receivedSession });
        return [];
      },
      async listKnowledgeSources(receivedSession) {
        calls.aiAgentReads.push({
          operation: "list-knowledge-sources",
          session: receivedSession,
        });
        return [];
      },
      async readDetails(receivedSession, aiAgentKey) {
        calls.aiAgentReads.push({
          operation: "details",
          session: receivedSession,
          aiAgentKey,
        });
        throw new Error("unused AI agent fixture");
      },
    },
    aiAgentMutations: {
      async execute(command) {
        calls.aiAgentMutationCommands.push(command);
        return { outcome: "unavailable", tenantId: null, state: null };
      },
    },
    aiReplyApprovals: {
      async listAwaiting(receivedSession) {
        calls.aiReplyApprovalListSessions.push(receivedSession);
        return [persistedAiReplyApproval({
          tenantId: receivedSession.tenantId,
        })];
      },
    },
    aiReplyApprovalMutations: {
      async execute(command) {
        calls.aiReplyApprovalMutationCommands.push(command);
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
      async list(receivedSession) {
        calls.campaignListSessions.push(receivedSession);
        return [persistedCampaign({ tenantId: receivedSession.tenantId })];
      },
    },
    campaignMutations: {
      async execute(command) {
        calls.campaignMutationCommands.push(command);
        return command.operation === "campaigns.snapshot.save"
          ? {
              outcome: "committed",
              tenantId: command.session.tenantId,
              state: {
                outcome: "saved",
                campaign: {
                  campaignKey,
                  name: command.payload.name,
                  status: "draft",
                  deliveryMode: command.payload.deliveryMode,
                  scheduledAt: command.payload.scheduledAt,
                  timezone: "Asia/Jerusalem",
                  templateName: "campaign_template",
                  templateLanguage: "he",
                  recipientCount: 2,
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
      async list(receivedSession, beforeContactId) {
        calls.contactInputs.push({
          session: receivedSession,
          beforeContactId,
        });

        if (contactError) {
          throw contactError;
        }

        return {
          contacts: [persistedContact()],
          nextCursor: null,
        };
      },
    },
    contactConsent: {
      async grantConsent(receivedSession, contactId, input) {
        calls.consentInputs.push({
          action: "grant",
          session: receivedSession,
          contactId,
          input,
        });
        if (consentError) throw consentError;
        return consentResult ?? persistedContact({
          id: contactId,
          consentStatus: "granted",
          mailingStatus: "subscribed",
          consentSource: input.source,
          consentRecordedAt: input.occurredAt,
          consentWithdrawnAt: null,
        });
      },
      async unsubscribe(receivedSession, contactId, input) {
        calls.consentInputs.push({
          action: "unsubscribe",
          session: receivedSession,
          contactId,
          input,
        });
        if (consentError) throw consentError;
        return consentResult ?? persistedContact({
          id: contactId,
          consentStatus: "withdrawn",
          mailingStatus: "unsubscribed",
          consentSource: input.source,
          consentWithdrawnAt: input.occurredAt,
        });
      },
    },
    contactOrganization: {
      async read(receivedSession, contactIds) {
        calls.organizationInputs.push({
          session: receivedSession,
          contactIds,
        });
        return {
          scopeContactIds: contactIds,
          tags: [{
            id: 5,
            name: "Customers",
            contactCount: 1,
            internalTagKey: "private-tag-key",
          }],
          lists: [],
          tagAssignments: [{ contactId: 23, tagId: 5 }],
          listMemberships: [],
          internalTenantId: receivedSession.tenantId,
        };
      },
    },
    contactOrganizationMutations: {
      async execute(command) {
        calls.organizationMutationCommands.push(command);
        if (organizationMutationError) throw organizationMutationError;
        if (organizationMutationResult !== undefined) {
          return organizationMutationResult;
        }
        const contactIds = "contactId" in command.payload
          ? [command.payload.contactId]
          : [];

        return {
          outcome: organizationMutationOutcome,
          tenantId:
            organizationMutationOutcome === "committed" ||
            organizationMutationOutcome === "replayed"
              ? command.session.tenantId
              : null,
          organization:
            organizationMutationOutcome === "committed" ||
            organizationMutationOutcome === "replayed"
              ? {
                  scopeContactIds: contactIds,
                  tags: [],
                  lists: [],
                  tagAssignments: [],
                  listMemberships: [],
                }
              : null,
        };
      },
    },
    contactImportMutations: {
      async execute(command) {
        calls.contactImportMutationCommands.push(command);
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
      async list(receivedSession) {
        calls.messageTemplateListSessions.push(receivedSession);

        return [{
          templateKey: `template_v1_${"e".repeat(64)}`,
          tenantId: receivedSession.tenantId,
          metaTemplateId: null,
          ...messageTemplateDraftPayload,
          status: "draft",
          submissionKey: null,
          submissionStartedAt: null,
          lastSubmissionErrorCode: null,
          lastStatusEventKey: null,
          lastStatusEventAt: null,
          version: 1,
          submittedAt: null,
          reviewedAt: null,
          createdAt: "2026-08-21T08:00:00.000Z",
          updatedAt: "2026-08-21T08:00:00.000Z",
        }];
      },
    },
    messageTemplateDraftMutations: {
      async execute(command) {
        calls.messageTemplateDraftMutationCommands.push(command);

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
        calls.messageTemplateSubmissionMutationCommands.push(command);
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
      async read(receivedSession, input) {
        calls.reportInputs.push({
          session: receivedSession,
          input,
        });

        if (reportError) {
          throw reportError;
        }

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
        calls.rateLimitSubjects.push(subject);

        if (rateLimitError) {
          throw rateLimitError;
        }

        return rateLimitDecision;
      },
    },
    mutations: {
      async saveContact(command) {
        calls.mutationCommands.push(command);

        if (mutationError) {
          throw mutationError;
        }

        if (mutationResult !== undefined) {
          return mutationResult;
        }

        if (
          mutationOutcome === "conflict" ||
          mutationOutcome === "unavailable"
        ) {
          return {
            outcome: mutationOutcome,
            tenantId: null,
            contact: null,
          };
        }

        return {
          outcome: mutationOutcome,
          tenantId: command.session.tenantId,
          contact: contactRecord({
            phoneNumber: command.profile.phoneNumber,
            firstName: command.profile.firstName,
            lastName: command.profile.lastName,
            email: command.profile.email,
            company: command.profile.company,
          }),
        };
      },
    },
  });

  return { calls, registry };
}

function operation(registry, id) {
  const found = registry.operations.find(
    (candidate) => candidate.id === id,
  );

  assert.ok(found);
  return found;
}

test("publishes one immutable policy for every concrete operation", () => {
  assert.deepEqual(railwayApiOperationPolicies, [
    {
      id: "workspace.context.read",
      requestKind: "query",
      permission: null,
      mutationSafety: null,
    },
    {
      id: "conversations.list",
      requestKind: "query",
      permission: "conversations.read",
      mutationSafety: null,
    },
    {
      id: "conversations.thread.read",
      requestKind: "query",
      permission: "conversations.read",
      mutationSafety: null,
    },
    {
      id: "conversations.mark-read",
      requestKind: "mutation",
      permission: "conversations.reply",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "conversations.assignment.change",
      requestKind: "mutation",
      permission: "conversations.reply",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "bot.flows.list",
      requestKind: "query",
      permission: "bot.read",
      mutationSafety: null,
    },
    {
      id: "bot.flows.details.read",
      requestKind: "query",
      permission: "bot.read",
      mutationSafety: null,
    },
    {
      id: "bot.flows.draft.save",
      requestKind: "mutation",
      permission: "bot.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "bot.flows.publish",
      requestKind: "mutation",
      permission: "bot.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "ai.agents.directory.read",
      requestKind: "query",
      permission: "ai.read",
      mutationSafety: null,
    },
    {
      id: "ai.agents.details.read",
      requestKind: "query",
      permission: "ai.read",
      mutationSafety: null,
    },
    ...["ai.agents.draft.save", "ai.agents.publish"].map((id) => ({
      id,
      requestKind: "mutation",
      permission: "ai.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    })),
    {
      id: "ai.reply-approvals.list",
      requestKind: "query",
      permission: "conversations.read",
      mutationSafety: null,
    },
    {
      id: "ai.reply-approvals.decide",
      requestKind: "mutation",
      permission: "conversations.reply",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "campaigns.directory.read",
      requestKind: "query",
      permission: "campaigns.read",
      mutationSafety: null,
    },
    {
      id: "campaigns.snapshot.save",
      requestKind: "mutation",
      permission: "campaigns.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "campaigns.activate",
      requestKind: "mutation",
      permission: "campaigns.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "contacts.list",
      requestKind: "query",
      permission: "contacts.read",
      mutationSafety: null,
    },
    {
      id: "contacts.save",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "contacts.consent.grant",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "deterministic-domain-event-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "contacts.consent.unsubscribe",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "deterministic-domain-event-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "contacts.organization.tag.save",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "contacts.organization.list.save",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "contacts.organization.tag-assignment",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "contacts.organization.list-membership",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "contacts.import.start",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "contacts.import.chunk",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "templates.list",
      requestKind: "query",
      permission: "templates.read",
      mutationSafety: null,
    },
    {
      id: "templates.draft.save",
      requestKind: "mutation",
      permission: "templates.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "templates.submit",
      requestKind: "mutation",
      permission: "templates.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "reports.read",
      requestKind: "query",
      permission: "reports.read",
      mutationSafety: null,
    },
  ]);
  assert.equal(Object.isFrozen(railwayApiOperationPolicies), true);
  assert.equal(
    railwayApiOperationPolicies.every(Object.isFrozen),
    true,
  );

  const { registry } = fixture();
  assert.deepEqual(
    registry.operations.map(({ id, requestKind }) => ({
      id,
      requestKind,
    })),
    railwayApiOperationPolicies.map(({ id, requestKind }) => ({
      id,
      requestKind,
    })),
  );
  assert.equal(Object.isFrozen(registry.operations), true);
});

test("returns bounded workspace context without internal identity", async () => {
  const { calls, registry } = fixture();
  const result = await operation(
    registry,
    "workspace.context.read",
  ).execute(dispatchContext, {}, {});

  assert.deepEqual(result, {
    displayName: "Verified workspace",
    status: "active",
    role: "owner",
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|verified-user|"7"/,
  );
  assert.deepEqual(calls.tenantIdentities, [
    dispatchContext.userIdentity,
  ]);
});

test("lists conversations through the selected tenant without leaking internal identities", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("agent"),
  });
  const filters = {
    searchTerm: "  Tal  ",
    status: "waiting_for_agent",
    assignment: "mine",
  };
  const result = await operation(
    registry,
    "conversations.list",
  ).execute(dispatchContext, filters, {});

  assert.deepEqual(calls.conversationListInputs, [{
    session: session("agent"),
    filters: {
      searchTerm: "Tal",
      status: "waiting_for_agent",
      assignment: "mine",
    },
  }]);
  assert.equal(result.canReply, true);
  assert.equal(result.conversations.length, 1);
  assert.equal(result.conversations[0].assignment, "current-user");
  assert.equal(result.conversations[0].contact.displayName, "Tal Cohen");
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|contactId|assignedExternalUserId|verified-user|providerMessageId/,
  );
});

test("reads a bounded conversation thread and maps service failures", async () => {
  const available = fixture();
  const result = await operation(
    available.registry,
    "conversations.thread.read",
  ).execute(dispatchContext, { conversationKey }, {});

  assert.equal(available.calls.conversationThreadInputs.length, 1);
  assert.equal(
    available.calls.conversationThreadInputs[0].session.tenantId,
    7,
  );
  assert.equal(result.thread.messages[0].messageKey, messageKey);
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|contactId|assignedExternalUserId|verified-user|providerMessageId|lastStatusEventKey/,
  );

  const missing = fixture({
    conversationThreadError: new ConversationServiceError("NOT_FOUND"),
  });
  await assert.rejects(
    operation(
      missing.registry,
      "conversations.thread.read",
    ).execute(dispatchContext, { conversationKey }, {}),
    (error) => error.code === "NOT_FOUND",
  );

  const unavailable = fixture({
    conversationListError:
      new ConversationServiceError("PERSISTENCE_FAILED"),
  });
  await assert.rejects(
    operation(
      unavailable.registry,
      "conversations.list",
    ).execute(dispatchContext, {
      searchTerm: "",
      status: "all",
      assignment: "all",
    }, {}),
    (error) => error.code === "DEPENDENCY_UNAVAILABLE",
  );
});

test("mutates conversations through deterministic receipts, quota, and bounded state", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("agent"),
  });
  const cases = [
    {
      operationId: "conversations.mark-read",
      payload: { conversationKey, expectedVersion: 3 },
      expected: {
        conversationKey,
        unreadCount: 0,
        version: 4,
      },
    },
    {
      operationId: "conversations.assignment.change",
      payload: {
        conversationKey,
        expectedVersion: 4,
        action: "assign-self",
      },
      expected: {
        conversationKey,
        assignment: "current-user",
        version: 5,
      },
    },
  ];

  for (const candidate of cases) {
    const mutationKey =
      await deriveRailwayApiDeterministicIdempotencyKey(
        candidate.operationId,
        candidate.payload,
      );
    const result = await operation(
      registry,
      candidate.operationId,
    ).execute(dispatchContext, candidate.payload, {
      operation: candidate.operationId,
      requestKind: "mutation",
      idempotencyKey: mutationKey,
    });

    assert.deepEqual(result, {
      replayed: false,
      conversation: candidate.expected,
    });
  }

  assert.deepEqual(calls.rateLimitSubjects, [
    "7:verified-user:conversations.mark-read",
    "7:verified-user:conversations.assignment.change",
  ]);
  assert.equal(calls.conversationMutationCommands.length, 2);
  assert.match(
    calls.conversationMutationCommands[0].requestDigest,
    /^railway_mutation_request_v1_[0-9a-f]{64}$/,
  );
});

test("reads bounded bot flow summaries and details without tenant identities", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("manager"),
  });
  const listed = await operation(
    registry,
    "bot.flows.list",
  ).execute(dispatchContext, {}, {});
  const loaded = await operation(
    registry,
    "bot.flows.details.read",
  ).execute(dispatchContext, { botFlowKey }, {});

  assert.equal(listed.canWrite, true);
  assert.equal(listed.flows[0].botFlowKey, botFlowKey);
  assert.equal(loaded.botFlow.versions[0].botFlowVersionKey, botFlowVersionKey);
  assert.equal(calls.botFlowListSessions[0].tenantId, 7);
  assert.deepEqual(calls.botFlowDetailsInputs, [{
    session: session("manager"),
    botFlowKey,
  }]);
  assert.doesNotMatch(
    JSON.stringify({ listed, loaded }),
    /tenantId|externalUserId|verified-user/,
  );
});

test("saves and publishes bot flows through quota and atomic mutation receipts", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("manager"),
  });
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

  const saved = await operation(registry, "bot.flows.draft.save").execute(
    dispatchContext,
    draftPayload,
    {
      operation: "bot.flows.draft.save",
      requestKind: "mutation",
      idempotencyKey: draftKey,
    },
  );
  const published = await operation(registry, "bot.flows.publish").execute(
    dispatchContext,
    publishPayload,
    {
      operation: "bot.flows.publish",
      requestKind: "mutation",
      idempotencyKey: publishKey,
    },
  );

  assert.equal(saved.outcome, "created");
  assert.equal(saved.flow.botFlowKey, botFlowKey);
  assert.equal(published.outcome, "updated");
  assert.equal(published.flow.status, "active");
  assert.deepEqual(calls.rateLimitSubjects, [
    "7:verified-user:bot.flows.draft.save",
    "7:verified-user:bot.flows.publish",
  ]);
  assert.equal(calls.botFlowMutationCommands.length, 2);
  assert.match(
    calls.botFlowMutationCommands[0].requestDigest,
    /^railway_mutation_request_v1_[0-9a-f]{64}$/,
  );
  assert.doesNotMatch(
    JSON.stringify({ saved, published }),
    /tenantId|externalUserId|verified-user/,
  );
});

test("lists and decides AI reply approvals through bounded Railway operations", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("manager"),
  });
  const directory = await operation(
    registry,
    "ai.reply-approvals.list",
  ).execute(dispatchContext, {}, {});
  assert.equal(directory.canDecide, true);
  assert.deepEqual(directory.approvals, [{
    outboxKey: aiReplyOutboxKey,
    conversationKey,
    replyText: "Approved grounded reply",
    groundedSourceCount: 1,
    groundingScoreBasisPoints: 9_000,
    version: 1,
    createdAt: "2026-08-21T09:01:00.000Z",
  }]);

  const payload = {
    outboxKey: aiReplyOutboxKey,
    expectedVersion: 1,
    decision: "approve",
  };
  const mutationKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "ai.reply-approvals.decide",
    payload,
  );
  const result = await operation(
    registry,
    "ai.reply-approvals.decide",
  ).execute(dispatchContext, payload, {
    operation: "ai.reply-approvals.decide",
    requestKind: "mutation",
    idempotencyKey: mutationKey,
  });
  assert.deepEqual(result, {
    replayed: false,
    outcome: "updated",
    approval: {
      outboxKey: aiReplyOutboxKey,
      status: "ready-for-delivery",
      version: 2,
    },
  });
  assert.deepEqual(calls.rateLimitSubjects, [
    "7:verified-user:ai.reply-approvals.decide",
  ]);
  assert.equal(calls.aiReplyApprovalListSessions[0].tenantId, 7);
  assert.equal(calls.aiReplyApprovalMutationCommands.length, 1);
  assert.match(
    calls.aiReplyApprovalMutationCommands[0].requestDigest,
    /^railway_mutation_request_v1_[0-9a-f]{64}$/,
  );
  assert.doesNotMatch(
    JSON.stringify({ directory, result }),
    /tenantId|externalUserId|requestKey|auditKey|recipientPhoneNumber/,
  );
});

test("reads, saves, and activates campaigns through bounded Railway operations", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("manager"),
  });
  const directory = await operation(
    registry,
    "campaigns.directory.read",
  ).execute(dispatchContext, {}, {});
  assert.equal(directory.campaigns[0].campaignKey, campaignKey);
  assert.equal(directory.canWrite, true);
  assert.equal(directory.deliveryStatus, "ready");
  assert.deepEqual(directory.audiences.tags[0], {
    id: 5,
    name: "Customers",
    contactCount: 1,
  });

  const snapshotPayload = {
    name: "Campaign",
    deliveryMode: "immediate",
    scheduledAt: null,
    templateKey: campaignTemplateKey,
    audienceSource: { kind: "all" },
    personalizationMapping: {},
  };
  const activationPayload = { campaignKey, expectedVersion: 1 };
  for (const [operationId, payload] of [
    ["campaigns.snapshot.save", snapshotPayload],
    ["campaigns.activate", activationPayload],
  ]) {
    const mutationKey = await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      payload,
    );
    const result = await operation(registry, operationId).execute(
      dispatchContext,
      payload,
      {
        operation: operationId,
        requestKind: "mutation",
        idempotencyKey: mutationKey,
      },
    );
    assert.equal(result.replayed, false);
  }
  assert.deepEqual(calls.rateLimitSubjects, [
    "7:verified-user:campaigns.snapshot.save",
    "7:verified-user:campaigns.activate",
  ]);
  assert.equal(calls.campaignMutationCommands.length, 2);
  assert.doesNotMatch(
    JSON.stringify(directory),
    /tenantId|externalUserId|metaTemplateId|audienceSnapshotKey/,
  );
});

test("lists contacts through the resolved tenant and safe mapper", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("agent"),
  });
  const result = await operation(
    registry,
    "contacts.list",
  ).execute(
    dispatchContext,
    { beforeContactId: 51 },
    {},
  );

  assert.equal(calls.contactInputs.length, 1);
  assert.equal(calls.contactInputs[0].session.tenantId, 7);
  assert.equal(calls.contactInputs[0].beforeContactId, 51);
  assert.deepEqual(result, {
    contacts: [
      {
        id: 23,
        phoneNumber: "+972501234567",
        firstName: null,
        lastName: null,
        email: null,
        company: null,
        mailingStatus: "subscribed",
        consentStatus: "granted",
        consentSource: "verified-source",
        consentRecordedAt: "2026-08-17T00:00:00.000Z",
        consentWithdrawnAt: null,
        version: 4,
      },
    ],
    nextCursor: null,
    organization: {
      scopeContactIds: [23],
      tags: [{ id: 5, name: "Customers", contactCount: 1 }],
      lists: [],
      tagAssignments: [{ contactId: 23, tagId: 5 }],
      listMemberships: [],
    },
  });
  assert.deepEqual(calls.organizationInputs, [{
    session: calls.contactInputs[0].session,
    contactIds: [23],
  }]);
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|evidence|createdAt|updatedAt|internalTagKey|private-tag-key/,
  );
});

test("saves a contact through rate limit and transactional mutation boundaries", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("manager"),
  });
  const result = await operation(
    registry,
    "contacts.save",
  ).execute(
    dispatchContext,
    contactSavePayload,
    mutationRequest(),
  );

  assert.deepEqual(calls.rateLimitSubjects, [
    "7:verified-user:contacts.save",
  ]);
  assert.equal(calls.mutationCommands.length, 1);
  assert.deepEqual(calls.mutationCommands[0].profile, contactProfile);
  assert.equal(
    calls.mutationCommands[0].idempotencyKey,
    idempotencyKey,
  );
  assert.match(
    calls.mutationCommands[0].requestDigest,
    /^railway_mutation_request_v1_[0-9a-f]{64}$/,
  );
  assert.equal(calls.mutationCommands[0].session.tenantId, 7);
  assert.deepEqual(result, {
    replayed: false,
    contact: {
      id: 23,
      phoneNumber: "+972501234567",
      firstName: "Tal",
      lastName: null,
      email: null,
      company: "Connect",
      mailingStatus: "subscribed",
      consentStatus: "granted",
      consentSource: "verified-source",
      consentRecordedAt: "2026-08-17T00:00:00.000Z",
      consentWithdrawnAt: null,
      version: 4,
    },
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|evidence|createdAt|updatedAt/,
  );
});

test("marks an identical completed contact mutation as replayed", async () => {
  const { registry } = fixture({
    mutationOutcome: "replayed",
  });
  const result = await operation(
    registry,
    "contacts.save",
  ).execute(
    dispatchContext,
    contactSavePayload,
    mutationRequest(),
  );

  assert.equal(result.replayed, true);
});

test("records grant and unsubscribe consent through the immutable Railway boundary", async () => {
  for (const action of ["grant", "unsubscribe"]) {
    const operationId = `contacts.consent.${action}`;
    const { calls, registry } = fixture({
      tenantSession: session("manager"),
    });
    const result = await operation(registry, operationId).execute(
      dispatchContext,
      contactConsentPayload,
      await consentMutationRequest(operationId),
    );

    assert.deepEqual(calls.rateLimitSubjects, [
      `7:verified-user:${operationId}`,
    ]);
    assert.deepEqual(calls.consentInputs, [{
      action,
      session: session("manager"),
      contactId: 23,
      input: {
        source: "website-form",
        occurredAt: "2026-08-20T20:05:00.000Z",
        evidenceReference: "consent-evidence-v1",
      },
    }]);
    assert.equal(result.contact.id, 23);
    assert.equal(
      result.contact.consentStatus,
      action === "grant" ? "granted" : "withdrawn",
    );
    assert.doesNotMatch(
      JSON.stringify(result),
      /tenantId|externalUserId|consentEvidenceReference|createdAt|updatedAt/,
    );
  }
});

test("rejects forged consent keys and maps missing or cross-tenant contacts", async () => {
  const operationId = "contacts.consent.grant";
  const forged = fixture();
  const denied = fixture({ tenantSession: session("agent") });
  const limited = fixture({
    rateLimitDecision: { outcome: "limited" },
  });
  const missing = fixture({
    consentError: new ContactNotFoundError(),
  });
  const crossTenant = fixture({
    consentResult: persistedContact({ tenantId: 11 }),
  });

  await assert.rejects(
    operation(forged.registry, operationId).execute(
      dispatchContext,
      contactConsentPayload,
      {
        ...await consentMutationRequest(operationId),
        idempotencyKey: `connect_idempotency_v1_${"f".repeat(64)}`,
      },
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    operation(denied.registry, operationId).execute(
      dispatchContext,
      contactConsentPayload,
      await consentMutationRequest(operationId),
    ),
    (error) => error.code === "PERMISSION_DENIED",
  );
  await assert.rejects(
    operation(limited.registry, operationId).execute(
      dispatchContext,
      contactConsentPayload,
      await consentMutationRequest(operationId),
    ),
    (error) => error.code === "RATE_LIMITED",
  );
  await assert.rejects(
    operation(missing.registry, operationId).execute(
      dispatchContext,
      contactConsentPayload,
      await consentMutationRequest(operationId),
    ),
    (error) => error.code === "NOT_FOUND",
  );
  await assert.rejects(
    operation(crossTenant.registry, operationId).execute(
      dispatchContext,
      contactConsentPayload,
      await consentMutationRequest(operationId),
    ),
    (error) => error.code === "DEPENDENCY_UNAVAILABLE",
  );
  assert.deepEqual(forged.calls.rateLimitSubjects, []);
  assert.deepEqual(forged.calls.consentInputs, []);
  assert.deepEqual(denied.calls.rateLimitSubjects, []);
  assert.deepEqual(denied.calls.consentInputs, []);
  assert.deepEqual(limited.calls.consentInputs, []);
});

test("routes all contact organization mutations through atomic receipts", async () => {
  const { calls, registry } = fixture();
  const cases = [
    ["contacts.organization.tag.save", { name: "Priority" }],
    ["contacts.organization.list.save", { name: "Pilot" }],
    ["contacts.organization.tag-assignment", {
      contactId: 23,
      groupId: 5,
      assigned: true,
    }],
    ["contacts.organization.list-membership", {
      contactId: 23,
      groupId: 8,
      assigned: false,
    }],
  ];

  for (const [operationId, payload] of cases) {
    const request = await organizationMutationRequest(operationId, payload);
    const result = await operation(registry, operationId).execute(
      dispatchContext,
      payload,
      request,
    );

    assert.equal(result.replayed, false);
    assert.deepEqual(
      result.organization.scopeContactIds,
      "contactId" in payload ? [payload.contactId] : [],
    );
  }

  assert.equal(calls.organizationMutationCommands.length, 4);
  assert.deepEqual(
    calls.organizationMutationCommands.map(({ operation }) => operation),
    cases.map(([operationId]) => operationId),
  );
  assert.deepEqual(calls.rateLimitSubjects, cases.map(([operationId]) =>
    `7:verified-user:${operationId}`
  ));
});

test("starts contact import through permission, quota, and atomic receipt", async () => {
  const { calls, registry } = fixture();
  const payload = {
    fileName: "contacts.csv",
    sourceDigest: "a".repeat(64),
    totalRows: 1,
    mapping: {
      phoneNumber: 0,
      firstName: null,
      lastName: null,
      email: null,
      company: null,
    },
  };
  const request = await importMutationRequest(
    "contacts.import.start",
    payload,
  );
  const result = await operation(
    registry,
    "contacts.import.start",
  ).execute(dispatchContext, payload, request);

  assert.deepEqual(result, {
    replayed: false,
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
  });
  assert.equal(calls.contactImportMutationCommands.length, 1);
  assert.equal(
    calls.rateLimitSubjects[0],
    "7:verified-user:contacts.import.start",
  );

  await assert.rejects(
    operation(registry, "contacts.import.start").execute(
      dispatchContext,
      { ...payload, tenantId: 7 },
      request,
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
});

test("saves a message template draft through permission, quota, and atomic receipt", async () => {
  const { calls, registry } = fixture();
  const request = await organizationMutationRequest(
    "templates.draft.save",
    messageTemplateDraftPayload,
  );
  const result = await operation(
    registry,
    "templates.draft.save",
  ).execute(dispatchContext, messageTemplateDraftPayload, request);

  assert.equal(result.replayed, false);
  assert.equal(result.template.status, "draft");
  assert.equal(result.template.name, "service_update");
  assert.equal(calls.messageTemplateDraftMutationCommands.length, 1);
  assert.equal(
    calls.rateLimitSubjects.at(-1),
    "7:verified-user:templates.draft.save",
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|createdAt|metaTemplateId/,
  );

  await assert.rejects(
    operation(registry, "templates.draft.save").execute(
      dispatchContext,
      { ...messageTemplateDraftPayload, tenantId: 7 },
      request,
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
});

test("stages a message template submission through the atomic outbox boundary", async () => {
  const { calls, registry } = fixture();
  const payload = { templateKey: `template_v1_${"e".repeat(64)}` };
  const request = await organizationMutationRequest(
    "templates.submit",
    payload,
  );
  const result = await operation(registry, "templates.submit").execute(
    dispatchContext,
    payload,
    request,
  );

  assert.deepEqual(result, {
    replayed: false,
    submissionKey: `template_submission_v1_${"f".repeat(64)}`,
    status: "pending",
  });
  assert.equal(calls.messageTemplateSubmissionMutationCommands.length, 1);
  assert.equal(
    calls.rateLimitSubjects.at(-1),
    "7:verified-user:templates.submit",
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|accessToken|wabaId/,
  );

  await assert.rejects(
    operation(registry, "templates.submit").execute(
      dispatchContext,
      { ...payload, tenantId: 7 },
      request,
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
});

test("lists message templates from the same PostgreSQL service boundary", async () => {
  const { calls, registry } = fixture();
  const result = await operation(registry, "templates.list").execute(
    dispatchContext,
    {},
    {},
  );

  assert.equal(result.canWrite, true);
  assert.equal(result.templates.length, 1);
  assert.equal(result.templates[0].status, "draft");
  assert.equal(calls.messageTemplateListSessions.length, 1);
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|metaTemplateId|submissionKey|externalUserId|createdAt/,
  );
});

test("rejects unsafe organization requests and maps bounded outcomes", async () => {
  const payload = { name: "Priority" };
  const request = await organizationMutationRequest(
    "contacts.organization.tag.save",
    payload,
  );
  const invalidFixture = fixture();

  await assert.rejects(
    operation(
      invalidFixture.registry,
      "contacts.organization.tag.save",
    ).execute(
      dispatchContext,
      { ...payload, tenantId: 7 },
      request,
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    operation(
      invalidFixture.registry,
      "contacts.organization.tag.save",
    ).execute(
      dispatchContext,
      payload,
      { ...request, idempotencyKey: `connect_idempotency_v1_${"f".repeat(64)}` },
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
  assert.equal(invalidFixture.calls.organizationMutationCommands.length, 0);

  for (const [outcome, code] of [
    ["conflict", "CONFLICT"],
    ["not-found", "NOT_FOUND"],
    ["unavailable", "DEPENDENCY_UNAVAILABLE"],
  ]) {
    const testFixture = fixture({
      organizationMutationOutcome: outcome,
    });
    await assert.rejects(
      operation(
        testFixture.registry,
        "contacts.organization.tag.save",
      ).execute(dispatchContext, payload, request),
      (error) => error.code === code,
    );
  }

  for (const organizationMutationResult of [
    { outcome: "committed", tenantId: 11, organization: {
      scopeContactIds: [],
      tags: [],
      lists: [],
      tagAssignments: [],
      listMemberships: [],
    } },
    { outcome: "committed", tenantId: 7, organization: null },
    { outcome: "unavailable", tenantId: 7, organization: null },
  ]) {
    const testFixture = fixture({ organizationMutationResult });
    await assert.rejects(
      operation(
        testFixture.registry,
        "contacts.organization.tag.save",
      ).execute(dispatchContext, payload, request),
      (error) => error.code === "DEPENDENCY_UNAVAILABLE",
    );
  }
});

test("rejects a non-deterministic contact mutation key before rate limiting", async () => {
  const { calls, registry } = fixture();

  await assert.rejects(
    operation(registry, "contacts.save").execute(
      dispatchContext,
      contactSavePayload,
      {
        ...mutationRequest(),
        idempotencyKey: `connect_idempotency_v1_${"f".repeat(64)}`,
      },
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
  assert.deepEqual(calls.rateLimitSubjects, []);
  assert.deepEqual(calls.mutationCommands, []);
});

test("denies contact mutation before rate limit or persistence", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("agent"),
  });

  await assert.rejects(
    operation(registry, "contacts.save").execute(
      dispatchContext,
      contactSavePayload,
      mutationRequest(),
    ),
    (error) => error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(calls.rateLimitSubjects, []);
  assert.deepEqual(calls.mutationCommands, []);
});

test("fails closed when mutation rate limiting denies or is unavailable", async () => {
  const limited = fixture({
    rateLimitDecision: { outcome: "limited" },
  });
  const unavailable = fixture({
    rateLimitError: new Error("private limiter detail"),
  });
  const malformed = fixture({
    rateLimitDecision: { outcome: "unknown" },
  });

  await assert.rejects(
    operation(limited.registry, "contacts.save").execute(
      dispatchContext,
      contactSavePayload,
      mutationRequest(),
    ),
    (error) => error.code === "RATE_LIMITED",
  );
  await assert.rejects(
    operation(unavailable.registry, "contacts.save").execute(
      dispatchContext,
      contactSavePayload,
      mutationRequest(),
    ),
    (error) => error.code === "DEPENDENCY_UNAVAILABLE",
  );
  await assert.rejects(
    operation(malformed.registry, "contacts.save").execute(
      dispatchContext,
      contactSavePayload,
      mutationRequest(),
    ),
    (error) => error.code === "DEPENDENCY_UNAVAILABLE",
  );
  assert.deepEqual(limited.calls.mutationCommands, []);
  assert.deepEqual(unavailable.calls.mutationCommands, []);
  assert.deepEqual(malformed.calls.mutationCommands, []);
});

test("maps mutation idempotency conflict and storage outage to bounded codes", async () => {
  const conflict = fixture({ mutationOutcome: "conflict" });
  const unavailable = fixture({ mutationOutcome: "unavailable" });

  await assert.rejects(
    operation(conflict.registry, "contacts.save").execute(
      dispatchContext,
      contactSavePayload,
      mutationRequest(),
    ),
    (error) => error.code === "CONFLICT",
  );
  await assert.rejects(
    operation(unavailable.registry, "contacts.save").execute(
      dispatchContext,
      contactSavePayload,
      mutationRequest(),
    ),
    (error) => error.code === "DEPENDENCY_UNAVAILABLE",
  );
});

test("rejects thrown, malformed, and cross-tenant mutation results", async () => {
  const thrown = fixture({
    mutationError: new Error("private database error"),
  });
  const malformed = fixture({
    mutationResult: {
      outcome: "unexpected",
      tenantId: 7,
      contact: contactRecord(),
    },
  });
  const crossTenant = fixture({
    mutationResult: {
      outcome: "committed",
      tenantId: 11,
      contact: contactRecord({
        firstName: "Tal",
        company: "Connect",
      }),
    },
  });

  for (const testFixture of [thrown, malformed, crossTenant]) {
    await assert.rejects(
      operation(testFixture.registry, "contacts.save").execute(
        dispatchContext,
        contactSavePayload,
        mutationRequest(),
      ),
      (error) =>
        error.code === "DEPENDENCY_UNAVAILABLE" &&
        !error.message.includes("private"),
    );
  }
});

test("enforces report permission before calling the report service", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("agent"),
  });

  await assert.rejects(
    operation(registry, "reports.read").execute(
      dispatchContext,
      {
        startDate: "2026-08-01",
        endDate: "2026-08-17",
      },
      {},
    ),
    (error) => error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(calls.reportInputs, []);
});

test("returns a bounded operational report view without repository window fields", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("viewer"),
  });
  const input = {
    startDate: "2026-08-01",
    endDate: "2026-08-17",
  };
  const result = await operation(registry, "reports.read").execute(
    dispatchContext,
    input,
    {},
  );

  assert.deepEqual(result.period, input);
  assert.equal(result.generatedAt, "2026-08-17T12:00:00.000Z");
  assert.equal(result.campaigns.total, 0);
  assert.deepEqual(result.aiUsage, []);
  assert.equal(calls.reportInputs.length, 1);
  assert.doesNotMatch(
    JSON.stringify(result),
    /startAt|endAt|tenantId|externalUserId/,
  );
});

test("validates operation payload before tenant or service access", async () => {
  const invalidCases = [
    ["workspace.context.read", { extra: true }],
    [
      "conversations.list",
      { searchTerm: "Tal", status: "all", assignment: "team" },
    ],
    [
      "conversations.list",
      { searchTerm: "Tal", status: "all" },
    ],
    [
      "conversations.thread.read",
      { conversationKey: "conversation_v1_invalid" },
    ],
    [
      "conversations.mark-read",
      { conversationKey, expectedVersion: 0 },
    ],
    [
      "conversations.assignment.change",
      { conversationKey, expectedVersion: 3, action: "assign-other" },
    ],
    ["contacts.list", {}],
    ["contacts.list", { beforeContactId: 0 }],
    ["contacts.list", { beforeContactId: "51" }],
    [
      "contacts.save",
      {
        phoneNumber: "+972501234567",
        firstName: null,
        lastName: null,
        email: 17,
        company: null,
        submissionOccurredAt: contactSavePayload.submissionOccurredAt,
      },
    ],
    [
      "contacts.save",
      {
        ...contactSavePayload,
        phoneNumber: "0501234567",
      },
    ],
    [
      "contacts.save",
      {
        ...contactSavePayload,
        tenantId: 7,
      },
    ],
    [
      "contacts.save",
      {
        ...contactProfile,
        submissionOccurredAt: "invalid",
      },
    ],
    [
      "contacts.consent.grant",
      {
        ...contactConsentPayload,
        contactId: 0,
      },
    ],
    [
      "contacts.organization.tag.save",
      { name: " " },
    ],
    [
      "contacts.organization.list.save",
      { name: "Pilot", tenantId: 7 },
    ],
    [
      "contacts.organization.tag-assignment",
      { contactId: 0, groupId: 5, assigned: true },
    ],
    [
      "contacts.organization.list-membership",
      { contactId: 23, groupId: 8, assigned: true, extra: true },
    ],
    [
      "contacts.consent.unsubscribe",
      {
        ...contactConsentPayload,
        occurredAt: "invalid",
      },
    ],
    [
      "contacts.consent.grant",
      {
        ...contactConsentPayload,
        tenantId: 7,
      },
    ],
    [
      "reports.read",
      { startDate: "2026-08-01", endDate: "invalid" },
    ],
    [
      "reports.read",
      { startDate: "2026-02-30", endDate: "2026-03-01" },
    ],
    [
      "reports.read",
      { startDate: "2025-01-01", endDate: "2026-08-17" },
    ],
    [
      "reports.read",
      {
        startDate: "2026-08-01",
        endDate: "2026-08-17",
        tenantId: 7,
      },
    ],
  ];

  for (const [id, payload] of invalidCases) {
    const { calls, registry } = fixture();

    await assert.rejects(
      operation(registry, id).execute(
        dispatchContext,
        payload,
        id === "contacts.save"
          ? mutationRequest(payload)
          : {},
      ),
      (error) => error.code === "INVALID_REQUEST",
    );
    assert.deepEqual(calls.tenantIdentities, []);
    assert.deepEqual(calls.conversationListInputs, []);
    assert.deepEqual(calls.conversationThreadInputs, []);
    assert.deepEqual(calls.conversationMutationCommands, []);
    assert.deepEqual(calls.contactInputs, []);
    assert.deepEqual(calls.consentInputs, []);
    assert.deepEqual(calls.organizationMutationCommands, []);
    assert.deepEqual(calls.reportInputs, []);
    assert.deepEqual(calls.rateLimitSubjects, []);
    assert.deepEqual(calls.mutationCommands, []);
  }
});

test("maps tenant and service validation failures to bounded codes", async () => {
  const denied = fixture({
    tenantError: new TenantSessionError(
      "TENANT_SELECTION_REQUIRED",
      "private tenant selection detail",
    ),
  });
  const badCursor = fixture({
    contactError: new ContactCursorInputError(),
  });
  const badPeriod = fixture({
    reportError: new OperationalReportInputError(),
  });

  await assert.rejects(
    operation(
      denied.registry,
      "workspace.context.read",
    ).execute(dispatchContext, {}, {}),
    (error) =>
      error.code === "TENANT_SELECTION_REQUIRED" &&
      !error.message.includes("private"),
  );
  await assert.rejects(
    operation(badCursor.registry, "contacts.list").execute(
      dispatchContext,
      { beforeContactId: null },
      {},
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    operation(badPeriod.registry, "reports.read").execute(
      dispatchContext,
      {
        startDate: "2026-08-01",
        endDate: "2026-08-17",
      },
      {},
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
});

test("rejects missing operation dependencies", () => {
  assert.throws(
    () =>
      createRailwayApiOperationRegistry({
        tenantSessions: {},
        contacts: {},
        contactConsent: {},
        contactOrganization: {},
        reports: {},
      }),
    /operation dependencies are invalid/,
  );
});
