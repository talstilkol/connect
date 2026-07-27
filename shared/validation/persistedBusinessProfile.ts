import type {
  BusinessProfileDraft,
  InterfaceLanguage,
} from "../domain/businessProfileDraft";

export type BusinessProfileField =
  | "businessName"
  | "timezone"
  | "interfaceLanguage";

export interface BusinessProfileValidationIssue {
  field: BusinessProfileField;
  code: "required" | "unsupported";
}

export type BusinessProfileValidationResult =
  | {
      success: true;
      value: BusinessProfileDraft;
      issues: readonly [];
    }
  | {
      success: false;
      value: null;
      issues: readonly BusinessProfileValidationIssue[];
    };

const interfaceLanguages: readonly InterfaceLanguage[] = [
  "he",
  "en",
  "ar",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizedString(
  input: Record<string, unknown>,
  key: BusinessProfileField,
): string {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function isInterfaceLanguage(value: string): value is InterfaceLanguage {
  return interfaceLanguages.some((language) => language === value);
}

function isSupportedTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(
      new Date(0),
    );
    return true;
  } catch {
    return false;
  }
}

export function validatePersistedBusinessProfile(
  input: unknown,
): BusinessProfileValidationResult {
  if (!isRecord(input)) {
    return {
      success: false,
      value: null,
      issues: [
        { field: "businessName", code: "required" },
        { field: "timezone", code: "required" },
        { field: "interfaceLanguage", code: "required" },
      ],
    };
  }

  const businessName = normalizedString(input, "businessName");
  const timezone = normalizedString(input, "timezone");
  const interfaceLanguage = normalizedString(
    input,
    "interfaceLanguage",
  );
  const issues: BusinessProfileValidationIssue[] = [];

  if (businessName.length === 0) {
    issues.push({ field: "businessName", code: "required" });
  }

  if (timezone.length === 0) {
    issues.push({ field: "timezone", code: "required" });
  } else if (!isSupportedTimezone(timezone)) {
    issues.push({ field: "timezone", code: "unsupported" });
  }

  if (interfaceLanguage.length === 0) {
    issues.push({ field: "interfaceLanguage", code: "required" });
  } else if (!isInterfaceLanguage(interfaceLanguage)) {
    issues.push({ field: "interfaceLanguage", code: "unsupported" });
  }

  if (issues.length > 0 || !isInterfaceLanguage(interfaceLanguage)) {
    return {
      success: false,
      value: null,
      issues,
    };
  }

  return {
    success: true,
    value: {
      businessName,
      timezone,
      interfaceLanguage,
    },
    issues: [],
  };
}
