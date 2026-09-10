import type {
  ProductionReadinessReport,
} from "../../shared/domain/productionReadiness";
import {
  listProductionDecisions,
} from "../../shared/domain/productionDecisionRegistry";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  readWorkspaceRemainingMessages,
} from "./workspaceRemainingMessages";

export function DecisionCenter({
  language,
  report,
}: {
  language: InterfaceLanguage;
  report: ProductionReadinessReport;
}) {
  const messages = readWorkspaceRemainingMessages(
    language,
  ).decisions;
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
            {messages.eyebrow}
          </span>
          <h1>{messages.title}</h1>
          <p>{messages.description}</p>
        </div>
        <span className="decision-progress">
          {messages.progress(
            resolvedCount,
            decisions.length,
          )}
        </span>
      </header>

      <section className="decision-summary card">
        <div>
          <span className="summary-number">
            {unresolvedCount}
          </span>
          <div>
            <strong>{messages.openTitle}</strong>
            <small>{messages.openDescription}</small>
          </div>
        </div>
        <div
          className="summary-progress"
          aria-label={messages.progress(
            resolvedCount,
            decisions.length,
          )}
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
          const content =
            messages.content[decision.checkId];

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
                    <h2>{content.title}</h2>
                    <p>{content.detail}</p>
                  </div>
                  <span
                    className={`status-pill ${
                      resolved ? "success" : "critical"
                    }`}
                  >
                    {resolved
                      ? messages.complete
                      : messages.required}
                  </span>
                </div>
                <small className="decision-owner">
                  {messages.owner(content.owner)}
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
