import type {
  MessageTemplateDefinition,
  PersistedMessageTemplate,
} from "./messageTemplate.ts";
import type {
  CampaignStatus,
  ConsentStatus,
  MailingStatus,
} from "./model.ts";

export const campaignDeliveryModes = [
  "immediate",
  "scheduled",
] as const;

export const persistedCampaignStatuses = [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
  "failed",
] as const satisfies readonly CampaignStatus[];

export const campaignRecipientStatuses = [
  "pending",
  "queued",
  "sending",
  "accepted",
  "delivered",
  "read",
  "failed",
  "skipped",
  "cancelled",
] as const;

export type CampaignDeliveryMode =
  (typeof campaignDeliveryModes)[number];

export type CampaignRecipientStatus =
  (typeof campaignRecipientStatuses)[number];

export interface CampaignTemplateSnapshot
  extends MessageTemplateDefinition {
  templateKey: string;
  metaTemplateId: string;
  name: string;
  category: PersistedMessageTemplate["category"];
  language: PersistedMessageTemplate["language"];
  version: number;
}

export interface ValidatedCampaignDefinition {
  name: string;
  deliveryMode: CampaignDeliveryMode;
  scheduledAt: string | null;
  timezone: string;
  template: CampaignTemplateSnapshot;
  audienceSnapshotKey: string;
  recipientCount: number;
}

export interface CampaignRecipientIdentity {
  contactId: number;
  contactVersion: number;
  phoneNumber: string;
  mailingStatus: MailingStatus;
  consentStatus: ConsentStatus;
  personalizationKey: string;
}

export interface PersistedCampaign
  extends ValidatedCampaignDefinition {
  campaignKey: string;
  tenantId: number;
  status: CampaignStatus;
  version: number;
  activatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedCampaignRecipient {
  campaignKey: string;
  tenantId: number;
  contactId: number;
  contactVersion: number;
  phoneNumber: string;
  personalization: Readonly<Record<string, string>>;
  personalizationKey: string;
  deliveryKey: string;
  status: CampaignRecipientStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  queuedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
