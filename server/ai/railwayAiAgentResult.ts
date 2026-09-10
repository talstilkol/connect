import {
  aiAgentStatuses,
  aiAgentVersionStatuses,
  knowledgeSourceStatuses,
  type AiAgentActivationIssue,
} from "../../shared/domain/aiAgent.ts";
import type {
  AiAgentDetailsView,
  AiAgentSummaryView,
  AiAgentVersionView,
  KnowledgeSourceView,
} from "../../shared/domain/aiAgentView.ts";
import {
  validateAiAgentDefinition,
} from "../../shared/validation/aiAgentDefinition.ts";

const aiAgentKeyPattern = /^ai_agent_v1_[0-9a-f]{64}$/;
const aiAgentVersionKeyPattern = /^ai_agent_version_v1_[0-9a-f]{64}$/;
const knowledgeSourceKeyPattern = /^knowledge_source_v1_[0-9a-f]{64}$/;
const timestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const mediaTypePattern =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const activationIssues = Object.freeze([
  "provider-required",
  "billing-policy-required",
  "handoff-policy-required",
  "audit-sink-required",
  "response-mode-required",
  "grounding-threshold-required",
  "cost-limit-required",
  "knowledge-source-required",
  "knowledge-source-not-ready",
] as const satisfies readonly AiAgentActivationIssue[]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length &&
    actual.every((key, index) => key === sorted[index]);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !timestampPattern.test(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function parseActivationIssues(
  value: unknown,
): readonly AiAgentActivationIssue[] | null {
  if (!Array.isArray(value) || value.length > activationIssues.length) {
    return null;
  }
  const issues: AiAgentActivationIssue[] = [];
  for (const issue of value) {
    if (
      !activationIssues.includes(issue as AiAgentActivationIssue) ||
      issues.includes(issue as AiAgentActivationIssue)
    ) {
      return null;
    }
    issues.push(issue as AiAgentActivationIssue);
  }
  return Object.freeze(issues);
}

export function parseRailwayAiAgentSummary(
  value: unknown,
): Readonly<AiAgentSummaryView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "activeVersionKey", "aiAgentKey", "createdAt", "latestVersionKey",
      "latestVersionNumber", "name", "status", "updatedAt", "version",
    ]) ||
    typeof value.aiAgentKey !== "string" ||
    !aiAgentKeyPattern.test(value.aiAgentKey) ||
    typeof value.name !== "string" || value.name.trim() !== value.name ||
    value.name.length === 0 || value.name.length > 160 ||
    controlCharacterPattern.test(value.name) ||
    !aiAgentStatuses.includes(value.status as never) ||
    typeof value.latestVersionKey !== "string" ||
    !aiAgentVersionKeyPattern.test(value.latestVersionKey) ||
    !isPositiveInteger(value.latestVersionNumber) ||
    (value.activeVersionKey !== null &&
      (typeof value.activeVersionKey !== "string" ||
        !aiAgentVersionKeyPattern.test(value.activeVersionKey))) ||
    ((value.status === "draft") !== (value.activeVersionKey === null)) ||
    !isPositiveInteger(value.version) ||
    !isCanonicalTimestamp(value.createdAt) ||
    !isCanonicalTimestamp(value.updatedAt) || value.updatedAt < value.createdAt
  ) {
    return null;
  }
  return Object.freeze({
    aiAgentKey: value.aiAgentKey,
    name: value.name,
    status: value.status as AiAgentSummaryView["status"],
    latestVersionKey: value.latestVersionKey,
    latestVersionNumber: Number(value.latestVersionNumber),
    activeVersionKey: value.activeVersionKey as string | null,
    version: Number(value.version),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
}

export function parseRailwayAiAgentVersion(
  value: unknown,
): Readonly<AiAgentVersionView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "aiAgentVersionKey", "createdAt", "definition", "publishedAt",
      "status", "versionNumber",
    ]) ||
    typeof value.aiAgentVersionKey !== "string" ||
    !aiAgentVersionKeyPattern.test(value.aiAgentVersionKey) ||
    !isPositiveInteger(value.versionNumber) ||
    !aiAgentVersionStatuses.includes(value.status as never) ||
    (value.publishedAt !== null && !isCanonicalTimestamp(value.publishedAt)) ||
    ((value.status === "draft") !== (value.publishedAt === null)) ||
    !isCanonicalTimestamp(value.createdAt)
  ) {
    return null;
  }
  const validation = validateAiAgentDefinition(value.definition);
  if (!validation.success) return null;
  return Object.freeze({
    aiAgentVersionKey: value.aiAgentVersionKey,
    versionNumber: Number(value.versionNumber),
    status: value.status as AiAgentVersionView["status"],
    definition: validation.value,
    publishedAt: value.publishedAt as string | null,
    createdAt: value.createdAt,
  });
}

