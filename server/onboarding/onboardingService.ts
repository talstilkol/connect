import type {
  BusinessProfileRepository,
  PersistedBusinessProfile,
} from "../../db/businessProfileRepository";
import type {
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository";
import type {
  TenantProvisioningRepository,
} from "../../db/tenantProvisioningRepository";
import type {
  BusinessProfileValidationIssue,
} from "../../shared/validation/persistedBusinessProfile";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import {
  resolveTenantSessionFromMemberships,
  type AuthenticatedIdentity,
} from "../auth/tenantSession.ts";
import type {
  BusinessProfileService,
} from "./businessProfileService";
import { deriveTenantProvisioningKey } from "./tenantProvisioningKey.ts";

export class BusinessProfileInputError extends Error {
  readonly issues: readonly BusinessProfileValidationIssue[];

  constructor(issues: readonly BusinessProfileValidationIssue[]) {
    super("Business profile validation failed");
    this.name = "BusinessProfileInputError";
    this.issues = issues;
  }
}

export interface SaveOnboardingResult {
  createdTenant: boolean;
  profile: PersistedBusinessProfile;
}

export interface OnboardingService {
  saveBusinessProfile(
    identity: AuthenticatedIdentity,
    input: unknown,
  ): Promise<SaveOnboardingResult>;
}

export interface OnboardingServiceDependencies {
  memberships: TenantMembershipRepository;
  provisioning: TenantProvisioningRepository;
  businessProfiles: BusinessProfileRepository;
  profileService: BusinessProfileService;
}

export function createOnboardingService(
  dependencies: OnboardingServiceDependencies,
): OnboardingService {
  return {
    async saveBusinessProfile(identity, input) {
      const validation = validatePersistedBusinessProfile(input);

      if (!validation.success) {
        throw new BusinessProfileInputError(validation.issues);
      }

      const memberships =
        await dependencies.memberships.findActiveByExternalUserId(
          identity.externalUserId,
        );

      if (memberships.length === 0) {
        const provisioningKey = await deriveTenantProvisioningKey(
          identity.externalUserId,
        );
        const provisionedWorkspace =
          await dependencies.provisioning.provisionOwnerWorkspace({
            provisioningKey,
            externalUserId: identity.externalUserId,
            ...validation.value,
          });

        return {
          createdTenant: true,
          profile: {
            tenantId: provisionedWorkspace.tenantId,
            businessName: provisionedWorkspace.businessName,
            timezone: provisionedWorkspace.timezone,
            interfaceLanguage:
              provisionedWorkspace.interfaceLanguage,
            version: provisionedWorkspace.profileVersion,
            createdAt: provisionedWorkspace.profileCreatedAt,
            updatedAt: provisionedWorkspace.profileUpdatedAt,
          },
        };
      }

      const session = resolveTenantSessionFromMemberships(
        identity,
        memberships,
      );
      await dependencies.profileService.save(session, validation.value);

      const profile = await dependencies.businessProfiles.findByTenantId(
        session.tenantId,
      );

      if (!profile) {
        throw new Error("Saved business profile could not be reloaded");
      }

      return {
        createdTenant: false,
        profile,
      };
    },
  };
}
