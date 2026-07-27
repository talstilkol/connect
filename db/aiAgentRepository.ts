import {
  aiAgentStatuses,
  aiAgentVersionStatuses,
  type PersistedAiAgent,
  type PersistedAiAgentVersion,
  type ValidatedAiAgentDefinition,
} from "../shared/domain/aiAgent.ts";
import {
  validateAiAgentDefinition,
} from "../shared/validation/aiAgentDefinition.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
} from "../server/ai/aiAgentKey.ts";
import type {
  D1DatabaseBinding,
  D1Result,
} from "./d1.ts";

const AI_AGENT_DEFINITION_MAXIMUM_BYTES =
  1_000_000;
const AI_AGENT_KEY_PATTERN =
  /^ai_agent_v1_[0-9a-f]{64}$/;
const AI_AGENT_VERSION_KEY_PATTERN =
  /^ai_agent_version_v1_[0-9a-f]{64}$/;

const AI_AGENT_COLUMNS_SQL = `
  ai_agent_key AS aiAgentKey,
  tenant_id AS tenantId,
  name,
  status,
  latest_version_key AS latestVersionKey,
  latest_version_number AS latestVersionNumber,
  active_version_key AS activeVersionKey,
  version,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const AI_AGENT_VERSION_COLUMNS_SQL = `
  ai_agent_version_key AS aiAgentVersionKey,
  ai_agent_key AS aiAgentKey,
  tenant_id AS tenantId,
  version_number AS versionNumber,
  status,
  definition_json AS definitionJson,
  published_at AS publishedAt,
  created_at AS createdAt
`;

const INSERT_AI_AGENT_SQL = `
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
  SELECT
    ?1,
    ?2,
    ?3,
    'draft',
    ?4,
    1,
    NULL,
    1
  WHERE NOT EXISTS (
    SELECT 1
    FROM json_each(
      ?5,
      '$.knowledgeSourceKeys'
    ) AS requested_source
    WHERE NOT EXISTS (
      SELECT 1
      FROM knowledge_sources
      WHERE knowledge_sources.tenant_id = ?2
        AND knowledge_sources.source_key =
          requested_source.value
    )
  )
  ON CONFLICT (ai_agent_key) DO NOTHING
`;

const UPDATE_AI_AGENT_DRAFT_SQL = `
  UPDATE ai_agents
  SET
    latest_version_key = ?4,
    latest_version_number = ?5,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND ai_agent_key = ?2
    AND version = ?3
    AND name = ?6
    AND latest_version_number = ?5 - 1
    AND NOT EXISTS (
      SELECT 1
      FROM json_each(
        ?7,
        '$.knowledgeSourceKeys'
      ) AS requested_source
      WHERE NOT EXISTS (
        SELECT 1
        FROM knowledge_sources
        WHERE knowledge_sources.tenant_id = ?1
          AND knowledge_sources.source_key =
            requested_source.value
      )
    )
`;

const INSERT_AI_AGENT_VERSION_SQL = `
  INSERT INTO ai_agent_versions (
    ai_agent_version_key,
    ai_agent_key,
    tenant_id,
    version_number,
    status,
    definition_json,
    published_at
  )
  SELECT
    ?3,
    ?2,
    ?1,
    ?4,
    'draft',
    ?5,
    NULL
  FROM ai_agents
  WHERE tenant_id = ?1
    AND ai_agent_key = ?2
    AND latest_version_key = ?3
    AND latest_version_number = ?4
    AND version = ?6
  ON CONFLICT DO NOTHING
`;

const INSERT_AI_AGENT_VERSION_SOURCES_SQL = `
  INSERT INTO ai_agent_version_sources (
    tenant_id,
    ai_agent_version_key,
    source_key
  )
  SELECT
    ?1,
    ?2,
    requested_source.value
  FROM json_each(
    ?3,
    '$.knowledgeSourceKeys'
  ) AS requested_source
  INNER JOIN knowledge_sources
    ON knowledge_sources.tenant_id = ?1
    AND knowledge_sources.source_key =
      requested_source.value
  WHERE EXISTS (
    SELECT 1
    FROM ai_agent_versions
    WHERE ai_agent_versions.tenant_id = ?1
      AND ai_agent_versions.ai_agent_version_key =
        ?2
  )
  ON CONFLICT DO NOTHING
