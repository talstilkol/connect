"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
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

const TenantWorkspaceContext =
  createContext<TenantSelectionDirectory | null>(
    null,
  );

const failureMessages = {
  "configuration-required":
    "החלפת סביבת העבודה אינה מוגדרת.",
  unauthenticated:
    "יש להתחבר מחדש כדי להחליף סביבת עבודה.",
  "onboarding-required":
    "לא נמצאה סביבת עבודה זמינה.",
  "selection-required":
    "סביבת העבודה אינה זמינה עוד.",
  conflict:
    "הבחירה השתנתה. הנתונים נטענים מחדש.",
  "rate-limited":
    "בוצעו יותר מדי ניסיונות. נא להמתין.",
  "temporarily-unavailable":
    "החלפת סביבת העבודה אינה זמינה כרגע.",
  "server-error":
    "לא ניתן לשמור את הבחירה כרגע.",
  "validation-error":
    "הבחירה שנשלחה אינה תקינה.",
} as const;

export function TenantWorkspaceProvider({
  children,
  directory,
}: {
  children: ReactNode;
  directory:
    TenantSelectionDirectory | null;
}) {
  return (
    <TenantWorkspaceContext.Provider
      value={directory}
    >
      {children}
    </TenantWorkspaceContext.Provider>
  );
}

export function TenantWorkspaceSwitcher({
  connectionStatus,
}: {
  connectionStatus: string;
}) {
  const directory = useContext(
    TenantWorkspaceContext,
  );
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
  const currentOption =
    directory?.options.find(
      (option) => option.selected,
    ) ??
    (directory?.options.length === 1
      ? directory.options[0]
      : null);
  const canSwitch =
    (directory?.options.length ?? 0) >
    1;
  const effectiveSelectionKey =
    selectedKey ??
    currentOption?.selectionKey ??
    "";
  const displayName =
    currentOption?.displayName ??
    "סביבת עבודה לא מחוברת";
  const avatar =
    Array.from(displayName.trim())[0] ??
    "C";

  const switchWorkspace = (
    selectionKey: string,
  ) => {
    if (
      !directory ||
      isPending ||
      selectionKey.length === 0 ||
      selectionKey ===
        currentOption?.selectionKey
    ) {
      return;
    }

    setSelectedKey(selectionKey);
    setMessage(
      "שומר את סביבת העבודה…",
    );
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
        setMessage(
          "סביבת העבודה הוחלפה.",
        );
        router.refresh();
        return;
      }

      setSelectedKey(null);
      setMessage(
        failureMessages[
          result.status
        ],
      );

      if (
        result.status ===
          "conflict" ||
        result.status ===
          "selection-required"
      ) {
        router.refresh();
      }
    });
  };

  return (
    <div className="sidebar-footer tenant-workspace-switcher">
      <div
        className="workspace-avatar"
        aria-hidden="true"
      >
        {avatar}
      </div>
      <div className="workspace-switcher-copy">
        {canSwitch ? (
          <>
            <label
              className="sr-only"
              htmlFor="tenant-workspace-select"
            >
              החלפת סביבת עבודה
            </label>
            <select
              aria-describedby="tenant-workspace-status"
              disabled={isPending}
              id="tenant-workspace-select"
              onChange={(event) =>
                switchWorkspace(
                  event.target.value,
                )
              }
              value={
                effectiveSelectionKey
              }
            >
              {directory?.options.map(
                (option) => (
                  <option
                    key={
                      option.selectionKey
                    }
                    value={
                      option.selectionKey
                    }
                  >
                    {option.displayName}
                    {" — "}
                    {
                      roleLabels[
                        option.role
                      ]
                    }
                  </option>
                ),
              )}
            </select>
          </>
        ) : (
          <strong>{displayName}</strong>
        )}
        <small>{connectionStatus}</small>
        <span
          aria-live="polite"
          className="workspace-switcher-message"
          id="tenant-workspace-status"
        >
          {message}
        </span>
      </div>
      {!canSwitch ? (
        <button
          type="button"
          className="icon-button"
          aria-label="הגדרות חשבון"
          aria-describedby="unavailable-navigation-actions"
          title="הגדרות החשבון עדיין אינן זמינות"
          disabled
        >
          •••
        </button>
      ) : null}
    </div>
  );
}
