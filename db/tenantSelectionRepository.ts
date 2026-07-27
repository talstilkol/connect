import type {
  TenantId,
  UserId,
} from "../shared/domain/model.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const SELECT_SELECTION_SQL = `
  SELECT
    tenant_id AS tenantId,
    version AS version
  FROM tenant_selections
  WHERE external_user_id = ?1
  LIMIT 1
`;

const CREATE_SELECTION_SQL = `
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
    ON tenants.id =
      tenant_memberships.tenant_id
  WHERE tenant_memberships.external_user_id = ?1
    AND tenant_memberships.tenant_id = ?2
    AND tenant_memberships.status = 'active'
    AND tenants.status IN (
      'trial',
      'active',
      'payment_failed'
    )
  ON CONFLICT (external_user_id) DO NOTHING
`;

const UPDATE_SELECTION_SQL = `
  UPDATE tenant_selections
  SET
    tenant_id = ?2,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE external_user_id = ?1
    AND version = ?3
    AND EXISTS (
      SELECT 1
      FROM tenant_memberships
      INNER JOIN tenants
        ON tenants.id =
          tenant_memberships.tenant_id
      WHERE tenant_memberships.external_user_id = ?1
        AND tenant_memberships.tenant_id = ?2
        AND tenant_memberships.status = 'active'
        AND tenants.status IN (
          'trial',
          'active',
          'payment_failed'
        )
    )
`;

interface TenantSelectionRow {
  tenantId: number;
  version: number;
}

export interface TenantSelection {
  tenantId: TenantId;
  version: number;
}

export interface SaveTenantSelectionInput {
  externalUserId: UserId;
  tenantId: TenantId;
  expectedVersion: number;
}

export type SaveTenantSelectionResult =
  Readonly<
    | {
        outcome:
          | "saved"
          | "unchanged";
        selection: TenantSelection;
      }
    | {
        outcome:
          | "conflict"
          | "rejected";
        selection: null;
      }
  >;

export interface TenantSelectionRepository {
  findByExternalUserId(
    externalUserId: UserId,
  ): Promise<TenantSelection | null>;
  save(
    input: SaveTenantSelectionInput,
  ): Promise<SaveTenantSelectionResult>;
}

function requireExternalUserId(
  value: UserId,
): UserId {
  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(
      normalized,
    )
  ) {
    throw new Error(
      "externalUserId is invalid",
    );
  }

  return normalized as UserId;
}

function requireTenantId(
  value: TenantId,
): TenantId {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      "tenantId must be a positive integer",
    );
  }

  return value;
}

function requireExpectedVersion(
  value: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "expectedVersion must be a non-negative integer",
    );
  }

  return value;
}

function parseSelection(
  row: TenantSelectionRow | null,
): TenantSelection | null {
  if (row === null) {
    return null;
  }

  if (
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0
  ) {
    throw new Error(
      "D1 returned an invalid tenant selection",
    );
  }

  return {
    tenantId: row.tenantId as TenantId,
    version: row.version,
  };
}

export function createTenantSelectionRepository(
  database: D1DatabaseBinding,
): TenantSelectionRepository {
  const findByExternalUserId =
    async (
      externalUserId: UserId,
    ): Promise<TenantSelection | null> => {
      const normalizedExternalUserId =
        requireExternalUserId(
          externalUserId,
        );
      const row = await database
        .prepare(SELECT_SELECTION_SQL)
        .bind(normalizedExternalUserId)
        .first<TenantSelectionRow>();

      return parseSelection(row);
    };

  return {
    findByExternalUserId,

    async save(input) {
      const externalUserId =
        requireExternalUserId(
          input.externalUserId,
        );
      const tenantId =
        requireTenantId(input.tenantId);
      const expectedVersion =
        requireExpectedVersion(
          input.expectedVersion,
        );
      const statement =
        expectedVersion === 0
          ? database
              .prepare(
                CREATE_SELECTION_SQL,
              )
              .bind(
                externalUserId,
                tenantId,
              )
          : database
              .prepare(
                UPDATE_SELECTION_SQL,
              )
              .bind(
                externalUserId,
                tenantId,
                expectedVersion,
              );
      const result =
        await statement.run();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 tenant selection write failed",
        );
      }

      const selection =
        await findByExternalUserId(
          externalUserId,
        );
      const nextVersion =
        expectedVersion + 1;

      if (
        Number(result.meta?.changes) ===
          1 &&
        selection?.tenantId ===
          tenantId &&
        selection.version === nextVersion
      ) {
        return {
          outcome: "saved",
          selection,
        };
      }

      if (
        selection?.tenantId ===
          tenantId &&
        selection.version === nextVersion
      ) {
        return {
          outcome: "unchanged",
          selection,
        };
      }

      if (
        selection !== null &&
        selection.version !==
          expectedVersion
      ) {
        return {
          outcome: "conflict",
          selection: null,
        };
      }

      return {
        outcome: "rejected",
        selection: null,
      };
    },
  };
}
