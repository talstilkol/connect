import type { AiResponseGenerationRequest, AiResponseGenerationResult, AiResponseProvider } from "../../shared/domain/aiRuntime.ts";
import { inspectOpenAiResponsesConfiguration, type OpenAiResponsesConfiguration } from "./openAiResponsesConfiguration.ts";
import { createOpenAiResponsesBody, parseOpenAiResponsesResult } from "./openAiResponsesWire.ts";

const endpoint = "https://api.openai.com/v1/responses";
const maximumResponseBytes = 262_144;

export async function readOpenAiJsonResponse(response: Response): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) ||
    !Number.isSafeInteger(Number(declaredLength)) || Number(declaredLength) > maximumResponseBytes)) {
    await response.body?.cancel();
    throw new Error("OpenAI response length is invalid");
  }
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "") || response.body === null) {
    await response.body?.cancel();
    throw new Error("OpenAI response media type is invalid");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maximumResponseBytes) throw new Error("OpenAI response exceeds its limit");
      chunks.push(chunk.value);
    }
  } catch {
    await reader.cancel().catch(() => {});
    throw new Error("OpenAI response read failed");
  } finally {
    reader.releaseLock();
  }
  if (declaredLength !== null && Number(declaredLength) !== size) throw new Error("OpenAI response length mismatch");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

// One bounded HTTP attempt. Durable claim, budget reservation and replay belong
// to the caller; this transport must never be installed as a retrying worker.
export function createOpenAiResponsesProvider(
  candidate: OpenAiResponsesConfiguration,
  options: Readonly<{ fetch?: typeof fetch; now?: () => Date }> = {},
): AiResponseProvider {
  const now = options.now ?? (() => new Date());
  const transport = options.fetch ?? globalThis.fetch;
  if (typeof now !== "function" || typeof transport !== "function") throw new Error("OpenAI transport configuration is invalid");
  const checked = inspectOpenAiResponsesConfiguration({
    AI_RESPONSES_ENABLED: "true", OPENAI_API_KEY: candidate?.apiKey, OPENAI_MODEL: candidate?.model,
    OPENAI_ALLOWED_MODELS_JSON: JSON.stringify([candidate?.model]),
    OPENAI_RATE_CARD_JSON: JSON.stringify(candidate?.rateCard),
    OPENAI_MAX_INPUT_TOKENS: String(candidate?.maximumInputTokens),
    OPENAI_MAX_OUTPUT_TOKENS: String(candidate?.maximumOutputTokens), OPENAI_TIMEOUT_MS: String(candidate?.timeoutMs),
  }, now());
  if (checked.status !== "configured") throw new Error("OpenAI transport configuration is invalid");
  const configuration = checked.configuration;
  return Object.freeze({
    async generate(request: AiResponseGenerationRequest): Promise<AiResponseGenerationResult> {
      const current = now().getTime();
      if (!Number.isFinite(current) || current >= Date.parse(configuration.rateCard.validUntil)) return { outcome: "unavailable" };
      let body: string;
      let captured: AiResponseGenerationRequest;
      try {
        body = createOpenAiResponsesBody(request, configuration);
        captured = { ...request, passages: request.passages.map((passage) => ({ ...passage })) };
      } catch {
        return { outcome: "policy-violation" };
      }
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const deadline = new Promise<AiResponseGenerationResult>((resolve) => {
          timer = setTimeout(() => {
            controller.abort();
            resolve({ outcome: "unavailable" });
          }, configuration.timeoutMs);
        });
        const attempt = (async (): Promise<AiResponseGenerationResult> => {
          const response = await transport(endpoint, {
            method: "POST", redirect: "error", cache: "no-store", signal: controller.signal,
            headers: { authorization: `Bearer ${configuration.apiKey}`, "content-type": "application/json", accept: "application/json",
              "X-Client-Request-Id": captured.requestKey },
            body,
          });
          if (response.status !== 200 || response.redirected) {
            await response.body?.cancel();
            return { outcome: "unavailable" };
          }
          const result = await readOpenAiJsonResponse(response);
          if (controller.signal.aborted) return { outcome: "unavailable" };
          return parseOpenAiResponsesResult(result, captured, configuration);
        })();
        return await Promise.race([attempt, deadline]);
      } catch {
        return { outcome: "unavailable" };
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        controller.abort();
      }
    },
  });
}
