export type PersistedContactField =
  | "phoneNumber"
  | "firstName"
  | "lastName"
  | "email"
  | "company";

export interface PersistedContactValidationIssue {
  field: PersistedContactField;
  code: "required" | "unsupported";
}

export interface PersistedContactProfile {
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
}

export type PersistedContactValidationResult =
  | {
      success: true;
      value: PersistedContactProfile;
      issues: readonly [];
    }
  | {
      success: false;
      value: null;
      issues: readonly PersistedContactValidationIssue[];
    };

const e164Pattern = /^\+[1-9]\d{0,14}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizedOptionalString(
  input: Record<string, unknown>,
  field: PersistedContactField,
): string | null {
  const value = input[field];

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function validatePersistedContact(
  input: unknown,
): PersistedContactValidationResult {
  if (!isRecord(input)) {
    return {
      success: false,
      value: null,
      issues: [{ field: "phoneNumber", code: "required" }],
    };
  }

  const phoneNumber = normalizedOptionalString(input, "phoneNumber");
  const issues: PersistedContactValidationIssue[] = [];

  if (!phoneNumber) {
    issues.push({ field: "phoneNumber", code: "required" });
  } else if (!e164Pattern.test(phoneNumber)) {
    issues.push({ field: "phoneNumber", code: "unsupported" });
  }

  if (issues.length > 0 || !phoneNumber) {
    return {
      success: false,
      value: null,
      issues,
    };
  }

  return {
    success: true,
    value: {
      phoneNumber,
      firstName: normalizedOptionalString(input, "firstName"),
      lastName: normalizedOptionalString(input, "lastName"),
      email: normalizedOptionalString(input, "email"),
      company: normalizedOptionalString(input, "company"),
    },
    issues: [],
  };
}
