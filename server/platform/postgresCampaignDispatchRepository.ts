import type {
  CampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
import {
  campaignRecipientStatuses,
  type PersistedCampaignRecipient,
} from "../../shared/domain/campaign.ts";
import type {
  CampaignDeliveryContext,
  CampaignDispatchState,
} from "../../shared/domain/campaignDelivery.ts";
import {
  validateCampaignPersonalization,
} from "../../shared/validation/campaignPersonalization.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const maximumDispatchBatchSize = 50;
const campaignKeyPattern = /^campaign_v1_[0-9a-f]{64}$/;
const deliveryKeyPattern = /^campaign_delivery_v1_[0-9a-f]{64}$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const phonePattern = /^\+[1-9][0-9]{0,14}$/;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/;

const dispatchStateKeys = Object.freeze([
  "activatedAt",
  "campaignKey",
  "startedAt",
  "status",
  "tenantId",
  "version",
]);
const deliveryKeyRowKeys = Object.freeze(["deliveryKey"]);
const campaignKeyRowKeys = Object.freeze(["campaignKey"]);
const deliveryContextKeys = Object.freeze([
  "attemptCount",
  "campaignKey",
  "recipientPhoneNumber",
  "tenantId",
]);
const recipientRowKeys = Object.freeze([
  "acceptedAt",
  "attemptCount",
  "campaignKey",
  "contactId",
  "contactVersion",
  "createdAt",
  "deliveryKey",
  "lastErrorCode",
  "personalizationJson",
  "personalizationKey",
  "phoneNumber",
  "queuedAt",
  "status",
  "tenantId",
  "updatedAt",
]);

const dispatchStateColumns = `
  campaigns.campaign_key AS "campaignKey",
  campaigns.tenant_id AS "tenantId",
  campaigns.status,
  campaigns.version,
  campaigns.activated_at AS "activatedAt",
  campaigns.started_at AS "startedAt"
`;
const recipientColumns = `
  recipients.campaign_key AS "campaignKey",
  recipients.tenant_id AS "tenantId",
  recipients.contact_id AS "contactId",
  recipients.contact_version AS "contactVersion",
  recipients.phone_e164 AS "phoneNumber",
  recipients.personalization_json AS "personalizationJson",
  recipients.personalization_key AS "personalizationKey",
  recipients.delivery_key AS "deliveryKey",
  recipients.status,
  recipients.attempt_count AS "attemptCount",
  recipients.last_error_code AS "lastErrorCode",
  recipients.queued_at AS "queuedAt",
  recipients.accepted_at AS "acceptedAt",
  recipients.created_at AS "createdAt",
  recipients.updated_at AS "updatedAt"
`;
const approvedTemplateExistsSql = `
  EXISTS (
    SELECT 1
    FROM campaigns
    INNER JOIN message_templates
      ON message_templates.tenant_id = campaigns.tenant_id
      AND message_templates.template_key = campaigns.template_key
    WHERE campaigns.tenant_id = recipients.tenant_id
      AND campaigns.campaign_key = recipients.campaign_key
      AND campaigns.status = 'running'
      AND message_templates.status = 'approved'
      AND message_templates.meta_template_id =
        campaigns.template_snapshot_json ->> 'metaTemplateId'
      AND to_jsonb(message_templates.version) =
        campaigns.template_snapshot_json -> 'version'
  )
`;
const eligibleContactExistsSql = `
  EXISTS (
    SELECT 1
    FROM contacts
    WHERE contacts.tenant_id = recipients.tenant_id
      AND contacts.id = recipients.contact_id
      AND contacts.version = recipients.contact_version
      AND contacts.phone_e164 = recipients.phone_e164
      AND contacts.mailing_status = 'subscribed'
      AND contacts.consent_status = 'granted'
  )
`;

export const postgresCampaignDispatchSql = Object.freeze({
  activateCampaign: `
    UPDATE campaigns
    SET
      status = 'scheduled',
      activated_at = $4::timestamptz,
      version = version + 1,
      last_error_code = NULL,
      updated_at = $4::timestamptz
    WHERE tenant_id = $1
      AND campaign_key = $2
      AND version = $3
      AND status = 'draft'
      AND EXISTS (
        SELECT 1
        FROM message_templates
        WHERE message_templates.tenant_id = campaigns.tenant_id
          AND message_templates.template_key = campaigns.template_key
          AND message_templates.status = 'approved'
          AND message_templates.meta_template_id =
            campaigns.template_snapshot_json ->> 'metaTemplateId'
          AND to_jsonb(message_templates.version) =
            campaigns.template_snapshot_json -> 'version'
      )
    RETURNING ${dispatchStateColumns}
  `,
  promoteDueCampaigns: `
    WITH selected AS (
      SELECT campaign_key
      FROM campaigns
      WHERE status = 'scheduled'
        AND (
          delivery_mode = 'immediate'
          OR scheduled_at <= $1::timestamptz
        )
      ORDER BY
        CASE
          WHEN delivery_mode = 'immediate' THEN activated_at
          ELSE scheduled_at
        END ASC,
        campaign_key ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $2
    )
    UPDATE campaigns
    SET
      status = 'running',
      started_at = COALESCE(started_at, $1::timestamptz),
      version = version + 1,
      last_error_code = NULL,
      updated_at = $1::timestamptz
    FROM selected
    WHERE campaigns.campaign_key = selected.campaign_key
    RETURNING ${dispatchStateColumns}
  `,
  claimPendingRecipients: `
    WITH selected AS (
      SELECT recipients.campaign_key, recipients.contact_id
      FROM campaign_recipients AS recipients
      INNER JOIN campaigns
        ON campaigns.tenant_id = recipients.tenant_id
        AND campaigns.campaign_key = recipients.campaign_key
      WHERE recipients.status = 'pending'
        AND campaigns.status = 'running'
      ORDER BY
        campaigns.started_at ASC,
        recipients.campaign_key ASC,
        recipients.contact_id ASC
      FOR UPDATE OF recipients SKIP LOCKED
      LIMIT $2
    )
    UPDATE campaign_recipients AS recipients
    SET
      status = 'queued',
      queued_at = $1::timestamptz,
      last_error_code = NULL,
      updated_at = $1::timestamptz
    FROM selected
    WHERE recipients.campaign_key = selected.campaign_key
      AND recipients.contact_id = selected.contact_id
    RETURNING recipients.delivery_key AS "deliveryKey"
  `,
  completeSettledCampaigns: `
    WITH selected AS (
      SELECT campaigns.campaign_key
      FROM campaigns
      WHERE campaigns.status = 'running'
        AND NOT EXISTS (
          SELECT 1
          FROM campaign_recipients AS recipients
          WHERE recipients.tenant_id = campaigns.tenant_id
            AND recipients.campaign_key = campaigns.campaign_key
            AND recipients.status IN (
              'pending',
              'queued',
              'sending',
              'accepted'
            )
        )
      ORDER BY campaigns.started_at ASC, campaigns.campaign_key ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $2
    )
    UPDATE campaigns
    SET
      status = 'completed',
      completed_at = $1::timestamptz,
      version = version + 1,
      last_error_code = NULL,
      updated_at = $1::timestamptz
    FROM selected
    WHERE campaigns.campaign_key = selected.campaign_key
    RETURNING campaigns.campaign_key AS "campaignKey"
  `,
  releaseQueuedRecipients: `
    UPDATE campaign_recipients AS recipients
    SET
      status = 'pending',
      queued_at = NULL,
      last_error_code = 'QUEUE_PUBLISH_FAILED',
      updated_at = $1::timestamptz
    WHERE recipients.status = 'queued'
      AND recipients.delivery_key IN (
        SELECT input.value
        FROM jsonb_array_elements_text($2::jsonb) AS input(value)
      )
    RETURNING recipients.delivery_key AS "deliveryKey"
  `,
  findQueuedDeliveryContext: `
    SELECT
      recipients.campaign_key AS "campaignKey",
      recipients.tenant_id AS "tenantId",
      recipients.phone_e164 AS "recipientPhoneNumber",
      recipients.attempt_count AS "attemptCount"
    FROM campaign_recipients AS recipients
    INNER JOIN campaigns
      ON campaigns.tenant_id = recipients.tenant_id
      AND campaigns.campaign_key = recipients.campaign_key
    WHERE recipients.delivery_key = $1
      AND recipients.status = 'queued'
      AND campaigns.status = 'running'
    LIMIT 1
  `,
  prepareDelivery: `
    UPDATE campaign_recipients AS recipients
    SET
      status = CASE
        WHEN (${approvedTemplateExistsSql})
          AND (${eligibleContactExistsSql})
        THEN 'sending'
        ELSE 'skipped'
      END,
      attempt_count = attempt_count + CASE
        WHEN (${approvedTemplateExistsSql})
          AND (${eligibleContactExistsSql})
        THEN 1
        ELSE 0
      END,
      last_error_code = CASE
        WHEN NOT (${approvedTemplateExistsSql})
        THEN 'TEMPLATE_NOT_APPROVED'
        WHEN NOT (${eligibleContactExistsSql})
        THEN 'CONSENT_NOT_GRANTED'
        ELSE NULL
      END,
      updated_at = $2::timestamptz
    WHERE recipients.delivery_key = $1
      AND recipients.status = 'queued'
      AND EXISTS (
        SELECT 1
        FROM campaigns
        WHERE campaigns.tenant_id = recipients.tenant_id
          AND campaigns.campaign_key = recipients.campaign_key
          AND campaigns.status = 'running'
      )
    RETURNING ${recipientColumns}
  `,
  markRejected: `
    UPDATE campaign_recipients AS recipients
    SET
      status = 'failed',
      last_error_code = $2,
      updated_at = $3::timestamptz
    WHERE recipients.delivery_key = $1
      AND recipients.status = 'sending'
    RETURNING recipients.delivery_key AS "deliveryKey"
  `,
  markDeferred: `
    UPDATE campaign_recipients AS recipients
    SET
      status = 'queued',
      last_error_code = $2,
      updated_at = $3::timestamptz
    WHERE recipients.delivery_key = $1
      AND recipients.status = 'sending'
    RETURNING recipients.delivery_key AS "deliveryKey"
  `,
  markAmbiguous: `
    UPDATE campaign_recipients AS recipients
    SET
      last_error_code = $2,
      updated_at = $3::timestamptz
    WHERE recipients.delivery_key = $1
      AND recipients.status = 'sending'
    RETURNING recipients.delivery_key AS "deliveryKey"
  `,
});

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return Number(value);
}

