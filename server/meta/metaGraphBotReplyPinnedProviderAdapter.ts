import { types as nodeUtilTypes } from "node:util";

import type {
  BotReplyPayload,
} from "../../shared/domain/botReplyDelivery.ts";
import type {
  SensitiveMetaAccessToken,
} from "./metaPorts.ts";

// Capture every mutable runtime intrinsic used at the provider edge before an
// injected transport can run. The adapter remains dormant, but a returned
// response must still be checked with the native brands that existed when this
// reviewed module was evaluated rather than with replaceable globals.
const arrayIsArrayIntrinsic = Array.isArray;
const dateConstructorIntrinsic = Date;
const dateParseIntrinsic = Date.parse;
const dateGetTimeIntrinsic = Date.prototype.getTime;
const dateToISOStringIntrinsic = Date.prototype.toISOString;
const jsonParseIntrinsic = JSON.parse;
const jsonStringifyIntrinsic = JSON.stringify;
const numberConstructorIntrinsic = Number;
const numberIsFiniteIntrinsic = Number.isFinite;
const numberIsSafeIntegerIntrinsic = Number.isSafeInteger;
const objectCreateIntrinsic = Object.create;
const objectFreezeIntrinsic = Object.freeze;
const objectGetOwnPropertyDescriptorIntrinsic =
  Object.getOwnPropertyDescriptor;
const objectGetOwnPropertyDescriptorsIntrinsic =
  Object.getOwnPropertyDescriptors;
const objectGetPrototypeOfIntrinsic = Object.getPrototypeOf;
const reflectApplyIntrinsic = Reflect.apply;
const reflectOwnKeysIntrinsic = Reflect.ownKeys;
const nodeIsDateIntrinsic = nodeUtilTypes.isDate;
const nodeIsProxyIntrinsic = nodeUtilTypes.isProxy;
const nodeIsUint8ArrayIntrinsic = nodeUtilTypes.isUint8Array;
const abortSignalAbortedGetterIntrinsic =
  objectGetOwnPropertyDescriptorIntrinsic(
    AbortSignal.prototype,
    "aborted",
  )?.get;
const responseStatusGetterIntrinsic =
  objectGetOwnPropertyDescriptorIntrinsic(Response.prototype, "status")?.get;
const responseHeadersGetterIntrinsic =
  objectGetOwnPropertyDescriptorIntrinsic(Response.prototype, "headers")?.get;
const responseBodyGetterIntrinsic =
  objectGetOwnPropertyDescriptorIntrinsic(Response.prototype, "body")?.get;
const headersGetIntrinsic = Headers.prototype.get;
const readableStreamGetReaderIntrinsic = ReadableStream.prototype.getReader;
const readableStreamReaderReadIntrinsic =
  ReadableStreamDefaultReader.prototype.read;
const readableStreamReaderCancelIntrinsic =
  ReadableStreamDefaultReader.prototype.cancel;
const textEncoderIntrinsic = new TextEncoder();
const textEncoderEncodeIntrinsic = TextEncoder.prototype.encode;
const textDecoderConstructorIntrinsic = TextDecoder;
const textDecoderDecodeIntrinsic = TextDecoder.prototype.decode;
const typedArrayByteLengthGetterIntrinsic =
  objectGetOwnPropertyDescriptorIntrinsic(
    objectGetPrototypeOfIntrinsic(Uint8Array.prototype),
    "byteLength",
  )?.get;

