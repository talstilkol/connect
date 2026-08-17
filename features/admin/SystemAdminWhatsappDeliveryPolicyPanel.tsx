"use client";

import Link from "next/link";
import {
  type FormEvent,
  useState,
  useTransition,
} from "react";

import type {
  CurrentSystemAdminWhatsappDeliveryPolicy,
  SystemAdminWhatsappDeliveryPolicyViewStatus,
  WhatsappCampaignDeliveryPolicyRecordView,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import type {
  SystemAdminWhatsappDeliveryPolicyActionResult,
} from "../../server/campaigns/systemAdminWhatsappDeliveryPolicyActionResult.ts";
import {
  activateSystemAdminWhatsappDeliveryPolicyKillSwitchAction,
  approveSystemAdminWhatsappDeliveryPolicyAction,
} from "../../server/campaigns/systemAdminWhatsappDeliveryPolicyActions.ts";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import {
  adminPath,
} from "../../shared/i18n/admin.ts";
import { AdminLanguageSelector } from "./AdminLanguageSelector.tsx";
import {
  readSystemAdminWhatsappPolicyMessages,
} from "./systemAdminWhatsappPolicyMessages.ts";
import {
  useAdminDocumentLocale,
} from "./useAdminDocumentLocale.ts";

type Feedback = {
  tone: "success" | "danger";
  message: string;
} | null;

function AdminState({
  language,
  direction,
  tenantId,
  status,
}: {
  language: InterfaceLanguage;
  direction: "ltr" | "rtl";
  tenantId: number;
  status: Exclude<
    SystemAdminWhatsappDeliveryPolicyViewStatus,
    "ready"
  >;
}) {
  const messages =
    readSystemAdminWhatsappPolicyMessages(
      language,
    );
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
          pathname={`/admin/whatsapp-delivery-policy/${tenantId}`}
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

function canonicalUtcDateTime(
  value: FormDataEntryValue | null,
): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(
      value,
    )
  ) {
    return null;
  }

  const timestamp = `${value}.000Z`;

  return new Date(timestamp).toISOString() ===
    timestamp
    ? timestamp
    : null;
}

function formatTimestamp(
  value: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(
    locale,
    {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "UTC",
    },
  ).format(new Date(value));
}

