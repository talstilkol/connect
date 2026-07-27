import { requireRuntimeDatabase } from "../../db/runtimeDatabase.ts";
import { createTenantMembershipRepository } from "../../db/tenantMembershipRepository.ts";
import type { D1DatabaseBinding } from "../../db/d1";
import type {
  TenantId,
} from "../../shared/domain/model.ts";
import { readClerkIdentity } from "./clerkIdentity.ts";
import {
  resolveTenantSession,
  type TenantSession,
} from "./tenantSession.ts";

export async function requireCurrentTenantSession(
  database?: D1DatabaseBinding,
  selectedTenantId?: TenantId,
): Promise<TenantSession> {
  const identity = await readClerkIdentity();
  const sessionDatabase = database ?? await requireRuntimeDatabase();
  const memberships = createTenantMembershipRepository(sessionDatabase);

  return resolveTenantSession(
    identity,
    memberships,
    selectedTenantId,
  );
}
