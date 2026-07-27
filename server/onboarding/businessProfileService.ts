import type { BusinessProfileRepository } from "../../db/businessProfileRepository";
import type { BusinessProfileDraft } from "../../shared/domain/businessProfileDraft";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";

export interface BusinessProfileService {
  save(
    session: TenantSession,
    draft: BusinessProfileDraft,
  ): Promise<void>;
}

export function createBusinessProfileService(
  repository: BusinessProfileRepository,
): BusinessProfileService {
  return {
    async save(session, draft) {
      requireTenantPermission(session, "workspace.manage");

      await repository.save({
        tenantId: session.tenantId,
        businessName: draft.businessName,
        timezone: draft.timezone,
        interfaceLanguage: draft.interfaceLanguage,
      });
    },
  };
}
