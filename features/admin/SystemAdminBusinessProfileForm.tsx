"use client";

import type {
  FormEvent,
} from "react";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  SystemAdminBusinessProfileView,
} from "../../shared/domain/systemAdminBusinessProfile.ts";
import {
  readSystemAdminBusinessProfileMessages,
} from "./systemAdminBusinessProfileMessages.ts";

export interface SystemAdminBusinessProfileDraft {
  expectedVersion: number;
  businessName: string;
  timezone: string;
  interfaceLanguage: InterfaceLanguage;
}

export function SystemAdminBusinessProfileForm({
  language,
  tenantId,
  profile,
  disabled,
  onSave,
}: {
  language: InterfaceLanguage;
  tenantId: number;
  profile:
    SystemAdminBusinessProfileView | null;
  disabled: boolean;
  onSave(
    draft:
      SystemAdminBusinessProfileDraft,
  ): void;
}) {
  const messages =
    readSystemAdminBusinessProfileMessages(
      language,
    );

  if (!profile) {
    return (
      <section
        className="admin-business-profile-missing"
        role="status"
      >
        <strong>{messages.missingTitle}</strong>
        <p>{messages.missingDescription}</p>
      </section>
    );
  }

  function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget,
    );
    const businessName =
      formData.get("businessName");
    const timezone =
      formData.get("timezone");
    const interfaceLanguage =
      formData.get("interfaceLanguage");

    if (
      !profile ||
      typeof businessName !== "string" ||
      typeof timezone !== "string" ||
      (interfaceLanguage !== "he" &&
        interfaceLanguage !== "en" &&
        interfaceLanguage !== "ar")
    ) {
      return;
    }

    onSave({
      expectedVersion: profile.version,
      businessName,
      timezone,
      interfaceLanguage,
    });
  }

  const timezoneListId =
    `admin-timezones-${tenantId}`;

  return (
    <form
      className="admin-business-profile-form"
      onSubmit={submit}
      key={`${tenantId}-${profile.version}`}
    >
      <header>
        <div>
          <strong>{messages.title}</strong>
          <small>
            {messages.version(
              profile.version,
              profile.updatedAt,
            )}
          </small>
        </div>
        <span>{messages.audit}</span>
      </header>
      <fieldset disabled={disabled}>
        <label>
          <span>{messages.businessName}</span>
          <input
            name="businessName"
            defaultValue={profile.businessName}
            autoComplete="organization"
            maxLength={500}
            required
          />
        </label>
        <label>
          <span>{messages.timezone}</span>
          <input
            name="timezone"
            defaultValue={profile.timezone}
            list={timezoneListId}
            maxLength={500}
            spellCheck={false}
            required
          />
          <datalist id={timezoneListId}>
            <option value="Asia/Jerusalem" />
            <option value="Europe/London" />
            <option value="America/New_York" />
          </datalist>
        </label>
        <label>
          <span>{messages.interfaceLanguage}</span>
          <select
            name="interfaceLanguage"
            defaultValue={
              profile.interfaceLanguage
            }
          >
            {Object.entries(
              messages.languageLabels,
            ).map(([value, label]) => (
              <option
                value={value}
                key={value}
              >
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          disabled={disabled}
        >
          {messages.save}
        </button>
      </fieldset>
    </form>
  );
}