`;

const ACTIVATE_AI_AGENT_VERSION_SQL = `
  UPDATE ai_agents
  SET
    status = 'active',
    active_version_key = ?4,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND ai_agent_key = ?2
    AND version = ?3
    AND latest_version_key = ?4
    AND EXISTS (
      SELECT 1
      FROM ai_agent_versions
      WHERE ai_agent_versions.tenant_id = ?1
        AND ai_agent_versions.ai_agent_key = ?2
        AND ai_agent_versions.ai_agent_version_key = ?4
        AND ai_agent_versions.status = 'draft'
    )
`;

const ARCHIVE_ACTIVE_AI_AGENT_VERSION_SQL = `
  UPDATE ai_agent_versions
  SET status = 'archived'
  WHERE tenant_id = ?1
    AND ai_agent_key = ?2
    AND ai_agent_version_key <> ?4
    AND status = 'published'
    AND EXISTS (
      SELECT 1
      FROM ai_agents
      WHERE ai_agents.tenant_id = ?1
        AND ai_agents.ai_agent_key = ?2
        AND ai_agents.active_version_key = ?4
        AND ai_agents.version = ?5
    )
`;

const PUBLISH_AI_AGENT_VERSION_SQL = `
  UPDATE ai_agent_versions
  SET
    status = 'published',
    published_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND ai_agent_key = ?2
    AND ai_agent_version_key = ?4
    AND status = 'draft'
    AND EXISTS (
      SELECT 1
      FROM ai_agents
      WHERE ai_agents.tenant_id = ?1
        AND ai_agents.ai_agent_key = ?2
        AND ai_agents.active_version_key = ?4
        AND ai_agents.version = ?5
    )
`;

const SELECT_AI_AGENT_BY_KEY_SQL = `
  SELECT
    ${AI_AGENT_COLUMNS_SQL}
  FROM ai_agents
  WHERE tenant_id = ?1
    AND ai_agent_key = ?2
  LIMIT 1
`;

const SELECT_AI_AGENT_VERSION_BY_KEY_SQL = `
  SELECT
    ${AI_AGENT_VERSION_COLUMNS_SQL}
  FROM ai_agent_versions
  WHERE tenant_id = ?1
    AND ai_agent_key = ?2
    AND ai_agent_version_key = ?3
  LIMIT 1
`;

const LIST_AI_AGENTS_SQL = `
  SELECT
    ${AI_AGENT_COLUMNS_SQL}
  FROM ai_agents
  WHERE tenant_id = ?1
  ORDER BY updated_at DESC, ai_agent_key ASC
  LIMIT ?2
`;

const LIST_ACTIVE_AI_AGENTS_SQL = `
  SELECT
    ${AI_AGENT_COLUMNS_SQL}
  FROM ai_agents
  WHERE tenant_id = ?1
    AND status = 'active'
  ORDER BY updated_at DESC, ai_agent_key ASC
  LIMIT ?2
`;

const LIST_AI_AGENT_VERSIONS_SQL = `
  SELECT
    ${AI_AGENT_VERSION_COLUMNS_SQL}
  FROM ai_agent_versions
  WHERE tenant_id = ?1
    AND ai_agent_key = ?2
  ORDER BY version_number DESC
  LIMIT ?3
`;

const LIST_AI_AGENT_VERSION_SOURCES_SQL = `
  SELECT source_key AS sourceKey
  FROM ai_agent_version_sources
  WHERE tenant_id = ?1
    AND ai_agent_version_key = ?2
  ORDER BY source_key ASC
