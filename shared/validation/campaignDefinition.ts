import {
  campaignDeliveryModes,
  type CampaignTemplateSnapshot,
  type ValidatedCampaignDefinition,
} from "../domain/campaign.ts";
import {
  validateMessageTemplateDraft,
} from "./messageTemplateDraft.ts";

const CAMPAIGN_NAME_MAXIMUM_LENGTH = 160;
const CAMPAIGN_RECIPIENT_MAXIMUM_COUNT = 100_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const TEMPLATE_KEY_PATTERN =
  /^template_v1_[0-9a-f]{64}$/;
const META_TEMPLATE_ID_PATTERN = /^[1-9][0-9]{0,254}$/;

export type CampaignDefinitionIssue =
  | "invalid-input"
  | "invalid-name"
  | "invalid-delivery"
  | "invalid-schedule"
  | "invalid-timezone"
  | "invalid-template"
  | "invalid-audience";

export type CampaignDefinitionValidation =
  | {
      success: true;
      value: ValidatedCampaignDefinition;
    }
  | {
      success: false;
      issues: readonly CampaignDefinitionIssue[];
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

function trimmedText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length <= maximumLength
    ? normalized
    : null;
}

function isDeliveryMode(
  value: unknown,
): value is ValidatedCampaignDefinition["deliveryMode"] {
  return campaignDeliveryModes.some(
    (deliveryMode) => deliveryMode === value,
  );
}

function normalizeIsoTimestamp(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value,
    )
  ) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString() !== value
  ) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function normalizeTimezone(value: unknown): string | null {
  const timezone = trimmedText(value, 100);

  if (!timezone) {
    return null;
  }

  try {
    new Intl.DateTimeFormat("en", {
      timeZone: timezone,
    }).format(new Date(0));
  } catch {
    return null;
  }

  return timezone;
}

function parseTemplateSnapshot(
  value: unknown,
): CampaignTemplateSnapshot | null {
  if (
    !isRecord(value) ||
    typeof value.templateKey !== "string" ||
    !TEMPLATE_KEY_PATTERN.test(value.templateKey) ||
    typeof value.metaTemplateId !== "string" ||
    !META_TEMPLATE_ID_PATTERN.test(value.metaTemplateId) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) <= 0
  ) {
    return null;
  }

  const template = validateMessageTemplateDraft(value);

  if (!template.success) {
    return null;
  }

  return {
    templateKey: value.templateKey,
    metaTemplateId: value.metaTemplateId,
    version: Number(value.version),
    ...template.value,
  };
}

export function validateCampaignDefinition(
  input: unknown,
): CampaignDefinitionValidation {
  if (!isRecord(input)) {
    return {
      success: false,
      issues: ["invalid-input"],
    };
  }

  const issues: CampaignDefinitionIssue[] = [];
  const name = trimmedText(
    input.name,
    CAMPAIGN_NAME_MAXIMUM_LENGTH,
  );
  const deliveryMode = isDeliveryMode(input.deliveryMode)
    ? input.deliveryMode
    : null;
  const scheduledAt = normalizeIsoTimestamp(
    input.scheduledAt,
  );
  const timezone = normalizeTimezone(input.timezone);
  const template = parseTemplateSnapshot(input.template);
  const audienceSnapshotKey =
    typeof input.audienceSnapshotKey === "string" &&
    SHA256_PATTERN.test(input.audienceSnapshotKey)
      ? input.audienceSnapshotKey
      : null;
  const recipientCount =
    Number.isSafeInteger(input.recipientCount) &&
    Number(input.recipientCount) > 0 &&
    Number(input.recipientCount) <=
      CAMPAIGN_RECIPIENT_MAXIMUM_COUNT
      ? Number(input.recipientCount)
      : null;

  if (!name) {
    issues.push("invalid-name");
  }

  if (!deliveryMode) {
    issues.push("invalid-delivery");
  } else if (
    (deliveryMode === "immediate" &&
      input.scheduledAt !== null &&
      input.scheduledAt !== "") ||
    (deliveryMode === "scheduled" &&
      scheduledAt === null)
  ) {
    issues.push("invalid-schedule");
  }

  if (!timezone) {
    issues.push("invalid-timezone");
  }

  if (!template) {
    issues.push("invalid-template");
  }

  if (
    audienceSnapshotKey === null ||
    recipientCount === null
  ) {
    issues.push("invalid-audience");
  }

  if (
    issues.length > 0 ||
    !name ||
    !deliveryMode ||
    !timezone ||
    !template ||
    !audienceSnapshotKey ||
    recipientCount === null
  ) {
    return { success: false, issues };
  }

  return {
    success: true,
    value: {
      name,
      deliveryMode,
      scheduledAt:
        deliveryMode === "scheduled"
          ? scheduledAt
          : null,
      timezone,
      template,
      audienceSnapshotKey,
      recipientCount,
    },
  };
}
