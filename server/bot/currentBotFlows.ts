import {
  createBotFlowRepository,
} from "../../db/botFlowRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  BotFlowDirectoryStatus,
  BotFlowDirectoryView,
} from "../../shared/domain/botFlowView.ts";
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
  createBotFlowService,
} from "./botFlowService.ts";
import {
  toBotFlowDetailsView,
  toBotFlowSummaryView,
} from "./botFlowView.ts";

export type CurrentBotFlowsResult =
  | {
      status: "ready";
      botFlows: BotFlowDirectoryView;
    }
  | {
      status: Exclude<
        BotFlowDirectoryStatus,
        "ready"
      >;
      botFlows: {
        flows: readonly [];
        selectedFlow: null;
        canWrite: false;
      };
    };

const emptyBotFlows = {
  flows: [] as const,
  selectedFlow: null,
  canWrite: false as const,
};

function tenantFailureStatus(
  error: TenantSessionError,
): Exclude<BotFlowDirectoryStatus, "ready"> {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return "unauthenticated";
  }

  if (
    error.code ===
    "TENANT_MEMBERSHIP_REQUIRED"
  ) {
    return "onboarding-required";
  }

  if (
    error.code ===
    "TENANT_SELECTION_REQUIRED"
  ) {
    return "tenant-selection-required";
  }

  if (error.code === "PERMISSION_DENIED") {
    return "permission-denied";
  }

  return "server-error";
}

export async function readCurrentBotFlows():
Promise<CurrentBotFlowsResult> {
  if (
    inspectClerkConfiguration().status !==
    "configured"
  ) {
    return {
      status: "configuration-required",
      botFlows: emptyBotFlows,
    };
  }

  try {
    const database =
      await requireRuntimeDatabase();
    const session =
      await requireCurrentTenantSession(database);
    const service = createBotFlowService(
      createBotFlowRepository(database),
    );
    const flows = await service.list(session);
    const firstFlow = flows[0] ?? null;
    const selectedFlow = firstFlow
      ? await service.readDetails(
          session,
          firstFlow.botFlowKey,
        )
      : null;

    return {
      status: "ready",
      botFlows: {
        flows: flows.map(
          toBotFlowSummaryView,
        ),
        selectedFlow: selectedFlow
          ? toBotFlowDetailsView(selectedFlow)
          : null,
        canWrite: hasPermission(
          session.role,
          "bot.write",
        ),
      },
    };
  } catch (error) {
    return {
      status:
        error instanceof TenantSessionError
          ? tenantFailureStatus(error)
          : "server-error",
      botFlows: emptyBotFlows,
    };
  }
}
