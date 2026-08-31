import type {
  TenantStatus,
} from "./model.ts";
import type {
  TenantSubscriptionAdminView,
} from "./tenantSubscriptionAdminView.ts";
import type {
  SystemAdminBusinessProfileView,
} from "./systemAdminBusinessProfile.ts";

export interface SystemAdminTenantRecord {
  tenantId: number;
  displayName: string;
  tenantStatus: TenantStatus;
  businessProfile:
    SystemAdminBusinessProfileView | null;
  subscription:
    TenantSubscriptionAdminView | null;
}

export interface SystemAdminTenantDirectoryPage {
  tenants:
    readonly SystemAdminTenantRecord[];
  nextCursor: number | null;
}

export type SystemAdminTenantStatusFilter =
  | "all"
  | TenantStatus;

export type SystemAdminSubscriptionFilter =
  | "all"
  | "with-subscription"
  | "without-subscription";

export const SYSTEM_ADMIN_TENANT_STATUS_FILTERS =
  Object.freeze([
    "all",
    "trial",
    "active",
    "payment_failed",
    "suspended",
    "cancelled",
    "expired",
    "blocked",
  ] satisfies readonly SystemAdminTenantStatusFilter[]);

export const SYSTEM_ADMIN_SUBSCRIPTION_FILTERS =
  Object.freeze([
    "all",
    "with-subscription",
    "without-subscription",
  ] satisfies readonly SystemAdminSubscriptionFilter[]);

export interface SystemAdminTenantDirectoryFilters {
  search: string;
  tenantStatus:
    SystemAdminTenantStatusFilter;
  subscription:
    SystemAdminSubscriptionFilter;
}

export interface SystemAdminTenantDirectoryQuery
  extends SystemAdminTenantDirectoryFilters {
  afterTenantId: number | null;
}

export const DEFAULT_SYSTEM_ADMIN_TENANT_DIRECTORY_FILTERS =
  Object.freeze({
    search: "",
    tenantStatus: "all",
    subscription: "all",
  } satisfies SystemAdminTenantDirectoryFilters);

export function matchesSystemAdminTenantDirectoryFilters(
  tenant: SystemAdminTenantRecord,
  filters:
    SystemAdminTenantDirectoryFilters,
): boolean {
  const normalizedSearch = filters.search
    .trim()
    .toLocaleLowerCase("he-IL");
  const searchMatches =
    normalizedSearch.length === 0 ||
    tenant.displayName
      .toLocaleLowerCase("he-IL")
      .includes(normalizedSearch) ||
    String(tenant.tenantId).includes(
      normalizedSearch,
    );
  const statusMatches =
    filters.tenantStatus === "all" ||
    tenant.tenantStatus ===
      filters.tenantStatus;
  const subscriptionMatches =
    filters.subscription === "all" ||
    (filters.subscription ===
    "with-subscription"
      ? tenant.subscription !== null
      : tenant.subscription === null);

  return (
    searchMatches &&
    statusMatches &&
    subscriptionMatches
  );
}

export type SystemAdminTenantDirectoryStatus =
  | "ready"
  | "configuration-required"
  | "unauthenticated"
  | "permission-denied"
  | "server-error";

export interface CurrentSystemAdminTenantDirectory {
  status:
    SystemAdminTenantDirectoryStatus;
  directory:
    SystemAdminTenantDirectoryPage;
}
