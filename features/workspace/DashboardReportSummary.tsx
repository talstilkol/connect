"use client";

import type { InterfaceLanguage } from
  "../../shared/domain/businessProfileDraft";
import type {
  OperationalReportStatus,
  OperationalReportView,
} from "../../shared/domain/operationalReportView";
import { readWorkspaceSetupMessages } from
  "../../shared/i18n/workspaceSetup";
import { readOperationalReportMessages } from
  "../reports/operationalReportMessages";
import { readDashboardReportMetrics } from
  "./dashboardReportPresentation";

const metricIcons = ["↗", "♙", "◒", "✦"] as const;

export function DashboardReportSummary({
  language,
  status,
  report,
  onOpenReports,
}: {
  language: InterfaceLanguage;
  status: OperationalReportStatus;
  report: OperationalReportView | null;
  onOpenReports: () => void;
}) {
  const messages = readWorkspaceSetupMessages(language).dashboard;
  const reportMessages = readOperationalReportMessages(language);
  const metrics = readDashboardReportMetrics(status, report);
  const visibleReport = metrics !== null ? report : null;
  const formatNumber = new Intl.NumberFormat(reportMessages.locale);
  const formatDate = new Intl.DateTimeFormat(reportMessages.locale, {
    dateStyle: "short",
    timeZone: "UTC",
  });
  const formatTimestamp = new Intl.DateTimeFormat(reportMessages.locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  });

  return (
    <section className="dashboard-report-summary" aria-label={messages.metricsAriaLabel}>
      <div className="card-header">
        <div>
          {visibleReport ? (
            <>
              <strong>
                {messages.metricPeriod(
                  formatDate.format(new Date(
                    `${visibleReport.period.startDate}T00:00:00.000Z`,
                  )),
                  formatDate.format(new Date(
                    `${visibleReport.period.endDate}T00:00:00.000Z`,
                  )),
                )}
              </strong>
              <p>
                {reportMessages.generatedAt(
                  formatTimestamp.format(new Date(visibleReport.generatedAt)),
                )}
                {" (UTC)"}
              </p>
            </>
          ) : (
            <p role="status">
              {reportMessages.statuses[
                status === "ready" ? "server-error" : status
              ]}
            </p>
          )}
        </div>
        <button type="button" className="text-button" onClick={onOpenReports}>
          {messages.openReports}
        </button>
      </div>
      <div className="metrics-grid">
        {messages.metrics.map((label, index) => (
          <article className="metric-card" key={label}>
            <div className="metric-icon" aria-hidden="true">
              {metricIcons[index]}
            </div>
            <div>
              <span>{label}</span>
              <strong>
                {metrics === null ? "—" : formatNumber.format(metrics[index])}
              </strong>
              <small>{messages.metricDescriptions[index]}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
