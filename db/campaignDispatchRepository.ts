import {
  campaignRecipientStatuses,
  type PersistedCampaignRecipient,
} from "../shared/domain/campaign.ts";
import type {
  CampaignDeliveryContext,
  CampaignDeliveryPreparation,
  CampaignDeliveryQueueJob,
  CampaignDispatchState,
} from "../shared/domain/campaignDelivery.ts";
import {
  validateCampaignPersonalization,
} from "../shared/validation/campaignPersonalization.ts";
import type {
  D1DatabaseBinding,
  D1Result,
} from "./d1.ts";

const MAXIMUM_DISPATCH_BATCH_SIZE = 50;

const ACTIVATE_CAMPAIGN_SQL = `
  UPDATE campaigns
  SET
    status = 'scheduled',
    activated_at = ?4,
    version = version + 1,
    last_error_code = NULL,
    updated_at = ?4
  WHERE tenant_id = ?1
    AND campaign_key = ?2
    AND version = ?3
    AND status = 'draft'
    AND EXISTS (
      SELECT 1
      FROM message_templates
      WHERE message_templates.tenant_id =
          campaigns.tenant_id
        AND message_templates.template_key =
          campaigns.template_key
        AND message_templates.status = 'approved'
        AND message_templates.meta_template_id =
          json_extract(
            campaigns.template_snapshot_json,
            '$.metaTemplateId'
          )
        AND message_templates.version = CAST(
          json_extract(
            campaigns.template_snapshot_json,
            '$.version'
          ) AS INTEGER
        )
    )
  RETURNING
    campaign_key AS campaignKey,
    tenant_id AS tenantId,
    status,
    version,
    activated_at AS activatedAt,
    started_at AS startedAt
`;

const PROMOTE_DUE_CAMPAIGNS_SQL = `
  UPDATE campaigns
  SET
    status = 'running',
    started_at = COALESCE(started_at, ?1),
    version = version + 1,
    last_error_code = NULL,
    updated_at = ?1
  WHERE campaign_key IN (
    SELECT campaign_key
    FROM campaigns
    WHERE status = 'scheduled'
      AND (
        delivery_mode = 'immediate'
        OR scheduled_at <= ?1
      )
    ORDER BY
      CASE
        WHEN delivery_mode = 'immediate' THEN activated_at
        ELSE scheduled_at
      END ASC,
      campaign_key ASC
    LIMIT ?2
  )
  RETURNING
    campaign_key AS campaignKey,
    tenant_id AS tenantId,
    status,
    version,
    activated_at AS activatedAt,
    started_at AS startedAt
`;

const CLAIM_PENDING_RECIPIENTS_SQL = `
  UPDATE campaign_recipients
  SET
    status = 'queued',
    queued_at = ?1,
    last_error_code = NULL,
    updated_at = ?1
  WHERE rowid IN (
    SELECT recipients.rowid
    FROM campaign_recipients AS recipients
    INNER JOIN campaigns
      ON campaigns.tenant_id = recipients.tenant_id
      AND campaigns.campaign_key =
        recipients.campaign_key
    WHERE recipients.status = 'pending'
      AND campaigns.status = 'running'
    ORDER BY
      campaigns.started_at ASC,
      recipients.campaign_key ASC,
      recipients.contact_id ASC
    LIMIT ?2
  )
  RETURNING delivery_key AS deliveryKey
`;

const COMPLETE_SETTLED_CAMPAIGNS_SQL = `
  UPDATE campaigns
  SET
    status = 'completed',
    completed_at = ?1,
    version = version + 1,
    last_error_code = NULL,
    updated_at = ?1
  WHERE campaign_key IN (
    SELECT campaigns.campaign_key
    FROM campaigns
    WHERE campaigns.status = 'running'
      AND NOT EXISTS (
        SELECT 1
        FROM campaign_recipients
        WHERE campaign_recipients.tenant_id =
            campaigns.tenant_id
          AND campaign_recipients.campaign_key =
            campaigns.campaign_key
          AND campaign_recipients.status IN (
            'pending',
            'queued',
            'sending',
            'accepted'
          )
      )
    ORDER BY
      campaigns.started_at ASC,
      campaigns.campaign_key ASC
    LIMIT ?2
  )
  RETURNING campaign_key AS campaignKey
`;

