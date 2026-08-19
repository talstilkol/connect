import type {
  AiAgentRepository,
  PublishAiAgentDraftResult,
  SaveAiAgentDraftInput,
  SaveAiAgentDraftResult,
} from "../../db/aiAgentRepository.ts";
import {
  aiAgentStatuses,
  aiAgentVersionStatuses,
  type PersistedAiAgent,
  type PersistedAiAgentVersion,
  type ValidatedAiAgentDefinition,
} from "../../shared/domain/aiAgent.ts";
import {
  validateAiAgentDefinition,
} from "../../shared/validation/aiAgentDefinition.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
} from "../ai/aiAgentKey.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const aiAgentKeyPattern = /^ai_agent_v1_[0-9a-f]{64}$/;
const aiAgentVersionKeyPattern = /^ai_agent_version_v1_[0-9a-f]{64}$/;
const knowledgeSourceKeyPattern = /^knowledge_source_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const definitionMaximumBytes = 1_000_000;

const agentRowKeys = Object.freeze([
  "activeVersionKey",
  "aiAgentKey",
  "createdAt",
  "latestVersionKey",
  "latestVersionNumber",
  "name",
  "status",
  "tenantId",
  "updatedAt",
  "version",
]);
const versionRowKeys = Object.freeze([
  "aiAgentKey",
  "aiAgentVersionKey",
  "createdAt",
  "definitionJson",
  "publishedAt",
  "status",
  "tenantId",
  "versionNumber",
]);
const sourceRowKeys = Object.freeze(["sourceKey"]);

const agentColumns = `
  ai_agents.ai_agent_key AS "aiAgentKey",
  ai_agents.tenant_id AS "tenantId",
  ai_agents.name,
  ai_agents.status,
  ai_agents.latest_version_key AS "latestVersionKey",
  ai_agents.latest_version_number AS "latestVersionNumber",
  ai_agents.active_version_key AS "activeVersionKey",
  ai_agents.version,
  ai_agents.created_at AS "createdAt",
  ai_agents.updated_at AS "updatedAt"
`;
const versionColumns = `
  ai_agent_versions.ai_agent_version_key AS "aiAgentVersionKey",
  ai_agent_versions.ai_agent_key AS "aiAgentKey",
  ai_agent_versions.tenant_id AS "tenantId",
  ai_agent_versions.version_number AS "versionNumber",
  ai_agent_versions.status,
  ai_agent_versions.definition_json AS "definitionJson",
  ai_agent_versions.published_at AS "publishedAt",
  ai_agent_versions.created_at AS "createdAt"
`;

