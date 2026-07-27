"use client";

import {
  useState,
  useTransition,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  selectTenantAction,
} from "../../server/auth/tenantSelectionActions.ts";
import type {
  TenantSelectionDirectory,
} from "../../server/auth/tenantSelectionService.ts";
import {
  roleLabels,
} from "../../shared/domain/model.ts";

const failureMessages = {
  "configuration-required":
    "מערכת ההזדהות עדיין אינה מוגדרת.",
  unauthenticated:
    "יש להתחבר מחדש כדי לבחור סביבת עבודה.",
  "onboarding-required":
    "לא נמצאה סביבת עבודה זמינה עבור המשתמש.",
  "selection-required":
    "סביבת העבודה שנבחרה אינה זמינה עוד.",
  conflict:
    "הבחירה השתנתה בחלון אחר. נא לרענן ולנסות שוב.",
  "rate-limited":
    "בוצעו יותר מדי ניסיונות. נא להמתין לפני ניסיון נוסף.",
  "temporarily-unavailable":
    "בחירת סביבת העבודה אינה זמינה כרגע.",
  "server-error":
    "לא ניתן לשמור את הבחירה כרגע.",
  "validation-error":
    "הבחירה שנשלחה אינה תקינה.",
} as const;

export default function TenantSelectionGate({
  directory,
}: {
  directory:
    TenantSelectionDirectory;
}) {
  const router = useRouter();
  const [
    selectedKey,
    setSelectedKey,
  ] = useState<string | null>(null);
  const [
    message,
    setMessage,
  ] = useState<string | null>(null);
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const selectTenant = (
    selectionKey: string,
  ) => {
    if (isPending) {
      return;
    }

    setSelectedKey(selectionKey);
    setMessage(null);
    startTransition(async () => {
      const result =
        await selectTenantAction({
          selectionKey,
          expectedVersion:
            directory.version,
        });

      if (
        result.status === "selected"
      ) {
        router.refresh();
        return;
      }

      setSelectedKey(null);
      setMessage(
        failureMessages[
          result.status
        ],
      );
    });
  };

  return (
    <main
      className="tenant-selection-page"
      dir="rtl"
    >
      <section
        className="tenant-selection-card"
        aria-labelledby="tenant-selection-title"
      >
        <p className="card-kicker">
          בחירת סביבת עבודה
        </p>
        <h1 id="tenant-selection-title">
          לאיזו סביבת עבודה להיכנס?
        </h1>
        <p>
          המשתמש שלך משויך למספר סביבות.
          הבחירה נשמרת בשרת וניתן לשנותה
          בהמשך.
        </p>

        <div
          className="tenant-selection-options"
          aria-describedby={
            message
              ? "tenant-selection-message"
              : undefined
          }
        >
          {directory.options.map(
            (option) => (
              <button
                className="tenant-selection-option"
                disabled={isPending}
                key={
                  option.selectionKey
                }
                onClick={() =>
                  selectTenant(
                    option.selectionKey,
                  )
                }
                aria-busy={
                  selectedKey ===
                    option.selectionKey &&
                  isPending
                }
                type="button"
              >
                <span>
                  <strong>
                    {
                      option.displayName
                    }
                  </strong>
                  <small>
                    {
                      roleLabels[
                        option.role
                      ]
                    }
                  </small>
                </span>
                <span aria-hidden="true">
                  {selectedKey ===
                    option.selectionKey &&
                  isPending
                    ? "…"
                    : "←"}
                </span>
              </button>
            ),
          )}
        </div>

        <p
          aria-live="polite"
          className="tenant-selection-message"
          id="tenant-selection-message"
        >
          {message}
        </p>
      </section>
    </main>
  );
}
