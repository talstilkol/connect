import { requireRuntimeDatabase } from "../../db/runtimeDatabase.ts";
import { createTenantMembershipRepository } from "../../db/tenantMembershipRepository.ts";
import {
  createTenantSelectionRepository,
} from "../../db/tenantSelectionRepository.ts";
import type { D1DatabaseBinding } from "../../db/d1";
import type {
  TenantId,
} from "../../shared/domain/model.ts";
import { readClerkIdentity } from "./clerkIdentity.ts";
import {
  resolveTenantSessionFromMemberships,
  type TenantSession,
} from "./tenantSession.ts";

export async function requireCurrentTenantSession(
  database?: D1DatabaseBinding,
  selectedTenantId?: TenantId,
): Promise<TenantSession> {
  const identity = await readClerkIdentity();
  const sessionDatabase = database ?? await requireRuntimeDatabase();
  const memberships = createTenantMembershipRepository(sessionDatabase);

  if (!identity) {
    return resolveTenantSessionFromMemberships(
      identity,
      [],
    );
  }

  const activeMemberships =
    await memberships.findActiveByExternalUserId(
      identity.externalUserId,
    );
  let effectiveTenantId =
    selectedTenantId;

  if (
    effectiveTenantId === undefined &&
    activeMemberships.length > 1
  ) {
    const selections =
      createTenantSelectionRepository(
        sessionDatabase,
      );
    const storedSelection =
      await selections.findByExternalUserId(
        identity.externalUserId,
      );

    effectiveTenantId =
      storedSelection?.tenantId;
  }

  return resolveTenantSessionFromMemberships(
    identity,
    activeMemberships,
    effectiveTenantId,
  );
}
