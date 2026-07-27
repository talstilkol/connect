import type {
  TenantId,
} from "../../shared/domain/model.ts";
import type {
  D1DatabaseBinding,
} from "../../db/d1.ts";
import {
  enforceCurrentTenantMutationRateLimit,
} from "../security/tenantMutationRateLimit.ts";
import {
  requireCurrentTenantSession,
} from "./currentTenantSession.ts";
import type {
  TenantSession,
} from "./tenantSession.ts";

export async function requireCurrentTenantMutationSession(
  database?: D1DatabaseBinding,
  selectedTenantId?: TenantId,
): Promise<TenantSession> {
  const session =
    await requireCurrentTenantSession(
      database,
      selectedTenantId,
    );

  await enforceCurrentTenantMutationRateLimit(
    session.externalUserId,
  );

  return session;
}
