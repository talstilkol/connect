import type {
  MetaConnectionRecord,
  MetaWebhookReceipt,
  PersistedMetaConnectionStatus,
} from "../shared/domain/metaConnection.ts";
import {
  metaWebhookReceiptStatuses,
  persistedMetaConnectionStatuses,
} from "../shared/domain/metaConnection.ts";
import type { D1DatabaseBinding } from "./d1";

const SELECT_CONNECTION_BY_TENANT_SQL = `
  SELECT
    tenant_id AS tenantId,
    business_portfolio_id AS businessPortfolioId,
    waba_id AS wabaId,
    phone_number_id AS phoneNumberId,
    status,
    webhook_subscribed_at AS webhookSubscribedAt,
    connected_at AS connectedAt,
    version,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM meta_connections
  WHERE tenant_id = ?1
  LIMIT 1
`;

const SELECT_CONNECTION_BY_WABA_SQL = `
  SELECT
    tenant_id AS tenantId,
    business_portfolio_id AS businessPortfolioId,
    waba_id AS wabaId,
    phone_number_id AS phoneNumberId,
    status,
    webhook_subscribed_at AS webhookSubscribedAt,
    connected_at AS connectedAt,
    version,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM meta_connections
  WHERE waba_id = ?1
  LIMIT 1
`;

const UPSERT_ASSET_SNAPSHOT_SQL = `
  INSERT INTO meta_connections (
    tenant_id,
    business_portfolio_id,
    waba_id,
    phone_number_id,
    status
  )
  VALUES (?1, ?2, ?3, ?4, 'pending')
  ON CONFLICT (tenant_id) DO UPDATE SET
    business_portfolio_id = excluded.business_portfolio_id,
    waba_id = excluded.waba_id,
    phone_number_id = excluded.phone_number_id,
    status = 'pending',
    webhook_subscribed_at = null,
    connected_at = null,
    version = meta_connections.version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE meta_connections.business_portfolio_id IS NOT excluded.business_portfolio_id
    OR meta_connections.waba_id IS NOT excluded.waba_id
    OR meta_connections.phone_number_id IS NOT excluded.phone_number_id
    OR meta_connections.status IS NOT 'pending'
    OR meta_connections.webhook_subscribed_at IS NOT null
    OR meta_connections.connected_at IS NOT null
`;

const MARK_CONNECTION_CONNECTED_SQL = `
  UPDATE meta_connections
  SET
    status = 'connected',
    webhook_subscribed_at = CURRENT_TIMESTAMP,
    connected_at = coalesce(connected_at, CURRENT_TIMESTAMP),
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND (
      status IS NOT 'connected'
      OR webhook_subscribed_at IS null
      OR connected_at IS null
    )
`;

const MARK_CONNECTION_STATUS_SQL = `
  UPDATE meta_connections
  SET
    status = ?2,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND status IS NOT ?2
`;

const CLAIM_WEBHOOK_RECEIPT_SQL = `
  INSERT INTO meta_webhook_receipts (
    tenant_id,
    waba_id,
    event_key,
    object_type,
    status,
    attempt_count
  )
  VALUES (?1, ?2, ?3, ?4, 'processing', 1)
  ON CONFLICT (tenant_id, event_key) DO UPDATE SET
    status = 'processing',
    attempt_count = meta_webhook_receipts.attempt_count + 1,
    last_error_code = null,
    processed_at = null,
    updated_at = CURRENT_TIMESTAMP
  WHERE meta_webhook_receipts.status = 'failed'
    OR (
      meta_webhook_receipts.status = 'processing'
      AND meta_webhook_receipts.updated_at
        <= datetime(CURRENT_TIMESTAMP, '-5 minutes')
    )
  RETURNING
    id,
    tenant_id AS tenantId,
    waba_id AS wabaId,
    event_key AS eventKey,
    object_type AS objectType,
    status,
    attempt_count AS attemptCount,
    last_error_code AS lastErrorCode,
    received_at AS receivedAt,
    processed_at AS processedAt,
    updated_at AS updatedAt
`;

const SELECT_WEBHOOK_RECEIPT_SQL = `
  SELECT
    id,
    tenant_id AS tenantId,
    waba_id AS wabaId,
    event_key AS eventKey,
    object_type AS objectType,
    status,
    attempt_count AS attemptCount,
    last_error_code AS lastErrorCode,
    received_at AS receivedAt,
    processed_at AS processedAt,
    updated_at AS updatedAt
  FROM meta_webhook_receipts
  WHERE tenant_id = ?1
    AND event_key = ?2
  LIMIT 1
`;

