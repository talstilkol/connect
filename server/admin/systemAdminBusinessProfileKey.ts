import type {
  BusinessProfileDraft,
} from "../../shared/domain/businessProfileDraft.ts";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  requireActorExternalUserId,
  requirePositiveTenantId,
  requirePositiveVersion,
} from "../billing/tenantSubscriptionValidation.ts";

const PROFILE_DIGEST_PATTERN =
  /^[0-9a-f]{64}$/;

export interface BusinessProfileAdminEventIdentity {
  expectedVersion: number;
  newProfileDigest: string;
  actorExternalUserId: string;
}

export async function deriveBusinessProfileDigest(
  profile: BusinessProfileDraft,
): Promise<string> {
  const validation =
    validatePersistedBusinessProfile(
      profile,
    );

  if (!validation.success) {
    throw new Error(
      "business profile digest input is invalid",
    );
  }

  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "business_profile_state_v1",
        businessName:
          validation.value.businessName,
        timezone:
          validation.value.timezone,
        interfaceLanguage:
          validation.value.interfaceLanguage,
      }),
    ),
  );
}

export async function deriveBusinessProfileAdminEventKey(
  tenantId: number,
  identity:
    BusinessProfileAdminEventIdentity,
): Promise<string> {
  requirePositiveTenantId(tenantId);
  requirePositiveVersion(
    identity.expectedVersion,
  );

  if (
    !PROFILE_DIGEST_PATTERN.test(
      identity.newProfileDigest,
    )
  ) {
    throw new Error(
      "business profile digest is invalid",
    );
  }

  const actorExternalUserId =
    requireActorExternalUserId(
      identity.actorExternalUserId,
    );
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "business_profile_admin_event_v1",
        tenantId,
        expectedVersion:
          identity.expectedVersion,
        newProfileDigest:
          identity.newProfileDigest,
        actorExternalUserId,
      }),
    ),
  );

  return `business_profile_admin_event_v1_${digest}`;
}
