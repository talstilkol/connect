import type {
  CampaignRecipientIdentity,
} from "../domain/campaign.ts";

export type CampaignRecipientIneligibilityReason =
  | "invalid-contact"
  | "invalid-phone"
  | "mailing-unsubscribed"
  | "consent-not-granted"
  | "invalid-personalization-key";

export type CampaignRecipientEligibility =
  | {
      eligible: true;
    }
  | {
      eligible: false;
      reason: CampaignRecipientIneligibilityReason;
    };

export function inspectCampaignRecipientEligibility(
  recipient: CampaignRecipientIdentity,
): CampaignRecipientEligibility {
  if (
    !Number.isSafeInteger(recipient.contactId) ||
    recipient.contactId <= 0 ||
    !Number.isSafeInteger(recipient.contactVersion) ||
    recipient.contactVersion <= 0
  ) {
    return {
      eligible: false,
      reason: "invalid-contact",
    };
  }

  if (!/^\+[1-9][0-9]{0,14}$/.test(recipient.phoneNumber)) {
    return {
      eligible: false,
      reason: "invalid-phone",
    };
  }

  if (recipient.mailingStatus !== "subscribed") {
    return {
      eligible: false,
      reason: "mailing-unsubscribed",
    };
  }

  if (recipient.consentStatus !== "granted") {
    return {
      eligible: false,
      reason: "consent-not-granted",
    };
  }

  if (
    !/^[0-9a-f]{64}$/.test(
      recipient.personalizationKey,
    )
  ) {
    return {
      eligible: false,
      reason: "invalid-personalization-key",
    };
  }

  return { eligible: true };
}
