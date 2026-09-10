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
  readWorkspaceShellMessages,
} from "../../shared/i18n/workspace";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";

const TenantWorkspaceContext =
  createContext<TenantSelectionDirectory | null>(
    null,
  );

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
  language,
}: {
  connectionStatus: string;
  language: InterfaceLanguage;
}) {
  const directory = useContext(
    TenantWorkspaceContext,
  );
  const router = useRouter();
  const messages =
    readWorkspaceShellMessages(language).tenant;
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
    messages.disconnectedWorkspace;
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
    setMessage(messages.saving);
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
        setMessage(messages.switched);
        router.refresh();
        return;
      }

      setSelectedKey(null);
      setMessage(
        messages.failures[
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
              {messages.switchLabel}
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
                      messages.roles[
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
          aria-label={messages.accountSettingsAriaLabel}
          aria-describedby="unavailable-navigation-actions"
          title={messages.accountSettingsUnavailableTitle}
          disabled
        >
          •••
        </button>
      ) : null}
    </div>
  );
}
