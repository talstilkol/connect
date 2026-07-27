import type {
  AiAgentRepository,
} from "../../db/aiAgentRepository.ts";
import type {
  PersistedAiAgent,
  PersistedAiAgentVersion,
} from "../../shared/domain/aiAgent.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
} from "./aiAgentKey.ts";

export type ActiveAiRuntimeAgentLoadResult =
  | {
      outcome: "loaded";
      agent: PersistedAiAgent;
      version: PersistedAiAgentVersion;
    }
  | {
      outcome: "unavailable";
      reason:
        | "no-active-agent"
        | "ambiguous-active-agent";
    };

export type ActiveAiRuntimeAgentErrorCode =
  | "INVALID_INPUT"
  | "AGENT_CONFIGURATION_INVALID"
  | "PERSISTENCE_FAILED";

export class ActiveAiRuntimeAgentError
  extends Error {
  readonly code: ActiveAiRuntimeAgentErrorCode;

  constructor(
    code: ActiveAiRuntimeAgentErrorCode,
  ) {
    super("Active AI runtime agent load failed");
    this.name = "ActiveAiRuntimeAgentError";
    this.code = code;
  }
}

export interface ActiveAiRuntimeAgentLoader {
  load(
    tenantId: number,
  ): Promise<ActiveAiRuntimeAgentLoadResult>;
}

function loaderError(
  code: ActiveAiRuntimeAgentErrorCode,
): ActiveAiRuntimeAgentError {
  return new ActiveAiRuntimeAgentError(code);
}

async function assertActiveIdentity(
  tenantId: number,
  agent: PersistedAiAgent,
  version: PersistedAiAgentVersion,
): Promise<void> {
  let expectedAgentKey: string;
  let expectedVersionKey: string;

  try {
    expectedAgentKey = await deriveAiAgentKey(
      tenantId,
      version.definition.name,
    );
    expectedVersionKey =
      await deriveAiAgentVersionKey(
        tenantId,
        agent.aiAgentKey,
        version.versionNumber,
        version.definition,
      );
  } catch {
    throw loaderError(
      "AGENT_CONFIGURATION_INVALID",
    );
  }

  if (
    agent.tenantId !== tenantId ||
    version.tenantId !== tenantId ||
    agent.status !== "active" ||
    agent.activeVersionKey === null ||
    agent.activeVersionKey !==
      version.aiAgentVersionKey ||
    version.aiAgentKey !== agent.aiAgentKey ||
    version.status !== "published" ||
    agent.name !== version.definition.name ||
    expectedAgentKey !== agent.aiAgentKey ||
    expectedVersionKey !==
      version.aiAgentVersionKey
  ) {
    throw loaderError(
      "AGENT_CONFIGURATION_INVALID",
    );
  }
}

export function createActiveAiRuntimeAgentLoader(
  agents: AiAgentRepository,
): ActiveAiRuntimeAgentLoader {
  return {
    async load(tenantId) {
      if (
        !Number.isSafeInteger(tenantId) ||
        tenantId <= 0
      ) {
        throw loaderError("INVALID_INPUT");
      }

      let activeAgents:
        readonly PersistedAiAgent[];

      try {
        activeAgents =
          await agents.listActiveByTenant(
            tenantId,
            2,
          );
      } catch {
        throw loaderError(
          "PERSISTENCE_FAILED",
        );
      }

      if (activeAgents.length === 0) {
        return {
          outcome: "unavailable",
          reason: "no-active-agent",
        };
      }

      if (activeAgents.length > 1) {
        return {
          outcome: "unavailable",
          reason: "ambiguous-active-agent",
        };
      }

      const agent = activeAgents[0];

      if (agent.activeVersionKey === null) {
        throw loaderError(
          "AGENT_CONFIGURATION_INVALID",
        );
      }

      let version:
        | PersistedAiAgentVersion
        | null;

      try {
        version =
          await agents.findVersionByKey(
            tenantId,
            agent.aiAgentKey,
            agent.activeVersionKey,
          );
      } catch {
        throw loaderError(
          "PERSISTENCE_FAILED",
        );
      }

      if (!version) {
        throw loaderError(
          "AGENT_CONFIGURATION_INVALID",
        );
      }

      await assertActiveIdentity(
        tenantId,
        agent,
        version,
      );

      return {
        outcome: "loaded",
        agent,
        version,
      };
    },
  };
}
