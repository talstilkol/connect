"use client";

import { useClerk } from "@clerk/nextjs";
import { selectTenantWithOrganization } from "./tenantOrganizationSelection.ts";

import {
  useState,
  useTransition,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  selectTenantAction,
} from "../../server/auth/tenantSelectionActions.ts";
import type {
  TenantSelectionDirectory,
} from "../../server/auth/tenantSelectionService.ts";
import {
  readWorkspaceDirection,
  readWorkspaceLanguage,
  readWorkspaceShellMessages,
  type WorkspaceShellMessages,
} from "../../shared/i18n/workspace.ts";

export default function TenantSelectionGate({
  directory,
}: {
  directory:
    TenantSelectionDirectory;
}) {
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const languageValues = searchParams.getAll("lang");
  // Match page searchParams validation: repeated language keys fall back to Hebrew.
  const language = readWorkspaceLanguage(
    languageValues.length === 1 ? languageValues[0] : undefined,
  );
  const direction = readWorkspaceDirection(language);
  const messages = readWorkspaceShellMessages(language).tenant;
  const [
    selectedKey,
    setSelectedKey,
  ] = useState<string | null>(null);
  const [
    failureStatus,
    setFailureStatus,
  ] = useState<keyof WorkspaceShellMessages["tenant"]["failures"] | null>(null);
  const message = failureStatus ? messages.failures[failureStatus] : null;
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
    setFailureStatus(null);
    startTransition(async () => {
      const result =
        await selectTenantWithOrganization({
          selectionKey,
          expectedVersion:
            directory.version,
        }, {
          select: selectTenantAction,
          activate: (organization) => clerk.setActive({ organization }),
        });

      if (
        result.status === "selected"
      ) {
        window.location.reload();
        return;
      }

      setSelectedKey(null);
      setFailureStatus(result.status);
      if (["conflict", "temporarily-unavailable", "server-error"].includes(result.status)) {
        router.refresh();
      }
    });
  };

  return (
    <main
      className="tenant-selection-page"
      lang={language}
      dir={direction}
    >
      <section
        className="tenant-selection-card"
        aria-labelledby="tenant-selection-title"
      >
        <p className="card-kicker">
          {messages.selectionLabel}
        </p>
        <h1 id="tenant-selection-title">
          {messages.selectionTitle}
        </h1>
        <p>
          {messages.selectionDescription}
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
                      messages.roles[
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
                    : direction === "rtl" ? "←" : "→"}
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
