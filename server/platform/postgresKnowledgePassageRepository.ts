import type {
  KnowledgePassageRepository,
  ProcessedKnowledgePassageInput,
  StoreProcessedKnowledgeInput,
} from "../../db/knowledgePassageRepository.ts";
import type {
  PersistedKnowledgePassage,
} from "../../shared/domain/aiAgent.ts";
import {
  deriveKnowledgePassageKey,
} from "../ai/aiAgentKey.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  parsePostgresKnowledgeSourceRow,
  postgresKnowledgeSourceColumns,
} from "./postgresKnowledgeSourceRepository.ts";
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

const passageKeyPattern = /^knowledge_passage_v1_[0-9a-f]{64}$/;
const sourceKeyPattern = /^knowledge_source_v1_[0-9a-f]{64}$/;
const contentDigestPattern = /^[0-9a-f]{64}$/;
const unsafeControlCharacters =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const maximumPassagesPerSource = 1_000;
const maximumPassageContentLength = 16_384;

const passageRowKeys = Object.freeze([
  "content",
  "contentSha256",
  "createdAt",
  "passageKey",
  "passageOrdinal",
  "sourceKey",
  "tenantId",
]);

const passageColumns = `
  knowledge_passages.passage_key AS "passageKey",
  knowledge_passages.tenant_id AS "tenantId",
  knowledge_passages.source_key AS "sourceKey",
  knowledge_passages.passage_ordinal AS "passageOrdinal",
  knowledge_passages.content_sha256 AS "contentSha256",
  knowledge_passages.content,
  knowledge_passages.created_at AS "createdAt"
`;

export const postgresKnowledgePassageSql = Object.freeze({
  findSourceForUpdate: `
    SELECT ${postgresKnowledgeSourceColumns}
    FROM knowledge_sources
    WHERE knowledge_sources.tenant_id = $1
      AND knowledge_sources.source_key = $2
    FOR UPDATE
  `,
  listBySource: `
    SELECT ${passageColumns}
    FROM knowledge_passages
    WHERE knowledge_passages.tenant_id = $1
      AND knowledge_passages.source_key = $2
    ORDER BY knowledge_passages.passage_ordinal ASC
  `,
  insertPassages: `
    INSERT INTO knowledge_passages (
      passage_key,
      tenant_id,
      source_key,
      passage_ordinal,
      content_sha256,
      content
    )
    SELECT
      item.value ->> 'passageKey',
      $1,
      $2,
      (item.value ->> 'passageOrdinal')::integer,
      item.value ->> 'contentSha256',
      item.value ->> 'content'
    FROM jsonb_array_elements($3::jsonb) AS item(value)
    ON CONFLICT DO NOTHING
    RETURNING ${passageColumns}
  `,
  markSourceReady: `
    UPDATE knowledge_sources
    SET
      status = 'ready',
      last_error_code = NULL,
      ready_at = date_trunc('milliseconds', CURRENT_TIMESTAMP),
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND source_key = $2
      AND version = $3
      AND status = 'scanning'
      AND (
        SELECT count(*)
        FROM knowledge_passages
        WHERE tenant_id = $1
          AND source_key = $2
      ) = $4
    RETURNING ${postgresKnowledgeSourceColumns}
  `,
  listApprovedBySourceKeys: `
    SELECT ${passageColumns.replaceAll("knowledge_passages", "passage")}
    FROM knowledge_passages AS passage
    INNER JOIN knowledge_sources AS source
      ON source.tenant_id = passage.tenant_id
      AND source.source_key = passage.source_key
    INNER JOIN jsonb_array_elements_text($2::jsonb) AS selected(source_key)
      ON selected.source_key = passage.source_key
    WHERE passage.tenant_id = $1
      AND source.status = 'ready'
    ORDER BY passage.source_key ASC, passage.passage_ordinal ASC
    LIMIT $3
  `,
});

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return Number(value);
}

function requireSourceKey(value: unknown): string {
  if (typeof value !== "string" || !sourceKeyPattern.test(value)) {
    throw new Error("sourceKey is invalid");
  }
  return value;
}