export function SystemAdminWhatsappDeliveryPolicyPanel({
  language,
  tenantId,
  initialResult,
}: {
  language: InterfaceLanguage;
  tenantId: number;
  initialResult:
    CurrentSystemAdminWhatsappDeliveryPolicy;
}) {
  const messages =
    readSystemAdminWhatsappPolicyMessages(
      language,
    );
  const direction =
    useAdminDocumentLocale(language);
  const [record, setRecord] =
    useState<WhatsappCampaignDeliveryPolicyRecordView | null>(
      initialResult.record,
    );
  const [feedback, setFeedback] =
    useState<Feedback>(null);
  const [isPending, startTransition] =
    useTransition();
  const connection =
    initialResult.connection;

  if (
    initialResult.status !== "ready" ||
    !connection
  ) {
    return (
      <AdminState
        language={language}
        direction={direction}
        tenantId={tenantId}
        status={
          initialResult.status === "ready"
            ? "server-error"
            : initialResult.status
        }
      />
    );
  }

  const readyConnection = connection;

  function applyResult(
    result:
      SystemAdminWhatsappDeliveryPolicyActionResult,
    successMessage: string,
  ) {
    if (result.status !== "saved") {
      setFeedback({
        tone: "danger",
        message:
          messages.actionFailures[result.status],
      });
      return;
    }

    setRecord(result.record);
    setFeedback({
      tone: "success",
      message:
        result.outcome === "unchanged"
          ? messages.unchanged
          : successMessage,
    });
  }

  function approve(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget,
    );
    const portfolioLimitKind =
      formData.get("portfolioLimitKind");
    const boundedLimit = Number(
      formData.get("portfolioLimitValue"),
    );
    const reservationDurationSeconds =
      Number(
        formData.get(
          "reservationDurationSeconds",
        ),
      );
    const metaGraphApiVersion =
      formData.get("metaGraphApiVersion");
    const evidenceDigest =
      formData.get("evidenceDigest");
    const evidenceCheckedAt =
      canonicalUtcDateTime(
        formData.get("evidenceCheckedAt"),
      );
    const evidenceExpiresAt =
      canonicalUtcDateTime(
        formData.get("evidenceExpiresAt"),
      );

    if (
      (portfolioLimitKind !== "bounded" &&
        portfolioLimitKind !==
          "unlimited") ||
      (portfolioLimitKind === "bounded" &&
        ![
          250,
          2000,
          10000,
          100000,
        ].includes(boundedLimit)) ||
      !Number.isSafeInteger(
        reservationDurationSeconds,
      ) ||
      typeof metaGraphApiVersion !==
        "string" ||
      typeof evidenceDigest !== "string" ||
      !evidenceCheckedAt ||
      !evidenceExpiresAt
    ) {
      setFeedback({
        tone: "danger",
        message:
          messages.invalidEvidence,
      });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result =
        await approveSystemAdminWhatsappDeliveryPolicyAction(
          {
            tenantId: readyConnection.tenantId,
            expectedConnectionVersion:
              readyConnection.version,
            expectedPolicyVersion:
              record?.policyVersion ?? 0,
            businessPortfolioId:
              readyConnection.businessPortfolioId,
            wabaId: readyConnection.wabaId,
            phoneNumberId:
              readyConnection.phoneNumberId,
            portfolioLimitKind,
            portfolioLimitValue:
              portfolioLimitKind ===
              "bounded"
                ? boundedLimit
                : null,
            reservationDurationSeconds,
            metaGraphApiVersion,
            evidenceDigest,
            evidenceCheckedAt,
            evidenceExpiresAt,
          },
        );

      applyResult(
        result,
        messages.approved,
      );
    });
  }

  function activateKillSwitch() {
    if (
      !record ||
      record.deliveryState !== "enabled" ||
      !window.confirm(
        messages.killSwitchConfirmation,
      )
    ) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result =
        await activateSystemAdminWhatsappDeliveryPolicyKillSwitchAction(
          {
            tenantId: readyConnection.tenantId,
            expectedConnectionVersion:
              readyConnection.version,
            expectedPolicyVersion:
              record.policyVersion,
          },
        );

      applyResult(
        result,
        messages.killSwitchActivated,
      );
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
          href={adminPath("/admin", language)}
          className="admin-brand"
          aria-label={messages.adminAriaLabel}
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
            pathname={`/admin/whatsapp-delivery-policy/${readyConnection.tenantId}`}
          />
          <span className="admin-security-badge">
            {messages.failClosed}
          </span>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-hero">
          <div>
            <span>{messages.eyebrow}</span>
            <h1>{messages.title}</h1>
            <p>
              {messages.description(
                readyConnection.tenantId,
              )}
            </p>
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

        {feedback ? (
          <p
            className={`admin-feedback ${feedback.tone}`}
            role={
              feedback.tone === "danger"
                ? "alert"
                : "status"
            }
            aria-live="polite"
          >
            {feedback.message}
          </p>
        ) : null}

        <section className="admin-decision-card">
          <header>
            <div>
              <small>
                {messages.connectionVersion(
                  readyConnection.version,
                )}
              </small>
              <h2>{messages.currentConnection}</h2>
              <p>
                {messages.connectionIdentifiers(
                  readyConnection.businessPortfolioId,
                  readyConnection.wabaId,
                  readyConnection.phoneNumberId,
                )}
              </p>
            </div>
            <span
              className={`admin-decision-runtime ${readyConnection.status === "connected" ? "ready" : "blocked"}`}
            >
              {readyConnection.status}
            </span>
          </header>

          {record ? (
            <div className="admin-decision-meta">
              <span>
                {messages.policyVersion(
                  record.policyVersion,
                )}
              </span>
              <span>
                {
                  messages.deliveryStates[
                    record.deliveryState
                  ]
                }
              </span>
              <span>
                {messages.evidenceExpires(
                  formatTimestamp(
                    record.evidenceExpiresAt,
                    messages.locale,
                  ),
                )}
              </span>
            </div>
          ) : (
            <p>
              {messages.noPolicy}
            </p>
          )}

          <form
            className="admin-decision-form admin-policy-form"
            onSubmit={approve}
          >
            <label>
              <span>{messages.messagingLimit}</span>
              <select
                name="portfolioLimitKind"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  {messages.chooseQuotaType}
                </option>
                <option value="bounded">
                  {messages.boundedQuota}
                </option>
                <option value="unlimited">
                  {messages.unlimitedQuota}
                </option>
              </select>
            </label>
            <label>
              <span>
                {messages.boundedQuotaValue}
              </span>
              <select
                name="portfolioLimitValue"
                defaultValue=""
              >
                <option value="" disabled>
                  {messages.chooseTier}
                </option>
                <option value="250">250</option>
                <option value="2000">2,000</option>
                <option value="10000">10,000</option>
                <option value="100000">100,000</option>
              </select>
            </label>
            <label>
              <span>
                {messages.reservationDuration}
              </span>
              <input
                name="reservationDurationSeconds"
                type="number"
                min="6"
                max="86400"
                step="1"
                required
              />
            </label>
            <label>
              <span>{messages.graphApiVersion}</span>
              <input
                name="metaGraphApiVersion"
                type="text"
                pattern="v[1-9][0-9]*\.[0-9]+"
                dir="ltr"
                required
              />
            </label>
            <label>
              <span>
                {messages.evidenceDigest}
              </span>
              <input
                name="evidenceDigest"
                type="text"
                pattern="[0-9a-f]{64}"
                minLength={64}
                maxLength={64}
                dir="ltr"
                required
              />
            </label>
            <label>
              <span>
                {messages.evidenceCheckedAt}
              </span>
              <input
                name="evidenceCheckedAt"
                type="datetime-local"
                step="1"
                required
              />
            </label>
            <label>
              <span>
                {messages.evidenceExpiresAt}
              </span>
              <input
                name="evidenceExpiresAt"
                type="datetime-local"
                step="1"
                required
              />
            </label>
            <div>
              <small>
                {messages.concurrencyHelp}
              </small>
              <button
                className="primary-button"
                disabled={
                  isPending ||
                  readyConnection.status !==
                    "connected"
                }
              >
                {isPending
                  ? messages.saving
                  : messages.approvePolicy}
              </button>
            </div>
          </form>

          <div className="admin-danger-zone">
            <strong>{messages.killSwitch}</strong>
            <p>{messages.killSwitchDescription}</p>
            <button
              type="button"
              className="admin-danger-button"
              disabled={
                isPending ||
                record?.deliveryState !==
                  "enabled"
              }
              onClick={activateKillSwitch}
            >
              {messages.blockCampaigns}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