const FIND_QUEUED_DELIVERY_CONTEXT_SQL = `
  SELECT
    campaign_recipients.campaign_key AS campaignKey,
    campaign_recipients.tenant_id AS tenantId,
    campaign_recipients.phone_e164 AS recipientPhoneNumber
  FROM campaign_recipients
  INNER JOIN campaigns
    ON campaigns.tenant_id =
      campaign_recipients.tenant_id
    AND campaigns.campaign_key =
      campaign_recipients.campaign_key
  WHERE campaign_recipients.delivery_key = ?1
    AND campaign_recipients.status = 'queued'
    AND campaigns.status = 'running'
  LIMIT 1
`;

const PREPARE_RECIPIENT_FOR_DELIVERY_SQL = `
  UPDATE campaign_recipients
  SET
    status = CASE
      WHEN (
        EXISTS (
          SELECT 1
          FROM campaigns
          INNER JOIN message_templates
            ON message_templates.tenant_id =
              campaigns.tenant_id
            AND message_templates.template_key =
              campaigns.template_key
          WHERE campaigns.tenant_id =
              campaign_recipients.tenant_id
            AND campaigns.campaign_key =
              campaign_recipients.campaign_key
            AND campaigns.status = 'running'
            AND message_templates.status = 'approved'
            AND message_templates.meta_template_id =
              json_extract(
                campaigns.template_snapshot_json,
                '$.metaTemplateId'
              )
            AND message_templates.version = CAST(
              json_extract(
                campaigns.template_snapshot_json,
                '$.version'
              ) AS INTEGER
            )
        )
        AND EXISTS (
          SELECT 1
          FROM contacts
          WHERE contacts.tenant_id =
              campaign_recipients.tenant_id
            AND contacts.id =
              campaign_recipients.contact_id
            AND contacts.version =
              campaign_recipients.contact_version
            AND contacts.phone_e164 =
              campaign_recipients.phone_e164
            AND contacts.mailing_status = 'subscribed'
            AND contacts.consent_status = 'granted'
        )
      )
      THEN 'sending'
      ELSE 'skipped'
    END,
    attempt_count = attempt_count + CASE
      WHEN (
        EXISTS (
          SELECT 1
          FROM campaigns
          INNER JOIN message_templates
            ON message_templates.tenant_id =
              campaigns.tenant_id
            AND message_templates.template_key =
              campaigns.template_key
          WHERE campaigns.tenant_id =
              campaign_recipients.tenant_id
            AND campaigns.campaign_key =
              campaign_recipients.campaign_key
            AND campaigns.status = 'running'
            AND message_templates.status = 'approved'
            AND message_templates.meta_template_id =
              json_extract(
                campaigns.template_snapshot_json,
                '$.metaTemplateId'
              )
            AND message_templates.version = CAST(
              json_extract(
                campaigns.template_snapshot_json,
                '$.version'
              ) AS INTEGER
            )
        )
        AND EXISTS (
          SELECT 1
          FROM contacts
          WHERE contacts.tenant_id =
              campaign_recipients.tenant_id
            AND contacts.id =
              campaign_recipients.contact_id
            AND contacts.version =
              campaign_recipients.contact_version
            AND contacts.phone_e164 =
              campaign_recipients.phone_e164
            AND contacts.mailing_status = 'subscribed'
            AND contacts.consent_status = 'granted'
        )
      )
      THEN 1
      ELSE 0
    END,
    last_error_code = CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM campaigns
        INNER JOIN message_templates
          ON message_templates.tenant_id =
            campaigns.tenant_id
          AND message_templates.template_key =
            campaigns.template_key
        WHERE campaigns.tenant_id =
            campaign_recipients.tenant_id
          AND campaigns.campaign_key =
            campaign_recipients.campaign_key
          AND campaigns.status = 'running'
          AND message_templates.status = 'approved'
          AND message_templates.meta_template_id =
            json_extract(
              campaigns.template_snapshot_json,
              '$.metaTemplateId'
            )
          AND message_templates.version = CAST(
            json_extract(
              campaigns.template_snapshot_json,
              '$.version'
            ) AS INTEGER
          )
      )
      THEN 'TEMPLATE_NOT_APPROVED'
      WHEN NOT EXISTS (
        SELECT 1
        FROM contacts
        WHERE contacts.tenant_id =
            campaign_recipients.tenant_id
          AND contacts.id =
            campaign_recipients.contact_id
          AND contacts.version =
            campaign_recipients.contact_version
          AND contacts.phone_e164 =
            campaign_recipients.phone_e164
          AND contacts.mailing_status = 'subscribed'
          AND contacts.consent_status = 'granted'
      )
      THEN 'CONSENT_NOT_GRANTED'
      ELSE NULL
    END,
    updated_at = ?2
  WHERE delivery_key = ?1
    AND status = 'queued'
    AND EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.tenant_id =
          campaign_recipients.tenant_id
        AND campaigns.campaign_key =
          campaign_recipients.campaign_key
        AND campaigns.status = 'running'
    )
  RETURNING
    campaign_key AS campaignKey,
    tenant_id AS tenantId,
    contact_id AS contactId,
    contact_version AS contactVersion,
    phone_e164 AS phoneNumber,
    personalization_json AS personalizationJson,
    personalization_key AS personalizationKey,
    delivery_key AS deliveryKey,
    status,
    attempt_count AS attemptCount,
    last_error_code AS lastErrorCode,
    queued_at AS queuedAt,
    accepted_at AS acceptedAt,
    created_at AS createdAt,
    updated_at AS updatedAt
`;

