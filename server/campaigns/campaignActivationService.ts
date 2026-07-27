import type {
  CampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
import type {
  CampaignDispatchState,
} from "../../shared/domain/campaignDelivery.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";

const CAMPAIGN_KEY_PATTERN =
  /^campaign_v1_[0-9a-f]{64}$/;

export type CampaignActivationErrorCode =
  | "INVALID_INPUT"
  | "TRANSITION_CONFLICT"
  | "PERSISTENCE_FAILED";

export class CampaignActivationError extends Error {
  readonly code: CampaignActivationErrorCode;

  constructor(code: CampaignActivationErrorCode) {
    super("Campaign activation failed");
    this.name = "CampaignActivationError";
    this.code = code;
  }
}

export interface CampaignActivationClock {
  now(): Date;
}

export interface ActivateCampaignRequest {
  campaignKey: string;
  expectedVersion: number;
}

export interface CampaignActivationService {
  activate(
    session: TenantSession,
    input: unknown,
  ): Promise<CampaignDispatchState>;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseRequest(
  input: unknown,
): ActivateCampaignRequest | null {
  if (
    !isRecord(input) ||
    Object.keys(input).length !== 2 ||
    typeof input.campaignKey !== "string" ||
    !CAMPAIGN_KEY_PATTERN.test(input.campaignKey) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    Number(input.expectedVersion) <= 0
  ) {
    return null;
  }

  return {
    campaignKey: input.campaignKey,
    expectedVersion: Number(
      input.expectedVersion,
    ),
  };
}

function currentTimestamp(
  clock: CampaignActivationClock,
): string {
  const current = clock.now();

  if (
    !(current instanceof Date) ||
    !Number.isFinite(current.getTime())
  ) {
    throw new CampaignActivationError(
      "PERSISTENCE_FAILED",
    );
  }

  return current.toISOString();
}

export function createCampaignActivationService(
  repository: CampaignDispatchRepository,
  clock: CampaignActivationClock,
): CampaignActivationService {
  return {
    async activate(session, input) {
      requireTenantPermission(
        session,
        "campaigns.write",
      );

      const request = parseRequest(input);

      if (!request) {
        throw new CampaignActivationError(
          "INVALID_INPUT",
        );
      }

      let activated;

      try {
        activated = await repository.activateCampaign(
          session.tenantId,
          request.campaignKey,
          request.expectedVersion,
          currentTimestamp(clock),
        );
      } catch (error) {
        if (error instanceof CampaignActivationError) {
          throw error;
        }

        throw new CampaignActivationError(
          "PERSISTENCE_FAILED",
        );
      }

      if (!activated) {
        throw new CampaignActivationError(
          "TRANSITION_CONFLICT",
        );
      }

      return activated;
    },
  };
}
