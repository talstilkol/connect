import {
  persistedCampaignStatuses,
  type PersistedCampaign,
  type ValidatedCampaignDefinition,
} from "../../shared/domain/campaign.ts";
import {
  validateCampaignDefinition,
} from "../../shared/validation/campaignDefinition.ts";
import {
  validateCampaignPersonalization,
  type CampaignPersonalization,
} from "../../shared/validation/campaignPersonalization.ts";
import type {
  CampaignRepository,
  SaveCampaignSnapshotInput,
} from "../../db/campaignRepository.ts";
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

const maximumRecipientPayloadBytes = 1_500_000;
const campaignKeyPattern = /^campaign_v1_[0-9a-f]{64}$/;
const deliveryKeyPattern = /^campaign_delivery_v1_[0-9a-f]{64}$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const phonePattern = /^\+[1-9][0-9]{0,14}$/;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/;

const campaignRowKeys = Object.freeze([
  "activatedAt",
  "audienceSnapshotKey",
  "campaignKey",
  "completedAt",
  "createdAt",
  "deliveryMode",
  "lastErrorCode",
  "name",
  "recipientCount",
  "scheduledAt",
  "startedAt",
  "status",
  "templateKey",
  "templateSnapshotJson",
  "tenantId",
  "timezone",
  "updatedAt",
  "version",
]);
const campaignKeyRowKeys = Object.freeze(["campaignKey"]);
const deliveryKeyRowKeys = Object.freeze(["deliveryKey"]);
const recipientSnapshotRowKeys = Object.freeze([
  "contactId",
  "contactVersion",
  "deliveryKey",
  "personalizationJson",
  "personalizationKey",
  "phoneNumber",
]);

const campaignColumns = `
  campaigns.campaign_key AS "campaignKey",
  campaigns.tenant_id AS "tenantId",
  campaigns.name,
  campaigns.status,
  campaigns.delivery_mode AS "deliveryMode",
  campaigns.scheduled_at AS "scheduledAt",
  campaigns.timezone,
  campaigns.template_key AS "templateKey",
  campaigns.template_snapshot_json AS "templateSnapshotJson",
  campaigns.audience_snapshot_key AS "audienceSnapshotKey",
  campaigns.recipient_count AS "recipientCount",
  campaigns.version,
  campaigns.activated_at AS "activatedAt",
  campaigns.started_at AS "startedAt",
  campaigns.completed_at AS "completedAt",
  campaigns.last_error_code AS "lastErrorCode",
  campaigns.created_at AS "createdAt",
  campaigns.updated_at AS "updatedAt"
`;

export const postgresCampaignSql = Object.freeze({
  insertCampaign: `
    INSERT INTO campaigns (
      campaign_key,
      tenant_id,
      name,
      status,
      delivery_mode,
      scheduled_at,
      timezone,
      template_key,
      template_snapshot_json,
      audience_snapshot_key,
      recipient_count
    )
    SELECT
      $1,
      $2,
      $3,
      'draft',
      $4,
      $5::timestamptz,
      $6,
      $7,
      $8::jsonb,
      $9,
      $10
    FROM message_templates
    WHERE tenant_id = $2
      AND template_key = $7
      AND meta_template_id = $11
      AND version = $12
      AND status = 'approved'
      AND definition_json = $13::jsonb
      AND name = $14
      AND category = $15
      AND language = $16
    ON CONFLICT DO NOTHING
    RETURNING campaign_key AS "campaignKey"
  `,
  findByKey: `
    SELECT ${campaignColumns}
    FROM campaigns
    WHERE campaigns.tenant_id = $1
      AND campaigns.campaign_key = $2
    LIMIT 1
  `,
  findByKeyForUpdate: `
    SELECT ${campaignColumns}
    FROM campaigns
    WHERE campaigns.tenant_id = $1
      AND campaigns.campaign_key = $2
    FOR UPDATE
  `,
  insertRecipients: `
    WITH input AS (
      SELECT *
      FROM jsonb_to_recordset($3::jsonb) AS recipient(
        contact_id bigint,
        contact_version integer,
        phone_number text,
        personalization_json jsonb,
        personalization_key text,
        delivery_key text
      )
    )
    INSERT INTO campaign_recipients (
      campaign_key,
      tenant_id,
      contact_id,
      contact_version,
      phone_e164,
      personalization_json,
      personalization_key,
      delivery_key,
      status
    )
    SELECT
      $1,
      $2,
      input.contact_id,
      input.contact_version,
      input.phone_number,
      input.personalization_json,
      input.personalization_key,
      input.delivery_key,
      'pending'
    FROM input
    INNER JOIN contacts
      ON contacts.tenant_id = $2
      AND contacts.id = input.contact_id
      AND contacts.version = input.contact_version
      AND contacts.phone_e164 = input.phone_number
      AND contacts.mailing_status = 'subscribed'
      AND contacts.consent_status = 'granted'
    ON CONFLICT DO NOTHING
    RETURNING delivery_key AS "deliveryKey"
  `,
  listRecipientSnapshot: `
    SELECT
      recipients.contact_id AS "contactId",
      recipients.contact_version AS "contactVersion",
      recipients.phone_e164 AS "phoneNumber",
      recipients.personalization_json AS "personalizationJson",
      recipients.personalization_key AS "personalizationKey",
      recipients.delivery_key AS "deliveryKey"
    FROM campaign_recipients AS recipients
    WHERE recipients.tenant_id = $1
      AND recipients.campaign_key = $2
    ORDER BY recipients.contact_id ASC
  `,
  listByTenant: `
    SELECT ${campaignColumns}
    FROM campaigns
    WHERE campaigns.tenant_id = $1
    ORDER BY campaigns.updated_at DESC, campaigns.campaign_key ASC
    LIMIT $2
  `,
});

