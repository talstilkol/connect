import type {
  CampaignActivationView,
  CampaignView,
} from "../../shared/domain/campaignView.ts";
import type { TenantSession } from "../auth/tenantSession.ts";
import type {
  ParsedActivateCampaignRequest,
} from "../campaigns/campaignActivationService.ts";
import {
  parseRailwayCampaignActivationView,
  parseRailwayCampaignView,
} from "../campaigns/railwayCampaignResult.ts";
import type {
  ParsedCampaignSnapshotRequest,
} from "../campaigns/campaignSnapshotService.ts";

export const RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION =
  "campaigns.snapshot.save" as const;
export const RAILWAY_CAMPAIGN_ACTIVATE_OPERATION =
  "campaigns.activate" as const;

export const railwayCampaignMutationOperations = Object.freeze([
  RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION,
  RAILWAY_CAMPAIGN_ACTIVATE_OPERATION,
] as const);

export type RailwayCampaignMutationOperation =
  typeof railwayCampaignMutationOperations[number];

export type RailwayCampaignMutationPayload =
  | Readonly<ParsedCampaignSnapshotRequest>
  | Readonly<ParsedActivateCampaignRequest>;

export type RailwayCampaignSnapshotState = Readonly<{
  outcome: "saved";
  campaign: Readonly<CampaignView>;
}>;

export type RailwayCampaignActivationState = Readonly<{
  outcome: "activated";
  campaign: Readonly<CampaignActivationView>;
}>;

export type RailwayCampaignMutationState =
  | RailwayCampaignSnapshotState
  | RailwayCampaignActivationState;

export interface RailwayCampaignMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: RailwayCampaignMutationOperation;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: RailwayCampaignMutationPayload;
}

export type RailwayCampaignMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      state: RailwayCampaignMutationState;
    }>
  | Readonly<{
      outcome:
        | "conflict"
        | "profile-required"
        | "template-unavailable"
        | "audience-invalid"
        | "state-conflict"
        | "delivery-configuration-required"
        | "unavailable";
      tenantId: null;
      state: null;
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

export function parseRailwayCampaignMutationState(
  operation: RailwayCampaignMutationOperation,
  payload: Readonly<RailwayCampaignMutationPayload>,
  value: unknown,
): RailwayCampaignMutationState | null {
  if (!isRecord(value)) {
    return null;
  }

  if (operation === RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION) {
    if (
      !hasExactKeys(value, ["campaign", "outcome"]) ||
      value.outcome !== "saved" ||
      !("name" in payload)
    ) {
      return null;
    }
    const campaign = parseRailwayCampaignView(value.campaign);
    if (
      campaign === null ||
      campaign.name !== payload.name.trim() ||
      campaign.deliveryMode !== payload.deliveryMode ||
      campaign.scheduledAt !== payload.scheduledAt ||
      campaign.status !== "draft" ||
      campaign.version !== 1
    ) {
      return null;
    }
    return Object.freeze({ outcome: "saved" as const, campaign });
  }

  if (
    operation !== RAILWAY_CAMPAIGN_ACTIVATE_OPERATION ||
    !hasExactKeys(value, ["campaign", "outcome"]) ||
    value.outcome !== "activated" ||
    !("campaignKey" in payload)
  ) {
    return null;
  }
  const campaign = parseRailwayCampaignActivationView(value.campaign);
  if (
    campaign === null ||
    campaign.campaignKey !== payload.campaignKey ||
    campaign.version !== payload.expectedVersion + 1
  ) {
    return null;
  }
  return Object.freeze({ outcome: "activated" as const, campaign });
}

/**
 * Claims one deterministic request, changes one tenant campaign and stores
 * bounded replay plus immutable audit evidence in the same transaction.
 */
export interface RailwayCampaignMutationExecutor {
  execute(
    command: Readonly<RailwayCampaignMutationCommand>,
  ): Promise<RailwayCampaignMutationResult>;
}
