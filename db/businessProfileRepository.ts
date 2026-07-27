import type { InterfaceLanguage } from "../shared/domain/businessProfileDraft";
import type { D1DatabaseBinding } from "./d1";

const SELECT_BY_TENANT_SQL = `
  SELECT
    tenant_id AS tenantId,
    business_name AS businessName,
    timezone,
    interface_language AS interfaceLanguage,
    version,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM business_profiles
  WHERE tenant_id = ?1
  LIMIT 1
`;

const UPDATE_TENANT_DISPLAY_NAME_SQL = `
  UPDATE tenants
  SET
    display_name = ?2,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND display_name IS NOT ?2
`;

const UPSERT_SQL = `
  INSERT INTO business_profiles (
    tenant_id,
    business_name,
    timezone,
    interface_language
  )
  VALUES (?1, ?2, ?3, ?4)
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

export interface PersistedBusinessProfile {
  tenantId: number;
  businessName: string;
  timezone: string;
  interfaceLanguage: InterfaceLanguage;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveBusinessProfileInput {
  tenantId: number;
  businessName: string;
  timezone: string;
  interfaceLanguage: InterfaceLanguage;
}

export interface BusinessProfileRepository {
  findByTenantId(
    tenantId: number,
  ): Promise<PersistedBusinessProfile | null>;
  save(input: SaveBusinessProfileInput): Promise<void>;
}

function assertTenantId(tenantId: number): void {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new Error("tenantId must be a positive integer");
  }
}

function requireTrimmedValue(value: string, fieldName: string): string {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return trimmedValue;
}

export function createBusinessProfileRepository(
  database: D1DatabaseBinding,
): BusinessProfileRepository {
  return {
    async findByTenantId(tenantId) {
      assertTenantId(tenantId);

      return database
        .prepare(SELECT_BY_TENANT_SQL)
        .bind(tenantId)
        .first<PersistedBusinessProfile>();
    },

    async save(input) {
      assertTenantId(input.tenantId);

      const businessName = requireTrimmedValue(
        input.businessName,
        "businessName",
      );
      const timezone = requireTrimmedValue(input.timezone, "timezone");

      const results = await database.batch([
        database
          .prepare(UPDATE_TENANT_DISPLAY_NAME_SQL)
          .bind(input.tenantId, businessName),
        database
          .prepare(UPSERT_SQL)
          .bind(
            input.tenantId,
            businessName,
            timezone,
            input.interfaceLanguage,
          ),
      ]);

      const failedResult = results.find((result) => !result.success);

      if (results.length !== 2 || failedResult) {
        throw new Error(
          failedResult?.error ?? "D1 business profile write failed",
        );
      }
    },
  };
}
