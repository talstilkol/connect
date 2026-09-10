import {
  createPostgresDataMigrationProtocol,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresDataMigrationEvidence,
  PostgresDataMigrationPlan,
  PostgresDataMigrationRow,
  PostgresDataMigrationSnapshot,
  PostgresDataMigrationTableContract,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  validateCampaignDefinition,
} from "../../shared/validation/campaignDefinition.ts";
import {
  validateCampaignPersonalization,
} from "../../shared/validation/campaignPersonalization.ts";
import {
  validateMessageTemplateDraft,
} from "../../shared/validation/messageTemplateDraft.ts";

const controlCharacterPattern = /[\u0000-\u001f\u007f-\u009f]/u;
const templateKeyPattern = /^template_v1_[0-9a-f]{64}$/;
const templateSubmissionKeyPattern =
  /^template_submission_v1_[0-9a-f]{64}$/;
const campaignKeyPattern = /^campaign_v1_[0-9a-f]{64}$/;
const deliveryKeyPattern = /^campaign_delivery_v1_[0-9a-f]{64}$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const metaTemplateIdPattern = /^[0-9]{1,255}$/;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/;
const phonePattern = /^\+[1-9][0-9]{0,14}$/;
const templateStatuses = new Set([
  "draft",
  "submitting",
  "pending_review",
  "approved",
  "rejected",
  "disabled",
  "deleted",
]);
const campaignStatuses = new Set([
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
  "failed",
]);
const recipientStatuses = new Set([
  "pending",
  "queued",
  "sending",
  "accepted",
  "delivered",
  "read",
  "failed",
  "skipped",
  "cancelled",
]);
const templateDefinitionKeys = Object.freeze([
  "body",
  "buttonMode",
  "footer",
  "header",
  "phoneButton",
  "quickReplies",
  "urlButton",
  "variableExamples",
]);
const campaignTemplateKeys = Object.freeze([
  ...templateDefinitionKeys,
  "category",
  "language",
  "metaTemplateId",
  "name",
  "templateKey",
  "version",
].sort());

function invalid(): never {
  throw new Error("templates-campaigns-row-invalid");
}

function text(row: PostgresDataMigrationRow, name: string): string {
  const value = row[name];
  if (typeof value !== "string") invalid();
  return value;
}

function nullableText(
  row: PostgresDataMigrationRow,
  name: string,
): string | null {
  const value = row[name];
  if (value === null) return null;
  if (typeof value !== "string") invalid();
  return value;
}

function integer(row: PostgresDataMigrationRow, name: string): number {
  const value = row[name];
  if (!Number.isSafeInteger(value)) invalid();
  return Number(value);
}

function timestamp(row: PostgresDataMigrationRow, name: string): number {
  const milliseconds = Date.parse(text(row, name));
  if (!Number.isFinite(milliseconds)) invalid();
  return milliseconds;
}

function nullableTimestamp(
  row: PostgresDataMigrationRow,
  name: string,
): number | null {
  const value = nullableText(row, name);
  if (value === null) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) invalid();
  return milliseconds;
}

