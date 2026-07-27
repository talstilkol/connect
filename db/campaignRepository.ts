import {
  persistedCampaignStatuses,
  type PersistedCampaign,
  type ValidatedCampaignDefinition,
} from "../shared/domain/campaign.ts";
import {
  validateCampaignDefinition,
} from "../shared/validation/campaignDefinition.ts";
import {
  validateCampaignPersonalization,
  type CampaignPersonalization,
} from "../shared/validation/campaignPersonalization.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const MAXIMUM_RECIPIENT_PAYLOAD_BYTES = 1_500_000;

const CAMPAIGN_COLUMNS_SQL = `
  campaign_key AS campaignKey,
  tenant_id AS tenantId,
  name,
  status,
  delivery_mode AS deliveryMode,
  scheduled_at AS scheduledAt,
  timezone,
  template_key AS templateKey,
  template_snapshot_json AS templateSnapshotJson,
  audience_snapshot_key AS audienceSnapshotKey,
  recipient_count AS recipientCount,
  version,
  activated_at AS activatedAt,
  started_at AS startedAt,
  completed_at AS completedAt,
  last_error_code AS lastErrorCode,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const INSERT_CAMPAIGN_SQL = `
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
    ?1,
    ?2,
    ?3,
    'draft',
    ?4,
    ?5,
    ?6,
    ?7,
    ?8,
    ?9,
    ?10
  FROM message_templates
  WHERE tenant_id = ?2
    AND template_key = ?7
    AND meta_template_id = ?11
    AND version = ?12
    AND status = 'approved'
    AND (
      SELECT count(*)
      FROM json_each(?13)
    ) = ?10
    AND NOT EXISTS (
      SELECT 1
      FROM json_each(?13) AS recipient
      LEFT JOIN contacts
        ON contacts.tenant_id = ?2
        AND contacts.id = CAST(
          json_extract(
            recipient.value,
            '$.contactId'
          ) AS INTEGER
        )
      WHERE contacts.id IS NULL
        OR contacts.version IS NOT CAST(
          json_extract(
            recipient.value,
            '$.contactVersion'
          ) AS INTEGER
        )
        OR contacts.phone_e164 IS NOT
          json_extract(
            recipient.value,
            '$.phoneNumber'
          )
        OR contacts.mailing_status != 'subscribed'
        OR contacts.consent_status != 'granted'
    )
  ON CONFLICT (campaign_key) DO NOTHING
`;

const INSERT_RECIPIENTS_SQL = `
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
    ?1,
    ?2,
    CAST(
      json_extract(recipient.value, '$.contactId')
      AS INTEGER
    ),
    CAST(
      json_extract(
        recipient.value,
        '$.contactVersion'
      ) AS INTEGER
    ),
    json_extract(
      recipient.value,
      '$.phoneNumber'
    ),
    json_extract(
      recipient.value,
      '$.personalizationJson'
    ),
    json_extract(
      recipient.value,
      '$.personalizationKey'
    ),
    json_extract(
      recipient.value,
      '$.deliveryKey'
    ),
    'pending'
  FROM json_each(?3) AS recipient
  INNER JOIN contacts
    ON contacts.tenant_id = ?2
    AND contacts.id = CAST(
      json_extract(
        recipient.value,
        '$.contactId'
      ) AS INTEGER
    )
  WHERE contacts.version = CAST(
      json_extract(
        recipient.value,
        '$.contactVersion'
      ) AS INTEGER
    )
    AND contacts.phone_e164 =
      json_extract(
        recipient.value,
        '$.phoneNumber'
      )
    AND contacts.mailing_status = 'subscribed'
    AND contacts.consent_status = 'granted'
  ON CONFLICT (campaign_key, contact_id) DO NOTHING
`;

const SELECT_BY_KEY_SQL = `
  SELECT
    ${CAMPAIGN_COLUMNS_SQL}
  FROM campaigns
  WHERE tenant_id = ?1
    AND campaign_key = ?2
  LIMIT 1
`;

const LIST_BY_TENANT_SQL = `
  SELECT
    ${CAMPAIGN_COLUMNS_SQL}
  FROM campaigns
  WHERE tenant_id = ?1
  ORDER BY updated_at DESC, campaign_key ASC
  LIMIT ?2
`;

const COUNT_RECIPIENTS_SQL = `
  SELECT count(*) AS recipientCount
  FROM campaign_recipients
  WHERE tenant_id = ?1
    AND campaign_key = ?2
