"use client";

import Link from "next/link";
import {
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import type {
  SystemAdminTenantDirectoryPage,
  SystemAdminTenantDirectoryStatus,
  SystemAdminTenantRecord,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import type {
  TenantSubscriptionAdminView,
} from "../../shared/domain/tenantSubscriptionAdminView.ts";
import {
  loadSystemAdminTenantDirectoryAction,
} from "../../server/admin/systemAdminTenantDirectoryActions.ts";
import {
  cancelTenantSubscriptionAdminAction,
  changeTenantSubscriptionStatusAdminAction,
  createTenantSubscriptionAdminAction,
  extendTenantSubscriptionAdminAction,
} from "../../server/billing/systemAdminSubscriptionActions.ts";
import type {
  SystemAdminSubscriptionActionResult,
} from "../../server/billing/systemAdminSubscriptionActionResult.ts";
import {
  updateBusinessProfileAdminAction,
} from "../../server/admin/systemAdminBusinessProfileActions.ts";
import type {
  SystemAdminBusinessProfileActionResult,
} from "../../server/admin/systemAdminBusinessProfileActionResult.ts";
import type {
  SystemAdminBusinessProfileView,
} from "../../shared/domain/systemAdminBusinessProfile.ts";
import {
  SystemAdminBusinessProfileForm,
  type SystemAdminBusinessProfileDraft,
} from "./SystemAdminBusinessProfileForm.tsx";

const directoryStatusMessages: Record<
  Exclude<
    SystemAdminTenantDirectoryStatus,
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
      "נדרשות תצורות Clerk, ‏System Admin ו־D1 מלאות לפני טעינת Tenants.",
  },
  unauthenticated: {
    title: "נדרשת התחברות",
    description:
      "יש להתחבר עם זהות Clerk מורשית לפני כניסה לסביבת Admin.",
  },
  "permission-denied": {
    title: "אין הרשאת System Admin",
    description:
      "הזהות המחוברת אינה נמצאת ב־Allowlist השרת של מנהלי המערכת.",
  },
  "server-error": {
    title: "לא ניתן לטעון את סביבת Admin",
    description:
      "הקריאה נכשלה באופן חסום. לא מוצגים נתונים חלופיים.",
  },
};

const actionMessages: Record<
  Exclude<
    SystemAdminSubscriptionActionResult["status"],
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
    "פרטי הפעולה אינם תקינים.",
  "not-found":
    "ה־Tenant או המנוי אינם קיימים.",
  conflict:
    "המנוי השתנה מאז הטעינה. יש לרענן את הרשימה.",
  "invalid-transition":
    "המעבר המבוקש אינו מותר במצב הנוכחי.",
  "server-error":
    "הפעולה נכשלה בשרת ולא נשמר שינוי חלקי.",
};

const profileActionMessages: Record<
  Exclude<
    SystemAdminBusinessProfileActionResult["status"],
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
    "פרטי העסק אינם תקינים.",
  "not-found":
    "ה־Tenant או הפרופיל העסקי אינם קיימים.",
  conflict:
    "פרטי העסק השתנו מאז הטעינה. יש לרענן את הרשימה.",
  "server-error":
    "עדכון פרטי העסק נכשל ולא נשמר שינוי חלקי.",
};

const tenantStatusLabels = {
  trial: "ניסיון",
  active: "פעיל",
  payment_failed: "כשל תשלום",
  suspended: "מושהה",
  cancelled: "מבוטל",
  expired: "פג תוקף",
  blocked: "חסום",
} as const;

type Feedback = {
  tone: "success" | "danger";
  message: string;
} | null;

function formatDateTime(
  value: string,
): string {
  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "he-IL",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "UTC",
    },
  ).format(parsed);
}

function dateInputValue(
  value: string,
): string {
  return value.slice(0, 10);
}

function canonicalUtcDate(
  value: FormDataEntryValue | null,
): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const timestamp = `${value}T00:00:00.000Z`;

  return new Date(timestamp).toISOString() ===
    timestamp
    ? timestamp
    : null;
}

