"use client";

import type { MetaConnectionView } from
  "../../shared/domain/metaConnectionView";
import type { InterfaceLanguage } from
  "../../shared/domain/businessProfileDraft";
import { readWorkspaceDirection } from
  "../../shared/i18n/workspace";
import { readWorkspaceSetupMessages } from
  "../../shared/i18n/workspaceSetup";
import { inspectDashboardSetup } from
  "../../shared/validation/dashboardSetup";
import type { SectionId } from
  "../../shared/workspace/navigation";
import { presentMetaConnection } from
  "./metaConnectionPresentation";
import { useWorkspaceDrafts } from
  "./WorkspaceDraftProvider";
import { readWorkspaceSetupSteps } from
  "./workspaceSetupSteps";

export function WorkspaceDashboard({
  metaConnection,
  decisionRequiredCount,
  language,
  onNavigate,
  onConnectMeta,
}: {
  metaConnection: MetaConnectionView;
  decisionRequiredCount: number;
  language: InterfaceLanguage;
  onNavigate: (section: SectionId) => void;
  onConnectMeta: () => void;
}) {
  const {
    businessProfileDraft,
    businessProfilePersistence,
  } = useWorkspaceDrafts();
  const setupState = inspectDashboardSetup(
    businessProfileDraft,
    metaConnection,
  );
  const messages = readWorkspaceSetupMessages(language).dashboard;
  const metaPresentation = presentMetaConnection(
    metaConnection,
    language,
  );
  const setupSteps = readWorkspaceSetupSteps(language);
  const flowArrow =
    readWorkspaceDirection(language) === "rtl" ? "←" : "→";
  const progressLabel = messages.progress(
    setupState.completedSteps,
    setupState.totalSteps,
  );

  const continueSetup = () => {
    if (setupState.nextAction === "business-profile") {
      onNavigate("onboarding");
      return;
    }

    if (setupState.nextAction === "meta") {
      onConnectMeta();
      return;
    }

    onNavigate("onboarding");
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{messages.eyebrow}</p>
          <h1>
            {setupState.businessProfileComplete
              ? messages.greetingWithBusiness(
                  businessProfileDraft?.businessName ?? "",
                )
              : messages.greetingWithoutBusiness}
          </h1>
          {setupState.businessProfileComplete ? (
            <p>
              {setupState.metaConnectionComplete
                ? messages.descriptions.profileAndMetaComplete
                : businessProfilePersistence === "server"
                  ? messages.descriptions.serverProfileComplete
                  : messages.descriptions.localProfileComplete}
            </p>
          ) : (
            <p>
              {messages.descriptions.profileIncomplete}
            </p>
          )}
        </div>
        <div className="heading-actions">
          <button type="button" className="secondary-button" onClick={() => onNavigate("decisions")}>
            {messages.showOpenDecisions}
          </button>
          <button type="button" className="primary-button" onClick={onConnectMeta}>
            {metaPresentation.actionLabel}
            <span aria-hidden="true">{flowArrow}</span>
          </button>
        </div>
      </div>

      <section className="connection-banner">
        <div className="connection-illustration" aria-hidden="true">
          <span className="phone-shape">◉</span>
          <span className="connection-line" />
          <span className="cloud-shape">M</span>
        </div>
        <div className="connection-copy">
          <span className={`status-pill ${metaPresentation.tone}`}>
            <i />
            {metaPresentation.statusLabel}
          </span>
          <h2>{metaPresentation.heading}</h2>
          <p>{metaPresentation.description}</p>
        </div>
        <button type="button" className="outline-button" onClick={onConnectMeta}>
          {metaPresentation.actionLabel}
        </button>
      </section>

      <section
        className="metrics-grid"
        aria-label={messages.metricsAriaLabel}
      >
        <MetricCard
          label={messages.metrics[0]}
          icon="↗"
          noDataLabel={messages.noMetricSource}
        />
        <MetricCard
          label={messages.metrics[1]}
          icon="♙"
          noDataLabel={messages.noMetricSource}
        />
        <MetricCard
          label={messages.metrics[2]}
          icon="◒"
          noDataLabel={messages.noMetricSource}
        />
        <MetricCard
          label={messages.metrics[3]}
          icon="✦"
          noDataLabel={messages.noMetricSource}
        />
      </section>

      <div className="dashboard-grid">
        <section className="card onboarding-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">{messages.setupKicker}</span>
              <h2>{messages.setupTitle}</h2>
            </div>
            <span className="progress-label">{progressLabel}</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={messages.progressAriaLabel(progressLabel)}
            aria-valuemin={0}
            aria-valuemax={setupState.totalSteps}
            aria-valuenow={setupState.completedSteps}
          >
            <span style={{ width: `${setupState.progressPercent}%` }} />
          </div>
          <div className="setup-list">
            {setupSteps.slice(0, 5).map((step, index) => {
              const isReady =
                (index === 0 && setupState.businessProfileComplete) ||
                (index >= 1 &&
                  index <= 3 &&
                  setupState.metaConnectionComplete);

              return (
                <div
                  className={`setup-row ${isReady ? "ready" : ""}`}
                  key={step.title}
                >
                  <span className="step-number">
                    {isReady ? "✓" : index + 1}
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </div>
                  <span className="step-state">
                    {isReady
                      ? index >= 1
                        ? messages.stepStates.server
                        : businessProfilePersistence === "server"
                        ? messages.stepStates.server
                        : messages.stepStates.local
                      : messages.stepStates.notStarted}
                  </span>
                </div>
              );
            })}
          </div>
          <button type="button" className="text-button" onClick={continueSetup}>
            {setupState.nextAction === "business-profile"
              ? messages.continueActions.businessProfile
              : setupState.nextAction === "meta"
                ? messages.continueActions.meta
                : messages.continueActions.onboarding}
            <span aria-hidden="true">{flowArrow}</span>
          </button>
        </section>

        <aside className="side-stack">
          <section className="card decision-card">
            <div className="decision-top">
              <span className="decision-icon">!</span>
              <span className="status-pill critical">
                {messages.decisionRequired}
              </span>
            </div>
            <h2>
              {messages.blockingDecisions(decisionRequiredCount)}
            </h2>
            <p>
              {messages.blockingDecisionDescription}
            </p>
            <button type="button" className="text-button" onClick={() => onNavigate("decisions")}>
              {messages.openDecisionCenter}
              <span aria-hidden="true">{flowArrow}</span>
            </button>
          </section>

          <section className="card quick-actions-card">
            <span className="card-kicker">{messages.quickActions}</span>
            <div className="quick-actions">
              <button type="button" onClick={() => onNavigate("contacts")}>
                <span>＋</span>
                {messages.importContacts}
              </button>
              <button type="button" onClick={() => onNavigate("bot")}>
                <span>⌘</span>
                {messages.buildFlow}
              </button>
              <button type="button" onClick={() => onNavigate("ai")}>
                <span>✦</span>
                {messages.configureAiAgent}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function MetricCard({
  label,
  icon,
  noDataLabel,
}: {
  label: string;
  icon: string;
  noDataLabel: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <span>{label}</span>
        <strong>—</strong>
        <small>{noDataLabel}</small>
      </div>
    </article>
  );
}
