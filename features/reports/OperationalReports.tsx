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

const statusMessages: Record<
  Exclude<OperationalReportStatus, "ready">,
  string
> = {
  "configuration-required":
    "נדרשת הגדרת Clerk ו־D1 כדי לטעון דוחות.",
  unauthenticated:
    "יש להתחבר לפני צפייה בדוחות.",
  "onboarding-required":
    "יש להשלים יצירת סביבת עבודה לפני טעינת דוחות.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה לפני טעינת דוחות.",
  "permission-denied":
    "אין לחשבון הנוכחי הרשאה לצפות בדוחות.",
  "server-error":
    "לא ניתן לטעון כרגע את הדוחות.",
};

const actionFailureMessages: Record<
  OperationalReportActionFailure["status"],
  string
> = {
  "configuration-required":
    statusMessages["configuration-required"],
  unauthenticated:
    statusMessages.unauthenticated,
  "onboarding-required":
    statusMessages["onboarding-required"],
  "tenant-selection-required":
    statusMessages[
      "tenant-selection-required"
    ],
  "permission-denied":
    statusMessages["permission-denied"],
  "invalid-input":
    "טווח התאריכים אינו תקין. ניתן לבחור עד 366 ימים.",
  "server-error":
    statusMessages["server-error"],
};

const numberFormatter =
  new Intl.NumberFormat("he-IL");

function formatNumber(
  value: number,
): string {
  return numberFormatter.format(value);
}

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "he-IL",
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
): string {
  return new Intl.DateTimeFormat(
    "he-IL",
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
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="report-metric">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

export function OperationalReports({
  initialStatus,
  initialReport,
}: {
  initialStatus: OperationalReportStatus;
  initialReport: OperationalReportView | null;
}) {
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
        <h2>הדוח אינו זמין</h2>
        <p>
          {
            statusMessages[
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
          <strong>טווח הדוח</strong>
          <small>
            כל התאריכים מחושבים לפי UTC.
          </small>
        </div>
        <label>
          <span>מתאריך</span>
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
          <span>עד תאריך</span>
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
            ? "טוען דוח…"
            : "הצגת דוח"}
        </button>
      </form>

      {failure ? (
        <p
          className="report-feedback"
          role="alert"
        >
          {actionFailureMessages[failure]}
        </p>
      ) : null}

      <div className="report-period-summary">
        <span>
          {formatDate(
            report.period.startDate,
          )}
          {" — "}
          {formatDate(report.period.endDate)}
        </span>
        <small>
          הופק ב־
          {formatGeneratedAt(
            report.generatedAt,
          )}
          {" UTC"}
        </small>
      </div>

      {!hasEvents(report) ? (
        <section
          className="card report-empty-state"
          role="status"
        >
          <h2>
            לא נמצאו אירועים בטווח שנבחר
          </h2>
          <p>
            זהו דוח אמיתי עם ערכי אפס; לא
            נוספו נתוני תצוגה חלופיים.
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
          <h2>קמפיינים והודעות</h2>
          <p>
            פעילות שנוצרה או התרחשה בטווח
            שנבחר.
          </p>
          <div className="report-metrics">
            <ReportMetric
              label="קמפיינים"
              value={report.campaigns.total}
            />
            <ReportMetric
              label="נמענים מתוכננים"
              value={
                report.campaigns
                  .recipientCount
              }
            />
            <ReportMetric
              label="הודעות יוצאות"
              value={report.messages.outbound}
            />
            <ReportMetric
              label="נמסרו"
              value={
                report.messages.delivered
              }
            />
            <ReportMetric
              label="נקראו"
              value={report.messages.read}
            />
            <ReportMetric
              label="נכשלו"
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
          <h2>שיחות</h2>
          <p>
            שיחות שההודעה האחרונה שלהן
            נמצאת בטווח.
          </p>
          <div className="report-metrics">
            <ReportMetric
              label="שיחות פעילות בטווח"
              value={
                report.conversations.active
              }
            />
            <ReportMetric
              label="הודעות שלא נקראו"
              value={
                report.conversations
                  .unreadCount
              }
            />
            <ReportMetric
              label="ממתינות לנציג"
              value={
                report.conversations
                  .waitingForAgent
              }
            />
            <ReportMetric
              label="בטיפול נציג"
              value={
                report.conversations
                  .agentActive
              }
            />
            <ReportMetric
              label="בוט פעיל"
              value={
                report.conversations.botActive
              }
            />
            <ReportMetric
              label="סגורות"
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
          <h2>Bot ו־AI</h2>
          <p>
            תוצאות Runtime ועלויות לפי
            המטבע שבו נרשמו.
          </p>
          <div className="report-metrics">
            <ReportMetric
              label="תגובות Bot"
              value={report.bot.total}
            />
            <ReportMetric
              label="Bot התקבל למסירה"
              value={report.bot.accepted}
            />
            <ReportMetric
              label="החלטות AI"
              value={report.ai.totalTurns}
            />
            <ReportMetric
              label="תשובות AI מתוכננות"
              value={report.ai.replyPlanned}
            />
            <ReportMetric
              label="העברות לנציג"
              value={report.ai.handoff}
            />
          </div>

          <div className="report-costs">
            <strong>
              שימוש ועלות לפי מטבע
            </strong>
            {report.aiUsage.length === 0 ? (
              <small>
                לא נרשם שימוש AI בטווח.
              </small>
            ) : (
              report.aiUsage.map((usage) => (
                <div key={usage.currency}>
                  <span>{usage.currency}</span>
                  <b>
                    {formatNumber(
                      usage.costMinorUnits,
                    )}{" "}
                    יחידות משנה
                  </b>
                  <small>
                    {formatNumber(
                      usage.requestCount,
                    )}{" "}
                    בקשות ·{" "}
                    {formatNumber(
                      usage.inputTokens +
                        usage.outputTokens,
                    )}{" "}
                    Tokens
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
