import type {
  AiAgentFallbackEffect,
  AiAgentFallbackReason,
  AiResponseMode,
} from "./aiAgent.ts";

export interface AiKnowledgePassage {
  passageKey: string;
  sourceKey: string;
  content: string;
}

export interface AiKnowledgeRetrievalRequest {
  requestKey: string;
  tenantId: number;
  aiAgentVersionKey: string;
  sourceKeys: readonly string[];
  query: string;
}

export type AiKnowledgeRetrievalResult =
  | {
      outcome: "grounded";
      scoreBasisPoints: number;
      passages:
        readonly AiKnowledgePassage[];
    }
  | { outcome: "no-approved-knowledge" }
  | { outcome: "unavailable" };

export interface AiKnowledgeRetriever {
  retrieve(
    request: AiKnowledgeRetrievalRequest,
  ): Promise<unknown>;
}

export interface AiCostAuthorizationRequest {
  requestKey: string;
  tenantId: number;
  aiAgentKey: string;
  monthlyLimitMinorUnits: number;
  currency: string;
}

export type AiCostAuthorizationResult =
  | { outcome: "authorized" }
  | { outcome: "exhausted" }
  | { outcome: "unavailable" };

export interface AiUsageRecord {
  inputTokens: number;
  outputTokens: number;
  costMinorUnits: number;
  currency: string;
}

export interface AiCostUsageRequest {
  requestKey: string;
  tenantId: number;
  aiAgentKey: string;
  usage: AiUsageRecord;
}

export type AiCostUsageResult =
  | {
      outcome: "recorded";
      withinLimit: boolean;
    }
  | { outcome: "unavailable" };

export interface AiCostGate {
  authorize(
    request: AiCostAuthorizationRequest,
  ): Promise<unknown>;
  recordUsage(
    request: AiCostUsageRequest,
  ): Promise<unknown>;
}

export interface AiResponseGenerationRequest {
  requestKey: string;
  tenantId: number;
  aiAgentVersionKey: string;
  systemPrompt: string;
  customerMessage: string;
  passages: readonly AiKnowledgePassage[];
}

export type AiResponseGenerationResult =
  | {
      outcome: "generated";
      text: string;
      groundedPassageKeys: readonly string[];
      usage: AiUsageRecord;
    }
  | { outcome: "policy-violation" }
  | { outcome: "unavailable" };

export interface AiResponseProvider {
  generate(
    request: AiResponseGenerationRequest,
  ): Promise<unknown>;
}

export interface AiRuntimeAuditEvent {
  auditKey: string;
  requestKey: string;
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  expectedConversationVersion: number;
  aiAgentKey: string;
  aiAgentVersionKey: string;
  outcome: "reply-planned" | "handoff";
  reason: AiAgentFallbackReason | null;
  responseMode: AiResponseMode;
  groundingScoreBasisPoints: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costMinorUnits: number | null;
  currency: string;
}

export interface AiRuntimeAuditSink {
  record(
    event: AiRuntimeAuditEvent,
  ): Promise<unknown>;
}

export interface AiRuntimeHandoffPlan {
  outcome: "handoff-planned";
  requestKey: string;
  auditKey: string;
  aiAgentKey: string;
  aiAgentVersionKey: string;
  effect: AiAgentFallbackEffect;
}

export interface AiRuntimeReplyPlan {
  outcome: "reply-planned";
  requestKey: string;
  auditKey: string;
  aiAgentKey: string;
  aiAgentVersionKey: string;
  responseMode: AiResponseMode;
  approvalRequired: boolean;
  text: string;
  groundedSourceKeys: readonly string[];
  groundingScoreBasisPoints: number;
  usage: AiUsageRecord;
  sendReply: false;
  auditRecorded: true;
}

export type AiRuntimeTurnPlan =
  | AiRuntimeHandoffPlan
  | AiRuntimeReplyPlan;