function replaceSubscription(
  tenants:
    readonly SystemAdminTenantRecord[],
  tenantId: number,
  subscription:
    TenantSubscriptionAdminView,
): SystemAdminTenantRecord[] {
  return tenants.map((tenant) =>
    tenant.tenantId === tenantId
      ? {
          ...tenant,
          tenantStatus:
            subscription.status,
          subscription,
        }
      : tenant,
  );
}

function replaceBusinessProfile(
  tenants:
    readonly SystemAdminTenantRecord[],
  tenantId: number,
  businessProfile:
    SystemAdminBusinessProfileView,
): SystemAdminTenantRecord[] {
  return tenants.map((tenant) =>
    tenant.tenantId === tenantId
      ? {
          ...tenant,
          displayName:
            businessProfile.businessName,
          businessProfile,
        }
      : tenant,
  );
}

function AdminState({
  status,
}: {
  status: Exclude<
    SystemAdminTenantDirectoryStatus,
    "ready"
  >;
}) {
  const content =
    directoryStatusMessages[status];

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
        <Link href="/" className="secondary-button">
          חזרה לעמוד הראשי
        </Link>
      </section>
    </main>
  );
}

function SubscriptionSummary({
  subscription,
}: {
  subscription:
    TenantSubscriptionAdminView;
}) {
  return (
    <dl className="admin-subscription-summary">
      <div>
        <dt>תחילת תקופה</dt>
        <dd>
          {formatDateTime(
            subscription.startsAt,
          )}
          {" UTC"}
        </dd>
      </div>
      <div>
        <dt>סיום תקופה</dt>
        <dd>
          {formatDateTime(
            subscription.endsAt,
          )}
          {" UTC"}
        </dd>
      </div>
      <div>
        <dt>גרסה</dt>
        <dd>{subscription.version}</dd>
      </div>
      <div>
        <dt>עדכון אחרון</dt>
        <dd>
          {formatDateTime(
            subscription.updatedAt,
          )}
        </dd>
      </div>
    </dl>
  );
}

