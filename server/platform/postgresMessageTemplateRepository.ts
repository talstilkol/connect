import {
  MessageTemplateIdentityConflictError,
  MessageTemplateLockedError,
  MessageTemplateTransitionError,
  type ApplyMessageTemplateStatusEventInput,
  type ApplyMessageTemplateStatusEventResult,
  type MessageTemplateRepository,
  type MessageTemplateStatusEventStatus,
  type SaveMessageTemplateDraftInput,
} from "../../db/messageTemplateRepository.ts";
import {
  persistedTemplateStatuses,
  type PersistedMessageTemplate,
  type ValidatedMessageTemplateDraft,
} from "../../shared/domain/messageTemplate.ts";
import type {
  TemplateStatus,
} from "../../shared/domain/model.ts";
import {
  validateMessageTemplateDraft,
} from "../../shared/validation/messageTemplateDraft.ts";
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

const templateKeyPattern = /^template_v1_[0-9a-f]{64}$/;
const submissionKeyPattern = /^template_submission_v1_[0-9a-f]{64}$/;
const metaTemplateIdPattern = /^[0-9]{1,255}$/;
const templateNamePattern = /^[a-z0-9_]{1,255}$/;
const statusEventKeyPattern = /^[0-9a-f]{64}$/;
const submissionErrorCodePattern = /^[A-Z0-9_]{1,100}$/;

const templateRowKeys = Object.freeze([
  "category",
  "createdAt",
  "definitionJson",
  "language",
  "lastStatusEventAt",
  "lastStatusEventKey",
  "lastSubmissionErrorCode",
  "metaTemplateId",
  "name",
  "reviewedAt",
  "status",
  "submissionKey",
  "submissionStartedAt",
  "submittedAt",
  "templateKey",
  "tenantId",
  "updatedAt",
  "version",
]);

const templateColumns = `
  templates.template_key AS "templateKey",
  templates.tenant_id AS "tenantId",
  templates.meta_template_id AS "metaTemplateId",
  templates.name,
  templates.language,
  templates.category,
  templates.status,
  templates.definition_json AS "definitionJson",
  templates.submission_key AS "submissionKey",
  templates.submission_started_at AS "submissionStartedAt",
  templates.last_submission_error_code AS "lastSubmissionErrorCode",
  templates.last_status_event_key AS "lastStatusEventKey",
  templates.last_status_event_at AS "lastStatusEventAt",
  templates.version,
  templates.submitted_at AS "submittedAt",
  templates.reviewed_at AS "reviewedAt",
  templates.created_at AS "createdAt",
  templates.updated_at AS "updatedAt"
`;

