import {
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";
import type {
  LoadOperationalReportActionResult,
  OperationalReportActionFailure,
} from "./operationalReportActionResult.ts";
import {
  OperationalReportInputError,
  type OperationalReportService,
} from "./operationalReportService.ts";
import {
  toOperationalReportView,
} from "./operationalReportView.ts";

interface OperationalReportActionContext {
  session: TenantSession;
  service: OperationalReportService;
}

export interface OperationalReportActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<OperationalReportActionContext>;
}

export interface OperationalReportActionHandler {
  load(
    input: unknown,
  ): Promise<LoadOperationalReportActionResult>;
}

function mapTenantSessionError(
  error: TenantSessionError,
): OperationalReportActionFailure {
  if (
    error.code ===
    "AUTHENTICATION_REQUIRED"
  ) {
    return { status: "unauthenticated" };
  }

  if (
    error.code ===
    "TENANT_MEMBERSHIP_REQUIRED"
  ) {
    return {
      status: "onboarding-required",
    };
  }

  if (
    error.code ===
    "TENANT_SELECTION_REQUIRED"
  ) {
    return {
      status: "tenant-selection-required",
    };
  }

  return { status: "permission-denied" };
}

export function createOperationalReportActionHandler(
  dependencies:
    OperationalReportActionHandlerDependencies,
): OperationalReportActionHandler {
  return {
    async load(input) {
      if (
        !dependencies.applicationConfigured()
      ) {
        return {
          status:
            "configuration-required",
        };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const report = await service.read(
          session,
          input,
        );

        return {
          status: "loaded",
          report:
            toOperationalReportView(report),
        };
      } catch (error) {
        if (
          error instanceof TenantSessionError
        ) {
          return mapTenantSessionError(error);
        }

        if (
          error instanceof
          OperationalReportInputError
        ) {
          return { status: "invalid-input" };
        }

        return { status: "server-error" };
      }
    },
  };
}
