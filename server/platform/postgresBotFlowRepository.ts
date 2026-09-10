import type {
  BotFlowRepository,
  PublishBotFlowDraftResult,
  SaveBotFlowDraftInput,
  SaveBotFlowDraftResult,
} from "../../db/botFlowRepository.ts";
import {
  botFlowStatuses,
  botFlowVersionStatuses,
  type PersistedBotFlow,
  type PersistedBotFlowVersion,
  type ValidatedBotFlowDefinition,
} from "../../shared/domain/botFlow.ts";
import {
  validateBotFlowDefinition,
} from "../../shared/validation/botFlowDefinition.ts";
import {
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../bot/botFlowKey.ts";
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

const botFlowKeyPattern = /^bot_flow_v1_[0-9a-f]{64}$/;
const botFlowVersionKeyPattern = /^bot_flow_version_v1_[0-9a-f]{64}$/;
const definitionMaximumBytes = 1_000_000;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

const flowRowKeys = Object.freeze([
  "activeVersionKey",
  "botFlowKey",
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
  "botFlowKey",
  "botFlowVersionKey",
  "createdAt",
  "definitionJson",
  "publishedAt",
  "status",
  "tenantId",
  "versionNumber",
]);

const flowColumns = `
  bot_flows.bot_flow_key AS "botFlowKey",
  bot_flows.tenant_id AS "tenantId",
  bot_flows.name,
  bot_flows.status,
  bot_flows.latest_version_key AS "latestVersionKey",
  bot_flows.latest_version_number AS "latestVersionNumber",
  bot_flows.active_version_key AS "activeVersionKey",
  bot_flows.version,
  bot_flows.created_at AS "createdAt",
  bot_flows.updated_at AS "updatedAt"
`;

const versionColumns = `
  bot_flow_versions.bot_flow_version_key AS "botFlowVersionKey",
  bot_flow_versions.bot_flow_key AS "botFlowKey",
  bot_flow_versions.tenant_id AS "tenantId",
  bot_flow_versions.version_number AS "versionNumber",
  bot_flow_versions.status,
  bot_flow_versions.definition_json AS "definitionJson",
  bot_flow_versions.published_at AS "publishedAt",
  bot_flow_versions.created_at AS "createdAt"
`;

export const postgresBotFlowSql = Object.freeze({
  insertFlow: `
    INSERT INTO bot_flows (
      bot_flow_key,
      tenant_id,
      name,
      status,
      latest_version_key,
      latest_version_number,
      active_version_key,
      version
    )
    VALUES ($1, $2, $3, 'draft', $4, 1, NULL, 1)
    ON CONFLICT DO NOTHING
    RETURNING ${flowColumns}
  `,
  findFlowByKey: `
    SELECT ${flowColumns}
    FROM bot_flows
    WHERE bot_flows.tenant_id = $1
      AND bot_flows.bot_flow_key = $2
    LIMIT 1
  `,
  findFlowByKeyForUpdate: `
    SELECT ${flowColumns}
    FROM bot_flows
    WHERE bot_flows.tenant_id = $1
      AND bot_flows.bot_flow_key = $2
    FOR UPDATE
  `,
  updateFlowDraft: `
    UPDATE bot_flows
    SET
      latest_version_key = $4,
      latest_version_number = $5,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND bot_flow_key = $2
      AND version = $3
      AND name = $6
      AND latest_version_number = $5 - 1
    RETURNING ${flowColumns}
  `,
  insertVersion: `
    INSERT INTO bot_flow_versions (
      bot_flow_version_key,
      bot_flow_key,
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
    FROM bot_flow_versions
    WHERE bot_flow_versions.tenant_id = $1
      AND bot_flow_versions.bot_flow_key = $2
      AND bot_flow_versions.bot_flow_version_key = $3
    LIMIT 1
  `,
  findVersionByKeyForUpdate: `
    SELECT ${versionColumns}
    FROM bot_flow_versions
    WHERE bot_flow_versions.tenant_id = $1
      AND bot_flow_versions.bot_flow_key = $2
      AND bot_flow_versions.bot_flow_version_key = $3
    FOR UPDATE
  `,
  listFlows: `
    SELECT ${flowColumns}
    FROM bot_flows
    WHERE bot_flows.tenant_id = $1
    ORDER BY bot_flows.updated_at DESC, bot_flows.bot_flow_key ASC
    LIMIT $2
  `,
  listActiveFlows: `
    SELECT ${flowColumns}
    FROM bot_flows
    WHERE bot_flows.tenant_id = $1
      AND bot_flows.status = 'active'
    ORDER BY bot_flows.updated_at DESC, bot_flows.bot_flow_key ASC
    LIMIT $2
  `,
  listVersions: `
    SELECT ${versionColumns}
    FROM bot_flow_versions
    WHERE bot_flow_versions.tenant_id = $1
      AND bot_flow_versions.bot_flow_key = $2
    ORDER BY bot_flow_versions.version_number DESC
    LIMIT $3
  `,
  archivePublishedVersions: `
    UPDATE bot_flow_versions
    SET status = 'archived'
    WHERE tenant_id = $1
      AND bot_flow_key = $2
      AND bot_flow_version_key <> $3
      AND status = 'published'
    RETURNING bot_flow_version_key AS "botFlowVersionKey"
  `,
  publishVersion: `
    UPDATE bot_flow_versions
    SET
      status = 'published',
      published_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND bot_flow_key = $2
      AND bot_flow_version_key = $3
      AND status = 'draft'
    RETURNING ${versionColumns}
  `,
  activateFlow: `
    UPDATE bot_flows
    SET
      status = 'active',
      active_version_key = $4,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND bot_flow_key = $2
      AND version = $3
      AND latest_version_key = $4
    RETURNING ${flowColumns}
  `,
});

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return Number(value);
}

