import type {
  InterfaceLanguage,
} from "../shared/domain/businessProfileDraft";
import type {
  TenantId,
  TenantStatus,
  UserId,
} from "../shared/domain/model";
import type { D1DatabaseBinding } from "./d1";

const UPSERT_TENANT_SQL = `
  INSERT INTO tenants (
    provisioning_key,
    display_name,
    status
  )
  VALUES (?1, ?2, 'trial')
  ON CONFLICT (provisioning_key) DO UPDATE SET
    display_name = excluded.display_name,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenants.display_name IS NOT excluded.display_name
`;

const INSERT_OWNER_MEMBERSHIP_SQL = `
  INSERT INTO tenant_memberships (
    tenant_id,
    external_user_id,
    role,
    status
  )
  SELECT
    tenants.id,
    ?2,
    'owner',
    'active'
  FROM tenants
  WHERE tenants.provisioning_key = ?1
  ON CONFLICT (tenant_id, external_user_id) DO NOTHING
`;

const UPSERT_BUSINESS_PROFILE_SQL = `
  INSERT INTO business_profiles (
    tenant_id,
    business_name,
    timezone,
    interface_language
  )
  SELECT
    tenants.id,
    ?2,
    ?3,
    ?4
  FROM tenants
  WHERE tenants.provisioning_key = ?1
  ON CONFLICT (tenant_id) DO UPDATE SET
    business_name = excluded.business_name,
    timezone = excluded.timezone,
    interface_language = excluded.interface_language,
    version = business_profiles.version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE business_profiles.business_name IS NOT excluded.business_name
    OR business_profiles.timezone IS NOT excluded.timezone
    OR business_profiles.interface_language IS NOT excluded.interface_language
`;

const INSERT_PROVISIONING_AUDIT_SQL = `
  INSERT INTO audit_logs (
    tenant_id,
    actor_external_user_id,
    action,
    target_type,
    target_id,
    idempotency_key
  )
  SELECT
    tenants.id,
    ?2,
    'tenant.provisioned',
    'tenant',
    CAST(tenants.id AS TEXT),
    ?3
  FROM tenants
  WHERE tenants.provisioning_key = ?1
  ON CONFLICT (idempotency_key) DO NOTHING
`;

const SELECT_PROVISIONED_WORKSPACE_SQL = `
  SELECT
    tenants.id AS tenantId,
    tenants.display_name AS tenantDisplayName,
    tenants.status AS tenantStatus,
    business_profiles.business_name AS businessName,
    business_profiles.timezone AS timezone,
    business_profiles.interface_language AS interfaceLanguage,
    business_profiles.version AS profileVersion,
    business_profiles.created_at AS profileCreatedAt,
    business_profiles.updated_at AS profileUpdatedAt
  FROM tenants
  INNER JOIN tenant_memberships
    ON tenant_memberships.tenant_id = tenants.id
  INNER JOIN business_profiles
    ON business_profiles.tenant_id = tenants.id
  WHERE tenants.provisioning_key = ?1
    AND tenant_memberships.external_user_id = ?2
    AND tenant_memberships.role = 'owner'
    AND tenant_memberships.status = 'active'
  LIMIT 1
`;

const tenantStatuses: readonly TenantStatus[] = [
  "trial",
  "active",
  "payment_failed",
  "suspended",
  "cancelled",
  "expired",
  "blocked",
];

interface ProvisionedWorkspaceRow {
  tenantId: number;
  tenantDisplayName: string;
  tenantStatus: string;
  businessName: string;
  timezone: string;
  interfaceLanguage: InterfaceLanguage;
  profileVersion: number;
  profileCreatedAt: string;
  profileUpdatedAt: string;
}

export interface ProvisionWorkspaceInput {
  provisioningKey: string;
  externalUserId: UserId;
  businessName: string;
  timezone: string;
  interfaceLanguage: InterfaceLanguage;
}

export interface ProvisionedWorkspace {
  tenantId: TenantId;
  tenantDisplayName: string;
  tenantStatus: TenantStatus;
  businessName: string;
  timezone: string;
  interfaceLanguage: InterfaceLanguage;
  profileVersion: number;
  profileCreatedAt: string;
  profileUpdatedAt: string;
}

export interface TenantProvisioningRepository {
  provisionOwnerWorkspace(
    input: ProvisionWorkspaceInput,
  ): Promise<ProvisionedWorkspace>;
}

function isTenantStatus(value: string): value is TenantStatus {
  return tenantStatuses.some((status) => status === value);
}

function requireTrimmedValue(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return normalizedValue;
}

function parseWorkspaceRow(
  row: ProvisionedWorkspaceRow,
): ProvisionedWorkspace {
  if (!Number.isSafeInteger(row.tenantId) || row.tenantId <= 0) {
    throw new Error("D1 returned an invalid provisioned tenant ID");
  }

  if (!isTenantStatus(row.tenantStatus)) {
    throw new Error("D1 returned an invalid provisioned tenant status");
  }

  if (!Number.isSafeInteger(row.profileVersion) || row.profileVersion <= 0) {
    throw new Error("D1 returned an invalid business profile version");
  }

  return {
    ...row,
    tenantId: row.tenantId as TenantId,
    tenantStatus: row.tenantStatus,
  };
}

export function createTenantProvisioningRepository(
  database: D1DatabaseBinding,
): TenantProvisioningRepository {
  return {
    async provisionOwnerWorkspace(input) {
      const provisioningKey = requireTrimmedValue(
        input.provisioningKey,
        "provisioningKey",
      );
      const externalUserId = requireTrimmedValue(
        input.externalUserId,
        "externalUserId",
      );
      const businessName = requireTrimmedValue(
        input.businessName,
        "businessName",
      );
      const timezone = requireTrimmedValue(input.timezone, "timezone");
      const auditIdempotencyKey = `tenant.provisioned:${provisioningKey}`;

      const results = await database.batch([
        database
          .prepare(UPSERT_TENANT_SQL)
          .bind(provisioningKey, businessName),
        database
          .prepare(INSERT_OWNER_MEMBERSHIP_SQL)
          .bind(provisioningKey, externalUserId),
        database
          .prepare(UPSERT_BUSINESS_PROFILE_SQL)
          .bind(
            provisioningKey,
            businessName,
            timezone,
            input.interfaceLanguage,
          ),
        database
          .prepare(INSERT_PROVISIONING_AUDIT_SQL)
          .bind(
            provisioningKey,
            externalUserId,
            auditIdempotencyKey,
          ),
      ]);

      const failedResult = results.find((result) => !result.success);

      if (results.length !== 4 || failedResult) {
        throw new Error(
          failedResult?.error ?? "D1 tenant provisioning failed",
        );
      }

      const provisionedWorkspace = await database
        .prepare(SELECT_PROVISIONED_WORKSPACE_SQL)
        .bind(provisioningKey, externalUserId)
        .first<ProvisionedWorkspaceRow>();

      if (!provisionedWorkspace) {
        throw new Error("D1 did not return the provisioned workspace");
      }

      return parseWorkspaceRow(provisionedWorkspace);
    },
  };
}