`;

interface AiAgentRow {
  aiAgentKey: string;
  tenantId: number;
  name: string;
  status: string;
  latestVersionKey: string;
  latestVersionNumber: number;
  activeVersionKey: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface AiAgentVersionRow {
  aiAgentVersionKey: string;
  aiAgentKey: string;
  tenantId: number;
  versionNumber: number;
  status: string;
  definitionJson: string;
  publishedAt: string | null;
  createdAt: string;
}

interface AiAgentVersionSourceRow {
  sourceKey: string;
}

export interface SaveAiAgentDraftInput {
  tenantId: number;
  aiAgentKey: string;
  aiAgentVersionKey: string;
  versionNumber: number;
  expectedAgentVersion: number | null;
  definition: unknown;
}

export type SaveAiAgentDraftResult =
  | {
      outcome:
        | "created"
        | "updated"
        | "unchanged";
      agent: PersistedAiAgent;
      draftVersion: PersistedAiAgentVersion;
    }
  | {
      outcome: "not-found" | "conflict";
    };

export type PublishAiAgentDraftResult =
  | {
      outcome: "updated" | "unchanged";
      agent: PersistedAiAgent;
      publishedVersion: PersistedAiAgentVersion;
    }
  | {
      outcome:
        | "not-found"
        | "conflict"
        | "invalid-state";
    };

export interface AiAgentRepository {
  saveDraft(
    input: SaveAiAgentDraftInput,
  ): Promise<SaveAiAgentDraftResult>;
  publishDraft(
    tenantId: number,
    aiAgentKey: string,
    aiAgentVersionKey: string,
    expectedAgentVersion: number,
  ): Promise<PublishAiAgentDraftResult>;
  findByKey(
    tenantId: number,
    aiAgentKey: string,
  ): Promise<PersistedAiAgent | null>;
  findVersionByKey(
    tenantId: number,
    aiAgentKey: string,
    aiAgentVersionKey: string,
  ): Promise<PersistedAiAgentVersion | null>;
  listByTenant(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedAiAgent[]>;
  listActiveByTenant(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedAiAgent[]>;
  listVersions(
    tenantId: number,
    aiAgentKey: string,
    limit: number,
  ): Promise<readonly PersistedAiAgentVersion[]>;
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${fieldName} must be a positive integer`,
    );
  }
}

function assertAiAgentKey(value: string): void {
  if (!AI_AGENT_KEY_PATTERN.test(value)) {
    throw new Error("aiAgentKey is invalid");
  }
}

function assertAiAgentVersionKey(
  value: string,
): void {
  if (!AI_AGENT_VERSION_KEY_PATTERN.test(value)) {
    throw new Error(
      "aiAgentVersionKey is invalid",
    );
  }
}

function assertLimit(value: number): void {
  assertPositiveInteger(value, "limit");

  if (value > 100) {
    throw new Error(
      "limit must not exceed 100",
    );
  }
}

