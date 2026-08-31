import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  PersistedMessageTemplate,
  ValidatedMessageTemplateDraft,
} from "../../shared/domain/messageTemplate.ts";
import type {
  MessageTemplateDraftIssue,
} from "../../shared/validation/messageTemplateDraft.ts";
import {
  validateMessageTemplateDraft,
} from "../../shared/validation/messageTemplateDraft.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveMessageTemplateKey,
} from "./messageTemplateKey.ts";

const MESSAGE_TEMPLATE_LIST_LIMIT = 100;
const draftKeys = Object.freeze([
  "body",
  "buttonMode",
  "category",
  "footer",
  "header",
  "language",
  "name",
  "phoneButton",
  "quickReplies",
  "urlButton",
  "variableExamples",
]);

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

export class MessageTemplateInputError extends Error {
  readonly issues: readonly MessageTemplateDraftIssue[];

  constructor(issues: readonly MessageTemplateDraftIssue[]) {
    super("Message template validation failed");
    this.name = "MessageTemplateInputError";
    this.issues = issues;
  }
}

export interface MessageTemplateService {
  list(
    session: TenantSession,
  ): Promise<readonly PersistedMessageTemplate[]>;
  saveDraft(
    session: TenantSession,
    input: unknown,
  ): Promise<PersistedMessageTemplate>;
}

export function parseMessageTemplateDraftInput(
  input: unknown,
): Readonly<ValidatedMessageTemplateDraft> {
  const exactShape = isExactRecord(input, draftKeys) &&
    isExactRecord(input.urlButton, [
      "enabled",
      "example",
      "mode",
      "text",
      "value",
    ]) &&
    isExactRecord(input.phoneButton, ["enabled", "text", "value"]);
  const validation = exactShape
    ? validateMessageTemplateDraft(input)
    : { success: false as const, issues: ["invalid-input" as const] };

  if (!validation.success) {
    throw new MessageTemplateInputError(validation.issues);
  }

  return validation.value;
}

export function createMessageTemplateService(
  repository: MessageTemplateRepository,
): MessageTemplateService {
  return {
    list(session) {
      requireTenantPermission(session, "templates.read");
      return repository.listByTenant(
        session.tenantId,
        MESSAGE_TEMPLATE_LIST_LIMIT,
      );
    },

    async saveDraft(session, input) {
      requireTenantPermission(session, "templates.write");
      const draft = parseMessageTemplateDraftInput(input);

      const templateKey = await deriveMessageTemplateKey(
        session.tenantId,
        draft.name,
        draft.language,
      );

      return repository.saveDraft({
        tenantId: session.tenantId,
        templateKey,
        ...draft,
      });
    },
  };
}
