import {
  ContactNotFoundError,
} from "../../db/contactConsentRepository.ts";
import type {
  ContactRecord,
} from "../../shared/domain/contactRecord.ts";
import {
  hasPermission,
  type Permission,
} from "../../shared/domain/model.ts";
import {
  validateContactConsentTransition,
  type ContactConsentTransition,
} from "../../shared/validation/contactConsent.ts";
import {
  validatePersistedContact,
  type PersistedContactProfile,
} from "../../shared/validation/persistedContact.ts";
import type {
  ContactService,
} from "../contacts/contactService.ts";
import type {
  ContactOrganizationService,
} from "../contacts/contactOrganizationService.ts";
import {
  ContactOrganizationInputError,
  parseContactOrganizationAssignment,
  parseContactOrganizationName,
} from "../contacts/contactOrganizationService.ts";
import {
  ContactImportInputError,
  parseContactImportChunkInput,
  parseStartContactImportInput,
  type ProcessContactImportChunkRequest,
  type StartContactImportRequest,
} from "../contacts/contactImportService.ts";
import {
  parseRailwayContactImportResponse,
} from "../contacts/railwayContactImportResult.ts";
import {
  MessageTemplateInputError,
  parseMessageTemplateDraftInput,
  type MessageTemplateService,
} from "../templates/messageTemplateService.ts";
import {
  parseRailwayMessageTemplateDraftView,
} from "../templates/railwayMessageTemplateDraftResult.ts";
import { toMessageTemplateView } from "../templates/messageTemplateView.ts";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization.ts";
import {
  parseRailwayContactOrganizationSnapshot,
} from "../contacts/railwayContactDirectoryHandler.ts";
import {
  ContactConsentInputError,
  ContactCursorInputError,
} from "../contacts/contactService.ts";
import {
  toContactRecord,
} from "../contacts/contactRecordMapper.ts";
import type {
  OperationalReportService,
} from "../reports/operationalReportService.ts";
import {
  OperationalReportInputError,
  validateOperationalReportInput,
} from "../reports/operationalReportService.ts";
import {
  toOperationalReportView,
} from "../reports/operationalReportView.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import {
  requireTenantPermission,
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";
import type {
  RailwayApiJsonObject,
  RailwayApiRequestEnvelope,
  RailwayApiRequestKind,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import type {
  RailwayTenantSessionResolver,
} from "./railwayTenantSessionResolver.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
  deriveRailwayApiMutationRequestDigest,
  type RailwayApiContactSaveResult,
  type RailwayApiMutationExecutor,
} from "./railwayApiMutationExecutor.ts";
import type {
  RailwayContactOrganizationMutationExecutor,
  RailwayContactOrganizationMutationOperation,
  RailwayContactOrganizationMutationResult,
} from "./railwayContactOrganizationMutationExecutor.ts";
import type {
  RailwayContactImportMutationExecutor,
  RailwayContactImportMutationOperation,
  RailwayContactImportMutationResult,
} from "./railwayContactImportMutationExecutor.ts";
import {
  RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION,
  type RailwayMessageTemplateDraftMutationExecutor,
  type RailwayMessageTemplateDraftMutationResult,
} from "./railwayMessageTemplateDraftMutationExecutor.ts";
import {
  RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
  type RailwayMessageTemplateSubmissionMutationExecutor,
  type RailwayMessageTemplateSubmissionMutationResult,
} from "./railwayMessageTemplateSubmissionMutationExecutor.ts";
import {
  parseMessageTemplateSubmissionQueueMessage,
} from "../templates/messageTemplateSubmissionQueueMessage.ts";
import {
  ConversationServiceError,
  type ConversationService,
} from "../conversations/conversationService.ts";
import {
  toInboxConversationThreadView,
  toInboxConversationView,
} from "../conversations/conversationView.ts";
import type {
  InboxFilters,
} from "../../shared/domain/conversationView.ts";
import {
  parseRailwayConversationMutationState,
  type RailwayConversationMutationExecutor,
  type RailwayConversationMutationOperation,
  type RailwayConversationMutationPayload,
  type RailwayConversationMutationResult,
} from "./railwayConversationMutationExecutor.ts";
import {
  BotFlowInputError,
  BotFlowServiceError,
  parseBotFlowPublishDraftRequest,
  parseBotFlowSaveDraftRequest,
  type BotFlowService,
} from "../bot/botFlowService.ts";
import {
  toBotFlowDetailsView,
  toBotFlowSummaryView,
} from "../bot/botFlowView.ts";
import {
  RAILWAY_BOT_FLOW_DRAFT_OPERATION,
  RAILWAY_BOT_FLOW_PUBLISH_OPERATION,
  parseRailwayBotFlowMutationState,
  type RailwayBotFlowMutationExecutor,
  type RailwayBotFlowMutationOperation,
  type RailwayBotFlowMutationPayload,
  type RailwayBotFlowMutationResult,
} from "./railwayBotFlowMutationExecutor.ts";
import {
  parseCampaignSnapshotRequest,
  type CampaignSnapshotService,
} from "../campaigns/campaignSnapshotService.ts";
import {
  parseActivateCampaignRequest,
} from "../campaigns/campaignActivationService.ts";
import {
  toCampaignAudienceOptionsView,
  toCampaignTemplateOptionView,
  toCampaignView,
} from "../campaigns/campaignView.ts";
import {
  RAILWAY_CAMPAIGN_ACTIVATE_OPERATION,
  RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION,
  parseRailwayCampaignMutationState,
  type RailwayCampaignMutationExecutor,
  type RailwayCampaignMutationOperation,
  type RailwayCampaignMutationPayload,
  type RailwayCampaignMutationResult,
} from "./railwayCampaignMutationExecutor.ts";
import {
  parseAiReplyApprovalDecisionRequest,
  type AiReplyApprovalService,
} from "../ai/aiReplyApprovalService.ts";
import {
  toAiReplyApprovalView,
} from "../ai/aiReplyApprovalView.ts";
import {
  AiAgentInputError,
  AiAgentServiceError,
  parseAiAgentKey,
  parseAiAgentPublishDraftRequest,
  parseAiAgentSaveDraftRequest,
  type AiAgentService,
} from "../ai/aiAgentService.ts";
import {
  toAiAgentDetailsView,
  toAiAgentSummaryView,
  toKnowledgeSourceView,
} from "../ai/aiAgentView.ts";
import {
  parseRailwayAiAgentActivationIssues,
} from "../ai/railwayAiAgentResult.ts";
import {
  RAILWAY_AI_AGENT_DRAFT_OPERATION,
  RAILWAY_AI_AGENT_PUBLISH_OPERATION,
  parseRailwayAiAgentMutationState,
  type RailwayAiAgentMutationExecutor,
  type RailwayAiAgentMutationOperation,
  type RailwayAiAgentMutationPayload,
  type RailwayAiAgentMutationResult,
} from "./railwayAiAgentMutationExecutor.ts";
import {
  RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION,
  parseRailwayAiReplyApprovalMutationState,
  type RailwayAiReplyApprovalMutationExecutor,
  type RailwayAiReplyApprovalMutationResult,
} from "./railwayAiReplyApprovalMutationExecutor.ts";

