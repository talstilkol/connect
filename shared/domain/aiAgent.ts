import type {
  ConversationStatus,
} from "./model.ts";

export const aiAgentStatuses = [
  "draft",
  "active",
  "inactive",
] as const;

export const aiAgentVersionStatuses = [
  "draft",
  "published",
  "archived",
] as const;

export const aiResponseModes = [
  "automatic",
  "agent-approval",
] as const;

export const knowledgeSourceStatuses = [
  "pending-upload",
  "pending-validation",
  "pending-scan",
  "scanning",
  "ready",
  "rejected",
  "archived",
] as const;

export const aiAgentFallbackReasons = [
  "customer-request",
  "no-approved-knowledge",
  "grounding-below-threshold",
  "provider-unavailable",
  "budget-exhausted",
  "policy-violation",
] as const;

export type AiAgentStatus =
  (typeof aiAgentStatuses)[number];

export type AiAgentVersionStatus =
  (typeof aiAgentVersionStatuses)[number];

export type AiResponseMode =
  (typeof aiResponseModes)[number];

export type KnowledgeSourceStatus =
  (typeof knowledgeSourceStatuses)[number];

export type AiAgentFallbackReason =
  (typeof aiAgentFallbackReasons)[number];

export type AiAgentActivationIssue =
  | "provider-required"
  | "billing-policy-required"
  | "handoff-policy-required"
  | "audit-sink-required"
  | "response-mode-required"
  | "grounding-threshold-required"
  | "cost-limit-required"
  | "knowledge-source-required"
  | "knowledge-source-not-ready";

export interface AiAgentActivationReadiness {
  ready: boolean;
  issues: readonly AiAgentActivationIssue[];
}

export interface ValidatedAiAgentDefinition {
  name: string;
  systemPrompt: string;
  handoffMessage: string;
  responseMode: AiResponseMode | null;
  minimumGroundingScoreBasisPoints: number | null;
  monthlyCostLimitMinorUnits: number | null;
  billingCurrency: string | null;
  knowledgeSourceKeys: readonly string[];
}

export interface PersistedAiAgent {
  aiAgentKey: string;
  tenantId: number;
  name: string;
  status: AiAgentStatus;
  latestVersionKey: string;
  latestVersionNumber: number;
  activeVersionKey: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedAiAgentVersion {
  aiAgentVersionKey: string;
  aiAgentKey: string;
  tenantId: number;
  versionNumber: number;
  status: AiAgentVersionStatus;
  definition: ValidatedAiAgentDefinition;
  publishedAt: string | null;
  createdAt: string;
}

export interface KnowledgeSourceReadiness {
  sourceKey: string;
  status: KnowledgeSourceStatus;
}

export interface PersistedKnowledgeSource {
  sourceKey: string;
  tenantId: number;
  contentSha256: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  storageObjectKey: string;
  status: KnowledgeSourceStatus;
  lastErrorCode: string | null;
  readyAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedKnowledgePassage {
  passageKey: string;
  tenantId: number;
  sourceKey: string;
  passageOrdinal: number;
  contentSha256: string;
  content: string;
  createdAt: string;
}

export interface AiAgentActivationContext {
  providerReady: boolean;
  billingPolicyApproved: boolean;
  handoffPolicyApproved: boolean;
  auditSinkReady: boolean;
  knowledgeSources:
    readonly KnowledgeSourceReadiness[];
}

export interface AiAgentFallbackEffect {
  outcome: "handoff";
  reason: AiAgentFallbackReason;
  generateReply: false;
  sendReply: false;
  stopAiExecution: true;
  conversationStatus: Extract<
    ConversationStatus,
    "waiting_for_agent"
  >;
  assignmentAction: "none";
  auditRequired: true;
}