const graphApiVersion = "v25.0";
const graphOrigin = "https://graph.facebook.com";
const maximumProviderBoundaryMilliseconds = 15_000;
const maximumResponseBytes = 65_536;
const maximumRequestBytes = 32_768;
const maximumRetryAfterSeconds = 86_400;
const maximumTextLength = 4_096;
const maximumButtonCount = 3;
const maximumButtonTitleLength = 20;
const maximumPairFailureExponent = 8;
const dependencyKeys = objectFreezeIntrinsic([
  "accessToken",
  "apiVersion",
  "clock",
  "fetchImplementation",
  "pairFailureExponent",
  "phoneNumberId",
  "recipientPhoneNumber",
  "reply",
]);
const invocationKeys = objectFreezeIntrinsic([
  "automaticRetryPolicy",
  "sendBefore",
]);
const clockKeys = objectFreezeIntrinsic(["now"]);
const textReplyKeys = objectFreezeIntrinsic(["kind", "text"]);
const buttonReplyKeys = objectFreezeIntrinsic([
  "kind",
  "options",
  "text",
]);
const buttonOptionKeys = objectFreezeIntrinsic([
  "label",
  "optionKey",
]);
const phoneNumberIdPattern = /^[1-9][0-9]{0,63}$/;
const recipientPhoneNumberPattern = /^\+[1-9][0-9]{0,14}$/;
const botOptionKeyPattern = /^bot_option_v1_[0-9a-f]{64}$/;
const unsafeControlCharacters =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

type ExactRecord = Readonly<Record<string, unknown>>;
type CapturedResponse = Readonly<{
  body: ReadableStream<Uint8Array>;
  headers: Headers;
  status: number;
}>;
type MetaGraphBotReplyPinnedProviderFact = Readonly<
  | {
      outcome: "accepted";
      providerMessageId: string;
    }
  | {
      outcome: "sender-deferred";
      providerErrorCode: 130429;
      retryAfterSeconds: number;
    }
  | {
      outcome: "pair-deferred";
      providerErrorCode: 131056;
      retryAfterSeconds: number;
    }
  | {
      outcome: "service-window-rejected";
      providerErrorCode: 131047;
    }
>;
type MetaGraphBotReplyPinnedProvider = Readonly<{
  sendOnce(
    input: Readonly<{
      automaticRetryPolicy: "forbidden";
      sendBefore: string;
    }>,
    signal: AbortSignal,
  ): Promise<MetaGraphBotReplyPinnedProviderFact>;
}>;

export const metaGraphBotReplyPinnedProviderAdapterStatus = objectFreezeIntrinsic({
  activationAllowed: false as const,
  adapterStatus: "dormant" as const,
  automaticRetryPolicy: "forbidden" as const,
  graphApiVersion,
  providerBindingStatus: "unproven" as const,
  runtimeImporters: 0 as const,
});

export type MetaGraphBotReplyPinnedProviderAdapterErrorCode =
  | "invalid-dependencies"
  | "invalid-bound-request"
  | "invalid-invocation"
  | "provider-binding-already-used"
  | "provider-boundary-expired"
  | "provider-outcome-unknown";

export class MetaGraphBotReplyPinnedProviderAdapterError extends Error {
  readonly code: MetaGraphBotReplyPinnedProviderAdapterErrorCode;

  constructor(code: MetaGraphBotReplyPinnedProviderAdapterErrorCode) {
    super(`Meta pinned provider adapter failed: ${code}`);
    this.name = "MetaGraphBotReplyPinnedProviderAdapterError";
    this.code = code;
  }
}

export interface MetaGraphBotReplyPinnedProviderAdapterInput {
  readonly accessToken: SensitiveMetaAccessToken;
  readonly apiVersion: typeof graphApiVersion;
  readonly clock: Readonly<{ now(): Date }>;
  readonly fetchImplementation: typeof fetch;
  readonly pairFailureExponent: number;
  readonly phoneNumberId: string;
  readonly recipientPhoneNumber: string;
  readonly reply: BotReplyPayload;
}

function fail(
  code: MetaGraphBotReplyPinnedProviderAdapterErrorCode,
): never {
  throw new MetaGraphBotReplyPinnedProviderAdapterError(code);
}

function requireExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  code: MetaGraphBotReplyPinnedProviderAdapterErrorCode,
): ExactRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    arrayIsArrayIntrinsic(value) ||
    nodeIsProxyIntrinsic(value)
  ) {
    return fail(code);
  }

  try {
    const prototype = objectGetPrototypeOfIntrinsic(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return fail(code);
    }
    const ownKeys = reflectOwnKeysIntrinsic(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      return fail(code);
    }
    const actualKeys = (ownKeys as string[]).sort();
    const normalizedExpectedKeys = [...expectedKeys].sort();
    if (
      actualKeys.length !== normalizedExpectedKeys.length ||
      actualKeys.some(
        (key, index) => key !== normalizedExpectedKeys[index],
      )
    ) {
      return fail(code);
    }
    const descriptors = objectGetOwnPropertyDescriptorsIntrinsic(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = objectCreateIntrinsic(null) as Record<string, unknown>;
    for (const key of actualKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return fail(code);
      }
      snapshot[key] = descriptor.value;
    }
    return objectFreezeIntrinsic(snapshot);
  } catch (error) {
    if (error instanceof MetaGraphBotReplyPinnedProviderAdapterError) {
      throw error;
    }
    return fail(code);
  }
}

function requireExactArray(
  value: unknown,
  code: MetaGraphBotReplyPinnedProviderAdapterErrorCode,
): readonly unknown[] {
  if (!arrayIsArrayIntrinsic(value) || nodeIsProxyIntrinsic(value)) {
    return fail(code);
  }

  try {
    if (objectGetPrototypeOfIntrinsic(value) !== Array.prototype) {
      return fail(code);
    }
    const lengthDescriptor = objectGetOwnPropertyDescriptorIntrinsic(
      value,
      "length",
    );
    if (
      lengthDescriptor === undefined ||
      !("value" in lengthDescriptor) ||
      !numberIsSafeIntegerIntrinsic(lengthDescriptor.value) ||
      lengthDescriptor.value < 1 ||
      lengthDescriptor.value > maximumButtonCount ||
      reflectOwnKeysIntrinsic(value).some(
        (key) =>
          typeof key !== "string" ||
          (key !== "length" && !/^(0|[1-9][0-9]*)$/u.test(key)),
      ) ||
      reflectOwnKeysIntrinsic(value).length !== lengthDescriptor.value + 1
    ) {
      return fail(code);
    }
    const snapshot: unknown[] = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = objectGetOwnPropertyDescriptorIntrinsic(
        value,
        String(index),
      );
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return fail(code);
      }
      snapshot.push(descriptor.value);
    }
    return objectFreezeIntrinsic(snapshot);
  } catch (error) {
    if (error instanceof MetaGraphBotReplyPinnedProviderAdapterError) {
      throw error;
    }
    return fail(code);
  }
}

function requireText(value: unknown, maximumLength: number): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maximumLength ||
    unsafeControlCharacters.test(value)
  ) {
    return fail("invalid-bound-request");
  }
  return value;
}