export const postgresMessageTemplateSql = Object.freeze({
  insertDraft: `
    INSERT INTO message_templates AS templates (
      template_key,
      tenant_id,
      name,
      language,
      category,
      status,
      definition_json
    )
    VALUES ($1, $2, $3, $4, $5, 'draft', $6::jsonb)
    ON CONFLICT DO NOTHING
    RETURNING ${templateColumns}
  `,
  updateDraft: `
    UPDATE message_templates AS templates
    SET
      category = $5,
      definition_json = $6::jsonb,
      last_submission_error_code = NULL,
      version = templates.version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE templates.template_key = $1
      AND templates.tenant_id = $2
      AND templates.name = $3
      AND templates.language = $4
      AND templates.status = 'draft'
      AND (
        templates.category IS DISTINCT FROM $5
        OR templates.definition_json IS DISTINCT FROM $6::jsonb
      )
    RETURNING ${templateColumns}
  `,
  findByKey: `
    SELECT ${templateColumns}
    FROM message_templates AS templates
    WHERE templates.tenant_id = $1
      AND templates.template_key = $2
    LIMIT 1
  `,
  findByKeyForUpdate: `
    SELECT ${templateColumns}
    FROM message_templates AS templates
    WHERE templates.tenant_id = $1
      AND templates.template_key = $2
    FOR UPDATE
  `,
  findByMetaId: `
    SELECT ${templateColumns}
    FROM message_templates AS templates
    WHERE templates.tenant_id = $1
      AND templates.meta_template_id = $2
    LIMIT 1
  `,
  findByMetaIdForUpdate: `
    SELECT ${templateColumns}
    FROM message_templates AS templates
    WHERE templates.tenant_id = $1
      AND templates.meta_template_id = $2
    FOR UPDATE
  `,
  findByIdentityForUpdate: `
    SELECT ${templateColumns}
    FROM message_templates AS templates
    WHERE templates.tenant_id = $1
      AND templates.name = $2
      AND templates.language = $3
    FOR UPDATE
  `,
  listByTenant: `
    SELECT ${templateColumns}
    FROM message_templates AS templates
    WHERE templates.tenant_id = $1
    ORDER BY templates.updated_at DESC, templates.template_key ASC
    LIMIT $2
  `,
  claimSubmission: `
    UPDATE message_templates AS templates
    SET
      status = 'submitting',
      submission_key = $4,
      submission_started_at = date_trunc('milliseconds', CURRENT_TIMESTAMP),
      last_submission_error_code = NULL,
      version = templates.version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE templates.tenant_id = $1
      AND templates.template_key = $2
      AND templates.status = 'draft'
      AND templates.version = $3
    RETURNING ${templateColumns}
  `,
  completeSubmission: `
    UPDATE message_templates AS templates
    SET
      meta_template_id = $4,
      status = 'pending_review',
      submitted_at = date_trunc('milliseconds', CURRENT_TIMESTAMP),
      last_submission_error_code = NULL,
      version = templates.version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE templates.tenant_id = $1
      AND templates.template_key = $2
      AND templates.status = 'submitting'
      AND templates.submission_key = $3
    RETURNING ${templateColumns}
  `,
  releaseSubmission: `
    UPDATE message_templates AS templates
    SET
      status = 'draft',
      submission_key = NULL,
      submission_started_at = NULL,
      last_submission_error_code = $4,
      version = templates.version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE templates.tenant_id = $1
      AND templates.template_key = $2
      AND templates.status = 'submitting'
      AND templates.submission_key = $3
    RETURNING ${templateColumns}
  `,
  applyStatusEvent: `
    UPDATE message_templates AS templates
    SET
      meta_template_id = COALESCE(templates.meta_template_id, $2),
      status = $6,
      last_status_event_key = $7,
      last_status_event_at = $8::timestamptz,
      submitted_at = COALESCE(templates.submitted_at, $8::timestamptz),
      reviewed_at = CASE
        WHEN $6 = 'pending_review' THEN NULL
        ELSE $8::timestamptz
      END,
      version = templates.version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE templates.tenant_id = $1
      AND templates.name = $3
      AND templates.language = $4
      AND ($5::text IS NULL OR templates.category = $5)
      AND (
        templates.meta_template_id IS NULL
        OR templates.meta_template_id = $2
      )
      AND templates.status IN (
        'submitting',
        'pending_review',
        'approved',
        'rejected',
        'disabled'
      )
      AND templates.last_status_event_key IS DISTINCT FROM $7
      AND (
        templates.last_status_event_at IS NULL
        OR templates.last_status_event_at < $8::timestamptz
        OR (
          templates.last_status_event_at = $8::timestamptz
          AND templates.last_status_event_key < $7
        )
      )
    RETURNING ${templateColumns}
  `,
});

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return Number(value);
}

function requirePattern(
  value: unknown,
  pattern: RegExp,
  fieldName: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value;
}

function requireTemplateKey(value: unknown): string {
  return requirePattern(value, templateKeyPattern, "templateKey");
}

function requireSubmissionKey(value: unknown): string {
  return requirePattern(value, submissionKeyPattern, "submissionKey");
}

function requireMetaTemplateId(value: unknown): string {
  return requirePattern(value, metaTemplateIdPattern, "metaTemplateId");
}

function requireTemplateName(value: unknown): string {
  return requirePattern(value, templateNamePattern, "template name");
}

function requireTemplateLanguage(
  value: unknown,
): PersistedMessageTemplate["language"] {
  if (value !== "he" && value !== "en_US" && value !== "ar") {
    throw new Error("template language is invalid");
  }

  return value;
}

function requireTemplateCategory(
  value: unknown,
): PersistedMessageTemplate["category"] {
  if (value !== "MARKETING" && value !== "UTILITY") {
    throw new Error("template category is invalid");
  }

  return value;
}

function requireStatusEventStatus(
  value: unknown,
): MessageTemplateStatusEventStatus {
  if (
    value !== "pending_review" &&
    value !== "approved" &&
    value !== "rejected" &&
    value !== "disabled" &&
    value !== "deleted"
  ) {
    throw new Error("status event target is invalid");
  }

  return value;
}

function requireStatusEventAt(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error("statusEventAt is invalid");
  }

  return value;
}

