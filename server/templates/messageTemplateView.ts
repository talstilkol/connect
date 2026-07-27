import type {
  PersistedMessageTemplate,
} from "../../shared/domain/messageTemplate.ts";
import type {
  MessageTemplateView,
} from "../../shared/domain/messageTemplateView.ts";

export function toMessageTemplateView(
  template: PersistedMessageTemplate,
): MessageTemplateView {
  return {
    templateKey: template.templateKey,
    name: template.name,
    category: template.category,
    language: template.language,
    status: template.status,
    header: template.header,
    body: template.body,
    footer: template.footer,
    variableExamples: {
      ...template.variableExamples,
    },
    buttonMode: template.buttonMode,
    quickReplies: [...template.quickReplies],
    urlButton: { ...template.urlButton },
    phoneButton: { ...template.phoneButton },
    submittedAt: template.submittedAt,
    reviewedAt: template.reviewedAt,
    updatedAt: template.updatedAt,
  };
}
