import {
  persistedCampaignStatuses,
} from "../../shared/domain/campaign.ts";
import type {
  CampaignActivationView,
  CampaignAudienceGroupView,
  CampaignAudienceOptionsView,
  CampaignTemplateOptionView,
  CampaignView,
} from "../../shared/domain/campaignView.ts";
import {
  persistedTemplateCategories,
  persistedTemplateLanguages,
} from "../../shared/domain/messageTemplate.ts";

const campaignKeyPattern = /^campaign_v1_[0-9a-f]{64}$/;
const templateKeyPattern = /^template_v1_[0-9a-f]{64}$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function parseTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !timestampPattern.test(value)) {
    return null;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value
    ? value
    : null;
}

function parseNullableTimestamp(
  value: unknown,
): { valid: boolean; value: string | null } {
  if (value === null) {
    return { valid: true, value: null };
  }
  const timestamp = parseTimestamp(value);
  return timestamp === null
    ? { valid: false, value: null }
    : { valid: true, value: timestamp };
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim() === value &&
    value.length <= maximum &&
    !controlCharacterPattern.test(value);
}

export function parseRailwayCampaignView(value: unknown): CampaignView | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "activatedAt",
      "campaignKey",
      "completedAt",
      "deliveryMode",
      "name",
      "recipientCount",
      "scheduledAt",
      "startedAt",
      "status",
      "templateLanguage",
      "templateName",
      "timezone",
      "updatedAt",
      "version",
    ]) ||
    typeof value.campaignKey !== "string" ||
    !campaignKeyPattern.test(value.campaignKey) ||
    !isBoundedText(value.name, 160) ||
    !persistedCampaignStatuses.some((status) => status === value.status) ||
    (value.deliveryMode !== "immediate" &&
      value.deliveryMode !== "scheduled") ||
    !isBoundedText(value.timezone, 100) ||
    !isBoundedText(value.templateName, 512) ||
    !persistedTemplateLanguages.some(
      (language) => language === value.templateLanguage,
    ) ||
    !isPositiveInteger(value.recipientCount) ||
    value.recipientCount > 100_000 ||
    !isPositiveInteger(value.version)
  ) {
    return null;
  }

  const scheduledAt = parseNullableTimestamp(value.scheduledAt);
  const activatedAt = parseNullableTimestamp(value.activatedAt);
  const startedAt = parseNullableTimestamp(value.startedAt);
  const completedAt = parseNullableTimestamp(value.completedAt);
  const updatedAt = parseTimestamp(value.updatedAt);
  if (
    !scheduledAt.valid ||
    !activatedAt.valid ||
    !startedAt.valid ||
    !completedAt.valid ||
    updatedAt === null ||
    (value.deliveryMode === "immediate" && scheduledAt.value !== null) ||
    (value.deliveryMode === "scheduled" && scheduledAt.value === null) ||
    (value.status === "draft" &&
      (activatedAt.value !== null ||
        startedAt.value !== null ||
        completedAt.value !== null))
  ) {
    return null;
  }

  return Object.freeze({
    campaignKey: value.campaignKey,
    name: value.name,
    status: value.status as CampaignView["status"],
    deliveryMode: value.deliveryMode,
    scheduledAt: scheduledAt.value,
    timezone: value.timezone,
    templateName: value.templateName,
    templateLanguage: value.templateLanguage as CampaignView["templateLanguage"],
    recipientCount: value.recipientCount,
    version: value.version,
    activatedAt: activatedAt.value,
    startedAt: startedAt.value,
    completedAt: completedAt.value,
    updatedAt,
  });
}

export function parseRailwayCampaignActivationView(
  value: unknown,
): CampaignActivationView | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "activatedAt",
      "campaignKey",
      "startedAt",
      "status",
      "version",
    ]) ||
    typeof value.campaignKey !== "string" ||
    !campaignKeyPattern.test(value.campaignKey) ||
    value.status !== "scheduled" ||
    !isPositiveInteger(value.version)
  ) {
    return null;
  }
  const activatedAt = parseTimestamp(value.activatedAt);
  const startedAt = parseNullableTimestamp(value.startedAt);
  if (activatedAt === null || !startedAt.valid || startedAt.value !== null) {
    return null;
  }
  return Object.freeze({
    campaignKey: value.campaignKey,
    status: "scheduled" as const,
    version: value.version,
    activatedAt,
    startedAt: null,
  });
}

export function parseRailwayCampaignTemplateOptions(
  value: unknown,
): readonly CampaignTemplateOptionView[] | null {
  if (!Array.isArray(value) || value.length > 100) {
    return null;
  }
  const seen = new Set<string>();
  const options: CampaignTemplateOptionView[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, [
        "category",
        "language",
        "name",
        "personalizationKeys",
        "templateKey",
      ]) ||
      typeof item.templateKey !== "string" ||
      !templateKeyPattern.test(item.templateKey) ||
      seen.has(item.templateKey) ||
      !isBoundedText(item.name, 512) ||
      !persistedTemplateCategories.some(
        (category) => category === item.category,
      ) ||
      !persistedTemplateLanguages.some(
        (language) => language === item.language,
      ) ||
      !Array.isArray(item.personalizationKeys) ||
      item.personalizationKeys.length > 101 ||
      item.personalizationKeys.some(
        (key) => typeof key !== "string" || !/^(body:[1-9][0-9]*|url:1)$/.test(key),
      ) ||
      new Set(item.personalizationKeys).size !== item.personalizationKeys.length ||
      JSON.stringify([...item.personalizationKeys].sort()) !==
        JSON.stringify(item.personalizationKeys)
    ) {
      return null;
    }
    seen.add(item.templateKey);
    options.push(Object.freeze({
      templateKey: item.templateKey,
      name: item.name,
      category: item.category as CampaignTemplateOptionView["category"],
      language: item.language as CampaignTemplateOptionView["language"],
      personalizationKeys: Object.freeze([...item.personalizationKeys]),
    }));
  }
  return Object.freeze(options);
}

function parseAudienceGroups(
  value: unknown,
): readonly CampaignAudienceGroupView[] | null {
  if (!Array.isArray(value) || value.length > 500) {
    return null;
  }
  const seen = new Set<number>();
  const groups: CampaignAudienceGroupView[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, ["contactCount", "id", "name"]) ||
      !isPositiveInteger(item.id) ||
      seen.has(item.id) ||
      !isBoundedText(item.name, 120) ||
      !Number.isSafeInteger(item.contactCount) ||
      Number(item.contactCount) < 0
    ) {
      return null;
    }
    seen.add(item.id);
    groups.push(Object.freeze({
      id: item.id,
      name: item.name,
      contactCount: Number(item.contactCount),
    }));
  }
  return Object.freeze(groups);
}

export function parseRailwayCampaignAudienceOptions(
  value: unknown,
): CampaignAudienceOptionsView | null {
  if (!isRecord(value) || !hasExactKeys(value, ["lists", "tags"])) {
    return null;
  }
  const lists = parseAudienceGroups(value.lists);
  const tags = parseAudienceGroups(value.tags);
  return lists === null || tags === null
    ? null
    : Object.freeze({ lists, tags });
}

export function parseRailwayCampaignList(
  value: unknown,
): readonly CampaignView[] | null {
  if (!Array.isArray(value) || value.length > 100) {
    return null;
  }
  const campaigns: CampaignView[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const campaign = parseRailwayCampaignView(item);
    if (campaign === null || seen.has(campaign.campaignKey)) {
      return null;
    }
    seen.add(campaign.campaignKey);
    campaigns.push(campaign);
  }
  return Object.freeze(campaigns);
}