export function parseRailwayKnowledgeSource(
  value: unknown,
): Readonly<KnowledgeSourceView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "createdAt", "fileName", "mediaType", "readyAt", "sizeBytes",
      "sourceKey", "status", "updatedAt", "version",
    ]) ||
    typeof value.sourceKey !== "string" ||
    !knowledgeSourceKeyPattern.test(value.sourceKey) ||
    typeof value.fileName !== "string" || value.fileName.trim() !== value.fileName ||
    value.fileName.length === 0 || value.fileName.length > 512 ||
    controlCharacterPattern.test(value.fileName) ||
    typeof value.mediaType !== "string" ||
    value.mediaType !== value.mediaType.trim().toLowerCase() ||
    !mediaTypePattern.test(value.mediaType) ||
    !isPositiveInteger(value.sizeBytes) ||
    !knowledgeSourceStatuses.includes(value.status as never) ||
    (value.readyAt !== null && !isCanonicalTimestamp(value.readyAt)) ||
    (value.status === "ready" && value.readyAt === null) ||
    (value.status !== "ready" && value.status !== "archived" &&
      value.readyAt !== null) ||
    !isPositiveInteger(value.version) ||
    !isCanonicalTimestamp(value.createdAt) ||
    !isCanonicalTimestamp(value.updatedAt) || value.updatedAt < value.createdAt
  ) {
    return null;
  }
  return Object.freeze({
    sourceKey: value.sourceKey,
    fileName: value.fileName,
    mediaType: value.mediaType,
    sizeBytes: Number(value.sizeBytes),
    status: value.status as KnowledgeSourceView["status"],
    readyAt: value.readyAt as string | null,
    version: Number(value.version),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
}

export function parseRailwayAiAgentList(
  value: unknown,
): readonly Readonly<AiAgentSummaryView>[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const records: Readonly<AiAgentSummaryView>[] = [];
  const keys = new Set<string>();
  for (const item of value) {
    const record = parseRailwayAiAgentSummary(item);
    if (record === null || keys.has(record.aiAgentKey)) return null;
    keys.add(record.aiAgentKey);
    records.push(record);
  }
  return Object.freeze(records);
}

export function parseRailwayKnowledgeSourceList(
  value: unknown,
): readonly Readonly<KnowledgeSourceView>[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const records: Readonly<KnowledgeSourceView>[] = [];
  const keys = new Set<string>();
  for (const item of value) {
    const record = parseRailwayKnowledgeSource(item);
    if (record === null || keys.has(record.sourceKey)) return null;
    keys.add(record.sourceKey);
    records.push(record);
  }
  return Object.freeze(records);
}

export function parseRailwayAiAgentDetails(
  value: unknown,
  expectedAiAgentKey: string,
): Readonly<AiAgentDetailsView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["activationReadiness", "agent", "versions"]) ||
    !Array.isArray(value.versions) || value.versions.length === 0 ||
    value.versions.length > 100 || !isRecord(value.activationReadiness) ||
    !hasExactKeys(value.activationReadiness, ["issues", "ready"]) ||
    typeof value.activationReadiness.ready !== "boolean"
  ) {
    return null;
  }
  const agent = parseRailwayAiAgentSummary(value.agent);
  const issues = parseActivationIssues(value.activationReadiness.issues);
  if (
    agent === null || agent.aiAgentKey !== expectedAiAgentKey || issues === null ||
    value.activationReadiness.ready !== (issues.length === 0)
  ) {
    return null;
  }
  const versions: Readonly<AiAgentVersionView>[] = [];
  const keys = new Set<string>();
  let previous = Number.POSITIVE_INFINITY;
  for (const item of value.versions) {
    const version = parseRailwayAiAgentVersion(item);
    if (
      version === null || keys.has(version.aiAgentVersionKey) ||
      version.versionNumber >= previous || version.definition.name !== agent.name
    ) {
      return null;
    }
    keys.add(version.aiAgentVersionKey);
    versions.push(version);
    previous = version.versionNumber;
  }
  const latest = versions.find(
    (version) => version.aiAgentVersionKey === agent.latestVersionKey,
  );
  if (latest?.versionNumber !== agent.latestVersionNumber) return null;
  return Object.freeze({
    agent,
    versions: Object.freeze(versions),
    activationReadiness: Object.freeze({
      ready: value.activationReadiness.ready,
      issues,
    }),
  });
}

export function parseRailwayAiAgentActivationIssues(
  value: unknown,
): readonly AiAgentActivationIssue[] | null {
  return parseActivationIssues(value);
}