export function SystemAdminTenantPanel({
  initialStatus,
  initialDirectory,
}: {
  initialStatus:
    SystemAdminTenantDirectoryStatus;
  initialDirectory:
    SystemAdminTenantDirectoryPage;
}) {
  const [tenants, setTenants] =
    useState([
      ...initialDirectory.tenants,
    ]);
  const [nextCursor, setNextCursor] =
    useState(
      initialDirectory.nextCursor,
    );
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] =
    useState<Feedback>(null);
  const [isPending, startTransition] =
    useTransition();

  const visibleTenants = useMemo(() => {
    const normalizedQuery =
      query.trim().toLocaleLowerCase(
        "he-IL",
      );

    if (!normalizedQuery) {
      return tenants;
    }

    return tenants.filter(
      (tenant) =>
        tenant.displayName
          .toLocaleLowerCase("he-IL")
          .includes(normalizedQuery) ||
        String(tenant.tenantId).includes(
          normalizedQuery,
        ),
    );
  }, [query, tenants]);

  const subscriptionCount =
    tenants.filter(
      (tenant) =>
        tenant.subscription !== null,
    ).length;
  const activeCount = tenants.filter(
    (tenant) =>
      tenant.subscription?.status ===
      "active",
  ).length;

  if (initialStatus !== "ready") {
    return (
      <AdminState status={initialStatus} />
    );
  }

  function applyMutation(
    tenantId: number,
    operation:
      () => Promise<SystemAdminSubscriptionActionResult>,
    successMessage: string,
  ) {
    setFeedback(null);

    startTransition(async () => {
      const result = await operation();

      if (result.status !== "saved") {
        setFeedback({
          tone: "danger",
          message:
            actionMessages[result.status],
        });
        return;
      }

      setTenants((current) =>
        replaceSubscription(
          current,
          tenantId,
          result.subscription,
        ),
      );
      setFeedback({
        tone: "success",
        message: successMessage,
      });
    });
  }

  function updateBusinessProfile(
    tenantId: number,
    draft:
      SystemAdminBusinessProfileDraft,
  ) {
    setFeedback(null);

    startTransition(async () => {
      const result =
        await updateBusinessProfileAdminAction(
          {
            tenantId,
            ...draft,
          },
        );

      if (result.status !== "saved") {
        setFeedback({
          tone: "danger",
          message:
            profileActionMessages[
              result.status
            ],
        });
        return;
      }

      setTenants((current) =>
        replaceBusinessProfile(
          current,
          tenantId,
          result.profile,
        ),
      );
      setFeedback({
        tone: "success",
        message:
          result.outcome === "updated"
            ? "פרטי העסק עודכנו ונרשמו ב־Audit."
            : "פרטי העסק כבר היו מעודכנים; לא נוצר אירוע כפול.",
      });
    });
  }

  function createSubscription(
    tenantId: number,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget,
    );
    const startsAt = canonicalUtcDate(
      formData.get("startsAt"),
    );
    const endsAt = canonicalUtcDate(
      formData.get("endsAt"),
    );
    const status =
      formData.get("status");

    if (
      !startsAt ||
      !endsAt ||
      (status !== "trial" &&
        status !== "active")
    ) {
      setFeedback({
        tone: "danger",
        message:
          "יש לבחור תקופה ומצב התחלה תקינים.",
      });
      return;
    }

    applyMutation(
      tenantId,
      () =>
        createTenantSubscriptionAdminAction(
          {
            tenantId,
            status,
            startsAt,
            endsAt,
          },
        ),
      "המנוי נוצר ונרשם ב־Audit.",
    );
  }

  function extendSubscription(
    tenant: SystemAdminTenantRecord,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!tenant.subscription) {
      return;
    }

    const formData = new FormData(
      event.currentTarget,
    );
    const newEndsAt = canonicalUtcDate(
      formData.get("newEndsAt"),
    );

    if (!newEndsAt) {
      setFeedback({
        tone: "danger",
        message:
          "יש לבחור תאריך סיום תקין.",
      });
      return;
    }

    applyMutation(
      tenant.tenantId,
      () =>
        extendTenantSubscriptionAdminAction(
          {
            tenantId: tenant.tenantId,
            expectedVersion:
              tenant.subscription?.version,
            newEndsAt,
          },
        ),
      "תקופת המנוי הוארכה.",
    );
  }

  function changeStatus(
    tenant: SystemAdminTenantRecord,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!tenant.subscription) {
      return;
    }

    const formData = new FormData(
      event.currentTarget,
    );
    const status = formData.get("status");

    if (
      status !== "active" &&
      status !== "suspended" &&
      status !== "blocked"
    ) {
      setFeedback({
        tone: "danger",
        message:
          "יש לבחור מצב תפעולי תקין.",
      });
      return;
    }

    applyMutation(
      tenant.tenantId,
      () =>
        changeTenantSubscriptionStatusAdminAction(
          {
            tenantId: tenant.tenantId,
            expectedVersion:
              tenant.subscription?.version,
            status,
          },
        ),
      "מצב המנוי עודכן.",
    );
  }

  function cancelSubscription(
    tenant: SystemAdminTenantRecord,
  ) {
    if (
      !tenant.subscription ||
      !window.confirm(
        `לבטל את המנוי של ${tenant.displayName}? לא ניתן לבטל פעולה זו דרך המסך.`,
      )
    ) {
      return;
    }

    applyMutation(
      tenant.tenantId,
      () =>
        cancelTenantSubscriptionAdminAction(
          {
            tenantId: tenant.tenantId,
            expectedVersion:
              tenant.subscription?.version,
          },
        ),
      "המנוי בוטל.",
    );
  }

  function loadMore() {
    if (nextCursor === null) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result =
        await loadSystemAdminTenantDirectoryAction(
          {
            afterTenantId: nextCursor,
          },
        );

      if (result.status !== "loaded") {
        setFeedback({
          tone: "danger",
          message:
            result.status ===
            "invalid-input"
              ? "Cursor הרשימה אינו תקין."
              : result.status ===
                  "permission-denied"
                ? "אין הרשאת System Admin."
                : result.status ===
                    "unauthenticated"
                  ? "ה־Session הסתיים. יש להתחבר מחדש."
                  : result.status ===
                      "configuration-required"
                    ? "תצורת System Admin אינה מלאה."
                    : "טעינת העמוד הבא נכשלה.",
        });
        return;
      }

      setTenants((current) => {
        const existingIds = new Set(
          current.map(
            (tenant) => tenant.tenantId,
          ),
        );

        return [
          ...current,
          ...result.directory.tenants.filter(
            (tenant) =>
              !existingIds.has(
                tenant.tenantId,
              ),
          ),
        ];
      });
      setNextCursor(
        result.directory.nextCursor,
      );
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
            הרשאת שרת פעילה
          </span>
          <Link
            href="/admin/decisions"
            className="secondary-button"
          >
            החלטות Production
          </Link>
          <Link
            href="/workspace"
            className="secondary-button"
          >
            סביבת לקוח
          </Link>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-hero">
          <div>
            <span>ניהול מערכת</span>
            <h1>Tenants ומנויים</h1>
            <p>
              פעולות המנוי מתבצעות דרך
              System Admin Session ונרשמות
              אטומית ב־Audit Log.
            </p>
          </div>
          <div className="admin-stat-grid">
            <article>
              <small>Tenants שנטענו</small>
              <strong>{tenants.length}</strong>
            </article>
            <article>
              <small>עם מנוי</small>
              <strong>
                {subscriptionCount}
              </strong>
            </article>
            <article>
              <small>מנויים פעילים</small>
              <strong>{activeCount}</strong>
            </article>
          </div>
        </section>

        <section className="admin-directory-toolbar">
          <label>
            <span>חיפוש בתוצאות שנטענו</span>
            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="שם Tenant או מזהה"
            />
          </label>
          <span>
            {visibleTenants.length} תוצאות
          </span>
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

        {tenants.length === 0 ? (
          <section
            className="admin-empty-state"
            role="status"
          >
            <h2>אין Tenants להצגה</h2>
            <p>
              D1 החזיר רשימה ריקה. לא נוספו
              נתוני תצוגה חלופיים.
            </p>
          </section>
        ) : visibleTenants.length === 0 ? (
          <section
            className="admin-empty-state"
            role="status"
          >
            <h2>לא נמצאה התאמה</h2>
            <p>
              ניתן לנקות את שדה החיפוש כדי
              להציג את הרשומות שנטענו.
            </p>
          </section>
        ) : (
          <section className="admin-tenant-list">
            {visibleTenants.map(
              (tenant) => (
                <article
                  className="admin-tenant-card"
                  key={tenant.tenantId}
                >
                  <div className="admin-tenant-heading">
                    <div>
                      <small>
                        Tenant #
                        {tenant.tenantId}
                      </small>
                      <h2>
                        {tenant.displayName}
                      </h2>
                    </div>
                    <div className="admin-tenant-heading-actions">
                      <Link
                        className="secondary-button"
                        href={`/admin/whatsapp-delivery-policy/${tenant.tenantId}`}
                      >
                        מדיניות WhatsApp
                      </Link>
                      <span
                        className={`admin-status ${tenant.tenantStatus}`}
                      >
                        {
                          tenantStatusLabels[
                            tenant.tenantStatus
                          ]
                        }
                      </span>
                    </div>
                  </div>

                  <SystemAdminBusinessProfileForm
                    tenantId={tenant.tenantId}
                    profile={
                      tenant.businessProfile
                    }
                    disabled={isPending}
                    onSave={(draft) =>
                      updateBusinessProfile(
                        tenant.tenantId,
                        draft,
                      )
                    }
                  />

                  {tenant.subscription ? (
                    <>
                      <SubscriptionSummary
                        subscription={
                          tenant.subscription
                        }
                      />
                      <div className="admin-mutation-grid">
                        <form
                          onSubmit={(event) =>
                            extendSubscription(
                              tenant,
                              event,
                            )
                          }
                        >
                          <strong>
                            הארכת תקופה
                          </strong>
                          <label>
                            <span>
                              תאריך סיום חדש
                              (UTC)
                            </span>
                            <input
                              name="newEndsAt"
                              type="date"
                              min={dateInputValue(
                                tenant
                                  .subscription
                                  .endsAt,
                              )}
                              defaultValue={dateInputValue(
                                tenant
                                  .subscription
                                  .endsAt,
                              )}
                              required
                            />
                          </label>
                          <button
                            className="secondary-button"
                            disabled={isPending}
                          >
                            הארכת מנוי
                          </button>
                        </form>

                        <form
                          onSubmit={(event) =>
                            changeStatus(
                              tenant,
                              event,
                            )
                          }
                        >
                          <strong>
                            מצב תפעולי
                          </strong>
                          <label>
                            <span>
                              מצב יעד
                            </span>
                            <select
                              name="status"
                              defaultValue={
                                tenant
                                  .subscription
                                  .status ===
                                  "active" ||
                                tenant
                                  .subscription
                                  .status ===
                                  "suspended" ||
                                tenant
                                  .subscription
                                  .status ===
                                  "blocked"
                                  ? tenant
                                      .subscription
                                      .status
                                  : "active"
                              }
                            >
                              <option value="active">
                                פעיל
                              </option>
                              <option value="suspended">
                                מושהה
                              </option>
                              <option value="blocked">
                                חסום
                              </option>
                            </select>
                          </label>
                          <button
                            className="secondary-button"
                            disabled={isPending}
                          >
                            עדכון מצב
                          </button>
                        </form>

                        <div className="admin-danger-zone">
                          <strong>
                            ביטול
                          </strong>
                          <p>
                            ביטול הוא מצב סופי
                            במסלול הידני.
                          </p>
                          <button
                            type="button"
                            className="admin-danger-button"
                            disabled={
                              isPending ||
                              tenant
                                .subscription
                                .status ===
                                "cancelled"
                            }
                            onClick={() =>
                              cancelSubscription(
                                tenant,
                              )
                            }
                          >
                            ביטול מנוי
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <form
                      className="admin-create-subscription"
                      onSubmit={(event) =>
                        createSubscription(
                          tenant.tenantId,
                          event,
                        )
                      }
                    >
                      <div>
                        <strong>
                          יצירת מנוי ידני
                        </strong>
                        <p>
                          אין ל־Tenant רשומת
                          מנוי.
                        </p>
                      </div>
                      <label>
                        <span>מצב התחלה</span>
                        <select
                          name="status"
                          defaultValue="trial"
                        >
                          <option value="trial">
                            ניסיון
                          </option>
                          <option value="active">
                            פעיל
                          </option>
                        </select>
                      </label>
                      <label>
                        <span>
                          תחילת תקופה (UTC)
                        </span>
                        <input
                          name="startsAt"
                          type="date"
                          required
                        />
                      </label>
                      <label>
                        <span>
                          סיום תקופה (UTC)
                        </span>
                        <input
                          name="endsAt"
                          type="date"
                          required
                        />
                      </label>
                      <button
                        className="primary-button"
                        disabled={isPending}
                      >
                        יצירת מנוי
                      </button>
                    </form>
                  )}
                </article>
              ),
            )}
          </section>
        )}

        {nextCursor !== null ? (
          <button
            type="button"
            className="admin-load-more secondary-button"
            onClick={loadMore}
            disabled={isPending}
          >
            {isPending
              ? "טוען…"
              : "טעינת 50 Tenants נוספים"}
          </button>
        ) : tenants.length > 0 ? (
          <p className="admin-list-end">
            כל ה־Tenants הזמינים נטענו.
          </p>
        ) : null}
      </div>
    </main>
  );
}
