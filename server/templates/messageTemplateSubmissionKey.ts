import type {
  PersistedMessageTemplate,
} from "../../shared/domain/messageTemplate.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

export async function deriveMessageTemplateSubmissionKey(
  template: PersistedMessageTemplate,
): Promise<string> {
  if (
    template.status !== "draft" ||
    !/^template_v1_[0-9a-f]{64}$/.test(
      template.templateKey,
    ) ||
    !Number.isSafeInteger(template.version) ||
    template.version <= 0
  ) {
    throw new Error(
      "message template cannot be prepared for submission",
    );
  }

  const variableExamples = Object.entries(
    template.variableExamples,
  )
    .sort(
      ([firstNumber], [secondNumber]) =>
        Number(firstNumber) - Number(secondNumber),
    )
    .map(([variableNumber, example]) => [
      Number(variableNumber),
      example,
    ]);
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        templateKey: template.templateKey,
        templateVersion: template.version,
        name: template.name,
        language: template.language,
        category: template.category,
        header: template.header,
        body: template.body,
        footer: template.footer,
        variableExamples,
        buttonMode: template.buttonMode,
        quickReplies: template.quickReplies,
        urlButton: template.urlButton,
        phoneButton: template.phoneButton,
      }),
    ),
  );

  return `template_submission_v1_${digest}`;
}