function parseJsonObject(
  row: PostgresDataMigrationRow,
  name: string,
): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text(row, name)) as unknown;
  } catch {
    invalid();
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    !actual.every((key, index) => key === expected[index])
  ) {
    invalid();
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => (
      `${JSON.stringify(key)}:${canonicalJson(entry)}`
    )).join(",")}}`;
  }
  invalid();
}

function requireOptionalPattern(
  value: string | null,
  pattern: RegExp,
): void {
  if (value !== null && !pattern.test(value)) invalid();
}

function validateTemplate(row: PostgresDataMigrationRow): void {
  const definition = parseJsonObject(row, "definition_json");
  requireExactKeys(definition, templateDefinitionKeys);
  const validation = validateMessageTemplateDraft({
    name: text(row, "name"),
    category: text(row, "category"),
    language: text(row, "language"),
    ...definition,
  });
  const status = text(row, "status");
  const metaTemplateId = nullableText(row, "meta_template_id");
  const submissionKey = nullableText(row, "submission_key");
  const submissionStartedAt = nullableTimestamp(
    row,
    "submission_started_at",
  );
  const lastSubmissionErrorCode = nullableText(
    row,
    "last_submission_error_code",
  );
  const lastStatusEventKey = nullableText(row, "last_status_event_key");
  const lastStatusEventAt = nullableTimestamp(row, "last_status_event_at");
  const submittedAt = nullableTimestamp(row, "submitted_at");
  const reviewedAt = nullableTimestamp(row, "reviewed_at");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");

  requireOptionalPattern(metaTemplateId, metaTemplateIdPattern);
  requireOptionalPattern(submissionKey, templateSubmissionKeyPattern);
  requireOptionalPattern(lastSubmissionErrorCode, errorCodePattern);
  requireOptionalPattern(lastStatusEventKey, sha256Pattern);

  const normalizedDefinition = validation.success
    ? {
        header: validation.value.header,
        body: validation.value.body,
        footer: validation.value.footer,
        variableExamples: validation.value.variableExamples,
        buttonMode: validation.value.buttonMode,
        quickReplies: validation.value.quickReplies,
        urlButton: validation.value.urlButton,
        phoneButton: validation.value.phoneButton,
      }
    : null;

  const lifecycleValid = (
    status === "draft" &&
    metaTemplateId === null &&
    submissionKey === null &&
    submissionStartedAt === null &&
    lastStatusEventKey === null &&
    lastStatusEventAt === null &&
    submittedAt === null &&
    reviewedAt === null
  ) || (
    status === "submitting" &&
    metaTemplateId === null &&
    submissionKey !== null &&
    submissionStartedAt !== null &&
    lastSubmissionErrorCode === null &&
    lastStatusEventKey === null &&
    lastStatusEventAt === null &&
    submittedAt === null &&
    reviewedAt === null
  ) || (
    status === "pending_review" &&
    metaTemplateId !== null &&
    submissionKey !== null &&
    submissionStartedAt !== null &&
    lastSubmissionErrorCode === null &&
    submittedAt !== null &&
    reviewedAt === null
  ) || (
    ["approved", "rejected", "disabled", "deleted"].includes(status) &&
    metaTemplateId !== null &&
    submissionKey !== null &&
    submissionStartedAt !== null &&
    lastSubmissionErrorCode === null &&
    submittedAt !== null &&
    reviewedAt !== null
  );

  if (
    !templateKeyPattern.test(text(row, "template_key")) ||
    !templateStatuses.has(status) ||
    !validation.success ||
    normalizedDefinition === null ||
    canonicalJson(definition) !== canonicalJson(normalizedDefinition) ||
    integer(row, "version") < 1 ||
    (lastStatusEventKey === null) !== (lastStatusEventAt === null) ||
    updatedAt < createdAt ||
    !lifecycleValid
  ) {
    invalid();
  }
}

function validateCampaign(row: PostgresDataMigrationRow): void {
  const template = parseJsonObject(row, "template_snapshot_json");
  requireExactKeys(template, campaignTemplateKeys);
  const campaignKey = text(row, "campaign_key");
  const templateKey = text(row, "template_key");
  const name = text(row, "name");
  const timezone = text(row, "timezone");
  const lastErrorCode = nullableText(row, "last_error_code");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");
  const validation = validateCampaignDefinition({
    name,
    deliveryMode: text(row, "delivery_mode"),
    scheduledAt: nullableText(row, "scheduled_at"),
    timezone,
    template,
    audienceSnapshotKey: text(row, "audience_snapshot_key"),
    recipientCount: integer(row, "recipient_count"),
  });

  requireOptionalPattern(lastErrorCode, errorCodePattern);
  for (const field of ["activated_at", "started_at", "completed_at"]) {
    nullableTimestamp(row, field);
  }

  if (
    !campaignKeyPattern.test(campaignKey) ||
    !templateKeyPattern.test(templateKey) ||
    template.templateKey !== templateKey ||
    !campaignStatuses.has(text(row, "status")) ||
    !validation.success ||
    (validation.success &&
      canonicalJson(template) !== canonicalJson(validation.value.template)) ||
    integer(row, "version") < 1 ||
    name !== name.trim() ||
    timezone !== timezone.trim() ||
    controlCharacterPattern.test(name) ||
    controlCharacterPattern.test(timezone) ||
    updatedAt < createdAt
  ) {
    invalid();
  }
}

function validateRecipient(row: PostgresDataMigrationRow): void {
  const personalization = parseJsonObject(row, "personalization_json");
  const personalizationValidation =
    validateCampaignPersonalization(personalization);
  const status = text(row, "status");
  const lastErrorCode = nullableText(row, "last_error_code");
  const queuedAt = nullableTimestamp(row, "queued_at");
  const acceptedAt = nullableTimestamp(row, "accepted_at");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");
  const queueStateValid = (
    status === "pending" && queuedAt === null && acceptedAt === null
  ) || (
    ["queued", "sending", "failed", "skipped", "cancelled"].includes(
      status,
    ) && acceptedAt === null
  ) || (
    ["accepted", "delivered", "read"].includes(status) &&
    queuedAt !== null &&
    acceptedAt !== null
  );

  requireOptionalPattern(lastErrorCode, errorCodePattern);
  if (
    !campaignKeyPattern.test(text(row, "campaign_key")) ||
    !phonePattern.test(text(row, "phone_e164")) ||
    !sha256Pattern.test(text(row, "personalization_key")) ||
    !deliveryKeyPattern.test(text(row, "delivery_key")) ||
    !recipientStatuses.has(status) ||
    !personalizationValidation.success ||
    (personalizationValidation.success &&
      canonicalJson(personalization) !==
        canonicalJson(personalizationValidation.value)) ||
    integer(row, "contact_version") < 1 ||
    integer(row, "attempt_count") < 0 ||
    updatedAt < createdAt ||
    !queueStateValid
  ) {
    invalid();
  }
}

function column(
  name: string,
  kind:
    | "json"
    | "nonnegative-integer"
    | "positive-integer"
    | "text"
    | "timestamp",
  nullable = false,
) {
  return Object.freeze({
    name,
    kind,
    ...(nullable ? { nullable: true as const } : {}),
  });
}

export const POSTGRES_TEMPLATES_CAMPAIGNS_DATA_TABLE_CONTRACTS =
  Object.freeze([
    Object.freeze({
      name: "message_templates",
      columns: Object.freeze([
        column("template_key", "text"),
        column("tenant_id", "positive-integer"),
        column("meta_template_id", "text", true),
        column("name", "text"),
        column("language", "text"),
        column("category", "text"),
        column("status", "text"),
        column("definition_json", "json"),
        column("submission_key", "text", true),
        column("submission_started_at", "timestamp", true),
        column("last_submission_error_code", "text", true),
        column("last_status_event_key", "text", true),
        column("last_status_event_at", "timestamp", true),
        column("version", "positive-integer"),
        column("submitted_at", "timestamp", true),
        column("reviewed_at", "timestamp", true),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "template_key"]),
      validate: validateTemplate,
    }),
    Object.freeze({
      name: "campaigns",
      columns: Object.freeze([
        column("campaign_key", "text"),
        column("tenant_id", "positive-integer"),
        column("name", "text"),
        column("status", "text"),
        column("delivery_mode", "text"),
        column("scheduled_at", "timestamp", true),
        column("timezone", "text"),
        column("template_key", "text"),
        column("template_snapshot_json", "json"),
        column("audience_snapshot_key", "text"),
        column("recipient_count", "positive-integer"),
        column("version", "positive-integer"),
        column("activated_at", "timestamp", true),
        column("started_at", "timestamp", true),
        column("completed_at", "timestamp", true),
        column("last_error_code", "text", true),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "campaign_key"]),
      validate: validateCampaign,
    }),
    Object.freeze({
      name: "campaign_recipients",
      columns: Object.freeze([
        column("campaign_key", "text"),
        column("tenant_id", "positive-integer"),
        column("contact_id", "positive-integer"),
        column("contact_version", "positive-integer"),
        column("phone_e164", "text"),
        column("personalization_json", "json"),
        column("personalization_key", "text"),
        column("delivery_key", "text"),
        column("status", "text"),
        column("attempt_count", "nonnegative-integer"),
        column("last_error_code", "text", true),
        column("queued_at", "timestamp", true),
        column("accepted_at", "timestamp", true),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "campaign_key", "contact_id"]),
      validate: validateRecipient,
    }),
  ] satisfies readonly PostgresDataMigrationTableContract[]);

async function verifyLoadedState(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  const result = await transaction.query(
    `SELECT 1
     FROM campaigns AS campaign
     LEFT JOIN LATERAL (
       SELECT count(*)::integer AS recipient_count
       FROM campaign_recipients AS recipient
       WHERE recipient.tenant_id = campaign.tenant_id
         AND recipient.campaign_key = campaign.campaign_key
     ) AS actual ON TRUE
     WHERE campaign.recipient_count <> actual.recipient_count
     LIMIT 1`,
    [],
  );
  if (result.rowCount !== 0) {
    throw new Error("templates-campaigns-state-invalid");
  }
}

const protocol = createPostgresDataMigrationProtocol({
  version: "connect_postgres_templates_campaigns_data_v1",
  planKind: "postgres-templates-campaigns-data-migration-plan",
  evidenceKind: "postgres-templates-campaigns-data-migration-evidence",
  advisoryLockKey: [1129270867, 1],
  tables: POSTGRES_TEMPLATES_CAMPAIGNS_DATA_TABLE_CONTRACTS,
  verifyLoadedState,
});

export type PostgresTemplatesCampaignsDataSnapshot =
  PostgresDataMigrationSnapshot;
export type PostgresTemplatesCampaignsDataMigrationPlan =
  PostgresDataMigrationPlan;
export type PostgresTemplatesCampaignsDataMigrationEvidence =
  PostgresDataMigrationEvidence;

export const createPostgresTemplatesCampaignsDataSnapshot =
  protocol.createSnapshot;
export const createPostgresTemplatesCampaignsDataMigrationPlan =
  protocol.createPlan;
export const executePostgresTemplatesCampaignsDataMigration =
  protocol.execute;

export async function migratePostgresTemplatesCampaignsData(
  input: Readonly<{
    snapshot: PostgresTemplatesCampaignsDataSnapshot;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    createdAt: string;
    expiresAt: string;
    now: string;
  }>,
): Promise<PostgresTemplatesCampaignsDataMigrationEvidence> {
  const plan = createPostgresTemplatesCampaignsDataMigrationPlan({
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    evidenceHmacKey: input.evidenceHmacKey,
  });
  return executePostgresTemplatesCampaignsDataMigration({
    plan,
    transactions: input.transactions,
    evidenceHmacKey: input.evidenceHmacKey,
    now: input.now,
  });
}