const COMPLETE_WEBHOOK_RECEIPT_SQL = `
  UPDATE meta_webhook_receipts
  SET
    status = 'processed',
    processed_at = CURRENT_TIMESTAMP,
    last_error_code = null,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND tenant_id = ?2
    AND status = 'processing'
  RETURNING id
`;

const FAIL_WEBHOOK_RECEIPT_SQL = `
  UPDATE meta_webhook_receipts
  SET
    status = 'failed',
    processed_at = null,
    last_error_code = ?3,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND tenant_id = ?2
    AND status = 'processing'
  RETURNING id
`;

const operationalFailureStatuses = [
  "verification_required",
  "revoked",
  "error",
  "restricted",
] as const satisfies readonly PersistedMetaConnectionStatus[];

export interface SaveMetaAssetSnapshotInput {
  tenantId: number;
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
}

export interface ClaimMetaWebhookReceiptInput {
  tenantId: number;
  wabaId: string;
  eventKey: string;
  objectType: string;
}

export interface ClaimedMetaWebhookReceipt {
  claimed: boolean;
  receipt: MetaWebhookReceipt;
}

export interface MetaRepository {
  findConnectionByTenantId(
    tenantId: number,
  ): Promise<MetaConnectionRecord | null>;
  findConnectionByWabaId(
    wabaId: string,
  ): Promise<MetaConnectionRecord | null>;
  saveAssetSnapshot(
    input: SaveMetaAssetSnapshotInput,
  ): Promise<MetaConnectionRecord>;
  markConnectionConnected(tenantId: number): Promise<MetaConnectionRecord>;
  markConnectionStatus(
    tenantId: number,
    status: (typeof operationalFailureStatuses)[number],
  ): Promise<MetaConnectionRecord>;
  claimWebhookReceipt(
    input: ClaimMetaWebhookReceiptInput,
  ): Promise<ClaimedMetaWebhookReceipt>;
  completeWebhookReceipt(
    tenantId: number,
    receiptId: number,
  ): Promise<void>;
  failWebhookReceipt(
    tenantId: number,
    receiptId: number,
    errorCode: string,
  ): Promise<void>;
}

function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function requireTrimmedValue(
  value: string,
  fieldName: string,
  maximumLength = 255,
): string {
  const trimmedValue = value.trim();

  if (
    trimmedValue.length === 0 ||
    trimmedValue.length > maximumLength
  ) {
    throw new Error(
      `${fieldName} must contain between 1 and ${maximumLength} characters`,
    );
  }

  return trimmedValue;
}

function requireEventKey(value: string): string {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("eventKey must be a lowercase SHA-256 digest");
  }

  return value;
}

function parseConnection(
  value: MetaConnectionRecord,
): MetaConnectionRecord {
  assertPositiveInteger(value.tenantId, "connection.tenantId");
  requireTrimmedValue(
    value.businessPortfolioId,
    "connection.businessPortfolioId",
  );
  requireTrimmedValue(value.wabaId, "connection.wabaId");
  requireTrimmedValue(value.phoneNumberId, "connection.phoneNumberId");

  if (!persistedMetaConnectionStatuses.includes(value.status)) {
    throw new Error("D1 returned an invalid Meta connection status");
  }

  assertPositiveInteger(value.version, "connection.version");

  if (
    !value.createdAt ||
    !value.updatedAt ||
    (value.status === "connected" &&
      (!value.webhookSubscribedAt || !value.connectedAt))
  ) {
    throw new Error("D1 returned an invalid Meta connection");
  }

  return value;
}

function parseReceipt(value: MetaWebhookReceipt): MetaWebhookReceipt {
  assertPositiveInteger(value.id, "receipt.id");
  assertPositiveInteger(value.tenantId, "receipt.tenantId");
  requireTrimmedValue(value.wabaId, "receipt.wabaId");
  requireEventKey(value.eventKey);
  requireTrimmedValue(value.objectType, "receipt.objectType");
  assertPositiveInteger(value.attemptCount, "receipt.attemptCount");

  if (
    !metaWebhookReceiptStatuses.includes(value.status) ||
    !value.receivedAt ||
    !value.updatedAt
  ) {
    throw new Error("D1 returned an invalid Meta webhook receipt");
  }

  return value;
}

async function requireSavedConnection(
  database: D1DatabaseBinding,
  tenantId: number,
): Promise<MetaConnectionRecord> {
  const connection = await database
    .prepare(SELECT_CONNECTION_BY_TENANT_SQL)
    .bind(tenantId)
    .first<MetaConnectionRecord>();

  if (!connection) {
    throw new Error("Meta connection was not found for the tenant");
  }

  return parseConnection(connection);
}

