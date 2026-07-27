import { createBusinessProfileRepository } from "../../db/businessProfileRepository";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase";
import type { BusinessProfileDraft } from "../../shared/domain/businessProfileDraft";
import {
  requireCurrentTenantSession,
} from "../auth/currentTenantSession";
import {
  TenantSessionError,
} from "../auth/tenantSession";
import { hasClerkServerConfiguration } from "../auth/clerkConfiguration";

export async function readCurrentBusinessProfile(): Promise<BusinessProfileDraft | null> {
  if (!hasClerkServerConfiguration()) {
    return null;
  }

  const database = await requireRuntimeDatabase();
  let session;

  try {
    session =
      await requireCurrentTenantSession(
        database,
      );
  } catch (error) {
    if (
      error instanceof
        TenantSessionError &&
      (error.code ===
        "AUTHENTICATION_REQUIRED" ||
        error.code ===
          "TENANT_MEMBERSHIP_REQUIRED")
    ) {
      return null;
    }

    throw error;
  }

  const profiles = createBusinessProfileRepository(database);
  const profile = await profiles.findByTenantId(
    session.tenantId,
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
