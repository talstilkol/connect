"use client";

import Link from "next/link";
import {
  useActionState,
} from "react";

import type {
  TeamInvitationAcceptanceActionResult,
} from "../../../shared/domain/teamInvitationView.ts";

interface InvitationAcceptanceFormProps {
  action(
    previousResult:
      TeamInvitationAcceptanceActionResult | null,
    formData: FormData,
  ): Promise<TeamInvitationAcceptanceActionResult>;
}

function messageForResult(
  result:
    TeamInvitationAcceptanceActionResult | null,
): {
  heading: string;
  description: string;
  complete: boolean;
} {
  switch (result?.status) {
    case "accepted":
      return {
        heading: "ההצטרפות לצוות הושלמה",
        description:
          "החברות נוצרה ונרשמה ביומן הבקרה.",
        complete: true,
      };
    case "already-accepted":
      return {
        heading: "ההזמנה כבר התקבלה",
        description:
          "אין צורך לבצע את הפעולה פעם נוספת.",
        complete: true,
      };
    case "identity-verification-required":
      return {
        heading: "נדרש אימות זהות",
        description:
          "יש להתחבר עם כתובת האימייל הראשית והמאומתת שאליה נשלחה ההזמנה.",
        complete: false,
      };
    case "invitation-unavailable":
    case "invalid-input":
      return {
        heading: "לא ניתן לקבל את ההזמנה",
        description:
          "הקישור אינו זמין או שאינו מתאים למשתמש המחובר.",
        complete: false,
      };
    case "temporarily-unavailable":
    case "configuration-required":
    case "server-error":
      return {
        heading: "הפעולה אינה זמינה כרגע",
        description:
          "לא בוצע שינוי. אפשר לנסות שוב מאוחר יותר.",
        complete: false,
      };
    default:
      return {
        heading: "אפשר לאמת ולקבל את ההזמנה",
        description:
          "השרת יאמת את המשתמש ואת האימייל לפני יצירת החברות.",
        complete: false,
      };
  }
}

export function InvitationAcceptanceForm({
  action,
}: InvitationAcceptanceFormProps) {
  const [result, formAction, pending] =
    useActionState(action, null);
  const message =
    messageForResult(result);

  return (
    <>
      <div
        aria-live="polite"
        className="invitation-notice"
        id="invitation-action-status"
        role="status"
      >
        <span aria-hidden="true">
          {message.complete ? "✓" : "!"}
        </span>
        <div>
          <strong>{message.heading}</strong>
          <p>{message.description}</p>
        </div>
      </div>

      <div className="invitation-actions">
        <form action={formAction}>
          <button
            aria-describedby="invitation-action-status"
            className="primary-button"
            disabled={
              pending || message.complete
            }
            type="submit"
          >
            {pending
              ? "מאמת את ההזמנה…"
              : "קבלת ההזמנה"}
          </button>
        </form>
        <Link
          className="secondary-button"
          href="/"
        >
          חזרה לעמוד הבית
        </Link>
      </div>
    </>
  );
}
