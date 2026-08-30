import type {
  BotReplyPayload,
} from "../../shared/domain/botReplyDelivery.ts";
import type {
  MetaGraphTransport,
} from "../meta/metaGraphTransport.ts";
import type {
  SensitiveMetaAccessToken,
} from "../meta/metaPorts.ts";
import {
  observeProviderRequest,
  type ProviderRequestTelemetryClock,
  type ProviderRequestTelemetryScope,
} from "../operations/providerRequestTelemetry.ts";

const botReplyDeliveryKeyPattern =
  /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const phoneNumberIdPattern = /^[1-9][0-9]{0,63}$/;
const recipientPhoneNumberPattern =
  /^\+[1-9][0-9]{0,14}$/;
const botOptionKeyPattern =
  /^bot_option_v1_[0-9a-f]{64}$/;
const unsafeControlCharacters =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const maximumTextLength = 4_096;
const maximumButtonCount = 3;
const maximumButtonTitleLength = 20;

export type MetaBotReplyContractErrorCode =
  | "INVALID_REPLY_REQUEST"
  | "INVALID_REPLY_RESPONSE";

export class MetaBotReplyContractError extends Error {
  readonly code: MetaBotReplyContractErrorCode;

  constructor(code: MetaBotReplyContractErrorCode) {
    super(
      code === "INVALID_REPLY_REQUEST"
        ? "Meta bot reply request is invalid"
        : "Meta returned an invalid bot reply response",
    );
    this.name = "MetaBotReplyContractError";
    this.code = code;
  }
}

export interface SendMetaBotReplyInput {
  phoneNumberId: string;
  recipientPhoneNumber: string;
  deliveryKey: string;
  accessToken: SensitiveMetaAccessToken;
  reply: BotReplyPayload;
}

export interface MetaBotReplyAcceptance {
  providerMessageId: string;
}

export interface MetaBotReplySender {
  send(
    input: SendMetaBotReplyInput,
  ): Promise<MetaBotReplyAcceptance>;
}

export interface MetaBotReplyAdapterTelemetry {
  readonly scope: ProviderRequestTelemetryScope;
  readonly clock: ProviderRequestTelemetryClock;
}

interface MetaBotReplyResponse {
  messaging_product?: unknown;
  messages?: unknown;
}

function requestError(): never {
  throw new MetaBotReplyContractError(
    "INVALID_REPLY_REQUEST",
  );
}

function responseError(): never {
  throw new MetaBotReplyContractError(
    "INVALID_REPLY_RESPONSE",
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

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value);

  return (
    actual.length === expected.length &&
    expected.every((key) =>
      Object.hasOwn(value, key),
    )
  );
}

function requireText(
  value: unknown,
  maximumLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maximumLength ||
    unsafeControlCharacters.test(value)
  ) {
    return requestError();
  }

  return value;
}

function buildReplyBody(
  reply: BotReplyPayload,
): Readonly<Record<string, unknown>> {
  if (!isRecord(reply)) {
    return requestError();
  }

  if (
    reply.kind === "text" &&
    hasExactKeys(reply, ["kind", "text"])
  ) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      type: "text",
      text: {
        preview_url: false,
        body: requireText(
          reply.text,
          maximumTextLength,
        ),
      },
    };
  }

  if (
    reply.kind !== "buttons" ||
    !hasExactKeys(reply, [
      "kind",
      "text",
      "options",
    ]) ||
    !Array.isArray(reply.options) ||
    reply.options.length === 0 ||
    reply.options.length > maximumButtonCount
  ) {
    return requestError();
  }

  const optionKeys = new Set<string>();
  const optionTitles = new Set<string>();
  const buttons = reply.options.map((option) => {
    if (
      !option ||
      typeof option !== "object" ||
      Array.isArray(option) ||
      !hasExactKeys(option, [
        "optionKey",
        "label",
      ]) ||
      !botOptionKeyPattern.test(option.optionKey) ||
      optionKeys.has(option.optionKey)
    ) {
      return requestError();
    }

    const title = requireText(
      option.label,
      maximumButtonTitleLength,
    );
    const comparableTitle = title.toLocaleLowerCase("und");

    if (optionTitles.has(comparableTitle)) {
      return requestError();
    }

    optionKeys.add(option.optionKey);
    optionTitles.add(comparableTitle);

    return {
      type: "reply",
      reply: {
        id: option.optionKey,
        title,
      },
    } as const;
  });

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: requireText(
          reply.text,
          maximumTextLength,
        ),
      },
      action: { buttons },
    },
  };
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
  value: MetaBotReplyResponse,
): MetaBotReplyAcceptance {
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

export function createMetaBotReplyAdapter(
  transport: MetaGraphTransport,
  telemetry?: Readonly<MetaBotReplyAdapterTelemetry>,
): MetaBotReplySender {
  if (
    typeof transport?.requestJson !== "function" ||
    (telemetry !== undefined &&
      (typeof telemetry.scope?.record !== "function" ||
        typeof telemetry.clock?.now !== "function"))
  ) {
    throw new MetaBotReplyContractError(
      "INVALID_REPLY_REQUEST",
    );
  }

  return {
    async send(input) {
      if (
        !phoneNumberIdPattern.test(input.phoneNumberId) ||
        !recipientPhoneNumberPattern.test(
          input.recipientPhoneNumber,
        ) ||
        !botReplyDeliveryKeyPattern.test(
          input.deliveryKey,
        )
      ) {
        return requestError();
      }

      const body = {
        ...buildReplyBody(input.reply),
        to: input.recipientPhoneNumber.slice(1),
      };
      const request = () =>
        transport.requestJson<MetaBotReplyResponse>({
          method: "POST",
          pathSegments: [input.phoneNumberId, "messages"],
          accessToken: input.accessToken,
          jsonBody: body,
        });
      const response = telemetry === undefined
        ? await request()
        : await observeProviderRequest(
            telemetry.scope,
            telemetry.clock,
            Object.freeze({
              provider: "meta",
              operation: "bot-reply.send",
            }),
            request,
          );

      return parseResponse(response);
    },
  };
}
