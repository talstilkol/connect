import type {
  PersistedMessageTemplate,
  ValidatedMessageTemplateDraft,
} from "../../shared/domain/messageTemplate.ts";
import {
  validateMessageTemplateDraft,
} from "../../shared/validation/messageTemplateDraft.ts";
import type {
  MetaGraphTransport,
} from "../meta/metaGraphTransport.ts";
import type {
  SensitiveMetaAccessToken,
} from "../meta/metaPorts.ts";

export type MetaMessageTemplateContractErrorCode =
  | "INVALID_TEMPLATE_REQUEST"
  | "INVALID_TEMPLATE_RESPONSE";

export class MetaMessageTemplateContractError extends Error {
  readonly code: MetaMessageTemplateContractErrorCode;

  constructor(code: MetaMessageTemplateContractErrorCode) {
    super(
      code === "INVALID_TEMPLATE_REQUEST"
        ? "Message template request is invalid"
        : "Meta returned an invalid message template response",
    );
    this.name = "MetaMessageTemplateContractError";
    this.code = code;
  }
}

export interface SubmitMetaMessageTemplateInput {
  wabaId: string;
  accessToken: SensitiveMetaAccessToken;
  template:
    | ValidatedMessageTemplateDraft
    | PersistedMessageTemplate;
}

export interface SubmittedMetaMessageTemplate {
  metaTemplateId: string;
  status: "pending_review";
  category: ValidatedMessageTemplateDraft["category"];
}

export interface MetaMessageTemplateSubmitter {
  submit(
    input: SubmitMetaMessageTemplateInput,
  ): Promise<SubmittedMetaMessageTemplate>;
}

interface MetaTemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT";
  text?: string;
  example?: {
    body_text: readonly (readonly string[])[];
  };
  buttons?: (
    | {
        type: "QUICK_REPLY";
        text: string;
      }
    | {
        type: "URL";
        text: string;
        url: string;
        example?: readonly string[];
      }
    | {
        type: "PHONE_NUMBER";
        text: string;
        phone_number: string;
      }
  )[];
}

interface MetaTemplateCreateResponse {
  id?: unknown;
  status?: unknown;
  category?: unknown;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireWabaId(value: string): string {
  const normalized = value.trim();

  if (!/^[1-9][0-9]{0,63}$/.test(normalized)) {
    throw new MetaMessageTemplateContractError(
      "INVALID_TEMPLATE_REQUEST",
    );
  }

  return normalized;
}

function buildComponents(
  template: ValidatedMessageTemplateDraft,
): readonly MetaTemplateComponent[] {
  const components: MetaTemplateComponent[] = [];

  if (template.header.length > 0) {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: template.header,
    });
  }

  const variableExampleValues = Object.entries(
    template.variableExamples,
  )
    .sort(
      ([firstNumber], [secondNumber]) =>
        Number(firstNumber) - Number(secondNumber),
    )
    .map(([, example]) => example);
  const bodyComponent: MetaTemplateComponent = {
    type: "BODY",
    text: template.body,
  };

  if (variableExampleValues.length > 0) {
    bodyComponent.example = {
      body_text: [variableExampleValues],
    };
  }

  components.push(bodyComponent);

  if (template.footer.length > 0) {
    components.push({
      type: "FOOTER",
      text: template.footer,
    });
  }

  if (template.buttonMode === "quick_reply") {
    components.push({
      type: "BUTTONS",
      buttons: template.quickReplies.map((text) => ({
        type: "QUICK_REPLY",
        text,
      })),
    });
  }

  if (template.buttonMode === "call_to_action") {
    const buttons: NonNullable<
      MetaTemplateComponent["buttons"]
    > = [];

    if (template.phoneButton.enabled) {
      buttons.push({
        type: "PHONE_NUMBER",
        text: template.phoneButton.text,
        phone_number: template.phoneButton.value,
      });
    }

    if (template.urlButton.enabled) {
      buttons.push({
        type: "URL",
        text: template.urlButton.text,
        url: template.urlButton.value,
        ...(template.urlButton.mode === "dynamic"
          ? { example: [template.urlButton.example] }
          : {}),
      });
    }

    components.push({
      type: "BUTTONS",
      buttons,
    });
  }

  return components;
}

function parseCreateResponse(
  value: unknown,
  expectedCategory:
    ValidatedMessageTemplateDraft["category"],
): SubmittedMetaMessageTemplate {
  if (
    !isRecord(value) ||
    !/^[0-9]{1,255}$/.test(
      typeof value.id === "string" ? value.id : "",
    ) ||
    value.status !== "PENDING" ||
    value.category !== expectedCategory
  ) {
    throw new MetaMessageTemplateContractError(
      "INVALID_TEMPLATE_RESPONSE",
    );
  }

  return {
    metaTemplateId: value.id as string,
    status: "pending_review",
    category: expectedCategory,
  };
}

export function createMetaMessageTemplateAdapter(
  transport: MetaGraphTransport,
): MetaMessageTemplateSubmitter {
  return {
    async submit(input) {
      const wabaId = requireWabaId(input.wabaId);
      const validation = validateMessageTemplateDraft(
        input.template,
      );

      if (!validation.success) {
        throw new MetaMessageTemplateContractError(
          "INVALID_TEMPLATE_REQUEST",
        );
      }

      const response =
        await transport.requestJson<MetaTemplateCreateResponse>({
          method: "POST",
          pathSegments: [wabaId, "message_templates"],
          accessToken: input.accessToken,
          jsonBody: {
            name: validation.value.name,
            language: validation.value.language,
            category: validation.value.category,
            components: buildComponents(validation.value),
          },
        });

      return parseCreateResponse(
        response,
        validation.value.category,
      );
    },
  };
}