function buildMessageBody(reply: unknown): Readonly<Record<string, unknown>> {
  const replyRecord = requireExactRecord(
    reply,
    typeof reply === "object" &&
      reply !== null &&
      !arrayIsArrayIntrinsic(reply) &&
      !nodeIsProxyIntrinsic(reply) &&
      objectGetOwnPropertyDescriptorIntrinsic(reply, "kind")?.value === "text"
      ? textReplyKeys
      : buttonReplyKeys,
    "invalid-bound-request",
  );

  if (replyRecord.kind === "text") {
    return objectFreezeIntrinsic({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      text: objectFreezeIntrinsic({
        body: requireText(replyRecord.text, maximumTextLength),
        preview_url: false,
      }),
      type: "text",
    });
  }

  if (replyRecord.kind !== "buttons") {
    return fail("invalid-bound-request");
  }
  const rawOptions = requireExactArray(
    replyRecord.options,
    "invalid-bound-request",
  );
  const seenOptionKeys = new Set<string>();
  const seenTitles = new Set<string>();
  const buttons = rawOptions.map((rawOption) => {
    const option = requireExactRecord(
      rawOption,
      buttonOptionKeys,
      "invalid-bound-request",
    );
    if (
      typeof option.optionKey !== "string" ||
      !botOptionKeyPattern.test(option.optionKey) ||
      seenOptionKeys.has(option.optionKey)
    ) {
      return fail("invalid-bound-request");
    }
    const title = requireText(
      option.label,
      maximumButtonTitleLength,
    );
    const comparableTitle = title.toLocaleLowerCase("und");
    if (seenTitles.has(comparableTitle)) {
      return fail("invalid-bound-request");
    }
    seenOptionKeys.add(option.optionKey);
    seenTitles.add(comparableTitle);
    return objectFreezeIntrinsic({
      reply: objectFreezeIntrinsic({
        id: option.optionKey,
        title,
      }),
      type: "reply",
    });
  });

  return objectFreezeIntrinsic({
    interactive: objectFreezeIntrinsic({
      action: objectFreezeIntrinsic({ buttons: objectFreezeIntrinsic(buttons) }),
      body: objectFreezeIntrinsic({
        text: requireText(replyRecord.text, maximumTextLength),
      }),
      type: "button",
    }),
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: "interactive",
  });
}

function requireAccessToken(value: unknown): SensitiveMetaAccessToken {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 8_192 ||
    value.trim() !== value ||
    /\s|[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return fail("invalid-bound-request");
  }
  return value as SensitiveMetaAccessToken;
}

function requireCanonicalTimestamp(value: unknown): string {
  if (typeof value !== "string" || value.length > 40) {
    return fail("invalid-invocation");
  }
  const milliseconds = dateParseIntrinsic(value);
  if (
    !numberIsFiniteIntrinsic(milliseconds) ||
    reflectApplyIntrinsic(
      dateToISOStringIntrinsic,
      new dateConstructorIntrinsic(milliseconds),
      [],
    ) !== value
  ) {
    return fail("invalid-invocation");
  }
  return value;
}

function readClockMilliseconds(
  clockReceiver: object,
  now: (...arguments_: never[]) => unknown,
): number {
  let value: unknown;
  let milliseconds: unknown;
  try {
    value = reflectApplyIntrinsic(now, clockReceiver, []);
    if (
      !nodeIsDateIntrinsic(value) ||
      nodeIsProxyIntrinsic(value)
    ) {
      return fail("invalid-dependencies");
    }
    milliseconds = reflectApplyIntrinsic(dateGetTimeIntrinsic, value, []);
  } catch {
    return fail("invalid-dependencies");
  }
  if (
    typeof milliseconds !== "number" ||
    !numberIsFiniteIntrinsic(milliseconds)
  ) {
    return fail("invalid-dependencies");
  }
  return milliseconds;
}

function requireProviderMessageId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("wamid.") ||
    value.length <= "wamid.".length ||
    value.length > 255 ||
    value.trim() !== value ||
    /\s|[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return fail("provider-outcome-unknown");
  }
  return value;
}

function parseRetryAfter(value: string | null): number {
  if (value === null || !/^[1-9][0-9]{0,5}$/u.test(value)) {
    return fail("provider-outcome-unknown");
  }
  const seconds = numberConstructorIntrinsic(value);
  if (
    !numberIsSafeIntegerIntrinsic(seconds) ||
    seconds > maximumRetryAfterSeconds
  ) {
    return fail("provider-outcome-unknown");
  }
  return seconds;
}

function readAbortSignalAborted(signal: AbortSignal): boolean {
  try {
    if (abortSignalAbortedGetterIntrinsic === undefined) {
      return fail("invalid-invocation");
    }
    const aborted = reflectApplyIntrinsic(
      abortSignalAbortedGetterIntrinsic,
      signal,
      [],
    );
    if (typeof aborted !== "boolean") {
      return fail("invalid-invocation");
    }
    return aborted;
  } catch (error) {
    if (error instanceof MetaGraphBotReplyPinnedProviderAdapterError) {
      throw error;
    }
    return fail("invalid-invocation");
  }
}

