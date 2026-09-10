import type {
  PersistedBusinessProfile,
} from "../../db/businessProfileRepository.ts";
import type {
  SystemAdminBusinessProfileView,
} from "../../shared/domain/systemAdminBusinessProfile.ts";

export function toSystemAdminBusinessProfileView(
  profile: PersistedBusinessProfile,
): SystemAdminBusinessProfileView {
  return {
    businessName: profile.businessName,
    timezone: profile.timezone,
    interfaceLanguage:
      profile.interfaceLanguage,
    version: profile.version,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
