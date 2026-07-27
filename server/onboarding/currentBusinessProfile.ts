import { createBusinessProfileRepository } from "../../db/businessProfileRepository";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase";
import { createTenantMembershipRepository } from "../../db/tenantMembershipRepository";
import type { BusinessProfileDraft } from "../../shared/domain/businessProfileDraft";
import { hasClerkServerConfiguration } from "../auth/clerkConfiguration";
import { readClerkIdentity } from "../auth/clerkIdentity";

export async function readCurrentBusinessProfile(): Promise<BusinessProfileDraft | null> {
  if (!hasClerkServerConfiguration()) {
    return null;
  }

  const identity = await readClerkIdentity();

  if (!identity) {
    return null;
  }

  const database = await requireRuntimeDatabase();
  const memberships = createTenantMembershipRepository(database);
  const activeMemberships =
    await memberships.findActiveByExternalUserId(identity.externalUserId);

  if (activeMemberships.length !== 1) {
    return null;
  }

  const profiles = createBusinessProfileRepository(database);
  const profile = await profiles.findByTenantId(
    activeMemberships[0].tenantId,
  );

  if (!profile) {
    return null;
  }

  return {
    businessName: profile.businessName,
    timezone: profile.timezone,
    interfaceLanguage: profile.interfaceLanguage,
  };
}
