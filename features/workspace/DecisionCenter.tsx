import type {
  ProductionReadinessReport,
} from "../../shared/domain/productionReadiness";
import {
  listProductionDecisions,
} from "../../shared/domain/productionDecisionRegistry";

export function DecisionCenter({
  report,
}: {
  report: ProductionReadinessReport;
}) {
  const decisions = listProductionDecisions(report);
  const unresolvedCount = decisions.filter(
    (decision) =>
      decision.status === "decision-required",
  ).length;
  const resolvedCount =
    decisions.length - unresolvedCount;

  return (
    <section className="feature-page">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">
            שער Production
          </span>
          <h1>מרכז החלטות</h1>
          <p>
            מקור הנתונים זהה לשער המוכנות. המסך
            לקריאה בלבד ואינו שומר תשובות מקומיות.
          </p>
        </div>
        <span className="decision-progress">
          {resolvedCount} מתוך {decisions.length} הושלמו
        </span>
      </header>

      <section className="decision-summary card">
        <div>
          <span className="summary-number">
            {unresolvedCount}
          </span>
          <div>
            <strong>החלטות עדיין פתוחות</strong>
            <small>
              סטטוס משתנה רק לאחר החלטה ותצורת שרת
              אמיתית.
            </small>
          </div>
        </div>
        <div
          className="summary-progress"
          aria-label={`${resolvedCount} מתוך ${decisions.length} החלטות הושלמו`}
        >
          <span
            style={{
              width: `${
                decisions.length === 0
                  ? 0
                  : (resolvedCount /
                      decisions.length) *
                    100
              }%`,
            }}
          />
        </div>
      </section>

      <div className="decisions-list">
        {decisions.map((decision, index) => {
          const resolved =
            decision.status === "ready";

          return (
            <article
              className={`card decision-row ${
                resolved ? "answered" : ""
              }`}
              key={decision.checkId}
            >
              <span className="decision-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="decision-content">
                <div className="decision-title-row">
                  <div>
                    <h2>{decision.title}</h2>
                    <p>{decision.detail}</p>
                  </div>
                  <span
                    className={`status-pill ${
                      resolved ? "success" : "critical"
                    }`}
                  >
                    {resolved
                      ? "הושלם"
                      : "דורש החלטה"}
                  </span>
                </div>
                <small className="decision-owner">
                  בעלי החלטה: {decision.owner}
                </small>
                <code>{decision.code}</code>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
