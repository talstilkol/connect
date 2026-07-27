export type {
  CampaignDeliveryMode,
} from "./campaign.ts";

import type {
  CampaignDeliveryMode,
} from "./campaign.ts";

export type CampaignVariableColumnMapping = Record<number, number | null>;

export interface CampaignDraft {
  name: string;
  deliveryMode: CampaignDeliveryMode;
  scheduledAt: string;
  selectedContactIndex: number;
  variableColumnMapping: CampaignVariableColumnMapping;
  dynamicUrlColumnIndex: number | null;
}