export const postgresAiAgentSql = Object.freeze({
  insertAgent: `
    INSERT INTO ai_agents (
      ai_agent_key,
      tenant_id,
      name,
      status,
      latest_version_key,
      latest_version_number,
      active_version_key,
      version
    )
    SELECT $1, $2, $3, 'draft', $4, 1, NULL, 1
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        $5::jsonb -> 'knowledgeSourceKeys'
      ) AS requested(source_key)
      WHERE NOT EXISTS (
        SELECT 1
        FROM knowledge_sources
        WHERE knowledge_sources.tenant_id = $2
          AND knowledge_sources.source_key = requested.source_key
      )
    )
    ON CONFLICT DO NOTHING
    RETURNING ${agentColumns}
  `,
  findAgentByKey: `
    SELECT ${agentColumns}
    FROM ai_agents
    WHERE ai_agents.tenant_id = $1
      AND ai_agents.ai_agent_key = $2
    LIMIT 1
  `,
  findAgentByKeyForUpdate: `
    SELECT ${agentColumns}
    FROM ai_agents
    WHERE ai_agents.tenant_id = $1
      AND ai_agents.ai_agent_key = $2
    FOR UPDATE
  `,
  updateAgentDraft: `
    UPDATE ai_agents
    SET
      latest_version_key = $4,
      latest_version_number = $5,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND ai_agent_key = $2
      AND version = $3
      AND name = $6
      AND latest_version_number = $5 - 1
    RETURNING ${agentColumns}
  `,
  insertVersion: `
    INSERT INTO ai_agent_versions (
      ai_agent_version_key,
      ai_agent_key,
      tenant_id,
      version_number,
      status,
      definition_json,
      published_at
    )
    VALUES ($1, $2, $3, $4, 'draft', $5::jsonb, NULL)
    ON CONFLICT DO NOTHING
    RETURNING ${versionColumns}
  `,
  findVersionByKey: `
    SELECT ${versionColumns}
    FROM ai_agent_versions
    WHERE ai_agent_versions.tenant_id = $1
      AND ai_agent_versions.ai_agent_key = $2
      AND ai_agent_versions.ai_agent_version_key = $3
    LIMIT 1
  `,
  findVersionByKeyForUpdate: `
    SELECT ${versionColumns}
    FROM ai_agent_versions
    WHERE ai_agent_versions.tenant_id = $1
      AND ai_agent_versions.ai_agent_key = $2
      AND ai_agent_versions.ai_agent_version_key = $3
    FOR UPDATE
  `,
  findRequestedSources: `
    SELECT knowledge_sources.source_key AS "sourceKey"
    FROM knowledge_sources
    INNER JOIN jsonb_array_elements_text(
      $2::jsonb -> 'knowledgeSourceKeys'
    ) AS requested(source_key)
      ON requested.source_key = knowledge_sources.source_key
    WHERE knowledge_sources.tenant_id = $1
    ORDER BY knowledge_sources.source_key ASC
  `,
  insertVersionSources: `
    INSERT INTO ai_agent_version_sources (
      tenant_id,
      ai_agent_version_key,
      source_key
    )
    SELECT $1, $2, requested.source_key
    FROM jsonb_array_elements_text(
      $3::jsonb -> 'knowledgeSourceKeys'
    ) AS requested(source_key)
    INNER JOIN knowledge_sources
      ON knowledge_sources.tenant_id = $1
      AND knowledge_sources.source_key = requested.source_key
    ON CONFLICT DO NOTHING
    RETURNING source_key AS "sourceKey"
  `,
  listVersionSources: `
    SELECT source_key AS "sourceKey"
    FROM ai_agent_version_sources
    WHERE tenant_id = $1
      AND ai_agent_version_key = $2
    ORDER BY source_key ASC
  `,
  listAgents: `
    SELECT ${agentColumns}
    FROM ai_agents
    WHERE ai_agents.tenant_id = $1
    ORDER BY ai_agents.updated_at DESC, ai_agents.ai_agent_key ASC
    LIMIT $2
  `,
  listActiveAgents: `
    SELECT ${agentColumns}
    FROM ai_agents
    WHERE ai_agents.tenant_id = $1
      AND ai_agents.status = 'active'
    ORDER BY ai_agents.updated_at DESC, ai_agents.ai_agent_key ASC
    LIMIT $2
  `,
  listVersions: `
    SELECT ${versionColumns}
    FROM ai_agent_versions
    WHERE ai_agent_versions.tenant_id = $1
      AND ai_agent_versions.ai_agent_key = $2
    ORDER BY ai_agent_versions.version_number DESC
    LIMIT $3
  `,
  archivePublishedVersions: `
    UPDATE ai_agent_versions
    SET status = 'archived'
    WHERE tenant_id = $1
      AND ai_agent_key = $2
      AND ai_agent_version_key <> $3
      AND status = 'published'
    RETURNING ai_agent_version_key AS "aiAgentVersionKey"
  `,
  publishVersion: `
    UPDATE ai_agent_versions
    SET
      status = 'published',
      published_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND ai_agent_key = $2
      AND ai_agent_version_key = $3
      AND status = 'draft'
    RETURNING ${versionColumns}
  `,
  activateAgent: `
    UPDATE ai_agents
    SET
      status = 'active',
      active_version_key = $4,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND ai_agent_key = $2
      AND version = $3
      AND latest_version_key = $4
    RETURNING ${agentColumns}
  `,
});

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return Number(value);
}

function requireAiAgentKey(value: unknown): string {
  if (typeof value !== "string" || !aiAgentKeyPattern.test(value)) {
    throw new Error("aiAgentKey is invalid");
  }
  return value;
}

function requireAiAgentVersionKey(value: unknown): string {
  if (typeof value !== "string" || !aiAgentVersionKeyPattern.test(value)) {
    throw new Error("aiAgentVersionKey is invalid");
  }
  return value;
}

