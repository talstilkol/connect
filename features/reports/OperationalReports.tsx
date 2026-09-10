"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import type {
  OperationalReportStatus,
  OperationalReportView,
} from "../../shared/domain/operationalReportView";
import {
  loadOperationalReportAction,
} from "../../server/reports/operationalReportActions";
import type {
  OperationalReportActionFailure,
} from "../../server/reports/operationalReportActionResult";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  readOperationalReportMessages,
} from "./operationalReportMessages";

function formatNumber(
  value: number,
  locale: string,
): string {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(
  value: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(
    locale,
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function formatGeneratedAt(
  value: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(
    locale,
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "UTC",
    },
  ).format(new Date(value));
}

function hasEvents(
  report: OperationalReportView,
): boolean {
  return (
    report.campaigns.total > 0 ||
    report.messages.total > 0 ||
    report.conversations.active > 0 ||
    report.bot.total > 0 ||
    report.ai.totalTurns > 0 ||
    report.aiUsage.length > 0
  );
}

function ReportMetric({
  locale,
  label,
  value,
}: {
  locale: string;
  label: string;
  value: number;
}) {
  return (
    <div className="report-metric">
      <span>{label}</span>
      <strong>{formatNumber(value, locale)}</strong>
    </div>
  );
}

export function OperationalReports({
  language,
  initialStatus,
  initialReport,
}: {
  language: InterfaceLanguage;
  initialStatus: OperationalReportStatus;
  initialReport: OperationalReportView | null;
}) {
  const messages = readOperationalReportMessages(language);
  const [report, setReport] =
    useState(initialReport);
  const [startDate, setStartDate] =
    useState(
      initialReport?.period.startDate ?? "",
    );
  const [endDate, setEndDate] =
    useState(
      initialReport?.period.endDate ?? "",
    );
  const [failure, setFailure] = useState<
    OperationalReportActionFailure["status"] |
      null
  >(
    initialStatus === "ready"
      ? null
      : initialStatus,
  );
  const [isPending, startTransition] =
    useTransition();

  function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFailure(null);

    startTransition(async () => {
      const result =
        await loadOperationalReportAction({
          startDate,
          endDate,
        });

      if (result.status !== "loaded") {
        setFailure(result.status);
        return;
      }

      setReport(result.report);
      setStartDate(
        result.report.period.startDate,
      );
      setEndDate(
        result.report.period.endDate,
      );
    });
  }

  if (!report) {
    return (
      <section
        className="card report-state"
        role="status"
      >
        <span
          className="report-icon"
          aria-hidden="true"
        >
          ↗
        </span>
        <h2>{messages.unavailableTitle}</h2>
        <p>
          {
            messages.statuses[
              initialStatus === "ready"
                ? "server-error"
                : initialStatus
            ]
          }
        </p>
      </section>
    );
  }

  return (
    <div className="operational-reports">
      <form
        className="card report-toolbar"
        onSubmit={submit}
      >
        <div>
          <strong>{messages.toolbar.title}</strong>
          <small>
            {messages.toolbar.utcHelp}
          </small>
        </div>
        <label>
          <span>{messages.toolbar.from}</span>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
            required
          />
        </label>
        <label>
          <span>{messages.toolbar.to}</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
            required
          />
        </label>
        <button
          className="primary-button"
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? messages.toolbar.loading
            : messages.toolbar.show}
        </button>
      </form>

      {failure ? (
        <p
          className="report-feedback"
          role="alert"
        >
          {messages.actionFailures[failure]}
        </p>
      ) : null}

      <div className="report-period-summary">
        <span>
          {formatDate(
            report.period.startDate,
            messages.locale,
          )}
          {" — "}
          {formatDate(
            report.period.endDate,
            messages.locale,
          )}
        </span>
        <small>
          {messages.generatedAt(
            formatGeneratedAt(
              report.generatedAt,
              messages.locale,
            ),
          )}
        </small>
      </div>

      {!hasEvents(report) ? (
        <section
          className="card report-empty-state"
          role="status"
        >
          <h2>
            {messages.empty.title}
          </h2>
          <p>
            {messages.empty.description}
          </p>
        </section>
      ) : null}

      <section className="reports-grid">
        <article className="card report-card">
          <span
            className="report-icon"
            aria-hidden="true"
          >
            ↗
          </span>
          <h2>{messages.campaigns.title}</h2>
          <p>
            {messages.campaigns.description}
          </p>
          <div className="report-metrics">
            <ReportMetric
              locale={messages.locale}
              label={messages.campaigns.total}
              value={report.campaigns.total}
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.campaigns.recipients}
              value={
                report.campaigns
                  .recipientCount
              }
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.campaigns.outbound}
              value={report.messages.outbound}
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.campaigns.delivered}
              value={
                report.messages.delivered
              }
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.campaigns.read}
              value={report.messages.read}
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.campaigns.failed}
              value={report.messages.failed}
            />
          </div>
        </article>

        <article className="card report-card">
          <span
            className="report-icon"
            aria-hidden="true"
          >
            ◌
          </span>
          <h2>{messages.conversations.title}</h2>
          <p>
            {messages.conversations.description}
          </p>
          <div className="report-metrics">
            <ReportMetric
              locale={messages.locale}
              label={messages.conversations.active}
              value={
                report.conversations.active
              }
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.conversations.unread}
              value={
                report.conversations
                  .unreadCount
              }
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.conversations.waitingForAgent}
              value={
                report.conversations
                  .waitingForAgent
              }
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.conversations.agentActive}
              value={
                report.conversations
                  .agentActive
              }
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.conversations.botActive}
              value={
                report.conversations.botActive
              }
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.conversations.closed}
              value={
                report.conversations.closed
              }
            />
          </div>
        </article>

        <article className="card report-card">
          <span
            className="report-icon"
            aria-hidden="true"
          >
            ✦
          </span>
          <h2>{messages.automation.title}</h2>
          <p>
            {messages.automation.description}
          </p>
          <div className="report-metrics">
            <ReportMetric
              locale={messages.locale}
              label={messages.automation.botReplies}
              value={report.bot.total}
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.automation.botAccepted}
              value={report.bot.accepted}
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.automation.aiDecisions}
              value={report.ai.totalTurns}
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.automation.aiPlanned}
              value={report.ai.replyPlanned}
            />
            <ReportMetric
              locale={messages.locale}
              label={messages.automation.handoffs}
              value={report.ai.handoff}
            />
          </div>

          <div className="report-costs">
            <strong>
              {messages.automation.usageTitle}
            </strong>
            {report.aiUsage.length === 0 ? (
              <small>
                {messages.automation.noUsage}
              </small>
            ) : (
              report.aiUsage.map((usage) => (
                <div key={usage.currency}>
                  <span>{usage.currency}</span>
                  <b>
                    {messages.automation.minorUnits(
                      formatNumber(
                        usage.costMinorUnits,
                        messages.locale,
                      ),
                    )}
                  </b>
                  <small>
                    {messages.automation.requestsAndTokens(
                      formatNumber(
                        usage.requestCount,
                        messages.locale,
                      ),
                      formatNumber(
                        usage.inputTokens +
                          usage.outputTokens,
                        messages.locale,
                      ),
                    )}
                  </small>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