export interface RailwayApiMutationSafetyPolicy {
  readonly rateLimit: "tenant-mutation";
  readonly idempotency:
    | "atomic-request-digest-replay"
    | "deterministic-domain-event-replay";
  readonly audit: "atomic-immutable-event";
  readonly transaction: "required";
}

export interface RailwayApiOperationPolicy {
  readonly id: string;
  readonly requestKind: RailwayApiRequestKind;
  readonly permission: Permission | null;
  readonly mutationSafety: Readonly<RailwayApiMutationSafetyPolicy> | null;
}

export const railwayApiOperationPolicies = Object.freeze([
  Object.freeze({
    id: "workspace.context.read",
    requestKind: "query" as const,
    permission: null,
    mutationSafety: null,
  }),
  Object.freeze({
    id: "conversations.list",
    requestKind: "query" as const,
    permission: "conversations.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: "conversations.thread.read",
    requestKind: "query" as const,
    permission: "conversations.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: "conversations.mark-read",
    requestKind: "mutation" as const,
    permission: "conversations.reply" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "conversations.assignment.change",
    requestKind: "mutation" as const,
    permission: "conversations.reply" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "bot.flows.list",
    requestKind: "query" as const,
    permission: "bot.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: "bot.flows.details.read",
    requestKind: "query" as const,
    permission: "bot.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: RAILWAY_BOT_FLOW_DRAFT_OPERATION,
    requestKind: "mutation" as const,
    permission: "bot.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: RAILWAY_BOT_FLOW_PUBLISH_OPERATION,
    requestKind: "mutation" as const,
    permission: "bot.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "ai.agents.directory.read",
    requestKind: "query" as const,
    permission: "ai.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: "ai.agents.details.read",
    requestKind: "query" as const,
    permission: "ai.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: RAILWAY_AI_AGENT_DRAFT_OPERATION,
    requestKind: "mutation" as const,
    permission: "ai.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: RAILWAY_AI_AGENT_PUBLISH_OPERATION,
    requestKind: "mutation" as const,
    permission: "ai.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "ai.reply-approvals.list",
    requestKind: "query" as const,
    permission: "conversations.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION,
    requestKind: "mutation" as const,
    permission: "conversations.reply" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "campaigns.directory.read",
    requestKind: "query" as const,
    permission: "campaigns.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION,
    requestKind: "mutation" as const,
    permission: "campaigns.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: RAILWAY_CAMPAIGN_ACTIVATE_OPERATION,
    requestKind: "mutation" as const,
    permission: "campaigns.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.list",
    requestKind: "query" as const,
    permission: "contacts.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: "contacts.save",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.consent.grant",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "deterministic-domain-event-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.consent.unsubscribe",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "deterministic-domain-event-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.organization.tag.save",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.organization.list.save",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.organization.tag-assignment",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.organization.list-membership",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.import.start",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.import.chunk",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "templates.list",
    requestKind: "query" as const,
    permission: "templates.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION,
    requestKind: "mutation" as const,
    permission: "templates.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
    requestKind: "mutation" as const,
    permission: "templates.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "reports.read",
    requestKind: "query" as const,
    permission: "reports.read" as const,
    mutationSafety: null,
  }),
] as const satisfies readonly Readonly<RailwayApiOperationPolicy>[]);

export interface RailwayApiOperationRegistryDependencies {
  readonly tenantSessions: RailwayTenantSessionResolver;
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
}

export interface RailwayApiOperationRegistry {
  readonly operations: readonly Readonly<RailwayApiOperation>[];
}

type OperationPayloadParser<TPayload> = (
  payload: RailwayApiJsonObject,
) => TPayload;

type OperationExecutor<TPayload> = (
  session: Readonly<TenantSession>,
  payload: TPayload,
  request: Readonly<RailwayApiRequestEnvelope>,
) => Promise<unknown>;

interface ContactSavePayload extends PersistedContactProfile {
  readonly submissionOccurredAt: string;
}

interface ContactConsentPayload extends ContactConsentTransition {
  readonly contactId: number;
}

interface ContactOrganizationNamePayload {
  readonly name: string;
}

