import type { CampaignView } from "./campaignView.ts";

export const campaignControlActions = ["pause", "resume", "cancel"] as const;
export type CampaignControlAction = typeof campaignControlActions[number];
export interface CampaignControlRequest {
  campaignKey: string;
  expectedVersion: number;
  action: CampaignControlAction;
}

export function parseCampaignControlRequest(value: unknown): Readonly<CampaignControlRequest> | null {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "action,campaignKey,expectedVersion") return null;
  const request = value as CampaignControlRequest;
  if (typeof request.campaignKey !== "string" || !/^campaign_v1_[0-9a-f]{64}$/.test(request.campaignKey) ||
      !Number.isSafeInteger(request.expectedVersion) || request.expectedVersion < 1 ||
      request.expectedVersion >= Number.MAX_SAFE_INTEGER ||
      !campaignControlActions.some((action) => action === request.action)) return null;
  return Object.freeze({ campaignKey: request.campaignKey, expectedVersion: request.expectedVersion, action: request.action });
}

export function canControlCampaign(status: CampaignView["status"], action: CampaignControlAction): boolean {
  if (action === "pause") return status === "scheduled" || status === "running";
  if (action === "resume") return status === "paused";
  return status === "draft" || status === "scheduled" || status === "running" || status === "paused";
}