function isTemplateStatus(value: unknown): value is TemplateStatus {
  return persistedTemplateStatuses.some((status) => status === value);
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null ? null : parsePostgresTimestamp(value);
}

function parseNullablePattern(
  value: unknown,
  pattern: RegExp,
  fieldName: string,
): string | null {
  return value === null
    ? null
    : requirePattern(value, pattern, fieldName);
}

function definitionJson(input: ValidatedMessageTemplateDraft): string {
  return JSON.stringify({
    header: input.header,
    body: input.body,
    footer: input.footer,
    variableExamples: input.variableExamples,
    buttonMode: input.buttonMode,
    quickReplies: input.quickReplies,
    urlButton: input.urlButton,
    phoneButton: input.phoneButton,
  });
}

function hasConsistentLifecycle(
  template: PersistedMessageTemplate,
): boolean {
  if (template.status === "draft") {
    return (
      template.metaTemplateId === null &&
      template.submissionKey === null &&
      template.submissionStartedAt === null &&
      template.lastStatusEventKey === null &&
      template.lastStatusEventAt === null &&
      template.submittedAt === null &&
      template.reviewedAt === null
    );
  }

  if (template.status === "submitting") {
    return (
      template.metaTemplateId === null &&
      template.submissionKey !== null &&
      template.submissionStartedAt !== null &&
      template.lastSubmissionErrorCode === null &&
      template.lastStatusEventKey === null &&
      template.lastStatusEventAt === null &&
      template.submittedAt === null &&
      template.reviewedAt === null
    );
  }

  if (template.status === "pending_review") {
    return (
      template.metaTemplateId !== null &&
      template.submissionKey !== null &&
      template.submissionStartedAt !== null &&
      template.lastSubmissionErrorCode === null &&
      template.submittedAt !== null &&
      template.reviewedAt === null
    );
  }

  return (
    template.metaTemplateId !== null &&
    template.submissionKey !== null &&
    template.submissionStartedAt !== null &&
    template.lastSubmissionErrorCode === null &&
    template.submittedAt !== null &&
    template.reviewedAt !== null
  );
}

