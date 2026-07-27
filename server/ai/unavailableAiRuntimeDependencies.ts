import type {
  AiCostGate,
  AiKnowledgeRetriever,
  AiResponseProvider,
  AiRuntimeAuditSink,
} from "../../shared/domain/aiRuntime.ts";

export const unavailableAiKnowledgeRetriever:
AiKnowledgeRetriever = {
  async retrieve() {
    return { outcome: "unavailable" };
  },
};

export const unavailableAiCostGate:
AiCostGate = {
  async authorize() {
    return { outcome: "unavailable" };
  },
  async recordUsage() {
    return { outcome: "unavailable" };
  },
};

export const unavailableAiResponseProvider:
AiResponseProvider = {
  async generate() {
    return { outcome: "unavailable" };
  },
};

export const unavailableAiRuntimeAuditSink:
AiRuntimeAuditSink = {
  async record() {
    return { outcome: "unavailable" };
  },
};
