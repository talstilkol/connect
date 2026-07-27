import type {
  PersistedMessageTemplate,
  ValidatedMessageTemplateDraft,
} from "../shared/domain/messageTemplate.ts";
import {
  persistedTemplateStatuses,
} from "../shared/domain/messageTemplate.ts";
import type {
  TemplateStatus,
} from "../shared/domain/model.ts";
import {
  validateMessageTemplateDraft,
} from "../shared/validation/messageTemplateDraft.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const TEMPLATE_COLUMNS_SQL = `
  template_key AS templateKey,
  tenant_id AS tenantId,
  meta_template_id AS metaTemplateId,
  name,
  language,
  category,
  status,
  definition_json AS definitionJson,
  submission_key AS submissionKey,
  submission_started_at AS submissionStartedAt,
  last_submission_error_code AS lastSubmissionErrorCode,
  last_status_event_key AS lastStatusEventKey,
  last_status_event_at AS lastStatusEventAt,
  version,
  submitted_at AS submittedAt,
  reviewed_at AS reviewedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const UPSERT_DRAFT_SQL = `
  INSERT INTO message_templates (
    template_key,
    tenant_id,
    name,
    language,
    category,
    status,
    definition_json
  )
  VALUES (?1, ?2, ?3, ?4, ?5, 'draft', ?6)
  ON CONFLICT (tenant_id, name, language) DO UPDATE SET
    category = excluded.category,
    definition_json = excluded.definition_json,
    last_submission_error_code = null,
    version = message_templates.version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE message_templates.status = 'draft'
    AND (
      message_templates.category IS NOT excluded.category
      OR message_templates.definition_json IS NOT excluded.definition_json
    )
  RETURNING
    ${TEMPLATE_COLUMNS_SQL}
`;

const CLAIM_SUBMISSION_SQL = `
  UPDATE message_templates
  SET
    status = 'submitting',
    submission_key = ?4,
    submission_started_at = CURRENT_TIMESTAMP,
    last_submission_error_code = null,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND template_key = ?2
    AND status = 'draft'
    AND version = ?3
  RETURNING
    ${TEMPLATE_COLUMNS_SQL}
`;

const COMPLETE_SUBMISSION_SQL = `
  UPDATE message_templates
  SET
    meta_template_id = ?4,
    status = 'pending_review',
    submitted_at = CURRENT_TIMESTAMP,
    last_submission_error_code = null,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND template_key = ?2
    AND status = 'submitting'
    AND submission_key = ?3
  RETURNING
    ${TEMPLATE_COLUMNS_SQL}
`;

const RELEASE_SUBMISSION_SQL = `
  UPDATE message_templates
  SET
    status = 'draft',
    submission_key = null,
    submission_started_at = null,
    last_submission_error_code = ?4,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND template_key = ?2
    AND status = 'submitting'
    AND submission_key = ?3
  RETURNING
    ${TEMPLATE_COLUMNS_SQL}
`;

const APPLY_STATUS_EVENT_SQL = `
  UPDATE message_templates
  SET
    meta_template_id = coalesce(meta_template_id, ?2),
    status = ?6,
    last_status_event_key = ?7,
    last_status_event_at = ?8,
    submitted_at = coalesce(submitted_at, ?8),
    reviewed_at = CASE
      WHEN ?6 = 'pending_review' THEN null
      ELSE ?8
    END,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND name = ?3
    AND language = ?4
    AND (?5 IS null OR category = ?5)
    AND (meta_template_id IS null OR meta_template_id = ?2)
    AND status IN (
      'submitting',
      'pending_review',
      'approved',
      'rejected',
      'disabled'
    )
    AND last_status_event_key IS NOT ?7
    AND (
      last_status_event_at IS null
      OR last_status_event_at < ?8
      OR (
        last_status_event_at = ?8
        AND last_status_event_key < ?7
      )
    )
  RETURNING
    ${TEMPLATE_COLUMNS_SQL}
`;

const SELECT_BY_KEY_SQL = `
  SELECT
    ${TEMPLATE_COLUMNS_SQL}
  FROM message_templates
  WHERE tenant_id = ?1
    AND template_key = ?2
  LIMIT 1
`;

