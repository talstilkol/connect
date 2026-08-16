import type {
  CampaignTemplateSnapshot,
} from "../../shared/domain/campaign.ts";
import type {
  CampaignPersonalization,
} from "../../shared/validation/campaignPersonalization.ts";
import {
  validateCampaignPersonalization,
} from "../../shared/validation/campaignPersonalization.ts";
import {
  validateMessageTemplateDraft,
} from "../../shared/validation/messageTemplateDraft.ts";
import type {
  MetaGraphTransport,
} from "../meta/metaGraphTransport.ts";
import type {
  SensitiveMetaAccessToken,
} from "../meta/metaPorts.ts";

const campaignDeliveryKeyPattern =
  /^campaign_delivery_v1_[0-9a-f]{64}$/;
const phoneNumberIdPattern = /^[1-9][0-9]{0,63}$/;
const recipientPhoneNumberPattern =
  /^\+[1-9][0-9]{0,14}$/;
const metaTemplateIdPattern = /^[1-9][0-9]{0,254}$/;

export type MetaCampaignTemplateContractErrorCode =
  | "INVALID_DELIVERY_REQUEST"
  | "INVALID_DELIVERY_RESPONSE";

export class MetaCampaignTemplateContractError extends Error {
  readonly code: MetaCampaignTemplateContractErrorCode;

  constructor(code: MetaCampaignTemplateContractErrorCode) {
    super(
      code === "INVALID_DELIVERY_REQUEST"
        ? "Meta campaign delivery request is invalid"
        : "Meta returned an invalid campaign delivery response",
    );
    this.name = "MetaCampaignTemplateContractError";
    this.code = code;
  }
}

export interface SendMetaCampaignTemplateInput {
  phoneNumberId: string;
  recipientPhoneNumber: string;
  deliveryKey: string;
  accessToken: SensitiveMetaAccessToken;
  template: CampaignTemplateSnapshot;
  personalization: CampaignPersonalization;
}

export interface MetaCampaignTemplateAcceptance {
  providerMessageId: string;
}

export interface MetaCampaignTemplateSender {
  send(
    input: SendMetaCampaignTemplateInput,
  ): Promise<MetaCampaignTemplateAcceptance>;
}

interface MetaTextParameter {
  type: "text";
  text: string;
}

interface MetaPayloadParameter {
  type: "payload";
  payload: string;
}

type MetaTemplateComponent =
  | {
      type: "body";
      parameters: readonly MetaTextParameter[];
    }
  | {
      type: "button";
      sub_type: "url";
      index: string;
      parameters: readonly MetaTextParameter[];
    }
  | {
      type: "button";
      sub_type: "quick_reply";
      index: string;
      parameters: readonly MetaPayloadParameter[];
    };

interface MetaCampaignTemplateResponse {
  messaging_product?: unknown;
  messages?: unknown;
}

function requestError(): never {
  throw new MetaCampaignTemplateContractError(
    "INVALID_DELIVERY_REQUEST",
  );
}

function responseError(): never {
  throw new MetaCampaignTemplateContractError(
    "INVALID_DELIVERY_RESPONSE",
  );
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

function requireTemplate(
  value: CampaignTemplateSnapshot,
): ReturnType<typeof validateMessageTemplateDraft> & {
  success: true;
} {
  const validation = validateMessageTemplateDraft(value);

  if (
    !validation.success ||
    !/^template_v1_[0-9a-f]{64}$/.test(
      value.templateKey,
    ) ||
    !metaTemplateIdPattern.test(value.metaTemplateId) ||
    !Number.isSafeInteger(value.version) ||
    value.version <= 0
  ) {
    return requestError();
  }

  return validation;
}

function requirePersonalization(
  value: CampaignPersonalization,
  template: ReturnType<
    typeof validateMessageTemplateDraft
  > & { success: true },
): CampaignPersonalization {
  const validation = validateCampaignPersonalization(value);

  if (!validation.success) {
    return requestError();
  }

  const expectedKeys = Object.keys(
    template.value.variableExamples,
  ).map((variableNumber) => `body:${variableNumber}`);

  if (
    template.value.buttonMode === "call_to_action" &&
    template.value.urlButton.enabled &&
    template.value.urlButton.mode === "dynamic"
  ) {
    expectedKeys.push("url:1");
  }

  const actualKeys = Object.keys(validation.value);
  const expectedKeySet = new Set(expectedKeys);

  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) => !expectedKeySet.has(key))
  ) {
    return requestError();
  }

  return validation.value;
}

