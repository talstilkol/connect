import type {
  AiAgentActivationIssue,
  AiAgentStatus,
  AiAgentVersionStatus,
  KnowledgeSourceStatus,
  ValidatedAiAgentDefinition,
} from "./aiAgent.ts";

export type AiAgentDirectoryStatus =
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "ready"
  | "server-error";

export interface AiAgentSummaryView {
  aiAgentKey: string;
  name: string;
  status: AiAgentStatus;
  latestVersionKey: string;
  latestVersionNumber: number;
  activeVersionKey: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgentVersionView {
  aiAgentVersionKey: string;
  versionNumber: number;
  status: AiAgentVersionStatus;
  definition: ValidatedAiAgentDefinition;
  publishedAt: string | null;
  createdAt: string;
}

export interface AiAgentActivationReadinessView {
  ready: boolean;
  issues: readonly AiAgentActivationIssue[];
}

export interface AiAgentDetailsView {
  agent: AiAgentSummaryView;
  versions: readonly AiAgentVersionView[];
  activationReadiness:
    AiAgentActivationReadinessView;
}

export interface KnowledgeSourceView {
  sourceKey: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  status: KnowledgeSourceStatus;
  readyAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgentDirectoryView {
  agents: readonly AiAgentSummaryView[];
  selectedAgent: AiAgentDetailsView | null;
  knowledgeSources:
    readonly KnowledgeSourceView[];
  canWrite: boolean;
}
