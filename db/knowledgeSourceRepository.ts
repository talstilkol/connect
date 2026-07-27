import {
  knowledgeSourceStatuses,
  type KnowledgeSourceStatus,
  type PersistedKnowledgeSource,
} from "../shared/domain/aiAgent.ts";
import {
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const SOURCE_KEY_PATTERN =
  /^knowledge_source_v1_[0-9a-f]{64}$/;
const CONTENT_DIGEST_PATTERN =
  /^[0-9a-f]{64}$/;
const ERROR_CODE_PATTERN =
  /^[A-Z0-9_]{1,100}$/;
const MEDIA_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u001f\u007f]/;

const KNOWLEDGE_SOURCE_COLUMNS_SQL = `
  source_key AS sourceKey,
  tenant_id AS tenantId,
  content_sha256 AS contentSha256,
  file_name AS fileName,
  media_type AS mediaType,
  size_bytes AS sizeBytes,
  storage_object_key AS storageObjectKey,
  status,
  last_error_code AS lastErrorCode,
  ready_at AS readyAt,
  version,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const INSERT_KNOWLEDGE_SOURCE_SQL = `
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
    ?1,
    ?2,
    ?3,
    ?4,
    ?5,
    ?6,
    ?7,
    'pending-validation',
    NULL,
    NULL,
    1
  )
  ON CONFLICT (source_key) DO NOTHING
`;

const SELECT_KNOWLEDGE_SOURCE_SQL = `
  SELECT
    ${KNOWLEDGE_SOURCE_COLUMNS_SQL}
  FROM knowledge_sources
  WHERE tenant_id = ?1
    AND source_key = ?2
  LIMIT 1
`;

const LIST_KNOWLEDGE_SOURCES_SQL = `
  SELECT
    ${KNOWLEDGE_SOURCE_COLUMNS_SQL}
  FROM knowledge_sources
  WHERE tenant_id = ?1
  ORDER BY updated_at DESC, source_key ASC
  LIMIT ?2
`;

const ADVANCE_VALIDATION_SQL = `
  UPDATE knowledge_sources
  SET
    status = 'pending-scan',
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND source_key = ?2
    AND version = ?3
    AND status = 'pending-validation'
`;

const START_SCAN_SQL = `
  UPDATE knowledge_sources
  SET
    status = 'scanning',
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND source_key = ?2
    AND version = ?3
    AND status = 'pending-scan'
`;

const RESTART_SCAN_SQL = `
  UPDATE knowledge_sources
  SET
    status = 'scanning',
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND source_key = ?2
    AND version = ?3
    AND status = 'scanning'
`;

const MARK_REJECTED_SQL = `
  UPDATE knowledge_sources
  SET
    status = 'rejected',
    last_error_code = ?4,
    ready_at = NULL,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND source_key = ?2
    AND version = ?3
    AND status IN (
      'pending-validation',
      'pending-scan',
      'scanning'
    )
`;

const ARCHIVE_SOURCE_SQL = `
  UPDATE knowledge_sources
  SET
    status = 'archived',
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND source_key = ?2
    AND version = ?3
    AND status IN ('ready', 'rejected')