const MARK_REJECTED_SQL = `
  UPDATE campaign_recipients
  SET
    status = 'failed',
    last_error_code = ?2,
    updated_at = ?3
  WHERE delivery_key = ?1
    AND status = 'sending'
  RETURNING delivery_key AS deliveryKey
`;

const MARK_AMBIGUOUS_SQL = `
  UPDATE campaign_recipients
  SET
    last_error_code = ?2,
    updated_at = ?3
  WHERE delivery_key = ?1
    AND status = 'sending'
  RETURNING delivery_key AS deliveryKey
`;

interface CampaignDispatchStateRow {
  campaignKey: string;
  tenantId: number;
  status: string;
  version: number;
  activatedAt: string | null;
  startedAt: string | null;
}

interface DeliveryKeyRow {
  deliveryKey: string;
}

interface CampaignKeyRow {
  campaignKey: string;
}

interface CampaignDeliveryContextRow {
  campaignKey: string;
  tenantId: number;
  recipientPhoneNumber: string;
}

interface CampaignRecipientRow {
  campaignKey: string;
  tenantId: number;
  contactId: number;
  contactVersion: number;
  phoneNumber: string;
  personalizationJson: string;
  personalizationKey: string;
  deliveryKey: string;
  status: string;
  attemptCount: number;
  lastErrorCode: string | null;
  queuedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDispatchRepository {
  activateCampaign(
    tenantId: number,
    campaignKey: string,
    expectedVersion: number,
    activatedAt: string,
  ): Promise<CampaignDispatchState | null>;
  promoteDueCampaigns(
    now: string,
    limit: number,
  ): Promise<readonly CampaignDispatchState[]>;
  claimPendingRecipients(
    now: string,
    limit: number,
  ): Promise<readonly CampaignDeliveryQueueJob[]>;
  completeSettledCampaigns(
    now: string,
    limit: number,
  ): Promise<number>;
  releaseQueuedRecipients(
    deliveryKeys: readonly string[],
    now: string,
  ): Promise<void>;
  findQueuedDeliveryContext(
    deliveryKey: string,
  ): Promise<CampaignDeliveryContext | null>;
  prepareDelivery(
    deliveryKey: string,
    now: string,
  ): Promise<CampaignDeliveryPreparation>;
  markRejected(
    deliveryKey: string,
    errorCode: string,
    updatedAt: string,
  ): Promise<void>;
  markAmbiguous(
    deliveryKey: string,
    errorCode: string,
    updatedAt: string,
  ): Promise<void>;
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

function assertLimit(value: number): void {
  assertPositiveInteger(value, "limit");

  if (value > MAXIMUM_DISPATCH_BATCH_SIZE) {
    throw new Error(
      `limit must not exceed ${MAXIMUM_DISPATCH_BATCH_SIZE}`,
    );
  }
}

function assertCampaignKey(value: string): void {
  if (!/^campaign_v1_[0-9a-f]{64}$/.test(value)) {
    throw new Error("campaignKey is invalid");
  }
}

function assertDeliveryKey(value: string): void {
  if (
    !/^campaign_delivery_v1_[0-9a-f]{64}$/.test(
      value,
    )
  ) {
    throw new Error("deliveryKey is invalid");
  }
}

function assertTimestamp(value: string): void {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(Date.parse(value)).toISOString() !== value
  ) {
    throw new Error("timestamp is invalid");
  }
}

function assertErrorCode(value: string): void {
  if (!/^[A-Z0-9_]{1,100}$/.test(value)) {
    throw new Error("errorCode is invalid");
  }
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

function parseDispatchState(
  row: CampaignDispatchStateRow,
): CampaignDispatchState {
  if (
    !/^campaign_v1_[0-9a-f]{64}$/.test(
      row.campaignKey,
    ) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    (row.status !== "scheduled" &&
      row.status !== "running") ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    typeof row.activatedAt !== "string" ||
    !row.activatedAt.trim() ||
    !isNullableTimestamp(row.startedAt)
  ) {
    throw new Error(
      "D1 returned an invalid campaign dispatch state",
    );
  }

  return {
    campaignKey: row.campaignKey,
    tenantId: row.tenantId,
    status: row.status,
    version: row.version,
    activatedAt: row.activatedAt,
    startedAt: row.startedAt,
  };
}

function isRecipientStatus(
  value: string,
): value is PersistedCampaignRecipient["status"] {
  return campaignRecipientStatuses.some(
    (status) => status === value,
  );
}

function parseRecipient(
  row: CampaignRecipientRow,
): PersistedCampaignRecipient {
  let personalization: unknown;

  try {
    personalization = JSON.parse(
      row.personalizationJson,
    );
  } catch {
    throw new Error(
      "D1 returned invalid delivery personalization",
    );
  }

  const personalizationValidation =
    validateCampaignPersonalization(personalization);

  if (
    !personalizationValidation.success ||
    !/^campaign_v1_[0-9a-f]{64}$/.test(
      row.campaignKey,
    ) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !Number.isSafeInteger(row.contactId) ||
    row.contactId <= 0 ||
    !Number.isSafeInteger(row.contactVersion) ||
    row.contactVersion <= 0 ||
    !/^\+[1-9][0-9]{0,14}$/.test(
      row.phoneNumber,
    ) ||
    !/^[0-9a-f]{64}$/.test(
      row.personalizationKey,
    ) ||
    !/^campaign_delivery_v1_[0-9a-f]{64}$/.test(
      row.deliveryKey,
    ) ||
    !isRecipientStatus(row.status) ||
    !Number.isSafeInteger(row.attemptCount) ||
    row.attemptCount < 0 ||
    (row.lastErrorCode !== null &&
      !/^[A-Z0-9_]{1,100}$/.test(
        row.lastErrorCode,
      )) ||
    !isNullableTimestamp(row.queuedAt) ||
    !isNullableTimestamp(row.acceptedAt) ||
    typeof row.createdAt !== "string" ||
    !row.createdAt.trim() ||
    typeof row.updatedAt !== "string" ||
    !row.updatedAt.trim()
  ) {
    throw new Error(
      "D1 returned an invalid campaign recipient",
    );
  }

  return {
    campaignKey: row.campaignKey,
    tenantId: row.tenantId,
    contactId: row.contactId,
    contactVersion: row.contactVersion,
    phoneNumber: row.phoneNumber,
    personalization:
      personalizationValidation.value,
    personalizationKey: row.personalizationKey,
    deliveryKey: row.deliveryKey,
    status: row.status,
    attemptCount: row.attemptCount,
    lastErrorCode: row.lastErrorCode,
    queuedAt: row.queuedAt,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function placeholders(count: number): string {
  return Array.from(
    { length: count },
    (_, index) => `?${index + 2}`,
  ).join(", ");
}

function releaseQueuedSql(count: number): string {
  return `
    UPDATE campaign_recipients
    SET
      status = 'pending',
      queued_at = NULL,
      last_error_code = 'QUEUE_PUBLISH_FAILED',
      updated_at = ?1
    WHERE status = 'queued'
      AND delivery_key IN (${placeholders(count)})
  `;
}

function assertRunSucceeded(
  result: D1Result,
  fallback: string,
): void {
  if (!result.success) {
    throw new Error(result.error ?? fallback);
  }
}

async function requireTransition(
  database: D1DatabaseBinding,
  sql: string,
  values: readonly (
    | ArrayBuffer
    | number
    | string
    | null
  )[],
): Promise<void> {
  const row = await database
    .prepare(sql)
    .bind(...values)
    .first<DeliveryKeyRow>();

  if (!row || !/^campaign_delivery_v1_[0-9a-f]{64}$/.test(row.deliveryKey)) {
    throw new Error(
      "D1 campaign recipient transition failed",
    );
  }
}

export function createCampaignDispatchRepository(
  database: D1DatabaseBinding,
): CampaignDispatchRepository {
  return {
    async activateCampaign(
      tenantId,
      campaignKey,
      expectedVersion,
      activatedAt,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertCampaignKey(campaignKey);
      assertPositiveInteger(
        expectedVersion,
        "expectedVersion",
      );
      assertTimestamp(activatedAt);

      const row = await database
        .prepare(ACTIVATE_CAMPAIGN_SQL)
        .bind(
          tenantId,
          campaignKey,
          expectedVersion,
          activatedAt,
        )
        .first<CampaignDispatchStateRow>();

      return row ? parseDispatchState(row) : null;
    },

    async promoteDueCampaigns(now, limit) {
      assertTimestamp(now);
      assertLimit(limit);

      const result = await database
        .prepare(PROMOTE_DUE_CAMPAIGNS_SQL)
        .bind(now, limit)
        .all<CampaignDispatchStateRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 due campaign promotion failed",
        );
      }

      return (result.results ?? []).map(
        parseDispatchState,
      );
    },

    async claimPendingRecipients(now, limit) {
      assertTimestamp(now);
      assertLimit(limit);

      const result = await database
        .prepare(CLAIM_PENDING_RECIPIENTS_SQL)
        .bind(now, limit)
        .all<DeliveryKeyRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 campaign queue claim failed",
        );
      }

      return (result.results ?? []).map((row) => {
        assertDeliveryKey(row.deliveryKey);

        return {
          deliveryKey: row.deliveryKey,
        };
      });
    },

    async completeSettledCampaigns(now, limit) {
      assertTimestamp(now);
      assertLimit(limit);

      const result = await database
        .prepare(COMPLETE_SETTLED_CAMPAIGNS_SQL)
        .bind(now, limit)
        .all<CampaignKeyRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 settled campaign completion failed",
        );
      }

