import type {
  TenantSubscription,
} from "../../shared/domain/tenantSubscription.ts";
import type {
  TenantSubscriptionAdminView,
} from "../../shared/domain/tenantSubscriptionAdminView.ts";

export function toTenantSubscriptionAdminView(
  subscription: TenantSubscription,
): TenantSubscriptionAdminView {
  return {
    status: subscription.status,
    startsAt: subscription.startsAt,
    endsAt: subscription.endsAt,
    cancelledAt:
      subscription.cancelledAt,
    version: subscription.version,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}
