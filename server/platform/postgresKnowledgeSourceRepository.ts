import type {
  KnowledgeSourceRepository,
  KnowledgeSourceTransitionAction,
  RegisterUploadedKnowledgeSourceInput,
  TransitionKnowledgeSourceInput,
} from "../../db/knowledgeSourceRepository.ts";
import {
  knowledgeSourceStatuses,
  type KnowledgeSourceStatus,
  type PersistedKnowledgeSource,
} from "../../shared/domain/aiAgent.ts";
import {
  deriveKnowledgeSourceKey,
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

const sourceKeyPattern = /^knowledge_source_v1_[0-9a-f]{64}$/;
const contentDigestPattern = /^[0-9a-f]{64}$/;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/;
const mediaTypePattern =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
const unsafeControlCharacters = /[\u0000-\u001f\u007f]/;

const sourceRowKeys = Object.freeze([
  "contentSha256",
  "createdAt",
  "fileName",
  "lastErrorCode",
  "mediaType",
  "readyAt",
  "sizeBytes",
  "sourceKey",
  "status",
  "storageObjectKey",
  "tenantId",
  "updatedAt",
  "version",
]);

export const postgresKnowledgeSourceColumns = `
  knowledge_sources.source_key AS "sourceKey",
  knowledge_sources.tenant_id AS "tenantId",
  knowledge_sources.content_sha256 AS "contentSha256",
  knowledge_sources.file_name AS "fileName",
  knowledge_sources.media_type AS "mediaType",
  knowledge_sources.size_bytes AS "sizeBytes",
  knowledge_sources.storage_object_key AS "storageObjectKey",
  knowledge_sources.status,
  knowledge_sources.last_error_code AS "lastErrorCode",
  knowledge_sources.ready_at AS "readyAt",
  knowledge_sources.version,
  knowledge_sources.created_at AS "createdAt",
  knowledge_sources.updated_at AS "updatedAt"
`;

export const postgresKnowledgeSourceSql = Object.freeze({
  insert: `
    INSERT INTO knowledge_sources (
      source_key,
      tenant_id,
      content_sha256,
      file_name,
      media_type,
      size_bytes,
      storage_object_key,
      status,
      last_error_code,
      ready_at,
      version
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      'pending-validation',
      NULL,
      NULL,
      1
    )
    ON CONFLICT DO NOTHING
    RETURNING ${postgresKnowledgeSourceColumns}
  `,
  findByKey: `
    SELECT ${postgresKnowledgeSourceColumns}
    FROM knowledge_sources
    WHERE knowledge_sources.tenant_id = $1
      AND knowledge_sources.source_key = $2
    LIMIT 1
  `,
  findByKeyForUpdate: `
    SELECT ${postgresKnowledgeSourceColumns}
    FROM knowledge_sources
    WHERE knowledge_sources.tenant_id = $1
      AND knowledge_sources.source_key = $2
    FOR UPDATE
  `,
  listByTenant: `
    SELECT ${postgresKnowledgeSourceColumns}
    FROM knowledge_sources
    WHERE knowledge_sources.tenant_id = $1
    ORDER BY knowledge_sources.updated_at DESC,
      knowledge_sources.source_key ASC
    LIMIT $2
  `,
  validationPassed: `
    UPDATE knowledge_sources
    SET
      status = 'pending-scan',
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND source_key = $2
      AND version = $3
      AND status = 'pending-validation'
    RETURNING ${postgresKnowledgeSourceColumns}
  `,
  scanStarted: `
    UPDATE knowledge_sources
    SET
      status = 'scanning',
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND source_key = $2
      AND version = $3
      AND status = 'pending-scan'
    RETURNING ${postgresKnowledgeSourceColumns}
  `,
  scanRetryStarted: `
    UPDATE knowledge_sources
    SET
      status = 'scanning',
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND source_key = $2
      AND version = $3
      AND status = 'scanning'
    RETURNING ${postgresKnowledgeSourceColumns}
  `,
  rejected: `
    UPDATE knowledge_sources
    SET
      status = 'rejected',
      last_error_code = $4,
      ready_at = NULL,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND source_key = $2
      AND version = $3
      AND status IN ('pending-validation', 'pending-scan', 'scanning')
    RETURNING ${postgresKnowledgeSourceColumns}
  `,
  archived: `
    UPDATE knowledge_sources
    SET
      status = 'archived',
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND source_key = $2
      AND version = $3
      AND status IN ('ready', 'rejected')
    RETURNING ${postgresKnowledgeSourceColumns}
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

function normalizeFileName(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("fileName is invalid");
  }
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > 512 ||
    unsafeControlCharacters.test(normalized)
  ) {
    throw new Error("fileName is invalid");
  }
  return normalized;
}

function normalizeMediaType(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("mediaType is invalid");
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 255 || !mediaTypePattern.test(normalized)) {
    throw new Error("mediaType is invalid");
  }
  return normalized;
}

function storageObjectKey(sourceKey: string): string {
  return `knowledge/v1/${sourceKey}`;
}

function parseSource(value: unknown): PersistedKnowledgeSource {
  const row = requireExactPostgresRow(value, sourceRowKeys);
  const sourceKey = requireSourceKey(row.sourceKey);
  const tenantId = parsePostgresPositiveInteger(row.tenantId);
  const status = knowledgeSourceStatuses.find(
    (candidate) => candidate === row.status,
  );
  const contentSha256 = row.contentSha256;
  const fileName = row.fileName;
  const mediaType = row.mediaType;
  const sizeBytes = parsePostgresPositiveInteger(row.sizeBytes);
  const storedObjectKey = row.storageObjectKey;
  const lastErrorCode = row.lastErrorCode;
  const readyAt = row.readyAt === null
    ? null
    : parsePostgresTimestamp(row.readyAt);
  const version = parsePostgresPositiveInteger(row.version);
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);
  const pending = status === "pending-upload" ||
    status === "pending-validation" ||
    status === "pending-scan" ||
    status === "scanning";
  const validState =
    (pending && lastErrorCode === null && readyAt === null) ||
    (status === "ready" && lastErrorCode === null && readyAt !== null) ||
    (
      status === "rejected" &&
      typeof lastErrorCode === "string" &&
      errorCodePattern.test(lastErrorCode) &&
      readyAt === null
    ) ||
    (
      status === "archived" &&
      (
        (lastErrorCode === null && readyAt !== null) ||
        (
          typeof lastErrorCode === "string" &&
          errorCodePattern.test(lastErrorCode) &&
          readyAt === null
        )
      )
    );

  if (
    !status ||
    typeof contentSha256 !== "string" ||
    !contentDigestPattern.test(contentSha256) ||
    typeof fileName !== "string" ||
    fileName !== fileName.trim() ||
    fileName.length === 0 ||
    fileName.length > 512 ||
    unsafeControlCharacters.test(fileName) ||
    typeof mediaType !== "string" ||
    mediaType !== mediaType.trim().toLowerCase() ||
    !mediaTypePattern.test(mediaType) ||
    typeof storedObjectKey !== "string" ||
    storedObjectKey !== storageObjectKey(sourceKey) ||
    !validState ||
    updatedAt < createdAt ||
    (readyAt !== null && readyAt < createdAt)
  ) {
    throw new Error("PostgreSQL returned an invalid knowledge source");
  }

  return Object.freeze({
    sourceKey,
    tenantId,
    contentSha256,
    fileName,
    mediaType,
    sizeBytes,
    storageObjectKey: storedObjectKey,
    status,
    lastErrorCode: lastErrorCode as string | null,
    readyAt,
    version,
    createdAt,
    updatedAt,
  });
}

async function verifyIdentity(
  source: PersistedKnowledgeSource,
): Promise<PersistedKnowledgeSource> {
  const expected = await deriveKnowledgeSourceKey(
    source.tenantId,
    source.contentSha256,
  );
  if (expected !== source.sourceKey) {
    throw new Error("PostgreSQL returned an invalid knowledge source identity");
  }
  return source;
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

export async function parsePostgresKnowledgeSourceRow(
  value: unknown,
  tenantId: number,
  sourceKey?: string,
): Promise<PersistedKnowledgeSource> {
  const source = await verifyIdentity(parseSource(value));
  if (
    source.tenantId !== tenantId ||
    (sourceKey !== undefined && source.sourceKey !== sourceKey)
  ) {
    throw new Error(
      "PostgreSQL returned a knowledge source outside the requested scope",
    );
  }
  return source;
}

function targetStatus(
  action: KnowledgeSourceTransitionAction,
): KnowledgeSourceStatus {
  switch (action) {
    case "validation-passed":
      return "pending-scan";
    case "scan-started":
    case "scan-retry-started":
      return "scanning";
    case "rejected":
      return "rejected";
    case "archive":
      return "archived";
  }
}

function validateTransition(input: TransitionKnowledgeSourceInput): void {
  requirePositiveInteger(input.tenantId, "tenantId");
  requireSourceKey(input.sourceKey);
  requirePositiveInteger(input.expectedVersion, "expectedVersion");
  if (
    ![
      "validation-passed",
      "scan-started",
      "scan-retry-started",
      "rejected",
      "archive",
    ].includes(input.action)
  ) {
    throw new Error("action is invalid");
  }
  if ((input.action === "rejected") !== (input.errorCode !== null)) {
    throw new Error("errorCode is valid only for rejection");
  }
  if (
    input.errorCode !== null &&
    !errorCodePattern.test(input.errorCode)
  ) {
    throw new Error("errorCode is invalid");
  }
}

function transitionStatement(
  input: TransitionKnowledgeSourceInput,
): readonly [string, readonly PostgresParameter[]] {
  const parameters: readonly PostgresParameter[] = input.action === "rejected"
    ? [input.tenantId, input.sourceKey, input.expectedVersion, input.errorCode]
    : [input.tenantId, input.sourceKey, input.expectedVersion];
  const sql = input.action === "validation-passed"
    ? postgresKnowledgeSourceSql.validationPassed
    : input.action === "scan-started"
      ? postgresKnowledgeSourceSql.scanStarted
      : input.action === "scan-retry-started"
        ? postgresKnowledgeSourceSql.scanRetryStarted
        : input.action === "rejected"
          ? postgresKnowledgeSourceSql.rejected
          : postgresKnowledgeSourceSql.archived;
  return [sql, parameters];
}

function exactRegistration(
  source: PersistedKnowledgeSource,
  input: RegisterUploadedKnowledgeSourceInput,
  fileName: string,
  mediaType: string,
): boolean {
  return source.contentSha256 === input.contentSha256 &&
    source.fileName === fileName &&
    source.mediaType === mediaType &&
    source.sizeBytes === input.sizeBytes &&
    source.storageObjectKey === storageObjectKey(input.sourceKey);
}

export function createPostgresKnowledgeSourceRepository(
  dependencies: Readonly<{
    queries: PostgresQueryExecutor;
    transactions: PostgresTransactionManager;
  }>,
): KnowledgeSourceRepository {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "queries,transactions" ||
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL knowledge source dependencies are invalid");
  }

  const findByKey: KnowledgeSourceRepository["findByKey"] = async (
    tenantId,
    sourceKey,
  ) => {
    requirePositiveInteger(tenantId, "tenantId");
    requireSourceKey(sourceKey);
    const row = await loadOne(
      dependencies.queries,
      postgresKnowledgeSourceSql.findByKey,
      [tenantId, sourceKey],
    );
    return row === null
      ? null
      : parsePostgresKnowledgeSourceRow(row, tenantId, sourceKey);
  };

  const repository: KnowledgeSourceRepository = {
    async registerUploaded(input) {
      const tenantId = requirePositiveInteger(input.tenantId, "tenantId");
      const sourceKey = requireSourceKey(input.sourceKey);
      if (!contentDigestPattern.test(input.contentSha256)) {
        throw new Error("contentSha256 is invalid");
      }
      const sizeBytes = requirePositiveInteger(input.sizeBytes, "sizeBytes");
      const fileName = normalizeFileName(input.fileName);
      const mediaType = normalizeMediaType(input.mediaType);
      const expected = await deriveKnowledgeSourceKey(
        tenantId,
        input.contentSha256,
      );
      if (expected !== sourceKey) {
        throw new Error("knowledge source identity is invalid");
      }

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const inserted = await loadOne(
            transaction,
            postgresKnowledgeSourceSql.insert,
            [
              sourceKey,
              tenantId,
              input.contentSha256,
              fileName,
              mediaType,
              sizeBytes,
              storageObjectKey(sourceKey),
            ],
          );
          if (inserted !== null) {
            return Object.freeze({
              outcome: "created" as const,
              source: await parsePostgresKnowledgeSourceRow(
                inserted,
                tenantId,
                sourceKey,
              ),
            });
          }
          const existing = await loadOne(
            transaction,
            postgresKnowledgeSourceSql.findByKeyForUpdate,
            [tenantId, sourceKey],
          );
          if (existing === null) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          const source = await parsePostgresKnowledgeSourceRow(
            existing,
            tenantId,
            sourceKey,
          );
          return exactRegistration(source, input, fileName, mediaType)
            ? Object.freeze({ outcome: "unchanged" as const, source })
            : Object.freeze({ outcome: "conflict" as const });
        },
      );
    },

    async transition(input) {
      validateTransition(input);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const locked = await loadOne(
            transaction,
            postgresKnowledgeSourceSql.findByKeyForUpdate,
            [input.tenantId, input.sourceKey],
          );
          if (locked === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          const current = await parsePostgresKnowledgeSourceRow(
            locked,
            input.tenantId,
            input.sourceKey,
          );
          const expectedTarget = targetStatus(input.action);
          const targetMatches = current.status === expectedTarget &&
            (
              input.action !== "rejected" ||
              current.lastErrorCode === input.errorCode
            );
          if (
            current.version === input.expectedVersion + 1 &&
            targetMatches
          ) {
            return input.action === "scan-retry-started"
              ? Object.freeze({ outcome: "conflict" as const })
              : Object.freeze({
                  outcome: "unchanged" as const,
                  source: current,
                });
          }
          if (current.version !== input.expectedVersion) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          const [sql, parameters] = transitionStatement(input);
          const updated = await loadOne(transaction, sql, parameters);
          if (updated === null) {
            return Object.freeze({ outcome: "invalid-state" as const });
          }
          const source = await parsePostgresKnowledgeSourceRow(
            updated,
            input.tenantId,
            input.sourceKey,
          );
          return Object.freeze({ outcome: "updated" as const, source });
        },
      );
    },

    findByKey,

    async listByTenant(tenantId, limit) {
      requirePositiveInteger(tenantId, "tenantId");
      requirePositiveInteger(limit, "limit");
      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }
      const rows = await loadRows(
        dependencies.queries,
        postgresKnowledgeSourceSql.listByTenant,
        [tenantId, limit],
        limit,
      );
      return Promise.all(
        rows.map((row) => parsePostgresKnowledgeSourceRow(row, tenantId)),
      );
    },
  };

  return Object.freeze(repository);
}
