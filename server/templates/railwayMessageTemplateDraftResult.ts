import type { MessageTemplateView } from "../../shared/domain/messageTemplateView.ts";
import { persistedTemplateStatuses } from "../../shared/domain/messageTemplate.ts";
import { validateMessageTemplateDraft } from "../../shared/validation/messageTemplateDraft.ts";

const viewKeys = Object.freeze([
  "body",
  "buttonMode",
  "category",
  "footer",
  "header",
  "language",
  "name",
  "phoneButton",
  "quickReplies",
  "reviewedAt",
  "status",
  "submittedAt",
  "templateKey",
  "updatedAt",
  "urlButton",
  "variableExamples",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isCanonicalTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

function isCanonicalTimestampOrNull(value: unknown): value is string | null {
  return value === null || isCanonicalTimestamp(value);
}

function isPersistedTemplateStatus(
  value: unknown,
): value is MessageTemplateView["status"] {
  return persistedTemplateStatuses.some((status) => status === value);
}

function hasConsistentPublicLifecycle(
  status: MessageTemplateView["status"],
  submittedAt: string | null,
  reviewedAt: string | null,
): boolean {
  if (status === "draft" || status === "submitting") {
    return submittedAt === null && reviewedAt === null;
  }

  if (status === "pending_review") {
    return submittedAt !== null && reviewedAt === null;
  }

  return submittedAt !== null && reviewedAt !== null;
}

function canonicalDefinition(value: Readonly<Record<string, unknown>>) {
  return {
    name: value.name,
    category: value.category,
    language: value.language,
    header: value.header,
    body: value.body,
    footer: value.footer,
    variableExamples: value.variableExamples,
    buttonMode: value.buttonMode,
    quickReplies: value.quickReplies,
    urlButton: value.urlButton,
    phoneButton: value.phoneButton,
  };
}

export function parseRailwayMessageTemplateView(
  value: unknown,
): Readonly<MessageTemplateView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, viewKeys) ||
    !isRecord(value.urlButton) ||
    !hasExactKeys(value.urlButton, [
      "enabled",
      "example",
      "mode",
      "text",
      "value",
    ]) ||
    !isRecord(value.phoneButton) ||
    !hasExactKeys(value.phoneButton, ["enabled", "text", "value"]) ||
    typeof value.templateKey !== "string" ||
    !/^template_v1_[0-9a-f]{64}$/.test(value.templateKey) ||
    !isPersistedTemplateStatus(value.status) ||
    !isCanonicalTimestampOrNull(value.submittedAt) ||
    !isCanonicalTimestampOrNull(value.reviewedAt) ||
    !isCanonicalTimestamp(value.updatedAt)
  ) {
    return null;
  }

  const validation = validateMessageTemplateDraft({
    name: value.name,
    category: value.category,
    language: value.language,
    header: value.header,
    body: value.body,
    footer: value.footer,
    variableExamples: value.variableExamples,
    buttonMode: value.buttonMode,
    quickReplies: value.quickReplies,
    urlButton: value.urlButton,
    phoneButton: value.phoneButton,
  });

  if (!validation.success) {
    return null;
  }

  if (
    JSON.stringify(validation.value) !==
      JSON.stringify(canonicalDefinition(value)) ||
    !hasConsistentPublicLifecycle(
      value.status,
      value.submittedAt,
      value.reviewedAt,
    ) ||
    (value.submittedAt !== null && value.submittedAt > value.updatedAt) ||
    (value.reviewedAt !== null && value.reviewedAt > value.updatedAt)
  ) {
    return null;
  }

  return Object.freeze({
    templateKey: value.templateKey,
    ...validation.value,
    status: value.status,
    submittedAt: value.submittedAt,
    reviewedAt: value.reviewedAt,
    updatedAt: value.updatedAt,
  });
}

export function parseRailwayMessageTemplateDraftView(
  value: unknown,
): Readonly<MessageTemplateView> | null {
  const template = parseRailwayMessageTemplateView(value);

  return template?.status === "draft" ? template : null;
}
