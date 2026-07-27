import type {
  TenantSubscriptionRepository,
} from "../../db/tenantSubscriptionRepository.ts";
import type {
  TenantSubscription,
} from "../../shared/domain/tenantSubscription.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";

export interface TenantSubscriptionService {
  readCurrent(
    session: TenantSession,
  ): Promise<TenantSubscription | null>;
}

export function createTenantSubscriptionService(
  repository: Pick<
    TenantSubscriptionRepository,
    "findByTenantId"
  >,
): TenantSubscriptionService {
  return {
    async readCurrent(session) {
      requireTenantPermission(
        session,
        "billing.read",
      );

      return repository.findByTenantId(
        session.tenantId,
      );
    },
  };
}
