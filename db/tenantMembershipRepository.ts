import type {
  TenantId,
  TenantRole,
  TenantStatus,
  UserId,
} from "../shared/domain/model";
import type { D1DatabaseBinding } from "./d1";

const FIND_ACTIVE_MEMBERSHIPS_SQL = `
  SELECT
    tenant_memberships.tenant_id AS tenantId,
    tenants.display_name AS tenantDisplayName,
    tenants.status AS tenantStatus,
    tenant_memberships.external_user_id AS externalUserId,
    tenant_memberships.role AS role,
    tenant_memberships.version AS version
  FROM tenant_memberships
  INNER JOIN tenants
    ON tenants.id = tenant_memberships.tenant_id
  WHERE tenant_memberships.external_user_id = ?
    AND tenant_memberships.status = 'active'
  ORDER BY tenant_memberships.tenant_id ASC
`;

const FIND_ACTIVE_TENANT_MEMBERS_SQL = `
  SELECT
    tenant_memberships.tenant_id AS tenantId,
    tenants.display_name AS tenantDisplayName,
    tenants.status AS tenantStatus,
    tenant_memberships.external_user_id AS externalUserId,
    tenant_memberships.role AS role,
    tenant_memberships.version AS version
  FROM tenant_memberships
  INNER JOIN tenants
    ON tenants.id = tenant_memberships.tenant_id
  WHERE tenant_memberships.tenant_id = ?1
    AND tenant_memberships.status = 'active'
  ORDER BY
    CASE tenant_memberships.role
      WHEN 'owner' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'agent' THEN 3
      ELSE 4
    END ASC,
    tenant_memberships.id ASC
  LIMIT 101
`;

const tenantRoles: readonly TenantRole[] = [
  "owner",
  "manager",
  "agent",
  "viewer",
];

const tenantStatuses: readonly TenantStatus[] = [
  "trial",
  "active",
  "payment_failed",
  "suspended",
  "cancelled",
  "expired",
  "blocked",
];

interface D1TenantMembershipRow {
  tenantId: number;
  tenantDisplayName: string;
  tenantStatus: string;
  externalUserId: string;
  role: string;
  version: number;
}

export interface ActiveTenantMembership {
  tenantId: TenantId;
  tenantDisplayName: string;
  tenantStatus: TenantStatus;
  externalUserId: UserId;
  role: TenantRole;
  version: number;
}

export interface TenantMembershipRepository {
  findActiveByExternalUserId(
    externalUserId: UserId,
  ): Promise<readonly ActiveTenantMembership[]>;
  findActiveByTenantId(
    tenantId: TenantId,
  ): Promise<readonly ActiveTenantMembership[]>;
}

function isTenantRole(value: string): value is TenantRole {
  return tenantRoles.some((role) => role === value);
}

function isTenantStatus(value: string): value is TenantStatus {
  return tenantStatuses.some((status) => status === value);
}

function parseMembershipRow(
  row: D1TenantMembershipRow,
): ActiveTenantMembership {
  if (!Number.isSafeInteger(row.tenantId) || row.tenantId <= 0) {
    throw new Error("D1 returned an invalid tenant ID");
  }

  if (row.tenantDisplayName.trim().length === 0) {
    throw new Error("D1 returned a blank tenant display name");
  }

  if (row.externalUserId.trim().length === 0) {
    throw new Error("D1 returned a blank external user ID");
  }

  if (!isTenantRole(row.role)) {
    throw new Error("D1 returned an unsupported tenant role");
  }

  if (!isTenantStatus(row.tenantStatus)) {
    throw new Error("D1 returned an unsupported tenant status");
  }

  if (
    !Number.isSafeInteger(row.version) ||
    row.version <= 0
  ) {
    throw new Error(
      "D1 returned an invalid tenant membership version",
    );
  }

  return {
    tenantId: row.tenantId as TenantId,
    tenantDisplayName: row.tenantDisplayName,
    tenantStatus: row.tenantStatus,
    externalUserId: row.externalUserId as UserId,
    role: row.role,
    version: row.version,
  };
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

export function createTenantMembershipRepository(
  database: D1DatabaseBinding,
): TenantMembershipRepository {
  return {
    async findActiveByExternalUserId(externalUserId) {
      const normalizedExternalUserId = externalUserId.trim();

      if (normalizedExternalUserId.length === 0) {
        throw new Error("externalUserId must not be blank");
      }

      const result = await database
        .prepare(FIND_ACTIVE_MEMBERSHIPS_SQL)
        .bind(normalizedExternalUserId)
        .all<D1TenantMembershipRow>();

      if (!result.success) {
        throw new Error(result.error ?? "D1 membership read failed");
      }

      return (result.results ?? []).map(parseMembershipRow);
    },

    async findActiveByTenantId(tenantId) {
      const normalizedTenantId =
        requireTenantId(tenantId);
      const result = await database
        .prepare(
          FIND_ACTIVE_TENANT_MEMBERS_SQL,
        )
        .bind(normalizedTenantId)
        .all<D1TenantMembershipRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 tenant member read failed",
        );
      }

      const rows =
        result.results ?? [];

      if (rows.length > 100) {
        throw new Error(
          "D1 tenant member directory exceeds the safe limit",
        );
      }

      return rows.map(
        parseMembershipRow,
      );
    },
  };
}
