import type {
  BusinessProfileRepository,
  PersistedBusinessProfile,
  SaveBusinessProfileInput,
} from "../../db/businessProfileRepository.ts";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
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

const profileRowKeys = Object.freeze([
  "tenantId",
  "businessName",
  "timezone",
  "interfaceLanguage",
  "version",
  "createdAt",
  "updatedAt",
]);
const interfaceLanguages = Object.freeze([
  "he",
  "en",
  "ar",
] as const);

export const postgresBusinessProfileSql = Object.freeze({
  findByTenantId: `
    SELECT
      tenant_id AS "tenantId",
      business_name AS "businessName",
      timezone,
      interface_language AS "interfaceLanguage",
      version,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM business_profiles
    WHERE tenant_id = $1
    LIMIT 1
  `,
  updateTenantDisplayName: `
    UPDATE tenants
    SET
      display_name = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND display_name IS DISTINCT FROM $2
    RETURNING id
  `,
  upsert: `
    INSERT INTO business_profiles (
      tenant_id,
      business_name,
      timezone,
      interface_language
    )
    VALUES ($1, $2, $3, $4)
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
});

export interface PostgresBusinessProfileDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function requireTenantId(tenantId: number): number {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new Error("tenantId must be a positive integer");
  }

  return tenantId;
}

function requireTrimmedValue(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return normalized;
}

function isInterfaceLanguage(
  value: unknown,
): value is InterfaceLanguage {
  return interfaceLanguages.some((language) => language === value);
}

function parseProfile(value: unknown): Readonly<PersistedBusinessProfile> {
  const row = requireExactPostgresRow(value, profileRowKeys);

  if (
    typeof row.businessName !== "string" ||
    row.businessName.length === 0 ||
    row.businessName !== row.businessName.trim() ||
    typeof row.timezone !== "string" ||
    row.timezone.length === 0 ||
    row.timezone !== row.timezone.trim() ||
    !isInterfaceLanguage(row.interfaceLanguage)
  ) {
    throw new Error("PostgreSQL returned an invalid business profile");
  }

  return Object.freeze({
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    businessName: row.businessName,
    timezone: row.timezone,
    interfaceLanguage: row.interfaceLanguage,
    version: parsePostgresPositiveInteger(row.version),
    createdAt: parsePostgresTimestamp(row.createdAt),
    updatedAt: parsePostgresTimestamp(row.updatedAt),
  });
}

async function loadProfile(
  database: PostgresQueryExecutor,
  tenantId: number,
): Promise<Readonly<PersistedBusinessProfile> | null> {
  const result = await database.query<Record<string, unknown>>(
    postgresBusinessProfileSql.findByTenantId,
    [tenantId],
  );
  const rows = requirePostgresRows(result, 1);
  const profile = rows.length === 0 ? null : parseProfile(rows[0]);

  if (profile !== null && profile.tenantId !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant business profile");
  }

  return profile;
}

function validateOptionalTenantWrite(
  value: unknown,
  key: "id" | "tenantId",
  tenantId: number,
): void {
  const row = requireExactPostgresRow(value, [key]);

  if (parsePostgresPositiveInteger(row[key]) !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant write result");
  }
}

async function saveProfileTransaction(
  transaction: PostgresTransaction,
  tenantId: number,
  businessName: string,
  timezone: string,
  interfaceLanguage: InterfaceLanguage,
): Promise<void> {
  const tenantUpdate = await transaction.query<Record<string, unknown>>(
    postgresBusinessProfileSql.updateTenantDisplayName,
    [tenantId, businessName],
  );
  const tenantRows = requirePostgresRows(tenantUpdate, 1);

  if (tenantRows.length === 1) {
    validateOptionalTenantWrite(tenantRows[0], "id", tenantId);
  }

  const profileUpsert = await transaction.query<Record<string, unknown>>(
    postgresBusinessProfileSql.upsert,
    [tenantId, businessName, timezone, interfaceLanguage],
  );
  const profileRows = requirePostgresRows(profileUpsert, 1);

  if (profileRows.length === 1) {
    validateOptionalTenantWrite(
      profileRows[0],
      "tenantId",
      tenantId,
    );
  }

  const profile = await loadProfile(transaction, tenantId);

  if (
    profile === null ||
    profile.tenantId !== tenantId ||
    profile.businessName !== businessName ||
    profile.timezone !== timezone ||
    profile.interfaceLanguage !== interfaceLanguage
  ) {
    throw new Error("PostgreSQL business profile write was not confirmed");
  }
}

export function createPostgresBusinessProfileRepository(
  dependencies: Readonly<PostgresBusinessProfileDependencies>,
): BusinessProfileRepository {
  if (
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL business profile dependencies are invalid");
  }

  return Object.freeze({
    async findByTenantId(tenantId: number) {
      return loadProfile(
        dependencies.queries,
        requireTenantId(tenantId),
      );
    },

    async save(input: SaveBusinessProfileInput) {
      const tenantId = requireTenantId(input.tenantId);
      const businessName = requireTrimmedValue(
        input.businessName,
        "businessName",
      );
      const timezone = requireTrimmedValue(input.timezone, "timezone");

      if (!isInterfaceLanguage(input.interfaceLanguage)) {
        throw new Error("interfaceLanguage is invalid");
      }

      await dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) =>
          saveProfileTransaction(
            transaction,
            tenantId,
            businessName,
            timezone,
            input.interfaceLanguage,
          ),
      );
    },
  });
}