interface ContactOrganizationAssignmentPayload {
  readonly contactId: number;
  readonly groupId: number;
  readonly assigned: boolean;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every(
      (key, index) => key === sortedExpectedKeys[index],
    )
  );
}

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isStringOrNull(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function parseEmptyPayload(
  payload: RailwayApiJsonObject,
): RailwayApiJsonObject {
  if (!hasExactKeys(payload, [])) {
    invalidRequest();
  }

  return payload;
}

function parseConversationListPayload(
  payload: RailwayApiJsonObject,
): Readonly<InboxFilters> {
  if (
    !hasExactKeys(payload, ["assignment", "searchTerm", "status"]) ||
    typeof payload.searchTerm !== "string" ||
    typeof payload.status !== "string" ||
    typeof payload.assignment !== "string"
  ) {
    invalidRequest();
  }

  const searchTerm = payload.searchTerm.trim();
  const statuses = [
    "all",
    "new",
    "bot_active",
    "waiting_for_agent",
    "agent_active",
    "waiting_for_contact",
    "closed",
  ] as const;
  const assignments = ["all", "unassigned", "mine"] as const;

  if (
    searchTerm.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(searchTerm) ||
    !statuses.includes(payload.status as (typeof statuses)[number]) ||
    !assignments.includes(
      payload.assignment as (typeof assignments)[number],
    )
  ) {
    invalidRequest();
  }

  return Object.freeze({
    searchTerm,
    status: payload.status as InboxFilters["status"],
    assignment: payload.assignment as InboxFilters["assignment"],
  });
}

function parseConversationThreadPayload(
  payload: RailwayApiJsonObject,
): string {
  if (
    !hasExactKeys(payload, ["conversationKey"]) ||
    typeof payload.conversationKey !== "string" ||
    !/^conversation_v1_[0-9a-f]{64}$/.test(payload.conversationKey)
  ) {
    invalidRequest();
  }

  return payload.conversationKey;
}

function parseConversationMarkReadPayload(
  payload: RailwayApiJsonObject,
): Readonly<{
  conversationKey: string;
  expectedVersion: number;
}> {
  if (
    !hasExactKeys(payload, ["conversationKey", "expectedVersion"]) ||
    typeof payload.conversationKey !== "string" ||
    !/^conversation_v1_[0-9a-f]{64}$/.test(payload.conversationKey) ||
    !Number.isSafeInteger(payload.expectedVersion) ||
    Number(payload.expectedVersion) <= 0
  ) {
    invalidRequest();
  }

  return Object.freeze({
    conversationKey: payload.conversationKey,
    expectedVersion: Number(payload.expectedVersion),
  });
}

function parseConversationAssignmentPayload(
  payload: RailwayApiJsonObject,
): Readonly<{
  conversationKey: string;
  expectedVersion: number;
  action: "assign-self" | "unassign-self";
}> {
  if (
    !hasExactKeys(payload, [
      "action",
      "conversationKey",
      "expectedVersion",
    ]) ||
    (payload.action !== "assign-self" &&
      payload.action !== "unassign-self")
  ) {
    invalidRequest();
  }

  const base = parseConversationMarkReadPayload({
    conversationKey: payload.conversationKey,
    expectedVersion: payload.expectedVersion,
  });

  return Object.freeze({
    ...base,
    action: payload.action,
  });
}

function parseBotFlowDetailsPayload(
  payload: RailwayApiJsonObject,
): string {
  if (
    !hasExactKeys(payload, ["botFlowKey"]) ||
    typeof payload.botFlowKey !== "string" ||
    !/^bot_flow_v1_[0-9a-f]{64}$/.test(payload.botFlowKey)
  ) {
    invalidRequest();
  }

  return payload.botFlowKey;
}

function parseMessageTemplateSubmissionPayload(
  payload: RailwayApiJsonObject,
): Readonly<{ templateKey: string }> {
  if (
    !hasExactKeys(payload, ["templateKey"]) ||
    typeof payload.templateKey !== "string" ||
    !/^template_v1_[0-9a-f]{64}$/.test(payload.templateKey)
  ) {
    invalidRequest();
  }

  return Object.freeze({ templateKey: payload.templateKey });
}

function parseContactListPayload(
  payload: RailwayApiJsonObject,
): number | null {
  if (!hasExactKeys(payload, ["beforeContactId"])) {
    invalidRequest();
  }

  const value = payload.beforeContactId;

  if (
    value !== null &&
    (!Number.isSafeInteger(value) || Number(value) <= 0)
  ) {
    invalidRequest();
  }

  return value === null ? null : Number(value);
}

function parseContactSavePayload(
  payload: RailwayApiJsonObject,
): Readonly<ContactSavePayload> {
  if (
    !hasExactKeys(payload, [
      "company",
      "email",
      "firstName",
      "lastName",
      "phoneNumber",
      "submissionOccurredAt",
    ]) ||
    typeof payload.phoneNumber !== "string" ||
    !isStringOrNull(payload.firstName) ||
    !isStringOrNull(payload.lastName) ||
    !isStringOrNull(payload.email) ||
    !isStringOrNull(payload.company) ||
    typeof payload.submissionOccurredAt !== "string"
  ) {
    invalidRequest();
  }

  const validation = validatePersistedContact(payload);

  const submissionMilliseconds = Date.parse(
    payload.submissionOccurredAt,
  );

  if (
    !validation.success ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      payload.submissionOccurredAt,
    ) ||
    !Number.isFinite(submissionMilliseconds) ||
    new Date(submissionMilliseconds).toISOString() !==
      payload.submissionOccurredAt
  ) {
    invalidRequest();
  }

  return Object.freeze({
    ...validation.value,
    submissionOccurredAt: payload.submissionOccurredAt,
  });
}

function parseContactConsentPayload(
  payload: RailwayApiJsonObject,
): Readonly<ContactConsentPayload> {
  if (
    !hasExactKeys(payload, [
      "contactId",
      "evidenceReference",
      "occurredAt",
      "source",
    ]) ||
    !Number.isSafeInteger(payload.contactId) ||
    Number(payload.contactId) <= 0 ||
    typeof payload.source !== "string" ||
    typeof payload.occurredAt !== "string" ||
    (payload.evidenceReference !== null &&
      typeof payload.evidenceReference !== "string")
  ) {
    invalidRequest();
  }

  const validation = validateContactConsentTransition({
    source: payload.source,
    occurredAt: payload.occurredAt,
    evidenceReference: payload.evidenceReference,
  });

  if (!validation.success) {
    invalidRequest();
  }

  return Object.freeze({
    contactId: Number(payload.contactId),
    ...validation.value,
  });
}

function parseContactOrganizationNamePayload(
  payload: RailwayApiJsonObject,
): Readonly<ContactOrganizationNamePayload> {
  if (
    !hasExactKeys(payload, ["name"]) ||
    typeof payload.name !== "string"
  ) {
    invalidRequest();
  }

  const parsed = parseContactOrganizationName(payload.name);

  return Object.freeze({ name: parsed.name });
}

function parseContactOrganizationAssignmentPayload(
  payload: RailwayApiJsonObject,
): Readonly<ContactOrganizationAssignmentPayload> {
  if (!hasExactKeys(payload, ["assigned", "contactId", "groupId"])) {
    invalidRequest();
  }

  return parseContactOrganizationAssignment(payload);
}

function isValidContactRecord(
  value: unknown,
): value is ContactRecord {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "phoneNumber",
      "firstName",
      "lastName",
      "email",
      "company",
      "mailingStatus",
      "consentStatus",
      "consentSource",
      "consentRecordedAt",
      "consentWithdrawnAt",
      "version",
    ])
  ) {
    return false;
  }

  const validation = validatePersistedContact(value);

  return (
    validation.success &&
    Number.isSafeInteger(value.id) &&
    Number(value.id) > 0 &&
    Number.isSafeInteger(value.version) &&
    Number(value.version) > 0 &&
    (value.mailingStatus === "subscribed" ||
      value.mailingStatus === "unsubscribed") &&
    (value.consentStatus === "unknown" ||
      value.consentStatus === "granted" ||
      value.consentStatus === "withdrawn") &&
    isStringOrNull(value.consentSource) &&
    isStringOrNull(value.consentRecordedAt) &&
    isStringOrNull(value.consentWithdrawnAt)
  );
}

function isValidContactSaveResult(
  value: unknown,
  session: Readonly<TenantSession>,
  profile: Readonly<PersistedContactProfile>,
): value is RailwayApiContactSaveResult {
  if (!isRecord(value) || typeof value.outcome !== "string") {
    return false;
  }

  if (
    value.outcome === "conflict" ||
    value.outcome === "unavailable"
  ) {
    return value.tenantId === null && value.contact === null;
  }

  if (
    (value.outcome !== "committed" &&
      value.outcome !== "replayed") ||
    !Number.isSafeInteger(value.tenantId) ||
    Number(value.tenantId) !== session.tenantId ||
    !isValidContactRecord(value.contact)
  ) {
    return false;
  }

  const contact = value.contact;
  const validation = validatePersistedContact(contact);

  return (
    validation.success &&
    validation.value.phoneNumber === profile.phoneNumber &&
    validation.value.firstName === profile.firstName &&
    validation.value.lastName === profile.lastName &&
    validation.value.email === profile.email &&
    validation.value.company === profile.company
  );
}