const SELECT_BY_META_ID_SQL = `
  SELECT
    ${TEMPLATE_COLUMNS_SQL}
  FROM message_templates
  WHERE tenant_id = ?1
    AND meta_template_id = ?2
  LIMIT 1
`;

const SELECT_BY_IDENTITY_SQL = `
  SELECT
    ${TEMPLATE_COLUMNS_SQL}
  FROM message_templates
  WHERE tenant_id = ?1
    AND name = ?2
    AND language = ?3
  LIMIT 1
`;

const LIST_BY_TENANT_SQL = `
  SELECT
    ${TEMPLATE_COLUMNS_SQL}
  FROM message_templates
  WHERE tenant_id = ?1
  ORDER BY updated_at DESC, template_key ASC
  LIMIT ?2
`;

interface MessageTemplateRow {
  templateKey: string;
  tenantId: number;
  metaTemplateId: string | null;
  name: string;
  language: string;
  category: string;
  status: string;
  definitionJson: string;
  submissionKey: string | null;
  submissionStartedAt: string | null;
  lastSubmissionErrorCode: string | null;
  lastStatusEventKey: string | null;
  lastStatusEventAt: string | null;
  version: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveMessageTemplateDraftInput
  extends ValidatedMessageTemplateDraft {
  templateKey: string;
  tenantId: number;
}

export type MessageTemplateStatusEventStatus = Exclude<
  TemplateStatus,
  "draft" | "submitting"
>;

export interface ApplyMessageTemplateStatusEventInput {
  tenantId: number;
  metaTemplateId: string;
  name: string;
  language: PersistedMessageTemplate["language"];
  category?: PersistedMessageTemplate["category"];
  status: MessageTemplateStatusEventStatus;
  statusEventKey: string;
  statusEventAt: string;
}

export type ApplyMessageTemplateStatusEventResult =
  | {
      outcome: "applied" | "duplicate" | "stale";
      template: PersistedMessageTemplate;
    }
  | {
      outcome: "not-found";
    };

export interface MessageTemplateRepository {
  saveDraft(
    input: SaveMessageTemplateDraftInput,
  ): Promise<PersistedMessageTemplate>;
  findByKey(
    tenantId: number,
    templateKey: string,
  ): Promise<PersistedMessageTemplate | null>;
  findByMetaId(
    tenantId: number,
    metaTemplateId: string,
  ): Promise<PersistedMessageTemplate | null>;
  listByTenant(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedMessageTemplate[]>;
  claimSubmission(
    tenantId: number,
    templateKey: string,
    expectedVersion: number,
    submissionKey: string,
  ): Promise<PersistedMessageTemplate>;
  completeSubmission(
    tenantId: number,
    templateKey: string,
    submissionKey: string,
    metaTemplateId: string,
  ): Promise<PersistedMessageTemplate>;
  releaseSubmission(
    tenantId: number,
    templateKey: string,
    submissionKey: string,
    lastSubmissionErrorCode: string,
  ): Promise<PersistedMessageTemplate>;
  applyStatusEvent(
    input: ApplyMessageTemplateStatusEventInput,
  ): Promise<ApplyMessageTemplateStatusEventResult>;
}

export class MessageTemplateLockedError extends Error {
  constructor() {
    super("A submitted message template cannot be overwritten");
    this.name = "MessageTemplateLockedError";
  }
}

export class MessageTemplateTransitionError extends Error {
  readonly code = "STATE_CONFLICT";

  constructor() {
    super("Message template state changed before transition");
    this.name = "MessageTemplateTransitionError";
  }
}

export class MessageTemplateIdentityConflictError extends Error {
  readonly code = "IDENTITY_CONFLICT";

