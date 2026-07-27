import type {
  PersistedAiAgent,
  PersistedAiAgentVersion,
  PersistedKnowledgeSource,
} from "../../shared/domain/aiAgent.ts";
import type {
  AiAgentDetailsView,
  AiAgentSummaryView,
  AiAgentVersionView,
  KnowledgeSourceView,
} from "../../shared/domain/aiAgentView.ts";
import type {
  AiAgentDetails,
} from "./aiAgentService.ts";

export function toAiAgentSummaryView(
  agent: PersistedAiAgent,
): AiAgentSummaryView {
  return {
    aiAgentKey: agent.aiAgentKey,
    name: agent.name,
    status: agent.status,
    latestVersionKey:
      agent.latestVersionKey,
    latestVersionNumber:
      agent.latestVersionNumber,
    activeVersionKey:
      agent.activeVersionKey,
    version: agent.version,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

export function toAiAgentVersionView(
  version: PersistedAiAgentVersion,
): AiAgentVersionView {
  return {
    aiAgentVersionKey:
      version.aiAgentVersionKey,
    versionNumber: version.versionNumber,
    status: version.status,
    definition: version.definition,
    publishedAt: version.publishedAt,
    createdAt: version.createdAt,
  };
}

export function toKnowledgeSourceView(
  source: PersistedKnowledgeSource,
): KnowledgeSourceView {
  return {
    sourceKey: source.sourceKey,
    fileName: source.fileName,
    mediaType: source.mediaType,
    sizeBytes: source.sizeBytes,
    status: source.status,
    readyAt: source.readyAt,
    version: source.version,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export function toAiAgentDetailsView(
  details: AiAgentDetails,
): AiAgentDetailsView {
  return {
    agent: toAiAgentSummaryView(
      details.agent,
    ),
    versions: details.versions.map(
      toAiAgentVersionView,
    ),
    activationReadiness: {
      ready:
        details.activationReadiness.ready,
      issues: [
        ...details.activationReadiness.issues,
      ],
    },
  };
}