function captureResponse(value: unknown): CapturedResponse {
  if (
    typeof value !== "object" ||
    value === null ||
    nodeIsProxyIntrinsic(value)
  ) {
    return fail("provider-outcome-unknown");
  }
  try {
    if (
      responseStatusGetterIntrinsic === undefined ||
      responseHeadersGetterIntrinsic === undefined ||
      responseBodyGetterIntrinsic === undefined
    ) {
      return fail("provider-outcome-unknown");
    }
    const status = reflectApplyIntrinsic(
      responseStatusGetterIntrinsic,
      value,
      [],
    );
    const headers = reflectApplyIntrinsic(
      responseHeadersGetterIntrinsic,
      value,
      [],
    );
    const body = reflectApplyIntrinsic(
      responseBodyGetterIntrinsic,
      value,
      [],
    );
    if (
      !numberIsSafeIntegerIntrinsic(status) ||
      status < 100 ||
      status > 599 ||
      typeof headers !== "object" ||
      headers === null ||
      nodeIsProxyIntrinsic(headers) ||
      body === null ||
      typeof body !== "object" ||
      nodeIsProxyIntrinsic(body)
    ) {
      return fail("provider-outcome-unknown");
    }
    // The captured native methods below perform the Headers and Stream brand
    // checks. The native Response getters above already prove the response
    // brand and cannot be replaced after module evaluation.
    reflectApplyIntrinsic(headersGetIntrinsic, headers, ["content-length"]);
    return objectFreezeIntrinsic({
      body: body as ReadableStream<Uint8Array>,
      headers: headers as Headers,
      status,
    });
  } catch (error) {
    if (error instanceof MetaGraphBotReplyPinnedProviderAdapterError) {
      throw error;
    }
    return fail("provider-outcome-unknown");
  }
}

function readHeader(headers: Headers, name: string): string | null {
  try {
    return reflectApplyIntrinsic(headersGetIntrinsic, headers, [name]);
  } catch {
    return fail("provider-outcome-unknown");
  }
}

async function readBoundedResponseJson(
  response: CapturedResponse,
): Promise<unknown> {
  const declaredLength = readHeader(response.headers, "content-length");
  if (declaredLength !== null) {
    if (!/^(0|[1-9][0-9]*)$/u.test(declaredLength)) {
      return fail("provider-outcome-unknown");
    }
    const parsedLength = numberConstructorIntrinsic(declaredLength);
    if (
      !numberIsSafeIntegerIntrinsic(parsedLength) ||
      parsedLength < 1 ||
      parsedLength > maximumResponseBytes
    ) {
      return fail("provider-outcome-unknown");
    }
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = reflectApplyIntrinsic(
      readableStreamGetReaderIntrinsic,
      response.body,
      [],
    ) as ReadableStreamDefaultReader<Uint8Array>;
  } catch {
    return fail("provider-outcome-unknown");
  }
  const decoder = new textDecoderConstructorIntrinsic("utf-8", {
    fatal: true,
  });
  let byteLength = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reflectApplyIntrinsic(
        readableStreamReaderReadIntrinsic,
        reader,
        [],
      );
      if (chunk.done) break;
      if (
        !nodeIsUint8ArrayIntrinsic(chunk.value) ||
        typedArrayByteLengthGetterIntrinsic === undefined
      ) {
        return fail("provider-outcome-unknown");
      }
      const chunkByteLength = reflectApplyIntrinsic(
        typedArrayByteLengthGetterIntrinsic,
        chunk.value,
        [],
      );
      if (
        typeof chunkByteLength !== "number" ||
        !numberIsSafeIntegerIntrinsic(chunkByteLength) ||
        chunkByteLength < 0
      ) {
        return fail("provider-outcome-unknown");
      }
      byteLength += chunkByteLength;
      if (byteLength > maximumResponseBytes) {
        try {
          await reflectApplyIntrinsic(
            readableStreamReaderCancelIntrinsic,
            reader,
            [],
          );
        } catch {
          // The bounded outcome remains unknown even when cancellation fails.
        }
        return fail("provider-outcome-unknown");
      }
      text += reflectApplyIntrinsic(
        textDecoderDecodeIntrinsic,
        decoder,
        [chunk.value, { stream: true }],
      );
    }
    text += reflectApplyIntrinsic(textDecoderDecodeIntrinsic, decoder, []);
  } catch (error) {
    if (error instanceof MetaGraphBotReplyPinnedProviderAdapterError) {
      throw error;
    }
    return fail("provider-outcome-unknown");
  }
  if (byteLength < 1) {
    return fail("provider-outcome-unknown");
  }
  try {
    return reflectApplyIntrinsic(
      jsonParseIntrinsic,
      undefined,
      [text],
    ) as unknown;
  } catch {
    return fail("provider-outcome-unknown");
  }
}