  constructor() {
    super("Meta template identity conflicts with stored data");
    this.name = "MessageTemplateIdentityConflictError";
  }
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function assertTemplateKey(value: string): void {
  if (!/^template_v1_[0-9a-f]{64}$/.test(value)) {
    throw new Error("templateKey is invalid");
  }
}

function assertSubmissionKey(value: string): void {
  if (
    !/^template_submission_v1_[0-9a-f]{64}$/.test(value)
  ) {
    throw new Error("submissionKey is invalid");
  }
}

function assertMetaTemplateId(value: string): void {
  if (!/^[0-9]{1,255}$/.test(value)) {
    throw new Error("metaTemplateId is invalid");
  }
}

function assertSubmissionErrorCode(value: string): void {
  if (!/^[A-Z0-9_]{1,100}$/.test(value)) {
    throw new Error("lastSubmissionErrorCode is invalid");
  }
}

function assertTemplateName(value: string): void {
  if (!/^[a-z0-9_]{1,255}$/.test(value)) {
    throw new Error("template name is invalid");
  }
}

function assertTemplateLanguage(
  value: string,
): asserts value is PersistedMessageTemplate["language"] {
  if (
    value !== "he" &&
    value !== "en_US" &&
    value !== "ar"
  ) {
    throw new Error("template language is invalid");
  }
}

function assertTemplateCategory(
  value: string,
): asserts value is PersistedMessageTemplate["category"] {
  if (value !== "MARKETING" && value !== "UTILITY") {
    throw new Error("template category is invalid");
  }
}

function assertStatusEventKey(value: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("statusEventKey is invalid");
  }
}

function assertStatusEventAt(value: string): void {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value,
    ) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error("statusEventAt is invalid");
  }
}

function assertStatusEventStatus(
  value: TemplateStatus,
): asserts value is MessageTemplateStatusEventStatus {
  if (value === "draft" || value === "submitting") {
    throw new Error("status event target is invalid");
  }
}

function isTemplateStatus(
  value: string,
): value is TemplateStatus {
  return persistedTemplateStatuses.some(
    (status) => status === value,
  );
}

function definitionJson(
  input: ValidatedMessageTemplateDraft,
): string {
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

function isNullableTimestamp(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === "string" && value.trim().length > 0)
  );
}

function hasConsistentLifecycle(
  row: MessageTemplateRow,
): boolean {
  if (row.status === "draft") {
    return (
      row.metaTemplateId === null &&
      row.submissionKey === null &&
      row.submissionStartedAt === null &&
      row.lastStatusEventKey === null &&
      row.lastStatusEventAt === null &&
      row.submittedAt === null &&
      row.reviewedAt === null
    );
  }

  if (row.status === "submitting") {
    return (
      row.metaTemplateId === null &&
      row.submissionKey !== null &&
      row.submissionStartedAt !== null &&
      row.lastSubmissionErrorCode === null &&
      row.lastStatusEventKey === null &&
      row.lastStatusEventAt === null &&
      row.submittedAt === null &&
      row.reviewedAt === null
    );
  }

  if (row.status === "pending_review") {
    return (
      row.metaTemplateId !== null &&
      row.submissionKey !== null &&
      row.submissionStartedAt !== null &&
      row.lastSubmissionErrorCode === null &&
      row.submittedAt !== null &&
      row.reviewedAt === null
    );
  }

  return (
    row.metaTemplateId !== null &&
    row.submissionKey !== null &&
    row.submissionStartedAt !== null &&
    row.lastSubmissionErrorCode === null &&
    row.submittedAt !== null &&
    row.reviewedAt !== null
  );
}

