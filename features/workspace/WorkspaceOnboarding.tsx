"use client";

import {
  useState,
  useTransition,
} from "react";
import type { InterfaceLanguage } from
  "../../shared/domain/businessProfileDraft";
import { readWorkspaceSetupMessages } from
  "../../shared/i18n/workspaceSetup";
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
import { readWorkspaceSetupSteps } from
  "./workspaceSetupSteps";

export function WorkspaceOnboarding({
  metaConnection,
  language,
  onConnectMeta,
  serverPersistenceEnabled,
}: {
  metaConnection: MetaConnectionView;
  language: InterfaceLanguage;
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
  const messages = readWorkspaceSetupMessages(language).onboarding;
  const setupSteps = readWorkspaceSetupSteps(language);
  const metaPresentation = presentMetaConnection(
    metaConnection,
    language,
  );
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
    saveResult && saveResult.status !== "saved"
      ? messages.saveFailures[saveResult.status]
      : null;

  return (
    <FeaturePage
      eyebrow={messages.heading.eyebrow}
      title={messages.heading.title}
      description={messages.heading.description}
      action={
        <span className="decision-progress">
          {profileSaved
            ? currentSnapshotIsServer
              ? messages.progress.server
              : messages.progress.local
            : messages.progress.profile(
                completeness.completedCount,
                completeness.totalCount,
              )}
        </span>
      }
    >
      <div className="onboarding-layout">
        <section className="card onboarding-form-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">{messages.stepOneOfTen}</span>
              <h2>{messages.businessDetails}</h2>
            </div>
            <span className={`status-pill ${profileSaved ? "success" : "warning"}`}>
              {isSaving
                ? messages.statuses.saving
                : currentSnapshotIsServer
                  ? messages.statuses.server
                  : profileSaved
                    ? messages.statuses.local
                    : messages.statuses.unsaved}
            </span>
          </div>
          <p className="form-explanation">
            {serverPersistenceEnabled
              ? messages.explanations.server
              : messages.explanations.local}
          </p>
          <form
            className="business-profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              persistBusinessProfile();
            }}
          >
            <label>
              <span>{messages.fields.businessName}</span>
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
              <span>{messages.fields.timezone}</span>
              <select
                value={timezone}
                onChange={(event) => {
                  setTimezone(event.target.value);
                  markChanged();
                }}
                required
              >
                <option value="">{messages.fields.choose}</option>
                <option value="Asia/Jerusalem">Asia/Jerusalem</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </label>
            <label>
              <span>{messages.fields.interfaceLanguage}</span>
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
                <option value="">{messages.fields.choose}</option>
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
                ? messages.saveActions.saving
                : serverPersistenceEnabled
                  ? messages.saveActions.server
                  : messages.saveActions.local}
            </button>
          </form>

          <section className="business-profile-completeness">
            <div className="card-header">
              <div>
                <span className="card-kicker">
                  {messages.completenessKicker}
                </span>
                <h3>{messages.completenessTitle}</h3>
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
                label={messages.checks[0]}
              />
              <BusinessProfileCheck
                complete={completeness.timezoneComplete}
                label={messages.checks[1]}
              />
              <BusinessProfileCheck
                complete={completeness.interfaceLanguageComplete}
                label={messages.checks[2]}
              />
              <BusinessProfileCheck
                complete={completeness.draftSaved}
                label={messages.checks[3]}
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
                      ? messages.notices.tenantCreated
                      : messages.notices.serverUpdated
                    : messages.notices.localSaved
                  : canCaptureProfile
                    ? messages.notices.readyToSave
                    : messages.notices.missingFields}
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
          <span className="card-kicker">{messages.roadmapKicker}</span>
          <div className="roadmap-steps">
            {setupSteps.map((step, index) => {
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
