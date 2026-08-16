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

export interface SystemAdminBusinessProfileDraft {
  expectedVersion: number;
  businessName: string;
  timezone: string;
  interfaceLanguage: InterfaceLanguage;
}

const interfaceLanguageLabels = {
  he: "עברית",
  en: "English",
  ar: "العربية",
} as const;

export function SystemAdminBusinessProfileForm({
  tenantId,
  profile,
  disabled,
  onSave,
}: {
  tenantId: number;
  profile:
    SystemAdminBusinessProfileView | null;
  disabled: boolean;
  onSave(
    draft:
      SystemAdminBusinessProfileDraft,
  ): void;
}) {
  if (!profile) {
    return (
      <section
        className="admin-business-profile-missing"
        role="status"
      >
        <strong>פרופיל עסקי חסר</strong>
        <p>
          אין רשומת Business Profile לעריכה.
          יצירת פרופיל בשם הלקוח אינה חלק
          מפעולת Admin זו.
        </p>
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
          <strong>פרטי העסק</strong>
          <small>
            גרסה {profile.version} · עודכן {" "}
            {profile.updatedAt}
          </small>
        </div>
        <span>Audit אטומי</span>
      </header>
      <fieldset disabled={disabled}>
        <label>
          <span>שם העסק</span>
          <input
            name="businessName"
            defaultValue={profile.businessName}
            autoComplete="organization"
            maxLength={500}
            required
          />
        </label>
        <label>
          <span>אזור זמן IANA</span>
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
          <span>שפת ממשק</span>
          <select
            name="interfaceLanguage"
            defaultValue={
              profile.interfaceLanguage
            }
          >
            {Object.entries(
              interfaceLanguageLabels,
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
          שמירת פרטי העסק
        </button>
      </fieldset>
    </form>
  );
}
