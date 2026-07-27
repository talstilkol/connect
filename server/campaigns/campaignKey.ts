import type {
  CampaignRecipientIdentity,
} from "../../shared/domain/campaign.ts";
import {
  inspectCampaignRecipientEligibility,
} from "../../shared/validation/campaignRecipientEligibility.ts";
import {
  validateCampaignPersonalization,
  type CampaignPersonalization,
} from "../../shared/validation/campaignPersonalization.ts";
import {
  validateCampaignDefinition,
} from "../../shared/validation/campaignDefinition.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

const CAMPAIGN_KEY_PATTERN =
  /^campaign_v1_[0-9a-f]{64}$/;
const MAXIMUM_RECIPIENTS = 100_000;

function requireTenantId(tenantId: number): number {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new Error(
      "tenantId must be a positive integer",
    );
  }

  return tenantId;
}

export async function deriveCampaignAudienceKey(
  tenantId: number,
  recipients: readonly CampaignRecipientIdentity[],
): Promise<string> {
  requireTenantId(tenantId);

  if (
    recipients.length === 0 ||
    recipients.length > MAXIMUM_RECIPIENTS
  ) {
    throw new Error(
      "campaign audience size is invalid",
    );
  }

  const contactIds = new Set<number>();
  const normalizedRecipients = recipients.map(
    (recipient) => {
      const eligibility =
        inspectCampaignRecipientEligibility(recipient);

      if (!eligibility.eligible) {
        throw new Error(
          `campaign recipient is ineligible: ${eligibility.reason}`,
        );
      }

      if (contactIds.has(recipient.contactId)) {
        throw new Error(
          "campaign audience contains a duplicate contact",
        );
      }

      contactIds.add(recipient.contactId);

      return {
        contactId: recipient.contactId,
        contactVersion: recipient.contactVersion,
        phoneNumber: recipient.phoneNumber,
        personalizationKey:
          recipient.personalizationKey,
      };
    },
  );

  normalizedRecipients.sort(
    (first, second) =>
      first.contactId - second.contactId,
  );

  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace: "campaign_audience_v1",
        tenantId,
        recipients: normalizedRecipients,
      }),
    ),
  );
}

export async function deriveCampaignPersonalizationKey(
  tenantId: number,
  templateKey: string,
  personalization: unknown,
): Promise<{
  personalization: CampaignPersonalization;
  personalizationKey: string;
}> {
  requireTenantId(tenantId);

  if (!/^template_v1_[0-9a-f]{64}$/.test(templateKey)) {
    throw new Error("templateKey is invalid");
  }

  const validation =
    validateCampaignPersonalization(personalization);

  if (!validation.success) {
    throw new Error(
      "campaign personalization is invalid",
    );
  }

  const personalizationKey = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace: "campaign_personalization_v1",
        tenantId,
        templateKey,
        values: validation.value,
      }),
    ),
  );

  return {
    personalization: validation.value,
    personalizationKey,
  };
}

export async function deriveCampaignKey(
  tenantId: number,
  definition: unknown,
): Promise<string> {
  requireTenantId(tenantId);

  const validation =
    validateCampaignDefinition(definition);

  if (!validation.success) {
    throw new Error("campaign definition is invalid");
  }

  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace: "campaign_v1",
        tenantId,
        definition: validation.value,
      }),
    ),
  );

  return `campaign_v1_${digest}`;
}

export async function deriveCampaignDeliveryKey(
  tenantId: number,
  campaignKey: string,
  recipient: Pick<
    CampaignRecipientIdentity,
    "contactId" | "contactVersion" | "personalizationKey"
  >,
): Promise<string> {
  requireTenantId(tenantId);

  if (
    !CAMPAIGN_KEY_PATTERN.test(campaignKey) ||
    !Number.isSafeInteger(recipient.contactId) ||
    recipient.contactId <= 0 ||
    !Number.isSafeInteger(recipient.contactVersion) ||
    recipient.contactVersion <= 0 ||
    !/^[0-9a-f]{64}$/.test(
      recipient.personalizationKey,
    )
  ) {
    throw new Error(
      "campaign delivery identity is invalid",
    );
  }

  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace: "campaign_delivery_v1",
        tenantId,
        campaignKey,
        contactId: recipient.contactId,
        contactVersion: recipient.contactVersion,
        personalizationKey:
          recipient.personalizationKey,
      }),
    ),
  );

  return `campaign_delivery_v1_${digest}`;
}
