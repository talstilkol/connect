import type {
  SystemAdminTenantDirectoryPage,
  SystemAdminTenantDirectoryQuery,
  SystemAdminTenantRecord,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import {
  SYSTEM_ADMIN_SUBSCRIPTION_FILTERS,
  SYSTEM_ADMIN_TENANT_STATUS_FILTERS,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import type {
  SystemAdminTenantDirectoryRepository,
} from "../../db/systemAdminTenantDirectoryRepository.ts";
import {
  isSubscriptionStatus,
  requireCanonicalTimestamp,
  requirePositiveTenantId,
  requireSubscriptionWindow,
} from "../billing/tenantSubscriptionValidation.ts";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const pageSize = 50;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const tenantStatusFilters = new Set(SYSTEM_ADMIN_TENANT_STATUS_FILTERS);
const subscriptionFilters = new Set(SYSTEM_ADMIN_SUBSCRIPTION_FILTERS);
const rowKeys = Object.freeze([
  "businessInterfaceLanguage",
  "businessName",
  "businessProfileCreatedAt",
  "businessProfileTenantId",
  "businessProfileUpdatedAt",
  "businessProfileVersion",
  "businessTimezone",
  "cancelledAt",
  "displayName",
  "endsAt",
  "startsAt",
  "subscriptionCreatedAt",
  "subscriptionStatus",
  "subscriptionTenantId",
  "subscriptionUpdatedAt",
  "subscriptionVersion",
  "tenantId",
  "tenantStatus",
]);

export const postgresSystemAdminTenantDirectorySql = Object.freeze({
  listPage: `
    SELECT
      tenant.id AS "tenantId",
      tenant.display_name AS "displayName",
      tenant.status AS "tenantStatus",
      profile.tenant_id AS "businessProfileTenantId",
      profile.business_name AS "businessName",
      profile.timezone AS "businessTimezone",
      profile.interface_language AS "businessInterfaceLanguage",
      profile.version AS "businessProfileVersion",
      profile.created_at AS "businessProfileCreatedAt",
      profile.updated_at AS "businessProfileUpdatedAt",
      subscription.tenant_id AS "subscriptionTenantId",
      subscription.status AS "subscriptionStatus",
      subscription.starts_at AS "startsAt",
      subscription.ends_at AS "endsAt",
      subscription.cancelled_at AS "cancelledAt",
      subscription.version AS "subscriptionVersion",
      subscription.created_at AS "subscriptionCreatedAt",
      subscription.updated_at AS "subscriptionUpdatedAt"
    FROM tenants AS tenant
    LEFT JOIN tenant_subscriptions AS subscription
      ON subscription.tenant_id = tenant.id
    LEFT JOIN business_profiles AS profile
      ON profile.tenant_id = tenant.id
    WHERE ($1::bigint IS NULL OR tenant.id > $1::bigint)
      AND (
        $2 = ''
        OR strpos(lower(tenant.display_name), $2) > 0
        OR strpos(tenant.id::text, $2) > 0
      )
      AND ($3 = 'all' OR tenant.status = $3)
      AND (
        $4 = 'all'
        OR ($4 = 'with-subscription' AND subscription.tenant_id IS NOT NULL)
        OR ($4 = 'without-subscription' AND subscription.tenant_id IS NULL)
      )
    ORDER BY tenant.id ASC
    LIMIT $5
  `,
});

function validateQuery(
  value: SystemAdminTenantDirectoryQuery,
): SystemAdminTenantDirectoryQuery {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).length !== 4 ||
    typeof value.search !== "string" ||
    value.search !== value.search.trim() ||
    value.search !== value.search.toLocaleLowerCase("he-IL") ||
    value.search.length > 80 ||
    controlCharacterPattern.test(value.search) ||
    !tenantStatusFilters.has(value.tenantStatus) ||
    !subscriptionFilters.has(value.subscription)
  ) {
    throw new Error("System admin tenant directory query is invalid");
  }

  return Object.freeze({
    ...value,
    afterTenantId: value.afterTenantId === null
      ? null
      : requirePositiveTenantId(value.afterTenantId),
  });
}

function requireStoredText(value: unknown, fieldName: string): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 500 ||
    controlCharacterPattern.test(value)
  ) {
    throw new Error(`PostgreSQL returned an invalid ${fieldName}`);
  }
  return value;
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null ? null : parsePostgresTimestamp(value);
}

