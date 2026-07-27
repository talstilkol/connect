const MAXIMUM_PERSONALIZATION_VALUES = 101;
const MAXIMUM_PERSONALIZATION_VALUE_LENGTH = 1_000;
const PERSONALIZATION_KEY_PATTERN =
  /^(?:body:[1-9][0-9]{0,2}|url:1)$/;

export type CampaignPersonalization =
  Readonly<Record<string, string>>;

export type CampaignPersonalizationValidation =
  | {
      success: true;
      value: CampaignPersonalization;
    }
  | {
      success: false;
    };

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function validateCampaignPersonalization(
  input: unknown,
): CampaignPersonalizationValidation {
  if (!isRecord(input)) {
    return { success: false };
  }

  const entries = Object.entries(input).sort(
    ([firstKey], [secondKey]) =>
      firstKey.localeCompare(secondKey),
  );

  if (entries.length > MAXIMUM_PERSONALIZATION_VALUES) {
    return { success: false };
  }

  const normalized: Record<string, string> = {};

  for (const [key, value] of entries) {
    if (
      !PERSONALIZATION_KEY_PATTERN.test(key) ||
      typeof value !== "string"
    ) {
      return { success: false };
    }

    const normalizedValue = value.trim();

    if (
      normalizedValue.length === 0 ||
      normalizedValue.length >
        MAXIMUM_PERSONALIZATION_VALUE_LENGTH
    ) {
      return { success: false };
    }

    normalized[key] = normalizedValue;
  }

  return {
    success: true,
    value: normalized,
  };
}
