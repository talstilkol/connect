import type {
  BotFlowStatus,
  BotFlowVersionStatus,
  ValidatedBotFlowDefinition,
} from "./botFlow.ts";

export type BotFlowDirectoryStatus =
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "ready"
  | "server-error";

export interface BotFlowSummaryView {
  botFlowKey: string;
  name: string;
  status: BotFlowStatus;
  latestVersionKey: string;
  latestVersionNumber: number;
  activeVersionKey: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface BotFlowVersionView {
  botFlowVersionKey: string;
  versionNumber: number;
  status: BotFlowVersionStatus;
  definition: ValidatedBotFlowDefinition;
  publishedAt: string | null;
  createdAt: string;
}

export interface BotFlowDetailsView {
  flow: BotFlowSummaryView;
  versions: readonly BotFlowVersionView[];
}

export interface BotFlowDirectoryView {
  flows: readonly BotFlowSummaryView[];
  selectedFlow: BotFlowDetailsView | null;
  canWrite: boolean;
}
