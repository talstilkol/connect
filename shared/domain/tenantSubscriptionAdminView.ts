import type {
  TenantSubscriptionStatus,
} from "./tenantSubscription.ts";

export interface TenantSubscriptionAdminView {
  status: TenantSubscriptionStatus;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