function parseMessageTemplate(value: unknown): PersistedMessageTemplate {
  const row = requireExactPostgresRow(value, templateRowKeys);
  const definition = row.definitionJson;
  const validation = validateMessageTemplateDraft({
    name: row.name,
    category: row.category,
    language: row.language,
    ...(typeof definition === "object" &&
    definition !== null &&
    !Array.isArray(definition)
      ? definition
      : {}),
  });
  const status = row.status;

  if (!validation.success || !isTemplateStatus(status)) {
    throw new Error("PostgreSQL returned an invalid message template");
  }

  const template: PersistedMessageTemplate = {
    templateKey: requireTemplateKey(row.templateKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    metaTemplateId: parseNullablePattern(
      row.metaTemplateId,
      metaTemplateIdPattern,
      "PostgreSQL Meta template ID",
    ),
    status,
    submissionKey: parseNullablePattern(
      row.submissionKey,
      submissionKeyPattern,
      "PostgreSQL template submission key",
    ),
    submissionStartedAt: parseNullableTimestamp(row.submissionStartedAt),
    lastSubmissionErrorCode: parseNullablePattern(
      row.lastSubmissionErrorCode,
      submissionErrorCodePattern,
      "PostgreSQL submission error code",
    ),
    lastStatusEventKey: parseNullablePattern(
      row.lastStatusEventKey,
      statusEventKeyPattern,
      "PostgreSQL template status event key",
    ),
    lastStatusEventAt: parseNullableTimestamp(row.lastStatusEventAt),
    version: parsePostgresPositiveInteger(row.version),
    submittedAt: parseNullableTimestamp(row.submittedAt),
    reviewedAt: parseNullableTimestamp(row.reviewedAt),
    createdAt: parsePostgresTimestamp(row.createdAt),
    updatedAt: parsePostgresTimestamp(row.updatedAt),
    ...validation.value,
  };

  if (
    (template.lastStatusEventKey === null) !==
      (template.lastStatusEventAt === null) ||
    template.updatedAt < template.createdAt ||
    !hasConsistentLifecycle(template)
  ) {
    throw new Error("PostgreSQL returned an invalid message template lifecycle");
  }

  return Object.freeze(template);
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

function definitionsMatch(
  stored: PersistedMessageTemplate,
  input: SaveMessageTemplateDraftInput,
): boolean {
  const validation = validateMessageTemplateDraft(input);

  if (!validation.success) {
    return false;
  }

  return (
    stored.templateKey === input.templateKey &&
    stored.tenantId === input.tenantId &&
    JSON.stringify({
      name: stored.name,
      category: stored.category,
      language: stored.language,
      definition: JSON.parse(definitionJson(stored)),
    }) === JSON.stringify({
      name: validation.value.name,
      category: validation.value.category,
      language: validation.value.language,
      definition: JSON.parse(definitionJson(validation.value)),
    })
  );
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export interface PostgresMessageTemplateRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

export function createPostgresMessageTemplateRepository(
  dependencies: Readonly<PostgresMessageTemplateRepositoryDependencies>,
): MessageTemplateRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error(
      "PostgreSQL message template repository dependencies are invalid",
    );
  }

  const findByKey: MessageTemplateRepository["findByKey"] = async (
    tenantIdInput,
    templateKeyInput,
  ) => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const templateKey = requireTemplateKey(templateKeyInput);
    const row = await loadOne(
      dependencies.queries,
      postgresMessageTemplateSql.findByKey,
      [tenantId, templateKey],
    );

    return row === null ? null : parseMessageTemplate(row);
  };

  const findByMetaId: MessageTemplateRepository["findByMetaId"] = async (
    tenantIdInput,
    metaTemplateIdInput,
  ) => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const metaTemplateId = requireMetaTemplateId(metaTemplateIdInput);
    const row = await loadOne(
      dependencies.queries,
      postgresMessageTemplateSql.findByMetaId,
      [tenantId, metaTemplateId],
    );

    return row === null ? null : parseMessageTemplate(row);
  };

  async function transition(
    sql: string,
    parameters: readonly PostgresParameter[],
  ): Promise<PersistedMessageTemplate> {
    const row = await loadOne(dependencies.queries, sql, parameters);

    if (row === null) {
      throw new MessageTemplateTransitionError();
    }

    return parseMessageTemplate(row);
  }

  const repository: MessageTemplateRepository = {
    async saveDraft(input) {
      const tenantId = requirePositiveInteger(input?.tenantId, "tenantId");
      const templateKey = requireTemplateKey(input?.templateKey);
      const validation = validateMessageTemplateDraft(input);

      if (!validation.success) {
        throw new Error("message template draft is invalid");
      }

      const normalizedInput: SaveMessageTemplateDraftInput = {
        tenantId,
        templateKey,
        ...validation.value,
      };

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const insertedRow = await loadOne(
            transaction,
            postgresMessageTemplateSql.insertDraft,
            [
              templateKey,
              tenantId,
              validation.value.name,
              validation.value.language,
              validation.value.category,
              definitionJson(validation.value),
            ],
          );
          const savedRow = insertedRow ?? await loadOne(
            transaction,
            postgresMessageTemplateSql.updateDraft,
            [
              templateKey,
              tenantId,
              validation.value.name,
              validation.value.language,
              validation.value.category,
              definitionJson(validation.value),
            ],
          );

          if (savedRow !== null) {
            const saved = parseMessageTemplate(savedRow);
            if (!definitionsMatch(saved, normalizedInput)) {
              throw new Error(
                "PostgreSQL returned a mismatched message template draft",
              );
            }
            return saved;
          }

          const existingRow = await loadOne(
            transaction,
            postgresMessageTemplateSql.findByKeyForUpdate,
            [tenantId, templateKey],
          );

          if (existingRow === null) {
            throw new Error("PostgreSQL message template draft write failed");
          }

          const existing = parseMessageTemplate(existingRow);
          if (existing.status !== "draft") {
            throw new MessageTemplateLockedError();
          }
          if (!definitionsMatch(existing, normalizedInput)) {
            throw new Error("PostgreSQL message template draft conflicts");
          }

          return existing;
        },
      );
    },

    findByKey,
    findByMetaId,

    async listByTenant(tenantIdInput, limitInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const limit = requirePositiveInteger(limitInput, "limit");

      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }

      const rows = await loadRows(
        dependencies.queries,
        postgresMessageTemplateSql.listByTenant,
        [tenantId, limit],
        limit,
      );
      return Object.freeze(rows.map(parseMessageTemplate));
    },

    claimSubmission(tenantIdInput, templateKeyInput, versionInput, keyInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const templateKey = requireTemplateKey(templateKeyInput);
      const expectedVersion = requirePositiveInteger(
        versionInput,
        "expectedVersion",
      );
      const submissionKey = requireSubmissionKey(keyInput);
      return transition(postgresMessageTemplateSql.claimSubmission, [
        tenantId,
        templateKey,
        expectedVersion,
        submissionKey,
      ]);
    },

    completeSubmission(tenantIdInput, templateKeyInput, keyInput, metaIdInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const templateKey = requireTemplateKey(templateKeyInput);
      const submissionKey = requireSubmissionKey(keyInput);
      const metaTemplateId = requireMetaTemplateId(metaIdInput);
      return transition(postgresMessageTemplateSql.completeSubmission, [
        tenantId,
        templateKey,
        submissionKey,
        metaTemplateId,
      ]);
    },

    releaseSubmission(tenantIdInput, templateKeyInput, keyInput, codeInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const templateKey = requireTemplateKey(templateKeyInput);
      const submissionKey = requireSubmissionKey(keyInput);
      const lastSubmissionErrorCode = requirePattern(
        codeInput,
        submissionErrorCodePattern,
        "lastSubmissionErrorCode",
      );
      return transition(postgresMessageTemplateSql.releaseSubmission, [
        tenantId,
        templateKey,
        submissionKey,
        lastSubmissionErrorCode,
      ]);
    },

    async applyStatusEvent(input) {
      const normalized: ApplyMessageTemplateStatusEventInput = {
        tenantId: requirePositiveInteger(input?.tenantId, "tenantId"),
        metaTemplateId: requireMetaTemplateId(input?.metaTemplateId),
        name: requireTemplateName(input?.name),
        language: requireTemplateLanguage(input?.language),
        ...(input?.category === undefined
          ? {}
          : { category: requireTemplateCategory(input.category) }),
        status: requireStatusEventStatus(input?.status),
        statusEventKey: requirePattern(
          input?.statusEventKey,
          statusEventKeyPattern,
          "statusEventKey",
        ),
        statusEventAt: requireStatusEventAt(input?.statusEventAt),
      };

      try {
        return await dependencies.transactions.transaction<
          ApplyMessageTemplateStatusEventResult
        >(
          { isolationLevel: "read-committed" },
          async (transaction) => {
            const parameters: readonly PostgresParameter[] = [
              normalized.tenantId,
              normalized.metaTemplateId,
              normalized.name,
              normalized.language,
              normalized.category ?? null,
              normalized.status,
              normalized.statusEventKey,
              normalized.statusEventAt,
            ];
            const appliedRow = await loadOne(
              transaction,
              postgresMessageTemplateSql.applyStatusEvent,
              parameters,
            );

            if (appliedRow !== null) {
              return Object.freeze({
                outcome: "applied" as const,
                template: parseMessageTemplate(appliedRow),
              });
            }

            const identityRow = await loadOne(
              transaction,
              postgresMessageTemplateSql.findByIdentityForUpdate,
              [
                normalized.tenantId,
                normalized.name,
                normalized.language,
              ],
            );

            if (identityRow === null) {
              const metaRow = await loadOne(
                transaction,
                postgresMessageTemplateSql.findByMetaIdForUpdate,
                [normalized.tenantId, normalized.metaTemplateId],
              );
              if (metaRow !== null) {
                throw new MessageTemplateIdentityConflictError();
              }
              return Object.freeze({ outcome: "not-found" as const });
            }

            const stored = parseMessageTemplate(identityRow);
            if (stored.status === "draft") {
              const metaRow = await loadOne(
                transaction,
                postgresMessageTemplateSql.findByMetaIdForUpdate,
                [normalized.tenantId, normalized.metaTemplateId],
              );
              if (metaRow !== null) {
                throw new MessageTemplateIdentityConflictError();
              }
              return Object.freeze({ outcome: "not-found" as const });
            }

            if (
              (normalized.category !== undefined &&
                stored.category !== normalized.category) ||
              (stored.metaTemplateId !== null &&
                stored.metaTemplateId !== normalized.metaTemplateId)
            ) {
              throw new MessageTemplateIdentityConflictError();
            }

            return Object.freeze({
              outcome:
                stored.lastStatusEventKey === normalized.statusEventKey
                  ? "duplicate" as const
                  : "stale" as const,
              template: stored,
            });
          },
        );
      } catch (error) {
        if (isPostgresUniqueViolation(error)) {
          throw new MessageTemplateIdentityConflictError();
        }
        throw error;
      }
    },
  };

  return Object.freeze(repository);
}
