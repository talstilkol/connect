// Account-specific models and prices are supplied by the operator after Evals.
// This module intentionally contains no API key, model, or price defaults.
export interface OpenAiResponsesConfiguration {
  readonly apiKey: string;
  readonly model: string;
  readonly maximumInputTokens: number;
  readonly maximumOutputTokens: number;
  readonly timeoutMs: number;
  readonly rateCard: Readonly<{
    model: string;
    currency: "USD";
    inputMicroUsdPerMillionTokens: number;
    cachedInputMicroUsdPerMillionTokens: number;
    cacheWriteMicroUsdPerMillionTokens: number | null;
    outputMicroUsdPerMillionTokens: number;
    validUntil: string;
  }>;
}

export interface OpenAiResponsesEnvironment {
  AI_RESPONSES_ENABLED?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_ALLOWED_MODELS_JSON?: string;
  OPENAI_RATE_CARD_JSON?: string;
  OPENAI_MAX_INPUT_TOKENS?: string;
  OPENAI_MAX_OUTPUT_TOKENS?: string;
  OPENAI_TIMEOUT_MS?: string;
}

export type OpenAiResponsesConfigurationResult =
  | Readonly<{ status: "disabled" }>
  | Readonly<{ status: "invalid" }>
  | Readonly<{ status: "configured"; configuration: OpenAiResponsesConfiguration }>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validInteger(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

export function inspectOpenAiResponsesConfiguration(
  environment: OpenAiResponsesEnvironment,
  now: Date = new Date(),
): OpenAiResponsesConfigurationResult {
  if (environment.AI_RESPONSES_ENABLED === undefined || environment.AI_RESPONSES_ENABLED === "false") {
    return Object.freeze({ status: "disabled" });
  }
  try {
    const { OPENAI_API_KEY: apiKey, OPENAI_MODEL: model } = environment;
    const allowed: unknown = JSON.parse(environment.OPENAI_ALLOWED_MODELS_JSON ?? "null");
    const card: unknown = JSON.parse(environment.OPENAI_RATE_CARD_JSON ?? "null");
    const input = environment.OPENAI_MAX_INPUT_TOKENS;
    const maximumInputTokens = Number(input);
    const output = environment.OPENAI_MAX_OUTPUT_TOKENS;
    const timeout = environment.OPENAI_TIMEOUT_MS;
    const maximumOutputTokens = Number(output);
    const timeoutMs = Number(timeout);
    if (environment.AI_RESPONSES_ENABLED !== "true" ||
      typeof apiKey !== "string" || !/^[\x21-\x7e]{16,512}$/.test(apiKey) ||
      typeof model !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(model) ||
      !Array.isArray(allowed) || allowed.length === 0 || allowed.length > 20 ||
      allowed.some((item) => typeof item !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(item)) ||
      new Set(allowed).size !== allowed.length || !allowed.includes(model) ||
      !input || !/^[1-9][0-9]*$/.test(input) || !validInteger(maximumInputTokens, 1, 1_000_000) ||
      !output || !/^[1-9][0-9]*$/.test(output) || !validInteger(maximumOutputTokens, 1, 16_384) ||
      !timeout || !/^[1-9][0-9]*$/.test(timeout) || !validInteger(timeoutMs, 1_000, 60_000) ||
      !isRecord(card) || Object.keys(card).sort().join(",") !==
        "cacheWriteMicroUsdPerMillionTokens,cachedInputMicroUsdPerMillionTokens,currency,inputMicroUsdPerMillionTokens,model,outputMicroUsdPerMillionTokens,validUntil" ||
      card.model !== model || card.currency !== "USD" ||
      !validInteger(card.inputMicroUsdPerMillionTokens, 1, Number.MAX_SAFE_INTEGER) ||
      !validInteger(card.cachedInputMicroUsdPerMillionTokens, 0, card.inputMicroUsdPerMillionTokens) ||
      (card.cacheWriteMicroUsdPerMillionTokens !== null && !validInteger(card.cacheWriteMicroUsdPerMillionTokens, 1, Number.MAX_SAFE_INTEGER)) ||
      !validInteger(card.outputMicroUsdPerMillionTokens, 1, Number.MAX_SAFE_INTEGER) ||
      typeof card.validUntil !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(card.validUntil) ||
      !Number.isFinite(now.getTime()) || !Number.isFinite(Date.parse(card.validUntil)) ||
      new Date(card.validUntil).toISOString() !== card.validUntil || Date.parse(card.validUntil) <= now.getTime()) {
      return Object.freeze({ status: "invalid" });
    }
    return Object.freeze({
      status: "configured",
      configuration: Object.freeze({
        apiKey, model, maximumInputTokens, maximumOutputTokens, timeoutMs,
        rateCard: Object.freeze({
          model, currency: "USD" as const,
          inputMicroUsdPerMillionTokens: card.inputMicroUsdPerMillionTokens,
          cachedInputMicroUsdPerMillionTokens: card.cachedInputMicroUsdPerMillionTokens,
          cacheWriteMicroUsdPerMillionTokens: card.cacheWriteMicroUsdPerMillionTokens,
          outputMicroUsdPerMillionTokens: card.outputMicroUsdPerMillionTokens,
          validUntil: card.validUntil,
        }),
      }),
    });
  } catch {
    return Object.freeze({ status: "invalid" });
  }
}