async function requireReceiptTransition(
  database: D1DatabaseBinding,
  sql: string,
  values: readonly (number | string)[],
): Promise<void> {
  const result = await database
    .prepare(sql)
    .bind(...values)
    .first<{ id: number }>();

  if (!result || !Number.isSafeInteger(result.id) || result.id <= 0) {
    throw new Error("Meta webhook receipt transition was rejected");
  }
}

export function createMetaRepository(
  database: D1DatabaseBinding,
): MetaRepository {
  return {
    async findConnectionByTenantId(tenantId) {
      assertPositiveInteger(tenantId, "tenantId");
      const connection = await database
        .prepare(SELECT_CONNECTION_BY_TENANT_SQL)
        .bind(tenantId)
        .first<MetaConnectionRecord>();

      return connection ? parseConnection(connection) : null;
    },

    async findConnectionByWabaId(wabaId) {
      const normalizedWabaId = requireTrimmedValue(wabaId, "wabaId");
      const connection = await database
        .prepare(SELECT_CONNECTION_BY_WABA_SQL)
        .bind(normalizedWabaId)
        .first<MetaConnectionRecord>();

      return connection ? parseConnection(connection) : null;
    },

    async saveAssetSnapshot(input) {
      assertPositiveInteger(input.tenantId, "tenantId");
      const businessPortfolioId = requireTrimmedValue(
        input.businessPortfolioId,
        "businessPortfolioId",
      );
      const wabaId = requireTrimmedValue(input.wabaId, "wabaId");
      const phoneNumberId = requireTrimmedValue(
        input.phoneNumberId,
        "phoneNumberId",
      );
      const result = await database
        .prepare(UPSERT_ASSET_SNAPSHOT_SQL)
        .bind(
          input.tenantId,
          businessPortfolioId,
          wabaId,
          phoneNumberId,
        )
        .run();

      if (!result.success) {
        throw new Error(result.error ?? "D1 Meta connection write failed");
      }

      return requireSavedConnection(database, input.tenantId);
    },

    async markConnectionConnected(tenantId) {
      assertPositiveInteger(tenantId, "tenantId");
      const result = await database
        .prepare(MARK_CONNECTION_CONNECTED_SQL)
        .bind(tenantId)
        .run();

      if (!result.success) {
        throw new Error(result.error ?? "D1 Meta connection update failed");
      }

      return requireSavedConnection(database, tenantId);
    },

    async markConnectionStatus(tenantId, status) {
      assertPositiveInteger(tenantId, "tenantId");

      if (!operationalFailureStatuses.includes(status)) {
        throw new Error("Unsupported Meta connection failure status");
      }

      const result = await database
        .prepare(MARK_CONNECTION_STATUS_SQL)
        .bind(tenantId, status)
        .run();

      if (!result.success) {
        throw new Error(result.error ?? "D1 Meta connection update failed");
      }

      return requireSavedConnection(database, tenantId);
    },

    async claimWebhookReceipt(input) {
      assertPositiveInteger(input.tenantId, "tenantId");
      const wabaId = requireTrimmedValue(input.wabaId, "wabaId");
      const eventKey = requireEventKey(input.eventKey);
      const objectType = requireTrimmedValue(
        input.objectType,
        "objectType",
      );
      const claimedReceipt = await database
        .prepare(CLAIM_WEBHOOK_RECEIPT_SQL)
        .bind(input.tenantId, wabaId, eventKey, objectType)
        .first<MetaWebhookReceipt>();

      if (claimedReceipt) {
        return {
          claimed: true,
          receipt: parseReceipt(claimedReceipt),
        };
      }

      const existingReceipt = await database
        .prepare(SELECT_WEBHOOK_RECEIPT_SQL)
        .bind(input.tenantId, eventKey)
        .first<MetaWebhookReceipt>();

      if (!existingReceipt) {
        throw new Error("D1 did not return the Meta webhook receipt");
      }

      return {
        claimed: false,
        receipt: parseReceipt(existingReceipt),
      };
    },

    async completeWebhookReceipt(tenantId, receiptId) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(receiptId, "receiptId");
      await requireReceiptTransition(
        database,
        COMPLETE_WEBHOOK_RECEIPT_SQL,
        [receiptId, tenantId],
      );
    },

    async failWebhookReceipt(tenantId, receiptId, errorCode) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(receiptId, "receiptId");
      const normalizedErrorCode = requireTrimmedValue(
        errorCode,
        "errorCode",
        100,
      );
      await requireReceiptTransition(database, FAIL_WEBHOOK_RECEIPT_SQL, [
        receiptId,
        tenantId,
        normalizedErrorCode,
      ]);
    },
  };
}
