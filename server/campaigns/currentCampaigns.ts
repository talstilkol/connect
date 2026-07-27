import {
  createBusinessProfileRepository,
} from "../../db/businessProfileRepository.ts";
import {
  createCampaignAudienceRepository,
} from "../../db/campaignAudienceRepository.ts";
import {
  createCampaignRepository,
} from "../../db/campaignRepository.ts";
import {
  createContactOrganizationRepository,
} from "../../db/contactOrganizationRepository.ts";
import {
  createMessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  CampaignAudienceOptionsView,
  CampaignDeliveryReadinessStatus,
  CampaignDirectoryStatus,
  CampaignTemplateOptionView,
  CampaignView,
} from "../../shared/domain/campaignView.ts";
import {
  hasPermission,
} from "../../shared/domain/model.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantSession,
} from "../auth/currentTenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import {
  createContactOrganizationService,
} from "../contacts/contactOrganizationService.ts";
import {
  createMessageTemplateService,
} from "../templates/messageTemplateService.ts";
import {
  inspectCampaignDeliveryReadiness,
} from "./campaignDeliveryReadiness.ts";
import {
  createCampaignSnapshotService,
} from "./campaignSnapshotService.ts";
import {
  toCampaignAudienceOptionsView,
  toCampaignTemplateOptionView,
  toCampaignView,
} from "./campaignView.ts";

export type CurrentCampaignsResult =
  | {
      status: "ready";
      campaigns: readonly CampaignView[];
      templates:
        readonly CampaignTemplateOptionView[];
      audiences: CampaignAudienceOptionsView;
      canWrite: boolean;
      deliveryStatus:
        CampaignDeliveryReadinessStatus;
    }
  | {
      status: Exclude<
        CampaignDirectoryStatus,
        "ready"
      >;
      campaigns: readonly [];
      templates: readonly [];
      audiences: {
        lists: readonly [];
        tags: readonly [];
      };
      canWrite: false;
      deliveryStatus:
        "configuration-required";
    };

const emptyResult = {
  campaigns: [] as const,
  templates: [] as const,
  audiences: {
    lists: [] as const,
    tags: [] as const,
  },
  canWrite: false as const,
  deliveryStatus:
    "configuration-required" as const,
};

function tenantFailureStatus(
  error: TenantSessionError,
): Exclude<CampaignDirectoryStatus, "ready"> {
  if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
    return "onboarding-required";
  }

  if (error.code === "TENANT_SELECTION_REQUIRED") {
    return "tenant-selection-required";
  }

  if (error.code === "PERMISSION_DENIED") {
    return "permission-denied";
  }

  return "server-error";
}

export async function readCurrentCampaigns():
Promise<CurrentCampaignsResult> {
  if (
    inspectClerkConfiguration().status !==
    "configured"
  ) {
    return {
      status: "configuration-required",
      ...emptyResult,
    };
  }

  try {
    const database =
      await requireRuntimeDatabase();
    const session =
      await requireCurrentTenantSession(database);
    const campaignService =
      createCampaignSnapshotService({
        audiences:
          createCampaignAudienceRepository(database),
        campaigns:
          createCampaignRepository(database),
        templates:
          createMessageTemplateRepository(database),
        businessProfiles:
          createBusinessProfileRepository(database),
      });
    const templateService =
      createMessageTemplateService(
        createMessageTemplateRepository(database),
      );
    const organizationService =
      createContactOrganizationService(
        createContactOrganizationRepository(
          database,
        ),
      );
    const [campaigns, templates, organization] =
      await Promise.all([
        campaignService.list(session),
        templateService.list(session),
        organizationService.read(session, []),
      ]);
    const templateOptions = templates
      .map(toCampaignTemplateOptionView)
      .filter(
        (
          template,
        ): template is CampaignTemplateOptionView =>
          template !== null,
      );

    return {
      status: "ready",
      campaigns: campaigns.map(toCampaignView),
      templates: templateOptions,
      audiences:
        toCampaignAudienceOptionsView(
          organization,
        ),
      canWrite: hasPermission(
        session.role,
        "campaigns.write",
      ),
      deliveryStatus:
        inspectCampaignDeliveryReadiness().status,
    };
  } catch (error) {
    return {
      status:
        error instanceof TenantSessionError
          ? tenantFailureStatus(error)
          : "server-error",
      ...emptyResult,
    };
  }
}