`;

interface CampaignRow {
  campaignKey: string;
  tenantId: number;
  name: string;
  status: string;
  deliveryMode: string;
  scheduledAt: string | null;
  timezone: string;
  templateKey: string;
  templateSnapshotJson: string;
  audienceSnapshotKey: string;
  recipientCount: number;
  version: number;
  activatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CampaignRecipientCountRow {
  recipientCount: number;
}

export interface SaveCampaignRecipientSnapshotInput {
  contactId: number;
  contactVersion: number;
  phoneNumber: string;
  personalization: CampaignPersonalization;
  personalizationKey: string;
  deliveryKey: string;
}

export interface SaveCampaignSnapshotInput
  extends ValidatedCampaignDefinition {
  campaignKey: string;
  tenantId: number;
  recipients: readonly SaveCampaignRecipientSnapshotInput[];
}

export interface CampaignRepository {
  saveSnapshot(
    input: SaveCampaignSnapshotInput,
  ): Promise<PersistedCampaign>;
  findByKey(
    tenantId: number,
    campaignKey: string,
  ): Promise<PersistedCampaign | null>;
  listByTenant(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedCampaign[]>;
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

function assertCampaignKey(value: string): void {
  if (!/^campaign_v1_[0-9a-f]{64}$/.test(value)) {
    throw new Error("campaignKey is invalid");
  }
}

function isCampaignStatus(
  value: string,
): value is PersistedCampaign["status"] {
  return persistedCampaignStatuses.some(
    (status) => status === value,
  );
}

function isNullableTimestamp(
  value: string | null,
): boolean {
  return (
    value === null ||
    (typeof value === "string" &&
      value.trim().length > 0)
  );
}

function parseCampaignRow(
  row: CampaignRow,
): PersistedCampaign {
  let template: unknown;

  try {
    template = JSON.parse(row.templateSnapshotJson);
  } catch {
    throw new Error(
      "D1 returned an invalid campaign template snapshot",
    );
  }

  const validation = validateCampaignDefinition({
    name: row.name,
    deliveryMode: row.deliveryMode,
    scheduledAt: row.scheduledAt,
    timezone: row.timezone,
    template,
    audienceSnapshotKey: row.audienceSnapshotKey,
    recipientCount: row.recipientCount,
  });

  if (
    !validation.success ||
    validation.value.template.templateKey !==
      row.templateKey ||
    !/^campaign_v1_[0-9a-f]{64}$/.test(
      row.campaignKey,
    ) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !isCampaignStatus(row.status) ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    !isNullableTimestamp(row.activatedAt) ||
    !isNullableTimestamp(row.startedAt) ||
    !isNullableTimestamp(row.completedAt) ||
    (row.lastErrorCode !== null &&
      !/^[A-Z0-9_]{1,100}$/.test(
        row.lastErrorCode,
      )) ||
    typeof row.createdAt !== "string" ||
    !row.createdAt.trim() ||
    typeof row.updatedAt !== "string" ||
    !row.updatedAt.trim()
  ) {
    throw new Error("D1 returned an invalid campaign");
  }

  return {
    campaignKey: row.campaignKey,
    tenantId: row.tenantId,
    status: row.status,
    version: row.version,
    activatedAt: row.activatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    lastErrorCode: row.lastErrorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...validation.value,
  };
}

function serializeRecipients(
  input: SaveCampaignSnapshotInput,
): string {
  if (
    input.recipients.length !== input.recipientCount
  ) {
    throw new Error(
      "campaign recipient count does not match snapshot",
    );
  }

  const contactIds = new Set<number>();
  const deliveryKeys = new Set<string>();
  const serializedRecipients = input.recipients.map(
    (recipient) => {
      assertPositiveInteger(
        recipient.contactId,
        "contactId",
      );
      assertPositiveInteger(
        recipient.contactVersion,
        "contactVersion",
      );

      if (
        contactIds.has(recipient.contactId) ||
        deliveryKeys.has(recipient.deliveryKey)
      ) {
        throw new Error(
          "campaign recipient identity is duplicated",
        );
      }

      if (
        !/^\+[1-9][0-9]{0,14}$/.test(
          recipient.phoneNumber,
        ) ||
        !/^[0-9a-f]{64}$/.test(
          recipient.personalizationKey,
        ) ||
        !/^campaign_delivery_v1_[0-9a-f]{64}$/.test(
          recipient.deliveryKey,
        )
      ) {
        throw new Error(
          "campaign recipient snapshot is invalid",
        );
      }

      const personalization =
        validateCampaignPersonalization(
          recipient.personalization,
        );

      if (!personalization.success) {
        throw new Error(
          "campaign recipient personalization is invalid",
        );
      }

      contactIds.add(recipient.contactId);
      deliveryKeys.add(recipient.deliveryKey);

      return {
        contactId: recipient.contactId,
        contactVersion: recipient.contactVersion,
        phoneNumber: recipient.phoneNumber,
        personalizationJson: JSON.stringify(
          personalization.value,
        ),
        personalizationKey:
          recipient.personalizationKey,
        deliveryKey: recipient.deliveryKey,
      };
    },
  );
  const payload = JSON.stringify(serializedRecipients);

  if (
    new TextEncoder().encode(payload).byteLength >
    MAXIMUM_RECIPIENT_PAYLOAD_BYTES
  ) {
    throw new Error(
      "campaign recipient snapshot is too large",
    );
  }

  return payload;
}

function assertSnapshotMatches(
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
    JSON.stringify(storedDefinition) !==
      JSON.stringify(inputDefinition)
  ) {
    throw new Error(
      "stored campaign snapshot conflicts with input",
    );
  }
}

export function createCampaignRepository(
  database: D1DatabaseBinding,
): CampaignRepository {
  const findByKey: CampaignRepository["findByKey"] =
    async (tenantId, campaignKey) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertCampaignKey(campaignKey);

      const row = await database
        .prepare(SELECT_BY_KEY_SQL)
        .bind(tenantId, campaignKey)
        .first<CampaignRow>();

      return row ? parseCampaignRow(row) : null;
    };

  return {
    async saveSnapshot(input) {
      assertPositiveInteger(input.tenantId, "tenantId");
      assertCampaignKey(input.campaignKey);

      const validation =
        validateCampaignDefinition(input);

      if (!validation.success) {
        throw new Error(
          "campaign snapshot definition is invalid",
        );
      }

      const recipientPayload = serializeRecipients({
        ...input,
        ...validation.value,
      });
      let results;

      try {
        results = await database.batch([
          database
            .prepare(INSERT_CAMPAIGN_SQL)
            .bind(
              input.campaignKey,
              input.tenantId,
              validation.value.name,
              validation.value.deliveryMode,
              validation.value.scheduledAt,
              validation.value.timezone,
              validation.value.template.templateKey,
              JSON.stringify(validation.value.template),
              validation.value.audienceSnapshotKey,
              validation.value.recipientCount,
              validation.value.template.metaTemplateId,
              validation.value.template.version,
              recipientPayload,
            ),
          database
            .prepare(INSERT_RECIPIENTS_SQL)
            .bind(
              input.campaignKey,
              input.tenantId,
              recipientPayload,
            ),
        ]);
      } catch {
        throw new Error(
          "D1 campaign snapshot write failed",
        );
      }

      const failedResult = results.find(
        (result) => !result.success,
      );

      if (results.length !== 2 || failedResult) {
        throw new Error(
          failedResult?.error ??
            "D1 campaign snapshot write failed",
        );
      }

      const stored = await findByKey(
        input.tenantId,
        input.campaignKey,
      );
      const countRow = await database
        .prepare(COUNT_RECIPIENTS_SQL)
        .bind(input.tenantId, input.campaignKey)
        .first<CampaignRecipientCountRow>();

      if (
        !stored ||
        !countRow ||
        !Number.isSafeInteger(countRow.recipientCount) ||
        countRow.recipientCount !==
          validation.value.recipientCount
      ) {
        throw new Error(
          "D1 campaign snapshot verification failed",
        );
      }

      assertSnapshotMatches(stored, {
        ...input,
        ...validation.value,
      });

      return stored;
    },

    findByKey,

    async listByTenant(tenantId, limit) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(limit, "limit");

      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }

      const result = await database
        .prepare(LIST_BY_TENANT_SQL)
        .bind(tenantId, limit)
        .all<CampaignRow>();

      if (!result.success) {
        throw new Error(
          result.error ?? "D1 campaign list read failed",
        );
      }

      return (result.results ?? []).map(
        parseCampaignRow,
      );
    },
  };
}
