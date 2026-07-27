import type {
  PersistedCampaign,
} from "../../shared/domain/campaign.ts";
import type {
  CampaignActivationView,
  CampaignAudienceOptionsView,
  CampaignTemplateOptionView,
  CampaignView,
} from "../../shared/domain/campaignView.ts";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization.ts";
import type {
  PersistedMessageTemplate,
} from "../../shared/domain/messageTemplate.ts";
import {
  inspectTemplateVariables,
} from "../../shared/validation/templateVariables.ts";
import type {
  CampaignDispatchState,
} from "../../shared/domain/campaignDelivery.ts";

export function toCampaignView(
  campaign: PersistedCampaign,
): CampaignView {
  return {
    campaignKey: campaign.campaignKey,
    name: campaign.name,
    status: campaign.status,
    deliveryMode: campaign.deliveryMode,
    scheduledAt: campaign.scheduledAt,
    timezone: campaign.timezone,
    templateName: campaign.template.name,
    templateLanguage: campaign.template.language,
    recipientCount: campaign.recipientCount,
    version: campaign.version,
    activatedAt: campaign.activatedAt,
    startedAt: campaign.startedAt,
    completedAt: campaign.completedAt,
    updatedAt: campaign.updatedAt,
  };
}

export function toCampaignActivationView(
  state: CampaignDispatchState,
): CampaignActivationView {
  if (state.status !== "scheduled") {
    throw new Error(
      "Campaign activation returned an invalid state",
    );
  }

  return {
    campaignKey: state.campaignKey,
    status: state.status,
    version: state.version,
    activatedAt: state.activatedAt,
    startedAt: state.startedAt,
  };
}

export function toCampaignTemplateOptionView(
  template: PersistedMessageTemplate,
): CampaignTemplateOptionView | null {
  if (
    template.status !== "approved" ||
    template.metaTemplateId === null
  ) {
    return null;
  }

  const personalizationKeys =
    inspectTemplateVariables(
      template.body,
    ).numbers.map(
      (variableNumber) => `body:${variableNumber}`,
    );

  if (
    template.buttonMode === "call_to_action" &&
    template.urlButton.enabled &&
    template.urlButton.mode === "dynamic"
  ) {
    personalizationKeys.push("url:1");
  }

  return {
    templateKey: template.templateKey,
    name: template.name,
    category: template.category,
    language: template.language,
    personalizationKeys: personalizationKeys.sort(
      (first, second) =>
        first.localeCompare(second),
    ),
  };
}

export function toCampaignAudienceOptionsView(
  organization: ContactOrganizationSnapshot,
): CampaignAudienceOptionsView {
  return {
    lists: organization.lists.map((list) => ({
      id: list.id,
      name: list.name,
      contactCount: list.contactCount,
    })),
    tags: organization.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      contactCount: tag.contactCount,
    })),
  };
}
