import {
  createAiAgentRepository,
} from "../../db/aiAgentRepository.ts";
import {
  createKnowledgeSourceRepository,
} from "../../db/knowledgeSourceRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  AiAgentDirectoryStatus,
  AiAgentDirectoryView,
} from "../../shared/domain/aiAgentView.ts";
import {
  hasPermission,
} from "../../shared/domain/model.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantSession,
} from "../auth/currentTenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import {
  createAiAgentService,
} from "./aiAgentService.ts";
import {
  toAiAgentDetailsView,
  toAiAgentSummaryView,
  toKnowledgeSourceView,
} from "./aiAgentView.ts";
import {
  unavailableAiOperationalReadinessProvider,
} from "./aiOperationalReadiness.ts";

export type CurrentAiAgentsResult =
  | {
      status: "ready";
      aiAgents: AiAgentDirectoryView;
    }
  | {
      status: Exclude<
        AiAgentDirectoryStatus,
        "ready"
      >;
      aiAgents: {
        agents: readonly [];
        selectedAgent: null;
        knowledgeSources: readonly [];
        canWrite: false;
      };
    };

const emptyAiAgents = {
  agents: [] as const,
  selectedAgent: null,
  knowledgeSources: [] as const,
  canWrite: false as const,
};

function tenantFailureStatus(
  error: TenantSessionError,
): Exclude<AiAgentDirectoryStatus, "ready"> {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return "unauthenticated";
  }

  if (
    error.code ===
    "TENANT_MEMBERSHIP_REQUIRED"
  ) {
    return "onboarding-required";
  }

  if (
    error.code ===
    "TENANT_SELECTION_REQUIRED"
  ) {
    return "tenant-selection-required";
  }

  if (error.code === "PERMISSION_DENIED") {
    return "permission-denied";
  }

  return "server-error";
}

export async function readCurrentAiAgents():
Promise<CurrentAiAgentsResult> {
  if (
    inspectClerkConfiguration().status !==
    "configured"
  ) {
    return {
      status: "configuration-required",
      aiAgents: emptyAiAgents,
    };
  }

  try {
    const database =
      await requireRuntimeDatabase();
    const session =
      await requireCurrentTenantSession(database);
    const service = createAiAgentService({
      agents: createAiAgentRepository(database),
      knowledgeSources:
        createKnowledgeSourceRepository(database),
      operationalReadiness:
        unavailableAiOperationalReadinessProvider,
    });
    const [agents, knowledgeSources] =
      await Promise.all([
        service.list(session),
        service.listKnowledgeSources(session),
      ]);
    const firstAgent = agents[0] ?? null;
    const selectedAgent = firstAgent
      ? await service.readDetails(
          session,
          firstAgent.aiAgentKey,
        )
      : null;

    return {
      status: "ready",
      aiAgents: {
        agents: agents.map(
          toAiAgentSummaryView,
        ),
        selectedAgent: selectedAgent
          ? toAiAgentDetailsView(selectedAgent)
          : null,
        knowledgeSources:
          knowledgeSources.map(
            toKnowledgeSourceView,
          ),
        canWrite: hasPermission(
          session.role,
          "ai.write",
        ),
      },
    };
  } catch (error) {
    return {
      status:
        error instanceof TenantSessionError
          ? tenantFailureStatus(error)
          : "server-error",
      aiAgents: emptyAiAgents,
    };
  }
}
