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
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import {
  adminHomePath,
  adminPath,
} from "../../shared/i18n/admin.ts";
import {
  readWorkspaceRemainingMessages,
} from "../workspace/workspaceRemainingMessages.ts";
import { AdminLanguageSelector } from "./AdminLanguageSelector.tsx";
import {
  readSystemAdminDecisionMessages,
} from "./systemAdminDecisionMessages.ts";
import {
  useAdminDocumentLocale,
} from "./useAdminDocumentLocale.ts";

type Feedback = {
  tone: "success" | "danger";
  checkId: string;
  message: string;
} | null;

function formatTimestamp(
  value: string,
  locale: string,
): string {
  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    locale,
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    },
  ).format(parsed);
}

function DecisionAdminState({
  language,
  direction,
  status,
}: {
  language: InterfaceLanguage;
  direction: "ltr" | "rtl";
  status: Exclude<
    SystemAdminProductionDecisionStatus,
    "ready"
  >;
}) {
  const messages =
    readSystemAdminDecisionMessages(language);
  const content = messages.states[status];

  return (
    <main
      className="admin-state-shell"
      dir={direction}
      lang={language}
    >
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
        <AdminLanguageSelector
          language={language}
          pathname="/admin/decisions"
        />
        <Link
          href={adminPath("/admin", language)}
          className="secondary-button"
        >
          {messages.backToAdmin}
        </Link>
      </section>
    </main>
  );
}

export function SystemAdminDecisionPanel({
  language,
  initialStatus,
  initialRecords,
  readinessReport,
}: {
  language: InterfaceLanguage;
  initialStatus:
    SystemAdminProductionDecisionStatus;
  initialRecords:
    readonly ProductionDecisionRecordView[];
  readinessReport:
    ProductionReadinessReport;
}) {
  const messages =
    readSystemAdminDecisionMessages(language);
  const decisionContent =
    readWorkspaceRemainingMessages(
      language,
    ).decisions.content;
  const direction =
    useAdminDocumentLocale(language);
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
        language={language}
        direction={direction}
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
          messages.invalidForm,
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
            messages.actionFailures[result.status],
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
            ? messages.unchanged
            : messages.saved,
      });
    });
  }

  return (
    <main
      className="admin-shell"
      dir={direction}
      lang={language}
    >
      <header className="admin-header">
        <Link
          href={adminHomePath(language)}
          className="admin-brand"
          aria-label={messages.homeAriaLabel}
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
          <AdminLanguageSelector
            language={language}
            pathname="/admin/decisions"
          />
          <span className="admin-security-badge">
            {messages.verifiedSave}
          </span>
          <Link
            href={adminPath("/admin", language)}
            className="secondary-button"
          >
            {messages.tenantsLink}
          </Link>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-hero">
          <div>
            <span>{messages.eyebrow}</span>
            <h1>{messages.title}</h1>
            <p>{messages.description}</p>
          </div>
          <div className="admin-stat-grid">
            <article>
              <small>{messages.registryCount}</small>
              <strong>
                {decisions.length}
              </strong>
            </article>
            <article>
              <small>{messages.savedCount}</small>
              <strong>{records.length}</strong>
            </article>
            <article>
              <small>{messages.runtimeReadyCount}</small>
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
            {messages.secretWarning}
          </strong>
          <p>
            {messages.secretDescription}
          </p>
        </section>

        <section
          className="admin-decision-list"
          aria-label={messages.decisionsAriaLabel}
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
              const content =
                decisionContent[
                  decision.checkId
                ];

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
                      <h2>{content.title}</h2>
                      <p>{content.detail}</p>
                    </div>
                    <span
                      className={`admin-decision-runtime ${decision.status}`}
                    >
                      {
                        messages.runtime[
                          decision.status
                        ]
                      }
                    </span>
                  </header>

                  <div className="admin-decision-meta">
                    <span>
                      {messages.owner(
                        content.owner,
                      )}
                    </span>
                    <span>
                      {messages.code(decision.code)}
                    </span>
                    {record ? (
                      <>
                        <span>
                          {messages.version(
                            record.version,
                          )}
                        </span>
                        <span>
                          {messages.updatedAt(
                            formatTimestamp(
                              record.updatedAt,
                              messages.locale,
                            ),
                          )}
                        </span>
                      </>
                    ) : (
                      <span>
                        {messages.notSaved}
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
                        {messages.selection}
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
                        {messages.rationale}
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
                          ? messages.saving
                          : record
                            ? messages.saveNewVersion
                            : messages.saveDecision}
                      </button>
                      <small>
                        {messages.concurrencyHelp}
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
