import {
  botFlowStatuses,
  botFlowVersionStatuses,
} from "../../shared/domain/botFlow.ts";
import type {
  BotFlowDetailsView,
  BotFlowSummaryView,
  BotFlowVersionView,
} from "../../shared/domain/botFlowView.ts";
import {
  validateBotFlowDefinition,
} from "../../shared/validation/botFlowDefinition.ts";

const botFlowKeyPattern = /^bot_flow_v1_[0-9a-f]{64}$/;
const botFlowVersionKeyPattern =
  /^bot_flow_version_v1_[0-9a-f]{64}$/;
const timestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !timestampPattern.test(value)) {
    return false;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

export function parseRailwayBotFlowSummary(
  value: unknown,
): Readonly<BotFlowSummaryView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "activeVersionKey",
      "botFlowKey",
      "createdAt",
      "latestVersionKey",
      "latestVersionNumber",
      "name",
      "status",
      "updatedAt",
      "version",
    ]) ||
    typeof value.botFlowKey !== "string" ||
    !botFlowKeyPattern.test(value.botFlowKey) ||
    typeof value.name !== "string" ||
    value.name.length === 0 ||
    value.name.length > 160 ||
    value.name.trim() !== value.name ||
    controlCharacterPattern.test(value.name) ||
    !botFlowStatuses.includes(
      value.status as (typeof botFlowStatuses)[number],
    ) ||
    typeof value.latestVersionKey !== "string" ||
    !botFlowVersionKeyPattern.test(value.latestVersionKey) ||
    !isPositiveInteger(value.latestVersionNumber) ||
    (value.activeVersionKey !== null &&
      (typeof value.activeVersionKey !== "string" ||
        !botFlowVersionKeyPattern.test(value.activeVersionKey))) ||
    ((value.status === "draft") !== (value.activeVersionKey === null)) ||
    !isPositiveInteger(value.version) ||
    !isCanonicalTimestamp(value.createdAt) ||
    !isCanonicalTimestamp(value.updatedAt) ||
    value.updatedAt < value.createdAt
  ) {
    return null;
  }

  return Object.freeze({
    botFlowKey: value.botFlowKey,
    name: value.name,
    status: value.status as (typeof botFlowStatuses)[number],
    latestVersionKey: value.latestVersionKey,
    latestVersionNumber: Number(value.latestVersionNumber),
    activeVersionKey: value.activeVersionKey as string | null,
    version: Number(value.version),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
}

export function parseRailwayBotFlowVersion(
  value: unknown,
): Readonly<BotFlowVersionView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "botFlowVersionKey",
      "createdAt",
      "definition",
      "publishedAt",
      "status",
      "versionNumber",
    ]) ||
    typeof value.botFlowVersionKey !== "string" ||
    !botFlowVersionKeyPattern.test(value.botFlowVersionKey) ||
    !isPositiveInteger(value.versionNumber) ||
    !botFlowVersionStatuses.includes(
      value.status as (typeof botFlowVersionStatuses)[number],
    ) ||
    (value.publishedAt !== null &&
      !isCanonicalTimestamp(value.publishedAt)) ||
    ((value.status === "draft") !== (value.publishedAt === null)) ||
    !isCanonicalTimestamp(value.createdAt)
  ) {
    return null;
  }

  const validation = validateBotFlowDefinition(value.definition);
  if (!validation.success) {
    return null;
  }

  return Object.freeze({
    botFlowVersionKey: value.botFlowVersionKey,
    versionNumber: Number(value.versionNumber),
    status: value.status as (typeof botFlowVersionStatuses)[number],
    definition: validation.value,
    publishedAt: value.publishedAt as string | null,
    createdAt: value.createdAt,
  });
}

export function parseRailwayBotFlowList(
  value: unknown,
): readonly Readonly<BotFlowSummaryView>[] | null {
  if (!Array.isArray(value) || value.length > 100) {
    return null;
  }

  const flows: Readonly<BotFlowSummaryView>[] = [];
  const keys = new Set<string>();
  for (const item of value) {
    const flow = parseRailwayBotFlowSummary(item);
    if (flow === null || keys.has(flow.botFlowKey)) {
      return null;
    }
    keys.add(flow.botFlowKey);
    flows.push(flow);
  }
  return Object.freeze(flows);
}