async function parsePassage(
  value: unknown,
  tenantId: number,
  allowedSourceKeys: ReadonlySet<string>,
): Promise<PersistedKnowledgePassage> {
  const row = requireExactPostgresRow(value, passageRowKeys);
  const passageKey = row.passageKey;
  const sourceKey = row.sourceKey;
  const storedTenantId = parsePostgresPositiveInteger(row.tenantId);
  const passageOrdinal = parsePostgresPositiveInteger(row.passageOrdinal);
  const contentSha256 = row.contentSha256;
  const content = row.content;
  const createdAt = parsePostgresTimestamp(row.createdAt);

  if (
    typeof passageKey !== "string" ||
    !passageKeyPattern.test(passageKey) ||
    typeof sourceKey !== "string" ||
    !sourceKeyPattern.test(sourceKey) ||
    storedTenantId !== tenantId ||
    !allowedSourceKeys.has(sourceKey) ||
    typeof contentSha256 !== "string" ||
    !contentDigestPattern.test(contentSha256) ||
    typeof content !== "string" ||
    content.length === 0 ||
    content.length > maximumPassageContentLength ||
    content !== content.trim() ||
    unsafeControlCharacters.test(content)
  ) {
    throw new Error(
      "PostgreSQL returned a knowledge passage outside the requested scope",
    );
  }

  const digest = await sha256Hex(new TextEncoder().encode(content));
  const expectedKey = await deriveKnowledgePassageKey(
    storedTenantId,
    sourceKey,
    passageOrdinal,
    digest,
  );
  if (digest !== contentSha256 || expectedKey !== passageKey) {
    throw new Error("PostgreSQL returned an invalid knowledge passage identity");
  }

  return Object.freeze({
    passageKey,
    tenantId: storedTenantId,
    sourceKey,
    passageOrdinal,
    contentSha256,
    content,
    createdAt,
  });
}

async function validatePassages(
  tenantId: number,
  sourceKey: string,
  passages: readonly ProcessedKnowledgePassageInput[],
): Promise<readonly ProcessedKnowledgePassageInput[]> {
  if (
    !Array.isArray(passages) ||
    passages.length === 0 ||
    passages.length > maximumPassagesPerSource
  ) {
    throw new Error("passages must contain between 1 and 1000 items");
  }

  const validated: ProcessedKnowledgePassageInput[] = [];
  const seenKeys = new Set<string>();
  const seenOrdinals = new Set<number>();
  for (const passage of passages) {
    const ordinal = requirePositiveInteger(
      passage.passageOrdinal,
      "passageOrdinal",
    );
    if (ordinal > passages.length || typeof passage.content !== "string") {
      throw new Error("knowledge passage ordinal or content is invalid");
    }
    const content = passage.content.trim();
    if (
      content.length === 0 ||
      content.length > maximumPassageContentLength ||
      content !== passage.content ||
      unsafeControlCharacters.test(content)
    ) {
      throw new Error("knowledge passage content is invalid");
    }
    const digest = await sha256Hex(new TextEncoder().encode(content));
    const expectedKey = await deriveKnowledgePassageKey(
      tenantId,
      sourceKey,
      ordinal,
      digest,
    );
    if (
      passage.contentSha256 !== digest ||
      passage.passageKey !== expectedKey ||
      seenKeys.has(passage.passageKey) ||
      seenOrdinals.has(ordinal)
    ) {
      throw new Error("knowledge passage identity is invalid");
    }
    seenKeys.add(passage.passageKey);
    seenOrdinals.add(ordinal);
    validated.push(Object.freeze({
      passageKey: passage.passageKey,
      passageOrdinal: ordinal,
      contentSha256: digest,
      content,
    }));
  }
  for (let ordinal = 1; ordinal <= validated.length; ordinal += 1) {
    if (!seenOrdinals.has(ordinal)) {
      throw new Error("knowledge passage ordinals must be contiguous");
    }
  }
  return Object.freeze(
    validated.sort((left, right) =>
      left.passageOrdinal - right.passageOrdinal),
  );
}