function parseRow(value: unknown): SystemAdminTenantRecord {
  const row = requireExactPostgresRow(value, rowKeys);
  const tenantId = parsePostgresPositiveInteger(row.tenantId);
  const displayName = requireStoredText(row.displayName, "tenant display name");
  const tenantStatus = typeof row.tenantStatus === "string" &&
      isSubscriptionStatus(row.tenantStatus)
    ? row.tenantStatus
    : null;
  if (tenantStatus === null) {
    throw new Error("PostgreSQL returned an invalid system admin tenant");
  }

  const profileValues = [
    row.businessName,
    row.businessTimezone,
    row.businessInterfaceLanguage,
    row.businessProfileVersion,
    row.businessProfileCreatedAt,
    row.businessProfileUpdatedAt,
  ];
  let businessProfile: SystemAdminTenantRecord["businessProfile"] = null;
  if (row.businessProfileTenantId === null) {
    if (profileValues.some((field) => field !== null)) {
      throw new Error("PostgreSQL returned an incomplete business profile");
    }
  } else {
    const profileTenantId = parsePostgresPositiveInteger(
      row.businessProfileTenantId,
    );
    const validation = validatePersistedBusinessProfile({
      businessName: row.businessName,
      timezone: row.businessTimezone,
      interfaceLanguage: row.businessInterfaceLanguage,
    });
    const createdAt = parsePostgresTimestamp(row.businessProfileCreatedAt);
    const updatedAt = parsePostgresTimestamp(row.businessProfileUpdatedAt);
    if (
      profileTenantId !== tenantId ||
      !validation.success ||
      validation.value.businessName !== row.businessName ||
      validation.value.businessName !== displayName ||
      validation.value.timezone !== row.businessTimezone ||
      Date.parse(updatedAt) < Date.parse(createdAt)
    ) {
      throw new Error("PostgreSQL returned an invalid business profile");
    }
    businessProfile = Object.freeze({
      ...validation.value,
      version: parsePostgresPositiveInteger(row.businessProfileVersion),
      createdAt,
      updatedAt,
    });
  }

  const subscriptionValues = [
    row.subscriptionStatus,
    row.startsAt,
    row.endsAt,
    row.cancelledAt,
    row.subscriptionVersion,
    row.subscriptionCreatedAt,
    row.subscriptionUpdatedAt,
  ];
  if (row.subscriptionTenantId === null) {
    if (subscriptionValues.some((field) => field !== null)) {
      throw new Error("PostgreSQL returned an incomplete subscription");
    }
    return Object.freeze({
      tenantId,
      displayName,
      tenantStatus,
      businessProfile,
      subscription: null,
    });
  }

  const subscriptionTenantId = parsePostgresPositiveInteger(
    row.subscriptionTenantId,
  );
  const subscriptionStatus = typeof row.subscriptionStatus === "string" &&
      isSubscriptionStatus(row.subscriptionStatus)
    ? row.subscriptionStatus
    : null;
  const startsAt = parsePostgresTimestamp(row.startsAt);
  const endsAt = parsePostgresTimestamp(row.endsAt);
  const cancelledAt = parseNullableTimestamp(row.cancelledAt);
  const createdAt = parsePostgresTimestamp(row.subscriptionCreatedAt);
  const updatedAt = parsePostgresTimestamp(row.subscriptionUpdatedAt);
  if (
    subscriptionTenantId !== tenantId ||
    subscriptionStatus === null ||
    subscriptionStatus !== tenantStatus ||
    (subscriptionStatus === "cancelled") !== (cancelledAt !== null) ||
    Date.parse(updatedAt) < Date.parse(createdAt)
  ) {
    throw new Error("PostgreSQL returned an invalid subscription");
  }
  const period = requireSubscriptionWindow(startsAt, endsAt);
  if (cancelledAt !== null) requireCanonicalTimestamp(cancelledAt);

  return Object.freeze({
    tenantId,
    displayName,
    tenantStatus,
    businessProfile,
    subscription: Object.freeze({
      status: subscriptionStatus,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      cancelledAt,
      version: parsePostgresPositiveInteger(row.subscriptionVersion),
      createdAt,
      updatedAt,
    }),
  });
}

export function createPostgresSystemAdminTenantDirectoryRepository(
  queries: PostgresQueryExecutor,
): SystemAdminTenantDirectoryRepository {
  if (typeof queries?.query !== "function") {
    throw new Error("PostgreSQL system admin directory dependency is invalid");
  }
  return Object.freeze({
    async listPage(
      input: SystemAdminTenantDirectoryQuery,
    ): Promise<SystemAdminTenantDirectoryPage> {
      const query = validateQuery(input);
      const rows = requirePostgresRows(
        await queries.query<unknown>(
          postgresSystemAdminTenantDirectorySql.listPage,
          [
            query.afterTenantId,
            query.search,
            query.tenantStatus,
            query.subscription,
            pageSize + 1,
          ],
        ),
        pageSize + 1,
      );
      const parsed = rows.map(parseRow);
      for (let index = 1; index < parsed.length; index += 1) {
        if (parsed[index - 1].tenantId >= parsed[index].tenantId) {
          throw new Error("PostgreSQL system admin tenant ordering is invalid");
        }
      }
      const tenants = Object.freeze(parsed.slice(0, pageSize));
      return Object.freeze({
        tenants,
        nextCursor: parsed.length > pageSize
          ? tenants.at(-1)?.tenantId ?? null
          : null,
      } satisfies SystemAdminTenantDirectoryPage);
    },
  });
}
