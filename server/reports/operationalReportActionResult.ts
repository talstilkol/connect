import type {
  OperationalReportView,
} from "../../shared/domain/operationalReportView.ts";

export type OperationalReportActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | {
      status: "tenant-selection-required";
    }
  | { status: "permission-denied" }
  | { status: "invalid-input" }
  | { status: "server-error" };

export type LoadOperationalReportActionResult =
  | {
      status: "loaded";
      report: OperationalReportView;
    }
  | OperationalReportActionFailure;
