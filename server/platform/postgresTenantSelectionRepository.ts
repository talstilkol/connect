import type {
  SaveTenantSelectionInput,
  SaveTenantSelectionResult,
  TenantSelection,
  TenantSelectionRepository,
} from "../../db/tenantSelectionRepository.ts";
import type {
  TenantId,
  UserId,
} from "../../shared/domain/model.ts";
import {
  parsePostgresPositiveInteger,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const selectionRowKeys = Object.freeze([
  "tenantId",
  "version",
]);

export const postgresTenantSelectionSql = Object.freeze({
  findByExternalUserId: `
    SELECT
      tenant_id AS "tenantId",
      version
    FROM tenant_selections
    WHERE external_user_id = $1
    LIMIT 1
  `,
  lockByExternalUserId: `
    SELECT
      tenant_id AS "tenantId",
      version
    FROM tenant_selections
    WHERE external_user_id = $1
    FOR UPDATE
  `,
  create: `
    INSERT INTO tenant_selections (
      external_user_id,
      tenant_id,
      version
    )
    SELECT
      tenant_memberships.external_user_id,
      tenant_memberships.tenant_id,
      1
    FROM tenant_memberships
    INNER JOIN tenants
      ON tenants.id = tenant_memberships.tenant_id
    WHERE tenant_memberships.external_user_id = $1
      AND tenant_memberships.tenant_id = $2
      AND tenant_memberships.status = 'active'
      AND tenants.status IN ('trial', 'active', 'payment_failed')
    ON CONFLICT (external_user_id) DO NOTHING
    RETURNING
      tenant_id AS "tenantId",
      version
  `,
  update: `
    UPDATE tenant_selections
    SET
      tenant_id = $2,
      version = version + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE external_user_id = $1
      AND version = $3
      AND EXISTS (
        SELECT 1
        FROM tenant_memberships
        INNER JOIN tenants
          ON tenants.id = tenant_memberships.tenant_id
        WHERE tenant_memberships.external_user_id = $1
          AND tenant_memberships.tenant_id = $2
          AND tenant_memberships.status = 'active'
          AND tenants.status IN ('trial', 'active', 'payment_failed')
      )
    RETURNING
      tenant_id AS "tenantId",
      version
  `,
});

export interface PostgresTenantSelectionDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function requireExternalUserId(value: UserId): UserId {
  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error("externalUserId is invalid");
  }

  return normalized as UserId;
}

function requireTenantId(value: TenantId): TenantId {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("tenantId must be a positive integer");
  }

  return value;
}

function requireExpectedVersion(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("expectedVersion must be a non-negative integer");
  }

  return value;
}

function parseSelection(value: unknown): Readonly<TenantSelection> {
  const row = requireExactPostgresRow(value, selectionRowKeys);

  return Object.freeze({
    tenantId: parsePostgresPositiveInteger(row.tenantId) as TenantId,
    version: parsePostgresPositiveInteger(row.version),
  });
}

async function loadSelection(
  database: PostgresQueryExecutor,
  sql: string,
  externalUserId: UserId,
): Promise<Readonly<TenantSelection> | null> {
  const result = await database.query<Record<string, unknown>>(
    sql,
    [externalUserId],
  );
  const rows = requirePostgresRows(result, 1);

  return rows.length === 0 ? null : parseSelection(rows[0]);
}

async function saveSelectionTransaction(
  transaction: PostgresTransaction,
  externalUserId: UserId,
  tenantId: TenantId,
  expectedVersion: number,
): Promise<SaveTenantSelectionResult> {
  const write = await transaction.query<Record<string, unknown>>(
    expectedVersion === 0
      ? postgresTenantSelectionSql.create
      : postgresTenantSelectionSql.update,
    expectedVersion === 0
      ? [externalUserId, tenantId]
      : [externalUserId, tenantId, expectedVersion],
  );
  const writtenRows = requirePostgresRows(write, 1);
  const nextVersion = expectedVersion + 1;

  if (writtenRows.length === 1) {
    const selection = parseSelection(writtenRows[0]);

    if (
      selection.tenantId !== tenantId ||
      selection.version !== nextVersion
    ) {
      throw new Error("PostgreSQL returned a mismatched tenant selection");
    }

    return Object.freeze({ outcome: "saved", selection });
  }

  const selection = await loadSelection(
    transaction,
    postgresTenantSelectionSql.lockByExternalUserId,
    externalUserId,
  );

  if (
    selection?.tenantId === tenantId &&
    selection.version === nextVersion
  ) {
    return Object.freeze({ outcome: "unchanged", selection });
  }

  if (selection !== null && selection.version !== expectedVersion) {
    return Object.freeze({ outcome: "conflict", selection: null });
  }

  return Object.freeze({ outcome: "rejected", selection: null });
}

export function createPostgresTenantSelectionRepository(
  dependencies: Readonly<PostgresTenantSelectionDependencies>,
): TenantSelectionRepository {
  if (
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL tenant selection dependencies are invalid");
  }

  return Object.freeze({
    async findByExternalUserId(externalUserId: UserId) {
      const normalizedExternalUserId =
        requireExternalUserId(externalUserId);

      return loadSelection(
        dependencies.queries,
        postgresTenantSelectionSql.findByExternalUserId,
        normalizedExternalUserId,
      );
    },

    async save(input: SaveTenantSelectionInput) {
      const externalUserId = requireExternalUserId(input.externalUserId);
      const tenantId = requireTenantId(input.tenantId);
      const expectedVersion = requireExpectedVersion(
        input.expectedVersion,
      );

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) =>
          saveSelectionTransaction(
            transaction,
            externalUserId,
            tenantId,
            expectedVersion,
          ),
      );
    },
  });
}
