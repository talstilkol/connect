"use client";

import Link from "next/link";
import {
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  listProductionDecisions,
} from "../../shared/domain/productionDecisionRegistry.ts";
import type {
  ProductionDecisionRecordView,
  SystemAdminProductionDecisionStatus,
} from "../../shared/domain/productionDecisionRecord.ts";
import type {
  ProductionReadinessReport,
} from "../../shared/domain/productionReadiness.ts";
import {
  saveSystemAdminProductionDecisionAction,
} from "../../server/operations/systemAdminProductionDecisionActions.ts";

const statusMessages: Record<
  Exclude<
    SystemAdminProductionDecisionStatus,
    "ready"
  >,
  {
    title: string;
    description: string;
  }
> = {
  "configuration-required": {
    title: "סביבת Admin אינה מוגדרת",
    description:
      "נדרשות תצורות Clerk, ‏System Admin ו־D1 מלאות לפני ניהול החלטות.",
  },
  unauthenticated: {
    title: "נדרשת התחברות",
    description:
      "יש להתחבר עם זהות Clerk מורשית לפני ניהול החלטות Production.",
  },
  "permission-denied": {
    title: "אין הרשאת System Admin",
    description:
      "רק זהות שנמצאת ב־Allowlist השרת רשאית לשמור החלטות.",
  },
  "server-error": {
    title: "לא ניתן לטעון את ההחלטות",
    description:
      "הקריאה מ־D1 נכשלה באופן חסום. לא מוצגים נתונים חלופיים.",
  },
};

const actionMessages = {
  "configuration-required":
    "תצורת System Admin אינה מלאה.",
  unauthenticated:
    "ה־Session הסתיים. יש להתחבר מחדש.",
  "permission-denied":
    "אין לזהות הנוכחית הרשאת System Admin.",
  "invalid-input":
    "הבחירה או הנימוק אינם תקינים.",
  conflict:
    "ההחלטה השתנתה מאז הטעינה. יש לרענן לפני שמירה נוספת.",
  "server-error":
    "השמירה נכשלה ולא נוצר שינוי חלקי.",
} as const;

type Feedback = {
  tone: "success" | "danger";
  checkId: string;
  message: string;
} | null;

function formatTimestamp(
  value: string,
): string {
  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "he-IL",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    },
  ).format(parsed);
}

function DecisionAdminState({
  status,
}: {
  status: Exclude<
    SystemAdminProductionDecisionStatus,
    "ready"
  >;
}) {
  const content = statusMessages[status];

  return (
    <main className="admin-state-shell">
      <section
        className="admin-state-card"
        role={
          status === "server-error"
            ? "alert"
            : "status"
        }
      >
        <span aria-hidden="true">!</span>
        <p>Connect System Admin</p>
        <h1>{content.title}</h1>
        <p>{content.description}</p>
        <Link
          href="/admin"
          className="secondary-button"
        >
          חזרה לניהול המערכת
        </Link>
      </section>
    </main>
  );
}

