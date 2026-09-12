import { isRecord, validInteger, type OpenAiResponsesConfiguration } from "./openAiResponsesConfiguration.ts";
import { readOpenAiJsonResponse } from "./openAiResponsesProvider.ts";

export type OpenAiInputTokenCount =
  | Readonly<{ outcome: "counted"; inputTokens: number }>
  | Readonly<{ outcome: "input-too-large" }>
  | Readonly<{ outcome: "unavailable" }>;

export function createOpenAiInputTokenBody(responseBody: string): string {
  const body = JSON.parse(responseBody);
  // Count the exact input, instructions, tool definitions and output schema.
  // Generation-only fields are not accepted by the input_tokens endpoint.
  const { model, input, instructions, tools, tool_choice, truncation, text } = body;
  return JSON.stringify({ model, input, instructions, tools, tool_choice, truncation, text });
}

export async function countOpenAiInputTokens(
  responseBody: string,
  configuration: OpenAiResponsesConfiguration,
  transport: typeof fetch,
): Promise<OpenAiInputTokenCount> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<OpenAiInputTokenCount>((resolve) => {
      timer = setTimeout(() => { controller.abort(); resolve({ outcome: "unavailable" }); }, configuration.timeoutMs);
    });
    const attempt = (async (): Promise<OpenAiInputTokenCount> => {
      const response = await transport("https://api.openai.com/v1/responses/input_tokens", {
        method: "POST", redirect: "error", cache: "no-store", signal: controller.signal,
        headers: { authorization: `Bearer ${configuration.apiKey}`, "content-type": "application/json", accept: "application/json" },
        body: createOpenAiInputTokenBody(responseBody),
      });
      if (response.status !== 200 || response.redirected) { await response.body?.cancel(); return { outcome: "unavailable" }; }
      const result = await readOpenAiJsonResponse(response);
      if (controller.signal.aborted || !isRecord(result) || result.object !== "response.input_tokens" ||
        !validInteger(result.input_tokens, 1, Number.MAX_SAFE_INTEGER)) return { outcome: "unavailable" };
      // A valid count above our ceiling is a permanent input decision, not a
      // provider outage: retrying the same input cannot make it fit the limit.
      return result.input_tokens > configuration.maximumInputTokens ? { outcome: "input-too-large" } :
        { outcome: "counted", inputTokens: result.input_tokens };
    })();
    return await Promise.race([attempt, deadline]);
  } catch { return { outcome: "unavailable" }; }
  finally { if (timer !== undefined) clearTimeout(timer); controller.abort(); }
}

export function reserveOpenAiCost(inputTokens: number, configuration: OpenAiResponsesConfiguration): number {
  if (!validInteger(inputTokens, 1, configuration.maximumInputTokens)) throw new Error("AI token count is invalid");
  const card = configuration.rateCard;
  if (!validInteger(configuration.maximumOutputTokens, 1, 16_384) ||
    !validInteger(card.inputMicroUsdPerMillionTokens, 1, Number.MAX_SAFE_INTEGER) ||
    !validInteger(card.cachedInputMicroUsdPerMillionTokens, 0, card.inputMicroUsdPerMillionTokens) ||
    (card.cacheWriteMicroUsdPerMillionTokens !== null && !validInteger(card.cacheWriteMicroUsdPerMillionTokens, 1, Number.MAX_SAFE_INTEGER)) ||
    !validInteger(card.outputMicroUsdPerMillionTokens, 1, Number.MAX_SAFE_INTEGER)) throw new Error("AI reservation prices are invalid");
  const inputPrice = Math.max(card.inputMicroUsdPerMillionTokens,
    card.cachedInputMicroUsdPerMillionTokens, card.cacheWriteMicroUsdPerMillionTokens ?? 0);
  const numerator = BigInt(inputTokens) * BigInt(inputPrice) +
    BigInt(configuration.maximumOutputTokens) * BigInt(card.outputMicroUsdPerMillionTokens);
  const denominator = BigInt(10_000_000_000);
  const cents = (numerator + denominator - BigInt(1)) / denominator;
  if (cents < BigInt(1) || cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("AI reservation is invalid");
  return Number(cents);
}
