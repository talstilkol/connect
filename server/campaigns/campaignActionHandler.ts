import {
  CampaignActivationError,
  type CampaignActivationService,
} from "./campaignActivationService.ts";
import type {
  ActivateCampaignActionResult,
  SaveCampaignSnapshotActionResult,
} from "./campaignActionResult.ts";
import {
  CampaignSnapshotError,
  type CampaignSnapshotService,
} from "./campaignSnapshotService.ts";
import {
  toCampaignActivationView,
  toCampaignView,
} from "./campaignView.ts";
import {
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";

interface CampaignSnapshotActionContext {
  session: TenantSession;
  service: CampaignSnapshotService;
}

interface CampaignActivationActionContext {
  session: TenantSession;
  service: CampaignActivationService;
}

export interface CampaignActionHandlerDependencies {
  applicationConfigured(): boolean;
  deliveryConfigured(): boolean;
  createSnapshotContext():
    Promise<CampaignSnapshotActionContext>;
  createActivationContext():
    Promise<CampaignActivationActionContext>;
}

export interface CampaignActionHandler {
  saveSnapshot(
    input: unknown,
  ): Promise<SaveCampaignSnapshotActionResult>;
  activate(
    input: unknown,
  ): Promise<ActivateCampaignActionResult>;
}

function mapTenantSessionError(
  error: TenantSessionError,
) {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return { status: "unauthenticated" as const };
  }

  if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
    return { status: "onboarding-required" as const };
  }

  if (error.code === "TENANT_SELECTION_REQUIRED") {
    return {
      status: "tenant-selection-required" as const,
    };
  }

  return { status: "permission-denied" as const };
}

function mapSnapshotError(
  error: CampaignSnapshotError,
): SaveCampaignSnapshotActionResult {
  const statuses: Record<
    CampaignSnapshotError["code"],
    SaveCampaignSnapshotActionResult["status"]
  > = {
    INVALID_INPUT: "invalid-input",
    PROFILE_REQUIRED: "profile-required",
    TEMPLATE_NOT_FOUND: "template-unavailable",
    TEMPLATE_NOT_APPROVED: "template-unavailable",
    INVALID_AUDIENCE: "audience-invalid",
    PERSISTENCE_FAILED: "server-error",
  };

  return {
    status: statuses[error.code],
  } as SaveCampaignSnapshotActionResult;
}

function mapActivationError(
  error: CampaignActivationError,
): ActivateCampaignActionResult {
  const statuses: Record<
    CampaignActivationError["code"],
    ActivateCampaignActionResult["status"]
  > = {
    INVALID_INPUT: "invalid-input",
    TRANSITION_CONFLICT: "state-conflict",
    PERSISTENCE_FAILED: "server-error",
  };

  return {
    status: statuses[error.code],
  } as ActivateCampaignActionResult;
}

export function createCampaignActionHandler(
  dependencies: CampaignActionHandlerDependencies,
): CampaignActionHandler {
  return {
    async saveSnapshot(input) {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      try {
        const { session, service } =
          await dependencies.createSnapshotContext();
        const campaign = await service.save(
          session,
          input,
        );

        return {
          status: "saved",
          campaign: toCampaignView(campaign),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof CampaignSnapshotError) {
          return mapSnapshotError(error);
        }

        return { status: "server-error" };
      }
    },

    async activate(input) {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      if (!dependencies.deliveryConfigured()) {
        return {
          status: "delivery-configuration-required",
        };
      }

      try {
        const { session, service } =
          await dependencies.createActivationContext();
        const campaign = await service.activate(
          session,
          input,
        );

        return {
          status: "activated",
          campaign:
            toCampaignActivationView(campaign),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof CampaignActivationError) {
          return mapActivationError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}
