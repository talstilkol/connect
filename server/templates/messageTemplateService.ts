import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  PersistedMessageTemplate,
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
      const validation = validateMessageTemplateDraft(input);

      if (!validation.success) {
        throw new MessageTemplateInputError(
          validation.issues,
        );
      }

      const templateKey = await deriveMessageTemplateKey(
        session.tenantId,
        validation.value.name,
        validation.value.language,
      );

      return repository.saveDraft({
        tenantId: session.tenantId,
        templateKey,
        ...validation.value,
      });
    },
  };
}
