export type ContactConsentEventType = "granted" | "unsubscribed";

export type ContactConsentField =
  | "source"
  | "occurredAt"
  | "evidenceReference";

export interface ContactConsentValidationIssue {
  field: ContactConsentField;
  code: "required" | "unsupported";
}

export interface ContactConsentTransition {
  source: string;
  occurredAt: string;
  evidenceReference: string | null;
}

export type ContactConsentValidationResult =
  | {
      success: true;
      value: ContactConsentTransition;
      issues: readonly [];
    }
  | {
      success: false;
      value: null;
      issues: readonly ContactConsentValidationIssue[];
    };

const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const maximumSourceLength = 256;
const maximumEvidenceReferenceLength = 2_048;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizedString(
  input: Record<string, unknown>,
  field: ContactConsentField,
): string {
  const value = input[field];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIsoTimestamp(value: string): string | null {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

export function validateContactConsentTransition(
  input: unknown,
): ContactConsentValidationResult {
  if (!isRecord(input)) {
    return {
      success: false,
      value: null,
      issues: [
        { field: "source", code: "required" },
        { field: "occurredAt", code: "required" },
      ],
    };
  }

  const source = normalizedString(input, "source");
  const occurredAt = normalizedString(input, "occurredAt");
  const evidenceReference =
    normalizedString(input, "evidenceReference") || null;
  const normalizedOccurredAt = normalizeIsoTimestamp(occurredAt);
  const issues: ContactConsentValidationIssue[] = [];

  if (!source) {
    issues.push({ field: "source", code: "required" });
  } else if (
    source.length > maximumSourceLength ||
    controlCharacterPattern.test(source)
  ) {
    issues.push({ field: "source", code: "unsupported" });
  }

  if (!occurredAt) {
    issues.push({ field: "occurredAt", code: "required" });
  } else if (!normalizedOccurredAt) {
    issues.push({ field: "occurredAt", code: "unsupported" });
  }

  if (
    evidenceReference !== null &&
    (evidenceReference.length > maximumEvidenceReferenceLength ||
      controlCharacterPattern.test(evidenceReference))
  ) {
    issues.push({
      field: "evidenceReference",
      code: "unsupported",
    });
  }

  if (issues.length > 0 || !source || !normalizedOccurredAt) {
    return {
      success: false,
      value: null,
      issues,
    };
  }

  return {
    success: true,
    value: {
      source,
      occurredAt: normalizedOccurredAt,
      evidenceReference,
    },
    issues: [],
  };
}
