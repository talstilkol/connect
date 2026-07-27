import type {
  AiAgentRepository,
} from "../../db/aiAgentRepository.ts";
import type {
  KnowledgeSourceRepository,
} from "../../db/knowledgeSourceRepository.ts";
import type {
  PersistedAiAgent,
  PersistedAiAgentVersion,
  PersistedKnowledgeSource,
  ValidatedAiAgentDefinition,
} from "../../shared/domain/aiAgent.ts";
import {
  validateAiAgentDefinition,
  type AiAgentDefinitionIssue,
} from "../../shared/validation/aiAgentDefinition.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgeSourceKey,
} from "./aiAgentKey.ts";
import {
  inspectAiAgentActivationReadiness,
  type AiAgentActivationIssue,
  type AiAgentActivationReadiness,
} from "./aiAgentLifecycle.ts";
import type {
  AiOperationalReadinessProvider,
} from "./aiOperationalReadiness.ts";

const AI_AGENT_LIST_LIMIT = 100;
const AI_AGENT_VERSION_LIST_LIMIT = 100;
const KNOWLEDGE_SOURCE_LIST_LIMIT = 100;
const AI_AGENT_KEY_PATTERN =
  /^ai_agent_v1_[0-9a-f]{64}$/;
const AI_AGENT_VERSION_KEY_PATTERN =
  /^ai_agent_version_v1_[0-9a-f]{64}$/;

export type AiAgentServiceErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "STATE_CONFLICT"
  | "INVALID_STATE"
  | "PERSISTENCE_FAILED";

export class AiAgentServiceError extends Error {
  readonly code: AiAgentServiceErrorCode;

  constructor(code: AiAgentServiceErrorCode) {
    super("AI agent operation failed");
    this.name = "AiAgentServiceError";
    this.code = code;
  }
}

export class AiAgentInputError extends Error {
  readonly issues: readonly AiAgentDefinitionIssue[];

  constructor(
    issues: readonly AiAgentDefinitionIssue[],
  ) {
    super("AI agent validation failed");
    this.name = "AiAgentInputError";
    this.issues = issues;
  }
}

export class AiAgentActivationError extends Error {
  readonly issues: readonly AiAgentActivationIssue[];

  constructor(
    issues: readonly AiAgentActivationIssue[],
  ) {
    super("AI agent activation is blocked");
    this.name = "AiAgentActivationError";
    this.issues = issues;
  }
}

export interface AiAgentDetails {
  agent: PersistedAiAgent;
  versions: readonly PersistedAiAgentVersion[];
  activationReadiness: AiAgentActivationReadiness;
}

export interface SavedAiAgentDraft {
  outcome: "created" | "updated" | "unchanged";
  agent: PersistedAiAgent;
  draftVersion: PersistedAiAgentVersion;
}

export interface PublishedAiAgentDraft {
  outcome: "updated" | "unchanged";
  agent: PersistedAiAgent;
  publishedVersion: PersistedAiAgentVersion;
}

interface SaveDraftRequest {
  definition: ValidatedAiAgentDefinition;
  expectedAgentVersion: number | null;
}

interface PublishDraftRequest {
  aiAgentKey: string;
  aiAgentVersionKey: string;
  expectedAgentVersion: number;
}

export interface AiAgentService {
  list(
    session: TenantSession,
  ): Promise<readonly PersistedAiAgent[]>;
  listKnowledgeSources(
    session: TenantSession,
  ): Promise<readonly PersistedKnowledgeSource[]>;
  readDetails(
    session: TenantSession,
    aiAgentKey: unknown,
  ): Promise<AiAgentDetails>;
  saveDraft(
    session: TenantSession,
    input: unknown,
  ): Promise<SavedAiAgentDraft>;
  publishDraft(
    session: TenantSession,
    input: unknown,
  ): Promise<PublishedAiAgentDraft>;
}

