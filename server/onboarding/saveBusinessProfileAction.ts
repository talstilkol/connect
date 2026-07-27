"use server";

import { createBusinessProfileRepository } from "../../db/businessProfileRepository";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase";
import { createTenantMembershipRepository } from "../../db/tenantMembershipRepository";
import { createTenantProvisioningRepository } from "../../db/tenantProvisioningRepository";
import type { BusinessProfileDraft } from "../../shared/domain/businessProfileDraft";
import type {
  BusinessProfileValidationIssue,
} from "../../shared/validation/persistedBusinessProfile";
import { inspectClerkConfiguration } from "../auth/clerkConfiguration";
import { readClerkIdentity } from "../auth/clerkIdentity";
import { TenantSessionError } from "../auth/tenantSession";
import {
  enforceCurrentTenantMutationRateLimit,
} from "../security/tenantMutationRateLimit";
import { createBusinessProfileService } from "./businessProfileService";
import {
  BusinessProfileInputError,
  createOnboardingService,
} from "./onboardingService";

export type SaveBusinessProfileActionResult =
  | {
      status: "saved";
      profile: BusinessProfileDraft & {
        version: number;
      };
      createdTenant: boolean;
    }
  | {
      status: "configuration-required";
    }
  | {
      status: "unauthenticated";
    }
  | {
      status: "validation-error";
      issues: readonly BusinessProfileValidationIssue[];
    }
  | {
      status: "tenant-selection-required";
    }
  | {
      status: "permission-denied";
    }
  | {
      status: "server-error";
    };

export async function saveBusinessProfileAction(
  input: unknown,
): Promise<SaveBusinessProfileActionResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  const identity = await readClerkIdentity();

  if (!identity) {
    return { status: "unauthenticated" };
  }

  try {
    await enforceCurrentTenantMutationRateLimit(
      identity.externalUserId,
    );
    const database = await requireRuntimeDatabase();
    const memberships = createTenantMembershipRepository(database);
    const businessProfiles = createBusinessProfileRepository(database);
    const provisioning = createTenantProvisioningRepository(database);
    const profileService =
      createBusinessProfileService(businessProfiles);
    const onboarding = createOnboardingService({
      memberships,
      provisioning,
      businessProfiles,
      profileService,
    });
    const result = await onboarding.saveBusinessProfile(identity, input);

    return {
      status: "saved",
      createdTenant: result.createdTenant,
      profile: {
        businessName: result.profile.businessName,
        timezone: result.profile.timezone,
        interfaceLanguage: result.profile.interfaceLanguage,
        version: result.profile.version,
      },
    };
  } catch (error) {
    if (error instanceof BusinessProfileInputError) {
      return {
        status: "validation-error",
        issues: error.issues,
      };
    }

    if (error instanceof TenantSessionError) {
      if (error.code === "TENANT_SELECTION_REQUIRED") {
        return { status: "tenant-selection-required" };
      }

      if (error.code === "PERMISSION_DENIED") {
        return { status: "permission-denied" };
      }
    }

    return { status: "server-error" };
  }
}
