"use client";

import {
  useState,
  useTransition,
} from "react";
import type { InterfaceLanguage } from
  "../../shared/domain/businessProfileDraft";
import type { MetaConnectionView } from
  "../../shared/domain/metaConnectionView";
import { inspectBusinessProfileCompleteness } from
  "../../shared/validation/businessProfile";
import {
  saveBusinessProfileAction,
  type SaveBusinessProfileActionResult,
} from "../../server/onboarding/saveBusinessProfileAction";
import { FeaturePage } from "./WorkspaceFeaturePage";
import { presentMetaConnection } from
  "./metaConnectionPresentation";
import { useWorkspaceDrafts } from
  "./WorkspaceDraftProvider";
import { workspaceSetupSteps } from
  "./workspaceSetupSteps";

export function WorkspaceOnboarding({
  metaConnection,
  onConnectMeta,
  serverPersistenceEnabled,
}: {
  metaConnection: MetaConnectionView;
  onConnectMeta: () => void;
  serverPersistenceEnabled: boolean;
}) {
  const {
    businessProfileDraft,
    businessProfilePersistence,
    saveBusinessProfileDraft,
  } = useWorkspaceDrafts();
  const [businessName, setBusinessName] = useState(
    businessProfileDraft?.businessName ?? "",
  );
  const [timezone, setTimezone] = useState(
    businessProfileDraft?.timezone ?? "",
  );
  const [interfaceLanguage, setInterfaceLanguage] = useState<
    InterfaceLanguage | ""
  >(businessProfileDraft?.interfaceLanguage ?? "");
  const [profileSaved, setProfileSaved] = useState(
    Boolean(businessProfileDraft),
  );
  const [saveResult, setSaveResult] =
    useState<SaveBusinessProfileActionResult | null>(null);
  const [isSaving, startSaving] = useTransition();

  const canCaptureProfile =
    businessName.trim().length > 0 &&
    timezone.length > 0 &&
    interfaceLanguage.length > 0;
  const completeness = inspectBusinessProfileCompleteness({
    businessName,
    timezone,
    interfaceLanguage,
    isDraftSaved: profileSaved,
  });
  const currentSnapshotIsServer =
    profileSaved && businessProfilePersistence === "server";
  const metaPresentation = presentMetaConnection(metaConnection);
  const markChanged = () => {
    setProfileSaved(false);
    setSaveResult(null);
  };

  const persistBusinessProfile = () => {
    if (!canCaptureProfile || interfaceLanguage === "") {
      return;
    }

    const draft = {
      businessName: businessName.trim(),
      timezone,
      interfaceLanguage,
    };

    if (!serverPersistenceEnabled) {
      saveBusinessProfileDraft(draft, "local");
      setProfileSaved(true);
      setSaveResult(null);
      return;
    }

    startSaving(async () => {
      const result = await saveBusinessProfileAction(draft);
      setSaveResult(result);

      if (result.status === "saved") {
        saveBusinessProfileDraft(
          {
            businessName: result.profile.businessName,
            timezone: result.profile.timezone,
            interfaceLanguage: result.profile.interfaceLanguage,
          },
          "server",
        );
        setProfileSaved(true);
      }
    });
  };

  const serverSaveError =
    saveResult?.status === "validation-error"
      ? "השרת דחה אחד או יותר מהשדות. יש לבדוק את הערכים ולנסות שוב."
      : saveResult?.status === "unauthenticated"
        ? "ה-Session אינו פעיל. יש להתחבר מחדש."
        : saveResult?.status === "tenant-selection-required"
          ? "המשתמש שייך למספר Tenants ונדרשת בחירה מפורשת."
          : saveResult?.status === "permission-denied"
            ? "לתפקיד הנוכחי אין הרשאה לשנות את פרטי העסק."
            : saveResult?.status === "configuration-required"
              ? "חיבור Clerk אינו מוגדר במלואו."
              : saveResult?.status === "server-error"
                ? "השמירה בשרת נכשלה. לא בוצע מעבר שקט לשמירה מקומית."
                : null;

  return (
    <FeaturePage
      eyebrow="הקמת סביבת עבודה"
      title="אשף הקמה"
      description="השלבים בנויים לפי האפיון. רק נתונים שהוזנו בפועל מוצגים כמוכנים."
      action={
        <span className="decision-progress">
          {profileSaved
            ? currentSnapshotIsServer
              ? "שלב 1 נשמר בשרת"
              : "שלב 1 מוכן מקומית"
            : `פרטי העסק ${completeness.completedCount}/${completeness.totalCount}`}
        </span>
      }
    >
      <div className="onboarding-layout">
        <section className="card onboarding-form-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">שלב 1 מתוך 10</span>
              <h2>פרטי העסק</h2>
            </div>
            <span className={`status-pill ${profileSaved ? "success" : "warning"}`}>
              {isSaving
                ? "שומר בשרת"
                : currentSnapshotIsServer
                  ? "נשמר בשרת"
                  : profileSaved
                    ? "טיוטה מקומית נשמרה"
                    : "טרם נשמר"}
            </span>
          </div>
          <p className="form-explanation">
            {serverPersistenceEnabled
              ? "השמירה מתבצעת דרך Server Action מאומת. ה-Tenant נגזר מה-Session ולא מתקבל מהטופס."
              : "Clerk אינו פעיל ולכן הנתונים נשמרים רק ב־Workspace הזמני. רענון מלא מוחק אותם ולא נוצר Tenant."}
          </p>
          <form
            className="business-profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              persistBusinessProfile();
            }}
          >
            <label>
              <span>שם העסק</span>
              <input
                value={businessName}
                onChange={(event) => {
                  setBusinessName(event.target.value);
                  markChanged();
                }}
                autoComplete="organization"
                required
              />
            </label>
            <label>
              <span>אזור זמן</span>
              <select
                value={timezone}
                onChange={(event) => {
                  setTimezone(event.target.value);
                  markChanged();
                }}
                required
              >
                <option value="">יש לבחור</option>
                <option value="Asia/Jerusalem">Asia/Jerusalem</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </label>
            <label>
              <span>שפת ממשק</span>
              <select
                value={interfaceLanguage}
                onChange={(event) => {
                  setInterfaceLanguage(
                    event.target.value as InterfaceLanguage | "",
                  );
                  markChanged();
                }}
                required
              >
                <option value="">יש לבחור</option>
                <option value="he">עברית</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={!canCaptureProfile || isSaving}
            >
              {isSaving
                ? "שומר..."
                : serverPersistenceEnabled
                  ? "שמירת פרטי העסק בשרת"
                  : "שמירת פרטי העסק מקומית"}
            </button>
          </form>

          <section className="business-profile-completeness">
            <div className="card-header">
              <div>
                <span className="card-kicker">
                  Business profile completeness
                </span>
                <h3>שלמות פרטי העסק</h3>
              </div>
              <span
                className={`readiness-score ${
                  completeness.isComplete ? "complete" : ""
                }`}
              >
                {completeness.completedCount}/{completeness.totalCount}
              </span>
            </div>

            <div className="business-profile-checks">
              <BusinessProfileCheck
                complete={completeness.businessNameComplete}
                label="שם העסק הוזן"
              />
              <BusinessProfileCheck
                complete={completeness.timezoneComplete}
                label="אזור הזמן נבחר"
              />
              <BusinessProfileCheck
                complete={completeness.interfaceLanguageComplete}
                label="שפת הממשק נבחרה"
              />
              <BusinessProfileCheck
                complete={completeness.draftSaved}
                label="הגרסה הנוכחית נשמרה"
              />
            </div>

            <div
              className={`inline-notice ${
                completeness.isComplete ? "success" : "warning"
              }`}
              role="status"
            >
              <span aria-hidden="true">
                {completeness.isComplete ? "✓" : "i"}
              </span>
              <p>
                {completeness.isComplete
                  ? currentSnapshotIsServer
                    ? saveResult?.status === "saved" &&
                      saveResult.createdTenant
                      ? "Tenant, Owner Membership ופרטי העסק נוצרו ונשמרו בשרת."
                      : "פרטי העסק נשמרו מחדש בשרת עבור ה-Tenant המאומת."
                    : "פרטי העסק נשמרו מקומית. לא נוצר Tenant ולא נשלחה בקשה לשרת."
                  : canCaptureProfile
                    ? "כל השדות מולאו. יש לשמור את הגרסה הנוכחית."
                    : "יש להשלים את השדות החסרים; ניתן לעבור למסך אחר ולחזור לגרסה האחרונה שנשמרה."}
              </p>
            </div>
            {serverSaveError ? (
              <div className="inline-notice danger" role="alert">
                <span aria-hidden="true">!</span>
                <p>{serverSaveError}</p>
              </div>
            ) : null}
          </section>
        </section>

        <aside className="card onboarding-roadmap">
          <span className="card-kicker">מסלול הקמה</span>
          <div className="roadmap-steps">
            {workspaceSetupSteps.map((step, index) => {
              const isReady =
                (index === 0 && profileSaved) ||
                (index >= 1 &&
                  index <= 3 &&
                  metaPresentation.setupComplete);
              const isMetaStep = index === 1;

              return (
                <div className={`roadmap-step ${isReady ? "ready" : ""}`} key={step.title}>
                  <span>{isReady ? "✓" : index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </div>
                  {isMetaStep ? (
                    <button type="button" onClick={onConnectMeta}>
                      {metaPresentation.actionLabel}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </FeaturePage>
  );
}

function BusinessProfileCheck({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <div className={complete ? "complete" : "incomplete"}>
      <span aria-hidden="true">{complete ? "✓" : "×"}</span>
      <strong>{label}</strong>
    </div>
  );
}
