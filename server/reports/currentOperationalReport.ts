import type {
  OperationalReportStatus,
  OperationalReportView,
} from "../../shared/domain/operationalReportView.ts";
import {
  createCurrentRailwayOperationalReportHandler,
} from "./currentRailwayOperationalReportHandler.ts";

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

export async function readCurrentOperationalReport():
Promise<CurrentOperationalReportResult> {
  try {
    return await createCurrentRailwayOperationalReportHandler().read();
  } catch {
    return { status: "server-error", report: null };
  }
}