function parseReportPayload(
  payload: RailwayApiJsonObject,
): Readonly<{
  startDate: string;
  endDate: string;
}> {
  if (!hasExactKeys(payload, ["startDate", "endDate"])) {
    invalidRequest();
  }

  if (
    typeof payload.startDate !== "string" ||
    typeof payload.endDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.endDate)
  ) {
    invalidRequest();
  }

  validateOperationalReportInput(payload);

  return Object.freeze({
    startDate: payload.startDate,
    endDate: payload.endDate,
  });
}

function toContactOrganizationView(
  snapshot: Readonly<ContactOrganizationSnapshot>,
): Readonly<ContactOrganizationSnapshot> {
  return Object.freeze({
    scopeContactIds: Object.freeze([...snapshot.scopeContactIds]),
    tags: Object.freeze(
      snapshot.tags.map(({ id, name, contactCount }) =>
        Object.freeze({ id, name, contactCount }),
      ),
    ),
    lists: Object.freeze(
      snapshot.lists.map(({ id, name, contactCount }) =>
        Object.freeze({ id, name, contactCount }),
      ),
    ),
    tagAssignments: Object.freeze(
      snapshot.tagAssignments.map(({ contactId, tagId }) =>
        Object.freeze({ contactId, tagId }),
      ),
    ),
    listMemberships: Object.freeze(
      snapshot.listMemberships.map(({ contactId, listId }) =>
        Object.freeze({ contactId, listId }),
      ),
    ),
  });
}

function mapOperationError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }

  if (error instanceof TenantSessionError) {
    switch (error.code) {
      case "TENANT_MEMBERSHIP_REQUIRED":
        throw new RailwayApiDispatchError(
          "TENANT_MEMBERSHIP_REQUIRED",
        );
      case "TENANT_SELECTION_REQUIRED":
        throw new RailwayApiDispatchError(
          "TENANT_SELECTION_REQUIRED",
        );
      case "PERMISSION_DENIED":
        throw new RailwayApiDispatchError("PERMISSION_DENIED");
      default:
        throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
    }
  }

  if (
    error instanceof ContactCursorInputError ||
    error instanceof ContactConsentInputError ||
    error instanceof ContactImportInputError ||
    error instanceof ContactOrganizationInputError ||
    error instanceof MessageTemplateInputError ||
    error instanceof AiAgentInputError ||
    error instanceof OperationalReportInputError
  ) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  if (error instanceof ContactNotFoundError) {
    throw new RailwayApiDispatchError("NOT_FOUND");
  }

  if (error instanceof ConversationServiceError) {
    switch (error.code) {
      case "INVALID_INPUT":
        throw new RailwayApiDispatchError("INVALID_REQUEST");
      case "NOT_FOUND":
        throw new RailwayApiDispatchError("NOT_FOUND");
      case "STATE_CONFLICT":
      case "ASSIGNMENT_CONFLICT":
        throw new RailwayApiDispatchError("CONFLICT");
      default:
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
  }

  if (error instanceof BotFlowServiceError) {
    switch (error.code) {
      case "INVALID_INPUT":
        throw new RailwayApiDispatchError("INVALID_REQUEST");
      case "NOT_FOUND":
        throw new RailwayApiDispatchError("NOT_FOUND");
      case "STATE_CONFLICT":
        throw new RailwayApiDispatchError("CONFLICT");
      case "INVALID_STATE":
        throw new RailwayApiDispatchError("INVALID_TRANSITION");
      default:
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
  }

  if (error instanceof AiAgentServiceError) {
    switch (error.code) {
      case "INVALID_INPUT":
        throw new RailwayApiDispatchError("INVALID_REQUEST");
      case "NOT_FOUND":
        throw new RailwayApiDispatchError("NOT_FOUND");
      case "STATE_CONFLICT":
        throw new RailwayApiDispatchError("CONFLICT");
      case "INVALID_STATE":
        throw new RailwayApiDispatchError("INVALID_TRANSITION");
      default:
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
  }

  throw error;
}

function createOperation<TPayload>(
  policy: Readonly<RailwayApiOperationPolicy>,
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  parsePayload: OperationPayloadParser<TPayload>,
  execute: OperationExecutor<TPayload>,
): Readonly<RailwayApiOperation> {
  return Object.freeze({
    id: policy.id,
    requestKind: policy.requestKind,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        const parsedPayload = parsePayload(payload);
        const session = await dependencies.tenantSessions.resolve(
          context.userIdentity,
        );

        if (policy.permission !== null) {
          requireTenantPermission(session, policy.permission);
        }

        return await execute(session, parsedPayload, request);
      } catch (error) {
        mapOperationError(error);
      }
    },
  });
}

