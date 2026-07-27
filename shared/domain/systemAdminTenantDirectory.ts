import type {
  TenantStatus,
} from "./model.ts";
import type {
  TenantSubscriptionAdminView,
} from "./tenantSubscriptionAdminView.ts";

export interface SystemAdminTenantRecord {
  tenantId: number;
  displayName: string;
  tenantStatus: TenantStatus;
  subscription:
    TenantSubscriptionAdminView | null;
}

export interface SystemAdminTenantDirectoryPage {
  tenants:
    readonly SystemAdminTenantRecord[];
  nextCursor: number | null;
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
