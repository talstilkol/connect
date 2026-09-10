import type {
  AiAgentActivationIssue,
  ValidatedAiAgentDefinition,
} from "../../shared/domain/aiAgent.ts";
import type {
  AiAgentSummaryView,
  AiAgentVersionView,
} from "../../shared/domain/aiAgentView.ts";
import type { TenantSession } from "../auth/tenantSession.ts";
import {
  parseRailwayAiAgentSummary,
  parseRailwayAiAgentVersion,
} from "../ai/railwayAiAgentResult.ts";

export const RAILWAY_AI_AGENT_DRAFT_OPERATION =
  "ai.agents.draft.save" as const;
export const RAILWAY_AI_AGENT_PUBLISH_OPERATION =
  "ai.agents.publish" as const;
export const railwayAiAgentMutationOperations = Object.freeze([
  RAILWAY_AI_AGENT_DRAFT_OPERATION,
  RAILWAY_AI_AGENT_PUBLISH_OPERATION,
] as const);

export type RailwayAiAgentMutationOperation =
  (typeof railwayAiAgentMutationOperations)[number];
export type RailwayAiAgentSaveDraftPayload = Readonly<{
  definition: ValidatedAiAgentDefinition;
  expectedAgentVersion: number | null;
}>;
export type RailwayAiAgentPublishPayload = Readonly<{
  aiAgentKey: string;
  aiAgentVersionKey: string;
  expectedAgentVersion: number;
}>;
export type RailwayAiAgentMutationPayload =
  | RailwayAiAgentSaveDraftPayload
  | RailwayAiAgentPublishPayload;
export type RailwayAiAgentDraftState = Readonly<{
  outcome: "created" | "updated" | "unchanged";
  agent: Readonly<AiAgentSummaryView>;
  draftVersion: Readonly<AiAgentVersionView>;
}>;
export type RailwayAiAgentPublishState = Readonly<{
  outcome: "updated" | "unchanged";
  agent: Readonly<AiAgentSummaryView>;
  publishedVersion: Readonly<AiAgentVersionView>;
}>;
export type RailwayAiAgentMutationState =
  | RailwayAiAgentDraftState
  | RailwayAiAgentPublishState;

export interface RailwayAiAgentMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: RailwayAiAgentMutationOperation;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: RailwayAiAgentMutationPayload;
}

export type RailwayAiAgentMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      state: RailwayAiAgentMutationState;
    }>
  | Readonly<{
      outcome: "activation-blocked";
      tenantId: null;
      state: null;
      issues: readonly AiAgentActivationIssue[];
    }>
  | Readonly<{
      outcome: "conflict" | "not-found" | "invalid-state" | "unavailable";
      tenantId: null;
      state: null;
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length &&
    actual.every((key, index) => key === sorted[index]);
}

export function parseRailwayAiAgentMutationState(
  operation: RailwayAiAgentMutationOperation,
  payload: Readonly<RailwayAiAgentMutationPayload>,
  value: unknown,
): RailwayAiAgentMutationState | null {
  if (!isRecord(value) || typeof value.outcome !== "string") return null;

  if (operation === RAILWAY_AI_AGENT_DRAFT_OPERATION) {
    if (
      !hasExactKeys(value, ["agent", "draftVersion", "outcome"]) ||
      (value.outcome !== "created" && value.outcome !== "updated" &&
        value.outcome !== "unchanged") ||
      !("definition" in payload)
    ) {
      return null;
    }
    const agent = parseRailwayAiAgentSummary(value.agent);
    const draftVersion = parseRailwayAiAgentVersion(value.draftVersion);
    const expectedVersion = payload.expectedAgentVersion === null
      ? 1
      : payload.expectedAgentVersion + 1;
    if (
      agent === null || draftVersion === null ||
      agent.version !== expectedVersion ||
      agent.latestVersionKey !== draftVersion.aiAgentVersionKey ||
      agent.latestVersionNumber !== draftVersion.versionNumber ||
      agent.name !== payload.definition.name || draftVersion.status !== "draft" ||
      JSON.stringify(draftVersion.definition) !== JSON.stringify(payload.definition)
    ) {
      return null;
    }
    return Object.freeze({ outcome: value.outcome, agent, draftVersion });
  }

  if (
    !hasExactKeys(value, ["agent", "outcome", "publishedVersion"]) ||
    (value.outcome !== "updated" && value.outcome !== "unchanged") ||
    !("aiAgentKey" in payload)
  ) {
    return null;
  }
  const agent = parseRailwayAiAgentSummary(value.agent);
  const publishedVersion = parseRailwayAiAgentVersion(value.publishedVersion);
  if (
    agent === null || publishedVersion === null ||
    agent.aiAgentKey !== payload.aiAgentKey ||
    agent.version !== payload.expectedAgentVersion + 1 ||
    agent.status !== "active" ||
    agent.latestVersionKey !== payload.aiAgentVersionKey ||
    agent.activeVersionKey !== payload.aiAgentVersionKey ||
    publishedVersion.aiAgentVersionKey !== payload.aiAgentVersionKey ||
    publishedVersion.status !== "published"
  ) {
    return null;
  }
  return Object.freeze({ outcome: value.outcome, agent, publishedVersion });
}

export interface RailwayAiAgentMutationExecutor {
  execute(
    command: Readonly<RailwayAiAgentMutationCommand>,
  ): Promise<RailwayAiAgentMutationResult>;
}