function requireJsonRecord(value: unknown): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    arrayIsArrayIntrinsic(value)
  ) {
    return fail("provider-outcome-unknown");
  }
  return value as Record<string, unknown>;
}

function mapProviderResponse(
  response: CapturedResponse,
  payload: unknown,
  pairFailureExponent: number,
): MetaGraphBotReplyPinnedProviderFact {
  const record = requireJsonRecord(payload);
  if (response.status === 200) {
    if (
      record.messaging_product !== "whatsapp" ||
      !arrayIsArrayIntrinsic(record.messages) ||
      record.messages.length !== 1
    ) {
      return fail("provider-outcome-unknown");
    }
    const message = requireJsonRecord(record.messages[0]);
    return objectFreezeIntrinsic({
      outcome: "accepted",
      providerMessageId: requireProviderMessageId(message.id),
    });
  }

  if (response.status < 400 || response.status > 499) {
    return fail("provider-outcome-unknown");
  }
  const error = requireJsonRecord(record.error);
  if (!numberIsSafeIntegerIntrinsic(error.code)) {
    return fail("provider-outcome-unknown");
  }
  if (error.code === 130_429) {
    return objectFreezeIntrinsic({
      outcome: "sender-deferred",
      providerErrorCode: 130_429,
      retryAfterSeconds: parseRetryAfter(
        readHeader(response.headers, "retry-after"),
      ),
    });
  }
  if (error.code === 131_056) {
    return objectFreezeIntrinsic({
      outcome: "pair-deferred",
      providerErrorCode: 131_056,
      retryAfterSeconds: 4 ** pairFailureExponent,
    });
  }
  if (error.code === 131_047) {
    return objectFreezeIntrinsic({
      outcome: "service-window-rejected",
      providerErrorCode: 131_047,
    });
  }
  return fail("provider-outcome-unknown");
}

