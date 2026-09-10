import { postgresMetaTenantBarrierCte } from "./postgresMetaTenantBarrier.ts";
import type {
  ClaimedMetaWebhookReceipt,
  ClaimMetaWebhookReceiptInput,
  MetaRepository,
  SaveMetaAssetSnapshotInput,
} from "../../db/metaRepository.ts";
import type {
  MetaConnectionRecord,
  MetaWebhookReceipt,
  PersistedMetaConnectionStatus,
} from "../../shared/domain/metaConnection.ts";
import {
  metaWebhookReceiptStatuses,
  persistedMetaConnectionStatuses,
} from "../../shared/domain/metaConnection.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const connectionRowKeys = Object.freeze([
  "tenantId",
  "businessPortfolioId",
  "wabaId",
  "phoneNumberId",
  "status",
  "webhookSubscribedAt",
  "connectedAt",
  "version",
  "createdAt",
  "updatedAt",
]);
const receiptRowKeys = Object.freeze([
  "id",
  "tenantId",
  "wabaId",
  "eventKey",
  "objectType",
  "status",
  "attemptCount",
  "lastErrorCode",
  "receivedAt",
  "processedAt",
  "updatedAt",
]);
const connectionColumns = `
  tenant_id AS "tenantId",
  business_portfolio_id AS "businessPortfolioId",
  waba_id AS "wabaId",
  phone_number_id AS "phoneNumberId",
  status,
  webhook_subscribed_at AS "webhookSubscribedAt",
  connected_at AS "connectedAt",
  version,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;
const receiptColumns = `
  id,
  tenant_id AS "tenantId",
  waba_id AS "wabaId",
  event_key AS "eventKey",
  object_type AS "objectType",
  status,
  attempt_count AS "attemptCount",
  last_error_code AS "lastErrorCode",
  received_at AS "receivedAt",
  processed_at AS "processedAt",
  updated_at AS "updatedAt"