async function requireTenantMutationRequest(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  operation: string,
  payload: Readonly<object>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<Readonly<{
  idempotencyKey: string;
  requestDigest: string;
}>> {
  if (
    request.operation !== operation ||
    request.requestKind !== "mutation" ||
    request.idempotencyKey === null
  ) {
    invalidRequest();
  }

  let requestDigest: string;
  let expectedIdempotencyKey: string;

  try {
    [requestDigest, expectedIdempotencyKey] = await Promise.all([
      deriveRailwayApiMutationRequestDigest(operation, payload),
      deriveRailwayApiDeterministicIdempotencyKey(operation, payload),
    ]);
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (request.idempotencyKey !== expectedIdempotencyKey) {
    invalidRequest();
  }

  let rateLimitDecision;

  try {
    rateLimitDecision = await dependencies.mutationRateLimit.consume(
      `${session.tenantId}:${session.externalUserId}:${operation}`,
    );
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (rateLimitDecision.outcome === "limited") {
    throw new RailwayApiDispatchError("RATE_LIMITED");
  }

  if (rateLimitDecision.outcome !== "allowed") {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return Object.freeze({
    idempotencyKey: request.idempotencyKey,
    requestDigest,
  });
}

async function executeConversationMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  operation: RailwayConversationMutationOperation,
  payload: Readonly<RailwayConversationMutationPayload>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    operation,
    payload,
    request,
  );
  let rawResult: unknown;

  try {
    rawResult = await dependencies.conversationMutations.execute({
      session,
      operation,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (
    !isRecord(rawResult) ||
    typeof rawResult.outcome !== "string" ||
    !hasExactKeys(rawResult, ["outcome", "state", "tenantId"])
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const result = rawResult as RailwayConversationMutationResult;
  if (result.outcome !== "committed" && result.outcome !== "replayed") {
    if (result.tenantId !== null || result.state !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }

    throw new RailwayApiDispatchError(
      result.outcome === "conflict"
        ? "CONFLICT"
        : result.outcome === "not-found"
          ? "NOT_FOUND"
          : "DEPENDENCY_UNAVAILABLE",
    );
  }

  const state = parseRailwayConversationMutationState(
    operation,
    payload.conversationKey,
    result.state,
  );
  if (result.tenantId !== session.tenantId || state === null) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return Object.freeze({
    replayed: result.outcome === "replayed",
    conversation: state,
  });
}

async function executeBotFlowMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  operation: RailwayBotFlowMutationOperation,
  rawPayload: Readonly<RailwayApiJsonObject>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  let payload: Readonly<RailwayBotFlowMutationPayload>;
  try {
    if (operation === RAILWAY_BOT_FLOW_DRAFT_OPERATION) {
      payload = await parseBotFlowSaveDraftRequest(
        session.tenantId,
        rawPayload,
      );
    } else {
      const parsed = parseBotFlowPublishDraftRequest(rawPayload);
      if (parsed === null) {
        invalidRequest();
      }
      payload = parsed;
    }
  } catch (error) {
    if (error instanceof RailwayApiDispatchError) {
      throw error;
    }
    if (
      error instanceof BotFlowInputError ||
      error instanceof BotFlowServiceError
    ) {
      invalidRequest();
    }
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    operation,
    rawPayload,
    request,
  );
  let rawResult: unknown;
  try {
    rawResult = await dependencies.botFlowMutations.execute({
      session,
      operation,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (
    !isRecord(rawResult) ||
    typeof rawResult.outcome !== "string" ||
    !hasExactKeys(rawResult, ["outcome", "state", "tenantId"])
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  const result = rawResult as RailwayBotFlowMutationResult;
  if (result.outcome !== "committed" && result.outcome !== "replayed") {
    if (result.tenantId !== null || result.state !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
    const code = result.outcome === "conflict"
      ? "CONFLICT"
      : result.outcome === "not-found"
        ? "NOT_FOUND"
        : result.outcome === "invalid-state"
          ? "INVALID_TRANSITION"
          : "DEPENDENCY_UNAVAILABLE";
    throw new RailwayApiDispatchError(code);
  }

  const state = parseRailwayBotFlowMutationState(
    operation,
    payload,
    result.state,
  );
  if (result.tenantId !== session.tenantId || state === null) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return Object.freeze({
    replayed: result.outcome === "replayed",
    ...state,
  });
}

async function executeAiAgentMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  operation: RailwayAiAgentMutationOperation,
  rawPayload: Readonly<RailwayApiJsonObject>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  let payload: Readonly<RailwayAiAgentMutationPayload>;
  try {
    if (operation === RAILWAY_AI_AGENT_DRAFT_OPERATION) {
      payload = parseAiAgentSaveDraftRequest(rawPayload);
    } else {
      const parsed = parseAiAgentPublishDraftRequest(rawPayload);
      if (parsed === null) invalidRequest();
      payload = parsed;
    }
  } catch (error) {
    if (error instanceof RailwayApiDispatchError) throw error;
    if (error instanceof AiAgentInputError) invalidRequest();
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    operation,
    rawPayload,
    request,
  );
  let rawResult: unknown;
  try {
    rawResult = await dependencies.aiAgentMutations.execute({
      session,
      operation,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  if (!isRecord(rawResult) || typeof rawResult.outcome !== "string") {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  if (rawResult.outcome === "activation-blocked") {
    if (
      !hasExactKeys(rawResult, ["issues", "outcome", "state", "tenantId"]) ||
      rawResult.tenantId !== null || rawResult.state !== null
    ) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
    const issues = parseRailwayAiAgentActivationIssues(rawResult.issues);
    if (issues === null || issues.length === 0) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
    return Object.freeze({
      replayed: false,
      outcome: "activation-blocked" as const,
      issues,
    });
  }
  if (!hasExactKeys(rawResult, ["outcome", "state", "tenantId"])) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  const result = rawResult as RailwayAiAgentMutationResult;
  if (result.outcome !== "committed" && result.outcome !== "replayed") {
    if (result.tenantId !== null || result.state !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
    const code = result.outcome === "conflict"
      ? "CONFLICT"
      : result.outcome === "not-found"
        ? "NOT_FOUND"
        : result.outcome === "invalid-state"
          ? "INVALID_TRANSITION"
          : "DEPENDENCY_UNAVAILABLE";
    throw new RailwayApiDispatchError(code);
  }
  const state = parseRailwayAiAgentMutationState(operation, payload, result.state);
  if (result.tenantId !== session.tenantId || state === null) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  return Object.freeze({
    replayed: result.outcome === "replayed",
    ...state,
  });
}

async function executeCampaignMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  operation: RailwayCampaignMutationOperation,
  rawPayload: Readonly<RailwayApiJsonObject>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const payload: Readonly<RailwayCampaignMutationPayload> | null =
    operation === RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION
      ? parseCampaignSnapshotRequest(rawPayload)
      : parseActivateCampaignRequest(rawPayload);
  if (payload === null) {
    invalidRequest();
  }

  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    operation,
    rawPayload,
    request,
  );
  let rawResult: unknown;
  try {
    rawResult = await dependencies.campaignMutations.execute({
      session,
      operation,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (
    !isRecord(rawResult) ||
    typeof rawResult.outcome !== "string" ||
    !hasExactKeys(rawResult, ["outcome", "state", "tenantId"])
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  const result = rawResult as RailwayCampaignMutationResult;
  if (result.outcome !== "committed" && result.outcome !== "replayed") {
    if (result.tenantId !== null || result.state !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
    if (result.outcome === "conflict") {
      throw new RailwayApiDispatchError("CONFLICT");
    }
    if (result.outcome === "unavailable") {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
    return Object.freeze({
      replayed: false,
      outcome: result.outcome,
    });
  }

  const state = parseRailwayCampaignMutationState(
    operation,
    payload,
    result.state,
  );
  if (result.tenantId !== session.tenantId || state === null) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  return Object.freeze({
    replayed: result.outcome === "replayed",
    ...state,
  });
}

async function executeAiReplyApprovalMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  rawPayload: Readonly<RailwayApiJsonObject>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const payload = parseAiReplyApprovalDecisionRequest(rawPayload);
  if (payload === null) {
    invalidRequest();
  }
  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION,
    rawPayload,
    request,
  );
  let rawResult: unknown;
  try {
    rawResult = await dependencies.aiReplyApprovalMutations.execute({
      session,
      operation: RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  if (
    !isRecord(rawResult) ||
    typeof rawResult.outcome !== "string" ||
    !hasExactKeys(rawResult, ["outcome", "state", "tenantId"])
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  const result = rawResult as RailwayAiReplyApprovalMutationResult;
  if (result.outcome !== "committed" && result.outcome !== "replayed") {
    if (result.tenantId !== null || result.state !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
    if (result.outcome === "conflict") {
      throw new RailwayApiDispatchError("CONFLICT");
    }
    if (result.outcome === "unavailable") {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
    return Object.freeze({ replayed: false, outcome: result.outcome });
  }
  const state = parseRailwayAiReplyApprovalMutationState(
    payload,
    result.state,
  );
  if (result.tenantId !== session.tenantId || state === null) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  return Object.freeze({
    replayed: result.outcome === "replayed",
    ...state,
  });
}

async function executeContactSave(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  payload: Readonly<ContactSavePayload>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    "contacts.save",
    payload,
    request,
  );

  const profile = Object.freeze({
    phoneNumber: payload.phoneNumber,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    company: payload.company,
  });
  let result: unknown;

  try {
    result = await dependencies.mutations.saveContact({
      session,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      profile,
    });
  } catch {
    throw new RailwayApiDispatchError(
      "DEPENDENCY_UNAVAILABLE",
    );
  }

  if (!isValidContactSaveResult(result, session, profile)) {
    throw new RailwayApiDispatchError(
      "DEPENDENCY_UNAVAILABLE",
    );
  }

  if (result.contact === null) {
    if (result.outcome === "conflict") {
      throw new RailwayApiDispatchError("CONFLICT");
    }

    throw new RailwayApiDispatchError(
      "DEPENDENCY_UNAVAILABLE",
    );
  }

  return {
    replayed: result.outcome === "replayed",
    contact: result.contact,
  };
}

async function executeContactConsent(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  payload: Readonly<ContactConsentPayload>,
  request: Readonly<RailwayApiRequestEnvelope>,
  action: "grant" | "unsubscribe",
): Promise<unknown> {
  const operation = action === "grant"
    ? "contacts.consent.grant"
    : "contacts.consent.unsubscribe";

  await requireTenantMutationRequest(
    dependencies,
    session,
    operation,
    payload,
    request,
  );

  const transition = Object.freeze({
    source: payload.source,
    occurredAt: payload.occurredAt,
    evidenceReference: payload.evidenceReference,
  });
  const persisted = action === "grant"
    ? await dependencies.contactConsent.grantConsent(
        session,
        payload.contactId,
        transition,
      )
    : await dependencies.contactConsent.unsubscribe(
        session,
        payload.contactId,
        transition,
      );

  if (
    !isRecord(persisted) ||
    persisted.tenantId !== session.tenantId ||
    persisted.id !== payload.contactId
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const contact = toContactRecord(persisted);

  if (!isValidContactRecord(contact)) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return { contact };
}

async function executeContactOrganizationMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  operation: RailwayContactOrganizationMutationOperation,
  payload: Readonly<
    ContactOrganizationNamePayload | ContactOrganizationAssignmentPayload
  >,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    operation,
    payload,
    request,
  );
  let rawResult: unknown;

  try {
    rawResult = await dependencies.contactOrganizationMutations.execute({
      session,
      operation,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (
    !isRecord(rawResult) ||
    typeof rawResult.outcome !== "string" ||
    !hasExactKeys(rawResult, ["organization", "outcome", "tenantId"])
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const result = rawResult as RailwayContactOrganizationMutationResult;

  if (
    result.outcome === "conflict" ||
    result.outcome === "not-found" ||
    result.outcome === "unavailable"
  ) {
    if (result.tenantId !== null || result.organization !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }

    throw new RailwayApiDispatchError(
      result.outcome === "conflict"
        ? "CONFLICT"
        : result.outcome === "not-found"
          ? "NOT_FOUND"
          : "DEPENDENCY_UNAVAILABLE",
    );
  }

  const expectedContactIds = "contactId" in payload
    ? [payload.contactId]
    : [];
  const organization = parseRailwayContactOrganizationSnapshot(
    result.organization,
    expectedContactIds,
  );

  if (
    result.tenantId !== session.tenantId ||
    organization === null
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return Object.freeze({
    replayed: result.outcome === "replayed",
    organization,
  });
}

async function executeContactImportMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  operation: RailwayContactImportMutationOperation,
  payload: Readonly<StartContactImportRequest | ProcessContactImportChunkRequest>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    operation,
    payload,
    request,
  );
  let rawResult: unknown;

  try {
    rawResult = await dependencies.contactImportMutations.execute({
      session,
      operation,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (
    !isRecord(rawResult) ||
    typeof rawResult.outcome !== "string" ||
    !hasExactKeys(rawResult, ["outcome", "result", "tenantId"])
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const result = rawResult as RailwayContactImportMutationResult;

  if (
    result.outcome === "conflict" ||
    result.outcome === "not-found" ||
    result.outcome === "unavailable"
  ) {
    if (result.tenantId !== null || result.result !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }

    throw new RailwayApiDispatchError(
      result.outcome === "conflict"
        ? "CONFLICT"
        : result.outcome === "not-found"
          ? "NOT_FOUND"
          : "DEPENDENCY_UNAVAILABLE",
    );
  }

  const parsed = parseRailwayContactImportResponse(result.result);

  if (result.tenantId !== session.tenantId || parsed === null) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return Object.freeze({
    replayed: result.outcome === "replayed",
    ...parsed,
  });
}

async function executeMessageTemplateDraftMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  payload: ReturnType<typeof parseMessageTemplateDraftInput>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION,
    payload,
    request,
  );
  let rawResult: unknown;

  try {
    rawResult = await dependencies.messageTemplateDraftMutations.execute({
      session,
      operation: RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (
    !isRecord(rawResult) ||
    typeof rawResult.outcome !== "string" ||
    !hasExactKeys(rawResult, ["outcome", "template", "tenantId"])
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const result = rawResult as RailwayMessageTemplateDraftMutationResult;

  if (
    result.outcome === "conflict" ||
    result.outcome === "not-editable" ||
    result.outcome === "unavailable"
  ) {
    if (result.tenantId !== null || result.template !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }

    throw new RailwayApiDispatchError(
      result.outcome === "conflict"
        ? "CONFLICT"
        : result.outcome === "not-editable"
          ? "INVALID_TRANSITION"
          : "DEPENDENCY_UNAVAILABLE",
    );
  }

  const template = parseRailwayMessageTemplateDraftView(result.template);

  if (result.tenantId !== session.tenantId || template === null) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return Object.freeze({
    replayed: result.outcome === "replayed",
    template,
  });
}

async function executeMessageTemplateSubmissionMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  payload: Readonly<{ templateKey: string }>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
    payload,
    request,
  );
  let rawResult: unknown;

  try {
    rawResult = await dependencies.messageTemplateSubmissionMutations.execute({
      session,
      operation: RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (
    !isRecord(rawResult) || typeof rawResult.outcome !== "string" ||
    !hasExactKeys(rawResult, ["outcome", "queueMessage", "tenantId"])
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const result = rawResult as RailwayMessageTemplateSubmissionMutationResult;
  if (result.outcome !== "committed" && result.outcome !== "replayed") {
    if (result.tenantId !== null || result.queueMessage !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }

    const errorCode = result.outcome === "conflict"
      ? "CONFLICT"
      : result.outcome === "not-found"
        ? "NOT_FOUND"
        : result.outcome === "not-editable"
          ? "INVALID_TRANSITION"
          : result.outcome === "meta-not-connected"
            ? "INVALID_TRANSITION"
            : "DEPENDENCY_UNAVAILABLE";
    throw new RailwayApiDispatchError(errorCode);
  }

  const queueMessage = parseMessageTemplateSubmissionQueueMessage(
    result.queueMessage,
  );
  if (
    result.tenantId !== session.tenantId || queueMessage === null ||
    queueMessage.tenantId !== session.tenantId
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return Object.freeze({
    replayed: result.outcome === "replayed",
    submissionKey: queueMessage.submissionKey,
    status: "pending" as const,
  });
}

export function createRailwayApiOperationRegistry(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
): Readonly<RailwayApiOperationRegistry> {
  if (
    typeof dependencies.tenantSessions?.resolve !== "function" ||
    typeof dependencies.conversations?.list !== "function" ||
    typeof dependencies.conversations?.readThread !== "function" ||
    typeof dependencies.conversationMutations?.execute !== "function" ||
    typeof dependencies.botFlows?.list !== "function" ||
    typeof dependencies.botFlows?.readDetails !== "function" ||
    typeof dependencies.botFlowMutations?.execute !== "function" ||
    typeof dependencies.aiAgents?.list !== "function" ||
    typeof dependencies.aiAgents?.listKnowledgeSources !== "function" ||
    typeof dependencies.aiAgents?.readDetails !== "function" ||
    typeof dependencies.aiAgentMutations?.execute !== "function" ||
    typeof dependencies.aiReplyApprovals?.listAwaiting !== "function" ||
    typeof dependencies.aiReplyApprovalMutations?.execute !== "function" ||
    typeof dependencies.campaigns?.list !== "function" ||
    typeof dependencies.campaignMutations?.execute !== "function" ||
    typeof dependencies.campaignDeliveryConfigured !== "function" ||
    typeof dependencies.contacts?.list !== "function" ||
    typeof dependencies.contactConsent?.grantConsent !== "function" ||
    typeof dependencies.contactConsent?.unsubscribe !== "function" ||
    typeof dependencies.contactOrganization?.read !== "function" ||
    typeof dependencies.contactOrganizationMutations?.execute !== "function" ||
    typeof dependencies.contactImportMutations?.execute !== "function" ||
    typeof dependencies.messageTemplates?.list !== "function" ||
    typeof dependencies.messageTemplateDraftMutations?.execute !== "function" ||
    typeof dependencies.messageTemplateSubmissionMutations?.execute !== "function" ||
    typeof dependencies.reports?.read !== "function" ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    typeof dependencies.mutations?.saveContact !== "function"
  ) {
    throw new Error(
      "Railway API operation dependencies are invalid",
    );
  }

  const [
    workspacePolicy,
    conversationListPolicy,
    conversationThreadPolicy,
    conversationMarkReadPolicy,
    conversationAssignmentPolicy,
    botFlowListPolicy,
    botFlowDetailsPolicy,
    botFlowDraftPolicy,
    botFlowPublishPolicy,
    aiAgentDirectoryPolicy,
    aiAgentDetailsPolicy,
    aiAgentDraftPolicy,
    aiAgentPublishPolicy,
    aiReplyApprovalListPolicy,
    aiReplyApprovalDecidePolicy,
    campaignDirectoryPolicy,
    campaignSnapshotPolicy,
    campaignActivatePolicy,
    contactsPolicy,
    contactSavePolicy,
    contactConsentGrantPolicy,
    contactConsentUnsubscribePolicy,
    contactTagSavePolicy,
    contactListSavePolicy,
    contactTagAssignmentPolicy,
    contactListMembershipPolicy,
    contactImportStartPolicy,
    contactImportChunkPolicy,
    messageTemplateListPolicy,
    messageTemplateDraftPolicy,
    messageTemplateSubmissionPolicy,
    reportsPolicy,
  ] =
    railwayApiOperationPolicies;
  const operations = [
    createOperation(
      workspacePolicy,
      dependencies,
      parseEmptyPayload,
      async (session) => {
        return {
          displayName: session.displayName,
          status: session.status,
          role: session.role,
        };
      },
    ),
    createOperation(
      conversationListPolicy,
      dependencies,
      parseConversationListPayload,
      async (session, filters) => ({
        conversations: (await dependencies.conversations.list(
          session,
          filters,
        )).map((conversation) =>
          toInboxConversationView(
            conversation,
            session.externalUserId,
          ),
        ),
        canReply: hasPermission(session.role, "conversations.reply"),
      }),
    ),
    createOperation(
      conversationThreadPolicy,
      dependencies,
      parseConversationThreadPayload,
      async (session, conversationKey) => {
        const thread = await dependencies.conversations.readThread(
          session,
          conversationKey,
        );

        return {
          thread: toInboxConversationThreadView(
            thread.conversation,
            thread.messages,
            session.externalUserId,
          ),
        };
      },
    ),
    createOperation(
      conversationMarkReadPolicy,
      dependencies,
      parseConversationMarkReadPayload,
      (session, payload, request) =>
        executeConversationMutation(
          dependencies,
          session,
          "conversations.mark-read",
          payload,
          request,
        ),
    ),
    createOperation(
      conversationAssignmentPolicy,
      dependencies,
      parseConversationAssignmentPayload,
      (session, payload, request) =>
        executeConversationMutation(
          dependencies,
          session,
          "conversations.assignment.change",
          payload,
          request,
        ),
    ),
    createOperation(
      botFlowListPolicy,
      dependencies,
      parseEmptyPayload,
      async (session) => ({
        flows: (await dependencies.botFlows.list(session)).map(
          toBotFlowSummaryView,
        ),
        canWrite: hasPermission(session.role, "bot.write"),
      }),
    ),
    createOperation(
      botFlowDetailsPolicy,
      dependencies,
      parseBotFlowDetailsPayload,
      async (session, botFlowKey) => ({
        botFlow: toBotFlowDetailsView(
          await dependencies.botFlows.readDetails(session, botFlowKey),
        ),
      }),
    ),
    createOperation(
      botFlowDraftPolicy,
      dependencies,
      (payload) => payload,
      (session, payload, request) =>
        executeBotFlowMutation(
          dependencies,
          session,
          RAILWAY_BOT_FLOW_DRAFT_OPERATION,
          payload,
          request,
        ),
    ),
    createOperation(
      botFlowPublishPolicy,
      dependencies,
      (payload) => payload,
      (session, payload, request) =>
        executeBotFlowMutation(
          dependencies,
          session,
          RAILWAY_BOT_FLOW_PUBLISH_OPERATION,
          payload,
          request,
        ),
    ),
    createOperation(
      aiAgentDirectoryPolicy,
      dependencies,
      parseEmptyPayload,
      async (session) => {
        const [agents, knowledgeSources] = await Promise.all([
          dependencies.aiAgents.list(session),
          dependencies.aiAgents.listKnowledgeSources(session),
        ]);
        return Object.freeze({
          agents: Object.freeze(agents.map(toAiAgentSummaryView)),
          knowledgeSources: Object.freeze(
            knowledgeSources.map(toKnowledgeSourceView),
          ),
          canWrite: hasPermission(session.role, "ai.write"),
        });
      },
    ),
    createOperation(
      aiAgentDetailsPolicy,
      dependencies,
      (payload) => {
        if (!hasExactKeys(payload, ["aiAgentKey"])) invalidRequest();
        const aiAgentKey = parseAiAgentKey(payload.aiAgentKey);
        if (aiAgentKey === null) invalidRequest();
        return aiAgentKey;
      },
      async (session, aiAgentKey) => Object.freeze({
        aiAgent: toAiAgentDetailsView(
          await dependencies.aiAgents.readDetails(session, aiAgentKey),
        ),
      }),
    ),
    createOperation(
      aiAgentDraftPolicy,
      dependencies,
      (payload) => payload,
      (session, payload, request) => executeAiAgentMutation(
        dependencies,
        session,
        RAILWAY_AI_AGENT_DRAFT_OPERATION,
        payload,
        request,
      ),
    ),
    createOperation(
      aiAgentPublishPolicy,
      dependencies,
      (payload) => payload,
      (session, payload, request) => executeAiAgentMutation(
        dependencies,
        session,
        RAILWAY_AI_AGENT_PUBLISH_OPERATION,
        payload,
        request,
      ),
    ),
    createOperation(
      aiReplyApprovalListPolicy,
      dependencies,
      parseEmptyPayload,
      async (session) => ({
        approvals: (await dependencies.aiReplyApprovals.listAwaiting(session))
          .map(toAiReplyApprovalView),
        canDecide: hasPermission(session.role, "conversations.reply"),
      }),
    ),
    createOperation(
      aiReplyApprovalDecidePolicy,
      dependencies,
      (payload) => payload,
      (session, payload, request) =>
        executeAiReplyApprovalMutation(
          dependencies,
          session,
          payload,
          request,
        ),
    ),
    createOperation(
      campaignDirectoryPolicy,
      dependencies,
      parseEmptyPayload,
      async (session) => {
        const [campaigns, templates, organization] = await Promise.all([
          dependencies.campaigns.list(session),
          dependencies.messageTemplates.list(session),
          dependencies.contactOrganization.read(session, []),
        ]);
        return Object.freeze({
          campaigns: Object.freeze(campaigns.map(toCampaignView)),
          templates: Object.freeze(
            templates
              .map(toCampaignTemplateOptionView)
              .filter(
                (template): template is NonNullable<typeof template> =>
                  template !== null,
              ),
          ),
          audiences: toCampaignAudienceOptionsView(organization),
          canWrite: hasPermission(session.role, "campaigns.write"),
          deliveryStatus: dependencies.campaignDeliveryConfigured()
            ? "ready"
            : "configuration-required",
        });
      },
    ),
    createOperation(
      campaignSnapshotPolicy,
      dependencies,
      (payload) => payload,
      (session, payload, request) =>
        executeCampaignMutation(
          dependencies,
          session,
          RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION,
          payload,
          request,
        ),
    ),
    createOperation(
      campaignActivatePolicy,
      dependencies,
      (payload) => payload,
      (session, payload, request) =>
        executeCampaignMutation(
          dependencies,
          session,
          RAILWAY_CAMPAIGN_ACTIVATE_OPERATION,
          payload,
          request,
        ),
    ),
    createOperation(
      contactsPolicy,
      dependencies,
      parseContactListPayload,
      async (session, beforeContactId) => {
        const page = await dependencies.contacts.list(
          session,
          beforeContactId,
        );
        const organization =
          await dependencies.contactOrganization.read(
            session,
            page.contacts.map((contact) => contact.id),
          );

        return {
          contacts: page.contacts.map(toContactRecord),
          nextCursor: page.nextCursor,
          organization: toContactOrganizationView(organization),
        };
      },
    ),
    createOperation(
      contactSavePolicy,
      dependencies,
      parseContactSavePayload,
      async (session, profile, request) =>
        executeContactSave(
          dependencies,
          session,
          profile,
          request,
        ),
    ),
    createOperation(
      contactConsentGrantPolicy,
      dependencies,
      parseContactConsentPayload,
      async (session, payload, request) =>
        executeContactConsent(
          dependencies,
          session,
          payload,
          request,
          "grant",
        ),
    ),
    createOperation(
      contactConsentUnsubscribePolicy,
      dependencies,
      parseContactConsentPayload,
      async (session, payload, request) =>
        executeContactConsent(
          dependencies,
          session,
          payload,
          request,
          "unsubscribe",
        ),
    ),
    createOperation(
      contactTagSavePolicy,
      dependencies,
      parseContactOrganizationNamePayload,
      (session, payload, request) =>
        executeContactOrganizationMutation(
          dependencies,
          session,
          "contacts.organization.tag.save",
          payload,
          request,
        ),
    ),
    createOperation(
      contactListSavePolicy,
      dependencies,
      parseContactOrganizationNamePayload,
      (session, payload, request) =>
        executeContactOrganizationMutation(
          dependencies,
          session,
          "contacts.organization.list.save",
          payload,
          request,
        ),
    ),
    createOperation(
      contactTagAssignmentPolicy,
      dependencies,
      parseContactOrganizationAssignmentPayload,
      (session, payload, request) =>
        executeContactOrganizationMutation(
          dependencies,
          session,
          "contacts.organization.tag-assignment",
          payload,
          request,
        ),
    ),
    createOperation(
      contactListMembershipPolicy,
      dependencies,
      parseContactOrganizationAssignmentPayload,
      (session, payload, request) =>
        executeContactOrganizationMutation(
          dependencies,
          session,
          "contacts.organization.list-membership",
          payload,
          request,
        ),
    ),
    createOperation(
      contactImportStartPolicy,
      dependencies,
      parseStartContactImportInput,
      (session, payload, request) =>
        executeContactImportMutation(
          dependencies,
          session,
          "contacts.import.start",
          payload,
          request,
        ),
    ),
    createOperation(
      contactImportChunkPolicy,
      dependencies,
      parseContactImportChunkInput,
      (session, payload, request) =>
        executeContactImportMutation(
          dependencies,
          session,
          "contacts.import.chunk",
          payload,
          request,
        ),
    ),
    createOperation(
      messageTemplateListPolicy,
      dependencies,
      parseEmptyPayload,
      async (session) => ({
        templates: (await dependencies.messageTemplates.list(session))
          .map(toMessageTemplateView),
        canWrite: hasPermission(session.role, "templates.write"),
      }),
    ),
    createOperation(
      messageTemplateDraftPolicy,
      dependencies,
      parseMessageTemplateDraftInput,
      (session, payload, request) =>
        executeMessageTemplateDraftMutation(
          dependencies,
          session,
          payload,
          request,
        ),
    ),
    createOperation(
      messageTemplateSubmissionPolicy,
      dependencies,
      parseMessageTemplateSubmissionPayload,
      (session, payload, request) =>
        executeMessageTemplateSubmissionMutation(
          dependencies,
          session,
          payload,
          request,
        ),
    ),
    createOperation(
      reportsPolicy,
      dependencies,
      parseReportPayload,
      async (session, reportInput) =>
        toOperationalReportView(
          await dependencies.reports.read(
            session,
            reportInput,
          ),
        ),
    ),
  ];

  return Object.freeze({
    operations: Object.freeze(operations),
  });
}