export function createMetaGraphBotReplyPinnedProviderAdapter(
  rawInput: Readonly<MetaGraphBotReplyPinnedProviderAdapterInput>,
): MetaGraphBotReplyPinnedProvider {
  const input = requireExactRecord(
    rawInput,
    dependencyKeys,
    "invalid-dependencies",
  );
  const clock = requireExactRecord(
    input.clock,
    clockKeys,
    "invalid-dependencies",
  );
  if (
    typeof clock.now !== "function" ||
    nodeIsProxyIntrinsic(clock.now) ||
    typeof input.fetchImplementation !== "function" ||
    nodeIsProxyIntrinsic(input.fetchImplementation)
  ) {
    return fail("invalid-dependencies");
  }
  if (
    input.apiVersion !== graphApiVersion ||
    typeof input.phoneNumberId !== "string" ||
    !phoneNumberIdPattern.test(input.phoneNumberId) ||
    typeof input.recipientPhoneNumber !== "string" ||
    !recipientPhoneNumberPattern.test(input.recipientPhoneNumber) ||
    !numberIsSafeIntegerIntrinsic(input.pairFailureExponent) ||
    numberConstructorIntrinsic(input.pairFailureExponent) < 0 ||
    numberConstructorIntrinsic(input.pairFailureExponent) >
      maximumPairFailureExponent
  ) {
    return fail("invalid-bound-request");
  }

  const accessToken = requireAccessToken(input.accessToken);
  const messageBody = objectFreezeIntrinsic({
    ...buildMessageBody(input.reply),
    to: input.recipientPhoneNumber.slice(1),
  });
  let serializedBody: string;
  try {
    serializedBody = reflectApplyIntrinsic(
      jsonStringifyIntrinsic,
      undefined,
      [messageBody],
    );
  } catch {
    return fail("invalid-bound-request");
  }
  let serializedBodyByteLength: unknown;
  try {
    const encodedBody = reflectApplyIntrinsic(
      textEncoderEncodeIntrinsic,
      textEncoderIntrinsic,
      [serializedBody],
    );
    serializedBodyByteLength =
      typedArrayByteLengthGetterIntrinsic === undefined
        ? undefined
        : reflectApplyIntrinsic(
          typedArrayByteLengthGetterIntrinsic,
          encodedBody,
          [],
        );
  } catch {
    return fail("invalid-dependencies");
  }
  if (
    !numberIsSafeIntegerIntrinsic(serializedBodyByteLength) ||
    numberConstructorIntrinsic(serializedBodyByteLength) > maximumRequestBytes
  ) {
    return fail("invalid-bound-request");
  }

  const clockReceiver = input.clock as object;
  const now = clock.now as (...arguments_: never[]) => unknown;
  const fetchImplementation = input.fetchImplementation as typeof fetch;
  const pairFailureExponent = numberConstructorIntrinsic(
    input.pairFailureExponent,
  );
  const requestUrl =
    `${graphOrigin}/${graphApiVersion}/${input.phoneNumberId}/messages`;
  const requestHeaders = objectFreezeIntrinsic({
    accept: "application/json",
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  });
  let used = false;

  return objectFreezeIntrinsic({
    async sendOnce(rawInvocation, signal) {
      if (used) {
        return fail("provider-binding-already-used");
      }
      used = true;
      const invocation = requireExactRecord(
        rawInvocation,
        invocationKeys,
        "invalid-invocation",
      );
      if (
        invocation.automaticRetryPolicy !== "forbidden" ||
        typeof signal !== "object" ||
        signal === null ||
        nodeIsProxyIntrinsic(signal)
      ) {
        return fail("invalid-invocation");
      }
      const sendBefore = requireCanonicalTimestamp(invocation.sendBefore);
      const requestInit = objectFreezeIntrinsic({
        body: serializedBody,
        cache: "no-store" as const,
        credentials: "omit" as const,
        headers: requestHeaders,
        method: "POST" as const,
        redirect: "error" as const,
        referrerPolicy: "no-referrer" as const,
        signal,
      });
      const signalWasAborted = readAbortSignalAborted(signal);
      const remainingMilliseconds = dateParseIntrinsic(sendBefore) -
        readClockMilliseconds(clockReceiver, now);
      if (
        signalWasAborted ||
        remainingMilliseconds <= 0 ||
        remainingMilliseconds > maximumProviderBoundaryMilliseconds
      ) {
        return fail("provider-boundary-expired");
      }

      let response: unknown;
      try {
        response = await reflectApplyIntrinsic(fetchImplementation, undefined, [
          requestUrl,
          requestInit,
        ]);
      } catch {
        return fail("provider-outcome-unknown");
      }
      const capturedResponse = captureResponse(response);
      const payload = await readBoundedResponseJson(capturedResponse);
      return mapProviderResponse(
        capturedResponse,
        payload,
        pairFailureExponent,
      );
    },
  });
}
