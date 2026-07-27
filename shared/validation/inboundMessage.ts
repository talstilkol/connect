import {
  messageContentKinds,
  type MessageContentKind,
  type ValidatedInboundMessage,
} from "../domain/conversation.ts";

const PROVIDER_MESSAGE_ID_MAXIMUM_LENGTH = 255;
const MESSAGE_TEXT_MAXIMUM_LENGTH = 16_384;
const CANONICAL_ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type InboundMessageIssue =
  | "invalid-input"
  | "invalid-contact"
  | "invalid-provider-message-id"
  | "invalid-content"
  | "invalid-timestamp";

export type InboundMessageValidation =
  | {
      success: true;
      value: ValidatedInboundMessage;
    }
  | {
      success: false;
      issues: readonly InboundMessageIssue[];
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

function normalizeProviderMessageId(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return (
    normalized.length > 0 &&
    normalized.length <=
      PROVIDER_MESSAGE_ID_MAXIMUM_LENGTH
  )
    ? normalized
    : null;
}

function isMessageContentKind(
  value: unknown,
): value is MessageContentKind {
  return messageContentKinds.some(
    (contentKind) => contentKind === value,
  );
}

function normalizeTextContent(
  contentKind: MessageContentKind | null,
  value: unknown,
): string | null | undefined {
  if (contentKind === "text") {
    if (
      typeof value !== "string" ||
      value.trim().length === 0 ||
      value.length > MESSAGE_TEXT_MAXIMUM_LENGTH
    ) {
      return undefined;
    }

    return value;
  }

  return value === null ? null : undefined;
}

function normalizeIsoTimestamp(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" ||
    !CANONICAL_ISO_TIMESTAMP_PATTERN.test(value)
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

  return value;
}

export function validateInboundMessage(
  input: unknown,
): InboundMessageValidation {
  if (!isRecord(input)) {
    return {
      success: false,
      issues: ["invalid-input"],
    };
  }

  const issues: InboundMessageIssue[] = [];
  const contactId =
    Number.isSafeInteger(input.contactId) &&
    Number(input.contactId) > 0
      ? Number(input.contactId)
      : null;
  const providerMessageId =
    normalizeProviderMessageId(
      input.providerMessageId,
    );
  const contentKind = isMessageContentKind(
    input.contentKind,
  )
    ? input.contentKind
    : null;
  const textContent = normalizeTextContent(
    contentKind,
    input.textContent,
  );
  const occurredAt = normalizeIsoTimestamp(
    input.occurredAt,
  );

  if (contactId === null) {
    issues.push("invalid-contact");
  }

  if (providerMessageId === null) {
    issues.push("invalid-provider-message-id");
  }

  if (contentKind === null || textContent === undefined) {
    issues.push("invalid-content");
  }

  if (occurredAt === null) {
    issues.push("invalid-timestamp");
  }

  if (
    issues.length > 0 ||
    contactId === null ||
    providerMessageId === null ||
    contentKind === null ||
    textContent === undefined ||
    occurredAt === null
  ) {
    return {
      success: false,
      issues,
    };
  }

  return {
    success: true,
    value: {
      contactId,
      providerMessageId,
      contentKind,
      textContent,
      occurredAt,
    },
  };
}