function parseMessageTemplateRow(
  row: MessageTemplateRow,
): PersistedMessageTemplate {
  let definition: unknown;

  try {
    definition = JSON.parse(row.definitionJson);
  } catch {
    throw new Error(
      "D1 returned an invalid message template definition",
    );
  }

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

  if (
    !validation.success ||
    !/^template_v1_[0-9a-f]{64}$/.test(row.templateKey) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !isTemplateStatus(row.status) ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    typeof row.createdAt !== "string" ||
    !row.createdAt.trim() ||
    typeof row.updatedAt !== "string" ||
    !row.updatedAt.trim() ||
    (row.metaTemplateId !== null &&
      !/^[0-9]{1,255}$/.test(row.metaTemplateId)) ||
    (row.submissionKey !== null &&
      !/^template_submission_v1_[0-9a-f]{64}$/.test(
        row.submissionKey,
      )) ||
    !isNullableTimestamp(row.submissionStartedAt) ||
    (row.lastSubmissionErrorCode !== null &&
      !/^[A-Z0-9_]{1,100}$/.test(
        row.lastSubmissionErrorCode,
      )) ||
    (row.lastStatusEventKey !== null &&
      !/^[0-9a-f]{64}$/.test(row.lastStatusEventKey)) ||
    !isNullableTimestamp(row.lastStatusEventAt) ||
    ((row.lastStatusEventKey === null) !==
      (row.lastStatusEventAt === null)) ||
    !isNullableTimestamp(row.submittedAt) ||
    !isNullableTimestamp(row.reviewedAt) ||
    !hasConsistentLifecycle(row)
  ) {
    throw new Error(
      "D1 returned an invalid message template",
    );
  }

  return {
    templateKey: row.templateKey,
    tenantId: row.tenantId,
    metaTemplateId: row.metaTemplateId,
    status: row.status,
    submissionKey: row.submissionKey,
    submissionStartedAt: row.submissionStartedAt,
    lastSubmissionErrorCode:
      row.lastSubmissionErrorCode,
    lastStatusEventKey: row.lastStatusEventKey,
    lastStatusEventAt: row.lastStatusEventAt,
    version: row.version,
    submittedAt: row.submittedAt,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...validation.value,
  };
}