function parseAgent(value: unknown): PersistedAiAgent {
  const row = requireExactPostgresRow(value, agentRowKeys);
  const aiAgentKey = requireAiAgentKey(row.aiAgentKey);
  const tenantId = parsePostgresPositiveInteger(row.tenantId);
  const status = aiAgentStatuses.find((candidate) => candidate === row.status);
  const name = row.name;
  const latestVersionKey = requireAiAgentVersionKey(row.latestVersionKey);
  const latestVersionNumber = parsePostgresPositiveInteger(
    row.latestVersionNumber,
  );
  const activeVersionKey = row.activeVersionKey === null
    ? null
    : requireAiAgentVersionKey(row.activeVersionKey);
  const version = parsePostgresPositiveInteger(row.version);
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);

  if (
    !status ||
    typeof name !== "string" ||
    name.trim() !== name ||
    name.length === 0 ||
    name.length > 160 ||
    controlCharacterPattern.test(name) ||
    ((status === "draft") !== (activeVersionKey === null)) ||
    updatedAt < createdAt
  ) {
    throw new Error("PostgreSQL returned an invalid AI agent");
  }

  return Object.freeze({
    aiAgentKey,
    tenantId,
    name,
    status,
    latestVersionKey,
    latestVersionNumber,
    activeVersionKey,
    version,
    createdAt,
    updatedAt,
  });
}

function parseDefinition(value: unknown): ValidatedAiAgentDefinition {
  let input = value;
  if (typeof value === "string") {
    try {
      input = JSON.parse(value);
    } catch {
      throw new Error("PostgreSQL returned invalid AI agent definition JSON");
    }
  }
  const validation = validateAiAgentDefinition(input);
  if (!validation.success) {
    throw new Error("PostgreSQL returned an invalid AI agent definition");
  }
  return validation.value;
}

