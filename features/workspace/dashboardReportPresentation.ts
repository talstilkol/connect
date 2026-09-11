import type {
  OperationalReportStatus,
  OperationalReportView,
} from "../../shared/domain/operationalReportView.ts";

export function readDashboardReportMetrics(
  status: OperationalReportStatus,
  report: OperationalReportView | null,
): readonly [number, number, number, number] | null {
  if (status !== "ready" || report === null) {
    return null;
  }

  return [
    report.messages.total,
    report.conversations.active,
    report.campaigns.total,
    report.ai.totalTurns,
  ];
}
