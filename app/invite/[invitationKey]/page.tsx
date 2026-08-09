import type {
  Metadata,
} from "next";
import Link from "next/link";

import {
  inspectClerkConfiguration,
} from "../../../server/auth/clerkConfiguration.ts";
import {
  requireTeamInvitationKey,
} from "../../../server/team/teamInvitationValidation.ts";

export const metadata: Metadata = {
  title: "הזמנה לצוות | Connect",
  description:
    "מסלול מאובטח לקבלת הזמנה לצוות Connect.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
  },
};

function isValidInvitationKey(
  value: unknown,
): boolean {
  try {
    requireTeamInvitationKey(
      value,
    );
    return true;
  } catch {
    return false;
  }
}

export default async function TeamInvitationPage({
  params,
}: {
  params: Promise<{
    invitationKey: string;
  }>;
}) {
  const {
    invitationKey,
  } = await params;
  const validKey =
    isValidInvitationKey(
      invitationKey,
    );
  const clerkConfigured =
    inspectClerkConfiguration()
      .status === "configured";
  const routeReady =
    validKey &&
    clerkConfigured;

  return (
    <main
      className="invitation-shell"
      dir="rtl"
    >
      <a
        className="skip-link"
        href="#invitation-content"
      >
        דילוג לתוכן הראשי
      </a>

      <section
        aria-labelledby="invitation-title"
        className="invitation-card"
        id="invitation-content"
        tabIndex={-1}
      >
        <Link
          aria-label="Connect - עמוד הבית"
          className="public-brand invitation-brand"
          href="/"
        >
          <span
            aria-hidden="true"
            className="brand-mark"
          >
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Connect</strong>
            <small>
              Team invitation
            </small>
          </span>
        </Link>

        <div className="invitation-heading">
          <span className="invitation-kicker">
            מסלול מאובטח
          </span>
          <h1 id="invitation-title">
            הזמנה להצטרף לצוות
          </h1>
          <p>
            הקבלה תתבצע רק לאחר אימות
            משתמש ואימייל בשרת. פרטי
            סביבת העבודה אינם נחשפים
            לפני האימות.
          </p>
        </div>

        <ol
          aria-label="שלבי קבלת ההזמנה"
          className="invitation-steps"
        >
          <li
            className={
              validKey
                ? "complete"
                : "blocked"
            }
          >
            <span aria-hidden="true">
              1
            </span>
            <div>
              <strong>
                בדיקת הקישור
              </strong>
              <small>
                {validKey
                  ? "מבנה הקישור תקין"
                  : "הקישור אינו תקין"}
              </small>
            </div>
          </li>
          <li
            className={
              clerkConfigured
                ? "pending"
                : "blocked"
            }
          >
            <span aria-hidden="true">
              2
            </span>
            <div>
              <strong>
                אימות זהות
              </strong>
              <small>
                אימות Clerk ואימייל
                ראשי
              </small>
            </div>
          </li>
          <li className="blocked">
            <span aria-hidden="true">
              3
            </span>
            <div>
              <strong>
                יצירת חברות
              </strong>
              <small>
                D1 ו־Audit אטומי
              </small>
            </div>
          </li>
        </ol>

        <div
          className="invitation-notice"
          id="invitation-action-status"
          role="status"
        >
          <span aria-hidden="true">
            !
          </span>
          <div>
            <strong>
              {validKey
                ? "קבלת ההזמנה עדיין אינה זמינה"
                : "לא ניתן להמשיך עם הקישור הזה"}
            </strong>
            <p>
              {routeReady
                ? "הפעלת הכפתור ממתינה לבדיקת Browser E2E מאומתת."
                : "המסלול נשאר חסום עד השלמת תצורת הזהות ובדיקת E2E מאומתת."}
            </p>
          </div>
        </div>

        <div className="invitation-actions">
          <button
            aria-describedby="invitation-action-status"
            className="primary-button"
            disabled
            type="button"
          >
            קבלת ההזמנה
          </button>
          <Link
            className="secondary-button"
            href="/"
          >
            חזרה לעמוד הבית
          </Link>
        </div>

        <p className="invitation-privacy-note">
          Connect אינו מציג בקישור
          פרטי Tenant, כתובת אימייל או
          מזהה משתמש.
        </p>
      </section>
    </main>
  );
}
