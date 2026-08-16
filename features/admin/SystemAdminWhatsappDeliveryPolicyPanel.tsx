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

const stateMessages: Record<
  Exclude<
    SystemAdminWhatsappDeliveryPolicyViewStatus,
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
      "נדרשות תצורות Clerk, System Admin ו־D1 לפני ניהול מדיניות שליחה.",
  },
  unauthenticated: {
    title: "נדרשת התחברות",
    description:
      "יש להתחבר עם זהות Clerk מורשית.",
  },
  "permission-denied": {
    title: "אין הרשאת System Admin",
    description:
      "רק זהות שנמצאת ב־Allowlist של השרת רשאית לשנות את המדיניות.",
  },
  "not-found": {
    title: "לא נמצא חיבור Meta",
    description:
      "ל־Tenant שנבחר אין חיבור Meta שממנו ניתן לגזור זהויות וגרסה.",
  },
  "server-error": {
    title: "לא ניתן לטעון את המדיניות",
    description:
      "הקריאה נכשלה באופן חסום ולא מוצגים ערכים חלופיים.",
  },
};

const actionMessages: Record<
  Exclude<
    SystemAdminWhatsappDeliveryPolicyActionResult["status"],
    "saved"
  >,
  string
> = {
  "configuration-required":
    "תצורת System Admin אינה מלאה.",
  unauthenticated:
    "ה־Session הסתיים. יש להתחבר מחדש.",
  "permission-denied":
    "אין לזהות הנוכחית הרשאת System Admin.",
  "invalid-input":
    "ה־Evidence או ערכי המדיניות אינם תקינים או אינם בתוקף.",
  "not-found":
    "חיבור Meta או מדיניות קודמת לא נמצאו.",
  "connection-not-ready":
    "חיבור Meta אינו במצב connected.",
  conflict:
    "גרסת החיבור או המדיניות השתנתה. יש לרענן לפני פעולה נוספת.",
  "server-error":
    "הפעולה נכשלה בשרת ולא נשמר שינוי חלקי.",
};

type Feedback = {
  tone: "success" | "danger";
  message: string;
} | null;

function AdminState({
  status,
}: {
  status: Exclude<
    SystemAdminWhatsappDeliveryPolicyViewStatus,
    "ready"
  >;
}) {
  const content = stateMessages[status];

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
): string {
  return new Intl.DateTimeFormat(
    "he-IL",
    {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "UTC",
    },
  ).format(new Date(value));
}

export function SystemAdminWhatsappDeliveryPolicyPanel({
  initialResult,
}: {
  initialResult:
    CurrentSystemAdminWhatsappDeliveryPolicy;
}) {
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
          actionMessages[result.status],
      });
      return;
    }

    setRecord(result.record);
    setFeedback({
      tone: "success",
      message:
        result.outcome === "unchanged"
          ? "המצב כבר היה שמור; לא נוצר אירוע כפול."
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
          "יש להשלים ערכי Evidence תקינים ומתוארכים ב־UTC.",
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
        "ה־Evidence אושר ונרשם כאירוע Immutable עם Audit.",
      );
    });
  }

  function activateKillSwitch() {
    if (
      !record ||
      record.deliveryState !== "enabled" ||
      !window.confirm(
        "להפעיל Kill Switch ולחסום מיד שליחת קמפיינים עבור Tenant זה?",
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
        "Kill Switch הופעל ונרשם ב־Audit.",
      );
    });
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link
          href="/admin"
          className="admin-brand"
          aria-label="Connect — ניהול מערכת"
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
        <span className="admin-security-badge">
          Fail-closed
        </span>
      </header>

      <div className="admin-content">
        <section className="admin-hero">
          <div>
            <span>WhatsApp Safety</span>
            <h1>מדיניות שליחת קמפיינים</h1>
            <p>
              אישור Evidence מתכלה והפעלת
              Kill Switch עבור Tenant #
              {readyConnection.tenantId}.
            </p>
          </div>
        </section>

        <section
          className="admin-decision-notice"
          role="note"
        >
          <strong>
            אין להזין Token, Secret או מספרי
            טלפון של נמענים.
          </strong>
          <p>
            מסך זה אינו מחבר את Meta sender.
            שליחה נשארת חסומה עד לחיבור נפרד
            ולבדיקות WABA מורשות.
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
                Connection version {readyConnection.version}
              </small>
              <h2>חיבור Meta נוכחי</h2>
              <p>
                Portfolio: {readyConnection.businessPortfolioId}
                {" · WABA: "}
                {readyConnection.wabaId}
                {" · Phone: "}
                {readyConnection.phoneNumberId}
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
                Policy v{record.policyVersion}
              </span>
              <span>
                {record.deliveryState}
              </span>
              <span>
                Evidence expires: {formatTimestamp(
                  record.evidenceExpiresAt,
                )} UTC
              </span>
            </div>
          ) : (
            <p>
              טרם נשמרה מדיניות. ללא מדיניות
              פעילה המערכת נכשלת סגור.
            </p>
          )}

          <form
            className="admin-decision-form admin-policy-form"
            onSubmit={approve}
          >
            <label>
              <span>Messaging limit</span>
              <select
                name="portfolioLimitKind"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  בחירת סוג מכסה
                </option>
                <option value="bounded">
                  מכסה מוגבלת
                </option>
                <option value="unlimited">
                  Unlimited
                </option>
              </select>
            </label>
            <label>
              <span>
                ערך מכסה מוגבלת
              </span>
              <select
                name="portfolioLimitValue"
                defaultValue=""
              >
                <option value="" disabled>
                  בחירת Tier
                </option>
                <option value="250">250</option>
                <option value="2000">2,000</option>
                <option value="10000">10,000</option>
                <option value="100000">100,000</option>
              </select>
            </label>
            <label>
              <span>
                Reservation duration בשניות
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
              <span>Meta Graph API version</span>
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
                Evidence SHA-256 digest
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
                Evidence checked at (UTC)
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
                Evidence expires at (UTC)
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
                השמירה דורשת גרסת Connection
                ו־Policy מדויקות.
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
                  ? "שומר…"
                  : "אישור Evidence והפעלת Policy"}
              </button>
            </div>
          </form>

          <div className="admin-danger-zone">
            <strong>Kill Switch</strong>
            <p>
              יוצר אירוע disabled חדש ואינו
              משנה את ה־Evidence שאושר.
            </p>
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
              חסימת שליחת קמפיינים
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
