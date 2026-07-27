import {
  createOperationalReportRepository,
} from "../../db/operationalReportRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  OperationalReportStatus,
  OperationalReportView,
} from "../../shared/domain/operationalReportView.ts";
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
  createOperationalReportService,
} from "./operationalReportService.ts";
import {
  toOperationalReportView,
} from "./operationalReportView.ts";

export type CurrentOperationalReportResult =
  | {
      status: "ready";
      report: OperationalReportView;
    }
  | {
      status: Exclude<
        OperationalReportStatus,
        "ready"
      >;
      report: null;
    };

function tenantFailureStatus(
  error: TenantSessionError,
): Exclude<
  OperationalReportStatus,
  "ready"
> {
  if (
    error.code ===
    "AUTHENTICATION_REQUIRED"
  ) {
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

  if (
    error.code === "PERMISSION_DENIED"
  ) {
    return "permission-denied";
  }

  return "server-error";
}

export async function readCurrentOperationalReport():
Promise<CurrentOperationalReportResult> {
  if (
    inspectClerkConfiguration().status !==
    "configured"
  ) {
    return {
      status: "configuration-required",
      report: null,
    };
  }

  try {
    const database =
      await requireRuntimeDatabase();
    const session =
      await requireCurrentTenantSession(
        database,
      );
    const service =
      createOperationalReportService(
        createOperationalReportRepository(
          database,
        ),
      );
    const report = await service.read(
      session,
      service.defaultPeriod(),
    );

    return {
      status: "ready",
      report: toOperationalReportView(
        report,
      ),
    };
  } catch (error) {
    return {
      status:
        error instanceof TenantSessionError
          ? tenantFailureStatus(error)
          : "server-error",
      report: null,
    };
  }
}
