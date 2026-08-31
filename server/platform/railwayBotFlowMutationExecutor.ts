import type {
  ValidatedBotFlowDefinition,
} from "../../shared/domain/botFlow.ts";
import type {
  BotFlowSummaryView,
  BotFlowVersionView,
} from "../../shared/domain/botFlowView.ts";
import {
  parseRailwayBotFlowSummary,
  parseRailwayBotFlowVersion,
} from "../bot/railwayBotFlowResult.ts";
import type { TenantSession } from "../auth/tenantSession.ts";

export const RAILWAY_BOT_FLOW_DRAFT_OPERATION =
  "bot.flows.draft.save" as const;
export const RAILWAY_BOT_FLOW_PUBLISH_OPERATION =
  "bot.flows.publish" as const;

export const railwayBotFlowMutationOperations = Object.freeze([
  RAILWAY_BOT_FLOW_DRAFT_OPERATION,
  RAILWAY_BOT_FLOW_PUBLISH_OPERATION,
] as const);

export type RailwayBotFlowMutationOperation =
  typeof railwayBotFlowMutationOperations[number];

export type RailwayBotFlowSaveDraftPayload = Readonly<{
  definition: ValidatedBotFlowDefinition;
  expectedFlowVersion: number | null;
}>;

export type RailwayBotFlowPublishPayload = Readonly<{
  botFlowKey: string;
  botFlowVersionKey: string;
  expectedFlowVersion: number;
}>;

export type RailwayBotFlowMutationPayload =
  | RailwayBotFlowSaveDraftPayload
  | RailwayBotFlowPublishPayload;

export type RailwayBotFlowSaveDraftState = Readonly<{
  outcome: "created" | "updated" | "unchanged";
  flow: Readonly<BotFlowSummaryView>;
  draftVersion: Readonly<BotFlowVersionView>;
}>;

export type RailwayBotFlowPublishState = Readonly<{
  outcome: "updated" | "unchanged";
  flow: Readonly<BotFlowSummaryView>;
  publishedVersion: Readonly<BotFlowVersionView>;
}>;

export type RailwayBotFlowMutationState =
  | RailwayBotFlowSaveDraftState
  | RailwayBotFlowPublishState;

export interface RailwayBotFlowMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: RailwayBotFlowMutationOperation;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: RailwayBotFlowMutationPayload;
}

export type RailwayBotFlowMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      state: RailwayBotFlowMutationState;
    }>
  | Readonly<{
      outcome:
        | "conflict"
        | "not-found"
        | "invalid-state"
        | "unavailable";
      tenantId: null;
      state: null;
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

export function parseRailwayBotFlowMutationState(
  operation: RailwayBotFlowMutationOperation,
  payload: Readonly<RailwayBotFlowMutationPayload>,
  value: unknown,
): RailwayBotFlowMutationState | null {
  if (!isRecord(value) || typeof value.outcome !== "string") {
    return null;
  }

  if (operation === RAILWAY_BOT_FLOW_DRAFT_OPERATION) {
    if (
      !hasExactKeys(value, ["draftVersion", "flow", "outcome"]) ||
      (value.outcome !== "created" &&
        value.outcome !== "updated" &&
        value.outcome !== "unchanged") ||
      !("definition" in payload) ||
      (value.outcome === "created" &&
        payload.expectedFlowVersion !== null) ||
      (value.outcome === "updated" &&
        payload.expectedFlowVersion === null)
    ) {
      return null;
    }

    const flow = parseRailwayBotFlowSummary(value.flow);
    const draftVersion = parseRailwayBotFlowVersion(value.draftVersion);
    const resultingFlowVersion = payload.expectedFlowVersion === null
      ? 1
      : payload.expectedFlowVersion + 1;
    if (
      flow === null ||
      draftVersion === null ||
      flow.name !== payload.definition.name ||
      flow.version !== resultingFlowVersion ||
      flow.latestVersionKey !== draftVersion.botFlowVersionKey ||
      flow.latestVersionNumber !== draftVersion.versionNumber ||
      draftVersion.status !== "draft" ||
      draftVersion.definition.name !== flow.name ||
      JSON.stringify(draftVersion.definition) !==
        JSON.stringify(payload.definition)
    ) {
      return null;
    }

    return Object.freeze({
      outcome: value.outcome,
      flow,
      draftVersion,
    });
  }

  if (
    !hasExactKeys(value, ["flow", "outcome", "publishedVersion"]) ||
    (value.outcome !== "updated" && value.outcome !== "unchanged") ||
    !("botFlowKey" in payload)
  ) {
    return null;
  }

  const flow = parseRailwayBotFlowSummary(value.flow);
  const publishedVersion = parseRailwayBotFlowVersion(
    value.publishedVersion,
  );
  if (
    flow === null ||
    publishedVersion === null ||
    flow.botFlowKey !== payload.botFlowKey ||
    flow.version !== payload.expectedFlowVersion + 1 ||
    flow.status !== "active" ||
    flow.latestVersionKey !== payload.botFlowVersionKey ||
    flow.activeVersionKey !== payload.botFlowVersionKey ||
    publishedVersion.botFlowVersionKey !== payload.botFlowVersionKey ||
    publishedVersion.versionNumber !== flow.latestVersionNumber ||
    publishedVersion.status !== "published" ||
    publishedVersion.definition.name !== flow.name
  ) {
    return null;
  }

  return Object.freeze({
    outcome: value.outcome,
    flow,
    publishedVersion,
  });
}

/**
 * Claims one deterministic request, mutates a tenant-scoped bot flow, writes
 * immutable audit evidence, stores the bounded response, and completes the
 * receipt in one PostgreSQL transaction.
 */
export interface RailwayBotFlowMutationExecutor {
  execute(
    command: Readonly<RailwayBotFlowMutationCommand>,
  ): Promise<RailwayBotFlowMutationResult>;
}