function requireBotFlowKey(value: unknown): string {
  if (typeof value !== "string" || !botFlowKeyPattern.test(value)) {
    throw new Error("botFlowKey is invalid");
  }
  return value;
}

function requireBotFlowVersionKey(value: unknown): string {
  if (typeof value !== "string" || !botFlowVersionKeyPattern.test(value)) {
    throw new Error("botFlowVersionKey is invalid");
  }
  return value;
}

function parseFlow(value: unknown): PersistedBotFlow {
  const row = requireExactPostgresRow(value, flowRowKeys);
  const status = botFlowStatuses.find((candidate) => candidate === row.status);
  const botFlowKey = requireBotFlowKey(row.botFlowKey);
  const tenantId = parsePostgresPositiveInteger(row.tenantId);
  const name = row.name;
  const latestVersionKey = requireBotFlowVersionKey(row.latestVersionKey);
  const latestVersionNumber = parsePostgresPositiveInteger(
    row.latestVersionNumber,
  );
  const activeVersionKey = row.activeVersionKey === null
    ? null
    : requireBotFlowVersionKey(row.activeVersionKey);
  const version = parsePostgresPositiveInteger(row.version);
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);

  if (
    !status ||
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.length > 160 ||
    name.trim() !== name ||
    controlCharacterPattern.test(name) ||
    ((status === "draft") !== (activeVersionKey === null)) ||
    updatedAt < createdAt
  ) {
    throw new Error("PostgreSQL returned an invalid bot flow");
  }

  return Object.freeze({
    botFlowKey,
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

function parseDefinition(value: unknown): ValidatedBotFlowDefinition {
  let input = value;
  if (typeof value === "string") {
    try {
      input = JSON.parse(value);
    } catch {
      throw new Error("PostgreSQL returned invalid bot flow definition JSON");
    }
  }
  const validation = validateBotFlowDefinition(input);
  if (!validation.success) {
    throw new Error("PostgreSQL returned an invalid bot flow definition");
  }
  return validation.value;
}

function parseVersion(value: unknown): PersistedBotFlowVersion {
  const row = requireExactPostgresRow(value, versionRowKeys);
  const status = botFlowVersionStatuses.find(
    (candidate) => candidate === row.status,
  );
  const publishedAt = row.publishedAt === null
    ? null
    : parsePostgresTimestamp(row.publishedAt);
  const createdAt = parsePostgresTimestamp(row.createdAt);

  if (!status || ((status === "draft") !== (publishedAt === null))) {
    throw new Error("PostgreSQL returned an invalid bot flow version");
  }

  return Object.freeze({
    botFlowVersionKey: requireBotFlowVersionKey(row.botFlowVersionKey),
    botFlowKey: requireBotFlowKey(row.botFlowKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    versionNumber: parsePostgresPositiveInteger(row.versionNumber),
    status,
    definition: parseDefinition(row.definitionJson),
    publishedAt,
    createdAt,
  });
}

function serializeDefinition(definition: ValidatedBotFlowDefinition): string {
  const payload = JSON.stringify(definition);
  if (new TextEncoder().encode(payload).byteLength > definitionMaximumBytes) {
    throw new Error("bot flow definition is too large");
  }
  return payload;
}

function sameDefinition(
  stored: PersistedBotFlowVersion,
  definition: ValidatedBotFlowDefinition,
): boolean {
  return JSON.stringify(stored.definition) === JSON.stringify(definition);
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

function requireFlowScope(
  flow: PersistedBotFlow,
  tenantId: number,
  botFlowKey: string,
): PersistedBotFlow {
  if (flow.tenantId !== tenantId || flow.botFlowKey !== botFlowKey) {
    throw new Error("PostgreSQL returned a bot flow outside the requested scope");
  }
  return flow;
}

function requireVersionScope(
  version: PersistedBotFlowVersion,
  tenantId: number,
  botFlowKey: string,
  botFlowVersionKey?: string,
): PersistedBotFlowVersion {
  if (
    version.tenantId !== tenantId ||
    version.botFlowKey !== botFlowKey ||
    (botFlowVersionKey !== undefined &&
      version.botFlowVersionKey !== botFlowVersionKey)
  ) {
    throw new Error(
      "PostgreSQL returned a bot flow version outside the requested scope",
    );
  }
  return version;
}

function isExactDraft(
  flow: PersistedBotFlow,
  version: PersistedBotFlowVersion | null,
  input: SaveBotFlowDraftInput,
  definition: ValidatedBotFlowDefinition,
  resultingFlowVersion: number,
): version is PersistedBotFlowVersion {
  return Boolean(
    version &&
    flow.name === definition.name &&
    flow.latestVersionKey === input.botFlowVersionKey &&
    flow.latestVersionNumber === input.versionNumber &&
    flow.version === resultingFlowVersion &&
    version.versionNumber === input.versionNumber &&
    version.status === "draft" &&
    sameDefinition(version, definition),
  );
}

export interface PostgresBotFlowRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

export function createPostgresBotFlowRepository(
  dependencies: Readonly<PostgresBotFlowRepositoryDependencies>,
): BotFlowRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL bot flow repository dependencies are invalid");
  }

  const findByKey: BotFlowRepository["findByKey"] = async (
    tenantIdInput,
    botFlowKeyInput,
  ) => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const botFlowKey = requireBotFlowKey(botFlowKeyInput);
    const row = await loadOne(
      dependencies.queries,
      postgresBotFlowSql.findFlowByKey,
      [tenantId, botFlowKey],
    );
    return row === null
      ? null
      : requireFlowScope(parseFlow(row), tenantId, botFlowKey);
  };

  const findVersionByKey: BotFlowRepository["findVersionByKey"] = async (
    tenantIdInput,
    botFlowKeyInput,
    botFlowVersionKeyInput,
  ) => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const botFlowKey = requireBotFlowKey(botFlowKeyInput);
    const botFlowVersionKey = requireBotFlowVersionKey(botFlowVersionKeyInput);
    const row = await loadOne(
      dependencies.queries,
      postgresBotFlowSql.findVersionByKey,
      [tenantId, botFlowKey, botFlowVersionKey],
    );
    return row === null
      ? null
      : requireVersionScope(
          parseVersion(row),
          tenantId,
          botFlowKey,
          botFlowVersionKey,
        );
  };

  const listFlows = async (
    tenantIdInput: number,
    limitInput: number,
    activeOnly: boolean,
  ): Promise<readonly PersistedBotFlow[]> => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const limit = requirePositiveInteger(limitInput, "limit");
    if (limit > 100) {
      throw new Error("limit must not exceed 100");
    }
    const rows = await loadRows(
      dependencies.queries,
      activeOnly ? postgresBotFlowSql.listActiveFlows : postgresBotFlowSql.listFlows,
      [tenantId, limit],
      limit,
    );
    return Object.freeze(rows.map((row) => {
      const parsed = parseFlow(row);
      const flow = requireFlowScope(parsed, tenantId, parsed.botFlowKey);
      if (activeOnly && flow.status !== "active") {
        throw new Error("PostgreSQL returned a bot flow outside the requested state");
      }
      return flow;
    }));
  };

  const repository: BotFlowRepository = {
    async saveDraft(input) {
      const tenantId = requirePositiveInteger(input?.tenantId, "tenantId");
      const botFlowKey = requireBotFlowKey(input?.botFlowKey);
      const botFlowVersionKey = requireBotFlowVersionKey(
        input?.botFlowVersionKey,
      );
      const versionNumber = requirePositiveInteger(
        input?.versionNumber,
        "versionNumber",
      );
      const expectedFlowVersion = input?.expectedFlowVersion === null
        ? null
        : requirePositiveInteger(
            input?.expectedFlowVersion,
            "expectedFlowVersion",
          );
      const validation = validateBotFlowDefinition(input?.definition);
      if (!validation.success) {
        throw new Error("bot flow definition is invalid");
      }
      const expectedBotFlowKey = await deriveBotFlowKey(
        tenantId,
        validation.value.name,
      );
      const expectedVersionKey = await deriveBotFlowVersionKey(
        tenantId,
        botFlowKey,
        versionNumber,
        validation.value,
      );
      if (
        expectedBotFlowKey !== botFlowKey ||
        expectedVersionKey !== botFlowVersionKey ||
        (expectedFlowVersion === null && versionNumber !== 1)
      ) {
        throw new Error("bot flow draft identity is invalid");
      }
      const normalized: SaveBotFlowDraftInput = {
        tenantId,
        botFlowKey,
        botFlowVersionKey,
        versionNumber,
        expectedFlowVersion,
        definition: validation.value,
      };
      const resultingFlowVersion = expectedFlowVersion === null
        ? 1
        : expectedFlowVersion + 1;
      const definitionJson = serializeDefinition(validation.value);

      return dependencies.transactions.transaction<SaveBotFlowDraftResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          let flow: PersistedBotFlow;
          let outcome: "created" | "updated" | "unchanged";

          if (expectedFlowVersion === null) {
            const insertedRow = await loadOne(
              transaction,
              postgresBotFlowSql.insertFlow,
              [botFlowKey, tenantId, validation.value.name, botFlowVersionKey],
            );
            if (insertedRow !== null) {
              flow = requireFlowScope(parseFlow(insertedRow), tenantId, botFlowKey);
              outcome = "created";
            } else {
              const existingRow = await loadOne(
                transaction,
                postgresBotFlowSql.findFlowByKeyForUpdate,
                [tenantId, botFlowKey],
              );
              if (existingRow === null) {
                return Object.freeze({ outcome: "conflict" as const });
              }
              flow = requireFlowScope(parseFlow(existingRow), tenantId, botFlowKey);
              outcome = "unchanged";
            }
          } else {
            const currentRow = await loadOne(
              transaction,
              postgresBotFlowSql.findFlowByKeyForUpdate,
              [tenantId, botFlowKey],
            );
            if (currentRow === null) {
              return Object.freeze({ outcome: "not-found" as const });
            }
            flow = requireFlowScope(parseFlow(currentRow), tenantId, botFlowKey);
            outcome = "updated";
          }

          const existingVersionRow = await loadOne(
            transaction,
            postgresBotFlowSql.findVersionByKeyForUpdate,
            [tenantId, botFlowKey, botFlowVersionKey],
          );
          const existingVersion = existingVersionRow === null
            ? null
            : requireVersionScope(
                parseVersion(existingVersionRow),
                tenantId,
                botFlowKey,
                botFlowVersionKey,
              );
          if (
            isExactDraft(
              flow,
              existingVersion,
              normalized,
              validation.value,
              resultingFlowVersion,
            )
          ) {
            return Object.freeze({
              outcome: "unchanged" as const,
              flow,
              draftVersion: existingVersion,
            });
          }

          if (
            outcome === "unchanged" ||
            (expectedFlowVersion !== null &&
              (flow.version !== expectedFlowVersion ||
                flow.name !== validation.value.name ||
                flow.latestVersionNumber !== versionNumber - 1)) ||
            existingVersion !== null
          ) {
            return Object.freeze({ outcome: "conflict" as const });
          }

          const versionRow = await loadOne(
            transaction,
            postgresBotFlowSql.insertVersion,
            [
              botFlowVersionKey,
              botFlowKey,
              tenantId,
              versionNumber,
              definitionJson,
            ],
          );
          if (versionRow === null) {
            throw new Error("PostgreSQL bot flow version write failed");
          }
          const draftVersion = requireVersionScope(
            parseVersion(versionRow),
            tenantId,
            botFlowKey,
            botFlowVersionKey,
          );
          if (
            draftVersion.status !== "draft" ||
            draftVersion.versionNumber !== versionNumber ||
            !sameDefinition(draftVersion, validation.value)
          ) {
            throw new Error("PostgreSQL returned a mismatched bot flow version");
          }

          if (outcome === "updated" && expectedFlowVersion !== null) {
            const updatedRow = await loadOne(
              transaction,
              postgresBotFlowSql.updateFlowDraft,
              [
                tenantId,
                botFlowKey,
                expectedFlowVersion,
                botFlowVersionKey,
                versionNumber,
                validation.value.name,
              ],
            );
            if (updatedRow === null) {
              throw new Error("PostgreSQL bot flow draft transition failed");
            }
            flow = requireFlowScope(parseFlow(updatedRow), tenantId, botFlowKey);
          }

          if (!isExactDraft(
            flow,
            draftVersion,
            normalized,
            validation.value,
            resultingFlowVersion,
          )) {
            throw new Error("PostgreSQL returned a mismatched bot flow draft");
          }
          return Object.freeze({ outcome, flow, draftVersion });
        },
      );
    },

    async publishDraft(
      tenantIdInput,
      botFlowKeyInput,
      botFlowVersionKeyInput,
      expectedFlowVersionInput,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const botFlowKey = requireBotFlowKey(botFlowKeyInput);
      const botFlowVersionKey = requireBotFlowVersionKey(botFlowVersionKeyInput);
      const expectedFlowVersion = requirePositiveInteger(
        expectedFlowVersionInput,
        "expectedFlowVersion",
      );
      const resultingFlowVersion = expectedFlowVersion + 1;

      return dependencies.transactions.transaction<PublishBotFlowDraftResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const flowRow = await loadOne(
            transaction,
            postgresBotFlowSql.findFlowByKeyForUpdate,
            [tenantId, botFlowKey],
          );
          if (flowRow === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          let flow = requireFlowScope(parseFlow(flowRow), tenantId, botFlowKey);
          const versionRow = await loadOne(
            transaction,
            postgresBotFlowSql.findVersionByKeyForUpdate,
            [tenantId, botFlowKey, botFlowVersionKey],
          );
          const target = versionRow === null
            ? null
            : requireVersionScope(
                parseVersion(versionRow),
                tenantId,
                botFlowKey,
                botFlowVersionKey,
              );

          if (
            flow.status === "active" &&
            flow.activeVersionKey === botFlowVersionKey &&
            flow.version === resultingFlowVersion &&
            target?.status === "published"
          ) {
            return Object.freeze({
              outcome: "unchanged" as const,
              flow,
              publishedVersion: target,
            });
          }
          if (flow.version !== expectedFlowVersion) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          if (
            target === null ||
            target.status !== "draft" ||
            flow.latestVersionKey !== botFlowVersionKey
          ) {
            return Object.freeze({ outcome: "invalid-state" as const });
          }

          const archivedRows = await loadRows(
            transaction,
            postgresBotFlowSql.archivePublishedVersions,
            [tenantId, botFlowKey, botFlowVersionKey],
            1,
          );
          for (const value of archivedRows) {
            const row = requireExactPostgresRow(value, ["botFlowVersionKey"]);
            if (requireBotFlowVersionKey(row.botFlowVersionKey) === botFlowVersionKey) {
              throw new Error("PostgreSQL archived the target bot flow version");
            }
          }
          const publishedRow = await loadOne(
            transaction,
            postgresBotFlowSql.publishVersion,
            [tenantId, botFlowKey, botFlowVersionKey],
          );
          const activatedRow = await loadOne(
            transaction,
            postgresBotFlowSql.activateFlow,
            [tenantId, botFlowKey, expectedFlowVersion, botFlowVersionKey],
          );
          if (publishedRow === null || activatedRow === null) {
            throw new Error("PostgreSQL bot flow publication transition failed");
          }
          const publishedVersion = requireVersionScope(
            parseVersion(publishedRow),
            tenantId,
            botFlowKey,
            botFlowVersionKey,
          );
          flow = requireFlowScope(parseFlow(activatedRow), tenantId, botFlowKey);
          if (
            publishedVersion.status !== "published" ||
            flow.status !== "active" ||
            flow.activeVersionKey !== botFlowVersionKey ||
            flow.version !== resultingFlowVersion
          ) {
            throw new Error("PostgreSQL returned a mismatched bot flow publication");
          }
          return Object.freeze({
            outcome: "updated" as const,
            flow,
            publishedVersion,
          });
        },
      );
    },

    findByKey,
    findVersionByKey,
    listByTenant(tenantId, limit) {
      return listFlows(tenantId, limit, false);
    },
    listActiveByTenant(tenantId, limit) {
      return listFlows(tenantId, limit, true);
    },
    async listVersions(tenantIdInput, botFlowKeyInput, limitInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const botFlowKey = requireBotFlowKey(botFlowKeyInput);
      const limit = requirePositiveInteger(limitInput, "limit");
      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }
      const rows = await loadRows(
        dependencies.queries,
        postgresBotFlowSql.listVersions,
        [tenantId, botFlowKey, limit],
        limit,
      );
      return Object.freeze(rows.map((row) =>
        requireVersionScope(parseVersion(row), tenantId, botFlowKey)));
    },
  };

  return Object.freeze(repository);
}