`;
const operationalFailureStatuses = Object.freeze([
  "verification_required",
  "revoked",
  "error",
  "restricted",
] as const satisfies readonly PersistedMetaConnectionStatus[]);

export const postgresMetaSql = Object.freeze({
  lockSnapshotBaselineBarrier: `WITH ${postgresMetaTenantBarrierCte} SELECT 1 AS locked FROM tenant_barrier`,
  lockSnapshotBaseline: `SELECT version FROM meta_connections WHERE tenant_id=$1 FOR UPDATE`,
  findConnectionByTenantId: `
    SELECT ${connectionColumns}
    FROM meta_connections
    WHERE tenant_id = $1
    LIMIT 1
  `,
  findConnectionByWabaId: `
    SELECT ${connectionColumns}
    FROM meta_connections
    WHERE waba_id = $1
    LIMIT 1
  `,
  upsertAssetSnapshot: `
    WITH ${postgresMetaTenantBarrierCte}
    INSERT INTO meta_connections (
      tenant_id,
      business_portfolio_id,
      waba_id,
      phone_number_id,
      status
    )
    SELECT $1, $2, $3, $4, 'pending' FROM tenant_barrier WHERE true
    ON CONFLICT (tenant_id) DO UPDATE SET
      business_portfolio_id = EXCLUDED.business_portfolio_id,
      waba_id = EXCLUDED.waba_id,
      phone_number_id = EXCLUDED.phone_number_id,
      status = 'pending',
      webhook_subscribed_at = NULL,
      connected_at = NULL,
      version = meta_connections.version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    RETURNING ${connectionColumns}
  `,
  markConnectionConnected: `
    WITH ${postgresMetaTenantBarrierCte}
    UPDATE meta_connections
    SET
      status = 'connected',
      webhook_subscribed_at =
        date_trunc('milliseconds', CURRENT_TIMESTAMP),
      connected_at = coalesce(
        connected_at,
        date_trunc('milliseconds', CURRENT_TIMESTAMP)
      ),
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    FROM tenant_barrier
    WHERE tenant_id = $1
      AND status = 'pending'
      AND version = $2
    RETURNING tenant_id AS "tenantId"
  `,
  revokeConnection: `
    WITH ${postgresMetaTenantBarrierCte}
    UPDATE meta_connections
    SET status = 'revoked', version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    FROM tenant_barrier
    WHERE tenant_id = $1 AND waba_id = $2 AND version = $3 AND status <> 'revoked'
    RETURNING tenant_id AS "tenantId"
  `,
  markConnectionStatus: `
    WITH ${postgresMetaTenantBarrierCte}
    UPDATE meta_connections
    SET
      status = $2,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    FROM tenant_barrier
    WHERE tenant_id = $1
      AND status IS DISTINCT FROM $2
    RETURNING tenant_id AS "tenantId"
  `,
  claimWebhookReceipt: `
    INSERT INTO meta_webhook_receipts (
      tenant_id,
      waba_id,
      event_key,
      object_type,
      status,
      attempt_count
    )
    VALUES ($1, $2, $3, $4, 'processing', 1)
    ON CONFLICT (tenant_id, event_key) DO UPDATE SET
      status = 'processing',
      attempt_count = meta_webhook_receipts.attempt_count + 1,
      last_error_code = NULL,
      processed_at = NULL,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE meta_webhook_receipts.status = 'failed'
      OR (
        meta_webhook_receipts.status = 'processing'
        AND meta_webhook_receipts.updated_at <=
          CURRENT_TIMESTAMP - INTERVAL '5 minutes'
      )
    RETURNING ${receiptColumns}
  `,
  findWebhookReceipt: `
    SELECT ${receiptColumns}
    FROM meta_webhook_receipts
    WHERE tenant_id = $1
      AND event_key = $2
    LIMIT 1
  `,
  completeWebhookReceipt: `
    UPDATE meta_webhook_receipts
    SET
      status = 'processed',
      processed_at = date_trunc('milliseconds', CURRENT_TIMESTAMP),
      last_error_code = NULL,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE id = $1
      AND tenant_id = $2
      AND status = 'processing'
    RETURNING id, tenant_id AS "tenantId"
  `,
  failWebhookReceipt: `
    UPDATE meta_webhook_receipts
    SET
      status = 'failed',
      processed_at = NULL,
      last_error_code = $3,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE id = $1
      AND tenant_id = $2
      AND status = 'processing'
    RETURNING id, tenant_id AS "tenantId"
  `,
});

export interface PostgresMetaDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function requirePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return value;
}

function requireTrimmedValue(
  value: string,
  fieldName: string,
  maximumLength = 255,
): string {
  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error(`${fieldName} is invalid`);
  }

  return normalized;
}

function requireRowString(
  value: unknown,
  fieldName: string,
  maximumLength = 255,
): string {
  if (typeof value !== "string" || value !== value.trim()) {
    throw new Error(`PostgreSQL returned an invalid ${fieldName}`);
  }

  return requireTrimmedValue(value, fieldName, maximumLength);
}

function requireEventKey(value: string): string {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("eventKey must be a lowercase SHA-256 digest");
  }

  return value;
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null ? null : parsePostgresTimestamp(value);
}

function parseConnection(value: unknown): Readonly<MetaConnectionRecord> {
  const row = requireExactPostgresRow(value, connectionRowKeys);

  if (!persistedMetaConnectionStatuses.includes(row.status as never)) {
    throw new Error("PostgreSQL returned an invalid Meta connection status");
  }

  const status = row.status as PersistedMetaConnectionStatus;
  const webhookSubscribedAt = parseNullableTimestamp(
    row.webhookSubscribedAt,
  );
  const connectedAt = parseNullableTimestamp(row.connectedAt);

  if (
    (status === "pending" &&
      (webhookSubscribedAt !== null || connectedAt !== null)) ||
    (status === "connected" &&
      (webhookSubscribedAt === null || connectedAt === null))
  ) {
    throw new Error("PostgreSQL returned an inconsistent Meta connection");
  }

  return Object.freeze({
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    businessPortfolioId: requireRowString(
      row.businessPortfolioId,
      "businessPortfolioId",
    ),
    wabaId: requireRowString(row.wabaId, "wabaId"),
    phoneNumberId: requireRowString(row.phoneNumberId, "phoneNumberId"),
    status,
    webhookSubscribedAt,
    connectedAt,
    version: parsePostgresPositiveInteger(row.version),
    createdAt: parsePostgresTimestamp(row.createdAt),
    updatedAt: parsePostgresTimestamp(row.updatedAt),
  });
}

function parseReceipt(value: unknown): Readonly<MetaWebhookReceipt> {
  const row = requireExactPostgresRow(value, receiptRowKeys);

  if (
    typeof row.eventKey !== "string" ||
    !metaWebhookReceiptStatuses.includes(row.status as never)
  ) {
    throw new Error("PostgreSQL returned an invalid Meta receipt status");
  }

  const status = row.status as MetaWebhookReceipt["status"];
  const processedAt = parseNullableTimestamp(row.processedAt);
  const lastErrorCode = row.lastErrorCode === null
    ? null
    : requireRowString(row.lastErrorCode, "lastErrorCode", 100);

  if (
    (status === "processing" &&
      (processedAt !== null || lastErrorCode !== null)) ||
    (status === "processed" &&
      (processedAt === null || lastErrorCode !== null)) ||
    (status === "failed" &&
      (processedAt !== null || lastErrorCode === null))
  ) {
    throw new Error("PostgreSQL returned an inconsistent Meta receipt");
  }

  return Object.freeze({
    id: parsePostgresPositiveInteger(row.id),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    wabaId: requireRowString(row.wabaId, "wabaId"),
    eventKey: requireEventKey(row.eventKey),
    objectType: requireRowString(row.objectType, "objectType"),
    status,
    attemptCount: parsePostgresPositiveInteger(row.attemptCount),
    lastErrorCode,
    receivedAt: parsePostgresTimestamp(row.receivedAt),
    processedAt,
    updatedAt: parsePostgresTimestamp(row.updatedAt),
  });
}

async function loadConnectionByTenant(
  queries: PostgresQueryExecutor,
  tenantId: number,
): Promise<Readonly<MetaConnectionRecord> | null> {
  const result = await queries.query<Record<string, unknown>>(
    postgresMetaSql.findConnectionByTenantId,
    [tenantId],
  );
  const rows = requirePostgresRows(result, 1);
  const connection = rows.length === 0 ? null : parseConnection(rows[0]);

  if (connection !== null && connection.tenantId !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant Meta connection");
  }

  return connection;
}

function validateOptionalTenantWrite(
  value: unknown,
  tenantId: number,
): void {
  const row = requireExactPostgresRow(value, ["tenantId"]);

  if (parsePostgresPositiveInteger(row.tenantId) !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant Meta write result");
  }
}

async function requireSavedConnection(
  transaction: PostgresTransaction,
  tenantId: number,
): Promise<Readonly<MetaConnectionRecord>> {
  const connection = await loadConnectionByTenant(transaction, tenantId);

  if (connection === null) {
    throw new Error("PostgreSQL Meta connection was not found");
  }

  return connection;
}

function requireReceiptMatchesClaim(
  receipt: Readonly<MetaWebhookReceipt>,
  input: Readonly<ClaimMetaWebhookReceiptInput>,
): void {
  if (
    receipt.tenantId !== input.tenantId ||
    receipt.wabaId !== input.wabaId ||
    receipt.eventKey !== input.eventKey ||
    receipt.objectType !== input.objectType
  ) {
    throw new Error("Meta webhook receipt conflicts with stored evidence");
  }
}

async function requireReceiptTransition(
  queries: PostgresQueryExecutor,
  sql: string,
  tenantId: number,
  receiptId: number,
  parameters: readonly (number | string)[],
): Promise<void> {
  const result = await queries.query<Record<string, unknown>>(
    sql,
    parameters,
  );
  const rows = requirePostgresRows(result, 1);

  if (rows.length !== 1) {
    throw new Error("PostgreSQL Meta receipt transition was rejected");
  }

  const row = requireExactPostgresRow(rows[0], ["id", "tenantId"]);

  if (
    parsePostgresPositiveInteger(row.id) !== receiptId ||
    parsePostgresPositiveInteger(row.tenantId) !== tenantId
  ) {
    throw new Error("PostgreSQL returned a cross-tenant receipt transition");
  }
}

export function createPostgresMetaRepository(
  dependencies: Readonly<PostgresMetaDependencies>,
): MetaRepository {
  if (
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL Meta dependencies are invalid");
  }

  return Object.freeze({
    async findConnectionByTenantId(tenantIdInput: number) {
      return loadConnectionByTenant(
        dependencies.queries,
        requirePositiveInteger(tenantIdInput, "tenantId"),
      );
    },

    async findConnectionByWabaId(wabaIdInput: string) {
      const wabaId = requireTrimmedValue(wabaIdInput, "wabaId");
      const result = await dependencies.queries.query<
        Record<string, unknown>
      >(postgresMetaSql.findConnectionByWabaId, [wabaId]);
      const rows = requirePostgresRows(result, 1);
      const connection = rows.length === 0
        ? null
        : parseConnection(rows[0]);

      if (connection !== null && connection.wabaId !== wabaId) {
        throw new Error("PostgreSQL returned a mismatched Meta connection");
      }

      return connection;
    },

    async saveAssetSnapshot(input: SaveMetaAssetSnapshotInput) {
      const tenantId = requirePositiveInteger(input.tenantId, "tenantId");
      const expectedVersion = input.expectedConnectionVersion;
      if (expectedVersion !== undefined && expectedVersion !== null) requirePositiveInteger(expectedVersion, 'expectedConnectionVersion');
      const businessPortfolioId = requireTrimmedValue(
        input.businessPortfolioId,
        "businessPortfolioId",
      );
      const wabaId = requireTrimmedValue(input.wabaId, "wabaId");
      const phoneNumberId = requireTrimmedValue(
        input.phoneNumberId,
        "phoneNumberId",
      );

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          if (expectedVersion !== undefined) {
            await transaction.query(postgresMetaSql.lockSnapshotBaselineBarrier, [tenantId]);
            const current = requirePostgresRows(await transaction.query(postgresMetaSql.lockSnapshotBaseline, [tenantId]), 1)[0];
            const version = current === undefined ? null : parsePostgresPositiveInteger(requireExactPostgresRow(current, ['version']).version);
            if (version !== expectedVersion) throw new Error('Meta connection changed since signup launch');
          }
          const result = await transaction.query<Record<string, unknown>>(
            postgresMetaSql.upsertAssetSnapshot,
            [tenantId, businessPortfolioId, wabaId, phoneNumberId],
          );
          const rows = requirePostgresRows(result, 1);

          if (rows.length !== 1) {
            throw new Error("PostgreSQL Meta asset write was not confirmed");
          }
          const connection = parseConnection(rows[0]);

          if (
            connection.tenantId !== tenantId ||
            connection.businessPortfolioId !== businessPortfolioId ||
            connection.wabaId !== wabaId ||
            connection.phoneNumberId !== phoneNumberId ||
            connection.status !== "pending" ||
            connection.webhookSubscribedAt !== null ||
            connection.connectedAt !== null
          ) {
            throw new Error("PostgreSQL Meta asset write was not confirmed");
          }

          return connection;
        },
      );
    },

    async markConnectionConnected(tenantIdInput: number, expectedVersionInput: number) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");

      const expectedVersion = requirePositiveInteger(expectedVersionInput, "expectedVersion");

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const result = await transaction.query<Record<string, unknown>>(
            postgresMetaSql.markConnectionConnected,
            [tenantId, expectedVersion],
          );
          const rows = requirePostgresRows(result, 1);

          if (rows.length !== 1) {
            throw new Error("Meta connection changed before confirmation");
          }
          validateOptionalTenantWrite(rows[0], tenantId);

          const connection = await requireSavedConnection(
            transaction,
            tenantId,
          );

          if (
            connection.status !== "connected" ||
            connection.version !== expectedVersion + 1 ||
            connection.webhookSubscribedAt === null ||
            connection.connectedAt === null
          ) {
            throw new Error("PostgreSQL Meta connection was not confirmed");
          }

          return connection;
        },
      );
    },

    async revokeConnection(tenantIdInput: number, wabaIdInput: string, expectedVersionInput: number) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const wabaId = requireTrimmedValue(wabaIdInput, "wabaId");
      const expectedVersion = requirePositiveInteger(expectedVersionInput, "expectedVersion");
      const result = await dependencies.queries.query<Record<string, unknown>>(
        postgresMetaSql.revokeConnection, [tenantId, wabaId, expectedVersion],
      );
      const rows = requirePostgresRows(result, 1);
      if (rows.length === 1) validateOptionalTenantWrite(rows[0], tenantId);
      return rows.length === 1;
    },

    async markConnectionStatus(
      tenantIdInput: number,
      status: (typeof operationalFailureStatuses)[number],
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");

      if (!operationalFailureStatuses.includes(status)) {
        throw new Error("Unsupported Meta connection failure status");
      }

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const result = await transaction.query<Record<string, unknown>>(
            postgresMetaSql.markConnectionStatus,
            [tenantId, status],
          );
          const rows = requirePostgresRows(result, 1);

          if (rows.length === 1) {
            validateOptionalTenantWrite(rows[0], tenantId);
          }

          const connection = await requireSavedConnection(
            transaction,
            tenantId,
          );

          if (connection.status !== status) {
            throw new Error("PostgreSQL Meta status write was not confirmed");
          }

          return connection;
        },
      );
    },

    async claimWebhookReceipt(
      input: ClaimMetaWebhookReceiptInput,
    ): Promise<ClaimedMetaWebhookReceipt> {
      const normalizedInput = Object.freeze({
        tenantId: requirePositiveInteger(input.tenantId, "tenantId"),
        wabaId: requireTrimmedValue(input.wabaId, "wabaId"),
        eventKey: requireEventKey(input.eventKey),
        objectType: requireTrimmedValue(input.objectType, "objectType"),
      });
      const result = await dependencies.queries.query<
        Record<string, unknown>
      >(postgresMetaSql.claimWebhookReceipt, [
        normalizedInput.tenantId,
        normalizedInput.wabaId,
        normalizedInput.eventKey,
        normalizedInput.objectType,
      ]);
      const rows = requirePostgresRows(result, 1);

      if (rows.length === 1) {
        const receipt = parseReceipt(rows[0]);
        requireReceiptMatchesClaim(receipt, normalizedInput);
        return Object.freeze({ claimed: true, receipt });
      }

      const existing = await dependencies.queries.query<
        Record<string, unknown>
      >(postgresMetaSql.findWebhookReceipt, [
        normalizedInput.tenantId,
        normalizedInput.eventKey,
      ]);
      const existingRows = requirePostgresRows(existing, 1);

      if (existingRows.length !== 1) {
        throw new Error("PostgreSQL did not return the Meta receipt");
      }

      const receipt = parseReceipt(existingRows[0]);
      requireReceiptMatchesClaim(receipt, normalizedInput);
      return Object.freeze({ claimed: false, receipt });
    },

    async completeWebhookReceipt(
      tenantIdInput: number,
      receiptIdInput: number,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const receiptId = requirePositiveInteger(receiptIdInput, "receiptId");

      await requireReceiptTransition(
        dependencies.queries,
        postgresMetaSql.completeWebhookReceipt,
        tenantId,
        receiptId,
        [receiptId, tenantId],
      );
    },

    async failWebhookReceipt(
      tenantIdInput: number,
      receiptIdInput: number,
      errorCodeInput: string,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const receiptId = requirePositiveInteger(receiptIdInput, "receiptId");
      const errorCode = requireTrimmedValue(
        errorCodeInput,
        "errorCode",
        100,
      );

      await requireReceiptTransition(
        dependencies.queries,
        postgresMetaSql.failWebhookReceipt,
        tenantId,
        receiptId,
        [receiptId, tenantId, errorCode],
      );
    },
  });
}