export function SystemAdminDecisionPanel({
  initialStatus,
  initialRecords,
  readinessReport,
}: {
  initialStatus:
    SystemAdminProductionDecisionStatus;
  initialRecords:
    readonly ProductionDecisionRecordView[];
  readinessReport:
    ProductionReadinessReport;
}) {
  const [records, setRecords] =
    useState([...initialRecords]);
  const [feedback, setFeedback] =
    useState<Feedback>(null);
  const [isPending, startTransition] =
    useTransition();
  const decisions = useMemo(
    () =>
      listProductionDecisions(
        readinessReport,
      ),
    [readinessReport],
  );
  const recordsByCheckId = useMemo(
    () =>
      new Map(
        records.map((record) => [
          record.checkId,
          record,
        ]),
      ),
    [records],
  );
  const runtimeReadyCount =
    decisions.filter(
      (decision) =>
        decision.status === "ready",
    ).length;

  if (initialStatus !== "ready") {
    return (
      <DecisionAdminState
        status={initialStatus}
      />
    );
  }

  function saveDecision(
    checkId: string,
    expectedVersion: number,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget,
    );
    const selection =
      formData.get("selection");
    const rationale =
      formData.get("rationale");

    if (
      typeof selection !== "string" ||
      typeof rationale !== "string" ||
      selection.trim().length === 0 ||
      rationale.trim().length === 0
    ) {
      setFeedback({
        tone: "danger",
        checkId,
        message:
          "יש להזין בחירה ונימוק לפני השמירה.",
      });
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result =
        await saveSystemAdminProductionDecisionAction(
          {
            checkId,
            expectedVersion,
            selection,
            rationale,
          },
        );

      if (result.status !== "saved") {
        setFeedback({
          tone: "danger",
          checkId,
          message:
            actionMessages[result.status],
        });
        return;
      }

      setRecords((current) => [
        ...current.filter(
          (record) =>
            record.checkId !==
            result.record.checkId,
        ),
        result.record,
      ]);
      setFeedback({
        tone: "success",
        checkId,
        message:
          result.outcome === "unchanged"
            ? "ההחלטה כבר שמורה באותה גרסה."
            : "ההחלטה נשמרה ונוסף אירוע Audit אטומי.",
      });
    });
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link
          href="/"
          className="admin-brand"
          aria-label="Connect — עמוד ראשי"
        >
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <strong>Connect</strong>
            <small>System Admin</small>
          </div>
        </Link>
        <div className="admin-header-actions">
          <span className="admin-security-badge">
            שמירה מאומתת בשרת
          </span>
          <Link
            href="/admin"
            className="secondary-button"
          >
            Tenants ומנויים
          </Link>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-hero">
          <div>
            <span>Production Governance</span>
            <h1>ניהול החלטות</h1>
            <p>
              ההחלטה העסקית נשמרת בנפרד
              ממצב ה־Runtime. שמירה אינה מסמנת
              אינטגרציה כ־Ready עד ששער
              Production מאמת אותה בפועל.
            </p>
          </div>
          <div className="admin-stat-grid">
            <article>
              <small>החלטות ב־Registry</small>
              <strong>
                {decisions.length}
              </strong>
            </article>
            <article>
              <small>רשומות שמורות</small>
              <strong>{records.length}</strong>
            </article>
            <article>
              <small>Runtime Ready</small>
              <strong>
                {runtimeReadyCount}
              </strong>
            </article>
          </div>
        </section>

        <section
          className="admin-decision-notice"
          role="note"
        >
          <strong>
            אין להזין Secrets, Tokens או מפתחות.
          </strong>
          <p>
            יש לשמור רק את הבחירה המאושרת
            והנימוק. Credentials נשמרים במנגנוני
            התצורה הייעודיים בלבד.
          </p>
        </section>

        <section
          className="admin-decision-list"
          aria-label="החלטות Production"
        >
          {decisions.map(
            (decision, index) => {
              const record =
                recordsByCheckId.get(
                  decision.checkId,
                );
              const currentFeedback =
                feedback?.checkId ===
                decision.checkId
                  ? feedback
                  : null;

              return (
                <article
                  className="admin-decision-card"
                  key={decision.checkId}
                >
                  <header>
                    <span className="decision-index">
                      {String(index + 1).padStart(
                        2,
                        "0",
                      )}
                    </span>
                    <div>
                      <small>
                        {decision.checkId}
                      </small>
                      <h2>{decision.title}</h2>
                      <p>{decision.detail}</p>
                    </div>
                    <span
                      className={`admin-decision-runtime ${decision.status}`}
                    >
                      {decision.status ===
                      "ready"
                        ? "Runtime מוכן"
                        : decision.status ===
                            "blocked"
                          ? "Runtime חסום"
                          : "Runtime דורש החלטה"}
                    </span>
                  </header>

                  <div className="admin-decision-meta">
                    <span>
                      בעלות: {decision.owner}
                    </span>
                    <span>
                      קוד: {decision.code}
                    </span>
                    {record ? (
                      <>
                        <span>
                          גרסה {record.version}
                        </span>
                        <span>
                          עודכן{" "}
                          {formatTimestamp(
                            record.updatedAt,
                          )}{" "}
                          UTC
                        </span>
                      </>
                    ) : (
                      <span>
                        טרם נשמרה החלטה
                      </span>
                    )}
                  </div>

                  <form
                    key={`${decision.checkId}-${record?.version ?? 0}`}
                    className="admin-decision-form"
                    onSubmit={(event) =>
                      saveDecision(
                        decision.checkId,
                        record?.version ?? 0,
                        event,
                      )
                    }
                  >
                    <label>
                      <span>
                        הבחירה המאושרת
                      </span>
                      <input
                        name="selection"
                        type="text"
                        defaultValue={
                          record?.selection ?? ""
                        }
                        maxLength={120}
                        autoComplete="off"
                        required
                      />
                    </label>
                    <label>
                      <span>
                        נימוק והשלכות
                      </span>
                      <textarea
                        name="rationale"
                        defaultValue={
                          record?.rationale ?? ""
                        }
                        maxLength={2000}
                        rows={4}
                        required
                      />
                    </label>
                    <div>
                      <button
                        className="primary-button"
                        disabled={isPending}
                      >
                        {isPending
                          ? "שומר…"
                          : record
                            ? "שמירת גרסה חדשה"
                            : "שמירת החלטה"}
                      </button>
                      <small>
                        השמירה משתמשת בגרסה
                        צפויה ומונעת דריסת שינוי
                        מקביל.
                      </small>
                    </div>
                  </form>

                  {currentFeedback ? (
                    <p
                      className={`admin-feedback ${currentFeedback.tone}`}
                      role={
                        currentFeedback.tone ===
                        "danger"
                          ? "alert"
                          : "status"
                      }
                      aria-live="polite"
                    >
                      {currentFeedback.message}
                    </p>
                  ) : null}
                </article>
              );
            },
          )}
        </section>
      </div>
    </main>
  );
}
