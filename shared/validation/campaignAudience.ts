import {
  campaignPersonalizationFields,
  type CampaignAudienceContact,
  type CampaignAudienceSource,
  type CampaignPersonalizationField,
  type CampaignPersonalizationMapping,
} from "../domain/campaignAudience.ts";
import {
  validateCampaignPersonalization,
  type CampaignPersonalization,
} from "./campaignPersonalization.ts";

const MAXIMUM_PERSONALIZATION_MAPPINGS = 101;
const PERSONALIZATION_KEY_PATTERN =
  /^(?:body:[1-9][0-9]{0,2}|url:1)$/;

type ValidationResult<TValue> =
  | {
      success: true;
      value: TValue;
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

function hasExactKeys(
  input: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(input).sort(
    (first, second) => first.localeCompare(second),
  );
  const normalizedExpectedKeys = [...expectedKeys].sort(
    (first, second) => first.localeCompare(second),
  );

  return (
    actualKeys.length === normalizedExpectedKeys.length &&
    actualKeys.every(
      (key, index) =>
        key === normalizedExpectedKeys[index],
    )
  );
}

function isPersonalizationField(
  value: unknown,
): value is CampaignPersonalizationField {
  return (
    typeof value === "string" &&
    campaignPersonalizationFields.some(
      (field) => field === value,
    )
  );
}

export function validateCampaignAudienceSource(
  input: unknown,
): ValidationResult<CampaignAudienceSource> {
  if (
    !isRecord(input) ||
    typeof input.kind !== "string"
  ) {
    return { success: false };
  }

  if (
    input.kind === "all" &&
    hasExactKeys(input, ["kind"])
  ) {
    return {
      success: true,
      value: { kind: "all" },
    };
  }

  if (
    input.kind === "list" &&
    hasExactKeys(input, ["kind", "listId"]) &&
    Number.isSafeInteger(input.listId) &&
    Number(input.listId) > 0
  ) {
    return {
      success: true,
      value: {
        kind: "list",
        listId: Number(input.listId),
      },
    };
  }

  if (
    input.kind === "tag" &&
    hasExactKeys(input, ["kind", "tagId"]) &&
    Number.isSafeInteger(input.tagId) &&
    Number(input.tagId) > 0
  ) {
    return {
      success: true,
      value: {
        kind: "tag",
        tagId: Number(input.tagId),
      },
    };
  }

  return { success: false };
}

export function validateCampaignPersonalizationMapping(
  input: unknown,
  expectedKeys: readonly string[],
): ValidationResult<CampaignPersonalizationMapping> {
  if (
    !isRecord(input) ||
    expectedKeys.length >
      MAXIMUM_PERSONALIZATION_MAPPINGS ||
    !hasExactKeys(input, expectedKeys)
  ) {
    return { success: false };
  }

  const entries = Object.entries(input).sort(
    ([firstKey], [secondKey]) =>
      firstKey.localeCompare(secondKey),
  );
  const normalized: Record<
    string,
    CampaignPersonalizationField
  > = {};

  for (const [key, value] of entries) {
    if (
      !PERSONALIZATION_KEY_PATTERN.test(key) ||
      !isPersonalizationField(value)
    ) {
      return { success: false };
    }

    normalized[key] = value;
  }

  return {
    success: true,
    value: normalized,
  };
}

export function personalizeCampaignContact(
  contact: CampaignAudienceContact,
  mapping: CampaignPersonalizationMapping,
): ValidationResult<CampaignPersonalization> {
  const personalization: Record<string, string> = {};

  for (const [key, field] of Object.entries(mapping)) {
    const value = contact[field];

    if (
      typeof value !== "string" ||
      value.trim().length === 0
    ) {
      return { success: false };
    }

    personalization[key] = value;
  }

  return validateCampaignPersonalization(
    personalization,
  );
}