function requireLimit(value: unknown): number {
  const limit = requirePositiveInteger(value, "limit");

  if (limit > maximumDispatchBatchSize) {
    throw new Error(`limit must not exceed ${maximumDispatchBatchSize}`);
  }

  return limit;
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

function requireCampaignKey(value: unknown): string {
  return requirePattern(value, campaignKeyPattern, "campaignKey");
}

function requireDeliveryKey(value: unknown): string {
  return requirePattern(value, deliveryKeyPattern, "deliveryKey");
}

function requireTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("timestamp is invalid");
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("timestamp is invalid");
  }

  return value;
}

function parseTimestamp(value: unknown): string {
  return requireTimestamp(parsePostgresTimestamp(value));
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null ? null : parseTimestamp(value);
}

function requireErrorCode(value: unknown): string {
  return requirePattern(value, errorCodePattern, "errorCode");
}

function parseNonnegativeInteger(value: unknown): number {
  const normalized =
    typeof value === "string" && /^(?:0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;

  if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
    throw new Error("PostgreSQL returned an invalid nonnegative integer");
  }

  return Number(normalized);
}

function parseDispatchState(value: unknown): CampaignDispatchState {
  const row = requireExactPostgresRow(value, dispatchStateKeys);
  if (row.status !== "scheduled" && row.status !== "running") {
    throw new Error("PostgreSQL returned an invalid campaign dispatch state");
  }

  const state: CampaignDispatchState = {
    campaignKey: requireCampaignKey(row.campaignKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    status: row.status,
    version: parsePostgresPositiveInteger(row.version),
    activatedAt: parseTimestamp(row.activatedAt),
    startedAt: parseNullableTimestamp(row.startedAt),
  };

  if (
    (state.status === "scheduled" && state.startedAt !== null) ||
    (state.status === "running" && state.startedAt === null)
  ) {
    throw new Error("PostgreSQL returned an invalid campaign dispatch lifecycle");
  }

  return Object.freeze(state);
}

function parseDeliveryKeyRow(value: unknown): string {
  const row = requireExactPostgresRow(value, deliveryKeyRowKeys);
  return requireDeliveryKey(row.deliveryKey);
}

function isRecipientStatus(
  value: unknown,
): value is PersistedCampaignRecipient["status"] {
  return campaignRecipientStatuses.some((status) => status === value);
}

function parseRecipient(value: unknown): PersistedCampaignRecipient {
  const row = requireExactPostgresRow(value, recipientRowKeys);
  const personalizationValidation =
    validateCampaignPersonalization(row.personalizationJson);
  const status = row.status;
  const lastErrorCode = row.lastErrorCode === null
    ? null
    : requirePattern(
        row.lastErrorCode,
        errorCodePattern,
        "PostgreSQL lastErrorCode",
      );

  if (!personalizationValidation.success || !isRecipientStatus(status)) {
    throw new Error("PostgreSQL returned an invalid campaign recipient");
  }

  return Object.freeze({
    campaignKey: requireCampaignKey(row.campaignKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    contactId: parsePostgresPositiveInteger(row.contactId),
    contactVersion: parsePostgresPositiveInteger(row.contactVersion),
    phoneNumber: requirePattern(
      row.phoneNumber,
      phonePattern,
      "PostgreSQL phoneNumber",
    ),
    personalization: personalizationValidation.value,
    personalizationKey: requirePattern(
      row.personalizationKey,
      sha256Pattern,
      "PostgreSQL personalizationKey",
    ),
    deliveryKey: requireDeliveryKey(row.deliveryKey),
    status,
    attemptCount: parseNonnegativeInteger(row.attemptCount),
    lastErrorCode,
    queuedAt: parseNullableTimestamp(row.queuedAt),
    acceptedAt: parseNullableTimestamp(row.acceptedAt),
    createdAt: parseTimestamp(row.createdAt),
    updatedAt: parseTimestamp(row.updatedAt),
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

async function requireTransition(
  queries: PostgresQueryExecutor,
  sql: string,
  deliveryKey: string,
  parameters: readonly PostgresParameter[],
): Promise<void> {
  const row = await loadOne(queries, sql, parameters);

  if (row === null || parseDeliveryKeyRow(row) !== deliveryKey) {
    throw new Error("PostgreSQL campaign recipient transition failed");
  }
}

export function createPostgresCampaignDispatchRepository(
  queries: PostgresQueryExecutor,
): CampaignDispatchRepository {
  if (typeof queries?.query !== "function") {
    throw new Error("PostgreSQL campaign dispatch dependency is invalid");
  }

  const repository: CampaignDispatchRepository = {
    async activateCampaign(
      tenantIdInput,
      campaignKeyInput,
      expectedVersionInput,
      activatedAtInput,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const campaignKey = requireCampaignKey(campaignKeyInput);
      const expectedVersion = requirePositiveInteger(
        expectedVersionInput,
        "expectedVersion",
      );
      const activatedAt = requireTimestamp(activatedAtInput);
      const row = await loadOne(
        queries,
        postgresCampaignDispatchSql.activateCampaign,
        [tenantId, campaignKey, expectedVersion, activatedAt],
      );

      return row === null ? null : parseDispatchState(row);
    },

    async promoteDueCampaigns(nowInput, limitInput) {
      const now = requireTimestamp(nowInput);
      const limit = requireLimit(limitInput);
      const rows = await loadRows(
        queries,
        postgresCampaignDispatchSql.promoteDueCampaigns,
        [now, limit],
        limit,
      );

      return Object.freeze(rows.map(parseDispatchState));
    },

    async claimPendingRecipients(nowInput, limitInput) {
      const now = requireTimestamp(nowInput);
      const limit = requireLimit(limitInput);
      const rows = await loadRows(
        queries,
        postgresCampaignDispatchSql.claimPendingRecipients,
        [now, limit],
        limit,
      );

      return Object.freeze(
        rows.map((row) => Object.freeze({
          deliveryKey: parseDeliveryKeyRow(row),
        })),
      );
    },

    async completeSettledCampaigns(nowInput, limitInput) {
      const now = requireTimestamp(nowInput);
      const limit = requireLimit(limitInput);
      const rows = await loadRows(
        queries,
        postgresCampaignDispatchSql.completeSettledCampaigns,
        [now, limit],
        limit,
      );

      for (const value of rows) {
        const row = requireExactPostgresRow(value, campaignKeyRowKeys);
        requireCampaignKey(row.campaignKey);
      }

      return rows.length;
    },

    async releaseQueuedRecipients(deliveryKeysInput, nowInput) {
      const now = requireTimestamp(nowInput);
      if (deliveryKeysInput.length === 0) {
        return;
      }
      if (deliveryKeysInput.length > maximumDispatchBatchSize) {
        throw new Error("deliveryKeys exceeds dispatch batch size");
      }

      const deliveryKeys = deliveryKeysInput.map(requireDeliveryKey);
      if (new Set(deliveryKeys).size !== deliveryKeys.length) {
        throw new Error("deliveryKeys contains a duplicate");
      }

      const rows = await loadRows(
        queries,
        postgresCampaignDispatchSql.releaseQueuedRecipients,
        [now, JSON.stringify(deliveryKeys)],
        deliveryKeys.length,
      );

      for (const row of rows) {
        if (!deliveryKeys.includes(parseDeliveryKeyRow(row))) {
          throw new Error("PostgreSQL returned an invalid released delivery");
        }
      }
    },

    async findQueuedDeliveryContext(deliveryKeyInput) {
      const deliveryKey = requireDeliveryKey(deliveryKeyInput);
      const value = await loadOne(
        queries,
        postgresCampaignDispatchSql.findQueuedDeliveryContext,
        [deliveryKey],
      );

      if (value === null) {
        return null;
      }

      const row = requireExactPostgresRow(value, deliveryContextKeys);
      const attemptCount = parseNonnegativeInteger(row.attemptCount);
      if (attemptCount >= Number.MAX_SAFE_INTEGER) {
        throw new Error("PostgreSQL returned an invalid delivery attempt");
      }

      const context: CampaignDeliveryContext = {
        campaignKey: requireCampaignKey(row.campaignKey),
        tenantId: parsePostgresPositiveInteger(row.tenantId),
        recipientPhoneNumber: requirePattern(
          row.recipientPhoneNumber,
          phonePattern,
          "PostgreSQL recipientPhoneNumber",
        ),
        nextDeliveryAttemptNumber: attemptCount + 1,
      };

      return Object.freeze(context);
    },

    async prepareDelivery(deliveryKeyInput, nowInput) {
      const deliveryKey = requireDeliveryKey(deliveryKeyInput);
      const now = requireTimestamp(nowInput);
      const value = await loadOne(
        queries,
        postgresCampaignDispatchSql.prepareDelivery,
        [deliveryKey, now],
      );

      if (value === null) {
        return Object.freeze({ outcome: "duplicate" as const });
      }

      const recipient = parseRecipient(value);
      if (recipient.deliveryKey !== deliveryKey) {
        throw new Error("PostgreSQL returned a mismatched campaign recipient");
      }
      if (recipient.status === "skipped") {
        return Object.freeze({ outcome: "skipped" as const });
      }
      if (recipient.status !== "sending") {
        throw new Error("PostgreSQL returned an invalid prepared delivery state");
      }

      return Object.freeze({ outcome: "claimed" as const, recipient });
    },

    async markRejected(deliveryKeyInput, errorCodeInput, updatedAtInput) {
      const deliveryKey = requireDeliveryKey(deliveryKeyInput);
      const errorCode = requireErrorCode(errorCodeInput);
      const updatedAt = requireTimestamp(updatedAtInput);
      await requireTransition(
        queries,
        postgresCampaignDispatchSql.markRejected,
        deliveryKey,
        [deliveryKey, errorCode, updatedAt],
      );
    },

    async markDeferred(deliveryKeyInput, errorCodeInput, updatedAtInput) {
      const deliveryKey = requireDeliveryKey(deliveryKeyInput);
      const errorCode = requireErrorCode(errorCodeInput);
      const updatedAt = requireTimestamp(updatedAtInput);
      await requireTransition(
        queries,
        postgresCampaignDispatchSql.markDeferred,
        deliveryKey,
        [deliveryKey, errorCode, updatedAt],
      );
    },

    async markAmbiguous(deliveryKeyInput, errorCodeInput, updatedAtInput) {
      const deliveryKey = requireDeliveryKey(deliveryKeyInput);
      const errorCode = requireErrorCode(errorCodeInput);
      const updatedAt = requireTimestamp(updatedAtInput);
      await requireTransition(
        queries,
        postgresCampaignDispatchSql.markAmbiguous,
        deliveryKey,
        [deliveryKey, errorCode, updatedAt],
      );
    },
  };

  return Object.freeze(repository);
}