interface AiAgentServiceDependencies {
  agents: AiAgentRepository;
  knowledgeSources: KnowledgeSourceRepository;
  operationalReadiness:
    AiOperationalReadinessProvider;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  input: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const inputKeys = Object.keys(input);

  return (
    inputKeys.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(input, key),
    )
  );
}

function isPositiveInteger(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function parseAiAgentKey(
  value: unknown,
): string | null {
  return typeof value === "string" &&
    AI_AGENT_KEY_PATTERN.test(value)
    ? value
    : null;
}

function parseSaveDraftRequest(
  input: unknown,
): SaveDraftRequest {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "definition",
      "expectedAgentVersion",
    ]) ||
    (input.expectedAgentVersion !== null &&
      !isPositiveInteger(
        input.expectedAgentVersion,
      ))
  ) {
    throw new AiAgentInputError([
      "invalid-input",
    ]);
  }

  const validation =
    validateAiAgentDefinition(
      input.definition,
    );

  if (!validation.success) {
    throw new AiAgentInputError(
      validation.issues,
    );
  }

  return {
    definition: validation.value,
    expectedAgentVersion:
      input.expectedAgentVersion,
  };
}

function parsePublishDraftRequest(
  input: unknown,
): PublishDraftRequest | null {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "aiAgentKey",
      "aiAgentVersionKey",
      "expectedAgentVersion",
    ])
  ) {
    return null;
  }

  const aiAgentKey = parseAiAgentKey(
    input.aiAgentKey,
  );
  const aiAgentVersionKey =
    typeof input.aiAgentVersionKey ===
      "string" &&
    AI_AGENT_VERSION_KEY_PATTERN.test(
      input.aiAgentVersionKey,
    )
      ? input.aiAgentVersionKey
      : null;

  if (
    !aiAgentKey ||
    !aiAgentVersionKey ||
    !isPositiveInteger(
      input.expectedAgentVersion,
    )
  ) {
    return null;
  }

  return {
    aiAgentKey,
    aiAgentVersionKey,
    expectedAgentVersion:
      input.expectedAgentVersion,
  };
}

function serviceError(
  code: AiAgentServiceErrorCode,
): AiAgentServiceError {
  return new AiAgentServiceError(code);
}

function rethrowPersistenceError(
  error: unknown,
): never {
  if (
    error instanceof AiAgentServiceError ||
    error instanceof AiAgentInputError ||
    error instanceof AiAgentActivationError
  ) {
    throw error;
  }

  throw serviceError("PERSISTENCE_FAILED");
}

async function assertStoredAgentIdentity(
  tenantId: number,
  agent: PersistedAiAgent,
): Promise<void> {
  const expectedAgentKey =
    await deriveAiAgentKey(
      tenantId,
      agent.name,
    );

  if (
    agent.tenantId !== tenantId ||
    expectedAgentKey !== agent.aiAgentKey
  ) {
    throw serviceError("PERSISTENCE_FAILED");
  }
}

async function assertStoredVersionIdentity(
  tenantId: number,
  version: PersistedAiAgentVersion,
): Promise<void> {
  const expectedAgentKey =
    await deriveAiAgentKey(
      tenantId,
      version.definition.name,
    );
  const expectedVersionKey =
    await deriveAiAgentVersionKey(
      tenantId,
      version.aiAgentKey,
      version.versionNumber,
      version.definition,
    );

  if (
    version.tenantId !== tenantId ||
    expectedAgentKey !==
      version.aiAgentKey ||
    expectedVersionKey !==
      version.aiAgentVersionKey
  ) {
    throw serviceError("PERSISTENCE_FAILED");
  }
}

async function assertStoredSourceIdentity(
  tenantId: number,
  source: PersistedKnowledgeSource,
): Promise<void> {
  const expectedSourceKey =
    await deriveKnowledgeSourceKey(
      tenantId,
      source.contentSha256,
    );

  if (
    source.tenantId !== tenantId ||
    expectedSourceKey !== source.sourceKey
  ) {
    throw serviceError("PERSISTENCE_FAILED");
  }
}