function passagesMatch(
  stored: readonly PersistedKnowledgePassage[],
  expected: readonly ProcessedKnowledgePassageInput[],
): boolean {
  return stored.length === expected.length && stored.every((passage, index) => {
    const candidate = expected[index];
    return candidate !== undefined &&
      passage.passageKey === candidate.passageKey &&
      passage.passageOrdinal === candidate.passageOrdinal &&
      passage.contentSha256 === candidate.contentSha256 &&
      passage.content === candidate.content;
  });
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

async function listBySource(
  queries: PostgresQueryExecutor,
  tenantId: number,
  sourceKey: string,
): Promise<readonly PersistedKnowledgePassage[]> {
  const rows = await loadRows(
    queries,
    postgresKnowledgePassageSql.listBySource,
    [tenantId, sourceKey],
    maximumPassagesPerSource,
  );
  const allowed = new Set([sourceKey]);
  return Promise.all(rows.map((row) => parsePassage(row, tenantId, allowed)));
}

function validateSourceKeys(sourceKeys: readonly string[]): void {
  if (
    !Array.isArray(sourceKeys) ||
    sourceKeys.length > 100 ||
    sourceKeys.some((sourceKey) => !sourceKeyPattern.test(sourceKey)) ||
    new Set(sourceKeys).size !== sourceKeys.length
  ) {
    throw new Error("sourceKeys are invalid");
  }
}

export function createPostgresKnowledgePassageRepository(
  dependencies: Readonly<{
    queries: PostgresQueryExecutor;
    transactions: PostgresTransactionManager;
  }>,
): KnowledgePassageRepository {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "queries,transactions" ||
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL knowledge passage dependencies are invalid");
  }

  const repository: KnowledgePassageRepository = {
    async storeProcessedAndMarkReady(input: StoreProcessedKnowledgeInput) {
      const tenantId = requirePositiveInteger(input.tenantId, "tenantId");
      const sourceKey = requireSourceKey(input.sourceKey);
      const expectedVersion = requirePositiveInteger(
        input.expectedSourceVersion,
        "expectedSourceVersion",
      );
      const passages = await validatePassages(
        tenantId,
        sourceKey,
        input.passages,
      );

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const locked = await loadOne(
            transaction,
            postgresKnowledgePassageSql.findSourceForUpdate,
            [tenantId, sourceKey],
          );
          if (locked === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          const source = await parsePostgresKnowledgeSourceRow(
            locked,
            tenantId,
            sourceKey,
          );
          if (
            source.version === expectedVersion + 1 &&
            source.status === "ready"
          ) {
            const stored = await listBySource(
              transaction,
              tenantId,
              sourceKey,
            );
            return passagesMatch(stored, passages)
              ? Object.freeze({
                  outcome: "unchanged" as const,
                  source,
                  passages: stored,
                })
              : Object.freeze({ outcome: "conflict" as const });
          }
          if (source.version !== expectedVersion) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          if (source.status !== "scanning") {
            return Object.freeze({ outcome: "invalid-state" as const });
          }
          const existing = await listBySource(
            transaction,
            tenantId,
            sourceKey,
          );
          if (existing.length !== 0) {
            return Object.freeze({ outcome: "invalid-state" as const });
          }
          const insertedRows = await loadRows(
            transaction,
            postgresKnowledgePassageSql.insertPassages,
            [tenantId, sourceKey, JSON.stringify(passages)],
            passages.length,
          );
          if (insertedRows.length !== passages.length) {
            throw new Error("PostgreSQL knowledge processing write failed");
          }
          const allowed = new Set([sourceKey]);
          const inserted = (await Promise.all(
            insertedRows.map((row) => parsePassage(row, tenantId, allowed)),
          )).sort((left, right) =>
            left.passageOrdinal - right.passageOrdinal);
          if (!passagesMatch(inserted, passages)) {
            throw new Error("PostgreSQL knowledge processing write failed");
          }
          const updatedRow = await loadOne(
            transaction,
            postgresKnowledgePassageSql.markSourceReady,
            [tenantId, sourceKey, expectedVersion, passages.length],
          );
          if (updatedRow === null) {
            throw new Error("PostgreSQL knowledge processing write failed");
          }
          const updatedSource = await parsePostgresKnowledgeSourceRow(
            updatedRow,
            tenantId,
            sourceKey,
          );
          return Object.freeze({
            outcome: "updated" as const,
            source: updatedSource,
            passages: Object.freeze(inserted),
          });
        },
      );
    },

    async listApprovedBySourceKeys(tenantId, sourceKeys, limit) {
      requirePositiveInteger(tenantId, "tenantId");
      requirePositiveInteger(limit, "limit");
      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }
      validateSourceKeys(sourceKeys);
      if (sourceKeys.length === 0) {
        return Object.freeze([]);
      }
      const rows = await loadRows(
        dependencies.queries,
        postgresKnowledgePassageSql.listApprovedBySourceKeys,
        [tenantId, JSON.stringify(sourceKeys), limit],
        limit,
      );
      const allowed = new Set(sourceKeys);
      return Promise.all(
        rows.map((row) => parsePassage(row, tenantId, allowed)),
      );
    },
  };

  return Object.freeze(repository);
}
