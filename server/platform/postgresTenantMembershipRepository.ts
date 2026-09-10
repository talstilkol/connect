import type {
  ActiveTenantMembership,
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import type {
  TenantId,
  TenantRole,
  TenantStatus,
  UserId,
} from "../../shared/domain/model.ts";
import {
  parsePostgresPositiveInteger,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const maximumMemberships = 100;
const membershipRowKeys = Object.freeze([
  "tenantId",
  "tenantDisplayName",
  "tenantStatus",
  "externalUserId",
  "role",
  "version",
]);
const tenantRoles = Object.freeze([
  "owner",
  "manager",
  "agent",
  "viewer",
] as const);
const tenantStatuses = Object.freeze([
  "trial",
  "active",
  "payment_failed",
  "suspended",
  "cancelled",
  "expired",
  "blocked",
] as const);

export const postgresTenantMembershipSql = Object.freeze({
  findActiveByExternalUserId: `
    SELECT
      tenant_memberships.tenant_id AS "tenantId",
      tenants.display_name AS "tenantDisplayName",
      tenants.status AS "tenantStatus",
      tenant_memberships.external_user_id AS "externalUserId",
      tenant_memberships.role,
      tenant_memberships.version
    FROM tenant_memberships
    INNER JOIN tenants
      ON tenants.id = tenant_memberships.tenant_id
    WHERE tenant_memberships.external_user_id = $1
      AND tenant_memberships.status = 'active'
    ORDER BY tenant_memberships.tenant_id ASC
    LIMIT 101
  `,
  findActiveByTenantId: `
    SELECT
      tenant_memberships.tenant_id AS "tenantId",
      tenants.display_name AS "tenantDisplayName",
      tenants.status AS "tenantStatus",
      tenant_memberships.external_user_id AS "externalUserId",
      tenant_memberships.role,
      tenant_memberships.version
    FROM tenant_memberships
    INNER JOIN tenants
      ON tenants.id = tenant_memberships.tenant_id
    WHERE tenant_memberships.tenant_id = $1
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
  `,
});

function isTenantRole(value: unknown): value is TenantRole {
  return tenantRoles.some((role) => role === value);
}

function isTenantStatus(value: unknown): value is TenantStatus {
  return tenantStatuses.some((status) => status === value);
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

function parseMembership(
  value: unknown,
): Readonly<ActiveTenantMembership> {
  const row = requireExactPostgresRow(value, membershipRowKeys);
  const tenantId = parsePostgresPositiveInteger(row.tenantId);
  const version = parsePostgresPositiveInteger(row.version);

  if (
    typeof row.tenantDisplayName !== "string" ||
    row.tenantDisplayName.trim().length === 0 ||
    typeof row.externalUserId !== "string" ||
    row.externalUserId.length === 0 ||
    row.externalUserId.length > 512 ||
    row.externalUserId !== row.externalUserId.trim() ||
    /[\u0000-\u001f\u007f]/.test(row.externalUserId) ||
    !isTenantRole(row.role) ||
    !isTenantStatus(row.tenantStatus)
  ) {
    throw new Error("PostgreSQL returned an invalid membership");
  }

  return Object.freeze({
    tenantId: tenantId as TenantId,
    tenantDisplayName: row.tenantDisplayName,
    tenantStatus: row.tenantStatus,
    externalUserId: row.externalUserId as UserId,
    role: row.role,
    version,
  });
}

async function loadMemberships(
  database: PostgresQueryExecutor,
  sql: string,
  parameter: string | number,
): Promise<readonly Readonly<ActiveTenantMembership>[]> {
  const result = await database.query<Record<string, unknown>>(
    sql,
    [parameter],
  );
  const rows = requirePostgresRows(result, maximumMemberships + 1);

  if (rows.length > maximumMemberships) {
    throw new Error("PostgreSQL membership directory exceeds the safe limit");
  }

  return Object.freeze(rows.map(parseMembership));
}

export function createPostgresTenantMembershipRepository(
  database: PostgresQueryExecutor,
): TenantMembershipRepository {
  if (typeof database?.query !== "function") {
    throw new Error("PostgreSQL membership database is invalid");
  }

  return Object.freeze({
    async findActiveByExternalUserId(externalUserId: UserId) {
      const normalizedExternalUserId =
        requireExternalUserId(externalUserId);
      const memberships = await loadMemberships(
        database,
        postgresTenantMembershipSql.findActiveByExternalUserId,
        normalizedExternalUserId,
      );

      if (
        memberships.some(
          (membership) =>
            membership.externalUserId !== normalizedExternalUserId,
        )
      ) {
        throw new Error("PostgreSQL returned a cross-user membership");
      }

      return memberships;
    },

    async findActiveByTenantId(tenantId: TenantId) {
      const normalizedTenantId = requireTenantId(tenantId);
      const memberships = await loadMemberships(
        database,
        postgresTenantMembershipSql.findActiveByTenantId,
        normalizedTenantId,
      );

      if (
        memberships.some(
          (membership) => membership.tenantId !== normalizedTenantId,
        )
      ) {
        throw new Error("PostgreSQL returned a cross-tenant membership");
      }

      return memberships;
    },
  });
}