      const rows = result.results ?? [];

      for (const row of rows) {
        assertCampaignKey(row.campaignKey);
      }

      return rows.length;
    },

    async releaseQueuedRecipients(
      deliveryKeys,
      now,
    ) {
      assertTimestamp(now);

      if (deliveryKeys.length === 0) {
        return;
      }

      if (
        deliveryKeys.length >
        MAXIMUM_DISPATCH_BATCH_SIZE
      ) {
        throw new Error(
          "deliveryKeys exceeds dispatch batch size",
        );
      }

      const uniqueKeys = new Set(deliveryKeys);

      if (uniqueKeys.size !== deliveryKeys.length) {
        throw new Error(
          "deliveryKeys contains a duplicate",
        );
      }

      for (const deliveryKey of deliveryKeys) {
        assertDeliveryKey(deliveryKey);
      }

      const result = await database
        .prepare(
          releaseQueuedSql(deliveryKeys.length),
        )
        .bind(now, ...deliveryKeys)
        .run();
      assertRunSucceeded(
        result,
        "D1 campaign queue release failed",
      );
    },

    async findQueuedDeliveryContext(deliveryKey) {
      assertDeliveryKey(deliveryKey);

      const row = await database
        .prepare(FIND_QUEUED_DELIVERY_CONTEXT_SQL)
        .bind(deliveryKey)
        .first<CampaignDeliveryContextRow>();

      if (!row) {
        return null;
      }

      assertCampaignKey(row.campaignKey);
      assertPositiveInteger(row.tenantId, "tenantId");

      if (
        !/^\+[1-9][0-9]{0,14}$/.test(
          row.recipientPhoneNumber,
        )
      ) {
        throw new Error(
          "D1 returned an invalid campaign delivery recipient",
        );
      }

      return {
        campaignKey: row.campaignKey,
        tenantId: row.tenantId,
        recipientPhoneNumber:
          row.recipientPhoneNumber,
      };
    },

    async prepareDelivery(deliveryKey, now) {
      assertDeliveryKey(deliveryKey);
      assertTimestamp(now);

      const prepared = await database
        .prepare(
          PREPARE_RECIPIENT_FOR_DELIVERY_SQL,
        )
        .bind(deliveryKey, now)
        .first<CampaignRecipientRow>();

      if (!prepared) {
        return { outcome: "duplicate" };
      }

      const recipient = parseRecipient(prepared);

      if (recipient.status === "skipped") {
        return { outcome: "skipped" };
      }

      if (recipient.status !== "sending") {
        throw new Error(
          "D1 returned an invalid prepared delivery state",
        );
      }

      return {
        outcome: "claimed",
        recipient,
      };
    },

    markRejected(
      deliveryKey,
      errorCode,
      updatedAt,
    ) {
      assertDeliveryKey(deliveryKey);
      assertErrorCode(errorCode);
      assertTimestamp(updatedAt);

      return requireTransition(
        database,
        MARK_REJECTED_SQL,
        [deliveryKey, errorCode, updatedAt],
      );
    },

    markAmbiguous(
      deliveryKey,
      errorCode,
      updatedAt,
    ) {
      assertDeliveryKey(deliveryKey);
      assertErrorCode(errorCode);
      assertTimestamp(updatedAt);

      return requireTransition(
        database,
        MARK_AMBIGUOUS_SQL,
        [deliveryKey, errorCode, updatedAt],
      );
    },
  };
}
