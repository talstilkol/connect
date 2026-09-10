import type {
  ProvisionedWorkspace,
  ProvisionWorkspaceInput,
  TenantProvisioningRepository,
} from "../../db/tenantProvisioningRepository.ts";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  TenantId,
  TenantStatus,
} from "../../shared/domain/model.ts";
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

const provisioningKeyPattern = /^tenant_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const interfaceLanguages = Object.freeze(["he", "en", "ar"] as const);
const tenantStatuses = Object.freeze([
  "trial",
  "active",
  "payment_failed",
  "suspended",
  "cancelled",
  "expired",
  "blocked",
] as const);
const workspaceRowKeys = Object.freeze([
  "businessName",
  "interfaceLanguage",
  "profileCreatedAt",
  "profileUpdatedAt",
  "profileVersion",
  "tenantDisplayName",
  "tenantId",
  "tenantStatus",
  "timezone",
]);

export const postgresTenantProvisioningSql = Object.freeze({
  insertTenant: `
    INSERT INTO tenants (
      provisioning_key,
      display_name,
      status
    ) VALUES ($1, $2, 'trial')
    ON CONFLICT (provisioning_key) DO NOTHING
    RETURNING id AS "tenantId"
  `,
  lockTenant: `
    SELECT
      id AS "tenantId",
      display_name AS "tenantDisplayName",
      status AS "tenantStatus"
    FROM tenants
    WHERE provisioning_key = $1
    FOR UPDATE
  `,
  updateTenantDisplayName: `
    UPDATE tenants
    SET
      display_name = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND display_name IS DISTINCT FROM $2
    RETURNING id AS "tenantId"
  `,
  lockOwners: `
    SELECT external_user_id AS "externalUserId"
    FROM tenant_memberships
    WHERE tenant_id = $1
      AND role = 'owner'
      AND status = 'active'
    ORDER BY id ASC
    LIMIT 2
    FOR UPDATE
  `,
  insertOwner: `
    INSERT INTO tenant_memberships (
      tenant_id,
      external_user_id,
      role,
      status
    ) VALUES ($1, $2, 'owner', 'active')
    ON CONFLICT (tenant_id, external_user_id) DO NOTHING
    RETURNING tenant_id AS "tenantId"
  `,
  upsertBusinessProfile: `
    INSERT INTO business_profiles (
      tenant_id,
      business_name,
      timezone,
      interface_language
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (tenant_id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      timezone = EXCLUDED.timezone,
      interface_language = EXCLUDED.interface_language,
      version = business_profiles.version + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE business_profiles.business_name IS DISTINCT FROM EXCLUDED.business_name
      OR business_profiles.timezone IS DISTINCT FROM EXCLUDED.timezone
      OR business_profiles.interface_language IS DISTINCT FROM EXCLUDED.interface_language
    RETURNING tenant_id AS "tenantId"
  `,
  insertAudit: `
    INSERT INTO audit_logs (
      tenant_id,
      actor_external_user_id,
      action,
      target_type,
      target_id,
      idempotency_key,
      metadata_json
    ) VALUES (
      $1::bigint, $2, 'tenant.provisioned', 'tenant',
      ($1::bigint)::text, $3, NULL
    )
    ON CONFLICT (tenant_id, action, idempotency_key)
      WHERE idempotency_key IS NOT NULL
      DO NOTHING
    RETURNING tenant_id AS "tenantId"
  `,
  loadAudit: `
    SELECT actor_external_user_id AS "actorExternalUserId"
    FROM audit_logs
    WHERE tenant_id = $1
      AND action = 'tenant.provisioned'
      AND idempotency_key = $2
    LIMIT 1
  `,
  loadWorkspace: `
    SELECT
      tenant.id AS "tenantId",
      tenant.display_name AS "tenantDisplayName",
      tenant.status AS "tenantStatus",
      profile.business_name AS "businessName",
      profile.timezone,
      profile.interface_language AS "interfaceLanguage",
      profile.version AS "profileVersion",
      profile.created_at AS "profileCreatedAt",
      profile.updated_at AS "profileUpdatedAt"
    FROM tenants AS tenant
    INNER JOIN tenant_memberships AS membership
      ON membership.tenant_id = tenant.id
    INNER JOIN business_profiles AS profile
      ON profile.tenant_id = tenant.id
    WHERE tenant.provisioning_key = $1
      AND membership.external_user_id = $2
      AND membership.role = 'owner'
      AND membership.status = 'active'
    LIMIT 1
  `,
});

export interface PostgresTenantProvisioningDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function requireProvisioningKey(value: unknown): string {
  if (typeof value !== "string" || !provisioningKeyPattern.test(value)) {
    throw new Error("provisioningKey is invalid");
  }
  return value;
}

function requireBoundedTrimmedValue(
  value: unknown,
  fieldName: string,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is invalid`);
  }
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > maximumLength ||
    controlCharacterPattern.test(normalized)
  ) {
    throw new Error(`${fieldName} is invalid`);
  }
  return normalized;
}

function requireInterfaceLanguage(value: unknown): InterfaceLanguage {
  if (
    typeof value !== "string" ||
    !interfaceLanguages.some((language) => language === value)
  ) {
    throw new Error("interfaceLanguage is invalid");
  }
  return value as InterfaceLanguage;
}

function parseTenantStatus(value: unknown): TenantStatus {
  if (
    typeof value !== "string" ||
    !tenantStatuses.some((status) => status === value)
  ) {
    throw new Error("PostgreSQL returned an invalid tenant status");
  }
  return value as TenantStatus;
}

function parseWorkspace(value: unknown): ProvisionedWorkspace {
  const row = requireExactPostgresRow(value, workspaceRowKeys);
  const tenantId = parsePostgresPositiveInteger(row.tenantId) as TenantId;
  const tenantDisplayName = requireBoundedTrimmedValue(
    row.tenantDisplayName,
    "PostgreSQL tenant display name",
    200,
  );
  const businessName = requireBoundedTrimmedValue(
    row.businessName,
    "PostgreSQL business name",
    200,
  );
  const timezone = requireBoundedTrimmedValue(
    row.timezone,
    "PostgreSQL timezone",
    100,
  );
  const interfaceLanguage = requireInterfaceLanguage(row.interfaceLanguage);
  const profileCreatedAt = parsePostgresTimestamp(row.profileCreatedAt);
  const profileUpdatedAt = parsePostgresTimestamp(row.profileUpdatedAt);
  if (Date.parse(profileUpdatedAt) < Date.parse(profileCreatedAt)) {
    throw new Error("PostgreSQL returned an invalid provisioned workspace");
  }
  return Object.freeze({
    tenantId,
    tenantDisplayName,
    tenantStatus: parseTenantStatus(row.tenantStatus),
    businessName,
    timezone,
    interfaceLanguage,
    profileVersion: parsePostgresPositiveInteger(row.profileVersion),
    profileCreatedAt,
    profileUpdatedAt,
  });
}

async function loadRows(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly unknown[]> {
  return requirePostgresRows(
    await queries.query<unknown>(sql, parameters),
    maximum,
  );
}

async function requireTenantScopedWrite(
  transaction: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  tenantId: number,
): Promise<void> {
  const rows = await loadRows(transaction, sql, parameters, 1);
  if (rows.length === 0) return;
  const row = requireExactPostgresRow(rows[0], ["tenantId"]);
  if (parsePostgresPositiveInteger(row.tenantId) !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant provisioning write");
  }
}

export function createPostgresTenantProvisioningRepository(
  dependencies: Readonly<PostgresTenantProvisioningDependencies>,
): TenantProvisioningRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL tenant provisioning dependencies are invalid");
  }

  return Object.freeze({
    async provisionOwnerWorkspace(input: ProvisionWorkspaceInput) {
      const provisioningKey = requireProvisioningKey(input?.provisioningKey);
      const externalUserId = requireBoundedTrimmedValue(
        input?.externalUserId,
        "externalUserId",
        512,
      );
      const businessName = requireBoundedTrimmedValue(
        input?.businessName,
        "businessName",
        200,
      );
      const timezone = requireBoundedTrimmedValue(
        input?.timezone,
        "timezone",
        100,
      );
      const interfaceLanguage = requireInterfaceLanguage(
        input?.interfaceLanguage,
      );
      const auditIdempotencyKey = `tenant.provisioned:${provisioningKey}`;

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          await loadRows(
            transaction,
            postgresTenantProvisioningSql.insertTenant,
            [provisioningKey, businessName],
            1,
          );
          const tenantRows = await loadRows(
            transaction,
            postgresTenantProvisioningSql.lockTenant,
            [provisioningKey],
            1,
          );
          if (tenantRows.length !== 1) {
            throw new Error("PostgreSQL did not return the provisioned tenant");
          }
          const tenantRow = requireExactPostgresRow(tenantRows[0], [
            "tenantDisplayName",
            "tenantId",
            "tenantStatus",
          ]);
          const tenantId = parsePostgresPositiveInteger(tenantRow.tenantId);
          parseTenantStatus(tenantRow.tenantStatus);
          if (tenantRow.tenantDisplayName !== businessName) {
            await requireTenantScopedWrite(
              transaction,
              postgresTenantProvisioningSql.updateTenantDisplayName,
              [tenantId, businessName],
              tenantId,
            );
          }

          const ownerRows = await loadRows(
            transaction,
            postgresTenantProvisioningSql.lockOwners,
            [tenantId],
            2,
          );
          if (ownerRows.length > 1) {
            throw new Error("PostgreSQL returned ambiguous tenant ownership");
          }
          if (ownerRows.length === 1) {
            const owner = requireExactPostgresRow(ownerRows[0], [
              "externalUserId",
            ]);
            if (owner.externalUserId !== externalUserId) {
              throw new Error("PostgreSQL provisioning identity conflict");
            }
          } else {
            await requireTenantScopedWrite(
              transaction,
              postgresTenantProvisioningSql.insertOwner,
              [tenantId, externalUserId],
              tenantId,
            );
          }

          await requireTenantScopedWrite(
            transaction,
            postgresTenantProvisioningSql.upsertBusinessProfile,
            [tenantId, businessName, timezone, interfaceLanguage],
            tenantId,
          );
          await requireTenantScopedWrite(
            transaction,
            postgresTenantProvisioningSql.insertAudit,
            [tenantId, externalUserId, auditIdempotencyKey],
            tenantId,
          );
          const auditRows = await loadRows(
            transaction,
            postgresTenantProvisioningSql.loadAudit,
            [tenantId, auditIdempotencyKey],
            1,
          );
          if (auditRows.length !== 1) {
            throw new Error("PostgreSQL provisioning audit was not confirmed");
          }
          const audit = requireExactPostgresRow(auditRows[0], [
            "actorExternalUserId",
          ]);
          if (audit.actorExternalUserId !== externalUserId) {
            throw new Error("PostgreSQL provisioning audit identity conflict");
          }

          const workspaceRows = await loadRows(
            transaction,
            postgresTenantProvisioningSql.loadWorkspace,
            [provisioningKey, externalUserId],
            1,
          );
          if (workspaceRows.length !== 1) {
            throw new Error("PostgreSQL did not return the provisioned workspace");
          }
          const workspace = parseWorkspace(workspaceRows[0]);
          if (
            workspace.tenantId !== tenantId ||
            workspace.tenantDisplayName !== businessName ||
            workspace.businessName !== businessName ||
            workspace.timezone !== timezone ||
            workspace.interfaceLanguage !== interfaceLanguage
          ) {
            throw new Error("PostgreSQL returned conflicting provisioned workspace data");
          }
          return workspace;
        },
      );
    },
  });
}
