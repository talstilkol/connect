"use client";

import type { MetaConnectionView } from
  "../../shared/domain/metaConnectionView";
import { inspectDashboardSetup } from
  "../../shared/validation/dashboardSetup";
import type { SectionId } from
  "../../shared/workspace/navigation";
import { presentMetaConnection } from
  "./metaConnectionPresentation";
import { useWorkspaceDrafts } from
  "./WorkspaceDraftProvider";
import { workspaceSetupSteps } from
  "./workspaceSetupSteps";

export function WorkspaceDashboard({
  metaConnection,
  decisionRequiredCount,
  onNavigate,
  onConnectMeta,
}: {
  metaConnection: MetaConnectionView;
  decisionRequiredCount: number;
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
  const metaPresentation = presentMetaConnection(metaConnection);
  const progressLabel = `${setupState.completedSteps} מתוך ${setupState.totalSteps}`;

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
          <p className="eyebrow">מרכז השליטה</p>
          <h1>
            {setupState.businessProfileComplete
              ? `בוקר טוב, ${businessProfileDraft?.businessName}. ממשיכים לשלב הבא.`
              : "בוקר טוב, מתחילים לחבר את העסק."}
          </h1>
          {setupState.businessProfileComplete ? (
            <p>
              {setupState.metaConnectionComplete
                ? "פרטי העסק וחיבור Meta נשמרו בשרת. ניתן להמשיך לשלב הבא באשף."
                : businessProfilePersistence === "server"
                  ? "פרטי העסק נשמרו בשרת עבור Tenant מאומת. השלב הבא הוא חיבור רשמי ל־Meta."
                  : "פרטי העסק נשמרו מקומית. השלב הבא הוא חיבור רשמי ל־Meta; עדיין לא נוצר Tenant ולא נשלחה בקשת Backend."}
            </p>
          ) : (
            <p>
              סביבת העבודה מוכנה. כדי להתקדם לחיבור הרשמי יש להשלים תחילה את
              פרטי העסק.
            </p>
          )}
        </div>
        <div className="heading-actions">
          <button type="button" className="secondary-button" onClick={() => onNavigate("decisions")}>
            הצגת החלטות פתוחות
          </button>
          <button type="button" className="primary-button" onClick={onConnectMeta}>
            {metaPresentation.actionLabel}
            <span aria-hidden="true">←</span>
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

      <section className="metrics-grid" aria-label="מדדי חשבון">
        <MetricCard label="הודעות החודש" icon="↗" />
        <MetricCard label="אנשי קשר" icon="♙" />
        <MetricCard label="קמפיינים פעילים" icon="◒" />
        <MetricCard label="צריכת AI" icon="✦" />
      </section>

      <div className="dashboard-grid">
        <section className="card onboarding-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">אשף הקמה</span>
              <h2>10 צעדים עד לשליחה הראשונה</h2>
            </div>
            <span className="progress-label">{progressLabel}</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={`התקדמות ${progressLabel}`}
            aria-valuemin={0}
            aria-valuemax={setupState.totalSteps}
            aria-valuenow={setupState.completedSteps}
          >
            <span style={{ width: `${setupState.progressPercent}%` }} />
          </div>
          <div className="setup-list">
            {workspaceSetupSteps.slice(0, 5).map((step, index) => {
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
                        ? "נשמר בשרת"
                        : businessProfilePersistence === "server"
                        ? "נשמר בשרת"
                        : "נשמר מקומית"
                      : "טרם התחיל"}
                  </span>
                </div>
              );
            })}
          </div>
          <button type="button" className="text-button" onClick={continueSetup}>
            {setupState.nextAction === "business-profile"
              ? "השלמת פרטי העסק"
              : setupState.nextAction === "meta"
                ? "מעבר לחיבור Meta"
                : "המשך באשף ההקמה"}
            <span aria-hidden="true">←</span>
          </button>
        </section>

        <aside className="side-stack">
          <section className="card decision-card">
            <div className="decision-top">
              <span className="decision-icon">!</span>
              <span className="status-pill critical">דורש החלטה</span>
            </div>
            <h2>
              {decisionRequiredCount}{" "}
              החלטות חוסמות Production
            </h2>
            <p>
              ספק Meta, סליקה, חבילות, AI ומדיניות מידע עדיין לא הוגדרו באפיון.
            </p>
            <button type="button" className="text-button" onClick={() => onNavigate("decisions")}>
              פתיחת מרכז ההחלטות
              <span aria-hidden="true">←</span>
            </button>
          </section>

          <section className="card quick-actions-card">
            <span className="card-kicker">פעולות מהירות</span>
            <div className="quick-actions">
              <button type="button" onClick={() => onNavigate("contacts")}>
                <span>＋</span>
                ייבוא אנשי קשר
              </button>
              <button type="button" onClick={() => onNavigate("bot")}>
                <span>⌘</span>
                בניית תהליך
              </button>
              <button type="button" onClick={() => onNavigate("ai")}>
                <span>✦</span>
                הגדרת סוכן AI
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
}: {
  label: string;
  icon: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <span>{label}</span>
        <strong>—</strong>
        <small>טרם קיים מקור נתונים</small>
      </div>
    </article>
  );
}
