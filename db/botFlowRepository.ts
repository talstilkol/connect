import {
  botFlowStatuses,
  botFlowVersionStatuses,
  type PersistedBotFlow,
  type PersistedBotFlowVersion,
  type ValidatedBotFlowDefinition,
} from "../shared/domain/botFlow.ts";
import {
  validateBotFlowDefinition,
} from "../shared/validation/botFlowDefinition.ts";
import {
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";
import type {
  D1DatabaseBinding,
  D1Result,
} from "./d1.ts";

const BOT_FLOW_DEFINITION_MAXIMUM_BYTES =
  1_000_000;
const BOT_FLOW_KEY_PATTERN =
  /^bot_flow_v1_[0-9a-f]{64}$/;
const BOT_FLOW_VERSION_KEY_PATTERN =
  /^bot_flow_version_v1_[0-9a-f]{64}$/;

const BOT_FLOW_COLUMNS_SQL = `
  bot_flow_key AS botFlowKey,
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

const BOT_FLOW_VERSION_COLUMNS_SQL = `
  bot_flow_version_key AS botFlowVersionKey,
  bot_flow_key AS botFlowKey,
  tenant_id AS tenantId,
  version_number AS versionNumber,
  status,
  definition_json AS definitionJson,
  published_at AS publishedAt,
  created_at AS createdAt
`;

const INSERT_BOT_FLOW_SQL = `
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
  VALUES (?1, ?2, ?3, 'draft', ?4, 1, NULL, 1)
  ON CONFLICT (bot_flow_key) DO NOTHING
`;

const UPDATE_BOT_FLOW_DRAFT_SQL = `
  UPDATE bot_flows
  SET
    latest_version_key = ?4,
    latest_version_number = ?5,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND bot_flow_key = ?2
    AND version = ?3
    AND name = ?6
    AND latest_version_number = ?5 - 1
`;

const INSERT_BOT_FLOW_VERSION_SQL = `
  INSERT INTO bot_flow_versions (
    bot_flow_version_key,
    bot_flow_key,
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
  FROM bot_flows
  WHERE tenant_id = ?1
    AND bot_flow_key = ?2
    AND latest_version_key = ?3
    AND latest_version_number = ?4
    AND version = ?6
  ON CONFLICT DO NOTHING
`;

const ACTIVATE_BOT_FLOW_VERSION_SQL = `
  UPDATE bot_flows
  SET
    status = 'active',
    active_version_key = ?4,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND bot_flow_key = ?2
    AND version = ?3
    AND latest_version_key = ?4
    AND EXISTS (
      SELECT 1
      FROM bot_flow_versions
      WHERE bot_flow_versions.tenant_id = ?1
        AND bot_flow_versions.bot_flow_key = ?2
        AND bot_flow_versions.bot_flow_version_key = ?4
        AND bot_flow_versions.status = 'draft'
    )
`;

const ARCHIVE_ACTIVE_BOT_FLOW_VERSION_SQL = `
  UPDATE bot_flow_versions
  SET status = 'archived'
  WHERE tenant_id = ?1
    AND bot_flow_key = ?2
    AND bot_flow_version_key <> ?4
    AND status = 'published'
    AND EXISTS (
      SELECT 1
      FROM bot_flows
      WHERE bot_flows.tenant_id = ?1
        AND bot_flows.bot_flow_key = ?2
        AND bot_flows.active_version_key = ?4
        AND bot_flows.version = ?5
    )
`;

const PUBLISH_BOT_FLOW_VERSION_SQL = `
  UPDATE bot_flow_versions
  SET
    status = 'published',
    published_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND bot_flow_key = ?2
    AND bot_flow_version_key = ?4
    AND status = 'draft'
    AND EXISTS (
      SELECT 1
      FROM bot_flows
      WHERE bot_flows.tenant_id = ?1
        AND bot_flows.bot_flow_key = ?2
        AND bot_flows.active_version_key = ?4
        AND bot_flows.version = ?5
    )
`;

const SELECT_BOT_FLOW_BY_KEY_SQL = `
  SELECT
    ${BOT_FLOW_COLUMNS_SQL}
  FROM bot_flows
  WHERE tenant_id = ?1
    AND bot_flow_key = ?2
  LIMIT 1
`;

const SELECT_BOT_FLOW_VERSION_BY_KEY_SQL = `
  SELECT
    ${BOT_FLOW_VERSION_COLUMNS_SQL}
  FROM bot_flow_versions
  WHERE tenant_id = ?1
    AND bot_flow_key = ?2
    AND bot_flow_version_key = ?3
  LIMIT 1
`;

const LIST_BOT_FLOWS_BY_TENANT_SQL = `
  SELECT
    ${BOT_FLOW_COLUMNS_SQL}
  FROM bot_flows
  WHERE tenant_id = ?1
  ORDER BY updated_at DESC, bot_flow_key ASC
  LIMIT ?2
`;

const LIST_ACTIVE_BOT_FLOWS_BY_TENANT_SQL = `
  SELECT
    ${BOT_FLOW_COLUMNS_SQL}
  FROM bot_flows
  WHERE tenant_id = ?1
    AND status = 'active'
  ORDER BY updated_at DESC, bot_flow_key ASC
  LIMIT ?2
`;

const LIST_BOT_FLOW_VERSIONS_SQL = `
  SELECT
    ${BOT_FLOW_VERSION_COLUMNS_SQL}
  FROM bot_flow_versions
  WHERE tenant_id = ?1
    AND bot_flow_key = ?2
  ORDER BY version_number DESC
  LIMIT ?3
`;

interface BotFlowRow {
  botFlowKey: string;
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

interface BotFlowVersionRow {
  botFlowVersionKey: string;
  botFlowKey: string;
  tenantId: number;
  versionNumber: number;
  status: string;
  definitionJson: string;
  publishedAt: string | null;
  createdAt: string;
}

export interface SaveBotFlowDraftInput {
  tenantId: number;
  botFlowKey: string;
  botFlowVersionKey: string;
  versionNumber: number;
  expectedFlowVersion: number | null;
  definition: unknown;
}

export type SaveBotFlowDraftResult =
  | {
      outcome:
        | "created"
        | "updated"
        | "unchanged";
      flow: PersistedBotFlow;
      draftVersion: PersistedBotFlowVersion;
    }
  | {
      outcome: "not-found" | "conflict";
    };

export type PublishBotFlowDraftResult =
  | {
      outcome: "updated" | "unchanged";
      flow: PersistedBotFlow;
      publishedVersion: PersistedBotFlowVersion;
    }
  | {
      outcome:
        | "not-found"
        | "conflict"
        | "invalid-state";
    };

export interface BotFlowRepository {
  saveDraft(
    input: SaveBotFlowDraftInput,
  ): Promise<SaveBotFlowDraftResult>;
  publishDraft(
    tenantId: number,
    botFlowKey: string,
    botFlowVersionKey: string,
    expectedFlowVersion: number,
  ): Promise<PublishBotFlowDraftResult>;
  findByKey(
    tenantId: number,
    botFlowKey: string,
  ): Promise<PersistedBotFlow | null>;
  findVersionByKey(
    tenantId: number,
    botFlowKey: string,
    botFlowVersionKey: string,
  ): Promise<PersistedBotFlowVersion | null>;
  listByTenant(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedBotFlow[]>;
  listActiveByTenant(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedBotFlow[]>;
  listVersions(
    tenantId: number,
    botFlowKey: string,
    limit: number,
  ): Promise<readonly PersistedBotFlowVersion[]>;
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

function assertBotFlowKey(value: string): void {
  if (!BOT_FLOW_KEY_PATTERN.test(value)) {
    throw new Error("botFlowKey is invalid");
  }
}

function assertBotFlowVersionKey(
  value: string,
): void {
  if (!BOT_FLOW_VERSION_KEY_PATTERN.test(value)) {
    throw new Error(
      "botFlowVersionKey is invalid",
    );
  }
}

function assertLimit(
  value: number,
  maximum: number,
): void {
  assertPositiveInteger(value, "limit");

  if (value > maximum) {
    throw new Error(
      `limit must not exceed ${maximum}`,
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

function parseBotFlowRow(
  row: BotFlowRow,
): PersistedBotFlow {
  const status = botFlowStatuses.find(
    (candidate) => candidate === row.status,
  );

  if (
    !BOT_FLOW_KEY_PATTERN.test(row.botFlowKey) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !isNonBlankText(row.name) ||
    row.name.length > 160 ||
    !status ||
    !BOT_FLOW_VERSION_KEY_PATTERN.test(
      row.latestVersionKey,
    ) ||
    !Number.isSafeInteger(
      row.latestVersionNumber,
    ) ||
    row.latestVersionNumber <= 0 ||
    (row.activeVersionKey !== null &&
      !BOT_FLOW_VERSION_KEY_PATTERN.test(
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
      "D1 returned an invalid bot flow",
    );
  }

  return {
    botFlowKey: row.botFlowKey,
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

function parseBotFlowVersionRow(
  row: BotFlowVersionRow,
): PersistedBotFlowVersion {
  let definitionInput: unknown;

  try {
    definitionInput = JSON.parse(
      row.definitionJson,
    );
  } catch {
    throw new Error(
      "D1 returned invalid bot flow definition JSON",
    );
  }

  const definition =
    validateBotFlowDefinition(definitionInput);
  const status = botFlowVersionStatuses.find(
    (candidate) => candidate === row.status,
  );

  if (
    !BOT_FLOW_VERSION_KEY_PATTERN.test(
      row.botFlowVersionKey,
    ) ||
    !BOT_FLOW_KEY_PATTERN.test(row.botFlowKey) ||
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
      "D1 returned an invalid bot flow version",
    );
  }

  return {
    botFlowVersionKey:
      row.botFlowVersionKey,
    botFlowKey: row.botFlowKey,
    tenantId: row.tenantId,
    versionNumber: row.versionNumber,
    status,
    definition: definition.value,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
  };
}

function serializeDefinition(
  definition: ValidatedBotFlowDefinition,
): string {
  const payload = JSON.stringify(definition);

  if (
    new TextEncoder().encode(payload).byteLength >
    BOT_FLOW_DEFINITION_MAXIMUM_BYTES
  ) {
    throw new Error(
      "bot flow definition is too large",
    );
  }

  return payload;
}

function batchSucceeded(
  results: readonly D1Result[],
  expectedLength: number,
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
  stored: PersistedBotFlowVersion,
  definition: ValidatedBotFlowDefinition,
): boolean {
  return (
    JSON.stringify(stored.definition) ===
    JSON.stringify(definition)
  );
}

export function createBotFlowRepository(
  database: D1DatabaseBinding,
): BotFlowRepository {
  const listFlows = async (
    tenantId: number,
    limit: number,
    activeOnly: boolean,
  ): Promise<readonly PersistedBotFlow[]> => {
    assertPositiveInteger(tenantId, "tenantId");
    assertLimit(limit, 100);

    const result = await database
      .prepare(
        activeOnly
          ? LIST_ACTIVE_BOT_FLOWS_BY_TENANT_SQL
          : LIST_BOT_FLOWS_BY_TENANT_SQL,
      )
      .bind(tenantId, limit)
      .all<BotFlowRow>();

    if (!result.success) {
      throw new Error(
        result.error ??
          "D1 bot flow list read failed",
      );
    }

    return (result.results ?? []).map(
      (row) => {
        const flow = parseBotFlowRow(row);

        if (
          flow.tenantId !== tenantId ||
          (activeOnly &&
            flow.status !== "active")
        ) {
          throw new Error(
            "D1 returned a bot flow outside the requested tenant or state",
          );
        }

        return flow;
      },
    );
  };

  const findByKey: BotFlowRepository["findByKey"] =
    async (tenantId, botFlowKey) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertBotFlowKey(botFlowKey);

      const row = await database
        .prepare(SELECT_BOT_FLOW_BY_KEY_SQL)
        .bind(tenantId, botFlowKey)
        .first<BotFlowRow>();

      if (!row) {
        return null;
      }

      const flow = parseBotFlowRow(row);

      if (
        flow.tenantId !== tenantId ||
        flow.botFlowKey !== botFlowKey
      ) {
        throw new Error(
          "D1 returned a bot flow outside the requested scope",
        );
      }

      return flow;
    };

  const findVersionByKey: BotFlowRepository["findVersionByKey"] =
    async (
      tenantId,
      botFlowKey,
      botFlowVersionKey,
    ) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertBotFlowKey(botFlowKey);
      assertBotFlowVersionKey(
        botFlowVersionKey,
      );

      const row = await database
        .prepare(
          SELECT_BOT_FLOW_VERSION_BY_KEY_SQL,
        )
        .bind(
          tenantId,
          botFlowKey,
          botFlowVersionKey,
        )
        .first<BotFlowVersionRow>();

      if (!row) {
        return null;
      }

      const version = parseBotFlowVersionRow(row);

      if (
        version.tenantId !== tenantId ||
        version.botFlowKey !== botFlowKey ||
        version.botFlowVersionKey !==
          botFlowVersionKey
      ) {
        throw new Error(
          "D1 returned a bot flow version outside the requested scope",
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
      assertBotFlowKey(input.botFlowKey);
      assertBotFlowVersionKey(
        input.botFlowVersionKey,
      );
      assertPositiveInteger(
        input.versionNumber,
        "versionNumber",
      );

      if (
        input.expectedFlowVersion !== null
      ) {
        assertPositiveInteger(
          input.expectedFlowVersion,
          "expectedFlowVersion",
        );
      }

      const validation =
        validateBotFlowDefinition(
          input.definition,
        );

      if (!validation.success) {
        throw new Error(
          "bot flow definition is invalid",
        );
      }

      const expectedBotFlowKey =
        await deriveBotFlowKey(
          input.tenantId,
          validation.value.name,
        );
      const expectedVersionKey =
        await deriveBotFlowVersionKey(
          input.tenantId,
          input.botFlowKey,
          input.versionNumber,
          validation.value,
        );

      if (
        expectedBotFlowKey !==
          input.botFlowKey ||
        expectedVersionKey !==
          input.botFlowVersionKey ||
        (input.expectedFlowVersion === null &&
          input.versionNumber !== 1)
      ) {
        throw new Error(
          "bot flow draft identity is invalid",
        );
      }

      const definitionJson =
        serializeDefinition(validation.value);
      const resultingFlowVersion =
        input.expectedFlowVersion === null
          ? 1
          : input.expectedFlowVersion + 1;
      const writeStatement =
        input.expectedFlowVersion === null
          ? database
              .prepare(INSERT_BOT_FLOW_SQL)
              .bind(
                input.botFlowKey,
                input.tenantId,
                validation.value.name,
                input.botFlowVersionKey,
              )
          : database
              .prepare(
                UPDATE_BOT_FLOW_DRAFT_SQL,
              )
              .bind(
                input.tenantId,
                input.botFlowKey,
                input.expectedFlowVersion,
                input.botFlowVersionKey,
                input.versionNumber,
                validation.value.name,
              );

      let results: readonly D1Result[];

      try {
        results = await database.batch([
          writeStatement,
          database
            .prepare(
              INSERT_BOT_FLOW_VERSION_SQL,
            )
            .bind(
              input.tenantId,
              input.botFlowKey,
              input.botFlowVersionKey,
              input.versionNumber,
              definitionJson,
              resultingFlowVersion,
            ),
        ]);
      } catch {
        throw new Error(
          "D1 bot flow draft write failed",
        );
      }

      if (!batchSucceeded(results, 2)) {
        const failedResult = results.find(
          (result) => !result.success,
        );

        throw new Error(
          failedResult?.error ??
            "D1 bot flow draft write failed",
        );
      }

      const [flow, draftVersion] =
        await Promise.all([
          findByKey(
            input.tenantId,
            input.botFlowKey,
          ),
          findVersionByKey(
            input.tenantId,
            input.botFlowKey,
            input.botFlowVersionKey,
          ),
        ]);

      const exactStoredDraft =
        flow !== null &&
        draftVersion !== null &&
        flow.name === validation.value.name &&
        flow.latestVersionKey ===
          input.botFlowVersionKey &&
        flow.latestVersionNumber ===
          input.versionNumber &&
        flow.version === resultingFlowVersion &&
        draftVersion.versionNumber ===
          input.versionNumber &&
        draftVersion.status === "draft" &&
        sameDefinition(
          draftVersion,
          validation.value,
        );

      if (exactStoredDraft && flow && draftVersion) {
        const changed =
          firstStatementChanged(results);

        return {
          outcome: changed
            ? input.expectedFlowVersion === null
              ? "created"
              : "updated"
            : "unchanged",
          flow,
          draftVersion,
        };
      }

      if (!flow) {
        return {
          outcome:
            input.expectedFlowVersion === null
              ? "conflict"
              : "not-found",
        };
      }

      return { outcome: "conflict" };
    },

    async publishDraft(
      tenantId,
      botFlowKey,
      botFlowVersionKey,
      expectedFlowVersion,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertBotFlowKey(botFlowKey);
      assertBotFlowVersionKey(
        botFlowVersionKey,
      );
      assertPositiveInteger(
        expectedFlowVersion,
        "expectedFlowVersion",
      );
      const resultingFlowVersion =
        expectedFlowVersion + 1;
      let results: readonly D1Result[];

      try {
        results = await database.batch([
          database
            .prepare(
              ACTIVATE_BOT_FLOW_VERSION_SQL,
            )
            .bind(
              tenantId,
              botFlowKey,
              expectedFlowVersion,
              botFlowVersionKey,
            ),
          database
            .prepare(
              ARCHIVE_ACTIVE_BOT_FLOW_VERSION_SQL,
            )
            .bind(
              tenantId,
              botFlowKey,
              expectedFlowVersion,
              botFlowVersionKey,
              resultingFlowVersion,
            ),
          database
            .prepare(
              PUBLISH_BOT_FLOW_VERSION_SQL,
            )
            .bind(
              tenantId,
              botFlowKey,
              expectedFlowVersion,
              botFlowVersionKey,
              resultingFlowVersion,
            ),
        ]);
      } catch {
        throw new Error(
          "D1 bot flow publication failed",
        );
      }

      if (!batchSucceeded(results, 3)) {
        const failedResult = results.find(
          (result) => !result.success,
        );

        throw new Error(
          failedResult?.error ??
            "D1 bot flow publication failed",
        );
      }

      const [flow, publishedVersion] =
        await Promise.all([
          findByKey(tenantId, botFlowKey),
          findVersionByKey(
            tenantId,
            botFlowKey,
            botFlowVersionKey,
          ),
        ]);

      const exactPublication =
        flow !== null &&
        publishedVersion !== null &&
        flow.status === "active" &&
        flow.activeVersionKey ===
          botFlowVersionKey &&
        flow.version === resultingFlowVersion &&
        publishedVersion.status === "published";

      if (
        exactPublication &&
        flow &&
        publishedVersion
      ) {
        return {
          outcome: firstStatementChanged(results)
            ? "updated"
            : "unchanged",
          flow,
          publishedVersion,
        };
      }

      if (!flow) {
        return { outcome: "not-found" };
      }

      if (flow.version !== expectedFlowVersion) {
        return { outcome: "conflict" };
      }

      return { outcome: "invalid-state" };
    },

    findByKey,

    findVersionByKey,

    async listByTenant(tenantId, limit) {
      return listFlows(
        tenantId,
        limit,
        false,
      );
    },

    async listActiveByTenant(tenantId, limit) {
      return listFlows(
        tenantId,
        limit,
        true,
      );
    },

    async listVersions(
      tenantId,
      botFlowKey,
      limit,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertBotFlowKey(botFlowKey);
      assertLimit(limit, 100);

      const result = await database
        .prepare(LIST_BOT_FLOW_VERSIONS_SQL)
        .bind(tenantId, botFlowKey, limit)
        .all<BotFlowVersionRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 bot flow version list read failed",
        );
      }

      return (result.results ?? []).map(
        (row) => {
          const version =
            parseBotFlowVersionRow(row);

          if (
            version.tenantId !== tenantId ||
            version.botFlowKey !== botFlowKey
          ) {
            throw new Error(
              "D1 returned a bot flow version outside the requested scope",
            );
          }

          return version;
        },
      );
    },
  };
}