function parseVersion(value: unknown): PersistedAiAgentVersion {
  const row = requireExactPostgresRow(value, versionRowKeys);
  const status = aiAgentVersionStatuses.find(
    (candidate) => candidate === row.status,
  );
  const publishedAt = row.publishedAt === null
    ? null
    : parsePostgresTimestamp(row.publishedAt);
  const createdAt = parsePostgresTimestamp(row.createdAt);
  if (!status || ((status === "draft") !== (publishedAt === null))) {
    throw new Error("PostgreSQL returned an invalid AI agent version");
  }
  return Object.freeze({
    aiAgentVersionKey: requireAiAgentVersionKey(row.aiAgentVersionKey),
    aiAgentKey: requireAiAgentKey(row.aiAgentKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    versionNumber: parsePostgresPositiveInteger(row.versionNumber),
    status,
    definition: parseDefinition(row.definitionJson),
    publishedAt,
    createdAt,
  });
}

function parseSourceKey(value: unknown): string {
  const row = requireExactPostgresRow(value, sourceRowKeys);
  if (
    typeof row.sourceKey !== "string" ||
    !knowledgeSourceKeyPattern.test(row.sourceKey)
  ) {
    throw new Error("PostgreSQL returned an invalid AI agent source");
  }
  return row.sourceKey;
}

function serializeDefinition(definition: ValidatedAiAgentDefinition): string {
  const payload = JSON.stringify(definition);
  if (new TextEncoder().encode(payload).byteLength > definitionMaximumBytes) {
    throw new Error("AI agent definition is too large");
  }
  return payload;
}

function sameDefinition(
  stored: PersistedAiAgentVersion,
  definition: ValidatedAiAgentDefinition,
): boolean {
  return JSON.stringify(stored.definition) === JSON.stringify(definition);
}

async function verifyAgentIdentity(agent: PersistedAiAgent): Promise<PersistedAiAgent> {
  const expected = await deriveAiAgentKey(agent.tenantId, agent.name);
  if (expected !== agent.aiAgentKey) {
    throw new Error("PostgreSQL returned an invalid AI agent identity");
  }
  return agent;
}

async function verifyVersionIdentity(
  version: PersistedAiAgentVersion,
): Promise<PersistedAiAgentVersion> {
  const expected = await deriveAiAgentVersionKey(
    version.tenantId,
    version.aiAgentKey,
    version.versionNumber,
    version.definition,
  );
  if (expected !== version.aiAgentVersionKey) {
    throw new Error("PostgreSQL returned an invalid AI agent version identity");
  }
  return version;
}

async function loadRows(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly Record<string, unknown>[]> {
  const result = await queries.query<Record<string, unknown>>(sql, parameters);
  return requirePostgresRows(result, maximum);
}

async function loadOne(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<Record<string, unknown> | null> {
  const rows = await loadRows(queries, sql, parameters, 1);
  return rows.length === 0 ? null : rows[0];
}

async function requireAgentScope(
  value: unknown,
  tenantId: number,
  aiAgentKey?: string,
): Promise<PersistedAiAgent> {
  const agent = await verifyAgentIdentity(parseAgent(value));
  if (
    agent.tenantId !== tenantId ||
    (aiAgentKey !== undefined && agent.aiAgentKey !== aiAgentKey)
  ) {
    throw new Error("PostgreSQL returned an AI agent outside the requested scope");
  }
  return agent;
}

async function requireVersionScope(
  version: PersistedAiAgentVersion,
  tenantId: number,
  aiAgentKey: string,
  aiAgentVersionKey?: string,
): Promise<PersistedAiAgentVersion> {
  const verified = await verifyVersionIdentity(version);
  if (
    verified.tenantId !== tenantId ||
    verified.aiAgentKey !== aiAgentKey ||
    (aiAgentVersionKey !== undefined &&
      verified.aiAgentVersionKey !== aiAgentVersionKey)
  ) {
    throw new Error(
      "PostgreSQL returned an AI agent version outside the requested scope",
    );
  }
  return verified;
}

async function loadVersionSources(
  queries: PostgresQueryExecutor,
  tenantId: number,
  aiAgentVersionKey: string,
): Promise<readonly string[]> {
  const rows = await loadRows(
    queries,
    postgresAiAgentSql.listVersionSources,
    [tenantId, aiAgentVersionKey],
    100,
  );
  const sourceKeys = rows.map(parseSourceKey);
  if (new Set(sourceKeys).size !== sourceKeys.length) {
    throw new Error("PostgreSQL returned duplicate AI agent sources");
  }
  return Object.freeze(sourceKeys);
}

async function loadVersionWithSources(
  queries: PostgresQueryExecutor,
  row: unknown,
  tenantId: number,
  aiAgentKey: string,
  aiAgentVersionKey?: string,
): Promise<PersistedAiAgentVersion> {
  const version = await requireVersionScope(
    parseVersion(row),
    tenantId,
    aiAgentKey,
    aiAgentVersionKey,
  );
  const storedSourceKeys = await loadVersionSources(
    queries,
    tenantId,
    version.aiAgentVersionKey,
  );
  if (
    JSON.stringify(storedSourceKeys) !==
      JSON.stringify(version.definition.knowledgeSourceKeys)
  ) {
    throw new Error(
      "PostgreSQL returned an AI agent version with mismatched sources",
    );
  }
  return version;
}

async function requestedSourcesExist(
  queries: PostgresQueryExecutor,
  tenantId: number,
  definitionJson: string,
  expected: readonly string[],
): Promise<boolean> {
  const rows = await loadRows(
    queries,
    postgresAiAgentSql.findRequestedSources,
    [tenantId, definitionJson],
    100,
  );
  const stored = rows.map(parseSourceKey);
  return JSON.stringify(stored) === JSON.stringify(expected);
}

function isExactDraft(
  agent: PersistedAiAgent,
  version: PersistedAiAgentVersion | null,
  input: SaveAiAgentDraftInput,
  definition: ValidatedAiAgentDefinition,
  resultingAgentVersion: number,
): version is PersistedAiAgentVersion {
  return Boolean(
    version &&
    agent.name === definition.name &&
    agent.latestVersionKey === input.aiAgentVersionKey &&
    agent.latestVersionNumber === input.versionNumber &&
    agent.version === resultingAgentVersion &&
    version.versionNumber === input.versionNumber &&
    version.status === "draft" &&
    sameDefinition(version, definition),
  );
}

export interface PostgresAiAgentRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

export function createPostgresAiAgentRepository(
  dependencies: Readonly<PostgresAiAgentRepositoryDependencies>,
): AiAgentRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL AI agent repository dependencies are invalid");
  }

  const findByKey: AiAgentRepository["findByKey"] = async (
    tenantIdInput,
    aiAgentKeyInput,
  ) => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const aiAgentKey = requireAiAgentKey(aiAgentKeyInput);
    const row = await loadOne(
      dependencies.queries,
      postgresAiAgentSql.findAgentByKey,
      [tenantId, aiAgentKey],
    );
    return row === null
      ? null
      : requireAgentScope(row, tenantId, aiAgentKey);
  };

  const findVersionByKey: AiAgentRepository["findVersionByKey"] = async (
    tenantIdInput,
    aiAgentKeyInput,
    aiAgentVersionKeyInput,
  ) => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const aiAgentKey = requireAiAgentKey(aiAgentKeyInput);
    const aiAgentVersionKey = requireAiAgentVersionKey(aiAgentVersionKeyInput);
    const row = await loadOne(
      dependencies.queries,
      postgresAiAgentSql.findVersionByKey,
      [tenantId, aiAgentKey, aiAgentVersionKey],
    );
    return row === null
      ? null
      : loadVersionWithSources(
          dependencies.queries,
          row,
          tenantId,
          aiAgentKey,
          aiAgentVersionKey,
        );
  };

  async function listAgents(
    tenantIdInput: number,
    limitInput: number,
    activeOnly: boolean,
  ): Promise<readonly PersistedAiAgent[]> {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const limit = requirePositiveInteger(limitInput, "limit");
    if (limit > 100) {
      throw new Error("limit must not exceed 100");
    }
    const rows = await loadRows(
      dependencies.queries,
      activeOnly ? postgresAiAgentSql.listActiveAgents : postgresAiAgentSql.listAgents,
      [tenantId, limit],
      limit,
    );
    return Object.freeze(await Promise.all(rows.map(async (row) => {
      const parsed = parseAgent(row);
      const agent = await requireAgentScope(row, tenantId, parsed.aiAgentKey);
      if (activeOnly && agent.status !== "active") {
        throw new Error("PostgreSQL returned an AI agent outside the requested state");
      }
      return agent;
    })));
  }

  const repository: AiAgentRepository = {
    async saveDraft(input) {
      const tenantId = requirePositiveInteger(input?.tenantId, "tenantId");
      const aiAgentKey = requireAiAgentKey(input?.aiAgentKey);
      const aiAgentVersionKey = requireAiAgentVersionKey(
        input?.aiAgentVersionKey,
      );
      const versionNumber = requirePositiveInteger(
        input?.versionNumber,
        "versionNumber",
      );
      const expectedAgentVersion = input?.expectedAgentVersion === null
        ? null
        : requirePositiveInteger(
            input?.expectedAgentVersion,
            "expectedAgentVersion",
          );
      const validation = validateAiAgentDefinition(input?.definition);
      if (!validation.success) {
        throw new Error("AI agent definition is invalid");
      }
      const expectedAgentKey = await deriveAiAgentKey(
        tenantId,
        validation.value.name,
      );
      const expectedVersionKey = await deriveAiAgentVersionKey(
        tenantId,
        aiAgentKey,
        versionNumber,
        validation.value,
      );
      if (
        expectedAgentKey !== aiAgentKey ||
        expectedVersionKey !== aiAgentVersionKey ||
        (expectedAgentVersion === null && versionNumber !== 1)
      ) {
        throw new Error("AI agent draft identity is invalid");
      }
      const normalized: SaveAiAgentDraftInput = {
        tenantId,
        aiAgentKey,
        aiAgentVersionKey,
        versionNumber,
        expectedAgentVersion,
        definition: validation.value,
      };
      const resultingAgentVersion = expectedAgentVersion === null
        ? 1
        : expectedAgentVersion + 1;
      const definitionJson = serializeDefinition(validation.value);

      return dependencies.transactions.transaction<SaveAiAgentDraftResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          let agent: PersistedAiAgent;
          let outcome: "created" | "updated" | "unchanged";
          if (expectedAgentVersion === null) {
            const inserted = await loadOne(
              transaction,
              postgresAiAgentSql.insertAgent,
              [
                aiAgentKey,
                tenantId,
                validation.value.name,
                aiAgentVersionKey,
                definitionJson,
              ],
            );
            if (inserted !== null) {
              agent = await requireAgentScope(inserted, tenantId, aiAgentKey);
              outcome = "created";
            } else {
              const existing = await loadOne(
                transaction,
                postgresAiAgentSql.findAgentByKeyForUpdate,
                [tenantId, aiAgentKey],
              );
              if (existing === null) {
                return Object.freeze({ outcome: "conflict" as const });
              }
              agent = await requireAgentScope(existing, tenantId, aiAgentKey);
              outcome = "unchanged";
            }
          } else {
            const current = await loadOne(
              transaction,
              postgresAiAgentSql.findAgentByKeyForUpdate,
              [tenantId, aiAgentKey],
            );
            if (current === null) {
              return Object.freeze({ outcome: "not-found" as const });
            }
            agent = await requireAgentScope(current, tenantId, aiAgentKey);
            outcome = "updated";
          }

          const existingVersionRow = await loadOne(
            transaction,
            postgresAiAgentSql.findVersionByKeyForUpdate,
            [tenantId, aiAgentKey, aiAgentVersionKey],
          );
          const existingVersion = existingVersionRow === null
            ? null
            : await loadVersionWithSources(
                transaction,
                existingVersionRow,
                tenantId,
                aiAgentKey,
                aiAgentVersionKey,
              );
          if (isExactDraft(
            agent,
            existingVersion,
            normalized,
            validation.value,
            resultingAgentVersion,
          )) {
            return Object.freeze({
              outcome: "unchanged" as const,
              agent,
              draftVersion: existingVersion,
            });
          }
          if (
            outcome === "unchanged" ||
            (expectedAgentVersion !== null &&
              (
                agent.version !== expectedAgentVersion ||
                agent.name !== validation.value.name ||
                agent.latestVersionNumber !== versionNumber - 1
              )) ||
            existingVersion !== null
          ) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          if (!(await requestedSourcesExist(
            transaction,
            tenantId,
            definitionJson,
            validation.value.knowledgeSourceKeys,
          ))) {
            return Object.freeze({ outcome: "conflict" as const });
          }

          const versionRow = await loadOne(
            transaction,
            postgresAiAgentSql.insertVersion,
            [
              aiAgentVersionKey,
              aiAgentKey,
              tenantId,
              versionNumber,
              definitionJson,
            ],
          );
          if (versionRow === null) {
            throw new Error("PostgreSQL AI agent version write failed");
          }
          const draftVersion = await requireVersionScope(
            parseVersion(versionRow),
            tenantId,
            aiAgentKey,
            aiAgentVersionKey,
          );
          const linkedRows = await loadRows(
            transaction,
            postgresAiAgentSql.insertVersionSources,
            [tenantId, aiAgentVersionKey, definitionJson],
            validation.value.knowledgeSourceKeys.length,
          );
          const linkedSourceKeys = linkedRows.map(parseSourceKey).sort();
          if (
            JSON.stringify(linkedSourceKeys) !==
              JSON.stringify(validation.value.knowledgeSourceKeys)
          ) {
            throw new Error("PostgreSQL AI agent source write failed");
          }

          if (outcome === "updated" && expectedAgentVersion !== null) {
            const updated = await loadOne(
              transaction,
              postgresAiAgentSql.updateAgentDraft,
              [
                tenantId,
                aiAgentKey,
                expectedAgentVersion,
                aiAgentVersionKey,
                versionNumber,
                validation.value.name,
              ],
            );
            if (updated === null) {
              throw new Error("PostgreSQL AI agent draft transition failed");
            }
            agent = await requireAgentScope(updated, tenantId, aiAgentKey);
          }
          if (!isExactDraft(
            agent,
            draftVersion,
            normalized,
            validation.value,
            resultingAgentVersion,
          )) {
            throw new Error("PostgreSQL returned a mismatched AI agent draft");
          }
          return Object.freeze({ outcome, agent, draftVersion });
        },
      );
    },

    async publishDraft(
      tenantIdInput,
      aiAgentKeyInput,
      aiAgentVersionKeyInput,
      expectedAgentVersionInput,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const aiAgentKey = requireAiAgentKey(aiAgentKeyInput);
      const aiAgentVersionKey = requireAiAgentVersionKey(aiAgentVersionKeyInput);
      const expectedAgentVersion = requirePositiveInteger(
        expectedAgentVersionInput,
        "expectedAgentVersion",
      );
      const resultingAgentVersion = expectedAgentVersion + 1;

      return dependencies.transactions.transaction<PublishAiAgentDraftResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const agentRow = await loadOne(
            transaction,
            postgresAiAgentSql.findAgentByKeyForUpdate,
            [tenantId, aiAgentKey],
          );
          if (agentRow === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          let agent = await requireAgentScope(agentRow, tenantId, aiAgentKey);
          const versionRow = await loadOne(
            transaction,
            postgresAiAgentSql.findVersionByKeyForUpdate,
            [tenantId, aiAgentKey, aiAgentVersionKey],
          );
          const target = versionRow === null
            ? null
            : await loadVersionWithSources(
                transaction,
                versionRow,
                tenantId,
                aiAgentKey,
                aiAgentVersionKey,
              );
          if (
            agent.status === "active" &&
            agent.activeVersionKey === aiAgentVersionKey &&
            agent.version === resultingAgentVersion &&
            target?.status === "published"
          ) {
            return Object.freeze({
              outcome: "unchanged" as const,
              agent,
              publishedVersion: target,
            });
          }
          if (agent.version !== expectedAgentVersion) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          if (
            target === null ||
            target.status !== "draft" ||
            agent.latestVersionKey !== aiAgentVersionKey
          ) {
            return Object.freeze({ outcome: "invalid-state" as const });
          }

          const archivedRows = await loadRows(
            transaction,
            postgresAiAgentSql.archivePublishedVersions,
            [tenantId, aiAgentKey, aiAgentVersionKey],
            1,
          );
          for (const value of archivedRows) {
            const row = requireExactPostgresRow(value, ["aiAgentVersionKey"]);
            if (requireAiAgentVersionKey(row.aiAgentVersionKey) === aiAgentVersionKey) {
              throw new Error("PostgreSQL archived the target AI agent version");
            }
          }
          const publishedRow = await loadOne(
            transaction,
            postgresAiAgentSql.publishVersion,
            [tenantId, aiAgentKey, aiAgentVersionKey],
          );
          const activatedRow = await loadOne(
            transaction,
            postgresAiAgentSql.activateAgent,
            [tenantId, aiAgentKey, expectedAgentVersion, aiAgentVersionKey],
          );
          if (publishedRow === null || activatedRow === null) {
            throw new Error("PostgreSQL AI agent publication transition failed");
          }
          const publishedVersion = await loadVersionWithSources(
            transaction,
            publishedRow,
            tenantId,
            aiAgentKey,
            aiAgentVersionKey,
          );
          agent = await requireAgentScope(activatedRow, tenantId, aiAgentKey);
          if (
            publishedVersion.status !== "published" ||
            agent.status !== "active" ||
            agent.activeVersionKey !== aiAgentVersionKey ||
            agent.version !== resultingAgentVersion
          ) {
            throw new Error("PostgreSQL returned a mismatched AI agent publication");
          }
          return Object.freeze({
            outcome: "updated" as const,
            agent,
            publishedVersion,
          });
        },
      );
    },

    findByKey,
    findVersionByKey,
    listByTenant(tenantId, limit) {
      return listAgents(tenantId, limit, false);
    },
    listActiveByTenant(tenantId, limit) {
      return listAgents(tenantId, limit, true);
    },
    async listVersions(tenantIdInput, aiAgentKeyInput, limitInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const aiAgentKey = requireAiAgentKey(aiAgentKeyInput);
      const limit = requirePositiveInteger(limitInput, "limit");
      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }
      const rows = await loadRows(
        dependencies.queries,
        postgresAiAgentSql.listVersions,
        [tenantId, aiAgentKey, limit],
        limit,
      );
      return Object.freeze(await Promise.all(rows.map((row) =>
        loadVersionWithSources(
          dependencies.queries,
          row,
          tenantId,
          aiAgentKey,
        ))));
    },
  };

  return Object.freeze(repository);
}