export function parseRailwayBotFlowDetails(
  value: unknown,
  expectedBotFlowKey: string,
): Readonly<BotFlowDetailsView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["flow", "versions"]) ||
    !Array.isArray(value.versions) ||
    value.versions.length === 0 ||
    value.versions.length > 100
  ) {
    return null;
  }

  const flow = parseRailwayBotFlowSummary(value.flow);
  if (flow === null || flow.botFlowKey !== expectedBotFlowKey) {
    return null;
  }

  const versions: Readonly<BotFlowVersionView>[] = [];
  const keys = new Set<string>();
  let previousVersionNumber = Number.POSITIVE_INFINITY;
  for (const item of value.versions) {
    const version = parseRailwayBotFlowVersion(item);
    if (
      version === null ||
      keys.has(version.botFlowVersionKey) ||
      version.versionNumber >= previousVersionNumber ||
      version.definition.name !== flow.name
    ) {
      return null;
    }
    keys.add(version.botFlowVersionKey);
    versions.push(version);
    previousVersionNumber = version.versionNumber;
  }

  const latestVersion = versions.find(
    (version) => version.botFlowVersionKey === flow.latestVersionKey,
  );
  const activeVersion = flow.activeVersionKey === null
    ? undefined
    : versions.find(
        (version) => version.botFlowVersionKey === flow.activeVersionKey,
      );
  if (
    latestVersion?.versionNumber !== flow.latestVersionNumber ||
    (activeVersion !== undefined && activeVersion.status !== "published")
  ) {
    return null;
  }

  return Object.freeze({
    flow,
    versions: Object.freeze(versions),
  });
}

export function parseRailwayBotFlowDraftMutationResponse(
  value: unknown,
): Readonly<{
  replayed: boolean;
  outcome: "created" | "updated" | "unchanged";
  flow: Readonly<BotFlowSummaryView>;
  draftVersion: Readonly<BotFlowVersionView>;
}> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["draftVersion", "flow", "outcome", "replayed"]) ||
    typeof value.replayed !== "boolean" ||
    (value.outcome !== "created" &&
      value.outcome !== "updated" &&
      value.outcome !== "unchanged")
  ) {
    return null;
  }
  const flow = parseRailwayBotFlowSummary(value.flow);
  const draftVersion = parseRailwayBotFlowVersion(value.draftVersion);
  if (
    flow === null ||
    draftVersion === null ||
    flow.latestVersionKey !== draftVersion.botFlowVersionKey ||
    flow.latestVersionNumber !== draftVersion.versionNumber ||
    flow.name !== draftVersion.definition.name ||
    draftVersion.status !== "draft"
  ) {
    return null;
  }
  return Object.freeze({
    replayed: value.replayed,
    outcome: value.outcome,
    flow,
    draftVersion,
  });
}

export function parseRailwayBotFlowPublishMutationResponse(
  value: unknown,
  expectedBotFlowKey: string,
  expectedBotFlowVersionKey: string,
): Readonly<{
  replayed: boolean;
  outcome: "updated" | "unchanged";
  flow: Readonly<BotFlowSummaryView>;
  publishedVersion: Readonly<BotFlowVersionView>;
}> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "flow",
      "outcome",
      "publishedVersion",
      "replayed",
    ]) ||
    typeof value.replayed !== "boolean" ||
    (value.outcome !== "updated" && value.outcome !== "unchanged")
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
    flow.botFlowKey !== expectedBotFlowKey ||
    flow.status !== "active" ||
    flow.latestVersionKey !== expectedBotFlowVersionKey ||
    flow.activeVersionKey !== expectedBotFlowVersionKey ||
    publishedVersion.botFlowVersionKey !== expectedBotFlowVersionKey ||
    publishedVersion.versionNumber !== flow.latestVersionNumber ||
    publishedVersion.definition.name !== flow.name ||
    publishedVersion.status !== "published"
  ) {
    return null;
  }
  return Object.freeze({
    replayed: value.replayed,
    outcome: value.outcome,
    flow,
    publishedVersion,
  });
}
