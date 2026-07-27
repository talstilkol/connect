import type {
  CampaignActivationView,
  CampaignView,
} from "../../shared/domain/campaignView.ts";

export type CampaignActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | { status: "server-error" };

export type SaveCampaignSnapshotActionResult =
  | {
      status: "saved";
      campaign: CampaignView;
    }
  | { status: "invalid-input" }
  | { status: "profile-required" }
  | { status: "template-unavailable" }
  | { status: "audience-invalid" }
  | CampaignActionFailure;

export type ActivateCampaignActionResult =
  | {
      status: "activated";
      campaign: CampaignActivationView;
    }
  | { status: "invalid-input" }
  | { status: "state-conflict" }
  | { status: "delivery-configuration-required" }
  | CampaignActionFailure;