function buildComponents(
  deliveryKey: string,
  template: ReturnType<
    typeof validateMessageTemplateDraft
  > & { success: true },
  personalization: CampaignPersonalization,
): readonly MetaTemplateComponent[] {
  const components: MetaTemplateComponent[] = [];
  const variableNumbers = Object.keys(
    template.value.variableExamples,
  )
    .map(Number)
    .sort((first, second) => first - second);

  if (variableNumbers.length > 0) {
    components.push({
      type: "body",
      parameters: variableNumbers.map((variableNumber) => ({
        type: "text",
        text: personalization[`body:${variableNumber}`],
      })),
    });
  }

  if (template.value.buttonMode === "quick_reply") {
    for (
      let index = 0;
      index < template.value.quickReplies.length;
      index += 1
    ) {
      components.push({
        type: "button",
        sub_type: "quick_reply",
        index: String(index),
        parameters: [
          {
            type: "payload",
            payload: `${deliveryKey}:${index}`,
          },
        ],
      });
    }
  }

  if (
    template.value.buttonMode === "call_to_action" &&
    template.value.urlButton.enabled &&
    template.value.urlButton.mode === "dynamic"
  ) {
    components.push({
      type: "button",
      sub_type: "url",
      index: template.value.phoneButton.enabled
        ? "1"
        : "0",
      parameters: [
        {
          type: "text",
          text: personalization["url:1"],
        },
      ],
    });
  }

  return components;
}

function readProviderMessageId(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    !value.startsWith("wamid.") ||
    value.length <= "wamid.".length ||
    value.length > 255 ||
    /\s/.test(value)
  ) {
    return responseError();
  }

  return value;
}

function parseResponse(
  value: MetaCampaignTemplateResponse,
): MetaCampaignTemplateAcceptance {
  if (
    !isRecord(value) ||
    value.messaging_product !== "whatsapp" ||
    !Array.isArray(value.messages) ||
    value.messages.length !== 1 ||
    !isRecord(value.messages[0])
  ) {
    return responseError();
  }

  return {
    providerMessageId: readProviderMessageId(
      value.messages[0].id,
    ),
  };
}

export function createMetaCampaignTemplateAdapter(
  transport: MetaGraphTransport,
): MetaCampaignTemplateSender {
  return {
    async send(input) {
      if (
        !phoneNumberIdPattern.test(input.phoneNumberId) ||
        !recipientPhoneNumberPattern.test(
          input.recipientPhoneNumber,
        ) ||
        !campaignDeliveryKeyPattern.test(
          input.deliveryKey,
        )
      ) {
        return requestError();
      }

      const template = requireTemplate(input.template);
      const personalization = requirePersonalization(
        input.personalization,
        template,
      );
      const components = buildComponents(
        input.deliveryKey,
        template,
        personalization,
      );
      const response =
        await transport.requestJson<MetaCampaignTemplateResponse>({
          method: "POST",
          pathSegments: [input.phoneNumberId, "messages"],
          accessToken: input.accessToken,
          jsonBody: {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: input.recipientPhoneNumber.slice(1),
            type: "template",
            template: {
              name: template.value.name,
              language: {
                code: template.value.language,
              },
              ...(components.length > 0
                ? { components }
                : {}),
            },
          },
        });

      return parseResponse(response);
    },
  };
}