`;

interface KnowledgeSourceRow {
  sourceKey: string;
  tenantId: number;
  contentSha256: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  storageObjectKey: string;
  status: string;
  lastErrorCode: string | null;
  readyAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterUploadedKnowledgeSourceInput {
  tenantId: number;
  sourceKey: string;
  contentSha256: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
}

export type RegisterKnowledgeSourceResult =
  | {
      outcome: "created" | "unchanged";
      source: PersistedKnowledgeSource;
    }
  | {
      outcome: "conflict";
    };

export type KnowledgeSourceTransitionAction =
  | "validation-passed"
  | "scan-started"
  | "scan-retry-started"
  | "rejected"
  | "archive";

export interface TransitionKnowledgeSourceInput {
  tenantId: number;
  sourceKey: string;
  expectedVersion: number;
  action: KnowledgeSourceTransitionAction;
  errorCode: string | null;
}

export type TransitionKnowledgeSourceResult =
  | {
      outcome: "updated" | "unchanged";
      source: PersistedKnowledgeSource;
    }
  | {
      outcome:
        | "not-found"
        | "conflict"
        | "invalid-state";
    };

export interface KnowledgeSourceRepository {
  registerUploaded(
    input: RegisterUploadedKnowledgeSourceInput,
  ): Promise<RegisterKnowledgeSourceResult>;
  transition(
    input: TransitionKnowledgeSourceInput,
  ): Promise<TransitionKnowledgeSourceResult>;
  findByKey(
    tenantId: number,
    sourceKey: string,
  ): Promise<PersistedKnowledgeSource | null>;
  listByTenant(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedKnowledgeSource[]>;
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

function assertSourceKey(value: string): void {
  if (!SOURCE_KEY_PATTERN.test(value)) {
    throw new Error("sourceKey is invalid");
  }
}

function normalizeFileName(value: string): string {
  if (typeof value !== "string") {
    throw new Error("fileName is invalid");
  }

  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 512 ||
    UNSAFE_CONTROL_CHARACTERS.test(normalized)
  ) {
    throw new Error("fileName is invalid");
  }

  return normalized;
}

function normalizeMediaType(value: string): string {
  if (typeof value !== "string") {
    throw new Error("mediaType is invalid");
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized.length > 255 ||
    !MEDIA_TYPE_PATTERN.test(normalized)
  ) {
    throw new Error("mediaType is invalid");
  }

  return normalized;
}

function storageObjectKey(sourceKey: string): string {
  return `knowledge/v1/${sourceKey}`;
}

function isNonBlankText(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function parseKnowledgeSourceRow(
  row: KnowledgeSourceRow,
): PersistedKnowledgeSource {
  const status = knowledgeSourceStatuses.find(
    (candidate) => candidate === row.status,
  );

  if (
    !SOURCE_KEY_PATTERN.test(row.sourceKey) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !CONTENT_DIGEST_PATTERN.test(
      row.contentSha256,
    ) ||
    !isNonBlankText(row.fileName) ||
    row.fileName.length > 512 ||
    UNSAFE_CONTROL_CHARACTERS.test(
      row.fileName,
    ) ||
    !MEDIA_TYPE_PATTERN.test(row.mediaType) ||
    !Number.isSafeInteger(row.sizeBytes) ||
    row.sizeBytes <= 0 ||
    row.sizeBytes > Number.MAX_SAFE_INTEGER ||
    row.storageObjectKey !==
      storageObjectKey(row.sourceKey) ||
    !status ||
    (row.lastErrorCode !== null &&
      !ERROR_CODE_PATTERN.test(
        row.lastErrorCode,
      )) ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    !isNonBlankText(row.createdAt) ||
    !isNonBlankText(row.updatedAt) ||
    (status === "ready" &&
      row.readyAt === null) ||
    (status !== "ready" &&
      status !== "archived" &&
      row.readyAt !== null) ||
    (status === "rejected" &&
      row.lastErrorCode === null) ||
    (status !== "rejected" &&
      status !== "archived" &&
      row.lastErrorCode !== null)
  ) {
    throw new Error(
      "D1 returned an invalid knowledge source",
    );
  }

  return {
    sourceKey: row.sourceKey,
    tenantId: row.tenantId,
    contentSha256: row.contentSha256,
    fileName: row.fileName,
    mediaType: row.mediaType,
    sizeBytes: row.sizeBytes,
    storageObjectKey: row.storageObjectKey,
    status,
    lastErrorCode: row.lastErrorCode,
    readyAt: row.readyAt,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function verifySourceIdentity(
  source: PersistedKnowledgeSource,
): Promise<PersistedKnowledgeSource> {
  const expectedKey =
    await deriveKnowledgeSourceKey(
      source.tenantId,
      source.contentSha256,
    );

  if (expectedKey !== source.sourceKey) {
    throw new Error(
      "D1 returned an invalid knowledge source identity",
    );
  }

  return source;
}

function transitionTargetStatus(
  action: KnowledgeSourceTransitionAction,
): KnowledgeSourceStatus {
  switch (action) {
    case "validation-passed":
      return "pending-scan";
    case "scan-started":
      return "scanning";
    case "scan-retry-started":
      return "scanning";
    case "rejected":
      return "rejected";
    case "archive":
      return "archived";
  }
}

export function createKnowledgeSourceRepository(
  database: D1DatabaseBinding,
): KnowledgeSourceRepository {
  const findByKey: KnowledgeSourceRepository["findByKey"] =
    async (tenantId, sourceKey) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertSourceKey(sourceKey);

      const row = await database
        .prepare(SELECT_KNOWLEDGE_SOURCE_SQL)
        .bind(tenantId, sourceKey)
        .first<KnowledgeSourceRow>();

      if (!row) {
        return null;
      }

      const source = await verifySourceIdentity(
        parseKnowledgeSourceRow(row),
      );

      if (
        source.tenantId !== tenantId ||
        source.sourceKey !== sourceKey
      ) {
        throw new Error(
          "D1 returned a knowledge source outside the requested scope",
        );
      }

      return source;
    };

  return {
    async registerUploaded(input) {
      assertPositiveInteger(
        input.tenantId,
        "tenantId",
      );
      assertSourceKey(input.sourceKey);

      if (
        !CONTENT_DIGEST_PATTERN.test(
          input.contentSha256,
        )
      ) {
        throw new Error(
          "contentSha256 is invalid",
        );
      }

      assertPositiveInteger(
        input.sizeBytes,
        "sizeBytes",
      );
      const fileName = normalizeFileName(
        input.fileName,
      );
      const mediaType = normalizeMediaType(
        input.mediaType,
      );
      const expectedSourceKey =
        await deriveKnowledgeSourceKey(
          input.tenantId,
          input.contentSha256,
        );

      if (expectedSourceKey !== input.sourceKey) {
        throw new Error(
          "knowledge source identity is invalid",
        );
      }

      let result;

      try {
        result = await database
          .prepare(
            INSERT_KNOWLEDGE_SOURCE_SQL,
          )
          .bind(
            input.sourceKey,
            input.tenantId,
            input.contentSha256,
            fileName,
            mediaType,
            input.sizeBytes,
            storageObjectKey(input.sourceKey),
          )
          .run();
      } catch {
        throw new Error(
          "D1 knowledge source write failed",
        );
      }

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 knowledge source write failed",
        );
      }

      const source = await findByKey(
        input.tenantId,
        input.sourceKey,
      );

      if (
        source &&
        source.contentSha256 ===
          input.contentSha256 &&
        source.fileName === fileName &&
        source.mediaType === mediaType &&
        source.sizeBytes === input.sizeBytes &&
        source.storageObjectKey ===
          storageObjectKey(input.sourceKey)
      ) {
        return {
          outcome:
            result.meta?.changes === 0
              ? "unchanged"
              : "created",
          source,
        };
      }

      return { outcome: "conflict" };
    },

    async transition(input) {
      assertPositiveInteger(
        input.tenantId,
        "tenantId",
      );
      assertSourceKey(input.sourceKey);
      assertPositiveInteger(
        input.expectedVersion,
        "expectedVersion",
      );

      if (
        input.action !== "validation-passed" &&
        input.action !== "scan-started" &&
        input.action !== "scan-retry-started" &&
        input.action !== "rejected" &&
        input.action !== "archive"
      ) {
        throw new Error("action is invalid");
      }

      if (
        (input.action === "rejected") !==
        (input.errorCode !== null)
      ) {
        throw new Error(
          "errorCode is valid only for rejection",
        );
      }

      if (
        input.errorCode !== null &&
        !ERROR_CODE_PATTERN.test(
          input.errorCode,
        )
      ) {
        throw new Error("errorCode is invalid");
      }

      const statement =
        input.action === "validation-passed"
          ? database
              .prepare(ADVANCE_VALIDATION_SQL)
              .bind(
                input.tenantId,
                input.sourceKey,
                input.expectedVersion,
              )
          : input.action === "scan-started"
            ? database
                .prepare(START_SCAN_SQL)
                .bind(
                  input.tenantId,
                  input.sourceKey,
                  input.expectedVersion,
                )
            : input.action ===
                "scan-retry-started"
              ? database
                  .prepare(RESTART_SCAN_SQL)
                  .bind(
                    input.tenantId,
                    input.sourceKey,
                    input.expectedVersion,
                  )
            : input.action === "rejected"
              ? database
                  .prepare(MARK_REJECTED_SQL)
                  .bind(
                    input.tenantId,
                    input.sourceKey,
                    input.expectedVersion,
                    input.errorCode,
                  )
              : database
                  .prepare(ARCHIVE_SOURCE_SQL)
                  .bind(
                    input.tenantId,
                    input.sourceKey,
                    input.expectedVersion,
                  );
      let result;

      try {
        result = await statement.run();
      } catch {
        throw new Error(
          "D1 knowledge source transition failed",
        );
      }

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 knowledge source transition failed",
        );
      }

      const source = await findByKey(
        input.tenantId,
        input.sourceKey,
      );

      if (!source) {
        return { outcome: "not-found" };
      }

      const targetStatus = transitionTargetStatus(
        input.action,
      );
      const targetMatches =
        source.status === targetStatus &&
        (input.action !== "rejected" ||
          source.lastErrorCode ===
            input.errorCode);

      if (
        source.version ===
          input.expectedVersion + 1 &&
        targetMatches
      ) {
        if (
          input.action ===
            "scan-retry-started" &&
          result.meta?.changes === 0
        ) {
          return { outcome: "conflict" };
        }

        return {
          outcome:
            result.meta?.changes === 0
              ? "unchanged"
              : "updated",
          source,
        };
      }

      if (
        source.version !== input.expectedVersion
      ) {
        return { outcome: "conflict" };
      }

      return { outcome: "invalid-state" };
    },

    findByKey,

    async listByTenant(tenantId, limit) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(limit, "limit");

      if (limit > 100) {
        throw new Error(
          "limit must not exceed 100",
        );
      }

      const result = await database
        .prepare(LIST_KNOWLEDGE_SOURCES_SQL)
        .bind(tenantId, limit)
        .all<KnowledgeSourceRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 knowledge source list read failed",
        );
      }

      return Promise.all(
        (result.results ?? []).map(
          async (row) => {
            const source =
              await verifySourceIdentity(
                parseKnowledgeSourceRow(row),
              );

            if (source.tenantId !== tenantId) {
              throw new Error(
                "D1 returned a knowledge source outside the requested tenant",
              );
            }

            return source;
          },
        ),
      );
    },
  };
}