export function createMessageTemplateRepository(
  database: D1DatabaseBinding,
): MessageTemplateRepository {
  const findByKey: MessageTemplateRepository["findByKey"] =
    async (tenantId, templateKey) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertTemplateKey(templateKey);

      const row = await database
        .prepare(SELECT_BY_KEY_SQL)
        .bind(tenantId, templateKey)
        .first<MessageTemplateRow>();

      return row ? parseMessageTemplateRow(row) : null;
    };
  const findByMetaId: MessageTemplateRepository["findByMetaId"] =
    async (tenantId, metaTemplateId) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertMetaTemplateId(metaTemplateId);

      const row = await database
        .prepare(SELECT_BY_META_ID_SQL)
        .bind(tenantId, metaTemplateId)
        .first<MessageTemplateRow>();

      return row ? parseMessageTemplateRow(row) : null;
    };
  const findByIdentity = async (
    tenantId: number,
    name: string,
    language: PersistedMessageTemplate["language"],
  ): Promise<PersistedMessageTemplate | null> => {
    const row = await database
      .prepare(SELECT_BY_IDENTITY_SQL)
      .bind(tenantId, name, language)
      .first<MessageTemplateRow>();

    return row ? parseMessageTemplateRow(row) : null;
  };

  return {
    async saveDraft(input) {
      assertPositiveInteger(input.tenantId, "tenantId");
      assertTemplateKey(input.templateKey);

      const validation = validateMessageTemplateDraft(input);

      if (!validation.success) {
        throw new Error("message template draft is invalid");
      }

      const savedRow = await database
        .prepare(UPSERT_DRAFT_SQL)
        .bind(
          input.templateKey,
          input.tenantId,
          validation.value.name,
          validation.value.language,
          validation.value.category,
          definitionJson(validation.value),
        )
        .first<MessageTemplateRow>();

      if (savedRow) {
        return parseMessageTemplateRow(savedRow);
      }

      const existing = await findByKey(
        input.tenantId,
        input.templateKey,
      );

      if (!existing) {
        throw new Error(
          "D1 message template draft write failed",
        );
      }

      if (existing.status !== "draft") {
        throw new MessageTemplateLockedError();
      }

      return existing;
    },

    findByKey,
    findByMetaId,

    async listByTenant(tenantId, limit) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(limit, "limit");

      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }

      const result = await database
        .prepare(LIST_BY_TENANT_SQL)
        .bind(tenantId, limit)
        .all<MessageTemplateRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 message template list read failed",
        );
      }

      return (result.results ?? []).map(
        parseMessageTemplateRow,
      );
    },

    async claimSubmission(
      tenantId,
      templateKey,
      expectedVersion,
      submissionKey,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertTemplateKey(templateKey);
      assertPositiveInteger(
        expectedVersion,
        "expectedVersion",
      );
      assertSubmissionKey(submissionKey);

      const claimedRow = await database
        .prepare(CLAIM_SUBMISSION_SQL)
        .bind(
          tenantId,
          templateKey,
          expectedVersion,
          submissionKey,
        )
        .first<MessageTemplateRow>();

      if (!claimedRow) {
        throw new MessageTemplateTransitionError();
      }

      return parseMessageTemplateRow(claimedRow);
    },

    async completeSubmission(
      tenantId,
      templateKey,
      submissionKey,
      metaTemplateId,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertTemplateKey(templateKey);
      assertSubmissionKey(submissionKey);
      assertMetaTemplateId(metaTemplateId);

      const completedRow = await database
        .prepare(COMPLETE_SUBMISSION_SQL)
        .bind(
          tenantId,
          templateKey,
          submissionKey,
          metaTemplateId,
        )
        .first<MessageTemplateRow>();

      if (!completedRow) {
        throw new MessageTemplateTransitionError();
      }

      return parseMessageTemplateRow(completedRow);
    },

    async releaseSubmission(
      tenantId,
      templateKey,
      submissionKey,
      lastSubmissionErrorCode,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertTemplateKey(templateKey);
      assertSubmissionKey(submissionKey);
      assertSubmissionErrorCode(lastSubmissionErrorCode);

      const releasedRow = await database
        .prepare(RELEASE_SUBMISSION_SQL)
        .bind(
          tenantId,
          templateKey,
          submissionKey,
          lastSubmissionErrorCode,
        )
        .first<MessageTemplateRow>();

      if (!releasedRow) {
        throw new MessageTemplateTransitionError();
      }

      return parseMessageTemplateRow(releasedRow);
    },

    async applyStatusEvent(input) {
      assertPositiveInteger(input.tenantId, "tenantId");
      assertMetaTemplateId(input.metaTemplateId);
      assertTemplateName(input.name);
      assertTemplateLanguage(input.language);
      if (input.category !== undefined) {
        assertTemplateCategory(input.category);
      }
      assertStatusEventStatus(input.status);
      assertStatusEventKey(input.statusEventKey);
      assertStatusEventAt(input.statusEventAt);

      const appliedRow = await database
        .prepare(APPLY_STATUS_EVENT_SQL)
        .bind(
          input.tenantId,
          input.metaTemplateId,
          input.name,
          input.language,
          input.category ?? null,
          input.status,
          input.statusEventKey,
          input.statusEventAt,
        )
        .first<MessageTemplateRow>();

      if (appliedRow) {
        return {
          outcome: "applied",
          template: parseMessageTemplateRow(appliedRow),
        };
      }

      const storedByIdentity = await findByIdentity(
        input.tenantId,
        input.name,
        input.language,
      );

      if (!storedByIdentity) {
        const storedByMetaId = await findByMetaId(
          input.tenantId,
          input.metaTemplateId,
        );

        if (storedByMetaId) {
          throw new MessageTemplateIdentityConflictError();
        }

        return { outcome: "not-found" };
      }

      if (storedByIdentity.status === "draft") {
        const storedByMetaId = await findByMetaId(
          input.tenantId,
          input.metaTemplateId,
        );

        if (storedByMetaId) {
          throw new MessageTemplateIdentityConflictError();
        }

        return { outcome: "not-found" };
      }

      if (
        input.category !== undefined &&
        storedByIdentity.category !== input.category
      ) {
        throw new MessageTemplateIdentityConflictError();
      }

      if (
        storedByIdentity.metaTemplateId !== null &&
        storedByIdentity.metaTemplateId !==
          input.metaTemplateId
      ) {
        throw new MessageTemplateIdentityConflictError();
      }

      if (
        storedByIdentity.lastStatusEventKey ===
        input.statusEventKey
      ) {
        return {
          outcome: "duplicate",
          template: storedByIdentity,
        };
      }

      return {
        outcome: "stale",
        template: storedByIdentity,
      };
    },
  };
}