function isNonBlankText(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function parseAiAgentRow(
  row: AiAgentRow,
): PersistedAiAgent {
  const status = aiAgentStatuses.find(
    (candidate) => candidate === row.status,
  );

  if (
    !AI_AGENT_KEY_PATTERN.test(row.aiAgentKey) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !isNonBlankText(row.name) ||
    row.name.length > 160 ||
    !status ||
    !AI_AGENT_VERSION_KEY_PATTERN.test(
      row.latestVersionKey,
    ) ||
    !Number.isSafeInteger(
      row.latestVersionNumber,
    ) ||
    row.latestVersionNumber <= 0 ||
    (row.activeVersionKey !== null &&
      !AI_AGENT_VERSION_KEY_PATTERN.test(
        row.activeVersionKey,
      )) ||
    ((status === "draft") !==
      (row.activeVersionKey === null)) ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    !isNonBlankText(row.createdAt) ||
    !isNonBlankText(row.updatedAt)
  ) {
    throw new Error(
      "D1 returned an invalid AI agent",
    );
  }

  return {
    aiAgentKey: row.aiAgentKey,
    tenantId: row.tenantId,
    name: row.name,
    status,
    latestVersionKey: row.latestVersionKey,
    latestVersionNumber:
      row.latestVersionNumber,
    activeVersionKey: row.activeVersionKey,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseAiAgentVersionRow(
  row: AiAgentVersionRow,
): PersistedAiAgentVersion {
  let definitionInput: unknown;

  try {
    definitionInput = JSON.parse(
      row.definitionJson,
    );
  } catch {
    throw new Error(
      "D1 returned invalid AI agent definition JSON",
    );
  }

  const definition =
    validateAiAgentDefinition(definitionInput);
  const status = aiAgentVersionStatuses.find(
    (candidate) => candidate === row.status,
  );

  if (
    !AI_AGENT_VERSION_KEY_PATTERN.test(
      row.aiAgentVersionKey,
    ) ||
    !AI_AGENT_KEY_PATTERN.test(row.aiAgentKey) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !Number.isSafeInteger(row.versionNumber) ||
    row.versionNumber <= 0 ||
    !status ||
    !definition.success ||
    ((status === "draft") !==
      (row.publishedAt === null)) ||
    !isNonBlankText(row.createdAt)
  ) {
    throw new Error(
      "D1 returned an invalid AI agent version",
    );
  }

  return {
    aiAgentVersionKey:
      row.aiAgentVersionKey,
    aiAgentKey: row.aiAgentKey,
    tenantId: row.tenantId,
    versionNumber: row.versionNumber,
    status,
    definition: definition.value,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
  };
}

function serializeDefinition(
  definition: ValidatedAiAgentDefinition,
): string {
  const payload = JSON.stringify(definition);

  if (
    new TextEncoder().encode(payload).byteLength >
    AI_AGENT_DEFINITION_MAXIMUM_BYTES
  ) {
    throw new Error(
      "AI agent definition is too large",
    );
  }

  return payload;
}

function batchSucceeded(
  results: readonly D1Result[],
  expectedLength = 3,
): boolean {
  return (
    results.length === expectedLength &&
    results.every((result) => result.success)
  );
}

function firstStatementChanged(
  results: readonly D1Result[],
): boolean {
  return results[0]?.meta?.changes !== 0;
}

function sameDefinition(
  stored: PersistedAiAgentVersion,
  definition: ValidatedAiAgentDefinition,
): boolean {
  return (
    JSON.stringify(stored.definition) ===
    JSON.stringify(definition)
  );
}

async function verifyAgentIdentity(
  agent: PersistedAiAgent,
): Promise<PersistedAiAgent> {
  const expectedKey = await deriveAiAgentKey(
    agent.tenantId,
    agent.name,
  );

  if (expectedKey !== agent.aiAgentKey) {
    throw new Error(
      "D1 returned an invalid AI agent identity",
    );
  }

  return agent;
}

async function verifyVersionIdentity(
  version: PersistedAiAgentVersion,
): Promise<PersistedAiAgentVersion> {
  const expectedKey =
    await deriveAiAgentVersionKey(
      version.tenantId,
      version.aiAgentKey,
      version.versionNumber,
      version.definition,
    );

  if (expectedKey !== version.aiAgentVersionKey) {
    throw new Error(
      "D1 returned an invalid AI agent version identity",
    );
  }

  return version;
}

export function createAiAgentRepository(
  database: D1DatabaseBinding,
): AiAgentRepository {
  const findByKey: AiAgentRepository["findByKey"] =
    async (tenantId, aiAgentKey) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertAiAgentKey(aiAgentKey);

      const row = await database
        .prepare(SELECT_AI_AGENT_BY_KEY_SQL)
        .bind(tenantId, aiAgentKey)
        .first<AiAgentRow>();

      if (!row) {
        return null;
      }

      const agent = await verifyAgentIdentity(
        parseAiAgentRow(row),
      );

      if (
        agent.tenantId !== tenantId ||
        agent.aiAgentKey !== aiAgentKey
      ) {
        throw new Error(
          "D1 returned an AI agent outside the requested scope",
        );
      }

      return agent;
    };

  const findVersionByKey: AiAgentRepository["findVersionByKey"] =
    async (
      tenantId,
      aiAgentKey,
      aiAgentVersionKey,
    ) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertAiAgentKey(aiAgentKey);
      assertAiAgentVersionKey(
        aiAgentVersionKey,
      );

      const row = await database
        .prepare(
          SELECT_AI_AGENT_VERSION_BY_KEY_SQL,
        )
        .bind(
          tenantId,
          aiAgentKey,
          aiAgentVersionKey,
        )
        .first<AiAgentVersionRow>();

      if (!row) {
        return null;
      }

      const version = await verifyVersionIdentity(
        parseAiAgentVersionRow(row),
      );
      const sourceResult = await database
        .prepare(
          LIST_AI_AGENT_VERSION_SOURCES_SQL,
        )
        .bind(tenantId, aiAgentVersionKey)
        .all<AiAgentVersionSourceRow>();

      if (!sourceResult.success) {
        throw new Error(
          sourceResult.error ??
            "D1 AI agent source read failed",
        );
      }

      const storedSourceKeys = (
        sourceResult.results ?? []
      ).map((source) => source.sourceKey);

      if (
        version.tenantId !== tenantId ||
        version.aiAgentKey !== aiAgentKey ||
        version.aiAgentVersionKey !==
          aiAgentVersionKey ||
        JSON.stringify(storedSourceKeys) !==
          JSON.stringify(
            version.definition
              .knowledgeSourceKeys,
          )
      ) {
        throw new Error(
          "D1 returned an AI agent version outside the requested scope or sources",
        );
      }

      return version;
    };

  return {
    async saveDraft(input) {
      assertPositiveInteger(
        input.tenantId,
        "tenantId",
      );
      assertAiAgentKey(input.aiAgentKey);
      assertAiAgentVersionKey(
        input.aiAgentVersionKey,
      );
      assertPositiveInteger(
        input.versionNumber,
        "versionNumber",
      );

      if (
        input.expectedAgentVersion !== null
      ) {
        assertPositiveInteger(
          input.expectedAgentVersion,
          "expectedAgentVersion",
        );
      }

      const validation =
        validateAiAgentDefinition(
          input.definition,
        );

      if (!validation.success) {
        throw new Error(
          "AI agent definition is invalid",
        );
      }

      const expectedAgentKey =
        await deriveAiAgentKey(
          input.tenantId,
          validation.value.name,
        );
      const expectedVersionKey =
        await deriveAiAgentVersionKey(
          input.tenantId,
          input.aiAgentKey,
          input.versionNumber,
          validation.value,
        );

      if (
        expectedAgentKey !== input.aiAgentKey ||
        expectedVersionKey !==
          input.aiAgentVersionKey ||
        (input.expectedAgentVersion === null &&
          input.versionNumber !== 1)
      ) {
        throw new Error(
          "AI agent draft identity is invalid",
        );
      }

      const definitionJson =
        serializeDefinition(validation.value);
      const resultingAgentVersion =
        input.expectedAgentVersion === null
          ? 1
          : input.expectedAgentVersion + 1;
      const writeStatement =
        input.expectedAgentVersion === null
          ? database
              .prepare(INSERT_AI_AGENT_SQL)
              .bind(
                input.aiAgentKey,
                input.tenantId,
                validation.value.name,
                input.aiAgentVersionKey,
                definitionJson,
              )
          : database
              .prepare(
                UPDATE_AI_AGENT_DRAFT_SQL,
              )
              .bind(
                input.tenantId,
                input.aiAgentKey,
                input.expectedAgentVersion,
                input.aiAgentVersionKey,
                input.versionNumber,
                validation.value.name,
                definitionJson,
              );
      let results: readonly D1Result[];

      try {
        results = await database.batch([
          writeStatement,
          database
            .prepare(
              INSERT_AI_AGENT_VERSION_SQL,
            )
            .bind(
              input.tenantId,
              input.aiAgentKey,
              input.aiAgentVersionKey,
              input.versionNumber,
              definitionJson,
              resultingAgentVersion,
            ),
          database
            .prepare(
              INSERT_AI_AGENT_VERSION_SOURCES_SQL,
            )
            .bind(
              input.tenantId,
              input.aiAgentVersionKey,
              definitionJson,
            ),
        ]);
      } catch {
        throw new Error(
          "D1 AI agent draft write failed",
        );
      }

      if (!batchSucceeded(results)) {
        const failedResult = results.find(
          (result) => !result.success,
        );

        throw new Error(
          failedResult?.error ??
            "D1 AI agent draft write failed",
        );
      }

      const [agent, draftVersion] =
        await Promise.all([
          findByKey(
            input.tenantId,
            input.aiAgentKey,
          ),
          findVersionByKey(
            input.tenantId,
            input.aiAgentKey,
            input.aiAgentVersionKey,
          ),
        ]);
      const exactStoredDraft =
        agent !== null &&
        draftVersion !== null &&
        agent.name === validation.value.name &&
        agent.latestVersionKey ===
          input.aiAgentVersionKey &&
        agent.latestVersionNumber ===
          input.versionNumber &&
        agent.version === resultingAgentVersion &&
        draftVersion.versionNumber ===
          input.versionNumber &&
        draftVersion.status === "draft" &&
        sameDefinition(
          draftVersion,
          validation.value,
        );

      if (exactStoredDraft && agent && draftVersion) {
        return {
          outcome:
            results[0]?.meta?.changes === 0
              ? "unchanged"
              : input.expectedAgentVersion === null
                ? "created"
                : "updated",
          agent,
          draftVersion,
        };
      }

      if (!agent) {
        return {
          outcome:
            input.expectedAgentVersion === null
              ? "conflict"
              : "not-found",
        };
      }

      return { outcome: "conflict" };
    },

    async publishDraft(
      tenantId,
      aiAgentKey,
      aiAgentVersionKey,
      expectedAgentVersion,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertAiAgentKey(aiAgentKey);
      assertAiAgentVersionKey(
        aiAgentVersionKey,
      );
      assertPositiveInteger(
        expectedAgentVersion,
        "expectedAgentVersion",
      );
      const resultingAgentVersion =
        expectedAgentVersion + 1;
      let results: readonly D1Result[];

      try {
        results = await database.batch([
          database
            .prepare(
              ACTIVATE_AI_AGENT_VERSION_SQL,
            )
            .bind(
              tenantId,
              aiAgentKey,
              expectedAgentVersion,
              aiAgentVersionKey,
            ),
          database
            .prepare(
              ARCHIVE_ACTIVE_AI_AGENT_VERSION_SQL,
            )
            .bind(
              tenantId,
              aiAgentKey,
              expectedAgentVersion,
              aiAgentVersionKey,
              resultingAgentVersion,
            ),
          database
            .prepare(
              PUBLISH_AI_AGENT_VERSION_SQL,
            )
            .bind(
              tenantId,
              aiAgentKey,
              expectedAgentVersion,
              aiAgentVersionKey,
              resultingAgentVersion,
            ),
        ]);
      } catch {
        throw new Error(
          "D1 AI agent publication failed",
        );
      }

      if (!batchSucceeded(results)) {
        const failedResult = results.find(
          (result) => !result.success,
        );

        throw new Error(
          failedResult?.error ??
            "D1 AI agent publication failed",
        );
      }

      const [agent, publishedVersion] =
        await Promise.all([
          findByKey(tenantId, aiAgentKey),
          findVersionByKey(
            tenantId,
            aiAgentKey,
            aiAgentVersionKey,
          ),
        ]);
      const exactPublication =
        agent !== null &&
        publishedVersion !== null &&
        agent.status === "active" &&
        agent.activeVersionKey ===
          aiAgentVersionKey &&
        agent.version === resultingAgentVersion &&
        publishedVersion.status === "published";

      if (
        exactPublication &&
        agent &&
        publishedVersion
      ) {
        return {
          outcome: firstStatementChanged(results)
            ? "updated"
            : "unchanged",
          agent,
          publishedVersion,
        };
      }

      if (!agent) {
        return { outcome: "not-found" };
      }

      if (
        agent.version !== expectedAgentVersion
      ) {
        return { outcome: "conflict" };
      }

      return { outcome: "invalid-state" };
    },

    findByKey,

    findVersionByKey,

    async listByTenant(tenantId, limit) {
      assertPositiveInteger(tenantId, "tenantId");
      assertLimit(limit);

      const result = await database
        .prepare(LIST_AI_AGENTS_SQL)
        .bind(tenantId, limit)
        .all<AiAgentRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 AI agent list read failed",
        );
      }

      return Promise.all(
        (result.results ?? []).map(
          async (row) => {
            const agent =
              await verifyAgentIdentity(
                parseAiAgentRow(row),
              );

            if (agent.tenantId !== tenantId) {
              throw new Error(
                "D1 returned an AI agent outside the requested tenant",
              );
            }

            return agent;
          },
        ),
      );
    },

    async listActiveByTenant(tenantId, limit) {
      assertPositiveInteger(tenantId, "tenantId");
      assertLimit(limit);

      const result = await database
        .prepare(LIST_ACTIVE_AI_AGENTS_SQL)
        .bind(tenantId, limit)
        .all<AiAgentRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 active AI agent list read failed",
        );
      }

      return Promise.all(
        (result.results ?? []).map(
          async (row) => {
            const agent =
              await verifyAgentIdentity(
                parseAiAgentRow(row),
              );

            if (
              agent.tenantId !== tenantId ||
              agent.status !== "active" ||
              agent.activeVersionKey === null
            ) {
              throw new Error(
                "D1 returned an invalid active AI agent",
              );
            }

            return agent;
          },
        ),
      );
    },

    async listVersions(
      tenantId,
      aiAgentKey,
      limit,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertAiAgentKey(aiAgentKey);
      assertLimit(limit);

      const result = await database
        .prepare(LIST_AI_AGENT_VERSIONS_SQL)
        .bind(tenantId, aiAgentKey, limit)
        .all<AiAgentVersionRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 AI agent version list read failed",
        );
      }

      return Promise.all(
        (result.results ?? []).map(
          async (row) => {
            const version =
              await findVersionByKey(
                tenantId,
                aiAgentKey,
                row.aiAgentVersionKey,
              );

            if (!version) {
              throw new Error(
                "D1 returned a missing AI agent version",
              );
            }

            return version;
          },
        ),
      );
    },
  };
}
