import type {
  ConsentStatus,
  MailingStatus,
} from "./model.ts";

export const campaignAudienceSourceKinds = [
  "all",
  "list",
  "tag",
] as const;

export type CampaignAudienceSource =
  | {
      kind: "all";
    }
  | {
      kind: "list";
      listId: number;
    }
  | {
      kind: "tag";
      tagId: number;
    };

export const campaignPersonalizationFields = [
  "firstName",
  "lastName",
  "email",
  "company",
  "phoneNumber",
] as const;

export type CampaignPersonalizationField =
  (typeof campaignPersonalizationFields)[number];

export type CampaignPersonalizationMapping = Readonly<
  Record<string, CampaignPersonalizationField>
>;

export interface CampaignAudienceContact {
  contactId: number;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  mailingStatus: MailingStatus;
  consentStatus: ConsentStatus;
  version: number;
}