export function createAiAgentService(
  dependencies: AiAgentServiceDependencies,
): AiAgentService {
  async function readSourcesForDefinition(
    tenantId: number,
    definition: ValidatedAiAgentDefinition,
  ): Promise<readonly PersistedKnowledgeSource[]> {
    const sources = await Promise.all(
      definition.knowledgeSourceKeys.map(
        (sourceKey) =>
          dependencies.knowledgeSources.findByKey(
            tenantId,
            sourceKey,
          ),
      ),
    );

    if (
      sources.some(
        (source) => source === null,
      )
    ) {
      throw serviceError("PERSISTENCE_FAILED");
    }

    const storedSources =
      sources as PersistedKnowledgeSource[];

    await Promise.all(
      storedSources.map((source) =>
        assertStoredSourceIdentity(
          tenantId,
          source,
        ),
      ),
    );

    return storedSources;
  }

  async function inspectReadiness(
    tenantId: number,
    definition: ValidatedAiAgentDefinition,
  ): Promise<AiAgentActivationReadiness> {
    const [operational, sources] =
      await Promise.all([
        dependencies.operationalReadiness
          .readForTenant(tenantId),
        readSourcesForDefinition(
          tenantId,
          definition,
        ),
      ]);

    return inspectAiAgentActivationReadiness(
      definition,
      {
        ...operational,
        knowledgeSources: sources.map(
          (source) => ({
            sourceKey: source.sourceKey,
            status: source.status,
          }),
        ),
      },
    );
  }

  return {
    async list(session) {
      requireTenantPermission(
        session,
        "ai.read",
      );

      try {
        const agents =
          await dependencies.agents.listByTenant(
            session.tenantId,
            AI_AGENT_LIST_LIMIT,
          );

        await Promise.all(
          agents.map((agent) =>
            assertStoredAgentIdentity(
              session.tenantId,
              agent,
            ),
          ),
        );

        return agents;
      } catch (error) {
        return rethrowPersistenceError(error);
      }
    },

    async listKnowledgeSources(session) {
      requireTenantPermission(
        session,
        "ai.read",
      );

      try {
        const sources =
          await dependencies.knowledgeSources
            .listByTenant(
              session.tenantId,
              KNOWLEDGE_SOURCE_LIST_LIMIT,
            );

        await Promise.all(
          sources.map((source) =>
            assertStoredSourceIdentity(
              session.tenantId,
              source,
            ),
          ),
        );

        return sources;
      } catch (error) {
        return rethrowPersistenceError(error);
      }
    },

    async readDetails(
      session,
      aiAgentKeyInput,
    ) {
      requireTenantPermission(
        session,
        "ai.read",
      );
      const aiAgentKey = parseAiAgentKey(
        aiAgentKeyInput,
      );

      if (!aiAgentKey) {
        throw serviceError("INVALID_INPUT");
      }

      try {
        const agent =
          await dependencies.agents.findByKey(
            session.tenantId,
            aiAgentKey,
          );

        if (!agent) {
          throw serviceError("NOT_FOUND");
        }

        await assertStoredAgentIdentity(
          session.tenantId,
          agent,
        );
        const versions =
          await dependencies.agents.listVersions(
            session.tenantId,
            aiAgentKey,
            AI_AGENT_VERSION_LIST_LIMIT,
          );

        await Promise.all(
          versions.map((version) =>
            assertStoredVersionIdentity(
              session.tenantId,
              version,
            ),
          ),
        );
        const latestVersion = versions.find(
          (version) =>
            version.aiAgentVersionKey ===
            agent.latestVersionKey,
        );

        if (
          !latestVersion ||
          latestVersion.versionNumber !==
            agent.latestVersionNumber
        ) {
          throw serviceError(
            "PERSISTENCE_FAILED",
          );
        }

        return {
          agent,
          versions,
          activationReadiness:
            await inspectReadiness(
              session.tenantId,
              latestVersion.definition,
            ),
        };
      } catch (error) {
        return rethrowPersistenceError(error);
      }
    },

    async saveDraft(session, input) {
      requireTenantPermission(
        session,
        "ai.write",
      );
      const request =
        parseSaveDraftRequest(input);

      try {
        await readSourcesForDefinition(
          session.tenantId,
          request.definition,
        );
        const aiAgentKey =
          await deriveAiAgentKey(
            session.tenantId,
            request.definition.name,
          );
        let versionNumber = 1;

        if (
          request.expectedAgentVersion !== null
        ) {
          const existing =
            await dependencies.agents.findByKey(
              session.tenantId,
              aiAgentKey,
            );

          if (!existing) {
            throw serviceError("NOT_FOUND");
          }

          await assertStoredAgentIdentity(
            session.tenantId,
            existing,
          );

          if (
            existing.version ===
            request.expectedAgentVersion
          ) {
            versionNumber =
              existing.latestVersionNumber + 1;
          } else if (
            existing.version ===
            request.expectedAgentVersion + 1
          ) {
            versionNumber =
              existing.latestVersionNumber;
          } else {
            throw serviceError(
              "STATE_CONFLICT",
            );
          }
        }

        const aiAgentVersionKey =
          await deriveAiAgentVersionKey(
            session.tenantId,
            aiAgentKey,
            versionNumber,
            request.definition,
          );
        const result =
          await dependencies.agents.saveDraft({
            tenantId: session.tenantId,
            aiAgentKey,
            aiAgentVersionKey,
            versionNumber,
            expectedAgentVersion:
              request.expectedAgentVersion,
            definition: request.definition,
          });

        if (
          result.outcome === "created" ||
          result.outcome === "updated" ||
          result.outcome === "unchanged"
        ) {
          await Promise.all([
            assertStoredAgentIdentity(
              session.tenantId,
              result.agent,
            ),
            assertStoredVersionIdentity(
              session.tenantId,
              result.draftVersion,
            ),
          ]);

          return result;
        }

        if (result.outcome === "not-found") {
          throw serviceError("NOT_FOUND");
        }

        throw serviceError("STATE_CONFLICT");
      } catch (error) {
        return rethrowPersistenceError(error);
      }
    },

    async publishDraft(session, input) {
      requireTenantPermission(
        session,
        "ai.write",
      );
      const request =
        parsePublishDraftRequest(input);

      if (!request) {
        throw serviceError("INVALID_INPUT");
      }

      try {
        const targetVersion =
          await dependencies.agents
            .findVersionByKey(
              session.tenantId,
              request.aiAgentKey,
              request.aiAgentVersionKey,
            );

        if (!targetVersion) {
          throw serviceError("NOT_FOUND");
        }

        await assertStoredVersionIdentity(
          session.tenantId,
          targetVersion,
        );
        const readiness =
          await inspectReadiness(
            session.tenantId,
            targetVersion.definition,
          );

        if (!readiness.ready) {
          throw new AiAgentActivationError(
            readiness.issues,
          );
        }

        const result =
          await dependencies.agents.publishDraft(
            session.tenantId,
            request.aiAgentKey,
            request.aiAgentVersionKey,
            request.expectedAgentVersion,
          );

        if (
          result.outcome === "updated" ||
          result.outcome === "unchanged"
        ) {
          await Promise.all([
            assertStoredAgentIdentity(
              session.tenantId,
              result.agent,
            ),
            assertStoredVersionIdentity(
              session.tenantId,
              result.publishedVersion,
            ),
          ]);

          return result;
        }

        if (result.outcome === "not-found") {
          throw serviceError("NOT_FOUND");
        }

        if (result.outcome === "conflict") {
          throw serviceError(
            "STATE_CONFLICT",
          );
        }

        throw serviceError("INVALID_STATE");
      } catch (error) {
        return rethrowPersistenceError(error);
      }
    },
  };
}
