import type {
  ConversationStatus,
} from "./model.ts";

export const botFlowStatuses = [
  "draft",
  "active",
  "inactive",
] as const;

export const botFlowBlockTypes = [
  "trigger",
  "keyword",
  "text",
  "buttons",
  "condition",
  "handoff",
  "end",
] as const;

export const botFlowVersionStatuses = [
  "draft",
  "published",
  "archived",
] as const;

export const botFlowKeywordMatchModes = [
  "exact",
  "contains",
] as const;

export const botFlowConditionFacts = [
  "last-inbound-text",
  "conversation-status",
] as const;

export const botFlowConditionOperators = [
  "equals",
  "contains",
] as const;

export const botFlowHandoffReasons = [
  "customer-request",
  "no-match",
  "flow-rule",
] as const;

export type BotFlowStatus =
  (typeof botFlowStatuses)[number];

export type BotFlowBlockType =
  (typeof botFlowBlockTypes)[number];

export type BotFlowVersionStatus =
  (typeof botFlowVersionStatuses)[number];

export type BotFlowKeywordMatchMode =
  (typeof botFlowKeywordMatchModes)[number];

export type BotFlowConditionFact =
  (typeof botFlowConditionFacts)[number];

export type BotFlowConditionOperator =
  (typeof botFlowConditionOperators)[number];

export type BotFlowHandoffReason =
  (typeof botFlowHandoffReasons)[number];

interface BotFlowBlockBase {
  blockKey: string;
  type: BotFlowBlockType;
}

export interface BotFlowTriggerBlock
  extends BotFlowBlockBase {
  type: "trigger";
  nextBlockKey: string;
}

export interface BotFlowKeywordBlock
  extends BotFlowBlockBase {
  type: "keyword";
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  matchedBlockKey: string;
  unmatchedBlockKey: string;
}

export interface BotFlowTextBlock
  extends BotFlowBlockBase {
  type: "text";
  text: string;
  nextBlockKey: string;
}

export interface BotFlowButtonOption {
  optionKey: string;
  label: string;
  nextBlockKey: string;
}

export interface BotFlowButtonsBlock
  extends BotFlowBlockBase {
  type: "buttons";
  text: string;
  options: readonly BotFlowButtonOption[];
}

export interface BotFlowConditionBlock
  extends BotFlowBlockBase {
  type: "condition";
  fact: BotFlowConditionFact;
  operator: BotFlowConditionOperator;
  value: string;
  matchedBlockKey: string;
  unmatchedBlockKey: string;
}

export interface BotFlowHandoffBlock
  extends BotFlowBlockBase {
  type: "handoff";
  reason: BotFlowHandoffReason;
}

export interface BotFlowEndBlock
  extends BotFlowBlockBase {
  type: "end";
}

export type BotFlowBlock =
  | BotFlowTriggerBlock
  | BotFlowKeywordBlock
  | BotFlowTextBlock
  | BotFlowButtonsBlock
  | BotFlowConditionBlock
  | BotFlowHandoffBlock
  | BotFlowEndBlock;

export interface ValidatedBotFlowDefinition {
  name: string;
  entryBlockKey: string;
  blocks: readonly BotFlowBlock[];
}

export interface PersistedBotFlow {
  botFlowKey: string;
  tenantId: number;
  name: string;
  status: BotFlowStatus;
  latestVersionKey: string;
  latestVersionNumber: number;
  activeVersionKey: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedBotFlowVersion {
  botFlowVersionKey: string;
  botFlowKey: string;
  tenantId: number;
  versionNumber: number;
  status: BotFlowVersionStatus;
  definition: ValidatedBotFlowDefinition;
  publishedAt: string | null;
  createdAt: string;
}

export type BotFlowTerminalEffect =
  | {
      outcome: "handoff";
      stopExecution: true;
      conversationStatus: Extract<
        ConversationStatus,
        "waiting_for_agent"
      >;
      assignmentAction: "none";
      reason: BotFlowHandoffReason;
    }
  | {
      outcome: "end";
      stopExecution: true;
      conversationStatus: null;
      assignmentAction: "none";
    };