interface NormalizedRecipientSnapshot {
  readonly contactId: number;
  readonly contactVersion: number;
  readonly phoneNumber: string;
  readonly personalization: CampaignPersonalization;
  readonly personalizationKey: string;
  readonly deliveryKey: string;
}

interface SerializedRecipientSnapshot {
  readonly contact_id: number;
  readonly contact_version: number;
  readonly phone_number: string;
  readonly personalization_json: CampaignPersonalization;
  readonly personalization_key: string;
  readonly delivery_key: string;
}

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

function requireCampaignKey(value: unknown): string {
  return requirePattern(value, campaignKeyPattern, "campaignKey");
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null ? null : parsePostgresTimestamp(value);
}

function isCampaignStatus(
  value: unknown,
): value is PersistedCampaign["status"] {
  return persistedCampaignStatuses.some((status) => status === value);
}

function parseCampaign(value: unknown): PersistedCampaign {
  const row = requireExactPostgresRow(value, campaignRowKeys);
  const definition = validateCampaignDefinition({
    name: row.name,
    deliveryMode: row.deliveryMode,
    scheduledAt: parseNullableTimestamp(row.scheduledAt),
    timezone: row.timezone,
    template: row.templateSnapshotJson,
    audienceSnapshotKey: row.audienceSnapshotKey,
    recipientCount: parsePostgresPositiveInteger(row.recipientCount),
  });
  const status = row.status;
  const lastErrorCode = row.lastErrorCode === null
    ? null
    : requirePattern(
        row.lastErrorCode,
        errorCodePattern,
        "PostgreSQL campaign error code",
      );

  if (
    !definition.success ||
    definition.value.template.templateKey !== row.templateKey ||
    !isCampaignStatus(status)
  ) {
    throw new Error("PostgreSQL returned an invalid campaign");
  }

  const campaign: PersistedCampaign = {
    campaignKey: requireCampaignKey(row.campaignKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    status,
    version: parsePostgresPositiveInteger(row.version),
    activatedAt: parseNullableTimestamp(row.activatedAt),
    startedAt: parseNullableTimestamp(row.startedAt),
    completedAt: parseNullableTimestamp(row.completedAt),
    lastErrorCode,
    createdAt: parsePostgresTimestamp(row.createdAt),
    updatedAt: parsePostgresTimestamp(row.updatedAt),
    ...definition.value,
  };

  if (campaign.updatedAt < campaign.createdAt) {
    throw new Error("PostgreSQL returned an invalid campaign timeline");
  }

  return Object.freeze(campaign);
}

function normalizeRecipients(
  input: SaveCampaignSnapshotInput,
): Readonly<{
  recipients: readonly NormalizedRecipientSnapshot[];
  payload: string;
}> {
  if (input.recipients.length !== input.recipientCount) {
    throw new Error("campaign recipient count does not match snapshot");
  }

  const contactIds = new Set<number>();
  const deliveryKeys = new Set<string>();
  const recipients = input.recipients.map((recipient) => {
    const contactId = requirePositiveInteger(recipient.contactId, "contactId");
    const contactVersion = requirePositiveInteger(
      recipient.contactVersion,
      "contactVersion",
    );
    const phoneNumber = requirePattern(
      recipient.phoneNumber,
      phonePattern,
      "campaign recipient phoneNumber",
    );
    const personalizationKey = requirePattern(
      recipient.personalizationKey,
      sha256Pattern,
      "campaign recipient personalizationKey",
    );
    const deliveryKey = requirePattern(
      recipient.deliveryKey,
      deliveryKeyPattern,
      "campaign recipient deliveryKey",
    );
    const personalization = validateCampaignPersonalization(
      recipient.personalization,
    );

    if (!personalization.success) {
      throw new Error("campaign recipient personalization is invalid");
    }
    if (contactIds.has(contactId) || deliveryKeys.has(deliveryKey)) {
      throw new Error("campaign recipient identity is duplicated");
    }

    contactIds.add(contactId);
    deliveryKeys.add(deliveryKey);
    return Object.freeze({
      contactId,
      contactVersion,
      phoneNumber,
      personalization: personalization.value,
      personalizationKey,
      deliveryKey,
    });
  }).sort((left, right) => left.contactId - right.contactId);
  const serialized: readonly SerializedRecipientSnapshot[] = recipients.map(
    (recipient) => ({
      contact_id: recipient.contactId,
      contact_version: recipient.contactVersion,
      phone_number: recipient.phoneNumber,
      personalization_json: recipient.personalization,
      personalization_key: recipient.personalizationKey,
      delivery_key: recipient.deliveryKey,
    }),
  );
  const payload = JSON.stringify(serialized);

  if (new TextEncoder().encode(payload).byteLength > maximumRecipientPayloadBytes) {
    throw new Error("campaign recipient snapshot is too large");
  }

  return Object.freeze({
    recipients: Object.freeze(recipients),
    payload,
  });
}

function parseRecipientSnapshot(value: unknown): NormalizedRecipientSnapshot {
  const row = requireExactPostgresRow(value, recipientSnapshotRowKeys);
  const personalization = validateCampaignPersonalization(
    row.personalizationJson,
  );

  if (!personalization.success) {
    throw new Error("PostgreSQL returned invalid campaign personalization");
  }

  return Object.freeze({
    contactId: parsePostgresPositiveInteger(row.contactId),
    contactVersion: parsePostgresPositiveInteger(row.contactVersion),
    phoneNumber: requirePattern(
      row.phoneNumber,
      phonePattern,
      "PostgreSQL campaign recipient phone",
    ),
    personalization: personalization.value,
    personalizationKey: requirePattern(
      row.personalizationKey,
      sha256Pattern,
      "PostgreSQL campaign personalization key",
    ),
    deliveryKey: requirePattern(
      row.deliveryKey,
      deliveryKeyPattern,
      "PostgreSQL campaign delivery key",
    ),
  });
}

function assertCampaignMatches(
  stored: PersistedCampaign,
  input: SaveCampaignSnapshotInput,
): void {
  const storedDefinition: ValidatedCampaignDefinition = {
    name: stored.name,
    deliveryMode: stored.deliveryMode,
    scheduledAt: stored.scheduledAt,
    timezone: stored.timezone,
    template: stored.template,
    audienceSnapshotKey: stored.audienceSnapshotKey,
    recipientCount: stored.recipientCount,
  };
  const inputDefinition: ValidatedCampaignDefinition = {
    name: input.name,
    deliveryMode: input.deliveryMode,
    scheduledAt: input.scheduledAt,
    timezone: input.timezone,
    template: input.template,
    audienceSnapshotKey: input.audienceSnapshotKey,
    recipientCount: input.recipientCount,
  };

  if (
    stored.campaignKey !== input.campaignKey ||
    stored.tenantId !== input.tenantId ||
    JSON.stringify(storedDefinition) !== JSON.stringify(inputDefinition)
  ) {
    throw new Error("stored campaign snapshot conflicts with input");
  }
}

function assertRecipientsMatch(
  stored: readonly NormalizedRecipientSnapshot[],
  expected: readonly NormalizedRecipientSnapshot[],
): void {
  if (JSON.stringify(stored) !== JSON.stringify(expected)) {
    throw new Error("stored campaign recipients conflict with input");
  }
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

export interface PostgresCampaignRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

export function createPostgresCampaignRepository(
  dependencies: Readonly<PostgresCampaignRepositoryDependencies>,
): CampaignRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL campaign repository dependencies are invalid");
  }

  const findByKey: CampaignRepository["findByKey"] = async (
    tenantIdInput,
    campaignKeyInput,
  ) => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const campaignKey = requireCampaignKey(campaignKeyInput);
    const row = await loadOne(
      dependencies.queries,
      postgresCampaignSql.findByKey,
      [tenantId, campaignKey],
    );

    return row === null ? null : parseCampaign(row);
  };

  const repository: CampaignRepository = {
    async saveSnapshot(input) {
      const tenantId = requirePositiveInteger(input?.tenantId, "tenantId");
      const campaignKey = requireCampaignKey(input?.campaignKey);
      const definition = validateCampaignDefinition(input);

      if (!definition.success) {
        throw new Error("campaign snapshot definition is invalid");
      }

      const normalizedInput: SaveCampaignSnapshotInput = {
        ...input,
        ...definition.value,
        tenantId,
        campaignKey,
      };
      const recipientSnapshot = normalizeRecipients(normalizedInput);

      try {
        return await dependencies.transactions.transaction(
          { isolationLevel: "read-committed" },
          async (transaction) => {
            const insertedCampaignRows = await loadRows(
              transaction,
              postgresCampaignSql.insertCampaign,
              [
                campaignKey,
                tenantId,
                definition.value.name,
                definition.value.deliveryMode,
                definition.value.scheduledAt,
                definition.value.timezone,
                definition.value.template.templateKey,
                JSON.stringify(definition.value.template),
                definition.value.audienceSnapshotKey,
                definition.value.recipientCount,
                definition.value.template.metaTemplateId,
                definition.value.template.version,
                JSON.stringify({
                  header: definition.value.template.header,
                  body: definition.value.template.body,
                  footer: definition.value.template.footer,
                  variableExamples:
                    definition.value.template.variableExamples,
                  buttonMode: definition.value.template.buttonMode,
                  quickReplies: definition.value.template.quickReplies,
                  urlButton: definition.value.template.urlButton,
                  phoneButton: definition.value.template.phoneButton,
                }),
                definition.value.template.name,
                definition.value.template.category,
                definition.value.template.language,
              ],
              1,
            );
            for (const value of insertedCampaignRows) {
              const row = requireExactPostgresRow(value, campaignKeyRowKeys);
              if (requireCampaignKey(row.campaignKey) !== campaignKey) {
                throw new Error("PostgreSQL inserted a mismatched campaign");
              }
            }

            const storedRow = await loadOne(
              transaction,
              postgresCampaignSql.findByKeyForUpdate,
              [tenantId, campaignKey],
            );
            if (storedRow === null) {
              throw new Error("PostgreSQL campaign snapshot was not created");
            }

            const stored = parseCampaign(storedRow);
            assertCampaignMatches(stored, normalizedInput);

            const insertedRecipientRows = await loadRows(
              transaction,
              postgresCampaignSql.insertRecipients,
              [campaignKey, tenantId, recipientSnapshot.payload],
              definition.value.recipientCount,
            );
            const expectedDeliveryKeys = new Set(
              recipientSnapshot.recipients.map(({ deliveryKey }) => deliveryKey),
            );
            for (const value of insertedRecipientRows) {
              const row = requireExactPostgresRow(value, deliveryKeyRowKeys);
              const deliveryKey = requirePattern(
                row.deliveryKey,
                deliveryKeyPattern,
                "PostgreSQL inserted deliveryKey",
              );
              if (!expectedDeliveryKeys.has(deliveryKey)) {
                throw new Error("PostgreSQL inserted an unexpected recipient");
              }
            }

            const storedRecipientRows = await loadRows(
              transaction,
              postgresCampaignSql.listRecipientSnapshot,
              [tenantId, campaignKey],
              definition.value.recipientCount,
            );
            const storedRecipients = storedRecipientRows.map(
              parseRecipientSnapshot,
            );
            assertRecipientsMatch(
              storedRecipients,
              recipientSnapshot.recipients,
            );

            return stored;
          },
        );
      } catch {
        throw new Error("PostgreSQL campaign snapshot write failed");
      }
    },

    findByKey,

    async listByTenant(tenantIdInput, limitInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const limit = requirePositiveInteger(limitInput, "limit");
      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }

      const rows = await loadRows(
        dependencies.queries,
        postgresCampaignSql.listByTenant,
        [tenantId, limit],
        limit,
      );
      return Object.freeze(rows.map(parseCampaign));
    },
  };

  return Object.freeze(repository);
}
