import type {
  CampaignDeliveryMode,
} from "./campaign.ts";
import type {
  CampaignStatus,
} from "./model.ts";
import type {
  TemplateCategory,
  TemplateLanguage,
} from "./templateDraft.ts";

export type CampaignDirectoryStatus =
  | "ready"
  | "configuration-required"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "server-error";

export type CampaignDeliveryReadinessStatus =
  | "ready"
  | "configuration-required";

export interface CampaignView {
  campaignKey: string;
  name: string;
  status: CampaignStatus;
  deliveryMode: CampaignDeliveryMode;
  scheduledAt: string | null;
  timezone: string;
  templateName: string;
  templateLanguage: TemplateLanguage;
  recipientCount: number;
  version: number;
  activatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface CampaignActivationView {
  campaignKey: string;
  status: "scheduled";
  version: number;
  activatedAt: string;
  startedAt: string | null;
}

export interface CampaignTemplateOptionView {
  templateKey: string;
  name: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  personalizationKeys: readonly string[];
}

export interface CampaignAudienceGroupView {
  id: number;
  name: string;
  contactCount: number;
}

export interface CampaignAudienceOptionsView {
  lists: readonly CampaignAudienceGroupView[];
  tags: readonly CampaignAudienceGroupView[];
}
